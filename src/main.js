import { app, BrowserWindow, shell, session } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

// Improve media autoplay and performance for video-heavy sites
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
app.commandLine.appendSwitch('ignore-gpu-blacklist')

const SVTPLAY_URL = 'https://www.svtplay.se/'

/**
 * Create the main application window and load svtplay.se
 */
async function createWindow() {
  const appPath = app.getAppPath()
  const iconPath = path.join(appPath, 'assets', 'icon.png')
  const hasIcon = fs.existsSync(iconPath)

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'SVT Play',
    backgroundColor: '#111111',
    autoHideMenuBar: true,
    icon: hasIcon ? iconPath : undefined,
    webPreferences: {
      preload: path.join(appPath, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      webSecurity: true,
      devTools: process.env.NODE_ENV !== 'production'
    }
  })

  // Keep navigation inside the app for svtplay.se, open others externally
  const handleExternal = (targetUrl) => {
    try {
      const url = new URL(targetUrl)
      if (url.hostname.endsWith('svt.se') || url.hostname.endsWith('svtplay.se')) {
        return false // allow in-app
      }
    } catch {}
    shell.openExternal(targetUrl)
    return true // handled externally
  }

  win.webContents.setWindowOpenHandler(({ url }) => ({
    action: handleExternal(url) ? 'deny' : 'allow'
  }))

  win.webContents.on('will-navigate', (event, url) => {
    if (handleExternal(url)) event.preventDefault()
  })

  // Optional: spoof a stable desktop UA to avoid any oddities
  const baseUA = win.webContents.getUserAgent()
  const ua = baseUA.replace(/Electron\/[\d.]+\s?/, '') // some sites dislike the Electron token

  await win.loadURL(SVTPLAY_URL, {
    userAgent: ua
  })
}

// Minimal permissions policy for this app
function setupPermissions() {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    // SVT Play typically doesn't need privileged permissions; deny by default
    const allowed = new Set([])
    callback(allowed.has(permission))
  })
}

app.whenReady().then(() => {
  setupPermissions()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
