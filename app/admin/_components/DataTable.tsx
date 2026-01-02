'use client'

import { ReactNode } from 'react'

interface DataTableColumn<T> {
  key: string
  label: string
  render?: (row: T) => ReactNode
  sortable?: boolean
  width?: string
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  actions?: (row: T) => ReactNode
  emptyMessage?: string
  loading?: boolean
}

export function DataTable<T extends Record<string, unknown>>({ 
  columns, 
  data, 
  onRowClick, 
  actions,
  emptyMessage = 'Aucune donnée',
  loading = false
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
        <div className="inline-block w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-3 text-sm text-slate-600">Chargement...</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
        <p className="text-slate-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider"
                  style={{ width: col.width }}
                >
                  <div className="flex items-center gap-2">
                    {col.label}
                    {col.sortable && (
                      <button className="text-slate-400 hover:text-slate-600">
                        ↕
                      </button>
                    )}
                  </div>
                </th>
              ))}
              {actions && (
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick?.(row)}
                className={`hover:bg-slate-50 transition ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-slate-900">
                    {(() => {
                      if (col.render) return col.render(row)
                      const value = (row as Record<string, unknown>)[col.key]
                      if (value == null) return ''
                      if (typeof value === 'string' || typeof value === 'number') return value
                      return String(value)
                    })()}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3 text-sm text-right">
                    <div className="flex items-center justify-end gap-2">
                      {actions(row)}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Table controls component
interface TableControlsProps {
  searchValue?: string
  onSearchChange?: (value: string) => void
  filters?: ReactNode
  actions?: ReactNode
}

export function TableControls({ searchValue, onSearchChange, filters, actions }: TableControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
      <div className="flex-1 flex items-center gap-3">
        {onSearchChange && (
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchValue || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher..."
              className="w-full px-4 py-2 pl-10 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              🔍
            </span>
          </div>
        )}
        {filters}
      </div>
      <div className="flex items-center gap-2">
        {actions}
      </div>
    </div>
  )
}
