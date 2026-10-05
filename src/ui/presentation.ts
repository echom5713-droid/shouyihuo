import { CASES } from '../domain/course';
import { isRetesting, scoreAttempt } from '../domain/engine';
import type { Attempt } from '../domain/types';

export interface StagePresentation {
  index: 0 | 1 | 2 | 3;
  label: string;
  description: string;
  /** The working cycle is verified. This is not the assessment's pass result. */
  complete: boolean;
}

/** Read-only presentation of the engine state; no extra progress or score is stored. */
export function getStage(a: Attempt): StagePresentation {
  if (a.mode === 'explore') return {
    index: 0, label: '自由观察', complete: false,
    description: '选择部件了解作用，观察正常进水与排水的联动。结构认知不计分。'
  };

  if (isRetesting(a)) return {
    index: 3, label: '复测', complete: false,
    description: a.retest.message
  };

  // Only applicable evidence counts, matching the reducer's diagnosis gate.
  // Do not name missing case-specific evidence: that would disclose a clue in assessment.
  const observed = CASES[a.caseId].evidence.filter(id => a.evidence[id]).length;
  if (a.diagnosis === null) return observed < 2 ? {
    index: 0, label: '观察', complete: false,
    description: '先观察水位、供水与部件表现，记录至少 2 项适用证据后再提交诊断。'
  } : {
    index: 1, label: '诊断', complete: false,
    description: '已具备提交条件。结合已记录的观察选择诊断，也可以继续收集证据。'
  };

  if (a.mode === 'guided' && a.diagnosis !== a.caseId) return {
    index: 1, label: '诊断', complete: false,
    description: '本次诊断不正确。结合已提交答案的解释重新观察后重试，首次错误会保留。'
  };

  const corrected = a.process.repaired && !a.defects.seal && !a.defects.inlet;
  const assembled = a.assembly.inlet.installed && a.assembly.drain.installed;
  if (!corrected || !assembled || !a.supplyOpen || a.retest.phase === 'failed') return {
    index: 2, label: '处理', complete: false,
    description: a.retest.phase === 'failed'
      ? `复测未通过。${a.retest.message}请检查处理结果，再运行完整复测。`
      : a.mode === 'assessment' && a.diagnosis !== a.caseId
        ? '首次诊断已锁定。可以依据提交后的解释继续处理，首次诊断成绩不会改变。'
        : corrected
          ? '处理已生效。请完成组件装配并恢复供水，再验证完整工作循环。'
          : '根据诊断处理原因。涉及拆卸时，先满足下方全部安全条件。'
  };

  const complete = a.retest.phase === 'passed' && Object.values(a.retest.checks).every(Boolean);
  return {
    index: 3, label: '复测', complete,
    description: complete
      ? '完整工作循环已通过复测。查看报告了解成绩、首次诊断和安全记录。'
      : '处理与装配已就绪。运行复测，验证水位稳定以及排水后的自动补水。'
  };
}

/** Prioritized review advice, derived from the existing score and safety rules. */
export function reviewSuggestions(a: Attempt): string[] {
  if (a.mode === 'explore') return ['继续观察部件联动，演示正常进水与排水；结构认知不生成测评成绩。'];

  const score = scoreAttempt(a);
  const suggestions: string[] = [];
  if (a.safetyErrors.length) {
    const supplyError = a.safetyErrors.some(error => error.code === 'supply-before-assembly');
    suggestions.push(supplyError
      ? '优先复习恢复供水的安全条件：两个组件必须完整装配。关键安全错误会保留，请在新的尝试中完成安全流程。'
      : '优先复习拆卸前的安全条件：开盖、隔离供水、检查确认并排空。下次拆卸前需再次确认这些条件；关键安全错误会保留，请在新的尝试中完成安全流程。');
  }

  // This helper is safe to show before diagnosis too: no missing component names,
  // correct diagnosis, or case-specific repair checklist is revealed at that point.
  if (a.diagnosis === null && a.status !== 'completed') {
    suggestions.push('先记录水位、供水和部件表现，再依据证据提交诊断；不要仅凭症状猜测原因。');
    return suggestions;
  }

  const [evidence, diagnosis, process, verification] = score.sections;
  if (diagnosis.earned < diagnosis.possible) {
    suggestions.push(a.diagnosis === null
      ? '先收集观察证据并提交诊断，再进行处理。结束前未提交诊断会使诊断项缺失。'
      : a.firstDiagnosis !== a.caseId
        ? '优先回看首次诊断与观察证据的对应关系。独立测评锁定首次答案，引导训练重试也会保留首次错误。'
        : '复习已提交诊断的解释，再用模型中的水位和水流表现核对判断。');
  }
  if (evidence.earned < evidence.possible) {
    suggestions.push('补全报告中未记录的观察项。先建立证据，再诊断；重复检查同一项不会补足其他证据。');
  }
  if (process.earned < process.possible) {
    const missing = process.items.filter(item => item.earned < item.possible).map(item => item.label);
    suggestions.push(`复习处理流程中未完成的项目：${missing.join('、')}。按本情境的适用流程操作，处理后确认组件完整装配。`);
  }
  if (verification.earned < verification.possible || a.retest.phase !== 'passed') {
    suggestions.push('处理后完整装配并恢复供水，运行复测并等待结束；需要同时验证水位稳定和排水补水循环。');
  }
  return suggestions.length
    ? suggestions.slice(0, 3)
    : ['保持“观察、诊断、安全处理、完整复测”的顺序；在新的情境中继续用证据验证判断。'];
}
