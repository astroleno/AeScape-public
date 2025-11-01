/**
 * AeScape 视频资源管理器
 * 智能管理视频预加载、缓存和资源释放，优化内存使用
 */

class VideoResourceManager {
  constructor(options = {}) {
    // 配置选项
    this.config = {
      maxCacheSize: options.maxCacheSize || 3, // 最大缓存视频数量
      preloadDistance: options.preloadDistance || 2, // 预加载距离
      memoryThreshold: options.memoryThreshold || 0.8, // 内存使用率阈值
      enableIntelligentPreload: options.enableIntelligentPreload !== false,
      enableResourcePool: options.enableResourcePool !== false
    };
    
    // 资源池
    this.videoCache = new Map(); // 视频缓存
    this.usageStats = new Map(); // 使用统计
    this.loadingPromises = new Map(); // 加载中的Promise
    
    // 状态
    this.totalCacheSize = 0;
    this.lastCleanupTime = 0;
    this.cleanupInterval = 5 * 60 * 1000; // 5分钟清理一次
    
    // 性能监控
    this.performanceMetrics = {
      cacheHits: 0,
      cacheMisses: 0,
      resourcesEvicted: 0,
      memoryUsage: 0
    };
    
    this.init();
  }

  /**
   * 初始化资源管理器
   */
  init() {
    try {
      console.log('[VideoResourceManager] 视频资源管理器初始化');
      
      // 启动定期清理
      this.startPeriodicCleanup();
      
      // 监听内存压力事件
      if ('memory' in performance && performance.memory) {
        this.startMemoryMonitoring();
      }
      
    } catch (error) {
      console.error('[VideoResourceManager] 初始化失败:', error);
    }
  }

  /**
   * 智能预加载视频
   * @param {string} videoPath - 视频路径
   * @param {object} metadata - 视频元数据
   * @returns {Promise<HTMLVideoElement>}
   */
  async preloadVideo(videoPath, metadata = {}) {
    try {
      // 检查是否已在缓存中
      if (this.videoCache.has(videoPath)) {
        this.recordCacheHit(videoPath);
        return this.videoCache.get(videoPath);
      }
      
      // 检查是否正在加载
      if (this.loadingPromises.has(videoPath)) {
        return await this.loadingPromises.get(videoPath);
      }
      
      // 检查内存使用情况
      await this.checkMemoryUsage();
      
      // 开始加载视频
      const loadingPromise = this.loadVideoElement(videoPath, metadata);
      this.loadingPromises.set(videoPath, loadingPromise);
      
      try {
        const video = await loadingPromise;
        
        // 添加到缓存
        this.addToCache(videoPath, video, metadata);
        
        // 清理加载Promise
        this.loadingPromises.delete(videoPath);
        
        return video;
        
      } catch (error) {
        this.loadingPromises.delete(videoPath);
        throw error;
      }
      
    } catch (error) {
      console.error('[VideoResourceManager] 预加载视频失败:', videoPath, error);
      this.recordCacheMiss(videoPath);
      throw error;
    }
  }

  /**
   * 加载视频元素
   * @param {string} videoPath - 视频路径
   * @param {object} metadata - 元数据
   * @returns {Promise<HTMLVideoElement>}
   */
  async loadVideoElement(videoPath, metadata) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      
      // 添加元数据
      video._aescape_metadata = {
        ...metadata,
        loadTime: Date.now(),
        lastUsed: Date.now()
      };
      
      const onCanPlay = () => {
        cleanup();
        console.log(`[VideoResourceManager] 视频预加载完成: ${videoPath}`);
        resolve(video);
      };
      
      const onError = (error) => {
        cleanup();
        console.error(`[VideoResourceManager] 视频加载失败: ${videoPath}`, error);
        reject(new Error(`视频加载失败: ${videoPath}`));
      };
      
      const onTimeout = () => {
        cleanup();
        reject(new Error(`视频加载超时: ${videoPath}`));
      };
      
      const cleanup = () => {
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('error', onError);
        clearTimeout(timeoutId);
      };
      
      // 设置事件监听器
      video.addEventListener('canplay', onCanPlay, { once: true });
      video.addEventListener('error', onError, { once: true });
      
      // 设置超时
      const timeoutId = setTimeout(onTimeout, 30000); // 30秒超时
      
      // 开始加载
      video.src = videoPath;
    });
  }

  /**
   * 添加到缓存
   * @param {string} videoPath - 视频路径
   * @param {HTMLVideoElement} video - 视频元素
   * @param {object} metadata - 元数据
   */
  addToCache(videoPath, video, metadata) {
    try {
      // 检查缓存大小限制
      if (this.videoCache.size >= this.config.maxCacheSize) {
        this.evictLeastUsed();
      }
      
      // 添加到缓存
      this.videoCache.set(videoPath, video);
      
      // 更新使用统计
      this.usageStats.set(videoPath, {
        uses: 0,
        lastUsed: Date.now(),
        size: this.estimateVideoSize(video),
        metadata
      });
      
      // 更新总缓存大小
      this.updateTotalCacheSize();
      
      console.log(`[VideoResourceManager] 视频已缓存: ${videoPath} (缓存数量: ${this.videoCache.size})`);
      
    } catch (error) {
      console.error('[VideoResourceManager] 添加到缓存失败:', error);
    }
  }

  /**
   * 清理最少使用的视频
   */
  evictLeastUsed() {
    try {
      if (this.videoCache.size === 0) return;
      
      // 找到最少使用的视频
      let leastUsedPath = null;
      let leastUsedScore = Infinity;
      
      for (const [path, stats] of this.usageStats.entries()) {
        // 计算使用评分（使用次数 + 时间权重）
        const timeFactor = (Date.now() - stats.lastUsed) / (1000 * 60 * 60); // 小时
        const score = stats.uses - timeFactor;
        
        if (score < leastUsedScore) {
          leastUsedScore = score;
          leastUsedPath = path;
        }
      }
      
      if (leastUsedPath) {
        this.removeFromCache(leastUsedPath);
        this.performanceMetrics.resourcesEvicted++;
        console.log(`[VideoResourceManager] 清理最少使用的视频: ${leastUsedPath}`);
      }
      
    } catch (error) {
      console.error('[VideoResourceManager] 清理缓存失败:', error);
    }
  }

  /**
   * 从缓存中移除视频
   * @param {string} videoPath - 视频路径
   */
  removeFromCache(videoPath) {
    try {
      const video = this.videoCache.get(videoPath);
      if (video) {
        // 清理视频资源
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      
      // 从缓存中移除
      this.videoCache.delete(videoPath);
      this.usageStats.delete(videoPath);
      
      // 更新总缓存大小
      this.updateTotalCacheSize();
      
    } catch (error) {
      console.error('[VideoResourceManager] 移除缓存失败:', error);
    }
  }

  /**
   * 获取缓存的视频
   * @param {string} videoPath - 视频路径
   * @returns {HTMLVideoElement|null}
   */
  getCachedVideo(videoPath) {
    const video = this.videoCache.get(videoPath);
    if (video) {
      this.recordCacheHit(videoPath);
      return video;
    }
    
    this.recordCacheMiss(videoPath);
    return null;
  }

  /**
   * 记录缓存命中
   * @param {string} videoPath - 视频路径
   */
  recordCacheHit(videoPath) {
    this.performanceMetrics.cacheHits++;
    
    const stats = this.usageStats.get(videoPath);
    if (stats) {
      stats.uses++;
      stats.lastUsed = Date.now();
    }
  }

  /**
   * 记录缓存未命中
   * @param {string} videoPath - 视频路径
   */
  recordCacheMiss(videoPath) {
    this.performanceMetrics.cacheMisses++;
  }

  /**
   * 估算视频大小
   * @param {HTMLVideoElement} video - 视频元素
   * @returns {number} 估算的大小（字节）
   */
  estimateVideoSize(video) {
    try {
      // 基于视频时长和分辨率的粗略估算
      const duration = video.duration || 10; // 默认10秒
      const width = video.videoWidth || 1920;
      const height = video.videoHeight || 1080;
      
      // 粗略估算：每秒每像素约0.1字节（压缩后）
      return duration * width * height * 0.1;
      
    } catch (error) {
      return 50 * 1024 * 1024; // 默认50MB
    }
  }

  /**
   * 更新总缓存大小
   */
  updateTotalCacheSize() {
    let totalSize = 0;
    for (const stats of this.usageStats.values()) {
      totalSize += stats.size;
    }
    this.totalCacheSize = totalSize;
    this.performanceMetrics.memoryUsage = totalSize;
  }

  /**
   * 检查内存使用情况
   */
  async checkMemoryUsage() {
    try {
      if ('memory' in performance && performance.memory) {
        const memInfo = performance.memory;
        const usageRatio = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
        
        if (usageRatio > this.config.memoryThreshold) {
          console.log('[VideoResourceManager] 内存使用率过高，开始清理缓存');
          await this.forcedCleanup();
        }
      }
    } catch (error) {
      console.error('[VideoResourceManager] 内存检查失败:', error);
    }
  }

  /**
   * 强制清理缓存
   */
  async forcedCleanup() {
    try {
      // 清理一半的缓存
      const targetSize = Math.floor(this.videoCache.size / 2);
      const pathsToRemove = [];
      
      // 按使用评分排序，移除评分最低的
      const sortedPaths = Array.from(this.usageStats.entries())
        .sort(([, a], [, b]) => {
          const scoreA = a.uses - (Date.now() - a.lastUsed) / (1000 * 60 * 60);
          const scoreB = b.uses - (Date.now() - b.lastUsed) / (1000 * 60 * 60);
          return scoreA - scoreB;
        })
        .slice(0, targetSize)
        .map(([path]) => path);
      
      for (const path of sortedPaths) {
        this.removeFromCache(path);
      }
      
      console.log(`[VideoResourceManager] 强制清理完成，移除了 ${sortedPaths.length} 个视频`);
      
    } catch (error) {
      console.error('[VideoResourceManager] 强制清理失败:', error);
    }
  }

  /**
   * 启动定期清理
   */
  startPeriodicCleanup() {
    setInterval(() => {
      this.performPeriodicCleanup();
    }, this.cleanupInterval);
  }

  /**
   * 执行定期清理
   */
  performPeriodicCleanup() {
    try {
      const now = Date.now();
      const maxAge = 30 * 60 * 1000; // 30分钟
      const pathsToRemove = [];
      
      // 清理长时间未使用的视频
      for (const [path, stats] of this.usageStats.entries()) {
        if (now - stats.lastUsed > maxAge) {
          pathsToRemove.push(path);
        }
      }
      
      for (const path of pathsToRemove) {
        this.removeFromCache(path);
      }
      
      if (pathsToRemove.length > 0) {
        console.log(`[VideoResourceManager] 定期清理完成，移除了 ${pathsToRemove.length} 个过期视频`);
      }
      
    } catch (error) {
      console.error('[VideoResourceManager] 定期清理失败:', error);
    }
  }

  /**
   * 启动内存监控
   */
  startMemoryMonitoring() {
    setInterval(() => {
      this.checkMemoryUsage();
    }, 30000); // 每30秒检查一次
  }

  /**
   * 获取性能指标
   * @returns {object} 性能指标
   */
  getPerformanceMetrics() {
    const cacheTotal = this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses;
    const hitRate = cacheTotal > 0 ? (this.performanceMetrics.cacheHits / cacheTotal * 100).toFixed(2) : 0;
    
    return {
      ...this.performanceMetrics,
      cacheSize: this.videoCache.size,
      totalCacheSize: this.totalCacheSize,
      hitRate: `${hitRate}%`,
      timestamp: Date.now()
    };
  }

  /**
   * 清理所有资源
   */
  destroy() {
    try {
      console.log('[VideoResourceManager] 清理所有视频资源');
      
      // 清理所有缓存的视频
      for (const [path] of this.videoCache.entries()) {
        this.removeFromCache(path);
      }
      
      // 清理加载中的Promise
      this.loadingPromises.clear();
      
      console.log('[VideoResourceManager] 资源清理完成');
      
    } catch (error) {
      console.error('[VideoResourceManager] 资源清理失败:', error);
    }
  }
}

// 全局实例
if (typeof window !== 'undefined') {
  window.AeScapeVideoResourceManager = VideoResourceManager;
}
