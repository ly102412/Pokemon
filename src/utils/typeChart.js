/**
 * 属性克制表（第六世代及以后规则）与属性元信息
 * 数据与云函数 pokemon-sync 写入的 type_chart 集合保持一致
 */

export const TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
]

export const TYPE_META = {
  normal:   { zh: '一般',   color: '#a8a878', dark: true },
  fire:     { zh: '火',     color: '#f08030' },
  water:    { zh: '水',     color: '#6890f0' },
  electric: { zh: '电',     color: '#f8d030', dark: true },
  grass:    { zh: '草',     color: '#78c850' },
  ice:      { zh: '冰',     color: '#98d8d8', dark: true },
  fighting: { zh: '格斗',   color: '#c03028' },
  poison:   { zh: '毒',     color: '#a040a0' },
  ground:   { zh: '地面',   color: '#e0c068', dark: true },
  flying:   { zh: '飞行',   color: '#a890f0' },
  psychic:  { zh: '超能力', color: '#f85888' },
  bug:      { zh: '虫',     color: '#a8b820', dark: true },
  rock:     { zh: '岩石',   color: '#b8a038', dark: true },
  ghost:    { zh: '幽灵',   color: '#705898' },
  dragon:   { zh: '龙',     color: '#7038f8' },
  dark:     { zh: '恶',     color: '#705848' },
  steel:    { zh: '钢',     color: '#b8b8d0', dark: true },
  fairy:    { zh: '妖精',   color: '#ee99ac', dark: true },
}

/**
 * 攻击属性 → 对防守属性的效果倍率
 * 仅列出 ≠1 的关系：double=×2，half=×0.5，zero=×0
 */
export const ATTACK_CHART = {
  normal:   { double: ['rock', 'steel'], half: [], zero: ['ghost'] },
  fire:     { double: ['grass', 'ice', 'bug', 'steel'], half: ['fire', 'water', 'rock', 'dragon'], zero: [] },
  water:    { double: ['fire', 'ground', 'rock'], half: ['water', 'grass', 'dragon'], zero: [] },
  electric: { double: ['water', 'flying'], half: ['electric', 'grass', 'dragon'], zero: ['ground'] },
  grass:    { double: ['water', 'ground', 'rock'], half: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'], zero: [] },
  ice:      { double: ['grass', 'ground', 'flying', 'dragon'], half: ['fire', 'water', 'ice', 'steel'], zero: [] },
  fighting: { double: ['normal', 'ice', 'rock', 'dark', 'steel'], half: ['poison', 'flying', 'psychic', 'bug', 'fairy'], zero: ['ghost'] },
  poison:   { double: ['grass', 'fairy'], half: ['poison', 'ground', 'rock', 'ghost'], zero: ['steel'] },
  ground:   { double: ['fire', 'electric', 'poison', 'rock', 'steel'], half: ['grass', 'bug'], zero: ['flying'] },
  flying:   { double: ['grass', 'fighting', 'bug'], half: ['electric', 'rock', 'steel'], zero: [] },
  psychic:  { double: ['fighting', 'poison'], half: ['psychic', 'steel'], zero: ['dark'] },
  bug:      { double: ['grass', 'psychic', 'dark'], half: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'], zero: [] },
  rock:     { double: ['fire', 'ice', 'flying', 'bug'], half: ['fighting', 'ground', 'steel'], zero: [] },
  ghost:    { double: ['psychic', 'ghost'], half: ['dark'], zero: ['normal'] },
  dragon:   { double: ['dragon'], half: ['steel'], zero: ['fairy'] },
  dark:     { double: ['psychic', 'ghost'], half: ['fighting', 'dark', 'fairy'], zero: [] },
  steel:    { double: ['ice', 'rock', 'fairy'], half: ['fire', 'water', 'electric', 'steel'], zero: [] },
  fairy:    { double: ['fighting', 'dragon', 'dark'], half: ['fire', 'poison', 'steel'], zero: [] },
}

/** 单一攻击属性对单一防守属性的效果倍率 */
export function multiplier(atk, def) {
  const rel = ATTACK_CHART[atk]
  if (!rel) return 1
  if (rel.double.includes(def)) return 2
  if (rel.half.includes(def)) return 0.5
  if (rel.zero.includes(def)) return 0
  return 1
}

/**
 * 某攻击属性对一个（可能双）属性的防守方总倍率
 * @returns {number} 如 4 / 2 / 1 / 0.5 / 0.25 / 0
 */
export function multiplierAgainst(atk, defTypes) {
  return defTypes.reduce((acc, d) => acc * multiplier(atk, d), 1)
}

/**
 * 防守视角：给定防守方属性组合，返回 18 种攻击属性的效果
 * @returns {Array<{atk:string, mult:number}>} 按 mult 降序
 */
export function defendersReport(defTypes) {
  return TYPES.map((atk) => ({ atk, mult: multiplierAgainst(atk, defTypes) })).sort(
    (a, b) => b.mult - a.mult
  )
}

/** 倍率展示文本 */
export function multLabel(m) {
  if (m === 0) return '×0'
  if (m === 0.25) return '×¼'
  if (m === 0.5) return '×½'
  if (m === 1) return '×1'
  if (m === 2) return '×2'
  if (m === 4) return '×4'
  return `×${m}`
}
