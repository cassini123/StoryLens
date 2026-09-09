import { describe, expect, it } from 'vitest'
import { getImage } from './config'
import { addSketchSnapshot, closeAutoPromptView, interpretSketch } from './logging'
import { emptyRuntime } from './sessionInit'
import { sceneToSvg } from './sketch/render'
import { templateForImage } from './sketch/templates'
import { makeSession, makeTask } from './testSession'

describe('T2 interpret cycle', () => {
  it('creates one snapshot and one Auto Prompt only on Interpret Sketch', () => {
    const scene = templateForImage(getImage('C01'))
    const session = makeSession({
      tasks: [makeTask({ stage: 'T2', task_id: 't2a', block: 'middle', image_id: 'C01' })],
      runtime: {
        ...emptyRuntime(),
        task_index: 0,
        round: 1,
        working_scene: scene,
      },
    })
    addSketchSnapshot(session, scene, sceneToSvg(scene), 'initial')
    interpretSketch(session, '摄影机向后侧移动。')
    closeAutoPromptView(session)
    addSketchSnapshot(session, scene, sceneToSvg(scene), 'post_user_revision')
    const kinds = session.sketch_snapshots.filter((item) => item.task_id === 't2a').map((item) => item.kind)
    expect(kinds).toEqual(expect.arrayContaining(['initial', 'pre_auto_prompt', 'post_user_revision']))
    expect(session.auto_prompts).toHaveLength(1)
    expect(session.event_log.filter((item) => item.event_type === 'interpret_sketch_click')).toHaveLength(1)
    expect(session.text_versions.some((item) => item.text_type === 'auto_interpretation')).toBe(true)
    expect(session.runtime.draft_text).toBe('')
  })
})
