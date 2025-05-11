// src/utils/logger.ts
import fs from 'fs';
import path from 'path';

class Logger {
  private logDir: string;

  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.ensureLogDirExists();
  }

  private ensureLogDirExists(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: string, message: string, context?: any): string {
    const timestamp = this.getCurrentTimestamp();
    const contextStr = context ? `\n${JSON.stringify(context, null, 2)}` : '';
    return `[${timestamp}] [${level}] ${message}${contextStr}\n`;
  }

  private writeToLogFile(content: string): void {
    const today = new Date().toISOString().slice(0, 10);
    const logFilePath = path.join(this.logDir, `${today}.log`);

    try {
      fs.appendFileSync(logFilePath, content);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  public info(message: string, context?: any): void {
    const logMessage = this.formatMessage('INFO', message, context);
    this.writeToLogFile(logMessage);
    console.info(message, context || '');
  }

  public error(message: string, context?: any): void {
    const logMessage = this.formatMessage('ERROR', message, context);
    this.writeToLogFile(logMessage);
    console.error(message, context || '');
  }

  public warn(message: string, context?: any): void {
    const logMessage = this.formatMessage('WARN', message, context);
    this.writeToLogFile(logMessage);
    console.warn(message, context || '');
  }

  public debug(message: string, context?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      const logMessage = this.formatMessage('DEBUG', message, context);
      this.writeToLogFile(logMessage);
      console.debug(message, context || '');
    }
  }
}

export default new Logger();
