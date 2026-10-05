import type { CaseId, ComponentId, EvidenceId, Mode, PartId } from './types';

export const COURSE_TITLE = '普通非电动马桶水箱：结构认知与基础故障诊断';
export const DISCLAIMER = '教学原型，内容未经维修专业人士审核，仅适用于内置简化模型';
export const CERTIFICATE_NOTICE = '本地演示记录，仅反映本系统内的模拟测评；未经实操评估，不属于职业资格、职业技能等级或上岗许可。';
export const MODES: Record<Mode, string> = { explore: '结构认知', guided: '引导训练', assessment: '独立测评' };
export const LEVEL = { normal: 0.64, overflow: 0.88, empty: 0.025 };
export const PARTS: { id: PartId; name: string; short: string; description: string; number: string }[] = [
  { id: 'tank', name: '水箱外壳', short: '外壳', number: '01', description: '在本模型中储存冲洗用水。壳体由底板与四壁组成；剖视会隐藏前壁，便于观察空腔。' },
  { id: 'lid', name: '水箱盖', short: '箱盖', number: '02', description: '覆盖水箱顶部。观察模式可以抬起箱盖；模拟拆卸内部组件之前也需要打开箱盖。' },
  { id: 'supply', name: '供水阀', short: '供水阀', number: '03', description: '控制进入模型的水源。关闭后需要检查确认，且水箱不会自动排空。' },
  { id: 'pipe', name: '进水管', short: '进水管', number: '04', description: '把供水阀与进水组件连接起来。本模型不模拟管路压力与管件差异。' },
  { id: 'inlet', name: '进水组件', short: '进水组件', number: '05', description: '与浮球联动控制补水。正常情况下，在模型设定的工作水位停止进水。' },
  { id: 'float', name: '浮球与连杆', short: '浮球', number: '06', description: '随水位升降，通过连杆向进水组件传递水位变化。本模型不模拟调节尺寸与实际阀门结构。' },
  { id: 'drain', name: '排水组件与密封件', short: '排水密封', number: '07', description: '翻板关闭时封住排水口，打开时释放箱内水。这里将翻板与密封件简化为一个可拆装组件。' },
  { id: 'overflow', name: '溢流管', short: '溢流管', number: '08', description: '高于管口的水可流入此管，流向排水口。溢流是观察线索，不等同于已找出根因。' },
  { id: 'water', name: '水体与水位', short: '水位', number: '09', description: '蓝色水体反映模拟水量；水流光点只表达流向。水位为教学近似，没有工程计量含义。' }
];
export const CASES: Record<CaseId, {
  id: CaseId; index: string; symptom: string; task: string; diagnosis: string;
  explanation: string; evidence: EvidenceId[]; component: ComponentId | null;
}> = {
  seal: {
    id: 'seal', index: '01', symptom: '持续有水流声',
    task: '水箱补水后仍有持续水流。请观察水位与水流位置，找到原因并验证处理结果。',
    diagnosis: '排水密封失效',
    explanation: '本情境中，水从关闭的排水口持续流失，水位保持在正常停止位置之下；进水组件因此反复补水。根因是排水密封失效。',
    evidence: ['water', 'supply', 'drain'], component: 'drain'
  },
  inlet: {
    id: 'inlet', index: '02', symptom: '水位持续升高',
    task: '水箱水位持续升高，仍能观察到进水。请确认水流路径，诊断原因并完成复测。',
    diagnosis: '进水控制失效',
    explanation: '本情境中，水位已到达溢流位置，进水仍不停止，水经溢流管流出。根因是进水组件未能随水位关闭。',
    evidence: ['water', 'supply', 'inlet', 'overflow'], component: 'inlet'
  },
  supply: {
    id: 'supply', index: '03', symptom: '排水后没有补水',
    task: '排水后水箱保持低水位，未观察到补水。请先检查供水情况，再决定处理方式。',
    diagnosis: '供水阀关闭',
    explanation: '本情境的组件没有损坏，供水阀处于关闭状态。检查并恢复供水，再验证补水与排水循环即可；无需更换零件。',
    evidence: ['water', 'supply', 'inlet'], component: null
  }
};
export const EVIDENCE_LABELS: Record<EvidenceId, string> = { water: '水位与变化', supply: '供水状态', drain: '排水口状态', inlet: '进水状态', overflow: '溢流路径' };
export const VERIFY_LABELS = { assembly: '组件完整装配', supply: '供水恢复', stable: '补水停止且水位稳定', cycle: '排水后可再次正常补水' };
