export type VoucherPartnerOption = {
	id: string
	label: string
	fixedValueCents?: number
}

export type VoucherFormState = {
	partnerId: string
	reference: string
	quantity: number
	totalAmount: string
	autoTotal: boolean
}

export type CheckFormState = {
	number: string
	bank: string
	quantity: number
	amount: string
}

export type ManualPaymentState = {
	provider: string
	methodType?: string
	voucherDetails?: VoucherFormState
	checkDetails?: CheckFormState
}

export const VOUCHER_PARTNERS: VoucherPartnerOption[] = [
	{ id: 'hotel_bristol', label: 'Hôtel Bristol', fixedValueCents: 5000 },
	{ id: 'hotel_riviera', label: 'Hôtel Riviera', fixedValueCents: 4000 },
	{ id: 'hotel_astoria', label: 'Hôtel Astoria', fixedValueCents: 6000 },
	{ id: 'ancv', label: 'Chèque ANCV' },
	{ id: 'city_pass', label: 'City Pass' },
	{ id: 'partner_other', label: 'Autre partenaire' }
]

export const formatEuroString = (cents: number) => (Math.max(0, cents) / 100).toFixed(2)

export const computeVoucherTotal = (partnerId: string, quantity: number) => {
	const partner = VOUCHER_PARTNERS.find((option) => option.id === partnerId)
	if (!partner?.fixedValueCents) {
		return ''
	}
	return formatEuroString(partner.fixedValueCents * Math.max(1, quantity))
}

export const getVoucherPartnerLabel = (partnerId: string) =>
	VOUCHER_PARTNERS.find((option) => option.id === partnerId)?.label ?? ''

export const sanitizeManualPaymentText = (value: string) => value.replace(/\s+/g, ' ').trim()

const hasFixedValue = (partnerId: string) => Boolean(VOUCHER_PARTNERS.find((option) => option.id === partnerId)?.fixedValueCents)

export const createVoucherDetails = (overrides?: Partial<VoucherFormState>): VoucherFormState => {
	const partnerId = overrides?.partnerId ?? ''
	const quantity = overrides?.quantity ?? 1
	const autoTotal = hasFixedValue(partnerId)
	return {
		partnerId,
		reference: '',
		quantity,
		totalAmount: autoTotal ? computeVoucherTotal(partnerId, quantity) : '',
		autoTotal,
		...overrides
	}
}

export const createCheckDetails = (overrides?: Partial<CheckFormState>): CheckFormState => ({
	number: '',
	bank: '',
	quantity: 1,
	amount: '',
	...overrides
})

export const createEmptyManualPaymentState = (): ManualPaymentState => ({
	provider: '',
	methodType: undefined,
	voucherDetails: createVoucherDetails(),
	checkDetails: createCheckDetails()
})

export const updateManualPaymentState = (provider: string, base: ManualPaymentState | null): ManualPaymentState => {
	const current = base ?? createEmptyManualPaymentState()
	if (!provider) {
		return { ...current, provider: '', methodType: undefined }
	}
	if (provider === 'voucher') {
		const voucherDetails = current.voucherDetails ?? createVoucherDetails()
		const methodType = voucherDetails.partnerId ? getVoucherPartnerLabel(voucherDetails.partnerId) : undefined
		return {
			...current,
			provider,
			methodType,
			voucherDetails
		}
	}
	if (provider === 'check') {
		return {
			...current,
			provider,
			methodType: undefined,
			checkDetails: current.checkDetails ?? createCheckDetails()
		}
	}
	return { ...current, provider, methodType: undefined }
}

export type ManualPaymentBuildResult = {
	ok: boolean
	error?: string
	paymentMethod?: Record<string, unknown>
}

export const validateManualPaymentState = (state: ManualPaymentState): string | null => {
	if (!state.provider) {
		return 'Sélectionnez un moyen de paiement.'
	}
	if (state.provider === 'voucher') {
		const details = state.voucherDetails ?? createVoucherDetails()
		if (!details.partnerId) {
			return 'Sélectionnez l’émetteur du bon.'
		}
		if (!sanitizeManualPaymentText(details.reference)) {
			return 'Ajoutez la référence du bon.'
		}
		if (!details.autoTotal && !sanitizeManualPaymentText(details.totalAmount)) {
			return 'Indiquez le montant couvert par le bon.'
		}
	}
	if (state.provider === 'check') {
		const details = state.checkDetails ?? createCheckDetails()
		if (!sanitizeManualPaymentText(details.number)) {
			return 'Le numéro du chèque est obligatoire.'
		}
	}
	return null
}

export const buildManualPaymentPayload = (state: ManualPaymentState): ManualPaymentBuildResult => {
	const error = validateManualPaymentState(state)
	if (error) {
		return { ok: false, error }
	}
	if (state.provider === 'voucher') {
		const details = state.voucherDetails ?? createVoucherDetails()
		const partnerLabel = getVoucherPartnerLabel(details.partnerId)
		const totalAmount = details.autoTotal
			? computeVoucherTotal(details.partnerId, details.quantity)
			: sanitizeManualPaymentText(details.totalAmount)
		return {
			ok: true,
			paymentMethod: {
				provider: 'voucher',
				methodType: partnerLabel || undefined,
				metadata: {
					voucher: {
						partnerId: details.partnerId,
						partnerLabel,
						reference: sanitizeManualPaymentText(details.reference),
						quantity: details.quantity,
						totalAmount,
						autoTotal: details.autoTotal
					}
				}
			}
		}
	}
	if (state.provider === 'check') {
		const details = state.checkDetails ?? createCheckDetails()
		return {
			ok: true,
			paymentMethod: {
				provider: 'check',
				methodType: 'Chèque',
				metadata: {
					check: {
						number: sanitizeManualPaymentText(details.number),
						bank: details.bank ? sanitizeManualPaymentText(details.bank) : undefined,
						quantity: details.quantity,
						amount: sanitizeManualPaymentText(details.amount)
					}
				}
			}
		}
	}
	return {
		ok: true,
		paymentMethod: { provider: state.provider }
	}
}
