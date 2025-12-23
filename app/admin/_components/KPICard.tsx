'use client'

import { ReactNode } from 'react'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: string
  trend?: {
    value: number
    label: string
  }
  action?: {
    label: string
    onClick: () => void
  }
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

const variantStyles = {
  default: 'bg-white border-slate-200',
  success: 'bg-emerald-50 border-emerald-200',
  warning: 'bg-amber-50 border-amber-200',
  danger: 'bg-red-50 border-red-200',
  info: 'bg-sky-50 border-sky-200',
}

const iconBgStyles = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-sky-100 text-sky-700',
}

export function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  action,
  variant = 'default' 
}: KPICardProps) {
  return (
    <div className={`p-5 rounded-xl border ${variantStyles[variant]} shadow-sm hover:shadow-md transition`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${iconBgStyles[variant]}`}>
            {icon}
          </div>
        )}
      </div>

      {/* Trend or action */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        {trend && (
          <div className="flex items-center gap-1 text-xs">
            <span className={trend.value >= 0 ? 'text-emerald-600' : 'text-red-600'}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
            <span className="text-slate-500">{trend.label}</span>
          </div>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className="text-xs font-medium text-sky-600 hover:text-sky-700 transition"
          >
            {action.label} →
          </button>
        )}
      </div>
    </div>
  )
}

interface KPIGridProps {
  children: ReactNode
}

export function KPIGrid({ children }: KPIGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {children}
    </div>
  )
}
