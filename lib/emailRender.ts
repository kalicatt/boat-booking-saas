import { renderAsync } from '@react-email/render'
import React from 'react'
import { BookingTemplate } from '@/components/emails/BookingTemplate'

export async function renderBookingHtml(props: Parameters<typeof BookingTemplate>[0]){
  const element = React.createElement(BookingTemplate, props)
  return await renderAsync(element)
}
