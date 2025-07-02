import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  ClaudeSession, 
  LayoutTemplate, 
  WindowPosition,
  WindowSize,
  MultiSessionSocketEvents 
} from '@claude-gui/shared';
import { MenuBar } from './components/MenuBar';
import { DraggableWindow } from './components/DraggableWindow';
import { DirectorySelector } from './components/DirectorySelector';
import { TerminalComponent } from './Terminal';
import { isElectron } from './utils/electron';

export function MultiSessionApp() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [sessions, setSessions] = useState<ClaudeSession[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<LayoutTemplate[]>([]);
  const [showDirectorySelector, setShowDirectorySelector] = useState(false);

  useEffect(() => {
    const newSocket = io('/', {
      withCredentials: true
    }) as Socket<MultiSessionSocketEvents>;

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
      // 기존 세션 목록 요청
      newSocket.emit('session:list');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    // 세션 업데이트 수신
    newSocket.on('session:update', (session: ClaudeSession) => {
      setSessions(prev => {
        const index = prev.findIndex(i => i.id === session.id);
        if (index >= 0) {
          // 기존 세션 업데이트
          const updated = [...prev];
          updated[index] = session;
          return updated;
        } else {
          // 새 세션 추가
          return [...prev, session];
        }
      });
    });

    // 레이아웃 템플릿 수신
    newSocket.on('layout:templates', (templates: LayoutTemplate[]) => {
      setAvailableTemplates(templates);
    });

    // 세션 삭제 이벤트 수신
    newSocket.on('session:removed', (sessionId: string) => {
      setSessions(prev => prev.filter(i => i.id !== sessionId));
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // 세션 수가 변경될 때마다 사용 가능한 템플릿 요청
  useEffect(() => {
    if (socket && sessions.length > 0) {
      socket.emit('layout:getTemplates', sessions.length);
    }
  }, [socket, sessions.length]);

  const handleCreateSession = () => {
    setShowDirectorySelector(true);
  };

  const handleSelectDirectory = (directory: string, name?: string) => {
    if (socket) {
      socket.emit('session:create', directory, name);
    }
    setShowDirectorySelector(false);
  };

  const handleSessionMove = (sessionId: string, position: WindowPosition) => {
    if (socket) {
      socket.emit('session:move', sessionId, position);
    }
  };

  const handleSessionResize = (sessionId: string, size: WindowSize) => {
    if (socket) {
      socket.emit('session:resize', sessionId, size);
    }
  };

  const handleSessionActivate = (sessionId: string) => {
    if (socket) {
      socket.emit('session:activate', sessionId);
    }
  };

  const handleSessionClose = (sessionId: string) => {
    if (socket) {
      socket.emit('session:remove', sessionId);
    }
    // 로컬 상태에서도 제거
    setSessions(prev => prev.filter(i => i.id !== sessionId));
  };

  const handleApplyTemplate = (templateId: string) => {
    if (socket) {
      socket.emit('layout:apply', templateId);
    }
  };

  const handleShowDirectorySelector = () => {
    setShowDirectorySelector(true);
  };

  return (
    <div className="h-screen bg-gray-100 relative overflow-hidden">
      {/* macOS 타이틀바 영역 (Electron 전용) */}
      {isElectron() && (
        <div 
          className="h-9 bg-gray-800 border-b border-gray-700" 
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />
      )}
      
      {/* 메뉴바 */}
      <MenuBar
        sessions={sessions}
        availableTemplates={availableTemplates}
        onCreateSession={handleCreateSession}
        onApplyTemplate={handleApplyTemplate}
        onSelectDirectory={handleShowDirectorySelector}
      />

      {/* 메인 작업 영역 */}
      <div className="relative" style={{ height: isElectron() ? 'calc(100vh - 96px)' : 'calc(100vh - 56px)' }}>
        {sessions.length === 0 ? (
          // 빈 상태
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">🚀</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Claude Code GUI에 오신 것을 환영합니다!
              </h2>
              <p className="text-gray-600 mb-6">
                새 세션을 생성하여 시작하세요
              </p>
              <button
                onClick={handleCreateSession}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
              >
                + 첫 번째 세션 생성
              </button>
            </div>
          </div>
        ) : (
          // 세션들
          sessions.map((session) => (
            <DraggableWindow
              key={session.id}
              session={session}
              socket={socket}
              onMove={handleSessionMove}
              onResize={handleSessionResize}
              onActivate={handleSessionActivate}
              onClose={handleSessionClose}
            >
              <TerminalComponent 
                socket={socket} 
                sessionId={session.id}
              />
            </DraggableWindow>
          ))
        )}
      </div>

      {/* 연결 상태 표시 */}
      <div className="absolute bottom-4 right-4 flex items-center space-x-2 bg-white px-3 py-2 rounded-lg shadow-lg">
        <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm">
          {connected ? '연결됨' : '연결 끊김'}
        </span>
      </div>

      {/* 디렉토리 선택 모달 */}
      <DirectorySelector
        isOpen={showDirectorySelector}
        onSelect={handleSelectDirectory}
        onCancel={() => setShowDirectorySelector(false)}
      />
    </div>
  );
}