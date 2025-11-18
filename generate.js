#!/usr/bin/env node

import path from 'path';
import fs from 'fs';
import fse from 'fs-extra';
import { JSDOM } from 'jsdom';
import { SitemapStream } from 'sitemap';
import { fileURLToPath } from 'url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const HOST = 'https://www.soft8soft.com/docs/';
const OUTDIR = path.join(dirname, 'output');
const LANGUAGES = ['en', 'ru', 'zh'];

const GENERIC_TYPES = [
    'Any',
    'Array',
    'ArrayBuffer',
    'Boolean',
    'Constant',
    'Float',
    'Function',
    'HTMLElement',
    'HTMLCanvasElement',
    'HTMLImageElement',
    'Image',
    'ImageBitmap',
    'Integer',
    'null',
    'Object',
    'String',
    'this',
    'TypedArray',
    'undefined'
];


const dom = new JSDOM();
const document = dom.window.document;

let list = null;
let translations = null;
const titles = {};

generate();

// generate common fragments to improve performance
function genCommonJsdomFragments() {

    const viewport = JSDOM.fragment(`
        <meta name="viewport" content="width=device-width, initial-scale=1">
    `);

    const favicons = JSDOM.fragment(`
        <link rel="apple-touch-icon" sizes="180x180" href="${HOST}files/icons/apple-touch-icon.png">
        <link rel="icon" type="image/png" sizes="48x48" href="${HOST}files/icons/favicon-48x48.png">
        <link rel="icon" type="image/png" sizes="32x32" href="${HOST}files/icons/favicon-32x32.png">
        <link rel="icon" type="image/png" sizes="16x16" href="${HOST}files/icons/favicon-16x16.png">
        <link rel="manifest" href="${HOST}files/icons/manifest.json">
        <link rel="mask-icon" href="${HOST}files/icons/safari-pinned-tab.svg" color="#0048a5">
    `);

    const metrika = JSDOM.fragment(`
        <!-- Yandex.Metrika counter --> <script type="text/javascript" > (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)}; m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)}) (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym"); ym(46001298, "init", { clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true, ecommerce:"dataLayer" }); ym(46001298, 'addFileExtension', 'xz');</script> <noscript><div><img src="https://mc.yandex.ru/watch/46001298" style="position:absolute; left:-9999px;" alt="" /></div></noscript> <!-- /Yandex.Metrika counter -->
    `);


    return {
        viewport,
        favicons,
        metrika,
    }

}

function generate() {

    console.log('Generating Documentation (' + LANGUAGES.join(', ') + ')');

    list = JSON.parse(fs.readFileSync(path.join(dirname, 'list.json')));
    translations = JSON.parse(fs.readFileSync(path.join(dirname, 'translations.json')));

    if (fs.existsSync(OUTDIR)){
        fse.removeSync(OUTDIR);
    }

    fse.ensureDirSync(OUTDIR);

    copyOutput('index.html');
    copyOutput('page.css');
    copyOutput('page.js');
    copyOutput('list.json');

    copyOutput('files');
    copyOutput('prettify');

    const sitemap = new SitemapStream({ hostname: HOST });
    const writeStream = fs.createWriteStream(path.join(OUTDIR, 'sitemap-docs.xml'));
    sitemap.pipe(writeStream);

    const commonFragments = genCommonJsdomFragments();

    const pagePromises = [];

    // lang → section → category → page
    LANGUAGES.forEach(function(lang) {

        const now = new Date();
        commonFragments.footer = JSDOM.fragment(`
            <footer class="copyright">© <a href="${i18n(lang, 'https://www.soft8soft.com/')}" target="_blank">${i18n(lang, 'Soft8Soft – 3D Solutions for the Web')}</a><div>${i18n(lang, 'Last updated on')} ${now.toLocaleDateString(i18n(lang, 'en-US'), { month: 'long', day: 'numeric', year: 'numeric'})}</div></footer>
        `);

        const localeList = list[lang];

        for (const section in localeList) {

            const index = getSectionRoot(lang, section) + 'index.html';

            if (process.argv[2] == 'manual' && index.indexOf('manual') == -1)
                continue;

            commonFragments.navigation = createNavigation(list, lang, section, index);

            pagePromises.push(writePage(index, lang, sitemap, commonFragments));

            const categories = localeList[section];

            for (const category in categories) {
                const pages = categories[category];

                for (const pageName in pages) {
                    const pageFile = pages[pageName] + '.html';
                    pagePromises.push(writePage(pageFile, lang, sitemap, commonFragments));
                }
            }
        }
    });

    Promise.all(pagePromises).then(function() {
        sitemap.end();
    });

}

function i18n(lang, text, placeholder='', placeholder2='', placeholder3='') {
    const idx = translations.indexOf(text);
    if (idx == -1) {
        console.error('Translation not found: ' + text);
        return text;
    }

    let translated;
    if (lang == 'ru')
        translated = translations[idx + 1];
    else if (lang == 'zh')
        translated = translations[idx + 2];
    else
        translated = text;

    translated = translated.replaceAll('XXX', placeholder);
    translated = translated.replaceAll('YYY', placeholder2);
    translated = translated.replaceAll('ZZZ', placeholder3);

    return translated;
}

/**
 * E.g manual/en/
 */
function getSectionRoot(lang, section) {

    const categories = list[lang][section];

    const roots = {};

    for (const category in categories) {
        const pages = categories[category];

        for (const pageName in pages) {

            const urlSplit = pages[pageName].split('/');
            const root = urlSplit[0] + '/' + urlSplit[1] + '/';

            roots[root] = (roots[root] || 0) + 1;
        }
    }

    let maxRoot = '';
    let maxRootCounter = 0;

    for (const root in roots) {
        if (roots[root] > maxRootCounter) {
            maxRoot = root;
            maxRootCounter = roots[root];
        }
    }

    return maxRoot;
}

function copyOutput(inFileOrDir, outFileOrDir) {
    outFileOrDir = outFileOrDir || inFileOrDir;

    fse.copySync(path.join(dirname, inFileOrDir), path.join(OUTDIR, outFileOrDir));
}

function writePage(pageFile, lang, sitemap, commonFragmentsShared) {
    // make a clone to prevent race condition in promise callback
    const commonFragments = { ...commonFragmentsShared };

    return JSDOM.fromFile(path.join(dirname, pageFile)).then(function(dom) {
        const url = HOST + pageFile;

        const head = dom.window.document.head;
        const pageTitle = titles[pageFile];

        // add missing title and description
        if (!dom.window.document.getElementsByTagName('title').length) {
            let titleDesc = JSDOM.fragment(`
                <title>${pageTitle} - ${i18n(lang, 'Verge3D User Manual')} - ${i18n(lang, 'Soft8Soft')}</title>
                <meta name="description" content="${i18n(lang, 'Learn how to use XXX in your interactive 3D apps made with Verge3D', pageTitle)}">
            `);
            head.insertBefore(titleDesc, head.firstChild);
        }

        // to prevent fragment discards
        for (const name in commonFragments)
            commonFragments[name] = commonFragments[name].cloneNode(true);

        head.appendChild(commonFragments.viewport);

        const title = dom.window.document.getElementsByTagName('title')[0].textContent;
        const description = getMeta(dom.window.document, 'description', false);
        const image = getMeta(dom.window.document, 'og:image', true) ||
                `https://www.soft8soft.com/docs/files/blank/manual_social_${lang}.png`;

        head.appendChild(JSDOM.fragment(`
            <link rel="canonical" href="${url}">

            <meta property="og:type" content="website">
            <meta property="og:title" content="${title}">
            <meta property="og:description" content="${description}">
            <meta property="og:image" content="${image}">
            <meta property="og:image:width" content="1200">
            <meta property="og:image:height" content="630">
            <meta property="og:url" content="${url}">
            <meta property="og:site_name" content="${i18n(lang, 'Soft8Soft')}">
            <meta property="og:locale" content="${i18n(lang, 'en_US')}">

            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:title" content="${title}">
            <meta name="twitter:description" content="${description}">
            <meta name="twitter:image" content="${image}">
            <meta name="twitter:creator" content="@soft8soft">
        `));
        head.appendChild(commonFragments.favicons);

        const imgLicenseData = createImgLicenseData(dom);
        if (imgLicenseData)
            head.appendChild(JSDOM.fragment(imgLicenseData));

        if (pageFile.endsWith('FAQ.html')) {
            const faqData = createFaqData(dom);
            head.appendChild(JSDOM.fragment(faqData));
        }

        const body = dom.window.document.body;

        const panel = commonFragments.navigation;
        body.insertBefore(panel, body.firstChild);

        body.appendChild(commonFragments.metrika);
        body.appendChild(commonFragments.footer);

        Array.from(body.getElementsByTagName('v3d-tabs')).forEach(function(v3dTabsElem) {
            v3dTabsElem.parentNode.insertBefore(createTabs(v3dTabsElem), v3dTabsElem);
            v3dTabsElem.parentNode.removeChild(v3dTabsElem);
        });

        const pageText = resolveTemplates(dom.serialize(), pageTitle, pageFile, lang);

        if (sitemap) {
            // changefreq and priority ignored by Google
            // date without milliseconds
            sitemap.write({ url: url, lastmodISO: new Date().toISOString().split('.')[0] + 'Z' });
        }

        const pageFileOut = path.join(OUTDIR, pageFile);

        fse.ensureFileSync(pageFileOut);
        return fs.promises.writeFile(pageFileOut, pageText);

    });
}

/**
 * https://developers.google.com/search/docs/data-types/image-license-metadata
 */
function createImgLicenseData(dom) {

    const imgData = [];

    const imgs = dom.window.document.getElementsByTagName('img');

    for (let i = 0; i < imgs.length; i++) {
        const img = imgs[i];

        const src = img.getAttribute('src');
        if (src) {
            imgData.push(`
                {
                    "@context": "https://schema.org/",
                    "@type": "ImageObject",
                    "contentUrl": "${HOST + src}",
                    "license": "https://creativecommons.org/licenses/by/4.0/",
                    "acquireLicensePage": "https://www.soft8soft.com/contact/",
                    "creditText": "Made by Verge3D developers",
                    "creator": {
                        "@type": "Organization",
                        "name": "Soft8Soft"
                    },
                    "copyrightNotice": "© ${new Date().getFullYear()} Soft8Soft. All rights reserved."
                }
            `);
        }
    }

    if (imgData.length)
        return '<script type="application/ld+json">[' + imgData.join(',') + ']</script>';
    else
        return null;
}

function collectFaqAnswer(elem) {
    const next = elem.nextElementSibling;
    if (['P', 'OL', 'UL', 'DL', 'DT', 'DD', 'CODE'].includes(next.nodeName)) {
        // replace unsupported tags by <p>
        const html = next.outerHTML.replaceAll('<dl>', '<p>').
                                    replaceAll('<dt>', '<p>').
                                    replaceAll('<dd>', '<p>').
                                    replaceAll('<code>', '<p>').
                                    replaceAll('<code class="lang-html">', '<p>').
                                    replaceAll('</dl>', '</p>').
                                    replaceAll('</dt>', '</p>').
                                    replaceAll('</dd>', '</p>').
                                    replaceAll('</code>', '</p>');
        return html + collectFaqAnswer(next);
    } else if (['IMG'].includes(next.nodeName)) {
        // pass these tags
        return collectFaqAnswer(next);
    } else {
        // stop
        return '';
    }
}

/**
 * https://developers.google.com/search/docs/appearance/structured-data/faqpage
 */
function createFaqData(dom) {

    const faqData = [];

    const questions = dom.window.document.getElementsByTagName('h3');

    for (let i = 0; i < questions.length; i++) {
        const questionElem = questions[i];
        const question = questionElem.textContent;

        if (question) {
            const answer = collectFaqAnswer(questionElem).replaceAll('"', '\\"').replaceAll('\n', '');
            faqData.push(`
                {
                    "@type": "Question",
                    "name": "${question}",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "${answer}"
                    }
                }
            `);
        }
    }

    return `
    <script type="application/ld+json">
        {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [${faqData.join(',')}]
        }
    </script>`;
}

function demoURL(id, url) {

    let path = 'https://cdn.soft8soft.com/demo/';

    if (url.includes('max'))
        path += 'max/';
    else if (url.includes('maya'))
        path += 'maya/';
    else
        path += 'blender/';

    if (id.includes('/'))
        path = path + id + '.html';
    else
        path = path + id + '/' + id + '.html';

    return path;
}

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }).replace('Gltf', 'GLTF').replace('Vr', 'VR');
}

function resolveTemplates(text, name, path, lang) {

    const pathOrigRel = path.replace(/^\//,'');

    const sectionTestRes = /(manual|api)\//.exec(path);

    if (sectionTestRes) {
        const section = sectionTestRes[1].toString();

        path = path.split('.html')[0];
        path = path.split(section + '/')[1];

        // remove locale
        if (section == 'manual' || section == 'api')
            path = path.replace(/^[A-z0-9-]+\//, '');
    }

    text = text.replace(/\[name\]/gi, name);
    text = text.replace(/\[path\]/gi, path);
    text = text.replace(/\[page:([\w\u0400-\u04ff\.]+)\]/gi, "[page:$1 $1]"); // [page:name] to [page:name title]
    text = text.replace(/\[page:\.([\w\u0400-\u04ff\.]+) ([\w\u0400-\u04ff\.\s\-]+)\]/gi, "[page:" + name + ".$1 $2]"); // [page:.member title] to [page:name.member title]

    // resolve [page:name title]
    text = text.replace(/\[page:([\w\u0400-\u04ff\.]+) ([\w\u0400-\u04ff\.\s\-]+)\]/gi, function(match, p1, p2) {
        return `<a href=\"${getPageURL(p1, lang)}\">${p2}</a>`;
    });

    text = text.replace(/\[(member|property|method|param|def):([\w|]+)\]/gi, "[$1:$2 $2]"); // [member:name] to [member:name title]

    text = text.replace(/\[(member|property|method):([\w]+) ([\w\.\s]+)\]\s*(\(.*\))?/gi, function(match, p1, p2, p3, p4) {
        const urlProp = getPageURL(name + '.' + p3, lang);
        const urlType = getPageURL(p2, lang);
        const typeSepChar = (p1 == 'method') ? '→' : '<span class="param">:</span>';

        let outStr = `<a href="${urlProp}" class="permalink">#</a> .<a href="${urlProp}" id="${p3}">${p3}</a>${p4 || ''}`;
        if (p2 !== 'undefined')
            outStr += ` ${typeSepChar} <a href="${urlType}" class="param">${p2}</a>`;
        return outStr;
    });

    text = text.replace(/\[param:([\w\.|]+) ([\w\.\s]+)\]/gi, function(match, p1, p2) {
        let outStr = `${p2} <span class="param">:</span> `;
        p1.split('|').forEach(p1i => {
            outStr += `<a href=\"${getPageURL(p1i, lang)}\" class="param">${p1i}</a> | `;
        });
        return outStr.slice(0, -3);
    });

    text = text.replace(/\[def:(\w+) ([\w\.\s]+)\]/gi, function(match, p1, p2) {
        const urlProp = getPageURL(name + '.' + p1, lang);
        return `<a href="${urlProp}" class="permalink">#</a><a href="${urlProp}" id="${p1}">${p2}</a>`;
    });

    text = text.replace(/\[link:([\w|\:|\/|\.|\-|\_]+)\]/gi, "[link:$1 $1]"); // [link:url] to [link:url title]
    text = text.replace(/\[link:([\w|\u0400-\u04ff|\:|\/|\.|\-|\_|\(|\)|\#|\=|\?|\&]+) ([\w|\u0400-\u04ff|\:|\/|\.|\-|\_|\s|\=|\?|\u4e00-\u9fa5|\uff08|\uff09|\u0400-\u04ff]+)\]/gi, "<a href=\"$1\"  target=\"_blank\">$2</a>"); // [link:url title]
    text = text.replace(/\*([\u4e00-\u9fa5|\u0400-\u04ff|\w|\d|\"|\-|\(\.][\u4e00-\u9fa5|\u0400-\u04ff|\w|\d|\ |\-|\/|\+|\-|\(|\)|\=|\,|\.\"]*[\u4e00-\u9fa5|\u0400-\u04ff|\w|\d|\"|\)]|\w)\*/gi, "<strong>$1</strong>"); // *text*

    /**
     * HACK: Strip code blocks before processing backticks and then insert them
     * back. Backticks that generally denote inline code should not be treated
     * so if they happen to be inside a code block (where they are used for
     * template literals), because they would be wrongly replaced with inline
     * code markup and it would render code inside code blocks incorrect.
     */
    const codeBlocks = [];
    text = text.replace(/<code[^>]*>[\s\S]*?<\/code>/gim, match => {
        codeBlocks.push(match);
        return `$CODE_BLOCK_${codeBlocks.length - 1}_BACKTICK_HACK_MARKER`;
    });

    text = text.replace(/\`\`(.*?)\`\`/gi, '<code class="inline raw">$1</code>'); // ``code``
    text = text.replace(/\`(.*?)\`/gi, '<code class="inline">$1</code>'); // `code`
    text = text.replace(/\$CODE_BLOCK_(\d+)_BACKTICK_HACK_MARKER/gi,
            (match, p1) => codeBlocks[p1]);

    text = text.replace(/\[sourceHint\]/gi, `<h2>${i18n(lang, 'Source')}</h2><p>${i18n(lang, 'For more info on how to obtain the source code of this module see <a href="manual/en/programmers_guide/How-to-obtain-Verge3D-sources.html">this page</a>.')}</p>`);

    text = text.replace(/\[demo:([\w\_\/\-]+) *([\w\u0400-\u04ff- ]*)\]/gi, function(match, p1, p2) {
        const demoTitle = p2 ? '«'+p2+'»' : toTitleCase(p1.split('/')[0].replace('_', ' '));
        return `<p class="demoNote">${i18n(lang, 'For usage example, check out the <a href="XXX" target="_blank" rel="nofollow" title="Launch the YYY demo">YYY</a> demo (source files available in the <a href="manual/en/introduction/App-Manager.html#asset_store" target="_blank">Asset Store</a>).', demoURL(p1, path), demoTitle)}</p>`;
    });

    text = text.replace(/\[demoLink:([\w\_\/\-]+) *([\w\u0400-\u04ff- ]*)\]/gi, function(match, p1, p2) {
        const demoTitle = p2 ? '«'+p2+'»' : toTitleCase(p1.split('/')[0].replace('_', ' '));
        return `<a href=\"${demoURL(p1, path)}\" target=\"_blank\" rel="nofollow" title="${i18n(lang, 'Launch the XXX demo', demoTitle)}">${demoTitle}</a>`;
    });

    text = text.replace(/\[contents\]/g, function() { return createTOC(text, pathOrigRel) });

    text = text.replace(/\[anchor:([\w|\u4e00-\u9fa5|\u0400-\u04ff]+)\]/gi, '<p><a href="' + pathOrigRel + '#$1" id="$1" class="permalink">#</a></p>');

    text = text.replace(/\[anchor:%TOC_DECLEVEL_HACK\][\n ]*<h(\d)[\w"= ]*>(.*)<\/h\d>/gi, '');

    return text;
}

/**
 * Use [anchor:%TOC_DECLEVEL_HACK]<h1></h1> hack to decrease the current level
 * of nesting by 1, e.g.:
 *
 * [anchor:a] <h2>A</h2>
 * [anchor:b] <h3>B</h3>
 * [anchor:c] <h4>C</h4>
 * [anchor:%TOC_DECLEVEL_HACK]<h1></h1>
 * [anchor:d] <h2>D</h2> - this line wouldn't be on the same level as "A" if not for the hack
 */
function createTOC(text, path) {
    let contents = '<!-- TOC -->\n';

    const anchors = text.matchAll(/\[anchor:([\w|\u4e00-\u9fa5|\u0400-\u04ff]+|%TOC_DECLEVEL_HACK)\][\n ]*<h(\d)[\w"= ]*>(.*)<\/h\d>/g);

    let listLevel = 0;
    let listLevelDepth = 0;

    for (const anchor of anchors) {
        const id = anchor[1];
        const itemLevel = Number(anchor[2]);
        const title = anchor[3];

        if (id === '%TOC_DECLEVEL_HACK') {
            listLevelDepth--;
            contents += '</li></ul>';
            continue;
        }

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

    for (let i = 0; i < listLevelDepth; i++)
        contents += '</li></ul>'

    contents += '<!-- /TOC -->';

    return contents;
}

// create navigation panel using data from list.json
function createNavigation(list, lang, section, indexLink) {

    const isManual = indexLink.startsWith('manual/');

    const content = JSDOM.fragment(`
       <nav id="panel" class="collapsed">
          <div class="h1-like"><a href="${indexLink}">${section}</a></div>

          <a id="expandButton" href="#">
            <span></span>
            <span></span>
            <span></span>
          </a>

          <div>
            <input type="text" id="filterInput" placeholder="${i18n(lang, 'Type to filter')}" autocapitalize="off" spellcheck="false">
            <div id="clearFilterButton">×</div>

            <div class="filter-flavor${isManual ? '' : ' hidden'}">
              <label class="filter-flavor-item" title="${i18n(lang, 'Show / hide Verge3D for Blender sections')}"><input type="checkbox" data-flavor="blender" checked>${i18n(lang, 'Blender')}</label>
              <label class="filter-flavor-item" title="${i18n(lang, 'Show / hide Verge3D for 3ds Max sections')}"><input type="checkbox" data-flavor="max" checked>${i18n(lang, '3ds Max')}</label>
              <label class="filter-flavor-item" title="${i18n(lang, 'Show / hide Verge3D for Maya sections')}"><input type="checkbox" data-flavor="maya" checked>${i18n(lang, 'Maya')}</label>
            </div>
          </div>

          <div id="content"></div>
        </nav>
    `);

    const navigation = content.getElementById('content');

    const localeList = list[lang];
    const categories = localeList[section];

    for (const category in categories) {

        // Create categories

        const pages = categories[category];

        const categoryContainer = document.createElement('div');
        navigation.appendChild(categoryContainer);

        const categoryHead = document.createElement('div');
        categoryHead.textContent = category;
        categoryHead.className = 'h2-like';
        categoryContainer.appendChild(categoryHead);

        const categoryContent = document.createElement('ul');
        categoryContainer.appendChild(categoryContent);
        categoryContent.id = category.replace(/[' ]/g, '_');

        for (const pageName in pages) {

            // create page links

            const pageURL = pages[pageName] + '.html';

            // localization

            const listElement = document.createElement('li');
            categoryContent.appendChild(listElement);

            const linkElement = createLink(category, pageName, pageURL)
            listElement.appendChild(linkElement);

            titles[pageURL] = pageName;
        }

    }

    return content;
}

function createLink(category, pageName, pageURL) {
    const link = document.createElement('a');
    link.href = pageURL;
    link.textContent = pageName;
    link.id = (category+'_'+pageName).replace(/[' ]/g, '_');

    return link;
}

function getMeta(document, metaName, usePropertyName) {
    const metas = document.getElementsByTagName('meta');

    for (let i = 0; i < metas.length; i++) {
        if (metas[i].getAttribute(usePropertyName ? 'property' : 'name') === metaName) {
            return metas[i].getAttribute('content');
        }
    }

    return '';
}

function getPageURL(pageName, lang) {

    pageName = handleGenericTypes(pageName, lang);

    const splitPageName = decomposePageName(pageName, '.', '#');

    const localeList = list[lang];
    const pageURLsFound = [];

    for (const section in localeList) {

        const categories = localeList[section];

        for (const category in categories) {
            const pages = categories[category];

            if (splitPageName[0] in pages) {
                pageURLsFound.push(pages[splitPageName[0]] + '.html' + splitPageName[1]);
            }
        }

    };
    if (pageURLsFound.length) {
        // prioritize the URL which starts with "api"
        return pageURLsFound.sort()[0];
    } else {
        return 'javascript:;';
    }

}

function handleGenericTypes(pageName, lang) {
    if (GENERIC_TYPES.indexOf(pageName) > -1) {
        switch (lang) {
            case 'ru':
                return 'Типы Ява Скрипта.' + pageName;
            default:
                return 'JavaScript Types.' + pageName;
        }
    } else
        return pageName;
}

function decomposePageName(pageName, oldDelimiter, newDelimiter) {

    // Helper function for separating the member (if existing) from the pageName
    // For example: 'Geometry.morphTarget' can be converted to
    // ['Geometry', '.morphTarget'] or ['Geometry', '#morphTarget']
    // Note: According RFC 3986 no '#' allowed inside of an URL fragment!

    let parts = [];

    const dotIndex = pageName.indexOf(oldDelimiter);

    if (dotIndex !== -1) {

        parts = pageName.split(oldDelimiter);
        parts[1] = newDelimiter + parts[1];

    } else {

        parts[0] = pageName;
        parts[1] = '';

    }

    return parts;
}

/**
 * Create the markup for the custom tabs widget. The source element is expected
 * to look like this:
 *
 * <v3d-tabs active="1" style="...">
 *     <label>Tab Label 0</label>
 *     <div>Tab Content 0</div>
 *     <label>Tab Label 1</label>
 *     <div>Tab Content 1</div>
 *     <!-- ... -->
 * </v3d-tabs>
 *
 * - the "active" attribute specifies the initially selected tab.
 * - the "style" attribute can be used to define CSS rules for the widget's root
 * element
 */
function createTabs(v3dTabsElem) {
    const tabNodes = Array.from(v3dTabsElem.childNodes).filter(function(node) {
        return node.tagName !== undefined;
    });

    // ensure that there are pairs (label + content)
    if (tabNodes.length % 2) {
        tabNodes.push(document.createElement('div'));
    }

    const tabsContainer = createElementFromString('<div class="v3d-tabs"></div>');
    tabsContainer.setAttribute('style', v3dTabsElem.getAttribute('style'));

    const radioGrpName = Math.random();
    const checkedInput = Number(v3dTabsElem.getAttribute('active')) || 0;
    for (let i = 0; i < tabNodes.length; i+=2) {
        const tabIndex = i / 2;
        const checkedAttr = tabIndex === checkedInput ? 'checked' : '';
        const tabId = `${radioGrpName}-${tabIndex}`;

        const radioInput = createElementFromString(`
            <input
                type="radio"
                name="${radioGrpName}"
                ${checkedAttr}
                class="v3d-tab-input"
                id="${tabId}"
            ></input>
        `);

        const tabLabel = tabNodes[i];
        tabLabel.classList.add('v3d-tab-label');
        tabLabel.setAttribute('for', tabId);

        // fix styling issue with empty label being a bit out of place
        tabLabel.innerHTML = tabLabel.innerHTML || '&nbsp;';

        const tabContent = tabNodes[i + 1];
        tabContent.classList.add('v3d-tab-content');

        tabsContainer.appendChild(radioInput);
        tabsContainer.appendChild(tabLabel);
        tabsContainer.appendChild(tabContent);
    }

    return tabsContainer;
}

/**
 * Create an HTML element from the given string parameter.
 * @param {String} str The HTML element represented as a string.
 * @retuns {HTMLElement} The instance of the root HTMLElement contained within
 * the given string.
 */
function createElementFromString(str) {
    const template = document.createElement('template');
    template.innerHTML = str.trim(); // avoiding text nodes
    return template.content.firstChild;
}
