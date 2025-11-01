/**
 * 天景 AeScape - 后台服务
 * 基于OpenWeatherMap One Call API 3.0
 * 简洁高效的天气数据服务
 */

class WeatherBackgroundService {
  constructor() {
    this.apiKey = '';
    this.currentLocation = null;
    this.currentWeather = null;
    this.updateInterval = null;
    
    // Current Weather API (免费版)
    this.WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';
    this.GEO_API_URL = 'https://api.openweathermap.org/geo/1.0';
    
    this.init();
  }

  async init() {
    console.log('Weather Background Service initializing...');
    
    try {
      await this.loadStoredData();
      this.setupMessageHandlers();
      
      if (this.apiKey && this.currentLocation) {
        await this.updateWeatherData();
        this.setupPeriodicUpdates();
      } else {
        // 即使没有API，也写入一份基于默认数据的主题快照，避免前端不同步
        try { await this.writeThemeSnapshot(); } catch (_) {}
      }
      
      console.log('Weather Background Service initialized');
    } catch (error) {
      console.error('Background service initialization failed:', error);
      this.setupMessageHandlers();
    }
  }

  async loadStoredData() {
    try {
      const result = await chrome.storage.local.get(['apiKey', 'location', 'weather']);
      
      this.apiKey = result.apiKey || '';
      this.currentLocation = result.location || {
        lat: 31.2304,
        lon: 121.4737,
        name: '上海',
        country: 'CN'
      };
      this.currentWeather = result.weather || null;
      
      console.log('Loaded stored data:', {
        hasApiKey: !!this.apiKey,
        location: this.currentLocation?.name
      });
    } catch (error) {
      console.error('Failed to load stored data:', error);
      // 设置默认位置
      this.currentLocation = {
        lat: 31.2304,
        lon: 121.4737,
        name: '上海',
        country: 'CN'
      };
    }
  }

  setupMessageHandlers() {
    // 移除之前的监听器以避免重复
    if (chrome.runtime.onMessage.hasListeners()) {
      chrome.runtime.onMessage.removeListener(this.handleMessage);
    }
    
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // 轻量 ping：用于唤醒或健康检查
      if (message && message.type === 'ping') {
        sendResponse({ success: true, ts: Date.now() });
        return true;
      }
      // 使用箭头函数确保正确的this绑定
      this.handleMessageAsync(message, sender, sendResponse);
      return true; // 保持消息通道开放，支持异步响应
    });
  }

  async handleMessageAsync(message, sender, sendResponse) {
    try {
      const result = await this.handleMessage(message, sender);
      sendResponse(result);
    } catch (error) {
      console.error('Message handling error:', error);
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async handleMessage(message, sender) {
    switch (message.type) {
      case 'api.checkStatus':
        return { 
          success: true, 
          hasApiKey: !!this.apiKey 
        };

      case 'api.setKey':
        await this.setApiKey(message.apiKey);
        return { success: true, message: 'API Key保存成功' };

      case 'api.testKey':
        return await this.testApiKey(message.apiKey || this.apiKey);

      case 'weather.getCurrent':
        return { 
          success: true, 
          data: this.currentWeather 
        };

      case 'weather.forceUpdate':
        const weather = await this.updateWeatherData();
        return { 
          success: true, 
          data: weather 
        };

      case 'location.getCurrent':
        return { 
          success: true, 
          data: this.currentLocation 
        };

      case 'location.setByName':
        const locationByName = await this.setLocationByName(message.cityName);
        return { 
          success: true, 
          location: locationByName 
        };

      case 'location.setCoordinates':
        const locationByCoords = await this.setLocationByCoordinates(
          message.lat, 
          message.lon, 
          message.name
        );
        return { 
          success: true, 
          location: locationByCoords 
        };

      case 'location.searchCities':
        const cities = await this.searchCities(message.query);
        return { 
          success: true, 
          cities: cities 
        };

      default:
        return { 
          success: false, 
          error: 'Unknown message type' 
        };
    }
  }

  async testApiKey(apiKey) {
    if (!apiKey) {
      return { success: false, error: 'API Key未提供' };
    }

    try {
      console.log('Testing API Key using Current Weather API...');
      
      // 使用北京的坐标测试免费版API
      const testLat = 39.9042;
      const testLon = 116.4074;
      
      const url = `${this.WEATHER_API_URL}?lat=${testLat}&lon=${testLon}&appid=${apiKey}&units=metric&lang=zh_cn`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        
        if (response.status === 401) {
          return { success: false, error: 'API Key无效或未授权' };
        } else if (response.status === 429) {
          return { success: false, error: 'API调用次数超限，请稍后重试' };
        } else {
          return { success: false, error: `API测试失败: ${errorData.message}` };
        }
      }

      const data = await response.json();
      
      return { 
        success: true, 
        message: 'API Key验证成功！',
        testData: {
          location: data.name || '北京',
          temperature: Math.round(data.main.temp),
          description: data.weather[0].description
        }
      };

    } catch (error) {
      console.error('Failed to test API key:', error);
      return { success: false, error: '网络连接失败，请检查网络后重试' };
    }
  }

  async setApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('Invalid API key');
    }

    this.apiKey = apiKey.trim();
    await chrome.storage.local.set({ apiKey: this.apiKey });
    
    // 验证API Key并获取天气数据
    if (this.currentLocation) {
      await this.updateWeatherData();
      this.setupPeriodicUpdates();
    }
    
    console.log('API key updated and validated');
  }

  async updateWeatherData() {
    if (!this.apiKey || !this.currentLocation) {
      console.log('Missing API key or location');
      return null;
    }

    try {
      console.log('Updating weather data using Current Weather API for:', this.currentLocation.name);
      
      const weatherData = await this.fetchCurrentWeatherData(
        this.currentLocation.lat,
        this.currentLocation.lon
      );
      
      // 数据验证
      if (!weatherData || !weatherData.weather || !weatherData.weather[0]) {
        throw new Error('Invalid weather data format received from API');
      }
      
      if (!weatherData.main || typeof weatherData.main.temp !== 'number') {
        throw new Error('Invalid temperature data received from API');
      }
      
      this.currentWeather = {
        location: this.currentLocation,
        weather: {
          code: this.mapWeatherCode(weatherData.weather[0].id),
          description: weatherData.weather[0].description || 'Unknown weather',
          humidity: weatherData.main.humidity || 0,
          windSpeedMps: weatherData.wind?.speed || 0,
          windDirection: weatherData.wind?.deg || 0,
          visibilityKm: (weatherData.visibility || 10000) / 1000,
          pressure: weatherData.main.pressure || 1013,
          uvIndex: 0 // Current Weather API 不提供UV指数
        },
        env: {
          temperature: Math.round(weatherData.main.temp),
          feelsLike: Math.round(weatherData.main.feels_like || weatherData.main.temp),
          isNight: this.isNightTime(
            weatherData.dt || Date.now() / 1000, 
            weatherData.sys?.sunrise || 0, 
            weatherData.sys?.sunset || 0
          )
        },
        timestamp: Date.now()
      };

      // 存储数据时添加错误处理
      try {
        await chrome.storage.local.set({ 
          weather: this.currentWeather,
          lastUpdate: this.currentWeather.timestamp
        });
      } catch (storageError) {
        console.error('Failed to save weather data to storage:', storageError);
        // 继续执行，不抛出错误
      }

      // 同步写入统一主题快照，供四件套直接读取
      try { 
        await this.writeThemeSnapshot(); 
      } catch (e) { 
        console.warn('Write theme snapshot failed:', e); 
      }

      console.log('Weather data updated successfully using Current Weather API');
      return this.currentWeather;
      
    } catch (error) {
      console.error('Failed to update weather data:', error);
      
      // 根据错误类型提供更具体的错误信息
      if (error.message.includes('API key')) {
        throw new Error('API密钥无效或已过期');
      } else if (error.message.includes('network') || error.name === 'TypeError') {
        throw new Error('网络连接失败，请检查网络状态');
      } else if (error.message.includes('Invalid weather data')) {
        throw new Error('天气数据格式异常，请稍后重试');
      }
      
      throw error;
    }
  }

  async fetchCurrentWeatherData(lat, lon) {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    const url = new URL(this.WEATHER_API_URL);
    url.searchParams.set('lat', lat.toFixed(4));
    url.searchParams.set('lon', lon.toFixed(4));
    url.searchParams.set('appid', this.apiKey);
    url.searchParams.set('units', 'metric');
    url.searchParams.set('lang', 'zh_cn');

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`Current Weather API error: ${error.message || 'Unknown error'}`);
    }

    return await response.json();
  }

  mapWeatherCode(openWeatherCode) {
    if (openWeatherCode >= 200 && openWeatherCode < 300) return 'thunderstorm';
    if (openWeatherCode >= 300 && openWeatherCode < 600) return 'rain';
    if (openWeatherCode >= 600 && openWeatherCode < 700) return 'snow';
    if (openWeatherCode >= 700 && openWeatherCode < 800) return 'fog';
    if (openWeatherCode === 800) return 'clear';
    if (openWeatherCode > 800) return 'cloudy';
    return 'clear';
  }

  isNightTime(currentTime, sunrise, sunset) {
    // currentTime, sunrise, sunset 都是UNIX时间戳
    return currentTime < sunrise || currentTime > sunset;
  }

  async setLocationByName(cityName) {
    if (!cityName) {
      throw new Error('City name is required');
    }

    const cities = await this.geocodeLocation(cityName);
    if (cities.length === 0) {
      throw new Error('City not found');
    }

    const city = cities[0];
    return await this.setLocationByCoordinates(city.lat, city.lon, city.name);
  }

  async setLocationByCoordinates(lat, lon, name) {
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      throw new Error('Invalid coordinates');
    }

    this.currentLocation = {
      lat: lat,
      lon: lon,
      name: name || '未知位置',
      country: ''
    };

    await chrome.storage.local.set({ location: this.currentLocation });
    
    if (this.apiKey) {
      await this.updateWeatherData();
    } else {
      try { await this.writeThemeSnapshot(); } catch (_) {}
    }
    
    console.log('Location updated:', this.currentLocation);
    return this.currentLocation;
  }

  async geocodeLocation(cityName) {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    const url = new URL(`${this.GEO_API_URL}/direct`);
    url.searchParams.set('q', cityName);
    url.searchParams.set('limit', '5');
    url.searchParams.set('appid', this.apiKey);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const results = await response.json();
    
    return results.map(result => ({
      name: result.name,
      lat: result.lat,
      lon: result.lon,
      country: result.country,
      state: result.state || ''
    }));
  }

  async searchCities(query) {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      return await this.geocodeLocation(query);
    } catch (error) {
      console.error('Failed to search cities:', error);
      return [];
    }
  }

  setupPeriodicUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // 对齐到最近的15分钟刻度（00/15/30/45），首次触发后每30分钟检查
    const alignToQuarterHour = () => {
      const now = new Date();
      const minutes = now.getMinutes();
      const nextQuarter = Math.ceil(minutes / 15) * 15;
      const deltaMinutes = (nextQuarter === 60 ? 60 - minutes : nextQuarter - minutes);
      const ms = (deltaMinutes === 0 ? 1 : deltaMinutes) * 60 * 1000;
      setTimeout(async () => {
        await this.tickQuarterHour();
        // 之后每15分钟对齐一次主题写入
        setInterval(() => this.tickQuarterHour().catch(() => {}), 15 * 60 * 1000);
      }, ms);
    };

    alignToQuarterHour();

    console.log('Periodic weather updates enabled (aligned to quarter-hour)');
  }

  // 每到 00/15/30/45 触发：优先更新天气（若有API），并写主题快照
  async tickQuarterHour() {
    try {
      if (this.apiKey && this.currentLocation) {
        try {
          await this.updateWeatherData();
        } catch (e) {
          // 网络失败：指数退避，最多10分钟
          let backoff = 60 * 1000; // 1m
          for (let i = 0; i < 4; i++) {
            await new Promise(r => setTimeout(r, backoff));
            try {
              await this.updateWeatherData();
              break;
            } catch (_) {
              backoff = Math.min(backoff * 2, 10 * 60 * 1000);
            }
          }
        }
      }
    } finally {
      try { await this.writeThemeSnapshot(); } catch (_) {}
    }
  }
}

// 创建服务实例
const weatherService = new WeatherBackgroundService();

// 扩展安装处理
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('AeScape extension installed');
  } else if (details.reason === 'update') {
    console.log('AeScape extension updated');
  }
});

/**
 * 轻量级主题系统 - 用于Background Service
 * 不依赖DOM，只提供主题数据计算
 */
class BackgroundThemeSystem {
  constructor() {
    this.transitionDuration = 800;
    this.THEME_MAP = this.initThemeMap();
  }

  /**
   * 初始化主题映射表（从theme-system.js复制核心部分）
   */
  initThemeMap() {
    return {
      // 晴天系列
      'clear-dawn': {
        primary: 'rgba(255, 183, 77, 0.6)',
        secondary: 'rgba(255, 138, 101, 0.4)',
        accent: 'rgba(255, 204, 128, 0.3)',
        gradient: 'linear-gradient(135deg, rgba(255, 183, 77, 0.18) 0%, rgba(255, 138, 101, 0.12) 100%)',
        text: 'rgba(33, 33, 33, 0.9)'
      },
      'clear-morning': {
        primary: 'rgba(66, 165, 245, 0.5)',
        secondary: 'rgba(102, 187, 106, 0.4)',
        accent: 'rgba(38, 198, 218, 0.3)',
        gradient: 'linear-gradient(135deg, rgba(66, 165, 245, 0.2) 0%, rgba(102, 187, 106, 0.05) 100%)',
        text: 'rgba(33, 33, 33, 0.9)'
      },
      'clear-noon': {
        primary: 'rgba(255, 167, 38, 0.5)',
        secondary: 'rgba(66, 165, 245, 0.4)',
        accent: 'rgba(102, 187, 106, 0.3)',
        gradient: 'linear-gradient(135deg, rgba(255, 167, 38, 0.22) 0%, rgba(66, 165, 245, 0.05) 100%)',
        text: 'rgba(33, 33, 33, 0.9)'
      },
      'clear-afternoon': {
        primary: 'rgba(255, 138, 101, 0.5)',
        secondary: 'rgba(255, 171, 64, 0.4)',
        accent: 'rgba(255, 213, 79, 0.3)',
        gradient: 'linear-gradient(135deg, rgba(255, 138, 101, 0.16) 0%, rgba(255, 171, 64, 0.10) 100%)',
        text: 'rgba(33, 33, 33, 0.9)'
      },
      'clear-sunset': {
        primary: 'rgba(239, 108, 0, 0.5)',
        secondary: 'rgba(255, 61, 0, 0.4)',
        accent: 'rgba(255, 179, 0, 0.3)',
        gradient: 'linear-gradient(135deg, rgba(239, 108, 0, 0.15) 0%, rgba(255, 61, 0, 0.1) 100%)',
        text: 'rgba(33, 33, 33, 0.9)'
      },
      'clear-evening': {
        primary: 'rgba(103, 58, 183, 0.6)',
        secondary: 'rgba(156, 39, 176, 0.45)',
        accent: 'rgba(233, 30, 99, 0.35)',
        gradient: 'linear-gradient(135deg, rgba(103, 58, 183, 0.15) 0%, rgba(156, 39, 176, 0.1) 100%)',
        text: 'rgba(33, 33, 33, 0.9)'
      },
      'clear-night': {
        primary: 'rgb(31, 40, 91)',
        secondary: 'rgb(46, 54, 96)',
        accent: 'rgb(63, 73, 101)',
        gradient: 'linear-gradient(135deg, rgb(31, 40, 91) 0%, rgb(46, 54, 96) 100%)',
        text: 'rgba(255, 255, 255, 0.98)'
      },

      // 雷暴系列 - 深沉紫调（已修复字体颜色）
      'thunderstorm-dawn': {
        primary: 'rgba(74, 20, 140, 0.4)',
        secondary: 'rgba(106, 27, 154, 0.3)',
        accent: 'rgba(142, 36, 170, 0.25)',
        gradient: 'linear-gradient(135deg, rgba(74, 20, 140, 0.15) 0%, rgba(106, 27, 154, 0.1) 100%)',
        text: 'rgba(33, 33, 33, 0.9)'
      },
      'thunderstorm-morning': {
        primary: 'rgba(74, 20, 140, 0.4)',
        secondary: 'rgba(106, 27, 154, 0.3)',
        accent: 'rgba(142, 36, 170, 0.25)',
        gradient: 'linear-gradient(135deg, rgba(74, 20, 140, 0.15) 0%, rgba(106, 27, 154, 0.1) 100%)',
        text: 'rgba(33, 33, 33, 0.9)'
      },
      'thunderstorm-noon': {
        primary: 'rgba(55, 71, 79, 0.4)',
        secondary: 'rgba(74, 20, 140, 0.3)',
        accent: 'rgba(106, 27, 154, 0.25)',
        gradient: 'linear-gradient(135deg, rgba(55, 71, 79, 0.15) 0%, rgba(74, 20, 140, 0.1) 100%)',
        text: 'rgba(33, 33, 33, 0.9)'
      },
      'thunderstorm-afternoon': {
        primary: 'rgba(38, 50, 56, 0.4)',
        secondary: 'rgba(55, 71, 79, 0.3)',
        accent: 'rgba(74, 20, 140, 0.25)',
        gradient: 'linear-gradient(135deg, rgba(38, 50, 56, 0.15) 0%, rgba(55, 71, 79, 0.1) 100%)',
        text: 'rgba(33, 33, 33, 0.9)'
      },
      'thunderstorm-sunset': {
        primary: 'rgba(74, 20, 140, 0.4)',
        secondary: 'rgba(239, 108, 0, 0.2)',
        accent: 'rgba(255, 61, 0, 0.15)',
        gradient: 'linear-gradient(135deg, rgba(74, 20, 140, 0.15) 0%, rgba(239, 108, 0, 0.08) 100%)',
        text: 'rgba(33, 33, 33, 0.9)'
      },
      'thunderstorm-evening': {
        primary: 'rgba(26, 35, 126, 0.4)',
        secondary: 'rgba(38, 50, 56, 0.3)',
        accent: 'rgba(55, 71, 79, 0.25)',
        gradient: 'linear-gradient(135deg, rgba(26, 35, 126, 0.15) 0%, rgba(38, 50, 56, 0.1) 100%)',
        text: 'rgba(33, 33, 33, 0.9)'
      },
      'thunderstorm-night': {
        primary: 'rgb(13, 20, 33)',
        secondary: 'rgb(26, 35, 126)',
        accent: 'rgb(38, 50, 56)',
        gradient: 'linear-gradient(135deg, rgb(7, 10, 17) 0%, rgb(13, 18, 63) 100%)',
        text: 'rgba(255, 255, 255, 0.98)'
      },

      // 多云系列
      'cloudy-dawn': {
        primary: 'rgba(144, 164, 174, 0.4)',
        secondary: 'rgba(176, 190, 197, 0.3)',
        accent: 'rgba(207, 216, 220, 0.25)',
        gradient: 'linear-gradient(135deg, rgba(144, 164, 174, 0.15) 0%, rgba(176, 190, 197, 0.08) 100%)',
        text: 'rgba(33, 33, 33, 0.9)'
      },
      'cloudy-morning': {
        primary: 'rgba(144, 164, 174, 0.4)',
        secondary: 'rgba(176, 190, 197, 0.3)',
        accent: 'rgba(207, 216, 220, 0.25)',
        gradient: 'linear-gradient(135deg, rgba(144, 164, 174, 0.15) 0%, rgba(176, 190, 197, 0.08) 100%)',
        text: 'rgba(33, 33, 33, 0.9)'
      },
      'cloudy-noon': {
        primary: 'rgba(144, 164, 174, 0.4)',
        secondary: 'rgba(176, 190, 197, 0.3)',
        accent: 'rgba(207, 216, 220, 0.25)',
        gradient: 'linear-gradient(135deg, rgba(144, 164, 174, 0.15) 0%, rgba(176, 190, 197, 0.08) 100%)',
        text: 'rgba(33, 33, 33, 0.9)'
      },
      'cloudy-afternoon': {
        primary: 'rgba(144, 164, 174, 0.4)',
        secondary: 'rgba(176, 190, 197, 0.3)',
        accent: 'rgba(207, 216, 220, 0.25)',
        gradient: 'linear-gradient(135deg, rgba(144, 164, 174, 0.15) 0%, rgba(176, 190, 197, 0.08) 100%)',
        text: 'rgba(33, 33, 33, 0.9)'
      },
      'cloudy-sunset': {
        primary: 'rgba(144, 164, 174, 0.4)',
        secondary: 'rgba(255, 138, 101, 0.2)',
        accent: 'rgba(255, 171, 64, 0.15)',
        gradient: 'linear-gradient(135deg, rgba(144, 164, 174, 0.15) 0%, rgba(255, 138, 101, 0.08) 100%)',
        text: 'rgba(33, 33, 33, 0.9)'
      },
      'cloudy-evening': {
        primary: 'rgba(69, 90, 100, 0.4)',
        secondary: 'rgba(84, 110, 122, 0.3)',
        accent: 'rgba(102, 120, 138, 0.25)',
        gradient: 'linear-gradient(135deg, rgba(69, 90, 100, 0.15) 0%, rgba(84, 110, 122, 0.1) 100%)',
        text: 'rgba(33, 33, 33, 0.9)'
      },
      'cloudy-night': {
        primary: 'rgb(55, 71, 79)',
        secondary: 'rgb(69, 90, 100)',
        accent: 'rgb(84, 110, 122)',
        gradient: 'linear-gradient(135deg, rgb(45, 58, 65) 0%, rgb(55, 71, 79) 100%)',
        text: 'rgba(255, 255, 255, 0.95)'
      },

      // 雨天系列
      'rain-dawn': {
        primary: 'rgba(55, 71, 79, 0.4)',
        secondary: 'rgba(69, 90, 100, 0.3)',
        accent: 'rgba(84, 110, 122, 0.25)',
        gradient: 'linear-gradient(135deg, rgba(55, 71, 79, 0.15) 0%, rgba(69, 90, 100, 0.1) 100%)',
        text: 'rgba(33, 33, 33, 0.9)'
      },
      'rain-morning': {
        primary: 'rgba(55, 71, 79, 0.4)',
        secondary: 'rgba(69, 90, 100, 0.3)',
        accent: 'rgba(84, 110, 122, 0.25)',
        gradient: 'linear-gradient(135deg, rgba(55, 71, 79, 0.15) 0%, rgba(69, 90, 100, 0.1) 100%)',
        text: 'rgba(33, 33, 33, 0.9)'
      },
      'rain-noon': {
        primary: 'rgba(55, 71, 79, 0.4)',
        secondary: 'rgba(69, 90, 100, 0.3)',
        accent: 'rgba(84, 110, 122, 0.25)',
        gradient: 'linear-gradient(135deg, rgba(55, 71, 79, 0.15) 0%, rgba(69, 90, 100, 0.1) 100%)',
        text: 'rgba(33, 33, 33, 0.9)'
      },
      'rain-afternoon': {
        primary: 'rgba(55, 71, 79, 0.4)',
        secondary: 'rgba(69, 90, 100, 0.3)',
        accent: 'rgba(84, 110, 122, 0.25)',
        gradient: 'linear-gradient(135deg, rgba(55, 71, 79, 0.15) 0%, rgba(69, 90, 100, 0.1) 100%)',
        text: 'rgba(33, 33, 33, 0.9)'
      },
      'rain-sunset': {
        primary: 'rgba(55, 71, 79, 0.4)',
        secondary: 'rgba(69, 90, 100, 0.3)',
        accent: 'rgba(84, 110, 122, 0.25)',
        gradient: 'linear-gradient(135deg, rgba(55, 71, 79, 0.15) 0%, rgba(69, 90, 100, 0.1) 100%)',
        text: 'rgba(33, 33, 33, 0.9)'
      },
      'rain-evening': {
        primary: 'rgba(38, 50, 56, 0.4)',
        secondary: 'rgba(55, 71, 79, 0.3)',
        accent: 'rgba(69, 90, 100, 0.25)',
        gradient: 'linear-gradient(135deg, rgba(38, 50, 56, 0.15) 0%, rgba(55, 71, 79, 0.1) 100%)',
        text: 'rgba(33, 33, 33, 0.9)'
      },
      'rain-night': {
        primary: 'rgb(38, 50, 56)',
        secondary: 'rgb(55, 71, 79)',
        accent: 'rgb(69, 90, 100)',
        gradient: 'linear-gradient(135deg, rgb(32, 41, 46) 0%, rgb(38, 50, 56) 100%)',
        text: 'rgba(255, 255, 255, 0.95)'
      }

      // 注：已添加主要天气类型的主题
    };
  }

  /**
   * 获取时间段
   */
  getTimeSlot(hour, isNight = null, sunTimes = null) {
    if (sunTimes) {
      const sunrise = this.parseTime(sunTimes.sunrise);
      const sunset = this.parseTime(sunTimes.sunset);
      
      if (hour >= sunrise - 1 && hour < sunrise + 1) return 'dawn';
      if (hour >= 11 && hour < 14) return 'noon';
      if (hour >= sunrise + 1 && hour < 11) return 'morning';
      if (hour >= 14 && hour < sunset - 1) return 'afternoon';
      if (hour >= sunset - 1 && hour <= sunset + 1) return 'sunset';
      if (hour > sunset + 1 && hour < 22) return 'evening';
      return 'night';
    }
    
    // 关键修正：如果明确传入 isNight=true，直接判定为夜间
    if (isNight === true) return 'night';
    if (isNight === null) {
      isNight = hour < 6 || hour > 19;
    }
    if (isNight) return 'night';
    
    if (hour >= 5 && hour < 7) return 'dawn';
    if (hour >= 7 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 14) return 'noon';
    if (hour >= 14 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 19) return 'sunset';
    if (hour >= 19 && hour < 22) return 'evening';
    return 'night';
  }

  parseTime(timeString) {
    const [hours] = timeString.split(':');
    return parseInt(hours);
  }

  /**
   * 获取主题数据
   */
  getTheme(weatherCode, hour, isNight = null, sunTimes = null) {
    const timeSlot = this.getTimeSlot(hour, isNight, sunTimes);
    const themeKey = `${weatherCode}-${timeSlot}`;
    
    return this.THEME_MAP[themeKey] || this.THEME_MAP['clear-noon'];
  }

  /**
   * 计算完整主题数据
   */
  calculateThemeData(weatherData, location) {
    if (!weatherData) return null;
    
    const hour = new Date().getHours();
    const weatherCode = weatherData.weather?.code || 'clear';
    const isNight = weatherData.env?.isNight || false;
    
    // 获取日出日落时间
    let sunTimes = null;
    if (location?.lat && location?.lng) {
      // 简化的日出日落计算（实际项目中可能需要更精确的算法）
      const sunrise = 6; // 简化为固定时间
      const sunset = 18;
      sunTimes = { sunrise: `${sunrise}:00`, sunset: `${sunset}:00` };
    }
    
    const theme = this.getTheme(weatherCode, hour, isNight, sunTimes);
    const timeSlot = this.getTimeSlot(hour, isNight, sunTimes);
    
    return {
      weatherCode,
      hour,
      isNight,
      timeSlot,
      sunTimes,
      // 统一所有组件使用相同的主题数据结构
      floating: {
        primary: theme.primary,
        secondary: theme.secondary,
        accent: theme.accent,
        gradient: theme.gradient,
        text: theme.text
      },
      popup: {
        primary: theme.primary,
        secondary: theme.secondary,
        accent: theme.accent,
        gradient: theme.gradient,
        text: theme.text
      },
      newtab: {
        primary: theme.primary,
        secondary: theme.secondary,
        accent: theme.accent,
        gradient: theme.gradient,
        text: theme.text
      },
      panel: {
        primary: theme.primary,
        secondary: theme.secondary,
        accent: theme.accent,
        gradient: theme.gradient,
        text: theme.text
      }
    };
  }
}

// 添加主题系统到背景服务
weatherService.themeSystem = new BackgroundThemeSystem();

// 扩展消息处理器，添加主题数据请求
const originalSetupMessageHandlers = weatherService.setupMessageHandlers.bind(weatherService);
weatherService.setupMessageHandlers = function() {
  originalSetupMessageHandlers();
  
  // 添加主题数据请求处理
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'theme.getCurrent') {
      const themeData = this.themeSystem.calculateThemeData(this.currentWeather, this.currentLocation);
      sendResponse({ 
        success: true, 
        data: themeData 
      });
      return true;
    }
  });
};

// 添加写主题快照的工具方法
WeatherBackgroundService.prototype.writeThemeSnapshot = async function() {
  try {
    const themeData = this.themeSystem.calculateThemeData(this.currentWeather, this.currentLocation);
    if (themeData) {
      await chrome.storage.local.set({ currentThemeData: themeData });
    }
  } catch (e) {
    console.warn('Failed to write theme snapshot:', e);
  }
};

// 导出用于调试
self.weatherService = weatherService;