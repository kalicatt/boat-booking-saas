'use client'

import { useState, useRef, useEffect } from 'react'
import Image, { ImageProps } from 'next/image'
import { useCms } from './CmsContext'

type EditableImageProps = Omit<ImageProps, 'src'> & {
  initialSrc: string
  cmsKey?: string // For site-config
  cmsId?: string // For Hero
  cmsField?: string // For Hero or Partner
  locale?: string
}

export default function EditableImage({
  initialSrc,
  cmsKey,
  cmsId,
  cmsField,
  locale,
  className,
  alt,
  ...props
}: EditableImageProps) {
  const { isEditMode, registerChange } = useCms()
  const [src, setSrc] = useState(initialSrc)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync internal state if props change (e.g. hero slide rotation)
  useEffect(() => {
    setSrc(initialSrc)
  }, [initialSrc])

  const handleClick = (e: React.MouseEvent) => {
    if (!isEditMode) return
    e.preventDefault()
    e.stopPropagation()
    inputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
        const res = await fetch('/api/admin/upload', {
            method: 'POST',
            body: formData
        })

        if (!res.ok) throw new Error('Upload failed')

        const data = await res.json()
        const newUrl = data.url

        setSrc(newUrl)

        let key = ''
        let type: 'site-config' | 'hero-slide' = 'site-config'
        let idOrKey = ''

        if (cmsId && cmsField) {
             key = `hero-slide:${cmsId}:${cmsField}`
             type = 'hero-slide'
             idOrKey = cmsId
        } else if (cmsKey) {
             key = `site-config:${cmsKey}`
             type = 'site-config'
             idOrKey = cmsKey
        }

        if (key && locale) {
            registerChange({
                key,
                type,
                idOrKey,
                field: cmsField,
                value: newUrl,
                locale
            })
        }

    } catch (err) {
        console.error(err)
        alert('Failed to upload image')
    }
  }

  // Wrapper must fill parent if fill={true} is passed
  const wrapperStyle = props.fill ? { width: '100%', height: '100%' } : undefined

  return (
    <div
      className={`relative group ${className || ''}`}
      style={wrapperStyle}
      onClick={isEditMode ? handleClick : undefined}
    >
      <Image
        src={src}
        alt={alt}
        className={`${className || ''} ${isEditMode ? 'cursor-pointer group-hover:opacity-80 transition-opacity' : ''}`}
        {...props}
      />

      {isEditMode && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 pointer-events-none z-10">
          <div className="bg-white/90 backdrop-blur text-slate-900 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2">
            <span>📷</span> Change Image
          </div>
        </div>
      )}

      {isEditMode && (
        <input
            ref={inputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
            onChange={handleFileChange}
        />
      )}
    </div>
  )
}
