# Validation evidence — 5 October 2026

This report records a fresh validation run for the English portfolio package. It separates executable software checks from visual checks and does not claim that the prototype has been evaluated for learning outcomes, professional repair accuracy, or real-world safety.

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

## Current results

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

All files below were captured from the running application on **5 October 2026**. Historical v0.2 screenshots were preserved separately. The English review page intentionally includes its labelled historical 26 September app captures; its surrounding page was freshly rendered for this check.

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
