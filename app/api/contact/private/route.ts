import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      error: "Cet endpoint n'existe plus. La privatisation se fait désormais via la réservation payée." 
    },
    { status: 410 }
  )
}
