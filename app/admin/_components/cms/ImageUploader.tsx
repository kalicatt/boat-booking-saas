'use client'

import Image from 'next/image'
import type { DragEvent } from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { UploadCloud, Image as ImageIcon, Loader2, XCircle } from 'lucide-react'

type ImageUploaderProps = {
  label: string
  value?: string | null
  onChange: (url: string | null) => void
  helperText?: string
  uploadUrl?: string
  accept?: string
  ctaLabel?: string
  replaceLabel?: string
}

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const size = bytes / Math.pow(1024, exponent)
  return `${size.toFixed(1)} ${units[exponent]}`
}

export function ImageUploader({
  label,
  value,
  onChange,
  helperText,
  uploadUrl = '/api/admin/upload',
  accept = 'image/jpeg,image/png,image/webp',
  ctaLabel = 'Importer une image',
  replaceLabel = 'Remplacer'
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setDragging] = useState(false)
  const [isUploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number } | null>(null)

  const currentPreview = useMemo(() => value ?? null, [value])

  const resetInput = () => {
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const uploadFile = useCallback(
    (file: File) => {
      return new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        const formData = new FormData()
        formData.append('file', file)

        xhr.open('POST', uploadUrl, true)
        xhr.withCredentials = true

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(progress)
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText)
              if (typeof response?.url === 'string') {
                resolve(response.url)
              } else {
                reject(new Error('Réponse inattendue du serveur'))
              }
            } catch (error) {
              reject(error instanceof Error ? error : new Error('Impossible de lire la réponse serveur'))
            }
          } else {
            try {
              const response = JSON.parse(xhr.responseText)
              reject(new Error(response?.error ?? 'Échec de l\'upload'))
            } catch {
              reject(new Error('Échec de l\'upload'))
            }
          }
        }

        xhr.onerror = () => {
          reject(new Error('Connexion perdue pendant l\'upload'))
        }

        xhr.send(formData)
      })
    },
    [uploadUrl]
  )

  const handleFileSelection = useCallback(
    async (files: FileList | null) => {
      if (!files || !files.length) return
      const file = files[0]
      setErrorMessage(null)
      setFileMeta({ name: file.name, size: file.size })
      setUploading(true)
      setUploadProgress(0)

      try {
        const uploadedUrl = await uploadFile(file)
        onChange(uploadedUrl)
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Une erreur inattendue est survenue')
      } finally {
        setUploading(false)
        resetInput()
      }
    },
    [onChange, uploadFile]
  )

  const handleBrowseClick = () => inputRef.current?.click()

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    await handleFileSelection(event.dataTransfer.files)
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget as Node)) return
    setDragging(false)
  }

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
        </div>
        <div className="flex gap-2 text-xs text-slate-500">
          <span>Formats : JPG, PNG, WEBP</span>
          <span className="hidden sm:inline" aria-hidden="true">
            •
          </span>
          <span>Poids max : 5 MB</span>
        </div>
      </header>

      <div
        className={clsx(
          'relative flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition',
          isDragging ? 'border-slate-900 bg-slate-50' : 'border-slate-200'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleBrowseClick()
          }
        }}
      >
        {currentPreview ? (
          <div className="relative h-48 w-full overflow-hidden rounded-xl">
            <Image
              src={currentPreview}
              alt="Prévisualisation"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 600px"
              priority={false}
            />
            <button
              type="button"
              className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900 shadow"
              onClick={handleBrowseClick}
            >
              <UploadCloud className="h-3.5 w-3.5" />
              {replaceLabel}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <ImageIcon className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700">
              Glissez-déposez ou cliquez pour uploader
            </p>
            <p className="text-xs text-slate-500">PNG, JPG ou WebP — 5 MB max.</p>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm"
              onClick={handleBrowseClick}
            >
              <UploadCloud className="h-3.5 w-3.5" />
              {ctaLabel}
            </button>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => handleFileSelection(event.target.files)}
        />
      </div>

      {fileMeta ? (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <p className="font-medium text-slate-700">{fileMeta.name}</p>
          <p>{formatBytes(fileMeta.size)}</p>
        </div>
      ) : null}

      {isUploading ? (
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-slate-900 transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-600">{uploadProgress}%</span>
          <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
        </div>
      ) : null}

      {errorMessage ? (
        <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-red-500">
          <XCircle className="h-4 w-4" />
          {errorMessage}
        </p>
      ) : null}
    </section>
  )
}
