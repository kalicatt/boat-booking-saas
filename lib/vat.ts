export function getVatRate(): number {
  const env = process.env.VAT_RATE
  const rate = env ? parseFloat(env) : 20.0
  return isNaN(rate) ? 20.0 : rate
}

export function computeVatFromGross(grossCents: number) {
  const rate = getVatRate() / 100
  const net = Math.round(grossCents / (1 + rate))
  const vat = grossCents - net
  return { ratePercent: getVatRate(), net, vat, gross: grossCents }
}