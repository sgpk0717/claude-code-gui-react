import { ClaudeSession } from '@claude-gui/shared';
import { isElectron } from '../utils/electron';
import { useState, useRef, useEffect } from 'react';

interface SidebarProps {
  sessions: ClaudeSession[];
  isOpen: boolean;
  onSelectSession: (sessionId: string) => void;
  onCloseSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onClose?: () => void;
}

export function Sidebar({ 
  sessions, 
  isOpen, 
  onSelectSession, 
  onCloseSession,
  onCreateSession,
  onClose
}: SidebarProps) {
  const activeSession = sessions.find(s => s.isActive);
  const [width, setWidth] = useState(256); // 기본 너비 256px (w-64)
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      
      const deltaX = e.clientX - startX.current;
      const newWidth = Math.max(200, Math.min(400, startWidth.current + deltaX));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [width]);

  return (
    <>
      {/* 오버레이 */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity z-40 lg:hidden ${
          isOpen ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* 사이드바 */}
      <div 
        className={`
          fixed left-0 bg-gray-900 text-gray-100 shadow-xl z-50
          transition-all duration-300 ease-in-out
          overflow-hidden
        `} 
        style={{ 
          top: isElectron() ? '92px' : '56px',
          height: isElectron() ? 'calc(100% - 92px)' : 'calc(100% - 56px)',
          width: isOpen ? `${width}px` : '0px'
        }}
      >
        <div className="h-full flex flex-col" style={{ width: `${width}px` }}>
          {/* 헤더 */}
          <div className="h-14 bg-gray-800 flex items-center justify-between px-4 border-b border-gray-700">
            <h2 className="font-semibold">세션 목록</h2>
            <button
              onClick={onCreateSession}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="새 세션"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* 세션 목록 */}
          <div className="flex-1 overflow-y-auto py-2">
            {sessions.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p className="text-sm">세션이 없습니다</p>
                <button
                  onClick={onCreateSession}
                  className="mt-2 text-blue-400 hover:text-blue-300 text-sm underline"
                >
                  첫 세션 만들기
                </button>
              </div>
            ) : (
              <div className="space-y-1 px-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`
                      group relative rounded-lg px-3 py-2 cursor-pointer
                      transition-all duration-200
                      ${session.isActive 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'hover:bg-gray-800 text-gray-300 hover:text-white'
                      }
                    `}
                    onClick={() => onSelectSession(session.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {session.name}
                        </div>
                        <div className={`text-xs truncate ${
                          session.isActive ? 'text-blue-200' : 'text-gray-500'
                        }`}>
                          {session.workingDirectory}
                        </div>
                      </div>
                      
                      {/* 상태 표시 */}
                      <div className="flex items-center space-x-2 ml-2">
                        <div className={`w-2 h-2 rounded-full ${
                          session.status.isRunning ? 'bg-green-400' : 'bg-red-400'
                        }`} />
                        
                        {/* 닫기 버튼 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCloseSession(session.id);
                          }}
                          className={`
                            opacity-0 group-hover:opacity-100 transition-opacity
                            p-1 rounded hover:bg-gray-700
                            ${session.isActive ? 'hover:bg-blue-700' : ''}
                          `}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 하단 정보 */}
          <div className="p-4 border-t border-gray-700 text-xs text-gray-400">
            <div className="flex justify-between">
              <span>총 {sessions.length}개 세션</span>
              {activeSession && (
                <span>활성: {activeSession.name}</span>
              )}
            </div>
          </div>
        </div>
        
        {/* 리사이저 핸들 */}
        <div
          className={`
            absolute top-0 right-0 w-1 h-full cursor-col-resize
            bg-gray-700 hover:bg-blue-500 transition-colors
            ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          `}
          style={{
            top: isElectron() ? '92px' : '56px',
            height: isElectron() ? 'calc(100% - 92px)' : 'calc(100% - 56px)'
          }}
          onMouseDown={handleMouseDown}
        />
      </div>
    </>
  );
}