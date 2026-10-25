# Probe session

- Goal: 批量取消关注微信公众号（先扫描列表 → 用户勾选 → 按名称逐个取关）
- Device: 红米 K50（22041211AC），AssistsX 1.1.3-3.5.10
- Target appName: 微信
- Target packageName: `com.tencent.mm`
- Date: 2026-10-25
- AssistsX / MCP notes: 云端 MCP 连接 = 是；允许远程执行 JS = 是；无障碍 = 是
- 宿主包名（扫描/取关结束后跳回）: `com.ven.assistsx.platform`

## 1. Launch (verified)

### Intent
启动微信并确认已在前台。

### execute_js / API used
```js
const info = await AssistsXAsync.getAppInfo('com.tencent.mm')
const launched = await AssistsXAsync.launchApp('com.tencent.mm', 5)
await new Promise(r => setTimeout(r, 1800))
const current = await AssistsXAsync.getPackageName()
return { installed: !!info, launched, current }
```

### Result
- `{ installed: true, launched: true, current: "com.tencent.mm" }`
- notes: `launchApp` 返回 true 仍需 `getPackageName()` 复核。

## 2. Navigation steps (verified)

### Step 1 — 底部「通讯录」Tab
- Page summary hints: 主界面底部 4 个 Tab（微信 / 通讯录 / 发现 / 我）
- Selectors that worked:
  - className: `android.widget.TextView`
  - viewId: `com.tencent.mm:id/icon_tv`（四个 Tab 共用）
  - text: `通讯录`
  - bounds hint: centerY ≈ 2369（屏幕高 2400）
- Click: 节点本身不可点，`findFirstParentClickable()` 后 `click()` 成功
- Failures / fallbacks tried: `findByTags('android.widget.TextView', { filterText: '通讯录' })` 返回空数组（filterText 语义与预期不同），改用 `getAllNodes()` + 手动过滤 `text`

### Step 2 — 「公众号、服务号和企业号」入口
- Selectors that worked:
  - className: `android.widget.TextView`
  - viewId: `com.tencent.mm:id/n6`
  - text: `公众号、服务号和企业号`
  - bounds: `{ l: 156, t: 666, r: 554, b: 786 }`
- Click: 父节点可点
- 注意：页面里还有另一个 `text=公众号` 的节点（已读聊天列表，bounds.left < 0），必须用 `bounds.isInScreen()` 过滤

### Step 3 — 公众号列表
- 页面：顶部两个 Tab「公众号和服务号」/「企业号」，默认停在「公众号和服务号」
- Selectors that worked:
  - 滚动容器: `android.widget.ListView`, viewId `com.tencent.mm:id/i3y`, `isScrollable=true`, bounds `{l:0,t:182,r:1080,b:2400}`
  - 账号名: `android.widget.TextView`, viewId `com.tencent.mm:id/awx`, left=165
  - 字母分组头: `android.widget.TextView`, viewId `com.tencent.mm:id/bdd`
  - 列表底部统计: 文本 `17个公众号和服务号`（正则 `^\d+个公众号和服务号$`）
- 滚动: `listNode.async.scrollForward()` 返回 `true`；到底后返回 `false`
- 扫描结果: 17 个，与底部统计一致
- Failures / fallbacks tried:
  - `getAllNodes()` 会同时返回多个窗口的节点（聊天列表、通讯录、右侧未展示的「企业号」Tab，`bounds.left` 为负或 ≥1080），必须按 `bounds.isInScreen()` + viewId 过滤
  - 未发现「已显示全部」类文案；底部统计是最可靠的到底标记

### Step 4 — 打开账号详情
- 点击账号名节点（`awx`）的父节点
- 详情页标题: `android.widget.TextView`, viewId `com.tencent.mm:id/amj`, text = 账号名（用于校验没点错）
- 页面特征：头像 `am9`、简介、`已关注公众号` 按钮

### Step 5 — 更多菜单
- Selectors that worked:
  - className: `android.widget.ImageView`
  - viewId: `com.tencent.mm:id/fs`
  - des: `更多信息`
  - bounds: `{ l: 976, t: 78, r: 1080, b: 182 }`
- 点击后底部弹出菜单：`设为星标` / `更多信息` / `设置` / `投诉` / `不再关注` / `取消`

### Step 6 — 不再关注
- Selectors that worked:
  - className: `android.widget.TextView`
  - viewId: `com.tencent.mm:id/obc`（通用文本 id）
  - text: `不再关注`
  - 可点击父节点: `android.widget.LinearLayout`, viewId `com.tencent.mm:id/m7g`
- 点击后出现独立窗口的确认弹窗：
  - 文案：`不再关注 “<账号名>”，你将不再收到其下发的消息`
  - 按钮：`仍然关注`（左）/ `不再关注`（右）
  - 弹窗为独立 window（active_window 尺寸变为 691x363），节点也在 active_window 内

### Step 7 — 返回列表
- 点「仍然关注」取消后，`AssistsXAsync.back()` 返回列表成功
- 列表回到原滚动位置

## 3. End state

- Success criteria met: yes（主链路全部验证；确认弹窗点击「仍然关注」取消，未真实取关）
- Remaining TODOs:
  - 真实取关后微信是否自动关闭详情页、列表是否立即刷新 → 首次真实运行时确认
  - 取关后列表底部统计数字变化 → 可作为成功校验的辅助信号

## 4. Codegen checklist

- [x] 选择器集中在 `src/core/steps/wechat/wechat-selectors.ts`
- [x] 扫描终止：底部统计正则 / `scrollForward() === false` / 连续 2 轮无新增
- [x] 目标匹配：`awx` 节点 `text` 精确匹配 + `bounds.isInScreen()`
- [x] 详情页标题校验（`amj`）避免点错账号
- [x] 每个 StepImpl 写 `log.appendTimestampedEntry`
- [x] Home 勾选列表 + Runner 浮窗 + 日志
