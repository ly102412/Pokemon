/**
 * 云函数调用统一封装
 * 云函数返回约定：成功 { ok: true, data }，失败 { ok: false, message }
 */

function cloudReady() {
  // #ifdef MP-WEIXIN
  return !!(wx.cloud && typeof wx.cloud.callFunction === 'function')
  // #endif
  // #ifndef MP-WEIXIN
  return false
  // #endif
}

export function callCloud(name, data = {}) {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    if (!cloudReady()) {
      reject(new Error('云能力未就绪，请检查基础库版本'))
      return
    }
    wx.cloud
      .callFunction({ name, data })
      .then((res) => {
        const r = res && res.result
        if (r && r.ok === false) {
          reject(new Error(r.message || '请求失败'))
        } else {
          resolve(r && r.data !== undefined ? r.data : r)
        }
      })
      .catch((err) => reject(err))
    // #endif
    // #ifndef MP-WEIXIN
    reject(new Error('当前仅支持微信小程序环境'))
    // #endif
  })
}
