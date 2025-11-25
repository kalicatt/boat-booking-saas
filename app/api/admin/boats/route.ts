import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // On récupère les barques
    const boats = await prisma.boat.findMany({
      orderBy: { id: 'asc' }
    })
    
    console.log("Barques trouvées en base :", boats.length) // <--- Ce log apparaîtra dans ton terminal VS Code

    const resources = boats.map(b => ({
      id: b.id,
      title: b.name,
      capacity: b.capacity
    }))

    return NextResponse.json(resources)
  } catch (error) {
    console.error("Erreur API Boats:", error) // Regarde ton terminal si ça s'affiche
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const updatedBoat = await prisma.boat.update({
      where: { id: parseInt(body.id) },
      data: { name: body.name }
    })
    return NextResponse.json(updatedBoat)
  } catch (error) {
    return NextResponse.json({ error: "Erreur update" }, { status: 500 })
  }
}