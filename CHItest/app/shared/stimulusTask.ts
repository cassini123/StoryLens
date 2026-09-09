import { COPY } from './i18n'
import { PARTICIPANT_INSTRUCTION_VERSION } from './types'
import type { Difficulty, ImageDef, PrecisionDim, Stage, StimulusGroup } from './types'

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
      zh: COPY.zh.observeAdjust,
      en: COPY.en.observeAdjust,
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
      zh: stage === 'T0' ? COPY.zh.observeT0 : COPY.zh.observeAdjust,
      en: stage === 'T0' ? COPY.en.observeT0 : COPY.en.observeAdjust,
    },
  }
}

export function researcherSpecHiddenFromParticipants(instruction: string): boolean {
  return !instruction.includes('请只针对下面指定') && !instruction.includes('Specified visual change')
}

export function specCoversPrimaryTargets(
  spec: Partial<Record<PrecisionDim, string>> | null,
  primary: PrecisionDim[] | null,
): boolean {
  if (!spec || !primary) return false
  return primary.every((dim) => Boolean(spec[dim]))
}
