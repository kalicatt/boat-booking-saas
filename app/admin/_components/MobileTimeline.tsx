'use client'

import { Fragment, ReactNode } from 'react'
import { format, isSameDay } from 'date-fns'
import type { Locale } from 'date-fns'
import { fr } from 'date-fns/locale'

export interface MobileTimelineLoadSummary {
  key: string
  label: string
  total: number
  capacity: number
  badgeClass: string
}

export interface MobileTimelineGroup<T> {
  id: string
  slotTime: Date
  items: T[]
  indicatorClass?: string
  loadSummary: MobileTimelineLoadSummary[]
}

interface RenderContext<T> {
  group: MobileTimelineGroup<T>
  groupIndex: number
  itemIndex: number
}

interface DateSeparatorContext<T> {
  group: MobileTimelineGroup<T>
  groupIndex: number
  prevGroup?: MobileTimelineGroup<T>
}

interface ConnectorContext<T> {
  group: MobileTimelineGroup<T>
  groupIndex: number
  nextGroup?: MobileTimelineGroup<T>
}

interface MobileTimelineProps<T> {
  groups: MobileTimelineGroup<T>[]
  renderCard: (item: T, context: RenderContext<T>) => ReactNode
  getItemKey?: (item: T, context: RenderContext<T>) => string | number
  renderDateSeparator?: (context: DateSeparatorContext<T>) => ReactNode
  shouldConnectToNext?: (context: ConnectorContext<T>) => boolean
  formatSlotLabel?: (slotTime: Date, group: MobileTimelineGroup<T>) => string
  locale?: Locale
}

export function MobileTimeline<T>({
  groups,
  renderCard,
  getItemKey,
  renderDateSeparator,
  shouldConnectToNext,
  formatSlotLabel,
  locale = fr
}: MobileTimelineProps<T>) {
  if (!Array.isArray(groups) || groups.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group, groupIndex) => {
        const prevGroup = groupIndex > 0 ? groups[groupIndex - 1] : undefined
        const nextGroup = groupIndex < groups.length - 1 ? groups[groupIndex + 1] : undefined
        const showConnector = shouldConnectToNext
          ? shouldConnectToNext({ group, groupIndex, nextGroup })
          : Boolean(nextGroup && isSameDay(group.slotTime, nextGroup.slotTime))
        const slotLabel = formatSlotLabel
          ? formatSlotLabel(group.slotTime, group)
          : format(group.slotTime, 'HH:mm', { locale })

        return (
          <div key={group.id} className="relative">
            {renderDateSeparator?.({ group, groupIndex, prevGroup })}
            <div className="relative pl-16">
              {showConnector && (
                <span
                  aria-hidden="true"
                  className="absolute left-6 top-16 h-[90%] w-px translate-y-2 bg-slate-200"
                />
              )}
              <div
                aria-hidden="true"
                className={`absolute left-0 top-4 flex h-12 w-12 items-center justify-center rounded-full border-2 bg-white text-[0.8rem] font-black uppercase leading-none ${group.indicatorClass ?? 'border-slate-300 text-slate-600 shadow-[0_0_0_3px_rgba(148,163,184,0.25)]'}`}
              >
                {slotLabel}
              </div>

              {group.loadSummary.length > 0 && (
                <div className="ml-2 flex flex-wrap gap-2 pl-4 pt-1 text-[11px] font-semibold text-slate-500">
                  {group.loadSummary.map((entry) => (
                    <span
                      key={entry.key}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${entry.badgeClass}`}
                    >
                      <span className="truncate text-xs font-bold">{entry.label}</span>
                      <span className="inline-flex items-center rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-black text-slate-800">
                        {entry.total} / {entry.capacity}
                        <span className="ml-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          pax
                        </span>
                      </span>
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 flex gap-3 overflow-x-auto pb-2 pr-4 snap-x snap-mandatory">
                {group.items.map((item, itemIndex) => {
                  const context: RenderContext<T> = { group, groupIndex, itemIndex }
                  const key = getItemKey ? getItemKey(item, context) : itemIndex
                  return (
                    <Fragment key={key}>{renderCard(item, context)}</Fragment>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
