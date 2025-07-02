import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { API_PORT, Message, MultiSessionSocketEvents, ClaudeSession } from '@claude-gui/shared';
import { ClaudeManager } from './claude-manager';
import { MultiSessionManager } from './multi-session-manager';

const app = express();

// CORS 설정
app.use(cors({
  origin: (origin, callback) => {
    // 7003부터 7010까지의 포트를 모두 허용
    const allowedPorts = Array.from({length: 8}, (_, i) => `http://localhost:${7003 + i}`);
    if (!origin || allowedPorts.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// 이미지 업로드 디렉토리 생성
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Socket.IO 서버를 Express 앱과 같은 포트에서 실행
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // 7003부터 7010까지의 포트를 모두 허용
      const allowedPorts = Array.from({length: 8}, (_, i) => `http://localhost:${7003 + i}`);
      if (!origin || allowedPorts.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 각 클라이언트별 멀티 세션 매니저
const clientSessionManagers = new Map<string, MultiSessionManager>();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// 이미지 업로드 엔드포인트
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const filePath = req.file.path;
  const fileName = req.file.filename;
  
  res.json({ 
    success: true, 
    path: filePath,
    filename: fileName,
    url: `/uploads/${fileName}`
  });
});

// 업로드된 이미지 제공
app.use('/uploads', express.static(uploadDir));

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // 이 클라이언트용 멀티 세션 매니저 생성
  const sessionManager = new MultiSessionManager();
  clientSessionManagers.set(socket.id, sessionManager);

  // 세션 생성
  socket.on('session:create', (workingDirectory: string, name?: string) => {
    console.log('Creating session in:', workingDirectory);
    
    const session = sessionManager.createSession(
      workingDirectory,
      name,
      (sessionId, output) => {
        // 특정 세션의 출력을 클라이언트로 전송
        socket.emit('cli:output', output, sessionId);
      },
      (sessionId, status) => {
        // 세션 상태 업데이트를 클라이언트로 전송
        const updatedSession = sessionManager.getSession(sessionId);
        if (updatedSession) {
          socket.emit('session:update', updatedSession);
        }
      }
    );
    
    socket.emit('session:update', session);
  });

  // 세션 제거
  socket.on('session:remove', (sessionId: string) => {
    console.log('Removing session:', sessionId);
    const removed = sessionManager.removeSession(sessionId);
    if (removed) {
      socket.emit('session:removed', sessionId);
    }
  });

  // 세션 활성화
  socket.on('session:activate', (sessionId: string) => {
    sessionManager.activateSession(sessionId);
    const session = sessionManager.getSession(sessionId);
    if (session) {
      socket.emit('session:update', session);
    }
  });

  // 세션 이동
  socket.on('session:move', (sessionId: string, position: any) => {
    sessionManager.moveSession(sessionId, position);
    const session = sessionManager.getSession(sessionId);
    if (session) {
      socket.emit('session:update', session);
    }
  });

  // 세션 리사이즈
  socket.on('session:resize', (sessionId: string, size: any) => {
    sessionManager.resizeSession(sessionId, size);
    const session = sessionManager.getSession(sessionId);
    if (session) {
      socket.emit('session:update', session);
    }
  });

  // 레이아웃 템플릿 요청
  socket.on('layout:getTemplates', (sessionCount: number) => {
    const templates = sessionManager.getAvailableTemplates(sessionCount);
    socket.emit('layout:templates', templates);
  });

  // 레이아웃 적용
  socket.on('layout:apply', (templateId: string) => {
    const success = sessionManager.applyLayout(templateId);
    if (success) {
      // 모든 세션 상태 업데이트 전송
      const sessions = sessionManager.getAllSessions();
      sessions.forEach(session => {
        socket.emit('session:update', session);
      });
    }
  });

  // 세션 목록 요청
  socket.on('session:list', () => {
    const sessions = sessionManager.getAllSessions();
    sessions.forEach(session => {
      socket.emit('session:update', session);
    });
  });

  // 키 입력 처리 (특정 세션용)
  socket.on('cli:key', (key: string, sessionId?: string) => {
    console.log('Received key for session:', sessionId, JSON.stringify(key));
    
    if (sessionId) {
      sessionManager.sendInput(sessionId, key);
    } else {
      // 활성 세션으로 전송
      const activeSession = sessionManager.getActiveSession();
      if (activeSession) {
        sessionManager.sendInput(activeSession.id, key);
      }
    }
  });

  // 터미널 리사이즈 처리
  socket.on('cli:resize', (cols: number, rows: number, sessionId?: string) => {
    if (sessionId) {
      sessionManager.resizeSession(sessionId, { width: cols * 10, height: rows * 20 });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // 모든 세션 정리
    const manager = clientSessionManagers.get(socket.id);
    if (manager) {
      manager.cleanup();
      clientSessionManagers.delete(socket.id);
    }
  });
});

// 하나의 포트에서 Express와 Socket.IO 모두 실행
httpServer.listen(API_PORT, () => {
  console.log(`Server running on port ${API_PORT} (HTTP + WebSocket)`);
});