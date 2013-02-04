var crypto = require('crypto');

function sha1(s) {
    return crypto.createHash('sha1').update(s).digest('hex');
}
function getCookies(req) {
    var cookies = {};
    req.headers.cookie && req.headers.cookie.split(';').forEach(function(cookie) {
        var parts = cookie.split('=');
        cookies[parts[0].trim()] = (parts[1] || '').trim();
    });
    return cookies;
}

module.exports.init = function(cb) {
    var routes = {
        '/a/getworkspace': function(req,res) {
            var cookies = getCookies(req);
            if (!cookies['userid'] || cookies['userid'].length !== 40) {
                var idgen = req.connection.address().address;
                idgen += req.headers['user-agent'];
                idgen += Math.random().toString();
                res.cookie('userid', sha1(idgen), {maxAge: 1000*3600*24*7, httpOnly: true });
                res.send(204); // no content
            } else {
                cb.get(cookies['userid']+'.wks', function(err,data,meta) {
                    res.send((err) ? 400 : data);
                });
            }
        },
        '/a/saveworkspace': function(req,res) {
            var cookies = getCookies(req);
            if (!cookies['userid'] || cookies['userid'].length !== 40) {
                res.send(400); // bad request
                return;
            }
            var data = '';
            req.on('data',function(chunk) {
                data += chunk;
            });
            req.on('end',function() {
                cb.set(cookies['userid']+'.wks', data, function(err,meta) {
                    res.send((err) ? 400 : 204);
                });
            });
        }
    }
    return routes;
};
