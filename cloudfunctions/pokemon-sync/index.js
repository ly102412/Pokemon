/**
 * 云函数：pokemon-sync（管理型，需 secret）
 * 从 PokéAPI 同步数据到云数据库 / 云存储，按批次调用以避开云函数超时
 *
 * 入参：
 *   { secret, mode: 'types' }                          —— 同步 18 属性克制关系到 type_chart
 *   { secret, mode: 'data', gen: 1 }                   —— 同步某世代图鉴数据 + 进化链
 *   { secret, mode: 'data', start: 1, end: 151 }       —— 按 ID 区间同步（单次上限 200）
 *   { secret, mode: 'images', gen: 1 }                 —— 下载该范围图片到云存储
 *
 * secret 由环境变量 SYNC_SECRET 指定，默认 pokedex-admin（可在云开发控制台修改）
 */
const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const API = 'https://pokeapi.co/api/v2'
const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'
const ZH = 'zh-Hans'

const GEN_RANGES = {
  1: [1, 151],
  2: [152, 251],
  3: [252, 386],
  4: [387, 493],
  5: [494, 649],
  6: [650, 721],
  7: [722, 809],
  8: [810, 905],
  9: [906, 1025],
}

const TYPE_KEYS = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
]

const TYPE_ZH = {
  normal: '一般', fire: '火', water: '水', electric: '电', grass: '草', ice: '冰',
  fighting: '格斗', poison: '毒', ground: '地面', flying: '飞行', psychic: '超能力',
  bug: '虫', rock: '岩石', ghost: '幽灵', dragon: '龙', dark: '恶', steel: '钢', fairy: '妖精',
}

/* ---------------- 工具函数 ---------------- */

function genOf(id) {
  for (const g of Object.keys(GEN_RANGES)) {
    const [s, e] = GEN_RANGES[g]
    if (id >= s && id <= e) return Number(g)
  }
  return 0
}

function idFromUrl(url) {
  const m = /\/(\d+)\/?$/.exec(url || '')
  return m ? Number(m[1]) : 0
}

function getJSON(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { 'User-Agent': 'pokemon-dex-miniprogram', Accept: 'application/json' }, timeout },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          return resolve(getJSON(res.headers.location, timeout))
        }
        if (res.statusCode !== 200) {
          res.resume()
          return reject(new Error(`HTTP ${res.statusCode}: ${url}`))
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
          } catch (e) {
            reject(new Error('JSON 解析失败: ' + url))
          }
        })
      }
    )
    req.on('timeout', () => req.destroy(new Error('请求超时: ' + url)))
    req.on('error', reject)
  })
}

function getBuffer(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        return resolve(getBuffer(res.headers.location, timeout))
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode}: ${url}`))
      }
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
    })
    req.on('timeout', () => req.destroy(new Error('下载超时: ' + url)))
    req.on('error', reject)
  })
}

/** 简单并发池 */
async function pool(items, limit, worker) {
  const results = []
  let i = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++
      try {
        results[idx] = { ok: true, value: await worker(items[idx]) }
      } catch (e) {
        results[idx] = { ok: false, error: (e && e.message) || String(e) }
      }
    }
  })
  await Promise.all(runners)
  return results
}

const pickName = (names) => {
  const n = (names || []).find((x) => x.language && x.language.name === ZH)
  return n ? n.name : ''
}

const pickNameBy = (names, lang) => {
  const n = (names || []).find((x) => x.language && x.language.name === lang)
  return n ? n.name : ''
}

const pickFlavor = (entries) => {
  const list = (entries || []).filter((x) => x.language && x.language.name === ZH)
  const last = list[list.length - 1]
  return last ? String(last.flavor_text || '').replace(/[\n\f\r]+/g, ' ') : ''
}

const pickGenus = (genera) => {
  const g = (genera || []).find((x) => x.language && x.language.name === ZH)
  return g ? g.genus : ''
}

function triggerZh(d) {
  if (!d || !d.trigger) return ''
  switch (d.trigger.name) {
    case 'level-up':
      if (d.min_level) return `Lv.${d.min_level}`
      if (d.min_happiness) return '亲密度'
      return '升级'
    case 'use-item':
      return '使用道具'
    case 'trade':
      return '交换'
    default:
      return '特殊条件'
  }
}

async function ensureCollections() {
  for (const name of ['pokemon', 'evolution_chains', 'type_chart']) {
    try {
      await db.createCollection(name)
    } catch (e) {
      /* 已存在 */
    }
  }
}

/** 解析同步区间 */
function resolveRange(input) {
  let start = 1
  let end = 151
  if (Number(input.gen) > 0 && GEN_RANGES[input.gen]) {
    ;[start, end] = GEN_RANGES[input.gen]
  } else if (Number(input.start) > 0 && Number(input.end) > 0) {
    start = Number(input.start)
    end = Number(input.end)
  }
  const MAX_BATCH = 200
  end = Math.min(end, start + MAX_BATCH - 1, 1025)
  return { start, end }
}

/* ---------------- 三种同步模式 ---------------- */

/** 同步属性克制表 */
async function syncTypes() {
  const results = await pool(TYPE_KEYS, 4, async (name) => {
    const t = await getJSON(`${API}/type/${name}/`)
    const dr = t.damage_relations || {}
    const doc = {
      name,
      zh: TYPE_ZH[name],
      doubleDamageTo: (dr.double_damage_to || []).map((x) => x.name),
      halfDamageTo: (dr.half_damage_to || []).map((x) => x.name),
      noDamageTo: (dr.no_damage_to || []).map((x) => x.name),
    }
    await db.collection('type_chart').doc(name).set({ data: doc })
    return name
  })
  return {
    success: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).map((r) => r.error),
  }
}

/** 同步图鉴主数据 + 进化链 */
async function syncData(start, end) {
  const ids = []
  for (let i = start; i <= end; i++) ids.push(i)

  const results = await pool(ids, 6, async (id) => {
    const [pk, sp] = await Promise.all([
      getJSON(`${API}/pokemon/${id}`),
      getJSON(`${API}/pokemon-species/${id}`),
    ])

    // 特性（含中文描述）
    const abilityResults = await pool(pk.abilities || [], 3, async (a) => {
      const ab = await getJSON(a.ability.url)
      return {
        nameEn: a.ability.name,
        nameZh: pickName(ab.names),
        descZh: pickFlavor(ab.flavor_text_entries),
        isHidden: !!a.is_hidden,
      }
    })
    const abilities = abilityResults.filter((r) => r.ok).map((r) => r.value)

    const stats = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    const statKeyMap = {
      hp: 'hp', attack: 'atk', defense: 'def',
      'special-attack': 'spa', 'special-defense': 'spd', speed: 'spe',
    }
    ;(pk.stats || []).forEach((s) => {
      const key = statKeyMap[s.stat && s.stat.name]
      if (key) stats[key] = s.base_stat
    })

    const chainId = sp.evolution_chain ? idFromUrl(sp.evolution_chain.url) : 0

    const doc = {
      id,
      nameEn: pk.name,
      nameZh: pickName(sp.names),
      nameJa: pickNameBy(sp.names, 'ja') || pickNameBy(sp.names, 'ja-Hrkt'),
      types: (pk.types || []).slice().sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
      stats,
      height: pk.height,
      weight: pk.weight,
      baseExp: pk.base_experience,
      abilities,
      genus: pickGenus(sp.genera),
      flavorTextZh: pickFlavor(sp.flavor_text_entries),
      captureRate: sp.capture_rate,
      genderRate: sp.gender_rate,
      chainId,
      gen: genOf(id),
      thumbUrl: `${SPRITE_BASE}/${id}.png`,
      artUrl: `${SPRITE_BASE}/other/official-artwork/${id}.png`,
      syncedAt: Date.now(),
    }

    // 保留已同步过的云存储图片 ID（set 会整篇覆盖）
    try {
      const old = await db.collection('pokemon').doc(String(id)).get()
      if (old.data) {
        doc.thumbFileId = old.data.thumbFileId || null
        doc.artFileId = old.data.artFileId || null
      }
    } catch (e) {
      /* 首次同步无旧文档 */
    }

    await db.collection('pokemon').doc(String(id)).set({ data: doc })
    return { id, chainId }
  })

  const okItems = results.filter((r) => r.ok).map((r) => r.value)
  const chainIds = [...new Set(okItems.map((v) => v.chainId).filter(Boolean))]

  // 进化链
  const chainResults = await pool(chainIds, 4, async (chainId) => {
    const ec = await getJSON(`${API}/evolution-chain/${chainId}/`)
    const edges = []
    const walk = (node) => {
      const fromId = idFromUrl(node.species.url)
      ;(node.evolves_to || []).forEach((child) => {
        const toId = idFromUrl(child.species.url)
        const d = (child.evolution_details && child.evolution_details[0]) || {}
        edges.push({ from: fromId, to: toId, trigger: triggerZh(d) })
        walk(child)
      })
    }
    walk(ec.chain)
    const doc = { chainId, rootId: idFromUrl(ec.chain.species.url), edges }
    await db.collection('evolution_chains').doc(String(chainId)).set({ data: doc })
    return chainId
  })

  return {
    success: okItems.length,
    failed: results.filter((r) => !r.ok).map((r) => ({ id: r.id || '', error: r.error })).slice(0, 20),
    chains: chainResults.filter((r) => r.ok).length,
    chainFailed: chainResults.filter((r) => !r.ok).map((r) => r.error).slice(0, 10),
  }
}

/** 下载图片到云存储并回写 fileID */
async function syncImages(start, end) {
  const ids = []
  for (let i = start; i <= end; i++) ids.push(i)

  const results = await pool(ids, 5, async (id) => {
    const docRef = db.collection('pokemon').doc(String(id))
    let old
    try {
      old = await docRef.get()
    } catch (e) {
      throw new Error(`#${id} 数据未同步，请先执行 mode=data`)
    }
    const data = old.data || {}
    if (data.thumbFileId && data.artFileId) return 'skip'

    const update = {}
    if (!data.thumbFileId) {
      try {
        const buf = await getBuffer(`${SPRITE_BASE}/${id}.png`)
        const up = await cloud.uploadFile({
          cloudPath: `pokemon/${id}/thumb.png`,
          fileContent: buf,
        })
        update.thumbFileId = up.fileID
      } catch (e) {
        // 下载失败保留原始 URL 兜底
      }
    }
    if (!data.artFileId) {
      try {
        const buf = await getBuffer(`${SPRITE_BASE}/other/official-artwork/${id}.png`)
        const up = await cloud.uploadFile({
          cloudPath: `pokemon/${id}/art.png`,
          fileContent: buf,
        })
        update.artFileId = up.fileID
      } catch (e) {
        /* 同上 */
      }
    }
    if (Object.keys(update).length) {
      await docRef.update({ data: update })
    }
    return Object.keys(update).length ? 'synced' : 'skip'
  })

  return {
    success: results.filter((r) => r.ok).length,
    synced: results.filter((r) => r.ok && r.value === 'synced').length,
    skipped: results.filter((r) => r.ok && r.value === 'skip').length,
    failed: results.filter((r) => !r.ok).map((r) => ({ id: r.id || '', error: r.error })).slice(0, 20),
  }
}

/* ---------------- 入口 ---------------- */

exports.main = async (event) => {
  const input = event || {}
  const SECRET = process.env.SYNC_SECRET || 'pokedex-admin'
  if (input.secret !== SECRET) {
    return { ok: false, message: '密钥错误，拒绝同步' }
  }

  const mode = ['types', 'data', 'images'].includes(input.mode) ? input.mode : 'data'
  await ensureCollections()
  const { start, end } = resolveRange(input)

  let result
  if (mode === 'types') {
    result = await syncTypes()
  } else if (mode === 'images') {
    result = await syncImages(start, end)
  } else {
    result = await syncData(start, end)
  }

  return {
    ok: true,
    data: { mode, range: [start, end], ...result },
  }
}
