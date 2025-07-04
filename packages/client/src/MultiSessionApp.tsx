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
import { Sidebar } from './components/Sidebar';
import { isElectron } from './utils/electron';

export function MultiSessionApp() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [sessions, setSessions] = useState<ClaudeSession[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<LayoutTemplate[]>([]);
  const [showDirectorySelector, setShowDirectorySelector] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [removedSessions, setRemovedSessions] = useState<Set<string>>(new Set());

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
      // console.log('Session update event received:', session.id);
      
      // 제거된 세션인지 확인
      setRemovedSessions(removed => {
        if (removed.has(session.id)) {
          // console.log('Ignoring update for removed session:', session.id);
          return removed;
        }
        
        setSessions(prev => {
          const index = prev.findIndex(i => i.id === session.id);
          if (index >= 0) {
            // 기존 세션 업데이트
            const updated = [...prev];
            updated[index] = session;
            // console.log('Updated existing session:', session.id);
            return updated;
          } else {
            // 새 세션 추가
            // console.log('Adding new session:', session.id);
            return [...prev, session];
          }
        });
        
        return removed;
      });
    });

    // 레이아웃 템플릿 수신
    newSocket.on('layout:templates', (templates: LayoutTemplate[]) => {
      setAvailableTemplates(templates);
    });

    // 세션 삭제 이벤트 수신
    newSocket.on('session:removed', (sessionId: string) => {
      // console.log('Session removed event received:', sessionId);
      
      // 제거된 세션 목록에 추가
      setRemovedSessions(prev => new Set(prev).add(sessionId));
      
      setSessions(prev => {
        // console.log('Previous sessions:', prev.map(s => s.id));
        const filtered = prev.filter(i => i.id !== sessionId);
        // console.log('Filtered sessions:', filtered.map(s => s.id));
        return filtered;
      });
    });

    setSocket(newSocket);

    return () => {
      console.log('Cleaning up socket listeners');
      newSocket.off('session:update');
      newSocket.off('session:removed');
      newSocket.off('layout:templates');
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
    console.log('handleSessionClose called for:', sessionId);
    if (socket) {
      console.log('Emitting session:remove for:', sessionId);
      socket.emit('session:remove', sessionId);
    }
    // 서버에서 session:removed 이벤트를 받아서 처리하므로 여기서는 제거하지 않음
  };

  const handleSessionDuplicate = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session && socket) {
      // 동일한 디렉토리로 새 세션 생성 (이름에 "복사본" 추가)
      const duplicateName = `${session.name} 복사본`;
      console.log('Duplicating session:', sessionId, 'to directory:', session.workingDirectory);
      socket.emit('session:create', session.workingDirectory, duplicateName);
    }
  };

  const handleApplyTemplate = (templateId: string) => {
    if (socket) {
      socket.emit('layout:apply', templateId);
    }
  };


  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSelectSession = (sessionId: string) => {
    if (socket) {
      socket.emit('session:activate', sessionId);
    }
  };

  // console.log('Current sessions in state:', sessions.map(s => s.id));
  
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
        onToggleSidebar={handleToggleSidebar}
      />

      {/* 사이드바 */}
      <Sidebar
        sessions={sessions}
        isOpen={isSidebarOpen}
        onSelectSession={handleSelectSession}
        onCloseSession={handleSessionClose}
        onCreateSession={handleCreateSession}
        onClose={() => setIsSidebarOpen(false)}
        onWidthChange={setSidebarWidth}
      />

      {/* 메인 작업 영역 */}
      <div 
        className="relative transition-all duration-300 ease-in-out"
        style={{ 
          height: isElectron() ? 'calc(100vh - 96px)' : 'calc(100vh - 56px)',
          marginLeft: isSidebarOpen ? `${sidebarWidth}px` : '0'
        }}
      >
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
          sessions.filter(session => {
            // 혹시 undefined나 null 세션이 있으면 필터링
            return session && session.id;
          }).map((session) => {
            // console.log('Rendering session:', session.id);
            return (
              <DraggableWindow
                key={session.id}
                session={session}
                socket={socket}
                onMove={handleSessionMove}
                onResize={handleSessionResize}
                onActivate={handleSessionActivate}
                onClose={handleSessionClose}
                onDuplicate={handleSessionDuplicate}
              >
                <TerminalComponent 
                  socket={socket} 
                  sessionId={session.id}
                />
              </DraggableWindow>
            );
          })
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