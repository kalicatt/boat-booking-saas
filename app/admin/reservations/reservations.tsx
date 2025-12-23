'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { format } from 'date-fns'

import { AdminPageShell } from '../_components/AdminPageShell'
import { readCache, writeCache } from '@/lib/mobileCache'
import {
	VOUCHER_PARTNERS,
	type ManualPaymentState,
	buildManualPaymentPayload,
	createCheckDetails,
	createEmptyManualPaymentState,
	createVoucherDetails,
	getVoucherPartnerLabel,
	updateManualPaymentState
} from '@/lib/manualPayments'
import { CheckDetailsForm, VoucherDetailsForm } from '@/components/ManualPaymentDetails'

type FilterRange = 'day' | 'month' | 'year'

type BookingUser = {
	firstName?: string | null
	lastName?: string | null
	email?: string | null
	phone?: string | null
}

type BookingPayment = {
	provider?: string | null
	methodType?: string | null
	status?: string | null
	metadata?: Record<string, unknown> | null
}

type Booking = {
	id: string
	startTime: string
	numberOfPeople: number
	publicReference?: string | null
	adults?: number | null
	children?: number | null
	babies?: number | null
	language?: string | null
	isPaid?: boolean | null
	user?: BookingUser | null
	payments?: BookingPayment[]
}

type Toast = {
	id: number
	type: 'success' | 'warning'
	message: string
}

type ChainPreview = {
	index: number
	start: string
	end: string
	people: number
}

type ViewMarkPaidState = ManualPaymentState

type ContactOption = {
	id: string
	firstName: string | null
	lastName: string | null
	email: string | null
}

const RANGE_OPTIONS: Array<{ key: FilterRange; label: string }> = [
	{ key: 'day', label: 'Jour' },
	{ key: 'month', label: 'Mois' },
	{ key: 'year', label: 'Année' }
]

const PAYMENT_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
	{ value: '', label: 'Tous paiements' },
	{ value: 'cash', label: 'Espèces' },
	{ value: 'card', label: 'Carte' },
	{ value: 'paypal', label: 'PayPal' },
	{ value: 'applepay', label: 'Apple Pay' },
	{ value: 'googlepay', label: 'Google Pay' },
	{ value: 'voucher', label: 'ANCV / CityPass' },
	{ value: 'check', label: 'Chèque' }
]


const LANGUAGE_OPTIONS: Array<{ value: string; label: string }> = [
	{ value: 'fr', label: 'Français' },
	{ value: 'en', label: 'Anglais' },
	{ value: 'de', label: 'Allemand' },
	{ value: 'es', label: 'Espagnol' },
	{ value: 'it', label: 'Italien' }
]

const CHAIN_CAPACITY = 12
const CHAIN_INTERVAL_MIN = 30
const CHAIN_DURATION_MIN = 90

type ApiResponse = {
	data: Booking[]
	pagination?: {
		hasMore: boolean
		nextCursor: string | null
		limit: number
		count: number
	}
}

const fetcher = async (url: string): Promise<Booking[]> => {
	const response = await fetch(url, { cache: 'no-store' })
	if (!response.ok) {
		throw new Error(`Erreur ${response.status}`)
	}
	const json: unknown = await response.json()
	
	// Handle both old array format and new paginated format
	if (Array.isArray(json)) {
		return json as Booking[]
	}
	
	// New paginated response format
	if (json && typeof json === 'object' && 'data' in json) {
		const apiResponse = json as ApiResponse
		return Array.isArray(apiResponse.data) ? apiResponse.data : []
	}
	
	return []
}

const parseContacts = (input: unknown): ContactOption[] => {
	if (!Array.isArray(input)) {
		return []
	}
	return input
		.map((entry) => {
			if (!entry || typeof entry !== 'object') {
				return null
			}
			const record = entry as Record<string, unknown>
			const id = typeof record.id === 'string' ? record.id : null
			if (!id) {
				return null
			}
			return {
				id,
				firstName: typeof record.firstName === 'string' ? record.firstName : null,
				lastName: typeof record.lastName === 'string' ? record.lastName : null,
				email: typeof record.email === 'string' ? record.email : null
			}
		})
		.filter((contact): contact is ContactOption => contact !== null)
}

const toWall = (date: Date) =>
	new Date(
		Date.UTC(
			date.getUTCFullYear(),
			date.getUTCMonth(),
			date.getUTCDate(),
			date.getUTCHours(),
			date.getUTCMinutes(),
			0,
			0
		)
	)

const createDefaultFormState = () => ({
	date: format(new Date(), 'yyyy-MM-dd'),
	time: '10:00',
	adults: 2,
	children: 0,
	babies: 0,
	language: 'fr',
	firstName: '',
	lastName: '',
	email: '',
	company: '',
	phone: '',
	address: '',
	eventDate: '',
	eventTime: '',
	budget: '',
	reason: '',
	message: ''
})

const isBookingPaid = (booking: Booking) => {
	const status = booking.payments?.[0]?.status?.toUpperCase()
	if (status === 'PAID' || status === 'CAPTURED' || status === 'SUCCEEDED') {
		return true
	}
	return Boolean(booking.isPaid)
}

const describePaymentMethod = (booking: Booking) => {
	const payment = booking.payments?.[0]
	if (!payment?.provider) {
		return '—'
	}
	const method = payment.methodType ? ` (${payment.methodType})` : ''
	return `${payment.provider}${method}`
}

const getPaymentStatusInfo = (booking: Booking) => {
	const payment = booking.payments?.[0]
	const normalized = payment?.status?.toUpperCase()
	if (normalized === 'PAID' || normalized === 'CAPTURED' || normalized === 'SUCCEEDED' || booking.isPaid) {
		return { label: 'Payé', tone: 'sn-pill sn-pill--emerald' }
	}
	if (!normalized) {
		return { label: 'En attente', tone: 'sn-pill sn-pill--amber' }
	}
	return { label: payment?.status ?? '—', tone: 'sn-pill sn-pill--slate' }
}

const formatPeopleLabel = (booking: Booking) => {
	const adults = booking.adults ?? booking.numberOfPeople ?? 0
	const children = booking.children ?? 0
	const babies = booking.babies ?? 0
	return `${booking.numberOfPeople} pax • A${adults} / E${children} / B${babies}`
}

export default function ReservationsAdminPage() {
	const [range, setRange] = useState<FilterRange>('day')
	const [date, setDate] = useState(() => new Date())
	const [monthStr, setMonthStr] = useState(() => format(new Date(), 'yyyy-MM'))
	const [yearStr, setYearStr] = useState(() => String(new Date().getFullYear()))
	const [query, setQuery] = useState('')
	const [paymentFilter, setPaymentFilter] = useState('')
	const [showCreate, setShowCreate] = useState(false)
	const [createTab, setCreateTab] = useState<'normal' | 'private' | 'group' | 'contact'>('normal')
	const [creating, setCreating] = useState(false)
	const [form, setForm] = useState(createDefaultFormState)
	const [createMarkPaid, setCreateMarkPaid] = useState(false)
	const [createPayment, setCreatePayment] = useState<ViewMarkPaidState>(createEmptyManualPaymentState)
	const [selectedId, setSelectedId] = useState('')
	const [groupChain, setGroupChain] = useState(0)
	const [chainPreview, setChainPreview] = useState<ChainPreview[]>([])
	const [inheritPaymentForChain, setInheritPaymentForChain] = useState(false)
	const [toasts, setToasts] = useState<Toast[]>([])
	const [contacts, setContacts] = useState<ContactOption[]>([])
	const [selectedContactId, setSelectedContactId] = useState('')
	const [contactStatus, setContactStatus] = useState<'NEW' | 'CONTACTED' | 'CLOSED' | ''>('')
	const [showView, setShowView] = useState<Booking | null>(null)
	const [showEdit, setShowEdit] = useState<Booking | null>(null)
	const [chainCreating, setChainCreating] = useState(false)
	const [contactConverting, setContactConverting] = useState(false)
	const [chainBaseTime, setChainBaseTime] = useState('09:00')
	const [viewMarkPaid, setViewMarkPaid] = useState<ViewMarkPaidState | null>(null)
	const [markingPaid, setMarkingPaid] = useState(false)
	const [refreshing, setRefreshing] = useState(false)

	useEffect(() => {
		if (typeof window === 'undefined') {
			return undefined
		}
		const handleOnline = () => setIsOffline(false)
		const handleOffline = () => setIsOffline(true)
		window.addEventListener('online', handleOnline)
		window.addEventListener('offline', handleOffline)
		return () => {
			window.removeEventListener('online', handleOnline)
			window.removeEventListener('offline', handleOffline)
		}
	}, [])
	const [cachedBookings, setCachedBookings] = useState<Booking[] | null>(null)
	const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null)
	// Start with false to match server-side rendering, then update in useEffect
	const [isOffline, setIsOffline] = useState(false)
	const [hasMounted, setHasMounted] = useState(false)

	// Sync offline status after mount to avoid hydration mismatch
	useEffect(() => {
		setHasMounted(true)
		if (typeof navigator !== 'undefined') {
			setIsOffline(!navigator.onLine)
		}
	}, [])

	const languageOptions = useMemo(() => {
		const base = [...LANGUAGE_OPTIONS]
		if (form.language && !base.some((option) => option.value === form.language)) {
			base.push({ value: form.language, label: form.language.toUpperCase() })
		}
		return base
	}, [form.language])

	const viewStart = useMemo(() => (showView ? toWall(new Date(showView.startTime)) : null), [showView])
	const viewDateLabel = viewStart ? format(viewStart, 'dd/MM/yyyy') : ''
	const viewTimeLabel = viewStart ? format(viewStart, 'HH:mm') : ''
	const viewPaymentStatus = useMemo(() => (showView ? getPaymentStatusInfo(showView) : null), [showView])
	const viewPaymentMethodLabel = useMemo(() => (showView ? describePaymentMethod(showView) : '—'), [showView])
	const viewPeopleLabel = useMemo(() => (showView ? formatPeopleLabel(showView) : ''), [showView])
	const viewClientName = useMemo(() => {
		if (!showView) return ''
		const composed = `${showView.user?.firstName ?? 'Invité'} ${showView.user?.lastName ?? ''}`.trim()
		return composed.length > 0 ? composed : 'Invité'
	}, [showView])
	const viewClientEmail = showView?.user?.email ?? '—'
	const viewClientPhone = showView?.user?.phone ?? 'Non renseigné'

	const startISO = useMemo(() => {
		if (range === 'day') {
			const start = new Date(date)
			start.setHours(0, 0, 0, 0)
			return start.toISOString()
		}
		if (range === 'month') {
			const [y, m] = monthStr.split('-').map((value) => parseInt(value, 10))
			const start = new Date(y, m - 1, 1, 0, 0, 0, 0)
			return start.toISOString()
		}
		const yearValue = parseInt(yearStr, 10)
		const start = new Date(yearValue, 0, 1, 0, 0, 0, 0)
		return start.toISOString()
	}, [date, range, monthStr, yearStr])

	const endISO = useMemo(() => {
		if (range === 'day') {
			const end = new Date(date)
			end.setHours(23, 59, 59, 999)
			return end.toISOString()
		}
		if (range === 'month') {
			const [y, m] = monthStr.split('-').map((value) => parseInt(value, 10))
			const end = new Date(y, m, 0, 23, 59, 59, 999)
			return end.toISOString()
		}
		const yearValue = parseInt(yearStr, 10)
		const end = new Date(yearValue, 11, 31, 23, 59, 59, 999)
		return end.toISOString()
	}, [date, range, monthStr, yearStr])

	const params = new URLSearchParams({ start: startISO, end: endISO })
	if (query.trim()) {
		params.set('q', query.trim())
	}
	if (paymentFilter) {
		params.set('payment', paymentFilter)
	}

	const cacheKey = `/api/admin/reservations?${params.toString()}`
	const { data, error, isLoading, mutate } = useSWR<Booking[]>(cacheKey, fetcher, {
		refreshInterval: 60_000,
		revalidateOnFocus: true,
		revalidateOnReconnect: true
	})

	useEffect(() => {
		let active = true
		readCache<Booking[]>(cacheKey).then((stored) => {
			if (!active || !stored) return
			setCachedBookings(stored.payload)
			setCacheTimestamp(stored.timestamp)
		})
		return () => {
			active = false
		}
	}, [cacheKey])

	useEffect(() => {
		if (!data) {
			return
		}
		setCachedBookings(data)
		setCacheTimestamp(Date.now())
		void writeCache(cacheKey, data)
		if (typeof window !== 'undefined') {
			window.dispatchEvent(new CustomEvent('sn-sync', { detail: { source: 'reservations' } }))
		}
	}, [data, cacheKey])

	const bookings = useMemo(() => data ?? cachedBookings ?? [], [data, cachedBookings])
	const usingCachedData = !data && Boolean(cachedBookings?.length)
	const cacheTimeLabel = useMemo(() => {
		if (!cacheTimestamp) return ''
		try {
			return format(new Date(cacheTimestamp), 'HH:mm')
		} catch (timeError) {
			console.warn('Format heure cache impossible', timeError)
			return ''
		}
	}, [cacheTimestamp])

	const stats = useMemo(() => {
		const total = bookings.length
		const paid = bookings.filter((booking) => isBookingPaid(booking)).length
		const pending = Math.max(0, total - paid)
		const upcoming = bookings.filter((booking) => {
			if (!booking.startTime) return false
			return new Date(booking.startTime) >= new Date()
		}).length
		return { total, paid, pending, upcoming }
	}, [bookings])

	const rangeLabel = useMemo(() => {
		if (range === 'day') {
			return format(date, 'dd/MM/yyyy')
		}
		if (range === 'month') {
			return monthStr
		}
		return yearStr
	}, [range, date, monthStr, yearStr])

	const pushToast = (toast: Omit<Toast, 'id'>) => {
		setToasts((previous) => [...previous, { id: Date.now(), ...toast }])
	}

	const removeToast = (id: number) => {
		setToasts((previous) => previous.filter((toast) => toast.id !== id))
	}

	const handleForceRefresh = async () => {
		if (refreshing) return
		setRefreshing(true)
		try {
			await mutate()
			pushToast({ type: 'success', message: 'Synchronisation lancée.' })
		} catch (syncError) {
			console.error('Erreur rafraîchissement réservations', syncError)
			pushToast({ type: 'warning', message: 'Impossible de relancer le chargement.' })
		} finally {
			setRefreshing(false)
		}
	}

	const handleExportCsv = () => {
		if (!bookings.length) {
			pushToast({ type: 'warning', message: 'Aucune réservation à exporter.' })
			return
		}
		const headers = ['Date', 'Heure', 'Référence', 'Client', 'Email', 'Pax', 'Langue', 'Paiement', 'Statut Paiement']
		const rows = bookings.map((booking) => {
			const wall = toWall(new Date(booking.startTime))
			return [
				format(wall, 'yyyy-MM-dd'),
				format(wall, 'HH:mm'),
				booking.publicReference ?? '',
				`${booking.user?.firstName ?? ''} ${booking.user?.lastName ?? ''}`.trim(),
				booking.user?.email ?? '',
				String(booking.numberOfPeople ?? 0),
				booking.language ?? '',
				describePaymentMethod(booking),
				booking.payments?.[0]?.status ?? (booking.isPaid ? 'PAID' : '')
			]
		})
		const csv = [headers, ...rows]
			.map((row) =>
				row
					.map((cell) => {
						const value = String(cell ?? '').replace(/"/g, '""')
						return `"${value}"`
					})
					.join(',')
			)
			.join('\n')
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
		const url = URL.createObjectURL(blob)
		const anchor = document.createElement('a')
		const suffix =
			range === 'day' ? format(date, 'yyyy-MM-dd') : range === 'month' ? monthStr : yearStr
		anchor.href = url
		anchor.download = `reservations_${range}_${suffix}.csv`
		document.body.appendChild(anchor)
		anchor.click()
		document.body.removeChild(anchor)
		URL.revokeObjectURL(url)
	}

	const handleRowSelect = (bookingId: string) => {
		setSelectedId((current) => (current === bookingId ? '' : bookingId))
	}

	const handleDelete = async (booking: Booking) => {
		const confirmation = window.confirm('Confirmer la suppression de cette réservation ?')
		if (!confirmation) return
		try {
			const response = await fetch(`/api/bookings/${booking.id}`, {
				method: 'DELETE'
			})
			if (response.ok) {
				pushToast({ type: 'success', message: 'Réservation supprimée.' })
				mutate()
			} else {
				alert('Impossible de supprimer la réservation.')
			}
		} catch (deleteError) {
			console.error('Erreur suppression réservation', deleteError)
			alert('Erreur réseau pendant la suppression.')
		}
	}

	const handleChainPreview = () => {
		const baseBooking = bookings.find((booking) => booking.id === selectedId)
		const baseDate = baseBooking ? new Date(baseBooking.startTime) : new Date(date)
		const [hour, minute] = chainBaseTime.split(':').map((value) => parseInt(value, 10))
		baseDate.setHours(Number.isFinite(hour) ? hour : 9, Number.isFinite(minute) ? minute : 0, 0, 0)

		const previews: ChainPreview[] = []
		const chunks = Math.ceil(groupChain / CHAIN_CAPACITY)
		for (let index = 0; index < chunks; index += 1) {
			const start = new Date(baseDate.getTime() + index * CHAIN_INTERVAL_MIN * 60_000)
			const end = new Date(start.getTime() + CHAIN_DURATION_MIN * 60_000)
			const remaining = Math.max(groupChain - index * CHAIN_CAPACITY, 0)
			const people = Math.min(CHAIN_CAPACITY, remaining)
			previews.push({
				index: index + 1,
				start: format(start, 'HH:mm'),
				end: format(end, 'HH:mm'),
				people
			})
		}
		setChainPreview(previews)
	}

	const fallbackString = (value: string | null | undefined, fallback: string) => {
		const trimmed = (value ?? '').trim()
		return trimmed.length > 0 ? trimmed : fallback
	}

	const handleChainCreate = async () => {
		if (chainCreating || groupChain <= 0) return
		const base = bookings.find((booking) => booking.id === selectedId)
		if (!base) {
			pushToast({ type: 'warning', message: 'Sélectionnez une réservation comme base.' })
			return
		}
		setChainCreating(true)
		try {
			const referenceDate = new Date(base.startTime)
			const [hour, minute] = chainBaseTime.split(':').map((value) => parseInt(value, 10))
			referenceDate.setHours(Number.isFinite(hour) ? hour : 9, Number.isFinite(minute) ? minute : 0, 0, 0)
			const paymentSource = inheritPaymentForChain ? base.payments?.[0] : undefined
			const safeFirstName = fallbackString(base.user?.firstName, 'Client')
			const safeLastName = fallbackString(base.user?.lastName, 'Mystère')
			const safeEmail = fallbackString(base.user?.email, 'override@sweetnarcisse.local')
			const safePhoneValue = fallbackString(base.user?.phone ?? '', '')

			const payload = {
				date: format(referenceDate, 'yyyy-MM-dd'),
				time: format(referenceDate, 'HH:mm'),
				adults: base.numberOfPeople ?? base.adults ?? groupChain,
				children: 0,
				babies: 0,
				language: base.language ?? 'fr',
				userDetails: {
					firstName: safeFirstName,
					lastName: safeLastName,
					email: safeEmail,
					phone: safePhoneValue.length > 0 ? safePhoneValue : undefined
				},
				isStaffOverride: true,
				groupChain,
				inheritPaymentForChain,
				paymentMethod: paymentSource
					? {
							provider: paymentSource.provider ?? '',
							methodType: paymentSource.methodType ?? undefined
						}
					: undefined
			}

			const response = await fetch('/api/bookings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			})

			if (!response.ok) {
				pushToast({ type: 'warning', message: 'Création de chaîne impossible.' })
				return
			}

			const json = await response.json()
			const created = Array.isArray(json.chainCreated) ? json.chainCreated.length : 0
			const overlaps = Array.isArray(json.overlaps) ? json.overlaps.length : 0
			if (created > 0) {
				pushToast({
					type: 'success',
					message: `Chaîne créée (${created} créneaux, ${overlaps} conflit${overlaps > 1 ? 's' : ''}).`
				})
			} else {
				pushToast({
					type: 'warning',
					message: `Aucun créneau créé (${overlaps} conflit${overlaps > 1 ? 's' : ''}).`
				})
			}
			mutate()
		} catch (chainError) {
			console.error('Erreur création chaîne', chainError)
			pushToast({ type: 'warning', message: 'Erreur réseau pendant la création.' })
		} finally {
			setChainCreating(false)
		}
	}

	const actions = (
		<div className="flex flex-wrap gap-2">
			<Link
				href="/admin"
				className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-blue-400 hover:text-blue-600"
			>
				← Retour menu
			</Link>
			<button
				type="button"
				onClick={() => setShowCreate(true)}
				className="sn-btn-primary"
			>
				+ Créer
			</button>
		</div>
	)

	const closeCreateModal = () => {
		setShowCreate(false)
		setCreateTab('normal')
		setForm(createDefaultFormState())
		setCreateMarkPaid(false)
		setCreatePayment(createEmptyManualPaymentState())
		setSelectedContactId('')
		setContacts([])
		setContactStatus('')
		setContactConverting(false)
	}

	const closeViewModal = () => {
		setShowView(null)
		setViewMarkPaid(null)
		setMarkingPaid(false)
	}

	const handleContactStatusChange = async (status: 'NEW' | 'CONTACTED' | 'CLOSED' | '') => {
		setContactStatus(status)
		const suffix = status ? `?status=${status}` : ''
		try {
			const response = await fetch(`/api/admin/contacts${suffix}`)
			const json: unknown = await response.json()
			setContacts(parseContacts(json))
		} catch (contactsError) {
			console.error('Erreur chargement contacts', contactsError)
			pushToast({ type: 'warning', message: 'Impossible de charger les contacts.' })
		}
	}

	return (
		<AdminPageShell
			title="Gestion des réservations"
			description="Visualisez, filtrez et mettez à jour les réservations confirmées ou en attente."
			actions={actions}
		>
			<div className="space-y-6">
				<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					<div className="flex flex-wrap items-center justify-between gap-4 mb-4">
						<div>
							<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Période sélectionnée</p>
							<p className="text-lg font-semibold text-slate-900 mt-0.5">{rangeLabel}</p>
						</div>
						<div className="flex flex-wrap gap-3">
							<StatCard 
								label="Total" 
								value={stats.total} 
								tone="bg-slate-50 text-slate-900 border-l-4 border-l-slate-800" 
							/>
							<StatCard 
								label="Payées" 
								value={stats.paid} 
								tone="bg-emerald-50 text-emerald-700 border-l-4 border-l-emerald-600" 
							/>
							<StatCard 
								label="En attente" 
								value={stats.pending} 
								tone="bg-amber-50 text-amber-700 border-l-4 border-l-amber-600" 
							/>
							<StatCard 
								label="À venir" 
								value={stats.upcoming} 
								tone="bg-sky-50 text-sky-700 border-l-4 border-l-sky-600" 
							/>
						</div>
					</div>
					{/* Only render status pills after mount to avoid hydration mismatch */}
					{hasMounted && (isOffline || cacheTimeLabel || usingCachedData || (!!error && !data)) && (
						<div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
							{isOffline ? (
								<span className="sn-pill sn-pill--amber">
									<span className="sn-pill__dot animate-pulse" aria-hidden="true" />
									Mode hors ligne
								</span>
							) : null}
							{!isOffline && cacheTimeLabel ? (
								<span className="sn-pill sn-pill--emerald">
									<span className="sn-pill__dot" aria-hidden="true" />
									Synchro {cacheTimeLabel}
								</span>
							) : null}
							{usingCachedData ? (
								<span className="sn-pill sn-pill--slate">
									<span className="sn-pill__dot" aria-hidden="true" />
									Cache local
								</span>
							) : null}
							{error && !data ? (
								<span className="sn-pill sn-pill--rose">
									<span className="sn-pill__dot" aria-hidden="true" />
									Réseau indisponible
								</span>
							) : null}
						</div>
					)}
					<div className="mt-4 flex flex-wrap gap-2">
						<Link href="/admin/today" className="sn-quick-action">
							Scanner billets
						</Link>
						<button
							type="button"
							onClick={handleForceRefresh}
							disabled={refreshing}
							className="sn-quick-action sn-quick-action--primary"
						>
							{refreshing ? 'Synchronisation…' : 'Relancer la synchro'}
						</button>
						<Link href="/admin/settings" className="sn-quick-action">
							Santé serveur
						</Link>
					</div>
					<ul className="mt-4 space-y-1 text-xs text-slate-500">
						<li>• Sélectionnez une ligne pour préparer une chaîne ou ouvrir les actions rapides.</li>
						<li>• L’option « Hériter du paiement » copie le fournisseur et le type sans valider le règlement.</li>
						<li>• Utilisez « Privatisation » pour bloquer totalement la capacité d’un créneau.</li>
					</ul>
				</section>

				<section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<span className="text-sm font-semibold text-slate-700">Période de filtrage</span>
						<div className="flex flex-wrap items-center gap-2">
							{RANGE_OPTIONS.map((option) => {
								const isActive = range === option.key
								return (
									<button
										key={option.key}
										type="button"
										onClick={() => setRange(option.key)}
										className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
											isActive
												? 'border-slate-800 bg-slate-800 text-white shadow-sm'
												: 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
										}`}
									>
										{option.label}
									</button>
								)
							})}
						</div>
					</div>

					<div className="flex flex-wrap items-end gap-3">
						{range === 'day' && (
							<label className="flex flex-col gap-1">
								<span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</span>
								<input
									type="date"
									value={format(date, 'yyyy-MM-dd')}
									onChange={(event) => {
										const next = new Date(event.target.value)
										if (Number.isNaN(next.getTime())) return
										setDate(next)
									}}
									className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
								/>
							</label>
						)}
						{range === 'month' && (
							<label className="flex flex-col gap-1">
								<span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mois</span>
								<input
									type="month"
									value={monthStr}
									onChange={(event) => setMonthStr(event.target.value)}
									className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
								/>
							</label>
						)}
						{range === 'year' && (
							<label className="flex flex-col gap-1">
								<span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Année</span>
								<input
									type="number"
									min={2000}
									max={2100}
									value={yearStr}
									onChange={(event) => setYearStr(event.target.value)}
									className="w-24 rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
								/>
							</label>
						)}
						<label className="flex flex-col gap-1">
							<span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rechercher</span>
							<input
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder="Nom, email, réf..."
								className="w-48 rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
							/>
						</label>
						<label className="flex flex-col gap-1">
							<span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Paiement</span>
							<select
								value={paymentFilter}
								onChange={(event) => setPaymentFilter(event.target.value)}
								className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
							>
								{PAYMENT_FILTER_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</label>
						<button
							type="button"
							onClick={() => {
								setQuery('')
								setPaymentFilter('')
								setRange('day')
								const today = new Date()
								setDate(today)
								setMonthStr(format(today, 'yyyy-MM'))
								setYearStr(String(today.getFullYear()))
							}}
							className="ml-auto rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:bg-slate-50"
						>
							Réinitialiser
						</button>
					</div>
				</section>

				<div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
					<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
						<div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
							<h2 className="text-sm font-semibold text-slate-700">Réservations ({bookings.length})</h2>
							<button
								type="button"
								onClick={handleExportCsv}
								className="rounded border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
							>
								Export CSV
							</button>
						</div>
						{isLoading && (
							<div className="rounded-xl border border-slate-200 bg-white p-8">
								<div className="flex flex-col items-center justify-center gap-4">
									<div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800"></div>
									<p className="text-sm font-medium text-slate-600">Chargement des réservations…</p>
									<div className="space-y-3 w-full max-w-2xl">
										<div className="h-4 bg-slate-100 rounded animate-pulse"></div>
										<div className="h-4 bg-slate-100 rounded animate-pulse w-5/6"></div>
										<div className="h-4 bg-slate-100 rounded animate-pulse w-4/6"></div>
									</div>
								</div>
							</div>
						)}
						{error && !isLoading && (
							<div className="rounded-xl border border-rose-200 bg-rose-50 p-8">
								<div className="flex flex-col items-center justify-center gap-4">
									<div className="text-4xl">⚠️</div>
									<div className="text-center">
										<p className="text-sm font-semibold text-rose-900">Impossible de charger les réservations</p>
										<p className="text-xs text-rose-700 mt-1">Vérifiez votre connexion et réessayez</p>
									</div>
									<button
										type="button"
										onClick={handleForceRefresh}
										disabled={refreshing}
										className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold transition disabled:opacity-50"
									>
										{refreshing ? 'Réessai...' : 'Réessayer'}
									</button>
								</div>
							</div>
						)}
						{!isLoading && !error && bookings.length === 0 && (
							<div className="rounded-xl border border-slate-200 bg-slate-50 p-12">
								<div className="flex flex-col items-center justify-center gap-4">
									<div className="text-6xl opacity-50">📍</div>
									<div className="text-center">
										<p className="text-base font-semibold text-slate-700">Aucune réservation trouvée</p>
										<p className="text-sm text-slate-500 mt-1">Modifiez vos filtres ou sélectionnez une autre période</p>
									</div>
									<button
										type="button"
										onClick={() => {
											setQuery('')
											setPaymentFilter('')
										}}
										className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition text-sm"
									>
										Réinitialiser les filtres
									</button>
								</div>
							</div>
						)}
						{!isLoading && !error && bookings.length > 0 && (
							<div className="overflow-x-auto rounded-lg border border-slate-200">
								<table className="min-w-full table-fixed text-sm">
									<thead className="bg-slate-50 text-left">
										<tr className="border-b border-slate-200">
											<th className="w-28 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Date</th>
											<th className="w-28 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Réf.</th>
											<th className="w-20 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Heure</th>
											<th className="w-48 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Client</th>
											<th className="w-40 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Détails</th>
											<th className="w-40 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Paiement</th>
											<th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Actions</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-100 bg-white">
										{bookings.map((booking, index) => {
											const isSelected = selectedId === booking.id
											const paymentStatus = getPaymentStatusInfo(booking)
											const isEven = index % 2 === 0

											return (
												<tr
													key={booking.id}
													onClick={() => handleRowSelect(booking.id)}
													className={`cursor-pointer transition-colors ${
														isSelected 
															? 'bg-slate-100 hover:bg-slate-100' 
															: isEven
															? 'bg-white hover:bg-slate-50'
															: 'bg-slate-50/30 hover:bg-slate-50'
													}`}
												>
													<td className="px-4 py-4 align-top font-mono text-xs text-slate-500">
														{format(toWall(new Date(booking.startTime)), 'dd/MM/yyyy')}
													</td>
													<td className="px-4 py-4 align-top font-mono text-xs text-slate-500">
														{booking.publicReference ?? '—'}
													</td>
													<td className="px-4 py-4 align-top font-mono text-xs text-slate-500">
														{format(toWall(new Date(booking.startTime)), 'HH:mm')}
													</td>
													<td className="px-4 py-4 align-top">
														<p className="font-semibold text-slate-800">
															{(booking.user?.firstName ?? 'Invité')}{' '}
															{booking.user?.lastName ?? ''}
														</p>
														{booking.user?.email && (
															<p className="text-xs text-slate-500">{booking.user.email}</p>
														)}
													</td>
													<td className="px-4 py-4 align-top">
														<p className="text-xs text-slate-600">{formatPeopleLabel(booking)}</p>
														{booking.language && (
															<span className="mt-1 sn-pill sn-pill--ghost">
																<span className="sn-pill__dot" aria-hidden="true" />
																{booking.language.toUpperCase()}
															</span>
														)}
													</td>
													<td className="px-4 py-4 align-top">
														<p className="text-xs text-slate-600">{describePaymentMethod(booking)}</p>
														<span className={`mt-2 ${paymentStatus.tone}`}>
															<span className="sn-pill__dot" aria-hidden="true" />
															{paymentStatus.label}
														</span>
													</td>
													<td className="px-4 py-4 align-top">
														<div className="flex flex-wrap gap-2">
															<button
																type="button"
																onClick={(event) => {
																	event.stopPropagation()
																	setShowView(booking)
																	setViewMarkPaid(null)
																}}
																className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300"
																title="Voir les détails"
															>
																👁️ Voir
															</button>
															<button
																type="button"
																onClick={(event) => {
																	event.stopPropagation()
																	setShowEdit(booking)
																}}
																className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300"
																title="Modifier"
															>
																✏️ Modifier
															</button>
															<button
																type="button"
																onClick={(event) => {
																	event.stopPropagation()
																	handleDelete(booking)
																}}
																className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 hover:border-rose-300"
																title="Supprimer"
															>
																🗑️ Supprimer
															</button>
														</div>
													</td>
												</tr>
											)
										})}
									</tbody>
								</table>
							</div>
						)}
					</section>

					<section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
						<div>
							<h2 className="text-sm font-semibold text-slate-700">Chaîne &amp; répartitions</h2>
							<p className="mt-1 text-xs text-slate-500">
								Sélectionnez la réservation de référence puis définissez la taille du groupe.
							</p>
						</div>
						<div className="flex flex-wrap items-end gap-3">
							<label className="flex flex-col gap-1">
								<span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
									Taille groupe
								</span>
								<input
									type="number"
									min={0}
									value={groupChain}
									onChange={(event) => setGroupChain(parseInt(event.target.value || '0', 10) || 0)}
									className="w-32 rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
								/>
							</label>
							<label className="flex flex-col gap-1">
								<span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
									Heure de base
								</span>
								<input
									type="time"
									value={chainBaseTime}
									onChange={(event) => setChainBaseTime(event.target.value)}
									className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
								/>
							</label>
							<button
								type="button"
								onClick={handleChainPreview}
								className="rounded border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
							>
								Prévisualiser
							</button>
						</div>

						{chainPreview.length === 0 ? (
							<div className="rounded border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">
								Prévisualisez pour obtenir la répartition des créneaux.
							</div>
						) : (
							<ul className="space-y-2 text-sm text-slate-600">
								{chainPreview.map((preview) => (
									<li
										key={preview.index}
										className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 px-3 py-2"
									>
										<span className="font-medium">
											#{preview.index} • {preview.start} → {preview.end}
										</span>
										<span className="text-xs text-slate-500">{preview.people} pax</span>
									</li>
								))}
								<li className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs font-semibold text-slate-600">
									<span>Total prévu</span>
									<span>
										{chainPreview.reduce((accumulator, preview) => accumulator + preview.people, 0)} pax
									</span>
								</li>
							</ul>
						)}

						<label className="flex items-start gap-2 rounded border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
							<input
								type="checkbox"
								checked={inheritPaymentForChain}
								onChange={(event) => setInheritPaymentForChain(event.target.checked)}
								className="mt-0.5"
							/>
							<span>
								Hériter des métadonnées de paiement
								<span className="block text-[11px] text-slate-500">
									Copie le fournisseur et le type de paiement seulement. Les règlements restent à confirmer.
								</span>
							</span>
						</label>

						<button
							type="button"
							disabled={chainCreating || groupChain <= 0}
							onClick={handleChainCreate}
							className="w-full rounded border border-emerald-600 bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{chainCreating ? 'Création…' : 'Créer la chaîne'}
						</button>
					</section>
				</div>
			</div>

			{toasts.length > 0 && (
				<div className="fixed bottom-4 right-4 z-50 space-y-2">
					{toasts.map((toast) => (
						<div
							key={toast.id}
							className={`flex items-center justify-between gap-3 rounded-lg px-4 py-2 text-sm shadow ${
								toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-sky-600 text-white'
							}`}
						>
							<span>{toast.message}</span>
							<button
								type="button"
								onClick={() => removeToast(toast.id)}
								className="text-white/80 transition hover:text-white"
							>
								✕
							</button>
						</div>
					))}
				</div>
			)}

			{showCreate && (
				<div
					className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4"
					onClick={closeCreateModal}
				>
					<div
						className="sn-card max-h-[90vh] w-full max-w-xl overflow-y-auto"
						onClick={(event) => event.stopPropagation()}
					>
						<div className="sn-modal-header">
							<div>
								<h3 className="sn-modal-title">Créer une réservation</h3>
								<p className="sn-modal-subtitle">Planifiez un départ classique, une privatisation sur-mesure ou transformez une demande de groupe.</p>
							</div>
							<button type="button" onClick={closeCreateModal} className="sn-modal-close" aria-label="Fermer le modal">
								✕
							</button>
						</div>

						<div className="sn-form-tabs">
							<button
								type="button"
								onClick={() => setCreateTab('normal')}
								className={`sn-form-tab ${createTab === 'normal' ? 'is-active' : ''}`}
							>
								Normale
							</button>
							<button
								type="button"
								onClick={() => setCreateTab('private')}
								className={`sn-form-tab ${createTab === 'private' ? 'is-active' : ''}`}
							>
								Privatisation
							</button>
							<button
								type="button"
								onClick={() => setCreateTab('group')}
								className={`sn-form-tab ${createTab === 'group' ? 'is-active' : ''}`}
							>
								Groupe
							</button>
							<button
								type="button"
								onClick={async () => {
									setCreateTab('contact')
									await handleContactStatusChange(contactStatus)
								}}
								className={`sn-form-tab ${createTab === 'contact' ? 'is-active' : ''}`}
							>
								Depuis contact
							</button>
						</div>

						<div className="sn-modal-body">
							<section className="sn-form-section">
								<div className="sn-form-section-header">
									<span className="sn-form-section-icon" aria-hidden="true">🛥️</span>
									<div>
										<p className="sn-form-section-heading">Départ &amp; capacité</p>
										<p className="sn-form-section-copy">Choisissez la date, l&apos;heure et répartissez adultes, enfants et bébés.</p>
									</div>
								</div>
								<div className="sn-form-grid sn-form-grid-2">
									<label className="sn-field">
										<span className="sn-label">Date</span>
										<input
											type="date"
											value={form.date}
											onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
											className="sn-input"
										/>
									</label>
									<label className="sn-field">
										<span className="sn-label">Heure de départ</span>
										<input
											type="time"
											value={form.time}
											onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
											className="sn-input"
										/>
									</label>
								</div>
								<div className="sn-form-grid sn-form-grid-3">
									<label className="sn-field">
										<span className="sn-label">Adultes</span>
										<input
											type="number"
											min={0}
											value={form.adults}
											onChange={(event) =>
												setForm((current) => ({ ...current, adults: parseInt(event.target.value || '0', 10) || 0 }))
											}
											className="sn-input"
										/>
									</label>
									<label className="sn-field">
										<span className="sn-label">Enfants 4-10</span>
										<input
											type="number"
											min={0}
											value={form.children}
											onChange={(event) =>
												setForm((current) => ({
													...current,
													children: parseInt(event.target.value || '0', 10) || 0
												}))
											}
											className="sn-input"
										/>
									</label>
									<label className="sn-field">
										<span className="sn-label">Bébés 0-3</span>
										<input
											type="number"
											min={0}
											value={form.babies}
											onChange={(event) =>
												setForm((current) => ({ ...current, babies: parseInt(event.target.value || '0', 10) || 0 }))
											}
											className="sn-input"
										/>
									</label>
								</div>
							</section>

							<section className="sn-form-section">
								<div className="sn-form-section-header">
									<span className="sn-form-section-icon" aria-hidden="true">👤</span>
									<div>
										<p className="sn-form-section-heading">Client principal</p>
										<p className="sn-form-section-copy">Les confirmations, rappels et factures seront envoyés à ce contact.</p>
									</div>
								</div>
								<div className="sn-form-grid sn-form-grid-2">
									<label className="sn-field">
										<span className="sn-label">Prénom</span>
										<input
											value={form.firstName}
											onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
											className="sn-input"
										/>
									</label>
									<label className="sn-field">
										<span className="sn-label">Nom</span>
										<input
											value={form.lastName}
											onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
											className="sn-input"
										/>
									</label>
									<label className="sn-field sm:col-span-2">
										<span className="sn-label">Langue</span>
										<select
											value={form.language}
											onChange={(event) => setForm((current) => ({ ...current, language: event.target.value }))}
											className="sn-input"
										>
											{languageOptions.map((option) => (
												<option key={option.value} value={option.value}>
													{option.label}
												</option>
											))}
										</select>
										<span className="sn-hint">Langue utilisée pour les échanges et l&apos;accueil.</span>
									</label>
								</div>
								<label className="sn-field">
									<span className="sn-label">Email</span>
									<input
										type="email"
										value={form.email}
										onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
										className="sn-input"
									/>
								</label>
							</section>

							<section className="sn-form-section sn-form-section--muted">
								<div className="sn-form-section-header">
									<span className="sn-form-section-icon" aria-hidden="true">💶</span>
									<div>
										<p className="sn-form-section-heading">Encaissement immédiat</p>
										<p className="sn-form-section-copy">Renseignez les détails si la réservation est réglée à la création.</p>
									</div>
								</div>
								<label className="sn-field">
									<span className="inline-flex items-center gap-2">
										<input
											type="checkbox"
											checked={createMarkPaid}
											onChange={(event) => {
												const checked = event.target.checked
												setCreateMarkPaid(checked)
												if (!checked) {
													setCreatePayment(createEmptyManualPaymentState())
												}
											}}
											disabled={creating}
										/>
										<span className="sn-label">Marquer la réservation comme payée</span>
									</span>
									<span className="sn-hint">Activez pour enregistrer directement un paiement manuel (espèces, voucher, chèque...).</span>
								</label>
								{createMarkPaid && (
									<div className="sn-form-grid sn-form-grid-2">
										<label className="sn-field">
											<span className="sn-label">Moyen de paiement</span>
											<select
												value={createPayment.provider}
												onChange={(event) => {
													const provider = event.target.value
													setCreatePayment((current) => updateManualPaymentState(provider, current))
												}}
												className="sn-input"
												disabled={creating}
											>
												<option value="">Sélectionner…</option>
												<option value="cash">Espèces</option>
												<option value="card">Carte</option>
												<option value="paypal">PayPal</option>
												<option value="applepay">Apple Pay</option>
												<option value="googlepay">Google Pay</option>
												<option value="voucher">Voucher / Hôtel</option>
												<option value="check">Chèque</option>
											</select>
											<span className="sn-hint">Indiquez le support encaissé.</span>
										</label>
									</div>
								)}
								{createMarkPaid && createPayment.provider === 'voucher' && (
									<VoucherDetailsForm
										value={createPayment.voucherDetails ?? createVoucherDetails()}
										disabled={creating}
										onChange={(details, methodType) =>
											setCreatePayment((current) => ({
												...current,
												methodType: methodType ?? current.methodType,
												voucherDetails: details
											}))
										}
									/>
								)}
								{createMarkPaid && createPayment.provider === 'check' && (
									<CheckDetailsForm
										value={createPayment.checkDetails ?? createCheckDetails()}
										disabled={creating}
										onChange={(details) => setCreatePayment((current) => ({ ...current, checkDetails: details }))}
									/>
								)}
							</section>

							{createTab === 'group' && (
								<section className="sn-form-section sn-form-section--muted">
									<div className="sn-form-section-header">
										<span className="sn-form-section-icon" aria-hidden="true">👥</span>
										<div>
											<p className="sn-form-section-heading">Détails groupe</p>
											<p className="sn-form-section-copy">Précisez l&apos;organisation et les informations logistiques à partager avec l&apos;équipe.</p>
										</div>
									</div>
									<div className="sn-form-grid sn-form-grid-2">
										<label className="sn-field">
											<span className="sn-label">Organisation</span>
											<input
												value={form.company}
												onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
												placeholder="Nom de l&apos;organisation"
												className="sn-input"
											/>
										</label>
										<label className="sn-field">
											<span className="sn-label">Téléphone</span>
											<input
												type="tel"
												value={form.phone}
												onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
												placeholder="Ex : +33 6 12 34 56 78"
												className="sn-input"
											/>
										</label>
									</div>
									<label className="sn-field">
										<span className="sn-label">Adresse</span>
										<input
											value={form.address}
											onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
											placeholder="Adresse de facturation ou lieu de prise en charge"
											className="sn-input"
										/>
									</label>
									<div className="sn-form-grid sn-form-grid-3">
										<label className="sn-field">
											<span className="sn-label">Date de l&apos;évènement</span>
											<input
												type="date"
												value={form.eventDate}
												onChange={(event) => setForm((current) => ({ ...current, eventDate: event.target.value }))}
												className="sn-input"
											/>
										</label>
										<label className="sn-field">
											<span className="sn-label">Heure souhaitée</span>
											<input
												type="time"
												value={form.eventTime}
												onChange={(event) => setForm((current) => ({ ...current, eventTime: event.target.value }))}
												className="sn-input"
											/>
										</label>
										<label className="sn-field">
											<span className="sn-label">Budget estimé</span>
											<input
												value={form.budget}
												onChange={(event) => setForm((current) => ({ ...current, budget: event.target.value }))}
												placeholder="Ex : 1500 €"
												className="sn-input"
											/>
										</label>
									</div>
									<label className="sn-field">
										<span className="sn-label">Type d&apos;évènement</span>
										<input
											value={form.reason}
											onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
											placeholder="Séminaire, EVJF, anniversaire..."
											className="sn-input"
										/>
									</label>
									<label className="sn-field">
										<span className="sn-label">Notes supplémentaires</span>
										<textarea
											rows={3}
											value={form.message}
											onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
											placeholder="Consignes logistiques, demandes spécifiques, allergies..."
											className="sn-input sn-textarea"
										/>
									</label>
								</section>
							)}

							{createTab === 'private' && (
								<div className="sn-form-info">
									Privatisation : le créneau sélectionné est bloqué pour un client unique et retire la capacité publique du planning.
								</div>
							)}

							{createTab === 'contact' && (
								<section className="sn-form-section sn-form-section--muted">
									<div className="sn-form-section-header">
										<span className="sn-form-section-icon" aria-hidden="true">📥</span>
										<div>
											<p className="sn-form-section-heading">Convertir un contact</p>
											<p className="sn-form-section-copy">Filtrez vos demandes puis transformez-les en réservation interne.</p>
										</div>
									</div>
									<div className="sn-form-grid sn-form-grid-2">
										<label className="sn-field">
											<span className="sn-label">Statut</span>
											<select
												value={contactStatus}
												onChange={async (event) => {
													const value = event.target.value as 'NEW' | 'CONTACTED' | 'CLOSED' | ''
													await handleContactStatusChange(value)
												}}
												className="sn-input"
											>
												<option value="">Tous les statuts</option>
												<option value="NEW">Nouveaux</option>
												<option value="CONTACTED">Contactés</option>
												<option value="CLOSED">Fermés</option>
											</select>
										</label>
										<label className="sn-field">
											<span className="sn-label">Contact</span>
											<select
												value={selectedContactId}
												onChange={(event) => setSelectedContactId(event.target.value)}
												className="sn-input"
											>
												<option value="">Sélectionner…</option>
												{contacts.map((contact) => (
													<option key={contact.id} value={contact.id}>
														{contact.firstName ?? ''} {contact.lastName ?? ''} • {contact.email ?? ''}
													</option>
												))}
											</select>
										</label>
									</div>
									<button
										type="button"
										disabled={contactConverting || !selectedContactId}
										onClick={async () => {
											setContactConverting(true)
											try {
												const response = await fetch('/api/admin/contacts', {
													method: 'POST',
													headers: { 'Content-Type': 'application/json' },
													body: JSON.stringify({ id: selectedContactId, kind: 'group' })
												})
												if (response.ok) {
													pushToast({ type: 'success', message: 'Contact converti en réservation.' })
													closeCreateModal()
													mutate()
												} else {
													pushToast({ type: 'warning', message: 'Conversion impossible.' })
												}
											} catch (convertError) {
												console.error('Erreur conversion contact', convertError)
												pushToast({ type: 'warning', message: 'Erreur réseau pendant la conversion.' })
											} finally {
												setContactConverting(false)
											}
										}}
										className="sn-btn-primary w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
									>
										{contactConverting ? 'Conversion…' : 'Convertir'}
									</button>
								</section>
							)}
						</div>

						<div className="sn-modal-footer">
							<button type="button" onClick={closeCreateModal} className="sn-btn-secondary">
								Annuler
							</button>
							<button
								type="button"
								disabled={creating}
								onClick={async () => {
									setCreating(true)
									const basePhone = fallbackString(form.phone, '')
									const basePayload = {
										date: form.date,
										time: form.time,
										adults: form.adults,
										children: form.children,
										babies: form.babies,
										language: form.language,
										userDetails: {
											firstName: fallbackString(form.firstName, 'Client'),
											lastName: fallbackString(form.lastName, 'Mystère'),
											email: fallbackString(form.email, 'override@sweetnarcisse.local'),
											phone: basePhone.length > 0 ? basePhone : undefined
										},
										isStaffOverride: true
									}

									try {
										let response: Response
										if (createTab === 'private') {
											response = await fetch('/api/bookings', {
												method: 'POST',
												headers: { 'Content-Type': 'application/json' },
												body: JSON.stringify({ ...basePayload, private: true })
											})
										} else if (createTab === 'group') {
											const extended = {
												...basePayload,
												groupChain: form.adults,
												message: form.message,
												groupDetails: {
													company: form.company ?? '',
													address: form.address ?? '',
													phone: form.phone ?? '',
													eventDate: form.eventDate ?? '',
													eventTime: form.eventTime ?? '',
													budget: form.budget ?? '',
													reason: form.reason ?? ''
												}
											}
											response = await fetch('/api/bookings', {
												method: 'POST',
												headers: { 'Content-Type': 'application/json' },
												body: JSON.stringify(extended)
											})
										} else {
											response = await fetch('/api/bookings', {
												method: 'POST',
												headers: { 'Content-Type': 'application/json' },
												body: JSON.stringify(basePayload)
											})
										}

										if (response.ok) {
											pushToast({ type: 'success', message: 'Réservation créée.' })
											closeCreateModal()
											mutate()
										} else {
											pushToast({ type: 'warning', message: 'Création impossible.' })
										}
									} catch (createError) {
										console.error('Erreur création réservation', createError)
										pushToast({ type: 'warning', message: 'Erreur réseau pendant la création.' })
									} finally {
										setCreating(false)
									}
								}}
								className="sn-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
							>
								{creating ? 'Création…' : 'Créer'}
							</button>
						</div>
					</div>
				</div>
			)}

			{showView && (
				<div
					className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4"
					onClick={closeViewModal}
				>
					<div
						className="sn-card max-h-[90vh] w-full max-w-xl overflow-y-auto"
						onClick={(event) => event.stopPropagation()}
					>
						<div className="sn-modal-header">
							<div>
								<h3 className="sn-modal-title">Détails réservation</h3>
								<p className="sn-modal-subtitle">Synthèse de la réservation et état du paiement.</p>
							</div>
							<button type="button" onClick={closeViewModal} className="sn-modal-close" aria-label="Fermer la fiche">
								✕
							</button>
						</div>

						<div className="sn-modal-body">
							<section className="sn-form-section">
								<div className="sn-form-section-header">
									<span className="sn-form-section-icon" aria-hidden="true">📅</span>
									<div>
										<p className="sn-form-section-heading">Départ</p>
										<p className="sn-form-section-copy">Créneau sélectionné et composition du groupe.</p>
									</div>
								</div>
								<div className="sn-form-grid sn-form-grid-2">
									<div className="sn-field">
										<span className="sn-label">Date</span>
										<span className="text-base font-semibold text-slate-900">{viewDateLabel || '—'}</span>
										{viewTimeLabel && <span className="sn-hint">Départ à {viewTimeLabel}</span>}
									</div>
									<div className="sn-field">
										<span className="sn-label">Référence</span>
										<span className="text-base font-semibold text-slate-900">{showView.publicReference ?? '—'}</span>
										<span className="sn-hint">Affichée sur les confirmations client.</span>
									</div>
									<div className="sn-field">
										<span className="sn-label">Participants</span>
										<span className="text-base font-semibold text-slate-900">{viewPeopleLabel || '—'}</span>
									</div>
									<div className="sn-field">
										<span className="sn-label">Langue</span>
										{showView.language ? (
											<span className="sn-pill sn-pill--ghost">
												<span className="sn-pill__dot" aria-hidden="true" />
												{showView.language.toUpperCase()}
											</span>
										) : (
											<span className="text-base font-semibold text-slate-900">—</span>
										)}
									</div>
								</div>
							</section>

							<section className="sn-form-section">
								<div className="sn-form-section-header">
									<span className="sn-form-section-icon" aria-hidden="true">👤</span>
									<div>
										<p className="sn-form-section-heading">Client principal</p>
										<p className="sn-form-section-copy">Coordonnées pour prévenir ou confirmer l&apos;embarquement.</p>
									</div>
								</div>
								<div className="sn-form-grid sn-form-grid-2">
									<div className="sn-field">
										<span className="sn-label">Client</span>
										<span className="text-base font-semibold text-slate-900">{viewClientName}</span>
									</div>
									<div className="sn-field">
										<span className="sn-label">Email</span>
										<span className="text-base font-semibold text-slate-900">{viewClientEmail}</span>
									</div>
									<div className="sn-field sm:col-span-2">
										<span className="sn-label">Téléphone</span>
										<span className="text-base font-semibold text-slate-900">{viewClientPhone}</span>
										<span className="sn-hint">Utilisez ce numéro pour prévenir des imprévus.</span>
									</div>
								</div>
							</section>

							<section className="sn-form-section">
								<div className="sn-form-section-header">
									<span className="sn-form-section-icon" aria-hidden="true">💳</span>
									<div>
										<p className="sn-form-section-heading">Paiement</p>
										<p className="sn-form-section-copy">Statut actuel de la réservation.</p>
									</div>
								</div>
								<div className="sn-form-grid sn-form-grid-2">
									<div className="sn-field">
										<span className="sn-label">Statut</span>
										<span className={viewPaymentStatus?.tone ?? 'sn-pill sn-pill--slate'}>
											<span className="sn-pill__dot" aria-hidden="true" />
											{viewPaymentStatus?.label ?? '—'}
										</span>
									</div>
									<div className="sn-field">
										<span className="sn-label">Moyen</span>
										<span className="text-base font-semibold text-slate-900">{viewPaymentMethodLabel}</span>
									</div>
								</div>
							</section>

							{viewMarkPaid && (
								<section className="sn-form-section sn-form-section--muted">
									<div className="sn-form-section-header">
										<span className="sn-form-section-icon" aria-hidden="true">💶</span>
										<div>
											<p className="sn-form-section-heading">Confirmer le paiement</p>
											<p className="sn-form-section-copy">Enregistrez le règlement pour maintenir le suivi comptable.</p>
										</div>
									</div>
									<div className="sn-form-grid sn-form-grid-2">
										<label className="sn-field">
											<span className="sn-label">Moyen de paiement</span>
											<select
												value={viewMarkPaid.provider}
												onChange={(event) => {
													const provider = event.target.value
													setViewMarkPaid((current) => updateManualPaymentState(provider, current))
												}}
												className="sn-input"
												disabled={markingPaid}
											>
												<option value="">Sélectionner…</option>
												<option value="cash">Espèces</option>
												<option value="card">Carte</option>
												<option value="paypal">PayPal</option>
												<option value="applepay">Apple Pay</option>
												<option value="googlepay">Google Pay</option>
												<option value="voucher">Voucher / Hôtel</option>
												<option value="check">Chèque</option>
											</select>
											<span className="sn-hint">Indiquez la source du règlement enregistré.</span>
										</label>
									</div>
									{viewMarkPaid.provider === 'voucher' && (
										<VoucherDetailsForm
											value={viewMarkPaid.voucherDetails ?? createVoucherDetails()}
											disabled={markingPaid}
											onChange={(details, methodType) =>
												setViewMarkPaid((current) =>
													current
														? {
															...current,
															methodType: methodType ?? current.methodType,
															voucherDetails: details
														}
														: current
												)
											}
										/>
									)}
									{viewMarkPaid.provider === 'check' && (
										<CheckDetailsForm
											value={viewMarkPaid.checkDetails ?? createCheckDetails()}
											disabled={markingPaid}
											onChange={(details) =>
												setViewMarkPaid((current) =>
													current
														? {
															...current,
															checkDetails: details
														}
														: current
												)
											}
										/>
									)}
									<div className="mt-4 flex flex-wrap justify-end gap-2">
										<button
											type="button"
											onClick={() => {
												setViewMarkPaid(null)
												setMarkingPaid(false)
											}}
											className="sn-btn-secondary"
											disabled={markingPaid}
										>
											Annuler
										</button>
										<button
											type="button"
											disabled={markingPaid}
											onClick={async () => {
											if (!viewMarkPaid) {
												pushToast({ type: 'warning', message: 'Sélectionnez un moyen de paiement.' })
												return
											}
											const buildResult = buildManualPaymentPayload(viewMarkPaid)
											if (!buildResult.ok || !buildResult.paymentMethod) {
												pushToast({ type: 'warning', message: buildResult.error ?? 'Sélectionnez un moyen de paiement.' })
												return
											}
											setMarkingPaid(true)
											try {
												const payload: Record<string, unknown> = {
													newIsPaid: true,
													paymentMethod: buildResult.paymentMethod
												}
													const response = await fetch(`/api/bookings/${showView.id}`, {
														method: 'PATCH',
														headers: { 'Content-Type': 'application/json' },
														body: JSON.stringify(payload)
													})
													if (response.ok) {
														pushToast({ type: 'success', message: 'Réservation marquée comme payée.' })
														mutate()
														closeViewModal()
													} else {
														pushToast({ type: 'warning', message: 'Échec de la mise à jour du paiement.' })
													}
												} catch (updateError) {
													console.error('Erreur mise à jour paiement', updateError)
													pushToast({ type: 'warning', message: 'Erreur réseau pendant la mise à jour du paiement.' })
												} finally {
													setMarkingPaid(false)
												}
											}}
											className="sn-btn-primary"
										>
											{markingPaid ? 'Validation…' : 'Valider'}
										</button>
									</div>
								</section>
							)}
						</div>

						<div className="sn-modal-footer">
							<button type="button" onClick={closeViewModal} className="sn-btn-secondary">
								Fermer
							</button>
							{!viewMarkPaid && (
								<button
									type="button"
									onClick={() => {
									setViewMarkPaid(createEmptyManualPaymentState())
										setMarkingPaid(false)
									}}
									className="sn-btn-primary"
								>
									Mettre à jour le paiement
								</button>
							)}
						</div>
					</div>
				</div>
			)}

			{showEdit && (
				<div
					className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4"
					onClick={() => setShowEdit(null)}
				>
					<div
						className="sn-card max-h-[90vh] w-full max-w-xl overflow-y-auto"
						onClick={(event) => event.stopPropagation()}
					>
						<div className="sn-modal-header">
							<div>
								<h3 className="sn-modal-title">Modifier la réservation</h3>
								<p className="sn-modal-subtitle">
									Mettez à jour le créneau, les effectifs ou le paiement.
								</p>
							</div>
							<button
								type="button"
								onClick={() => setShowEdit(null)}
								className="sn-modal-close"
								aria-label="Fermer la modification"
							>
								✕
							</button>
						</div>
						<EditForm
							booking={showEdit}
							onClose={() => setShowEdit(null)}
							onSaved={() => {
								setShowEdit(null)
								pushToast({ type: 'success', message: 'Réservation modifiée.' })
								mutate()
							}}
						/>
					</div>
				</div>
			)}
		</AdminPageShell>
	)
}

function EditForm({
	booking,
	onClose,
	onSaved
}: {
	booking: Booking
	onClose: () => void
	onSaved: () => void
}) {
	const [state, setState] = useState(() => ({
		date: format(toWall(new Date(booking.startTime)), 'yyyy-MM-dd'),
		time: format(toWall(new Date(booking.startTime)), 'HH:mm'),
		adults: booking.adults ?? booking.numberOfPeople ?? 0,
		children: booking.children ?? 0,
		babies: booking.babies ?? 0,
		language: booking.language ?? 'fr',
		isPaid: isBookingPaid(booking),
		paymentProvider: booking.payments?.[0]?.provider ?? '',
		paymentMethodType: booking.payments?.[0]?.methodType ?? ''
	}))
	const [saving, setSaving] = useState(false)
	const languageOptions = useMemo(() => {
		const base = [...LANGUAGE_OPTIONS]
		if (state.language && !base.some((option) => option.value === state.language)) {
			base.push({ value: state.language, label: state.language.toUpperCase() })
		}
		return base
	}, [state.language])

	const handleSave = async () => {
		if (state.isPaid && !state.paymentProvider) {
			alert('Sélectionnez un moyen de paiement.')
			return
		}
		const confirmation = window.confirm('Confirmer la modification de cette réservation ?')
		if (!confirmation) return
		const payload: Record<string, unknown> = {
			adults: state.adults,
			children: state.children,
			babies: state.babies,
			language: state.language,
			newIsPaid: state.isPaid
		}
		if (state.date && state.time) {
			payload.date = state.date
			payload.time = state.time
		}
		if (state.isPaid && state.paymentProvider) {
			const methodType =
				state.paymentProvider === 'voucher'
					? state.paymentMethodType || undefined
					: state.paymentProvider === 'check'
						? 'Chèque'
						: undefined
			payload.paymentMethod = {
				provider: state.paymentProvider,
				methodType
			}
		}
		setSaving(true)
		try {
			const response = await fetch(`/api/bookings/${booking.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			})
			if (response.ok) {
				onSaved()
			} else {
				alert('Impossible de modifier la réservation.')
			}
		} catch (editError) {
			console.error('Erreur modification réservation', editError)
			alert('Erreur réseau pendant la modification.')
		} finally {
			setSaving(false)
		}
	}

	return (
		<>
			<div className="sn-modal-body">
				<section className="sn-form-section">
					<div className="sn-form-section-header">
						<span className="sn-form-section-icon" aria-hidden="true">🛥️</span>
						<div>
							<p className="sn-form-section-heading">Départ &amp; capacité</p>
							<p className="sn-form-section-copy">Ajustez le créneau et la composition du groupe.</p>
						</div>
					</div>
					<div className="sn-form-grid sn-form-grid-2">
						<label className="sn-field">
							<span className="sn-label">Date</span>
							<input
								type="date"
								value={state.date}
								onChange={(event) => setState((current) => ({ ...current, date: event.target.value }))}
								className="sn-input"
							/>
						</label>
						<label className="sn-field">
							<span className="sn-label">Heure</span>
							<input
								type="time"
								value={state.time}
								onChange={(event) => setState((current) => ({ ...current, time: event.target.value }))}
								className="sn-input"
							/>
						</label>
					</div>
					<div className="sn-form-grid sn-form-grid-3">
						<label className="sn-field">
							<span className="sn-label">Adultes</span>
							<input
								type="number"
								min={0}
								value={state.adults}
								onChange={(event) =>
									setState((current) => ({
										...current,
										adults: parseInt(event.target.value || '0', 10) || 0
									}))
								}
								className="sn-input"
							/>
						</label>
						<label className="sn-field">
							<span className="sn-label">Enfants</span>
							<input
								type="number"
								min={0}
								value={state.children}
								onChange={(event) =>
									setState((current) => ({
										...current,
										children: parseInt(event.target.value || '0', 10) || 0
									}))
								}
								className="sn-input"
							/>
						</label>
						<label className="sn-field">
							<span className="sn-label">Bébés</span>
							<input
								type="number"
								min={0}
								value={state.babies}
								onChange={(event) =>
									setState((current) => ({
										...current,
										babies: parseInt(event.target.value || '0', 10) || 0
									}))
								}
								className="sn-input"
							/>
						</label>
					</div>
					<label className="sn-field">
						<span className="sn-label">Langue</span>
						<select
							value={state.language}
							onChange={(event) => setState((current) => ({ ...current, language: event.target.value }))}
							className="sn-input"
						>
							{languageOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</label>
				</section>

				<section className="sn-form-section">
					<div className="sn-form-section-header">
						<span className="sn-form-section-icon" aria-hidden="true">💳</span>
						<div>
							<p className="sn-form-section-heading">Paiement</p>
							<p className="sn-form-section-copy">Indiquez le statut et la source du règlement.</p>
						</div>
					</div>
					<label className="sn-field">
						<span className="sn-label">Statut</span>
						<span className="inline-flex items-center gap-2">
							<input
								type="checkbox"
								checked={state.isPaid}
								onChange={(event) => setState((current) => ({ ...current, isPaid: event.target.checked }))}
								className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
							/>
							<span className="font-semibold text-slate-700">Réglé</span>
						</span>
						<span className="sn-hint">Cochez dès que la caisse confirme le paiement.</span>
					</label>

					{state.isPaid ? (
						<div className="sn-form-grid sn-form-grid-2">
							<label className="sn-field">
								<span className="sn-label">Moyen de paiement</span>
								<select
									value={state.paymentProvider}
									onChange={(event) => {
										const nextProvider = event.target.value
										setState((current) => ({
											...current,
											paymentProvider: nextProvider,
											paymentMethodType:
												nextProvider === 'voucher'
													? current.paymentMethodType || getVoucherPartnerLabel(VOUCHER_PARTNERS[0]?.id ?? '')
													: ''
										}))
									}}
									className="sn-input"
									disabled={saving}
								>
									<option value="">Sélectionner…</option>
									<option value="cash">Espèces</option>
									<option value="card">Carte</option>
									<option value="paypal">PayPal</option>
									<option value="applepay">Apple Pay</option>
									<option value="googlepay">Google Pay</option>
									<option value="voucher">Voucher / Hôtel</option>
									<option value="check">Chèque</option>
								</select>
								<span className="sn-hint">Renseignez le canal utilisé pour encaisser.</span>
							</label>
							{state.paymentProvider === 'voucher' && (
								<label className="sn-field">
									<span className="sn-label">Type de bon</span>
									<select
										value={state.paymentMethodType}
										onChange={(event) =>
											setState((current) => ({ ...current, paymentMethodType: event.target.value }))
										}
										className="sn-input"
										disabled={saving}
									>
										<option value="">Sélectionner…</option>
										{VOUCHER_PARTNERS.map((option) => (
											<option key={option.id} value={option.label}>
												{option.label}
											</option>
										))}
									</select>
									<span className="sn-hint">Précisez le support reçu.</span>
								</label>
							)}
						</div>
					) : (
						<div className="sn-form-info">
							<p className="sn-form-info-title">Paiement en attente</p>
							<p className="sn-form-info-hint">Confirmez le règlement dès réception pour clôturer la réservation.</p>
						</div>
					)}
				</section>
			</div>
			<div className="sn-modal-footer">
				<button type="button" onClick={onClose} className="sn-btn-secondary" disabled={saving}>
					Annuler
				</button>
				<button
					type="button"
					onClick={handleSave}
					className="sn-btn-primary"
					disabled={saving}
				>
					{saving ? 'Enregistrement…' : 'Enregistrer'}
				</button>
			</div>
		</>
	)
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
	return (
		<div className={`sn-stat-card ${tone}`}>
			<span className="sn-stat-card__label">{label}</span>
			<span className="sn-stat-card__value">{value}</span>
		</div>
	)
}




