/**
 * AeScape 配置管理器
 * 统一管理扩展的所有配置项，提供默认值、验证和持久化
 */

class AeScapeConfigManager {
  constructor() {
    this.defaultConfig = {
      // 天气设置
      weather: {
        updateInterval: 30, // 分钟
        apiTimeout: 10000, // 毫秒
        retryAttempts: 3,
        cacheExpiry: 15 // 分钟
      },
      
      // 视频设置
      video: {
        enabled: true,
        autoTrigger: true,
        weatherChangeTrigger: true,
        intervalMinutes: 'off',
        enhanceEffects: true,
        preloadVideos: true,
        maxCacheSize: 5, // 最大缓存视频数量
        playbackQuality: 'auto' // auto, high, medium, low
      },
      
      // 悬浮球设置
      floatingBall: {
        enabled: true,
        size: 64,
        position: { bottom: 80, right: 20 },
        opacity: 1.0,
        showDetails: true,
        autoHide: false
      },
      
      // 主题设置
      theme: {
        autoUpdate: true,
        transitionDuration: 800,
        enableAnimations: true,
        respectSystemPreferences: true
      },
      
      // 性能设置
      performance: {
        enableMonitoring: true,
        memoryThreshold: 0.8, // 内存使用率阈值
        performanceMode: 'auto', // auto, performance, quality
        reducedMotion: false
      },
      
      // 调试设置
      debug: {
        enableLogging: false,
        verboseMode: false,
        showPerformanceMetrics: false
      }
    };
    
    this.config = { ...this.defaultConfig };
    this.listeners = new Set();
    this.isLoading = false;
    
    this.init();
  }

  /**
   * 初始化配置管理器
   */
  async init() {
    try {
      this.isLoading = true;
      await this.loadConfig();
      this.validateConfig();
      this.isLoading = false;
      
      console.log('[AeScape Config] 配置管理器初始化完成');
    } catch (error) {
      console.error('[AeScape Config] 初始化失败:', error);
      this.isLoading = false;
    }
  }

  /**
   * 从存储中加载配置
   */
  async loadConfig() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      try {
        const result = await chrome.storage.local.get(['aescape_config']);
        if (result.aescape_config) {
          this.config = this.mergeConfig(this.defaultConfig, result.aescape_config);
        }
      } catch (error) {
        console.error('[AeScape Config] 加载配置失败:', error);
      }
    }
  }

  /**
   * 保存配置到存储
   */
  async saveConfig() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      try {
        await chrome.storage.local.set({ aescape_config: this.config });
        this.notifyListeners('configSaved', this.config);
      } catch (error) {
        console.error('[AeScape Config] 保存配置失败:', error);
        throw error;
      }
    }
  }

  /**
   * 获取配置值
   * @param {string} path - 配置路径，支持点分隔符 (如 'video.enabled')
   * @param {*} defaultValue - 默认值
   * @returns {*} 配置值
   */
  get(path, defaultValue = undefined) {
    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }

  /**
   * 设置配置值
   * @param {string} path - 配置路径
   * @param {*} value - 配置值
   */
  async set(path, value) {
    const keys = path.split('.');
    let current = this.config;
    
    // 导航到父级对象
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    // 设置值
    const lastKey = keys[keys.length - 1];
    const oldValue = current[lastKey];
    current[lastKey] = value;
    
    // 验证配置
    if (!this.validateConfigValue(path, value)) {
      current[lastKey] = oldValue; // 回滚
      throw new Error(`Invalid config value for ${path}: ${value}`);
    }
    
    // 保存配置
    await this.saveConfig();
    
    // 通知监听器
    this.notifyListeners('configChanged', { path, value, oldValue });
  }

  /**
   * 批量更新配置
   * @param {object} updates - 配置更新对象
   */
  async updateConfig(updates) {
    const oldConfig = JSON.parse(JSON.stringify(this.config));
    
    try {
      // 应用更新
      this.config = this.mergeConfig(this.config, updates);
      
      // 验证配置
      this.validateConfig();
      
      // 保存配置
      await this.saveConfig();
      
      // 通知监听器
      this.notifyListeners('configUpdated', { updates, oldConfig, newConfig: this.config });
      
    } catch (error) {
      // 回滚配置
      this.config = oldConfig;
      throw error;
    }
  }

  /**
   * 重置配置为默认值
   */
  async resetConfig() {
    const oldConfig = JSON.parse(JSON.stringify(this.config));
    this.config = JSON.parse(JSON.stringify(this.defaultConfig));
    
    await this.saveConfig();
    this.notifyListeners('configReset', { oldConfig, newConfig: this.config });
  }

  /**
   * 验证整个配置对象
   */
  validateConfig() {
    const errors = [];
    
    // 验证天气配置
    if (this.config.weather.updateInterval < 5) {
      errors.push('天气更新间隔不能少于5分钟');
    }
    
    // 验证视频配置
    if (this.config.video.maxCacheSize < 1 || this.config.video.maxCacheSize > 20) {
      errors.push('视频缓存大小必须在1-20之间');
    }
    
    // 验证悬浮球配置
    if (this.config.floatingBall.size < 32 || this.config.floatingBall.size > 128) {
      errors.push('悬浮球大小必须在32-128像素之间');
    }
    
    if (errors.length > 0) {
      throw new Error('配置验证失败: ' + errors.join(', '));
    }
  }

  /**
   * 验证单个配置值
   * @param {string} path - 配置路径
   * @param {*} value - 配置值
   * @returns {boolean} 是否有效
   */
  validateConfigValue(path, value) {
    switch (path) {
      case 'weather.updateInterval':
        return typeof value === 'number' && value >= 5;
      
      case 'video.maxCacheSize':
        return typeof value === 'number' && value >= 1 && value <= 20;
      
      case 'floatingBall.size':
        return typeof value === 'number' && value >= 32 && value <= 128;
      
      case 'floatingBall.opacity':
        return typeof value === 'number' && value >= 0 && value <= 1;
      
      case 'performance.memoryThreshold':
        return typeof value === 'number' && value > 0 && value <= 1;
      
      default:
        return true; // 默认通过验证
    }
  }

  /**
   * 合并配置对象
   * @param {object} target - 目标对象
   * @param {object} source - 源对象
   * @returns {object} 合并后的对象
   */
  mergeConfig(target, source) {
    const result = JSON.parse(JSON.stringify(target));
    
    const merge = (target, source) => {
      Object.keys(source).forEach(key => {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {};
          merge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      });
    };
    
    merge(result, source);
    return result;
  }

  /**
   * 添加配置变更监听器
   * @param {function} listener - 监听器函数
   */
  addListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * 移除配置变更监听器
   * @param {function} listener - 监听器函数
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * 通知所有监听器
   * @param {string} event - 事件类型
   * @param {*} data - 事件数据
   */
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('[AeScape Config] 监听器执行错误:', error);
      }
    });
  }

  /**
   * 导出配置
   * @returns {string} JSON格式的配置
   */
  exportConfig() {
    return JSON.stringify({
      version: '1.0',
      timestamp: Date.now(),
      config: this.config
    }, null, 2);
  }

  /**
   * 导入配置
   * @param {string} configJson - JSON格式的配置
   */
  async importConfig(configJson) {
    try {
      const importData = JSON.parse(configJson);
      
      if (!importData.config) {
        throw new Error('无效的配置格式');
      }
      
      await this.updateConfig(importData.config);
      
    } catch (error) {
      throw new Error('导入配置失败: ' + error.message);
    }
  }

  /**
   * 获取配置摘要
   * @returns {object} 配置摘要
   */
  getConfigSummary() {
    return {
      videoEnabled: this.get('video.enabled'),
      floatingBallEnabled: this.get('floatingBall.enabled'),
      performanceMode: this.get('performance.performanceMode'),
      debugMode: this.get('debug.enableLogging'),
      lastModified: Date.now()
    };
  }
}

// 创建全局配置管理器实例
window.AeScapeConfigManager = new AeScapeConfigManager();

console.log('[AeScape] 配置管理器已初始化');
