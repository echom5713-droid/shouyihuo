# v0.1 修改前基线

2026-09-26 在现有工程上重新执行，Node v24.19.0 / npm 11.9.0，Chromium 153.0.8010.0，SwiftShader WebGL。

- typecheck：通过，见 typecheck.log。
- 单元测试：25 项通过，见 unit-tests.log。
- build：通过，见 build.log；保留 Three.js 大分包提示。
- E2E：7 项通过，1.3 分钟，见 e2e.log。
- screenshots/：原 v0.1 交付的 15 张截图原样备份。
- runtime-screenshots/：本次修改前重跑 E2E 实际生成的 14 张截图。旧生产预览截图没有在此次基线重跑，未混入此目录。
- fixture-origin.md：旧版学习数据兼容用例来源。

新版实际运行截图保存到 ../screenshots/v0.2/，不以这些基线截图代替新版验收。
