# 首页个人照片 → TiltedCard 3D 倾斜卡效果

## 任务目标

给**首页（Hero / About Me 区域）的个人主照片**添加 **TiltedCard 3D 倾斜悬浮 UI 效果**。

> 就是截图中那张带圆角白边 + 底部 "real me · 真实的我" 文字的个人照片卡片。

## 效果描述

鼠标/手指移到照片上时：
- 卡片**跟随光标方向 3D 倾斜**（像一张真实的卡片被轻轻抬起一角）
- 倾斜角度约 **8~15°**（自然不夸张）
- 悬浮时**轻微放大**（scale ~1.05-1.1，不要太大）
- 有**柔和阴影加深**（增加立体感）
- 可选：显示**半透明遮罩层 + 文字说明**

## 技术方案（二选一）

### 方案 A：安装 `react-tilted-card` 组件库（推荐，最快）

```bash
npm install react-tilted-card
```

然后在照片组件中替换：

```jsx
import TiltedCard from 'react-tilted-card';

// 在个人照片位置使用：
<TiltedCard
  imageSrc={photoSrc}                    // 个人照片路径（支持本地图片或 base64）
  altText="real me · 真实的我"
  captionText="real me · 真实的我"        // 底部文字（保留原有的手写体风格）
  containerHeight="280px"                // 根据当前照片实际尺寸调整
  containerWidth="280px"
  imageHeight="280px"
  imageWidth="280px"
  rotateAmplitude={10}                   // 倾斜幅度：10°（温和自然）
  scaleOnHover={1.06}                    // 悬浮放大：1.06倍（轻微即可，别太大）
  showMobileWarning={false}              // 不显示移动端警告
  showTooltip={false}                    // 不需要 tooltip
  displayOverlayContent={true}           // 显示遮罩层内容
  overlayContent={
    <p className="tilted-card-caption" style={{
      fontFamily: "'Caveat', cursive",   // 用回文档定义的手写体
      fontSize: '1.1rem',
      color: '#B76E79',
      textAlign: 'center',
      margin: 0,
    }}>
      real me · 真实的我
    </p>
  }
/>
```

### 方案 B：纯 CSS+JS 实现（零依赖）

如果不想装第三方库，用 CSS `perspective` + `rotateX/rotateY` + JS 追踪鼠标位置手动实现：

```css
.tilted-photo-container {
  perspective: 800px;        /* 3D 透视深度 */
}

.tilted-photo {
  transform-style: preserve-3d;
  transition: transform 0.15s ease-out;
  border-radius: 24px;       /* 保持圆角 */
  box-shadow: 0 8px 24px rgba(180, 110, 121, 0.15);
}

.tilted-photo:hover {
  box-shadow: 0 16px 40px rgba(180, 110, 121, 0.25); /* 悬浮时阴影加深 */
}
```

```jsx
// JS 鼠标追踪倾斜逻辑
const handleMouseMove = (e) => {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const rotateX = ((y - centerY) / centerY) * -10;  // -10° ~ +10°
  const rotateY = ((x - centerX) / centerX) * 10;
  card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.06)`;
};

const handleMouseLeave = (e) => {
  e.currentTarget.style.transform = 'rotateX(0) rotateY(0) scale(1)';
};
```

## 关键要求（必须遵守）

| # | 要求 | 说明 |
|---|------|------|
| 1 | **保持原有样式不变** | 圆角白边、底部 "real me · 真实的我" 手写体文字必须保留 |
| 2 | **倾斜幅度要克制** | `rotateAmplitude` 设 8~12°，不要超过 15°（太大会晕） |
| 3 | **放大要轻微** | `scaleOnHover` 设 1.05~1.08，不要超过 1.2（这是治愈系网站不是电商） |
| 4 | **阴影用品牌色** | 悬浮阴影颜色用 `rgba(180, 110, 121, 0.2)` 左右的柔珊瑚色，不用纯黑 |
| 5 | **移动端兼容** | 手机上没有 hover → 倾斜效果在触摸时不触发或改为**触摸时轻微放大**即可；禁止显示 "This effect is not optimized for mobile" 之类的警告文字 |
| 6 | **性能** | 使用 `will-change: transform` + GPU 加速，确保 60fps 不卡 |
| 7 | **不破坏长按换图功能** | 这张图已有长按换图功能（500ms 触发），倾斜效果的 touch 事件不能和它冲突 |

## 与现有功能的冲突处理

⚠️ **关键：长按换图 vs 倾斜效果的手势冲突**

| 手势 | 应该触发 | 实现方式 |
|------|---------|---------|
| **touchstart + 500ms 不动** | 长按换图（已有） | 保留原有 setTimeout 逻辑 |
| **touchmove 手指移动** | 倾斜跟随（新增） | 在 touchmove 中更新 transform |
| **touchend** | 复位 | 同时清除换图计时器 + 复位倾斜 |

```jsx
// 推荐的事件绑定顺序
<div
  onMouseMove={handleMouseMove}    // PC: 倾斜
  onMouseLeave={handleMouseLeave}  // PC: 复位
  onTouchStart={handleTouchStart}  // mobile: 开始计时长按
  onTouchMove={handleTouchMove}    // mobile: 倾斜跟随（同时取消长按计时）
  onTouchEnd={handleTouchEnd}      // mobile: 复位 + 判断是否触发换图
>
```

## 验收标准

- [ ] PC 端：鼠标在照片上移动 → 卡片跟随光标方向 3D 倾斜，丝滑无延迟
- [ ] PC 端：鼠标移开 → 卡片平滑复位（300ms 内归零）
- [ ] 移动端：触摸滑动照片 → 卡片跟随手指倾斜（可选，不影响长按换图）
- [ ] 移动端：长按 500ms 不动 → 正常触发换图功能，不被倾斜逻辑干扰
- [ ] 底部 "real me · 真实的我" 文字清晰可见，不被遮挡
- [ ] 圆角和白色描边保持不变
- [ ] 无控制台报错 / 无多余警告文字

## 一句话总结版（简短提示词）

> 给首页个人照片加 TiltedCard 3D 倾斜效果：装 `react-tilted-card` 或纯 CSS 实现，倾斜 10° + 放大 1.06× + 柔珊瑚阴影。**关键**：保持圆角白边和底部手写体文字不变；移动端不显示警告；不破坏已有的长按换图功能（touchmove 取消长按计时器）。效果要克制温柔，这是治愈系网站。
