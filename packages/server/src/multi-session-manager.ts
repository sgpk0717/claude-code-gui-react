import { ClaudeManager } from './claude-manager';
import { ClaudeSession, WindowPosition, WindowSize, LayoutTemplate } from '@claude-gui/shared';
import { LAYOUT_TEMPLATES, DEFAULT_WINDOW_SIZE, DEFAULT_WINDOW_POSITION } from '@claude-gui/shared';

export class MultiSessionManager {
  private sessions: Map<string, ClaudeManager> = new Map();
  private sessionData: Map<string, ClaudeSession> = new Map();
  private activeSessionId: string | null = null;

  constructor() {}

  createSession(
    workingDirectory: string, 
    name?: string,
    onOutput?: (sessionId: string, output: string) => void,
    onStatusChange?: (sessionId: string, status: any) => void
  ): ClaudeSession {
    const id = this.generateSessionId();
    const sessionName = name || this.generateSessionName(workingDirectory);
    
    // Claude Manager 생성
    const claudeManager = new ClaudeManager();
    
    // 세션 데이터 생성
    const session: ClaudeSession = {
      id,
      name: sessionName,
      workingDirectory,
      status: { isRunning: false },
      position: this.getNextPosition(),
      size: DEFAULT_WINDOW_SIZE,
      isActive: this.sessions.size === 0, // 첫 번째 세션은 자동으로 활성화
      createdAt: new Date()
    };

    // Claude CLI 시작
    claudeManager.start(
      (output) => {
        if (onOutput) {
          onOutput(id, output);
        }
      },
      (status) => {
        // 상태 업데이트
        session.status = status;
        this.sessionData.set(id, session);
        if (onStatusChange) {
          onStatusChange(id, status);
        }
      },
      workingDirectory // 작업 디렉토리 지정
    );

    // 저장
    this.sessions.set(id, claudeManager);
    this.sessionData.set(id, session);
    
    if (session.isActive) {
      this.activeSessionId = id;
    }

    return session;
  }

  removeSession(sessionId: string): boolean {
    const claudeManager = this.sessions.get(sessionId);
    const session = this.sessionData.get(sessionId);
    
    if (!claudeManager || !session) {
      return false;
    }

    // Claude CLI 종료
    claudeManager.stop();
    
    // 활성 세션이었다면 다른 세션을 활성화
    if (this.activeSessionId === sessionId) {
      const remainingSessions = Array.from(this.sessionData.values())
        .filter(i => i.id !== sessionId);
      
      if (remainingSessions.length > 0) {
        this.activateSession(remainingSessions[0].id);
      } else {
        this.activeSessionId = null;
      }
    }

    // 제거
    this.sessions.delete(sessionId);
    this.sessionData.delete(sessionId);
    
    return true;
  }

  activateSession(sessionId: string): boolean {
    const session = this.sessionData.get(sessionId);
    if (!session) {
      return false;
    }

    // 모든 세션 비활성화
    this.sessionData.forEach((inst) => {
      inst.isActive = false;
    });

    // 선택된 세션 활성화
    session.isActive = true;
    this.activeSessionId = sessionId;
    this.sessionData.set(sessionId, session);
    
    return true;
  }

  moveSession(sessionId: string, position: WindowPosition): boolean {
    const session = this.sessionData.get(sessionId);
    if (!session) {
      return false;
    }

    session.position = position;
    this.sessionData.set(sessionId, session);
    return true;
  }

  resizeSession(sessionId: string, size: WindowSize): boolean {
    const session = this.sessionData.get(sessionId);
    const claudeManager = this.sessions.get(sessionId);
    
    if (!session || !claudeManager) {
      return false;
    }

    session.size = size;
    this.sessionData.set(sessionId, session);
    
    // PTY 크기도 조정
    claudeManager.resize(Math.floor(size.width / 10), Math.floor(size.height / 20));
    
    return true;
  }

  sendInput(sessionId: string, input: string): boolean {
    const claudeManager = this.sessions.get(sessionId);
    if (!claudeManager) {
      return false;
    }

    claudeManager.sendInput(input);
    return true;
  }

  getSession(sessionId: string): ClaudeSession | undefined {
    return this.sessionData.get(sessionId);
  }

  getAllSessions(): ClaudeSession[] {
    return Array.from(this.sessionData.values());
  }

  getActiveSession(): ClaudeSession | undefined {
    if (!this.activeSessionId) {
      return undefined;
    }
    return this.sessionData.get(this.activeSessionId);
  }

  applyLayout(templateId: string): boolean {
    const template = this.getLayoutTemplate(templateId);
    if (!template) {
      return false;
    }

    const sessions = this.getAllSessions();
    if (sessions.length !== template.maxSessions) {
      return false;
    }

    // 템플릿에 따라 세션들의 위치와 크기 조정
    sessions.forEach((session, index) => {
      if (index < template.positions.length) {
        const templatePos = template.positions[index];
        session.position = templatePos.position;
        session.size = templatePos.size;
        this.sessionData.set(session.id, session);
      }
    });

    return true;
  }

  getAvailableTemplates(sessionCount: number): LayoutTemplate[] {
    return Object.values(LAYOUT_TEMPLATES)
      .filter(template => template.maxSessions === sessionCount);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionName(workingDirectory: string): string {
    const dirName = workingDirectory.split('/').pop() || 'Unknown';
    const timestamp = new Date().toLocaleTimeString('ko-KR', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    return `${dirName} (${timestamp})`;
  }

  private getNextPosition(): WindowPosition {
    const sessionCount = this.sessions.size;
    const offset = sessionCount * 5; // 5% 씩 오프셋
    
    return {
      x: DEFAULT_WINDOW_POSITION.x + offset,
      y: DEFAULT_WINDOW_POSITION.y + offset // 5% 씩 아래로
    };
  }

  private getLayoutTemplate(templateId: string): LayoutTemplate | undefined {
    return Object.values(LAYOUT_TEMPLATES)
      .find(template => template.id === templateId);
  }

  cleanup() {
    // 모든 세션 정리
    this.sessions.forEach((manager) => {
      manager.stop();
    });
    this.sessions.clear();
    this.sessionData.clear();
    this.activeSessionId = null;
  }
}