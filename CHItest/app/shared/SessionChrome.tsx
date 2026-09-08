import { useEffect, useRef, useState, type ReactNode } from 'react'
import { downloadParticipantPacket } from './export'
import { LangSwitch, useI18n } from './i18n'
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
  const { t } = useI18n()
  const progress = sessionProgress(session)
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const progressLabel =
    progress.label === '介绍'
      ? t.progressIntro
      : progress.label === '问卷'
        ? t.progressSurvey
        : progress.label === '完成'
          ? t.progressDone
          : progress.label === '未开始'
            ? t.progressNotStarted
            : progress.label

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3200)
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
    setToast(next ? t.saved : t.nothingToSave)
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
      setToast(t.nothingToExport)
      return
    }
    try {
      await downloadParticipantPacket(next)
      setToast(t.exported)
    } catch {
      setToast(t.exportBlocked)
    }
  }

  return (
    <div className="shell">
      <header className="topbar session-topbar">
        <div className="topbar-row">
          <div className="topbar-leading">
            <LangSwitch />
            <div>
              <div className="brand">{t.studyBrand}</div>
              {title ? <div className="sub">{title}</div> : null}
              {extra ? <div className="meta">{extra}</div> : null}
            </div>
          </div>
          <div className="settings-wrap" ref={menuRef}>
            <button className="btn settings-btn" type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
              {t.settings}
            </button>
            {menuOpen ? (
              <div className="settings-menu" role="menu">
                <button type="button" role="menuitem" onClick={save}>
                  {t.save}
                </button>
                <button type="button" role="menuitem" onClick={refresh}>
                  {t.refresh}
                </button>
                <button type="button" role="menuitem" onClick={exit}>
                  {t.exit}
                </button>
                <button type="button" role="menuitem" onClick={() => void exportSession()}>
                  {t.export}
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="progress-row">
          <div
            className="stage-bar"
            role="progressbar"
            aria-label={t.progressAria}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent}
            aria-valuetext={`${progressLabel} ${progress.percent}%`}
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
