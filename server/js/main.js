var util = require('util');
var express = require('express'), app = express();
var fs = require('fs');
var cb = require('couchbase');
var router = require('./router');
var config = require('./config');

app.param(function(name, fn){
    if (fn instanceof RegExp) {
        return function(req, res, next, val){
            var captures;
            if (captures = fn.exec(String(val))) {
                req.params[name] = captures;
                next();
            } else {
                next('route');
            }
        }
    }
});
app.param('user', /^[0-9a-f]+$/);

cb.connect(config, function(err,cb) {
    if (err) {
        console.log("failed to connect to cluster");
        process.exit(1);
    }
    var routes = router.init(cb);
    for (var method in routes) {
        var path = config.proxyPrefix + method;
        app.all(path,routes[method]);
    }
    try {
        var options = {
            key: fs.readFileSync('/etc/ssl/private/server.key'),
            cert: fs.readFileSync('/etc/ssl/certs/server.crt')
        };
        var https = require('https');
        console.log("ssl listening on "+config.proxyPort);
        https.createServer(options, app).listen(config.proxyPort);
    } catch(err) {
        console.log("listening on "+config.proxyPort);
        app.listen(config.proxyPort);
    }
});


