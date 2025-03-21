#!/usr/bin/node

import { program } from 'commander';
import puppeteer from 'puppeteer';

program
    .option('-u, --url [url]', 'URL to open', 'http://localhost:8668/')
    .option('-s, --screenshot-path [path]', 'A path where to save the screenshot', './screenshot.png')
    .option('-t, --timeout [ms]', 'Timeout after page loading before taking the screenshot',
            function(val) { return parseInt(val); }, 2000)
    .option('-W, --viewport-width [px]', 'The width of the viewport',
            function(val) { return parseInt(val); }, 1920)
    .option('-H, --viewport-height [px]', 'The height of the viewport',
            function(val) { return parseInt(val); }, 1080)
    .parse(process.argv);

async function run() {
    console.log('Launching headless Chrome...');
    const browser = await puppeteer.launch({
        args: ['--use-gl=egl']
    });

    console.log('Opening new page...');
    const page = await browser.newPage();

    const opts = program.opts();

    console.log('Setting viewport size to ' + opts.viewportWidth + 'x' + opts.viewportHeight + '...');
    await page.setViewport({ width: opts.viewportWidth, height: opts.viewportHeight });

    console.log('Opening ' + opts.url + ' ...');
    await page.goto(opts.url);

    console.log('Waiting for ' + opts.timeout + 'ms ...');
    await timeout(opts.timeout);

    console.log('Taking screenshot...');
    await page.screenshot({ path: opts.screenshotPath, type: 'png' });
    console.log('Page\'s screenshot saved to ' + opts.screenshotPath);

    console.log('Closing Chrome...');
    await browser.close();
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

run();
