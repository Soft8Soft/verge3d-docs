#!/usr/bin/node

const program = require('commander');
const puppeteer = require('puppeteer');

program
    .option('-u, --url [url]', 'URL to open', 'http://localhost:8668/')
    .option('-s, --screenshot-path [path]', 'A path where to save the screenshot', './screenshot.png')
    .option('-t, --timeout [ms]', 'Timeout after page loading before taking the screenshot',
            function(val) { return parseInt(val); }, 1000)
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

    console.log('Waiting for application loading...');
    await page.evaluate(() => {
        return new Promise(resolve => {
            const interval = setInterval(() => {
                if (window.v3d.apps !== undefined && window.v3d.apps.length > 0) {
                    clearInterval(interval);
                    resolve();
                }
            }, 0);
        });
    });

    await page.evaluate(() => {
        const app = window.v3d.apps[0];
        return new Promise(resolve => {
            app.addEventListener('afterRender', () => {
                resolve();
            });
        });
    });

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

