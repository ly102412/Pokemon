/**
 * 云函数：pokemon-detail
 * 图鉴详情聚合：宝可梦主数据 + 进化链 + 节点摘要 + 当前用户标记
 * 入参：{ id }
 * 返回 { ok, data: { pokemon, chain, chainNodes, marks } }
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const id = Number((event && event.id) || 0)
  if (!id) return { ok: false, message: '参数错误：缺少 id' }
  const { OPENID } = cloud.getWXContext()

  // 主数据
  let p
  try {
    const res = await db.collection('pokemon').doc(String(id)).get()
    p = res.data
  } catch (e) {
    return { ok: false, message: '未找到该宝可梦，可能数据尚未同步' }
  }

  // 进化链 + 节点摘要
  let chain = null
  const chainNodes = {}
  if (p.chainId) {
    try {
      const c = await db.collection('evolution_chains').doc(String(p.chainId)).get()
      chain = c.data
      const ids = new Set([chain.rootId])
      ;(chain.edges || []).forEach((e) => {
        ids.add(e.from)
        ids.add(e.to)
      })
      if (ids.size) {
        const nodes = await db.collection('pokemon')
          .where({ id: _.in([...ids]) })
          .field({ id: true, nameZh: true, nameEn: true, thumbFileId: true, thumbUrl: true })
          .limit(30)
          .get()
        nodes.data.forEach((n) => {
          chainNodes[n.id] = n
        })
      }
    } catch (e) {
      chain = null
    }
  }

  // 当前用户标记
  const marks = { favorite: false, caught: false }
  if (OPENID) {
    try {
      const m = await db.collection('user_pokemon')
        .where({ _openid: OPENID, pokemonId: id })
        .limit(10)
        .get()
      m.data.forEach((doc) => {
        if (doc.type === 'favorite') marks.favorite = true
        if (doc.type === 'caught') marks.caught = true
      })
    } catch (e) {
      // 集合可能不存在，忽略
    }
  }

  return { ok: true, data: { pokemon: p, chain, chainNodes, marks } }
}
