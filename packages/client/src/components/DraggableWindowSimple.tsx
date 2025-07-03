import React, { useRef, useEffect, useState } from 'react';
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
}

const getMenuBarHeight = () => {
  return isElectron() ? 93 : 56;
};

export function DraggableWindowSimple({
  session,
  children,
  socket,
  onMove,
  onResize,
  onActivate,
  onClose
}: DraggableWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  
  // 드래그 상태
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [windowStart, setWindowStart] = useState({ x: 0, y: 0 });
  
  // 리사이즈 상태
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [sizeStart, setSizeStart] = useState({ width: 0, height: 0 });
  
  // 픽셀 단위로 변환
  const getPixelPosition = () => {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight - getMenuBarHeight()
    };
    
    return {
      x: Math.round((session.position.x / 100) * viewport.width),
      y: Math.round((session.position.y / 100) * viewport.height)
    };
  };

  const getPixelSize = () => {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight - getMenuBarHeight()
    };
    
    return {
      width: Math.round((session.size.width / 100) * viewport.width),
      height: Math.round((session.size.height / 100) * viewport.height)
    };
  };
  
  // 현재 위치와 크기
  const pixelPos = getPixelPosition();
  const pixelSize = getPixelSize();
  
  // 드래그 핸들러
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setWindowStart(pixelPos);
    
    console.log('Drag start:', {
      mousePos: { x: e.clientX, y: e.clientY },
      windowPos: pixelPos,
      windowSize: pixelSize
    });
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && windowRef.current) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        
        const newX = windowStart.x + dx;
        const newY = windowStart.y + dy;
        
        windowRef.current.style.left = `${newX}px`;
        windowRef.current.style.top = `${newY}px`;
      }
      
      if (isResizing && windowRef.current) {
        const dx = e.clientX - resizeStart.x;
        const dy = e.clientY - resizeStart.y;
        
        const newWidth = Math.max(400, sizeStart.width + dx);
        const newHeight = Math.max(300, sizeStart.height + dy);
        
        windowRef.current.style.width = `${newWidth}px`;
        windowRef.current.style.height = `${newHeight}px`;
      }
    };
    
    const handleMouseUp = () => {
      if (isDragging && windowRef.current) {
        const rect = windowRef.current.getBoundingClientRect();
        const viewport = {
          width: window.innerWidth,
          height: window.innerHeight - getMenuBarHeight()
        };
        
        const percentX = (rect.left / viewport.width) * 100;
        const percentY = ((rect.top - getMenuBarHeight()) / viewport.height) * 100;
        
        onMove(session.id, { x: percentX, y: percentY });
        setIsDragging(false);
      }
      
      if (isResizing && windowRef.current) {
        const rect = windowRef.current.getBoundingClientRect();
        const viewport = {
          width: window.innerWidth,
          height: window.innerHeight - getMenuBarHeight()
        };
        
        const percentWidth = (rect.width / viewport.width) * 100;
        const percentHeight = (rect.height / viewport.height) * 100;
        
        onResize(session.id, { width: percentWidth, height: percentHeight });
        setIsResizing(false);
      }
    };
    
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, windowStart, resizeStart, sizeStart, session.id, onMove, onResize]);
  
  // 리사이즈 핸들러
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({ x: e.clientX, y: e.clientY });
    setSizeStart(pixelSize);
  };
  
  const handleActivate = () => {
    onActivate(session.id);
  };
  
  const handleSendMessage = async (message: string) => {
    if (!message.trim() || !socket) return;
    
    try {
      for (const char of message) {
        socket.emit('cli:key', char, session.id);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      socket.emit('cli:key', '\r', session.id);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };
  
  return (
    <div
      ref={windowRef}
      className="absolute"
      style={{
        left: `${pixelPos.x}px`,
        top: `${pixelPos.y}px`,
        width: `${pixelSize.width}px`,
        height: `${pixelSize.height}px`,
        zIndex: session.zIndex || 1
      }}
      onMouseDown={handleActivate}
    >
      <div
        className={`bg-white border rounded-lg shadow-lg overflow-hidden h-full ${
          session.isActive ? 'ring-2 ring-blue-500' : 'ring-1 ring-gray-300'
        }`}
      >
        {/* 창 헤더 */}
        <div 
          className="window-header bg-gray-100 px-4 py-2 flex items-center justify-between cursor-move border-b"
          onMouseDown={handleDragStart}
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
              }}
              className="w-3 h-3 bg-yellow-500 rounded-full hover:bg-yellow-600 transition-colors"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
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
        <div className="flex flex-col h-full">
          <div className="flex-1 min-h-0">
            {children}
          </div>
          
          {/* 입력 영역 - 새로운 InputController 사용 */}
          <InputController 
            onSendMessage={handleSendMessage}
            placeholder="Claude에게 메시지를 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)"
            disabled={!session.status.isRunning}
          />
        </div>
        
        {/* 리사이즈 핸들 */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={handleResizeStart}
          style={{
            background: 'linear-gradient(135deg, transparent 50%, #ccc 50%)'
          }}
        />
      </div>
    </div>
  );
}