import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Message, CLIStatus, Attachment } from '@claude-gui/shared';
import { TerminalComponent } from './Terminal';
import { ImageUpload } from './ImageUpload';

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [cliStatus, setCliStatus] = useState<CLIStatus>({ isRunning: false });
  const [input, setInput] = useState('');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  useEffect(() => {
    const newSocket = io('/', {
      withCredentials: true
    });
    
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    newSocket.on('cli:status', (status: CLIStatus) => {
      setCliStatus(status);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const handleImageSelect = async (file: File) => {
    setSelectedImage(file);
    setShowImageUpload(false);
    
    // FormData로 이미지 업로드
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success && socket) {
        // 업로드된 이미지 경로를 Claude에 전달
        const message = `I've uploaded an image for you to analyze. The image is located at: ${data.path}\n\nPlease analyze this image and tell me what you see.\n`;
        socket.emit('cli:key', message);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('이미지 업로드에 실패했습니다.');
    }
  };

  const sendMessage = () => {
    console.log('sendMessage called:', { socket: !!socket, input });
    if (socket && input.trim()) {
      // 메시지를 Claude CLI로 전송
      console.log('Emitting message:send:', input);
      socket.emit('message:send', input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Claude Code GUI</h1>
        
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm">서버: {connected ? '연결됨' : '연결 끊김'}</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${cliStatus.isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm">Claude CLI: {cliStatus.isRunning ? '실행 중' : '중지됨'}</span>
            </div>
          </div>
          
          <div className="border rounded-lg h-[400px] overflow-hidden mb-4">
            <TerminalComponent socket={socket} />
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="한글 입력이 편한 곳에서 메시지를 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)"
                rows={3}
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={sendMessage}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  전송
                </button>
                <button
                  onClick={() => setShowImageUpload(!showImageUpload)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  이미지
                </button>
              </div>
            </div>
            
            {showImageUpload && (
              <ImageUpload onImageSelect={handleImageSelect} />
            )}
            
            {selectedImage && (
              <div className="bg-gray-100 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">선택된 이미지:</p>
                <div className="flex items-center gap-4">
                  <img 
                    src={URL.createObjectURL(selectedImage)} 
                    alt="Selected" 
                    className="h-20 w-20 object-cover rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{selectedImage.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="text-red-500 hover:text-red-600"
                  >
                    제거
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;