/**
 * 天景 AeScape - 统一SVG图标库
 * 全局规范：禁止使用任何emoji表情符号，使用SVG图标替代
 */

class AeScapeIconLibrary {
  constructor() {
    this.weatherIcons = this.initWeatherIcons();
    this.uiIcons = this.initUIIcons();
    this.notificationIcons = this.initNotificationIcons();
  }

  /**
   * 天气图标库
   */
  initWeatherIcons() {
    return {
      // 晴天 - 白天太阳
      'clear-day': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>`,

      // 晴天 - 夜晚月亮
      'clear-night': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>`,

      // 多云
      'cloudy': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
      </svg>`,

      // 雨天
      'rain': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <line x1="16" y1="13" x2="16" y2="21"></line>
        <line x1="8" y1="13" x2="8" y2="21"></line>
        <line x1="12" y1="15" x2="12" y2="23"></line>
        <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"></path>
      </svg>`,

      // 雪天
      'snow': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <line x1="2" y1="17" x2="22" y2="17"></line>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <line x1="2" y1="7" x2="22" y2="7"></line>
        <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"></path>
      </svg>`,

      // 雾天
      'fog': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M3 15h18M3 9h18M3 21h18"></path>
      </svg>`,

      // 雷暴
      'thunderstorm': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"></path>
        <polyline points="13 11,9 17,15 17,11 23"></polyline>
      </svg>`
    };
  }

  /**
   * UI功能图标库
   */
  initUIIcons() {
    return {
      // 刷新图标
      'refresh': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 4,23 10,17 10"></polyline>
        <polyline points="1 20,1 14,7 14"></polyline>
        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10"></path>
        <path d="M3.51 15A9 9 0 0 0 18.36 18.36L23 14"></path>
      </svg>`,

      // 设置/齿轮图标
      'settings': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>`,

      // 关闭/X图标
      'close': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>`,

      // 位置图标
      'location': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>`,

      // 搜索图标
      'search': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="M21 21l-4.35-4.35"></path>
      </svg>`
    };
  }

  /**
   * 通知图标库
   */
  initNotificationIcons() {
    return {
      // 成功图标
      'success': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20,6 9,17 4,12"></polyline>
      </svg>`,

      // 错误图标  
      'error': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>`,

      // 警告图标
      'warning': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>`,

      // 信息图标
      'info': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>`
    };
  }

  /**
   * 获取天气图标
   * @param {string} weatherCode - 天气代码 (clear, cloudy, rain, snow, fog, thunderstorm)
   * @param {boolean} isNight - 是否为夜晚
   * @param {string|number} size - 图标尺寸 (16, 20, 24, 32, 48, 64 等)
   * @returns {string} SVG HTML字符串
   */
  getWeatherIcon(weatherCode, isNight = false, size = 24) {
    let iconKey = weatherCode;
    
    // 晴天需要区分白天和夜晚
    if (weatherCode === 'clear') {
      iconKey = isNight ? 'clear-night' : 'clear-day';
    }
    
    const iconSvg = this.weatherIcons[iconKey] || this.weatherIcons['clear-day'];
    
    // 添加尺寸属性
    return iconSvg.replace('<svg', `<svg width="${size}" height="${size}"`);
  }

  /**
   * 获取UI功能图标
   * @param {string} iconName - 图标名称
   * @param {string|number} size - 图标尺寸
   * @returns {string} SVG HTML字符串
   */
  getUIIcon(iconName, size = 20) {
    const iconSvg = this.uiIcons[iconName] || '';
    return iconSvg.replace('<svg', `<svg width="${size}" height="${size}"`);
  }

  /**
   * 获取通知图标
   * @param {string} type - 通知类型 (success, error, warning, info)
   * @param {string|number} size - 图标尺寸
   * @returns {string} SVG HTML字符串
   */
  getNotificationIcon(type, size = 16) {
    const iconSvg = this.notificationIcons[type] || this.notificationIcons['info'];
    return iconSvg.replace('<svg', `<svg width="${size}" height="${size}"`);
  }

  /**
   * 获取带旋转动画的刷新图标
   * @param {string|number} size - 图标尺寸
   * @returns {string} SVG HTML字符串
   */
  getRefreshIconWithSpin(size = 20) {
    const iconSvg = this.uiIcons['refresh'];
    return iconSvg.replace(
      '<svg', 
      `<svg width="${size}" height="${size}" style="animation: spin 1s linear infinite;"`
    );
  }
}

// 创建全局图标库实例
window.AeScapeIcons = new AeScapeIconLibrary();

// 添加旋转动画样式（如果还没有添加）
if (!document.querySelector('#aescape-icon-animations')) {
  const style = document.createElement('style');
  style.id = 'aescape-icon-animations';
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}