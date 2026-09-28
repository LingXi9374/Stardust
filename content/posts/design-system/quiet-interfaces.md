---
title: 安静的界面
description: 读者把动效当作干扰，而不是愉悦。一次关于删减的实践。
date: 2025-10-02
tags: [design, ux]
---

给阅读场景加动画之前，先问一个问题：它帮读者完成了什么？如果答案是「让页面显得更精致」，那它大概不该存在。

## 被删掉的东西

这个模板在成型过程中去掉了下面这些：

- 卡片进入视口时逐条上浮
- 侧栏导航项的位移高亮条
- 页面切换的横向滑入
- 图片加载完成后的放大回弹

它们的共同点是：**在读者正要开始读的那一刻消耗注意力**。

## 保留的东西

只留下了一种：180 毫秒的淡入淡出，用于首页身份区的轮播切换。

```vue
<style scoped>
.hero-enter-active,
.hero-leave-active {
  transition: opacity 180ms ease;
}

.hero-enter-from,
.hero-leave-to {
  opacity: 0;
}
</style>
```

即便如此，也要尊重系统的减弱动态偏好：

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 一个反直觉的结论

删掉动画之后，页面**感觉**更快了，尽管实际的性能指标没有变化。感知到的速度来自「内容是否立刻稳定」，而不是「过渡是否顺滑」。

读者不会因为你没有动画而注意到什么。那正是目的。
