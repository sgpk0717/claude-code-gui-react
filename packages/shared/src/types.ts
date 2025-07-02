export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  type: 'image';
  name: string;
  data: string; // base64
  mimeType: string;
}

export interface SocketEvents {
  'message:send': (content: string, attachments?: Attachment[]) => void;
  'message:receive': (message: Message) => void;
  'cli:output': (output: string) => void;
  'cli:input': (input: string) => void;
  'cli:key': (key: string) => void;
  'cli:sendMessage': (message: string) => void;
  'cli:resize': (cols: number, rows: number) => void;
  'cli:status': (status: CLIStatus) => void;
  'error': (error: string) => void;
}

export interface CLIStatus {
  isRunning: boolean;
  pid?: number;
}

// 다중 세션 관련 타입들
export interface ClaudeSession {
  id: string;
  name: string;
  workingDirectory: string;
  status: CLIStatus;
  position: WindowPosition;
  size: WindowSize;
  isActive: boolean;
  createdAt: Date;
}

export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  maxSessions: number;
  positions: Array<{
    position: WindowPosition;
    size: WindowSize;
  }>;
}

// Socket 이벤트 확장
export interface MultiSessionSocketEvents extends SocketEvents {
  'session:create': (workingDirectory: string, name?: string) => void;
  'session:remove': (sessionId: string) => void;
  'session:removed': (sessionId: string) => void;
  'session:activate': (sessionId: string) => void;
  'session:move': (sessionId: string, position: WindowPosition) => void;
  'session:resize': (sessionId: string, size: WindowSize) => void;
  'session:list': () => void;
  'session:update': (session: ClaudeSession) => void;
  'layout:apply': (templateId: string) => void;
  'layout:getTemplates': (sessionCount: number) => void;
  'layout:templates': (templates: LayoutTemplate[]) => void;
}