import { describe, it, expect } from 'vitest'
import { extractElementInfo } from './element-extractor'

describe('extractElementInfo', () => {
  it('extracts basic element info', () => {
    const el = document.createElement('button')
    el.id = 'submit-btn'
    el.className = 'btn primary'
    el.textContent = 'Submit Form'

    const info = extractElementInfo(el)

    expect(info.tagName).toBe('BUTTON')
    expect(info.id).toBe('submit-btn')
    expect(info.className).toBe('btn primary')
    expect(info.text).toBe('Submit Form')
    expect(info.href).toBeNull()
    expect(info.role).toBeNull()
    expect(info.type).toBeNull()
  })

  it('extracts href from anchor element', () => {
    const el = document.createElement('a')
    el.href = 'https://example.com'

    const info = extractElementInfo(el)
    expect(info.href).toBe('https://example.com/')
    expect(info.tagName).toBe('A')
  })

  it('extracts input type', () => {
    const el = document.createElement('input')
    el.type = 'email'

    const info = extractElementInfo(el)
    expect(info.type).toBe('email')
  })

  it('extracts role attribute', () => {
    const el = document.createElement('div')
    el.setAttribute('role', 'button')

    const info = extractElementInfo(el)
    expect(info.role).toBe('button')
  })

  it('extracts dataset', () => {
    const el = document.createElement('div')
    el.dataset.trackId = 'nav-cta'
    el.dataset.trackLabel = 'signup'

    const info = extractElementInfo(el)
    expect(info.dataset).toEqual({ trackId: 'nav-cta', trackLabel: 'signup' })
  })

  it('truncates text to 100 characters', () => {
    const el = document.createElement('p')
    el.textContent = 'a'.repeat(200)

    const info = extractElementInfo(el)
    expect(info.text).toHaveLength(100)
  })
})
