/**
 * 云函数：pokemon-list
 * 图鉴分页查询：世代筛选 / 属性筛选 / 名称编号搜索
 * 入参：{ page, pageSize, gen, type, keyword }
 * 返回 { ok, data: { total, list } }
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const escapeReg = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

exports.main = async (event) => {
  const input = event || {}
  const page = Math.max(1, Number(input.page) || 1)
  const size = Math.min(60, Math.max(1, Number(input.pageSize) || 24))
  const gen = Number(input.gen) || 0
  const type = typeof input.type === 'string' ? input.type.trim() : ''
  const keyword = typeof input.keyword === 'string' ? input.keyword.trim() : ''

  // 组合查询条件（AND），其中名称搜索本身是一个 OR 组
  const terms = []
  if (gen > 0) terms.push({ gen })
  if (type) terms.push({ types: type }) // 数组字段相等查询即"包含"
  if (keyword) {
    const kw = escapeReg(keyword)
    const rx = () => db.RegExp({ regexp: kw, options: 'i' })
    const orItems = [{ nameZh: rx() }, { nameEn: rx() }, { nameJa: rx() }]
    if (/^\d+$/.test(keyword)) orItems.push({ id: Number(keyword) })
    terms.push(_.or(orItems))
  }

  let where = {}
  if (terms.length === 1) where = terms[0]
  else if (terms.length > 1) where = _.and(terms)

  try {
    const col = db.collection('pokemon')
    const countRes = await col.where(where).count()
    const res = await col
      .where(where)
      .orderBy('id', 'asc')
      .skip((page - 1) * size)
      .limit(size)
      .field({
        id: true,
        nameZh: true,
        nameEn: true,
        types: true,
        gen: true,
        thumbFileId: true,
        thumbUrl: true,
      })
      .get()
    return { ok: true, data: { total: countRes.total, list: res.data } }
  } catch (e) {
    return { ok: false, message: '图鉴数据不存在，请先运行 pokemon-sync 同步数据' }
  }
}
