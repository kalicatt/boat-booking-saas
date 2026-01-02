'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { updateSiteConfigAction, updateHeroSlideAction } from '@/lib/actions/cms'

// --- TYPES ---

export type CmsChange = {
  key: string // unique identifier for the change (e.g. "site-config:home.hero.title" or "hero-slide:123:title")
  type: 'site-config' | 'hero-slide'
  idOrKey: string
  field?: string
  value: string
  locale: string
}

type CmsContextType = {
  isEditMode: boolean
  toggleEditMode: () => void
  isAdmin: boolean
  registerChange: (change: CmsChange) => void
  pendingChanges: Map<string, CmsChange>
  saveAll: () => Promise<void>
  isSaving: boolean
}

const CmsContext = createContext<CmsContextType>({
  isEditMode: false,
  toggleEditMode: () => {},
  isAdmin: false,
  registerChange: () => {},
  pendingChanges: new Map(),
  saveAll: async () => {},
  isSaving: false
})

export function useCms() {
  return useContext(CmsContext)
}

// --- PROVIDER ---

export function CmsProvider({ children, initialRole }: { children: React.ReactNode, initialRole?: string }) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<Map<string, CmsChange>>(new Map())
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (initialRole && ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN'].includes(initialRole)) {
      setIsAdmin(true)
    }
  }, [initialRole])

  const toggleEditMode = () => setIsEditMode(!isEditMode)

  const registerChange = useCallback((change: CmsChange) => {
    setPendingChanges((prev) => {
      const next = new Map(prev)
      next.set(change.key, change)
      return next
    })
  }, [])

  const saveAll = async () => {
    if (pendingChanges.size === 0) return
    setIsSaving(true)

    try {
      // Process all changes in parallel or sequentially
      // For simplicity/safety, let's map them to promises
      const promises = Array.from(pendingChanges.values()).map(async (change) => {
        if (change.type === 'site-config') {
          return updateSiteConfigAction(change.idOrKey, change.value, change.locale)
        } else if (change.type === 'hero-slide') {
          return updateHeroSlideAction(change.idOrKey, change.field as 'title'|'subtitle', change.value, change.locale)
        }
      })

      const results = await Promise.all(promises)

      const failed = results.filter(r => !r?.success)
      if (failed.length > 0) {
        console.error('Some updates failed', failed)
        alert(`Failed to save ${failed.length} changes. Check console.`)
        // In a real app, we might keep failed changes in the Map
      } else {
        // Success
        setPendingChanges(new Map()) // Clear
      }
    } catch (e) {
      console.error('Global Save Error', e)
      alert('Error saving changes.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <CmsContext.Provider value={{
      isEditMode,
      toggleEditMode,
      isAdmin,
      registerChange,
      pendingChanges,
      saveAll,
      isSaving
    }}>
      {children}
      {isAdmin && <AdminToolbar />}
    </CmsContext.Provider>
  )
}

// --- TOOLBAR UI ---

function AdminToolbar() {
  const { isEditMode, toggleEditMode, pendingChanges, saveAll, isSaving } = useCms()
  const count = pendingChanges.size

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3 pointer-events-none">

      {/* Save Button (Only visible if changes exist) */}
      <div className={`transition-all duration-300 pointer-events-auto ${count > 0 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <button
          onClick={saveAll}
          disabled={isSaving}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
        >
          {isSaving ? (
            <>⏳ Saving...</>
          ) : (
            <>💾 Save {count} Changes</>
          )}
        </button>
      </div>

      {/* Edit Toggle */}
      <div className="pointer-events-auto">
        <button
          onClick={toggleEditMode}
          className={`px-5 py-3 rounded-full shadow-xl font-bold transition-all border-2 ${
            isEditMode
              ? 'bg-sky-500 text-white border-sky-400'
              : 'bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800'
          }`}
        >
          {isEditMode ? '✏️ Editing Active' : '👁️ Enable Visual Editor'}
        </button>
      </div>
    </div>
  )
}
