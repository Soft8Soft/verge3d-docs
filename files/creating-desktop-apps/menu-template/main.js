const { app, BrowserWindow } = require('electron');
const { Menu } = require('electron');
const { shell } = require('electron');

function createWindow () {
    // create the browser window
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
        nodeIntegration: true
        }
    });

    // and load the index.html of the app
    win.loadFile('my_awesome_app.html');

    var menu = Menu.buildFromTemplate([{
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

app.whenReady().then(createWindow);
