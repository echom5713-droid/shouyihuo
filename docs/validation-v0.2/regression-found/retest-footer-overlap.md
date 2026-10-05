# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flows.spec.ts >> 真实 WebGL、模型点击、完整密封案例、持久化、证明与本地请求
- Location: e2e/flows.spec.ts:50:1

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: '运行复测', exact: true })
    - locator resolved to <button class="button primary full-width">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <span>进度自动保存 · 水位与水流为教学近似</span> from <footer class="lab-footer">…</footer> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <span>进度自动保存 · 水位与水流为教学近似</span> from <footer class="lab-footer">…</footer> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    88 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <span>进度自动保存 · 水位与水流为教学近似</span> from <footer class="lab-footer">…</footer> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - banner [ref=e3]:
    - link "手艺活维修实训" [ref=e4] [cursor=pointer]:
      - /url: "#/"
    - navigation "主导航" [ref=e9]:
      - link "课程学习" [ref=e10] [cursor=pointer]:
        - /url: "#/"
      - generic [ref=e11]: 实训工作台
      - link "学习记录" [ref=e12] [cursor=pointer]:
        - /url: "#/history"
    - generic [ref=e13]:
      - text: 本地运行
      - generic [ref=e15]: /
      - text: v0.2
  - main [ref=e16]:
    - generic [ref=e17]:
      - generic [ref=e18]:
        - link "返回课程" [ref=e19] [cursor=pointer]:
          - /url: "#/"
        - generic [ref=e22]:
          - generic [ref=e23]:
            - generic [ref=e24]: 独立测评
            - generic [ref=e25]: / 情境 01
          - heading "持续有水流声" [level=1] [ref=e26]
      - generic [ref=e27]:
        - button "重新开始" [ref=e28] [cursor=pointer]
        - button "结束并查看报告" [ref=e29] [cursor=pointer]
    - generic [ref=e32]:
      - list "当前实训阶段" [ref=e33]:
        - listitem [ref=e34]: 观察
        - listitem [ref=e38]: 诊断
        - listitem [ref=e42]: 处理
        - listitem [ref=e46]:
          - generic [ref=e47]: "04"
          - text: 复测
      - generic [ref=e48]:
        - strong [ref=e49]: 复测
        - generic [ref=e50]: 处理与装配已就绪。运行复测，验证水位稳定以及排水后的自动补水。
    - generic [ref=e51]:
      - complementary [ref=e52]:
        - generic [ref=e53]:
          - text: 本次任务
          - paragraph [ref=e54]: 水箱补水后仍有持续水流。请观察水位与水流位置，找到原因并验证处理结果。
        - generic [ref=e55]:
          - generic [ref=e56]:
            - heading "部件目录" [level=2] [ref=e57]
            - generic [ref=e58]: "09"
          - generic [ref=e59]:
            - button "01 水箱外壳" [ref=e60] [cursor=pointer]:
              - generic [ref=e61]: "01"
              - generic [ref=e62]: 水箱外壳
            - button "02 水箱盖" [ref=e63] [cursor=pointer]:
              - generic [ref=e64]: "02"
              - generic [ref=e65]: 水箱盖
            - button "03 供水阀" [ref=e66] [cursor=pointer]:
              - generic [ref=e67]: "03"
              - generic [ref=e68]: 供水阀
            - button "04 进水管" [ref=e69] [cursor=pointer]:
              - generic [ref=e70]: "04"
              - generic [ref=e71]: 进水管
            - button "05 进水组件" [ref=e72] [cursor=pointer]:
              - generic [ref=e73]: "05"
              - generic [ref=e74]: 进水组件
            - button "06 浮球与连杆" [ref=e75] [cursor=pointer]:
              - generic [ref=e76]: "06"
              - generic [ref=e77]: 浮球与连杆
            - button "07 排水组件与密封件" [pressed] [ref=e78] [cursor=pointer]:
              - generic [ref=e79]: "07"
              - generic [ref=e80]: 排水组件与密封件
            - button "08 溢流管" [ref=e83] [cursor=pointer]:
              - generic [ref=e84]: "08"
              - generic [ref=e85]: 溢流管
            - button "09 水体与水位" [ref=e86] [cursor=pointer]:
              - generic [ref=e87]: "09"
              - generic [ref=e88]: 水体与水位
        - generic [ref=e89]:
          - generic [ref=e90]:
            - heading "已收集证据" [level=2] [ref=e91]
            - generic [ref=e92]: "3"
          - list [ref=e93]:
            - listitem [ref=e94]:
              - generic [ref=e97]:
                - strong [ref=e98]: 水位与变化
                - paragraph [ref=e99]: 当前低于正常工作水位；可见持续补水。
            - listitem [ref=e100]:
              - generic [ref=e103]:
                - strong [ref=e104]: 供水状态
                - paragraph [ref=e105]: 供水阀处于打开状态。
            - listitem [ref=e106]:
              - generic [ref=e109]:
                - strong [ref=e110]: 排水口状态
                - paragraph [ref=e111]: 翻板处于关闭位置，但排水口仍可见持续水流。
      - region "三维操作区" [ref=e112]:
        - generic [ref=e113]:
          - generic [ref=e114]:
            - button "整体视角" [ref=e115] [cursor=pointer]
            - button "俯视内部" [ref=e119] [cursor=pointer]
            - button "聚焦选中部件" [ref=e123] [cursor=pointer]
            - button "放大工作区" [ref=e127] [cursor=pointer]
          - generic [ref=e131]:
            - button "结构剖视" [pressed] [ref=e132] [cursor=pointer]
            - button "爆炸视图" [ref=e136] [cursor=pointer]
            - button "部件标签" [ref=e140] [cursor=pointer]
        - generic [ref=e144]:
          - generic:
            - generic: 3D 实训
            - generic: 前壁已隐藏 · 可观察内部
          - generic "可旋转、缩放和点击部件的三维水箱" [ref=e148]
          - generic:
            - generic: 拖动旋转 · 滚轮缩放
            - button "放回箱盖" [ref=e149] [cursor=pointer]
        - generic [ref=e152]:
          - generic [ref=e153]:
            - generic [ref=e154]: 供水状态
            - strong [ref=e157]: 供水打开
          - generic [ref=e158]:
            - generic [ref=e159]: 教学近似水位
            - strong [ref=e160]: 正常工作水位附近
          - generic [ref=e161]:
            - generic [ref=e162]: 水流观察
            - strong [ref=e163]: 无持续水流
        - group [ref=e164]:
          - generic "操作日志 14 条" [ref=e165] [cursor=pointer]:
            - text: 操作日志
            - generic [ref=e168]: 14 条
      - complementary [ref=e171]:
        - tablist "操作面板" [ref=e172]:
          - tab "观察与诊断" [ref=e173] [cursor=pointer]
          - tab "模拟处理" [selected] [ref=e174] [cursor=pointer]
        - tabpanel "模拟处理" [ref=e175]:
          - generic [ref=e176]:
            - generic [ref=e177]:
              - generic [ref=e178]: "07"
              - generic [ref=e179]:
                - text: 当前选中部件
                - heading "排水组件与密封件" [level=2] [ref=e180]
            - paragraph [ref=e181]: 翻板关闭时封住排水口，打开时释放箱内水。这里将翻板与密封件简化为一个可拆装组件。
            - button "记录部件观察" [ref=e182] [cursor=pointer]
          - generic [ref=e185]:
            - button "查看水位" [ref=e186] [cursor=pointer]
            - button "检查供水" [ref=e187] [cursor=pointer]
          - generic [ref=e188]:
            - heading "供水与排水" [level=3] [ref=e189]
            - generic [ref=e190]:
              - button "关闭供水" [active] [ref=e191] [cursor=pointer]
              - button "模拟排水" [ref=e192] [cursor=pointer]
            - generic [ref=e193]:
              - generic [ref=e194]: 供水未隔离
              - generic [ref=e195]: 箱盖已打开
          - generic [ref=e196]:
            - heading "组件处理" [level=3] [ref=e197]
            - generic [ref=e198]: 操作目标与当前选中部件同步
            - combobox "操作组件" [ref=e199] [cursor=pointer]:
              - option "选择可拆装组件" [disabled]
              - option "排水组件与密封件" [selected]
              - option "进水组件"
            - generic [ref=e200]: 已装配 · 已模拟更换
            - button "拆卸排水组件" [ref=e203] [cursor=pointer]
            - paragraph [ref=e204]: 未满足：关闭供水阀、关闭供水后检查确认、模拟排水并等待排空。尝试拆卸会被阻止并记入安全错误。
            - generic [ref=e205]:
              - button "模拟更换" [disabled] [ref=e206]
              - button "重新装配" [disabled] [ref=e207]
            - paragraph [ref=e208]: 更换与装配操作需先拆下组件。
          - status [ref=e209]:
            - paragraph [ref=e212]: 供水已恢复，观察水位变化；还需要运行复测。
        - generic [ref=e213]:
          - generic [ref=e214]: 拆卸前：关水 → 检查确认 → 排空 → 开盖。观察与检查无需先关水。
          - generic [ref=e218]:
            - generic [ref=e219]: 工作状态验证
            - strong [ref=e220]: 待复测
          - button "运行复测" [ref=e221] [cursor=pointer]
          - paragraph [ref=e224]: 尚未复测
    - generic [ref=e225]:
      - generic [ref=e226]: 教学原型，内容未经维修专业人士审核，仅适用于内置简化模型
      - generic [ref=e229]: 进度自动保存 · 水位与水流为教学近似
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | import { mkdir, writeFile } from 'node:fs/promises';
  3   | import { readFileSync } from 'node:fs';
  4   | import { scoreAttempt } from '../src/domain/engine';
  5   | import type { Attempt } from '../src/domain/types';
  6   | import type { LocalStore } from '../src/storage/local';
  7   | 
  8   | const oldStore = JSON.parse(readFileSync(new URL('./fixtures/v0.1-store.json', import.meta.url), 'utf8')) as LocalStore;
  9   | const shots = 'docs/screenshots/v0.2';
  10  | async function screenshot(page: Page, name: string, fullPage = true) { await mkdir(shots, { recursive: true }); await page.screenshot({ path: `${shots}/${name}.png`, fullPage }); }
  11  | async function collect(page: Page, part: 'drain' | 'inlet' = 'drain') {
  12  |   await page.getByRole('button', { name: '查看水位', exact: true }).click();
  13  |   await page.getByRole('button', { name: '检查供水', exact: true }).click();
  14  |   await page.getByTestId(`part-${part}`).click();
  15  |   await page.getByRole('button', { name: '记录部件观察', exact: true }).click();
  16  | }
  17  | async function diagnose(page: Page, id: string) {
  18  |   await page.getByLabel('选择诊断', { exact: true }).selectOption(id);
  19  |   await page.getByRole('button', { name: '提交诊断', exact: true }).click();
  20  |   await page.getByRole('tab', { name: '模拟处理', exact: true }).click();
  21  | }
  22  | async function completeComponent(page: Page, id: 'seal' | 'inlet' = 'seal') {
  23  |   const part = id === 'seal' ? 'drain' : 'inlet';
  24  |   await collect(page, part);
  25  |   if (id === 'inlet') {
  26  |     await page.getByTestId('part-overflow').click();
  27  |     await page.getByRole('button', { name: '记录部件观察', exact: true }).click();
  28  |   }
  29  |   await diagnose(page, id);
  30  |   await page.getByLabel('操作组件', { exact: true }).selectOption(part);
  31  |   await page.getByRole('button', { name: '关闭供水', exact: true }).click();
  32  |   await page.getByRole('button', { name: '检查供水', exact: true }).click();
  33  |   await page.getByRole('button', { name: '模拟排水', exact: true }).click();
  34  |   await expect(page.getByTestId('water-reading')).toHaveText('已排空');
  35  |   await page.locator('.stage-bottom').getByRole('button', { name: '打开箱盖' }).click();
  36  |   await page.getByRole('button', { name: part === 'drain' ? '拆卸排水组件' : '拆卸进水组件', exact: true }).click();
  37  |   await expect(page.getByTestId('tank-model')).toHaveAttribute(`data-${part}-installed`, 'false');
  38  |   await page.getByRole('button', { name: '模拟更换', exact: true }).click();
  39  |   await page.getByRole('button', { name: '重新装配', exact: true }).click();
  40  |   await page.getByRole('button', { name: '恢复供水', exact: true }).click();
> 41  |   await page.getByRole('button', { name: '运行复测', exact: true }).click();
      |                                                                 ^ Error: locator.click: Test timeout of 60000ms exceeded.
  42  |   await expect(page.getByTestId('retest-message')).toContainText('复测通过', { timeout: 20000 });
  43  | }
  44  | async function finish(page: Page) {
  45  |   await page.getByRole('button', { name: '结束并查看报告', exact: true }).click();
  46  |   await page.getByRole('dialog').getByRole('button', { name: '结束并查看报告', exact: true }).click();
  47  |   await expect(page.getByTestId('total-score')).toBeVisible();
  48  | }
  49  | 
  50  | test('真实 WebGL、模型点击、完整密封案例、持久化、证明与本地请求', async ({ page }) => {
  51  |   const external: string[] = [], errors: string[] = [];
  52  |   page.on('request', r => { if (/^https?:/.test(r.url()) && new URL(r.url()).hostname !== '127.0.0.1') external.push(r.url()); });
  53  |   page.on('pageerror', e => errors.push(e.message));
  54  |   await page.goto('/');
  55  |   await expect(page.getByTestId('tank-model')).toHaveAttribute('data-renderer', 'webgl');
  56  |   await expect(page.locator('canvas')).toBeVisible();
  57  |   // A rendered scene must have painted before screenshots and raycast interaction.
  58  |   await expect(page.getByTestId('anchor-inlet')).toHaveAttribute('data-x', /\d/);
  59  |   await screenshot(page, '01-course-1440');
  60  |   await page.setViewportSize({ width: 1280, height: 800 });
  61  |   await screenshot(page, '01b-course-1280');
  62  |   await page.setViewportSize({ width: 1366, height: 768 });
  63  |   await screenshot(page, '01c-course-1366');
  64  |   await page.setViewportSize({ width: 1440, height: 900 });
  65  |   await page.getByRole('button', { name: '开始独立测评', exact: true }).click();
  66  |   await expect(page.getByTestId('tank-model')).toHaveAttribute('data-renderer', 'webgl');
  67  |   await expect(page.locator('.learning-hint')).toHaveCount(0);
  68  |   await expect(page.locator('.diagnosis-answer')).toHaveCount(0);
  69  |   await expect(page.locator('.lab-titlebar h1')).toHaveText('持续有水流声');
  70  |   await page.locator('.stage-bottom').getByRole('button', { name: '打开箱盖' }).click();
  71  |   // Use the model's projected mesh anchor, then click the canvas itself (not the label).
  72  |   await page.getByTestId('part-tank').click();
  73  |   const canvas = page.locator('canvas');
  74  |   await expect(page.getByTestId('anchor-inlet')).toHaveAttribute('data-x', /\d/);
  75  |   const x = Number(await page.getByTestId('anchor-inlet').getAttribute('data-x'));
  76  |   const y = Number(await page.getByTestId('anchor-inlet').getAttribute('data-y'));
  77  |   await canvas.click({ position: { x, y } });
  78  |   await expect(page.getByTestId('part-detail')).toHaveAttribute('data-selection-source', 'model');
  79  |   await expect(page.getByTestId('part-detail').getByRole('heading')).toHaveText('进水组件');
  80  |   await expect(page.getByTestId('part-inlet')).toHaveAttribute('aria-pressed', 'true');
  81  |   await expect(page.getByTestId('tank-model')).toHaveAttribute('data-selected', 'inlet');
  82  |   await page.getByRole('tab', { name: '模拟处理', exact: true }).click();
  83  |   await expect(page.getByLabel('操作组件', { exact: true })).toHaveValue('inlet');
  84  |   await page.getByLabel('操作组件', { exact: true }).selectOption('drain');
  85  |   await expect(page.getByTestId('tank-model')).toHaveAttribute('data-selected', 'drain');
  86  |   await expect(page.getByTestId('part-drain')).toHaveAttribute('aria-pressed', 'true');
  87  |   await expect(page.getByTestId('part-detail').getByRole('heading')).toHaveText('排水组件与密封件');
  88  |   await page.getByRole('tab', { name: '观察与诊断', exact: true }).click();
  89  |   await page.getByTestId('part-inlet').click();
  90  |   // Put the lid back so the complete path must deliberately open it after isolation.
  91  |   await page.locator('.stage-bottom').getByRole('button', { name: '放回箱盖' }).click();
  92  |   await screenshot(page, '02-workbench-1440');
  93  |   await page.setViewportSize({ width: 1280, height: 800 });
  94  |   await expect(page.getByRole('button', { name: '查看水位', exact: true })).toBeInViewport();
  95  |   await expect(page.getByRole('button', { name: '运行复测', exact: true })).not.toHaveClass(/primary/);
  96  |   await expect(page.getByRole('button', { name: '结束并查看报告', exact: true })).toBeInViewport();
  97  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  98  |   await screenshot(page, '03-workbench-1280', false);
  99  |   await completeComponent(page);
  100 |   await finish(page);
  101 |   await expect(page.getByTestId('total-score')).toHaveText('100');
  102 |   await expect(page.getByText('本原型测评合格', { exact: true })).toBeVisible();
  103 |   await screenshot(page, '04-report-1280');
  104 |   await page.setViewportSize({ width: 1440, height: 900 });
  105 |   await screenshot(page, '05-report-1440');
  106 |   await page.setViewportSize({ width: 1366, height: 768 });
  107 |   await screenshot(page, '05b-report-1366');
  108 |   await page.setViewportSize({ width: 1440, height: 900 });
  109 |   await page.getByRole('button', { name: '生成示范完成证明' }).click();
  110 |   await expect(page.locator('.certificate')).toContainText('不属于职业资格');
  111 |   await page.getByLabel('证明昵称（可选）').pressSequentially('本地体验者');
  112 |   await expect(page.locator('.certificate-name')).toHaveText('本地体验者');
  113 |   await page.emulateMedia({ media: 'print' });
  114 |   await expect(page.locator('.certificate')).toBeVisible();
  115 |   await screenshot(page, '06-certificate-print');
  116 |   await page.emulateMedia({ media: 'screen' });
  117 |   await page.getByRole('button', { name: '关闭弹窗' }).click();
  118 |   await page.reload();
  119 |   await expect(page.getByTestId('total-score')).toHaveText('100');
  120 |   await page.getByRole('link', { name: '全部学习记录', exact: true }).click();
  121 |   await expect(page.getByTestId('history-row')).toHaveCount(1);
  122 |   await page.reload();
  123 |   await expect(page.getByTestId('history-row')).toHaveCount(1);
  124 |   await screenshot(page, '07-history-1440');
  125 |   await page.setViewportSize({ width: 1366, height: 768 });
  126 |   await screenshot(page, '07b-history-1366');
  127 |   expect(external, '本地页面不得请求外部课程、字体、模型或接口').toEqual([]);
  128 |   expect(errors).toEqual([]);
  129 | });
  130 | 
  131 | test('非法拆卸被阻止，刷新与复位不能消除关键错误，报告保留原因', async ({ page }) => {
  132 |   await page.goto('/');
  133 |   await page.getByRole('button', { name: '开始独立测评', exact: true }).click();
  134 |   await page.getByRole('tab', { name: '模拟处理', exact: true }).click();
  135 |   await page.getByLabel('操作组件', { exact: true }).selectOption('drain');
  136 |   await page.getByRole('button', { name: '拆卸排水组件', exact: true }).click();
  137 |   await expect(page.getByRole('status')).toContainText('拆卸被阻止');
  138 |   await expect(page.getByTestId('tank-model')).toHaveAttribute('data-drain-installed', 'true');
  139 |   await page.getByRole('button', { name: '整体视角', exact: true }).click();
  140 |   await page.reload();
  141 |   await expect(page.getByText('1 项安全错误', { exact: false })).toBeVisible();
```