# 微信公众号批量取关

一个运行在 **AssistsX App** 中的微信自动化插件：先扫描已关注的公众号，再由用户选择需要取关的账号，最后批量执行。项目使用 Vue 3、Vite、TypeScript 和 `assistsx-js` 构建。

本项目通过 **Coding Agent（使用 Codex，其他支持 MCP 的 Coding Agent 也可以）结合 Assists MCP** 实现。Agent 可以借助 MCP 查看设备页面、探索无障碍节点、查询开发文档并调试插件，让 Android 自动化从页面探索到开发验证形成完整工作流。

## 功能

- 扫描微信通讯录中的公众号列表，保存扫描结果。
- 搜索、勾选账号，支持对当前搜索结果全选或清空选择。
- 按扫描顺序处理选中的账号，并在浮窗中展示进度、日志及成功、跳过和失败数量；可手动停止。
- 支持试运行：走到取关确认环节后选择继续关注，不真正取关。
- 任务结束后尝试返回 AssistsX。执行过程包含随机间隔、定期暂停和连续失败停止机制。

> 取关后可能难以找回，请先核对选择，建议先使用试运行。微信界面和无障碍节点可能随版本或设备变化，执行结果请在微信中确认。
>
> 项目记录中，扫描流程已在真机验证；真实取关流程当时尚未实际执行，成功计数也未做取关后二次校验。使用前请先小范围验证。

## 运行环境

- Android 设备，安装并登录微信。
- 安装 [AssistsX App](https://www.pgyer.com/assistsx)，并在系统设置中开启 AssistsX 的无障碍服务。
- 本项目是 AssistsX 插件，需要由 AssistsX 加载运行；普通浏览器可用于查看页面，但无法执行依赖宿主的自动化功能。
- 开发时需要 Node.js 和 npm；使用局域网开发时，手机与电脑需要网络互通。

## 开发与运行

安装依赖并启动开发服务器：

```bash
npm install
npm run dev
```

Vite 默认监听 `0.0.0.0:5173`。在手机上使用终端输出的 Network 地址（例如 `http://<电脑局域网IP>:5173`），不要使用手机自身的 `localhost`。通过 AssistsX 加载该局域网插件后，即可在 App 中打开「公众号批量取关」。也可以通过 Assists MCP 的 `install_lan_plugin` 和 `run_plugin` 工具安装并启动，具体接入方式见 [Assists MCP](https://assists.cn/mcp)。

### 打包并本地安装

也可以将构建产物打包为 ZIP，传输到手机，在 AssistsX 中通过本地安装方式运行：

```bash
npm run build -- --base=./
cd dist
zip -r ../wechat-unfollow.zip .
cd ..
```

将生成的 `wechat-unfollow.zip` 传输到手机，在 AssistsX 中选择本地安装并导入该 ZIP，然后打开插件。压缩包根目录应直接包含 `config.json`、`index.html`、`icon.png` 和 `assets/`，不要多套一层 `dist` 目录。构建时的 `--base=./` 使静态资源使用相对路径，便于本地加载。

使用步骤：

1. 在 AssistsX 中打开插件，按提示开启无障碍服务。
2. 点击「扫描公众号」，等待扫描完成并返回插件首页。
3. 搜索并勾选需要处理的账号；可先勾选「试运行（不真正取关）」。
4. 点击「批量取关」，在浮窗中查看进度和日志，必要时点击「停止」。
5. 完成后在微信中核对结果。

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动局域网开发服务器 |
| `npm run build` | 构建到 `dist/` |
| `npm run preview` | 预览构建产物 |
| `npm run typecheck` | 同步 SDK 类型配置并进行类型检查 |
| `npm run dev:registry` | 强制使用 npm 安装的 `assistsx-js` |
| `npm run sync:assistsx-tsconfig` | 重新生成 SDK 类型路径配置；安装依赖后也会自动执行 |

## 项目结构

```text
public/config.json                  # AssistsX 插件元数据
src/views/HomePage.vue              # 扫描、选择与取关入口
src/views/RunnerFloatPanel.vue      # 运行进度、日志和停止操作
src/core/steps/wechat/              # 微信页面识别、扫描、取关和流程编排
src/core/steps/wechat/wechat-selectors.ts # 微信页面节点选择器
src/core/steps/wechat/wechat-store.ts     # 扫描结果、选择和运行状态存储
src/core/steps/wechat/wechat-types.ts     # 数据类型与默认执行参数
src/composables/useA11yGuard.ts     # 无障碍服务检查与引导
```

微信版本或界面变化导致识别失败时，可先检查 `wechat-selectors.ts` 中的选择器。默认延时、暂停及连续失败阈值见 `wechat-types.ts` 中的 `DEFAULT_CONFIG`。

### 本地联调 assistsx-js

默认优先尝试项目同级的 `../assistsx-js/src/index.ts`；不存在时使用 npm 包。也可以复制 `.env.example` 为 `.env.local`，通过 `ASSISTSX_JS_LOCAL` 指定本地 SDK 仓库根目录，或设置 `ASSISTSX_USE_NPM=1` 强制使用 npm 包。修改后重启开发服务器；需要更新类型路径时运行 `npm run sync:assistsx-tsconfig`。

## Assists 生态

- [Assists MCP](https://assists.cn/mcp)：连接 Coding Agent 与 Android 设备，辅助页面探索、插件开发和调试，也可查询 `assistsx-js` 文档。
- [AssistsX App 下载](https://www.pgyer.com/assistsx)：本项目的 Android 插件运行宿主。
- [assistsx-js](https://github.com/ven-coder/assistsx-js)：用于开发 AssistsX 插件的 JavaScript SDK。
- [Assists 开源项目](https://github.com/ven-coder/assists)：了解 Assists Android 无障碍自动化生态，探索更多自动化场景。
