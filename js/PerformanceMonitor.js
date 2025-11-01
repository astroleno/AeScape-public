/**
 * AeScape 性能监控器
 * 监控扩展的性能指标，包括内存使用、加载时间、API响应时间等
 */

class AeScapePerformanceMonitor {
  constructor() {
    this.metrics = {
      loadTimes: [],
      apiResponseTimes: [],
      memoryUsage: [],
      videoLoadTimes: [],
      themeUpdateTimes: []
    };
    
    this.isMonitoring = true;
    this.reportInterval = 5 * 60 * 1000; // 5分钟
    this.maxMetricsHistory = 100;
    
    this.startMonitoring();
  }

  /**
   * 开始性能监控
   */
  startMonitoring() {
    if (!this.isMonitoring) return;

    // 监控内存使用
    setInterval(() => {
      this.recordMemoryUsage();
    }, 30000); // 每30秒记录一次

    // 监控页面性能
    if (performance.getEntriesByType) {
      this.monitorNavigationTiming();
    }

    console.log('[AeScape] 性能监控已启动');
  }

  /**
   * 记录加载时间
   * @param {string} component - 组件名称
   * @param {number} startTime - 开始时间
   * @param {number} endTime - 结束时间
   */
  recordLoadTime(component, startTime, endTime = performance.now()) {
    const loadTime = endTime - startTime;
    
    this.metrics.loadTimes.push({
      component,
      loadTime,
      timestamp: Date.now()
    });

    this.trimMetrics('loadTimes');
    
    console.log(`[AeScape Performance] ${component} 加载时间: ${loadTime.toFixed(2)}ms`);
    
    // 如果加载时间过长，记录警告
    if (loadTime > 1000) {
      console.warn(`[AeScape Performance] ${component} 加载时间较长: ${loadTime.toFixed(2)}ms`);
    }
  }

  /**
   * 记录API响应时间
   * @param {string} apiName - API名称
   * @param {number} responseTime - 响应时间
   */
  recordApiResponseTime(apiName, responseTime) {
    this.metrics.apiResponseTimes.push({
      apiName,
      responseTime,
      timestamp: Date.now()
    });

    this.trimMetrics('apiResponseTimes');

    if (responseTime > 3000) {
      console.warn(`[AeScape Performance] API ${apiName} 响应时间较长: ${responseTime}ms`);
    }
  }

  /**
   * 记录视频加载时间
   * @param {string} videoType - 视频类型
   * @param {number} loadTime - 加载时间
   */
  recordVideoLoadTime(videoType, loadTime) {
    this.metrics.videoLoadTimes.push({
      videoType,
      loadTime,
      timestamp: Date.now()
    });

    this.trimMetrics('videoLoadTimes');

    console.log(`[AeScape Performance] 视频 ${videoType} 加载时间: ${loadTime.toFixed(2)}ms`);
  }

  /**
   * 记录主题更新时间
   * @param {number} updateTime - 更新时间
   */
  recordThemeUpdateTime(updateTime) {
    this.metrics.themeUpdateTimes.push({
      updateTime,
      timestamp: Date.now()
    });

    this.trimMetrics('themeUpdateTimes');
  }

  /**
   * 记录内存使用情况
   */
  recordMemoryUsage() {
    if (!performance.memory) return;

    const memoryInfo = {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      timestamp: Date.now()
    };

    this.metrics.memoryUsage.push(memoryInfo);
    this.trimMetrics('memoryUsage');

    // 检查内存使用是否过高
    const usageRatio = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit;
    if (usageRatio > 0.8) {
      console.warn('[AeScape Performance] 内存使用率较高:', (usageRatio * 100).toFixed(1) + '%');
    }
  }

  /**
   * 监控导航时间
   */
  monitorNavigationTiming() {
    const navigation = performance.getEntriesByType('navigation')[0];
    if (!navigation) return;

    const metrics = {
      dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
      tcpConnect: navigation.connectEnd - navigation.connectStart,
      request: navigation.responseStart - navigation.requestStart,
      response: navigation.responseEnd - navigation.responseStart,
      domParsing: navigation.domInteractive - navigation.responseEnd,
      domReady: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart
    };

    console.log('[AeScape Performance] 页面性能指标:', metrics);
  }

  /**
   * 限制指标历史记录数量
   * @param {string} metricType - 指标类型
   */
  trimMetrics(metricType) {
    if (this.metrics[metricType].length > this.maxMetricsHistory) {
      this.metrics[metricType] = this.metrics[metricType].slice(-this.maxMetricsHistory);
    }
  }

  /**
   * 获取性能报告
   * @returns {object} 性能报告
   */
  getPerformanceReport() {
    const report = {
      timestamp: Date.now(),
      summary: {},
      details: { ...this.metrics }
    };

    // 计算平均值和统计信息
    Object.keys(this.metrics).forEach(metricType => {
      const data = this.metrics[metricType];
      if (data.length === 0) return;

      const values = data.map(item => {
        if (metricType === 'memoryUsage') {
          return item.usedJSHeapSize;
        } else if (metricType === 'loadTimes' || metricType === 'videoLoadTimes') {
          return item.loadTime || item.updateTime;
        } else if (metricType === 'apiResponseTimes') {
          return item.responseTime;
        } else if (metricType === 'themeUpdateTimes') {
          return item.updateTime;
        }
        return 0;
      });

      report.summary[metricType] = {
        count: values.length,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values)
      };
    });

    return report;
  }

  /**
   * 检查性能健康状况
   * @returns {object} 健康状况报告
   */
  checkPerformanceHealth() {
    const report = this.getPerformanceReport();
    const health = {
      status: 'good',
      issues: [],
      recommendations: []
    };

    // 检查加载时间
    if (report.summary.loadTimes?.average > 500) {
      health.status = 'warning';
      health.issues.push('组件平均加载时间较长');
      health.recommendations.push('考虑优化组件初始化流程');
    }

    // 检查API响应时间
    if (report.summary.apiResponseTimes?.average > 2000) {
      health.status = 'warning';
      health.issues.push('API平均响应时间较长');
      health.recommendations.push('检查网络状况或考虑添加缓存');
    }

    // 检查内存使用
    const latestMemory = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
    if (latestMemory) {
      const usageRatio = latestMemory.usedJSHeapSize / latestMemory.jsHeapSizeLimit;
      if (usageRatio > 0.7) {
        health.status = usageRatio > 0.9 ? 'critical' : 'warning';
        health.issues.push('内存使用率较高');
        health.recommendations.push('检查是否存在内存泄漏，考虑清理未使用的资源');
      }
    }

    return health;
  }

  /**
   * 导出性能数据
   * @returns {string} JSON格式的性能数据
   */
  exportPerformanceData() {
    const data = {
      exportTime: Date.now(),
      report: this.getPerformanceReport(),
      health: this.checkPerformanceHealth(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    this.isMonitoring = false;
    console.log('[AeScape] 性能监控已停止');
  }
}

// 创建全局性能监控器实例
window.AeScapePerformanceMonitor = new AeScapePerformanceMonitor();

console.log('[AeScape] 性能监控器已初始化');
