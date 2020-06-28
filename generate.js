#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const util = require('util')

const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const { SitemapStream } = require('sitemap');

var dom = new JSDOM();
var document = dom.window.document;

const list = require('./list');

const HOST = 'https://www.soft8soft.com/docs/';
const OUTDIR = path.join(__dirname, 'output');
const LANGUAGES = ['en', 'ru', 'zh'];

var titles = {};

generate();

function generate() {

    console.log('Generating Documenation (' + LANGUAGES.join(', ') + ')');

    if (fs.existsSync(OUTDIR)){
        fs.removeSync(OUTDIR);
    }

    fs.ensureDirSync(OUTDIR);

    copyOutput('index.html');
    copyOutput('page.css');
    copyOutput('page.js');
    copyOutput('list.js');

    copyOutput('files');
    copyOutput('prettify');
    copyOutput('scenes');

    const sitemap = new SitemapStream({ hostname: HOST });
    const writeStream = fs.createWriteStream(path.join(OUTDIR, 'sitemap-docs.xml'));
    sitemap.pipe(writeStream);

    var pagePromises = [];

    LANGUAGES.forEach(function(lang) {

        var localeList = list[lang];

        for (var section in localeList) {

            var index = getSectionRoot(lang, section) + 'index.html';

            if (process.argv[2] == 'manual' && index.indexOf('manual') == -1)
                continue;

            var navigation = createNavigation(list, lang, section, index);

            pagePromises.push(writePage(index, navigation, sitemap));

            var categories = localeList[section];

            for (var category in categories) {
                var pages = categories[category];

                for (var pageName in pages) {
                    var pageFile = pages[pageName] + '.html';
                    pagePromises.push(writePage(pageFile, navigation, sitemap));
                }
            }
        }
    });

    Promise.all(pagePromises).then(function() {
        sitemap.end();
    });

}

/**
 * E.g manual/en/
 */
function getSectionRoot(lang, section) {

    var categories = list[lang][section];

    var roots = {};

    for (var category in categories) {
        var pages = categories[category];

        for (var pageName in pages) {

            var urlSplit = pages[pageName].split('/');
            var root = urlSplit[0] + '/' + urlSplit[1] + '/';

            roots[root] = (roots[root] || 0) + 1;
        }
    }

    var maxRoot = '';
    var maxRootCounter = 0;

    for (var root in roots) {
        if (roots[root] > maxRootCounter) {
            maxRoot = root;
            maxRootCounter = roots[root];
        }
    }

    return maxRoot;
}

function copyOutput(inFileOrDir, outFileOrDir) {
    outFileOrDir = outFileOrDir || inFileOrDir;

    fs.copySync(path.join(__dirname, inFileOrDir), path.join(OUTDIR, outFileOrDir));
}


function writePage(pageFile, navigation, sitemap) {

    return JSDOM.fromFile(path.join(__dirname, pageFile)).then(function(dom) {

        var url = HOST + pageFile;

        var head = dom.window.document.head;
        var pageTitle = titles[pageFile];

        // add missing title and description
        if (!dom.window.document.getElementsByTagName('title').length) {
            var titleDesc = JSDOM.fragment(`
                <title>${pageTitle} - Verge3D User Manual - Soft8Soft</title>
                <meta name="description" content="Learn how to use ${pageTitle} in your interactive 3D apps made with Verge3D or Three.js">
            `);
            head.insertBefore(titleDesc, head.firstChild);
        }

        var title = dom.window.document.getElementsByTagName('title')[0].textContent;
        var description = getMeta(dom.window.document, 'description', false);
        var image = getMeta(dom.window.document, 'og:image', true) ||
                'https://cdn.soft8soft.com/images/manual.jpg';

        head.appendChild(JSDOM.fragment(`
            <link rel="canonical" href="${url}">

            <meta property="og:type" content="article">
            <meta property="og:title" content="${title}">
            <meta property="og:description" content="${description}">
            <meta property="og:image" content="${image}">
            <meta property="og:image:width" content="1200">
            <meta property="og:image:height" content="630">
            <meta property="og:url" content="${url}">
            <meta property="og:site_name" content="Soft8Soft">
            <meta property="og:locale" content="en_US">

            <meta property="article:author" content="https://www.facebook.com/soft8soft">

            <meta property="article:tag" content="Verge3D">
            <meta property="article:tag" content="WebGL">
            <meta property="article:tag" content="3D">
            <meta property="article:tag" content="ThreeJS">
            <meta property="article:tag" content="interactive">
            <meta property="article:tag" content="realtime">
            <meta property="article:tag" content="3dweb">
            <meta property="article:tag" content="web3d">

            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:title" content="${title}">
            <meta name="twitter:description" content="${description}">
            <meta name="twitter:image" content="${image}">
            <meta name="twitter:creator" content="@soft8soft">
        `));

        head.appendChild(JSDOM.fragment(`
            <meta name="viewport" content="width=device-width, user-scalable=no, minimum-scale=1.0, maximum-scale=1.0">

            <!-- favicons from realfavicongenerator.net -->
            <link rel="apple-touch-icon" sizes="180x180" href="files/icons/apple-touch-icon.png">
            <link rel="icon" type="image/png" sizes="32x32" href="files/icons/favicon-32x32.png">
            <link rel="icon" type="image/png" sizes="16x16" href="files/icons/favicon-16x16.png">
            <link rel="manifest" href="files/icons/manifest.json">
            <link rel="mask-icon" href="files/icons/safari-pinned-tab.svg" color="#5bbad5 ">
        `));

        var imgLicenseData = createImgLicenseData(dom);
        if (imgLicenseData)
            head.appendChild(JSDOM.fragment(imgLicenseData));

        var body = dom.window.document.body;

        if (navigation) {
            var panel = JSDOM.fragment(`${navigation.firstChild.outerHTML}`);
            body.insertBefore(panel, body.firstChild);
        }

        var metrika = JSDOM.fragment(`
            <!-- Yandex.Metrika counter -->
            <script type="text/javascript" >
               (function(d, w, c) {
                 if (document.domain === "www.soft8soft.com") {
                   (w[c] = w[c] || []).push(function() {
                       try {
                           w.yaCounter46001298 = new Ya.Metrika({
                               id:46001298,
                               clickmap:true,
                               trackLinks:true,
                               accurateTrackBounce:true
                           });
                       } catch(e) { }
                   });

                   var n = d.getElementsByTagName("script")[0],
                       s = d.createElement("script"),
                       f = function() { n.parentNode.insertBefore(s, n); };
                   s.type = "text/javascript";
                   s.async = true;
                   s.src = "https://mc.yandex.ru/metrika/watch.js";

                   if (w.opera == "[object Opera]") {
                       d.addEventListener("DOMContentLoaded", f, false);
                   } else { f(); }
                 }
               })(document, window, "yandex_metrika_callbacks");
            </script>
            <noscript><div><img src="https://mc.yandex.ru/watch/46001298" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
            <!-- /Yandex.Metrika counter -->
        `);
        body.appendChild(metrika);

        var now = new Date();

        body.appendChild(JSDOM.fragment(`
            <div class="copyright">© <a href="https://www.soft8soft.com/" target="_blank">Soft8Soft – 3D Solutions for the Web</a><div>Last updated on ${now.toDateString()}</div></div>
        `));

        var pageText = resolveTemplates(dom.serialize(), pageTitle, pageFile);

        if (sitemap) {
            // changefreq and priority ignored by Google
            // date without milliseconds

            // HACK: temporary disable untranslated Russian/Chinese docs
            if (url.indexOf('/en/') >= 0)
                sitemap.write({ url: url, lastmodISO: new Date().toISOString().split('.')[0] + 'Z' });
        }

        var pageFileOut = path.join(OUTDIR, pageFile);

        fs.ensureFileSync(pageFileOut);
        return fs.promises.writeFile(pageFileOut, pageText);

    });

    return pagePromise;
}

/**
 * https://developers.google.com/search/docs/data-types/image-license-metadata
 */
function createImgLicenseData(dom) {

    var imgData = [];

    var imgs = dom.window.document.getElementsByTagName('img');

    for (var i = 0; i < imgs.length; i++) {
        var img = imgs[i];

        var src = img.getAttribute('src');
        if (src) {
            imgData.push(`
                {
                    "@context": "https://schema.org/",
                    "@type": "ImageObject",
                    "url": "${HOST + src}",
                    "license": "https://creativecommons.org/licenses/by/4.0/",
                    "acquireLicensePage": "https://www.soft8soft.com/contact/"
                }
            `);
        }
    }

    if (imgData.length)
        return '<script type="application/ld+json">[' + imgData.join(',') + ']</script>';
    else
        return null;
}

function resolveTemplates(text, name, path) {

    var pathOrigRel = path.replace(/^\//,'');

    var sectionTestRes = /(manual|api|examples)\//.exec(path);

    if (sectionTestRes) {
        var section = sectionTestRes[1].toString();

        path = path.split('.html')[0];
        path = path.split(section + '/')[1];

        // remove locale
        if (section == 'manual' || section == 'api')
            path = path.replace(/^[A-z0-9-]+\//, '');
    }

    text = text.replace(/\[name\]/gi, name);
    text = text.replace(/\[path\]/gi, path);
    text = text.replace(/\[page:([\w\.]+)\]/gi, "[page:$1 $1]"); // [page:name] to [page:name title]
    text = text.replace(/\[page:\.([\w\.]+) ([\w\.\s]+)\]/gi, "[page:" + name + ".$1 $2]"); // [page:.member title] to [page:name.member title]
    text = text.replace(/\[page:([\w\.]+) ([\w\.\s]+)\]/gi, "<a onclick=\"window.parent.setUrlFragment('$1')\" title=\"$1\">$2</a>"); // [page:name title]
    // text = text.replace(/\[member:.([\w]+) ([\w\.\s]+)\]/gi, "<a onclick=\"window.parent.setUrlFragment('" + name + ".$1')\" title=\"$1\">$2</a>");

    text = text.replace(/\[(member|property|method|param):([\w]+)\]/gi, "[$1:$2 $2]"); // [member:name] to [member:name title]
    text = text.replace(/\[(?:member|property|method):([\w]+) ([\w\.\s]+)\]\s*(\(.*\))?/gi, "<a onclick=\"window.parent.setUrlFragment('" + name + ".$2')\" target=\"_parent\" title=\"" + name + ".$2\" class=\"permalink\">#</a> .<a onclick=\"window.parent.setUrlFragment('" + name + ".$2')\" id=\"$2\">$2</a> $3 : <a class=\"param\" onclick=\"window.parent.setUrlFragment('$1')\">$1</a>");
    text = text.replace(/\[param:([\w\.]+) ([\w\.\s]+)\]/gi, "$2 : <a class=\"param\" onclick=\"window.parent.setUrlFragment('$1')\">$1</a>"); // [param:name title]

    text = text.replace(/\[link:([\w|\:|\/|\.|\-|\_]+)\]/gi, "[link:$1 $1]"); // [link:url] to [link:url title]
    text = text.replace(/\[link:([\w|\:|\/|\.|\-|\_|\(|\)|\#|\=]+) ([\w|\:|\/|\.|\-|\_|\s]+)\]/gi, "<a href=\"$1\"  target=\"_blank\">$2</a>"); // [link:url title]
    text = text.replace(/\*([\w|\d|\"|\-|\(][\w|\d|\ |\-|\/|\+|\-|\(|\)|\=|\,|\.\"]*[\w|\d|\"|\)]|\w)\*/gi, "<strong>$1</strong>"); // *

    text = text.replace(/\[example:([\w\_]+)\]/gi, "[example:$1 $1]"); // [example:name] to [example:name title]
    text = text.replace(/\[example:([\w\_]+) ([\w\:\/\.\-\_ \s]+)\]/gi, "<a href=\"https://cdn.soft8soft.com/demo/examples/index.html#$1\"  target=\"_blank\">$2</a>"); // [example:name title]

    text = text.replace(/<a class="param" onclick="window.parent.setUrlFragment\('\w+'\)">(null|this|Boolean|Object|Array|Number|String|Integer|Float|TypedArray|ArrayBuffer)<\/a>/gi, '<span class="param">$1</span>'); // remove links to primitive types

    text = text.replace(/\[sourceHint\]/gi, "<h2>Source</h2><p>For more info on how to obtain the source code of this module see <a href=\"manual/en/programmers_guide/How-to-obtain-Verge3D-sources.html\">this page</a>.</p>");

    if (text.match(/\[contents\]/))
        text = text.replace(/\[contents\]/g, createTOC(text, pathOrigRel));

    text = text.replace(/\[anchor:([\w]+)\]/gi, '<p><a href="' + pathOrigRel + '#$1" id="$1" class="permalink">#</a></p>');

    return text;
}

function createTOC(text, path) {
    var contents = '<!-- TOC -->\n';

    var anchors = text.matchAll(/\[anchor:([\w]+)\][\n ]*<h(\d)[\w"= ]*>(.+)<\/h\d>/g);

    var listLevel = 0;
    var listLevelDepth = 0;

    for (var anchor of anchors) {
        var id = anchor[1];
        var itemLevel = Number(anchor[2]);
        var title = anchor[3];

        if (itemLevel > listLevel) {

            listLevelDepth++;

            contents += '<ul><li>';

        } else if (itemLevel < listLevel) {

            listLevelDepth--;
            contents += '</li></ul></li><li>';

        } else {

            if (listLevel > 0)
                contents += '</li>';

            contents += '<li>';

        }

        contents += `<a href="${path}#${id}">${title}</a>`;

        listLevel = itemLevel;

    }

    for (var i = 0; i < listLevelDepth; i++)
        contents += '</li></ul>'

    contents += '<!-- /TOC -->';

    return contents;
}

function createNavigation(list, language, section, indexLink) {

    // Create the navigation panel using data from list.js

    var content = JSDOM.fragment(
       `<nav id="panel" class="collapsed">
          <h1><a href="${indexLink}">${section}</a></h1>

          <a id="expandButton" href="#">
            <span></span>
            <span></span>
            <span></span>
          </a>

          <div class="filterBlock" >
            <input type="text" id="filterInput" placeholder="Type to filter" autocapitalize="off" spellcheck="false">
            <a href="#" id="clearFilterButton">x</a>
          </div>

          <div id="content"></div>
        </nav>`
    );

    var navigation = content.getElementById('content');

    var localeList = list[language];
    var categories = localeList[section];

    for (var category in categories) {

        // Create categories

        var pages = categories[category];

        var categoryContainer = document.createElement('div');
        navigation.appendChild(categoryContainer);

        var categoryHead = document.createElement('h2');
        categoryHead.textContent = category;
        categoryContainer.appendChild(categoryHead);

        var categoryContent = document.createElement('ul');
        categoryContainer.appendChild(categoryContent);
        categoryContent.id = category.replace(/[' ]/g, '_');

        for (var pageName in pages) {

            // Create page links

            var pageURL = pages[pageName] + '.html';

            // Localisation

            var listElement = document.createElement('li');
            categoryContent.appendChild(listElement);

            var linkElement = createLink(category, pageName, pageURL)
            listElement.appendChild(linkElement);

            titles[pageURL] = pageName;
        }

    }

    return content;
}

function createLink(category, pageName, pageURL) {

    var link = document.createElement('a');
    link.href = pageURL;
    link.textContent = pageName;
    link.id = (category+'_'+pageName).replace(/[' ]/g, '_');

    return link;
}

function getMeta(document, metaName, usePropertyName) {
    var metas = document.getElementsByTagName('meta');

    for (var i = 0; i < metas.length; i++) {
        if (metas[i].getAttribute(usePropertyName ? 'property' : 'name') === metaName) {
            return metas[i].getAttribute('content');
        }
    }

    return '';
}

