<template>
  <view v-if="columns.length" class="evo-chain">
    <template v-for="(col, ci) in columns" :key="ci">
      <view v-if="ci > 0" class="evo-arrows">
        <text class="arrow">→</text>
      </view>
      <view class="evo-col">
        <view
          v-for="node in col"
          :key="node.id"
          class="evo-node"
          :class="{ current: node.id === currentId }"
          @tap="goDetail(node.id)"
        >
          <image
            class="evo-img"
            :src="node.thumbFileId || node.thumbUrl"
            mode="aspectFit"
          />
          <text class="evo-name">{{ node.nameZh || node.nameEn }}</text>
          <text v-if="node.trigger" class="evo-trigger">{{ node.trigger }}</text>
        </view>
      </view>
    </template>
  </view>
  <view v-else class="evo-empty">暂无进化信息</view>
</template>

<script>
/**
 * 进化链展示：按深度分列，分支纵向堆叠（如伊布家族）
 * chain: { rootId, edges: [{ from, to, trigger }] }
 * nodesMap: { [id]: { id, nameZh, nameEn, thumbFileId, thumbUrl } }
 */
export default {
  name: 'EvolutionChain',
  props: {
    chain: { type: Object, default: null },
    nodesMap: { type: Object, default: () => ({}) },
    currentId: { type: Number, default: 0 },
  },
  computed: {
    columns() {
      const chain = this.chain
      if (!chain || !chain.edges || !chain.edges.length) return []
      const nodesMap = this.nodesMap
      const edges = chain.edges

      // 由根节点 BFS 计算每个宝可梦的深度
      const depth = { [chain.rootId]: 0 }
      const children = {}
      edges.forEach((e) => {
        ;(children[e.from] = children[e.from] || []).push(e)
      })
      const queue = [chain.rootId]
      while (queue.length) {
        const cur = queue.shift()
        ;(children[cur] || []).forEach((e) => {
          if (depth[e.to] === undefined) {
            depth[e.to] = depth[cur] + 1
            queue.push(e.to)
          }
        })
      }

      // 触发条件：to 节点展示其入边 trigger
      const triggerOf = {}
      edges.forEach((e) => {
        if (!triggerOf[e.to]) triggerOf[e.to] = e.trigger || ''
      })

      const maxDepth = Math.max(...Object.values(depth))
      const cols = []
      for (let d = 0; d <= maxDepth; d++) {
        const ids = Object.keys(depth)
          .filter((id) => depth[id] === d)
          .map(Number)
          .sort((a, b) => a - b)
        cols.push(
          ids.map((id) => ({
            id,
            nameZh: nodesMap[id] && nodesMap[id].nameZh,
            nameEn: nodesMap[id] && nodesMap[id].nameEn,
            thumbFileId: nodesMap[id] && nodesMap[id].thumbFileId,
            thumbUrl: nodesMap[id] && nodesMap[id].thumbUrl,
            trigger: d === 0 ? '' : triggerOf[id] || '',
          }))
        )
      }
      return cols
    },
  },
  methods: {
    goDetail(id) {
      if (id === this.currentId) return
      uni.navigateTo({ url: `/pages/dex/detail?id=${id}` })
    },
  },
}
</script>

<style scoped>
.evo-chain {
  display: flex;
  align-items: flex-start;
  overflow-x: auto;
  padding: 10rpx 4rpx;
}

.evo-arrows {
  align-self: center;
  padding: 0 8rpx;
}

.arrow {
  font-size: 32rpx;
  color: var(--pk-sub);
}

.evo-col {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.evo-node {
  width: 150rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12rpx 8rpx;
  border-radius: 16rpx;
  border: 3rpx solid transparent;
}

.evo-node.current {
  border-color: var(--pk-red);
  background: #fdf0f0;
}

.evo-img {
  width: 120rpx;
  height: 120rpx;
}

.evo-name {
  font-size: 24rpx;
  margin-top: 6rpx;
}

.evo-trigger {
  font-size: 20rpx;
  color: var(--pk-sub);
  margin-top: 2rpx;
}

.evo-empty {
  color: var(--pk-sub);
  font-size: 24rpx;
}
</style>
