<!-- Produced by the skill in this repo, run in Claude Code (Claude Fable 5.1), 2026-10-18. Unedited. -->
<!-- Prompt: https://github.com/openai/whisper 帮我找找相似的项目 -->

我把 openai/whisper 拆成了几个"面"来找：**意图**（开箱即用的多语言语音识别 + 翻译 + 语种识别，一个模型全包）、**技术路线**（PyTorch 的 Transformer encoder-decoder，大规模弱监督训练，带 tiny→large 的尺寸阶梯）、**产出形式**（pip 装完就有 CLI + Python API 的预训练模型发布，而不是训练框架）、**生态**（围绕 Whisper 权重长出来的一整圈加速/移植/增强项目）、**签名**（把转写、翻译、语种识别、时间戳全部编码成 decoder 的特殊 token 序列，多任务靠 prompt token 切换）。如果你更在意其中某一面，可以告诉我再往下挖。

**最接近——同时命中多个面**
- [espnet/espnet](https://github.com/espnet/espnet)（★10.0k）— 里面的 OWSM（Open Whisper-style Speech Model）是用公开数据从零复现 Whisper 式训练的开源模型（v4 覆盖 151 种语言、任意方向语音翻译、语种识别、时间戳）。共享：意图、路线、签名（多任务 token 设计）。不同：它是一个大的语音工具包，OWSM 只是其中一部分，且训练数据和配方全部公开——如果你想自己复现 Whisper 的训练，这是最直接的参考。
- [NVIDIA-NeMo/NeMo](https://github.com/NVIDIA-NeMo/NeMo)（★18.6k）— Canary（多语言 ASR + 翻译）和 Parakeet（高速英文 ASR）两个模型家族都在这里发布。共享：意图、产出形式（预训练模型 + 推理 API）。不同：是训练/部署框架而非单模型仓库，Parakeet 走的是 FastConformer-CTC/TDT 路线而不是 encoder-decoder。
- [facebookresearch/seamless_communication](https://github.com/facebookresearch/seamless_communication)（★11.8k）— Meta 的 SeamlessM4T 系列，语音/文本任意互译 + ASR，~100 种语言。共享：意图（一个模型管转写和翻译）、产出形式。不同：重心在翻译而不是转写，含语音输出；近期活跃度不如 Whisper。

**同一意图：开箱即用的多语言 ASR 模型（非 Whisper 权重）**
- [FunAudioLLM/SenseVoice](https://github.com/FunAudioLLM/SenseVoice)（★9.5k）— 阿里的多语言识别模型，顺带做语种、情感和音频事件识别。共享：多任务单模型。不同：非自回归架构（自称比 Whisper-Small 快 5 倍以上），只覆盖中/粤/英/日/韩，中文表现强于 Whisper。
- [moonshine-ai/moonshine](https://github.com/moonshine-ai/moonshine)（★11.2k）— 面向端侧、低延迟流式识别的小模型（最小 1MB），自称精度超过 Whisper Large V3。共享：意图。不同：目标是设备端实时语音代理，不是通用离线转写。
- [modelscope/FunASR](https://github.com/modelscope/FunASR)（★20.7k）— 覆盖训练、流式、VAD、标点、说话人分离的工具包，同时能跑 Paraformer、SenseVoice 和 Whisper-large-v3。共享：意图。不同：是工具包/服务框架，中文生态为主。
- [alphacep/vosk-api](https://github.com/alphacep/vosk-api)（★15k）— Kaldi 系的离线识别 API，多语言绑定，能跑在树莓派和手机上。共享：离线多语言识别。不同：老一代 Kaldi 路线，精度明显低于 Whisper，胜在极轻量。

**同一生态：Whisper 权重的加速与移植（可直接替换 openai/whisper 的推理）**
- [ggml-org/whisper.cpp](https://github.com/ggml-org/whisper.cpp)（★54.5k）— 纯 C/C++ 无依赖移植，Apple Silicon/手机/WASM 都能跑。不同：推理专用，不含训练或 PyTorch。
- [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper)（★25.9k）— CTranslate2 重实现，速度快、显存省，是目前服务端最常见的替代品。
- [huggingface/distil-whisper](https://github.com/huggingface/distil-whisper)（★4.1k）— 蒸馏版 Whisper，6 倍速、体积减半、WER 差 1% 以内。不同：目前只有英文模型；但它有完整的蒸馏训练代码，适合你想学"怎么训"的角度。
- [sanchit-gandhi/whisper-jax](https://github.com/sanchit-gandhi/whisper-jax)（★4.7k）— JAX/TPU 版实现。
- [k2-fsa/sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)（★13.8k）— ONNX Runtime 推理框架，支持 Whisper、Moonshine、SenseVoice、Parakeet 等十几种模型，十多种语言绑定。这个面很拥挤（还有 insanely-fast-whisper ★13.1k 等），只列最有代表性的。

**同一签名的延伸：在 Whisper 上补时间戳 / 说话人 / 音频事件**
- [m-bain/whisperX](https://github.com/m-bain/whisperX)（★23.5k）— 词级时间戳 + 说话人分离，批处理 70 倍实时。
- [linto-ai/whisper-timestamped](https://github.com/linto-ai/whisper-timestamped)（★2.8k）— 用 DTW 给 Whisper 加词级时间戳和置信度，改动最小。
- [MahmoudAshraf97/whisper-diarization](https://github.com/MahmoudAshraf97/whisper-diarization)（★5.6k）— Whisper 转写 + 说话人嵌入标注谁说的。
- [YuanGongND/whisper-at](https://github.com/YuanGongND/whisper-at)（★423）— Interspeech 2023 论文：在 Whisper 上接音频事件标签头，转写同时输出 AudioSet 标签。小而精，体现了"复用 Whisper 编码器做新任务"的思路。

**导航**
- [sindresorhus/awesome-whisper](https://github.com/sindresorhus/awesome-whisper)（★2.4k）— Whisper 周边的策展清单，上面不少项目来自这里。

一个观察：和 Whisper 真正"同类"（从零训练的多语言多任务语音基础模型）的开源项目其实很少，而且都藏在大工具包里（ESPnet 的 OWSM、NeMo 的 Canary），单独搜模型名几乎搜不到；绝大多数 GitHub 上的"whisper 相关"仓库是围绕 OpenAI 发布的权重做推理加速和功能补丁，不是在做同一件事。对于想学训练的你，OWSM 和 distil-whisper 是这份清单里真正带训练配方的两个。

Sources: [openai/whisper](https://github.com/openai/whisper) · [espnet/espnet](https://github.com/espnet/espnet) · [NVIDIA-NeMo/NeMo](https://github.com/NVIDIA-NeMo/NeMo) · [facebookresearch/seamless_communication](https://github.com/facebookresearch/seamless_communication) · [FunAudioLLM/SenseVoice](https://github.com/FunAudioLLM/SenseVoice) · [moonshine-ai/moonshine](https://github.com/moonshine-ai/moonshine) · [modelscope/FunASR](https://github.com/modelscope/FunASR) · [alphacep/vosk-api](https://github.com/alphacep/vosk-api) · [ggml-org/whisper.cpp](https://github.com/ggml-org/whisper.cpp) · [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper) · [huggingface/distil-whisper](https://github.com/huggingface/distil-whisper) · [sanchit-gandhi/whisper-jax](https://github.com/sanchit-gandhi/whisper-jax) · [k2-fsa/sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) · [m-bain/whisperX](https://github.com/m-bain/whisperX) · [linto-ai/whisper-timestamped](https://github.com/linto-ai/whisper-timestamped) · [MahmoudAshraf97/whisper-diarization](https://github.com/MahmoudAshraf97/whisper-diarization) · [YuanGongND/whisper-at](https://github.com/YuanGongND/whisper-at) · [sindresorhus/awesome-whisper](https://github.com/sindresorhus/awesome-whisper)
