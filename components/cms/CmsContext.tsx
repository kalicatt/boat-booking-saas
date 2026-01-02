'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

type CmsContextType = {
  isEditMode: boolean
  toggleEditMode: () => void
  isAdmin: boolean
}

const CmsContext = createContext<CmsContextType>({
  isEditMode: false,
  toggleEditMode: () => {},
  isAdmin: false
})

export function useCms() {
  return useContext(CmsContext)
}

export function CmsProvider({ children, initialRole }: { children: React.ReactNode, initialRole?: string }) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Check role from props or fetch if needed.
    // For simplicity, we trust the server passed role via props (safe because actions double check)
    // OR we check client session.
    // Let's assume passed prop for SSR or check session client side.
    const check = () => {
        if (initialRole && ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN'].includes(initialRole)) {
            setIsAdmin(true)
        }
    }
    check()
  }, [initialRole])

  const toggleEditMode = () => setIsEditMode(!isEditMode)

  return (
    <CmsContext.Provider value={{ isEditMode, toggleEditMode, isAdmin }}>
      {children}
      {isAdmin && <AdminToolbar />}
    </CmsContext.Provider>
  )
}

function AdminToolbar() {
  const { isEditMode, toggleEditMode } = useCms()
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex gap-2">
      <button
        onClick={toggleEditMode}
        className={`px-4 py-2 rounded-full shadow-xl font-bold transition-all ${
          isEditMode
            ? 'bg-sky-500 text-white ring-4 ring-sky-200'
            : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
        }`}
      >
        {isEditMode ? '✏️ Editing ON' : '👁️ Edit Mode'}
      </button>
    </div>
  )
}
