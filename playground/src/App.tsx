import { useEffect, useRef, useState } from 'react'
import { init } from 'react-auto-tracking'
import type { TrackEvent } from 'react-auto-tracking'

// ─── Types ───────────────────────────────────────────────

interface LogEntry {
  readonly id: number
  readonly time: string
  readonly eventType: string
  readonly category: 'pointer' | 'form' | 'ambient'
  readonly targetTag: string
  readonly componentName: string | null
  readonly props: Record<string, unknown>
}

const POINTER_EVENTS = new Set(['click', 'touchstart', 'touchend'])
const FORM_EVENTS = new Set(['input', 'change', 'focus', 'blur', 'submit'])

function getCategory(eventType: string): LogEntry['category'] {
  if (POINTER_EVENTS.has(eventType)) return 'pointer'
  if (FORM_EVENTS.has(eventType)) return 'form'
  return 'ambient'
}

function toLogEntry(id: number, trackEvent: TrackEvent, eventType: string): LogEntry {
  return {
    id,
    time: new Date().toLocaleTimeString('en-GB', { hour12: false }),
    eventType,
    category: getCategory(eventType),
    targetTag: trackEvent.targetElement.tagName.toLowerCase(),
    componentName: trackEvent.fiber?.componentName ?? null,
    props: trackEvent.fiber?.props ? sanitizeProps(trackEvent.fiber.props) : {},
  }
}

function sanitizeProps(props: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || typeof value === 'function') continue
    result[key] = value
  }
  return result
}

// ─── Demo Sections ───────────────────────────────────────

function PointerSection() {
  return (
    <section style={sectionStyle}>
      <SectionHeader label="Pointer" category="pointer" />

      <div style={controlGrid}>
        <button
          style={btnStyle}
          data-track="primary-btn"
          data-tracking-payload={{ action: 'confirm', variant: 'primary' }}
          onClick={() => alert('Clicked!')}
        >
          Button
        </button>

        <a
          href="#link"
          data-track="nav-link"
          data-tracking-payload={{ to: '/home', section: 'nav' }}
          style={linkStyle}
        >
          Anchor link
        </a>

        <div
          role="button"
          tabIndex={0}
          data-track="role-button"
          data-tracking-payload={{ widget: 'toggle', group: 'settings' }}
          style={roleButtonStyle}
        >
          role=&quot;button&quot;
        </div>

        <div
          onClick={() => console.log('div click')}
          data-track="handler-div"
          data-tracking-payload={{ feature: 'card-expand', index: 0 }}
          style={handlerDivStyle}
        >
          div + onClick
        </div>
      </div>
    </section>
  )
}

function FormSection() {
  const [text, setText] = useState('')
  const [selected, setSelected] = useState('a')

  return (
    <section style={sectionStyle}>
      <SectionHeader label="Form" category="form" />

      <div style={fieldStack}>
        <fieldset style={fieldsetStyle}>
          <label style={labelStyle}>Text input</label>
          <input
            type="text"
            placeholder="Type something..."
            data-track="text-input"
            data-tracking-payload={{ field: 'username', form: 'signup' }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={inputStyle}
          />
        </fieldset>

        <fieldset style={fieldsetStyle}>
          <label style={labelStyle}>Select</label>
          <select
            data-track="my-select"
            data-tracking-payload={{ field: 'plan', options: ['a', 'b', 'c'] }}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            style={inputStyle}
          >
            <option value="a">Option A</option>
            <option value="b">Option B</option>
            <option value="c">Option C</option>
          </select>
        </fieldset>

        <fieldset style={fieldsetStyle}>
          <label style={labelStyle}>Textarea</label>
          <textarea
            data-track="my-textarea"
            data-tracking-payload={{ field: 'bio', maxLength: 500 }}
            rows={2}
            placeholder="Type here..."
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </fieldset>

        <fieldset style={fieldsetStyle}>
          <label style={labelStyle}>Disabled</label>
          <input
            type="text"
            data-track="disabled-input"
            disabled
            value="cannot type"
            style={{ ...inputStyle, opacity: 0.4, cursor: 'not-allowed' }}
          />
        </fieldset>
      </div>
    </section>
  )
}

function AmbientSection() {
  return (
    <section style={sectionStyle}>
      <SectionHeader label="Ambient" category="ambient" />

      <div data-track="scroll-box" data-tracking-payload={{ region: 'feed', page: 1 }} style={scrollBoxStyle}>
        <p style={{ color: 'var(--fg-muted)', fontSize: 13 }}>
          Scroll inside this box to trigger a scroll event.
        </p>
        <div style={{ height: 300 }} />
      </div>

      <div tabIndex={0} data-track="keydown-box" data-tracking-payload={{ context: 'shortcuts', scope: 'global' }} style={keydownBoxStyle}>
        <span style={{ color: 'var(--fg-muted)', fontSize: 13 }}>
          Focus here, then press any key
        </span>
      </div>
    </section>
  )
}

// ─── Small Components ────────────────────────────────────

function SectionHeader({ label, category }: { label: string; category: LogEntry['category'] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <h2 style={h2Style}>{label}</h2>
      <span style={{ ...pillStyle, ...pillColors[category] }}>{category}</span>
    </div>
  )
}

function EventLog({
  entries,
  onClear,
}: {
  readonly entries: readonly LogEntry[]
  readonly onClear: () => void
}) {
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = panelRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [entries.length])

  return (
    <aside
      ref={panelRef}
      data-log-panel
      style={logPanelStyle}
    >
      <div style={logHeaderStyle}>
        <h2 style={h2Style}>
          Event Log
          {entries.length > 0 && (
            <span style={countBadge}>{entries.length}</span>
          )}
        </h2>
        {entries.length > 0 && (
          <button onClick={onClear} style={clearBtnStyle}>
            Clear
          </button>
        )}
      </div>

      {entries.length === 0 && (
        <p style={emptyStyle}>Interact with the elements on the left...</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {entries.map((e) => (
          <div key={e.id} style={logRowStyle}>
            <span style={logTime}>{e.time}</span>
            <span style={{ ...logPill, ...pillColors[e.category] }}>{e.eventType}</span>
            <code style={logTag}>&lt;{e.targetTag}&gt;</code>
            {e.componentName && <span style={logComponent}>{e.componentName}</span>}
            {Object.keys(e.props).length > 0 && (
              <span style={logProps}>{JSON.stringify(e.props)}</span>
            )}
          </div>
        ))}
      </div>
    </aside>
  )
}

// ─── App ─────────────────────────────────────────────────

const TRACKED_EVENTS = ['click', 'change', 'input', 'focus', 'blur', 'scroll', 'keydown'] as const

export default function App() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const nextId = useRef(0)

  useEffect(() => {
    const tracker = init({ debug: true, ignoreSelectors: ['[data-log-panel]'] })

    const unsubs = TRACKED_EVENTS.map((eventType) =>
      tracker.on(
        eventType,
        (trackEvent) => {
          const entry = toLogEntry(nextId.current++, trackEvent, eventType)
          setEntries((prev) => [...prev, entry])
        },
        eventType === 'scroll' ? { throttle: 200 } : undefined,
      ),
    )

    return () => {
      unsubs.forEach((fn) => fn())
      tracker.destroy()
    }
  }, [])

  return (
    <div style={rootStyle}>
      <header style={headerStyle}>
        <h1 style={h1Style}>react-auto-tracking</h1>
        <span style={subtitleStyle}>playground</span>
      </header>

      <div style={gridStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <PointerSection />
          <FormSection />
          <AmbientSection />
        </div>
        <EventLog entries={entries} onClear={() => setEntries([])} />
      </div>
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────

const rootStyle: React.CSSProperties = {
  maxWidth: 1040,
  margin: '0 auto',
  padding: '40px 24px',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 10,
  marginBottom: 32,
  paddingBottom: 20,
  borderBottom: '1px solid var(--border)',
}

const h1Style: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  letterSpacing: '-0.02em',
}

const subtitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 400,
  color: 'var(--fg-faint)',
  fontFamily: 'var(--font-mono)',
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 24,
  alignItems: 'start',
}

const sectionStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: 20,
}

const h2Style: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: '-0.01em',
}

const pillStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  fontFamily: 'var(--font-mono)',
  padding: '2px 8px',
  borderRadius: 99,
  lineHeight: 1.5,
}

const pillColors: Record<LogEntry['category'], React.CSSProperties> = {
  pointer: { color: 'var(--pointer)', background: 'var(--pointer-bg)' },
  form: { color: 'var(--form)', background: 'var(--form-bg)' },
  ambient: { color: 'var(--ambient)', background: 'var(--ambient-bg)' },
}

// Pointer section
const controlGrid: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
}

const btnStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 500,
  background: 'var(--fg)',
  color: 'var(--bg)',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
}

const linkStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--pointer)',
  textDecoration: 'underline',
  textUnderlineOffset: 2,
}

const roleButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 500,
  fontFamily: 'var(--font-mono)',
  border: '1px solid var(--border-strong)',
  borderRadius: 6,
  cursor: 'pointer',
  userSelect: 'none',
}

const handlerDivStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 500,
  fontFamily: 'var(--font-mono)',
  border: '1px dashed var(--border-strong)',
  borderRadius: 6,
  cursor: 'pointer',
  userSelect: 'none',
}

// Form section
const fieldStack: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const fieldsetStyle: React.CSSProperties = {
  border: 'none',
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--fg-muted)',
  letterSpacing: '0.02em',
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 13,
  border: '1px solid var(--border)',
  borderRadius: 6,
  background: 'var(--bg)',
  outline: 'none',
}

// Ambient section
const scrollBoxStyle: React.CSSProperties = {
  height: 100,
  overflow: 'auto',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: 12,
  marginBottom: 8,
}

const keydownBoxStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: 12,
  outline: 'none',
}

// Event log
const logPanelStyle: React.CSSProperties = {
  background: 'var(--bg-subtle)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: 16,
  maxHeight: 'calc(100vh - 140px)',
  overflow: 'auto',
  position: 'sticky',
  top: 20,
}

const logHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 12,
  paddingBottom: 12,
  borderBottom: '1px solid var(--border)',
}

const countBadge: React.CSSProperties = {
  marginLeft: 8,
  fontSize: 11,
  fontWeight: 500,
  fontFamily: 'var(--font-mono)',
  color: 'var(--fg-muted)',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  padding: '1px 7px',
  borderRadius: 99,
}

const clearBtnStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--fg-muted)',
  background: 'none',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '4px 10px',
  cursor: 'pointer',
}

const emptyStyle: React.CSSProperties = {
  color: 'var(--fg-faint)',
  fontSize: 13,
  padding: '32px 0',
  textAlign: 'center',
}

const logRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 0',
  borderBottom: '1px solid var(--border)',
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  lineHeight: 1.6,
}

const logTime: React.CSSProperties = {
  color: 'var(--fg-faint)',
  flexShrink: 0,
}

const logPill: React.CSSProperties = {
  ...pillStyle,
  flexShrink: 0,
}

const logTag: React.CSSProperties = {
  color: 'var(--fg)',
  fontWeight: 500,
  fontSize: 12,
}

const logComponent: React.CSSProperties = {
  color: 'var(--fg-muted)',
  fontStyle: 'italic',
}

const logProps: React.CSSProperties = {
  color: 'var(--fg-faint)',
  fontSize: 11,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: 180,
}
