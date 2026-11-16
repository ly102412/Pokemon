<template>
  <view class="stat-bar">
    <text class="label">{{ label }}</text>
    <text class="value">{{ value }}</text>
    <view class="track">
      <view class="fill" :style="{ width: pct + '%', background: color }" />
    </view>
  </view>
</template>

<script>
export default {
  name: 'StatBar',
  props: {
    label: { type: String, required: true },
    value: { type: Number, required: true },
    max: { type: Number, default: 255 },
  },
  computed: {
    pct() {
      return Math.min(100, Math.round((this.value / this.max) * 100))
    },
    // 值越高越偏绿，越低越偏红
    color() {
      const ratio = Math.min(1, this.value / 180)
      const hue = Math.round(ratio * 110) // 0 红 → 110 绿
      return `hsl(${hue}, 72%, 48%)`
    },
  },
}
</script>

<style scoped>
.stat-bar {
  display: flex;
  align-items: center;
  margin-bottom: 18rpx;
}

.label {
  width: 110rpx;
  font-size: 24rpx;
  color: var(--pk-sub);
}

.value {
  width: 80rpx;
  font-size: 26rpx;
  font-weight: 600;
  text-align: right;
  margin-right: 16rpx;
}

.track {
  flex: 1;
  height: 14rpx;
  border-radius: 999rpx;
  background: #eef0f4;
  overflow: hidden;
}

.fill {
  height: 100%;
  border-radius: 999rpx;
  transition: width 0.3s;
}
</style>
