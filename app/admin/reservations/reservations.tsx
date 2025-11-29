'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { format } from 'date-fns'

import { AdminPageShell } from '../_components/AdminPageShell'

type FilterRange = 'day' | 'month' | 'year'

type BookingUser = {
	firstName?: string | null
	lastName?: string | null
	email?: string | null
}

type BookingPayment = {
	provider?: string | null
	methodType?: string | null
	status?: string | null
}

type Booking = {
	id: string
	startTime: string
	numberOfPeople: number
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

type ViewMarkPaidState = {
	provider: string
	methodType?: string
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
	{ value: 'voucher', label: 'ANCV / CityPass' }
]

const CHAIN_CAPACITY = 12
const CHAIN_INTERVAL_MIN = 30
const CHAIN_DURATION_MIN = 90

const fetcher = async (url: string): Promise<Booking[]> => {
	const response = await fetch(url, { cache: 'no-store' })
	if (!response.ok) {
		throw new Error(`Erreur ${response.status}`)
	}
	return response.json() as Promise<Booking[]>
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
		return { label: 'Payé', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
	}
	if (!normalized) {
		return { label: 'En attente', tone: 'border-amber-200 bg-amber-50 text-amber-700' }
	}
	return { label: payment?.status ?? '—', tone: 'border-slate-200 bg-slate-100 text-slate-600' }
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
	const [selectedId, setSelectedId] = useState('')
	const [groupChain, setGroupChain] = useState(0)
	const [chainPreview, setChainPreview] = useState<ChainPreview[]>([])
	const [inheritPaymentForChain, setInheritPaymentForChain] = useState(false)
	const [toasts, setToasts] = useState<Toast[]>([])
	const [contacts, setContacts] = useState<any[]>([])
	const [selectedContactId, setSelectedContactId] = useState('')
	const [contactStatus, setContactStatus] = useState<'NEW' | 'CONTACTED' | 'CLOSED' | ''>('')
	const [showView, setShowView] = useState<Booking | null>(null)
	const [showEdit, setShowEdit] = useState<Booking | null>(null)
	const [chainCreating, setChainCreating] = useState(false)
	const [contactConverting, setContactConverting] = useState(false)
	const [chainBaseTime, setChainBaseTime] = useState('09:00')
	const [viewMarkPaid, setViewMarkPaid] = useState<ViewMarkPaidState | null>(null)

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

	const { data, error, isLoading, mutate } = useSWR<Booking[]>(`/api/admin/reservations?${params.toString()}`, fetcher)
	const bookings = data ?? []

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

	const handleExportCsv = () => {
		if (!bookings.length) {
			pushToast({ type: 'warning', message: 'Aucune réservation à exporter.' })
			return
		}
		const headers = ['Date', 'Heure', 'Client', 'Email', 'Pax', 'Langue', 'Paiement', 'Statut Paiement']
		const rows = bookings.map((booking) => {
			const wall = toWall(new Date(booking.startTime))
			return [
				format(wall, 'yyyy-MM-dd'),
				format(wall, 'HH:mm'),
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
			const response = await fetch(`/api/bookings/${booking.id}`, { method: 'DELETE' })
			if (!response.ok) {
				pushToast({ type: 'warning', message: 'Suppression impossible.' })
				return
			}
			pushToast({ type: 'success', message: 'Réservation supprimée.' })
			mutate()
		} catch (deleteError) {
			console.error('Erreur suppression réservation', deleteError)
			pushToast({ type: 'warning', message: 'Erreur réseau pendant la suppression.' })
		}
	}

	const handleChainPreview = () => {
		if (groupChain <= 0) {
			setChainPreview([])
			return
		}
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

			const payload = {
				date: format(referenceDate, 'yyyy-MM-dd'),
				time: format(referenceDate, 'HH:mm'),
				adults: base.numberOfPeople ?? base.adults ?? groupChain,
				children: 0,
				babies: 0,
				language: base.language ?? 'fr',
				userDetails: {
					firstName: base.user?.firstName ?? '',
					lastName: base.user?.lastName ?? '',
					email: base.user?.email ?? ''
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
		setSelectedContactId('')
		setContacts([])
		setContactStatus('')
		setContactConverting(false)
	}

	const closeViewModal = () => {
		setShowView(null)
		setViewMarkPaid(null)
	}

	const handleContactStatusChange = async (status: 'NEW' | 'CONTACTED' | 'CLOSED' | '') => {
		setContactStatus(status)
		const suffix = status ? `?status=${status}` : ''
		try {
			const response = await fetch(`/api/admin/contacts${suffix}`)
			const json = await response.json()
			setContacts(Array.isArray(json) ? json : [])
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
				<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
					<div className="flex flex-wrap items-center gap-4">
						<div>
							<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Période</p>
							<p className="text-sm text-slate-700">{rangeLabel}</p>
						</div>
						<div className="flex flex-wrap gap-3">
							<StatCard label="Total" value={stats.total} tone="bg-slate-900 text-white" />
							<StatCard label="Payées" value={stats.paid} tone="bg-emerald-100 text-emerald-700" />
							<StatCard label="En attente" value={stats.pending} tone="bg-amber-100 text-amber-700" />
							<StatCard label="À venir" value={stats.upcoming} tone="bg-blue-100 text-blue-700" />
						</div>
					</div>
					<ul className="mt-4 space-y-1 text-xs text-slate-500">
						<li>• Sélectionnez une ligne pour préparer une chaîne ou ouvrir les actions rapides.</li>
						<li>• L’option « Hériter du paiement » copie le fournisseur et le type sans valider le règlement.</li>
						<li>• Utilisez « Privatisation » pour bloquer totalement la capacité d’un créneau.</li>
					</ul>
				</section>

				<section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plage</span>
						{RANGE_OPTIONS.map((option) => (
							<button
								key={option.key}
								type="button"
								onClick={() => setRange(option.key)}
								className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
									range === option.key
										? 'border-blue-500 bg-blue-50 text-blue-600 shadow'
										: 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'
								}`}
							>
								{option.label}
							</button>
						))}
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
								placeholder="Nom, email, ref..."
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
							<div className="px-4 py-10 text-center text-sm text-slate-500">
								Chargement des réservations…
							</div>
						)}
						{error && !isLoading && (
							<div className="px-4 py-10 text-center text-sm text-rose-600">
								Impossible de charger les réservations.
							</div>
						)}
						{!isLoading && !error && bookings.length === 0 && (
							<div className="px-4 py-10 text-center text-sm text-slate-400">
								Aucun résultat pour les filtres sélectionnés.
							</div>
						)}
						{!isLoading && !error && bookings.length > 0 && (
							<div className="overflow-x-auto">
								<table className="min-w-full table-fixed text-sm">
									<thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
										<tr>
											<th className="w-28 px-4 py-3">Date</th>
											<th className="w-20 px-4 py-3">Heure</th>
											<th className="w-48 px-4 py-3">Client</th>
											<th className="w-40 px-4 py-3">Détails</th>
											<th className="w-40 px-4 py-3">Paiement</th>
											<th className="px-4 py-3">Actions</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-100">
										{bookings.map((booking) => {
											const isSelected = selectedId === booking.id
											const paymentStatus = getPaymentStatusInfo(booking)

											return (
												<tr
													key={booking.id}
													onClick={() => handleRowSelect(booking.id)}
													className={`cursor-pointer bg-white transition hover:bg-slate-50 ${
														isSelected ? 'bg-blue-50/70' : ''
													}`}
												>
													<td className="px-4 py-4 align-top font-mono text-xs text-slate-500">
														{format(toWall(new Date(booking.startTime)), 'dd/MM/yyyy')}
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
															<span className="mt-1 inline-flex rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
																{booking.language}
															</span>
														)}
													</td>
													<td className="px-4 py-4 align-top">
														<p className="text-xs text-slate-600">{describePaymentMethod(booking)}</p>
														<span
															className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${paymentStatus.tone}`}
														>
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
																className="rounded border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
															>
																Voir
															</button>
															<button
																type="button"
																onClick={(event) => {
																	event.stopPropagation()
																	setShowEdit(booking)
																}}
																className="rounded border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
															>
																Modifier
															</button>
															<button
																type="button"
																onClick={(event) => {
																	event.stopPropagation()
																	handleDelete(booking)
																}}
																className="rounded border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
															>
																Supprimer
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
						<div className="flex items-center justify-between border-b border-slate-100 pb-3">
							<h3 className="text-sm font-semibold text-slate-800">Créer une réservation</h3>
							<button
								type="button"
								onClick={closeCreateModal}
								className="text-lg text-slate-400 transition hover:text-slate-600"
							>
								✕
							</button>
						</div>

						<div className="mt-3 flex flex-wrap gap-2">
							<button
								type="button"
								onClick={() => setCreateTab('normal')}
								className={`rounded border px-3 py-1 text-xs font-semibold ${
									createTab === 'normal' ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-slate-200'
								}`}
							>
								Normale
							</button>
							<button
								type="button"
								onClick={() => setCreateTab('private')}
								className={`rounded border px-3 py-1 text-xs font-semibold ${
									createTab === 'private' ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-slate-200'
								}`}
							>
								Privatisation
							</button>
							<button
								type="button"
								onClick={() => setCreateTab('group')}
								className={`rounded border px-3 py-1 text-xs font-semibold ${
									createTab === 'group' ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-slate-200'
								}`}
							>
								Groupe
							</button>
							<button
								type="button"
								onClick={async () => {
									setCreateTab('contact')
									await handleContactStatusChange(contactStatus)
								}}
								className={`rounded border px-3 py-1 text-xs font-semibold ${
									createTab === 'contact' ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-slate-200'
								}`}
							>
								Depuis contact
							</button>
						</div>

						<div className="mt-4 space-y-3">
							<div className="grid grid-cols-2 gap-2">
								<input
									value={form.date}
									onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
									className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
									placeholder="Date (YYYY-MM-DD)"
								/>
								<input
									value={form.time}
									onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
									className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
									placeholder="Heure (HH:mm)"
								/>
							</div>
							<div className="grid grid-cols-3 gap-2">
								<input
									type="number"
									value={form.adults}
									onChange={(event) =>
										setForm((current) => ({ ...current, adults: parseInt(event.target.value || '0', 10) || 0 }))
									}
									className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
									placeholder="Adultes"
								/>
								<input
									type="number"
									value={form.children}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											children: parseInt(event.target.value || '0', 10) || 0
										}))
									}
									className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
									placeholder="Enfants"
								/>
								<input
									type="number"
									value={form.babies}
									onChange={(event) =>
										setForm((current) => ({ ...current, babies: parseInt(event.target.value || '0', 10) || 0 }))
									}
									className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
									placeholder="Bébés"
								/>
							</div>
							<input
								value={form.language}
								onChange={(event) => setForm((current) => ({ ...current, language: event.target.value }))}
								className="w-full rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
								placeholder="Langue (fr/en/de/...)"
							/>
							<div className="grid grid-cols-2 gap-2">
								<input
									value={form.firstName}
									onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
									className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
									placeholder="Prénom"
								/>
								<input
									value={form.lastName}
									onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
									className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
									placeholder="Nom"
								/>
							</div>
							<input
								value={form.email}
								onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
								className="w-full rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
								placeholder="Email"
							/>

							{createTab === 'group' && (
								<>
									<div className="grid grid-cols-2 gap-2">
										<input
											value={form.company}
											onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
											className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
											placeholder="Entreprise"
										/>
										<input
											value={form.phone}
											onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
											className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
											placeholder="Téléphone"
										/>
									</div>
									<input
										value={form.address}
										onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
										className="w-full rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
										placeholder="Adresse"
									/>
									<div className="grid grid-cols-3 gap-2">
										<input
											type="date"
											value={form.eventDate}
											onChange={(event) => setForm((current) => ({ ...current, eventDate: event.target.value }))}
											className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
										/>
										<input
											type="time"
											value={form.eventTime}
											onChange={(event) => setForm((current) => ({ ...current, eventTime: event.target.value }))}
											className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
										/>
										<input
											value={form.budget}
											onChange={(event) => setForm((current) => ({ ...current, budget: event.target.value }))}
											className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
											placeholder="Budget"
										/>
									</div>
									<input
										value={form.reason}
										onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
										className="w-full rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
										placeholder="Raison / type d'évènement"
									/>
									<textarea
										rows={3}
										value={form.message}
										onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
										className="w-full rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
										placeholder="Notes supplémentaires"
									/>
								</>
							)}

							{createTab === 'private' && (
								<p className="text-xs text-slate-500">
									Privatisation : le créneau sélectionné sera fermé pour le public (capacité complète).
								</p>
							)}

							{createTab === 'contact' && (
								<div className="space-y-3 rounded border border-slate-100 bg-slate-50 p-3">
									<div className="flex flex-wrap items-center gap-2">
										<select
											value={contactStatus}
											onChange={async (event) => {
												const value = event.target.value as 'NEW' | 'CONTACTED' | 'CLOSED' | ''
												await handleContactStatusChange(value)
											}}
											className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
										>
											<option value="">Tous les statuts</option>
											<option value="NEW">Nouveaux</option>
											<option value="CONTACTED">Contactés</option>
											<option value="CLOSED">Fermés</option>
										</select>
										<select
											value={selectedContactId}
											onChange={(event) => setSelectedContactId(event.target.value)}
											className="w-56 rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
										>
											<option value="">Sélectionner…</option>
											{contacts.map((contact: any) => (
												<option key={contact.id} value={contact.id}>
													{contact.firstName} {contact.lastName} • {contact.email}
												</option>
											))}
										</select>
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
										className="rounded border border-blue-600 bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
									>
										{contactConverting ? 'Conversion…' : 'Convertir'}
									</button>
								</div>
							)}
						</div>

						<div className="mt-4 flex justify-end gap-2">
							<button
								type="button"
								onClick={closeCreateModal}
								className="rounded border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
							>
								Annuler
							</button>
							<button
								type="button"
								disabled={creating}
								onClick={async () => {
									setCreating(true)
									const basePayload = {
										date: form.date,
										time: form.time,
										adults: form.adults,
										children: form.children,
										babies: form.babies,
										language: form.language,
										userDetails: {
											firstName: form.firstName,
											lastName: form.lastName,
											email: form.email
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
						<div className="flex items-center justify-between border-b border-slate-100 pb-3">
							<h3 className="text-sm font-semibold text-slate-800">Détails réservation</h3>
							<button
								type="button"
								onClick={closeViewModal}
								className="text-lg text-slate-400 transition hover:text-slate-600"
							>
								✕
							</button>
						</div>
						<div className="mt-3 space-y-2 text-sm text-slate-600">
							<p>
								Date :{' '}
								<span className="font-semibold text-slate-800">
									{format(toWall(new Date(showView.startTime)), 'dd/MM/yyyy HH:mm')}
								</span>
							</p>
							<p>
								Client :{' '}
								<span className="font-semibold text-slate-800">
									{showView.user?.firstName} {showView.user?.lastName} ({showView.user?.email})
								</span>
							</p>
							<p>{formatPeopleLabel(showView)}</p>
							<p>Langue : {showView.language ?? '—'}</p>
							<p>Paiement : {describePaymentMethod(showView)}</p>
							<p>Statut : {getPaymentStatusInfo(showView).label}</p>
							<div className="pt-3">
								<button
									type="button"
									onClick={() => setViewMarkPaid({ provider: '', methodType: undefined })}
									className="sn-btn-primary"
								>
									Marquer payé
								</button>
							</div>
							{viewMarkPaid && (
								<div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
									<p className="mb-2 font-semibold">Choisissez le moyen de paiement</p>
									<div className="flex flex-wrap items-center gap-2">
										<select
											value={viewMarkPaid.provider}
											onChange={(event) => {
												const provider = event.target.value
												setViewMarkPaid((current) =>
													current
														? {
																provider,
																methodType: provider === 'voucher' ? current.methodType ?? 'ANCV' : undefined
															}
														: current
												)
											}}
											className="rounded border border-slate-200 px-3 py-2 text-xs shadow-inner focus:border-blue-500 focus:outline-none"
										>
											<option value="">-- moyen --</option>
											<option value="cash">Espèces</option>
											<option value="card">Carte</option>
											<option value="paypal">PayPal</option>
											<option value="applepay">Apple Pay</option>
											<option value="googlepay">Google Pay</option>
											<option value="voucher">ANCV / CityPass</option>
										</select>
										{viewMarkPaid.provider === 'voucher' && (
											<select
												value={viewMarkPaid.methodType ?? 'ANCV'}
												onChange={(event) =>
													setViewMarkPaid((current) =>
														current ? { ...current, methodType: event.target.value } : current
													)
												}
												className="rounded border border-slate-200 px-3 py-2 text-xs shadow-inner focus:border-blue-500 focus:outline-none"
											>
												<option value="ANCV">ANCV</option>
												<option value="CityPass">CityPass</option>
											</select>
										)}
										<button
											type="button"
											onClick={async () => {
												if (!viewMarkPaid.provider) {
													alert('Sélectionnez un moyen de paiement.')
													return
												}
												try {
													const payload: Record<string, unknown> = {
														newIsPaid: true,
														paymentMethod: {
															provider: viewMarkPaid.provider,
															methodType:
																viewMarkPaid.provider === 'voucher' ? viewMarkPaid.methodType : undefined
														}
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
														alert('Échec de la mise à jour du paiement.')
													}
												} catch (updateError) {
													console.error('Erreur mise à jour paiement', updateError)
													alert('Erreur réseau pendant la mise à jour du paiement.')
												}
											}}
											className="rounded border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
										>
											Valider
										</button>
										<button
											type="button"
											onClick={() => setViewMarkPaid(null)}
											className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
										>
											Annuler
										</button>
									</div>
								</div>
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
						<div className="flex items-center justify-between border-b border-slate-100 pb-3">
							<h3 className="text-sm font-semibold text-slate-800">Modifier réservation</h3>
							<button
								type="button"
								onClick={() => setShowEdit(null)}
								className="text-lg text-slate-400 transition hover:text-slate-600"
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
		paymentMethodType: booking.payments?.[0]?.methodType ?? 'ANCV'
	}))

	return (
		<div className="space-y-4 text-sm text-slate-600">
			<div className="grid grid-cols-2 gap-2">
				<input
					value={state.date}
					onChange={(event) => setState((current) => ({ ...current, date: event.target.value }))}
					className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
				/>
				<input
					value={state.time}
					onChange={(event) => setState((current) => ({ ...current, time: event.target.value }))}
					className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
				/>
			</div>
			<div className="grid grid-cols-3 gap-2">
				<input
					type="number"
					value={state.adults}
					onChange={(event) =>
						setState((current) => ({ ...current, adults: parseInt(event.target.value || '0', 10) || 0 }))
					}
					className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
				/>
				<input
					type="number"
					value={state.children}
					onChange={(event) =>
						setState((current) => ({ ...current, children: parseInt(event.target.value || '0', 10) || 0 }))
					}
					className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
				/>
				<input
					type="number"
					value={state.babies}
					onChange={(event) =>
						setState((current) => ({ ...current, babies: parseInt(event.target.value || '0', 10) || 0 }))
					}
					className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
				/>
			</div>
			<input
				value={state.language}
				onChange={(event) => setState((current) => ({ ...current, language: event.target.value }))}
				className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
			/>

			<label className="flex items-center gap-2 text-sm">
				<input
					type="checkbox"
					checked={state.isPaid}
					onChange={(event) => setState((current) => ({ ...current, isPaid: event.target.checked }))}
				/>
				<span className="font-semibold text-slate-700">Payé ?</span>
			</label>

			{state.isPaid && (
				<div className="flex flex-wrap items-center gap-2">
					<select
						value={state.paymentProvider}
						onChange={(event) =>
							setState((current) => ({
								...current,
								paymentProvider: event.target.value,
								paymentMethodType:
									event.target.value === 'voucher' ? current.paymentMethodType ?? 'ANCV' : 'ANCV'
							}))
						}
						className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
					>
						<option value="">-- moyen --</option>
						<option value="cash">Espèces</option>
						<option value="card">Carte</option>
						<option value="paypal">PayPal</option>
						<option value="applepay">Apple Pay</option>
						<option value="googlepay">Google Pay</option>
						<option value="voucher">ANCV / CityPass</option>
					</select>
					{state.paymentProvider === 'voucher' && (
						<select
							value={state.paymentMethodType}
							onChange={(event) =>
								setState((current) => ({ ...current, paymentMethodType: event.target.value }))
							}
							className="rounded border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
						>
							<option value="ANCV">ANCV</option>
							<option value="CityPass">CityPass</option>
						</select>
					)}
				</div>
			)}

			<div className="flex justify-end gap-2 pt-4">
				<button
					type="button"
					onClick={onClose}
					className="rounded border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
				>
					Annuler
				</button>
				<button
					type="button"
					onClick={async () => {
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
						if (state.isPaid) {
							if (!state.paymentProvider) {
								alert('Sélectionnez un moyen de paiement.')
								return
							}
							payload.paymentMethod = {
								provider: state.paymentProvider,
								methodType: state.paymentProvider === 'voucher' ? state.paymentMethodType : undefined
							}
						}
						const confirmation = window.confirm('Confirmer la modification de cette réservation ?')
						if (!confirmation) return
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
						}
					}}
					className="rounded border border-blue-600 bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
				>
					Enregistrer
				</button>
			</div>
		</div>
	)
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
	return (
		<div className={`flex flex-col rounded-xl px-3 py-2 text-xs font-semibold ${tone}`}>
			<span className="uppercase tracking-wide">{label}</span>
			<span className="text-lg">{value}</span>
		</div>
	)
}

