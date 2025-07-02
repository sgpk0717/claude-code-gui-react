// Electron API 타입 정의
interface ElectronAPI {
  selectDirectory: () => Promise<string | null>;
  selectFile: (options?: {
    title?: string;
    buttonLabel?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => Promise<string | null>;
  onMenuAction: (callback: (event: any, action: string) => void) => void;
  platform: string;
  versions: {
    electron: string;
    chrome: string;
    node: string;
  };
}

// Electron 환경인지 확인
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && 
    window.electronAPI !== undefined;
};

// Electron API 가져오기
export const getElectronAPI = (): ElectronAPI | null => {
  if (isElectron()) {
    return (window as any).electronAPI;
  }
  return null;
};

// 디렉토리 선택 헬퍼
export const selectDirectory = async (): Promise<string | null> => {
  const api = getElectronAPI();
  if (api) {
    return await api.selectDirectory();
  }
  return null;
};

// 파일 선택 헬퍼
export const selectFile = async (options?: any): Promise<string | null> => {
  const api = getElectronAPI();
  if (api) {
    return await api.selectFile(options);
  }
  return null;
};