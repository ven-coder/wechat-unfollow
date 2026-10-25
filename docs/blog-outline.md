# 博客骨架：用 coding agent + assists-mcp 开发「公众号批量取关」插件

> 本文是**写作骨架与执行清单**，不是成稿。所有 `{{...}}` 为待填真实数据。
> 配套工程：本仓库 `wechat-unfollow`（AssistsX Vue 插件）。

---

## 0. 定位（全文只有一句话的主线）

> **不是我写了一个微信插件，而是：一个不懂 Android 无障碍 API 的人，只靠说话，就让 coding agent 在真机上探路、查文档、写代码、装到手机跑起来。**

技术细节是佐证，主线必须是：agent 有了**眼睛**（MCP 节点）、有了**手册**（docs resources）、有了**流程**（skill）。三者缺一，agent 就只能靠训练数据猜选择器——这是市面上「AI 写自动化脚本」翻车的根因。此观点贯穿全文。

### 标题候选

- 我用 Claude Code + MCP 做了一个微信批量取关插件，全程没碰过 UI 选择器
- 让 AI 直接「看」你的手机：用 assists-mcp 开发 Android 自动化插件实录
- 从一句话需求到手机上跑起来：coding agent 开发 AssistsX 插件全流程

---

## 1. 开头（300 字内，必须有钩子）

- 痛点：关注了几百个公众号，手动取关要一小时，微信没有批量入口。
- 做法：打开 Claude Code，连上 `assists-mcp`，说了三句话。
- 结果前置：**耗时 {{X 分钟}} / 探针 {{N}} 轮 / 生成 {{M}} 个文件 / 成功取关 {{K}} 个**（必须在真跑后填真实值，这是全文可信度的地基）。
- 声明：所有选择器均来自真机探针，不来自猜测；文末给出完整仓库。

---

## 2. 这个生态是什么（配一张架构图，不超过 6 个方框）

```
assists（开源 Kotlin 无障碍框架，Maven Central）
   └── assistsx（AssistsX 运行平台 + assistsxkit）
         └── assistsx-platform（完整版，云端 MCP 中继）
assistsx-js（Web 端自动化 SDK，npm，运行在 AssistsX 内）
assists-mcp（MCP Server，经 assists-server 中继连接手机）
   └── 暴露：节点查询 / execute_js / 插件安装运行 / 三套文档检索 / skill://
```

每个角色写**存在理由**，不要复读 README：

| 组件 | 一句话定位 |
|------|-----------|
| `assists` | 把「读节点、点节点、滑屏」变成稳定的 Java/Kotlin API |
| `assistsx` | 让这些能力可被**插件**调用，插件用 Web 技术写 |
| `assistsx-js` | Step 引擎 + 节点 API 的 JS 封装（`StepImpl` / `step.next` / `step.repeat` / `step.data`） |
| `assists-mcp` | 把这些能力翻译成 agent 可调的 tool，并把三套文档变成 resource |

> 如实写明前置条件：MCP 仅 **Streamable HTTP + OAuth 2.1**；手机端需开启「云端 MCP 连接」与「允许远程执行 JS」；需要账号与订阅。别让读者卡在第一步。

### 三套文档语料（不要混用）

| 语料 | 适用 | Search 工具 |
|------|------|-------------|
| `assistsx-js-docs` | JS 插件 / Vue 脚手架 API | `search_assistsx_js_docs` |
| `assists-docs` | Kotlin / AssistsCore | `search_assists_docs` |
| `assistsx-practices-docs` | Vue 插件工程 / Step 写法 | `search_assistsx_practices_docs` |

---

## 3. 为什么「直接让 AI 写 Appium / auto.js 脚本」会失败

- **选择器靠猜**：微信 viewId 随版本变化，模型记忆里的全是过期数据。
- **没有反馈闭环**：改一行要重跑整条链路，agent 在盲改。
- **API 幻觉**：小众 SDK 模型没背过，必须现查文档。

结论句：**agent 缺的不是智力，是「观察」和「反馈」。MCP 补的正是这两个。**

---

## 4. 环境准备（5 步，配截图）

1. 手机安装 AssistsX，开启无障碍服务。
2. 设置中开启「MCP → 云端 MCP 连接」「允许远程执行 JS」。
3. 注册 Admin 账号并开通 MCP 能力（截图 `admin.assists.cn`）。
4. 接入 Claude Code：

   ```bash
   claude mcp add --transport http assists https://admin.assists.cn/mcp
   ```

   浏览器完成 OAuth 授权。
5. 验证链路：`auth_status` → `scan_devices` → `connect_device`。

> 提醒：`execute_js` 运行在**手机上的 MCP Runner 浮窗**里，不是在你电脑上。

---

## 5. 开发实录（核心，占 60% 篇幅）

按 `skill://assistsx-js/probe-then-build-vue-plugin/SKILL.md` 的 Phase 走，**每节配真实对话截图 + 真实工具返回**。

### 5.1 第一句话

> 「用 assistsx-js 帮我做一个批量取消关注微信公众号的插件，要先探真机，再建工程。」

说明 agent 的正确行为：先读 skill，而不是直接开写。

### 5.2 探针：让 agent 看见手机

展示工具链实际返回（脱敏）：

```
getAppInfo              → 确认包名 com.tencent.mm
get_page_summary        → 主界面摘要
find_nodes(text=...)    → 定位「通讯录」「公众号」
execute_js              → 点击验证
scrollForward / performLinearGesture → 验证列表可滚
```

重点写**真实细节**（文章最值钱的部分）：

- `execute_js` 的 `{ok:true}` 只代表脚本执行完，业务成功要看 `result`（可能是 `false` / `[]` / 无 `nodeId`）。
- `launchApp` 返回 `true` 也要用 `getPackageName()` 二次确认。
- 小米双开 / 安全中心弹窗会挡在启动路径（`app-launch.ts` 已有处理，可作真实工程细节引用）。

### 5.3 记录成 `probe-session.md`

贴出记录格式（目标 / 设备 / 包名 / 每步验证过的选择器 / 失败过的方案）。强调：

> **这份文件是后续所有代码的唯一事实来源**，也是「agent 不给选择器编故事」的机制。

### 5.4 脚手架

`create_assistsx_vue` 只返回命令、不写盘（MCP 在云端，没有你的磁盘）：

```bash
npx create-assistsx-vue wechat-unfollow
cd wechat-unfollow && npm install && npm run dev   # Vite 监听 0.0.0.0:5173
```

### 5.5 写 Step（只贴 3 段，每段配一句「为什么」）

| 文件 | 职责 |
|------|------|
| `src/core/steps/wechat/wechat-main.ts` | 从任意页回主 Tab，按 `bounds.top > screen.height * 0.85` + `des` 判断，不写死 viewId |
| `src/core/steps/wechat/wechat-official-accounts.ts` | 通讯录 → 公众号列表，`scrollForward` + 去重 + 终止条件 |
| `src/core/steps/wechat/wechat-account-detail.ts` | 详情页 → 右上角 `…` → 设置 → 不再关注 → 确认弹窗 |

再贴一段 `log.appendTimestampedEntry(...)`，说明：

> 每个 Step 都要有可观测日志，否则 agent 排障时也是瞎的。

### 5.6 装到手机跑

```
install_lan_plugin(局域网 URL) → list_plugins → run_plugin → 首页点 Test → 浮窗看日志
```

### 5.7 出问题了，让 agent 自己修（强烈建议用真实故障）

示例闭环：

```
用户：第 {{37}} 个之后卡住了
agent：get_plugin_logs → 发现列表到底后仍 repeat
agent：重新 find_nodes → 发现「已显示全部」提示节点
agent：改终止条件 → 重新 install_lan_plugin → 跑通
```

这一节直接证明「MCP 让 agent 具备自我修正能力」，比任何宣传语都有说服力。

---

## 6. 插件技术拆解（给工程师看的深度）

一张状态图 + 一张表。批量操作真正难的不是「点一下」：

| 问题 | 方案 |
|------|------|
| 列表滚动后节点复用 | 用「公众号名称」做已处理集合去重，不靠 index / nodeId |
| 怎么判断到底 | 连续两次滚动节点集合无新增 / 出现「已显示全部」 |
| 进详情后返回错位 | 统一 `commonBack` 多策略回退（des → 左上角小图标 bounds → 全宽可点） |
| 微信风控 | 每项随机 `delayMs`、每 N 个长暂停、失败 3 次跳过不卡死 |
| 半路中断 | 已处理名单落 `database` / `mmkv`，支持断点续跑 |
| 误操作 | 首页提供「试运行 dry-run」与「只取关 N 个」上限 |

---

## 7. 踩坑清单（5–8 条，一条一句）

可直接取材：

- `performLinearGesture` 签名是 `(startPoint, endPoint, { duration? })`，传点数组会静默失败、`execute_js` 返回 `""`。
- `execute_js` 的 `ok` ≠ 业务成功。
- `get_page_summary` / `find_nodes` 的 slim 模式与 `raw` 整树的 token 成本差异。
- 三套文档语料不能混用，Step 写法查 practices，API 细节查 js-docs。
- `step.repeat()` 与 `step.next()` 的语义区别。
- 插件主页与浮窗是两个 WebView，跨窗口要用 event bus。

---

## 8. 成本与边界（必须有，否则像软文）

- 真实耗时拆解：探针 {{X}} 分钟 / 脚手架 {{Y}} 分钟 / 写 Step {{Z}} 分钟 / 排障 {{W}} 分钟。
- 不适合用的场景：需要 root / 逆向 / 签名校验的；高频对抗风控的；非无障碍可达界面（部分游戏、Flutter 自绘）。
- 合规边界：只操作自己账号、控制频率、不做群控与营销骚扰。

---

## 9. 举一反三

同构场景（列表 + 逐项操作 + 终止条件）：

- 批量清理聊天记录
- 批量取消关注 / 清理订阅
- 按条件整理收藏
- 每日签到
- 消息未读巡检
- 内容批量发布

点明：**这个套路是通用的**。

---

## 10. 结尾 CTA

- 开源框架：`https://github.com/ven-coder/assists`
- 官网 MCP 接入：`https://assists.cn/mcp`（Cursor / Claude Code / Codex / OpenCode 各有 setup 页）
- 入门模板：`assistsx-plugin-simple`、`npx create-assistsx-vue`
- 完整 demo：本仓库 `wechat-unfollow`

---

## 附录 A：本仓库命名与工程约定

| 字段 | 值 |
|------|-----|
| 目录 / 仓库 | `wechat-unfollow` |
| `package.json` name | `wechat-unfollow` |
| `config.json` name | `公众号批量取关` |
| `config.json` description | `微信通讯录公众号列表批量取消关注` |
| `packageName` | `cn.assists.demo.unfollow`（唯一标识，定下后不要改） |
| Step 目录 | `src/core/steps/wechat/` |

代码约定：`.ts` 用 kebab-case，`.vue` 用 PascalCase；代码字符串英文，注释中文；开源库内禁止直接写 `AssistsLog`。

## 附录 B：MCP 调用顺序（探针 → 构建 → 安装）

```text
auth_status (可选)
  → scan_devices
  → connect_device
  → execute_js                 # 启动 / 早期探针
  → get_page_summary
  → find_nodes
  → (可选) get_subtree | get_node_screenshot | get_screen_screenshot | save_page_nodes
  → execute_js                 # 点击 / 输入 / 手势验证
  → create_assistsx_vue        # 只返回命令
  → (用户电脑) npx / npm install / npm run dev
  → search_assistsx_practices_docs + resources/read（1–3 个 URI）
  → search_assistsx_js_docs + resources/read（1–3 个 URI）
  → install_lan_plugin → list_plugins（可选）→ run_plugin → get_plugin_logs
```

## 附录 C：动笔前必须做的事

1. **真的把插件做出来**，并计时。
2. **全程留痕**：每轮对话截图、`get_page_summary` 原始输出、失败日志、`probe-session.md`。
3. **填真实数字**：探针轮数、工具调用次数、生成文件数、取关数量、总耗时。
4. **录 30 秒屏**：点 Test → 浮窗日志滚动 → 公众号一个个消失。
5. **准备 3 段脱敏代码**（Step 定义、日志、列表循环），其余放仓库链接。

## 附录 D：两个表述要提前想清楚

- **别说「零代码」**：准确说法是「不手写选择器、不查 Android 文档」，代码是 agent 写的，你负责验收。
- **别把 `assists-mcp` 说成「手机远程控制」**：它的定位是**开发期给 agent 提供真机观察与反馈**，运行期插件独立跑在 AssistsX 内。

## 附录 E：素材清单

| 素材 | 用途 | 状态 |
|------|------|------|
| 手机主界面探针截图 | 5.2 | ☐ |
| 公众号列表 `find_nodes` 返回 | 5.2 | ☐ |
| `probe-session.md` 截图 | 5.3 | ☐ |
| 脚手架命令输出 | 5.4 | ☐ |
| Step 代码片段 ×3 | 5.5 | ☐ |
| 浮窗运行日志截图 | 5.6 | ☐ |
| 故障修复前后日志 | 5.7 | ☐ |
| 30 秒录屏 | 全文 | ☐ |
| 最终取关数量 / 耗时 | 开头、第 8 节 | ☐ |
