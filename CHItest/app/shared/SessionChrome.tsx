import { useEffect, useRef, useState, type ReactNode } from 'react'
import { experiment } from './config'
import { downloadParticipantPacket } from './export'
import { logEvent } from './logging'
import { sessionProgress } from './progress'
import { upsertSession } from './store'
import type { Session } from './types'

export function SessionChrome({
  session,
  title,
  extra,
  onSessionChange,
  children,
}: {
  session: Session | null
  title?: string
  extra?: string
  onSessionChange?: (session: Session) => void
  children: ReactNode
}) {
  const progress = sessionProgress(session)
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  function persistWithLog(eventType: string): Session | null {
    if (!session) return null
    const next = structuredClone(session)
    logEvent(next, eventType)
    upsertSession(next)
    onSessionChange?.(next)
    return next
  }

  function save() {
    setMenuOpen(false)
    const next = persistWithLog('manual_save')
    setToast(next ? '已保存到本机' : '还没有可保存的进度')
  }

  function refresh() {
    setMenuOpen(false)
    persistWithLog('manual_refresh')
    window.location.reload()
  }

  function exit() {
    setMenuOpen(false)
    persistWithLog('manual_exit')
    window.location.hash = '#/'
  }

  async function exportSession() {
    setMenuOpen(false)
    const next = persistWithLog('manual_export')
    if (!next) {
      setToast('还没有可导出的数据')
      return
    }
    await downloadParticipantPacket(next)
    setToast('已导出到下载文件夹')
  }

  return (
    <div className="shell">
      <header className="topbar session-topbar">
        <div className="topbar-row">
          <div>
            <div className="brand">{experiment.study.title}</div>
            {title ? <div className="sub">{title}</div> : null}
            {extra ? <div className="meta">{extra}</div> : null}
          </div>
          <div className="settings-wrap" ref={menuRef}>
            <button className="btn settings-btn" type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
              设置
            </button>
            {menuOpen ? (
              <div className="settings-menu" role="menu">
                <button type="button" role="menuitem" onClick={save}>
                  保存
                </button>
                <button type="button" role="menuitem" onClick={refresh}>
                  刷新
                </button>
                <button type="button" role="menuitem" onClick={exit}>
                  退出
                </button>
                <button type="button" role="menuitem" onClick={() => void exportSession()}>
                  导出
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="progress-row">
          <div
            className="stage-bar"
            role="progressbar"
            aria-label="实验进度"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent}
            aria-valuetext={`${progress.label} ${progress.percent}%`}
          >
            {progress.stages.map((stage) => (
              <div key={stage.stage} className={stage.current ? 'stage-seg current' : 'stage-seg'} style={{ flex: stage.total }}>
                <div className="stage-seg-label">{stage.stage}</div>
                <div className="stage-slots" aria-hidden="true">
                  {stage.slots.map((slot, index) => (
                    <span key={`${stage.stage}-${index}`} className={`slot ${slot}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="progress-pct">{progress.percent}%</div>
        </div>
      </header>
      {children}
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}
