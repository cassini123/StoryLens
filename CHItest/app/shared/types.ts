export type Condition = 'direct' | 'sketch' | 'transfer'

export type GroupId =
  | 'A_direct_first'
  | 'A_sketch_first'
  | 'B_direct_first'
  | 'B_sketch_first'

export type ExperienceLevel = 'none' | 'some' | 'frequent'

export type ParticipantStep =
  | 'setup'
  | 'intro'
  | 'trial_task'
  | 'trial_intent'
  | 'trial_sketch'
  | 'trial_refine'
  | 'transfer_task'
  | 'transfer_intent'
  | 'questionnaire'
  | 'complete'

export interface TaskDef {
  id: string
  pair: string
  title: string
  setting: string
  core: string[]
  brief: string
}

export interface ExpertDef {
  expert_id: string
  slug: string
  name: string
  label: string
}

export interface GroupDef {
  task_set: string
  condition_order: 'direct_first' | 'sketch_first'
  direct: string[]
  sketch: string[]
}

export interface ExperimentConfig {
  study: {
    id: string
    title: string
    subtitle: string
    year: number
  }
  sketch_mode: 'mock' | 'model'
  debug_short_session: boolean
  sketch_model: {
    name: string
    version: string
  }
  experts: ExpertDef[]
  groups: Record<GroupId, GroupDef>
  transfer_task_id: string
  prompts: {
    introduction: string
    direct_refine: string
    sketch_refine: string
    transfer: string
  }
}

export interface Demographics {
  design_background: boolean | null
  film_background: boolean | null
  film_years: string
  ai_experience: ExperienceLevel | ''
  image_gen_experience: ExperienceLevel | ''
}

export interface Point {
  x: number
  y: number
}

export interface CameraNode {
  id: 'camera'
  x: number
  y: number
  rotation: number
}

export interface SubjectNode {
  id: string
  x: number
  y: number
  rotation: number
  scale: number
  label: string
}

export interface ObjectNode {
  id: string
  kind: string
  x: number
  y: number
  w: number
  h: number
  label: string
}

export interface GazeNode {
  id: string
  from: string
  toId: string | null
  to: Point | null
}

export interface MovementNode {
  id: string
  from: string
  to: Point
}

export interface SketchScene {
  width: number
  height: number
  camera: CameraNode
  subjects: SubjectNode[]
  objects: ObjectNode[]
  gazes: GazeNode[]
  movements: MovementNode[]
}

export interface SketchAction {
  action: string
  target: string
  from?: unknown
  to?: unknown
  timestamp: number
}

export interface SketchRecord {
  model: string
  model_version: string
  generation_prompt: string | null
  generation_timestamp: string
  output: {
    scene: SketchScene
    svg: string
  }
}

export interface TrialTimestamps {
  task_start?: string
  intent_start?: string
  intent_submit?: string
  sketch_generated?: string
  sketch_first_interaction?: string
  sketch_confirm?: string
  refinement_start?: string
  refinement_submit?: string
  trial_end?: string
}

export interface Trial {
  participant_id: string
  trial_id: string
  task_id: string
  condition: Condition
  initial_intent: string
  initial_intent_timestamp: string
  initial_sketch: SketchRecord | null
  sketch_actions: SketchAction[]
  final_sketch: SketchRecord | null
  refined_intent: string
  final_intent: string
  timestamps: TrialTimestamps
}

export interface SubjectiveRatings {
  perceived_control: number | null
  perceived_usefulness: number | null
  cognitive_effort: number | null
  confidence: number | null
}

export interface SessionRuntime {
  step: ParticipantStep
  trial_index: number
  draft_initial: string
  draft_final: string
  working_scene: SketchScene | null
}

export interface Session {
  participant_id: string
  group_id: GroupId
  demographics: Demographics
  trials: Trial[]
  subjective: SubjectiveRatings | null
  started_at: string
  completed_at: string | null
  runtime: SessionRuntime
}

export interface PlannedTrial {
  task_id: string
  condition: 'direct' | 'sketch'
}

export interface RubricScores {
  intent_precision: number | null
  intent_interpretability: number | null
  spatial_specificity: number | null
  executability: number | null
}

export interface ExpertRating {
  trial_id: string
  expert_id: string
  initial: RubricScores
  final: RubricScores
  naturalness: number | null
  comment: string
  submitted_at: string
}

export interface StoreShape {
  sessions: Session[]
  ratings: ExpertRating[]
}

export type AppRoute = 'home' | 'participant' | 'expert' | 'export'
