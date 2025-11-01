/**
 * 天景 AeScape - 统一主题映射系统
 * 天气 结合 时间 = 一致的视觉体验
 */

class UnifiedThemeSystem {
  constructor() {
    this.currentTheme = null;
    this.transitionDuration = 800;
  }

  /**
   * 根据天气和时间获取主题
   * @param {string} weatherCode - 天气代码 (clear, cloudy, rain, snow, fog, thunderstorm)
   * @param {number} hour - 小时 (0-23)
   * @param {boolean} isNight - 是否为夜晚
   * @param {object} sunTimes - 日出日落时间 {sunrise: "06:30", sunset: "18:45"}
   */
  getTheme(weatherCode = 'clear', hour = 12, isNight = false, sunTimes = null) {
    const timeSlot = this.getTimeSlot(hour, isNight, sunTimes);
    const themeKey = `${weatherCode}-${timeSlot}`;
    
    // 修复：原先使用了不存在的 'clear-day' 作为兜底键，改为更稳妥的 'clear-noon'
    return this.THEME_MAP[themeKey] || this.THEME_MAP['clear-noon'];
  }

  /**
   * 时间段分类 - 结合日出日落时间
   */
  getTimeSlot(hour, isNight, sunTimes = null) {
    if (isNight) return 'night';
    
    // 如果有日出日落数据，使用实际时间
    if (sunTimes) {
      const sunrise = this.parseTimeToHour(sunTimes.sunrise);
      const sunset = this.parseTimeToHour(sunTimes.sunset);
      
      if (hour < sunrise - 1) return 'night';
      if (hour >= sunrise - 1 && hour < sunrise + 1) return 'dawn';
      if (hour >= sunrise + 1 && hour < 11) return 'morning';
      if (hour >= 11 && hour < 14) return 'noon';
      if (hour >= 14 && hour < sunset - 1) return 'afternoon';
      if (hour >= sunset - 1 && hour < sunset + 1) return 'sunset';
      if (hour >= sunset + 1 && hour < 22) return 'evening';
      return 'night';
    }
    
    // 默认时间段分类（无日出日落数据时）
    if (hour >= 5 && hour < 7) return 'dawn';
    if (hour >= 7 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 14) return 'noon';
    if (hour >= 14 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 19) return 'sunset';
    if (hour >= 19 && hour < 22) return 'evening';
    return 'night';
  }
  
  /**
   * 解析时间字符串为小时数
   */
  parseTimeToHour(timeStr) {
    if (!timeStr) return 12;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + (minutes / 60);
  }
  
  /**
   * 获取日出日落时间
   * @param {number} lat - 纬度
   * @param {number} lng - 经度
   */
  async getSunTimes(lat, lng) {
    try {
      const response = await fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&formatted=0`);
      const data = await response.json();
      
      if (data.status === 'OK') {
        const sunrise = new Date(data.results.sunrise);
        const sunset = new Date(data.results.sunset);
        
        return {
          sunrise: sunrise.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          sunset: sunset.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        };
      }
    } catch (error) {
      console.warn('Failed to fetch sun times:', error);
    }
    
    return null;
  }
  
  /**
   * 智能判断是否为夜晚（结合日出日落时间）
   */
  isNightTime(hour, sunTimes = null) {
    if (sunTimes) {
      const sunrise = this.parseTimeToHour(sunTimes.sunrise);
      const sunset = this.parseTimeToHour(sunTimes.sunset);
      return hour < sunrise || hour > sunset;
    }
    
    // 默认判断（无日出日落数据时）
    return hour < 6 || hour > 19;
  }

  /**
   * 主题配色映射表 - 降低饱和度版本
   */
  THEME_MAP = {
    // 晴天系列 - 温暖但不刺眼
    'clear-dawn': {
      primary: 'rgba(255, 183, 77, 0.6)',    // 柔和金色
      secondary: 'rgba(255, 138, 101, 0.4)',  // 淡橙色
      accent: 'rgba(255, 204, 128, 0.3)',     // 浅黄色
      gradient: 'linear-gradient(135deg, rgba(255, 183, 77, 0.25) 0%, rgba(255, 138, 101, 0.05) 100%)',
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
      gradient: 'linear-gradient(135deg, rgba(255, 138, 101, 0.2) 0%, rgba(255, 171, 64, 0.05) 100%)',
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
      gradient: 'linear-gradient(135deg, rgba(103, 58, 183, 0.18) 0%, rgba(156, 39, 176, 0.14) 100%)',
      text: 'rgba(33, 33, 33, 0.9)'
    },
    'clear-night': {
      primary: 'rgb(63, 81, 181)',
      secondary: 'rgb(92, 107, 192)',
      accent: 'rgb(149, 117, 205)',
      gradient: 'linear-gradient(135deg, rgb(31, 40, 91) 0%, rgb(46, 54, 96) 100%)',
      text: 'rgba(255, 255, 255, 0.98)'
    },

    // 多云系列 - 柔和灰蓝调
    'cloudy-dawn': {
      primary: 'rgba(144, 164, 174, 0.4)',
      secondary: 'rgba(176, 190, 197, 0.3)',
      accent: 'rgba(207, 216, 220, 0.25)',
      gradient: 'linear-gradient(135deg, rgba(144, 164, 174, 0.1) 0%, rgba(176, 190, 197, 0.06) 100%)',
      text: 'rgba(33, 33, 33, 0.85)'
    },
    'cloudy-morning': {
      primary: 'rgba(96, 125, 139, 0.4)',
      secondary: 'rgba(120, 144, 156, 0.3)',
      accent: 'rgba(144, 164, 174, 0.25)',
      gradient: 'linear-gradient(135deg, rgba(96, 125, 139, 0.1) 0%, rgba(120, 144, 156, 0.06) 100%)',
      text: 'rgba(33, 33, 33, 0.85)'
    },
    'cloudy-noon': {
      primary: 'rgba(84, 110, 122, 0.4)',
      secondary: 'rgba(96, 125, 139, 0.3)',
      accent: 'rgba(120, 144, 156, 0.25)',
      gradient: 'linear-gradient(135deg, rgba(84, 110, 122, 0.1) 0%, rgba(96, 125, 139, 0.06) 100%)',
      text: 'rgba(33, 33, 33, 0.85)'
    },
    'cloudy-afternoon': {
      primary: 'rgba(69, 90, 100, 0.4)',
      secondary: 'rgba(84, 110, 122, 0.3)',
      accent: 'rgba(96, 125, 139, 0.25)',
      gradient: 'linear-gradient(135deg, rgba(69, 90, 100, 0.1) 0%, rgba(84, 110, 122, 0.06) 100%)',
      text: 'rgba(33, 33, 33, 0.85)'
    },
    'cloudy-sunset': {
      primary: 'rgba(84, 110, 122, 0.4)',
      secondary: 'rgba(255, 138, 101, 0.2)',
      accent: 'rgba(255, 167, 38, 0.15)',
      gradient: 'linear-gradient(135deg, rgba(84, 110, 122, 0.1) 0%, rgba(255, 138, 101, 0.06) 100%)',
      text: 'rgba(33, 33, 33, 0.9)'
    },
    'cloudy-evening': {
      primary: 'rgba(55, 71, 79, 0.6)',
      secondary: 'rgba(69, 90, 100, 0.45)',
      accent: 'rgba(84, 110, 122, 0.35)',
      gradient: 'linear-gradient(135deg, rgba(55, 71, 79, 0.16) 0%, rgba(69, 90, 100, 0.12) 100%)',
      text: 'rgba(33, 33, 33, 0.9)'
    },
    'cloudy-night': {
      primary: 'rgb(38, 50, 56)',
      secondary: 'rgb(55, 71, 79)',
      accent: 'rgb(69, 90, 100)',
      gradient: 'linear-gradient(135deg, rgb(19, 25, 28) 0%, rgb(28, 36, 40) 100%)',
      text: 'rgba(255, 255, 255, 0.98)'
    },

    // 雨天系列 - 深邃蓝紫调
    'rain-dawn': {
      primary: 'rgba(93, 78, 117, 0.4)',
      secondary: 'rgba(121, 134, 203, 0.3)',
      accent: 'rgba(159, 168, 218, 0.25)',
      gradient: 'linear-gradient(135deg, rgba(93, 78, 117, 0.12) 0%, rgba(121, 134, 203, 0.08) 100%)',
      text: 'rgba(33, 33, 33, 0.85)'
    },
    'rain-morning': {
      primary: 'rgba(63, 81, 181, 0.4)',
      secondary: 'rgba(92, 107, 192, 0.3)',
      accent: 'rgba(121, 134, 203, 0.25)',
      gradient: 'linear-gradient(135deg, rgba(63, 81, 181, 0.12) 0%, rgba(92, 107, 192, 0.08) 100%)',
      text: 'rgba(33, 33, 33, 0.85)'
    },
    'rain-noon': {
      primary: 'rgba(48, 63, 159, 0.4)',
      secondary: 'rgba(63, 81, 181, 0.3)',
      accent: 'rgba(92, 107, 192, 0.25)',
      gradient: 'linear-gradient(135deg, rgba(48, 63, 159, 0.12) 0%, rgba(63, 81, 181, 0.08) 100%)',
      text: 'rgba(33, 33, 33, 0.85)'
    },
    'rain-afternoon': {
      primary: 'rgba(26, 35, 126, 0.4)',
      secondary: 'rgba(40, 53, 147, 0.3)',
      accent: 'rgba(48, 63, 159, 0.25)',
      gradient: 'linear-gradient(135deg, rgba(26, 35, 126, 0.12) 0%, rgba(40, 53, 147, 0.08) 100%)',
      text: 'rgba(33, 33, 33, 0.85)'
    },
    'rain-sunset': {
      primary: 'rgba(40, 53, 147, 0.4)',
      secondary: 'rgba(103, 58, 183, 0.3)',
      accent: 'rgba(156, 39, 176, 0.25)',
      gradient: 'linear-gradient(135deg, rgba(40, 53, 147, 0.12) 0%, rgba(103, 58, 183, 0.08) 100%)',
      text: 'rgba(33, 33, 33, 0.9)'
    },
    'rain-evening': {
      primary: 'rgba(26, 35, 126, 0.6)',
      secondary: 'rgba(40, 53, 147, 0.45)',
      accent: 'rgba(48, 63, 159, 0.35)',
      gradient: 'linear-gradient(135deg, rgba(26, 35, 126, 0.18) 0%, rgba(40, 53, 147, 0.14) 100%)',
      text: 'rgba(33, 33, 33, 0.9)'
    },
    'rain-night': {
      primary: 'rgb(13, 20, 33)',
      secondary: 'rgb(26, 35, 126)',
      accent: 'rgb(40, 53, 147)',
      gradient: 'linear-gradient(135deg, rgb(7, 10, 17) 0%, rgb(13, 18, 63) 100%)',
      text: 'rgba(255, 255, 255, 0.98)'
    },

    // 雪天系列 - 纯净蓝白调
    'snow-dawn': {
      primary: 'rgba(225, 245, 254, 0.3)',
      secondary: 'rgba(179, 229, 252, 0.25)',
      accent: 'rgba(129, 212, 250, 0.2)',
      gradient: 'linear-gradient(135deg, rgba(225, 245, 254, 0.08) 0%, rgba(179, 229, 252, 0.06) 100%)',
      text: 'rgba(33, 33, 33, 0.8)'
    },
    'snow-morning': {
      primary: 'rgba(179, 229, 252, 0.3)',
      secondary: 'rgba(129, 212, 250, 0.25)',
      accent: 'rgba(79, 195, 247, 0.2)',
      gradient: 'linear-gradient(135deg, rgba(179, 229, 252, 0.08) 0%, rgba(129, 212, 250, 0.06) 100%)',
      text: 'rgba(33, 33, 33, 0.8)'
    },
    'snow-noon': {
      primary: 'rgba(129, 212, 250, 0.3)',
      secondary: 'rgba(79, 195, 247, 0.25)',
      accent: 'rgba(41, 182, 246, 0.2)',
      gradient: 'linear-gradient(135deg, rgba(129, 212, 250, 0.08) 0%, rgba(79, 195, 247, 0.06) 100%)',
      text: 'rgba(33, 33, 33, 0.8)'
    },
    'snow-afternoon': {
      primary: 'rgba(79, 195, 247, 0.3)',
      secondary: 'rgba(41, 182, 246, 0.25)',
      accent: 'rgba(3, 169, 244, 0.2)',
      gradient: 'linear-gradient(135deg, rgba(79, 195, 247, 0.08) 0%, rgba(41, 182, 246, 0.06) 100%)',
      text: 'rgba(33, 33, 33, 0.8)'
    },
    'snow-sunset': {
      primary: 'rgba(41, 182, 246, 0.3)',
      secondary: 'rgba(255, 138, 101, 0.15)',
      accent: 'rgba(255, 183, 77, 0.1)',
      gradient: 'linear-gradient(135deg, rgba(41, 182, 246, 0.08) 0%, rgba(255, 138, 101, 0.04) 100%)',
      text: 'rgba(33, 33, 33, 0.9)'
    },
    'snow-evening': {
      primary: 'rgba(3, 169, 244, 0.3)',
      secondary: 'rgba(2, 119, 189, 0.25)',
      accent: 'rgba(2, 136, 209, 0.2)',
      gradient: 'linear-gradient(135deg, rgba(3, 169, 244, 0.08) 0%, rgba(2, 119, 189, 0.06) 100%)',
      text: 'rgba(33, 33, 33, 0.9)'
    },
    'snow-night': {
      primary: 'rgb(2, 119, 189)',
      secondary: 'rgb(2, 136, 209)',
      accent: 'rgb(3, 155, 229)',
      gradient: 'linear-gradient(135deg, rgb(1, 60, 95) 0%, rgb(1, 68, 105) 100%)',
      text: 'rgba(255, 255, 255, 0.98)'
    },

    // 雾天系列 - 柔和灰调
    'fog-dawn': {
      primary: 'rgba(245, 245, 245, 0.2)',
      secondary: 'rgba(224, 224, 224, 0.15)',
      accent: 'rgba(189, 189, 189, 0.1)',
      gradient: 'linear-gradient(135deg, rgba(245, 245, 245, 0.06) 0%, rgba(224, 224, 224, 0.04) 100%)',
      text: 'rgba(33, 33, 33, 0.9)'
    },
    'fog-morning': {
      primary: 'rgba(224, 224, 224, 0.2)',
      secondary: 'rgba(189, 189, 189, 0.15)',
      accent: 'rgba(158, 158, 158, 0.1)',
      gradient: 'linear-gradient(135deg, rgba(224, 224, 224, 0.06) 0%, rgba(189, 189, 189, 0.04) 100%)',
      text: 'rgba(33, 33, 33, 0.9)'
    },
    'fog-noon': {
      primary: 'rgba(189, 189, 189, 0.2)',
      secondary: 'rgba(158, 158, 158, 0.15)',
      accent: 'rgba(117, 117, 117, 0.1)',
      gradient: 'linear-gradient(135deg, rgba(189, 189, 189, 0.06) 0%, rgba(158, 158, 158, 0.04) 100%)',
      text: 'rgba(33, 33, 33, 0.9)'
    },
    'fog-afternoon': {
      primary: 'rgba(158, 158, 158, 0.2)',
      secondary: 'rgba(117, 117, 117, 0.15)',
      accent: 'rgba(97, 97, 97, 0.1)',
      gradient: 'linear-gradient(135deg, rgba(158, 158, 158, 0.06) 0%, rgba(117, 117, 117, 0.04) 100%)',
      text: 'rgba(33, 33, 33, 0.9)'
    },
    'fog-sunset': {
      primary: 'rgba(158, 158, 158, 0.2)',
      secondary: 'rgba(255, 138, 101, 0.1)',
      accent: 'rgba(255, 183, 77, 0.08)',
      gradient: 'linear-gradient(135deg, rgba(158, 158, 158, 0.06) 0%, rgba(255, 138, 101, 0.03) 100%)',
      text: 'rgba(33, 33, 33, 0.9)'
    },
    'fog-evening': {
      primary: 'rgba(117, 117, 117, 0.2)',
      secondary: 'rgba(97, 97, 97, 0.15)',
      accent: 'rgba(66, 66, 66, 0.1)',
      gradient: 'linear-gradient(135deg, rgba(117, 117, 117, 0.06) 0%, rgba(97, 97, 97, 0.04) 100%)',
      text: 'rgba(33, 33, 33, 0.9)'
    },
    'fog-night': {
      primary: 'rgb(66, 66, 66)',
      secondary: 'rgb(97, 97, 97)',
      accent: 'rgb(117, 117, 117)',
      gradient: 'linear-gradient(135deg, rgb(33, 33, 33) 0%, rgb(49, 49, 49) 100%)',
      text: 'rgba(255, 255, 255, 0.98)'
    },

    // 雷暴系列 - 深沉紫调
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
    }
  };

  /**
   * 应用主题到新标签页
   */
  applyToNewTab(weatherCode, hour, isNight, sunTimes = null) {
    const theme = this.getTheme(weatherCode, hour, isNight, sunTimes);
    const body = document.body;
    const root = document.documentElement;

    // 更新CSS变量
    root.style.setProperty('--theme-primary', theme.primary);
    root.style.setProperty('--theme-secondary', theme.secondary);
    root.style.setProperty('--theme-accent', theme.accent);
    root.style.setProperty('--theme-gradient', theme.gradient);
    root.style.setProperty('--theme-text', theme.text || 'rgba(33, 33, 33, 0.92)');

    // 更新背景层
    const backgroundLayer = document.querySelector('.background-layer');
    if (backgroundLayer) {
      backgroundLayer.style.background = theme.gradient;
      backgroundLayer.style.transition = `background ${this.transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    }

    this.currentTheme = { weatherCode, hour, isNight, theme, sunTimes };
  }

  /**
   * 应用主题到Popup
   */
  applyToPopup(weatherCode, hour, isNight, sunTimes = null) {
    const theme = this.getTheme(weatherCode, hour, isNight, sunTimes);
    const body = document.body;
    const root = document.documentElement;

    console.log('[AeScape] 应用popup主题:', theme);

    // 更新CSS变量以确保强制覆盖
    root.style.setProperty('--theme-gradient', theme.gradient);
    root.style.setProperty('--theme-text', theme.text || 'rgba(33, 33, 33, 0.92)');
    
    // 直接应用到body样式（强制覆盖）
    body.style.setProperty('background', theme.gradient, 'important');
    body.style.setProperty('color', theme.text, 'important');
    body.style.setProperty('transition', `all ${this.transitionDuration}ms ease`, 'important');

    // 更新伪元素背景
    const beforeStyles = `
      body::before {
        background: ${theme.gradient} !important;
      }
    `;
    
    // 移除旧的style标签
    const oldStyle = document.getElementById('popup-theme-override');
    if (oldStyle) {
      oldStyle.remove();
    }
    
    // 添加新的style标签
    const styleElement = document.createElement('style');
    styleElement.id = 'popup-theme-override';
    styleElement.textContent = beforeStyles;
    document.head.appendChild(styleElement);

    // 移除所有天气类
    body.className = body.className.replace(/weather-\w+/g, '');
    
    // 添加新的主题类
    body.classList.add(`weather-${weatherCode}`);
    body.classList.add(`time-${this.getTimeSlot(hour, isNight, sunTimes)}`);

    this.currentTheme = { weatherCode, hour, isNight, theme, sunTimes };
  }

  /**
   * 获取当前主题信息
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * 平滑过渡到新主题
   */
  async transitionToTheme(weatherCode, hour, isNight, target = 'newtab') {
    const newTheme = this.getTheme(weatherCode, hour, isNight);
    
    // 如果主题相同，跳过过渡
    if (this.currentTheme && 
        this.currentTheme.weatherCode === weatherCode &&
        this.currentTheme.hour === hour &&
        this.currentTheme.isNight === isNight) {
      return;
    }

    // 执行过渡动画
    if (target === 'newtab') {
      this.applyToNewTab(weatherCode, hour, isNight);
    } else if (target === 'popup') {
      this.applyToPopup(weatherCode, hour, isNight);
    }

    // 返回Promise以便链式调用
    return new Promise(resolve => {
      setTimeout(resolve, this.transitionDuration);
    });
  }
}

// 导出实例
window.unifiedTheme = new UnifiedThemeSystem();

// 全局主题同步管理器
window.GlobalThemeManager = {
  currentThemeData: null,
  listeners: [],

  /**
   * 统一构建主题快照，保证四件套读取到的是完全一致的数据结构
   * 并且在必要时提供分组（tab+popup 一组；ball+card 一组）的别名字段
   */
  buildThemeData(theme, weatherCode, hour, isNight, sunTimes) {
    // 尽量保持简单：所有来源都指向同一底层 theme，以避免漂移
    const snapshot = {
      weatherCode,
      hour,
      isNight,
      sunTimes,
      theme,
      // 四件套分组：tab 与 popup 共享 newtab/popup；悬浮球与卡片共享 floating/panel
      newtab: theme,
      popup: { gradient: theme.gradient, text: theme.text },
      floating: { gradient: theme.gradient, text: theme.text },
      panel: { gradient: theme.gradient, text: theme.text, borderColor: this.getBorderColor(theme.text) }
    };
    return snapshot;
  },
  
  // 设置全局主题数据
  setGlobalTheme(weatherCode, hour, isNight, sunTimes = null) {
    try {
      const theme = window.unifiedTheme.getTheme(weatherCode, hour, isNight, sunTimes);
      // 使用统一构建器，避免字段不一致
      this.currentThemeData = this.buildThemeData(theme, weatherCode, hour, isNight, sunTimes);
      
      console.log('[GlobalThemeManager] 全局主题已更新:', this.currentThemeData);
      
      // 将主题快照写入 storage，供内容脚本在无 GlobalThemeManager 时读取
      try {
        if (chrome?.storage?.local?.set) {
          chrome.storage.local.set({ currentThemeData: this.currentThemeData }).catch?.(() => {});
        }
      } catch (_) {}
      
      // 通知所有监听器（本页内订阅者）
      this.notifyListeners();
      
      // 额外：派发自定义事件，方便无直接引用的订阅者监听
      try {
        const evt = new CustomEvent('AeScapeThemeUpdate', { detail: this.currentThemeData });
        window.dispatchEvent(evt);
      } catch (e) {
        console.warn('[GlobalThemeManager] 派发主题事件失败:', e);
      }
    } catch (err) {
      console.warn('[GlobalThemeManager] 设置全局主题失败:', err);
    }
  },
  
  // 获取边框颜色
  getBorderColor(textColor) {
    if (textColor.includes('33, 33, 33')) {
      return 'rgba(0, 0, 0, 0.15)';
    }
    return 'rgba(255, 255, 255, 0.2)';
  },
  
  // 获取当前主题数据
  getCurrentTheme() {
    return this.currentThemeData;
  },
  
  // 添加监听器
  addListener(callback) {
    this.listeners.push(callback);
  },
  
  // 通知所有监听器
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentThemeData);
      } catch (error) {
        console.warn('[GlobalThemeManager] 监听器回调失败:', error);
      }
    });
  },
  
  // 强制应用主题到所有组件
  applyToAllComponents() {
    if (!this.currentThemeData) {
      console.warn('[GlobalThemeManager] 没有主题数据可应用');
      return;
    }
    
    const { weatherCode, hour, isNight, sunTimes } = this.currentThemeData;

    // 保持 tab 与 popup 风格完全同步：两者均由统一主题驱动
    try {
      if (document.body && document.body.classList.contains('popup-body')) {
        window.unifiedTheme.applyToPopup(weatherCode, hour, isNight, sunTimes);
      }
    } catch (e) { console.warn('[GlobalThemeManager] 应用到 popup 失败:', e); }

    try {
      if (document.querySelector('.background-layer')) {
        window.unifiedTheme.applyToNewTab(weatherCode, hour, isNight, sunTimes);
      }
    } catch (e) { console.warn('[GlobalThemeManager] 应用到 newtab 失败:', e); }
    
    // 通知悬浮球更新（如果存在集成方）
    try {
      if (window.aescape && window.aescape.applyGlobalTheme) {
        window.aescape.applyGlobalTheme(this.currentThemeData);
      }
    } catch (e) { console.warn('[GlobalThemeManager] 通知悬浮球失败:', e); }
  }
};

// 初始化默认主题
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // 若为 Popup 页面，交由 popup.js 从 storage 驱动，避免覆盖
    if (document.body && document.body.classList.contains('popup-body')) {
      return;
    }

    // 若 storage 已有统一主题快照，则不在前端主动设置，避免与后台冲突
    if (chrome?.storage?.local?.get) {
      try {
        const stored = await chrome.storage.local.get(['currentThemeData']);
        if (stored && stored.currentThemeData) {
          return;
        }
      } catch (_) {}
    }

    const hour = new Date().getHours();
    const isNight = hour < 6 || hour > 19;
    window.GlobalThemeManager.setGlobalTheme('clear', hour, isNight);
  } catch (_) {
    // 忽略初始化失败
  }
});