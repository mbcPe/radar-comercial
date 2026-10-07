'use client';

/**
 * Marco común de las ventanas (modales).
 *
 * - Un clic en el fondo NO cierra: los usuarios perdían lo que estaban
 *   escribiendo. Solo cierran la ✕ y el botón Cancelar de cada formulario.
 * - En celular ocupa toda la pantalla y scrollea por dentro; desde `sm`
 *   vuelve a ser una ventana centrada.
 */

import type { ReactNode } from 'react';

export default function Ventana({
  titulo,
  onClose,
  children,
  ancho = 'max-w-2xl',
}: {
  titulo: string;
  onClose: () => void;
  children: ReactNode;
  /** Clase de ancho máximo en escritorio. */
  ancho?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/50 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`flex h-[100dvh] w-full flex-col bg-white shadow-xl sm:h-auto sm:max-h-[90vh] sm:rounded-xl ${ancho}`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ceramica-300 px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="text-base font-medium text-mbc">{titulo}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-2 flex h-10 w-10 items-center justify-center text-xl leading-none text-arena hover:text-mbc"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
