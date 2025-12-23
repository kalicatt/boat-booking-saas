'use client'

import { useState } from 'react'

type AlertType = {
  title: string
  icon: string
  items: string[]
  tone: 'info' | 'warning'
}

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
          className={`bg-white rounded-lg shadow-2xl border-2 transition-all duration-300 ${
            hasStartCritical ? 'border-red-400' : 'border-sky-400'
          } ${startExpanded ? 'w-96' : 'w-auto'}`}
        >
          <button
            onClick={() => setStartExpanded(!startExpanded)}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition rounded-lg"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg text-xl bg-sky-100 flex-shrink-0">
              🌅
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                Début de journée
              </h3>
              {!startExpanded && hasStartCritical && (
                <p className="text-xs text-red-600 font-semibold mt-0.5">
                  {realStartAlerts.length} alerte{realStartAlerts.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
            {hasStartCritical && (
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full flex-shrink-0">
                URGENT
              </span>
            )}
            <span className="text-slate-400 ml-2">
              {startExpanded ? '▼' : '▶'}
            </span>
          </button>
          
          {startExpanded && (
            <div className="px-4 pb-4 pt-2 border-t border-slate-200">
              <ul className="space-y-2">
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
          className={`bg-white rounded-lg shadow-2xl border-2 transition-all duration-300 ${
            hasEndCritical ? 'border-red-400' : 'border-amber-400'
          } ${endExpanded ? 'w-96' : 'w-auto'}`}
        >
          <button
            onClick={() => setEndExpanded(!endExpanded)}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition rounded-lg"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg text-xl bg-amber-100 flex-shrink-0">
              🌇
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                Fin de journée
              </h3>
              {!endExpanded && hasEndCritical && (
                <p className="text-xs text-red-600 font-semibold mt-0.5">
                  {realEndAlerts.length} alerte{realEndAlerts.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
            {hasEndCritical && (
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full flex-shrink-0">
                URGENT
              </span>
            )}
            <span className="text-slate-400 ml-2">
              {endExpanded ? '▼' : '▶'}
            </span>
          </button>
          
          {endExpanded && (
            <div className="px-4 pb-4 pt-2 border-t border-slate-200">
              <ul className="space-y-2">
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
