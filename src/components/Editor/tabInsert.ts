export const SOURCE_TAB_INSERT_TEXT = '&nbsp;'
export const RICH_TAB_INSERT_TEXT = '\u00A0'

export function clampTabSize(tabSize: number) {
  if (!Number.isFinite(tabSize)) return 4
  return Math.max(1, Math.min(12, Math.round(tabSize)))
}

export function createSourceTabInsertText(tabSize: number) {
  return SOURCE_TAB_INSERT_TEXT.repeat(clampTabSize(tabSize))
}

export function createRichTabInsertText(tabSize: number) {
  return RICH_TAB_INSERT_TEXT.repeat(clampTabSize(tabSize))
}
