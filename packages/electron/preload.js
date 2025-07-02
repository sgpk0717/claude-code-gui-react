const { contextBridge, ipcRenderer } = require('electron');

// 렌더러 프로세스에서 사용할 수 있는 API 노출
contextBridge.exposeInMainWorld('electronAPI', {
  // 디렉토리 선택
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  
  // 파일 선택
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  
  // 메뉴 이벤트 수신
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-new-session', callback);
    ipcRenderer.on('menu-close-session', callback);
  },
  
  // 플랫폼 정보
  platform: process.platform,
  
  // 버전 정보
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }
});