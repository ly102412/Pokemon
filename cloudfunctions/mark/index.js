/**
 * 云函数：mark
 * 收藏 / 捕捉标记的添加与取消（归属以云函数上下文 openid 为准）
 * 入参：{ pokemonId, type: 'favorite'|'caught', action: 'add'|'remove' }
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function ensureCollection(name) {
  try {
    await db.createCollection(name)
  } catch (e) {
    // 已存在，忽略
  }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, message: '未获取到用户身份' }

  const input = event || {}
  const pokemonId = Number(input.pokemonId)
  const type = input.type
  const action = input.action
  if (
    !pokemonId ||
    !['favorite', 'caught'].includes(type) ||
    !['add', 'remove'].includes(action)
  ) {
    return { ok: false, message: '参数错误' }
  }

  await ensureCollection('user_pokemon')
  const col = db.collection('user_pokemon')
  const where = { _openid: OPENID, pokemonId, type }

  try {
    if (action === 'add') {
      const exists = await col.where(where).count()
      if (!exists.total) {
        await col.add({
          data: { _openid: OPENID, pokemonId, type, createdAt: Date.now() },
        })
      }
    } else {
      await col.where(where).remove()
    }
  } catch (e) {
    return { ok: false, message: '数据库操作失败：' + (e.message || e) }
  }
  return { ok: true, data: { pokemonId, type, action } }
}
