#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: prepare_lang.sh LANG [SOURCE_DIR]"
    exit 1
fi

if [ "$1" != 'en' ]; then
    rm -r api/$1 manual/$1

    cp -rv api/en api/$1
    cp -rv manual/en manual/$1

    find api/$1 manual/$1 -name "*.html" -exec sed -i "s/lang=\"en\"/lang=\"$1\"/g" {} \;
    find api/$1 manual/$1 -name "*.html" -exec sed -i "s/manual\/en\//manual\/$1\//g" {} \;

else

    if [ -z "$2" ]; then
        echo "Usage: prepare_lang.sh LANG SOURCE_DIR"
        exit 1
    fi

    rm -r api/$1 manual/$1
    rm -rf ./files

    cp -rv $2/docs/files .

    cp -v $2/docs/*.html .
    cp -v $2/docs/*.css .
    cp -v $2/docs/*.js .
    cp -v $2/docs/*.json .
    cp -v $2/docs/README.md .

    cp -rv $2/docs/manual/en manual
    cp -rv $2/docs/api/en api

fi
