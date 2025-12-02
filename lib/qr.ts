import QRCode from 'qrcode'

const QR_CONFIG = {
  errorCorrectionLevel: 'M' as const,
  type: 'image/png' as const,
  margin: 1,
  width: 240
}

const buildPayload = (bookingId: string, publicReference?: string | null) =>
  JSON.stringify({ type: 'booking', bookingId, reference: publicReference ?? undefined })

export async function generateBookingQrCodeDataUrl(
  bookingId: string,
  publicReference?: string | null
): Promise<string> {
  const payload = buildPayload(bookingId, publicReference)
  return QRCode.toDataURL(payload, QR_CONFIG)
}

export async function generateBookingQrCodeBuffer(
  bookingId: string,
  publicReference?: string | null
): Promise<Buffer> {
  const payload = buildPayload(bookingId, publicReference)
  return QRCode.toBuffer(payload, QR_CONFIG)
}
