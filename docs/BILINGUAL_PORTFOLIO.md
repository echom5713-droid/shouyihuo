# Bilingual portfolio edition — 5 October 2026

The October edition makes the existing Shouyihuo prototype directly reviewable in English while retaining Chinese access. It is intended to support a technical project discussion alongside postgraduate applications. The public documentation describes the artefact and its evidence; it does not imply university affiliation, endorsement, admission success or unaided authorship.

## Presentation contract

- A visitor without a saved preference sees **English** in the working application and the `/review/` introduction.
- A visible **English / 中文** control changes the displayed language. This is local interface localisation, without a translation service, remote model or API key.
- Interface labels, course explanations, feedback, reports, safety notices, 3D labels and print content should follow the selected language. The nickname is user content and is not translated.
- The selected language persists under **`shouyihuo.locale.v1`**. Learning data continues to use **`shouyihuo.local.v1`**, with **`schemaVersion: 1`**.
- A language change must not create an attempt, submit a diagnosis, award evidence, remove a safety error, archive a duplicate record or reset the 3D business state.

The implementation uses [a React locale context](../src/i18n/index.tsx), bundled application/workbench dictionaries and a domain-text translation adapter. Original Chinese text serves as a stable lookup source for existing records; dynamic messages are translated when presented. The context updates document language/title and saves the preference separately. If preference storage is unavailable, the interface can still switch for the current session.

This is a presentation change to the existing application, not a framework migration, dependency upgrade, new simulation engine or new course. Original Chinese learning records remain valid. Internal case IDs, part IDs, events and scoring semantics are independent of the displayed language. Existing historical text in records is handled at presentation time; localising the interface must not rewrite the assessment history.

## Portfolio package

The root README, technical case study, reviewer guide and three-page project brief are English-first. Chinese setup instructions remain in `README.zh-CN.md`. The interactive review page introduces the actual implementation and links to the working simulation; it is not a replacement for the WebGL application.

The supplied technical discussion focuses on typed state transitions, guarded operations, deterministic scoring, procedural 3D, state/render separation, local persistence and reproducible checks. It also states the project limits: normalised teaching water levels, no professional repair review, no learner study, no physically validated model and no formal qualification. Substantial Codex assistance is disclosed in [PROVENANCE.md](portfolio/PROVENANCE.md). Programme-specific application notes remain outside the public source package.

## Acceptance checklist

The bilingual run must verify the following using the actual application, not only a translation catalogue or static screenshots:

| Area | Required observation |
|---|---|
| Default | A clean browser profile starts the application and review page in English. |
| Switching | English → 中文 → English updates visible controls, dynamic feedback and 3D labels; refreshing retains the choice. |
| Existing records | Original v1 attempts and completed records load without migration or deletion. |
| Active assessment | Evidence, the first submitted diagnosis, safety errors and attempt ID survive a language change. |
| Completion | A real observe → diagnose → act → retest → report flow completes and archives once. |
| Safety | An illegal operation remains rejected and logged, with readable explanations in each language; a 100-point safety failure remains failed. |
| Assessment integrity | No pre-diagnosis targeted answer hints appear in either language. |
| Layout | Inspect 1440×900, 1366×768, 1280×800 and a 390 px narrow screen; English wrapping must not hide primary actions. |
| Assets | Course, fonts, model, translations and interactions make no external runtime requests. |
| Print | The demonstration-record limitation remains legible in the selected language. |

**Status:** type checking, **47 unit tests**, **18 E2E tests** and the build passed on 5 October 2026. New English screenshots were opened and inspected. The separately executed production smoke check passed for both languages, the reviewer page/PDF and real WebGL, with zero external requests or uncaught page errors. Historical 26 September and pre-localisation 5 October results are retained separately. See [VALIDATION.md](portfolio/VALIDATION.md) for the execution record and verification boundaries.

## What has deliberately not changed

The [file-level integrity comparison](validation-bilingual-2026-10-05/core-integrity.json) confirms that the domain engine, course, domain types, attempt storage, stage derivation, dependency declarations/lockfile and original rule tests match the pre-localisation baseline. This is a scoped comparison; application UI and localisation files have changed.

The three cases and three modes remain. Independent assessment preserves its first-diagnosis rule. Evidence, diagnosis, process and retest retain the **25 / 30 / 25 / 20** weighting, with the original additional pass gates. Camera, cutaway, exploded view, workspace expansion and locale controls remain presentation operations. A numeric score of 100 cannot override a critical safety error.

The teaching disclaimer remains applicable in both languages: **“教学原型，内容未经维修专业人士审核，仅适用于内置简化模型”** — a teaching prototype whose content has not been reviewed by a repair professional and applies only to the built-in simplified model.

## 中文摘要

本次更新以英文项目审阅为主：应用和介绍页默认英文，同时保留 **English / 中文** 切换。语言偏好单独保存，不更换 `shouyihuo.local.v1`，不升级学习数据 `schemaVersion: 1`，不重置旧记录、不重新计分。

本次材料用于展示真实工程、设计取舍、测试证据和局限，不声称获得大学认可或提升录取概率。英文 README、技术案例、审阅指南、项目摘要与中英文可运行界面共同构成支持材料。中文运行说明仍可直接使用。验收结果必须来自修改后的实际运行，历史结果与旧截图保持日期标识。
