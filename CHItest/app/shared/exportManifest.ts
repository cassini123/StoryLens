export const REQUIRED_EXPORT_FILES = [
  'participants.csv',
  'tasks.csv',
  'event_log.csv',
  'text_versions.csv',
  'generations.csv',
  'sketch_interactions.csv',
  'sketch_snapshots.json',
  'auto_prompts.csv',
  'expert_ratings.csv',
  'full_session_timeline.json',
  'validation.json',
  'session_recovery.json',
] as const

export type RequiredExportFile = (typeof REQUIRED_EXPORT_FILES)[number]
