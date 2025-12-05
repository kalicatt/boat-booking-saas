'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import clsx from 'clsx'
import {
  GripVertical,
  Plus,
  Save,
  Trash2,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react'
import { AdminPageShell } from '@/app/admin/_components/AdminPageShell'
import { TranslatableInput } from '@/app/admin/_components/cms/TranslatableInput'
import { ImageUploader } from '@/app/admin/_components/cms/ImageUploader'
import { CmsPublishActions } from '@/app/admin/_components/cms/CmsPublishActions'
import type { HeroSlideDTO, TranslationRecord } from '@/types/cms'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/types/cms'

import type { CSSProperties } from 'react'

const createEmptyFormState = (): HeroSlideFormState => ({
  title: {},
  subtitle: {},
  imageDesktop: '',
  imageMobile: null,
  isActive: true
})

type HeroSlideFormState = {
  title: TranslationRecord
  subtitle: TranslationRecord
  imageDesktop: string
  imageMobile: string | null
  isActive: boolean
}

type BannerState = { type: 'success' | 'error' | 'info'; text: string } | null

type HeroManagerClientProps = {
  initialSlides: HeroSlideDTO[]
}

const getReadableTranslation = (record: TranslationRecord) => {
  for (const locale of SUPPORTED_LOCALES) {
    const value = record[locale]
    if (value && value.trim().length) {
      return value
    }
  }
  return 'Sans titre'
}

const mapSlideToForm = (slide: HeroSlideDTO): HeroSlideFormState => ({
  title: slide.title,
  subtitle: slide.subtitle,
  imageDesktop: slide.imageDesktop,
  imageMobile: slide.imageMobile,
  isActive: slide.isActive
})

export function HeroManagerClient({ initialSlides }: HeroManagerClientProps) {
  const [slides, setSlides] = useState<HeroSlideDTO[]>(() =>
    [...initialSlides].sort((a, b) => a.order - b.order)
  )
  const [selectedSlideId, setSelectedSlideId] = useState<string>(
    initialSlides[0]?.id ?? 'new'
  )
  const [formState, setFormState] = useState<HeroSlideFormState>(() =>
    initialSlides[0] ? mapSlideToForm(initialSlides[0]) : createEmptyFormState()
  )
  const [banner, setBanner] = useState<BannerState>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isReordering, setIsReordering] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  useEffect(() => {
    if (selectedSlideId === 'new') {
      setFormState(createEmptyFormState())
      return
    }
    const match = slides.find((slide) => slide.id === selectedSlideId)
    if (match) {
      setFormState(mapSlideToForm(match))
    }
  }, [selectedSlideId, slides])

  const currentSlide = useMemo(
    () => slides.find((slide) => slide.id === selectedSlideId) ?? null,
    [selectedSlideId, slides]
  )

  const showBanner = useCallback((message: BannerState) => {
    setBanner(message)
    if (message) {
      setTimeout(() => {
        setBanner(null)
      }, 3500)
    }
  }, [])

  const persistOrder = useCallback(
    async (ids: string[], previousState: HeroSlideDTO[]) => {
      setIsReordering(true)
      try {
        const response = await fetch('/api/admin/cms/hero/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids })
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload?.error ?? 'Requête invalide')
        }
        showBanner({ type: 'success', text: 'Ordre enregistré.' })
      } catch (error) {
        setSlides(previousState)
        showBanner({
          type: 'error',
          text: error instanceof Error ? error.message : 'Impossible d\'enregistrer l\'ordre.'
        })
      } finally {
        setIsReordering(false)
      }
    },
    [showBanner]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      setSlides((prev) => {
        const oldIndex = prev.findIndex((slide) => slide.id === active.id)
        const newIndex = prev.findIndex((slide) => slide.id === over.id)
        if (oldIndex === -1 || newIndex === -1) {
          return prev
        }
        const previousState = prev.map((slide) => ({ ...slide }))
        const reordered = arrayMove(prev, oldIndex, newIndex).map((slide, index) => ({
          ...slide,
          order: index
        }))
        const ids = reordered.map((slide) => slide.id)
        void persistOrder(ids, previousState)
        return reordered
      })
    },
    [persistOrder]
  )

  const handleTitleChange = (nextValue: TranslationRecord) => {
    setFormState((previous) => ({ ...previous, title: nextValue }))
  }

  const handleSubtitleChange = (nextValue: TranslationRecord) => {
    setFormState((previous) => ({ ...previous, subtitle: nextValue }))
  }

  const handleDesktopImage = (nextValue: string | null) => {
    setFormState((previous) => ({ ...previous, imageDesktop: nextValue ?? '' }))
  }

  const handleMobileImage = (nextValue: string | null) => {
    setFormState((previous) => ({ ...previous, imageMobile: nextValue }))
  }

  const isFormValid = useMemo(() => {
    const hasTitle = Object.keys(formState.title).length > 0
    return hasTitle && formState.imageDesktop.trim().length > 0
  }, [formState])

  const upsertSlide = async () => {
    setIsSaving(true)
    showBanner(null)
    try {
      const payload = {
        title: formState.title,
        subtitle: formState.subtitle,
        imageDesktop: formState.imageDesktop,
        imageMobile: formState.imageMobile,
        isActive: formState.isActive
      }

      const endpoint =
        selectedSlideId === 'new'
          ? '/api/admin/cms/hero'
          : `/api/admin/cms/hero/${selectedSlideId}`

      const method = selectedSlideId === 'new' ? 'POST' : 'PUT'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error ?? 'Impossible d\'enregistrer la slide.')
      }

      const slide = data.slide as HeroSlideDTO

      setSlides((previous) => {
        const next = [...previous]
        const existingIndex = next.findIndex((entry) => entry.id === slide.id)
        if (existingIndex >= 0) {
          next[existingIndex] = slide
        } else {
          next.push(slide)
        }
        return next.sort((a, b) => a.order - b.order)
      })

      setSelectedSlideId(slide.id)
      showBanner({ type: 'success', text: 'Slide enregistrée.' })
    } catch (error) {
      showBanner({
        type: 'error',
        text: error instanceof Error ? error.message : 'Impossible d\'enregistrer la slide.'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isFormValid || isSaving) return
    void upsertSlide()
  }

  const handleDelete = async () => {
    if (!currentSlide) return
    const confirmDelete = window.confirm('Supprimer cette slide ?')
    if (!confirmDelete) return
    setIsDeleting(true)
    showBanner(null)
    try {
      const response = await fetch(`/api/admin/cms/hero/${currentSlide.id}`, {
        method: 'DELETE'
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error ?? 'Suppression impossible')
      }
      let fallbackId = 'new'
      setSlides((previous) => {
        const next = previous.filter((slide) => slide.id !== currentSlide.id)
        fallbackId = next[0]?.id ?? 'new'
        return next
      })
      setSelectedSlideId(fallbackId)
      showBanner({ type: 'success', text: 'Slide supprimée.' })
    } catch (error) {
      showBanner({
        type: 'error',
        text: error instanceof Error ? error.message : 'Suppression impossible.'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const selectNewSlide = () => {
    setSelectedSlideId('new')
    setFormState(createEmptyFormState())
  }

  const listEmpty = slides.length === 0

  return (
    <AdminPageShell
      title="Carrousel de la page d'accueil"
      description="Gérez les slides héros : visuels, langues et ordre d'affichage."
      backHref="/admin"
      actions={
        <div className="flex flex-col gap-2">
          <CmsPublishActions />
          <button
            type="button"
            onClick={selectNewSlide}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
          >
            <Plus className="h-4 w-4" />
            Nouvelle slide
          </button>
        </div>
      }
    >
      {banner ? (
        <div
          className={clsx(
            'rounded-xl border px-4 py-2 text-sm',
            banner.type === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
            banner.type === 'error' && 'border-rose-200 bg-rose-50 text-rose-700',
            banner.type === 'info' && 'border-slate-200 bg-slate-50 text-slate-600'
          )}
        >
          {banner.text}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[340px,1fr]">
        <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Slides</p>
              <p className="text-xs text-slate-500">Glissez pour réordonner</p>
            </div>
            {isReordering ? (
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Sauvegarde…
              </span>
            ) : null}
          </header>

          {listEmpty ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
              <ImageIcon className="h-8 w-8 text-slate-300" />
              <p>Aucune slide enregistrée pour le moment.</p>
              <button
                type="button"
                onClick={selectNewSlide}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white"
              >
                <Plus className="h-3.5 w-3.5" /> Créer la première slide
              </button>
            </div>
          ) : (
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext items={slides.map((slide) => slide.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {slides.map((slide) => (
                    <HeroSlideRow
                      key={slide.id}
                      slide={slide}
                      isSelected={selectedSlideId === slide.id}
                      onSelect={setSelectedSlideId}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-6">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {selectedSlideId === 'new' ? 'Créer une nouvelle slide' : 'Modifier la slide'}
              </p>
              <p className="text-xs text-slate-500">
                Champs obligatoires : visuel desktop et titre FR.
              </p>
            </div>
            {currentSlide && selectedSlideId !== 'new' ? (
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1 rounded-full border border-rose-100 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-200"
                disabled={isDeleting}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isDeleting ? 'Suppression…' : 'Supprimer'}
              </button>
            ) : null}
          </header>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <TranslatableInput
              label="Titre principal"
              value={formState.title}
              onChange={handleTitleChange}
              helperText="Visible sur la bannière."
            />

            <TranslatableInput
              label="Sous-titre"
              value={formState.subtitle}
              onChange={handleSubtitleChange}
              helperText="Texte optionnel, affiché sous le titre."
              multiline
            />

            <ImageUploader
              label="Image desktop"
              value={formState.imageDesktop}
              onChange={handleDesktopImage}
              helperText="Format paysage recommandé (1920x960)."
            />

            <ImageUploader
              label="Image mobile"
              value={formState.imageMobile ?? undefined}
              onChange={handleMobileImage}
              helperText="Optionnel. Format 1080x1350 recommandé."
            />

            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={formState.isActive}
                onChange={(event) =>
                  setFormState((previous) => ({ ...previous, isActive: event.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
              />
              Slide active sur le site
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={!isFormValid || isSaving}
                className={clsx(
                  'inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition',
                  (!isFormValid || isSaving) && 'opacity-60'
                )}
              >
                <Save className="h-4 w-4" />
                {selectedSlideId === 'new' ? 'Créer la slide' : 'Enregistrer'}
              </button>
              <button
                type="button"
                onClick={selectNewSlide}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-400"
              >
                Réinitialiser
              </button>
            </div>
          </form>
        </section>
      </div>
    </AdminPageShell>
  )
}

type HeroSlideRowProps = {
  slide: HeroSlideDTO
  isSelected: boolean
  onSelect: (id: string) => void
}

const HeroSlideRow = ({ slide, isSelected, onSelect }: HeroSlideRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slide.id
  })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'flex items-center gap-3 rounded-2xl border px-3 py-2 shadow-sm',
        isSelected ? 'border-slate-900 bg-slate-900/5' : 'border-slate-200 bg-white',
        isDragging && 'opacity-80'
      )}
    >
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500"
        {...attributes}
        {...listeners}
        aria-label="Réorganiser"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onSelect(slide.id)}
        className="flex flex-1 items-center justify-between rounded-full px-2 py-1 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-slate-800">{getReadableTranslation(slide.title)}</p>
          <p className="text-xs text-slate-400">
            {slide.subtitle[DEFAULT_LOCALE] ?? slide.subtitle.en ?? 'Sous-titre facultatif'}
          </p>
        </div>
        <span
          className={clsx(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            slide.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
          )}
        >
          {slide.isActive ? 'Actif' : 'Brouillon'}
        </span>
      </button>
    </div>
  )
}
