'use client'

import { useCallback, useState } from 'react'
import clsx from 'clsx'
import { AdminPageShell } from '@/app/admin/_components/AdminPageShell'
import { ImageUploader } from '@/app/admin/_components/cms/ImageUploader'
import { CmsPublishActions } from '@/app/admin/_components/cms/CmsPublishActions'
import type { PartnerDTO } from '@/types/cms'
import { Plus, Eye, EyeOff, Trash2, Save, Link as LinkIcon } from 'lucide-react'

import Link from 'next/link'

const createEmptyFormState = (): PartnerFormState => ({
  name: '',
  logoUrl: '',
  websiteUrl: '',
  order: 0,
  isVisible: true
})

type PartnerFormState = {
  name: string
  logoUrl: string
  websiteUrl: string
  order: number
  isVisible: boolean
}

type BannerState = { type: 'success' | 'error' | 'info'; text: string } | null

type PartnersManagerClientProps = {
  initialPartners: PartnerDTO[]
}

export function PartnersManagerClient({ initialPartners }: PartnersManagerClientProps) {
  const [partners, setPartners] = useState<PartnerDTO[]>(() =>
    [...initialPartners].sort((a, b) => a.order - b.order)
  )
  const [selectedId, setSelectedId] = useState<string>(initialPartners[0]?.id ?? 'new')
  const [formState, setFormState] = useState<PartnerFormState>(() =>
    initialPartners[0] ? mapPartnerToForm(initialPartners[0]) : createEmptyFormState()
  )
  const [banner, setBanner] = useState<BannerState>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const showBanner = useCallback((payload: BannerState) => {
    setBanner(payload)
    if (payload) {
      setTimeout(() => setBanner(null), 3200)
    }
  }, [])

  const selectPartner = (id: string) => {
    setSelectedId(id)
    if (id === 'new') {
      setFormState(() => ({ ...createEmptyFormState(), order: partners.length }))
    } else {
      const target = partners.find((partner) => partner.id === id)
      if (target) {
        setFormState(mapPartnerToForm(target))
      }
    }
  }

  const isFormValid = formState.name.trim().length > 0 && formState.logoUrl.trim().length > 0

  const upsertPartner = async () => {
    setIsSaving(true)
    showBanner(null)
    try {
      const payload = {
        name: formState.name.trim(),
        logoUrl: formState.logoUrl.trim(),
        websiteUrl: formState.websiteUrl.trim(),
        isVisible: formState.isVisible,
        order: Number.isFinite(formState.order) ? formState.order : undefined
      }

      const endpoint =
        selectedId === 'new' ? '/api/admin/cms/partners' : `/api/admin/cms/partners/${selectedId}`
      const method = selectedId === 'new' ? 'POST' : 'PUT'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error ?? 'Action impossible')
      }

      const partner = data.partner as PartnerDTO
      setPartners((previous) => {
        const next = [...previous]
        const index = next.findIndex((item) => item.id === partner.id)
        if (index >= 0) {
          next[index] = partner
        } else {
          next.push(partner)
        }
        return next.sort((a, b) => a.order - b.order)
      })
      setSelectedId(partner.id)
      setFormState(mapPartnerToForm(partner))
      showBanner({ type: 'success', text: 'Partenaire enregistré.' })
    } catch (error) {
      showBanner({
        type: 'error',
        text: error instanceof Error ? error.message : 'Impossible d\'enregistrer.'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isFormValid || isSaving) return
    void upsertPartner()
  }

  const handleToggleVisibility = async (partner: PartnerDTO) => {
    const previousState = partners
    const optimistic = previousState.map((item) =>
      item.id === partner.id ? { ...item, isVisible: !item.isVisible } : item
    )
    setPartners(optimistic)
    try {
      const response = await fetch(`/api/admin/cms/partners/${partner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: !partner.isVisible })
      })
      if (!response.ok) {
        throw new Error()
      }
    } catch {
      setPartners(previousState)
      showBanner({ type: 'error', text: 'Impossible de changer la visibilité.' })
    }
  }

  const handleDelete = async (partner: PartnerDTO) => {
    const confirmation = window.confirm(`Supprimer ${partner.name} ?`)
    if (!confirmation) return
    setIsDeleting(true)
    showBanner(null)
    try {
      const response = await fetch(`/api/admin/cms/partners/${partner.id}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error ?? 'Suppression impossible')
      }
      let nextId = 'new'
      setPartners((previous) => {
        const next = previous.filter((item) => item.id !== partner.id)
        nextId = next[0]?.id ?? 'new'
        return next
      })
      setSelectedId(nextId)
      if (nextId === 'new') {
        setFormState(createEmptyFormState())
      }
      showBanner({ type: 'success', text: 'Partenaire supprimé.' })
    } catch (error) {
      showBanner({
        type: 'error',
        text: error instanceof Error ? error.message : 'Suppression impossible.'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AdminPageShell
      title="Partenaires & Labels"
      description="Gérez les logos et liens de vos partenaires officiels."
      backHref="/admin"
      actions={
        <div className="flex flex-col gap-2">
          <CmsPublishActions />
          <button
            type="button"
            onClick={() => selectPartner('new')}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
          >
            <Plus className="h-4 w-4" />
            Nouveau partenaire
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

      <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
        <section className="rounded-2xl border border-slate-100 bg-white p-6">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Partenaires en ligne</p>
              <p className="text-xs text-slate-500">Visibilité immédiate, classement selon l&apos;ordre.</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">{partners.length} logos</span>
          </header>

          {partners.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {partners.map((partner) => (
                <article
                  key={partner.id}
                  className={clsx(
                    'relative flex flex-col gap-3 rounded-2xl border px-4 py-5 transition',
                    partner.isVisible
                      ? 'border-slate-200 bg-slate-50'
                      : 'border-dashed border-rose-200 bg-white'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(partner)}
                    className="absolute right-4 top-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-500"
                  >
                    {partner.isVisible ? (
                      <>
                        <Eye className="h-3.5 w-3.5" /> Visible
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3.5 w-3.5" /> Caché
                      </>
                    )}
                  </button>

                  <div className="flex h-24 items-center justify-center rounded-xl border border-slate-200 bg-white">
                    <div
                      className="h-16 w-32 bg-contain bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${partner.logoUrl})` }}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">{partner.name}</p>
                    {partner.websiteUrl ? (
                      <Link
                        href={partner.websiteUrl}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                      >
                        <LinkIcon className="h-3 w-3" /> Visiter
                      </Link>
                    ) : (
                      <p className="text-xs text-slate-400">Pas de lien</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Ordre #{partner.order}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => selectPartner(partner.id)}
                        className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(partner)}
                        className="rounded-full border border-rose-200 px-3 py-1 font-semibold text-rose-600"
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-500">
              <p>Aucun partenaire pour l&apos;instant.</p>
              <button
                type="button"
                onClick={() => selectPartner('new')}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter un logo
              </button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-6">
          <header className="mb-4">
            <p className="text-sm font-semibold text-slate-800">
              {selectedId === 'new' ? 'Nouveau partenaire' : 'Modifier le partenaire'}
            </p>
            <p className="text-xs text-slate-500">Nom, lien et logo utilisé dans toutes les langues.</p>
          </header>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nom officiel
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={formState.name}
                onChange={(event) =>
                  setFormState((previous) => ({ ...previous, name: event.target.value }))
                }
                placeholder="Ex. Nautic France"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Lien externe
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={formState.websiteUrl}
                onChange={(event) =>
                  setFormState((previous) => ({ ...previous, websiteUrl: event.target.value }))
                }
                placeholder="https://"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Position (1 = tout en haut)
              </label>
              <input
                type="number"
                min={0}
                className="mt-1 w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={formState.order}
                onChange={(event) =>
                  setFormState((previous) => ({ ...previous, order: Number(event.target.value) }))
                }
              />
            </div>

            <ImageUploader
              label="Logo"
              value={formState.logoUrl}
              onChange={(url) =>
                setFormState((previous) => ({ ...previous, logoUrl: url ?? '' }))
              }
              helperText="PNG/WEBP avec fond transparent recommandé."
            />

            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={formState.isVisible}
                onChange={(event) =>
                  setFormState((previous) => ({ ...previous, isVisible: event.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
              />
              Afficher sur le site public
            </label>

            <button
              type="submit"
              disabled={!isFormValid || isSaving}
              className={clsx(
                'inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm',
                (!isFormValid || isSaving) && 'opacity-60'
              )}
            >
              <Save className="h-4 w-4" />
              {selectedId === 'new' ? 'Créer le partenaire' : 'Enregistrer'}
            </button>
          </form>
        </section>
      </div>
    </AdminPageShell>
  )
}

const mapPartnerToForm = (partner: PartnerDTO): PartnerFormState => ({
  name: partner.name,
  logoUrl: partner.logoUrl,
  websiteUrl: partner.websiteUrl ?? '',
  order: partner.order,
  isVisible: partner.isVisible
})
