# 交接文档：公众号批量取关插件 + 博客

- 更新时间：2026-10-25
- 项目目录：`/Users/Ven/projects/projects-web/wechat-unfollow`（工作区里是 `assists-wkspc/wechat-unfollow`）
- 插件包名：`cn.assists.demo.unfollow`
- 设备：红米 K50（22041211AC），AssistsX `1.1.3-3.5.10`，微信 `com.tencent.mm`

---

## 一、任务目标

两件事，互相支撑：

1. **做一个真实可跑的 AssistsX Vue 插件**：微信「公众号批量取关」。
   产品形态是**两阶段人工确认流**：
   - 阶段 A（扫描）：打开微信 → 通讯录 → 公众号列表 → 滚动收集全部公众号名称 → 持久化 → 自动回到 AssistsX。
   - 阶段 B（勾选 + 取关）：用户在插件首页勾选要取关的账号 → 点「批量取关」→ 插件回到公众号列表，按名称逐个匹配并执行取关。
2. **写一篇博客**推广 Assists 生态（`assists` / `assistsx` / `assistsx-js` / `assists-mcp`），主线是「coding agent 通过 assists-mcp 开发 Android 自动化插件」。风格：**故事为主**，代码精简。博客由 Agent 起草，缺图和真实数字由作者补。

---

## 二、当前进度（一句话）

**扫描链路已完整跑通并验证；真实取关流程代码已完成，但尚未实际执行。博客只有骨架，正文未写。**

---

## 三、已完成

### 1. 探针（真机验证，全部记录在 `probe-session.md`）

| 步骤 | 结论 |
|------|------|
| 启动微信 | `AssistsXAsync.launchApp('com.tencent.mm')` + `getPackageName()` 复核 |
| 底部「通讯录」 | `TextView#icon_tv` text=`通讯录`（四个 Tab 共用 id），点父节点 |
| 公众号入口 | `TextView#n6` text=`公众号、服务号和企业号` |
| 列表容器 | `ListView#i3y`，`isScrollable=true` |
| 账号名 | `TextView#awx`（left=165） |
| 字母分组头 | `TextView#bdd` |
| 列表到底 | 底部文案正则 `^\d+个公众号和服务号$`；同时 `scrollForward()` 返回 `false` |
| 详情页标题 | `TextView#amj`（用于校验没点错账号） |
| 右上角更多 | `ImageView#fs`，des=`更多信息` |
| 更多菜单 | 底部弹窗：设为星标 / 更多信息 / 设置 / 投诉 / **不再关注** / 取消 |
| 不再关注 | `TextView#obc` text=`不再关注`，可点父节点 `LinearLayout#m7g` |
| 确认弹窗 | 独立窗口，「仍然关注」/「不再关注」，按钮取最右侧 |
| 返回列表 | 取消后 `back()` 可回列表；列表回到原滚动位置 |

> 探针时点开的是「智子看科技」，在确认弹窗处点了「仍然关注」取消，**没有真实取关**。

### 2. 工程脚手架与代码

已用 `create-assistsx-vue --here` 建好工程，主要文件：

```text
wechat-unfollow/
├─ handoff.md                 # 本文档
├─ probe-session.md           # 探针唯一事实源
├─ docs/
│  ├─ blog-outline.md         # 博客骨架（已有，283 行）
│  └─ assets/                 # 待补截图目录（空）
├─ public/config.json         # name=公众号批量取关，packageName=cn.assists.demo.unfollow
├─ index.html                 # title 已改为「公众号批量取关」
├─ src/
│  ├─ App.vue                 # 浮窗路由全屏 + A11y 引导弹窗
│  ├─ router/index.ts         # /、/runner、/examples/log-panel
│  ├─ views/
│  │  ├─ HomePage.vue         # 扫描入口 + 勾选列表 + 批量取关
│  │  └─ RunnerFloatPanel.vue # 浮窗：状态、进度、实时日志、停止/关闭
│  ├─ composables/useA11yGuard.ts      # 从 assistsx-plugin-simple 复制
│  ├─ components/A11yGuideDialog.vue   # 同上
│  ├─ steps/app-launch.ts              # 模板自带（启动/小米安全弹窗/双开），已修一处 null 类型错误
│  └─ core/steps/wechat/
│     ├─ wechat-selectors.ts  # 全部选择器集中在此
│     ├─ wechat-types.ts      # StepData / ScanResult / Checkpoint / 默认配置
│     ├─ wechat-utils.ts      # 节点查找、点击、随机延时
│     ├─ wechat-store.ts      # mmkv 持久化（mmkvId = 'unfollow'）
│     ├─ wechat-main.ts       # 启动微信 → 通讯录
│     ├─ wechat-official-accounts.ts # 进公众号列表、回顶部、扫描、按名称找目标
│     ├─ wechat-account-detail.ts    # 详情页 → 更多 → 不再关注 → 确认 → 回列表
│     └─ wechat-unfollow.ts   # 编排：开始/记账/熔断/收尾/回宿主
```

- 已删除模板里的 `src/steps/douyin-main.ts`、`src/views/TestFloatPanel.vue`。
- `npm run typecheck` 通过。
- `npm run dev` 正常，Vite 监听 `0.0.0.0:5173`，本机局域网地址 `http://192.168.0.2:5173`。

### 3. 插件安装与扫描验证（真实结果）

- `install_lan_plugin` 成功，`list_plugins` 可见 `公众号批量取关 / cn.assists.demo.unfollow`。
- `run_plugin` 打开首页，点击「扫描公众号」后完整跑通，插件日志：

```text
2026-10-25 10:09:11  [list] 已回到列表顶部
2026-10-25 10:09:12  [scan] 第 1 轮，累计 13 个
2026-10-25 10:09:14  [scan] 第 2 轮，累计 17 个
2026-10-25 10:09:16  扫描完成：共 17 个公众号
2026-10-25 10:09:16  [wechat] 返回 AssistsX
```

- 首页正确渲染 17 个公众号，支持搜索、全选、清空、勾选、试运行开关。
- 扫描结束后自动回到 AssistsX 并关闭浮窗，符合设计。

### 4. 已修复的问题（博客可用素材）

1. **浮窗打不开：`net::ERR_CONNECTION_REFUSED`**
   - 原因：`float.open('/runner?...')` 用相对路径，宿主把它当成本地插件资源去加载。
   - 修复：改为 `window.location.origin + path` 的绝对地址（`HomePage.vue` 的 `openRunner`）。
2. **模板编译错误**：`app-launch.ts` 里 `findFirstParentClickable()` 可能返回 null，已加判空。
3. **执行环境坑**：`execute_js` 的 `{ok:true}` 不等于业务成功；启动微信后仍需 `getPackageName()` 复核。

---

## 四、剩下需要完成的内容

### A. 真实取关验证（第一优先级）

当前手机状态（若未重启/未清数据）：插件首页已勾选 **编译师、吃喝玩乐Kan、智子看科技**，底部显示「已选 3 / 17」。

**下一步操作**：在手机上点蓝色的「批量取关（3）」按钮。之后预期：

1. 打开浮窗 runner，启动微信，回到公众号列表；
2. 逐个按名称匹配 → 进详情 → 更多 → 不再关注 → 确认；
3. 每项之间随机 2.5–5 秒，失败 3 次熔断；
4. 结束后切回 AssistsX 并关闭浮窗，首页显示「成功 3」。

**需要确认的点**：

- [ ] 取关后微信是否自动关闭详情页、列表是否立即刷新（`backToList` 有兜底）；
- [ ] 成功计数是否与实际一致（当前实现：点下确认即计成功，未做二次校验）；
- [ ] 断点续跑（`mmkv` 的 `wu:run:v1`）是否可用；
- [ ] 试运行（dry-run）分支是否正常（本次未用）。

### B. 已知限制 / 可改进项

- **WebView 行点击**：列表行的 `<li>` 对无障碍 `ACTION_CLICK` / 注入手势不响应，自动化脚本无法替用户勾选；目前设计为**用户手动勾选**（符合产品定位）。如果以后想让 Agent 也能勾选，可给每行加 `role="button"`/真实 `<input type="checkbox">`，或提供「按名称添加」的输入框。
- 部分 DOM 按钮（如「清空」「批量取关」）的无障碍点击不稳定，真人点击正常。若要做无人值守，建议改用原生控件或提供 MCP 可调的入口。
- 成功计数建议后续加入「列表里该名称消失」的二次校验。
- 未写 README；未做 git init / commit。

### C. 博客

目前只有 `docs/blog-outline.md`（骨架）。**正文 `docs/blog.md` 还没有创建**。下一步：

1. 按骨架写正文（故事为主）；
2. 缺图处用约定标记，例如：

   ```markdown
   <!-- ASSET: fig-05-01 | 微信通讯录页面探针截图 | 待补 -->
   > 图 5-1 微信通讯录页面（截图待补：`assets/fig-05-01-wechat-contacts.png`）
   ```

3. 数据占位统一 `{{...}}`，例如 `{{扫描耗时}}`、`{{公众号总数}}`、`{{成功取关数}}`；
4. 生成 `docs/assets/README.md` 素材清单；
5. 已可用的真实数据：扫描 17 个、耗时约 5 秒、2 轮、插件日志原文（见上）、`ERR_CONNECTION_REFUSED` 的修复经过；
6. 待补真实数据：真实取关数量与耗时、失败/重试情况、浮窗运行截图、30 秒录屏。

---

## 五、如何继续（恢复现场）

### 1. 环境前置

```bash
cd /Users/Ven/projects/projects-web/wechat-unfollow
npm install            # 一般已装好
npm run dev            # 保持运行，手机需要能访问 http://<本机局域网IP>:5173
```

- 本机当前局域网 IP：`192.168.0.2`（变了需要重新安装插件）。
- 手机与电脑同一 Wi-Fi；手机浏览器先访问一次 `http://192.168.0.2:5173` 验证连通。

### 2. MCP 与手机

```bash
claude mcp add --scope user --transport http assists https://admin.assists.cn/mcp
```

- 会话内 `/mcp` → `assists` → Authenticate。
- 手机：解锁、AssistsX 前台、无障碍开启、「MCP → 云端 MCP 连接」开启、「允许远程执行 JS」开启。

验证：

```text
auth_status → get_connection_status（应看到 红米 k50-assistsx）
```

### 3. 重新安装/启动插件

```text
install_lan_plugin(url = "http://192.168.0.2:5173")
list_plugins
run_plugin(packageName = "cn.assists.demo.unfollow")
```

### 4. 继续取关

- 若首页仍有「已选 3 / 17」，直接点「批量取关（3）」；
- 若勾选丢了：手动点选 **编译师、吃喝玩乐Kan、智子看科技**，再点按钮。

### 5. 观察与排障

- 插件日志（MCP）：`get_plugin_logs(packageName: "cn.assists.demo.unfollow")`
- 手机日志文件：`/data/data/com.ven.assistsx.platform/files/log-cn.assists.demo.unfollow/default.txt`
- 页面结构：`get_page_summary` / `find_nodes`

---

## 六、关键实现说明（接手时必读）

### 数据流

```text
HomePage
  ├─ 扫描：float.open(<origin>/runner?task=scan)
  │    └─ RunnerFloatPanel → Step.run(wechatUnfollow.startScan)
  │         → wechatMain.launch → openContacts → openEntry → scrollToTop → scan
  │         → finishScan（写 mmkv wu:scan:v1）→ 回 AssistsX + 关闭浮窗
  └─ 取关：saveRun(targets) → float.open(<origin>/runner?task=unfollow)
       └─ Step.run(wechatUnfollow.startUnfollow)
            → wechatMain.launch → openContacts → openEntry → scrollToTop → findTarget
            → wechatAccountDetail.unfollow → confirmDialog → backToList
            → wechatUnfollow.afterAccount（记账/延时/熔断）→ 下一个
            → finish（写 wu:run:v1）→ 回 AssistsX + 关闭浮窗
```

### Step.data 关键字段

| 字段 | 含义 |
|------|------|
| `task` | `scan` / `unfollow` |
| `hostPackage` | 运行时采集的 AssistsX 包名，用于结束后跳回 |
| `targets` / `targetIndex` | 取关目标与当前下标（按扫描顺序排序） |
| `scanNames` / `scanRounds` / `scanIdle` | 扫描累积状态 |
| `dryRun` | 试运行：停在确认弹窗前点「仍然关注」 |
| `success` / `skipped` / `failedCount` / `failStreak` | 统计与熔断 |
| `finishScan` / `finishUnfollowed` / `finishMissing` / `finishError` | 编排层注入的回调 |

### mmkv 键（`mmkvId: 'unfollow'`）

| key | 内容 |
|-----|------|
| `wu:scan:v1` | `{ names, total, scannedAt, complete, hostPackage }` |
| `wu:run:v1` | 取关断点与统计 |
| `wu:progress:v1` | 浮窗/首页展示的实时进度 |
| `wu:config:v1` | 参数（dryRun、延时等，默认见 `DEFAULT_CONFIG`） |
| `wu:selection:v1` | 上次勾选结果 |

### 风险与边界

- 微信版本/OEM 差异：所有选择器集中在 `wechat-selectors.ts`，UI 变了先重探；
- 微信风控：保守随机延时、连续失败 3 次即停；
- 只操作用户自己勾选的账号，不做全量自动取关、不做多账号群控。

---

## 七、博客写作路线（下次继续）

按 `docs/blog-outline.md` 的章节推进，建议顺序：

1. 引子（痛点 + 结果前置）——需要真实取关数据；
2. 生态介绍（assists / assistsx / assistsx-js / assists-mcp）——可先写；
3. 为什么盲写脚本会失败——可先写；
4. 接入 MCP 与第一次探针——素材已有（探针表 + 失败经历）；
5. 需求转折（扫描 → 勾选 → 取关）——可先写；
6. 代码拆解（扫描循环、匹配、确认弹窗）——可先写；
7. 装到手机上：`ERR_CONNECTION_REFUSED` 的排障闭环——素材已有，是全文亮点；
8. 真实账本：数量、耗时、边界——**等真实取关后填**；
9. 举一反三 + CTA——可先写。

---

## 八、交接检查清单

- [ ] `npm run dev` 已启动且手机可访问
- [ ] MCP 已授权、`get_connection_status` 看到设备
- [ ] 无障碍、「云端 MCP 连接」、「允许远程执行 JS」均已开启
- [ ] 插件已安装且 `run_plugin` 能打开首页
- [ ] 勾选 3 个目标后点「批量取关」
- [ ] 记录真实结果（成功/失败/耗时）并回填博客
