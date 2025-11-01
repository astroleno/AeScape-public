# AeScape 优化模块使用指南

本指南介绍了 AeScape v1.2.2 中新增的优化模块系统，帮助开发者了解和使用这些功能。

## 📋 优化模块概览

### 1. 错误处理器 (ErrorHandler.js)
统一的错误处理、日志记录和用户通知系统。

**主要功能：**
- 标准化错误处理流程
- 错误分级管理（info、warning、error、critical）
- 自动错误恢复机制
- 错误历史记录和分析

**使用示例：**
```javascript
const errorHandler = new AeScapeErrorHandler();

// 处理普通错误
try {
  // 可能出错的代码
} catch (error) {
  errorHandler.handleError(error, 'ComponentName', {
    severity: 'warning',
    showNotification: true
  });
}

// 处理关键错误
errorHandler.handleError(criticalError, 'SystemCore', {
  severity: 'critical',
  autoRecover: true
});
```

### 2. 性能监控器 (PerformanceMonitor.js)
监控扩展性能指标，提供详细的性能分析报告。

**监控指标：**
- 组件加载时间
- API响应时间
- 内存使用情况
- 视频加载性能
- 主题更新耗时

**使用示例：**
```javascript
const monitor = new AeScapePerformanceMonitor();

// 记录加载时间
const startTime = Date.now();
await loadComponent();
monitor.recordLoadTime('MyComponent', startTime, Date.now());

// 记录API响应时间
const apiStart = Date.now();
const response = await apiCall();
monitor.recordApiResponse('WeatherAPI', Date.now() - apiStart);

// 获取性能报告
const report = monitor.getPerformanceReport();
console.log('性能报告:', report);
```

### 3. 配置管理器 (ConfigManager.js)
统一管理扩展的所有配置项，提供验证和持久化功能。

**主要功能：**
- 层级配置管理
- 配置验证和默认值
- 实时配置变更通知
- 配置导入导出

**使用示例：**
```javascript
const configManager = new AeScapeConfigManager();

// 设置配置
await configManager.setConfig('video.enabled', true);
await configManager.setConfig('theme.transitionDuration', 300);

// 获取配置
const videoEnabled = configManager.getConfig('video.enabled');
const allVideoConfig = configManager.getConfig('video');

// 监听配置变更
configManager.addChangeListener('video', (newValue, oldValue) => {
  console.log('视频配置已更新:', newValue);
});

// 批量更新配置
await configManager.updateConfig({
  'video.maxCacheSize': 5,
  'theme.enableAnimations': true
});
```

### 4. 视频资源管理器 (VideoResourceManager.js)
智能管理视频预加载、缓存和资源释放，优化内存使用。

**主要功能：**
- 智能视频预加载
- LRU缓存策略
- 内存压力监控
- 资源自动清理

**使用示例：**
```javascript
const resourceManager = new VideoResourceManager({
  maxCacheSize: 3,
  enableIntelligentPreload: true
});

// 预加载视频
const video = await resourceManager.preloadVideo('/path/to/video.webm', {
  weather: 'rain',
  priority: 'high'
});

// 获取缓存的视频
const cachedVideo = resourceManager.getCachedVideo('/path/to/video.webm');

// 获取性能统计
const stats = resourceManager.getPerformanceMetrics();
console.log('缓存命中率:', stats.hitRate);
```

### 5. 智能主题适配器 (SmartThemeAdapter.js)
优化主题切换性能，减少重复计算和DOM操作。

**主要功能：**
- 主题数据缓存
- 批处理DOM更新
- 平滑过渡效果
- 性能优化

**使用示例：**
```javascript
const themeAdapter = new SmartThemeAdapter({
  enableCaching: true,
  enableBatching: true,
  enableTransitions: true
});

// 应用主题到元素
const elements = [ballElement, panelElement];
await themeAdapter.applyTheme(themeData, elements, {
  styleMap: {
    background: 'gradient',
    color: 'textColor',
    boxShadow: 'shadow'
  }
});

// 获取性能统计
const stats = themeAdapter.getStats();
console.log('主题缓存命中率:', stats.hitRate);
```

## 🔧 集成使用

### 在新标签页中使用
```javascript
class AeScapeNewTab {
  async initOptimizationModules() {
    // 初始化所有优化模块
    this.errorHandler = new AeScapeErrorHandler();
    this.performanceMonitor = new AeScapePerformanceMonitor();
    this.configManager = new AeScapeConfigManager();
    this.videoResourceManager = new VideoResourceManager();
    this.smartThemeAdapter = new SmartThemeAdapter();
    
    console.log('优化模块初始化完成');
  }
}
```

### 在内容脚本中使用
```javascript
class AeScapeFloatingBall {
  constructor() {
    // 启用静默模式，减少控制台输出
    this.config = {
      silentMode: true
    };
  }
  
  log(message, level = 'info') {
    if (this.config.silentMode && level === 'debug') return;
    // 友好的日志输出
    console.log('[AeScape]', message);
  }
}
```

## 🧪 测试和调试

### 使用测试页面
打开 `test-optimization.html` 可以测试所有优化模块：

1. **错误处理器测试** - 验证错误处理和通知功能
2. **性能监控器测试** - 检查性能指标记录
3. **配置管理器测试** - 测试配置读写和验证
4. **视频资源管理器测试** - 验证视频缓存功能
5. **智能主题适配器测试** - 测试主题应用和缓存

### 调试模式
启用调试模式可以获得更详细的日志：

```javascript
const themeAdapter = new SmartThemeAdapter({ debugMode: true });
const configManager = new AeScapeConfigManager({ debugMode: true });
```

## 📊 性能监控

### 获取性能报告
```javascript
// 获取各模块的性能统计
const performanceReport = performanceMonitor.getPerformanceReport();
const videoStats = videoResourceManager.getPerformanceMetrics();
const themeStats = smartThemeAdapter.getStats();
const configStats = configManager.getStats();

console.log('完整性能报告:', {
  performance: performanceReport,
  video: videoStats,
  theme: themeStats,
  config: configStats
});
```

### 内存监控
```javascript
// 检查内存使用情况
if ('memory' in performance) {
  const memInfo = performance.memory;
  console.log('内存使用:', {
    used: Math.round(memInfo.usedJSHeapSize / 1024 / 1024) + 'MB',
    total: Math.round(memInfo.totalJSHeapSize / 1024 / 1024) + 'MB',
    limit: Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024) + 'MB'
  });
}
```

## 🛡️ 最佳实践

### 1. 错误处理
- 始终使用 `ErrorHandler` 处理异常
- 根据错误严重程度选择合适的处理策略
- 为关键操作添加自动恢复机制

### 2. 性能优化
- 使用 `PerformanceMonitor` 跟踪关键指标
- 定期检查性能报告，识别瓶颈
- 合理设置缓存大小和清理策略

### 3. 配置管理
- 使用配置管理器统一管理所有设置
- 添加配置验证确保数据完整性
- 监听配置变更，及时响应用户设置

### 4. 资源管理
- 合理使用视频缓存，避免内存泄漏
- 监控资源使用情况，及时清理
- 根据设备性能调整缓存策略

### 5. 主题系统
- 使用智能主题适配器提升切换性能
- 启用批处理减少DOM操作
- 合理使用过渡效果提升用户体验

## 🚀 进阶功能

### 自定义错误处理策略
```javascript
errorHandler.addCustomHandler('NetworkError', (error, context) => {
  // 自定义网络错误处理
  console.log('网络错误，尝试重连...');
  return { shouldRetry: true, delay: 5000 };
});
```

### 自定义性能指标
```javascript
performanceMonitor.addCustomMetric('customOperation', (duration, metadata) => {
  // 自定义指标处理
  console.log(`自定义操作耗时: ${duration}ms`);
});
```

### 动态配置更新
```javascript
// 远程配置更新
configManager.updateFromRemote('https://api.example.com/config')
  .then(() => console.log('远程配置已更新'))
  .catch(error => console.error('远程配置更新失败:', error));
```

## 📝 注意事项

1. **兼容性** - 所有优化模块都向后兼容，不会影响现有功能
2. **性能影响** - 优化模块本身的性能开销很小，但会提升整体性能
3. **内存管理** - 注意及时清理不需要的资源，避免内存泄漏
4. **错误恢复** - 优化模块失败不会影响核心功能，会优雅降级
5. **调试信息** - 生产环境建议关闭调试模式，减少日志输出

通过合理使用这些优化模块，可以显著提升 AeScape 的性能和稳定性，为用户提供更好的体验。
