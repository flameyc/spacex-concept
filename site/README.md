# SpaceX Concept Site

这是一个非官方、非商业的 SpaceX 品牌概念网站，用于设计探索，不代表 SpaceX，也未获得 SpaceX 背书。

## 打开方式

脚本采用 ES Modules，请通过本地服务器预览，不要直接用 `file://` 双击打开：

```powershell
cd E:\技术\spacex-concept
npm install
npm run dev
```

生产构建使用 `npm run build`，输出到 `dist`。

## 页面

- `index.html`：八幕沉浸式使命首页
- `vehicles.html`：运载器档案
- `missions.html`：任务架构
- `company.html`：公司理念与行动入口

首页中的 Vehicles、Missions、Company、Careers 以及各场景“了解”按钮均在当前页面打开侧滑详情窗口，不会离开原滚动位置；独立页面仍保留，便于直接访问与归档。

## 滚动动效与动态背景

- 八幕均采用“18% 进入显影 / 64% 稳定阅读 / 18% 离开淡出”的连续转场，正文、媒体和黑场遮罩共同完成接力。
- 桌面端使用温和的 `scroll-snap: proximity`；移动端不吸附；代码不拦截滚轮，也不自动滚屏。
- Starship 与 STARMIND 两幕使用 SpaceX 官方 CDN 视频，保留本地图片 poster；仅在视口内播放，并提供播放/暂停按钮。
- 页面隐藏或系统开启“减弱动态效果”时视频自动暂停，静态 poster 继续保证内容可读。

## 背景声音

- 页面默认静音，用户点击 `BGM` 后才开始播放。
- 默认曲目为 Hans Zimmer 的 `Cornfield Chase`，由项目所有者提供并确认用于本次发布；音乐版权归原权利人所有。
- 页面默认静音，用户点击 BGM 后才播放；支持循环、暂停与音量调节。
- “载入本地授权音频”仍可临时覆盖默认曲目，只在当前浏览器会话读取，不上传。
- 原创 Web Audio 声景保留为默认文件无法解码时的技术回退。

## 设计与内容边界

- 首页采用电影化滚动叙事，内页采用浅色工程编辑系统。
- 动态任务数据不在页面硬编码，相关入口指向 SpaceX 官方页面。
- STARMIND 在所有出现位置均标注 `IN DEVELOPMENT`。
- 商标和媒体的商业使用需另行取得书面授权。
- 两段官方视频同样只用于非商业概念展示；正式公开或商业使用前必须完成媒体授权审查。
