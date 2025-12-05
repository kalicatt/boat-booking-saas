import { renderAsync } from '@react-email/render'
import React from 'react'
import { BookingTemplate } from '@/components/emails/BookingTemplate'
import { ReviewRequestTemplate } from '@/components/emails/ReviewRequestTemplate'

export async function renderBookingHtml(props: Parameters<typeof BookingTemplate>[0]){
  const element = React.createElement(BookingTemplate, props)
  return await renderAsync(element)
}

export async function renderReviewRequestHtml(props: Parameters<typeof ReviewRequestTemplate>[0]) {
  const element = React.createElement(ReviewRequestTemplate, props)
  return await renderAsync(element)
}
