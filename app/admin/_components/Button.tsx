'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
  children: ReactNode
}

const variantStyles = {
  primary: 'bg-sky-600 text-white hover:bg-sky-700 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  ghost: 'text-slate-700 hover:bg-slate-100',
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  icon, 
  children, 
  disabled,
  className = '',
  ...props 
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-lg transition
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {loading && (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {!loading && icon}
      {children}
    </button>
  )
}

// Dropdown button
interface DropdownButtonProps {
  label: string
  items: Array<{
    label: string
    onClick: () => void
    icon?: string
    danger?: boolean
  }>
}

export function DropdownButton({ label, items }: DropdownButtonProps) {
  return (
    <div className="relative group">
      <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition">
        {label}
        <span className="text-xs">▼</span>
      </button>
      
      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition z-50">
        {items.map((item, idx) => (
          <button
            key={idx}
            onClick={item.onClick}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition flex items-center gap-2 ${
              item.danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700'
            }`}
          >
            {item.icon && <span>{item.icon}</span>}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// Icon button
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label?: string
  variant?: 'default' | 'danger' | 'success'
}

export function IconButton({ icon, label, variant = 'default', className = '', ...props }: IconButtonProps) {
  const variantClasses = {
    default: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
    danger: 'text-red-600 hover:text-red-700 hover:bg-red-50',
    success: 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50',
  }

  return (
    <button
      {...props}
      title={label}
      className={`p-2 rounded-lg transition ${variantClasses[variant]} ${className}`}
    >
      {icon}
    </button>
  )
}
