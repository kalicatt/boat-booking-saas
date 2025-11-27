import { z } from 'zod'
import { parsePhoneNumberFromString } from 'libphonenumber-js/min'
import { normalizeIncoming } from './phone'

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
  notes: z.string().optional().transform(v => v ? stripScriptTags(cleanString(v, 2000)!) : undefined)
})

// Update schema: require id, all other fields optional (partial update)
export const EmployeeUpdateSchema = EmployeeCreateSchema.partial().extend({
  id: z.string().uuid()
})

// Blocks schema (start/end ISO strings & reason)
export const BlockCreateSchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1),
  scope: z.enum(['day','morning','afternoon','specific']),
  reason: z.string().max(200).optional().transform(v => v ? stripScriptTags(cleanString(v,200)!) : undefined)
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
  paymentMethod: z.enum(['cash','card','paypal','applepay','googlepay','ANCV','CityPass']).optional(),
  pendingOnly: z.boolean().optional()
}).refine(v => (v.adults + v.children + v.babies) > 0, { message: 'Au moins une personne requise' })

// Simple helper to safely parse numbers
export function toNumber(value: any) {
  if (value === null || value === undefined || value === '') return undefined
  const n = Number(value)
  return isNaN(n) ? undefined : n
}
