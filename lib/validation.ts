import { z } from 'zod'
import { parsePhoneNumberFromString } from 'libphonenumber-js/min'
import { normalizeIncoming } from './phone'
import { resolveAdminPermissions } from '@/types/adminPermissions'
import { DEFAULT_BOAT_CAPACITY } from '@/lib/config'

// Basic reusable sanitization – trim & remove zero-width/invisible chars
export function cleanString(input: unknown, maxLength = 255) {
  if (typeof input !== 'string') return undefined
  return input
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .slice(0, maxLength)
}

// Prevent obviously dangerous tag injection (<script>) – light heuristic
export function stripScriptTags(s: string | undefined) {
  if (!s) return s
  return s.replace(/<\/?script[^>]*>/gi, '')
}

// Shared Employee schema for CREATE
export const EmployeeCreateSchema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  email: z.string().email().max(120),
  phone: z.string().optional().transform(v => v ? cleanString(v, 30) : undefined),
  address: z.string().optional().transform(v => v ? cleanString(v, 200) : undefined),
  city: z.string().optional().transform(v => v ? cleanString(v, 80) : undefined),
  postalCode: z.string().optional().transform(v => v ? cleanString(v, 20) : undefined),
  country: z.string().optional().transform(v => v ? cleanString(v, 80) : undefined),
  password: z.string().min(6).max(100),
  role: z.enum(['EMPLOYEE','ADMIN']).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional().transform(v => v ? cleanString(v, 20) : undefined),
  employeeNumber: z.string().optional().transform(v => v ? cleanString(v, 30) : undefined),
  hireDate: z.string().optional(),
  department: z.string().optional().transform(v => v ? cleanString(v, 60) : undefined),
  jobTitle: z.string().optional().transform(v => v ? cleanString(v, 80) : undefined),
  managerId: z.string().uuid().optional(),
  // Align with Prisma enum EmploymentStatus { PERMANENT, TEMPORARY }
  employmentStatus: z.enum(['PERMANENT','TEMPORARY']).optional(),
  fullTime: z.boolean().optional(),
  hourlyRate: z.union([z.string(), z.number()]).optional(),
  salary: z.union([z.string(), z.number()]).optional(),
  emergencyContactName: z.string().optional().transform(v => v ? cleanString(v, 80) : undefined),
  emergencyContactPhone: z.string().optional().transform(v => v ? cleanString(v, 30) : undefined),
  notes: z.string().optional().transform(v => v ? stripScriptTags(cleanString(v, 2000)!) : undefined),
  permissions: z.unknown().optional().transform((value) => resolveAdminPermissions(value))
})

// Update schema: require id, all other fields optional (partial update)
export const EmployeeUpdateSchema = EmployeeCreateSchema.partial().extend({
  id: z.string().uuid(),
  role: z.enum(['EMPLOYEE','ADMIN','SUPERADMIN']).optional()
})

const EMPLOYEE_DOCUMENT_MAX_SIZE = 25 * 1024 * 1024 // 25 MB hard limit
const EMPLOYEE_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])

const sanitizeNonEmpty = (value: string, max = 255) => {
  const cleaned = cleanString(value, max) ?? ''
  return cleaned
}

const isoDateString = z
  .string()
  .min(4)
  .max(30)
  .refine((value) => !Number.isNaN(new Date(value).getTime()), { message: 'Date invalide' })

export const EmployeeDocumentUploadSchema = z
  .object({
    userId: z.string().uuid(),
    category: z
      .string()
      .min(1)
      .max(60)
      .transform((value) => sanitizeNonEmpty(value, 60))
      .refine((value) => value.length > 0, { message: 'Catégorie requise' }),
    fileName: z
      .string()
      .min(3)
      .max(180)
      .transform((value) => sanitizeNonEmpty(value, 180))
      .refine((value) => value.length > 0, { message: 'Nom de fichier requis' }),
    mimeType: z
      .string()
      .min(3)
      .max(120)
      .transform((value) => value.toLowerCase())
      .refine((value) => EMPLOYEE_DOCUMENT_MIME_TYPES.has(value), { message: 'Type non supporté' }),
    size: z.number().int().positive().max(EMPLOYEE_DOCUMENT_MAX_SIZE),
    checksum: z
      .string()
      .regex(/^[A-Za-z0-9+/=]{16,}$/)
      .optional(),
    expiresAt: z
      .string()
      .optional()
      .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), { message: 'Date invalide' })
  })

export const EmployeeDocumentConfirmSchema = z.object({
  documentId: z.string().min(10).max(64)
})

export const EmployeeDocumentDownloadSchema = z.object({
  documentId: z.string().min(10).max(64)
})

export const EmployeeDocumentArchiveSchema = z.object({
  documentId: z.string().min(10).max(64),
  reason: z
    .string()
    .max(240)
    .optional()
    .transform((value) => (value ? stripScriptTags(sanitizeNonEmpty(value, 240)) : undefined))
})

export const EmployeeArchiveRequestSchema = z.object({
  employmentEndDate: isoDateString.optional(),
  reason: z
    .string()
    .max(240)
    .optional()
    .transform((value) => (value ? stripScriptTags(sanitizeNonEmpty(value, 240)) : undefined))
})

export const EmployeeReactivateRequestSchema = z.object({
  note: z
    .string()
    .max(240)
    .optional()
    .transform((value) => (value ? stripScriptTags(sanitizeNonEmpty(value, 240)) : undefined))
})

// Blocks schema (start/end ISO strings & reason)
export const BlockCreateSchema = z
  .object({
    start: z.string().min(1),
    end: z.string().min(1),
    scope: z.enum(['day', 'morning', 'afternoon', 'specific']),
    reason: z
      .string()
      .max(200)
      .optional()
      .transform((v) => (v ? stripScriptTags(cleanString(v, 200)!) : undefined)),
    repeat: z.enum(['none', 'daily']).default('none'),
    repeatUntil: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
  })
  .refine((data) => (data.repeat === 'daily' ? !!data.repeatUntil : true), {
    message: 'La date de fin est requise pour un blocage récurrent.',
    path: ['repeatUntil']
  })

export const BlockUpdateSchema = z.object({
  id: z.string().uuid(),
  start: z.string().min(1).optional(),
  end: z.string().min(1).optional(),
  scope: z.enum(['day','morning','afternoon','specific']).optional(),
  reason: z.string().max(200).optional().transform(v => v ? stripScriptTags(cleanString(v,200)!) : undefined)
})

// Booking create schema (simplified – adjust as needed)
export const BookingRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  adults: z.number().int().min(0).max(100),
  children: z.number().int().min(0).max(100),
  babies: z.number().int().min(0).max(100),
  language: z.enum(['FR','EN','DE','ES']).or(z.string().min(2).max(5)),
  userDetails: z.object({
    firstName: z.string().min(1).max(60).transform(v => cleanString(v,60)!),
    lastName: z.string().min(1).max(60).transform(v => cleanString(v,60)!),
    email: z.string().email().max(120),
    phone: z.string().optional()
      .transform(v => v ? normalizeIncoming(cleanString(v,30)!) : undefined)
      .refine(v => {
        if (!v) return true
        const pn = parsePhoneNumberFromString(v)
        return !!pn && pn.isValid()
      }, { message: 'Format téléphone invalide (E.164)' })
  }),
  isStaffOverride: z.boolean().optional(),
  captchaToken: z.string().optional(),
  message: z.string().optional().transform(v => v ? stripScriptTags(cleanString(v,1000)!) : undefined),
  markAsPaid: z.boolean().optional(),
  paymentMethod: z.union([
    z.enum(['cash','card','paypal','applepay','googlepay','ANCV','CityPass','terminal']),
    z.object({
      provider: z.string().optional(),
      methodType: z.string().optional()
    })
  ]).optional(),
  invoiceEmail: z.string().email().optional().transform(v => v ? cleanString(v, 120)?.toLowerCase() : undefined),
  pendingOnly: z.boolean().optional(),
  forcedBoatId: z.coerce.number().int().positive().optional(),
  groupChain: z.number().int().min(0).optional(),
  inheritPaymentForChain: z.boolean().optional(),
  private: z.boolean().optional()
})
  .refine(v => (v.adults + v.children + v.babies) > 0, { message: 'Au moins une personne requise' })
  .superRefine((value, ctx) => {
    const total = value.adults + value.children + value.babies
    if (value.private && total > DEFAULT_BOAT_CAPACITY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Capacité max ${DEFAULT_BOAT_CAPACITY} personnes pour une privatisation`,
        path: ['adults']
      })
    }
  })

// Simple helper to safely parse numbers
export function toNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined
  const n = Number(value)
  return Number.isNaN(n) ? undefined : n
}
