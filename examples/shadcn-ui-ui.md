<!-- Produced by the skill in this repo, run in Claude Code (Claude Fable 5.1), 2026-10-18. Unedited. -->
<!-- Prompt: https://github.com/shadcn-ui/ui 有哪些类似的仓库 -->

我把 shadcn/ui 拆成了几个侧面来找：**意图**（给 React + Tailwind 项目一套好看、可改、可无障碍的组件起点）、**技术路线**（Radix / Base UI / React Aria 这类无样式原语 + Tailwind + CVA）、**产出形式**（不是 npm 包，而是"复制粘贴进你的代码库、代码归你"的 registry + CLI）、**生态**（shadcn registry 协议，一切 `npx shadcn add` 能装的东西）、**签名**（"Open Code"——它故意不发布组件包，让你自己维护）。按这个拆法，最接近的其实是各框架的移植版，而不是其他 React 组件库。

**最接近 — 共享大多数侧面（其他框架的 shadcn 移植）**
- [unovue/shadcn-vue](https://github.com/unovue/shadcn-vue)（★10.4k）— Vue 移植，基于 Reka UI（原 Radix Vue），同样有 CLI、registry 和 agent skill。共享：意图、复制粘贴形式、registry 生态、Radix 式原语。不同：Vue。
- [huntabyte/shadcn-svelte](https://github.com/huntabyte/shadcn-svelte)（★9.0k）— Svelte 5 移植，基于 Bits UI，自带 `packages/cli`。共享同上。不同：Svelte；社区维护，作者 shadcn 只是"祝福"。
- [founded-labs/react-native-reusables](https://github.com/founded-labs/react-native-reusables)（★8.7k）— React Native 移植，NativeWind/Uniwind 样式，仓库里有 `packages/registry`。共享：意图、registry 形式、Radix 风格原语。不同：目标平台是移动端。
- [spartan-ng/spartan](https://github.com/spartan-ng/spartan)（★3.0k）— Angular 版，拆成 brain（无头原语，发 npm）和 helm（样式组件，CLI 复制进项目，不发包），55+ 组件，另带 MCP server。共享：意图、"样式层归你"的签名。不同：Angular，原语是自己写的。
- [hngngn/shadcn-solid](https://github.com/hngngn/shadcn-solid)（★769）— SolidJS 移植，基于 Kobalte / corvu / Ark。共享：意图、形式。不同：Solid，体量小。
- [nank1ro/shadcn-ui](https://github.com/nank1ro/shadcn-ui)（★2.8k）— Flutter 移植。共享：意图、设计语言。不同：Dart，以 pub 包形式分发，不是复制粘贴，所以"签名"这项并不共享。

**同一技术路线 — 换了原语或样式引擎的"同类做法"**
- [jolbol1/jolly-ui](https://github.com/jolbol1/jolly-ui)（★1.1k）— 用 React Aria Components 重做 shadcn 的组件，样式和 API 刻意与 shadcn 兼容，同样复制粘贴。共享：意图、形式、Tailwind。不同：原语换成 Adobe React Aria（shadcn 自己也刚把 react-aria 加进 v4 依赖，可以对照看）。
- [chakra-ui/park-ui](https://github.com/chakra-ui/park-ui)（★2.4k）— Ark UI 原语 + Panda CSS，一套组件覆盖 React / Vue / Solid。共享：无头原语 + 样式层、复制进项目。不同：不用 Tailwind，走 Panda CSS 的零运行时方案。
- [coss-org/ui（原 Origin UI）](https://github.com/origin-space/originui)（★10.7k）— Cal.com 官方设计系统，Base UI + Tailwind，README 明说是受 shadcn 复制粘贴哲学启发；仓库里还保留了 Radix 版的 Origin UI 快照。共享：路线、形式。不同：许可证默认 AGPL（`apps/ui`、`apps/origin` 是 MIT），而且已经从"通用组件"转向一家公司的设计系统。
- [tremorlabs/tremor](https://github.com/tremorlabs/tremor)（★3.6k）— Radix + Tailwind 的复制粘贴组件，35+ 个，偏仪表盘/图表。共享：路线、形式。不同：垂直于数据可视化场景；commit 很少（84），维护强度不如 shadcn。

**同一生态 — 建在 shadcn registry 之上的扩展层**
- [magicuidesign/magicui](https://github.com/magicuidesign/magicui)（★22.1k）— 动效组件和特效，自带 `registry.json`，用 shadcn CLI 直接装。共享：形式、生态、Tailwind。不同：定位是"设计工程师的动画层"，默认你已经装好 shadcn。
- [vercel/ai-elements](https://github.com/vercel/ai-elements)（★2.3k）— Vercel 出的 AI 应用组件（对话、消息、推理块、代码块），装进你的 `components/ai-elements/`，复用 `components.json`。共享：registry 生态、复制粘贴。不同：只做 AI 界面，要求先 init shadcn。
- [assistant-ui/assistant-ui](https://github.com/assistant-ui/assistant-ui)（★11.4k）— AI 聊天原语（Thread / Message / Composer），CLI 可选 Base UI 或 Radix 风格，并复制一份 shadcn 主题进项目。共享：生态、原语+样式分层。不同：核心是 npm 包，复制的只是样式层。
- [birobirobiro/awesome-shadcn-ui](https://github.com/birobirobiro/awesome-shadcn-ui)（★20.3k）— 整个生态的索引：各语言移植、几百个第三方组件、模板、主题生成器。想找更细分的（日历、表格、计费组件……）从这里挖。

**它建在哪些框架之上**
- [radix-ui/primitives](https://github.com/radix-ui/primitives)（★19.2k）和 [mui/base-ui](https://github.com/mui/base-ui)（★11.1k）— shadcn v4 同时支持的两套无样式原语；它们是基础设施，不是同类替代。

一个模式层面的观察：shadcn 最独特的不是组件本身，而是"不发包、代码归你"的分发方式，所以真正的"同类"几乎都是按框架移植它的项目（Vue / Svelte / Angular / RN / Solid / Flutter），而非其他 React 组件库——DaisyUI、HeroUI、Mantine 那类 npm 包在"意图"上重叠，但在形式和签名上都不同，所以没列。另外整个生态正在从 Radix 向 Base UI 迁移（shadcn v4、Origin UI→coss、assistant-ui 默认 Base UI 都是信号）。
