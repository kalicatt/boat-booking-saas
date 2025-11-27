export async function sendAlert(message: string, payload?: any){
  const url = process.env.ALERT_WEBHOOK_URL
  if(!url) return
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, payload, ts: new Date().toISOString() })
    })
  } catch {}
}
