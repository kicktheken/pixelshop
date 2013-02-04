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
if [ ! -e "$JSDIR/config.js" ]; then
    echo "One time symlink of $JSDIR/config.js"
    ln -s "$DIR/config.js" "$JSDIR/config.js"
fi
if [ ! -e "$SERVERDIR/config.js" ]; then
    echo "One time symlink of $SERVERDIR/config.js"
    ln -s "$DIR/config.js" "$SERVERDIR/config.js"
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




