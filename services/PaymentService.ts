/**
 * PaymentService - Gestion des paiements
 * 
 * Responsabilités:
 * - Traitement des paiements Stripe/PayPal
 * - Création des entrées PaymentLedger
 * - Calcul TVA
 * - Remboursements
 */

import { prisma } from '@/lib/prisma'
import { computeVatFromGross } from '@/lib/vat'
import { log } from '@/lib/logger'
import type { Payment, PaymentLedger, Prisma } from '@prisma/client'

// Types d'entrée
export type ProcessPaymentInput = {
  bookingId: string
  provider: 'stripe' | 'paypal' | 'cash' | 'voucher' | 'check' | 'ANCV' | 'CityPass'
  methodType?: string
  intentId?: string
  orderId?: string
  amount: number
  currency?: string
  rawPayload?: unknown
}

export type RefundInput = {
  paymentId: string
  amount?: number // Remboursement partiel, sinon total
  reason?: string
}

// Types de résultat
export type PaymentResult = {
  success: boolean
  payment?: Payment
  ledgerEntry?: PaymentLedger
  error?: string
}

export type RefundResult = {
  success: boolean
  refundEntry?: PaymentLedger
  error?: string
}

// Méthodes qui enregistrent le paiement immédiatement
const INSTANT_CAPTURE_METHODS = new Set([
  'cash', 'paypal', 'applepay', 'googlepay', 'voucher', 'check', 'ANCV', 'CityPass'
])

/**
 * Service pour la gestion des paiements
 */
export const PaymentService = {
  /**
   * Vérifie si un paiement existe déjà (idempotence)
   */
  async paymentExists(intentId: string): Promise<boolean> {
    const existing = await prisma.payment.findFirst({
      where: { intentId }
    })
    return !!existing
  },

  /**
   * Enregistre un paiement et crée l'entrée ledger
   */
  async processPayment(input: ProcessPaymentInput): Promise<PaymentResult> {
    const {
      bookingId,
      provider,
      methodType,
      intentId,
      orderId,
      amount,
      currency = 'EUR',
      rawPayload
    } = input

    try {
      // Vérifier idempotence si un intentId est fourni
      if (intentId) {
        const exists = await this.paymentExists(intentId)
        if (exists) {
          await log('info', 'Payment already processed (idempotent)', { 
            route: 'PaymentService', 
            bookingId, 
            intentId 
          })
          return { success: true }
        }
      }

      // Créer le paiement
      const payment = await prisma.payment.create({
        data: {
          provider,
          bookingId,
          intentId: intentId || `manual_${Date.now()}`,
          orderId: orderId || undefined,
          amount,
          currency: currency.toUpperCase(),
          status: 'succeeded',
          rawPayload: rawPayload as Prisma.InputJsonValue
        }
      })

      // Calculer la TVA
      const vat = computeVatFromGross(amount)

      // Créer l'entrée ledger
      const ledgerEntry = await prisma.paymentLedger.create({
        data: {
          eventType: 'PAYMENT',
          bookingId,
          paymentId: payment.id,
          provider: this.mapProviderToLedger(provider),
          methodType: methodType || provider,
          amount,
          currency: currency.toUpperCase(),
          vatRate: vat.ratePercent,
          netAmount: vat.net,
          vatAmount: vat.vat,
          grossAmount: vat.gross
        }
      })

      // Marquer la réservation comme payée
      await prisma.booking.update({
        where: { id: bookingId },
        data: { 
          isPaid: true, 
          status: 'CONFIRMED' 
        }
      })

      await log('info', `Payment recorded via ${provider}`, { 
        route: 'PaymentService', 
        bookingId,
        amount,
        currency 
      })

      return { 
        success: true, 
        payment, 
        ledgerEntry 
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await log('error', 'Payment processing failed', { 
        route: 'PaymentService', 
        bookingId, 
        error: message 
      })
      return { 
        success: false, 
        error: message 
      }
    }
  },

  /**
   * Enregistre un remboursement
   */
  async processRefund(input: RefundInput): Promise<RefundResult> {
    const { paymentId, amount, reason } = input

    try {
      // Récupérer le paiement original
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { booking: true }
      })

      if (!payment) {
        return { 
          success: false, 
          error: 'Payment not found' 
        }
      }

      const refundAmount = amount ?? payment.amount
      const vat = computeVatFromGross(refundAmount)

      // Créer l'entrée ledger pour le remboursement
      const refundEntry = await prisma.paymentLedger.create({
        data: {
          eventType: 'REFUND',
          bookingId: payment.bookingId,
          paymentId: payment.id,
          provider: payment.provider,
          methodType: 'refund',
          amount: -refundAmount, // Négatif pour un remboursement
          currency: payment.currency,
          vatRate: vat.ratePercent,
          netAmount: -vat.net,
          vatAmount: -vat.vat,
          grossAmount: -vat.gross,
          note: reason
        }
      })

      // Mettre à jour le statut du paiement si remboursement total
      if (refundAmount >= payment.amount) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: { status: 'refunded' }
        })
      }

      await log('info', 'Refund processed', { 
        route: 'PaymentService', 
        paymentId, 
        bookingId: payment.bookingId,
        amount: refundAmount 
      })

      return { 
        success: true, 
        refundEntry 
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await log('error', 'Refund processing failed', { 
        route: 'PaymentService', 
        paymentId, 
        error: message 
      })
      return { 
        success: false, 
        error: message 
      }
    }
  },

  /**
   * Vérifie si une méthode de paiement capture instantanément
   */
  isInstantCapture(method: string): boolean {
    return INSTANT_CAPTURE_METHODS.has(method)
  },

  /**
   * Convertit le provider en type pour le ledger
   */
  mapProviderToLedger(provider: string): string {
    const mapping: Record<string, string> = {
      'stripe': 'card',
      'paypal': 'paypal',
      'cash': 'cash',
      'voucher': 'voucher',
      'check': 'check',
      'ANCV': 'ancv',
      'CityPass': 'citypass'
    }
    return mapping[provider] || provider
  },

  /**
   * Récupère l'historique des paiements pour une réservation
   */
  async getPaymentHistory(bookingId: string) {
    const [payments, ledgerEntries] = await Promise.all([
      prisma.payment.findMany({
        where: { bookingId },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.paymentLedger.findMany({
        where: { bookingId },
        orderBy: { occurredAt: 'desc' }
      })
    ])

    const totalPaid = ledgerEntries
      .filter(e => e.eventType === 'PAYMENT')
      .reduce((sum, e) => sum + e.amount, 0)

    const totalRefunded = Math.abs(
      ledgerEntries
        .filter(e => e.eventType === 'REFUND')
        .reduce((sum, e) => sum + e.amount, 0)
    )

    return {
      payments,
      ledgerEntries,
      summary: {
        totalPaid,
        totalRefunded,
        netAmount: totalPaid - totalRefunded
      }
    }
  },

  /**
   * Calcule les métriques de paiement pour une période
   */
  async getPaymentMetrics(startDate: Date, endDate: Date) {
    const ledgerEntries = await prisma.paymentLedger.findMany({
      where: {
        occurredAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    const payments = ledgerEntries.filter(e => e.eventType === 'PAYMENT')
    const refunds = ledgerEntries.filter(e => e.eventType === 'REFUND')

    const byProvider = payments.reduce((acc, p) => {
      acc[p.provider] = (acc[p.provider] || 0) + p.amount
      return acc
    }, {} as Record<string, number>)

    return {
      totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
      totalRefunds: Math.abs(refunds.reduce((sum, r) => sum + r.amount, 0)),
      totalVAT: payments.reduce((sum, p) => sum + (p.vatAmount ?? 0), 0),
      transactionCount: payments.length,
      refundCount: refunds.length,
      byProvider
    }
  }
}
