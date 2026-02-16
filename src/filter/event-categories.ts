export const EventCategory = {
  Pointer: 'pointer',
  Form: 'form',
  Ambient: 'ambient',
} as const

export type EventCategory = (typeof EventCategory)[keyof typeof EventCategory]

const EVENT_HANDLER_MAP: Readonly<Record<string, readonly string[]>> = {
  // Pointer
  click: ['onClick', 'onMouseDown', 'onMouseUp', 'onPointerDown', 'onPointerUp'],
  touchstart: ['onTouchStart'],
  touchend: ['onTouchEnd'],

  // Form
  input: ['onChange', 'onInput'],
  change: ['onChange'],
  focus: ['onFocus'],
  blur: ['onBlur'],
  submit: ['onSubmit'],

  // Ambient
  scroll: ['onScroll'],
  keydown: ['onKeyDown'],
  keyup: ['onKeyUp'],
  copy: ['onCopy'],
  paste: ['onPaste'],
}

const CATEGORY_MAP: Readonly<Record<string, EventCategory>> = {
  click: EventCategory.Pointer,
  touchstart: EventCategory.Pointer,
  touchend: EventCategory.Pointer,

  input: EventCategory.Form,
  change: EventCategory.Form,
  focus: EventCategory.Form,
  blur: EventCategory.Form,
  submit: EventCategory.Form,

  scroll: EventCategory.Ambient,
  keydown: EventCategory.Ambient,
  keyup: EventCategory.Ambient,
  copy: EventCategory.Ambient,
  paste: EventCategory.Ambient,
}

export function getEventCategory(eventType: string): EventCategory {
  return CATEGORY_MAP[eventType] ?? EventCategory.Ambient
}

export function getHandlersForEvent(eventType: string): readonly string[] {
  return EVENT_HANDLER_MAP[eventType] ?? []
}
