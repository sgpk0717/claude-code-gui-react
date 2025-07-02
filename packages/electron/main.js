const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;
let clientProcess;

// 개발 모드 확인
const isDev = process.argv.includes('--dev');

function createWindow() {
  // 메인 윈도우 생성
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset'
  });

  // 개발 모드에서는 로컬 서버 사용
  if (isDev) {
    mainWindow.loadURL('http://localhost:7003');
    mainWindow.webContents.openDevTools();
  } else {
    // 프로덕션 모드에서는 빌드된 파일 사용
    mainWindow.loadFile(path.join(__dirname, '../client/dist/index.html'));
  }

  // 윈도우가 닫힐 때
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 메뉴 설정
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'Claude Code GUI',
      submenu: [
        {
          label: 'Claude Code GUI에 대하여',
          role: 'about'
        },
        { type: 'separator' },
        {
          label: '환경설정',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            // 환경설정 창 열기
          }
        },
        { type: 'separator' },
        { role: 'quit', label: '종료' }
      ]
    },
    {
      label: '편집',
      submenu: [
        { role: 'undo', label: '실행 취소' },
        { role: 'redo', label: '다시 실행' },
        { type: 'separator' },
        { role: 'cut', label: '잘라내기' },
        { role: 'copy', label: '복사' },
        { role: 'paste', label: '붙여넣기' },
        { role: 'selectAll', label: '모두 선택' }
      ]
    },
    {
      label: '보기',
      submenu: [
        { role: 'reload', label: '새로고침' },
        { role: 'forceReload', label: '강제 새로고침' },
        { role: 'toggleDevTools', label: '개발자 도구' },
        { type: 'separator' },
        { role: 'resetZoom', label: '실제 크기' },
        { role: 'zoomIn', label: '확대' },
        { role: 'zoomOut', label: '축소' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '전체 화면' }
      ]
    },
    {
      label: '세션',
      submenu: [
        {
          label: '새 세션',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-session');
          }
        },
        {
          label: '세션 닫기',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            mainWindow.webContents.send('menu-close-session');
          }
        }
      ]
    },
    {
      label: '윈도우',
      submenu: [
        { role: 'minimize', label: '최소화' },
        { role: 'close', label: '닫기' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 서버 시작
function startServer() {
  if (isDev) {
    console.log('개발 모드: 서버를 별도로 시작하세요');
    return;
  }

  const serverPath = path.join(__dirname, '../server');
  serverProcess = spawn('npm', ['start'], {
    cwd: serverPath,
    shell: true
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });
}

// IPC 핸들러 - 디렉토리 선택
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: '작업 폴더 선택',
    buttonLabel: '선택',
    message: 'Claude 세션을 시작할 폴더를 선택하세요'
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// IPC 핸들러 - 파일 선택
ipcMain.handle('select-file', async (event, options = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: options.title || '파일 선택',
    buttonLabel: options.buttonLabel || '선택',
    filters: options.filters || [
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// 앱이 준비되면
app.whenReady().then(() => {
  startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 모든 윈도우가 닫히면 앱 종료 (macOS 제외)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (serverProcess) {
      serverProcess.kill();
    }
    app.quit();
  }
});

// 앱이 종료될 때 서버도 종료
app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});