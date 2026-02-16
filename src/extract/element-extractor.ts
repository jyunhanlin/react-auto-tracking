import type { ElementInfo } from '../types'

const MAX_TEXT_LENGTH = 100

export function extractElementInfo(element: Element): ElementInfo {
  const text = (element.textContent ?? '').trim()

  return {
    tagName: element.tagName,
    id: element.id,
    className: element.className ?? '',
    text: text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text,
    href: isAnchorElement(element) ? element.href : null,
    role: element.getAttribute('role'),
    type: isInputElement(element) ? element.type : null,
    dataset: extractDataset((element as HTMLElement).dataset),
  }
}

function extractDataset(dataset: DOMStringMap): Record<string, string> {
  const result: Record<string, string> = {}
  for (const key of Object.keys(dataset)) {
    const value = dataset[key]
    if (value !== undefined) {
      result[key] = value
    }
  }
  return result
}

function isAnchorElement(el: Element): el is HTMLAnchorElement {
  return el.tagName === 'A'
}

function isInputElement(el: Element): el is HTMLInputElement {
  return el.tagName === 'INPUT'
}
