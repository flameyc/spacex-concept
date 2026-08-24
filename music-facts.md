# 配乐核验与接入决策

核验日期：2026-08-24

## 曲目确认

用户提到的《星际穿越》中“麦田追逐”段落配乐是：

- 曲名：`Cornfield Chase`
- 作曲：Hans Zimmer
- 电影：`Interstellar`（2014）
- 场景：Cooper 与孩子驾车穿过玉米田追逐无人机
- 官方试听：WaterTower Music 官方 YouTube
  - https://www.youtube.com/watch?v=JuSsvM8B4Jc

## 授权边界

`Cornfield Chase` 是受版权保护的电影原声。项目所有者随后提供本地文件 `E:\Projects\音乐\02 Cornfield Chase.m4a`，并要求将其用于本次网站发布；音乐版权仍归原权利人所有。

## 最终接入方式

1. 网站默认使用项目所有者提供的 `Cornfield Chase` 文件，必须由用户点击后播放，并提供循环、暂停与音量控制。
2. 播放必须由用户主动启动；提供暂停、音量与状态提示，并尊重浏览器自动播放政策。
3. 保留“载入本地授权音频”入口：用户可以临时覆盖默认曲目，仅在当前浏览器会话播放，不上传。
4. 界面提供 WaterTower Music 官方试听链接，用于确认参考曲目；不将 YouTube 音频当作网站后台音源。
