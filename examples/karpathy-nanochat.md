<!-- Produced by the skill in this repo, run in Claude Code (Claude Fable 5.1), 2026-10-18. Unedited. -->
<!-- Prompt: https://github.com/karpathy/nanochat 这个仓库，帮我推荐相似的仓库 -->

我先把 nanochat 拆成几个"面"再分别找同类：**意图**是"花一百美元、几小时，从零训出一个能聊天的小 ChatGPT"；**技术路线**是纯 PyTorch、单节点 8×H100、Muon+AdamW、`--depth` 一个旋钮定全部超参；**产出形式**是 tokenizer→预训练→SFT→RL→评测→推理的全栈最小实现（而不是单一的预训练脚本）；**标志性特征**是"Time-to-GPT-2 排行榜"——把训练变成一场可比的速通赛。下面按这几个面分组。

**最接近 —— 同时命中多个面**
- [jingyaogong/minimind](https://github.com/jingyaogong/minimind)（★54.8k）— "2 小时、3 块钱从零训一个 64M 的 LLM"，原生 PyTorch 手写预训练/SFT/LoRA/DPO/GRPO/蒸馏/MoE，带 Streamlit 聊天界面和 OpenAI 兼容 API。共享：全栈最小实现、极低成本意图、纯 PyTorch。不同：面向单张 3090 而非 8×H100，中文语料与文档，没有速通排行榜。
- [FareedKhan-dev/train-llm-from-scratch](https://github.com/FareedKhan-dev/train-llm-from-scratch)（★10.8k）— 纯 PyTorch 从下载数据到 GRPO 的完整流水线：预训练、SFT、奖励模型、DPO/ORPO/KTO、PPO、GRPO、GSM8K 评测、Streamlit 控制台。共享：全栈形式、纯 PyTorch、带评测与聊天。不同：后训练算法覆盖更广更"教科书"，没有 nanochat 那种单旋钮调参和成本/时间对标。
- [tucan9389/nanochat-jax](https://github.com/tucan9389/nanochat-jax)（★12）— nanochat 的 JAX/Flax NNX 复刻，跑在 TPU 上，保留 d24 模型几何、tokenizer 配方、ClimbMix 数据和 22 项 CORE 评测，并同样以 "time-to-GPT-2" 计时（v6e-8 上 5.28 小时）。共享：意图、全栈形式、速通排行榜签名。不同：JAX + TPU 而非 PyTorch + H100，星很少但很新。

**同"技术路线 / 速通签名"：把 GPT-2 级训练压到最短时间**
- [KellerJordan/modded-nanogpt](https://github.com/KellerJordan/modded-nanogpt)（★5.9k）— "NanoGPT 124M 在 90 秒内训完"，8×H100 上冲 FineWeb 3.28 验证 loss 的世界纪录表，Muon 优化器就是从这里诞生的。nanochat 的排行榜思路和 Muon 都直接源于此。不同：只做预训练、只比 loss，没有 SFT/RL/聊天。
- [karpathy/llm.c](https://github.com/karpathy/llm.c)（★30.6k）— 纯 C/CUDA 复现 GPT-2/GPT-3 训练，无 PyTorch 依赖。共享："便宜地复现 GPT-2"的意图和"读得懂的最小实现"哲学。不同：底层 C/CUDA，只有预训练。

**同"全栈从零训小模型"形式（中文社区居多）**
- [charent/ChatLM-mini-Chinese](https://github.com/charent/ChatLM-mini-Chinese)（★1.7k）— 0.2B 中文对话模型，开源数据清洗、分词器训练、预训练、SFT、DPO 全流程。不同：T5 编解码架构而非 decoder-only，最近更新停在 2024 年初。
- [qiufengqijun/mini_qwen](https://github.com/qiufengqijun/mini_qwen)（★873）— 从零训 1B 中英双语模型，PT/SFT/DPO 三阶段。不同：基于 HF Trainer + TRL + DeepSpeed，而不是手写训练循环。
- [Tongjilibo/build_MiniLLM_from_scratch](https://github.com/Tongjilibo/build_MiniLLM_from_scratch)（★558）— 预训练 + SFT（DPO 测试中）。不同：依赖 bert4torch 框架，RL 阶段未完成。
- [Om-Alve/smolGPT](https://github.com/Om-Alve/smolGPT)（★1.5k）— 单文件风格的最小 PyTorch 小模型训练（Flash Attention/RMSNorm/SwiGLU/RoPE），在一张租来的 L4 上训 18.5 小时。不同：只到预训练，没有聊天微调。

**同"可魔改的研究型最小训练代码库"路线**
- [facebookresearch/lingua](https://github.com/facebookresearch/lingua)（★4.8k）— Meta 的"精简、易改"的 LLM 研究代码库，纯 `nn.Module`，单卡到多节点 SLURM，报告 1B–7B 结果。不同：面向研究员而非学习者，规模大得多。
- [huggingface/picotron](https://github.com/huggingface/picotron)（★2.3k）— 教学用的极简 4D 并行（数据/张量/流水线/上下文）训练框架。不同：主题是"怎么并行"而不是"怎么端到端训出聊天模型"。
- [huggingface/nanotron](https://github.com/huggingface/nanotron)（★2.8k）— picotron 的生产版，3D 并行预训练库，示例是 8×H100 上 10 分钟训一个 tiny Llama。不同：规模和复杂度都高一个量级。

**同"书 / 课程形式"的从零实现**
- [rasbt/LLMs-from-scratch](https://github.com/rasbt/LLMs-from-scratch)（★106.8k）— 《Build a Large Language Model (From Scratch)》配套代码，从分词、注意力、预训练到指令微调、DPO、KV cache 一章章写。不同：笔记本 + 逐章讲解、能在笔记本电脑上跑，而不是一键 speedrun。

**同作者 / 直接衍生**
- [karpathy/autoresearch](https://github.com/karpathy/autoresearch)（★92.7k）— 让 AI agent 自动反复改 nanochat 的单卡简化版 `train.py`、每轮训 5 分钟看 val_bpb；nanochat 排行榜上部分纪录就来自它。
- [karpathy/nanoGPT](https://github.com/karpathy/nanoGPT)（★62k）— nanochat 的前身，作者已标注"已过时，请用 nanochat"，但仍是最常被引用的最小 GPT 训练仓库。
- [scasella/nanochat-mlx](https://github.com/scasella/nanochat-mlx)（★70）— nanochat 的 Apple Silicon MLX 移植，不依赖 PyTorch，保留 `--depth` 单旋钮和全流程，适合在 Mac 上玩。

一个观察：真正和 nanochat"同一物种"的只有两类——minimind / train-llm-from-scratch 这种全栈最小实现，和 modded-nanogpt / nanochat-jax 这种"按墙钟时间比赛"的速通仓库；其余要么只做预训练，要么是并行框架。另外 nanochat-jax、nanochat-mlx 这类移植都是最近几个月出现、星数两位数，GitHub Trending 不会给你推。

Sources: [karpathy/nanochat](https://github.com/karpathy/nanochat) · [jingyaogong/minimind](https://github.com/jingyaogong/minimind) · [FareedKhan-dev/train-llm-from-scratch](https://github.com/FareedKhan-dev/train-llm-from-scratch) · [tucan9389/nanochat-jax](https://github.com/tucan9389/nanochat-jax) · [KellerJordan/modded-nanogpt](https://github.com/KellerJordan/modded-nanogpt) · [karpathy/llm.c](https://github.com/karpathy/llm.c) · [charent/ChatLM-mini-Chinese](https://github.com/charent/ChatLM-mini-Chinese) · [qiufengqijun/mini_qwen](https://github.com/qiufengqijun/mini_qwen) · [Tongjilibo/build_MiniLLM_from_scratch](https://github.com/Tongjilibo/build_MiniLLM_from_scratch) · [Om-Alve/smolGPT](https://github.com/Om-Alve/smolGPT) · [facebookresearch/lingua](https://github.com/facebookresearch/lingua) · [huggingface/picotron](https://github.com/huggingface/picotron) · [huggingface/nanotron](https://github.com/huggingface/nanotron) · [rasbt/LLMs-from-scratch](https://github.com/rasbt/LLMs-from-scratch) · [karpathy/autoresearch](https://github.com/karpathy/autoresearch) · [karpathy/nanoGPT](https://github.com/karpathy/nanoGPT) · [scasella/nanochat-mlx](https://github.com/scasella/nanochat-mlx)
