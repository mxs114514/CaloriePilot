<template>
  <van-tabbar class="app-tabbar" route safe-area-inset-bottom>
    <van-tabbar-item replace to="/record" icon="records-o">记录</van-tabbar-item>
    <van-tabbar-item replace to="/plan" icon="todo-list-o">计划清单</van-tabbar-item>
    <van-tabbar-item replace to="/history" icon="chart-trending-o">历史</van-tabbar-item>
    <van-tabbar-item replace to="/profile" icon="user-o">个人中心</van-tabbar-item>
  </van-tabbar>
</template>

<style scoped>
.app-tabbar {
  --van-tabbar-height: 64px;
  --van-tabbar-item-icon-size: 26px;
  --van-tabbar-item-font-size: 13px;
}

.app-tabbar :deep(.van-tabbar-item) {
  min-height: 64px;
}
</style>
