import { app, BrowserWindow, Menu } from 'electron';
import * as path from 'path';
import * as isDev from 'electron-is-dev';

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    kiosk: true,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.ts'),
      sandbox: true,
      webSecurity: true,
    },
  });

  // Load the app
  const startUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Block keyboard shortcuts for kiosk mode
  blockKioskShortcuts(mainWindow);
};

const blockKioskShortcuts = (window: BrowserWindow) => {
  window.webContents.on('before-input-event', (event, input) => {
    // Block Alt+F4
    if (input.alt && input.key.toLowerCase() === 'f4') {
      event.preventDefault();
    }
    // Block Ctrl+W (close tab)
    if (input.control && input.key.toLowerCase() === 'w') {
      event.preventDefault();
    }
    // Block Ctrl+Q (quit app)
    if (input.control && input.key.toLowerCase() === 'q') {
      event.preventDefault();
    }
    // Block Ctrl+Shift+I (DevTools in production)
    if (!isDev && input.control && input.shift && input.key.toLowerCase() === 'i') {
      event.preventDefault();
    }
    // Block F12 (DevTools in production)
    if (!isDev && input.key === 'F12') {
      event.preventDefault();
    }
    // Block Ctrl+Alt+Delete
    if (input.control && input.alt && input.key === 'Delete') {
      event.preventDefault();
    }
  });
};

// App event listeners
app.on('ready', createWindow);

app.on('window-all-closed', () => {
  // On macOS, apps stay active until user quits explicitly
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (mainWindow === null) {
    createWindow();
  }
});

// Remove default menu in production
if (!isDev) {
  Menu.setApplicationMenu(null);
}

// Prevent multiple instances (optional, useful for kiosk)
const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}
