'use client'

import {
    VOUCHER_PARTNERS,
    type VoucherFormState,
    type CheckFormState,
    computeVoucherTotal,
    formatEuroString,
    getVoucherPartnerLabel
} from '@/lib/manualPayments'

type VoucherDetailsFormProps = {
    value: VoucherFormState
    disabled?: boolean
    onChange: (details: VoucherFormState, methodType?: string) => void
}

export function VoucherDetailsForm({ value, disabled = false, onChange }: VoucherDetailsFormProps) {
    const partner = VOUCHER_PARTNERS.find((option) => option.id === value.partnerId)
    const hasFixedValue = Boolean(partner?.fixedValueCents)

    const handlePartnerChange = (partnerId: string) => {
        const nextPartner = VOUCHER_PARTNERS.find((option) => option.id === partnerId)
        const autoTotal = Boolean(nextPartner?.fixedValueCents)
        const nextDetails: VoucherFormState = {
            ...value,
            partnerId,
            autoTotal,
            totalAmount: autoTotal ? computeVoucherTotal(partnerId, value.quantity) : ''
        }
        onChange(nextDetails, partnerId ? getVoucherPartnerLabel(partnerId) : undefined)
    }

    const handleQuantityChange = (direction: 'inc' | 'dec') => {
        const delta = direction === 'inc' ? 1 : -1
        const nextQuantity = Math.max(1, value.quantity + delta)
        const nextDetails: VoucherFormState = {
            ...value,
            quantity: nextQuantity,
            totalAmount: value.autoTotal ? computeVoucherTotal(value.partnerId, nextQuantity) : value.totalAmount
        }
        onChange(nextDetails)
    }

    return (
        <div className="mt-4 space-y-3 rounded border border-slate-100 bg-white/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Voucher / Hôtel</p>
            <label className="sn-field">
                <span className="sn-label">Émetteur</span>
                <select
                    value={value.partnerId}
                    onChange={(event) => handlePartnerChange(event.target.value)}
                    className="sn-input"
                    disabled={disabled}
                >
                    <option value="">Sélectionner un partenaire</option>
                    {VOUCHER_PARTNERS.map((option) => (
                        <option key={option.id} value={option.id}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <span className="sn-hint">Choisissez le partenaire concerné par le bon.</span>
            </label>
            <label className="sn-field">
                <span className="sn-label">Référence</span>
                <input
                    type="text"
                    value={value.reference}
                    onChange={(event) => onChange({ ...value, reference: event.target.value })}
                    className="sn-input"
                    disabled={disabled}
                    placeholder="N° du bon"
                />
            </label>
            <div className="sn-form-grid sn-form-grid-2">
                <div className="sn-field">
                    <span className="sn-label">Quantité</span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleQuantityChange('dec')}
                            className="rounded border border-slate-200 px-2 py-1 text-sm"
                            disabled={disabled || value.quantity <= 1}
                        >
                            -
                        </button>
                        <div className="w-12 rounded border border-slate-200 px-2 py-1 text-center text-sm font-semibold">
                            {value.quantity}
                        </div>
                        <button
                            type="button"
                            onClick={() => handleQuantityChange('inc')}
                            className="rounded border border-slate-200 px-2 py-1 text-sm"
                            disabled={disabled}
                        >
                            +
                        </button>
                    </div>
                </div>
                <label className="sn-field">
                    <span className="sn-label">Montant total (€)</span>
                    <input
                        type="text"
                        value={value.autoTotal ? computeVoucherTotal(value.partnerId, value.quantity) : value.totalAmount}
                        onChange={(event) =>
                            onChange({ ...value, totalAmount: event.target.value, autoTotal: hasFixedValue })
                        }
                        className="sn-input"
                        disabled={disabled || hasFixedValue}
                        placeholder="0,00"
                    />
                    <span className="sn-hint">
                        {hasFixedValue
                            ? `Calcul automatique : ${formatEuroString(partner?.fixedValueCents ?? 0)} € x ${value.quantity}`
                            : 'Renseignez le montant couvert si non standard.'}
                    </span>
                </label>
            </div>
        </div>
    )
}

type CheckDetailsFormProps = {
    value: CheckFormState
    disabled?: boolean
    onChange: (details: CheckFormState) => void
}

export function CheckDetailsForm({ value, disabled = false, onChange }: CheckDetailsFormProps) {
    const handleQuantityChange = (direction: 'inc' | 'dec') => {
        const delta = direction === 'inc' ? 1 : -1
        const nextQuantity = Math.max(1, value.quantity + delta)
        onChange({ ...value, quantity: nextQuantity })
    }

    return (
        <div className="mt-4 space-y-3 rounded border border-slate-100 bg-white/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chèque</p>
            <label className="sn-field">
                <span className="sn-label">Numéro</span>
                <input
                    type="text"
                    value={value.number}
                    onChange={(event) => onChange({ ...value, number: event.target.value })}
                    className="sn-input"
                    disabled={disabled}
                    placeholder="800412"
                />
            </label>
            <label className="sn-field">
                <span className="sn-label">Banque (optionnel)</span>
                <input
                    type="text"
                    value={value.bank}
                    onChange={(event) => onChange({ ...value, bank: event.target.value })}
                    className="sn-input"
                    disabled={disabled}
                    placeholder="Crédit Mutuel"
                />
            </label>
            <div className="sn-form-grid sn-form-grid-2">
                <div className="sn-field">
                    <span className="sn-label">Quantité</span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleQuantityChange('dec')}
                            className="rounded border border-slate-200 px-2 py-1 text-sm"
                            disabled={disabled || value.quantity <= 1}
                        >
                            -
                        </button>
                        <div className="w-12 rounded border border-slate-200 px-2 py-1 text-center text-sm font-semibold">
                            {value.quantity}
                        </div>
                        <button
                            type="button"
                            onClick={() => handleQuantityChange('inc')}
                            className="rounded border border-slate-200 px-2 py-1 text-sm"
                            disabled={disabled}
                        >
                            +
                        </button>
                    </div>
                </div>
                <label className="sn-field">
                    <span className="sn-label">Montant par chèque (€)</span>
                    <input
                        type="text"
                        value={value.amount}
                        onChange={(event) => onChange({ ...value, amount: event.target.value })}
                        className="sn-input"
                        disabled={disabled}
                        placeholder="50,00"
                    />
                    <span className="sn-hint">Utilisez un point ou une virgule, selon la saisie préférée.</span>
                </label>
            </div>
        </div>
    )
}
