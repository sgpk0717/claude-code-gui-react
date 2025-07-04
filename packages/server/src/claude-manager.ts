import { spawn, ChildProcess } from 'child_process';
import * as pty from 'node-pty';
import { CLIStatus } from '@claude-gui/shared';

export class ClaudeManager {
  private ptyProcess: pty.IPty | null = null;
  private onOutputCallback?: (output: string) => void;
  private onStatusCallback?: (status: CLIStatus) => void;

  constructor() {}

  start(
    onOutput: (output: string) => void, 
    onStatus: (status: CLIStatus) => void, 
    workingDirectory?: string
  ) {
    if (this.ptyProcess) {
      console.log('Claude CLI already running');
      return;
    }

    this.onOutputCallback = onOutput;
    this.onStatusCallback = onStatus;

    try {
      const cwd = workingDirectory || process.env.HOME || '/Users/seonggukpark';
      
      // PTY를 사용하여 인터랙티브 터미널 환경 생성
      this.ptyProcess = pty.spawn('claude', [], {
        name: 'xterm-256color',
        cols: 120,
        rows: 40,
        cwd: cwd,
        env: {
          ...process.env,
          LANG: 'ko_KR.UTF-8',
          LC_ALL: 'ko_KR.UTF-8',
          TERM: 'xterm-256color'
        } as { [key: string]: string }
      });

      console.log(`Starting Claude CLI in directory: ${cwd}`);

      this.ptyProcess.onData((data) => {
        console.log('Claude output:', data);
        
        if (this.onOutputCallback) {
          this.onOutputCallback(data);
        }
      });

      this.ptyProcess.onExit(({ exitCode, signal }) => {
        console.log('Claude CLI exited:', exitCode, signal);
        this.ptyProcess = null;
        if (this.onStatusCallback) {
          this.onStatusCallback({ isRunning: false });
        }
      });

      if (this.onStatusCallback) {
        this.onStatusCallback({ 
          isRunning: true, 
          pid: this.ptyProcess.pid 
        });
      }

    } catch (error) {
      console.error('Failed to start Claude CLI:', error);
      if (this.onStatusCallback) {
        this.onStatusCallback({ isRunning: false });
      }
    }
  }

  sendInput(input: string) {
    if (!this.ptyProcess) {
      console.error('Claude CLI not running');
      return;
    }

    // console.log('Writing to PTY:', JSON.stringify(input));
    // console.log('Input bytes:', Buffer.from(input).toJSON());
    this.ptyProcess.write(input);
  }

  resize(cols: number, rows: number) {
    if (this.ptyProcess) {
      this.ptyProcess.resize(cols, rows);
    }
  }

  stop() {
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.ptyProcess = null;
    }
  }

  isRunning(): boolean {
    return this.ptyProcess !== null;
  }
}