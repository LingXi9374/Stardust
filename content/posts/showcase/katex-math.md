---
title: KaTeX 数学公式
description: 行内公式、块级公式、矩阵、求和与麦克斯韦方程组——公式在这套模板里怎么排版。
date: 2026-06-05
tags: [markdown, math, showcase]
---

公式由 [KaTeX](https://katex.org/) 在服务端渲染成静态 HTML，页面端不加载任何数学排版脚本。

## 行内公式

用单个 `$` 包裹，跟着正文走。欧拉公式 $e^{i\pi} + 1 = 0$ 大概是数学里最漂亮的一行；质能方程 $E = mc^2$ 则是知名度最高的那个。

行内公式的行高不会把段落撑开——KaTeX 会把上下标裁进安全范围，所以 $\sum_{i=1}^{n} x_i$ 这种带上下限的写法也不会让行与行之间忽然变松。

## 块级公式

两个 `$$` 包裹，独占一行、居中：

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

求根公式：

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

块级公式容器自带横向滚动，超宽的公式不会把阅读列撑破。

## 矩阵

$$
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
\begin{pmatrix}
\alpha & \beta \\
\gamma & \delta
\end{pmatrix} =
\begin{pmatrix}
a\alpha + b\gamma & a\beta + b\delta \\
c\alpha + d\gamma & c\beta + d\delta
\end{pmatrix}
$$

## 极限与求和

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$

$$
\lim_{x \to 0} \frac{\sin x}{x} = 1
$$

## 对齐的多行公式

`aligned` 环境用 `&` 对齐等号，适合把一整组方程排在一起——麦克斯韦方程组是标准例子：

$$
\begin{aligned}
\nabla \cdot \mathbf{E} &= \frac{\rho}{\varepsilon_0} \\
\nabla \cdot \mathbf{B} &= 0 \\
\nabla \times \mathbf{E} &= -\frac{\partial \mathbf{B}}{\partial t} \\
\nabla \times \mathbf{B} &= \mu_0\mathbf{J} + \mu_0\varepsilon_0\frac{\partial \mathbf{E}}{\partial t}
\end{aligned}
$$

## 常用符号

| 符号 | 写法 | 渲染结果 |
| :--- | :--- | :--- |
| Alpha | `\alpha` | $\alpha$ |
| Beta | `\beta` | $\beta$ |
| Gamma | `\Gamma` | $\Gamma$ |
| Pi | `\pi` | $\pi$ |
| Infinity | `\infty` | $\infty$ |
| 右箭头 | `\rightarrow` | $\rightarrow$ |
| 偏导 | `\partial` | $\partial$ |
| 范数 | `\lVert x \rVert` | $\lVert x \rVert$ |

## 公式写错了会怎样

模板把 KaTeX 的 `throwOnError` 关掉了，所以写错的公式会原样显示成红色文本，而不是让整页渲染失败。比如下面这个故意写错的 `\frac{1}{`：

$$
\frac{1}{
$$

排版阶段就报错、而不是等到读者打开页面才发现——这是把它放在服务端渲染的主要好处。

更多语法见 [KaTeX Supported Functions](https://katex.org/docs/supported.html)。
