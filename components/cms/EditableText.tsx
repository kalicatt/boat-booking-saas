'use client'

import { useState, useEffect, useRef } from 'react'
import { useCms } from './CmsContext'
import { updateSiteConfigAction, updateHeroSlideAction } from '@/lib/actions/cms'

type EditableTextProps = {
  initialValue: string
  cmsKey?: string // For site-config
  cmsId?: string // For Hero
  cmsField?: 'title' | 'subtitle' // For Hero
  locale: string
  as?: React.ElementType
  className?: string
  children?: React.ReactNode // Fallback if initialValue is empty (though usually we pass text)
}

export default function EditableText({
  initialValue,
  cmsKey,
  cmsId,
  cmsField,
  locale,
  as: Component = 'div', // Default to div, can be h1, p, span
  className,
  children
}: EditableTextProps) {
  const { isEditMode } = useCms()
  const [text, setText] = useState(initialValue)
  const [isSaving, setIsSaving] = useState(false)
  const ref = useRef<HTMLElement>(null)

  // Sync if initialValue changes (e.g. language switch)
  useEffect(() => {
    setText(initialValue)
  }, [initialValue])

  const handleBlur = async () => {
    if (!ref.current) return
    const newValue = ref.current.innerText // Use innerText to get plain text

    // Optimistic update local state (already done by DOM, but sync React state)
    if (newValue === text) return // No change

    setText(newValue)
    setIsSaving(true)

    try {
        let res
        if (cmsKey) {
            res = await updateSiteConfigAction(cmsKey, newValue, locale)
        } else if (cmsId && cmsField) {
            res = await updateHeroSlideAction(cmsId, cmsField, newValue, locale)
        }

        if (res && !res.success) {
            console.error('Failed to save CMS', res.error)
            alert('Error saving change: ' + res.error)
            // Revert?
            setText(initialValue)
            if(ref.current) ref.current.innerText = initialValue
        }
    } catch (e) {
        console.error(e)
    } finally {
        setIsSaving(false)
    }
  }

  if (!isEditMode) {
    // Normal render
    // If component is void element or complex, handle carefully.
    // Usually used for text wrappers.
    return <Component className={className}>{text || children}</Component>
  }

  return (
    <Component
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      className={`${className || ''} outline-dashed outline-2 outline-sky-400 rounded cursor-text min-w-[20px] transition-colors hover:bg-sky-50 focus:bg-white focus:outline-sky-600 focus:z-50 relative`}
      style={{ opacity: isSaving ? 0.5 : 1 }}
    >
      {text || children}
    </Component>
  )
}
