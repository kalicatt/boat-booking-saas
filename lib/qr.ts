import QRCode from 'qrcode'

/**
 * Generates a booking QR code embedding a minimal JSON payload `{ type: 'booking', bookingId }`.
 * Returns a PNG data URL suitable for email embedding.
 */
export async function generateBookingQrCodeDataUrl(bookingId: string): Promise<string> {
  const payload = JSON.stringify({ type: 'booking', bookingId })
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    margin: 1,
    width: 240
  })
}
