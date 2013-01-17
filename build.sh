#!/bin/bash

# script to generate optimized client build for Pixelshop

CURDIR=$(pwd)
DIR=$(cd "$(dirname "$0")"; pwd)
BUILDDIR="$DIR/clientbuild"
JSDIR="$DIR/client/js"
CSSDIR="$DIR/client/css"

if [ "$1" == "clean" ]; then
    set -x
    rm -rf $BUILDDIR
    exit
fi

echo "Building client with RequireJS w/ Almond"
cd $JSDIR
node ../../r.js -o build.js
cd $CSSDIR
node ../../r.js -o build.js
cd ../
find . -maxdepth 1 ! -name . | grep -vE '(css|js)' | xargs -I {} cp -R {} ../clientbuild/
cd $CURDIR
echo "Build complete"




