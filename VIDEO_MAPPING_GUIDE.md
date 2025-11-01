# AeScape 视频映射替换与按时间段扩展指南

本指南说明如何在 `video_intergration/js/weather-video-mapper.js` 中替换视频映射，以及如何启用“按天气 + 时间段”选择视频的能力。所有步骤兼容现有实现，按需增量启用。

---

## 1. 基本概念

- **映射入口文件**：`video_intergration/js/weather-video-mapper.js`
- **核心类**：`WeatherVideoMapper`
- **映射对象**：`this.videoMap`
  - 键：天气类型（如 `clear`、`cloudy`、`rain`、`snow`、`fog`、`thunderstorm`）
  - 值：包含 `videos`（候选视频数组）、`hasAlpha`、`blendMode`、`description` 等
- **新增可选字段**：`timeBuckets`
  - 结构：`{ morning: string[], day: string[], evening: string[], night: string[] }`
  - 作用：为不同时间段配置不同候选视频，未配置时自动回退到通用 `videos`

---

## 2. 替换“天气 → 视频”的映射

在 `WeatherVideoMapper` 构造函数中，编辑 `this.videoMap` 中对应天气的 `videos` 数组即可：

```javascript
// 文件：video_intergration/js/weather-video-mapper.js （片段）
this.videoMap = {
  rain: {
    videos: [
      'video/tab/r/rain_4.webm',
      'video/tab/r/rain_5.webm'
      // 在这里增删路径即可
    ],
    hasAlpha: false,
    blendMode: 'screen',
    description: '雨滴效果（screen模式）'
  },
  // ... 其他天气项
};
```

- **路径要求**：相对于项目根目录（例如 `video/tab/r/rain_4.webm`）
- **混合模式建议**：
  - 云雾类建议 `lighten`
  - 雨雪类建议 `screen`
  - 雷暴类可用 `overlay`

---

## 3. 启用“按时间段”映射（可选增强）

为目标天气项添加 `timeBuckets` 字段，即可对 `morning/day/evening/night` 四个时间段做 finer-grained 的视频选择：

```javascript
rain: {
  videos: [
    'video/tab/r/rain_6.webm',
    'video/tab/r/rain_7.webm'
  ],
  timeBuckets: {
    morning: ['video/tab/r/rain_4.webm', 'video/tab/r/rain_5.webm'],
    day: ['video/tab/r/rain_6.webm', 'video/tab/r/rain_7.webm'],
    evening: ['video/tab/r/rain_8.webm', 'video/tab/r/rain_9.webm'],
    night: ['video/tab/r/rain_10.webm', 'video/tab/r/rain_11.webm']
  },
  hasAlpha: false,
  blendMode: 'screen',
  description: '雨滴效果（screen模式）'
}
```

- 若某时间段未配置或数组为空，将自动回退到通用 `videos`。
- 内置的时间段划分：
  - `night`: 00:00–05:59、20:00–23:59
  - `morning`: 06:00–10:59
  - `day`: 11:00–16:59
  - `evening`: 17:00–19:59

---

## 4. 选择视频的两种 API（已内置）

1) 原 API：仅按天气（兼容旧逻辑）
```javascript
mapper.getVideoForWeather(weatherType, intensity = 'medium', useGlass = false, useBottomView = false)
```
- `weatherType`: 'rain' 等
- `intensity`: 'light' | 'medium' | 'heavy'（影响在候选集中的抽样位置）
- `useGlass`: 玻璃雨特效（仅雨）
- `useBottomView`: 底部视角（雨/雷暴）

2) 新 API：按天气 + 时间（小时）
```javascript
mapper.getVideoForWeatherAtTime(weatherType, hour, intensity = 'medium', useGlass = false, useBottomView = false)
```
- `hour`: 0–23，将自动映射到上述四个时间段
- 其余参数同上；若时间段未配置，会自动回退到原 API 行为

---

## 5. 一键替换到“按时间段”策略（可选）

如果你希望新标签页或视频管理器统一切换到“按时间段”策略，可在调用点将：

```javascript
// 旧（只按天气）
const info = mapper.getVideoForWeather(weatherType, intensity);
```

替换为：

```javascript
// 新（按天气 + 时间）
const hour = new Date().getHours();
const info = mapper.getVideoForWeatherAtTime(weatherType, hour, intensity);
```

- 推荐在 `video_intergration/js/VideoWeatherManager.js` 的视频选取逻辑处进行替换；
- 或者加一个配置开关（例如从 `ConfigManager` 读取 `video.useTimeBuckets`），在运行时动态选择两种策略。

---

## 6. 常见问题（FAQ）

- Q: 我只想改某个天气的素材，不想启用时间段？
  - A: 只编辑对应天气项的 `videos` 数组即可，忽略 `timeBuckets`。

- Q: 我加了 `timeBuckets` 但没生效？
  - A: 确认已使用新 API `getVideoForWeatherAtTime`；否则会走回退逻辑只读 `videos`。

- Q: 不同强度如何影响选择？
  - A: 'light' 从候选集前 1/3 取样，'heavy' 从后 1/3 取样，'medium' 在全量候选集中随机。

- Q: 路径应该怎么写？
  - A: 使用相对于项目根目录的路径（例如 `video/tab/r/rain_6.webm`）。

---

## 7. 变更检查清单

- [ ] 已在 `weather-video-mapper.js` 中修改 `this.videoMap`
- [ ] 如启用时间段：已为目标天气添加 `timeBuckets`
- [ ] 如启用时间段：调用点已替换为 `getVideoForWeatherAtTime`
- [ ] 打开 `video_intergration/newtab.html` 进行可视化检查
- [ ] 控制台无错误；视频能正常加载与切换

---

## 8. 示例：最小可用改动

```javascript
// 只替换多云素材（不启用时间段）
cloudy: {
  videos: [
    'video/tab/c/cloudy_a.webm',
    'video/tab/c/cloudy_b.webm'
  ],
  hasAlpha: true,
  blendMode: 'lighten',
  description: '多云效果（lighten模式）'
}
```

```javascript
// 为雨天启用时间段映射（保留通用 videos 作为回退）
rain: {
  videos: [
    'video/tab/r/rain_default_1.webm'
  ],
  timeBuckets: {
    morning: ['video/tab/r/rain_morning_1.webm'],
    day: ['video/tab/r/rain_day_1.webm'],
    evening: ['video/tab/r/rain_evening_1.webm'],
    night: ['video/tab/r/rain_night_1.webm']
  },
  hasAlpha: false,
  blendMode: 'screen',
  description: '雨滴效果（screen模式）'
}
```

---

如需，我可以帮你把 `VideoWeatherManager` 中的调用改为按时间段的新 API，并加配置开关，做到“随时回退”。
