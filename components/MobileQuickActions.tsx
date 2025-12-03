"use client"

import { useEffect, useState } from 'react'
import { DEFAULT_BOAT_CAPACITY, TOUR_DURATION_MINUTES } from '@/lib/config'

interface MobileQuickActionsProps {
  bookHref?: string
  bookLabel?: string
  subtitle?: string
  phoneNumber?: string
  phoneLabel?: string
  headline?: string
  menuVisible?: boolean
}

const sanitizePhone = (value?: string) => {
  if (!value) return ''
  return value.replace(/[^+\d]/g, '')
}

export default function MobileQuickActions({
  bookHref = '#reservation',
  bookLabel = 'Réserver',
  subtitle = 'Balade intimiste à Colmar',
  phoneNumber,
  phoneLabel = 'Nous appeler',
  headline = 'Sweet Narcisse',
  menuVisible = false
}: MobileQuickActionsProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const evaluate = () => setIsMobile(window.innerWidth < 1024)
    evaluate()
    window.addEventListener('resize', evaluate)
    return () => window.removeEventListener('resize', evaluate)
  }, [])

  useEffect(() => {
    if (!isMobile) {
      return undefined
    }
    const handleScroll = () => setVisible(window.scrollY > 140)
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isMobile])

  if (!isMobile || menuVisible) {
    return null
  }

  const telHref = sanitizePhone(phoneNumber)
  const durationLabel = `≈${TOUR_DURATION_MINUTES} min`
  const capacityLabel = `${DEFAULT_BOAT_CAPACITY} places`

  return (
    <div className={`sn-mobile-actions ${visible ? 'is-visible' : ''}`}>
      <div className="sn-mobile-actions__stack">
        <div>
          <p className="sn-mobile-actions__title">{headline}</p>
          <p className="sn-mobile-actions__subtitle">{subtitle}</p>
        </div>
        <div className="sn-mobile-actions__chips">
          <span className="sn-mobile-actions__chip">{durationLabel}</span>
          <span className="sn-mobile-actions__chip">{capacityLabel}</span>
        </div>
      </div>
      <div className="sn-mobile-actions__cta">
        <a href={bookHref} className="sn-mobile-actions__primary" aria-label={bookLabel}>
          {bookLabel}
        </a>
        {telHref && (
          <a href={`tel:${telHref}`} className="sn-mobile-actions__secondary" aria-label={phoneLabel}>
            {phoneLabel}
          </a>
        )}
      </div>
    </div>
  )
}
