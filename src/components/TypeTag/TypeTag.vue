<template>
  <text
    class="type-tag"
    :style="{ background: meta.color, color: meta.dark ? '#4a4433' : '#ffffff' }"
  >{{ meta.zh }}</text>
</template>

<script>
import { TYPE_META } from '../../utils/typeChart'

export default {
  name: 'TypeTag',
  props: {
    type: { type: String, required: true },
  },
  computed: {
    meta() {
      return TYPE_META[this.type] || { zh: this.type, color: '#9aa0a6' }
    },
  },
}
</script>

<style scoped>
.type-tag {
  display: inline-block;
  font-size: 22rpx;
  line-height: 1;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  color: #ffffff;
}
</style>
