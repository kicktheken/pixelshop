var util = require('util');
var express = require('express'), app = express();
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
    app.listen(config.proxyPort);
});



