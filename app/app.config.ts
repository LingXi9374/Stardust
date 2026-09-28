/**
 * 站点级配置：模板使用者改这里即可完成个性化，无需触碰组件代码。
 * 该文件的字段会被 `useAppConfig()` 自动推导类型。
 */
export default defineAppConfig({
  site: {
    /** 侧栏左上角站点名 */
    name: 'Name',
    /** Home 页主标题 */
    codename: 'Codename',
    /** Home 页副标题 */
    description: 'Description',
    /** 站点一句话简介（SEO / About 页使用） */
    tagline: '一个阅读优先的简洁风博客模板。',
    author: 'Name',
    email: 'hello@example.com',
    /** 侧栏版权起始年份 */
    startYear: 2024,
  },

  /** 侧栏主导航，顺序即展示顺序 */
  nav: [
    { label: 'Home', to: '/' },
    { label: 'Contents', to: '/contents' },
    { label: 'Friends', to: '/friends' },
    { label: 'About', to: '/about' },
    { label: 'Gallery', to: '/gallery' },
    { label: 'Statistics', to: '/statistics' },
  ],

  /**
   * Home 页底部的平台跳转按钮。
   * icon 取值为 UiSocialLinks 中 ICONS 映射的键，目前支持：
   * x / github / bilibili / rss / email / link
   */
  social: [
    { label: 'X', href: 'https://x.com/', icon: 'x' },
    { label: 'GitHub', href: 'https://github.com/', icon: 'github' },
    { label: 'Bilibili', href: 'https://space.bilibili.com/', icon: 'bilibili' },
    { label: 'RSS', href: '/feed.xml', icon: 'rss' },
    { label: 'Email', href: 'mailto:hello@example.com', icon: 'email' },
  ],

  /**
   * 合集不在这里声明。
   *
   * 合集 = content/posts 下的一个子文件夹，标题与描述写在文件夹里的
   * `_collection.md`。建文件夹就是建合集，删文件夹合集就消失，
   * 不会出现「配置里有、内容里没有」的空合集。详见 server/utils/collections.ts。
   */

  /**
   * Friends 页的友链列表。
   * avatar 可填 assets/media 里的素材 key，也可以直接填图床链接（https://…）。
   * 留空则用内置头像兜底。
   */
  friends: [
    {
      name: 'Example Blog',
      href: 'https://example.com',
      avatar: 'friends/01',
      description: '一个同样安静的个人博客，长文为主。',
    },
    {
      name: 'Design Notes',
      href: 'https://example.com',
      avatar: 'friends/02',
      description: '排版、字体与界面细节的持续观察。',
    },
    {
      name: 'Build Log',
      href: 'https://example.com',
      avatar: 'friends/03',
      description: '把想法做成可以点开的东西。',
    },
    {
      name: 'Reading Room',
      href: 'https://example.com',
      avatar: 'friends/04',
      description: '书摘与读书笔记，更新不规律。',
    },
    {
      name: 'Pixel Garden',
      href: 'https://example.com',
      // 图床链接也可以是防盗链资源：BlogImage 默认带 referrerpolicy="no-referrer"，
      // 不发送 Referer，所以这类图不会被 403 拦掉
      avatar: 'https://i0.hdslb.com/bfs/face/member/noface.jpg',
      description: '像素画与生成艺术实验场。',
    },
    {
      name: 'Front of House',
      href: 'https://example.com',
      avatar: '',
      description: '前端工程化的实践记录。',
    },
  ],

  /**
   * 相册。
   *
   * 图片**不在这里列**——往 assets/media/<dir>/ 里丢图片，相册就自动收录，
   * 按文件名排序。压缩格式与质量在 blog.config.ts 里配置。
   */
  albums: [
    {
      slug: 'anime-moments',
      title: 'Anime Moments',
      description: '随手存下的插画，多半是某个下午突然想留住的光。',
      dir: 'albums/anime-moments',
      cover: 'albums/anime-moments/02',
    },
    {
      slug: 'quiet-places',
      title: 'Quiet Places',
      description: '安静的角落，人少，光好。',
      dir: 'albums/quiet-places',
    },
  ],
})
