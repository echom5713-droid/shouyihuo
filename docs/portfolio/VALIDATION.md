# Validation evidence — 5 October 2026

This report distinguishes the latest **rendering and interaction refinement**, the **English-default bilingual edition**, and the portfolio checks **before localisation**. It separates executable software checks from visual checks and does not claim that the prototype has been evaluated for learning outcomes, professional repair accuracy, or real-world safety.

## Rendering and interaction refinement: acceptance status

A separate refinement run completed on **5 October 2026**. Its results come from new executions, not the earlier 47/18 test counts below. The final production preview was checked after rebuilding with the updated reviewer images and PDF.

| Refinement check | Current result | Evidence |
|---|---|---|
| `npm run typecheck` | **PASS** | [TypeScript log](../validation-refinement-2026-10-05/typecheck.log) |
| `npm run test`, including deterministic invariant sequences | **PASS — 56 tests / 4 files** | [Unit log](../validation-refinement-2026-10-05/unit-tests.log) |
| `npm run test:e2e`, full browser regression and rendering checks | **PASS — 21 tests, 6.3 minutes** | [Final browser log](../validation-refinement-2026-10-05/e2e-final.log) |
| `npm run build` | **PASS** | [Final build log](../validation-refinement-2026-10-05/build.log) |
| `npm run preview`, exercised by the production smoke script | **PASS — actual WebGL 2, bilingual review and PDF** | [Preview result](../validation-refinement-2026-10-05/production-preview.json) · [Script](../validation-refinement-2026-10-05/production-smoke.mjs) |
| New desktop and narrow-screen visual inspection | **PASS within the recorded viewport checks** | New screenshot links below; physical-device limits remain |

Technical rationale and scope: [Rendering and interaction refinement](../RENDERING_REFINEMENT.md). Evidence for this iteration is kept in `docs/validation-refinement-2026-10-05/` and `docs/screenshots/refinement-2026-10-05/`; the earlier evidence directories are preserved.

### Business behaviour and rendering are separate checks

The 56 unit tests include nine new bounded invariant tests: **3,888 deterministic event transitions** and **1,944 serialised schema-v1 continuation steps**. Assertions cover rejected unsafe changes, immutable inputs, first-diagnosis retention, fault clearing, assembly prerequisites, score bounds, verification invalidation and idempotent archiving. Coverage assertions require the generated paths to reach actual assembly changes, active retests and rejected unsafe actions. Fixed seeds belong to the test generator; the course itself does not introduce random behaviour. This sampling is not exhaustive model checking or a proof.

The 21 browser tests retain the original 12 workflows and six bilingual workflows, then add three rendering checks. They perform actual user journeys across all three scenarios, select a real mesh, observe state-driven water changes, preserve old records and safety errors, and verify the amber 100-point failed report. The new checks instrument actual WebGL draw entry points, test label visibility after cutaway/explosion/language changes, and deliberately lose a real WebGL context before continuing component checks in the 2D fallback. They do not inject a completed attempt to make a user journey pass.

The final production preview reported Chromium **153.0.8010.0**, **WebGL 2 through ANGLE / Vulkan SwiftShader**, **zero external requests** and **zero uncaught page errors**. It checked desktop/mobile reviewer layouts, local images, the linked PDF, language persistence and entry into the live application. Its server was stopped after the check. See the new [environment record](../validation-refinement-2026-10-05/environment.json) and [13-file integrity comparison](../validation-refinement-2026-10-05/core-integrity.json): course, engine, types, persistence, dependencies and original tests remain unchanged from the refinement baseline.

### New visual evidence

These images were generated from the running refined application. Representative desktop, narrow-screen, safety-failure, exploded-model and production-review captures were opened and inspected. Full-page images can be taller than their browser viewport.

| View | 1440×900 | 1366×768 | 1280×800 | 390×844 |
|---|---|---|---|---|
| Course entrance | [Capture](../screenshots/refinement-2026-10-05/40-home-en-1440.png) | [Capture](../screenshots/refinement-2026-10-05/40-home-en-1366.png) | [Capture](../screenshots/refinement-2026-10-05/40-home-en-1280.png) | [Capture](../screenshots/refinement-2026-10-05/40-home-en-390.png) |
| Workbench | [Capture](../screenshots/refinement-2026-10-05/41-workbench-en-1440.png) | [Capture](../screenshots/refinement-2026-10-05/41-workbench-en-1366.png) | [Capture](../screenshots/refinement-2026-10-05/41-workbench-en-1280.png) | [Capture](../screenshots/refinement-2026-10-05/41-workbench-en-390.png) |
| Assessment report | [Capture](../screenshots/refinement-2026-10-05/42-report-en-1440.png) | [Capture](../screenshots/refinement-2026-10-05/42-report-en-1366.png) | [Capture](../screenshots/refinement-2026-10-05/42-report-en-1280.png) | [Capture](../screenshots/refinement-2026-10-05/42-report-en-390.png) |

Additional evidence: [100-point safety failure](../screenshots/refinement-2026-10-05/48-safety-report-en.png), [English exploded model](../screenshots/refinement-2026-10-05/55-exploded-en.png), [live context-loss fallback](../screenshots/refinement-2026-10-05/23-live-context-loss-en.png), [production review desktop](../screenshots/refinement-2026-10-05/60-review-desktop-en.png), [production review mobile](../screenshots/refinement-2026-10-05/61-review-mobile-en.png) and [Chinese review mobile](../screenshots/refinement-2026-10-05/63-review-mobile-zh.png). The `zh-regression/` subdirectory holds new captures from the original Chinese workflows.

The matched pre-refinement captures are [home](../screenshots/refinement-2026-10-05/00-before-home-en-1440.png) and [workbench](../screenshots/refinement-2026-10-05/01-before-workbench-en-1440.png). Both workbench comparisons use the same no-refill scenario, viewport and initial part selection. In one settled scene, the instrumented baseline recorded **5,180 draw calls in 3,004 ms**; the final demand-render sample recorded **0 in 3,027 ms**, while simulation time advanced. Camera input and restored supply woke the renderer, and it settled after refill. [Baseline](../validation-refinement-2026-10-05/baseline-runtime.json) · [Final measurement](../validation-refinement-2026-10-05/demand-rendering.json). These are idle-drawing observations on software WebGL, not frame-rate, energy or native-GPU benchmarks.

The computed safety-text contrast was **8.46:1 at 14px** and component-description contrast **6.54:1 at 14px** in this browser. [Samples](../validation-refinement-2026-10-05/contrast.json) cover those elements only, not a complete accessibility audit.

### Reproducible refinement commands

On a machine with the normal Playwright Chromium installation, run the standard commands above and omit the test-host overrides. The actual cloud browser run used:

```sh
FONTCONFIG_FILE=/tmp/shouyihuo-test-fonts/fonts.conf \
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/shouyihuo-chromium/chromium \
E2E_SCREENSHOT_DIR=docs/screenshots/refinement-2026-10-05/zh-regression \
E2E_BILINGUAL_SCREENSHOT_DIR=docs/screenshots/refinement-2026-10-05 \
E2E_VALIDATION_DIR=docs/validation-refinement-2026-10-05 \
npm run test:e2e

npm run build
FONTCONFIG_FILE=/tmp/shouyihuo-test-fonts/fonts.conf \
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/shouyihuo-chromium/chromium \
node docs/validation-refinement-2026-10-05/production-smoke.mjs
```

The environment overrides are temporary test-host settings, not application requirements. `capture-baseline.mjs` uses a separate pre-refinement source copy; set `BASELINE_SOURCE_DIR` to a checkout of commit `df00d6808569b06dd36578ce66012a3b2a9a4b80` to repeat that historical measurement. `capture-exploded.mjs` obtains its image through ordinary current UI actions.

### Failures found, corrected and retained

- An initial development run overlapped with source edits/HMR; its two failures are retained in [round-one log](../validation-refinement-2026-10-05/refinement-round1.log), not reported as successful acceptance.
- The stable rendering check initially tried to restore supply before observation and diagnosis. The domain correctly rejected it. The test was corrected to collect three observations and submit the diagnosis first; no course guard was relaxed.
- A settled cutaway transition revealed a real occlusion-cache defect: raycasting could read old world matrices before Three.js updated them. The correction invalidates geometry-dependent occlusion and updates camera/part matrices before raycasting. The test checks an actual visible → hidden → visible label sequence. [Stable failures](../validation-refinement-2026-10-05/refinement-stable.log) · [Corrected three-test run](../validation-refinement-2026-10-05/refinement-corrected.log).
- Visual inspection corrected an oversized shadow and compact English toolbar wrapping. The new images above show the final layout. The PDF's third-page spacing was also corrected after rendering all three pages and checking the footer.

The production build retains a **large Three.js vendor-chunk warning**. The installed rendering dependency reports **`THREE.Clock` deprecation**; it does not produce an uncaught page error. Neither was hidden by raising warning thresholds or changing dependencies. The deliberate context-loss test can produce a renderer-disposal warning after the loss; ordinary production preview recorded only the Clock warning.

**Unverified:** Windows/native-GPU performance, Safari/Firefox, physical touch devices and printers, professional repair accuracy, real equipment calibration, learner outcomes and a complete accessibility audit. No hosted live demo or newly executed GitHub Actions run is claimed.

## Bilingual edition: completed historical baseline

The final bilingual run on **5 October 2026** passed type checking, **47 unit tests** and **18 Playwright tests (3.6 minutes)**. The final production build and separately executed production-preview smoke check also passed. The preview rendered a real **WebGL 2** scene through **ANGLE / Vulkan SwiftShader**, with **zero external requests and zero uncaught page errors**.

| Bilingual check | Actual result | Evidence |
|---|---|---|
| `npm run typecheck` | **PASS** | [TypeScript log](../validation-bilingual-2026-10-05/typecheck.log) |
| `npm run test` | **PASS — 47 tests** | [Unit test log](../validation-bilingual-2026-10-05/unit-tests.log) |
| `npm run test:e2e` | **PASS — 18 tests, 3.6 minutes** | [Final browser log](../validation-bilingual-2026-10-05/e2e-final.log) |
| `npm run build` | **PASS** | [Build log](../validation-bilingual-2026-10-05/build.log) |
| Final production preview | **PASS — bilingual review, PDF and live WebGL application** | [Preview result](../validation-bilingual-2026-10-05/production-preview.json) · [Reproducible smoke script](../validation-bilingual-2026-10-05/production-smoke.mjs) |

The final suite combines the 12 original browser scenarios with six bilingual scenarios. It verifies English-default startup, English / 中文 switching, translated dynamic feedback and 3D labels, persisted language choice, unchanged active attempt and retained safety errors, a full user-operated assessment, translated reports/print content, and the review page. The bilingual layouts were checked at **1440×900, 1366×768, 1280×800 and 390×844**. [Environment](../validation-bilingual-2026-10-05/environment.json), [core-file comparison](../validation-bilingual-2026-10-05/core-integrity.json) and [acceptance scope](../BILINGUAL_PORTFOLIO.md) are recorded separately.

### Fresh bilingual visual evidence

The following captures come from the running bilingual application on 5 October and were opened for visual review. The new English workbench and the amber 100-point safety-failure report replace historical images in the main portfolio. The 3D scene is real WebGL, not a static replacement.

| View | Capture |
|---|---|
| English course entrance | [1440 px](../screenshots/bilingual-2026-10-05/40-home-en-1440.png) · [1366 px](../screenshots/bilingual-2026-10-05/40-home-en-1366.png) · [1280 px](../screenshots/bilingual-2026-10-05/40-home-en-1280.png) · [390 px](../screenshots/bilingual-2026-10-05/40-home-en-390.png) |
| English training workbench | [1440 px](../screenshots/bilingual-2026-10-05/41-workbench-en-1440.png) |
| Critical safety error retained | [Workbench notice](../screenshots/bilingual-2026-10-05/47-safety-error-en.png) · [100-point failed report](../screenshots/bilingual-2026-10-05/48-safety-report-en.png) |
| Exploded WebGL view | [English model view](../screenshots/bilingual-2026-10-05/55-exploded-en.png) |

The final production smoke check opened the English review page at 1440×900 and 390×844, checked all images and horizontal overflow, switched to Chinese and refreshed to verify the preference, fetched the linked PDF and checked its signature, then followed the launch link to the actual application. English / Chinese switching preserved the live WebGL model. The server was stopped after checking. Production captures: [English desktop](../screenshots/bilingual-2026-10-05/60-review-desktop-en.png), [English mobile](../screenshots/bilingual-2026-10-05/61-review-mobile-en.png), and [Chinese mobile](../screenshots/bilingual-2026-10-05/63-review-mobile-zh.png).

### Problems found and corrected in this iteration

- Longer English copy exposed clipping in a compact action panel. The layout and content order were corrected, then the browser workflows and fresh captures were rerun.
- The development `/review/` route initially fell back to the application route. The route handling was corrected and checked again through the reviewer flow.
- A contrast-sampling selector still assumed the earlier Chinese interface. Its selector was corrected in the test; this was a test-maintenance fix, not a change to assessment rules.

The original simulation engine, course definitions, domain types, attempt storage, stage derivation, dependency files and original rule tests match the pre-localisation baseline at the paths listed in the integrity report. UI/localisation files do change; no blanket claim that all source files are identical is made. All physical-device and professional-validation limits below still apply.

## Pre-localisation portfolio run

The following environment, results and screenshots describe the completed 5 October portfolio verification before application localisation.

## Environment and reproducibility

- Linux x64 cloud workspace; Node **24.19.0**, npm **11.9.0**.
- Project **0.2.0**; TypeScript **5.9.3**, Vite **8.3.1**, Vitest **5.0.2**, Playwright **1.63.0**.
- Test browser: Chromium **153.0.8010.0**, obtained from a separate, temporary `@sparticuz/chromium@153.0.0` installation. No project dependencies or lockfile were changed to supply the test browser.
- The production browser reported **WebGL 2.0**, with **ANGLE / Vulkan SwiftShader**. This is a real rendered WebGL scene, but it does not establish performance on a hardware GPU.
- The fresh Linux runtime did not include a Chinese system font. A temporary local Noto Sans SC font was added to the test environment for final screenshots. The application still uses system fonts and makes no font download requests.
- Full versions and setup notes: [environment.json](../validation-portfolio-2026-10-05/environment.json).

On a standard developer machine:

```sh
npm ci
npx playwright install chromium
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run preview
```

The browser installation is a development prerequisite, not a runtime dependency of the course. A test-specific executable can be selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. To keep old visual evidence intact, `E2E_SCREENSHOT_DIR` and `E2E_VALIDATION_DIR` can redirect generated screenshots and contrast samples.

For a separate evidence run, use new output directories:

```sh
# bash / zsh
E2E_SCREENSHOT_DIR=docs/screenshots/local-recheck E2E_VALIDATION_DIR=docs/validation-local-recheck npm run test:e2e
```

```powershell
# Windows PowerShell
$env:E2E_SCREENSHOT_DIR = "docs/screenshots/local-recheck"
$env:E2E_VALIDATION_DIR = "docs/validation-local-recheck"
npm.cmd run test:e2e
```

## Results before localisation

| Check | Result | Evidence |
|---|---|---|
| `npm run typecheck` | **PASS** | [TypeScript log](../validation-portfolio-2026-10-05/typecheck.log) |
| `npm run test` | **PASS — 40 tests in 2 files** | [Unit test log](../validation-portfolio-2026-10-05/unit-tests.log) |
| `npm run build` | **PASS** | [Build log](../validation-portfolio-2026-10-05/build.log) |
| `npm run test:e2e` | **PASS — 12 tests, 2.3 minutes** | [Final browser log](../validation-portfolio-2026-10-05/e2e.log) |
| Production preview | **PASS — English review page, PDF, and live WebGL app** | [Preview result](../validation-portfolio-2026-10-05/production-preview.json) |

The build retains a warning about the Three.js vendor chunk exceeding 500 kB after minification. This is a bundle-size warning, not a failed build. A `THREE.Clock` deprecation warning also remains in browser console output.

## Business-logic verification

The 40 unit tests cover the following independent properties of the deterministic engine, storage, and presentation rules:

- Correct completion paths for all three cases and distinct observable normal/fault states.
- Controlled time steps: equivalent input states and actions produce equivalent outcomes.
- Illegal disassembly is rejected and logged without removing the component.
- Closing the supply does not repair a defect; replacing an unrelated component does not repair the actual defect.
- Isolation must be confirmed, disassembly conditions satisfied, parts reassembled, and the required working cycle retested.
- A repaired but unverified attempt is not passed. A 100-point attempt with a critical safety error is also not passed.
- Independent assessment locks the first submitted diagnosis. Guided retries are treated according to their original rules.
- Repeated observation, submission, and archival cannot increase scores or duplicate records.
- Serialisation preserves safety errors; modes keep separate progress; malformed, incompatible, unavailable, and unwritable storage is handled.
- Read-only stage labels, camera-related presentation state, and review suggestions do not mutate the attempt or its score.

These are implementation tests of the simplified course rules. They are not evidence that those rules match the full range of real toilet cisterns.

## Browser and WebGL verification

The 12 Playwright scenarios exercise the following behaviours through the UI:

1. Actual WebGL rendering, a raycast click on the canvas, synchronised selection, a full seal-repair assessment, a report, browser refresh, a single saved history entry, and print media styling.
2. Rejected illegal disassembly, persistence of the safety error through refresh and camera reset, and a visibly failed report despite a score of 100.
3. Observed overflow, inlet component handling, reassembly, and a completed retest.
4. Supply restoration without a replacement part; guided practice and structure exploration do not produce assessment certificates.
5. Cutaway/exploded views, normal drainage, changing water geometry, and narrow-screen controls.
6. Recovery from damaged storage and confirmation before clearing only this project's key.
7. Interactive 2D fallback when WebGL is deliberately unavailable.
8. Loading a frozen v0.1 storage fixture without losing an old record, nickname, active attempt, or safety error. This is the one compatibility fixture; the full workflow tests use real user actions.
9. Camera focus, top view, expanded workspace, stage state, keyboard control, and focus restoration without changing protected business state.
10. Viewports **1440×900, 1366×768, 1280×800, 1024×768, and 390×844**, including visible main actions and no horizontal page overflow.
11. Reduced-motion preference with working WebGL and immediate camera controls.
12. A wrong first assessment diagnosis remains locked, and initial assessment screens for all cases avoid targeted answer hints.

The complete seal-repair scenario also records application requests and asserts that no external course, model, font, or API requests occur. It checks for uncaught page errors. Contrast measurements cover three important text samples; this is not a full accessibility audit.

The production smoke check was run after the final English reviewer assets were built. It opened `/review/` at 1440×900 and 390×844, checked that every image loaded and no horizontal overflow occurred, fetched the linked PDF and verified its signature, then followed the launch link to the live app. The app rendered a real WebGL 2 canvas. The reviewer page and application made no external requests and had no uncaught page errors. See the [reproducible smoke-check script](../validation-portfolio-2026-10-05/production-smoke.mjs).

## Fresh screenshots

All files below were captured from the running application on **5 October 2026**. Historical v0.2 screenshots were preserved separately. At that pre-localisation stage, the English review page included labelled historical 26 September app captures; its surrounding page was freshly rendered for that check. The later bilingual edition uses new English-interface captures.

| View | Fresh capture |
|---|---|
| Course entrance | [1440 px](../screenshots/portfolio-2026-10-05/01-course-1440.png) |
| Training workbench | [1440 px](../screenshots/portfolio-2026-10-05/02-workbench-1440.png) |
| Passing report | [1440 px](../screenshots/portfolio-2026-10-05/05-report-1440.png) |
| 100 points, critical safety failure | [Failure report](../screenshots/portfolio-2026-10-05/08-safety-report.png) |
| Narrow-screen workbench | [390 px](../screenshots/portfolio-2026-10-05/18-mobile-390.png) |
| Production app | [WebGL preview](../screenshots/portfolio-2026-10-05/23-production-preview.png) |
| English reviewer page | [Desktop](../screenshots/portfolio-2026-10-05/30-review-desktop.png) · [Mobile](../screenshots/portfolio-2026-10-05/31-review-mobile.png) |

The workbench and safety-failure report were opened and visually inspected after the missing-font issue was corrected. Their labels are legible, the model is visible, and the safety-failure report retains its amber failed verdict. Additional viewport and camera captures are in the same screenshot directory.

## Setup failures and their resolution

- The normal Playwright CDN browser download returned an invalid/truncated ZIP. The original [installer log](../validation-portfolio-2026-10-05/browser-install.log) is retained. A normal npm installation of a separate test-browser package succeeded.
- The first browser launch failed because the manually extracted temporary binary had no executable permission after a font-archive ownership warning. The [setup-only failed run](../validation-portfolio-2026-10-05/e2e-browser-setup-failure.log) is retained. Correcting the temporary binary mode resolved this; no app code was changed.
- The next run passed all 12 scenarios, but visual inspection revealed missing Chinese glyphs in the test environment. That [pre-font test log](../validation-portfolio-2026-10-05/e2e-before-cjk-font.log) is retained. A local test font was installed and the complete suite was rerun to regenerate the screenshots.

## Limits of this evidence

**Not verified:** Windows execution, Safari/Firefox, hardware-GPU performance, physical touch devices, the operating system print dialog, or a physical printer. Browser print media styling is tested separately from those physical steps.

**Not evaluated:** repair-domain correctness by a qualified professional, usability with recruited learners, measurable learning improvement, accessibility across assistive technologies, long-term field use, or any admissions outcome.

The course uses a dimensionless teaching approximation for water level and simple rule-based flows. It is not computational fluid dynamics or an engineering digital twin. Locally stored attempts can be modified and are not tamper-resistant credentials.

Cloud loopback addresses used during testing are not the applicant's computer. The source can be installed and run locally; the verification servers are stopped after checks.
