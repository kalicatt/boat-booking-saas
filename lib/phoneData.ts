// Extended country calling codes (subset) with flag emojis
// For dynamic future loading you could move this to public/phone-codes.json and fetch.
export interface PhoneCodeEntry { code: string; country: string; flag: string; iso2?: string }

export const PHONE_CODES: PhoneCodeEntry[] = [
  { code: '+33', country: 'France', flag: '🇫🇷', iso2: 'FR' },
  { code: '+32', country: 'Belgique', flag: '🇧🇪', iso2: 'BE' },
  { code: '+41', country: 'Suisse', flag: '🇨🇭', iso2: 'CH' },
  { code: '+44', country: 'Royaume-Uni', flag: '🇬🇧', iso2: 'GB' },
  { code: '+49', country: 'Allemagne', flag: '🇩🇪', iso2: 'DE' },
  { code: '+34', country: 'Espagne', flag: '🇪🇸', iso2: 'ES' },
  { code: '+39', country: 'Italie', flag: '🇮🇹', iso2: 'IT' },
  { code: '+1', country: 'USA/Canada', flag: '🇺🇸', iso2: 'US' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹', iso2: 'PT' },
  { code: '+352', country: 'Luxembourg', flag: '🇱🇺', iso2: 'LU' },
  { code: '+31', country: 'Pays-Bas', flag: '🇳🇱', iso2: 'NL' },
  { code: '+46', country: 'Suède', flag: '🇸🇪', iso2: 'SE' },
  { code: '+47', country: 'Norvège', flag: '🇳🇴', iso2: 'NO' },
  { code: '+48', country: 'Pologne', flag: '🇵🇱', iso2: 'PL' },
  { code: '+420', country: 'Tchéquie', flag: '🇨🇿', iso2: 'CZ' },
  { code: '+421', country: 'Slovaquie', flag: '🇸🇰', iso2: 'SK' },
  { code: '+43', country: 'Autriche', flag: '🇦🇹', iso2: 'AT' },
  { code: '+370', country: 'Lituanie', flag: '🇱🇹', iso2: 'LT' },
  { code: '+371', country: 'Lettonie', flag: '🇱🇻', iso2: 'LV' },
  { code: '+372', country: 'Estonie', flag: '🇪🇪', iso2: 'EE' },
  { code: '+373', country: 'Moldavie', flag: '🇲🇩', iso2: 'MD' },
  { code: '+381', country: 'Serbie', flag: '🇷🇸', iso2: 'RS' },
  { code: '+382', country: 'Monténégro', flag: '🇲🇪', iso2: 'ME' },
  { code: '+386', country: 'Slovénie', flag: '🇸🇮', iso2: 'SI' },
  { code: '+387', country: 'Bosnie-H.', flag: '🇧🇦', iso2: 'BA' },
  { code: '+40', country: 'Roumanie', flag: '🇷🇴', iso2: 'RO' },
  { code: '+90', country: 'Turquie', flag: '🇹🇷', iso2: 'TR' },
  { code: '+212', country: 'Maroc', flag: '🇲🇦', iso2: 'MA' },
  { code: '+216', country: 'Tunisie', flag: '🇹🇳', iso2: 'TN' }
]
