import { COPY, type Locale } from './i18n'
import { PARTICIPANT_INSTRUCTION_VERSION } from './types'
import type { Difficulty, ImageDef, PrecisionDim, Stage, StimulusGroup } from './types'

const DIM_LABEL: Record<Locale, Record<PrecisionDim, string>> = {
  zh: {
    object: '物体',
    spatial: '空间',
    relation: '人物关系',
    camera: '镜头',
    emotion: '情绪',
    constraint: '约束',
  },
  en: {
    object: 'object',
    spatial: 'space',
    relation: 'relation',
    camera: 'camera',
    emotion: 'emotion',
    constraint: 'constraint',
  },
}

export function formatTargetInstruction(
  spec: Partial<Record<PrecisionDim, string>> | null | undefined,
  locale: Locale,
): string {
  if (!spec) return ''
  const lines = (Object.entries(spec) as [PrecisionDim, string][])
    .filter(([, text]) => Boolean(text))
    .map(([dim, text]) => `${DIM_LABEL[locale][dim]}: ${text}`)
  const header =
    locale === 'zh'
      ? '请只针对下面指定的视觉修改来调整画面，不要改写人物身份、物体种类或故事内容。'
      : 'Adjust only the specified visual change below. Do not rewrite character identity, object category, or story content.'
  return [header, ...lines].join('\n')
}

export type TaskStimulusSnapshot = {
  category: StimulusGroup
  difficulty: Difficulty
  primary_target: PrecisionDim[] | null
  secondary_target: PrecisionDim[] | null
  target_modification_specification: Partial<Record<PrecisionDim, string>> | null
  participant_instruction_version: string
  participant_instruction: { zh: string; en: string }
}

export function snapshotTaskStimulus(image: ImageDef, stage: Stage): TaskStimulusSnapshot {
  if (stage === 'T0') {
    return {
      category: image.group,
      difficulty: image.difficulty,
      primary_target: null,
      secondary_target: null,
      target_modification_specification: null,
      participant_instruction_version: PARTICIPANT_INSTRUCTION_VERSION,
      participant_instruction: {
        zh: COPY.zh.observeT0,
        en: COPY.en.observeT0,
      },
    }
  }
  const spec = image.target_modification_specification ?? image.target_modification ?? null
  return {
    category: image.group,
    difficulty: image.difficulty,
    primary_target: [...image.primary_target],
    secondary_target: [...image.secondary_target],
    target_modification_specification: spec ? { ...spec } : null,
    participant_instruction_version: PARTICIPANT_INSTRUCTION_VERSION,
    participant_instruction: {
      zh: formatTargetInstruction(spec, 'zh'),
      en: formatTargetInstruction(spec, 'en'),
    },
  }
}

export function fallbackStimulus(stage: Stage): TaskStimulusSnapshot {
  return {
    category: 'environment',
    difficulty: 'easy',
    primary_target: stage === 'T0' ? null : [],
    secondary_target: stage === 'T0' ? null : [],
    target_modification_specification: null,
    participant_instruction_version: PARTICIPANT_INSTRUCTION_VERSION,
    participant_instruction: {
      zh: stage === 'T0' ? COPY.zh.observeT0 : '',
      en: stage === 'T0' ? COPY.en.observeT0 : '',
    },
  }
}

export function instructionMatchesSpec(
  instruction: string,
  spec: Partial<Record<PrecisionDim, string>> | null,
): boolean {
  if (!spec) return !instruction.includes('spatial:') && instruction.length > 0
  return Object.values(spec).every((text) => !text || instruction.includes(text))
}
