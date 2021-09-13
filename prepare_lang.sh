#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: prepare_lang.sh LANG [DIR]"
    exit 1
fi

if [ "$1" == 'en' ]; then
    if [ -z "$2" ]; then
        echo "Usage: prepare_lang.sh en SOURCE_DIR"
        exit 1
    fi

    echo "Copying EN files from $2..."

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

elif [ "$1" == 'i18n_back' ]; then
    if [ -z "$2" ]; then
        echo "Usage: prepare_lang.sh i18n_back DEST_DIR"
        exit 1
    fi

    echo "Copying i18n files back to $2..."

    for lang in "ru" "zh"; do
        rm -r $2/docs/api/$lang $2/docs/manual/$lang

        cp -rv api/$lang $2/docs/api/
        cp -rv manual/$lang $2/docs/manual/
        cp -v list.json $2/docs/
    done

else
    echo "Copying $1 files from EN directories..."

    rm -r api/$1 manual/$1

    cp -rv api/en api/$1
    cp -rv manual/en manual/$1

    find api/$1 manual/$1 -name "*.html" -exec sed -i "s/lang=\"en\"/lang=\"$1\"/g" {} \;
    find api/$1 manual/$1 -name "*.html" -exec sed -i "s/manual\/en\//manual\/$1\//g" {} \;
fi
