import { describe, expect, it } from 'vitest'
import { getImage } from './config'
import { ensureT2ProtocolSnapshots } from './logging'
import { emptyRuntime } from './sessionInit'
import { templateForImage } from './sketch/templates'
import { makeSession, makeTask } from './testSession'

describe('T2 protocol snapshots', () => {
  it('ensures initial, pre-auto-prompt, and post-user-revision snapshots', () => {
    const session = makeSession({
      tasks: [makeTask({ stage: 'T2', task_id: 't2a', block: 'middle' })],
      runtime: {
        ...emptyRuntime(),
        task_index: 0,
        working_scene: templateForImage(getImage('C01')),
      },
    })
    ensureT2ProtocolSnapshots(session)
    const kinds = session.sketch_snapshots.filter((item) => item.task_id === 't2a').map((item) => item.kind)
    expect(kinds).toEqual(expect.arrayContaining(['initial', 'pre_auto_prompt', 'post_user_revision']))
    expect(session.sketch_snapshots.every((item) => item.scene.camera && item.scene.subjects)).toBe(true)
  })
})
