/**
 * 云函数：login
 * 获取调用者 openid，并注册/更新 users 记录
 * 返回 { ok, data: { openid, profile } }
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function ensureCollection(name) {
  try {
    await db.createCollection(name)
  } catch (e) {
    // 已存在或无权限，忽略
  }
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) {
    return { ok: false, message: '未获取到用户身份' }
  }
  await ensureCollection('users')

  const now = Date.now()
  const users = db.collection('users')
  let profile = null
  try {
    const found = await users.where({ _openid: OPENID }).limit(1).get()
    if (found.data.length) {
      profile = found.data[0]
      await users.doc(profile._id).update({ data: { lastLoginAt: now } })
    } else {
      const added = await users.add({
        data: { _openid: OPENID, nickName: '', avatarUrl: '', createdAt: now, lastLoginAt: now },
      })
      profile = { _id: added._id, _openid: OPENID, nickName: '', avatarUrl: '' }
    }
  } catch (e) {
    // 数据库异常时降级：仅返回 openid
    return { ok: true, data: { openid: OPENID, profile: null } }
  }
  return { ok: true, data: { openid: OPENID, profile } }
}
