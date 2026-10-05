# Project provenance and contribution disclosure

This repository presents **Shouyihuo (手艺活), Local MVP v0.2**, an AI-assisted software prototype. It should be evaluated as an inspectable product and engineering artefact with disclosed tool use. It is not presented as independently hand-coded or unaided work by the project owner.

## Origin and roles

The project owner supplied the original product brief and constraints: a Chinese-language, locally runnable 3D training experience; three defined fault scenarios; three learning modes; deterministic assessment; safety guards; local records; explicit educational limitations; and concrete validation requirements. The owner also supplied the v0.2 upgrade brief prioritising clearer UI, better 3D interaction, preserved business rules, and compatibility with existing local records.

Codex produced substantial implementation work, including application code, procedural 3D modelling, simulation and assessment code, tests, interface refinement, debugging, and documentation. Codex also operated the available execution environment to run the checks and browser interactions documented in the repository. The English public documentation and subsequent English-default bilingual presentation were prepared with Codex assistance on 5 October 2026. The owner explicitly requested suitability for project review alongside overseas postgraduate applications, while retaining Chinese access. The application is supporting project evidence, not an admissions outcome or claim of university endorsement.

These records support attribution for the supplied brief and constraints. They do not by themselves establish which individual code changes the project owner personally wrote, their independent command of every implementation detail, or any unrecorded review activity. Descriptions of this project in a CV, interview, or portfolio should preserve that distinction.

## Evidence chronology

| Date / stage | Evidence and scope |
|---|---|
| Local MVP v0.1 | Initial implementation and original business-rule tests; preserved baseline material is under [baseline-v0.1](../baseline-v0.1/). |
| 26 September 2026, v0.2 | Documented baseline rerun, UI/3D changes, regression discovery and correction, final type check, 40 unit tests, 12 E2E tests, build, and production-preview check. See [TEST_REPORT.md](../TEST_REPORT.md). |
| 5 October 2026, portfolio preparation | English technical explanation, a project brief and reviewer instructions were added. Fresh verification before localisation is recorded in [VALIDATION.md](VALIDATION.md), separately from the historical v0.2 evidence. |
| 5 October 2026, bilingual presentation | English-default interface and review page with an English / 中文 switch. This changes UI code and presentation content, so pre-localisation test results cannot stand in for its own acceptance checks. See [the bilingual release note](../BILINGUAL_PORTFOLIO.md). |
| 5 October 2026, rendering refinement | Demand-driven WebGL, visual-state projection, label-cache correction and additional invariant/browser checks. See [the rendering note](../RENDERING_REFINEMENT.md). |
| 5 October 2026, procedural detail | Codex refined the cistern construction, fixed-pivot float linkage, local hose texture and instanced chain detail, added double-click focus and new browser checks. The owner requested richer modelling and useful inspection ideas. Actual validation and visual corrections are recorded separately in [the model detail note](../MODEL_DETAIL_REFINEMENT.md) and [VALIDATION.md](VALIDATION.md). |

The historical [v0.2 business-preservation check](../validation-v0.2/business-preservation.json) records that the original domain configuration, reducer, domain types, storage implementation, and business-test file were unchanged during the September UI upgrade. That is a dated comparison, not a claim that every current source file is unchanged. The October bilingual edition changes presentation code and localised content while preserving the simulation and assessment semantics; its checks are reported separately. The [October file-level comparison](../validation-bilingual-2026-10-05/core-integrity.json) identifies the specific core files preserved from the pre-localisation baseline.

## Sources and dependencies

- The tank model is built from procedural geometry in [TankModel.tsx](../../src/components/TankModel.tsx); the application does not use a downloaded branded model or claim to represent every real cistern design.
- The software uses third-party open-source packages, including React, TypeScript, Vite, Three.js, React Three Fiber, Zod, Vitest, and Playwright. Exact dependency declarations and resolved versions are in [package.json](../../package.json) and [package-lock.json](../../package-lock.json). Their authorship and licence terms remain separate from this project's work.
- Runtime course text, model geometry, icons, and styling are bundled locally. No large-language-model API is integrated. On-screen learning hints are local course rules, not live AI advice.
- The screenshots in [screenshots/v0.2](../screenshots/v0.2/) are captured application output from the documented browser run. They are not static design mock-ups or image-generated substitutes for the 3D application.

## Limits of the evidence

Automated tests and browser checks demonstrate specified behaviours under the recorded conditions. They do not demonstrate measured learning gains, professional repair accuracy, adoption, revenue, real-world safety, or formal accessibility certification. No user-study findings or professional endorsements are claimed.

The recorded WebGL test environment used Linux Chromium and SwiftShader software rendering. It does not establish native-GPU performance or identical behaviour on every browser and device. Local records are modifiable and lack server verification or tamper resistance. A completion record certifies only a result inside this prototype, not real-world competence.

## A transparent way to describe the work

An accurate short description is:

> Shouyihuo is an AI-assisted local 3D training prototype developed from a user-defined product brief. Codex contributed substantial implementation, testing, debugging, and documentation. The repository exposes the deterministic simulation, safety gates, persistence model, and dated validation evidence for review.

Any more personal contribution claim should be supported by the contributor's actual work and ability to explain or extend it. Repository publication or a successful test run should not be used to imply unaided authorship or validated educational effectiveness.
