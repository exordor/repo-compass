<!-- Produced by the skill in this repo, run in Claude Code (Claude Fable 5.1), 2026-10-18. Unedited. -->
<!-- Prompt: 我想用 Agent 做 PPT，https://github.com/chuspeeism/dashi-ppt-skill 这个仓库推荐一些相似的 -->

我把 chuspeeism/dashi-ppt-skill（★9.6k）拆成了几个面向来找：**意图**是"把文档交给 Agent，产出一份可以继续改的商务 PPT"；**技术路线**是"每页先生成 HTML，再用本地 Chrome 把 HTML 逐节点还原成可编辑 PPTX"；**产出形态**是 Agent Skill（SKILL.md，跨 Claude Code / Codex / 豆包 等）；**生态**是 Claude Code / Codex 的 skills 社区；**签名特征**是"每页自带控制台，先在浏览器里拖滑块、改文字，再导出"，以及围绕 SWOT / 波特五力 / 商业画布这类分析模型的版式库。按这几个面向分别搜索并逐个核对 GitHub 页面后，推荐如下。

**最接近——同时命中多个面向**
- [hugohe3/ppt-master](https://github.com/hugohe3/ppt-master)（★52k）— 同样是"文档 → 原生可编辑 PPTX"的 Agent Skill，跨 Claude Code / Codex / Cursor。相同：意图、Skill 形态、本地生成、可编辑输出。不同：走 SVG → PPTX 路线，没有浏览器编辑台，但能在不破坏原设计的前提下修改已有 .pptx，并支持原生图表/表格、公式、模板母版继承。
- [alchaincyf/huashu-design](https://github.com/alchaincyf/huashu-design)（★24.7k）— HTML 原生的设计 Skill，PPT 只是它的一个用途。相同：HTML 先行、用 `html2pptx.js` 读 DOM 计算样式生成真实文本框的可编辑 PPTX、纯本地、跨 Agent。不同：范围更广（原型 / 动画 / 信息图 / MP4），没有逐页控制台，风格库是 60 种纯 CSS 风格而非商务版式。
- [mucsbr/ppt-agent-workflow-san](https://github.com/mucsbr/ppt-agent-workflow-san)（★648）— 渐进交互式 PPT 生成 Skill，包含 `html-slide-to-pptx` 子项目。相同：Claude Code / Codex Skill、先预览 HTML 再转可编辑 PPTX。不同：HTML 需要匹配预设才能转换，更偏"流程框架"而非开箱即用的主题库。

**同一签名特征：浏览器内可编辑的 HTML 幻灯片**
- [archlizheng/frontend-slides-editable](https://github.com/archlizheng/frontend-slides-editable)（★527）— frontend-slides 的可编辑分支，单文件 HTML 自带编辑器：拖拽缩放、改文字、页面排序、撤销重做、Ctrl+S 保存、导出独立 HTML。相同：生成后在浏览器里改。不同：不导出 PPTX（反向可以从 PPTX/PDF 导入），46 套风格偏设计感而非商务。
- [1weiho/open-slide](https://github.com/1weiho/open-slide)（★7.5k）— "为 Agent 设计的幻灯片框架"，每页是 React 组件，开发服务器里点元素加评论、`/apply-comments` 让 Agent 批量改。相同：浏览器里的"改一改再让 Agent 执行"循环。不同：需要 pnpm 工程，只出 HTML/PDF，不出 PPTX。

**同一意图：Agent 做商务 PPT 的 Skill（HTML 幻灯片方向）**
- [zarazhangrui/frontend-slides](https://github.com/zarazhangrui/frontend-slides)（★28.6k）— 这一类里最流行的 Skill：先出三张风格预览让你选，再生成单文件 HTML 幻灯片。相同：Claude Code 插件 / Skill、先选风格再生成、可从 PPTX 转入。不同：输出只读 HTML / PDF，无 PPTX 导出。
- [op7418/guizang-ppt-skill](https://github.com/op7418/guizang-ppt-skill)（★28k）— 杂志风横滑 HTML 幻灯片 Skill，带演讲者模式、排练计时、Codex 下可调图像生成。相同：中文社区、Claude Code + Codex、本地文件系统。不同：不导出 PPTX，风格偏编辑设计而非商务汇报。
- [lewislulu/html-ppt-skill](https://github.com/lewislulu/html-ppt-skill)（★8.5k）— 36 主题 / 36 版式 / 15 套全套模板的 HTML 演示 Skill，支持 Claude Code / Codex / Cursor / Gemini CLI。相同：大体量主题 + 版式库、离线可用、中英文。不同：只有 HTML / PNG / PDF，没有浏览器编辑和 PPTX。
- [Akxan/ppt-agent-skill](https://github.com/Akxan/ppt-agent-skill)（★110）— 26 种风格、18 种纯 CSS/SVG 图表的 Claude Code Skill，HTML → SVG → PPTX。相同：图表体系 + 导出 PPTX。不同：PPTX 中元素需在 PowerPoint 365 里"转换为形状"后才可编辑，星数少、成熟度低。

**同一意图：图片式 PPT 路线（与 dashi 互补而非替代）**
- [ningzimu/codex-ppt-skill](https://github.com/ningzimu/codex-ppt-skill)（★4.9k）— 同样是中文社区、跨 Codex / Claude Code 的 PPT Skill，也有 12 种内置风格和"先确认大纲和样张再全量生成"的流程。关键差异：每页是一整张 AI 生成的图片，内容不可编辑；配套的 [ningzimu/image-to-editable-ppt-skill](https://github.com/ningzimu/image-to-editable-ppt-skill)（★2.6k）负责把图片页反向重建成可编辑 PPTX。

**同一产出形态：咨询风格、代码直出 PPTX**
- [likaku/Mck-ppt-design-skill](https://github.com/likaku/Mck-ppt-design-skill)（★270）— 麦肯锡风格的 Agent PPT 设计系统，python-pptx 引擎 + 67 种版式（2×2 矩阵、价值链、故事线模板），用代码写的质量门禁代替模型自评。相同：面向商务汇报的版式库和分析模型思路、Skill 形态。不同：不经过 HTML，没有可视化编辑，输出直接是 PPTX。

**同一意图但形态不同：自部署的 Web 应用 / 框架**
- [presenton/presenton](https://github.com/presenton/presenton)（★11.2k）— 开源 AI 演示生成器，Docker / 桌面版，拖拽编辑后导出可编辑 PPTX / PDF，支持 Ollama 等本地模型，还带 MCP server。相同：文档输入、可视化编辑、可编辑 PPTX。不同：是完整应用而非 Skill，不跑在你的 Agent 里。
- [Anionex/banana-slides](https://github.com/Anionex/banana-slides)（★15.6k）— 基于 nano banana pro 的 AI 幻灯片应用，框选区域 + 语音改页，可导出 PPTX / PDF / 带配音的 MP4。相同：中文社区、支持 PDF/DOCX 输入、有 CLI 和 Agent skill 入口。不同：图像生成路线，可编辑 PPTX 导出仍在 beta。
- [icip-cas/PPTAgent](https://github.com/icip-cas/pptagent)（★4.9k）— 学术路线（EMNLP 2025 / ACL 2026），从参考 PPT 中抽取版式模式再生成，配有微调模型 DeepPresenter-9B。相同：文档 → PPTX、Agent 式反思生成。不同：研究框架 + Web UI，不是 Skill。

**延伸：榜单**
- [ToseaAI/awesome-html-slide-skills](https://github.com/ToseaAI/awesome-html-slide-skills)（★126）— 专门收录"生成 HTML 幻灯片的 Agent Skill"的清单，上面大部分 HTML 方向的仓库都来自这里，还有 20 来个更小众的（金蝶风、华为风、教学认知风等）。

一个观察：这一波"Agent 做 PPT"的 Skill 基本分成三条路线——HTML 幻灯片（frontend-slides / guizang / html-ppt-skill，好看但不出 PPTX）、代码直出 PPTX（ppt-master / Mck，可编辑但没有所见即所得）、整页图片（codex-ppt-skill / banana-slides，最自由但不可编辑）。dashi-ppt-skill 的位置是用"HTML 编辑台 + 逐节点转 PPTX"把前两条接起来；真正做到同一件事的只有 huashu-design 的 html2pptx 和 ppt-agent-workflow-san，其余都只覆盖一半。

Sources: [ppt-master](https://github.com/hugohe3/ppt-master) · [huashu-design](https://github.com/alchaincyf/huashu-design) · [ppt-agent-workflow-san](https://github.com/mucsbr/ppt-agent-workflow-san) · [frontend-slides-editable](https://github.com/archlizheng/frontend-slides-editable) · [open-slide](https://github.com/1weiho/open-slide) · [frontend-slides](https://github.com/zarazhangrui/frontend-slides) · [guizang-ppt-skill](https://github.com/op7418/guizang-ppt-skill) · [html-ppt-skill](https://github.com/lewislulu/html-ppt-skill) · [ppt-agent-skill](https://github.com/Akxan/ppt-agent-skill) · [codex-ppt-skill](https://github.com/ningzimu/codex-ppt-skill) · [image-to-editable-ppt-skill](https://github.com/ningzimu/image-to-editable-ppt-skill) · [Mck-ppt-design-skill](https://github.com/likaku/Mck-ppt-design-skill) · [presenton](https://github.com/presenton/presenton) · [banana-slides](https://github.com/Anionex/banana-slides) · [PPTAgent](https://github.com/icip-cas/pptagent) · [awesome-html-slide-skills](https://github.com/ToseaAI/awesome-html-slide-skills)
