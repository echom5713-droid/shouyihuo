# Five-minute reviewer guide

Shouyihuo Local MVP v0.2 starts in English and offers an **English / 中文** switch. This guide supplies the actual English controls, with Chinese labels alongside them. Allow approximately five minutes after installation; the supplied sequence intentionally reveals one scenario's answer so a reviewer can inspect the complete interaction.

This is an unaudited teaching model, not instructions for working on a real toilet. All operations below occur inside the application.

## Start the application

From the project folder containing `package.json`:

```sh
npm ci
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173) on the same computer. If port 5173 is occupied, stop the previous copy of this app before restarting; the server does not silently choose another port. Windows PowerShell users can use `npm.cmd ci` and `npm.cmd run dev`. Stop the server with Ctrl+C; later runs need only `npm run dev` unless dependencies have changed.

Use **English / 中文** in the navigation to inspect either interface. Switching preserves the current attempt and its scoring state; refreshing retains the language preference. The introduction at `/review/` also provides the language switch and a link to the working application.

If a browser-storage warning appears, read it before resetting anything. Existing attempts are stored locally and reset deletes this project's learning records. A separate browser profile can provide a clean review session without deleting existing progress.

## Complete a scenario without replacing a part

The supply case demonstrates observation, diagnosis, a justified minimal intervention, retesting, and persistence.

| Step | English controls (Chinese equivalent) | Expected behaviour |
|---|---|---|
| 1 | On the course page, choose **03 No refill after draining** (排水后没有补水), then **Independent assessment** (开始独立测评) | The workbench shows a low water level and a closed supply. The heading states the symptom, not the answer. |
| 2 | Click **Check water level** (查看水位) and **Check supply** (检查供水) in the right panel | Two observations appear in **Collected evidence** (已收集证据). Observation does not require first closing the supply. |
| 3 | Select **Inlet assembly** (进水组件) in the left part list, then **Record observation** (记录部件观察) | The model highlight, part description, and operation target agree. This records the third applicable observation. Selecting a part alone does not award evidence points. |
| 4 | Under **Choose a diagnosis** (选择诊断), choose **Supply valve closed** (供水阀关闭); click **Submit diagnosis** (提交诊断) | The first answer is locked in independent assessment. An explanation now appears. |
| 5 | Open the **Simulated repair** (模拟处理) tab; click **Restore supply** (恢复供水) | The valve and water-state display change, and the 3D water level rises. Do not remove or replace a component: this case does not require it. |
| 6 | Click **Run retest** (运行复测) and wait for **Retest passed** (复测通过) | The application verifies filling, stable water level, draining, and refilling. The model visibly follows these state changes. |
| 7 | Click **Finish & view report** (结束并查看报告), then the same button in the confirmation dialog | With the observations and first diagnosis above, the report should show **100** and **Prototype assessment passed** (本原型测评合格). |
| 8 | Click **All learning records** (全部学习记录), then refresh the page | One record remains for this attempt. Refreshing does not duplicate it. |

If the right-hand panel is shorter than its contents, scroll within it. On narrow layouts, **Tasks & components** (学习目标与部件列表) opens the collapsed left panel. Returning to the course page preserves unfinished progress; selecting a new attempt may request confirmation if another attempt is active in that mode.

## Inspect a safety failure without bypassing the rules

The [English safety-report screenshot](../screenshots/bilingual-2026-10-05/48-safety-report-en.png) shows a 100-point attempt that still fails because of a critical safety error. To reproduce the same rule through the interface, use a **new** attempt:

1. Return through **Course** (课程学习). Again choose **03 No refill after draining**, then **Independent assessment**.
2. Before collecting evidence, open **Simulated repair**. Under **Action target** (操作组件), choose **Inlet assembly**. Click **Remove inlet assembly** (拆卸进水组件).
3. The action must be rejected: **Removal blocked** (拆卸被阻止) appears, the inlet stays installed, and a persistent critical-safety-error notice is shown. This is an intentional test of the simulation, not a recommended repair sequence.
4. Return to **Observe & diagnose** (观察与诊断), then follow steps 2–7 in the table. The supply case still needs no replacement.
5. The numerical score can reach **100**, but the report must show **Not passed** (未合格), explain the retained safety error, and provide no completion-record button. Restoring the view, changing language or refreshing before completion does not erase that error.

The legacy E2E test also exercises this 100-point failure using the drain-seal scenario. Its implementation is in [flows.spec.ts](../../e2e/flows.spec.ts).

## Explore the 3D view

| English control | Chinese equivalent | What to inspect |
|---|---|---|
| **Open lid** / **Replace lid** | 打开箱盖 / 放回箱盖 | A model operation changes the lid state. Opening the lid exposes the interior. |
| **Overview** | 整体视角 | Resets the camera. |
| **Top view** | 俯视内部 | Moves the camera above the tank. Open the lid to see inside. |
| **Focus selection** | 聚焦选中部件 | Frames the selected component; merely selecting a part does not move the camera. |
| **Cutaway** | 结构剖视 | Hides/shows the front wall. |
| **Exploded view** | 爆炸视图 | Visually separates parts without removing them in the simulation. |
| **Labels** | 部件标签 | Toggles labels anchored to the 3D components. |
| **Expand workspace** / **Exit expanded view** | 放大工作区 / 退出放大 | Enlarges the same Canvas; Esc exits. Progress is retained. |
| **Action log** | 操作日志 | Expands the recorded actions and errors. |

Drag to orbit and use the wheel to zoom on desktop. The view controls do not award points, repair components, or clear safety errors. If **2D interaction mode** (二维交互模式) appears, WebGL is unavailable: rule interactions remain accessible, but this does not demonstrate the 3D renderer.

## What the report and completion record mean

The report separates evidence, diagnosis, process, and verification scores from the final pass decision. A passing independent assessment offers **Create completion record** (生成示范完成证明). **Print / Save as PDF** (打印 / 另存为 PDF) invokes browser printing. The printable record is local, editable, and explicitly not a professional qualification, practical-skills assessment, or permission to perform work. Exploration and guided practice do not issue this record.

For the architecture, trade-offs, and dated validation evidence, read the [technical case study](TECHNICAL_CASE_STUDY.md). For contribution and tool-use disclosure, read [provenance](PROVENANCE.md).
