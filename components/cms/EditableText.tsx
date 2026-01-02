'use client'

import { useState, useEffect, useRef } from 'react'
import { useCms } from './CmsContext'

type EditableTextProps = {
  initialValue: string
  cmsKey?: string // For site-config
  cmsId?: string // For Hero
  cmsField?: 'title' | 'subtitle' // For Hero
  locale: string
  as?: React.ElementType
  className?: string
  children?: React.ReactNode
}

export default function EditableText({
  initialValue,
  cmsKey,
  cmsId,
  cmsField,
  locale,
  as: Component = 'div',
  className,
  children
}: EditableTextProps) {
  const { isEditMode, registerChange } = useCms()
  const [text, setText] = useState(initialValue)
  const ref = useRef<HTMLElement>(null)

  // Sync if initialValue changes (e.g. language switch), ONLY if we are not editing locally
  useEffect(() => {
    setText(initialValue)
    if (ref.current) ref.current.innerText = initialValue
  }, [initialValue])

  const handleBlur = () => {
    if (!ref.current) return
    const newValue = ref.current.innerText

    if (newValue === text) return // No change

    // Optimistically update local state
    setText(newValue)

    // Construct unique key for the change map
    let key = ''
    let type: 'site-config' | 'hero-slide' = 'site-config'
    let idOrKey = ''

    if (cmsKey) {
        key = `site-config:${cmsKey}`
        type = 'site-config'
        idOrKey = cmsKey
    } else if (cmsId && cmsField) {
        key = `hero-slide:${cmsId}:${cmsField}`
        type = 'hero-slide'
        idOrKey = cmsId
    }

    if (key) {
        registerChange({
            key,
            type,
            idOrKey,
            field: cmsField,
            value: newValue,
            locale
        })
    }
  }

  // If not in edit mode, just render clean text
  if (!isEditMode) {
    return <Component className={className}>{text || children}</Component>
  }

  // In Edit Mode, use contentEditable
  // We use suppressContentEditableWarning because React complains, but we manage it manually via ref for updates
  return (
    <Component
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      className={`
        ${className || ''}
        relative cursor-text rounded transition-all duration-200
        outline outline-2 outline-transparent hover:outline-sky-300/50 hover:bg-sky-50/10
        focus:outline-sky-500 focus:bg-white focus:shadow-lg focus:z-50 focus:text-slate-900
        empty:before:content-['Empty...'] empty:before:text-slate-300 empty:before:italic
      `}
    >
      {text || children}
    </Component>
  )
}
