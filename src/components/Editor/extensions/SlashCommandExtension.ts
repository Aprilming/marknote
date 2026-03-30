import { Extension } from '@tiptap/core'

export function createSlashCommand() {
  return Extension.create({
    name: 'slashCommand',
    addOptions() {
      return {
        suggestion: {
          char: '/',
          startOfLine: false,
          command: ({ editor, range, props }: { editor: any; range: any; props: any }) => {
            editor.chain().focus().deleteRange(range).run()
            props.command(editor)
          },
        },
      }
    },
    addProseMirrorPlugins() {
      return []
    },
  })
}
