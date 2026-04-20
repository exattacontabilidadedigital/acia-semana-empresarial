'use client'

import { useState } from 'react'
import {
  Calendar,
  Clock,
  MapPin,
  Ticket as TicketIcon,
  ChevronDown,
} from 'lucide-react'

interface CollapsibleEventProps {
  title: string
  date: string
  startTime: string
  endTime?: string
  location?: string
  ticketCount: number
  isHalfPrice?: boolean
  tickets: Array<{ id: string; participant_name: string }>
  defaultOpen?: boolean
}

export default function CollapsibleEvent({
  title,
  date,
  startTime,
  endTime,
  location,
  ticketCount,
  isHalfPrice,
  tickets,
  defaultOpen = true,
}: CollapsibleEventProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-extrabold text-purple truncate">{title}</div>
          {!open && (
            <div className="text-[11px] text-gray-500 mt-0.5 truncate">
              {date} · {ticketCount} ingresso{ticketCount === 1 ? '' : 's'}
            </div>
          )}
        </div>
        <ChevronDown
          size={18}
          className={`text-gray-400 shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-600 mb-2">
            <span className="flex items-center gap-1">
              <Calendar size={12} className="text-purple" />
              <b className="text-dark">{date}</b>
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} className="text-purple" />
              <b className="text-dark">
                {startTime}
                {endTime ? ` — ${endTime}` : ''}
              </b>
            </span>
            {location && (
              <span className="flex items-center gap-1">
                <MapPin size={12} className="text-purple" />
                <b className="text-dark">{location}</b>
              </span>
            )}
          </div>

          {ticketCount > 0 && (
            <>
              <p className="text-[10px] font-bold text-orange uppercase tracking-wide flex items-center gap-1 mb-1.5">
                <TicketIcon size={11} />
                {ticketCount} ingresso{ticketCount === 1 ? '' : 's'}
                {isHalfPrice ? ' · meia-entrada' : ''}
              </p>
              <ul className="space-y-1">
                {tickets.map((ticket) => (
                  <li
                    key={ticket.id}
                    className="flex justify-between items-center bg-[#f5f5fa] rounded-md px-2.5 py-1.5 text-xs"
                  >
                    <span className="text-gray-700">{ticket.participant_name}</span>
                    <span className="text-gray-400 font-mono text-[10px]">
                      {ticket.id.slice(0, 8)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
