# 宝可梦图鉴小程序

基于 **uni-app (Vue3 + Vite)** + **微信云开发（云函数 / 云数据库 / 云存储）** 的宝可梦图鉴工具类小程序。

数据来源：[PokéAPI](https://pokeapi.co/)（云函数代理拉取并缓存到云数据库，中文名称/描述来自官方简中语种数据，图片下载至云存储加速国内访问）。

## 功能

| 模块 | 说明 |
|---|---|
| 图鉴浏览 | 分代 Tab（一~九代）、18 属性筛选、中文名/英文名/编号搜索、触底分页 |
| 图鉴详情 | 官方立绘、中日文名、种族值条形图、特性（中文描述）、图鉴说明、进化链（可点击跳转）、被攻击时的弱点/抵抗/免疫 |
| 收藏与捕捉 | 微信静默登录（openid）、收藏 ⭐ / 捕捉 ● 标记，云端同步 |
| 个人中心 | 头像昵称采集（新版规范能力）、收藏/捕捉计数、图鉴完成度进度条 |
| 属性克制查询 | 选 1~2 个攻击属性，查看对 18 种防守属性的效果（Gen6+ 规则，纯前端静态数据） |

## 目录结构

```
├── src/                        # 小程序源码（uni-app）
│   ├── pages/
│   │   ├── dex/list.vue        # 图鉴列表（tab）
│   │   ├── dex/detail.vue      # 图鉴详情
│   │   ├── tools/type-chart.vue# 属性克制查询（tab）
│   │   └── user/center.vue     # 个人中心（tab）
│   ├── components/             # TypeTag / PokeCard / StatBar / EvolutionChain（easycom）
│   ├── utils/                  # cloud.js 云函数封装 / typeChart.js 克制表 / format.js
│   ├── config.js               # 云开发环境 ID 配置
│   └── pages.json / manifest.json / App.vue
├── cloudfunctions/             # 云函数（构建时自动拷入 dist/*/mp-weixin/cloudfunctions）
│   ├── login/                  # openid 登录 + users 记录
│   ├── pokemon-sync/           # PokéAPI → 云数据库/云存储 同步（管理型，需 secret）
│   ├── pokemon-list/           # 图鉴分页/筛选/搜索
│   ├── pokemon-detail/         # 详情聚合（主数据+进化链+我的标记）
│   ├── mark/                   # 收藏/捕捉标记增删
│   └── my-pokemon/             # 我的列表 + 完成度统计
├── scripts/gen-icons.mjs       # tabBar 图标生成脚本（纯 Node）
└── vite.config.js              # uni 插件 + 云函数目录同步
```

## 快速开始

### 前置条件

1. [微信小程序 AppID](https://mp.weixin.qq.com/)（个人主体即可；云开发需实名）
2. [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)（稳定版，开启「服务端口」）
3. Node.js ≥ 18

### 步骤

```bash
# 1. 安装依赖
npm install

# 2. 填写你的小程序 AppID（两处）
#    src/manifest.json → mp-weixin.appid
#    （不填则使用游客模式，无法使用云开发）

# 3. 填写云开发环境 ID（可选：账号下只有一个环境时可留空）
#    src/config.js → CLOUD_ENV_ID

# 4. 开发模式（watch 编译，云函数目录会自动同步到 dist）
npm run dev:mp-weixin

# 5. 微信开发者工具 → 导入项目 → 目录选择 dist/dev/mp-weixin
```

### 开通云开发

1. 开发者工具顶部「云开发」→ 开通，创建环境（基础版免费额度足够 MVP）。
2. 在云开发控制台 → 数据库，创建以下集合并设置权限：

| 集合 | 权限 | 说明 |
|---|---|---|
| `pokemon` | 仅管理端可读写 | 图鉴主数据 |
| `evolution_chains` | 仅管理端可读写 | 进化链 |
| `type_chart` | 仅管理端可读写 | 克制关系 |
| `users` | 仅创建者可读写 | 用户资料（头像昵称） |
| `user_pokemon` | 仅管理端可读写 | 收藏/捕捉标记 |

> 所有读写均通过云函数完成（管理端），所以集合即使全设为"仅管理端可读写"也不影响功能；`users` 需要客户端写入头像昵称所以设为仅创建者可读写。

3. 建议索引（控制台 → 数据库 → 索引管理，可选但推荐）：
   - `user_pokemon`：`_openid + pokemonId + type` 唯一索引
   - `pokemon`：`gen`、`types` 单字段索引

### 部署云函数

开发者工具中，对 `dist/dev/mp-weixin/cloudfunctions` 下的**每个函数目录**右键 →「上传并部署：云端安装依赖（不上传 node_modules）」。

### 同步宝可梦数据

`pokemon-sync` 为管理型函数，调用需 secret（环境变量 `SYNC_SECRET`，默认 `pokedex-admin`，可在云开发控制台 → 云函数 → 配置 → 环境变量修改）。

在开发者工具 → 云函数 → pokemon-sync → 云端测试（或「测试」按钮）中依次调用：

```jsonc
// ① 同步 18 属性克制表（一次性）
{ "secret": "pokedex-admin", "mode": "types" }

// ② 同步第一代数据（151 只 + 进化链）
{ "secret": "pokedex-admin", "mode": "data", "gen": 1 }

// ③ 同步第一代图片到云存储（可与②分开调用，避免超时）
{ "secret": "pokedex-admin", "mode": "images", "gen": 1 }

// ④ 验证没问题后，按世代继续（gen: 2~9），或按区间：
{ "secret": "pokedex-admin", "mode": "data", "start": 906, "end": 1025 }
```

> 单次区间上限 200 只（云函数 60s 超时保护），全图鉴 1025 只需分多次调用。图片同步失败不影响使用，会自动退回 PokéAPI 原始图片地址。

## 其他说明

- **图片域名**：图片优先走云存储 fileID（无需任何域名配置）。兜底原始地址 `raw.githubusercontent.com` 在开发工具中因 `urlCheck: false` 可直接加载；正式上线前若依赖兜底地址，需在小程序后台配置 downloadFile 合法域名，建议全量同步云存储图片后则无需配置。
- **重新生成 tabBar 图标**：`node scripts/gen-icons.mjs`（占位图标，可自行替换 `src/static/tabbar/*.png`）。
- **生产构建**：`npm run build:mp-weixin`，产物在 `dist/build/mp-weixin`。

## 常见问题

- **列表页提示「图鉴数据不存在」**：先按上文执行 `pokemon-sync` 的 `mode: data`。
- **详情页图片不显示**：确认已完成 `mode: images` 同步，或等待兜底地址加载（需网络可访问 GitHub）。
- **开发者工具导入后云函数目录无标识**：确认导入目录是 `dist/dev/mp-weixin`（其 `project.config.json` 已含 `cloudfunctionRoot`）。

## Roadmap

- [ ] 拼音首字母搜索优化
- [ ] 招式（Moves）列表
- [ ] 猜宝可梦答题玩法 + 排行榜
- [ ] 图鉴完成度分段成就

## License

MIT
