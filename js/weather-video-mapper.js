/**
 * 天景 AeScape - 天气视频映射器
 * 负责维护天气类型到视频文件的映射关系
 * 支持不同强度的天气效果和Alpha通道视频
 */

class WeatherVideoMapper {
  constructor() {
    // 基于 video-index.md 的完整映射表
    // 注意：路径需要相对于项目根目录
    this.videoMap = {
      // 晴天 - 与多云共用视频
      clear: {
        videos: [
          'video/tab/c/cloudy_1.webm',
          'video/tab/c/cloudy_2.webm', 
          'video/tab/c/cloudy_3.webm',
          'video/tab/c/cloudy_4.webm',
          'video/tab/c/cloudy_5.webm',
          'video/tab/c/cloudy_6.webm',
          'video/tab/c/cloudy_7.webm',
          'video/tab/c/cloudy_8.webm'
        ],
        hasAlpha: true,
        blendMode: 'lighten', // 使用lighten混合模式解决黑边
        description: '晴天效果（与多云共用，lighten模式）'
      },
      
      // 多云 - 带Alpha通道的云层效果
      cloudy: {
        videos: [
          'video/tab/c/cloudy_1.webm',
          'video/tab/c/cloudy_2.webm', 
          'video/tab/c/cloudy_3.webm',
          'video/tab/c/cloudy_4.webm',
          'video/tab/c/cloudy_5.webm',
          'video/tab/c/cloudy_6.webm',
          'video/tab/c/cloudy_7.webm',
          'video/tab/c/cloudy_8.webm'
        ],
        hasAlpha: true,
        blendMode: 'lighten', // 使用lighten混合模式解决黑边
        description: '多云效果（带Alpha通道，lighten模式）'
      },
      
      // 雨天 - 不同强度的雨滴效果
      rain: {
        videos: [
          'video/tab/r/rain_4.webm',   // 小雨
          'video/tab/r/rain_5.webm',   // 小雨 风
          'video/tab/r/rain_6.webm',   // 中雨
          'video/tab/r/rain_7.webm',   // 中雨 风
          'video/tab/r/rain_8.webm',   // 大雨 风
          'video/tab/r/rain_9.webm',   // 大雨
          'video/tab/r/rain_10.webm',  // 小雨
          'video/tab/r/rain_11.webm'   // 雷雨
        ],
        hasAlpha: false,
        blendMode: 'screen', // 使用screen混合模式
        description: '雨滴效果（screen模式）'
      },
      
      // 雪天 - 不同强度的雪花效果
      snow: {
        videos: [
          'video/tab/s/snow_1.webm',   // 小雪
          'video/tab/s/snow_2.webm',   // 小雪
          'video/tab/s/snow_3.webm',   // 小雪 风
          'video/tab/s/snow_4.webm',   // 中雪 风
          'video/tab/s/snow_5.webm',   // 大雪 风
          'video/tab/s/snow_6.webm',   // 微雪
          'video/tab/s/snow_7.webm',   // 微雪
          'video/tab/s/snow_8.webm',   // 微雪
          'video/tab/s/snow_9.webm'    // 小雪
        ],
        hasAlpha: false,
        blendMode: 'screen', // 使用screen混合模式
        description: '雪花效果（screen模式）'
      },
      
      // 雾天 - 与多云共用视频
      fog: {
        videos: [
          'video/tab/c/cloudy_1.webm',
          'video/tab/c/cloudy_2.webm', 
          'video/tab/c/cloudy_3.webm',
          'video/tab/c/cloudy_4.webm',
          'video/tab/c/cloudy_5.webm',
          'video/tab/c/cloudy_6.webm',
          'video/tab/c/cloudy_7.webm',
          'video/tab/c/cloudy_8.webm'
        ],
        hasAlpha: true,
        blendMode: 'lighten', // 使用lighten混合模式解决黑边
        description: '雾天效果（与多云共用，lighten模式）'
      },
      
      // 雷暴 - 使用雷雨视频
      thunderstorm: {
        videos: [
          'video/tab/r/rain_11.webm'   // 雷雨
        ],
        hasAlpha: false,
        blendMode: 'overlay', // 使用overlay混合模式
        description: '雷暴效果（overlay模式）'
      }
    };
    
    // 玻璃效果视频（特殊效果）
    this.glassVideos = [
      'video/tab/g/glass_1.webm',  // 小雨
      'video/tab/g/glass_2.webm',  // 小雨
      'video/tab/g/glass_3.webm',  // 中雨
      'video/tab/g/glass_4.webm'   // 大雨
    ];
    
    // 底部视角视频（特殊效果）
    this.bottomViewVideos = [
      'video/tab/bv/bottomview_1.webm',  // 大雨
      'video/tab/bv/bottomview_2.webm',  // 雷暴
      'video/tab/bv/bottomview_3.webm',  // 中雨
      'video/tab/bv/bottomview_4.webm'   // 小雨
    ];
    
    console.log('WeatherVideoMapper: 初始化完成');
  }

  /**
   * 根据小时计算时间段
   * @param {number} hour - 小时 (0-23)
   * @returns {('night'|'morning'|'day'|'evening')} 时间段
   */
  getTimeBucket(hour) {
    try {
      const h = Number.isFinite(hour) ? hour : new Date().getHours();
      if (h < 6) return 'night';       // 00:00 - 05:59
      if (h < 11) return 'morning';    // 06:00 - 10:59
      if (h < 17) return 'day';        // 11:00 - 16:59
      if (h < 20) return 'evening';    // 17:00 - 19:59
      return 'night';                  // 20:00 - 23:59
    } catch (_e) {
      return 'day';
    }
  }

  /**
   * 获取某天气在某时间段可用的视频列表（若未配置则回退到通用videos）
   * @param {object} weatherData - videoMap[weatherType]
   * @param {string} timeBucket - 时间段
   * @returns {Array<string>} 视频路径数组
   */
  getBucketVideos(weatherData, timeBucket) {
    try {
      // 支持可选字段：weatherData.timeBuckets = { morning: string[], day: string[], evening: string[], night: string[] }
      if (weatherData && weatherData.timeBuckets && Array.isArray(weatherData.timeBuckets[timeBucket])) {
        const arr = weatherData.timeBuckets[timeBucket];
        if (arr.length > 0) return arr;
      }
      return weatherData?.videos || [];
    } catch (_e) {
      return weatherData?.videos || [];
    }
  }

  /**
   * 根据天气类型获取对应的视频文件
   * @param {string} weatherType - 天气类型
   * @param {string} intensity - 强度级别 (light/medium/heavy)
   * @param {boolean} useGlass - 是否使用玻璃效果
   * @param {boolean} useBottomView - 是否使用底部视角
   * @returns {object} 视频信息对象
   */
  getVideoForWeather(weatherType, intensity = 'medium', useGlass = false, useBottomView = false) {
    try {
      const weatherData = this.videoMap[weatherType];
      
      if (!weatherData) {
        console.warn(`WeatherVideoMapper: 未知的天气类型: ${weatherType}`);
        return this.getFallbackVideo();
      }
      
      // 如果没有视频，返回空
      if (weatherData.videos.length === 0) {
        return {
          videoPath: null,
          hasAlpha: false,
          blendMode: 'screen',
          description: weatherData.description,
          weatherType: weatherType
        };
      }
      
      let selectedVideo = null;
      
      // 根据强度选择视频
      if (intensity === 'light') {
        // 选择前1/3的视频（较轻效果）
        const lightVideos = weatherData.videos.slice(0, Math.ceil(weatherData.videos.length / 3));
        selectedVideo = this.getRandomVideo(lightVideos);
      } else if (intensity === 'heavy') {
        // 选择后1/3的视频（较重效果）
        const heavyVideos = weatherData.videos.slice(-Math.ceil(weatherData.videos.length / 3));
        selectedVideo = this.getRandomVideo(heavyVideos);
      } else {
        // 中等强度，随机选择
        selectedVideo = this.getRandomVideo(weatherData.videos);
      }
      
      // 特殊效果处理
      if (useGlass && weatherType === 'rain') {
        selectedVideo = this.getRandomVideo(this.glassVideos);
      }
      
      if (useBottomView && (weatherType === 'rain' || weatherType === 'thunderstorm')) {
        selectedVideo = this.getRandomVideo(this.bottomViewVideos);
      }
      
      // 添加调试信息
      console.log(`WeatherVideoMapper: 选择视频 - 天气: ${weatherType}, 强度: ${intensity}, 视频: ${selectedVideo}`);
      
      return {
        videoPath: selectedVideo,
        hasAlpha: weatherData.hasAlpha,
        blendMode: weatherData.blendMode || 'screen',
        description: weatherData.description,
        weatherType: weatherType,
        intensity: intensity
      };
      
    } catch (error) {
      console.error('WeatherVideoMapper: 获取视频时出错', error);
      return this.getFallbackVideo();
    }
  }

  /**
   * 根据天气类型 + 时间（小时）获取对应视频文件
   * 优先使用 timeBuckets[timeBucket]，若不存在则回退到通用 videos
   * @param {string} weatherType - 天气类型（如 'rain'）
   * @param {number} hour - 小时 (0-23)
   * @param {string} intensity - 强度级别 (light/medium/heavy)
   * @param {boolean} useGlass - 是否使用玻璃效果
   * @param {boolean} useBottomView - 是否使用底部视角
   * @returns {object} 视频信息对象
   */
  getVideoForWeatherAtTime(weatherType, hour, intensity = 'medium', useGlass = false, useBottomView = false) {
    try {
      const weatherData = this.videoMap[weatherType];
      if (!weatherData) {
        console.warn(`WeatherVideoMapper: 未知的天气类型(按时间): ${weatherType}`);
        return this.getFallbackVideo();
      }

      // 计算时间段并获取对应视频候选集
      const bucket = this.getTimeBucket(hour);
      const bucketVideos = this.getBucketVideos(weatherData, bucket);
      if (!bucketVideos || bucketVideos.length === 0) {
        return this.getVideoForWeather(weatherType, intensity, useGlass, useBottomView);
      }

      let selectedVideo = null;
      if (intensity === 'light') {
        const lightVideos = bucketVideos.slice(0, Math.ceil(bucketVideos.length / 3));
        selectedVideo = this.getRandomVideo(lightVideos);
      } else if (intensity === 'heavy') {
        const heavyVideos = bucketVideos.slice(-Math.ceil(bucketVideos.length / 3));
        selectedVideo = this.getRandomVideo(heavyVideos);
      } else {
        selectedVideo = this.getRandomVideo(bucketVideos);
      }

      // 特殊效果处理与原逻辑一致
      if (useGlass && weatherType === 'rain') {
        selectedVideo = this.getRandomVideo(this.glassVideos);
      }
      if (useBottomView && (weatherType === 'rain' || weatherType === 'thunderstorm')) {
        selectedVideo = this.getRandomVideo(this.bottomViewVideos);
      }

      console.log(`WeatherVideoMapper: 选择视频(按时间) - 天气: ${weatherType}, 时间段: ${bucket}, 强度: ${intensity}, 视频: ${selectedVideo}`);

      return {
        videoPath: selectedVideo,
        hasAlpha: weatherData.hasAlpha,
        blendMode: weatherData.blendMode || 'screen',
        description: weatherData.description,
        weatherType,
        intensity,
        timeBucket: bucket
      };
    } catch (error) {
      console.error('WeatherVideoMapper: 按时间获取视频时出错', error);
      return this.getFallbackVideo();
    }
  }

  /**
   * 随机选择一个视频
   * @param {Array} videos - 视频数组
   * @returns {string} 选中的视频路径
   */
  getRandomVideo(videos) {
    if (!videos || videos.length === 0) {
      return null;
    }
    const randomIndex = Math.floor(Math.random() * videos.length);
    return videos[randomIndex];
  }

  /**
   * 获取回退视频（当出错时使用）
   * @returns {object} 回退视频信息
   */
  getFallbackVideo() {
    return {
      videoPath: '../video/tab/c/cloudy_1.webm',
      hasAlpha: true,
      blendMode: 'lighten',
      description: '回退到多云效果（lighten模式）',
      weatherType: 'cloudy',
      isFallback: true
    };
  }

  /**
   * 获取所有支持的天气类型
   * @returns {Array} 天气类型数组
   */
  getSupportedWeatherTypes() {
    return Object.keys(this.videoMap);
  }

  /**
   * 检查天气类型是否有视频
   * @param {string} weatherType - 天气类型
   * @returns {boolean} 是否有视频
   */
  hasVideoForWeather(weatherType) {
    const weatherData = this.videoMap[weatherType];
    return weatherData && weatherData.videos.length > 0;
  }

  /**
   * 获取天气类型的视频数量
   * @param {string} weatherType - 天气类型
   * @returns {number} 视频数量
   */
  getVideoCount(weatherType) {
    const weatherData = this.videoMap[weatherType];
    return weatherData ? weatherData.videos.length : 0;
  }

  /**
   * 预加载指定天气类型的所有视频
   * @param {string} weatherType - 天气类型
   * @returns {Promise} 预加载完成Promise
   */
  async preloadWeatherVideos(weatherType) {
    try {
      const weatherData = this.videoMap[weatherType];
      if (!weatherData || weatherData.videos.length === 0) {
        return Promise.resolve();
      }

      const preloadPromises = weatherData.videos.map(videoPath => {
        return new Promise((resolve, reject) => {
          const video = document.createElement('video');
          video.muted = true;
          video.preload = 'metadata';
          
          video.addEventListener('loadedmetadata', () => {
            console.log(`WeatherVideoMapper: 预加载完成 - ${videoPath}`);
            resolve(videoPath);
          });
          
          video.addEventListener('error', (e) => {
            console.warn(`WeatherVideoMapper: 预加载失败 - ${videoPath}`, e);
            resolve(videoPath); // 不阻塞其他视频的预加载
          });
          
          video.src = videoPath;
        });
      });

      await Promise.all(preloadPromises);
      console.log(`WeatherVideoMapper: ${weatherType} 类型视频预加载完成`);
      
    } catch (error) {
      console.error('WeatherVideoMapper: 预加载视频时出错', error);
    }
  }

  /**
   * 获取映射统计信息
   * @returns {object} 统计信息
   */
  getMappingStats() {
    const stats = {};
    for (const [weatherType, data] of Object.entries(this.videoMap)) {
      stats[weatherType] = {
        videoCount: data.videos.length,
        hasAlpha: data.hasAlpha,
        blendMode: data.blendMode,
        description: data.description
      };
    }
    return stats;
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WeatherVideoMapper;
}
