const { app, BrowserWindow } = require('electron');
const { Menu } = require('electron');
const { shell } = require('electron');

const SHOW_FULLSCREEN = false;

function createWindow() {
    // create the browser window
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        show: false,
        webPreferences: {
            nodeIntegration: true
        }
    });

    if (SHOW_FULLSCREEN && process.platform !== 'darwin')
        win.removeMenu();

    win.show();
    win.setFullScreen(SHOW_FULLSCREEN);

    // and load the main file of the app
    win.loadFile('my_awesome_app.html');

    const menu = Menu.buildFromTemplate([{
        label: 'Menu',
        submenu: [
            {
                label: 'Soft8Soft Website',
                click() {
                    shell.openExternal('https://www.soft8soft.com');
                }
            },
            {
                label: 'Exit',
                click() {
                    app.quit()
                }
            }
        ]
    }]);

    Menu.setApplicationMenu(menu);
}

app.commandLine.appendSwitch('force_high_performance_gpu');

app.whenReady().then(createWindow);
