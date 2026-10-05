# Five-minute reviewer guide

This guide provides English explanations alongside the exact Chinese controls in Shouyihuo Local MVP v0.2. The working application remains in Simplified Chinese. Allow approximately five minutes after installation; the supplied sequence intentionally reveals one scenario's answer so a reviewer can inspect the complete interaction.

This is an unaudited teaching model, not instructions for working on a real toilet. All operations below occur inside the application.

## Start the application

From the project folder containing `package.json`:

```sh
npm ci
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173) on the same computer. If port 5173 is occupied, stop the previous copy of this app before restarting; the server does not silently choose another port. Windows PowerShell users can use `npm.cmd ci` and `npm.cmd run dev`. Stop the server with Ctrl+C; later runs need only `npm run dev` unless dependencies have changed.

If a browser-storage warning appears, read it before resetting anything. Existing attempts are stored locally and reset is destructive to this project's records. A separate browser profile can provide a clean review session without deleting existing progress.

## Complete a scenario without replacing a part

The supply case demonstrates observation, diagnosis, a justified minimal intervention, retesting, and persistence.

| Step | Exact control to use | Expected behaviour |
|---|---|---|
| 1 | On the course page, choose **03 排水后没有补水** (“No refill after draining”), then **开始独立测评** (“Start independent assessment”) | The workbench shows a low water level and a closed supply. The heading states the symptom, not the answer. |
| 2 | Click **查看水位** (“Check water level”) and **检查供水** (“Check supply”) in the right panel | Two observations appear in **已收集证据** (“Collected evidence”). Observation does not require first closing the supply. |
| 3 | Select **进水组件** (“Inlet assembly”) in the left part list, then **记录部件观察** (“Record part observation”) | The model highlight, part description, and operation target agree. This records the third applicable observation. Selecting a part alone does not award evidence points. |
| 4 | In **选择诊断** (“Select diagnosis”), choose **供水阀关闭** (“Supply valve closed”); click **提交诊断** (“Submit diagnosis”) | The first answer is locked in independent assessment. An explanation now appears. |
| 5 | Open the **模拟处理** (“Simulated actions”) tab; click **恢复供水** (“Restore supply”) | The valve and water-state display change, and the 3D water level rises. Do not remove or replace a component: this case does not require it. |
| 6 | Click **运行复测** (“Run retest”) and wait for **复测通过** (“Retest passed”) | The application verifies filling, stable water level, draining, and refilling. The model visibly follows these state changes. |
| 7 | Click **结束并查看报告** (“Finish and view report”), then the same button in the confirmation dialog | With the observations and first diagnosis above, the report should show **100** and **本原型测评合格** (“Passed within this prototype”). |
| 8 | Click **全部学习记录** (“All learning records”), then refresh the page | One record remains for this attempt. Refreshing does not duplicate it. |

If the right-hand panel is shorter than its contents, scroll within it. On narrow layouts, **学习目标与部件列表** (“Learning objectives and parts”) opens the collapsed left panel. Returning to the course page preserves unfinished progress; selecting a new attempt may request confirmation if another attempt is active in that mode.

## Inspect a safety failure without bypassing the rules

The [recorded safety-report screenshot](../screenshots/v0.2/08-safety-report.png) shows a historical 100-point attempt that still fails because of a critical safety error. To reproduce the same rule through the interface, use a **new** attempt:

1. Return through **课程学习** (“Course learning”). Again choose **03 排水后没有补水**, then **开始独立测评**.
2. Before collecting evidence, open **模拟处理**. In **操作组件** (“Operation component”), choose **进水组件**. Click **拆卸进水组件** (“Remove inlet assembly”).
3. The action must be rejected: **拆卸被阻止** (“Removal blocked”) appears, the inlet stays installed, and a persistent critical-safety-error notice is shown. This is an intentional test of the simulation, not a recommended repair sequence.
4. Return to **观察与诊断** (“Observation and diagnosis”), then follow steps 2–7 in the table. The supply case still needs no replacement.
5. The numerical score can reach **100**, but the report must show **未合格** (“Not passed”), explain the retained safety error, and provide no completion-certificate button. Restoring the view or refreshing before completion does not erase that error.

The supplied E2E test also exercises this 100-point failure using the drain-seal scenario. Its implementation is in [flows.spec.ts](../../e2e/flows.spec.ts).

## Explore the 3D view

| Chinese control | English meaning | What to inspect |
|---|---|---|
| **打开箱盖** / **放回箱盖** | Open / replace lid | A model operation changes the lid state. Opening the lid exposes the interior. |
| **整体视角** | Overview | Resets the camera. |
| **俯视内部** | Top view | Moves the camera above the tank. Open the lid to see inside. |
| **聚焦选中部件** | Focus selected part | Frames the selected component; merely selecting a part does not move the camera. |
| **结构剖视** | Cutaway | Hides/shows the front wall. |
| **爆炸视图** | Exploded view | Visually separates parts without removing them in the simulation. |
| **部件标签** | Part labels | Toggles labels anchored to the 3D components. |
| **放大工作区** / **退出放大** | Expand / exit workspace | Enlarges the same Canvas; Esc exits. Progress is retained. |
| **操作日志** | Operation log | Expands the recorded actions and errors. |

Drag to orbit and use the wheel to zoom on desktop. The view controls do not award points, repair components, or clear safety errors. If **二维交互模式** (“2D interaction mode”) appears, WebGL is unavailable: rule interactions remain accessible, but this does not demonstrate the 3D renderer.

## What the report and certificate mean

The report separates evidence, diagnosis, process, and verification scores from the final pass decision. A passing independent assessment offers **生成示范完成证明** (“Generate demonstration completion record”). The printable record is local, editable, and explicitly not a professional qualification, practical-skills assessment, or permission to perform work. Exploration and guided practice do not issue this certificate.

For the architecture, trade-offs, and dated validation evidence, read the [technical case study](TECHNICAL_CASE_STUDY.md). For contribution and tool-use disclosure, read [provenance](PROVENANCE.md).
