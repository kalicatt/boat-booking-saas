"use client"

type PaymentCountdownProps = {
  title: string
  label: string
  helperText: string
  secondsLeft: number | null
  totalSeconds: number
  expired?: boolean
}

const pad = (value: number) => value.toString().padStart(2, '0')

export default function PaymentCountdown({ title, label, helperText, secondsLeft, totalSeconds, expired }: PaymentCountdownProps) {
  const safeSeconds = typeof secondsLeft === 'number' ? Math.max(0, secondsLeft) : null
  const minutes = safeSeconds !== null ? Math.floor(safeSeconds / 60) : 0
  const secs = safeSeconds !== null ? safeSeconds % 60 : 0
  const formattedTime = safeSeconds !== null ? `${pad(minutes)}:${pad(secs)}` : '--:--'
  const ratio = safeSeconds !== null && totalSeconds > 0 ? Math.min(1, Math.max(0, safeSeconds / totalSeconds)) : 0
  const isWarning = !expired && safeSeconds !== null && safeSeconds <= 60

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
          <p className="text-[11px] text-slate-500">{helperText}</p>
        </div>
        <div className={`rounded-lg px-3 py-2 text-center text-sm font-mono font-bold ${expired ? 'bg-red-100 text-red-700' : isWarning ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
          <div className="text-[10px] font-semibold uppercase tracking-wide">{label}</div>
          <div className="text-lg">{formattedTime}</div>
        </div>
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${expired ? 'bg-red-400' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  )
}
