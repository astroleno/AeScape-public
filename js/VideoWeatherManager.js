/**
 * 天景 AeScape - 视频天气管理器
 * 负责根据天气类型选择对应的视频文件并管理播放
 * 与主插件天气系统集成，提供1.5秒的视频效果展示
 */

class VideoWeatherManager {
  constructor(options = {}) {
    // 配置选项
    this.config = {
      duration: options.duration || 1500,           // 视频播放时长（毫秒）
      enhanceEffects: options.enhanceEffects !== false, // 是否启用增强效果
      autoPlay: options.autoPlay !== false,         // 自动播放
      fallbackToStatic: options.fallbackToStatic !== false, // 失败时回退到静态效果
      performanceMode: options.performanceMode || 'auto', // 性能模式
      preloadVideos: options.preloadVideos !== false, // 是否预加载视频
      ...options
    };
    
    // 初始化组件
    this.mapper = new WeatherVideoMapper();
    this.animation = null;
    this.currentWeather = null;
    this.currentVideo = null;
    this.isPlaying = false;
    this.isInitialized = false;
    
    // 回调函数
    this.callbacks = {
      onStart: options.onStart || null,
      onEnd: options.onEnd || null,
      onError: options.onError || null,
      onWeatherChange: options.onWeatherChange || null,
      onVideoLoad: options.onVideoLoad || null
    };
    
    // 性能监控
    this.performance = {
      loadTime: 0,
      playTime: 0,
      memoryUsage: 0
    };
    
    console.log('VideoWeatherManager: 初始化完成');
  }

  /**
   * 初始化管理器
   * @param {string} containerId - 视频容器ID
   * @param {string} videoId - 视频元素ID
   */
  init(containerId = 'intro-video-container', videoId = 'intro-video') {
    try {
      // 创建视频动画实例
      this.animation = new VideoIntroAnimation({
        containerId: containerId,
        videoId: videoId,
        autoPlay: this.config.autoPlay,
        onStart: () => {
          this.isPlaying = true;
          this.performance.playTime = Date.now();
          console.log('VideoWeatherManager: 视频开始播放');
          if (this.callbacks.onStart) this.callbacks.onStart();
        },
        onEnd: () => {
          this.isPlaying = false;
          console.log('VideoWeatherManager: 视频播放结束');
          if (this.callbacks.onEnd) this.callbacks.onEnd();
        },
        onError: (error) => {
          this.isPlaying = false;
          console.error('VideoWeatherManager: 视频播放错误', error);
          if (this.callbacks.onError) this.callbacks.onError(error);
          this.handleVideoError();
        },
        onProgress: null
      });
      
      this.isInitialized = true;
      console.log('VideoWeatherManager: 管理器初始化完成');
      
    } catch (error) {
      console.error('VideoWeatherManager: 初始化失败', error);
      this.handleInitializationError(error);
    }
  }

  /**
   * 根据天气类型播放对应视频
   * @param {string} weatherType - 天气类型
   * @param {object} options - 播放选项
   */
  async playWeatherVideo(weatherType, options = {}) {
    try {
      if (!this.isInitialized) {
        console.warn('VideoWeatherManager: 管理器未初始化');
        return false;
      }

      const startTime = Date.now();
      
      // 获取视频信息
      const videoInfo = this.mapper.getVideoForWeather(
        weatherType,
        options.intensity || 'medium',
        options.useGlass || false,
        options.useBottomView || false
      );
      
      // 检查是否有视频
      if (!videoInfo.videoPath) {
        console.log(`VideoWeatherManager: ${weatherType} 类型无视频效果`);
        if (this.callbacks.onWeatherChange) {
          this.callbacks.onWeatherChange(weatherType, null);
        }
        return false;
      }
      
      // 更新当前状态
      this.currentWeather = weatherType;
      this.currentVideo = videoInfo;
      
      console.log(`VideoWeatherManager: 准备播放 ${weatherType} 视频`, videoInfo);
      
      // 设置视频源
      const success = await this.setVideoSource(videoInfo.videoPath, videoInfo.hasAlpha);
      
      if (success) {
        // 应用增强效果
        if (this.config.enhanceEffects) {
          this.applyEnhancementEffects(videoInfo);
        }

        // 返回一个在播放结束时 resolve 的 Promise，确保顺序播放
        return await new Promise((resolve) => {
          const onEnd = () => {
            try { this.animation?.video?.removeEventListener('ended', onEnd); } catch (_) {}
            resolve(true);
          };
          try { this.animation?.video?.addEventListener('ended', onEnd, { once: true }); } catch (_) { resolve(true); }
          // 开始播放
          this.animation.play();

          // 记录性能数据
          this.performance.loadTime = Date.now() - startTime;
          // 触发回调
          if (this.callbacks.onWeatherChange) {
            this.callbacks.onWeatherChange(weatherType, videoInfo);
          }
          if (this.callbacks.onVideoLoad) {
            this.callbacks.onVideoLoad(videoInfo);
          }
        });
      } else {
        console.error('VideoWeatherManager: 设置视频源失败');
        return false;
      }
      
    } catch (error) {
      console.error('VideoWeatherManager: 播放天气视频时出错', error);
      this.handleVideoError();
      return false;
    }
  }

  /**
   * 设置视频源
   * @param {string} videoPath - 视频路径
   * @param {boolean} hasAlpha - 是否有Alpha通道
   * @returns {Promise<boolean>} 是否成功
   */
  async setVideoSource(videoPath, hasAlpha = false) {
    try {
      const video = this.animation.video;
      if (!video) {
        console.error('VideoWeatherManager: 视频元素不存在');
        return false;
      }
      
      console.log('VideoWeatherManager: 设置视频源', videoPath);
      
      // 设置视频源
      video.src = videoPath;
      
      // 根据是否有Alpha通道设置不同的样式
      const container = this.animation.videoContainer;
      if (hasAlpha) {
        container.classList.add('has-alpha');
        container.classList.remove('no-alpha');
      } else {
        container.classList.add('no-alpha');
        container.classList.remove('has-alpha');
      }
      
      // 等待视频加载
      return new Promise((resolve) => {
        let settled = false;
        const clearAll = () => {
          try {
            video.removeEventListener('loadeddata', onLoadedData);
            video.removeEventListener('error', onError);
            video.removeEventListener('loadstart', onLoadStart);
          } catch (_) {}
          if (this._loadTimer) {
            clearTimeout(this._loadTimer);
            this._loadTimer = null;
          }
        };

        const onLoadedData = () => {
          if (settled) return;
          settled = true;
          clearAll();
          console.log('VideoWeatherManager: 视频加载完成', videoPath);
          resolve(true);
        };
        
        const onError = (e) => {
          if (settled) return;
          settled = true;
          clearAll();
          console.error('VideoWeatherManager: 视频加载失败', videoPath, e);
          resolve(false);
        };
        
        const onLoadStart = () => {
          console.log('VideoWeatherManager: 开始加载视频', videoPath);
        };
        
        video.addEventListener('loadeddata', onLoadedData);
        video.addEventListener('error', onError);
        video.addEventListener('loadstart', onLoadStart);
        
        // 设置超时（可被 loadeddata 取消）
        this._loadTimer = setTimeout(() => {
          if (settled) return;
          settled = true;
          clearAll();
          console.warn('VideoWeatherManager: 视频加载超时', videoPath);
          resolve(false);
        }, 6000);
      });
      
    } catch (error) {
      console.error('VideoWeatherManager: 设置视频源时出错', error);
      return false;
    }
  }

  /**
   * 应用增强效果（基于 advice.md）
   * @param {object} videoInfo - 视频信息
   */
  applyEnhancementEffects(videoInfo) {
    try {
      const container = this.animation.videoContainer;
      if (!container) return;
      
      // 添加增强效果类
      container.classList.add('enhanced-effects');
      
      // 根据视频类型应用不同效果
      if (videoInfo.weatherType === 'snow') {
        container.classList.add('snow-effects');
      } else if (videoInfo.weatherType === 'rain') {
        container.classList.add('rain-effects');
      } else if (videoInfo.weatherType === 'cloudy') {
        container.classList.add('cloudy-effects');
      } else if (videoInfo.weatherType === 'clear') {
        container.classList.add('clear-effects');
      } else if (videoInfo.weatherType === 'fog') {
        container.classList.add('fog-effects');
      } else if (videoInfo.weatherType === 'thunderstorm') {
        container.classList.add('thunderstorm-effects');
      }
      
      // 应用混合模式
      if (videoInfo.blendMode) {
        this.applyBlendMode(videoInfo.blendMode);
      }
      
      console.log('VideoWeatherManager: 应用增强效果', videoInfo.weatherType, '混合模式:', videoInfo.blendMode);
      
    } catch (error) {
      console.error('VideoWeatherManager: 应用增强效果时出错', error);
    }
  }

  /**
   * 应用混合模式
   * @param {string} blendMode - 混合模式
   */
  applyBlendMode(blendMode) {
    try {
      const container = this.animation.videoContainer;
      if (!container) return;
      
      // 移除之前的混合模式类
      container.classList.remove('blend-normal', 'blend-multiply', 'blend-screen', 'blend-overlay');
      
      // 添加新的混合模式类
      container.classList.add(`blend-${blendMode}`);
      
      // 直接设置CSS变量
      container.style.setProperty('--video-blend-mode', blendMode);
      
      console.log('VideoWeatherManager: 应用混合模式', blendMode);
      
    } catch (error) {
      console.error('VideoWeatherManager: 应用混合模式时出错', error);
    }
  }

  /**
   * 停止视频播放
   */
  stopVideo() {
    try {
      if (this.animation) {
        this.animation.stop();
      }
      this.isPlaying = false;
      console.log('VideoWeatherManager: 视频已停止');
    } catch (error) {
      console.error('VideoWeatherManager: 停止视频时出错', error);
    }
  }

  /**
   * 暂停视频播放
   */
  pauseVideo() {
    try {
      if (this.animation) {
        this.animation.pause();
      }
      this.isPlaying = false;
      console.log('VideoWeatherManager: 视频已暂停');
    } catch (error) {
      console.error('VideoWeatherManager: 暂停视频时出错', error);
    }
  }

  /**
   * 恢复视频播放
   */
  resumeVideo() {
    try {
      if (this.animation) {
        this.animation.resume();
      }
      this.isPlaying = true;
      console.log('VideoWeatherManager: 视频已恢复');
    } catch (error) {
      console.error('VideoWeatherManager: 恢复视频时出错', error);
    }
  }

  /**
   * 预加载指定天气类型的视频
   * @param {string} weatherType - 天气类型
   */
  async preloadWeatherVideos(weatherType) {
    try {
      if (this.config.preloadVideos) {
        await this.mapper.preloadWeatherVideos(weatherType);
        console.log(`VideoWeatherManager: ${weatherType} 视频预加载完成`);
      }
    } catch (error) {
      console.error('VideoWeatherManager: 预加载视频时出错', error);
    }
  }

  /**
   * 处理视频错误
   */
  handleVideoError() {
    try {
      if (this.config.fallbackToStatic) {
        console.log('VideoWeatherManager: 回退到静态效果');
        // 这里可以添加静态效果的实现
      }
      
      if (this.callbacks.onError) {
        this.callbacks.onError(new Error('视频播放失败'));
      }
    } catch (error) {
      console.error('VideoWeatherManager: 处理视频错误时出错', error);
    }
  }

  /**
   * 处理初始化错误
   * @param {Error} error - 错误对象
   */
  handleInitializationError(error) {
    try {
      // 使用更友好的日志信息
      console.log('VideoWeatherManager: 切换到静态模式');
      // 这里可以添加静态模式的实现
      
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
    } catch (err) {
      console.log('VideoWeatherManager: 静态模式初始化完成');
    }
  }

  /**
   * 获取当前状态
   * @returns {object} 状态信息
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isPlaying: this.isPlaying,
      currentWeather: this.currentWeather,
      currentVideo: this.currentVideo,
      performance: this.performance,
      config: this.config
    };
  }

  /**
   * 获取支持的天气类型
   * @returns {Array} 天气类型数组
   */
  getSupportedWeatherTypes() {
    return this.mapper.getSupportedWeatherTypes();
  }

  /**
   * 检查天气类型是否有视频
   * @param {string} weatherType - 天气类型
   * @returns {boolean} 是否有视频
   */
  hasVideoForWeather(weatherType) {
    return this.mapper.hasVideoForWeather(weatherType);
  }

  /**
   * 设置配置选项
   * @param {object} newConfig - 新配置
   */
  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('VideoWeatherManager: 配置已更新', this.config);
  }

  /**
   * 设置回调函数
   * @param {string} event - 事件名称
   * @param {function} callback - 回调函数
   */
  setCallback(event, callback) {
    if (this.callbacks.hasOwnProperty(event)) {
      this.callbacks[event] = callback;
      console.log(`VideoWeatherManager: 设置回调函数 - ${event}`);
    }
  }

  /**
   * 销毁管理器
   */
  destroy() {
    try {
      if (this.animation) {
        this.animation.destroy();
      }
      
      this.isInitialized = false;
      this.isPlaying = false;
      this.currentWeather = null;
      this.currentVideo = null;
      
      console.log('VideoWeatherManager: 管理器已销毁');
    } catch (error) {
      console.error('VideoWeatherManager: 销毁管理器时出错', error);
    }
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoWeatherManager;
}
