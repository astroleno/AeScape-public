/**
 * AeScape 智能主题适配器
 * 优化主题切换性能，减少重复计算和DOM操作
 */

class SmartThemeAdapter {
  constructor(options = {}) {
    // 配置选项
    this.config = {
      enableCaching: options.enableCaching !== false,
      enableBatching: options.enableBatching !== false,
      enableTransitions: options.enableTransitions !== false,
      transitionDuration: options.transitionDuration || 300,
      cacheExpiry: options.cacheExpiry || 5 * 60 * 1000, // 5分钟
      debugMode: options.debugMode || false
    };
    
    // 缓存系统
    this.themeCache = new Map();
    this.gradientCache = new Map();
    this.colorCache = new Map();
    
    // 批处理系统
    this.pendingUpdates = new Set();
    this.batchTimer = null;
    this.batchDelay = 16; // 一帧的时间
    
    // 状态管理
    this.currentTheme = null;
    this.isUpdating = false;
    this.lastUpdateTime = 0;
    
    // 性能统计
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      batchedUpdates: 0,
      totalUpdates: 0
    };
    
    this.init();
  }

  /**
   * 初始化适配器
   */
  init() {
    try {
      this.log('智能主题适配器初始化');
      
      // 启动缓存清理
      this.startCacheCleanup();
      
      // 监听主题变化
      this.setupThemeListeners();
      
    } catch (error) {
      console.error('[SmartThemeAdapter] 初始化失败:', error);
    }
  }

  /**
   * 日志方法
   */
  log(message, level = 'info') {
    if (!this.config.debugMode && level === 'debug') return;
    
    const prefix = '[SmartThemeAdapter]';
    switch (level) {
      case 'error':
        console.error(prefix, message);
        break;
      case 'warn':
        console.warn(prefix, message);
        break;
      case 'debug':
        console.log(prefix, '[DEBUG]', message);
        break;
      default:
        console.log(prefix, message);
    }
  }

  /**
   * 智能应用主题
   * @param {object} themeData - 主题数据
   * @param {Array} elements - 要应用主题的元素列表
   * @param {object} options - 应用选项
   */
  async applyTheme(themeData, elements = [], options = {}) {
    try {
      if (!themeData || !elements.length) return;
      
      this.stats.totalUpdates++;
      
      // 检查是否需要更新
      if (this.shouldSkipUpdate(themeData)) {
        this.log('主题未变化，跳过更新', 'debug');
        return;
      }
      
      // 获取处理后的主题数据
      const processedTheme = await this.processTheme(themeData);
      
      // 批量应用主题
      if (this.config.enableBatching) {
        this.batchApplyTheme(processedTheme, elements, options);
      } else {
        this.immediateApplyTheme(processedTheme, elements, options);
      }
      
      // 更新当前主题
      this.currentTheme = themeData;
      this.lastUpdateTime = Date.now();
      
    } catch (error) {
      console.error('[SmartThemeAdapter] 应用主题失败:', error);
    }
  }

  /**
   * 检查是否应该跳过更新
   * @param {object} themeData - 主题数据
   * @returns {boolean}
   */
  shouldSkipUpdate(themeData) {
    if (!this.currentTheme) return false;
    
    // 简单的深度比较（仅比较关键属性）
    const keyProps = ['primaryColor', 'backgroundColor', 'textColor', 'weatherCode'];
    
    for (const prop of keyProps) {
      if (this.currentTheme[prop] !== themeData[prop]) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 处理主题数据
   * @param {object} themeData - 原始主题数据
   * @returns {object} 处理后的主题数据
   */
  async processTheme(themeData) {
    try {
      const cacheKey = this.generateCacheKey(themeData);
      
      // 检查缓存
      if (this.config.enableCaching && this.themeCache.has(cacheKey)) {
        const cached = this.themeCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.config.cacheExpiry) {
          this.stats.cacheHits++;
          this.log('使用缓存的主题数据', 'debug');
          return cached.data;
        } else {
          this.themeCache.delete(cacheKey);
        }
      }
      
      this.stats.cacheMisses++;
      
      // 处理主题数据
      const processedTheme = {
        ...themeData,
        
        // 生成渐变背景
        gradient: this.generateGradient(themeData),
        
        // 生成文本颜色
        textColor: this.generateTextColor(themeData),
        
        // 生成阴影效果
        shadow: this.generateShadow(themeData),
        
        // 生成边框颜色
        borderColor: this.generateBorderColor(themeData),
        
        // 处理透明度变化
        opacity: this.calculateOpacity(themeData),
        
        timestamp: Date.now()
      };
      
      // 缓存处理结果
      if (this.config.enableCaching) {
        this.themeCache.set(cacheKey, {
          data: processedTheme,
          timestamp: Date.now()
        });
      }
      
      return processedTheme;
      
    } catch (error) {
      console.error('[SmartThemeAdapter] 处理主题数据失败:', error);
      return themeData;
    }
  }

  /**
   * 生成缓存键
   * @param {object} themeData - 主题数据
   * @returns {string}
   */
  generateCacheKey(themeData) {
    const keyData = {
      primaryColor: themeData.primaryColor,
      backgroundColor: themeData.backgroundColor,
      weatherCode: themeData.weatherCode,
      isNight: themeData.isNight
    };
    return JSON.stringify(keyData);
  }

  /**
   * 生成渐变背景
   * @param {object} themeData - 主题数据
   * @returns {string}
   */
  generateGradient(themeData) {
    const cacheKey = `gradient_${themeData.primaryColor}_${themeData.backgroundColor}`;
    
    if (this.gradientCache.has(cacheKey)) {
      return this.gradientCache.get(cacheKey);
    }
    
    let gradient;
    if (themeData.isNight) {
      gradient = `linear-gradient(135deg, ${themeData.backgroundColor}ee, ${themeData.primaryColor}cc, ${themeData.backgroundColor}dd)`;
    } else {
      gradient = `linear-gradient(135deg, ${themeData.primaryColor}dd, ${themeData.backgroundColor}ee, ${themeData.primaryColor}bb)`;
    }
    
    this.gradientCache.set(cacheKey, gradient);
    return gradient;
  }

  /**
   * 生成文本颜色
   * @param {object} themeData - 主题数据
   * @returns {string}
   */
  generateTextColor(themeData) {
    const cacheKey = `text_${themeData.backgroundColor}_${themeData.isNight}`;
    
    if (this.colorCache.has(cacheKey)) {
      return this.colorCache.get(cacheKey);
    }
    
    // 基于背景色计算合适的文本颜色
    let textColor;
    if (themeData.isNight) {
      textColor = 'rgba(255, 255, 255, 0.9)';
    } else {
      textColor = 'rgba(255, 255, 255, 0.95)';
    }
    
    this.colorCache.set(cacheKey, textColor);
    return textColor;
  }

  /**
   * 生成阴影效果
   * @param {object} themeData - 主题数据
   * @returns {string}
   */
  generateShadow(themeData) {
    if (themeData.isNight) {
      return '0 8px 32px rgba(0, 0, 0, 0.6), 0 2px 8px rgba(0, 0, 0, 0.4)';
    } else {
      return '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)';
    }
  }

  /**
   * 生成边框颜色
   * @param {object} themeData - 主题数据
   * @returns {string}
   */
  generateBorderColor(themeData) {
    return `${themeData.primaryColor}40`;
  }

  /**
   * 计算透明度
   * @param {object} themeData - 主题数据
   * @returns {number}
   */
  calculateOpacity(themeData) {
    return themeData.isNight ? 0.95 : 0.98;
  }

  /**
   * 批量应用主题
   * @param {object} processedTheme - 处理后的主题数据
   * @param {Array} elements - 元素列表
   * @param {object} options - 选项
   */
  batchApplyTheme(processedTheme, elements, options) {
    // 添加到待处理队列
    this.pendingUpdates.add({
      theme: processedTheme,
      elements,
      options
    });
    
    // 如果还没有批处理定时器，创建一个
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatchedUpdates();
      }, this.batchDelay);
    }
  }

  /**
   * 处理批量更新
   */
  processBatchedUpdates() {
    try {
      if (this.pendingUpdates.size === 0) return;
      
      this.log(`处理 ${this.pendingUpdates.size} 个批量更新`, 'debug');
      this.stats.batchedUpdates += this.pendingUpdates.size;
      
      // 使用 requestAnimationFrame 确保在下一帧执行
      requestAnimationFrame(() => {
        for (const update of this.pendingUpdates) {
          this.immediateApplyTheme(update.theme, update.elements, update.options);
        }
        
        // 清理
        this.pendingUpdates.clear();
        this.batchTimer = null;
      });
      
    } catch (error) {
      console.error('[SmartThemeAdapter] 批量更新失败:', error);
      this.pendingUpdates.clear();
      this.batchTimer = null;
    }
  }

  /**
   * 立即应用主题
   * @param {object} processedTheme - 处理后的主题数据
   * @param {Array} elements - 元素列表
   * @param {object} options - 选项
   */
  immediateApplyTheme(processedTheme, elements, options = {}) {
    try {
      for (const element of elements) {
        if (!element || !element.style) continue;
        
        // 应用过渡效果
        if (this.config.enableTransitions && !options.skipTransition) {
          element.style.transition = `all ${this.config.transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        }
        
        // 应用样式
        this.applyStylesToElement(element, processedTheme, options);
      }
      
    } catch (error) {
      console.error('[SmartThemeAdapter] 立即应用主题失败:', error);
    }
  }

  /**
   * 应用样式到元素
   * @param {HTMLElement} element - 目标元素
   * @param {object} theme - 主题数据
   * @param {object} options - 选项
   */
  applyStylesToElement(element, theme, options) {
    try {
      const styleMap = options.styleMap || this.getDefaultStyleMap();
      
      for (const [property, value] of Object.entries(styleMap)) {
        if (typeof value === 'function') {
          element.style[property] = value(theme);
        } else if (theme[value] !== undefined) {
          element.style[property] = theme[value];
        }
      }
      
    } catch (error) {
      console.error('[SmartThemeAdapter] 应用样式失败:', error);
    }
  }

  /**
   * 获取默认样式映射
   * @returns {object}
   */
  getDefaultStyleMap() {
    return {
      background: 'gradient',
      color: 'textColor',
      boxShadow: 'shadow',
      borderColor: 'borderColor',
      opacity: 'opacity'
    };
  }

  /**
   * 设置主题监听器
   */
  setupThemeListeners() {
    try {
      // 监听全局主题变化
      if (window.GlobalThemeManager) {
        window.GlobalThemeManager.addListener((themeData) => {
          this.handleThemeChange(themeData);
        });
      }
      
      // 监听存储变化
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.onChanged.addListener((changes) => {
          if (changes.currentThemeData) {
            this.handleThemeChange(changes.currentThemeData.newValue);
          }
        });
      }
      
    } catch (error) {
      this.log('设置主题监听器失败: ' + error.message, 'warn');
    }
  }

  /**
   * 处理主题变化
   * @param {object} themeData - 新的主题数据
   */
  handleThemeChange(themeData) {
    try {
      this.log('检测到主题变化', 'debug');
      
      // 这里可以添加自动应用逻辑
      // 或者触发事件让其他组件处理
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('AeScapeThemeChanged', {
          detail: { themeData, adapter: this }
        }));
      }
      
    } catch (error) {
      console.error('[SmartThemeAdapter] 处理主题变化失败:', error);
    }
  }

  /**
   * 启动缓存清理
   */
  startCacheCleanup() {
    setInterval(() => {
      this.cleanupCache();
    }, this.config.cacheExpiry);
  }

  /**
   * 清理过期缓存
   */
  cleanupCache() {
    try {
      const now = Date.now();
      let cleanedCount = 0;
      
      // 清理主题缓存
      for (const [key, value] of this.themeCache.entries()) {
        if (now - value.timestamp > this.config.cacheExpiry) {
          this.themeCache.delete(key);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        this.log(`清理了 ${cleanedCount} 个过期缓存项`, 'debug');
      }
      
    } catch (error) {
      console.error('[SmartThemeAdapter] 缓存清理失败:', error);
    }
  }

  /**
   * 获取性能统计
   * @returns {object}
   */
  getStats() {
    const totalRequests = this.stats.cacheHits + this.stats.cacheMisses;
    const hitRate = totalRequests > 0 ? (this.stats.cacheHits / totalRequests * 100).toFixed(2) : 0;
    
    return {
      ...this.stats,
      cacheSize: this.themeCache.size,
      hitRate: `${hitRate}%`,
      avgBatchSize: this.stats.totalUpdates > 0 ? 
        (this.stats.batchedUpdates / this.stats.totalUpdates).toFixed(2) : 0
    };
  }

  /**
   * 清理资源
   */
  destroy() {
    try {
      this.log('清理智能主题适配器资源');
      
      // 清理缓存
      this.themeCache.clear();
      this.gradientCache.clear();
      this.colorCache.clear();
      
      // 清理待处理更新
      this.pendingUpdates.clear();
      
      // 清理定时器
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
        this.batchTimer = null;
      }
      
    } catch (error) {
      console.error('[SmartThemeAdapter] 资源清理失败:', error);
    }
  }
}

// 全局实例
if (typeof window !== 'undefined') {
  window.AeScapeSmartThemeAdapter = SmartThemeAdapter;
}
