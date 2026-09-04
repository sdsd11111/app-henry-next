'use client';

import React, { useState } from 'react';
import { FloorClient } from '@/lib/types';

interface CoachFloorPanelProps {
  clients: FloorClient[];
  onAddClient: () => void;
  onEditClient: (client: FloorClient) => void;
  onDeleteClient: (id: string) => void;
  onToggleActive: (id: string) => void;
}

const TIME_SLOTS_ORDER = [
  '07:00 - 08:00 AM', '08:00 - 09:00 AM', '09:00 - 10:00 AM', '10:00 - 11:00 AM',
  '11:00 - 12:00 PM', '03:00 - 04:00 PM', '04:00 - 05:00 PM', '05:00 - 06:00 PM',
  '06:00 - 07:00 PM', '07:00 - 08:00 PM', '08:00 - 09:00 PM',
];

const DAYS_LABELS: Record<string, string> = {
  Lun: 'L', Mar: 'M', 'Mié': 'X', Jue: 'J', Vie: 'V', 'Sáb': 'S',
};

export default function CoachFloorPanel({
  clients,
  onAddClient,
  onEditClient,
  onDeleteClient,
  onToggleActive,
}: CoachFloorPanelProps) {
  const [selectedTrainer, setSelectedTrainer] = useState<'all' | 'henry' | 'adriana'>('all');
  const [selectedSlot, setSelectedSlot] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Collect unique time slots from actual clients
  const usedSlots = [...new Set(clients.map(c => c.timeSlot))].sort(
    (a, b) => TIME_SLOTS_ORDER.indexOf(a) - TIME_SLOTS_ORDER.indexOf(b)
  );

  // Filter clients
  const filtered = clients.filter(c => {
    const matchTrainer = selectedTrainer === 'all' || c.trainerId === selectedTrainer;
    const matchSlot = selectedSlot === 'all' || c.timeSlot === selectedSlot;
    const matchSearch = !searchQuery.trim() ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.goal || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchTrainer && matchSlot && matchSearch;
  });

  // Group by time slot
  const grouped: Record<string, FloorClient[]> = {};
  for (const c of filtered) {
    const slot = c.timeSlot || 'Sin horario';
    if (!grouped[slot]) grouped[slot] = [];
    grouped[slot].push(c);
  }

  const sortedSlots = Object.keys(grouped).sort(
    (a, b) => TIME_SLOTS_ORDER.indexOf(a) - TIME_SLOTS_ORDER.indexOf(b)
  );

  const activeCount = clients.filter(c => c.isActiveFloor).length;
  const totalCount = clients.length;

  return (
    <div className="space-y-4">
      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-[#004b73] px-4 py-3">
        <div className="flex items-center gap-3">
          <i className="fa-solid fa-users text-[#00fff6] text-lg"></i>
          <div>
            <h2 className="text-sm font-sora-bold" style={{ color: '#ffffff' }}>Panel de Piso</h2>
            <p className="text-xs" style={{ color: '#00fff6' }}>
              {activeCount} activos · {totalCount} total
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar cliente..."
            className="px-3 py-1.5 text-xs w-36"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', outline: 'none' }}
          />
          <select
            value={selectedTrainer}
            onChange={e => setSelectedTrainer(e.target.value as any)}
            className="px-3 py-1.5 text-xs cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
          >
            <option value="all">Todos los coaches</option>
            <option value="henry">Henry</option>
            <option value="adriana">Adriana</option>
          </select>
          <select
            value={selectedSlot}
            onChange={e => setSelectedSlot(e.target.value)}
            className="px-3 py-1.5 text-xs cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
          >
            <option value="all">Todos los horarios</option>
            {usedSlots.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={onAddClient}
            className="px-3 py-1.5 text-xs font-sora-bold bg-[#00fff6] hover:bg-[#00e5dc] transition flex items-center gap-1.5"
            style={{ color: '#000' }}
          >
            <i className="fa-solid fa-user-plus"></i> Agregar
          </button>
        </div>
      </div>

      {/* NO CLIENTS */}
      {clients.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <i className="fa-solid fa-users text-4xl mb-3 block opacity-30"></i>
          <p className="text-sm font-sora-bold">No hay clientes registrados</p>
          <p className="text-xs mt-1">Usa el botón &quot;Agregar&quot; para registrar el primer cliente</p>
        </div>
      )}

      {/* GROUPED TABLE BY TIME SLOT */}
      {sortedSlots.map(slot => (
        <div key={slot} className="border border-[#e4e4e7]">
          {/* Slot Header */}
          <div className="px-4 py-2 bg-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-clock text-[#00fff6] text-xs"></i>
              <span className="text-xs font-sora-bold" style={{ color: '#00fff6' }}>{slot}</span>
              <span className="text-xs text-slate-400">({grouped[slot].length} cliente{grouped[slot].length !== 1 ? 's' : ''})</span>
            </div>
            <span className="text-xs text-slate-400">
              {grouped[slot].filter(c => c.isActiveFloor).length} activos hoy
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#fafafa] border-b border-[#e4e4e7]">
                  <th className="text-left px-3 py-2.5 font-sora-bold text-[#004b73] uppercase tracking-wide text-[11px] w-8">
                    <span className="sr-only">Estado</span>
                  </th>
                  <th className="text-left px-3 py-2.5 font-sora-bold text-[#004b73] uppercase tracking-wide text-[11px]">Nombre</th>
                  <th className="text-left px-3 py-2.5 font-sora-bold text-[#004b73] uppercase tracking-wide text-[11px]">Coach</th>
                  <th className="text-left px-3 py-2.5 font-sora-bold text-[#004b73] uppercase tracking-wide text-[11px]">Objetivo</th>
                  <th className="text-left px-3 py-2.5 font-sora-bold text-[#004b73] uppercase tracking-wide text-[11px]">Días</th>
                  <th className="text-center px-3 py-2.5 font-sora-bold text-[#004b73] uppercase tracking-wide text-[11px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e4e7]">
                {grouped[slot].map(client => (
                  <tr
                    key={client.id}
                    className={`transition-colors ${client.isActiveFloor ? 'bg-[#f0fff4]' : 'bg-white hover:bg-slate-50'}`}
                  >
                    {/* Active toggle */}
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => onToggleActive(client.id)}
                        title={client.isActiveFloor ? 'Marcar como inactivo' : 'Marcar como activo hoy'}
                        className="w-5 h-5 flex items-center justify-center transition"
                        style={{
                          background: client.isActiveFloor ? '#00fff6' : '#e4e4e7',
                          color: '#000',
                        }}
                      >
                        {client.isActiveFloor ? (
                          <i className="fa-solid fa-check text-[10px]"></i>
                        ) : (
                          <i className="fa-solid fa-minus text-[10px]"></i>
                        )}
                      </button>
                    </td>
                    {/* Name */}
                    <td className="px-3 py-2.5">
                      <span className="font-sora-medium text-slate-900">{client.name}</span>
                    </td>
                    {/* Trainer */}
                    <td className="px-3 py-2.5">
                      <span className="text-slate-600 capitalize">{client.trainerId}</span>
                    </td>
                    {/* Goal */}
                    <td className="px-3 py-2.5 max-w-[160px]">
                      <span className="text-slate-500 truncate block">{client.goal || '—'}</span>
                    </td>
                    {/* Days */}
                    <td className="px-3 py-2.5">
                      <div className="flex gap-0.5">
                        {(client.assignedDays || []).map(d => (
                          <span
                            key={d}
                            className="inline-flex items-center justify-center w-5 h-5 text-[9px] font-sora-bold"
                            style={{ background: '#004b73', color: '#00fff6' }}
                          >
                            {DAYS_LABELS[d] || d[0]}
                          </span>
                        ))}
                      </div>
                    </td>
                    {/* Actions */}
                    <td className="px-3 py-2.5">
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => onEditClient(client)}
                          title="Editar"
                          className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                        >
                          <i className="fa-solid fa-pen-to-square text-[11px]"></i>
                        </button>
                        <button
                          onClick={() => onDeleteClient(client.id)}
                          title="Eliminar"
                          className="w-7 h-7 flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-500 transition"
                        >
                          <i className="fa-solid fa-trash text-[11px]"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* NO RESULTS (but has clients) */}
      {clients.length > 0 && filtered.length === 0 && (
        <div className="text-center py-10 text-slate-400">
          <i className="fa-solid fa-magnifying-glass text-2xl mb-2 block opacity-30"></i>
          <p className="text-sm">No hay coincidencias para la búsqueda actual</p>
        </div>
      )}
    </div>
  );
}
