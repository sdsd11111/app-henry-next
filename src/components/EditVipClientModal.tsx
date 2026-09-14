'use client';

import React, { useState } from 'react';
import { VipClient } from '@/lib/types';

const VIP_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const VIP_DAY_LABELS: Record<string, string> = {
  Lunes: 'L',
  Martes: 'M',
  Miércoles: 'Mi',
  Jueves: 'J',
  Viernes: 'V',
  Sábado: 'S',
};

interface EditVipClientModalProps {
  client: VipClient;
  onSave: (data: Partial<VipClient>) => Promise<void> | void;
  onClose: () => void;
}

export default function EditVipClientModal({
  client,
  onSave,
  onClose,
}: EditVipClientModalProps) {
  const [name, setName] = useState(client.name || '');
  const [username, setUsername] = useState(client.username || '');
  const [password, setPassword] = useState(client.password_plain || client.password || '');
  const [trainerId, setTrainerId] = useState(client.trainerId || 'henry');
  const [gender, setGender] = useState(client.gender || 'Hombre');
  const [goal, setGoal] = useState(client.goal || '');
  const [assignedDays, setAssignedDays] = useState<string[]>(client.assignedDays || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const toggleDay = (day: string) => {
    setAssignedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await onSave({
        name,
        username,
        password,
        trainerId,
        gender,
        goal,
        assignedDays,
      });
    } catch (err: any) {
      console.error('Error al guardar datos de cliente:', err);
      setErrorMessage(err?.message || 'Error al guardar los cambios.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#e4e4e7] w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-[#e4e4e7] flex justify-between items-center bg-[#004b73]">
          <h3 className="text-base font-sora-bold flex items-center gap-2" style={{ color: '#ffffff' }}>
            <i className="fa-solid fa-pen-to-square" style={{ color: '#00fff6' }}></i>
            <span style={{ color: '#ffffff' }}>Editar Cliente VIP</span>
          </h3>
          <button
            onClick={onClose}
            type="button"
            disabled={isSubmitting}
            style={{ color: '#ffffff' }}
            className="p-1 transition hover:opacity-80 cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded focus:border-[#004b73] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">
                  Coach Asignado
                </label>
                <select
                  value={trainerId}
                  onChange={(e) => setTrainerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded focus:border-[#004b73] focus:outline-none cursor-pointer"
                >
                  <option value="henry">Henry</option>
                  <option value="adriana">Adriana</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">
                  Usuario
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-xs font-mono border border-slate-300 rounded focus:border-[#004b73] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">
                  Nueva Contraseña
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Dejar vacío para no cambiar"
                  className="w-full px-3.5 py-2.5 text-xs font-mono border border-slate-300 rounded focus:border-[#004b73] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">
                  Género
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded focus:border-[#004b73] focus:outline-none cursor-pointer"
                >
                  <option value="Hombre">Hombre</option>
                  <option value="Mujer">Mujer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">
                  Objetivo
                </label>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded focus:border-[#004b73] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">
                  Días de Entrenamiento
                </label>
                <div className="flex gap-1.5">
                  {VIP_DAYS.map((d) => (
                    <label
                      key={d}
                      className="cursor-pointer flex-1 text-center text-xs border border-[#e4e4e7] p-2 select-none transition"
                      style={{
                        background: assignedDays.includes(d) ? '#00fff6' : '#fff',
                        color: '#000',
                      }}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={assignedDays.includes(d)}
                        onChange={() => toggleDay(d)}
                      />
                      {VIP_DAY_LABELS[d]}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-sora-medium text-slate-600 border border-[#e4e4e7] bg-white transition hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-sora-bold bg-[#004b73] hover:bg-[#003857] transition disabled:opacity-60 flex items-center gap-2 cursor-pointer"
                style={{ color: '#00fff6' }}
              >
                {isSubmitting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>Guardar Cambios</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
