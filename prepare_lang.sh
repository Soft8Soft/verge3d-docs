#!/bin/bash

rm -r api/$1 manual/$1

cp -rv api/en api/$1
cp -rv manual/en manual/$1

find api/$1 manual/$1 -name "*.html" -exec sed -i "s/lang=\"en\"/lang=\"$1\"/g" {} \;
find api/$1 manual/$1 -name "*.html" -exec sed -i "s/manual\/en\//manual\/$1\//g" {} \;
