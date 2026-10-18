<!-- Produced by the skill in this repo, run in Claude Code (Claude Fable 5.1), 2026-10-18. Unedited. -->
<!-- Prompt: 在推特上刷到 https://github.com/hugohe3/ppt-master 这个仓库，星很多。它到底是建在什么上面的？值得用吗，还是有更好的替代？ -->

**定位**

hugohe3/ppt-master 是一个跑在 AI 编程 agent 里的"skill/工作流"，不是独立 App：你把 PDF/DOCX/网页/文本丢进 `projects/`，agent 先梳理论点和大纲，再把每一页画成受约束的 SVG，最后用仓库自带的 Python 脚本把 SVG 编译成原生 DrawingML 的 `.pptx`（真正的形状、文本框、原生图表/表格、母版、动画、备注旁白）。我拆出的几个面：意图＝文档→可编辑 PPT；技术路线＝LLM 写 SVG → 自研 SVG→DrawingML 转换器；形式＝agent skill（Claude Code / Codex / Cursor / Gemini CLI 等都能跑）；签名＝"原生 PowerPoint 对象模型"，而不是截图或 HTML 贴图。健康度：2025-12-10 创建，★63.5k（约 200 颗/天，近 30 天仍 +8k），最后 push 2026-10-17，仅 9 个 open issue，MIT。这是一个仍在爆发期的"发布型"项目，不是老牌基础设施。

**它建在什么上面（上游）**

- 核心转换器是**自研的**：`skills/ppt-master/scripts/svg_to_pptx/` 包里 `drawingml/converter.py` 直接生成 slide XML，`pptx_package/builder.py` 用 zipfile + ElementTree 组装包，`python-pptx` 只用来开/存 Presentation 骨架。所以它不是 PptxGenJS 或 html2pptx 的薄封装——这是它和 Anthropic 官方 pptx skill（PptxGenJS 路线）、PPTAgent/DeepPresenter（html2pptx 路线）的根本区别。
- 其它依赖都是可选工具：PyMuPDF（PDF 转 md，注意 AGPL）、mammoth/markdownify/openpyxl（文档转 md）、skia-pathops + uharfbuzz（合并形状、文字转轮廓）、edge-tts（旁白）、google-genai（配图）、flask（本地 SVG 编辑器）。
- 真正决定效果的是你接的模型：作者自己说"harness + model = agent，PPT Master 只负责流程，模型决定上限"，推荐 Claude 或 Kimi K3 + 一个生图模型；一份 10 页的 deck 要 10–20 分钟。

**下游（谁在它之上）**

- byungjunjang/slide-master（★289，2026-07 创建，最后 push 2026-09-30）：README 自称是 ppt-master 的韩语定制 fork，保留 MIT 版权声明。
- issue #234 里一位台湾博士生说自己的学术幻灯片工具借鉴了它的"动画克制"理念（未给链接）。
- 没有看到独立的移植版或第三方 UI。社区目前主要体现为 5k forks 和 1,954 次 commit，仍是"押注作者"的阶段，但活跃度很高。

**替代 —— 同一件事，不同取舍**

- Anionex/banana-slides（★15.3k，2025-11-29 创建，最后 push 2026-07-27，AGPL-3.0）— 基于 Nano Banana Pro 生图的"Vibe PPT" Web/桌面应用，整页靠图像模型生成，"可编辑 PPTX 导出"仍是 beta。更适合：要视觉冲击、海报感的封面/宣传页，零命令行。原作更适合：交付给别人后还要改字改图表的工作汇报——而且 banana-slides 已经近三个月没 push，比 ppt-master 冷。
- presenton/presenton（★10.8k，2025-05 创建，最后 push 2026-09-29，Apache-2.0）— FastAPI + Next.js 的自托管"Gamma 替代"，带拖拽编辑器、REST API、MCP server、Docker/Helm 部署。更适合：给团队搭一个有 UI 和 API 的生成服务。原作更适合：个人在 Claude Code/Cursor 里顺手做、对 PPT 原生对象保真度要求高的场景。
- icip-cas/PPTAgent（★5.1k，2025-01 创建，最后 push 2026-10-12，MIT）— 中科院的论文项目（EMNLP 2025 / ACL 2026 DeepPresenter），基于参考模板做"编辑式生成"+反思，走 Playwright + html2pptx 路线，附带微调的 9B 模型。更适合：研究/复现，想要有论文背书的方法。原作更适合：日常生产使用（PPTAgent 不支持 Windows，环境更重）。
- anthropics/skills 里的 `skills/pptx`（仓库 ★181.8k，最后 push 2026-10-09；文档类 skill 为 source-available 非开源）— 官方 pptx skill，用 PptxGenJS 新建、直接改 OOXML 编辑模板、LibreOffice 渲染校验。更适合：已经在用 Claude 且只想要一个轻量、无需 clone 的 pptx 能力。原作更适合：需要完整流程（素材解析、大纲确认、本地 SVG 预览、模板蒸馏、动画/旁白）。

结论：如果你的目标就是"把一份文档变成能在 PowerPoint 里继续改的 PPT"，ppt-master 目前确实是这条"原生 PPTX"路线上最成熟也最活跃的选项，星多是实至名归；缺点是要 clone 仓库、装 Python，慢，且效果高度依赖你用的模型（issue #249/#254 有用户抱怨新版观感不如 v2.x）。要 Web 界面/团队 API 选 presenton；要炫酷图像风格且不介意不可编辑选 banana-slides。

**同"原生 PPTX skill"形式**

- sunbigfly/ppt-agent-skills（★912，2026-03 创建，最后 push 2026-06-08）— "像做软件工程一样生成演示文稿"的代码驱动框架。共享：agent skill、原生 pptx。不同：4 个月没更新。
- seulee26/mckinsey-pptx（★560，2026-04 创建，最后 push 2026-04-24）— Claude Code 插件，40 个咨询风格模板 + 选模板的 subagent。共享：Claude Code 插件、可编辑 pptx。不同：风格固定、创建后几乎没再提交。

**同"文档→幻灯片"意图、不同输出形式**

- arcsin1/oh-my-ppt（★2.2k，2026-04 创建，最后 push 2026-10-15）— 本地优先的 HTML 幻灯片生成器。共享：本地运行、AI 生成。不同：产物是 HTML 而非 pptx，适合自己讲不适合交付。
- GongRzhe/Office-PowerPoint-MCP-Server（★1.8k，2025-03 创建，最后 push 2025-12-31）— 基于 python-pptx 的 MCP server，让模型读写已有 pptx。共享：PowerPoint 操作。不同：偏"改现有文件"，不是从零生成。

**上游库**

- scanny/python-pptx（★3.5k，2012 年创建，最后 push 2024-08-07）— ppt-master 和大多数 Python 路线共同依赖的底层库，已两年多无提交；ppt-master 自己写 XML 正是为了绕开它的功能上限。

一个观察：这个赛道里凡是"agent skill"形式的项目（ppt-master、slide-master、ppt-agent-skills、mckinsey-pptx）全部诞生于最近 10 个月，除 ppt-master 外多数在创建几周后就停更；ppt-master 的 1,954 次 commit 和每月 +8k 星是它与其它同类最实质的差距。

Sources: [hugohe3/ppt-master](https://github.com/hugohe3/ppt-master) · [why-ppt-master.md](https://github.com/hugohe3/ppt-master/blob/main/docs/why-ppt-master.md) · [byungjunjang/slide-master](https://github.com/byungjunjang/slide-master) · [Anionex/banana-slides](https://github.com/Anionex/banana-slides) · [presenton/presenton](https://github.com/presenton/presenton) · [icip-cas/PPTAgent](https://github.com/icip-cas/PPTAgent) · [anthropics/skills](https://github.com/anthropics/skills) · [sunbigfly/ppt-agent-skills](https://github.com/sunbigfly/ppt-agent-skills) · [seulee26/mckinsey-pptx](https://github.com/seulee26/mckinsey-pptx) · [arcsin1/oh-my-ppt](https://github.com/arcsin1/oh-my-ppt) · [GongRzhe/Office-PowerPoint-MCP-Server](https://github.com/GongRzhe/Office-PowerPoint-MCP-Server) · [scanny/python-pptx](https://github.com/scanny/python-pptx)
