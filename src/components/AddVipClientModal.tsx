'use client';

import React, { useState } from 'react';

const VIP_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const VIP_DAY_LABELS: Record<string, string> = {
  Lunes: 'L',
  Martes: 'M',
  Miércoles: 'Mi',
  Jueves: 'J',
  Viernes: 'V',
  Sábado: 'S',
};

interface AddVipClientModalProps {
  onSave: (data: any) => void;
  onClose: () => void;
}

export default function AddVipClientModal({ onSave, onClose }: AddVipClientModalProps) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [trainerId, setTrainerId] = useState('henry');
  const [gender, setGender] = useState('Hombre');
  const [goal, setGoal] = useState('');
  const [assignedDays, setAssignedDays] = useState<string[]>(['Lunes', 'Miércoles', 'Viernes']);

  const toggleDay = (day: string) => {
    setAssignedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: name.trim(),
      username: username.trim(),
      password: password.trim(),
      trainerId,
      gender,
      goal: goal.trim(),
      assignedDays,
      routines: {},
      logs: [],
      activeDay: assignedDays[0] || 'Lunes',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#e4e4e7] w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-[#e4e4e7] flex justify-between items-center bg-[#004b73]">
          <h3 className="text-base font-sora-bold flex items-center gap-2" style={{ color: '#ffffff' }}>
            <i className="fa-solid fa-crown" style={{ color: '#00fff6' }}></i>
            <span style={{ color: '#ffffff' }}>Registrar Cliente VIP</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ color: '#ffffff' }}
            className="p-1 transition cursor-pointer hover:opacity-80"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
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
                  placeholder="Ej: Silvia Navarro"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#004b73]"
                />
              </div>
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">
                  Coach Asignado
                </label>
                <select
                  value={trainerId}
                  onChange={(e) => setTrainerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#004b73] cursor-pointer"
                >
                  <option value="henry">Henry</option>
                  <option value="adriana">Adriana</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">
                  Usuario / Código Acceso
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Ej: silvia_vip"
                  className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#004b73]"
                />
              </div>
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">
                  Contraseña / Clave
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Ej: aion2026"
                  className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#004b73]"
                />
              </div>
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">
                  Género
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#004b73] cursor-pointer"
                >
                  <option value="Hombre">Hombre</option>
                  <option value="Mujer">Mujer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-sora-bold text-[#004b73] mb-1.5 uppercase tracking-wide">
                  Objetivo Principal
                </label>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Ej: Hipertrofia + Salud"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#004b73]"
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
                      className="cursor-pointer flex-1 text-center text-xs border border-[#e4e4e7] p-2 select-none"
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
            <button
              type="submit"
              className="w-full py-3 text-xs font-sora-bold bg-[#004b73] hover:bg-[#003857] transition mt-2 cursor-pointer flex items-center justify-center gap-2"
              style={{ color: '#00fff6' }}
            >
              <i className="fa-solid fa-user-plus"></i>
              <span>Registrar Cliente VIP</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
