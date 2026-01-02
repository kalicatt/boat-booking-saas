'use client'

import { useState } from 'react'

interface FloatingAlertsProps {
  startAlerts: string[]
  endAlerts: string[]
}

// Détecte si un message est une vraie alerte (pas juste informatif)
function isRealAlert(message: string): boolean {
  const normalMessages = [
    "Départ possible sur l'ensemble de la flotte",
    "aucune alerte",
    "cloche possible"
  ]
  return !normalMessages.some(normal => message.toLowerCase().includes(normal.toLowerCase()))
}

export function FloatingAlerts({ startAlerts, endAlerts }: FloatingAlertsProps) {
  const [startExpanded, setStartExpanded] = useState(false)
  const [endExpanded, setEndExpanded] = useState(false)
  
  // Filtrer pour ne garder que les vraies alertes
  const realStartAlerts = startAlerts.filter(isRealAlert)
  const realEndAlerts = endAlerts.filter(isRealAlert)
  
  // Ne rien afficher si aucune alerte
  if (realStartAlerts.length === 0 && realEndAlerts.length === 0) {
    return null
  }
  
  const hasStartCritical = realStartAlerts.some(msg => 
    msg.includes('🔴') || msg.includes('Alerte') || msg.includes('critiques')
  )
  const hasEndCritical = realEndAlerts.some(msg => 
    msg.includes('🔴') || msg.includes('Alerte') || msg.includes('critiques')
  )

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md">
      {/* Alerte Début de journée */}
      {realStartAlerts.length > 0 && (
        <div 
          className={`animate-in slide-in-from-right-5 fade-in duration-500 bg-white rounded-2xl shadow-2xl border-2 transition-all ${
            hasStartCritical ? 'border-red-400' : 'border-sky-400'
          } ${startExpanded ? 'w-96' : 'w-auto'}`}
        >
          <button
            onClick={() => setStartExpanded(!startExpanded)}
            className="w-full px-5 py-4 flex items-center gap-3 hover:bg-slate-50 transition-colors rounded-2xl"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl flex-shrink-0 shadow-sm ${
              hasStartCritical ? 'bg-red-50 animate-pulse' : 'bg-sky-50'
            }`}>
              🌅
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Début de journée
              </h3>
              {!startExpanded && hasStartCritical && (
                <p className="text-xs text-red-600 font-semibold mt-1">
                  {realStartAlerts.length} alerte{realStartAlerts.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
            {hasStartCritical && (
              <span className="px-2.5 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full flex-shrink-0 animate-pulse">
                URGENT
              </span>
            )}
            <span className="text-slate-400 ml-2 text-lg transition-transform duration-300" style={{ transform: startExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ▶
            </span>
          </button>
          
          {startExpanded && (
            <div className="px-5 pb-4 pt-2 border-t border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
              <ul className="space-y-2.5">
                {realStartAlerts.map((message, idx) => {
                  const isCritical = message.includes('🔴') || message.includes('Alerte')
                  return (
                    <li key={idx} className={`flex items-start gap-2 text-sm ${isCritical ? 'font-semibold text-red-800' : 'text-slate-700'}`}>
                      <span className="mt-0.5" aria-hidden="true">
                        {isCritical ? '🔴' : '•'}
                      </span>
                      <span className="flex-1">{message.replace('🔴', '').trim()}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Alerte Fin de journée */}
      {realEndAlerts.length > 0 && (
        <div 
          className={`animate-in slide-in-from-right-5 fade-in duration-500 delay-150 bg-white rounded-2xl shadow-2xl border-2 transition-all ${
            hasEndCritical ? 'border-red-400' : 'border-amber-400'
          } ${endExpanded ? 'w-96' : 'w-auto'}`}
        >
          <button
            onClick={() => setEndExpanded(!endExpanded)}
            className="w-full px-5 py-4 flex items-center gap-3 hover:bg-slate-50 transition-colors rounded-2xl"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl flex-shrink-0 shadow-sm ${
              hasEndCritical ? 'bg-red-50 animate-pulse' : 'bg-amber-50'
            }`}>
              🌇
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Fin de journée
              </h3>
              {!endExpanded && hasEndCritical && (
                <p className="text-xs text-red-600 font-semibold mt-1">
                  {realEndAlerts.length} alerte{realEndAlerts.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
            {hasEndCritical && (
              <span className="px-2.5 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full flex-shrink-0 animate-pulse">
                URGENT
              </span>
            )}
            <span className="text-slate-400 ml-2 text-lg transition-transform duration-300" style={{ transform: endExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ▶
            </span>
          </button>
          
          {endExpanded && (
            <div className="px-5 pb-4 pt-2 border-t border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
              <ul className="space-y-2.5">
                {realEndAlerts.map((message, idx) => {
                  const isCritical = message.includes('🔴') || message.includes('Alerte')
                  return (
                    <li key={idx} className={`flex items-start gap-2 text-sm ${isCritical ? 'font-semibold text-red-800' : 'text-slate-700'}`}>
                      <span className="mt-0.5" aria-hidden="true">
                        {isCritical ? '🔴' : '•'}
                      </span>
                      <span className="flex-1">{message.replace('🔴', '').trim()}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
