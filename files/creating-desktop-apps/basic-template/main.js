const { app, BrowserWindow } = require('electron');

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
}

app.whenReady().then(createWindow);
