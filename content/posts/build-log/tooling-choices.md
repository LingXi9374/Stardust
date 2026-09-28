---
title: 为什么是 Bun 和 Vite 8
description: 一次工具链选择里的取舍，以及那些不值得争论的部分。
date: 2025-08-04
tags: [tooling, build]
---

工具链的选择很容易变成信仰之争。这里的标准只有一个：**它是否减少了等待时间**。

## Bun 负责安装和脚本

```bash
bun install
bun run dev        # 用 Node 运行时执行脚本
bun --bun run dev  # 强制用 Bun 运行时执行
```

这两个命令的差别值得记住。默认情况下 `bun run` 只是更快的包管理器加任务运行器，脚本内部仍然是 Node 在跑。

## Vite 8 自带 Rolldown

Vite 8 已经把 Rolldown 内置为打包器，不再需要历史上那个 `rolldown-vite` 别名包。继续保留 override 反而会引入旧版本的 `rolldown`，与框架声明的 peer 依赖冲突：

```
Package subpath './utils' is not defined by "exports"
```

一个真实且相当难猜的报错。

## 版本约束写在 package.json 里

```json
{
  "engines": {
    "node": "^22.19.0 || ^24.11.0"
  }
}
```

只用偶数 LTS。这不是保守，是因为工具链的 bug 报告默认基于 LTS 版本复现。

## 不值得争论的部分

- 包管理器快 200ms 还是 400ms；
- 打包器是 Rust 还是 Go 写的；
- 配置文件是 TS 还是 JS。

这些都不会出现在读者那一侧。值得花时间的是首屏字节数、字体加载策略，以及**内容本身是否值得读**。
