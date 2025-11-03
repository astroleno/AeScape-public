/**
 * 天景 AeScape - 新标签页主脚本
 * 专业简洁的天气应用
 */

class AeScapeNewTab {
  constructor() {
    this.weatherData = null;
    this.currentLocation = null;
    this.isApiConfigured = false;
    this.refreshInterval = null;
    
    // 视频模块相关
    this.videoManager = null;
    this.cardSystem = null;
    this.triggerManager = null;
    this.lastWeatherType = null;
    this.videoSettings = {
      enabled: true,
      weatherChangeTrigger: true,
      intervalMinutes: 'off'
    };
    
    // 优化模块
    this.errorHandler = null;
    this.performanceMonitor = null;
    this.configManager = null;
    this.videoResourceManager = null;
    this.smartThemeAdapter = null;
    
    this.init();
  }

  async init() {
    console.log('AeScape NewTab initializing...');
    
    try {
      // 初始化优化模块
      await this.initOptimizationModules();
      
      // 开场黑幕：200ms 后淡出并移除
      try {
        const mask = document.getElementById('boot-mask');
        if (mask) {
          setTimeout(() => { mask.style.opacity = '0'; }, 50);
          setTimeout(() => { mask.remove(); }, 250);
        }
      } catch (_) {}

      // 隐藏 Chrome 扩展信息栏（底部栏）
      this.hideExtensionBottomBar();

      this.initializeTime();
      this.setupEventListeners();
      this.setupQuickLinks();
      
      // 初始化视频模块（先初始化，以便后续播放视频）
      this.initializeVideoModule();
      
      await this.checkApiStatus();
      // 加载天气数据（会自动播放当前天气的视频）
      await this.loadWeatherData();
      
      this.startTimers();
      
      console.log('AeScape NewTab initialized successfully');
    } catch (error) {
      console.error('Initialization failed:', error);
      this.showNotification('error', '初始化失败，请检查扩展设置');
    }
  }

  /**
   * 初始化优化模块
   */
  async initOptimizationModules() {
    try {
      console.log('[AeScape] 初始化优化模块...');
      
      // 初始化错误处理器
      if (typeof AeScapeErrorHandler !== 'undefined') {
        this.errorHandler = new AeScapeErrorHandler();
        console.log('[AeScape] 错误处理器已初始化');
      }
      
      // 初始化性能监控器
      if (typeof AeScapePerformanceMonitor !== 'undefined') {
        this.performanceMonitor = new AeScapePerformanceMonitor();
        console.log('[AeScape] 性能监控器已初始化');
      }
      
      // 初始化配置管理器
      if (typeof AeScapeConfigManager !== 'undefined') {
        this.configManager = new AeScapeConfigManager();
        await this.configManager.init();
        console.log('[AeScape] 配置管理器已初始化');
      }
      
      // 初始化视频资源管理器
      if (typeof VideoResourceManager !== 'undefined') {
        this.videoResourceManager = new VideoResourceManager({
          maxCacheSize: 3,
          enableIntelligentPreload: true
        });
        console.log('[AeScape] 视频资源管理器已初始化');
      }
      
      // 初始化智能主题适配器
      if (typeof SmartThemeAdapter !== 'undefined') {
        this.smartThemeAdapter = new SmartThemeAdapter({
          enableCaching: true,
          enableBatching: true,
          enableTransitions: true
        });
        console.log('[AeScape] 智能主题适配器已初始化');
      }
      
      console.log('[AeScape] 所有优化模块初始化完成');
      
    } catch (error) {
      console.error('[AeScape] 优化模块初始化失败:', error);
      // 不抛出错误，允许基础功能继续工作
    }
  }

  /**
   * 在 MV3 下，background service worker 可能尚未唤醒或刚重启，
   * 这里增加一个带退避的安全消息发送封装，提升稳定性。
   */
  async sendMessageWithRetry(message, maxAttempts = 3, baseDelayMs = 150) {
    // 扩展上下文不可用（例如直接用 file:// 打开页面或扩展被重载）
    if (!this.hasExtensionContext()) {
      throw new Error('Extension context not available');
    }

    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // 使用 Promise 包装 sendMessage
        const response = await new Promise((resolve, reject) => {
          try {
            // 二次守护：在真正调用前再次检测
            if (!this.hasExtensionContext()) {
              reject(new Error('Extension context not available'));
              return;
            }
            chrome.runtime.sendMessage(message, (res) => {
              const err = chrome.runtime.lastError;
              if (err) {
                reject(new Error(err.message || 'chrome.runtime.lastError'));
              } else {
                resolve(res);
              }
            });
          } catch (e) {
            reject(e);
          }
        });
        return response;
      } catch (err) {
        lastError = err;
        // 常见报错：Receiving end does not exist / Extension context invalidated
        // 退避等待后重试
        const delay = baseDelayMs * attempt;
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw lastError || new Error('sendMessageWithRetry failed');
  }

  // 判断是否处于扩展上下文（兼容 chrome 未定义的场景）
  hasExtensionContext() {
    try {
      return typeof chrome !== 'undefined' && !!(chrome.runtime && chrome.runtime.id);
    } catch (_e) {
      return false;
    }
  }

  // 使用统一图标库
  getSVGIcon(weatherCode, isNight = false) {
    if (window.AeScapeIcons) {
      return window.AeScapeIcons.getWeatherIcon(weatherCode, isNight, 64);
    }
    // 备用方案：使用默认太阳图标
    return `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>`;
  }

  /**
   * 隐藏 Chrome 扩展信息栏（底部栏）
   * 查找并隐藏包含 "AeScape" 或 "自定义 Chrome" 文字的底部栏
   */
  hideExtensionBottomBar() {
    try {
      // 避免重复初始化 MutationObserver
      if (this._bottomBarObserver) {
        return;
      }

      // 方法1: 查找包含特定文字的元素（立即执行）
      const findAndHideBottomBar = () => {
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          // 跳过已隐藏的元素
          if (el.style.display === 'none') {
            continue;
          }

          const text = el.textContent || '';
          // 查找包含 "AeScape" 或 "自定义 Chrome" 文字的底部元素
          if ((text.includes('AeScape') || text.includes('自定义 Chrome')) && 
              el !== document.body && 
              el.parentElement) {
            const computedStyle = window.getComputedStyle(el);
            // 检查是否是底部定位的元素
            if (computedStyle.position === 'fixed' || computedStyle.position === 'absolute') {
              const rect = el.getBoundingClientRect();
              // 如果元素靠近底部（距离底部小于 50px）
              if (window.innerHeight - rect.bottom < 50) {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                el.style.opacity = '0';
                el.style.height = '0';
                el.style.overflow = 'hidden';
                el.style.pointerEvents = 'none';
                console.log('[AeScape] 隐藏底部栏:', el);
                return true; // 找到并隐藏后返回
              }
            }
          }
        }
        return false;
      };

      // 立即执行一次
      findAndHideBottomBar();

      // 方法2: 使用 MutationObserver 监听新添加的底部元素
      this._bottomBarObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) { // Element node
              const text = node.textContent || '';
              if ((text.includes('AeScape') || text.includes('自定义 Chrome')) &&
                  node !== document.body) {
                const computedStyle = window.getComputedStyle(node);
                if (computedStyle.position === 'fixed' || computedStyle.position === 'absolute') {
                  const rect = node.getBoundingClientRect();
                  if (window.innerHeight - rect.bottom < 50) {
                    node.style.display = 'none';
                    node.style.visibility = 'hidden';
                    node.style.opacity = '0';
                    node.style.height = '0';
                    node.style.overflow = 'hidden';
                    node.style.pointerEvents = 'none';
                    console.log('[AeScape] 隐藏动态添加的底部栏:', node);
                  }
                }
              }
            }
          }
        }
        // 每次 DOM 变化后再次检查
        findAndHideBottomBar();
      });

      // 开始观察 DOM 变化
      this._bottomBarObserver.observe(document.body, {
        childList: true,
        subtree: true
      });

      // 延迟执行一次，确保页面完全加载后再次检查（仅在未找到时执行）
      setTimeout(() => {
        findAndHideBottomBar();
      }, 1000);
    } catch (error) {
      console.warn('[AeScape] 隐藏底部栏时出错:', error);
    }
  }

  // 时间管理
  initializeTime() {
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);
  }

  updateTime() {
    const now = new Date();
    const timeElement = document.getElementById('current-time');
    const dateElement = document.getElementById('current-date');
    
    if (timeElement) {
      timeElement.textContent = now.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    }
    
    if (dateElement) {
      dateElement.textContent = now.toLocaleDateString('zh-CN', { 
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
    }
  }

  // 事件监听器设置
  setupEventListeners() {
    // 搜索功能
    const searchInput = document.getElementById('search-input');
    searchInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleSearch(searchInput.value.trim());
      }
    });

    // 按钮事件 - 使用箭头函数确保this绑定
    document.getElementById('settings-btn')?.addEventListener('click', () => this.toggleSettings());
    document.getElementById('refresh-btn')?.addEventListener('click', () => this.refreshWeather());
    document.getElementById('location-btn')?.addEventListener('click', () => this.toggleLocationModal());
    
    // 设置面板
    document.getElementById('close-settings')?.addEventListener('click', () => this.toggleSettings());
    document.getElementById('save-api-key')?.addEventListener('click', () => this.saveApiKey());
    document.getElementById('test-api-key')?.addEventListener('click', () => this.testApiKey());
    document.getElementById('set-location')?.addEventListener('click', () => this.setLocationByCity());
    document.getElementById('auto-location')?.addEventListener('click', () => this.getAutoLocation());
    
    // 位置弹窗
    document.getElementById('close-location')?.addEventListener('click', () => this.toggleLocationModal());
    document.getElementById('use-current-location')?.addEventListener('click', () => this.useCurrentLocation());
    
    // 输入框
    document.getElementById('api-key-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.saveApiKey();
    });
    
    document.getElementById('city-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.setLocationByCity();
    });
    
    document.getElementById('city-search')?.addEventListener('input', (e) => {
      this.searchCities(e.target.value);
    });

    // 视频设置事件监听器
    document.getElementById('video-animations')?.addEventListener('change', (e) => {
      this.videoSettings.enabled = e.target.checked;
      this.saveVideoSettings();
    });

    // 自动触发开关已移除

    document.getElementById('animation-frequency')?.addEventListener('input', (e) => {
      this.videoSettings.frequency = parseInt(e.target.value);
      document.getElementById('frequency-value').textContent = e.target.value;
      this.saveVideoSettings();
    });

    document.getElementById('weather-change-trigger')?.addEventListener('change', (e) => {
      this.videoSettings.weatherChangeTrigger = e.target.checked;
      this.saveVideoSettings();
    });

    document.getElementById('interval-trigger')?.addEventListener('change', (e) => {
      this.videoSettings.intervalMinutes = e.target.value; // 'off' | '15' | '30' ...
      this.saveVideoSettings();
      this.setupIntervalTrigger();
    });

    // 点击外部关闭弹窗
    document.addEventListener('click', (e) => {
      const settingsPanel = document.getElementById('settings-panel');
      const locationModal = document.getElementById('location-modal');
      
      if (settingsPanel?.classList.contains('active')) {
        if (!settingsPanel.querySelector('.settings-content').contains(e.target) &&
            !document.getElementById('settings-btn').contains(e.target)) {
          this.toggleSettings();
        }
      }
      
      if (locationModal?.classList.contains('active')) {
        if (!locationModal.querySelector('.modal-content').contains(e.target) &&
            !document.getElementById('location-btn').contains(e.target)) {
          this.toggleLocationModal();
        }
      }
    });
  }

  // 快捷链接
  setupQuickLinks() {
    const quickLinks = document.getElementById('quick-links');
    const defaultLinks = [
      { name: 'GitHub', url: 'https://github.com' },
      { name: 'Google', url: 'https://google.com' },
      { name: '微博', url: 'https://weibo.com' },
      { name: '知乎', url: 'https://zhihu.com' },
      { name: 'Bilibili', url: 'https://bilibili.com' }
    ];

    quickLinks.innerHTML = defaultLinks.map(link => 
      `<a href="${link.url}" class="quick-link" target="_blank">${link.name}</a>`
    ).join('');
  }

  // URL导航功能（已移除搜索功能以符合Chrome政策）
  // 根据Chrome政策，新标签页扩展不应修改搜索体验
  // 如需搜索，请使用浏览器地址栏，系统会使用您设置的默认搜索引擎
  handleSearch(query) {
    if (!query) return;

    // 只支持URL导航，不支持搜索功能
    if (this.isValidUrl(query)) {
      // 如果是有效URL，直接导航
      window.location.href = query.startsWith('http') ? query : `https://${query}`;
    } else {
      // 如果不是URL，提示用户使用浏览器地址栏进行搜索
      this.showNotification('info', '请输入有效网址，或使用浏览器地址栏进行搜索');
    }
  }

  isValidUrl(string) {
    try {
      new URL(string.startsWith('http') ? string : `https://${string}`);
      return string.includes('.');
    } catch (_) {
      return false;
    }
  }

  // API状态检查
  async checkApiStatus() {
    try {
      if (!this.hasExtensionContext()) {
        this.isApiConfigured = false;
        return;
      }
      const response = await this.sendMessageWithRetry({ type: 'api.checkStatus' }, 4, 200);
      this.isApiConfigured = response?.success && response?.hasApiKey;
      
      if (!this.isApiConfigured) {
        this.showNotification('warning', '请在设置中配置API Key以获取天气数据');
      }
    } catch (error) {
      console.error('Failed to check API status:', error);
      this.isApiConfigured = false;
    }
  }

  // 天气数据加载
  async loadWeatherData() {
    try {
      // 检查扩展是否可用
      if (!this.hasExtensionContext()) {
        console.log('Extension context not available, skipping weather load');
        return;
      }

      // 先 ping 一次，确保 SW 已唤醒
      try { await this.sendMessageWithRetry({ type: 'ping' }, 1, 0); } catch (_) {}

      const response = await this.sendMessageWithRetry({ type: 'weather.getCurrent' }, 4, 200);
      
      if (response?.success && response?.data) {
        this.weatherData = response.data;
        this.currentLocation = response.data.location;
        this.updateWeatherUI(response.data);
        await this.updateWeatherTheme(response.data);
        
          // 加载天气数据后直接随机播放当前天气的视频（延迟一小段时间确保视频模块已完全初始化）
        setTimeout(() => {
          this.playCurrentWeatherVideo();
        }, 500);
      }

      const locationResponse = await this.sendMessageWithRetry({ type: 'location.getCurrent' }, 4, 200);
      
      if (locationResponse?.success && locationResponse?.data) {
        this.currentLocation = locationResponse.data;
        this.updateLocationDisplay(locationResponse.data);
      }
    } catch (error) {
      console.error('Failed to load weather data:', error);
      // 静默处理错误，不显示错误状态
    }
  }

  updateWeatherUI(weather) {
    // 检查视频动画
    this.checkVideoAnimation(weather);
    
    const elements = {
      location: document.getElementById('location-name'),
      temperature: document.getElementById('current-temp'),
      description: document.getElementById('weather-desc'),
      icon: document.getElementById('weather-icon'),
      feelsLike: document.getElementById('feels-like'),
      humidity: document.getElementById('humidity'),
      windSpeed: document.getElementById('wind-speed'),
      visibility: document.getElementById('visibility'),
      pressure: document.getElementById('pressure'),
      uvIndex: document.getElementById('uv-index')
    };

    const weatherDescriptions = {
      clear: weather.env?.isNight ? '夜晚晴朗' : '晴朗',
      cloudy: '多云',
      rain: '下雨',
      snow: '下雪',
      fog: '有雾',
      thunderstorm: '雷暴'
    };

    // 更新UI元素
    if (elements.location) {
      elements.location.textContent = this.currentLocation?.name || '未知位置';
    }

    if (elements.temperature) {
      elements.temperature.textContent = `${Math.round(weather.env?.temperature || 0)}°`;
    }

    if (elements.description) {
      elements.description.textContent = weatherDescriptions[weather.weather?.code] || 
        weather.weather?.description || '未知天气';
    }

    if (elements.icon) {
      const weatherCode = weather.weather?.code || 'clear';
      const isNight = weather.env?.isNight || false;
      elements.icon.innerHTML = this.getSVGIcon(weatherCode, isNight);
    }

    // 更新体感温度
    if (elements.feelsLike) {
      elements.feelsLike.textContent = `${Math.round(weather.env?.feelsLike || weather.env?.temperature || 0)}°`;
    }

    // 更新湿度
    if (elements.humidity) {
      elements.humidity.textContent = `${weather.weather?.humidity || '--'}%`;
    }

    // 更新风速
    if (elements.windSpeed) {
      const windKmh = Math.round((weather.weather?.windSpeedMps || 0) * 3.6);
      elements.windSpeed.textContent = `${windKmh} km/h`;
    }

    if (elements.visibility) {
      elements.visibility.textContent = `${weather.weather?.visibilityKm || '--'} km`;
    }

    if (elements.pressure) {
      elements.pressure.textContent = `${weather.weather?.pressure || '--'} hPa`;
    }

    if (elements.uvIndex) {
      elements.uvIndex.textContent = weather.weather?.uvIndex || '--';
    }
  }

  updateLocationDisplay(location) {
    const locationElement = document.getElementById('location-name');
    const cardLocationElement = document.getElementById('card-location-name');
    if (locationElement) {
      locationElement.textContent = location.name || '未知位置';
    }
    if (cardLocationElement) {
      cardLocationElement.textContent = location.name || '未知位置';
    }
  }

  async updateWeatherTheme(weather) {
    try {
      // 优先直接从 storage 读取统一主题快照（由背景集中写入）
      if (chrome?.storage?.local?.get) {
        const stored = await chrome.storage.local.get(['currentThemeData']);
        if (stored?.currentThemeData) {
          this.applyThemeData(stored.currentThemeData);
          return;
        }
      }
      // 兜底：向背景请求一次
      const themeResponse = await this.sendMessageWithRetry({ type: 'theme.getCurrent' }, 3, 150);
      if (themeResponse?.success && themeResponse?.data) {
        this.applyThemeData(themeResponse.data);
      }
    } catch (error) {
      console.warn('Failed to apply theme:', error);
    }
  }

  // 应用从背景服务获取的主题数据
  applyThemeData(themeData) {
    if (!themeData?.newtab) return;
    
    const theme = themeData.newtab;
    const root = document.documentElement;
    
    // 应用CSS自定义属性
    root.style.setProperty('--theme-primary', theme.primary || theme.gradient);
    root.style.setProperty('--theme-secondary', theme.secondary || theme.gradient);
    root.style.setProperty('--theme-accent', theme.accent || theme.gradient);
    root.style.setProperty('--theme-gradient', theme.gradient);
    root.style.setProperty('--theme-text', theme.text);

    // 主题已就绪，开启过渡，避免首次加载闪烁
    document.body.classList.add('theme-ready');
  }

  showErrorState() {
    const elements = {
      location: document.getElementById('location-name'),
      temperature: document.getElementById('current-temp'),
      description: document.getElementById('weather-desc'),
      icon: document.getElementById('weather-icon')
    };

    if (elements.location) elements.location.textContent = '位置获取失败';
    if (elements.temperature) elements.temperature.textContent = '--°';
    if (elements.description) elements.description.textContent = '天气数据获取失败';
    if (elements.icon) elements.icon.innerHTML = this.getSVGIcon('cloudy', false);
  }

  // 使用统一图标库 - 通知系统
  getNotificationSVG(type) {
    if (window.AeScapeIcons) {
      return window.AeScapeIcons.getNotificationIcon(type, 16);
    }
    // 备用方案
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>`;
  }

  // 通知系统
  showNotification(type, message) {
    const notification = document.getElementById('notification');
    const icon = notification?.querySelector('.notification-icon');
    const text = notification?.querySelector('.notification-text');

    if (!notification || !icon || !text) return;
    
    icon.innerHTML = this.getNotificationSVG(type);
    text.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => notification.classList.remove('show'), 3000);
  }

  // 设置面板
  toggleSettings() {
    document.getElementById('settings-panel')?.classList.toggle('active');
  }

  toggleLocationModal() {
    document.getElementById('location-modal')?.classList.toggle('active');
  }

  // 刷新天气
  async refreshWeather() {
    const refreshBtn = document.getElementById('refresh-btn');
    
    if (refreshBtn) {
      refreshBtn.style.opacity = '0.6';
      refreshBtn.style.pointerEvents = 'none';
    }

    try {
      if (!this.isApiConfigured) {
        this.showNotification('warning', '请先配置API Key');
        return;
      }

      const response = await this.sendMessageWithRetry({ type: 'weather.forceUpdate' }, 4, 200);

      if (response?.success && response?.data) {
        this.weatherData = response.data;
        this.updateWeatherUI(response.data);
        await this.updateWeatherTheme(response.data);
        this.showNotification('success', '天气数据已更新');
      } else {
        this.showNotification('error', '刷新失败，请重试');
      }
    } catch (error) {
      console.error('Failed to refresh weather:', error);
      this.showNotification('error', '刷新失败，请检查网络连接');
    } finally {
      if (refreshBtn) {
        refreshBtn.style.opacity = '1';
        refreshBtn.style.pointerEvents = 'auto';
      }
    }
  }

  // API Key 管理
  async saveApiKey() {
    const input = document.getElementById('api-key-input');
    const apiKey = input?.value.trim();

    if (!apiKey) {
      this.showNotification('error', '请输入有效的API Key');
      return;
    }

    try {
      const response = await this.sendMessageWithRetry({
        type: 'api.setKey',
        apiKey: apiKey
      }, 3, 200);

      if (response?.success) {
        this.isApiConfigured = true;
        input.value = '';
        this.showNotification('success', 'API Key保存成功');
        
        setTimeout(() => {
          this.loadWeatherData();
        }, 1000);
      } else {
        this.showNotification('error', response?.error || 'API Key验证失败');
      }
    } catch (error) {
      console.error('Failed to save API key:', error);
      this.showNotification('error', '保存失败，请重试');
    }
  }

  async testApiKey() {
    const input = document.getElementById('api-key-input');
    const apiKey = input?.value.trim();

    if (!apiKey) {
      this.showNotification('error', '请先输入API Key');
      return;
    }

    const testBtn = document.getElementById('test-api-key');
    if (testBtn) {
      testBtn.textContent = '测试中...';
      testBtn.disabled = true;
    }

    try {
      const response = await this.sendMessageWithRetry({
        type: 'api.testKey',
        apiKey: apiKey
      }, 3, 200);

      if (response?.success) {
        this.showNotification('success', `${response.message} 测试位置：${response.testData.location}，温度：${response.testData.temperature}°C`);
      } else {
        this.showNotification('error', response?.error || 'API Key测试失败');
      }
    } catch (error) {
      console.error('Failed to test API key:', error);
      this.showNotification('error', '测试失败，请检查网络连接');
    } finally {
      if (testBtn) {
        testBtn.textContent = '测试API Key';
        testBtn.disabled = false;
      }
    }
  }

  // 位置管理相关方法（简化版）
  async setLocationByCity() {
    const input = document.getElementById('city-input');
    const cityName = input?.value.trim();

    if (!cityName) {
      this.showNotification('error', '请输入城市名称');
      return;
    }

    try {
      const response = await this.sendMessageWithRetry({
        type: 'location.setByName',
        cityName: cityName
      }, 3, 200);

      if (response?.success) {
        this.currentLocation = response.location;
        input.value = '';
        this.showNotification('success', `位置已设置为 ${cityName}`);
        this.toggleSettings();
        
        setTimeout(() => {
          this.loadWeatherData();
        }, 1000);
      } else {
        this.showNotification('error', response?.error || '找不到该城市');
      }
    } catch (error) {
      console.error('Failed to set location:', error);
      this.showNotification('error', '设置位置失败');
    }
  }

  async getAutoLocation() {
    try {
      this.showNotification('info', '正在获取位置...');
      
      const position = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }
        
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, // 降低精度要求
          timeout: 15000, // 增加超时时间
          maximumAge: 600000 // 10分钟缓存
        });
      });

      const response = await this.sendMessageWithRetry({
        type: 'location.setCoordinates',
        lat: position.coords.latitude,
        lon: position.coords.longitude
      }, 3, 200);

      if (response?.success) {
        this.currentLocation = response.location;
        this.showNotification('success', '位置已自动获取');
        this.toggleSettings();
        
        setTimeout(() => {
          this.loadWeatherData();
        }, 1000);
      } else {
        this.showNotification('error', '位置设置失败');
      }
    } catch (error) {
      console.error('Failed to get auto location:', error);
      
      let errorMessage = '自动获取位置失败';
      if (error.code === 1) {
        errorMessage = '位置权限被拒绝，请在浏览器设置中允许位置访问';
      } else if (error.code === 2) {
        errorMessage = '无法获取位置信息，请检查网络连接';
      } else if (error.code === 3) {
        errorMessage = '获取位置超时，请重试';
      } else if (error.message === 'Geolocation not supported') {
        errorMessage = '浏览器不支持地理位置功能';
      }
      
      this.showNotification('error', errorMessage);
    }
  }

  async useCurrentLocation() {
    this.toggleLocationModal();
    await this.getAutoLocation();
  }

  // 城市搜索相关方法（简化版）
  async searchCities(query) {
    if (!query || query.length < 2) {
      this.clearCityResults();
      return;
    }

    try {
      const response = await this.sendMessageWithRetry({
        type: 'location.searchCities',
        query: query
      }, 3, 200);

      if (response?.success && response?.cities) {
        this.displayCityResults(response.cities);
      } else {
        this.clearCityResults();
      }
    } catch (error) {
      console.error('Failed to search cities:', error);
      this.clearCityResults();
    }
  }

  displayCityResults(cities) {
    const resultsContainer = document.getElementById('city-results');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = cities.map(city => `
      <div class="city-result-item" data-lat="${city.lat}" data-lon="${city.lon}" data-name="${city.name}">
        <div class="city-name">${city.name}</div>
        <div class="city-country">${city.country} ${city.state || ''}</div>
      </div>
    `).join('');

    resultsContainer.querySelectorAll('.city-result-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectCity({
          name: item.dataset.name,
          lat: parseFloat(item.dataset.lat),
          lon: parseFloat(item.dataset.lon)
        });
      });
    });
  }

  clearCityResults() {
    const resultsContainer = document.getElementById('city-results');
    if (resultsContainer) {
      resultsContainer.innerHTML = '';
    }
  }

  async selectCity(city) {
    try {
      const response = await this.sendMessageWithRetry({
        type: 'location.setCoordinates',
        lat: city.lat,
        lon: city.lon,
        name: city.name
      }, 3, 200);

      if (response?.success) {
        this.currentLocation = city;
        this.showNotification('success', `位置已设置为 ${city.name}`);
        this.toggleLocationModal();
        
        const citySearch = document.getElementById('city-search');
        if (citySearch) citySearch.value = '';
        this.clearCityResults();
        
        setTimeout(() => {
          this.loadWeatherData();
        }, 1000);
      } else {
        this.showNotification('error', '设置位置失败');
      }
    } catch (error) {
      console.error('Failed to select city:', error);
      this.showNotification('error', '设置位置失败');
    }
  }

  // 定时器
  startTimers() {
    this.refreshInterval = setInterval(() => {
      if (this.isApiConfigured) {
        this.loadWeatherData();
      }
    }, 30 * 60 * 1000);
    this.setupIntervalTrigger();
  }

  // 按设置的间隔触发视频
  setupIntervalTrigger() {
    try {
      if (this._intervalTriggerTimer) {
        clearInterval(this._intervalTriggerTimer);
        this._intervalTriggerTimer = null;
      }
      const m = this.videoSettings?.intervalMinutes;
      if (!m || m === 'off') return;
      const minutes = parseInt(m, 10);
      const ms = Math.max(1, minutes) * 60 * 1000;
      this._intervalTriggerTimer = setInterval(() => {
        try {
          if (!this.videoSettings.enabled) return;
          // 使用当前天气类型
          const wt = this.getWeatherType(this.weatherData);
          this.playVideoAnimation(wt);
        } catch (e) { console.warn('interval trigger error', e); }
      }, ms);
    } catch (e) { console.warn('setupIntervalTrigger error', e); }
  }

  // 视频模块初始化
  initializeVideoModule() {
    try {
      console.log('Initializing video module...');
      
      // 初始化视频管理器（先创建实例，再显式初始化容器与视频ID）
      this.videoManager = new VideoWeatherManager({
        debug: true,
        onStart: () => {
          console.log('Video animation started');
        },
        onEnd: () => {
          console.log('Video animation ended');
        }
      });
      // 重要：需要显式调用 init，并传入容器ID与视频ID（不含#）
      this.videoManager.init('video-container', 'intro-video');

      // 初始化抽卡系统
      this.cardSystem = new AnimationCardSystem();

      // 初始化触发管理器
      this.triggerManager = new WeatherTriggerManager();

      // 加载视频设置
      this.loadVideoSettings();

      console.log('Video module initialized successfully');
    } catch (error) {
      console.error('Failed to initialize video module:', error);
    }
  }

  // 加载视频设置
  async loadVideoSettings() {
    try {
      const result = await chrome.storage.local.get(['videoSettings']);
      if (result.videoSettings) {
        this.videoSettings = { ...this.videoSettings, ...result.videoSettings };
        this.updateVideoSettingsUI();
      }
    } catch (error) {
      console.error('Failed to load video settings:', error);
    }
  }

  // 保存视频设置
  async saveVideoSettings() {
    try {
      await chrome.storage.local.set({ videoSettings: this.videoSettings });
      console.log('Video settings saved');
    } catch (error) {
      console.error('Failed to save video settings:', error);
    }
  }

  // 更新视频设置UI
  updateVideoSettingsUI() {
    const videoAnimations = document.getElementById('video-animations');
    const autoTrigger = document.getElementById('auto-trigger');
    const weatherChange = document.getElementById('weather-change-trigger');
    const frequency = null;
    const frequencyValue = null;
    const intervalSel = document.getElementById('interval-trigger');

    if (videoAnimations) videoAnimations.checked = this.videoSettings.enabled;
    if (autoTrigger) autoTrigger.checked = this.videoSettings.autoTrigger;
    if (weatherChange) weatherChange.checked = this.videoSettings.weatherChangeTrigger;
    // 频率控制已移除
    if (intervalSel) intervalSel.value = String(this.videoSettings.intervalMinutes);
  }

  // 检查是否应该播放视频动画
  checkVideoAnimation(weatherData) {
    if (!this.videoSettings.enabled || !this.videoManager || !this.cardSystem || !this.triggerManager) {
      return;
    }

    try {
      const weatherType = this.getWeatherType(weatherData);
      
      // 检查天气变化触发
      const shouldTrigger = this.triggerManager.checkWeatherChange(weatherType, this.lastWeatherType);
      
      if (this.videoSettings.weatherChangeTrigger && shouldTrigger.shouldTrigger && this.videoSettings.autoTrigger) {
        console.log('Weather change detected, triggering video animation');
        this.playVideoAnimation(weatherType);
      }

      // 更新上次天气类型
      this.lastWeatherType = weatherType;
    } catch (error) {
      console.error('Error checking video animation:', error);
    }
  }

  // 获取天气类型
  getWeatherType(weatherData) {
    if (!weatherData || !weatherData.weather || !weatherData.weather[0]) {
      return 'clear';
    }

    const weatherCode = weatherData.weather[0].id;
    const weatherMain = weatherData.weather[0].main.toLowerCase();

    // 根据天气代码映射到视频类型
    if (weatherCode >= 200 && weatherCode < 300) return 'thunderstorm';
    if (weatherCode >= 300 && weatherCode < 400) return 'rain';
    if (weatherCode >= 500 && weatherCode < 600) return 'rain';
    if (weatherCode >= 600 && weatherCode < 700) return 'snow';
    if (weatherCode >= 700 && weatherCode < 800) return 'fog';
    if (weatherCode === 800) return 'clear';
    if (weatherCode >= 801 && weatherCode <= 804) return 'cloudy';

    return weatherMain;
  }

  /**
   * 直接播放当前天气的视频（随机选择）
   * 在加载天气数据后立即播放
   */
  async playCurrentWeatherVideo() {
    try {
      // 检查视频功能是否启用
      if (!this.videoSettings.enabled) {
        console.log('[AeScape] 视频功能已禁用，跳过播放');
        return;
      }

      // 检查视频管理器是否已初始化
      if (!this.videoManager || !this.cardSystem) {
        console.warn('[AeScape] 视频管理器未初始化，延迟播放');
        // 延迟1秒后重试
        setTimeout(() => {
          this.playCurrentWeatherVideo();
        }, 1000);
        return;
      }

      // 获取当前天气类型
      const weatherType = this.getWeatherType(this.weatherData);
      console.log(`[AeScape] 播放当前天气视频: ${weatherType}`);

      // 直接播放，不检查触发条件
      await this.playVideoAnimation(weatherType);
    } catch (error) {
      console.error('[AeScape] 播放当前天气视频失败:', error);
    }
  }

  // 播放视频动画
  async playVideoAnimation(weatherType) {
    try {
      console.log(`Playing video animation for weather type: ${weatherType}`);
      
      // 抽卡选择视频
      const selectedVideo = this.cardSystem.drawCard(weatherType);
      
      if (selectedVideo && selectedVideo.path) {
        // 播放视频
        await this.videoManager.playWeatherVideo(weatherType, {
          videoPath: selectedVideo.path,
          blendMode: selectedVideo.blendMode || 'lighten'
        });
      } else {
        console.warn(`[AeScape] 未找到天气类型 ${weatherType} 的视频`);
      }
    } catch (error) {
      console.error('Error playing video animation:', error);
    }
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  window.aeScape = new AeScapeNewTab();

  // 监听 storage 变更，主题变化时即时更新
  try {
    if (chrome?.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.currentThemeData?.newValue) {
          try {
            window.aeScape.applyThemeData(changes.currentThemeData.newValue);
          } catch (_) {}
        }
      });
    }
  } catch (_) {}
});