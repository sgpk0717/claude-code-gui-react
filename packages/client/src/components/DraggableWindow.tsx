import React, { useRef, useEffect, useState } from 'react';
import Draggable from 'react-draggable';
import { ClaudeSession, WindowPosition, WindowSize } from '@claude-gui/shared';
import { Socket } from 'socket.io-client';
import { isElectron } from '../utils/electron';
import { InputController } from './InputController';

interface DraggableWindowProps {
  session: ClaudeSession;
  children: React.ReactNode;
  socket: Socket | null;
  onMove: (sessionId: string, position: WindowPosition) => void;
  onResize: (sessionId: string, size: WindowSize) => void;
  onActivate: (sessionId: string) => void;
  onClose: (sessionId: string) => void;
  onDuplicate: (sessionId: string) => void;
}

// 메뉴바 높이 계산
const getMenuBarHeight = () => {
  return isElectron() ? 93 : 56; // Electron: 타이틀바(36px) + 메뉴바(56px), 웹: 메뉴바(56px)
};

export function DraggableWindow({
  session,
  children,
  socket,
  onMove,
  onResize,
  onActivate,
  onClose,
  onDuplicate
}: DraggableWindowProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  
  // 리사이징 상태
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string>('');
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [sizeStart, setSizeStart] = useState({ width: 0, height: 0 });
  const [positionStart, setPositionStart] = useState({ x: 0, y: 0 });
  
  // 세션 데이터 확인
  console.log('Session data:', {
    id: session.id,
    position: session.position,
    size: session.size,
    isActive: session.isActive
  });

  const handleDragStart = (_e: any, data: any) => {
    console.log('Drag start:', {
      x: data.x,
      y: data.y,
      node: data.node
    });
    setIsDragging(true);
  };

  const handleDrag = (_e: any, data: any) => {
    // 드래그 중이 아니면 무시
    if (!isDragging) return;
    
    // 로컬 상태 업데이트
    setPosition({ x: data.x, y: data.y });
    
    // 픽셀을 퍼센트로 변환
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight - getMenuBarHeight()
    };
    
    const percentX = (data.x / viewport.width) * 100;
    const percentY = (data.y / viewport.height) * 100;
    
    console.log('Drag:', { 
      dataX: data.x, 
      dataY: data.y, 
      percentX, 
      percentY,
      viewport,
      isDragging
    });
    
    // 서버로 전송
    onMove(session.id, { x: percentX, y: percentY });
  };

  const handleDragStop = (_e: any, data: any) => {
    // 드래그 종료 시에도 최종 위치 업데이트
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight - getMenuBarHeight()
    };
    
    const percentX = (data.x / viewport.width) * 100;
    const percentY = (data.y / viewport.height) * 100;
    
    onMove(session.id, { x: percentX, y: percentY });
    setIsDragging(false);
  };

  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStart({ x: e.clientX, y: e.clientY });
    setSizeStart(currentSize);
    setPositionStart(currentPosition);
    document.body.style.cursor = getCursorForDirection(direction);
  };
  
  const getCursorForDirection = (direction: string) => {
    const cursorMap: { [key: string]: string } = {
      'top': 'ns-resize',
      'right': 'ew-resize',
      'bottom': 'ns-resize',
      'left': 'ew-resize',
      'top-left': 'nwse-resize',
      'top-right': 'nesw-resize',
      'bottom-left': 'nesw-resize',
      'bottom-right': 'nwse-resize'
    };
    return cursorMap[direction] || 'default';
  };

  const handleActivate = () => {
    onActivate(session.id);
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || !socket) return;
    
    try {
      // 각 문자를 개별적으로 전송 (Claude CLI에서 올바르게 처리되도록)
      for (const char of message) {
        socket.emit('cli:key', char, session.id);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // 엔터키 전송
      socket.emit('cli:key', '\r', session.id);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyInput = (key: string) => {
    if (!socket) return;
    
    try {
      // 특수키(Esc 등)를 터미널로 직접 전송
      socket.emit('cli:key', key, session.id);
    } catch (error) {
      console.error('Failed to send key:', error);
    }
  };

  // 픽셀 단위로 변환 (퍼센트 -> 픽셀)
  const getPixelPosition = () => {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight - getMenuBarHeight()
    };
    
    return {
      x: (session.position.x / 100) * viewport.width,
      y: (session.position.y / 100) * viewport.height
    };
  };

  const getPixelSize = () => {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight - getMenuBarHeight()
    };
    
    // 크기가 100%를 초과하지 않도록 제한
    const width = Math.min(session.size.width, 95);
    const height = Math.min(session.size.height, 95);
    
    return {
      width: (width / 100) * viewport.width,
      height: (height / 100) * viewport.height
    };
  };

  // 초기 위치와 크기 설정
  useEffect(() => {
    const pixelPos = getPixelPosition();
    const pixelSz = getPixelSize();
    setPosition(pixelPos);
    setSize(pixelSz);
  }, []); // 최초 마운트 시만
  
  // 리사이징 처리
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      let newWidth = sizeStart.width;
      let newHeight = sizeStart.height;
      let newX = positionStart.x;
      let newY = positionStart.y;
      
      // 방향에 따른 크기 조절
      if (resizeDirection.includes('right')) {
        newWidth = Math.max(400, sizeStart.width + deltaX);
      }
      if (resizeDirection.includes('left')) {
        newWidth = Math.max(400, sizeStart.width - deltaX);
        newX = positionStart.x + (sizeStart.width - newWidth);
      }
      if (resizeDirection.includes('bottom')) {
        newHeight = Math.max(300, sizeStart.height + deltaY);
      }
      if (resizeDirection.includes('top')) {
        newHeight = Math.max(300, sizeStart.height - deltaY);
        newY = positionStart.y + (sizeStart.height - newHeight);
      }
      
      // 로컬 상태 업데이트
      setSize({ width: newWidth, height: newHeight });
      setPosition({ x: newX, y: newY });
    };
    
    const handleMouseUp = () => {
      if (!isResizing) return;
      
      // 서버로 전송
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight - getMenuBarHeight()
      };
      
      const percentWidth = (size!.width / viewport.width) * 100;
      const percentHeight = (size!.height / viewport.height) * 100;
      const percentX = (position!.x / viewport.width) * 100;
      const percentY = (position!.y / viewport.height) * 100;
      
      onResize(session.id, { width: percentWidth, height: percentHeight });
      onMove(session.id, { x: percentX, y: percentY });
      
      setIsResizing(false);
      setResizeDirection('');
      document.body.style.cursor = '';
    };
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, resizeDirection, resizeStart, sizeStart, positionStart, position, size, session.id, onResize, onMove]);

  const currentPosition = position || getPixelPosition();
  const currentSize = size || getPixelSize();
  
  // 범위 계산
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight - getMenuBarHeight()
  };
  
  const bounds = {
    left: 0,
    top: 0,
    right: Math.max(0, viewport.width - currentSize.width),
    bottom: Math.max(0, viewport.height - currentSize.height)
  };
  
  console.log('Window render:', {
    sessionId: session.id,
    sessionPosition: session.position,
    sessionSize: session.size,
    currentPosition,
    currentSize,
    menuBarHeight: getMenuBarHeight(),
    viewport,
    bounds
  });

  return (
    <Draggable
      nodeRef={nodeRef}
      position={currentPosition}
      onStart={handleDragStart}
      onDrag={handleDrag}
      onStop={handleDragStop}
      handle=".window-header"
      bounds={bounds}
      cancel=".window-controls, .resize-handle"
      enableUserSelectHack={false}
    >
      <div ref={nodeRef} className="absolute" style={{ zIndex: session.zIndex || 1 }}>
        <div
          className={`bg-white border rounded-lg shadow-lg overflow-hidden relative ${
            session.isActive ? 'ring-2 ring-blue-500' : 'ring-1 ring-gray-300'
          }`}
          style={{ width: currentSize.width, height: currentSize.height }}
          onMouseDown={(e) => {
            // 컨트롤 버튼이 아니면 활성화
            if (!(e.target as HTMLElement).closest('.window-controls')) {
              handleActivate();
            }
          }}
        >
            {/* 창 헤더 */}
            <div 
              className="window-header bg-gray-100 px-4 py-2 flex items-center justify-between cursor-move border-b"
            >
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <div
                  className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    session.status.isRunning ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="font-medium text-sm truncate">{session.name}</span>
                <span className="text-xs text-gray-500 truncate">
                  {session.workingDirectory.split('/').pop()}
                </span>
              </div>
              
              <div className="flex items-center space-x-1 ml-2 flex-shrink-0 window-controls">
                {/* 복제 버튼 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(session.id);
                  }}
                  className="relative w-4 h-4 bg-blue-500 rounded-full hover:bg-blue-600 transition-all duration-300 ease-in-out group overflow-hidden"
                >
                  {/* 복제 아이콘 - 호버 시 회전하면서 나타남 */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transform rotate-180 group-hover:rotate-0 transition-all duration-300 ease-in-out">
                    <svg 
                      width="8" 
                      height="8" 
                      viewBox="0 0 8 8" 
                      fill="none" 
                      className="text-white"
                    >
                      {/* 두 개의 겹쳐진 사각형 (복제 의미) */}
                      <rect 
                        x="1" 
                        y="1" 
                        width="4" 
                        height="4" 
                        stroke="currentColor" 
                        strokeWidth="0.8" 
                        fill="none"
                      />
                      <rect 
                        x="3" 
                        y="3" 
                        width="4" 
                        height="4" 
                        stroke="currentColor" 
                        strokeWidth="0.8" 
                        fill="none"
                      />
                    </svg>
                  </div>
                </button>
                
                {/* 닫기 버튼 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(session.id);
                  }}
                  className="relative w-4 h-4 bg-red-500 rounded-full hover:bg-red-600 transition-all duration-300 ease-in-out group overflow-hidden"
                >
                  {/* X 아이콘 - 호버 시 회전하면서 나타남 */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transform rotate-180 group-hover:rotate-0 transition-all duration-300 ease-in-out">
                    <svg 
                      width="8" 
                      height="8" 
                      viewBox="0 0 8 8" 
                      fill="none" 
                      className="text-white"
                    >
                      <path 
                        d="M1 1l6 6M7 1L1 7" 
                        stroke="currentColor" 
                        strokeWidth="1.2" 
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </button>
              </div>
            </div>

            {/* 창 내용 */}
            <div className="flex flex-col" style={{ height: 'calc(100% - 50px)' }}>
              {/* 터미널 영역 */}
              <div className="flex-1 overflow-hidden">
                {children}
              </div>
              
              {/* 텍스트 입력 영역 (각 세션별) - 새로운 InputController 사용 */}
              <InputController 
                onSendMessage={handleSendMessage}
                onKeyInput={handleKeyInput}
                placeholder="Claude에게 메시지를 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈, Esc: 터미널로 전송)"
                disabled={!session.status.isRunning}
              />
            </div>
          
          {/* 리사이즈 핸들들 */}
          {/* 모서리 */}
          <div
            className="resize-handle absolute top-0 left-0 w-3 h-3 cursor-nwse-resize"
            onMouseDown={(e) => handleResizeStart(e, 'top-left')}
          />
          <div
            className="resize-handle absolute top-0 right-0 w-3 h-3 cursor-nesw-resize"
            onMouseDown={(e) => handleResizeStart(e, 'top-right')}
          />
          <div
            className="resize-handle absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize"
            onMouseDown={(e) => handleResizeStart(e, 'bottom-left')}
          />
          <div
            className="resize-handle absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize"
            onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
          />
          
          {/* 변 */}
          <div
            className="resize-handle absolute top-0 left-3 right-3 h-1 cursor-ns-resize"
            onMouseDown={(e) => handleResizeStart(e, 'top')}
          />
          <div
            className="resize-handle absolute bottom-0 left-3 right-3 h-1 cursor-ns-resize"
            onMouseDown={(e) => handleResizeStart(e, 'bottom')}
          />
          <div
            className="resize-handle absolute left-0 top-3 bottom-3 w-1 cursor-ew-resize"
            onMouseDown={(e) => handleResizeStart(e, 'left')}
          />
          <div
            className="resize-handle absolute right-0 top-3 bottom-3 w-1 cursor-ew-resize"
            onMouseDown={(e) => handleResizeStart(e, 'right')}
          />
        </div>
      </div>
    </Draggable>
  );
}