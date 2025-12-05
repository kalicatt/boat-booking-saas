'use client'

import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import clsx from 'clsx'
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Quote, Undo2, Redo2 } from 'lucide-react'

type RichTextEditorProps = {
  label: string
  value: string
  onChange: (value: string) => void
  helperText?: string
  placeholder?: string
  minHeight?: number
}

const TOOLBAR_BUTTON_CLASSES =
  'inline-flex items-center justify-center rounded-lg border px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300'

export function RichTextEditor({
  label,
  value,
  onChange,
  helperText,
  placeholder = 'Commencez votre contenu riche...',
  minHeight = 200
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: true },
        orderedList: { keepMarks: true, keepAttributes: true },
        heading: { levels: [2, 3, 4] }
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer nofollow',
          target: '_blank'
        }
      })
    ],
    content: value?.trim().length ? value : '<p></p>',
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none text-sm focus:outline-none',
        'data-placeholder': placeholder
      }
    },
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html === '<p></p>' ? '' : html)
    }
  })

  useEffect(() => {
    if (!editor) return
    const incoming = value?.trim().length ? value : '<p></p>'
    if (incoming !== editor.getHTML()) {
      editor.commands.setContent(incoming, { emitUpdate: false })
    }
  }, [editor, value])

  const handleToggleLink = () => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('URL du lien', previousUrl ?? 'https://')
    if (url === null) return
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={clsx(TOOLBAR_BUTTON_CLASSES, editor?.isActive('bold') && 'border-slate-900 text-slate-900')}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            disabled={!editor}
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={clsx(TOOLBAR_BUTTON_CLASSES, editor?.isActive('italic') && 'border-slate-900 text-slate-900')}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            disabled={!editor}
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={clsx(TOOLBAR_BUTTON_CLASSES, editor?.isActive('bulletList') && 'border-slate-900 text-slate-900')}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            disabled={!editor}
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={clsx(TOOLBAR_BUTTON_CLASSES, editor?.isActive('orderedList') && 'border-slate-900 text-slate-900')}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            disabled={!editor}
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={clsx(TOOLBAR_BUTTON_CLASSES, editor?.isActive('blockquote') && 'border-slate-900 text-slate-900')}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            disabled={!editor}
          >
            <Quote className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={clsx(TOOLBAR_BUTTON_CLASSES, editor?.isActive('link') && 'border-slate-900 text-slate-900')}
            onClick={handleToggleLink}
            disabled={!editor}
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={TOOLBAR_BUTTON_CLASSES}
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!editor || !editor.can().undo()}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={TOOLBAR_BUTTON_CLASSES}
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!editor || !editor.can().redo()}
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div className="tiptap-editor relative rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        .tiptap-editor .ProseMirror {
          min-height: ${minHeight}px;
          outline: none;
          position: relative;
        }

        .tiptap-editor .ProseMirror[data-placeholder]:before {
          color: rgb(148 163 184);
          content: attr(data-placeholder);
          position: absolute;
          pointer-events: none;
        }
      `}</style>
    </section>
  )
}
