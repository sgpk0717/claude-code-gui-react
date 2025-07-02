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
    setTimeout(() => {
      try {
        fitAddon.fit();
      } catch (error) {
        console.warn('Initial fit failed, will retry:', error);
      }
    }, 0);

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
      if (!fitAddon || !term) return;
      
      try {
        // 렌더러가 준비되었는지 확인
        const renderer = (term as any)._core?._renderService?._renderer;
        if (!renderer || !renderer.value) {
          console.warn('Terminal renderer not ready, skipping resize');
          return;
        }
        
        fitAddon.fit();
        if (socket) {
          const dimensions = fitAddon.proposeDimensions();
          if (dimensions) {
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
      
      // 렌더러가 준비되었는지 확인
      const renderer = (term as any)._core?._renderService?._renderer;
      if (renderer && renderer.value) {
        handleResize();
        clearInterval(resizeTimer);
      } else if (resizeAttempts >= maxAttempts) {
        console.warn('Terminal renderer initialization timeout');
        clearInterval(resizeTimer);
      }
    }, 100);
    
    window.addEventListener('resize', handleResize);

    // 디바운싱된 리사이즈 핸들러
    const debouncedResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = setTimeout(() => {
        handleResize();
      }, 100);
    };

    // ResizeObserver로 컨테이너 크기 변경 감지
    const resizeObserver = new ResizeObserver(() => {
      debouncedResize();
    });
    
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      clearInterval(resizeTimer);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      term.dispose();
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