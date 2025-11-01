/**
 * 天景 AeScape - 视频开幕动画模块
 * 独立的视频播放和过渡效果管理
 * 集成双层视频播放和增强效果
 * 
 * 功能特性：
 * - 精确的基于视频时长的过渡控制
 * - 支持Alpha通道视频的平滑过渡
 * - 双层视频播放（清晰层+光晕层）
 * - 视频增强效果（基于 advice.md）
 * - 模块化设计，易于集成
 * - 完整的错误处理和状态管理
 */

class VideoIntroAnimation {
  constructor(options = {}) {
    this.videoContainer = null;
    this.video = null;
    this.videoCore = null;
    this.videoGlow = null;
    this.vignette = null;
    this.isInitialized = false;
    this.isPlaying = false;
    this.useDoubleLayer = false; // 确定使用单层模式
    
    // 配置选项
    this.config = {
      containerId: options.containerId || 'intro-video-container',
      videoId: options.videoId || 'intro-video',
      autoPlay: options.autoPlay !== false, // 默认自动播放
      duration: options.duration || 1500, // 播放时长（毫秒）
      enhanceEffects: options.enhanceEffects !== false, // 默认启用增强效果
      onStart: options.onStart || null,
      onEnd: options.onEnd || null,
      onError: options.onError || null,
      onProgress: options.onProgress || null
    };
    
    // 帧循环控制（用于更平滑的淡出）
    this._rafId = null;
    this._tick = null;
    
    this.init();
  }

  init() {
    this.videoContainer = document.getElementById(this.config.containerId);
    
    if (!this.videoContainer) {
      console.warn('VideoIntroAnimation: Video container not found');
      return;
    }

    // 创建双层视频结构
    this.createDoubleLayerStructure();
    
    this.setupEventListeners();
    this.isInitialized = true;
    
    // 确保初始化时tab内容可见
    this.showTabContent(1);
    
    console.log('VideoIntroAnimation: 初始化完成');
  }

  /**
   * 创建双层视频播放结构
   */
  createDoubleLayerStructure() {
    try {
      // 清空容器
      this.videoContainer.innerHTML = '';
      
      // 创建黑幕层作为页面背景
      this.blackOverlay = document.createElement('div');
      this.blackOverlay.className = 'black-overlay';
      document.body.appendChild(this.blackOverlay);
      
      // 创建视频舞台
      const videoStage = document.createElement('div');
      videoStage.className = 'video-stage';
      
      if (this.useDoubleLayer) {
        // 创建清晰层视频
        this.videoCore = document.createElement('video');
        this.videoCore.className = 'intro-video fx-core';
        this.videoCore.muted = true;
        this.videoCore.playsInline = true;
        this.videoCore.loop = false; // 禁用循环播放
        
        // 创建光晕层视频
        this.videoGlow = document.createElement('video');
        this.videoGlow.className = 'intro-video fx-glow';
        this.videoGlow.muted = true;
        this.videoGlow.playsInline = true;
        this.videoGlow.loop = false; // 禁用循环播放
        
        // 添加到舞台
        videoStage.appendChild(this.videoCore);
        videoStage.appendChild(this.videoGlow);
        
        // 设置主视频引用
        this.video = this.videoCore;
        
      } else {
        // 单层视频模式
        this.video = document.createElement('video');
        this.video.className = 'intro-video';
        this.video.muted = true;
        this.video.playsInline = true;
        this.video.loop = false; // 禁用循环播放
        
        videoStage.appendChild(this.video);
      }
      
      // 创建径向渐晕效果
      if (this.config.enhanceEffects) {
        this.vignette = document.createElement('div');
        this.vignette.className = 'vignette';
        videoStage.appendChild(this.vignette);
      }
      
      // 添加到容器
      this.videoContainer.appendChild(videoStage);
      
      console.log('VideoIntroAnimation: 双层视频结构创建完成');
      
    } catch (error) {
      console.error('VideoIntroAnimation: 创建双层视频结构失败', error);
      // 回退到单层模式
      this.useDoubleLayer = false;
      this.createSingleLayerStructure();
    }
  }

  /**
   * 创建单层视频结构（回退模式）
   */
  createSingleLayerStructure() {
    try {
      this.videoContainer.innerHTML = '';
      
      // 创建黑幕层作为页面背景
      this.blackOverlay = document.createElement('div');
      this.blackOverlay.className = 'black-overlay';
      document.body.appendChild(this.blackOverlay);
      
      // 创建视频舞台
      const videoStage = document.createElement('div');
      videoStage.className = 'video-stage';
      
      this.video = document.createElement('video');
      this.video.className = 'intro-video';
      this.video.muted = true;
      this.video.playsInline = true;
      this.video.loop = false; // 禁用循环播放
      
      videoStage.appendChild(this.video);
      
      // 添加到容器
      this.videoContainer.appendChild(videoStage);
      
      console.log('VideoIntroAnimation: 单层视频结构创建完成');
      
    } catch (error) {
      console.error('VideoIntroAnimation: 创建单层视频结构失败', error);
    }
  }

  setupEventListeners() {
    // 视频可以播放时的处理
    this.video.addEventListener('canplay', () => {
      console.log('VideoIntroAnimation: 视频可以播放');
      if (this.config.onStart) this.config.onStart();
    });

    // 视频播放结束后的处理
    this.video.addEventListener('ended', () => {
      console.log('VideoIntroAnimation: 视频播放结束');
      this.hideVideo();
      if (this.config.onEnd) this.config.onEnd();
    });

    // 视频加载错误处理
    this.video.addEventListener('error', (e) => {
      console.error('VideoIntroAnimation: 视频加载错误', e);
      this.hideVideo();
      if (this.config.onError) this.config.onError(e);
    });

    // 视频播放进度监听（仅用于回调，不用于驱动动画）
    this.video.addEventListener('timeupdate', () => {
      if (this.config.onProgress) {
        this.config.onProgress(this.video.currentTime, this.video.duration);
      }
    });

    // 双层视频同步
    if (this.useDoubleLayer && this.videoGlow) {
      this.video.addEventListener('play', () => {
        this.videoGlow.play().catch(e => console.warn('VideoIntroAnimation: 光晕层播放失败', e));
      });
      
      this.video.addEventListener('pause', () => {
        this.videoGlow.pause();
      });
      
      this.video.addEventListener('seeked', () => {
        this.videoGlow.currentTime = this.video.currentTime;
      });
    }
  }

  updateOpacity() {
    if (!this.video || !this.isPlaying) return;
    
    const currentTime = this.video.currentTime;
    const duration = this.video.duration; // 秒
    
    if (duration > 0) {
      const progress = currentTime / duration;
      
      // 固定最后0.5s用于淡出
      const fadeWindowSec = Math.min(0.5, duration);
      const fadeStartProgress = (duration - fadeWindowSec) / duration; // 如: 1 - 0.5/duration
      
      // 确定使用晚消失模式
      const bgTimingMode = 'late';
      
      // 阶段1：视频在黑幕背景上播放，tab内容隐藏
      if (progress < 0.5) {
        // 视频容器保持不透明，让视频可见
        this.videoContainer.style.opacity = 1;
        // 黑幕作为背景，但不遮挡视频
        if (this.blackOverlay) {
          this.blackOverlay.style.opacity = 1;
        }
        this.videoContainer.classList.remove('video-ready');
        // tab内容保持隐藏
        this.hideTabContent();
      }
      // 阶段2：50% 到 淡出开始 前，黑幕背景逐渐消失，tab内容显现
      else if (progress >= 0.5 && progress < fadeStartProgress) {
        this.videoContainer.style.opacity = 1;
        this.videoContainer.classList.add('video-ready');
        
        // 晚消失模式：黑幕保持到淡出开始
        const bgOpacity = 1;
        
        // 控制黑幕背景透明度
        if (this.blackOverlay) {
          this.blackOverlay.style.opacity = bgOpacity;
        }
        
        // tab内容保持隐藏，直到淡出阶段
        this.showTabContent(0);
      }
      // 阶段3：最后0.5s做缓出淡出
      else {
        const fadeProgress = (progress - fadeStartProgress) / (1 - fadeStartProgress); // 0 → 1
        const clamped = Math.min(Math.max(fadeProgress, 0), 1);
        const eased = 1 - Math.pow(1 - clamped, 2); // ease-out
        const opacity = 1 - eased;
        this.videoContainer.style.opacity = opacity;
        
        // 晚消失模式：黑幕比视频晚消失，保持黑色
        if (this.blackOverlay) {
          this.blackOverlay.style.opacity = 1;
        }
        
        // glow层在最后0.5s做更快的衰减，避免抬亮黑色
        if (this.videoGlow) {
          const glowOpacity = Math.max(0, 1 - fadeProgress * 2); // glow层衰减更快
          this.videoGlow.style.opacity = glowOpacity;
        }
        
        // tab内容在淡出阶段完全显示
        this.showTabContent(1);
        
        // 云层淡出期：切换到screen模式
        this.handleCloudFadePhase(fadeProgress);
        
        if (opacity <= 0.02) {
          this.hideVideo();
        }
      }
    }
  }
  
  // 隐藏tab内容（通过黑幕遮挡）
  hideTabContent() {
    if (this.blackOverlay) {
      this.blackOverlay.style.opacity = 1;
    }
  }
  
  // 显示tab内容（通过黑幕透明度控制）
  showTabContent(progress) {
    if (this.blackOverlay) {
      // 使用缓入曲线让内容显现更自然
      const easedProgress = 1 - Math.pow(1 - progress, 2); // ease-out
      this.blackOverlay.style.opacity = 1 - easedProgress;
    }
  }
  
  // 处理云层淡出期
  handleCloudFadePhase(fadeProgress) {
    if (!this.video) return;
    
    // 检查是否是云层系天气
    const isCloudyWeather = this.videoContainer.classList.contains('cloudy-effects') ||
                           this.videoContainer.classList.contains('clear-effects') ||
                           this.videoContainer.classList.contains('fog-effects');
    
    if (isCloudyWeather && fadeProgress > 0.3) {
      // 在淡出后期（30%以上）切换到screen模式
      this.videoContainer.classList.add('cloudy-fade-phase');
    } else {
      this.videoContainer.classList.remove('cloudy-fade-phase');
    }
  }

  /**
   * 设置视频源
   * @param {string} src - 视频源路径
   */
  setVideoSource(src) {
    try {
      if (!src) {
        console.warn('VideoIntroAnimation: 视频源为空');
        return false;
      }
      
      console.log('VideoIntroAnimation: 设置视频源', src);
      
      // 停止当前播放的视频
      if (this.video) {
        this.video.pause();
        this.video.currentTime = 0;
      }
      if (this.videoGlow) {
        this.videoGlow.pause();
        this.videoGlow.currentTime = 0;
      }
      
      // 设置主视频源
      this.video.src = src;
      
      // 设置光晕层视频源
      if (this.useDoubleLayer && this.videoGlow) {
        this.videoGlow.src = src;
        
        // 设置光晕层播放速率和偏移
        this.videoGlow.playbackRate = 0.85;
        this.videoGlow.currentTime = 0.03; // 约一帧偏移，制造微残影
      }
      
      console.log('VideoIntroAnimation: 视频源设置完成', src);
      return true;
      
    } catch (error) {
      console.error('VideoIntroAnimation: 设置视频源失败', error);
      return false;
    }
  }

  hideVideo() {
    // 不隐藏容器，而是设置为透明，这样背景界面可以显示
    this.videoContainer.style.opacity = 0;
    this.videoContainer.style.pointerEvents = 'none';
    this.isPlaying = false;
    
    // 停止逐帧更新
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
      this._tick = null;
    }
    
    // 停止视频播放
    if (this.video) {
      this.video.pause();
      this.video.currentTime = 0;
    }
    if (this.videoGlow) {
      this.videoGlow.pause();
      this.videoGlow.currentTime = 0;
    }
    
    // 确保tab内容完全显示
    this.showTabContent(1);
    
    console.log('VideoIntroAnimation: 视频隐藏，背景界面可见');
  }

  play() {
    if (!this.isInitialized) {
      console.warn('VideoIntroAnimation: 模块未初始化');
      return;
    }

    this.isPlaying = true;
    this.videoContainer.style.display = 'flex';
    this.videoContainer.style.opacity = 1;
    this.videoContainer.style.pointerEvents = 'auto';
    this.videoContainer.classList.remove('video-ready', 'fade-out');
    
    // 确保开始时黑幕层可见
    if (this.blackOverlay) {
      this.blackOverlay.style.opacity = 1;
    }
    
    // 开始时隐藏tab内容
    this.hideTabContent();
    
    // 重置视频到开始位置
    this.video.currentTime = 0;
    if (this.videoGlow) {
      this.videoGlow.currentTime = 0;
      this.videoGlow.style.opacity = 1; // 重置glow层透明度
    }

    // 确保视频自动播放，但不循环
    this.video.loop = false; // 禁用循环播放
    if (this.videoGlow) {
      this.videoGlow.loop = false; // 禁用循环播放
    }

    this.video.play().catch(error => {
      console.warn('VideoIntroAnimation: 视频自动播放失败', error);
      this.hideVideo();
    });
    
    // 启动逐帧更新以获得平滑淡出
    if (!this._rafId) {
      this._tick = this.animationFrameTick.bind(this);
      this._rafId = requestAnimationFrame(this._tick);
    }
    
    console.log('VideoIntroAnimation: 开始播放视频，初始黑色背景');
  }

  stop() {
    if (this.video) {
      this.video.pause();
      this.video.currentTime = 0;
    }
    if (this.videoGlow) {
      this.videoGlow.pause();
      this.videoGlow.currentTime = 0;
    }
    this.hideVideo();
  }

  pause() {
    if (this.video) {
      this.video.pause();
    }
    if (this.videoGlow) {
      this.videoGlow.pause();
    }
    this.isPlaying = false;
    // 停止逐帧更新
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
      this._tick = null;
    }
  }

  resume() {
    if (this.video) {
      this.video.play();
      this.isPlaying = true;
      // 恢复逐帧更新
      if (!this._rafId) {
        this._tick = this.animationFrameTick.bind(this);
        this._rafId = requestAnimationFrame(this._tick);
      }
    }
  }

  /**
   * 切换双层/单层模式
   * @param {boolean} useDouble - 是否使用双层
   */
  toggleDoubleLayer(useDouble) {
    if (this.useDoubleLayer !== useDouble) {
      this.useDoubleLayer = useDouble;
      this.createDoubleLayerStructure();
      this.setupEventListeners();
      console.log('VideoIntroAnimation: 切换视频层模式', useDouble ? '双层' : '单层');
    }
  }

  /**
   * 切换增强效果
   * @param {boolean} enable - 是否启用增强效果
   */
  toggleEnhanceEffects(enable) {
    this.config.enhanceEffects = enable;
    
    if (enable && !this.vignette) {
      // 添加渐晕效果
      const videoStage = this.videoContainer.querySelector('.video-stage');
      if (videoStage) {
        this.vignette = document.createElement('div');
        this.vignette.className = 'vignette';
        videoStage.appendChild(this.vignette);
      }
    } else if (!enable && this.vignette) {
      // 移除渐晕效果
      this.vignette.remove();
      this.vignette = null;
    }
    
    console.log('VideoIntroAnimation: 增强效果', enable ? '启用' : '禁用');
  }

  // 获取当前状态
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isPlaying: this.isPlaying,
      useDoubleLayer: this.useDoubleLayer,
      enhanceEffects: this.config.enhanceEffects,
      currentTime: this.video ? this.video.currentTime : 0,
      duration: this.video ? this.video.duration : 0,
      progress: this.video && this.video.duration > 0 ? 
        (this.video.currentTime / this.video.duration) * 100 : 0
    };
  }

  // 设置配置选项
  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  // 销毁模块
  destroy() {
    try {
      // 停止所有定时器和动画帧
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }
      
      if (this.playTimer) {
        clearTimeout(this.playTimer);
        this.playTimer = null;
      }
      
      // 清理视频资源
      if (this.video) {
        this.video.pause();
        this.video.src = ''; // 释放视频资源
        this.video.load(); // 确保资源释放
        
        // 移除所有事件监听器
        const events = ['canplay', 'ended', 'error', 'timeupdate', 'loadstart', 'loadeddata'];
        events.forEach(event => {
          this.video.removeEventListener(event, this.eventHandlers[event]);
        });
        
        this.video = null;
      }
      
      if (this.videoGlow) {
        this.videoGlow.pause();
        this.videoGlow.src = '';
        this.videoGlow.load();
        this.videoGlow = null;
      }
      
      // 清理DOM元素
      if (this.blackOverlay && this.blackOverlay.parentNode) {
        this.blackOverlay.parentNode.removeChild(this.blackOverlay);
        this.blackOverlay = null;
      }
      
      // 清理容器引用
      if (this.videoContainer) {
        this.videoContainer.innerHTML = ''; // 清空所有子元素
        this.videoContainer = null;
      }
      
      // 重置状态
      this.hideVideo();
      this.isInitialized = false;
      this.isPlaying = false;
      this.eventHandlers = null;
      
      console.log('VideoIntroAnimation: 模块已完全销毁');
    } catch (error) {
      console.error('VideoIntroAnimation: 销毁过程中出错', error);
    }
  }

  animationFrameTick() {
    if (!this.isPlaying) {
      this._rafId = null;
      this._tick = null;
      return;
    }
    this.updateOpacity();
    this._rafId = requestAnimationFrame(this._tick || this.animationFrameTick.bind(this));
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoIntroAnimation;
}