/**
 * 动画抽卡系统
 * 实现智能抽卡算法，避免连续重复
 */
class AnimationCardSystem {
  constructor() {
    this.lastPlayedVideo = null;
    this.consecutivePlays = {};
    this.animationPools = this.loadAnimationPools();
    
    console.log('AnimationCardSystem: 初始化完成');
  }

  /**
   * 加载动画池配置
   * @returns {object} 动画池配置
   */
  loadAnimationPools() {
    // 基于现有的 weather-video-mapper.js 创建动画池
    return {
      clear: {
        name: "晴天动画池",
        videos: [
          { id: "clear_001", path: "../video/tab/c/cloudy_1.webm", weight: 80, type: "normal", description: "底视角云层扑面" },
          { id: "clear_002", path: "../video/tab/c/cloudy_2.webm", weight: 15, type: "special", description: "云层穿越彩蛋" },
          { id: "clear_003", path: "../video/tab/c/cloudy_3.webm", weight: 5, type: "rare", description: "极光云层特效" },
          { id: "clear_004", path: "../video/tab/c/cloudy_4.webm", weight: 80, type: "normal", description: "云层流动" },
          { id: "clear_005", path: "../video/tab/c/cloudy_5.webm", weight: 80, type: "normal", description: "云层聚集" },
          { id: "clear_006", path: "../video/tab/c/cloudy_6.webm", weight: 80, type: "normal", description: "云层扩散" },
          { id: "clear_007", path: "../video/tab/c/cloudy_7.webm", weight: 80, type: "normal", description: "云层旋转" },
          { id: "clear_008", path: "../video/tab/c/cloudy_8.webm", weight: 80, type: "normal", description: "云层飘散" }
        ]
      },
      cloudy: {
        name: "多云动画池",
        videos: [
          { id: "cloudy_001", path: "../video/tab/c/cloudy_1.webm", weight: 80, type: "normal", description: "底视角云层扑面" },
          { id: "cloudy_002", path: "../video/tab/c/cloudy_2.webm", weight: 15, type: "special", description: "云层穿越彩蛋" },
          { id: "cloudy_003", path: "../video/tab/c/cloudy_3.webm", weight: 5, type: "rare", description: "极光云层特效" },
          { id: "cloudy_004", path: "../video/tab/c/cloudy_4.webm", weight: 80, type: "normal", description: "云层流动" },
          { id: "cloudy_005", path: "../video/tab/c/cloudy_5.webm", weight: 80, type: "normal", description: "云层聚集" },
          { id: "cloudy_006", path: "../video/tab/c/cloudy_6.webm", weight: 80, type: "normal", description: "云层扩散" },
          { id: "cloudy_007", path: "../video/tab/c/cloudy_7.webm", weight: 80, type: "normal", description: "云层旋转" },
          { id: "cloudy_008", path: "../video/tab/c/cloudy_8.webm", weight: 80, type: "normal", description: "云层飘散" }
        ]
      },
      rain: {
        name: "雨天动画池",
        videos: [
          { id: "rain_001", path: "../video/tab/r/rain_4.webm", weight: 70, type: "normal", description: "底视角雨滴扑面" },
          { id: "rain_002", path: "../video/tab/r/rain_5.webm", weight: 20, type: "special", description: "雨打玻璃效果" },
          { id: "rain_003", path: "../video/tab/r/rain_6.webm", weight: 10, type: "rare", description: "雷雨交加特效" },
          { id: "rain_004", path: "../video/tab/r/rain_7.webm", weight: 70, type: "normal", description: "雨滴密集" },
          { id: "rain_005", path: "../video/tab/r/rain_8.webm", weight: 70, type: "normal", description: "雨滴稀疏" },
          { id: "rain_006", path: "../video/tab/r/rain_9.webm", weight: 70, type: "normal", description: "雨滴斜落" },
          { id: "rain_007", path: "../video/tab/r/rain_10.webm", weight: 70, type: "normal", description: "雨滴垂直" },
          { id: "rain_008", path: "../video/tab/r/rain_11.webm", weight: 70, type: "normal", description: "雨滴飘洒" }
        ]
      },
      snow: {
        name: "雪天动画池",
        videos: [
          { id: "snow_001", path: "../video/tab/s/snow_1.webm", weight: 70, type: "normal", description: "雪花飘落" },
          { id: "snow_002", path: "../video/tab/s/snow_2.webm", weight: 20, type: "special", description: "雪花飞舞" },
          { id: "snow_003", path: "../video/tab/s/snow_3.webm", weight: 10, type: "rare", description: "暴风雪特效" },
          { id: "snow_004", path: "../video/tab/s/snow_4.webm", weight: 70, type: "normal", description: "雪花密集" },
          { id: "snow_005", path: "../video/tab/s/snow_5.webm", weight: 70, type: "normal", description: "雪花稀疏" },
          { id: "snow_006", path: "../video/tab/s/snow_6.webm", weight: 70, type: "normal", description: "雪花旋转" },
          { id: "snow_007", path: "../video/tab/s/snow_7.webm", weight: 70, type: "normal", description: "雪花飘散" },
          { id: "snow_008", path: "../video/tab/s/snow_8.webm", weight: 70, type: "normal", description: "雪花聚集" },
          { id: "snow_009", path: "../video/tab/s/snow_9.webm", weight: 70, type: "normal", description: "雪花飘洒" }
        ]
      },
      fog: {
        name: "雾天动画池",
        videos: [
          { id: "fog_001", path: "../video/tab/c/cloudy_1.webm", weight: 80, type: "normal", description: "底视角云层扑面" },
          { id: "fog_002", path: "../video/tab/c/cloudy_2.webm", weight: 15, type: "special", description: "云层穿越彩蛋" },
          { id: "fog_003", path: "../video/tab/c/cloudy_3.webm", weight: 5, type: "rare", description: "极光云层特效" },
          { id: "fog_004", path: "../video/tab/c/cloudy_4.webm", weight: 80, type: "normal", description: "云层流动" },
          { id: "fog_005", path: "../video/tab/c/cloudy_5.webm", weight: 80, type: "normal", description: "云层聚集" },
          { id: "fog_006", path: "../video/tab/c/cloudy_6.webm", weight: 80, type: "normal", description: "云层扩散" },
          { id: "fog_007", path: "../video/tab/c/cloudy_7.webm", weight: 80, type: "normal", description: "云层旋转" },
          { id: "fog_008", path: "../video/tab/c/cloudy_8.webm", weight: 80, type: "normal", description: "云层飘散" }
        ]
      },
      thunderstorm: {
        name: "雷暴动画池",
        videos: [
          { id: "thunder_001", path: "../video/tab/r/rain_6.webm", weight: 100, type: "rare", description: "雷雨交加特效" }
        ]
      }
    };
  }

  /**
   * 获取动画池
   * @param {string} weatherType - 天气类型
   * @returns {object} 动画池
   */
  getAnimationPool(weatherType) {
    const pool = this.animationPools[weatherType];
    if (!pool) {
      console.warn(`AnimationCardSystem: 未找到天气类型 ${weatherType} 的动画池，使用默认池`);
      return this.animationPools.clear || this.animationPools.cloudy;
    }
    return pool;
  }

  /**
   * 过滤可用视频（避免连续重复）
   * @param {object} pool - 动画池
   * @param {string} weatherType - 天气类型
   * @returns {array} 可用视频列表
   */
  filterAvailableVideos(pool, weatherType) {
    const lastVideo = this.lastPlayedVideo;
    const consecutiveCount = this.consecutivePlays[weatherType] || 0;
    
    console.log(`AnimationCardSystem: 过滤视频`, {
      weatherType,
      lastVideoId: lastVideo?.id,
      consecutiveCount,
      totalVideos: pool.videos.length
    });
    
    return pool.videos.filter(video => {
      // 如果连续播放3次相同视频，强制换一个
      if (video.id === lastVideo?.id && consecutiveCount >= 3) {
        console.log(`AnimationCardSystem: 跳过重复视频 ${video.id}`);
        return false;
      }
      return true;
    });
  }

  /**
   * 智能抽卡算法
   * @param {string} weatherType - 天气类型
   * @returns {object} 选中的视频
   */
  drawCard(weatherType) {
    const pool = this.getAnimationPool(weatherType);
    const availableVideos = this.filterAvailableVideos(pool, weatherType);
    
    if (availableVideos.length === 0) {
      console.warn(`AnimationCardSystem: 没有可用视频，使用池中第一个视频`);
      return pool.videos[0];
    }
    
    // 权重计算
    const totalWeight = availableVideos.reduce((sum, video) => sum + video.weight, 0);
    let random = Math.random() * totalWeight;
    
    console.log(`AnimationCardSystem: 开始抽卡`, {
      weatherType,
      availableVideos: availableVideos.length,
      totalWeight
    });
    
    for (const video of availableVideos) {
      random -= video.weight;
      if (random <= 0) {
        // 更新播放历史
        this.updatePlayHistory(weatherType, video);
        
        console.log(`AnimationCardSystem: 抽中视频`, {
          id: video.id,
          type: video.type,
          description: video.description
        });
        
        return video;
      }
    }
    
    // 兜底：返回第一个可用视频
    const fallbackVideo = availableVideos[0];
    this.updatePlayHistory(weatherType, fallbackVideo);
    
    console.log(`AnimationCardSystem: 使用兜底视频`, {
      id: fallbackVideo.id,
      type: fallbackVideo.type
    });
    
    return fallbackVideo;
  }

  /**
   * 更新播放历史
   * @param {string} weatherType - 天气类型
   * @param {object} video - 视频信息
   */
  updatePlayHistory(weatherType, video) {
    if (this.lastPlayedVideo && this.lastPlayedVideo.id === video.id) {
      this.consecutivePlays[weatherType] = (this.consecutivePlays[weatherType] || 0) + 1;
    } else {
      this.consecutivePlays[weatherType] = 1;
    }
    
    this.lastPlayedVideo = video;
    
    console.log(`AnimationCardSystem: 更新播放历史`, {
      weatherType,
      videoId: video.id,
      consecutiveCount: this.consecutivePlays[weatherType]
    });
  }

  /**
   * 重置播放历史
   */
  reset() {
    this.lastPlayedVideo = null;
    this.consecutivePlays = {};
    console.log('AnimationCardSystem: 播放历史已重置');
  }

  /**
   * 获取播放统计
   * @returns {object} 播放统计信息
   */
  getStats() {
    return {
      lastPlayedVideo: this.lastPlayedVideo,
      consecutivePlays: this.consecutivePlays,
      availablePools: Object.keys(this.animationPools)
    };
  }
}
