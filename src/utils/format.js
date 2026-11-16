/**
 * 图鉴通用常量与格式化工具
 */

/** 世代范围（按全国图鉴编号） */
export const GENS = [
  { gen: 1, label: '一代', region: '关都', start: 1, end: 151 },
  { gen: 2, label: '二代', region: '城都', start: 152, end: 251 },
  { gen: 3, label: '三代', region: '丰缘', start: 252, end: 386 },
  { gen: 4, label: '四代', region: '神奥', start: 387, end: 493 },
  { gen: 5, label: '五代', region: '合众', start: 494, end: 649 },
  { gen: 6, label: '六代', region: '卡洛斯', start: 650, end: 721 },
  { gen: 7, label: '七代', region: '阿罗拉', start: 722, end: 809 },
  { gen: 8, label: '八代', region: '伽勒尔', start: 810, end: 905 },
  { gen: 9, label: '九代', region: '帕底亚', start: 906, end: 1025 },
]

/** 编号 → 世代，未知返回 0 */
export function genOf(id) {
  const g = GENS.find((x) => id >= x.start && id <= x.end)
  return g ? g.gen : 0
}

/** 编号格式化：1 → #001 */
export function padId(id) {
  return `#${String(id).padStart(4, '0')}`
}

/** 分米 → 米 */
export function fmtHeight(dm) {
  if (dm == null) return '-'
  return `${(dm / 10).toFixed(1)} m`
}

/** 百克 → 千克 */
export function fmtWeight(hg) {
  if (hg == null) return '-'
  return `${(hg / 10).toFixed(1)} kg`
}

/** 捕获率 0-255 → 百分比描述 */
export function fmtCaptureRate(rate) {
  if (rate == null) return '-'
  return `${Math.round((rate / 255) * 100)}%`
}
