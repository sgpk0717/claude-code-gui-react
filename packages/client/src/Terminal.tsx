import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { Socket } from 'socket.io-client';
import 'xterm/css/xterm.css';

interface TerminalProps {
  socket: Socket | null;
  sessionId?: string;
  onKeyInput?: (key: string) => void;
}

export function TerminalComponent({ socket, sessionId, onKeyInput }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // xterm 세션 생성
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1b26',
        foreground: '#a9b1d6',
        cursor: '#c0caf5',
        black: '#32344a',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#ad8ee6',
        cyan: '#449dab',
        white: '#787c99',
        brightBlack: '#444b6a',
        brightRed: '#ff7a93',
        brightGreen: '#b9f27c',
        brightYellow: '#ff9e64',
        brightBlue: '#7da6ff',
        brightMagenta: '#bb9af7',
        brightCyan: '#0db9d7',
        brightWhite: '#acb0d0',
      },
      allowProposedApi: true,
      convertEol: true,
      screenReaderMode: false
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(terminalRef.current);
    
    // 터미널이 DOM에 완전히 마운트된 후 fit 실행
    // requestAnimationFrame을 사용하여 다음 렌더링 사이클에서 실행
    requestAnimationFrame(() => {
      // 추가로 setTimeout을 사용하여 안정성 확보
      setTimeout(() => {
        try {
          // 터미널이 아직 살아있고 DOM element가 존재하는지 확인
          if (terminalRef.current && fitAddon && term) {
            const core = (term as any)._core;
            if (core && !core._isDisposed) {
              fitAddon.fit();
            }
          }
        } catch (error) {
          console.warn('Initial fit failed, will retry:', error);
        }
      }, 100);
    });

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // 키 입력 처리
    term.onData((data) => {
      if (socket) {
        socket.emit('cli:key', data, sessionId);
      }
      if (onKeyInput) {
        onKeyInput(data);
      }
    });

    // 리사이즈 처리
    const handleResize = () => {
      if (!fitAddonRef.current || !xtermRef.current || !terminalRef.current) return;
      
      try {
        // 터미널이 dispose되었는지 확인
        const core = (xtermRef.current as any)._core;
        if (!core || core._isDisposed) {
          console.warn('Terminal disposed, skipping resize');
          return;
        }
        
        // 렌더러와 뷰포트가 준비되었는지 확인
        const renderer = core._renderService?._renderer;
        const viewport = core.viewport;
        
        if (!renderer || !renderer.value || !viewport || !viewport._viewportElement) {
          console.warn('Terminal renderer or viewport not ready, skipping resize');
          return;
        }
        
        // DOM element의 실제 크기 확인
        const rect = terminalRef.current.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          console.warn('Terminal container has zero dimensions, skipping resize');
          return;
        }
        
        // fit을 두 번 호출하여 정확한 크기 계산
        fitAddonRef.current.fit();
        
        // 터미널 리플로우를 위한 refresh
        const term = xtermRef.current;
        if (term && (term as any)._core) {
          const core = (term as any)._core;
          // 렌더 서비스 새로고침
          if (core._renderService && typeof core._renderService.clear === 'function') {
            core._renderService.clear();
          }
          // 뷰포트 새로고침
          if (core.viewport && typeof core.viewport.syncScrollArea === 'function') {
            core.viewport.syncScrollArea();
          }
        }
        
        if (socket) {
          const dimensions = fitAddonRef.current.proposeDimensions();
          if (dimensions && dimensions.cols > 0 && dimensions.rows > 0) {
            socket.emit('cli:resize', dimensions.cols, dimensions.rows, sessionId);
          }
        }
      } catch (error) {
        console.warn('Failed to resize terminal:', error);
      }
    };
    
    // 터미널이 완전히 렌더링된 후에 리사이즈 처리
    let resizeAttempts = 0;
    const maxAttempts = 50; // 최대 5초 (100ms * 50)
    
    const resizeTimer = setInterval(() => {
      resizeAttempts++;
      
      try {
        // 터미널과 DOM element가 준비되었는지 확인
        if (!terminalRef.current || !xtermRef.current || !fitAddonRef.current) {
          if (resizeAttempts >= maxAttempts) {
            console.warn('Terminal initialization timeout');
            clearInterval(resizeTimer);
          }
          return;
        }
        
        const core = (xtermRef.current as any)._core;
        if (!core || core._isDisposed) {
          clearInterval(resizeTimer);
          return;
        }
        
        // 렌더러와 뷰포트가 준비되었는지 확인
        const renderer = core._renderService?._renderer;
        const viewport = core.viewport;
        
        if (renderer && renderer.value && viewport && viewport._viewportElement) {
          handleResize();
          clearInterval(resizeTimer);
        } else if (resizeAttempts >= maxAttempts) {
          console.warn('Terminal renderer initialization timeout');
          clearInterval(resizeTimer);
        }
      } catch (error) {
        // 초기화 중 에러는 무시
        if (resizeAttempts >= maxAttempts) {
          clearInterval(resizeTimer);
        }
      }
    }, 100);
    
    window.addEventListener('resize', handleResize);

    // 디바운싱된 리사이즈 핸들러 (더 빠른 반응을 위해 시간 단축)
    const debouncedResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = setTimeout(() => {
        handleResize();
      }, 50); // 100ms에서 50ms로 단축
    };

    // 즉시 리사이즈 핸들러 (디바운싱 없이)
    const immediateResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      handleResize();
    };

    // ResizeObserver로 컨테이너 크기 변경 감지 (더 정확한 감지)
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // 크기가 실제로 변경되었는지 확인
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          debouncedResize();
        }
      }
    });

    // 전역 리사이즈 이벤트도 감지 (창 리사이징 완료 시)
    const handleGlobalResize = () => {
      immediateResize();
    };

    window.addEventListener('resize', handleGlobalResize);
    // 커스텀 이벤트도 감지 (DraggableWindow에서 발생시킬 예정)
    window.addEventListener('terminal-resize', handleGlobalResize);
    
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      // console.log('Terminal cleanup for session:', sessionId);
      clearInterval(resizeTimer);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', handleGlobalResize);
      window.removeEventListener('terminal-resize', handleGlobalResize);
      resizeObserver.disconnect();
      
      // 터미널이 이미 dispose되지 않았는지 확인
      try {
        const core = (term as any)._core;
        if (core && !core._isDisposed) {
          term.dispose();
        }
      } catch (error) {
        console.warn('Error disposing terminal:', error);
      }
    };
  }, [socket, onKeyInput, sessionId]);

  // Socket 이벤트 처리
  useEffect(() => {
    if (!socket || !xtermRef.current) return;

    const handleCliOutput = (output: string, outputSessionId?: string) => {
      // 이 터미널의 세션 ID와 일치하는 출력만 처리
      if (sessionId && outputSessionId && outputSessionId !== sessionId) {
        return;
      }
      
      if (xtermRef.current) {
        xtermRef.current.write(output);
      }
    };

    socket.on('cli:output', handleCliOutput);

    return () => {
      socket.off('cli:output', handleCliOutput);
    };
  }, [socket, sessionId]);

  return <div ref={terminalRef} className="h-full w-full" />;
}