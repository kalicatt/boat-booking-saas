declare module 'pdfkit' {
  import { Readable } from 'stream'

  interface PDFDocumentOptions {
    size?: string | [number, number]
    margin?: number
  }

  class PDFDocument extends Readable {
    constructor(options?: PDFDocumentOptions)
    image(src: Buffer | string, x?: number, y?: number, options?: { width?: number; height?: number }): this
    text(text: string, x?: number, y?: number, options?: Record<string, unknown>): this
    font(name: string): this
    fontSize(size: number): this
    fillColor(color: string): this
    moveDown(lines?: number): this
    moveTo(x: number, y: number): this
    lineTo(x: number, y: number): this
    lineWidth(width: number): this
    strokeColor(color: string): this
    stroke(): this
    end(): void
    readonly page: { margins: { left: number; top: number } }
    y: number
  }

  export = PDFDocument
}
