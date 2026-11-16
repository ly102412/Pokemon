/**
 * 云函数：my-pokemon
 * 我的收藏 / 已捕捉列表 + 计数统计
 * 入参：{ tab: 'favorite'|'caught', page, pageSize }
 * 返回 { ok, data: { list, total, counts: { favorite, caught }, pokemonTotal } }
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, message: '未获取到用户身份' }

  const input = event || {}
  const tab = ['favorite', 'caught'].includes(input.tab) ? input.tab : 'favorite'
  const page = Math.max(1, Number(input.page) || 1)
  const size = Math.min(60, Math.max(1, Number(input.pageSize) || 24))

  const marks = db.collection('user_pokemon')
  const mine = { _openid: OPENID }

  try {
    const [favC, caughtC, tabC, pkC, pageRes] = await Promise.all([
      marks.where({ ...mine, type: 'favorite' }).count(),
      marks.where({ ...mine, type: 'caught' }).count(),
      marks.where({ ...mine, type: tab }).count(),
      db.collection('pokemon').count(),
      marks
        .where({ ...mine, type: tab })
        .orderBy('createdAt', 'desc')
        .skip((page - 1) * size)
        .limit(size)
        .get(),
    ])

    // 用标记记录回查宝可梦摘要
    const ids = pageRes.data.map((d) => d.pokemonId)
    let list = []
    if (ids.length) {
      const pks = await db.collection('pokemon')
        .where({ id: _.in(ids) })
        .field({
          id: true,
          nameZh: true,
          nameEn: true,
          types: true,
          gen: true,
          thumbFileId: true,
          thumbUrl: true,
        })
        .limit(60)
        .get()
      const map = {}
      pks.data.forEach((p) => {
        map[p.id] = p
      })
      list = ids.filter((i) => map[i]).map((i) => map[i])
    }

    return {
      ok: true,
      data: {
        list,
        total: tabC.total,
        counts: { favorite: favC.total, caught: caughtC.total },
        pokemonTotal: pkC.total,
      },
    }
  } catch (e) {
    return { ok: false, message: '查询失败：' + (e.message || e) }
  }
}
