'use client';

import React, { useState } from 'react';
import { VipClient } from '@/lib/types';

interface ShareVipModalProps {
  client: VipClient;
  onClose: () => void;
}

export default function ShareVipModal({ client, onClose }: ShareVipModalProps) {
  const [copied, setCopied] = useState<boolean>(false);

  // Generar enlace seguro a /cliente
  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/cliente` : '';
  const shareUrl = `${baseUrl}?user=${encodeURIComponent(client.username)}`;

  const clientPassword = client.password_plain || (client as any).password || '123';

  const shareMsg = `¡Hola ${client.name}! 👑\nTu coach ${(
    client.trainerId || 'henry'
  ).toUpperCase()} en Team Henry Castillo ha planificado tu rutina de entrenamiento VIP (${
    client.goal || 'Fuerza & Rendimiento'
  }).\n\nAccede directamente a tu portal interactivo para consultar tus ejercicios y registrar tus cargas de hoy desde este enlace exclusivo:\n${shareUrl}\n\n👤 Usuario: ${
    client.username
  }\n🔑 Contraseña: ${clientPassword}\n\n¡A darlo todo en el entrenamiento! 💪`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMsg)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white border border-[#e4e4e7] rounded-none sm:rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto">
        {/* Header oficial estilo captura */}
        <div className="p-4 border-b border-[#003857] flex justify-between items-center bg-gradient-to-r from-[#004b73] to-[#003857] text-white">
          <h3 className="text-sm sm:text-base font-sora-bold text-white flex items-center gap-2">
            <i className="fa-solid fa-share-nodes text-amber-300"></i>
            <span>Compartir Rutina y Acceso VIP</span>
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="text-white/80 hover:text-white p-1 cursor-pointer transition"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 space-y-4">
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 text-xs text-[#004b73] space-y-1">
            <p className="font-sora-bold flex items-center gap-1.5 text-[#004b73]">
              <i className="fa-solid fa-crown text-amber-500"></i>
              <span>
                {client.name} (Coach: {(client.trainerId || 'HENRY').toUpperCase()})
              </span>
            </p>
            <p className="text-[11px] text-slate-600 font-poppins-regular">
              Genera y envía este enlace personalizado para que tu cliente acceda directamente a su
              portal con su rutina planificada, sin necesidad de instalaciones complejas.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-sora-bold text-slate-700">
              1. Enlace de Acceso Sincronizado
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-[11px] text-slate-700 font-mono focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-2 bg-[#00fff6] hover:brightness-110 text-black rounded-xl text-xs font-sora-bold shrink-0 transition flex items-center gap-1.5 shadow-md cursor-pointer"
                style={{ color: '#000000' }}
              >
                <i className={copied ? 'fa-solid fa-check' : 'fa-solid fa-copy'}></i>
                <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-sora-bold text-slate-700">
              2. Enviar por WhatsApp con Credenciales
            </label>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-mono text-slate-600 max-h-36 overflow-y-auto whitespace-pre-wrap">
              {shareMsg}
            </div>
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-black font-sora-bold py-3 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              style={{ color: '#000000' }}
            >
              <i className="fa-brands fa-whatsapp text-base"></i>
              <span>Abrir Chat en WhatsApp y Enviar Acceso</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
