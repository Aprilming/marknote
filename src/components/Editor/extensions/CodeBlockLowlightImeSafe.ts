import CodeBlock, { type CodeBlockOptions } from '@tiptap/extension-code-block'
import { findChildren } from '@tiptap/core'
import type { Node as ProsemirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
// @ts-ignore highlight.js does not expose the core module types through this path
import highlight from 'highlight.js/lib/core'

export const refreshLowlightAfterImeMeta = 'refreshLowlightAfterIme'

interface CodeBlockLowlightImeSafeOptions extends CodeBlockOptions {
  lowlight: any
}

function imeDebugEnabled() {
  return typeof window !== 'undefined' && (window as any).__maiknoteImeDebug !== false
}

function imeDebug(phase: string, payload: Record<string, unknown> = {}) {
  if (!imeDebugEnabled()) return
  console.debug(`[MaikNote IME] ${phase}`, payload)
}

function parseNodes(nodes: any[], className: string[] = []): { text: string; classes: string[] }[] {
  return nodes
    .map((node) => {
      const classes = [...className, ...(node.properties ? node.properties.className : [])]

      if (node.children) {
        return parseNodes(node.children, classes)
      }

      return {
        text: node.value,
        classes,
      }
    })
    .flat()
}

function getHighlightNodes(result: any) {
  return result.value || result.children || []
}

function registered(aliasOrLanguage: string) {
  return Boolean(highlight.getLanguage(aliasOrLanguage))
}

function isImeComposing() {
  return Boolean((window as any).__imeComposing)
}

function getActiveCodeBlockRange(doc: ProsemirrorNode, name: string, pos: number) {
  return findChildren(doc, (node) => node.type.name === name)
    .map((block) => ({ from: block.pos, to: block.pos + block.node.nodeSize }))
    .find((range) => pos >= range.from && pos <= range.to)
}

function getDecorations({
  doc,
  name,
  lowlight,
  defaultLanguage,
  skipRange,
}: {
  doc: ProsemirrorNode
  name: string
  lowlight: any
  defaultLanguage: string | null | undefined
  skipRange?: { from: number; to: number }
}) {
  const decorations: Decoration[] = []

  findChildren(doc, (node) => node.type.name === name).forEach((block) => {
    if (skipRange && block.pos >= skipRange.from && block.pos + block.node.nodeSize <= skipRange.to) {
      return
    }

    let from = block.pos + 1
    const language = block.node.attrs.language || defaultLanguage
    const languages = lowlight.listLanguages()

    const nodes =
      language && (languages.includes(language) || registered(language) || lowlight.registered?.(language))
        ? getHighlightNodes(lowlight.highlight(language, block.node.textContent))
        : getHighlightNodes(lowlight.highlightAuto(block.node.textContent))

    parseNodes(nodes).forEach((node) => {
      const to = from + node.text.length

      if (node.classes.length) {
        decorations.push(Decoration.inline(from, to, { class: node.classes.join(' ') }))
      }

      from = to
    })
  })

  return DecorationSet.create(doc, decorations)
}

function isFunction(param: any): param is Function {
  return typeof param === 'function'
}

function LowlightImeSafePlugin({
  name,
  lowlight,
  defaultLanguage,
}: {
  name: string
  lowlight: any
  defaultLanguage: string | null | undefined
}) {
  if (!['highlight', 'highlightAuto', 'listLanguages'].every((api) => isFunction(lowlight[api]))) {
    throw Error('You should provide an instance of lowlight to use the code-block-lowlight extension')
  }

  const plugin: Plugin<DecorationSet> = new Plugin({
    key: new PluginKey('lowlight-ime-safe'),

    state: {
      init: (_, { doc }) => getDecorations({ doc, name, lowlight, defaultLanguage }),
      apply: (transaction, decorationSet, oldState, newState) => {
        if (transaction.getMeta(refreshLowlightAfterImeMeta)) {
          imeDebug('lowlight recompute:refresh-meta', {
            docChanged: transaction.docChanged,
            selection: { from: newState.selection.from, to: newState.selection.to },
          })
          return getDecorations({ doc: transaction.doc, name, lowlight, defaultLanguage })
        }

        const activeCodeBlockRange = getActiveCodeBlockRange(newState.doc, name, newState.selection.$head.pos)

        if (transaction.docChanged && isImeComposing() && activeCodeBlockRange) {
          const node = transaction.doc.nodeAt(activeCodeBlockRange.from)
          imeDebug('lowlight skip active codeBlock during composition', {
            activeCodeBlockRange,
            text: node?.textContent,
            stepCount: transaction.steps.length,
          })
          return getDecorations({
            doc: transaction.doc,
            name,
            lowlight,
            defaultLanguage,
            skipRange: activeCodeBlockRange,
          })
        }

        const oldNodeName = oldState.selection.$head.parent.type.name
        const newNodeName = newState.selection.$head.parent.type.name
        const oldNodes = findChildren(oldState.doc, (node) => node.type.name === name)
        const newNodes = findChildren(newState.doc, (node) => node.type.name === name)

        if (
          transaction.docChanged &&
          ([oldNodeName, newNodeName].includes(name) ||
            newNodes.length !== oldNodes.length ||
            transaction.steps.some((step) => {
              const stepWithRange = step as unknown as { from?: number; to?: number }

              return (
                stepWithRange.from !== undefined &&
                stepWithRange.to !== undefined &&
                oldNodes.some((node) => node.pos >= stepWithRange.from! && node.pos + node.node.nodeSize <= stepWithRange.to!)
              )
            }))
        ) {
          imeDebug('lowlight recompute:docChanged', {
            oldNodeName,
            newNodeName,
            composing: isImeComposing(),
            activeCodeBlockRange,
            stepCount: transaction.steps.length,
          })
          return getDecorations({ doc: transaction.doc, name, lowlight, defaultLanguage })
        }

        if (transaction.docChanged && activeCodeBlockRange) {
          imeDebug('lowlight map existing decorations', {
            composing: isImeComposing(),
            activeCodeBlockRange,
            stepCount: transaction.steps.length,
          })
        }

        return decorationSet.map(transaction.mapping, transaction.doc)
      },
    },

    props: {
      decorations(state) {
        return plugin.getState(state)
      },
    },
  })

  return plugin
}

export const CodeBlockLowlightImeSafe = CodeBlock.extend<CodeBlockLowlightImeSafeOptions>({
  addOptions() {
    return {
      ...this.parent?.(),
      lowlight: {},
      languageClassPrefix: 'language-',
      exitOnTripleEnter: true,
      exitOnArrowDown: true,
      defaultLanguage: null,
      HTMLAttributes: {},
    }
  },

  addProseMirrorPlugins() {
    return [
      ...this.parent?.() || [],
      LowlightImeSafePlugin({
        name: this.name,
        lowlight: this.options.lowlight,
        defaultLanguage: this.options.defaultLanguage,
      }),
    ]
  },
})
