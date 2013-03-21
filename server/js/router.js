var crypto = require('crypto');
var request = require('request');
var couchbase = require('couchbase');
var step = require('step');
var config = require('./config');
var mailgun = false;
if (config.mailgun && config.mailgun.api_key.length > 0 && config.mailgun.api_key.length > 0) {
	mailgun = require('mailgun-js')(config.mailgun.api_key, config.mailgun.domain);
}

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

function user(req,res,getonly) {
	var cookies = getCookies(req);
	if (!cookies['userid'] || cookies['userid'].length !== 40) {
		return (getonly) ? "" : createUser(req,res);
	}
	return cookies['userid'];
}

module.exports.init = function() {
	function couchbaseInit(callback) {
		step(function() {
			couchbase.connect(config, this);
		},function(err,bucket) {
			if (err) {
				console.log(err);
				console.log("failed to connect to cluster");
				return;
			}
			callback(bucket);
		});
	}
	function sendWorkspace(bucket,req,res,key,email) {
		if (!key) {
			key = user(req,res) + '.wks';
		}
		step(function() {
			bucket.get(key, this);
		},function (err,data,meta) {
			if (err) {
				console.log("failed to fetch key: "+key);
				if (email) {
					var data = { email: email };
					res.send(data);
					res.end();
					bucket.set(key,data);
				} else {
					res.send(204);
				}
			} else {
				data = typeof data === 'object' ? data : JSON.parse(data);
				if (email) {
					data.email = email;
					console.log("sending key: "+key+" "+email);
				} else {
					console.log("sending key: "+key);
				}
				res.send(data);
				res.end();
				if (email) {
					bucket.set(key,data);
				}
			}	
		});
	}
	function saveWorkspace(req,res,callback) {
		try {
			var data = '';
			req.on('data',function(chunk) {
				data += chunk;
			});
			req.on('end',function() {
				var key = user(req,res) + ".wks";
				if (data.length === 0) {
					if (typeof callback === 'function') {
						callback();
					}
					res.send(204);
					return;
				}
				step(function() {
					couchbaseInit(this);
				},function(bucket) {
					bucket.set(key, data, this);
				},function(err,meta) {
					if (err) {
						console.log('save errored for key: '+key);
						console.log(err);
						res.send(400);
					} else {
						if (typeof callback === 'function') {
							callback();
						}
						console.log('saved key: '+key);
						res.send(204);
					}
				});
			});
		} catch(err) {
			console.log(err);
			res.send(400);
		}
	}
	var routes = {
		'/getworkspace': function(req,res) {
			try {
				if (req.query.access_token) {
					var bucket, profile, userid;
					step(function() {
						couchbaseInit(this);
					},function(bkt) {
						bucket = bkt;
						request(config.oauthURL+req.query.access_token, this);
					},function(err,resp,body) {
						if (!err && resp.statusCode == 200) {
							profile = JSON.parse(body);
							if (profile.id && profile.email && profile.verified_email) {
								bucket.get(config.oauthPrefix+profile.id,this);
							}
						} else {
							console.log(err);
							res.send(204);
						}
					},function(err,data,meta) {
						if (err) {
							userid = user(req,res);
							bucket.set(config.oauthPrefix+profile.id, userid+'.wks',this);
						}
						var wksKey = data;
						userid = wksKey.substr(0,40);
						var prevuserid = user(req,res,true);
						if (prevuserid.length > 0 && userid !== prevuserid) {
							bucket.remove(prevuserid+".wks");
							res.cookie('userid', userid, {maxAge: 1000*3600*24*30, httpOnly: true });
						}
						sendWorkspace(bucket,req,res,wksKey,profile.email);
					},function() {
						if (err) {
							console.log(err);
							res.send(204);
						} else {
							sendWorkspace(bucket,req,res,userid+'.wks',profile.email);
						}
					});
				} else {
					couchbaseInit(function(bucket) {
						sendWorkspace(bucket,req,res);
					});
				}
			} catch(err) {
				console.log(err);
				res.send(204);
			}
		},
		'/saveworkspace': function(req,res) {
			saveWorkspace(req,res);
		},
		'/newworkspace': function(req,res) {
			saveWorkspace(req,res,function() {
				createUser(req,res);
			});
		},
		'/deleteworkspace': function(req,res) {
			var userid = user(req,res,true);
			if (userid.length > 0) {
				coucbhaseInit(function(bucket) {
					bucket.remove(userid +'.wks');
				});
			}
		},
		'/proxy': function(req,res) { // to bypass same origin restrictions
			var url = req.query["url"];
			if (url && /http[s]?:\/\//.test(url)) {
				request(url).pipe(res); // this module is so amazing... one line proxy!!
			} else {
				res.send(204);
			}
		},
		'/feedback': function(req,res) {
			var data = '';
			req.on('data',function(chunk) {
				data += chunk;
			});
			req.on('end',function() {
				var info = req.header('x-real-ip') || req.connection.remoteAddress;
				info += ' ' + req.headers['user-agent'];
				data = "\n"+info+"\n"+data.replace("\n"," ");
				if (mailgun) {
					var tosend = {
						from: 'Excited User <me@samples.mailgun.org>',
						to: mailgun.to,
						subject: 'Feedback from '+info,
						text: data
					};
					mailgun.messages.send(tosend, function (error, response, body) {
						//console.log(body);
					});
				} else {
					console.log(data);
				}
				res.send(204);
			});
		},
		'/exportpng': function(req,res) {
			var data = '';
			req.on('data',function(chunk) {
				data += chunk;
			});
			req.on('end',function() {
				data = data.split('&');
				var name = data[0].substr(5); // get rid of 'name='
				name = (name.length > 0) ? name : 'export';
				data = decodeURIComponent(data[1].substr(5)); // get rid of 'data='
				var bin = new Buffer(data,"base64");
				res.setHeader('Content-Type', 'image/png');
				res.setHeader('Content-Disposition','attachment; filename="'+name+'.png"');
				res.setHeader('Content-Length', bin.length);
				res.end(bin);
			});
		}
	}
	return routes;
};
