import { render } from '@react-email/render'
import { BookingTemplate } from '@/components/emails/BookingTemplate'

export function renderBookingHtml(props: Parameters<typeof BookingTemplate>[0]){
  return render(BookingTemplate(props))
}
