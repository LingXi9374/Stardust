<template>
  <div class="min-h-screen lg:flex">
    <AppSidebar />

    <main class="min-w-0 flex-1">
      <slot />
    </main>

    <!-- 两个查看器都挂在布局上：它们由 data 属性驱动，与具体页面无关 -->
    <BlogPhotoViewer />
  </div>
</template>
