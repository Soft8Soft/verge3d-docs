#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: sync_ext.sh SRC"
    exit 1
fi

rm -rf ./api ./manual 

cp -rv $1/api .
cp -rv $1/manual .
