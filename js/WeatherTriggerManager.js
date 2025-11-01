/**
 * 天气触发管理器
 * 实现双触发路由：天气变化触发 + 持续时间触发
 */
class WeatherTriggerManager {
  constructor() {
    this.lastWeatherState = null;
    this.lastChangeTime = 0;
    this.lastTriggerTime = 0;
    this.weatherChangeThreshold = 5 * 60 * 1000; // 5分钟变化阈值
    this.durationThreshold = 30 * 60 * 1000; // 30分钟持续阈值
    
    console.log('WeatherTriggerManager: 初始化完成');
  }

  /**
   * 检查天气变化触发
   * @param {string} currentWeather - 当前天气类型
   * @returns {object} 触发结果
   */
  checkWeatherChange(currentWeather) {
    const hasChanged = this.lastWeatherState !== currentWeather;
    const timeSinceLastChange = Date.now() - this.lastChangeTime;
    
    console.log(`WeatherTriggerManager: 检查天气变化`, {
      currentWeather,
      lastWeather: this.lastWeatherState,
      hasChanged,
      timeSinceLastChange: Math.round(timeSinceLastChange / 1000) + 's'
    });
    
    if (hasChanged && timeSinceLastChange > this.weatherChangeThreshold) {
      this.lastWeatherState = currentWeather;
      this.lastChangeTime = Date.now();
      this.lastTriggerTime = Date.now();
      
      console.log('WeatherTriggerManager: 天气变化触发成功');
      return { shouldTrigger: true, reason: 'weather_change' };
    }
    
    return { shouldTrigger: false, reason: 'no_change' };
  }

  /**
   * 检查持续时间触发
   * @param {string} currentWeather - 当前天气类型
   * @returns {object} 触发结果
   */
  checkDurationTrigger(currentWeather) {
    const timeSinceLastTrigger = Date.now() - this.lastTriggerTime;
    
    console.log(`WeatherTriggerManager: 检查持续时间触发`, {
      currentWeather,
      timeSinceLastTrigger: Math.round(timeSinceLastTrigger / 1000) + 's',
      threshold: Math.round(this.durationThreshold / 1000) + 's'
    });
    
    if (timeSinceLastTrigger > this.durationThreshold) {
      this.lastTriggerTime = Date.now();
      
      console.log('WeatherTriggerManager: 持续时间触发成功');
      return { shouldTrigger: true, reason: 'duration_trigger' };
    }
    
    return { shouldTrigger: false, reason: 'too_soon' };
  }

  /**
   * 检查是否应该触发动画
   * @param {string} currentWeather - 当前天气类型
   * @returns {object} 触发结果
   */
  shouldTriggerAnimation(currentWeather) {
    // 先检查天气变化触发
    const weatherChangeResult = this.checkWeatherChange(currentWeather);
    if (weatherChangeResult.shouldTrigger) {
      return weatherChangeResult;
    }
    
    // 再检查持续时间触发
    const durationResult = this.checkDurationTrigger(currentWeather);
    if (durationResult.shouldTrigger) {
      return durationResult;
    }
    
    return { shouldTrigger: false, reason: 'no_trigger' };
  }

  /**
   * 重置触发状态
   */
  reset() {
    this.lastWeatherState = null;
    this.lastChangeTime = 0;
    this.lastTriggerTime = 0;
    console.log('WeatherTriggerManager: 状态已重置');
  }

  /**
   * 获取当前状态
   * @returns {object} 当前状态信息
   */
  getStatus() {
    return {
      lastWeatherState: this.lastWeatherState,
      lastChangeTime: this.lastChangeTime,
      lastTriggerTime: this.lastTriggerTime,
      weatherChangeThreshold: this.weatherChangeThreshold,
      durationThreshold: this.durationThreshold
    };
  }
}
