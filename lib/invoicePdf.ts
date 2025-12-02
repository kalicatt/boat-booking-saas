import path from 'path'
import { readFile } from 'fs/promises'

const currencyFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const dateFormatterLong = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' })

export interface BookingInvoicePayload {
  invoiceNumber: string
  issueDate: Date
  serviceDate: string
  serviceTime: string
  totalPrice: number
  adults: number
  children: number
  babies: number
  unitPrices: { adult: number; child: number; baby: number }
  customer: { firstName?: string | null; lastName?: string | null; email: string; phone?: string | null }
  logoBuffer?: Buffer | null
}

function resolveCustomerName(payload: BookingInvoicePayload) {
  const { firstName, lastName } = payload.customer
  const name = [firstName, lastName].filter(Boolean).join(' ').trim()
  return name.length > 0 ? name : 'Client Sweet Narcisse'
}

async function ensureLogoBuffer(explicit?: Buffer | null): Promise<Buffer | null> {
  if (explicit) return explicit
  try {
    const logoPath = path.join(process.cwd(), 'public', 'images', 'logo.jpg')
    return await readFile(logoPath)
  } catch {
    return null
  }
}

export async function generateBookingInvoicePdf(payload: BookingInvoicePayload): Promise<Buffer> {
  const pdfkitModule = await import('pdfkit')
  const PDFCtor = (pdfkitModule as unknown as { default?: typeof import('pdfkit') }).default ?? (pdfkitModule as unknown as typeof import('pdfkit'))
  const doc = new PDFCtor({ size: 'A4', margin: 50 })

  const chunks: Buffer[] = []
  doc.on('data', (chunk) => chunks.push(chunk as Buffer))

  const bufferPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  const logoBuffer = await ensureLogoBuffer(payload.logoBuffer)
  const customerName = resolveCustomerName(payload)
  const invoiceDateLabel = dateFormatterLong.format(payload.issueDate)
  const rideDate = dateFormatterLong.format(new Date(`${payload.serviceDate}T00:00:00`))

  if (logoBuffer) {
    doc.image(logoBuffer, doc.page.margins.left, doc.y, { width: 140 })
    doc.moveDown(2)
  } else {
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(22).text('Sweet Narcisse')
    doc.moveDown(0.5)
  }

  doc.fillColor('#475569').font('Helvetica').fontSize(10)
  doc.text('Pont Saint-Pierre')
  doc.text('10 Rue de la Herse')
  doc.text('68000 Colmar, France')
  doc.text('contact@sweet-narcisse.fr')
  doc.text('+33 3 89 20 68 92')

  doc.moveDown(1.5)
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(16).text(`Facture #${payload.invoiceNumber}`, { align: 'left' })
  doc.fillColor('#1e293b').fontSize(11).text(`Émise le ${invoiceDateLabel}`)
  doc.text(`Sortie du ${rideDate} à ${payload.serviceTime}`)

  doc.moveDown(1)
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text('Destinataire')
  doc.fillColor('#1f2937').font('Helvetica').fontSize(11).text(customerName)
  doc.text(payload.customer.email)
  if (payload.customer.phone) {
    doc.text(payload.customer.phone)
  }

  doc.moveDown(1.5)
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text('Détail de la prestation')
  doc.moveDown(0.5)

  const tableStartX = doc.page.margins.left
  const columnWidths = [260, 60, 100, 100]

  const drawRow = (values: [string, string, string, string], options?: { bold?: boolean }) => {
    if (options?.bold) {
      doc.font('Helvetica-Bold').fillColor('#0f172a')
    } else {
      doc.font('Helvetica').fillColor('#1f2937')
    }

    doc.text(values[0], tableStartX, doc.y, { width: columnWidths[0] })
    doc.text(values[1], tableStartX + columnWidths[0], doc.y, { width: columnWidths[1], align: 'center' })
    doc.text(values[2], tableStartX + columnWidths[0] + columnWidths[1], doc.y, { width: columnWidths[2], align: 'right' })
    doc.text(values[3], tableStartX + columnWidths[0] + columnWidths[1] + columnWidths[2], doc.y, { width: columnWidths[3], align: 'right' })
    doc.moveDown(0.4)
  }

  drawRow(['Description', 'Qté', 'PU', 'Total'], { bold: true })
  doc.moveTo(tableStartX, doc.y).lineTo(tableStartX + columnWidths.reduce((sum, value) => sum + value, 0), doc.y).strokeColor('#cbd5f5').lineWidth(0.5).stroke()
  doc.moveDown(0.2)

  const rows: Array<[string, number, number]> = []
  if (payload.adults > 0) rows.push(['Billets adultes', payload.adults, payload.unitPrices.adult])
  if (payload.children > 0) rows.push(['Enfants (4-10 ans)', payload.children, payload.unitPrices.child])
  if (payload.babies > 0) rows.push(['Bébés (0-3 ans)', payload.babies, payload.unitPrices.baby])
  if (rows.length === 0) rows.push(['Passagers', payload.adults + payload.children + payload.babies, payload.totalPrice])

  rows.forEach(([label, quantity, unitPrice]) => {
    const total = unitPrice * quantity
    drawRow([
      label,
      String(quantity),
      currencyFormatter.format(unitPrice),
      currencyFormatter.format(total)
    ])
  })

  doc.moveDown(0.5)
  doc.moveTo(tableStartX, doc.y).lineTo(tableStartX + columnWidths.reduce((sum, value) => sum + value, 0), doc.y).strokeColor('#cbd5f5').lineWidth(0.5).stroke()
  doc.moveDown(0.2)

  drawRow(['Total TTC', '', '', currencyFormatter.format(payload.totalPrice)], { bold: true })

  doc.moveDown(1.2)
  doc.font('Helvetica').fontSize(10).fillColor('#475569').text('TVA non applicable, article 293 B du CGI. Merci pour votre confiance et bonne navigation !')

  doc.end()
  return bufferPromise
}
