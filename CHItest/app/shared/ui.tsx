import { experiment } from './config'
import type { CSSProperties, ReactNode } from 'react'

export function Shell({
  title,
  subtitle,
  meta,
  children,
}: {
  title: string
  subtitle?: string
  meta?: string
  children: ReactNode
}) {
  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <div className="brand">{experiment.study.title}</div>
          <div className="sub">{title}</div>
        </div>
        <div className="meta">
          {subtitle ? <div>{subtitle}</div> : null}
          {meta ? <div>{meta}</div> : null}
        </div>
      </header>
      {children}
    </div>
  )
}

export function Button({
  children,
  onClick,
  disabled,
  type = 'button',
  fill = false,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
  fill?: boolean
}) {
  return (
    <button className={fill ? 'btn btn-fill' : 'btn'} type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function Likert({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint?: string
  value: number | null
  onChange: (value: number) => void
}) {
  return (
    <div className="likert">
      <div className="likert-label">
        <strong>{label}</strong>
        {hint ? <p>{hint}</p> : null}
      </div>
      <div className="likert-scale" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <button
            key={n}
            type="button"
            className={value === n ? 'tick on' : 'tick'}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

export function YesNo({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean | null
  onChange: (value: boolean) => void
}) {
  return (
    <div className="likert">
      <div className="likert-label">
        <strong>{label}</strong>
      </div>
      <div className="likert-scale">
        <button type="button" className={value === true ? 'tick on' : 'tick'} onClick={() => onChange(true)}>
          Yes
        </button>
        <button type="button" className={value === false ? 'tick on' : 'tick'} onClick={() => onChange(false)}>
          No
        </button>
      </div>
    </div>
  )
}

export function FooterBar({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <footer className="footerbar" style={style}>
      {children}
    </footer>
  )
}
