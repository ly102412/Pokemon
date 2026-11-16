<template>
  <view class="poke-card" @tap="goDetail">
    <view class="thumb-wrap" :style="{ background: thumbBg }">
      <image
        class="thumb"
        :src="item.thumbFileId || item.thumbUrl"
        mode="aspectFit"
        lazy-load
        @error="onImgError"
      />
    </view>
    <view class="info">
      <view class="name-row">
        <text class="name">{{ item.nameZh || item.nameEn }}</text>
        <text class="no">{{ padId(item.id) }}</text>
      </view>
      <view class="types">
        <TypeTag v-for="t in item.types" :key="t" :type="t" />
      </view>
    </view>
  </view>
</template>

<script>
import { padId } from '../../utils/format'
import { TYPE_META } from '../../utils/typeChart'

export default {
  name: 'PokeCard',
  props: {
    item: { type: Object, required: true },
  },
  computed: {
    thumbBg() {
      const t = this.item.types && this.item.types[0]
      const m = t && TYPE_META[t]
      return m ? m.color + '22' : '#f0f1f5'
    },
  },
  methods: {
    padId,
    goDetail() {
      uni.navigateTo({ url: `/pages/dex/detail?id=${this.item.id}` })
    },
    onImgError() {
      // 云存储图加载失败时退回 PokéAPI 原始地址
      if (this.item.thumbUrl) {
        this.item.thumbFileId = ''
      }
    },
  },
}
</script>

<style scoped>
.poke-card {
  width: 48.5%;
  margin-bottom: 16rpx;
  background: var(--pk-card);
  border-radius: 20rpx;
  padding: 16rpx;
  box-sizing: border-box;
}

.thumb-wrap {
  height: 200rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumb {
  width: 180rpx;
  height: 180rpx;
}

.info {
  padding: 12rpx 8rpx 4rpx;
}

.name-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.name {
  font-size: 28rpx;
  font-weight: 600;
}

.no {
  font-size: 22rpx;
  color: var(--pk-sub);
}

.types {
  margin-top: 10rpx;
  display: flex;
  gap: 10rpx;
  flex-wrap: wrap;
}
</style>
