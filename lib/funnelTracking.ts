'use client'

import { trackEvent } from '@/components/PlausibleAnalytics'

/**
 * Conversion Funnel Tracking for Sweet Narcisse
 * 
 * Funnel steps:
 * 1. Page View (automatic)
 * 2. Booking Started (date selected)
 * 3. Form Filled (contact info)
 * 4. Payment Initiated (redirect to Stripe/PayPal)
 * 5. Booking Confirmed (success page)
 * 
 * @example
 * ```tsx
 * import { useFunnelTracking } from '@/lib/funnelTracking'
 * 
 * function BookingWidget() {
 *   const funnel = useFunnelTracking()
 *   
 *   const handleDateSelect = (date) => {
 *     funnel.bookingStarted({ date, language: 'fr' })
 *   }
 * }
 * ```
 */

// Event names for funnel steps
export const FUNNEL_EVENTS = {
  BOOKING_STARTED: 'Booking Started',
  BOOKING_FORM_FILLED: 'Booking Form Filled',
  PAYMENT_INITIATED: 'Payment Initiated',
  PAYMENT_METHOD_SELECTED: 'Payment Method Selected',
  BOOKING_CONFIRMED: 'Booking Confirmed',
  BOOKING_CANCELLED: 'Booking Cancelled',
  
  // Additional conversion events
  CONTACT_FORM_OPENED: 'Contact Form Opened',
  CONTACT_FORM_SUBMITTED: 'Contact Form Submitted',
  LANGUAGE_CHANGED: 'Language Changed',
  SLOT_SELECTED: 'Slot Selected',
  PASSENGERS_UPDATED: 'Passengers Updated',
  
  // Engagement events
  GALLERY_VIEWED: 'Gallery Viewed',
  REVIEWS_VIEWED: 'Reviews Viewed',
  FAQ_EXPANDED: 'FAQ Expanded',
  PHONE_CLICKED: 'Phone Clicked',
  EMAIL_CLICKED: 'Email Clicked',
  SOCIAL_CLICKED: 'Social Clicked',
} as const

export type FunnelEvent = typeof FUNNEL_EVENTS[keyof typeof FUNNEL_EVENTS]

// Props for booking funnel events
interface BookingProps {
  language?: string
  date?: string
  timeSlot?: string
  passengers?: number
  adults?: number
  children?: number
  babies?: number
  totalPrice?: number
  isPrivate?: boolean
  [key: string]: string | number | boolean | undefined
}

interface PaymentProps extends BookingProps {
  method?: 'stripe' | 'paypal' | 'counter'
  currency?: string
}

interface ConfirmationProps extends PaymentProps {
  bookingId?: string
  reference?: string
}

/**
 * Hook for tracking conversion funnel events
 */
export function useFunnelTracking() {
  return {
    /**
     * Track when user starts booking flow (selects date/time)
     */
    bookingStarted: (props?: BookingProps) => {
      trackEvent(FUNNEL_EVENTS.BOOKING_STARTED, {
        props: sanitizeProps(props)
      })
    },

    /**
     * Track when user selects a time slot
     */
    slotSelected: (props?: Pick<BookingProps, 'language' | 'date' | 'timeSlot'>) => {
      trackEvent(FUNNEL_EVENTS.SLOT_SELECTED, {
        props: sanitizeProps(props)
      })
    },

    /**
     * Track when passengers count changes
     */
    passengersUpdated: (props?: Pick<BookingProps, 'passengers' | 'adults' | 'children' | 'babies'>) => {
      trackEvent(FUNNEL_EVENTS.PASSENGERS_UPDATED, {
        props: sanitizeProps(props)
      })
    },

    /**
     * Track when user fills contact form (before payment)
     */
    formFilled: (props?: BookingProps) => {
      trackEvent(FUNNEL_EVENTS.BOOKING_FORM_FILLED, {
        props: sanitizeProps(props)
      })
    },

    /**
     * Track when payment is initiated (redirect to provider)
     */
    paymentInitiated: (props?: PaymentProps) => {
      const eventProps = sanitizeProps(props)
      trackEvent(FUNNEL_EVENTS.PAYMENT_INITIATED, {
        props: eventProps,
        // Track revenue if totalPrice is available
        ...(props?.totalPrice && {
          revenue: {
            currency: props.currency || 'EUR',
            amount: props.totalPrice
          }
        })
      })
    },

    /**
     * Track payment method selection
     */
    paymentMethodSelected: (method: PaymentProps['method']) => {
      trackEvent(FUNNEL_EVENTS.PAYMENT_METHOD_SELECTED, {
        props: { method: method || 'unknown' }
      })
    },

    /**
     * Track successful booking confirmation
     */
    bookingConfirmed: (props?: ConfirmationProps) => {
      const eventProps = sanitizeProps(props)
      trackEvent(FUNNEL_EVENTS.BOOKING_CONFIRMED, {
        props: eventProps,
        // Track revenue on confirmation
        ...(props?.totalPrice && {
          revenue: {
            currency: props.currency || 'EUR',
            amount: props.totalPrice
          }
        })
      })
    },

    /**
     * Track booking cancellation
     */
    bookingCancelled: (props?: { bookingId?: string; reason?: string }) => {
      trackEvent(FUNNEL_EVENTS.BOOKING_CANCELLED, {
        props: sanitizeProps(props)
      })
    },

    /**
     * Track contact form opened
     */
    contactFormOpened: (type?: 'general' | 'group' | 'complaint') => {
      trackEvent(FUNNEL_EVENTS.CONTACT_FORM_OPENED, {
        props: { type: type || 'general' }
      })
    },

    /**
     * Track contact form submitted
     */
    contactFormSubmitted: (type?: 'general' | 'group' | 'complaint') => {
      trackEvent(FUNNEL_EVENTS.CONTACT_FORM_SUBMITTED, {
        props: { type: type || 'general' }
      })
    },

    /**
     * Track language change
     */
    languageChanged: (from: string, to: string) => {
      trackEvent(FUNNEL_EVENTS.LANGUAGE_CHANGED, {
        props: { from, to }
      })
    },

    /**
     * Track gallery view
     */
    galleryViewed: () => {
      trackEvent(FUNNEL_EVENTS.GALLERY_VIEWED)
    },

    /**
     * Track reviews section viewed
     */
    reviewsViewed: () => {
      trackEvent(FUNNEL_EVENTS.REVIEWS_VIEWED)
    },

    /**
     * Track FAQ expansion
     */
    faqExpanded: (question?: string) => {
      trackEvent(FUNNEL_EVENTS.FAQ_EXPANDED, {
        props: question ? { question } : undefined
      })
    },

    /**
     * Track click on phone number
     */
    phoneClicked: () => {
      trackEvent(FUNNEL_EVENTS.PHONE_CLICKED)
    },

    /**
     * Track click on email
     */
    emailClicked: () => {
      trackEvent(FUNNEL_EVENTS.EMAIL_CLICKED)
    },

    /**
     * Track click on social media link
     */
    socialClicked: (platform: 'facebook' | 'instagram' | 'tripadvisor' | 'google') => {
      trackEvent(FUNNEL_EVENTS.SOCIAL_CLICKED, {
        props: { platform }
      })
    },

    /**
     * Track custom event
     */
    track: trackEvent
  }
}

/**
 * Sanitize props to ensure only string/number/boolean values
 */
function sanitizeProps(props?: Record<string, unknown>): Record<string, string | number | boolean> | undefined {
  if (!props) return undefined
  
  const result: Record<string, string | number | boolean> = {}
  
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined) continue
    
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[key] = value
    } else {
      result[key] = String(value)
    }
  }
  
  return Object.keys(result).length > 0 ? result : undefined
}

// Direct exports for non-hook usage
export const funnelTracking = {
  bookingStarted: (props?: BookingProps) => {
    trackEvent(FUNNEL_EVENTS.BOOKING_STARTED, { props: sanitizeProps(props) })
  },
  formFilled: (props?: BookingProps) => {
    trackEvent(FUNNEL_EVENTS.BOOKING_FORM_FILLED, { props: sanitizeProps(props) })
  },
  paymentInitiated: (props?: PaymentProps) => {
    trackEvent(FUNNEL_EVENTS.PAYMENT_INITIATED, {
      props: sanitizeProps(props),
      ...(props?.totalPrice && {
        revenue: { currency: props.currency || 'EUR', amount: props.totalPrice }
      })
    })
  },
  bookingConfirmed: (props?: ConfirmationProps) => {
    trackEvent(FUNNEL_EVENTS.BOOKING_CONFIRMED, {
      props: sanitizeProps(props),
      ...(props?.totalPrice && {
        revenue: { currency: props.currency || 'EUR', amount: props.totalPrice }
      })
    })
  },
  track: trackEvent
}
