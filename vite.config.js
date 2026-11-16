import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

/**
 * 同步云函数目录到编译产物（dist/dev|build/mp-weixin/cloudfunctions），
 * 并在 project.config.json 中写入 cloudfunctionRoot，
 * 使微信开发者工具能直接识别并上传云函数。
 */
function syncCloudFunctions() {
  return {
    name: 'sync-cloudfunctions',
    closeBundle() {
      const src = path.resolve(__dirname, 'cloudfunctions')
      if (!fs.existsSync(src)) return
      const outs = ['dist/dev/mp-weixin', 'dist/build/mp-weixin']
      for (const out of outs) {
        const outDir = path.resolve(__dirname, out)
        if (!fs.existsSync(outDir)) continue
        fs.cpSync(src, path.join(outDir, 'cloudfunctions'), { recursive: true })
        const pcPath = path.join(outDir, 'project.config.json')
        if (fs.existsSync(pcPath)) {
          try {
            const cfg = JSON.parse(fs.readFileSync(pcPath, 'utf8'))
            if (cfg.cloudfunctionRoot !== 'cloudfunctions/') {
              cfg.cloudfunctionRoot = 'cloudfunctions/'
              fs.writeFileSync(pcPath, JSON.stringify(cfg, null, 2))
            }
          } catch (e) {
            console.warn('[sync-cloudfunctions] 修补 project.config.json 失败:', e.message)
          }
        }
      }
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    uni(),
    syncCloudFunctions(),
  ],
})
