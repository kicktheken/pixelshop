Pixelshop Server Documentation
==============================

npm packages:
express
couchbase (requires libcouchbase [https://github.com/couchbase/libcouchbase])
aws-sdk (requires libxml2-devel or libxml2-dev)

nodejs is expected to be proxied alongside an apache/nginx server with the '/a' location. For example, in nginx.conf within the server directive, add this:

location /a {
    proxy_pass http://localhost:9008;
    proxy_set_header X-Real-IP $remote_addr;
}