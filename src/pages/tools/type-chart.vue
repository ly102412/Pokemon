<template>
  <view class="page">
    <view class="pk-card">
      <view class="tip">选择 1~2 个攻击属性，查看对 18 种防守属性的效果（第六世代及以后规则）</view>
      <view class="type-grid">
        <view
          v-for="t in types"
          :key="t"
          class="tg-chip"
          :style="chipStyle(t)"
          @tap="toggleType(t)"
        >{{ typeZh(t) }}</view>
      </view>
      <view v-if="selected.length" class="reset-row">
        <text class="reset-btn" @tap="reset">重置选择</text>
      </view>
    </view>

    <view v-if="selected.length" class="pk-card result-card">
      <view class="pk-section-title">攻击效果</view>
      <view
        v-for="row in rows"
        :key="row.def"
        class="result-row"
      >
        <view class="rr-type">
          <TypeTag :type="row.def" />
        </view>
        <view class="rr-badges">
          <template v-if="selected.length === 1">
            <text :class="badgeClass(row.mults[0])">{{ multLabel(row.mults[0]) }}</text>
          </template>
          <template v-else>
            <text class="rr-split">{{ typeZh(selected[0]) }}</text>
            <text :class="badgeClass(row.mults[0])">{{ multLabel(row.mults[0]) }}</text>
            <text class="rr-split">{{ typeZh(selected[1]) }}</text>
            <text :class="badgeClass(row.mults[1])">{{ multLabel(row.mults[1]) }}</text>
            <text class="rr-best">最佳 {{ multLabel(row.best) }}</text>
          </template>
        </view>
      </view>
      <view class="legend">
        <text class="lg l2">×2 / ×4 效果绝佳</text>
        <text class="lg lh">×½ / ×¼ 效果不好</text>
        <text class="lg l0">×0 无效</text>
      </view>
    </view>

    <view v-else class="pk-card empty-card">
      <text class="empty-text">↑ 先选择攻击属性</text>
    </view>
  </view>
</template>

<script>
import { TYPES, TYPE_META, multiplier, multLabel } from '../../utils/typeChart'

export default {
  data() {
    return {
      types: TYPES,
      selected: [],
    }
  },
  computed: {
    rows() {
      // 按最佳效果降序：单选时按该属性倍率，双选时取两者较大值
      return TYPES.map((def) => {
        const mults = this.selected.map((atk) => multiplier(atk, def))
        const best = Math.max(...mults)
        return { def, mults, best }
      }).sort((a, b) => b.best - a.best || a.def.localeCompare(b.def))
    },
  },
  methods: {
    typeZh(t) {
      return (TYPE_META[t] && TYPE_META[t].zh) || t
    },
    multLabel,
    chipStyle(t) {
      const m = TYPE_META[t]
      const on = this.selected.includes(t)
      return {
        background: on ? m.color : '#f4f5f7',
        color: on ? (m.dark ? '#4a4433' : '#ffffff') : '#303133',
        borderColor: on ? m.color : 'transparent',
      }
    },
    toggleType(t) {
      const i = this.selected.indexOf(t)
      if (i >= 0) {
        this.selected.splice(i, 1)
      } else if (this.selected.length < 2) {
        this.selected.push(t)
      } else {
        this.selected.shift()
        this.selected.push(t)
      }
    },
    reset() {
      this.selected = []
    },
    badgeClass(m) {
      if (m > 1) return 'badge b2'
      if (m === 1) return 'badge b1'
      if (m === 0) return 'badge b0'
      return 'badge bh'
    },
  },
}
</script>

<style scoped>
.page {
  padding: 20rpx 24rpx 40rpx;
}

.tip {
  font-size: 24rpx;
  color: var(--pk-sub);
  line-height: 1.6;
  margin-bottom: 20rpx;
}

.type-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.tg-chip {
  width: calc(25% - 11rpx);
  box-sizing: border-box;
  text-align: center;
  font-size: 26rpx;
  padding: 12rpx 0;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  font-weight: 600;
}

.reset-row {
  margin-top: 20rpx;
  text-align: right;
}

.reset-btn {
  font-size: 24rpx;
  color: var(--pk-sub);
}

.result-card {
  margin-top: 20rpx;
}

.result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14rpx 0;
  border-bottom: 1rpx solid var(--pk-line);
}

.result-row:last-of-type {
  border-bottom: none;
}

.rr-badges {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.rr-split {
  font-size: 20rpx;
  color: var(--pk-sub);
}

.rr-best {
  font-size: 20rpx;
  color: var(--pk-sub);
  margin-left: 8rpx;
}

.badge {
  min-width: 64rpx;
  text-align: center;
  font-size: 24rpx;
  font-weight: 700;
  border-radius: 10rpx;
  padding: 4rpx 10rpx;
}

.b2 { background: #fdeceb; color: #d93025; }
.b1 { background: #f1f3f4; color: #9aa0a6; }
.bh { background: #e8f0fe; color: #1a73e8; }
.b0 { background: #e9e9e9; color: #6b7075; text-decoration: line-through; }

.legend {
  display: flex;
  gap: 20rpx;
  margin-top: 20rpx;
  font-size: 20rpx;
}

.lg.l2 { color: #d93025; }
.lg.lh { color: #1a73e8; }
.lg.l0 { color: #6b7075; }

.empty-card {
  margin-top: 20rpx;
  text-align: center;
  padding: 60rpx 0;
}

.empty-text {
  color: var(--pk-sub);
  font-size: 26rpx;
}
</style>
