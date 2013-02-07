var config = {
    analytics: "", // google analytics
    host: "localhost", // client host
    hosts: ["localhost:8091"], // couchbase hosts
    bucket: "default" // couchbase bucket
}

if (typeof g !== 'undefined') {
    for (var i in config) {
        g[i] = config[i];
    }
} else if (module) {
    module.exports = config;
}