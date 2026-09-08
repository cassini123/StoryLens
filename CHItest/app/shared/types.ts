export type Condition = 'baseline' | 'direct' | 'sketch' | 'transfer'
export type Phase = 'T1' | 'T2' | 'T3'
export type Timepoint = 'T1' | 'T2' | 'T3'
export type PrecisionDim = 'object' | 'spatial' | 'relation' | 'camera' | 'emotion' | 'constraint'
export type Difficulty = 'L1' | 'L2' | 'L3'
export type TaskType =
  | 'character_relation'
  | 'spatial_position'
  | 'camera_subject'
  | 'gaze_attention'
  | 'movement'
  | 'foreground_background'
  | 'occlusion'
  | 'environment'
  | 'multi_relation'

export const PRECISION_DIMS: PrecisionDim[] = [
  'object',
  'spatial',
  'relation',
  'camera',
  'emotion',
  'constraint',
]

export type GroupId = 'direct_first' | 'sketch_first'

export type ExperienceLevel = 'none' | 'some' | 'frequent'

export type ParticipantStep =
  | 'setup'
  | 'intro'
  | 'show_image'
  | 'initial_intent'
  | 'generating'
  | 'view_feedback'
  | 'refined_intent'
  | 'questionnaire'
  | 'complete'

export interface GroundTruthNode {
  id: string
  label: string
  kind: 'person' | 'object' | 'camera' | 'environment'
}

export interface GroundTruthRelation {
  from: string
  relation: string
  to: string
}

export interface ImageDef {
  image_id: string
  title: string
  file: string
  difficulty: Difficulty
  task_type: TaskType
  target_dimensions: PrecisionDim[]
  brief: string
  ground_truth: {
    nodes: GroundTruthNode[]
    relations: GroundTruthRelation[]
  }
}

export interface TaskDef {
  id: string
  image_id: string
  pair: string
  title: string
  setting: string
  core: string[]
  brief: string
  file: string
  difficulty: Difficulty
  task_type: TaskType
  required_dimensions: PrecisionDim[]
  target_dimensions: PrecisionDim[]
  ground_truth: ImageDef['ground_truth']
}

export interface ExpertDef {
  expert_id: string
  slug: string
  name: string
  label: string
}

export interface GroupDef {
  condition_order: 'direct_first' | 'sketch_first'
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
    t1: string
    direct_refine: string
    sketch_refine: string
    transfer: string
    generating: string
    view_image: string
  }
}

export interface Demographics {
  cinematography_experience: ExperienceLevel | ''
  cinematography_years: string
  visual_experience: ExperienceLevel | ''
  ai_familiarity: ExperienceLevel | ''
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
  timestamp: number
  action: string
  action_type: string
  target: string
  target_id: string
  from?: unknown
  to?: unknown
  before_state: unknown
  after_state: unknown
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

export interface GeneratedImageMeta {
  engine: string
  prompt: string
  timestamp: string
  jimeng_task_id: string
  status: 'done' | 'failed' | 'placeholder'
  error: string
}

export interface TrialTimestamps {
  task_start?: string
  t1_start?: string
  t1_submit?: string
  intent_start?: string
  intent_submit?: string
  generate_start?: string
  generate_done?: string
  sketch_generated?: string
  sketch_first_interaction?: string
  sketch_confirm?: string
  t2_start?: string
  t2_submit?: string
  refinement_start?: string
  refinement_submit?: string
  t3_start?: string
  t3_submit?: string
  trial_end?: string
}

export interface AuthoredIntent {
  modification_count: number
  rejection: boolean
}

export interface SemanticConfirm {
  timestamp: string
  node_id: string
  relation: string
}

export interface Trial {
  participant_id: string
  trial_id: string
  task_id: string
  image_id: string
  phase: Phase
  condition: Condition
  t1_intent: string
  t2_intent: string
  t3_intent: string
  initial_intent: string
  initial_intent_timestamp: string
  refined_intent: string
  refined_intent_timestamp: string
  generated_image: GeneratedImageMeta | null
  initial_sketch: SketchRecord | null
  sketch_actions: SketchAction[]
  final_sketch: SketchRecord | null
  semantic_confirms: SemanticConfirm[]
  final_intent: string
  authored: AuthoredIntent
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
  generate_error: string
  selected_node_id: string | null
}

export interface Session {
  participant_id: string
  group_id: GroupId
  condition_order: string
  demographics: Demographics
  trials: Trial[]
  subjective: SubjectiveRatings | null
  started_at: string
  completed_at: string | null
  runtime: SessionRuntime
}

export interface PlannedTrial {
  task_id: string
  image_id: string
  phase: Phase
  condition: Condition
}

export interface RubricScores {
  intent_precision: number | null
  intent_interpretability: number | null
  spatial_specificity: number | null
  executability: number | null
}

export interface ExpertRating {
  trial_id: string
  participant_id: string
  task_id: string
  expert_id: string
  initial: RubricScores
  final: RubricScores
  naturalness: number | null
  comment: string
  submitted_at: string
}

export interface PrecisionScores {
  object: number | null
  spatial: number | null
  relation: number | null
  camera: number | null
  emotion: number | null
  constraint: number | null
}

export interface IntentCoding {
  participant_id: string
  trial_id: string
  task_id: string
  condition: Condition
  timepoint: Timepoint
  coder_id: string
  precision: PrecisionScores
  precision_total: number | null
  naturalness: number | null
  copying: number | null
  discovery_rate: number | null
  learning_gain: number | null
  transfer_gain: number | null
  coded_at: string
}

export interface StoreShape {
  sessions: Session[]
  ratings: ExpertRating[]
  codings: IntentCoding[]
}

export type AppRoute = 'home' | 'participant' | 'expert' | 'coding' | 'export'
