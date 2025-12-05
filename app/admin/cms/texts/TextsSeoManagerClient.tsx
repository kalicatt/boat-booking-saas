'use client'

import { useCallback, useMemo, useState } from 'react'
import clsx from 'clsx'
import { AdminPageShell } from '@/app/admin/_components/AdminPageShell'
import { TranslatableInput } from '@/app/admin/_components/cms/TranslatableInput'
import { RichTextEditor } from '@/app/admin/_components/cms/RichTextEditor'
import { ImageUploader } from '@/app/admin/_components/cms/ImageUploader'
import { CmsPublishActions } from '@/app/admin/_components/cms/CmsPublishActions'
import type { SiteConfigGroupState, SiteConfigFieldState } from '@/lib/cms/siteConfigDefinitions'
import type { TranslationRecord } from '@/types/cms'
import { Save, Loader2 } from 'lucide-react'

type TextsSeoManagerClientProps = {
  initialGroups: SiteConfigGroupState[]
}

type BannerState = { type: 'success' | 'error' | 'info'; text: string } | null

type FieldValue = TranslationRecord | string

const getTranslationValue = (value: FieldValue): TranslationRecord => {
  return typeof value === 'object' && value !== null ? (value as TranslationRecord) : {}
}

const getStringValue = (value: FieldValue): string => {
  return typeof value === 'string' ? value : ''
}

export function TextsSeoManagerClient({ initialGroups }: TextsSeoManagerClientProps) {
  const [groups, setGroups] = useState<SiteConfigGroupState[]>(initialGroups)
  const [banner, setBanner] = useState<BannerState>(null)
  const [savingGroupId, setSavingGroupId] = useState<string | null>(null)

  const allFieldsCount = useMemo(() => groups.reduce((acc, group) => acc + group.fields.length, 0), [
    groups
  ])

  const updateFieldValue = useCallback(
    (groupId: string, fieldKey: string, nextValue: FieldValue) => {
      setGroups((previous) =>
        previous.map((group) => {
          if (group.id !== groupId) return group
          return {
            ...group,
            fields: group.fields.map((field) =>
              field.key === fieldKey ? { ...field, value: nextValue } : field
            )
          }
        })
      )
    },
    []
  )

  const showBanner = useCallback((next: BannerState) => {
    setBanner(next)
    if (next) {
      setTimeout(() => setBanner(null), 3200)
    }
  }, [])

  const handleSaveGroup = useCallback(
    async (groupId: string) => {
      const target = groups.find((group) => group.id === groupId)
      if (!target) return
      setSavingGroupId(groupId)
      showBanner(null)
      try {
        const response = await fetch('/api/admin/cms/site-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entries: target.fields.map((field) => ({ key: field.key, value: field.value }))
          })
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(data?.error ?? 'Impossible d\'enregistrer.')
        }
        showBanner({ type: 'success', text: 'Configuration enregistree.' })
      } catch (error) {
        showBanner({
          type: 'error',
          text: error instanceof Error ? error.message : 'Impossible d\'enregistrer.'
        })
      } finally {
        setSavingGroupId(null)
      }
    },
    [groups, showBanner]
  )

  return (
    <AdminPageShell
      title="Textes & SEO"
      description="Gerez tous les textes strategiques du site : balises, accroches et mentions."
      backHref="/admin"
      actions={<CmsPublishActions />}
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

      <section className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-4 text-xs text-slate-500">
        <p>
          {allFieldsCount} champs editables, avec previsualisation en direct cote preview. Chaque bloc
          sauvegarde reste en brouillon tant que la publication n&apos;est pas declenchee.
        </p>
      </section>

      <div className="space-y-6">
        {groups.map((group) => {
          const isSaving = savingGroupId === group.id
          return (
            <section key={group.id} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <header className="mb-6 flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{group.title}</p>
                  {group.description ? (
                    <p className="text-sm text-slate-500">{group.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveGroup(group.id)}
                  disabled={isSaving}
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition',
                    isSaving && 'opacity-60'
                  )}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSaving ? 'Enregistrement...' : 'Sauvegarder ce bloc'}
                </button>
              </header>

              <div className="space-y-5">
                {group.fields.map((field) => (
                  <FieldEditor
                    key={field.key}
                    groupId={group.id}
                    field={field}
                    onChange={updateFieldValue}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </AdminPageShell>
  )
}

type FieldEditorProps = {
  groupId: string
  field: SiteConfigFieldState
  onChange: (groupId: string, fieldKey: string, value: FieldValue) => void
}

const FieldEditor = ({ groupId, field, onChange }: FieldEditorProps) => {
  if (field.translatable) {
    return (
      <TranslatableInput
        label={field.label}
        helperText={field.helperText}
        value={getTranslationValue(field.value)}
        onChange={(value) => onChange(groupId, field.key, value)}
        multiline={field.type === 'textarea'}
        rows={field.rows ?? 4}
      />
    )
  }

  if (field.type === 'rich_text') {
    return (
      <RichTextEditor
        label={field.label}
        helperText={field.helperText}
        value={getStringValue(field.value)}
        onChange={(value) => onChange(groupId, field.key, value)}
      />
    )
  }

  if (field.type === 'textarea') {
    return (
      <div>
        <label className="text-sm font-semibold text-slate-800">{field.label}</label>
        {field.helperText ? (
          <p className="text-xs text-slate-500">{field.helperText}</p>
        ) : null}
        <textarea
          className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
          rows={field.rows ?? 4}
          value={getStringValue(field.value)}
          onChange={(event) => onChange(groupId, field.key, event.target.value)}
        />
      </div>
    )
  }

  if (field.inputMode === 'image') {
    return (
      <ImageUploader
        label={field.label}
        helperText={field.helperText}
        value={getStringValue(field.value)}
        onChange={(value) => onChange(groupId, field.key, value ?? '')}
      />
    )
  }

  return (
    <div>
      <label className="text-sm font-semibold text-slate-800">{field.label}</label>
      {field.helperText ? <p className="text-xs text-slate-500">{field.helperText}</p> : null}
      <input
        className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
        value={getStringValue(field.value)}
        onChange={(event) => onChange(groupId, field.key, event.target.value)}
      />
    </div>
  )
}
