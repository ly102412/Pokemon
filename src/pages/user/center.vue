<template>
  <view class="page">
    <!-- 个人资料卡 -->
    <view class="pk-card profile-card">
      <button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
        <image class="avatar" :src="profile.avatarUrl || defaultAvatar" mode="aspectFill" />
      </button>
      <view class="profile-main">
        <input
          class="nick-input"
          type="nickname"
          v-model="profile.nickName"
          placeholder="点击设置昵称"
          @blur="saveProfile"
        />
        <text class="openid-tip">{{ openid ? '已登录' : '登录中…' }}</text>
      </view>
    </view>

    <!-- 图鉴完成度 -->
    <view class="pk-card stat-card">
      <view class="stat-row">
        <view class="stat-item">
          <text class="si-num">{{ counts.favorite }}</text>
          <text class="si-label">收藏</text>
        </view>
        <view class="stat-item">
          <text class="si-num">{{ counts.caught }}</text>
          <text class="si-label">已捕捉</text>
        </view>
        <view class="stat-item">
          <text class="si-num">{{ pokemonTotal }}</text>
          <text class="si-label">图鉴总数</text>
        </view>
      </view>
      <view class="progress-wrap">
        <view class="progress-track">
          <view class="progress-fill" :style="{ width: completion + '%' }" />
        </view>
        <text class="progress-text">完成度 {{ completion }}%</text>
      </view>
    </view>

    <!-- 我的标记列表 -->
    <view class="pk-card list-card">
      <view class="tabs">
        <view class="tab" :class="{ on: activeTab === 'favorite' }" @tap="switchTab('favorite')">收藏</view>
        <view class="tab" :class="{ on: activeTab === 'caught' }" @tap="switchTab('caught')">已捕捉</view>
      </view>

      <view v-if="list.length" class="grid">
        <PokeCard v-for="it in list" :key="it.id" :item="it" />
      </view>

      <view v-else-if="!loading" class="empty">
        <text>{{ activeTab === 'favorite' ? '还没有收藏，去图鉴页面点☆收藏吧' : '还没有捕捉记录，去图鉴页面标记捕捉吧' }}</text>
      </view>

      <view v-if="list.length" class="foot-tip">
        <text v-if="loading">加载中…</text>
        <text v-else-if="finished">— 到底啦 —</text>
      </view>
    </view>
  </view>
</template>

<script>
import { callCloud } from '../../utils/cloud'

const PAGE_SIZE = 24

export default {
  data() {
    return {
      openid: '',
      userId: '',
      profile: { nickName: '', avatarUrl: '' },
      defaultAvatar: '/static/avatar-default.png',
      counts: { favorite: 0, caught: 0 },
      pokemonTotal: 0,
      activeTab: 'favorite',
      list: [],
      page: 1,
      loading: false,
      finished: false,
      seq: 0,
    }
  },
  computed: {
    completion() {
      if (!this.pokemonTotal) return 0
      return Math.min(100, Math.round((this.counts.caught / this.pokemonTotal) * 100))
    },
  },
  onShow() {
    this.ensureLogin()
  },
  onReachBottom() {
    if (!this.loading && !this.finished) this.fetchList(false)
  },
  methods: {
    async ensureLogin() {
      if (this.openid) return
      try {
        const data = await callCloud('login', {})
        this.openid = data.openid || ''
        this.userId = (data.profile && data.profile._id) || ''
        const stored = uni.getStorageSync('pk_profile')
        if (data.profile && (data.profile.nickName || data.profile.avatarUrl)) {
          this.profile = {
            nickName: data.profile.nickName || '',
            avatarUrl: data.profile.avatarUrl || '',
          }
        } else if (stored) {
          this.profile = stored
        }
        this.fetchList(true)
      } catch (e) {
        uni.showToast({ title: e.message || '登录失败', icon: 'none' })
      }
    },
    onChooseAvatar(e) {
      const url = e.detail && e.detail.avatarUrl
      if (!url) return
      this.profile.avatarUrl = url
      this.saveProfile()
    },
    async saveProfile() {
      uni.setStorageSync('pk_profile', this.profile)
      // #ifdef MP-WEIXIN
      if (this.userId && wx.cloud) {
        try {
          const db = wx.cloud.database()
          await db.collection('users').doc(this.userId).update({
            data: {
              nickName: this.profile.nickName || '',
              avatarUrl: this.profile.avatarUrl || '',
              updatedAt: Date.now(),
            },
          })
        } catch (e) {
          // 数据库权限未配置时不阻断本地体验
          console.warn('保存资料到云数据库失败:', e)
        }
      }
      // #endif
    },
    switchTab(tab) {
      if (this.activeTab === tab) return
      this.activeTab = tab
      this.fetchList(true)
    },
    async fetchList(reset) {
      if (this.loading && !reset) return
      if (reset) {
        this.page = 1
        this.finished = false
      }
      this.loading = true
      const mySeq = ++this.seq
      try {
        const data = await callCloud('my-pokemon', {
          tab: this.activeTab,
          page: this.page,
          pageSize: PAGE_SIZE,
        })
        if (mySeq !== this.seq) return
        const items = (data && data.list) || []
        this.list = reset ? items : this.list.concat(items)
        if (data && data.counts) this.counts = data.counts
        if (data && data.pokemonTotal != null) this.pokemonTotal = data.pokemonTotal
        if (this.list.length >= ((data && data.total) || 0) || items.length < PAGE_SIZE) {
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

.profile-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.avatar-btn {
  width: 120rpx;
  height: 120rpx;
  padding: 0;
  margin: 0;
  border-radius: 50%;
  background: transparent;
  line-height: 1;
  overflow: hidden;
}

.avatar-btn::after {
  border: none;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: #f0f1f5;
}

.profile-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.nick-input {
  font-size: 32rpx;
  font-weight: 600;
  height: 56rpx;
}

.openid-tip {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: var(--pk-sub);
}

/* 完成度 */
.stat-card {
  margin-top: 20rpx;
}

.stat-row {
  display: flex;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.si-num {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--pk-red);
}

.si-label {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: var(--pk-sub);
}

.progress-wrap {
  margin-top: 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.progress-track {
  flex: 1;
  height: 16rpx;
  border-radius: 999rpx;
  background: #f0f1f5;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #ff7a45, var(--pk-red));
  transition: width 0.3s;
}

.progress-text {
  font-size: 22rpx;
  color: var(--pk-sub);
}

/* 列表 */
.list-card {
  margin-top: 20rpx;
}

.tabs {
  display: flex;
  gap: 24rpx;
  margin-bottom: 20rpx;
}

.tab {
  font-size: 28rpx;
  color: var(--pk-sub);
  padding: 6rpx 0;
}

.tab.on {
  color: var(--pk-red);
  font-weight: 700;
  border-bottom: 4rpx solid var(--pk-red);
}

.grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.empty {
  padding: 60rpx 0;
  text-align: center;
  color: var(--pk-sub);
  font-size: 26rpx;
}

.foot-tip {
  text-align: center;
  color: var(--pk-sub);
  font-size: 24rpx;
  padding: 16rpx 0;
}
</style>
