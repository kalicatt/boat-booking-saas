import data from '@/app/config/business.json'

export interface BusinessInfo {
  name: string
  address: string
  phone: string
  siret: string
}

export const business: BusinessInfo = {
  name: data.name || 'Sweet Narcisse',
  address: data.address || '',
  phone: data.phone || '',
  siret: data.siret || ''
}