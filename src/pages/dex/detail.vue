<template>
  <view class="page">
    <view v-if="p" class="detail">
      <!-- 头部卡片 -->
      <view class="hero" :style="{ background: heroBg }">
        <view class="hero-top">
          <view class="types">
            <TypeTag v-for="t in p.types" :key="t" :type="t" />
          </view>
          <text class="hero-no">{{ padId(p.id) }}</text>
        </view>
        <image
          class="artwork"
          :src="p.artFileId || p.artUrl"
          mode="aspectFit"
          @error="onArtError"
        />
        <view class="hero-name">
          <text class="name-zh">{{ p.nameZh || p.nameEn }}</text>
          <text class="name-en">{{ p.nameEn }} · {{ p.nameJa || '' }}</text>
          <text class="genus">{{ p.genus || '' }}</text>
        </view>
      </view>

      <!-- 基础信息 -->
      <view class="pk-card block">
        <view class="basic-row">
          <view class="basic-item">
            <text class="bi-label">身高</text>
            <text class="bi-value">{{ fmtHeight(p.height) }}</text>
          </view>
          <view class="basic-item">
            <text class="bi-label">体重</text>
            <text class="bi-value">{{ fmtWeight(p.weight) }}</text>
          </view>
          <view class="basic-item">
            <text class="bi-label">捕获率</text>
            <text class="bi-value">{{ fmtCaptureRate(p.captureRate) }}</text>
          </view>
          <view class="basic-item">
            <text class="bi-label">世代</text>
            <text class="bi-value">{{ p.gen ? `第${p.gen}世代` : '-' }}</text>
          </view>
        </view>
      </view>

      <!-- 种族值 -->
      <view class="pk-card block">
        <view class="pk-section-title">种族值（总和 {{ statTotal }}）</view>
        <StatBar label="HP" :value="p.stats.hp" />
        <StatBar label="攻击" :value="p.stats.atk" />
        <StatBar label="防御" :value="p.stats.def" />
        <StatBar label="特攻" :value="p.stats.spa" />
        <StatBar label="特防" :value="p.stats.spd" />
        <StatBar label="速度" :value="p.stats.spe" />
      </view>

      <!-- 特性 -->
      <view class="pk-card block" v-if="p.abilities && p.abilities.length">
        <view class="pk-section-title">特性</view>
        <view v-for="ab in p.abilities" :key="ab.nameEn" class="ability">
          <view class="ability-head">
            <text class="ability-name">{{ ab.nameZh || ab.nameEn }}</text>
            <text v-if="ab.isHidden" class="ability-hidden">隐藏特性</text>
          </view>
          <text class="ability-desc">{{ ab.descZh || '暂无描述' }}</text>
        </view>
      </view>

      <!-- 弱点与抗性 -->
      <view class="pk-card block" v-if="report.length">
        <view class="pk-section-title">被攻击时的效果</view>
        <view class="mult-group" v-if="weakList.length">
          <text class="mg-label g-weak">弱点</text>
          <view class="mult-tags">
            <view v-for="r in weakList" :key="r.atk" class="mult-tag t-weak">
              <TypeTag :type="r.atk" />
              <text class="mt-x">{{ multLabel(r.mult) }}</text>
            </view>
          </view>
        </view>
        <view class="mult-group" v-if="resistList.length">
          <text class="mg-label g-resist">抵抗</text>
          <view class="mult-tags">
            <view v-for="r in resistList" :key="r.atk" class="mult-tag t-resist">
              <TypeTag :type="r.atk" />
              <text class="mt-x">{{ multLabel(r.mult) }}</text>
            </view>
          </view>
        </view>
        <view class="mult-group" v-if="immuneList.length">
          <text class="mg-label g-immune">免疫</text>
          <view class="mult-tags">
            <view v-for="r in immuneList" :key="r.atk" class="mult-tag t-immune">
              <TypeTag :type="r.atk" />
              <text class="mt-x">×0</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 图鉴描述 -->
      <view class="pk-card block" v-if="p.flavorTextZh">
        <view class="pk-section-title">图鉴说明</view>
        <text class="flavor">{{ p.flavorTextZh }}</text>
      </view>

      <!-- 进化链 -->
      <view class="pk-card block">
        <view class="pk-section-title">进化链</view>
        <EvolutionChain :chain="chain" :nodes-map="chainNodes" :current-id="p.id" />
      </view>

      <view class="placeholder" />
    </view>

    <!-- 加载与错误态 -->
    <view v-else class="loading-wrap">
      <text v-if="errMsg" class="err">{{ errMsg }}</text>
      <text v-else>加载中…</text>
    </view>

    <!-- 底部操作栏 -->
    <view v-if="p" class="action-bar">
      <view
        class="action-btn"
        :class="{ on: marked.favorite }"
        @tap="toggle('favorite')"
      >{{ marked.favorite ? '★ 已收藏' : '☆ 收藏' }}</view>
      <view
        class="action-btn"
        :class="{ on: marked.caught }"
        @tap="toggle('caught')"
      >{{ marked.caught ? '● 已捕捉' : '○ 捕捉' }}</view>
    </view>
  </view>
</template>

<script>
import { callCloud } from '../../utils/cloud'
import { TYPE_META, defendersReport, multLabel } from '../../utils/typeChart'
import { padId, fmtHeight, fmtWeight, fmtCaptureRate } from '../../utils/format'

export default {
  data() {
    return {
      id: 0,
      p: null,
      chain: null,
      chainNodes: {},
      marked: { favorite: false, caught: false },
      errMsg: '',
      toggling: false,
    }
  },
  computed: {
    heroBg() {
      const t = this.p && this.p.types && this.p.types[0]
      const m = t && TYPE_META[t]
      const base = m ? m.color : '#9aa0a6'
      return `linear-gradient(160deg, ${base}dd 0%, ${base}77 60%, #f4f5f7 100%)`
    },
    statTotal() {
      const s = this.p && this.p.stats
      if (!s) return 0
      return s.hp + s.atk + s.def + s.spa + s.spd + s.spe
    },
    report() {
      return this.p ? defendersReport(this.p.types) : []
    },
    weakList() {
      return this.report.filter((r) => r.mult > 1)
    },
    resistList() {
      return this.report.filter((r) => r.mult < 1 && r.mult > 0)
    },
    immuneList() {
      return this.report.filter((r) => r.mult === 0)
    },
  },
  onLoad(options) {
    this.id = Number(options.id || 0)
    this.load()
  },
  methods: {
    padId,
    fmtHeight,
    fmtWeight,
    fmtCaptureRate,
    multLabel,
    async load() {
      try {
        const data = await callCloud('pokemon-detail', { id: this.id })
        this.p = data.pokemon
        this.chain = data.chain
        this.chainNodes = data.chainNodes || {}
        this.marked = {
          favorite: !!(data.marks && data.marks.favorite),
          caught: !!(data.marks && data.marks.caught),
        }
        uni.setNavigationBarTitle({ title: this.p.nameZh || this.p.nameEn })
      } catch (e) {
        this.errMsg = e.message || '加载失败'
      }
    },
    onArtError() {
      if (this.p.artUrl) this.p.artFileId = ''
    },
    async toggle(kind) {
      if (this.toggling) return
      this.toggling = true
      const action = this.marked[kind] ? 'remove' : 'add'
      try {
        await callCloud('mark', {
          pokemonId: this.p.id,
          type: kind,
          action,
        })
        this.marked[kind] = action === 'add'
        uni.showToast({
          title: action === 'add' ? (kind === 'favorite' ? '已收藏' : '已捕捉') : '已取消',
          icon: 'none',
        })
      } catch (e) {
        uni.showToast({ title: e.message || '操作失败', icon: 'none' })
      } finally {
        this.toggling = false
      }
    },
  },
}
</script>

<style scoped>
.page {
  padding: 20rpx 24rpx 200rpx;
}

.block {
  margin-top: 20rpx;
}

/* 头部 */
.hero {
  border-radius: 24rpx;
  padding: 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero-top {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.types {
  display: flex;
  gap: 12rpx;
}

.hero-no {
  font-size: 28rpx;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
}

.artwork {
  width: 380rpx;
  height: 380rpx;
  margin-top: 10rpx;
}

.hero-name {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.name-zh {
  font-size: 44rpx;
  font-weight: 700;
  color: #ffffff;
}

.name-en {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
}

.genus {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(0, 0, 0, 0.18);
  border-radius: 999rpx;
  padding: 4rpx 20rpx;
}

/* 基础信息 */
.basic-row {
  display: flex;
  justify-content: space-between;
}

.basic-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.bi-label {
  font-size: 22rpx;
  color: var(--pk-sub);
}

.bi-value {
  margin-top: 8rpx;
  font-size: 28rpx;
  font-weight: 600;
}

/* 特性 */
.ability {
  padding: 12rpx 0;
  border-bottom: 1rpx solid var(--pk-line);
}

.ability:last-child {
  border-bottom: none;
}

.ability-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.ability-name {
  font-size: 28rpx;
  font-weight: 600;
}

.ability-hidden {
  font-size: 20rpx;
  color: #8e6ee6;
  background: #f1ecfd;
  border-radius: 999rpx;
  padding: 2rpx 12rpx;
}

.ability-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--pk-sub);
  line-height: 1.6;
}

/* 弱点抗性 */
.mult-group {
  margin-bottom: 18rpx;
  display: flex;
  align-items: flex-start;
}

.mult-group:last-child {
  margin-bottom: 0;
}

.mg-label {
  flex-shrink: 0;
  width: 90rpx;
  font-size: 24rpx;
  font-weight: 600;
  padding-top: 8rpx;
}

.g-weak { color: #d93025; }
.g-resist { color: #1a73e8; }
.g-immune { color: #5f6368; }

.mult-tags {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.mult-tag {
  display: flex;
  align-items: center;
  gap: 6rpx;
  border-radius: 999rpx;
  padding: 4rpx 12rpx 4rpx 4rpx;
}

.t-weak { background: #fdeceb; }
.t-resist { background: #e8f0fe; }
.t-immune { background: #f1f3f4; }

.mt-x {
  font-size: 20rpx;
  color: var(--pk-sub);
}

/* 图鉴描述 */
.flavor {
  font-size: 26rpx;
  line-height: 1.8;
  color: var(--pk-text);
}

.placeholder {
  height: 20rpx;
}

/* 加载错误 */
.loading-wrap {
  padding: 200rpx 0;
  text-align: center;
  color: var(--pk-sub);
}

.err {
  color: #d93025;
}

/* 底部操作栏 */
.action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 20rpx;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background: #ffffff;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.action-btn {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  border-radius: 999rpx;
  font-size: 28rpx;
  color: var(--pk-text);
  background: #f4f5f7;
}

.action-btn.on {
  background: #fdeeee;
  color: var(--pk-red);
  font-weight: 600;
}
</style>
