# BizSim 模块化开发目录

这个目录是 BizSim 的开发态模块化重构版本，目标是把单文件脚本拆分为可维护结构。

## 目录结构

- src/config: 常量、默认数据、提示词
- src/core: 业务引擎
- src/ui: 面板模板与 UI 控制器
- src/utils: 通用工具与 SillyTavern 兼容层
- src/index.js: 入口与事件注册
- main.dev.js: 开发入口

## 说明

- 当前是开发态 ES Module 结构，便于维护与迭代。
- 不直接替换现有 bizsim_v1.0.js；后续可按你的需求再合并/构建输出为单文件发布版。
- 已把现有关键能力保留到模块版本：
  - 独立 LLM 请求
  - 模型拉取与选择
  - 提示词可编辑与持久化
  - 世界推演核心流程

## 构建

在 `bizsim` 目录下执行 `npm run build:single`，会输出可直接复制测试的单文件到 `dist/bizsim.single.js`。

## 下一步建议

1. 你确认模块划分和命名没问题后，我可以继续把单文件版的最新修复再对齐一遍。
2. 如果你想要更稳的生产级打包，我可以把当前手工拼接脚本换成 Rollup 或 esbuild 版本。
