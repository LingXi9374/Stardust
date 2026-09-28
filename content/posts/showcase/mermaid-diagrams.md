---
title: Mermaid 图表
description: 流程图、时序图、状态图、甘特图、思维导图……用文本描述图表，跟着文章一起做版本管理。
date: 2026-05-28
tags: [markdown, mermaid, showcase]
---

图表的源码就是文章的一部分，改图只需要改文本，也能进 diff。写法是普通的 ` ```mermaid ` 代码块。

## 渲染方式

Mermaid 需要真实的 DOM 测量才能排版，所以在**浏览器端**渲染：页面里出现图表时才会按需下载渲染器，滚动到图表附近才开始画，首屏不受影响。

脚本没跑起来时，图表位置会显示源码——内容不会丢。

## 流程图

```mermaid
graph TD
    A[开始] --> B{条件检查}
    B -->|是| C[处理步骤 1]
    B -->|否| D[处理步骤 2]
    C --> E[子过程]
    D --> E
    subgraph E [子过程详情]
        E1[子步骤 1] --> E2[子步骤 2]
        E2 --> E3[子步骤 3]
    end
    E --> F{另一个决策}
    F -->|选项 1| G[结果 1]
    F -->|选项 2| H[结果 2]
    G --> J[结束]
    H --> J
```

## 时序图

```mermaid
sequenceDiagram
    participant User as 用户
    participant WebApp as 网页应用
    participant Server as 服务器
    participant Database as 数据库

    User->>WebApp: 提交登录请求
    WebApp->>Server: 发送认证请求
    Server->>Database: 查询用户凭据
    Database-->>Server: 返回用户数据
    Server-->>WebApp: 返回认证结果

    alt 认证成功
        WebApp->>User: 显示欢迎页面
        WebApp->>Server: 请求用户数据
        Server-->>WebApp: 返回用户数据
    else 认证失败
        WebApp->>User: 显示错误消息
    end
```

## 状态图

```mermaid
stateDiagram-v2
    [*] --> 草稿

    草稿 --> 审核中 : 提交
    审核中 --> 草稿 : 拒绝
    审核中 --> 已批准 : 批准
    已批准 --> 已发布 : 发布
    已发布 --> 已归档 : 归档
    已发布 --> 草稿 : 撤回

    已归档 --> [*]
```

## ER 图

```mermaid
erDiagram
    USER {
        int id PK
        string username
        string email
    }
    POST {
        int id PK
        string title
        text content
        int author_id FK
    }
    COMMENT {
        int id PK
        text body
        int post_id FK
        int user_id FK
    }
    USER ||--o{ POST : "writes"
    USER ||--o{ COMMENT : "posts"
    POST ||--o{ COMMENT : "has"
```

## 类图

```mermaid
classDiagram
    class Post {
        +String title
        +String content
        +Date publishDate
        +publish()
        +edit()
    }

    class Author {
        +String name
        +String email
        +writePost()
    }

    class Comment {
        +String body
        +Date createdAt
    }

    Author "1" -- "*" Post : 写作
    Post "1" -- "*" Comment : 拥有
```

## 甘特图

```mermaid
gantt
    title 模板迭代计划
    dateFormat YYYY-MM-DD
    axisFormat %m/%d
    section 内容系统
    文章渲染 :done, render, 2026-05-01, 6d
    代码块特性 :done, code, after render, 5d
    section 媒体管线
    压缩与格式 :active, media, 2026-05-14, 7d
    相册系统 :album, after media, 4d
    section 发布
    构建检查 :test, after album, 2d
    正式上线 :milestone, release, after test, 0d
```

## 饼图

```mermaid
pie showData
    title 文章类型占比
    "技术文章" : 45
    "项目记录" : 30
    "功能示例" : 15
    "其他" : 10
```

## 思维导图

```mermaid
mindmap
  root((Stardust))
    内容
      文章
      合集
      标签
    阅读体验
      度量与行高
      暗色模式
      目录
    工程
      Nuxt 4
      Tailwind 4
      Shiki
```

## 时间线

```mermaid
timeline
    title 模板演进
    2026-05 : 骨架与配色
            : 侧栏与响应式
    2026-06 : 图片管线
            : 代码块特性
    2026-07 : 图表与公式
```

## Git 图

```mermaid
gitGraph
    commit id: "init"
    branch feature
    checkout feature
    commit id: "add-diagrams"
    commit id: "polish-themes"
    checkout main
    merge feature id: "merge-feature"
    commit id: "release"
```

## 主题

图表配色跟着站点走——亮色和暗色各渲染一份，切换主题时直接替换，不用重新排版。配色取自锁定色板的同族色，不会在页面里跳出一块突兀的蓝紫。

写图表时不需要为暗色模式做任何额外处理。

> [!TIP]
> 图表渲染失败（语法写错）时，代码块里会显示具体的报错信息，同时保留源码。
> 这比只留一块空白要好排查得多。
