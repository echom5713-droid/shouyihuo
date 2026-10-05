# Rendering and interaction refinement

**Shouyihuo Local MVP v0.2 · 5 October 2026**  
An engineering note accompanying the English-default, bilingual portfolio.

This iteration asks a narrower question than adding another feature: how can a small procedural model feel more deliberate while doing less unnecessary work? The course, three scenarios, assessment rules and schema-v1 learning records remain the constraints. The [case study](portfolio/TECHNICAL_CASE_STUDY.md) explains those rules; this note concentrates on their boundary with the interface and renderer.

## The problem with an always-running scene

The application advances its teaching model by dispatching `TICK` events with a fixed increment of 0.25 seconds. React receives an updated attempt even when only elapsed time changes. A continuously rendered Canvas then spends frames on a view that may be visually identical, such as an isolated, empty tank.

That does not justify pausing the simulation when the scene is still. A stationary water surface may coexist with a running stability check. Simulation progress and redraws have different responsibilities: the former changes the authoritative attempt; the latter presents its current state.

The refinement therefore keeps the original reducer and timer while changing how the 3D view requests work. The design target is **an idle renderer for a settled scene, with reliable wake-up for visible changes**, not a higher score or a faster simulated repair.

## Rendering without another business-state machine

The implementation separates three concerns:

| Concern | Owner | What may change it |
|---|---|---|
| Course state and pass conditions | Typed domain reducer | Valid course events and controlled simulation steps |
| Displayed geometry and active flow | Read-only projection of the attempt | Water, supply, assembly, defects, lid and drainage state |
| Camera and visual motion | Three.js view | Orbit input, explicit view commands and bounded interpolation |

[`TankModel.tsx`](../src/components/TankModel.tsx) now uses React Three Fiber’s `frameloop="demand"`. OrbitControls `change` events invalidate the scene; camera commands and component, water and float interpolation request subsequent frames only until their target is reached. Active flow markers keep requesting frames while visible. Reduced-motion mode presents those markers at static positions and snaps visual transitions without changing water, faults or verification.

Label layout has a separate cache for camera, viewport, geometry, selection, label visibility and locale. A moving flow marker alone does not require another round of label projection, overlap handling and occlusion raycasts. Language changes invalidate that layout so translated text is placed again. Cutaway and state-driven rotations also affect occlusion, even when a part’s position does not change; they must participate in invalidation.

This boundary exposed a real regression during the refinement. Adding the front wall invalidated the cache, but `useFrame` runs before Three.js updates world matrices for rendering. The new wall could therefore be raycast at its old transform, and a sleeping renderer would retain the wrong visibility. The correction updates camera and part world matrices before recomputing label occlusion. A browser test now toggles cutaway in a settled, reduced-motion scene and checks the inlet label's actual visible/hidden/visible sequence.

Memoisation is part of this boundary, not a substitute for it. The explicit `visualState` projection contains water level, supply and lid state, whether draining is active, both defects, and each component’s installed/replaced flags. The scene comparator also checks selection, view settings, camera commands and locale. It deliberately excludes elapsed time, logs and scores, which are not inputs to the geometry. A stable selection callback forwards through a ref to the current handler instead of retaining an old closure.

This creates a maintenance obligation: any future mesh or flow dependency must be added to the projection. Omitting one can freeze a valve or show stale water; comparing the entire `Attempt` would lose the optimisation because timer updates create new objects. The scene does not use the projection to award points or replace the authoritative state.

## Materials as explanatory cues

The visual direction stays light and restrained. The shell should read as ceramic, metal fittings should have a distinct response to light, and plastic parts should remain legible inside the tank. The water is translucent enough to communicate its level without concealing the assemblies. Selected and hovered parts still use the same explicit selection state as the component list and operation target.

`RoomEnvironment` constructs a lighting scene in code. `PMREMGenerator.fromScene` prepares a reflection map at a size of 128 once for each Canvas mount; the room and generator are disposed after creation, and the resulting environment is disposed when the view unmounts. The visible background remains independent. Ceramic clearcoat, restrained metal response, a 1024×1024 shadow map and a warm key/cool fill light pair separate the model’s materials. The hollow overflow mouth, lid underside and pipe fitting receive small geometry refinements.

The environment requires initial GPU work and texture memory. The implementation accepts that cost to improve shape and material legibility without a remote HDRI, downloaded texture or post-processing pipeline. This is procedural illustration, not material calibration or photorealistic simulation.

## Interaction hierarchy

The workbench remains a place to perform the current task. Observation, diagnosis, treatment and verification are read from real progress rather than manually advanced steps. The active phase has a clearer green treatment, component selection has a visible row marker, and dividers distinguish water and supply readouts without adding another card grid. The model stage uses a thin boundary and restrained background.

The component’s first explanatory sentence stays visible. Secondary modelling notes sit in a native `<details>` disclosure, open initially in structure exploration and collapsed in scored modes. Keyboard access is provided by the browser’s disclosure semantics. Safety conditions and observation actions remain outside it. The desktop workspace-expansion control uses its icon with the same accessible name and tooltip, allowing the toolbar to use less vertical space at compact desktop sizes.

The report replaces the circular score ornament with a typographic score and explicit verdict. Its colour follows the pass gate: a 100-point attempt with a critical safety error remains an amber failed result. The entrance, inspector and report share the same typography, borders and spacing; English / 中文 remains available throughout.

These presentation changes cannot make invalid actions succeed. Rejected removal and unsafe restoration still produce the original recorded error. Camera focus, cutaway, exploded views and workspace expansion cannot complete an observation, replace a component or clear a safety mistake. Independent assessment still reveals no targeted answer hint before diagnosis.

## Evidence and what it can establish

The refinement has its own dated [validation section](portfolio/VALIDATION.md): type checking, 56 unit tests, 21 browser tests and the production build passed. The earlier 47-unit/18-browser result describes the pre-refinement bilingual baseline only.

The evidence is separated into four layers:

- **Domain invariants:** [nine additional tests](../tests/invariants.test.ts) use fixed seeds across all three cases, three modes and six reachable checkpoints. They exercise **3,888 transitions**, checking frozen-input purity, valid assembly changes, retained safety errors and first diagnosis, fault-clearing rules and score bounds. A separate **1,944-step continuation check** serialises and reloads schema-v1 data after each step and compares state and score with uninterrupted execution. Coverage assertions require the generated paths to include unsafe rejection, assembly changes, active retests and invalidated verification. This is bounded deterministic sampling, not exhaustive model checking.
- **Browser behaviour:** actual user actions check that UI refinements preserve selection, protected state, score explanations and English / 中文 switching.
- **Render scheduling:** frame counters can establish that a settled scene stops requesting draws and that visible input restarts it. They do not measure battery life, power consumption or native-GPU frame time.
- **Visual inspection:** new captures at desktop and narrow widths check framing, legibility and controls. Screenshots cannot establish responsiveness on physical touch devices or learning effectiveness.

Software WebGL is useful for repeatable browser verification but is not a performance benchmark for a user's graphics card. No frame-rate, energy-saving or educational-outcome claim follows from a successful build.

### Matched idle-drawing observation

The baseline and refinement use the same 1440×900 viewport, Chromium executable, software WebGL renderer and no-refill scenario before observations. A test wrapper counts real `drawElements` and `drawArrays` calls, including shadow passes. Each sample starts after camera transitions settle; initial shader compilation and reflection-map generation are excluded.

| Sample | Observation window | WebGL draw calls |
|---|---:|---:|
| Before refinement | 3,004 ms | 5,180 |
| Refined demand loop | Approximately 3,000 ms | 0 |

The simulation continued advancing during the idle sample. Camera movement and restored supply then caused drawing to resume; after refill and visual interpolation settled, drawing stopped again. The exact timing of the final run is retained in [demand-rendering.json](validation-refinement-2026-10-05/demand-rendering.json), alongside the [unchanged-code baseline](validation-refinement-2026-10-05/baseline-runtime.json).

This observation establishes that unnecessary drawing was removed for this state. It does not imply that every training state is idle: visible water flow intentionally keeps the scene active. It also does not quantify total CPU cost, frame time, memory, power or battery consumption.

## Questions worth discussing in a technical review

1. **Why retain a fixed-step simulation timer?** It keeps course transitions independent of display refresh rate. Coupling the reducer to rendered frames would make a hidden or idle Canvas alter learning progress. The existing browser-visibility policy remains separate.
2. **What can make demand rendering incorrect?** Missing invalidation after an imperative camera update, stopping interpolation before its endpoint, a stale label projection, or a memo comparator omitting an assembly or flow input. The optimisation needs tests that wake the scene as well as tests that let it sleep.
3. **Why test generated action sequences?** Happy-path workflows establish that intended use works. Reproducible out-of-order events probe guard composition, immutable completed states, score bounds and retained safety errors. Their finite scope must still be stated.
4. **What would justify further work?** Observed usability problems, measured cost on representative hardware, and professional review of the course assumptions. Those would support new changes more strongly than adding speculative features.

The project remains substantially AI-assisted. This note records implementation decisions and inspectable evidence, not a claim that the applicant independently wrote or already understands every implementation detail. [Provenance](portfolio/PROVENANCE.md) states the contribution boundary.

## Implementation references

- [React Three Fiber: scaling performance](https://github.com/pmndrs/react-three-fiber/blob/master/docs/advanced/scaling-performance.mdx) — demand rendering and invalidation for imperative changes.
- [Three.js: RoomEnvironment](https://threejs.org/docs/pages/RoomEnvironment.html) — procedural environment geometry.
- [Three.js: PMREMGenerator](https://threejs.org/docs/pages/PMREMGenerator.html) — deriving a reflection environment from a scene.

These references explain the mechanisms. The repository’s source and dated browser evidence establish what this project actually implements; no dependency upgrade was needed for the refinement.
