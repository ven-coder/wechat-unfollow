微信公众号关注得多了，想清理一次并不轻松。打开一个公众号，进入详情，找到菜单，点击“不再关注”，确认后再处理下一个——动作不复杂，重复几十次就很耗时间。

我想做一个工具：先把关注列表扫描出来，让我勾选不需要的公众号，再由手机自动完成后续操作。

以前做这种手机自动化，我可能需要先学 Android 开发，弄清楚怎么读取页面、找到按钮、控制点击。这次我用了 **AssistsX + Assists MCP + coding agent**：把需求告诉 AI，让它连接真实手机，自己查看微信页面、尝试操作、查阅文档，最后写出一个能在手机上运行的插件。

这里用到的 [AssistsX](https://www.pgyer.com/assistsx) 是手机端的自动化插件运行平台，提供页面读取、点击、滚动等能力；[Assists MCP](https://assists.cn/mcp) 则让 AI 在开发时能够观察和操作真机、查询文档。两者配合，让 coding agent 不仅能写代码，还能在手机上验证效果、根据反馈继续调整。下面就用这个批量取关工具，看看整个过程是怎么完成的。

## 给 AI 一个目标，而不是一份操作说明书

我提出的目标很简单：

> 扫描微信里关注的公众号，让我选择要取关的账号，再自动逐个取关。

需求中有一个重要条件：**先由我选择，再执行取关**。扫描完成后，我可以在列表中搜索和勾选；如果想先观察流程，还可以开启试运行，让插件走到确认弹窗后选择“仍然关注”。

但要把这个目标变成可运行的工具，AI 必须自己回答很多具体问题：

- 微信打开后，怎样进入通讯录和公众号列表？
- 列表一次显示不完，怎样滚动、去重并判断结束？
- 怎样确认打开的是选中的公众号？
- 取关菜单和确认按钮在哪里？
- 执行完一个账号后，怎样回到列表继续下一个？

这些问题的答案不应该靠猜。微信界面可能随着版本变化，手机也可能停在聊天页、消息列表或其他页面。AI 需要看到当前设备的真实状态，才能知道下一步怎么做。

## AI 是怎么“看到”和操作手机的？

在这套组合中，AssistsX 负责运行插件和提供手机端能力，Assists MCP 在开发时把这些能力提供给 AI；coding agent 则负责理解需求、查看返回结果、查文档和写代码。插件完成后，自动化流程由 AssistsX 在手机上运行。

底层使用了 Android 的无障碍能力。可以把它理解成：手机把页面里的文字、按钮、位置等信息整理成一份可查询的结构，程序据此找到需要操作的内容。它不是单纯看一张截图猜坐标，也需要根据当前页面判断操作是否可行。

开发时的过程大致是：

```text
我描述需求或反馈问题
        ↓
AI 通过 MCP 查看手机页面
        ↓
AI 尝试点击、滚动并检查结果
        ↓
AI 查文档、写代码、安装插件
        ↓
在手机上运行，继续根据结果调整
```

开始之前，先把手机和 Codex 连接起来，主要分两步：

1. **在手机上开启 MCP**：安装并登录 AssistsX，开启无障碍服务，然后在 MCP 设置中开启云端连接和远程执行 JS。


![11月8日-1.gif](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/f8dc81915d6c4395b490b4192a39bf26~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgbHF2ZW4=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiMzI1MTExMTcwNDgwNTgzIn0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1794800201&x-orig-sign=Bb2x8dYB56ZZ4EUY%2FdsX3ugRsMQ%3D)

2. **在 Codex 中配置 MCP**：打开 [Assists MCP 接入页面](https://assists.cn/mcp)，按照页面提供的 Codex 接入方式完成配置和授权，让 Codex 能够连接手机。


![11月8日(3)-1.gif](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/9047a028c2844c98978c889d82af6411~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgbHF2ZW4=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiMzI1MTExMTcwNDgwNTgzIn0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1794800201&x-orig-sign=%2BV3CArSjpgZ%2Fm7nxGZVkZaSyitU%3D)

完成后，就可以让 Codex 通过 MCP 查看手机页面、尝试操作并读取结果。具体可用能力以当前服务配置为准。


![11月8日(2)-1.gif](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/66d01d9eee224f039443729040facc4b~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgbHF2ZW4=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiMzI1MTExMTcwNDgwNTgzIn0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1794800201&x-orig-sign=5a7r7MXD%2Bt0eOiZymWmOEqnaJ%2Fw%3D)



## 第一步：让 AI 自己在微信里找路

Agent 连接手机后，没有立即生成一大段脚本，而是先查看微信当前页面，再逐步尝试进入通讯录和公众号列表。

它查找“通讯录”时发现，显示文字的节点本身不可点击，需要点击它的父节点。进入列表后，它继续确认哪些节点是公众号名称、哪个区域可以滚动，以及列表底部是否有数量提示。

接下来，Agent 打开账号详情，查找右上角菜单和“不再关注”按钮，再观察确认弹窗。探查到确认弹窗时，它选择“仍然关注”，并验证如何返回列表；这一步没有真正取关。

Agent 将设备、页面节点、验证过的操作和失败尝试写进了 [探针记录](../probe-session.md)。第一次探针使用的是红米 K50，记录里的页面信息对应的是当时那台设备和微信界面。


![11月5日(3)-1.gif](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/4fa8494cbb9a4e92a25011ff2ed96b3a~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgbHF2ZW4=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiMzI1MTExMTcwNDgwNTgzIn0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1794800201&x-orig-sign=6ntNObEh8kpPiUcinkdFt2hpheo%3D)

这一步的关键是反馈。AI 执行一段代码后，不能只看“代码执行完成”，还要检查是否真的找到了节点、点击是否成功、微信是否进入了预期页面。只有拿到手机返回的结果，后续代码才有依据。

## 第二步：把探索过的路径做成自动化插件

确认路径后，Agent 查询 AssistsX 和 JavaScript SDK 文档，创建 Vue、Vite 和 TypeScript 工程，把刚才探索到的操作整理成插件。

插件首页先提供“扫描公众号”。运行时，它进入微信列表，读取当前屏幕上的名称，向下滚动，再收集新出现的名称。扫描完成后返回 AssistsX，让我查看和选择。

一次完整扫描的日志如下：

```text
10:09:11  [list] 已回到列表顶部
10:09:12  [scan] 第 1 轮，累计 13 个
10:09:14  [scan] 第 2 轮，累计 18 个
10:09:16  扫描完成：共 18 个公众号
```

当时扫描到的 18 个账号与微信列表底部的数量一致。这个数字是一次真机运行记录，不代表其他设备上的关注数量或扫描耗时。

进入取关阶段后，插件根据我勾选的名称查找账号，打开详情并核对标题，再进入取关确认流程。它还加入了操作间隔、失败停止条件、运行浮窗和日志。取关被记为成功后，首页会在原扫描列表中显示“取关成功”。


![11月8日(6)-1.gif](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/9370511383d54ce39d7f80041310391c~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgbHF2ZW4=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiMzI1MTExMTcwNDgwNTgzIn0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1794800201&x-orig-sign=untimvtGaETInB51z6HZDNTK%2FIQ%3D)

## 第三步：AI 把插件装到手机上，遇到问题继续修

代码写完后，Agent 还需要让插件在手机上跑起来。

开发时，电脑上的开发服务器通过局域网提供插件页面，AssistsX 加载首页；点击扫描后，首页再打开一个浮窗执行自动化。

第一次打开浮窗时，手机出现 `net::ERR_CONNECTION_REFUSED`。Agent 根据报错检查加载方式，发现浮窗使用了相对路径，宿主没有把它指向开发服务器。它修改了浮窗地址的生成方式后，页面能够加载，扫描流程也继续跑通。

我看到的问题只是“浮窗打不开”；Agent 需要进一步定位原因、修改代码，并通过手机上的运行结果确认问题是否解决。


![11月8日(7)-1.gif](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/477f33ea58b44981a47cc9f9fade2987~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgbHF2ZW4=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiMzI1MTExMTcwNDgwNTgzIn0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1794800201&x-orig-sign=LadGtHDTvRDzig1QgKNAQbV5k%2FE%3D)

## 微信里出现两个“服务号”，AI 怎么区分？

后来再次使用时，扫描一直停在“已点击通讯录”。我把现象告诉 Agent，它查看日志和当前手机页面后发现：这次通讯录中的入口叫“服务号”，而最初探针记录的是“公众号、服务号和企业号”。代码没有识别新的文案，因此反复尝试进入通讯录。

支持新文案之后，我又发现从微信消息列表启动时，有时会误点消息列表里同名的“服务号”会话。

这次 Agent 再次读取手机上的页面信息，发现虽然文字一样，两者对应的控件标识不同。它据此修改判断：先确认已经进入通讯录，再结合文字、控件标识和屏幕位置查找入口；如果启动时停在其他页面，就先尝试返回微信主界面。

修改后，Agent 用 MCP 在手机上验证了关键步骤：点击通讯录、找到入口、进入列表并识别列表容器。另一次探查中，它读取到 6 个服务号，列表底部显示“6个服务号”，于是也补充了对应的扫描结束条件。

这个例子比“AI 写了一段自动化代码”更能说明问题：它遇到了真实界面中的歧义，重新观察手机，再根据观察结果修正实现。我需要做的是描述异常和检查结果，而不是自己找出两个控件的区别。


![11月8日(8)-1.gif](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/90dc99b4f9394f77949cfd64f0c9b463~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgbHF2ZW4=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiMzI1MTExMTcwNDgwNTgzIn0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1794800201&x-orig-sign=F5mkTuV8lW4Guak%2Fi2uQ7osRC3Q%3D)

## 用户选择公众号，插件执行取关

为了让运行过程更容易观察，Agent 也补充了实时日志：例如检查微信前台、进入通讯录、查找列表和每轮扫描数量。这样遇到卡住的问题时，我和 Agent 都能先看流程停在哪一步。

取关毕竟会改变真实账号的关注关系，所以插件把选择权留在首页：先扫描，再由用户勾选需要取关的公众号并点击「批量取关」启动，插件随后自动完成微信中的取关确认。正式操作前也可以试运行。取关后可能难以找回，运行前需要仔细核对。

扫描和完整取关流程均已在手机上验证。以下是插件完成后的实际运行效果：


![11月8日(10)-1.gif](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/c4e1cc454acf460cbc2d204a1d18c502~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgbHF2ZW4=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiMzI1MTExMTcwNDgwNTgzIn0%3D&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1794800201&x-orig-sign=p%2F9FHgG2kVWS030wWBjMPCy5ftc%3D)

## 从“告诉 AI 怎么点”到“告诉 AI 想完成什么”

这次我没有先学习 Android 无障碍 API，也没有手写每一步页面操作。我负责提出目标、决定哪些账号需要取关，并在出现异常时描述看到的现象。

Agent 则连接真实手机，查看页面、尝试操作、查阅文档，把探索结果变成自动化插件；运行不符合预期时，再结合日志和页面信息继续调整。

微信公众号批量取关只是一个例子。对其他适合手机自动化的任务，也可以从一个明确目标开始，让 AI 先去目标设备上观察和验证，再决定如何实现；需要处理哪些账号以及何时启动，仍由用户决定。

想体验这个插件，需要在 Android 手机上安装并登录微信，安装 [AssistsX App](https://www.pgyer.com/assistsx) 并开启无障碍服务。可以通过局域网加载开发中的插件，也可以构建 ZIP、传到手机后通过 AssistsX 本地安装；具体步骤见[项目 README](https://github.com/ven-coder/wechat-unfollow#readme)。

相关入口：[公众号批量取关项目源码](https://github.com/ven-coder/wechat-unfollow)、[Assists MCP](https://assists.cn/mcp)、[assistsx-js](https://github.com/ven-coder/assistsx-js)、[Assists 开源项目](https://github.com/ven-coder/assists)。
