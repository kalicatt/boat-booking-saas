import type { Prisma } from '@prisma/client'

export type BoardingStatus = 'CONFIRMED' | 'EMBARQUED' | 'NO_SHOW'
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED'

export interface BookingPaymentDto {
  id: string
  provider: string
  methodType: string | null
  amount: number
  currency: string
  status: string
  createdAt: string
}

export interface BookingDetailsUser {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: string
}

export interface BookingDetails {
  id: string
  title: string
  start: Date
  end: Date
  resourceId: number
  clientName: string
  peopleCount: number
  adults: number
  children: number
  babies: number
  totalOnBoat: number
  boatCapacity: number
  user: BookingDetailsUser
  language: string
  totalPrice: number | null
  checkinStatus: BoardingStatus
  isPaid: boolean
  status: BookingStatus
  message?: string | null
  payments?: BookingPaymentDto[]
}

export type PaymentMarkState = { provider: string; methodType?: string; cashGiven?: string } | null

export const STATUS_THEME: Record<string, { label: string; background: string; backgroundSoft: string; border: string; text: string; badge: string }> = {
  CONFIRMED: {
    label: 'Confirmée',
    background: '#2563eb',
    backgroundSoft: '#1d4ed8',
    border: '#93c5fd',
    text: '#f8fafc',
    badge: 'sn-pill sn-pill--blue'
  },
  EMBARQUED: {
    label: 'Embarquée',
    background: '#0f766e',
    backgroundSoft: '#047857',
    border: '#6ee7b7',
    text: '#ecfdf5',
    badge: 'sn-pill sn-pill--emerald'
  },
  NO_SHOW: {
    label: 'No-show',
    background: '#f97316',
    backgroundSoft: '#ea580c',
    border: '#fcd34d',
    text: '#fff7ed',
    badge: 'sn-pill sn-pill--amber'
  },
  PENDING: {
    label: 'En attente',
    background: '#64748b',
    backgroundSoft: '#475569',
    border: '#cbd5f5',
    text: '#f8fafc',
    badge: 'sn-pill sn-pill--slate'
  },
  CANCELLED: {
    label: 'Annulée',
    background: '#dc2626',
    backgroundSoft: '#b91c1c',
    border: '#fecaca',
    text: '#fef2f2',
    badge: 'sn-pill sn-pill--rose'
  },
  DEFAULT: {
    label: 'Autre',
    background: '#334155',
    backgroundSoft: '#1e293b',
    border: '#cbd5f5',
    text: '#e2e8f0',
    badge: 'sn-pill sn-pill--slate'
  }
}

export const BOOKING_STATUS_THEME: Record<'PENDING' | 'CONFIRMED' | 'CANCELLED', { label: string; className: string }> = {
  PENDING: { label: 'En attente', className: 'sn-pill sn-pill--amber' },
  CONFIRMED: { label: 'Confirmée', className: 'sn-pill sn-pill--emerald' },
  CANCELLED: { label: 'Annulée', className: 'sn-pill sn-pill--rose' }
}

export const LANGUAGE_FLAGS: Record<string, string> = {
  FR: '🇫🇷',
  EN: '🇬🇧',
  DE: '🇩🇪',
  ES: '🇪🇸',
  IT: '🇮🇹',
  PT: '🇵🇹',
  NL: '🇳🇱'
}

export type AdminBookingWithRelations = Prisma.BookingGetPayload<{
  include: {
    boat: { select: { capacity: true } }
    user: {
      select: {
        firstName: true
        lastName: true
        email: true
        phone: true
        role: true
      }
    }
    payments: {
      select: {
        id: true
        provider: true
        methodType: true
        amount: true
        currency: true
        status: true
        createdAt: true
      }
    }
  }
}>

export type AdminBookingDto = Omit<AdminBookingWithRelations, 'startTime' | 'endTime' | 'payments'> & {
  startTime: string
  endTime: string
  payments: Array<
    Omit<AdminBookingWithRelations['payments'][number], 'createdAt'> & { createdAt: string }
  >
}
