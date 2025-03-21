#!/bin/bash

function is_unused {

    IGNORE="
        files/icons/android-chrome-512x512.png
        files/icons/android-chrome-192x192.png
        files/icons/favicon.ico
        files/blank/manual_social_zh.png
        files/blank/manual_social_ru.png
        files/blank/manual_social_en.png
    "

    if [[ "$IGNORE" == *"$1"* ]]; then
        return
    fi

    if [[ ( "$1" != *.jpg ) && ( "$1" != *.png ) ]]; then
        return
    fi

    if ! grep -q -R "$1" api manual *.js *.css; then
        echo $1
    fi
}
export -f is_unused

function linediff {
    BASE=`echo $1 | cut -d'/' -f3-`

    ONE=$1
    TWO="`echo $1 | cut -d'/' -f1-1`/$2/$BASE"

    LINES_ONE=`cat $ONE | wc -l`
    if [ -f $TWO ]; then
        LINES_TWO=`cat $TWO | wc -l`

        DIFF=`echo "$LINES_TWO - $LINES_ONE" | bc`
        ABSDIFF=`echo "define abs_my(x) { if (x>0) return x; return -x }; abs_my($DIFF)" | bc`
        MAXDIFF=10

        if [ $ABSDIFF -gt $MAXDIFF ]; then
            echo "$TWO: $ABSDIFF"
        fi
    else
        echo "$TWO: N/A"
    fi

}
export -f linediff

case $1 in
unused)
    find files -type f -exec bash -c 'is_unused "$0"' {} \;
    ;;
linediff)
    find api/en manual/en -type f -name "*.html" -exec bash -c 'linediff "$0" ru' {} \;
    ;;
largest)
    find files -type f -exec ls -al {} \; | sort -nr -k5 | head -n 25
    ;;
*)
    echo "Usage: report [unused | linediff | large]"
    echo "  unused — unused images"
    echo "  linediff — line difference between english and translated files"
    echo "  largest — print 25 largest files"
    exit 1
    ;;
esac
