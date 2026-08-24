# SpaceX 非官方概念站 · 三方向共同设计规格

## 项目与目标

这是一个可在本地直接打开的 SpaceX 高保真网站概念原型，方法参考 GOOSE PLANET 案例，但不复制其暖色疗愈美术。三个方向必须使用同一份真实内容、同一批 SpaceX 官方资产和同一法律标注，只改变设计诠释、布局骨架与视觉语法，保证用户能够进行有效横向比较。本阶段交付三份独立的单文件 HTML 与桌面截图；方向选定后才扩展成完整八幕滚动体验、响应式移动版和常规信息入口。

## 目标受众与场景

受众包括公众与航天爱好者、潜在发射/连接/政府与 AI 基础设施客户、求职者和投资者。首屏必须在 5 秒内建立 SpaceX 识别度与“Making life multiplanetary”使命；继续浏览时必须把宏大愿景落到 Starship、Falcon、Dragon、Starlink、STARMIND 等真实能力与研发状态。页面既要适合作品集展示，也要像一个有真实企业信息责任的官网概念，而不是电影海报或科技粒子 Demo。

## 共同内容层级

1. 固定或明确可用的主导航：Vehicles / Human Spaceflight / Starlink / Starshield / SpaceXAI / Company / Careers / Investors。
2. 首屏：真实 SpaceX Logo、`MAKING LIFE MULTIPLANETARY`、一句短说明、主行动 `ENTER THE MISSION`。
3. 工程证据：`SPACE / CONNECTIVITY / AI` 三条业务主轴，以及 Starship 为完全重复使用而设计、STARMIND 为 `IN DEVELOPMENT` 的清晰状态。
4. 路径预览：Starship / Falcon / Dragon / Starlink / STARMIND / Mars & Beyond。
5. 页尾必须有 `UNOFFICIAL CONCEPT / NOT AFFILIATED WITH SPACEX`；不得暗示官方背书。

## 情感基调

工业精确、克制史诗、真实影像、可验证可信、人类尺度。禁止通用深蓝 + 紫青霓虹、无意义粒子星空、装饰性数据、emoji 图标、圆角 SaaS 卡片墙和手画火箭。视觉冲击应来自官方摄影、版式比例、光线与结构，而不是堆滤镜。正文不小于 14px，辅助标签不小于 12px；主要正文对比度目标不低于 4.5:1。

## 输出格式与尺寸

- 每个方向：一个完整纯 HTML/CSS 单文件，可通过本地 `file://` 打开；允许轻量无依赖 JavaScript，但本阶段不制作复杂滚动动画。
- HTML 保存到 `design-demos/`，文件名分别描述方向。
- 对比截图统一为 1440×900，首屏必须在该尺寸构图完整。
- HTML 必须响应式，在 390×844 视口不横向溢出；移动端可简化导航和构图。
- 三个方向必须使用结构上不同的导航、首屏构图或内容组织，不能只换颜色和字体。

## 真实资产

- 深底 Logo：`../assets/spacex-brand/spacex-logo-light.svg`
- 浅底 Logo：`../assets/spacex-brand/spacex-logo-dark.svg`
- 主 Hero：`../assets/spacex-brand/hero-primary-starship.jpg`
- 次 Hero：`../assets/spacex-brand/hero-secondary-catch.jpg`
- 其余候选：`../assets/spacex-brand/candidates/`，可使用 01 至 16 的官方候选，但至少一个关键画面必须使用主 Hero。
- 资产来源和风险以 `brand-spec.md` 与 `asset-manifest.md` 为准。

## 视觉母题推导

- 产品最独有的物理现象：点火、尾焰、复用、轨道与地球弧线。
- 用户最需要理解的关系：愿景并不等于已经完成；今日能力、研发系统与长期火星目标要在同一条路径上被区别对待。
- 因此可用母题是“从尾焰变成轨迹，再变成轨道/网络”，但每个方向可以选择更适合自己的表现方式。
- 任何线条、渐变、数据或网格都必须指向产品状态、路径或导航，不做纯装饰。

## 验收底线

- Logo 与主 Hero 真正加载，无破图。
- 标题、CTA、状态标签和非官方声明可读。
- 不出现未经 `product-facts.md` 允许的动态数字或承诺。
- 无控制台错误、桌面与移动端无横向滚动。
- 每版有明确的一句话气质定位，可从截图第一眼辨认其设计逻辑。
