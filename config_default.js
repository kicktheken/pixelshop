var config = {
    analytics: "", // google analytics
    proxyPrefix: "/a", // subdirectory name to proxy to nodejs server
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
