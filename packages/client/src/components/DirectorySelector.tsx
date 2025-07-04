import { useState, useEffect } from 'react';
import { isElectron, selectDirectory } from '../utils/electron';

interface DirectorySelectorProps {
  onSelect: (directory: string, name?: string) => void;
  onCancel: () => void;
  isOpen: boolean;
}

interface PathItem {
  path: string;
  pinned: boolean;
  lastUsed: number;
}

export function DirectorySelector({ onSelect, onCancel, isOpen }: DirectorySelectorProps) {
  const [selectedPath, setSelectedPath] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [recentPaths, setRecentPaths] = useState<PathItem[]>([]);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  // 로컬스토리지에서 최근 경로 불러오기
  useEffect(() => {
    const loadRecentPaths = () => {
      const stored = localStorage.getItem('recentPaths');
      if (stored) {
        setRecentPaths(JSON.parse(stored));
      } else {
        // 기본 경로
        const defaults: PathItem[] = [
          { path: '/Users/seonggukpark/Projects', pinned: false, lastUsed: Date.now() - 3000 },
          { path: '/Users/seonggukpark/Desktop', pinned: false, lastUsed: Date.now() - 2000 },
          { path: '/Users/seonggukpark/Documents', pinned: false, lastUsed: Date.now() - 1000 },
        ];
        setRecentPaths(defaults);
        localStorage.setItem('recentPaths', JSON.stringify(defaults));
      }
    };
    loadRecentPaths();
  }, [isOpen]);

  const handlePathSelect = (path: string) => {
    setSelectedPath(path);
    setSessionName(path.split('/').pop() || '');
    updateRecentPaths(path);
  };

  const updateRecentPaths = (path: string) => {
    setRecentPaths(prev => {
      // 이미 있는 경로인지 확인
      const existing = prev.find(p => p.path === path);
      let updated: PathItem[];
      
      if (existing) {
        // 기존 경로의 lastUsed 업데이트
        updated = prev.map(p => 
          p.path === path ? { ...p, lastUsed: Date.now() } : p
        );
      } else {
        // 새 경로 추가
        updated = [...prev, { path, pinned: false, lastUsed: Date.now() }];
      }
      
      // 로컬스토리지에 저장
      localStorage.setItem('recentPaths', JSON.stringify(updated));
      return updated;
    });
  };

  const togglePin = (path: string) => {
    setRecentPaths(prev => {
      const updated = prev.map(p => 
        p.path === path ? { ...p, pinned: !p.pinned } : p
      );
      localStorage.setItem('recentPaths', JSON.stringify(updated));
      return updated;
    });
  };

  const removePath = (path: string) => {
    setRecentPaths(prev => {
      const updated = prev.filter(p => p.path !== path);
      localStorage.setItem('recentPaths', JSON.stringify(updated));
      return updated;
    });
  };

  // 정렬: 고정된 것 먼저, 그 다음 최신 순
  const sortedPaths = [...recentPaths].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.lastUsed - a.lastUsed;
  });

  const handleConfirm = () => {
    if (selectedPath) {
      onSelect(selectedPath, sessionName || undefined);
      setSelectedPath('');
      setSessionName('');
    }
  };

  const handleCancel = () => {
    setSelectedPath('');
    setSessionName('');
    onCancel();
  };

  const handleSelectWithFinder = async () => {
    const path = await selectDirectory();
    if (path) {
      handlePathSelect(path);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[600px] max-w-full mx-4">
        <h2 className="text-xl font-bold mb-4">새 Claude 세션 생성</h2>
        
        
        {/* 세션 이름 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            세션 이름
          </label>
          <input
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="자동 생성됨"
          />
        </div>

        {/* 경로 입력 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            작업 디렉토리
          </label>
          <input
            type="text"
            value={selectedPath}
            onChange={(e) => setSelectedPath(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="/path/to/your/project"
          />
        </div>

        {/* 경로 선택 방법 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            작업 폴더 선택
          </label>
          
          {/* Electron 환경에서만 Finder 버튼 표시 */}
          {isElectron() && (
            <button
              onClick={handleSelectWithFinder}
              className="w-full mb-3 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-300 flex items-center justify-center gap-2 transition-colors"
            >
              <span className="text-lg">📁</span>
              <span>Finder에서 폴더 선택</span>
            </button>
          )}
          
          <div className="text-sm font-medium text-gray-700 mb-2">
            최근 경로:
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {sortedPaths.map((item) => (
              <div
                key={item.path}
                className="relative group"
                onMouseEnter={() => setHoveredPath(item.path)}
                onMouseLeave={() => setHoveredPath(null)}
              >
                <button
                  onClick={() => handlePathSelect(item.path)}
                  className={`w-full text-left px-3 py-2 pr-20 text-sm rounded border ${
                    item.pinned 
                      ? 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-900' 
                      : 'bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-700'
                  }`}
                >
                  {item.path}
                </button>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePin(item.path);
                    }}
                    className={`p-1 rounded hover:bg-gray-200 transition-opacity ${
                      item.pinned || hoveredPath === item.path ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    {item.pinned ? (
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removePath(item.path);
                    }}
                    className={`p-1 rounded hover:bg-red-100 transition-opacity ${
                      hoveredPath === item.path ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>


        {/* 버튼들 */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedPath}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md"
          >
            생성
          </button>
        </div>
      </div>
    </div>
  );
}