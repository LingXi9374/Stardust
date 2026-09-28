---
title: PlantUML 图表
description: 时序图、活动图、用例图、组件图、部署图与 ER 图——纯文本描述，服务端渲染成 SVG。
date: 2026-05-20
tags: [markdown, plantuml, showcase]
---

PlantUML 用纯文本描述图表，适合写进技术文档：图和正文一起做版本管理，改图只改文本。

## 渲染方式

与 Mermaid 不同，PlantUML 在**渲染阶段**就把源码编码成服务端 SVG 地址，页面端只加载一张图片，不需要任何 JavaScript。

代价是图表源码会随 URL 发给 PlantUML 服务。介意的话把 `blog.config.ts` 里的 `diagramConfig.plantuml.server` 指向自建实例即可。

## 最小示例

```plantuml
@startuml
Alice -> Bob: Hello
Bob --> Alice: Hi
@enduml
```

## 活动图

```plantuml
@startuml
start
:用户提交订单;
if (库存充足?) then (是)
	:冻结库存;
	:创建支付单;
	if (支付成功?) then (是)
		:生成发货单;
		:通知仓库拣货;
	else (否)
		:取消订单;
		:释放库存;
	endif
else (否)
	:提示缺货;
endif
stop
@enduml
```

## 时序图

```plantuml
@startuml
autonumber
actor User as 读者
participant Web as 浏览器
participant Nitro as "Nitro 服务端"
participant "content/posts" as FS

读者 -> 浏览器 : 打开文章页
浏览器 -> Nitro : GET /posts/:slug
Nitro -> FS : 读取 Markdown
FS --> Nitro : frontmatter + 正文
Nitro -> Nitro : markdown-it 渲染 + Shiki 高亮
Nitro --> 浏览器 : 完整 HTML
浏览器 -> 浏览器 : 按需加载图表与交互脚本
@enduml
```

## 用例图

```plantuml
@startuml
left to right direction
actor 访客
actor 作者

rectangle 博客系统 {
	usecase "浏览文章" as UC1
	usecase "按合集筛选" as UC2
	usecase "按标签筛选" as UC3
	usecase "订阅 RSS" as UC4
	usecase "撰写文章" as UC5
	usecase "归档到合集" as UC6
}

访客 --> UC1
访客 --> UC2
访客 --> UC3
访客 --> UC4
作者 --> UC5
作者 --> UC6
@enduml
```

## 组件图

```plantuml
@startuml
package "构建期" {
	[modules/media] as Media
	[server/utils/markdown] as Md
	[content/posts] as Content
}

package "运行时" {
	[Vue 组件] as UI
	[Nitro 服务端] as Nitro
}

cloud "图床 / 随机图 API" as Remote

Media --> UI : 媒体清单
Md --> Nitro : 渲染函数
Content --> Md : Markdown 源码
UI --> Remote : 远程图片
@enduml
```

## 部署图

```plantuml
@startuml
node "构建机" {
	artifact "bun run build"
	artifact "assets/media"
}

node "服务器" {
	artifact ".output/server"
	artifact "content/posts"
}

cloud "PlantUML 服务" as PU

"assets/media" --> "bun run build" : 压缩
"bun run build" --> ".output/server" : 产物
".output/server" --> "content/posts" : 运行时读取
".output/server" --> PU : 请求图表 SVG
@enduml
```

## ER 图

```plantuml
@startuml
entity Post {
	*id : uuid <<PK>>
	--
	title : varchar
	collection : varchar
	published_at : datetime
}

entity Tag {
	*name : varchar <<PK>>
}

entity PostTag {
	post_id : uuid <<FK>>
	tag_name : varchar <<FK>>
}

entity Media {
	*key : varchar <<PK>>
	width : int
	height : int
}

Post ||--o{ PostTag
Tag ||--o{ PostTag
Post }o--|| Media : cover
@enduml
```

## 状态图

```plantuml
@startuml
[*] --> 草稿

草稿 --> 待审核 : 提交
待审核 --> 草稿 : 驳回
待审核 --> 已发布 : 审核通过
已发布 --> 已归档 : 到期归档
已发布 --> 草稿 : 撤回修改

state 已发布 {
	[*] --> 可见
	可见 --> 隐藏 : 手动隐藏
	隐藏 --> 可见 : 恢复展示
}

已归档 --> [*]
@enduml
```

> [!NOTE]
> 图源地址里包含图表源码的压缩编码，同一段源码每次编码结果相同，
> 因此浏览器缓存可以正常命中，翻页来回看不会重复请求。
