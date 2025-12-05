const DEFAULT_NAME = (process.env.EMAIL_FROM_NAME || 'Sweet Narcisse').trim()

const fallbackSender = () => {
  const envSender = process.env.EMAIL_SENDER?.trim()
  if (envSender) return envSender
  const smtpUser = process.env.SMTP_USER?.trim()
  if (smtpUser && smtpUser.includes('@')) return smtpUser
  return 'notifications@sweet-narcisse.fr'
}

const contact = (process.env.EMAIL_CONTACT || 'contact@sweet-narcisse.fr').trim()
const reservations = (process.env.EMAIL_RESERVATIONS || process.env.EMAIL_BOOKINGS || 'reservations@sweet-narcisse.fr').trim()
const billing = (process.env.EMAIL_BILLING || process.env.EMAIL_INVOICING || 'facturation@sweet-narcisse.fr').trim()
const notifications = (process.env.EMAIL_NOTIFICATIONS || fallbackSender()).trim()
const experience = (process.env.EMAIL_EXPERIENCE || 'experience@sweet-narcisse.fr').trim()

export const EMAIL_ROLES = {
  contact,
  reservations,
  billing,
  notifications,
  experience,
} as const

const formatAddress = (email: string, name = DEFAULT_NAME) => `${name} <${email}>`

export const EMAIL_FROM = {
  contact: formatAddress(contact),
  reservations: formatAddress(reservations),
  billing: formatAddress(billing),
  notifications: formatAddress(notifications),
  experience: formatAddress(experience, "L'equipe Sweet Narcisse"),
} as const

export type EmailRole = keyof typeof EMAIL_ROLES

export const getEmailAddress = (role: EmailRole) => EMAIL_ROLES[role]
export const getEmailSender = (role: EmailRole) => EMAIL_FROM[role]
