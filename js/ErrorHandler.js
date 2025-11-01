/**
 * AeScape 统一错误处理器
 * 提供标准化的错误处理、日志记录和用户通知
 */

class AeScapeErrorHandler {
  constructor() {
    this.errorQueue = [];
    this.maxErrorHistory = 50;
    this.reportingEnabled = true;
  }

  /**
   * 处理错误
   * @param {Error} error - 错误对象
   * @param {string} context - 错误上下文
   * @param {object} options - 处理选项
   */
  handleError(error, context = 'Unknown', options = {}) {
    const errorInfo = {
      timestamp: Date.now(),
      context,
      message: error.message,
      stack: error.stack,
      type: error.name,
      severity: options.severity || 'error',
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // 记录错误
    this.logError(errorInfo);

    // 根据严重程度决定处理方式
    switch (options.severity) {
      case 'critical':
        this.handleCriticalError(errorInfo, options);
        break;
      case 'warning':
        this.handleWarning(errorInfo, options);
        break;
      default:
        this.handleGeneralError(errorInfo, options);
    }

    // 保存到错误历史
    this.addToErrorHistory(errorInfo);

    return errorInfo;
  }

  /**
   * 处理关键错误
   */
  handleCriticalError(errorInfo, options) {
    console.error('[AeScape Critical]', errorInfo);
    
    if (options.showUserNotification) {
      this.showUserNotification('系统遇到严重错误，正在尝试恢复', 'error');
    }

    // 尝试恢复操作
    if (options.recovery && typeof options.recovery === 'function') {
      try {
        options.recovery();
      } catch (recoveryError) {
        console.error('[AeScape] 恢复操作失败:', recoveryError);
      }
    }
  }

  /**
   * 处理一般错误
   */
  handleGeneralError(errorInfo, options) {
    console.error('[AeScape Error]', errorInfo);

    if (options.showUserNotification) {
      this.showUserNotification('操作失败，请稍后重试', 'warning');
    }
  }

  /**
   * 处理警告
   */
  handleWarning(errorInfo, options) {
    console.warn('[AeScape Warning]', errorInfo);

    if (options.showUserNotification) {
      this.showUserNotification(errorInfo.message, 'info');
    }
  }

  /**
   * 记录错误日志
   */
  logError(errorInfo) {
    // 可以扩展为发送到远程日志服务
    const logEntry = {
      timestamp: new Date(errorInfo.timestamp).toISOString(),
      level: errorInfo.severity.toUpperCase(),
      context: errorInfo.context,
      message: errorInfo.message,
      stack: errorInfo.stack
    };

    // 本地存储（开发阶段）
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['errorLogs'], (result) => {
        const logs = result.errorLogs || [];
        logs.push(logEntry);
        
        // 保持最近100条日志
        if (logs.length > 100) {
          logs.splice(0, logs.length - 100);
        }
        
        chrome.storage.local.set({ errorLogs: logs });
      });
    }
  }

  /**
   * 显示用户通知
   */
  showUserNotification(message, type = 'info') {
    // 尝试使用现有的通知系统
    if (window.aeScape && typeof window.aeScape.showNotification === 'function') {
      window.aeScape.showNotification(type, message);
    } else if (window.aeScapeFloatingBall && typeof window.aeScapeFloatingBall.showNotification === 'function') {
      window.aeScapeFloatingBall.showNotification(type, message);
    } else {
      // 备用通知方式
      console.log(`[AeScape ${type.toUpperCase()}] ${message}`);
    }
  }

  /**
   * 添加到错误历史
   */
  addToErrorHistory(errorInfo) {
    this.errorQueue.push(errorInfo);
    
    if (this.errorQueue.length > this.maxErrorHistory) {
      this.errorQueue.shift();
    }
  }

  /**
   * 获取错误统计
   */
  getErrorStats() {
    const stats = {
      total: this.errorQueue.length,
      byContext: {},
      bySeverity: {},
      recent: this.errorQueue.slice(-10)
    };

    this.errorQueue.forEach(error => {
      stats.byContext[error.context] = (stats.byContext[error.context] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
    });

    return stats;
  }

  /**
   * 清理错误历史
   */
  clearErrorHistory() {
    this.errorQueue = [];
  }
}

// 创建全局错误处理器实例
window.AeScapeErrorHandler = new AeScapeErrorHandler();

// 全局错误捕获
window.addEventListener('error', (event) => {
  window.AeScapeErrorHandler.handleError(
    new Error(event.message),
    'Global Error Handler',
    { severity: 'error', showUserNotification: false }
  );
});

// Promise 错误捕获
window.addEventListener('unhandledrejection', (event) => {
  window.AeScapeErrorHandler.handleError(
    new Error(event.reason),
    'Unhandled Promise Rejection',
    { severity: 'error', showUserNotification: false }
  );
});

console.log('[AeScape] 统一错误处理器已初始化');
