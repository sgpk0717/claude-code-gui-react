import React, { useRef, useEffect, useState } from 'react';
import Draggable from 'react-draggable';
import { Resizable } from 'react-resizable';
import { ClaudeSession, WindowPosition, WindowSize } from '@claude-gui/shared';
import { Socket } from 'socket.io-client';
import { isElectron } from '../utils/electron';
import 'react-resizable/css/styles.css';

interface DraggableWindowProps {
  session: ClaudeSession;
  children: React.ReactNode;
  socket: Socket | null;
  onMove: (sessionId: string, position: WindowPosition) => void;
  onResize: (sessionId: string, size: WindowSize) => void;
  onActivate: (sessionId: string) => void;
  onClose: (sessionId: string) => void;
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
  onClose
}: DraggableWindowProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  
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

  const handleResize = (_e: any, { size }: any) => {
    // 픽셀을 퍼센트로 변환
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight - getMenuBarHeight()
    };
    
    const percentWidth = (size.width / viewport.width) * 100;
    const percentHeight = (size.height / viewport.height) * 100;
    
    // 로컬 상태 업데이트
    setSize({ width: size.width, height: size.height });
    
    // 서버로 전송
    onResize(session.id, { width: percentWidth, height: percentHeight });
  };

  const handleActivate = () => {
    onActivate(session.id);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !socket) return;
    
    try {
      const message = inputText;
      setInputText('');
      
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 100);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputText]);

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
      cancel=".window-controls"
      enableUserSelectHack={false}
    >
      <div ref={nodeRef} className="absolute" style={{ zIndex: session.zIndex || 1 }}>
        <Resizable
          width={currentSize.width}
          height={currentSize.height}
          onResize={handleResize}
          minConstraints={[400, 300]}
          maxConstraints={[window.innerWidth * 0.9, (window.innerHeight - getMenuBarHeight()) * 0.9]}
        >
          <div
            className={`bg-white border rounded-lg shadow-lg overflow-hidden ${
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // 최소화 기능 (나중에 구현)
                  }}
                  className="w-3 h-3 bg-yellow-500 rounded-full hover:bg-yellow-600 transition-colors"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // 최대화 기능 (나중에 구현)
                  }}
                  className="w-3 h-3 bg-green-500 rounded-full hover:bg-green-600 transition-colors"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(session.id);
                  }}
                  className="w-3 h-3 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                />
              </div>
            </div>

            {/* 창 내용 */}
            <div className="flex flex-col" style={{ height: 'calc(100% - 50px)' }}>
              {/* 터미널 영역 */}
              <div className="flex-1 overflow-hidden">
                {children}
              </div>
              
              {/* 텍스트 입력 영역 (각 세션별) */}
              <div className="border-t bg-gray-50 p-3">
                <div className="flex space-x-2">
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Claude에게 메시지를 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{ minHeight: '40px', maxHeight: '100px' }}
                    rows={1}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputText.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    전송
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Resizable>
      </div>
    </Draggable>
  );
}