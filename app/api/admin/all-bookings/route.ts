import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseISO, startOfDay, addDays } from 'date-fns';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');

  if (!startParam || !endParam) {
    return NextResponse.json({ error: "Missing date range parameters" }, { status: 400 });
  }

  try {
    const startDate = parseISO(startParam);
    const endDateRaw = parseISO(endParam);
    
    // CORRECTION MAJEURE: Pour garantir que nous capturons les événements jusqu'à 23:59:59
    // sans problème de fuseau horaire, nous allons définir la limite supérieure 
    // comme étant le début du jour suivant (lt: <)
    const exclusiveEndDate = addDays(startOfDay(endDateRaw), 1); 

    // Vérification stricte des dates
    if (isNaN(startDate.getTime()) || isNaN(exclusiveEndDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Expected ISO 8601." },
        { status: 400 }
      );
    }

    const bookings = await prisma.booking.findMany({
      where: {
        startTime: {
          gte: startDate, // Date de début incluse
          lt: exclusiveEndDate, // Jusqu'au début du jour suivant (exclue)
        },
        status: {
          not: 'CANCELLED',
        },
      },
      include: {
        boat: {
          select: { capacity: true }
        },
        user: {
          select: { firstName: true, lastName: true, email: true, phone: true, role: true }
        }
      },
      orderBy: {
        startTime: 'asc',
      }
    });

    return NextResponse.json(bookings);

  } catch (error) {
    console.error("Error fetching admin bookings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

}