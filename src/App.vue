<script>
import { CLOUD_ENV_ID } from './config'

export default {
  onLaunch: function () {
    // #ifdef MP-WEIXIN
    if (wx.cloud) {
      if (CLOUD_ENV_ID) {
        wx.cloud.init({ env: CLOUD_ENV_ID, traceUser: true })
      } else {
        wx.cloud.init({ traceUser: true })
      }
    } else {
      console.warn('当前基础库过低，无法使用云能力')
    }
    // #endif
  },
  onShow: function () {},
  onHide: function () {},
}
</script>

<style>
/* 全局主题变量与公共样式 */
page {
  --pk-red: #ee1515;
  --pk-red-dark: #c51111;
  --pk-bg: #f4f5f7;
  --pk-card: #ffffff;
  --pk-text: #303133;
  --pk-sub: #8a8f99;
  --pk-line: #ebeef2;
  background: var(--pk-bg);
  color: var(--pk-text);
  font-size: 28rpx;
}

/* 通用卡片 */
.pk-card {
  background: var(--pk-card);
  border-radius: 20rpx;
  padding: 24rpx;
  box-sizing: border-box;
}

/* 通用小节标题 */
.pk-section-title {
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
}

.pk-section-title::before {
  content: '';
  width: 8rpx;
  height: 28rpx;
  border-radius: 4rpx;
  background: var(--pk-red);
  margin-right: 12rpx;
}
</style>
