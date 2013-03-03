var config = {
	analytics: "", // google analytics
	oauth2: { // see https://developers.google.com/accounts/docs/OAuth2Login
		scope: "https://www.googleapis.com/auth/userinfo.email",
		response_type: "token",
		redirect_uri: "", // use root path of hostname
		client_id: ""
	},
	oauthURL: "https://www.googleapis.com/oauth2/v1/userinfo?access_token=",
	oauthPrefix: "goog_user_",
	sslkey: "/path/to/ssl/key",
	sslcert: "/path/to/ssl/cert",
	proxyPrefix: "/a", // subdirectory name to proxy to nodejs server
	proxyPort: 9008,
	hosts: ["localhost:8091"], // couchbase hosts
	bucket: "default", // couchbase bucket
	timeout: 1000 // request timeout (in ms)
}

if (typeof g !== 'undefined') {
	for (var i in config) {
		g[i] = config[i];
	}
} else if (module) {
	module.exports = config;
}
