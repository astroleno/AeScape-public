/**
 * 天景 AeScape - 内容脚本 (完全重构版)
 * 
 * ⚠️ 全局规范：禁止使用任何emoji表情符号
 * 使用文字描述或SVG图标替代所有emoji
 */

class AeScapeFloatingBall {
  constructor() {
    // 核心状态
    this.ball = null;
    this.panel = null;
    this.isVisible = false;
    this.isPanelVisible = false;
    
    // 数据状态
    this.weatherData = null;
    this.currentLocation = null;
    
    // 计时器
    this.updateTimer = null;
    this.retryTimer = null;
    
    // 配置
    this.config = {
      ballSize: 64,
      updateInterval: 5 * 60 * 1000, // 5分钟
      retryInterval: 30 * 1000, // 30秒
      position: { bottom: '80px', right: '20px' },
      silentMode: true // 静默模式，减少控制台输出
    };
    
    console.log('[AeScape] 悬浮球系统初始化开始');
    this.init();
  }

  // 日志辅助方法
  log(message, level = 'info') {
    if (this.config.silentMode && level === 'debug') return;
    
    const prefix = '[AeScape]';
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

  async init() {
    try {
      // 检查是否应该显示悬浮球
      if (!this.shouldShow()) {
        this.log('当前页面不显示悬浮球', 'debug');
        return;
      }

      // 检查用户设置
      const enabled = await this.checkUserSettings();
      if (!enabled) {
        this.log('用户已禁用悬浮球', 'debug');
        return;
      }

      // 等待主题系统加载
      await this.waitForThemeSystem();

      // 创建悬浮球
      this.createFloatingBall();
      
      // 加载天气数据
      await this.loadWeatherData();
      
      // 设置定时器
      this.setupTimers();
      
      // 设置消息监听
      this.setupMessageListener();
      
      // 只设置一次主题监听器，避免重复请求
      this.setupThemeListeners();
      
      console.log('[AeScape] 悬浮球系统初始化完成');
      
    } catch (error) {
      console.error('[AeScape] 悬浮球初始化失败:', error);
      this.scheduleRetry();
    }
  }

  // 判断是否处于扩展上下文
  hasExtensionContext() {
    try {
      return typeof chrome !== 'undefined' && !!(chrome.runtime && chrome.runtime.id);
    } catch (_e) {
      return false;
    }
  }

  // 可靠的消息发送（带退避、可选唤醒）
  async sendMessageWithRetry(message, maxAttempts = 3, baseDelayMs = 150) {
    if (!this.hasExtensionContext()) {
      throw new Error('Extension context not available');
    }
    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await new Promise((resolve, reject) => {
          try {
            if (!this.hasExtensionContext()) {
              reject(new Error('Extension context not available'));
              return;
            }
            chrome.runtime.sendMessage(message, (r) => {
              const err = chrome.runtime.lastError;
              if (err) reject(new Error(err.message || 'chrome.runtime.lastError'));
              else resolve(r);
            });
          } catch (e) { reject(e); }
        });
        return res;
      } catch (e) {
        lastError = e;
        await new Promise(r => setTimeout(r, baseDelayMs * attempt));
      }
    }
    throw lastError || new Error('sendMessageWithRetry failed');
  }

  shouldShow() {
    const url = window.location.href;
    const excludePatterns = [
      'chrome://', 'chrome-extension://', 'file://',
      'moz-extension://', 'about:', 'edge://',
      'extension://', 'chrome-search:'
    ];
    
    const shouldExclude = excludePatterns.some(pattern => url.startsWith(pattern));
    console.log(`[AeScape] URL检查: ${url}, 应排除: ${shouldExclude}`);
    return !shouldExclude;
  }

  async checkUserSettings() {
    try {
      if (!this.hasExtensionContext() || !chrome.storage?.local?.get) {
        return true; // 无扩展上下文时默认启用，但仅用默认数据
      }
      const result = await chrome.storage.local.get(['floatingBallEnabled']);
      const enabled = result.floatingBallEnabled !== false; // 默认启用
      console.log('[AeScape] 用户设置检查:', enabled);
      return enabled;
    } catch (error) {
      console.log('[AeScape] 无法检查用户设置，默认启用:', error);
      return true;
    }
  }

  async waitForThemeSystem() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 20; // 2秒
      
      const checkTheme = () => {
        attempts++;
        console.log(`[AeScape] 等待主题系统... 第${attempts}次尝试`);
        
        if (window.unifiedTheme) {
          console.log('[AeScape] 主题系统已加载');
          resolve();
        } else if (attempts >= maxAttempts) {
          console.warn('[AeScape] 主题系统加载超时，使用默认主题');
          resolve();
        } else {
          setTimeout(checkTheme, 100);
        }
      };
      
      checkTheme();
    });
  }

  createFloatingBall() {
    // 移除现有悬浮球
    if (this.ball) {
      this.ball.remove();
    }

    console.log('[AeScape] 创建悬浮球DOM');
    
    // 创建悬浮球容器
    this.ball = document.createElement('div');
    this.ball.id = 'aescape-floating-ball';
    
    // 设置基础样式（不使用cssText避免覆盖问题）
    Object.assign(this.ball.style, {
      position: 'fixed',
      bottom: this.config.position.bottom,
      right: this.config.position.right,
      width: this.config.ballSize + 'px',
      height: this.config.ballSize + 'px',
      borderRadius: '50%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      zIndex: '10000',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: '0 6px 24px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1)',
      userSelect: 'none',
      opacity: '0',
      transform: 'scale(0.8)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)'
    });

    // 创建内容结构
    this.ball.innerHTML = `
      <div class="weather-icon" style="
        width: 18px;
        height: 18px;
        margin-bottom: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
      "></div>
      <div class="temperature" style="
        font-size: 14px;
        font-weight: 600;
        line-height: 1;
      ">--</div>
    `;

    // 设置事件监听
    this.setupBallEvents();
    
    // 应用默认主题
    this.applyDefaultTheme();
    
    // 添加到页面
    document.body.appendChild(this.ball);
    console.log('[AeScape] 悬浮球DOM已添加到页面');
    
    // 显示动画
    requestAnimationFrame(() => {
      this.ball.style.opacity = '1';
      this.ball.style.transform = 'scale(1)';
    });
    
    this.isVisible = true;
  }

  setupBallEvents() {
    if (!this.ball) return;

    // 点击事件
    this.ball.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('[AeScape] 悬浮球被点击');
      this.togglePanel();
    });

    // 悬停效果
    this.ball.addEventListener('mouseenter', () => {
      this.ball.style.transform = 'scale(1.1)';
      this.ball.style.filter = 'brightness(1.1)';
    });

    this.ball.addEventListener('mouseleave', () => {
      this.ball.style.transform = 'scale(1)';
      this.ball.style.filter = 'none';
    });

    // 拖拽功能
    this.setupDragFunctionality();
  }

  setupDragFunctionality() {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    this.ball.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      
      const rect = this.ball.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      
      this.ball.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      const newLeft = Math.max(0, Math.min(window.innerWidth - this.config.ballSize, startLeft + deltaX));
      const newTop = Math.max(0, Math.min(window.innerHeight - this.config.ballSize, startTop + deltaY));
      
      this.ball.style.left = newLeft + 'px';
      this.ball.style.top = newTop + 'px';
      this.ball.style.right = 'auto';
      this.ball.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        this.ball.style.cursor = 'pointer';
        this.savePosition();
      }
    });
  }

  savePosition() {
    try {
      const rect = this.ball.getBoundingClientRect();
      const position = {
        left: rect.left,
        top: rect.top
      };
      localStorage.setItem('aescape-ball-position', JSON.stringify(position));
      console.log('[AeScape] 位置已保存:', position);
    } catch (error) {
      console.warn('[AeScape] 保存位置失败:', error);
    }
  }

  applyDefaultTheme() {
    if (!this.ball) return;

    console.log('[AeScape] 应用默认主题');
    
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour > 19;
    
    // 使用简单的默认样式，不依赖其他主题系统
    const defaultGradient = isNight ? 
      'linear-gradient(135deg, rgb(31, 40, 91) 0%, rgb(46, 54, 96) 100%)' :
      'linear-gradient(135deg, rgba(66, 165, 245, 0.2) 0%, rgba(102, 187, 106, 0.05) 100%)';
    // 默认文本统一为深色，以保证未配置API时的可读性
    const defaultText = 'rgba(33, 33, 33, 0.92)';
    
    this.ball.style.setProperty('background', defaultGradient, 'important');
    this.ball.style.setProperty('color', defaultText, 'important');
    
    // 设置默认天气图标
    this.setDefaultIcon();
    
    console.log('[AeScape] 默认主题已应用');
  }

  setDefaultIcon() {
    const iconElement = this.ball.querySelector('.weather-icon');
    if (iconElement) {
      const hour = new Date().getHours();
      const isNight = hour < 6 || hour > 19;
      const iconSvg = isNight
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
      
      iconElement.innerHTML = iconSvg;
      console.log('[AeScape] 已设置默认天气图标');
    }
  }

  async loadWeatherData() {
    console.log('[AeScape] 开始加载天气数据');
    
    try {
      // 检查扩展是否可用
      if (!this.hasExtensionContext()) {
        if (!window.__AeScapeLoggedNoContext) {
          // 使用更友好的调试信息，不显示警告
          this.log('运行在独立页面模式，使用默认天气数据', 'debug');
          window.__AeScapeLoggedNoContext = true;
        }
        this.useDefaultWeatherData();
        return;
      }

      // 获取天气数据
      let weatherResponse;
      try {
        // 先 ping 唤醒 SW
        try { await this.sendMessageWithRetry({ type: 'ping' }, 1, 0); } catch (_) {}
        weatherResponse = await this.sendMessageWithRetry({ type: 'weather.getCurrent' }, 4, 200);
      } catch (msgError) {
        if (!window.__AeScapeLoggedMsgFail) {
          this.log('后台服务暂时不可用，使用缓存数据', 'debug');
          window.__AeScapeLoggedMsgFail = true;
        }
        this.useDefaultWeatherData();
        return;
      }

      if (weatherResponse?.success && weatherResponse?.data) {
        this.weatherData = weatherResponse.data;
        this.updateBallDisplay(weatherResponse.data);
        console.log('[AeScape] 天气数据加载成功:', weatherResponse.data);
      } else {
        console.warn('[AeScape] 天气数据响应无效，使用默认数据');
        this.useDefaultWeatherData();
        return;
      }

      // 获取位置数据
      try {
        const locationResponse = await this.sendMessageWithRetry({ type: 'location.getCurrent' }, 4, 200);
        
        if (locationResponse?.success && locationResponse?.data) {
          this.currentLocation = locationResponse.data;
          console.log('[AeScape] 位置数据加载成功:', locationResponse.data);
        } else {
          this.currentLocation = { name: '上海' };
        }
      } catch (locError) {
        console.warn('[AeScape] 位置数据获取失败:', locError.message);
        this.currentLocation = { name: '上海' };
      }

    } catch (error) {
      console.warn('[AeScape] 天气数据加载失败:', error);
      this.useDefaultWeatherData();
    }
  }

  useDefaultWeatherData() {
    console.log('[AeScape] 使用默认天气数据');
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour > 19;
    
    this.weatherData = {
      location: { name: '上海', lat: 31.2, lon: 121.4 },
      weather: {
        code: 'clear',
        humidity: 65,
        windSpeedMps: 2.5,
        visibilityKm: 10
      },
      env: {
        temperature: 28,
        feelsLike: 31,
        isNight: isNight
      },
      timestamp: Date.now()
    };
    
    this.currentLocation = { name: '上海' };
    this.updateBallDisplay(this.weatherData);
    this.applyDefaultTheme();
  }

  updateBallDisplay(weatherData) {
    if (!this.ball || !weatherData) {
      console.warn('[AeScape] 更新显示失败：悬浮球或天气数据为空');
      return;
    }

    console.log('[AeScape] 更新悬浮球显示:', weatherData);

    // 更新温度
    const tempElement = this.ball.querySelector('.temperature');
    if (tempElement && weatherData.env?.temperature !== undefined) {
      tempElement.textContent = `${Math.round(weatherData.env.temperature)}°`;
    }

    // 更新天气图标
    const iconElement = this.ball.querySelector('.weather-icon');
    if (iconElement && weatherData.weather?.code) {
      const iconSvg = this.getWeatherSVG(weatherData.weather.code, weatherData.env?.isNight);
      iconElement.innerHTML = iconSvg;
    }

    // 更新主题
    this.updateTheme(weatherData);
  }

  async updateTheme(weatherData) {
    if (!this.ball || !weatherData) return;

    console.log('[AeScape] 更新主题');

    // 优先使用 storage 的统一主题快照
    try {
      if (this.hasExtensionContext() && chrome.storage?.local?.get) {
        const stored = await chrome.storage.local.get(['currentThemeData']);
        if (stored?.currentThemeData) {
          this.applyTheme(stored.currentThemeData);
          return;
        }
      }
    } catch (_) {}

    // 其次使用 GlobalThemeManager（若存在于当前页，如新标签页/弹窗）
    try {
      const globalTheme = window.GlobalThemeManager?.getCurrentTheme?.();
      if (globalTheme?.floating) {
        this.cachedThemeData = globalTheme;
        const theme = globalTheme.floating;
        this.ball.style.setProperty('background', theme.gradient, 'important');
        this.ball.style.setProperty('color', theme.text, 'important');
        console.log('[AeScape] 主题已更新（GlobalThemeManager）:', theme);
        return;
      }
    } catch (_) {}

    // 最后兜底：本地计算
    this.applyFallbackTheme(weatherData);
  }

  applyFallbackTheme(weatherData) {
    // 清除缓存的主题数据
    this.cachedThemeData = null;
    
    const hour = new Date().getHours();
    const weatherCode = weatherData.weather?.code || 'clear';
    const isNight = weatherData.env?.isNight || (hour < 6 || hour > 19);

    let theme;
    if (window.unifiedTheme) {
      theme = window.unifiedTheme.getTheme(weatherCode, hour, isNight);
    } else {
      theme = this.getFallbackTheme(weatherCode, isNight);
    }

    this.ball.style.setProperty('background', theme.gradient, 'important');
    this.ball.style.setProperty('color', theme.text || 'rgba(33, 33, 33, 0.92)', 'important');
    
    console.log('[AeScape] 主题已更新（备用方案）:', theme);
  }

  getFallbackTheme(weatherCode, isNight) {
    const themes = {
      clear: isNight 
        ? { gradient: 'linear-gradient(135deg, rgb(31, 40, 91) 0%, rgb(46, 54, 96) 100%)', text: 'rgba(255, 255, 255, 0.95)' }
        : { gradient: 'linear-gradient(135deg, rgb(255, 167, 38) 0%, rgb(255, 138, 101) 100%)', text: 'rgba(33, 33, 33, 0.9)' },
      cloudy: isNight
        ? { gradient: 'linear-gradient(135deg, rgb(19, 25, 28) 0%, rgb(28, 36, 40) 100%)', text: 'rgba(255, 255, 255, 0.95)' }
        : { gradient: 'linear-gradient(135deg, rgb(96, 125, 139) 0%, rgb(120, 144, 156) 100%)', text: 'rgba(33, 33, 33, 0.9)' },
      rain: isNight
        ? { gradient: 'linear-gradient(135deg, rgb(7, 10, 17) 0%, rgb(13, 18, 63) 100%)', text: 'rgba(255, 255, 255, 0.95)' }
        : { gradient: 'linear-gradient(135deg, rgb(63, 81, 181) 0%, rgb(92, 107, 192) 100%)', text: 'rgba(255, 255, 255, 0.95)' }
    };
    
    return themes[weatherCode] || themes.clear;
  }

  getWeatherSVG(code, isNight, size = 16) {
    // 使用统一图标库
    if (window.AeScapeIcons) {
      return window.AeScapeIcons.getWeatherIcon(code, isNight, size);
    }
    
    // 备用方案
    const fallbackIcon = isNight 
      ? `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`
      : `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    return fallbackIcon;
  }

  showErrorState() {
    if (!this.ball) return;
    
    console.log('[AeScape] 显示错误状态');
    
    const tempElement = this.ball.querySelector('.temperature');
    const iconElement = this.ball.querySelector('.weather-icon');
    
    if (tempElement) tempElement.textContent = '--';
    if (iconElement) {
      iconElement.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    }
  }

  togglePanel() {
    console.log('[AeScape] 切换面板显示状态');
    
    if (this.isPanelVisible) {
      this.hidePanel();
    } else {
      this.showPanel();
    }
  }

  showPanel() {
    console.log('[AeScape] 显示详情面板');
    
    // 移除现有面板
    if (this.panel) {
      this.panel.remove();
    }

    // 创建面板
    this.panel = document.createElement('div');
    this.panel.id = 'aescape-detail-panel';
    
    const baseGradient = this.getCurrentThemeGradient();
    const glassLayer = 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.04))';
    const translucent = this.makeTranslucentGradient(baseGradient, 0.6);
    
    // 设置面板样式
    this.panel.style.cssText = `
      position: fixed;
      bottom: 160px;
      right: 20px;
      width: 320px;
      min-height: 300px;
      background: ${glassLayer}, ${translucent};
      background-blend-mode: overlay;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid ${this.getThemeBorderColor()};
      border-radius: 12px;
      padding: 0;
      z-index: 10001;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', sans-serif;
      box-shadow: 
        0 25px 80px rgba(0, 0, 0, 0.4),
        0 15px 35px rgba(0, 0, 0, 0.3),
        0 5px 15px rgba(0, 0, 0, 0.2);
      color: ${this.getCurrentThemeTextColor()};
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
      font-weight: 300;
      line-height: 1.5;
      overflow: hidden;
    `;

    // 设置面板内容
    this.panel.innerHTML = this.generatePanelContent();
    
    // 添加到页面
    document.body.appendChild(this.panel);
    this.isPanelVisible = true;
    
    // 显示动画
    requestAnimationFrame(() => {
      this.panel.style.opacity = '1';
      this.panel.style.transform = 'translateY(0)';
    });
    
    // 设置点击外部关闭
    this.setupPanelOutsideClick();
  }

  hidePanel() {
    if (!this.panel || !this.isPanelVisible) return;
    
    console.log('[AeScape] 隐藏详情面板');
    
    this.panel.style.opacity = '0';
    this.panel.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      if (this.panel && this.panel.parentNode) {
        this.panel.parentNode.removeChild(this.panel);
        this.panel = null;
        this.isPanelVisible = false;
      }
    }, 300);
  }

  setupPanelOutsideClick() {
    const handleOutsideClick = (e) => {
      if (this.panel && !this.panel.contains(e.target) && 
          this.ball && !this.ball.contains(e.target)) {
        this.hidePanel();
        document.removeEventListener('click', handleOutsideClick);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
    }, 100);
  }

  generatePanelContent() {
    if (!this.weatherData) {
      return `
        <div style="
          padding: 24px 20px;
          text-align: center;
          color: ${this.getCurrentThemeTextColor()};
        ">
          <div style="
            font-size: 1.1rem;
            font-weight: 500;
            margin-bottom: 12px;
            opacity: 0.9;
          ">天景 AeScape</div>
          <div style="
            font-size: 18px;
            margin-bottom: 10px;
            font-weight: 400;
          ">天气数据加载中</div>
          <div style="
            font-size: 14px;
            opacity: 0.7;
            font-weight: 300;
          ">请稍候...</div>
        </div>
      `;
    }

    const weather = this.weatherData;
    const location = this.currentLocation?.name || '未知位置';
    const temperature = Math.round(weather.env?.temperature || 0);
    const feelsLike = Math.round(weather.env?.feelsLike || weather.env?.temperature || 0);
    const humidity = weather.weather?.humidity || '--';
    const windSpeed = Math.round((weather.weather?.windSpeedMps || 0) * 3.6);
    
    const weatherNames = {
      clear: weather.env?.isNight ? '夜晚晴朗' : '晴朗',
      cloudy: '多云',
      rain: '下雨',
      snow: '下雪',
      fog: '有雾',
      thunderstorm: '雷暴'
    };
    
    const weatherDesc = weatherNames[weather.weather?.code] || '未知天气';
    const textColor = this.getCurrentThemeTextColor();
    const borderColor = this.getThemeBorderColor();

    return `
      <!-- Header section -->
      <div style="
        padding: 16px 16px 12px;
        text-align: center;
        border: none;
        margin: 0;
      ">
        <div style="
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 2px;
          opacity: 0.9;
          color: ${textColor};
        ">天景 AeScape</div>
      </div>

      <!-- Content section -->
      <div style="
        padding: 0 16px 12px;
        border: none;
        margin: 0;
      ">
        <!-- Weather section -->
        <div style="
          padding: 14px;
          margin-bottom: 14px;
          border: none;
          background: none;
        ">
          <div style="
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 8px;
            opacity: 0.9;
            color: ${textColor};
          ">当前天气</div>
          
          <div style="
            font-size: 11px;
            opacity: 0.8;
            margin-bottom: 8px;
            color: ${textColor};
            font-weight: 400;
          ">${location}</div>
          
          <div style="
            display: flex;
            align-items: center;
            gap: 14px;
            margin-bottom: 16px;
            color: ${textColor};
          ">
            <div style="
              font-size: 2rem;
            ">${this.getWeatherSVG(weather.weather?.code, weather.env?.isNight, 32)}</div>
            <div style="flex: 1;">
              <div style="
                font-size: 18px;
                font-weight: 300;
                line-height: 1.2;
                margin-bottom: 4px;
              ">${temperature}°</div>
              <div style="
                font-size: 11px;
                opacity: 0.85;
                line-height: 1.4;
              ">${weatherDesc}</div>
            </div>
          </div>
          
          <div style="
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px 20px;
            font-size: 11px;
            line-height: 1.6;
            color: ${textColor};
            margin-bottom: 16px;
          ">
            <div style="
              display: flex;
              flex-direction: column;
              text-align: center;
              opacity: 0.9;
              padding: 8px 6px;
              transition: all 200ms ease;
              background: none; /* 移除容器背景 */
              border: none;     /* 移除容器边框 */
              border-radius: 0; /* 移除容器圆角 */
            ">
              <span style="
                font-size: 10px;
                opacity: 0.6;
                margin-bottom: 4px;
                font-weight: 400;
                text-transform: uppercase;
                letter-spacing: 0.05em;
              ">体感</span>
              <span style="
                font-size: 12px;
                font-weight: 500;
                opacity: 0.95;
              ">${feelsLike}°</span>
            </div>
            <div style="
              display: flex;
              flex-direction: column;
              text-align: center;
              opacity: 0.9;
              padding: 8px 6px;
              transition: all 200ms ease;
              background: none; /* 移除容器背景 */
              border: none;     /* 移除容器边框 */
              border-radius: 0; /* 移除容器圆角 */
            ">
              <span style="
                font-size: 10px;
                opacity: 0.6;
                margin-bottom: 4px;
                font-weight: 400;
                text-transform: uppercase;
                letter-spacing: 0.05em;
              ">湿度</span>
              <span style="
                font-size: 12px;
                font-weight: 500;
                opacity: 0.95;
              ">${humidity}%</span>
            </div>
            <div style="
              display: flex;
              flex-direction: column;
              text-align: center;
              opacity: 0.9;
              padding: 8px 6px;
              transition: all 200ms ease;
              background: none; /* 移除容器背景 */
              border: none;     /* 移除容器边框 */
              border-radius: 0; /* 移除容器圆角 */
            ">
              <span style="
                font-size: 10px;
                opacity: 0.6;
                margin-bottom: 4px;
                font-weight: 400;
                text-transform: uppercase;
                letter-spacing: 0.05em;
              ">风速</span>
              <span style="
                font-size: 12px;
                font-weight: 500;
                opacity: 0.95;
              ">${windSpeed} km/h</span>
            </div>
            <div style="
              display: flex;
              flex-direction: column;
              text-align: center;
              opacity: 0.9;
              padding: 8px 6px;
              transition: all 200ms ease;
              background: none; /* 移除容器背景 */
              border: none;     /* 移除容器边框 */
              border-radius: 0; /* 移除容器圆角 */
            ">
              <span style="
                font-size: 10px;
                opacity: 0.6;
                margin-bottom: 4px;
                font-weight: 400;
                text-transform: uppercase;
                letter-spacing: 0.05em;
              ">能见度</span>
              <span style="
                font-size: 12px;
                font-weight: 500;
                opacity: 0.95;
              ">${weather.weather?.visibilityKm || '--'} km</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer section -->
      <div style="
        padding: 2px 16px;
        text-align: center;
        font-size: 10px;
        opacity: 0.7;
        color: ${textColor};
      ">
        更新时间 ${weather.timestamp ? new Date(weather.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '--'}
      </div>
    `;
  }

  getCurrentThemeGradient() {
    // 优先使用缓存的主题数据
    if (this.cachedThemeData?.floating?.gradient) {
      return this.cachedThemeData.floating.gradient;
    }
    
    if (window.unifiedTheme && this.weatherData) {
      const hour = new Date().getHours();
      const weatherCode = this.weatherData.weather?.code || 'clear';
      const isNight = this.weatherData.env?.isNight || (hour < 6 || hour > 19);
      const theme = window.unifiedTheme.getTheme(weatherCode, hour, isNight);
      return theme.gradient;
    }
    
    // 备用方案
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour > 19;
    return isNight 
      ? 'linear-gradient(135deg, rgb(31, 40, 91) 0%, rgb(46, 54, 96) 100%)'
      : 'linear-gradient(135deg, rgb(255, 167, 38) 0%, rgb(255, 138, 101) 100%)';
  }

  getCurrentThemeTextColor() {
    // 优先使用缓存的主题数据
    if (this.cachedThemeData?.panel?.text) {
      return this.cachedThemeData.panel.text;
    }
    if (this.cachedThemeData?.floating?.text) {
      return this.cachedThemeData.floating.text;
    }
    
    // 备用方案
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour > 19;
    return isNight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(33, 33, 33, 0.9)';
  }

  getThemeBorderColor() {
    // 根据主题文本颜色生成适合的边框颜色
    const textColor = this.getCurrentThemeTextColor();
    
    // 如果是深色文本，使用深色边框
    if (textColor.includes('33, 33, 33')) {
      return 'rgba(0, 0, 0, 0.15)';
    }
    
    // 默认使用白色边框（适用于深色主题）
    return 'rgba(255, 255, 255, 0.2)';
  }

  setupTimers() {
    // 定期更新天气数据
    this.updateTimer = setInterval(() => {
      console.log('[AeScape] 定时更新天气数据');
      this.loadWeatherData();
    }, this.config.updateInterval);
  }

  // 统一的主题监听器设置，避免重复请求
  setupThemeListeners() {
    // 防止重复设置监听器
    if (this._themeListenersSetup) {
      return;
    }
    this._themeListenersSetup = true;

    // 1. 首先尝试应用初始主题
    this.applyInitialTheme();

    // 2. 监听 storage 统一主题快照变化（只设置一次）
    if (this.hasExtensionContext() && chrome.storage?.onChanged) {
      const storageListener = (changes, area) => {
        if (area === 'local' && changes.currentThemeData?.newValue) {
          try {
            this.applyTheme(changes.currentThemeData.newValue);
            this.updatePanelTheme();
          } catch (e) {
            console.warn('[AeScape] Storage主题更新失败:', e);
          }
        }
      };
      chrome.storage.onChanged.addListener(storageListener);
      // 保存监听器引用以便清理
      this._storageListener = storageListener;
    }

    // 3. 监听统一主题事件（只设置一次）
    const themeEventListener = (evt) => {
      try {
        const data = evt?.detail;
        if (data) {
          this.applyTheme(data);
          this.updatePanelTheme();
        }
      } catch (e) {
        console.warn('[AeScape] 主题事件处理失败:', e);
      }
    };
    window.addEventListener('AeScapeThemeUpdate', themeEventListener);
    // 保存监听器引用以便清理
    this._themeEventListener = themeEventListener;

    // 4. 订阅 GlobalThemeManager（只设置一次）
    this.subscribeToGlobalTheme();
  }

  // 应用初始主题
  async applyInitialTheme() {
    try {
      // 优先使用 storage 的统一主题快照
      if (this.hasExtensionContext() && chrome.storage?.local?.get) {
        const stored = await chrome.storage.local.get(['currentThemeData']);
        if (stored?.currentThemeData) {
          this.applyTheme(stored.currentThemeData);
          return;
        }
      }

      // 其次使用页面中的 GlobalThemeManager
      const themeData = window.GlobalThemeManager?.getCurrentTheme?.();
      if (themeData) {
        this.applyTheme(themeData);
        return;
      }

      // 再兜底：直接用 unifiedTheme 计算一个可用主题
      if (window.unifiedTheme) {
        const hour = new Date().getHours();
        const isNight = hour < 6 || hour > 19;
        const theme = window.unifiedTheme.getTheme('clear', hour, isNight);
        const themeData = { floating: { gradient: theme.gradient, text: theme.text }, panel: { text: theme.text }, newtab: theme };
        this.applyTheme(themeData);
        return;
      }

      // 最终兜底
      this.applyDefaultTheme();
    } catch (e) {
      console.warn('[AeScape] 初始主题应用失败:', e);
      this.applyDefaultTheme();
    }
  }

  // 更新面板主题
  updatePanelTheme() {
    if (this.panel) {
      const glass = 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.04))';
      const base = this.makeTranslucentGradient(this.getCurrentThemeGradient(), 0.6);
      this.panel.style.background = `${glass}, ${base}`;
      this.panel.style.backgroundBlendMode = 'overlay';
      this.panel.style.backdropFilter = 'blur(20px)';
      this.panel.style.webkitBackdropFilter = 'blur(20px)';
      this.panel.style.border = `1px solid ${this.getThemeBorderColor()}`;
      this.panel.style.color = this.getCurrentThemeTextColor();
    }
  }

  // 订阅统一主题系统的后续变更（在新标签页/弹窗等扩展页面中生效）
  subscribeToGlobalTheme() {
    try {
      const addListener = window.GlobalThemeManager && typeof window.GlobalThemeManager.addListener === 'function'
        ? window.GlobalThemeManager.addListener.bind(window.GlobalThemeManager)
        : null;
      if (addListener) {
        const globalThemeListener = (themeData) => {
          try {
            if (themeData) {
              this.applyTheme(themeData);
              this.updatePanelTheme();
            }
          } catch (e) {
            console.warn('[AeScape] GlobalThemeManager 回调失败:', e);
          }
        };
        addListener(globalThemeListener);
        // 保存监听器引用以便清理
        this._globalThemeListener = globalThemeListener;
      }
    } catch (e) {
      console.warn('[AeScape] 订阅全局主题失败:', e);
    }
  }

  applyTheme(themeData) {
    if (!themeData || !this.ball) {
      console.warn('[AeScape] 无法应用主题：缺少数据或悬浮球');
      return;
    }
    
    console.log('[AeScape] 应用主题:', themeData);
    
    // 应用到悬浮球
    const floatingTheme = themeData.floating || themeData.newtab || themeData.popup || null;
    if (floatingTheme) {
      // 叠加半透明玻璃层 + 主题渐变，并开启磨砂
      const glassOverlay = 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.04))';
      const baseGradient = this.makeTranslucentGradient(floatingTheme.gradient || '', 0.65);
      const combined = baseGradient ? `${glassOverlay}, ${baseGradient}` : glassOverlay;
      this.ball.style.setProperty('background', combined, 'important');
      this.ball.style.setProperty('backgroundBlendMode', 'overlay', 'important');
      this.ball.style.setProperty('backdropFilter', 'blur(20px)', 'important');
      this.ball.style.setProperty('-webkit-backdrop-filter', 'blur(20px)', 'important');
      this.ball.style.setProperty('color', (floatingTheme.text || 'rgba(33, 33, 33, 0.92)'), 'important');
    }
    
    // 缓存主题数据供面板使用，确保panel数据可用
    this.cachedThemeData = themeData;
    if (!this.cachedThemeData.panel && this.cachedThemeData.floating) {
      this.cachedThemeData.panel = { ...this.cachedThemeData.floating };
    }
    
    // 如果面板已打开，更新磨砂与背景
    if (this.panel) {
      const panelGlass = 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.04))';
      const base = this.getCurrentThemeGradient();
      this.panel.style.background = `${panelGlass}, ${base}`;
      this.panel.style.backgroundBlendMode = 'overlay';
      this.panel.style.backdropFilter = 'blur(20px)';
      this.panel.style.webkitBackdropFilter = 'blur(20px)';
      this.panel.style.border = `1px solid ${this.getThemeBorderColor()}`;
      this.panel.style.color = this.getCurrentThemeTextColor();
    }
    
    console.log('[AeScape] 悬浮球主题已更新');
  }

  scheduleRetry() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
    
    console.log('[AeScape] 计划重试初始化');
    this.retryTimer = setTimeout(() => {
      this.init();
    }, this.config.retryInterval);
  }

  setupMessageListener() {
    if (chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('[AeScape] 收到消息:', message);
        
        switch (message.type) {
          case 'weather.updated':
            if (message.data) {
              this.weatherData = message.data;
              this.updateBallDisplay(message.data);
            }
            break;
            
          case 'floatingBall.toggle':
            if (message.enabled) {
              if (!this.isVisible) {
                this.init();
              }
            } else {
              this.destroy();
            }
            break;
        }
      });
    }

    // 兜底逻辑：监听 storage 变化，确保开关状态变化能即时作用（即使消息丢失）
    try {
      if (chrome.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === 'local' && changes.floatingBallEnabled) {
            const enabled = changes.floatingBallEnabled.newValue !== false;
            console.log('[AeScape] storage事件触发，floatingBallEnabled =', enabled);
            if (enabled) {
              if (!this.isVisible) {
                this.init();
              }
            } else {
              this.destroy();
            }
          }
        });
      }
    } catch (err) {
      console.warn('[AeScape] 注册storage监听失败:', err);
    }
  }

  destroy() {
    console.log('[AeScape] 销毁悬浮球');
    
    // 清理定时器
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    
    // 清理主题监听器
    try {
      if (this._storageListener && chrome.storage?.onChanged) {
        chrome.storage.onChanged.removeListener(this._storageListener);
        this._storageListener = null;
      }
      
      if (this._themeEventListener) {
        window.removeEventListener('AeScapeThemeUpdate', this._themeEventListener);
        this._themeEventListener = null;
      }
      
      // 重置主题监听器标记
      this._themeListenersSetup = false;
    } catch (e) {
      console.warn('[AeScape] 清理主题监听器失败:', e);
    }
    
    // 移除面板
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
      this.isPanelVisible = false;
    }
    
    // 移除悬浮球
    if (this.ball) {
      this.ball.remove();
      this.ball = null;
      this.isVisible = false;
    }
  }

  // 将梯度字符串中的 rgb() 转为 rgba(alpha)
  makeTranslucentGradient(gradientString, alpha = 0.72) {
    try {
      if (!gradientString || typeof gradientString !== 'string') return gradientString;
      // 已经是 rgba 的不处理
      if (gradientString.includes('rgba(')) return gradientString;
      // 将所有 rgb(r, g, b) 替换为 rgba(r, g, b, alpha)
      return gradientString.replace(/rgb\s*\((\s*\d+\s*),(\s*\d+\s*),(\s*\d+\s*)\)/g,
        (m, r, g, b) => `rgba(${parseInt(r)}, ${parseInt(g)}, ${parseInt(b)}, ${alpha})`);
    } catch (_) {
      return gradientString;
    }
  }
}

// 初始化函数
function initFloatingBall() {
  console.log('[AeScape] 准备初始化悬浮球');
  
  // 销毁现有实例，确保完全清理
  if (window.aeScapeFloatingBall) {
    try {
      window.aeScapeFloatingBall.destroy();
      // 等待一帧确保DOM清理完成
      setTimeout(() => {
        window.aeScapeFloatingBall = null;
        // 创建新实例
        window.aeScapeFloatingBall = new AeScapeFloatingBall();
      }, 16);
      return;
    } catch (e) {
      console.warn('[AeScape] 销毁旧实例失败:', e);
      window.aeScapeFloatingBall = null;
    }
  }
  
  // 创建新实例
  window.aeScapeFloatingBall = new AeScapeFloatingBall();
}

// 页面加载时初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFloatingBall);
} else {
  initFloatingBall();
}

// 监听页面变化（用于SPA应用）
let currentUrl = location.href;
const urlObserver = new MutationObserver(() => {
  if (location.href !== currentUrl) {
    currentUrl = location.href;
    console.log('[AeScape] 页面URL变化，重新初始化');
    setTimeout(initFloatingBall, 1000);
  }
});

urlObserver.observe(document, { subtree: true, childList: true });

console.log('[AeScape] 内容脚本已加载');