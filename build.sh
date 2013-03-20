#!/bin/bash

# script to generate optimized client build for Pixelshop

CURDIR=$(pwd)
DIR=$(cd "$(dirname "$0")"; pwd)
BUILDDIR="$DIR/clientbuild"
JSDIR="$DIR/client/js"
CSSDIR="$DIR/client/css"
SERVERDIR="$DIR/server/js"

if [ "$1" == "clean" ]; then
    set -x
    rm -rf $BUILDDIR
    exit
fi

if [ ! -f "$DIR/config.js" ]; then
    echo "Please \"cp confg_default.js config.js\" to setup your configuration"
    exit
fi

cd $DIR
cp "$DIR/config.js" "$JSDIR/config.js"
cp  "$DIR/config.js" "$SERVERDIR/config.js"
echo "Building client with RequireJS w/ Almond"
cd $JSDIR
node ../../r.js -o build.js
cd $CSSDIR
node ../../r.js -o build.js
cd ../
find . -maxdepth 1 ! -name . | grep -vE '(css|js)' | xargs -I {} cp -R {} ../clientbuild/
cd $CURDIR
echo "Build complete"




