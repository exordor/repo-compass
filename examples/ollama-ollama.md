<!-- Produced by the skill in this repo, run in Claude Code (Claude Fable 5.1), 2026-10-18. Unedited. -->
<!-- Prompt: https://github.com/ollama/ollama 推荐一些相似的仓库 -->

我把 ollama/ollama（★183k，Go）拆成了几个面向来找相似仓库：**意图**——让普通开发者一条命令在本机跑开源模型；**技术路线**——Go 写的常驻服务，底层封装 llama.cpp/GGML（近期也加了 MLX 后端），暴露 REST API 和 OpenAI 兼容接口；**输出形态**——CLI + 本地服务 + 官方 SDK；**生态**——围绕它的 Web UI、客户端、集成工具；**签名**——像 Docker 一样 `pull`/`run`/`push` 模型，模型用自家 registry 和 Modelfile 分发。按这些面向分别搜索、逐个打开 GitHub 页面核实后，结果如下。

**最接近——同时命中多个面向**
- [containers/ramalama](https://github.com/containers/ramalama)（★3.1k，Python，Red Hat 维护）— 用容器工作流在本地跑模型，`ramalama run/pull/push`，支持 OCI registry / HuggingFace / Ollama registry 作为模型源，默认 llama.cpp，可切 vLLM、MLX。共享：意图、Docker 式 pull/run 签名、llama.cpp 路线、CLI+服务形态。不同：模型跑在 rootless 容器里，GPU 驱动随容器镜像走，README 明说 Ollama 模型源将被移除。
- [docker/model-runner](https://github.com/docker/model-runner)（★645，Go，Apache-2.0）— Docker 官方的模型运行器，`dmr pull/run`，模型以 OCI artifact 发布到 Docker Hub 或任意 OCI registry，默认 llama-server 后端，可选 vLLM/NIM，带 OpenAI 风格 API 和 Prometheus 指标。共享：Go、llama.cpp 路线、签名几乎一样。不同：把"模型即镜像"做到底了，还有 k8s Helm chart；星数远低于其知名度。
- [mudler/LocalAI](https://github.com/mudler/LocalAI)（★47.8k，Go）— 自称"开源 AI 引擎"，60+ 后端按需拉取（llama.cpp、vLLM、whisper.cpp、diffusers、MLX），同时兼容 OpenAI、Anthropic 以及 Ollama API，能直接拉 Ollama registry 和 OCI 的模型。共享：Go、llama.cpp 路线、本地 API 服务。不同：覆盖语音/图像/视频等多模态，内置多用户、agent、MCP，更像自托管平台。
- [lemonade-sdk/lemonade](https://github.com/lemonade-sdk/lemonade)（★5.4k，C++/React，AMD 系）— 本地 LLM 服务，CLI 有 `lemonade run/pull/list`，同时暴露 OpenAI、Anthropic、Ollama 风格 API。共享：意图、CLI+服务形态、pull/run 签名。不同：卖点是 NPU（XDNA2）和 AMD GPU 路径，而非通用平台支持。

**同一意图：一条命令本地跑模型，但走不同路线**
- [Mozilla-Ocho/llamafile](https://github.com/Mozilla-Ocho/llamafile)（★26.4k，C/C++）— 把模型权重和 llama.cpp 打成一个可跨平台直接执行的文件（Cosmopolitan Libc）。共享：llama.cpp 路线、零安装意图。不同：分发单位是"一个可执行文件"而不是常驻服务 + registry。
- [LostRuins/koboldcpp](https://github.com/LostRuins/koboldcpp)（★12.0k，llama.cpp 分支，AGPL）— 单文件零安装跑 GGUF，自带 KoboldAI Lite 网页 UI，同时模拟 OpenAI、Ollama、Anthropic 等多种 API。共享：llama.cpp 路线、兼容 Ollama API。不同：面向角色扮演/写作社区，附带图像、语音生成。
- [Michael-A-Kuykendall/shimmy](https://github.com/Michael-A-Kuykendall/shimmy)（★5.9k，Rust）— 纯 Rust + WebGPU 的单二进制 OpenAI 兼容服务，原生读 GGUF，README 直接拿 Ollama 做启动时间/内存对比。共享：GGUF、本地 OpenAI 兼容服务。不同：不依赖 llama.cpp，走 WebGPU；只覆盖已认证的 26 个模型/量化组合。

**同一技术路线：本地推理服务 / 引擎**
- [EricLBuehler/mistral.rs](https://github.com/EricLBuehler/mistral.rs)（★7.6k，Rust）— Rust 推理引擎，`mistralrs serve` 暴露 OpenAI 与 Anthropic 兼容接口，支持 HF 权重、GGUF、自研 UQFF 量化，带 Python/Rust SDK。共享：本地 API 服务、GGUF、官方 SDK 形态。不同：自研 CUDA/Metal 后端，PagedAttention、多 GPU、多模态更偏工程化。
- [mostlygeek/llama-swap](https://github.com/mostlygeek/llama-swap)（★6.0k，Go）— 单二进制 + 一个配置文件，按请求里的 `model` 字段自动拉起/切换 llama.cpp、vLLM 等后端进程，支持 ttl 卸载、别名。共享：Go、"按需加载/卸载模型"这件 Ollama 内部在做的事。不同：它只做代理和进程管理，不下载模型、不绑定后端。
- [ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp)（★131.6k，C/C++）— Ollama 所依赖的底层。`llama-server` 本身就是 OpenAI 兼容服务，`llama serve -hf <repo>` 现在也能直接从 HF 拉模型。作为"它建在哪上面"列一行；如果你想绕过 Ollama 的封装直接调参，就是它。

**同一生态：围绕 Ollama 的周边**
- [open-webui/open-webui](https://github.com/open-webui/open-webui)（★156k，Python/Svelte）— 最常和 Ollama 搭配的自托管聊天界面，有 `:ollama` 镜像把两者打包在一起，也接任何 OpenAI 兼容 API。不是替代品，而是用户面最大的上层。
- [janhq/jan](https://github.com/janhq/jan)（★45.0k，TypeScript/Tauri）— 离线 ChatGPT 替代桌面应用，底层同样是 llama.cpp，在 `localhost:1337` 暴露 OpenAI 兼容 API。共享：llama.cpp 路线、本地 API。不同：GUI 优先；其姊妹项目 cortex.cpp（曾经是最像 `ollama pull/run` 的 CLI）已于 2025-07 归档。

**同一作者**
- [ollama/ollama-python](https://github.com/ollama/ollama-python)（★10.6k）— 官方 Python SDK；JS 版是 ollama/ollama-js。

一个观察：这一圈里最新的趋势是"模型当 OCI 镜像管"（ramalama、docker/model-runner、LocalAI 都支持 OCI registry 做模型源），以及多家服务开始直接兼容 Ollama 的 API（LocalAI、lemonade、koboldcpp）——Ollama 的接口已经事实上成了本地推理的一个标准。另外 docker/model-runner 只有 645 星，跟它在 Docker Desktop 里的曝光度完全不成比例，靠 Trending 不会看到它。

Sources: [ollama/ollama](https://github.com/ollama/ollama) · [containers/ramalama](https://github.com/containers/ramalama) · [docker/model-runner](https://github.com/docker/model-runner) · [mudler/LocalAI](https://github.com/mudler/LocalAI) · [lemonade-sdk/lemonade](https://github.com/lemonade-sdk/lemonade) · [Mozilla-Ocho/llamafile](https://github.com/Mozilla-Ocho/llamafile) · [LostRuins/koboldcpp](https://github.com/LostRuins/koboldcpp) · [Michael-A-Kuykendall/shimmy](https://github.com/Michael-A-Kuykendall/shimmy) · [EricLBuehler/mistral.rs](https://github.com/EricLBuehler/mistral.rs) · [mostlygeek/llama-swap](https://github.com/mostlygeek/llama-swap) · [ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp) · [open-webui/open-webui](https://github.com/open-webui/open-webui) · [janhq/jan](https://github.com/janhq/jan) · [ollama/ollama-python](https://github.com/ollama/ollama-python)
