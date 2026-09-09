export type Stage = 'T0' | 'T1' | 'T2' | 'T3'
export type Timepoint = 'initial' | 'auto' | 'final'
export type TextType =
  | 'initial'
  | 'auto'
  | 'auto_interpretation'
  | 'refined'
  | 'user_revised'
  | 'final'

export const SYSTEM_TEXT_TYPES: TextType[] = ['auto', 'auto_interpretation']
export const USER_TEXT_TYPES: TextType[] = ['initial', 'refined', 'user_revised', 'final']
export type PrecisionDim = 'object' | 'spatial' | 'relation' | 'camera' | 'emotion' | 'constraint'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type StimulusGroup = 'environment' | 'character_space' | 'camera' | 'composition'
export type ExperienceLevel = 'none' | 'some' | 'frequent'
export type AssignmentPattern = 'A' | 'B' | 'C'
export type ExperimentalGroup = 'scaffold' | 'control'
export type TaskBlock = 'baseline' | 'early' | 'middle' | 'transfer'

export const PRECISION_DIMS: PrecisionDim[] = [
  'object',
  'spatial',
  'relation',
  'camera',
  'emotion',
  'constraint',
]

export const STAGES: Stage[] = ['T0', 'T1', 'T2', 'T3']
export const MAX_ROUNDS = 3

export const TASK_SEQUENCE_VERSION = 'formal-between-v2'
export const PARTICIPANT_INSTRUCTION_VERSION = 'formal-aligned-v1'

export type SessionStatus = 'in_progress' | 'completed' | 'abandoned' | 'resumed'
export type CompletionStatus = 'complete' | 'incomplete'

export const STAGE_SEQUENCE: Record<ExperimentalGroup, Stage[]> = {
  scaffold: ['T0', 'T1', 'T1', 'T2', 'T2', 'T3', 'T3'],
  control: ['T0', 'T1', 'T1', 'T1', 'T1', 'T3', 'T3'],
}

export const BLOCK_SEQUENCE: Record<ExperimentalGroup, TaskBlock[]> = {
  scaffold: ['baseline', 'early', 'early', 'middle', 'middle', 'transfer', 'transfer'],
  control: ['baseline', 'early', 'early', 'middle', 'middle', 'transfer', 'transfer'],
}

export const SKETCH_ACTION_TYPES = [
  'move',
  'move_object',
  'add',
  'delete',
  'rotate',
  'resize',
  'change_direction',
  'change_gaze',
  'change_layer',
  'change_distance',
  'camera_move',
  'camera_rotate',
] as const

export type SketchActionType = (typeof SKETCH_ACTION_TYPES)[number]

export type SnapshotKind =
  | 'initial'
  | 'before'
  | 'after'
  | 'generation'
  | 'pre_auto_prompt'
  | 'post_user_revision'

export type TextSource = 'user' | 'system'
export type ApiInput = 'image+text'

export type ParticipantStep =
  | 'setup'
  | 'intro'
  | 'describe'
  | 'sketch_edit'
  | 'generating'
  | 'review'
  | 'self_report'
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
  group: StimulusGroup
  difficulty: Difficulty
  primary_target: PrecisionDim[]
  secondary_target: PrecisionDim[]
  target_dimensions: PrecisionDim[]
  image_path: string
  title: string
  source_id: string
  current_visual_state?: string
  target_modification?: Partial<Record<PrecisionDim, string>>
  target_modification_specification?: Partial<Record<PrecisionDim, string>>
  ground_truth: {
    nodes: GroundTruthNode[]
    relations: GroundTruthRelation[]
  }
}

export type TaskDef = ImageDef

export interface ExpertDef {
  expert_id: string
  slug: string
  name: string
  label: string
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
  prompts: {
    introduction: string
    observe: string
    refine: string
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
  distance: number
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

export interface SketchEdit {
  action: string
  action_type: string
  target: string
  target_id: string
  from?: unknown
  to?: unknown
  timestamp: number
  before_state: unknown
  after_state: unknown
}

export interface SketchAction {
  sketch_event_id: string
  participant_id: string
  session_id: string
  task_id: string
  round: number
  associated_generation_round: number
  timestamp: string
  action_type: string
  target_id: string
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

export interface SketchSnapshot {
  snapshot_id: string
  participant_id: string
  session_id: string
  task_id: string
  stage: Stage
  round: number
  kind: SnapshotKind
  timestamp: string
  scene: SketchScene
  svg: string
}

export interface GeneratedImageMeta {
  engine: string
  prompt: string
  timestamp: string
  jimeng_task_id: string
  status: 'done' | 'failed' | 'placeholder'
  error: string
  width?: number
  height?: number
}

export interface TimelineEvent {
  event_id: string
  participant_id: string
  session_id: string
  task_id: string
  stage: Stage | ''
  round: number | null
  event_type: string
  timestamp: string
  relative_time_ms: number
  payload: Record<string, unknown>
}

export interface TextVersion {
  text_version_id: string
  participant_id: string
  session_id: string
  task_id: string
  stage: Stage
  round: number
  timestamp: string
  text: string
  text_type: TextType
  previous_text_version_id: string
  source: TextSource
  text_length: number
}

export interface GenerationRecord {
  generation_id: string
  participant_id: string
  session_id: string
  task_id: string
  stage: Stage
  round: number
  timestamp_start: string
  timestamp_end: string
  latency_ms: number
  model: string
  model_version: string
  input_image_id: string
  previous_generation_id: string | null
  generation_input_chain_valid: boolean
  input_text: string
  input_text_version_id: string
  input_sketch_snapshot_id: string
  source_sketch_snapshot_id: string
  auto_prompt_id: string
  user_prompt_version_id: string
  sketch_sent: boolean
  api_input: ApiInput
  api_payload: Record<string, unknown>
  output_image_id: string
  success: boolean
  error: string
  meta: GeneratedImageMeta
}

export interface TaskRound {
  round: number
  text_version_id: string
  generation_id: string
  sketch_snapshot_before_id: string
  sketch_snapshot_after_id: string
  started_at: string
  ended_at: string
}

export interface AutoPromptRecord {
  auto_prompt_id: string
  participant_id: string
  session_id: string
  task_id: string
  round: number
  timestamp_generated: string
  source_sketch_snapshot_id: string
  auto_prompt: string
  auto_prompt_length: number
  user_prompt_before: string
  user_prompt_after: string
  user_prompt_version_id: string
  edit_distance: number | null
  text_similarity: number | null
  copy_ratio: number | null
  copied_segments: string[]
}

export interface ValidationIssue {
  code: string
  task_id?: string
  message: string
}

export interface StudyValidationFlags {
  sequence_correct: boolean
  group_assignment_correct: boolean
  stimulus_target_alignment: boolean
  generation_input_chain_correct: boolean
  t0_valid: boolean
  t1_valid: boolean
  t2_scaffold_loop_valid: boolean
  auto_prompt_cycle_valid: boolean
  sketch_api_separation_valid: boolean
  t3_scaffold_removed: boolean
  session_recovery_valid: boolean
  timing_complete: boolean
  required_exports_present: boolean
}

export interface ValidationResult {
  ok: boolean
  export_ready: boolean
  completion_status: CompletionStatus
  flags: StudyValidationFlags
  issues: ValidationIssue[]
  validation_issues: ValidationIssue[]
}

export interface TaskRun {
  participant_id: string
  session_id: string
  task_id: string
  image_id: string
  category: StimulusGroup
  difficulty: Difficulty
  primary_target: PrecisionDim[] | null
  secondary_target: PrecisionDim[] | null
  target_modification_specification: Partial<Record<PrecisionDim, string>> | null
  participant_instruction_version: string
  participant_instruction: { zh: string; en: string }
  stage: Stage
  block: TaskBlock
  experimental_group: ExperimentalGroup
  ai_enabled: boolean
  sketch_enabled: boolean
  auto_prompt_enabled: boolean
  round: number
  rounds: TaskRound[]
  initial_text_version_id: string
  final_text_version_id: string
  initial_text: string
  final_text: string
  satisfied_round: number | null
  started_at: string
  ended_at: string
  self_alignment_rating: number | null
  self_alignment_timestamp: string
  result_alignment_rating: number | null
  result_alignment_timestamp: string
  generation_count: number
  generation_success_count: number
  total_task_time_ms: number | null
  text_edit_time_ms: number | null
  generation_wait_time_ms: number | null
  result_view_time_ms: number | null
  sketch_edit_time_ms: number | null
  auto_prompt_view_time_ms: number | null
  total_sketch_actions: number
  copy_ratio: number | null
  sketch_actions: SketchAction[]
}

export type Trial = TaskRun

export interface SubjectiveRatings {
  perceived_control: number | null
  perceived_usefulness: number | null
  cognitive_effort: number | null
  confidence: number | null
}

export interface SessionRuntime {
  step: ParticipantStep
  task_index: number
  round: number
  draft_text: string
  auto_prompt: string
  auto_prompt_id: string
  user_prompt_started: boolean
  auto_prompt_view_started: boolean
  auto_prompt_view_id: string
  copied_from_auto: string[]
  working_scene: SketchScene | null
  baseline_scene: SketchScene | null
  generate_error: string
  selected_node_id: string | null
  last_output_image_id: string
  text_started: boolean
  sketch_editing: boolean
  result_viewing: boolean
}

export interface Session {
  participant_id: string
  session_id: string
  assignment_pattern: AssignmentPattern
  experimental_group: ExperimentalGroup
  condition_order: Stage[]
  task_sequence_version: string
  short_session: boolean
  session_status: SessionStatus
  completion_status: CompletionStatus
  last_completed_task_id: string | null
  current_task_id: string | null
  current_stage: Stage | null
  current_round: number
  current_generation_id: string | null
  current_text_version_id: string | null
  current_sketch_snapshot_id: string | null
  demographics: Demographics
  tasks: TaskRun[]
  event_log: TimelineEvent[]
  text_versions: TextVersion[]
  generations: GenerationRecord[]
  sketch_snapshots: SketchSnapshot[]
  auto_prompts: AutoPromptRecord[]
  subjective: SubjectiveRatings | null
  started_at: string
  completed_at: string | null
  export_ready: boolean
  validation: ValidationResult | null
  runtime: SessionRuntime
  seq: number
}

export interface PlannedTask {
  task_id: string
  image_id: string
  stage: Stage
  block: TaskBlock
}

export type PlannedTrial = PlannedTask

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
  stage: Stage
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
  stage: Stage
  timepoint: Timepoint
  coder_id: string
  precision: PrecisionScores
  precision_total: number | null
  precision_norm: number | null
  naturalness: number | null
  copying: number | null
  coded_at: string
}

export interface BehavioralMeasures {
  total_session_time: number | null
  task_time: number | null
  text_writing_time: number | null
  text_active_edit_time: number | null
  generation_wait_time: number | null
  sketch_edit_time: number | null
  auto_prompt_view_time: number | null
  auto_prompt_view_time_ms: number | null
  prompt_refinement_time: number | null
  result_view_time: number | null
  time_between_rounds: number | null
  number_of_rounds: number
  text_revision_count: number
  sketch_revision_count: number
  total_sketch_actions: number
  move_count: number
  rotate_count: number
  camera_action_count: number
  object_action_count: number
  relation_action_count: number
  add_count: number
  delete_count: number
  generation_count: number
  generation_success_count: number
  generation_failure_count: number
  average_generation_latency: number | null
  round_of_satisfaction: number | null
  time_to_satisfaction: number | null
  copy_ratio: number | null
}

export interface StoreShape {
  sessions: Session[]
  ratings: ExpertRating[]
  codings: IntentCoding[]
}

export type AppRoute = 'home' | 'participant' | 'expert' | 'coding' | 'export'

/** @deprecated protocol used condition labels; stage is the condition now */
export type Condition = Stage
export type GroupId = AssignmentPattern
export type DifficultyLegacy = Difficulty
export type TaskType = StimulusGroup
