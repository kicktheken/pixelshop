var crypto = require('crypto');
var request = require('request');
var config = require('./config');

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
function createUser(req,res) {
    var idgen = req.header('x-real-ip') || req.connection.remoteAddress;
    idgen += req.headers['user-agent'];
    idgen += Math.random().toString();
    var userid = sha1(idgen);
    res.cookie('userid', userid, {maxAge: 1000*3600*24*30, httpOnly: true });
    return userid;
}

function user(req,res) {
    var cookies = getCookies(req);
    if (!cookies['userid'] || cookies['userid'].length !== 40) {
        return createUser(req,res);
    }
    return cookies['userid'];
}

module.exports.init = function(cb) {
    function cbGet(key,success,failure) {
        var timeout = setTimeout(failure, config.timeout);
        cb.get(key, function(err,data,meta) {
            clearTimeout(timeout);
            if (err && typeof failure === 'function') {
                failure(err);
            } else if (typeof success === 'function') {
                success(data);
            }
        });
    }
    function cbSet(key,data,success,failure) {
        var timeout = setTimeout(failure, config.timeout);
        cb.set(key, data, function(err,meta) {
            clearTimeout(timeout);
            if (err && typeof failure === 'function') {
                failure(err);
            } else if (typeof success === 'function') {
                success(data);
            }
        });
    }
    function sendWorkspace(req,res,key,email) {
        if (!key) {
            key = user(req,res) + '.wks';
        }
        cbGet(key, function(data) {
            data = typeof data === 'object' ? data : JSON.parse(data);
            if (email) {
                data.email = email;
            }
            res.send(data);
            res.end();
            if (email) {
                cbSet(key,data);
            }
        }, function(err) {
            if (email) {
                var data = { email: email };
                res.send(data);
                res.end();
                cbSet(key,data);
            } else {
                res.send(204);
            }
        });
    }
    var routes = {
        '/getworkspace': function(req,res) {
            try {
                if (req.query.access_token) {
                    request(config.oauthURL+req.query.access_token, function(err,resp,body) {
                        if (!err && resp.statusCode == 200) {
                            var profile = JSON.parse(body);
                            if (profile.id && profile.email && profile.verified_email) {
                                cbGet(config.oauthPrefix+profile.id, function(wksKey) {
                                    sendWorkspace(req,res,wksKey,profile.email);
                                }, function(err) {
                                    var userid = user(req,res);
                                    cbSet(config.oauthPrefix+profile.id, userid+'.wks', function() {
                                        sendWorkspace(req,res,userid+'.wks',profile.email);
                                    }, function(err) {
                                        console.log(err);
                                        res.send(204);
                                    })
                                });
                            }
                        } else {
                            console.log(err);
                            res.send(204);
                        }
                    });
                } else {
                    sendWorkspace(req,res);
                }
            } catch(err) {
                console.log(err);
                res.send(204);
            }
            
        },
        '/saveworkspace': function(req,res) {
            try {
                var data = '';
                req.on('data',function(chunk) {
                    data += chunk;
                });
                req.on('end',function() {
                    var key = user(req,res) + ".wks";
                    cbSet(key, data, function() {
                        res.send(204);
                    }, function(err) {
                        console.log(err);
                        res.send(400);
                    });
                });
            } catch(err) {
                console.log(err);
                res.send(400);
            }
        }
    }
    return routes;
};
