import { app, shell, BrowserWindow, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { inicializarDb, fecharDb } from './db'
import { registrarHandlers } from './ipc'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const instanciaPrincipal = app.requestSingleInstanceLock()
if (!instanciaPrincipal) app.quit()

app.on('second-instance', () => {
  const janela = BrowserWindow.getAllWindows()[0]
  if (janela?.isMinimized()) janela.restore()
  janela?.focus()
})

app.on('will-quit', fecharDb)

if (instanciaPrincipal)
  app.whenReady().then(async () => {
    electronApp.setAppUserModelId('com.balcao')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    try {
      await inicializarDb()
    } catch (erro) {
      console.error('Falha ao preparar o banco de dados:', erro)
      dialog.showErrorBox(
        'Não foi possível abrir o Balcão',
        'Não conseguimos preparar seus dados com segurança. O aplicativo foi fechado para proteger seu histórico. Abra novamente para tentar de novo. Se continuar, entre em contato com a Jesga.'
      )
      app.quit()
      return
    }
    registrarHandlers()
    createWindow()

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
