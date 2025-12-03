import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyBookingToken } from '@/lib/bookingToken'
import { generateBookingQrCodeBuffer } from '@/lib/qr'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bookingId: string; token: string }> }
) {
  const { bookingId, token } = await params

  if (!verifyBookingToken(bookingId, token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, publicReference: true }
  })

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const pngBuffer = await generateBookingQrCodeBuffer(booking.id, booking.publicReference)
  const pngArrayBuffer = pngBuffer.buffer.slice(
    pngBuffer.byteOffset,
    pngBuffer.byteOffset + pngBuffer.byteLength
  ) as ArrayBuffer

  return new NextResponse(pngArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  })
}
