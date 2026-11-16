<template>
  <view class="page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索名称或编号"
        confirm-type="search"
        @confirm="onSearch"
        @input="onInput"
      />
      <text v-if="keyword" class="clear-btn" @tap="onClear">✕</text>
      <text class="search-btn" @tap="onSearch">搜索</text>
    </view>

    <!-- 世代 Tab -->
    <scroll-view class="gen-tabs" scroll-x :show-scrollbar="false">
      <view
        v-for="g in genTabs"
        :key="g.gen"
        class="gen-item"
        :class="{ active: activeGen === g.gen }"
        @tap="onGen(g.gen)"
      >{{ g.label }}</view>
    </scroll-view>

    <!-- 属性筛选 -->
    <scroll-view class="type-chips" scroll-x :show-scrollbar="false">
      <view
        class="chip"
        :class="{ active: !activeType }"
        @tap="onType('')"
      >全部</view>
      <view
        v-for="t in types"
        :key="t"
        class="chip"
        :class="{ active: activeType === t }"
        @tap="onType(t)"
      >{{ typeZh(t) }}</view>
    </scroll-view>

    <view class="count-bar">
      <text>共 {{ total }} 只</text>
    </view>

    <!-- 卡片列表 -->
    <view class="grid">
      <PokeCard v-for="it in list" :key="it.id" :item="it" />
    </view>

    <view class="foot-tip">
      <text v-if="loading">加载中…</text>
      <text v-else-if="!list.length">没有找到符合条件的宝可梦</text>
      <text v-else-if="finished">— 到底啦 —</text>
      <text v-else>上拉加载更多</text>
    </view>
  </view>
</template>

<script>
import { callCloud } from '../../utils/cloud'
import { TYPES, TYPE_META } from '../../utils/typeChart'
import { GENS } from '../../utils/format'

const PAGE_SIZE = 24

export default {
  data() {
    return {
      keyword: '',
      activeGen: 0,
      activeType: '',
      genTabs: [{ gen: 0, label: '全部' }, ...GENS],
      types: TYPES,
      list: [],
      page: 1,
      total: 0,
      loading: false,
      finished: false,
      seq: 0,
    }
  },
  onLoad() {
    this.fetch(true)
  },
  onPullDownRefresh() {
    this.fetch(true).finally(() => uni.stopPullDownRefresh())
  },
  onReachBottom() {
    if (!this.loading && !this.finished) this.fetch(false)
  },
  methods: {
    typeZh(t) {
      return (TYPE_META[t] && TYPE_META[t].zh) || t
    },
    onInput() {
      // 输入清空时自动恢复全量
      if (!this.keyword) this.fetch(true)
    },
    onSearch() {
      this.fetch(true)
    },
    onClear() {
      this.keyword = ''
      this.fetch(true)
    },
    onGen(gen) {
      if (this.activeGen === gen) return
      this.activeGen = gen
      this.fetch(true)
    },
    onType(t) {
      if (this.activeType === t) return
      this.activeType = t
      this.fetch(true)
    },
    async fetch(reset) {
      if (this.loading && !reset) return
      if (reset) {
        this.page = 1
        this.finished = false
      }
      this.loading = true
      const mySeq = ++this.seq
      try {
        const data = await callCloud('pokemon-list', {
          page: this.page,
          pageSize: PAGE_SIZE,
          gen: this.activeGen,
          type: this.activeType,
          keyword: this.keyword.trim(),
        })
        if (mySeq !== this.seq) return // 丢弃过期响应
        const items = (data && data.list) || []
        this.list = reset ? items : this.list.concat(items)
        this.total = (data && data.total) || this.list.length
        if (this.list.length >= this.total || items.length < PAGE_SIZE) {
          this.finished = true
        } else {
          this.page += 1
        }
      } catch (e) {
        uni.showToast({ title: e.message || '加载失败', icon: 'none' })
        this.finished = true
      } finally {
        this.loading = false
      }
    },
  },
}
</script>

<style scoped>
.page {
  padding: 20rpx 24rpx 40rpx;
}

.search-bar {
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 999rpx;
  padding: 8rpx 8rpx 8rpx 28rpx;
}

.search-input {
  flex: 1;
  height: 64rpx;
  font-size: 26rpx;
}

.clear-btn {
  padding: 0 16rpx;
  color: var(--pk-sub);
  font-size: 26rpx;
}

.search-btn {
  background: var(--pk-red);
  color: #ffffff;
  font-size: 26rpx;
  border-radius: 999rpx;
  padding: 10rpx 30rpx;
}

.gen-tabs {
  margin-top: 20rpx;
  white-space: nowrap;
}

.gen-item {
  display: inline-block;
  padding: 10rpx 26rpx;
  margin-right: 14rpx;
  border-radius: 999rpx;
  background: #ffffff;
  color: var(--pk-text);
  font-size: 26rpx;
}

.gen-item.active {
  background: var(--pk-red);
  color: #ffffff;
  font-weight: 600;
}

.type-chips {
  margin-top: 16rpx;
  white-space: nowrap;
}

.chip {
  display: inline-block;
  padding: 6rpx 20rpx;
  margin-right: 12rpx;
  border-radius: 999rpx;
  background: #ffffff;
  border: 2rpx solid var(--pk-line);
  color: var(--pk-sub);
  font-size: 24rpx;
}

.chip.active {
  border-color: var(--pk-red);
  color: var(--pk-red);
  background: #fdeeee;
  font-weight: 600;
}

.count-bar {
  margin: 20rpx 4rpx 16rpx;
  font-size: 24rpx;
  color: var(--pk-sub);
}

.grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.foot-tip {
  text-align: center;
  color: var(--pk-sub);
  font-size: 24rpx;
  padding: 24rpx 0;
}
</style>
