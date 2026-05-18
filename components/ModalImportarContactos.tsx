'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import * as XLSX from 'xlsx';

type ContactoCSV = {
  nombre: string;
  pais: string;
  empresa: string;
  area: string;
  cargo: string;
  email: string;
  telefono: string;
  cumple: string;
  prioridad: string;
  last_touch: string;
  next_touch: string;
  estado: string;
  pausa_hasta: string;
  pausa_motivo: string;
  oportunidad: string;
  notas: string;
  manager_email: string;
};

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

export default function ModalImportarContactos({ onClose, onSuccess }: Props) {
  const supabase = createClient();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<ContactoCSV[]>([]);
  const [errores, setErrores] = useState<string[]>([]);
  const [importando, setImportando] = useState(false);
  const [paso, setPaso] = useState<'upload' | 'preview' | 'done'>('upload');

  function descargarPlantilla() {
    // Crear workbook y worksheet
    const headers = [
      'nombre',
      'pais',
      'empresa',
      'area',
      'cargo',
      'email',
      'telefono',
      'cumple',
      'prioridad',
      'last_touch',
      'next_touch',
      'estado',
      'pausa_hasta',
      'pausa_motivo',
      'oportunidad',
      'notas',
      'manager_email',
    ];

    const ejemplo = [
      'Silvana Manrique',
      'Perú',
      'Visa',
      'Visa Direct',
      'Director de Estrategia',
      '',
      '+51 985985538',
      '',
      'P2',
      '2025-05-08',
      '2025-05-15',
      'activo',
      '',
      '',
      '',
      '',
      'prwong@minsait.com',
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ejemplo]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contactos');
    
    // Descargar como Excel
    XLSX.writeFile(wb, 'plantilla_contactos.xlsx');
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setArchivo(file);
    setErrores([]);

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Leer primera hoja
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as ContactoCSV[];
        
        // Validación básica
        const erroresTemp: string[] = [];
        
        jsonData.forEach((row, idx) => {
          if (!row.nombre) erroresTemp.push(`Fila ${idx + 2}: Falta nombre`);
          if (!row.empresa) erroresTemp.push(`Fila ${idx + 2}: Falta empresa`);
          if (!row.manager_email) erroresTemp.push(`Fila ${idx + 2}: Falta manager_email`);
          if (row.prioridad && !['P1', 'P2', 'P3'].includes(row.prioridad)) {
            erroresTemp.push(`Fila ${idx + 2}: Prioridad debe ser P1, P2 o P3`);
          }
          if (row.estado && !['activo', 'pausa', 'inactivo'].includes(row.estado)) {
            erroresTemp.push(`Fila ${idx + 2}: Estado debe ser activo, pausa o inactivo`);
          }
        });

        if (erroresTemp.length > 0) {
          setErrores(erroresTemp);
        } else {
          setPreview(jsonData);
          setPaso('preview');
        }
      } catch (error: any) {
        setErrores([`Error al leer el archivo: ${error.message}`]);
      }
    };

    reader.readAsBinaryString(file);
  }

  async function importar() {
    setImportando(true);
    setErrores([]);

    try {
      // Obtener todos los managers para mapear emails a IDs
      const { data: managers } = await supabase
        .from('managers')
        .select('id, email');

      if (!managers) {
        setErrores(['No se pudieron cargar los managers']);
        setImportando(false);
        return;
      }

      const managerMap = new Map(managers.map(m => [m.email.toLowerCase(), m.id]));

      // Preparar contactos para insertar
      const contactosParaInsertar = preview
        .map((row, idx) => {
          const managerId = managerMap.get(row.manager_email.toLowerCase());
          
          if (!managerId) {
            setErrores(prev => [...prev, `Fila ${idx + 2}: Manager con email ${row.manager_email} no encontrado`]);
            return null;
          }

          // Convertir fechas de Excel si es necesario
          function parseFecha(fecha: any): string | null {
            if (!fecha) return null;
            if (typeof fecha === 'number') {
              // Excel serializa fechas como números
              const date = XLSX.SSF.parse_date_code(fecha);
              return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
            }
            return String(fecha).trim();
          }

          return {
            nombre: row.nombre.trim(),
            pais: row.pais?.trim() || null,
            empresa: row.empresa.trim(),
            area: row.area?.trim() || null,
            cargo: row.cargo?.trim() || null,
            email: row.email?.trim() || null,
            telefono: row.telefono?.trim() || null,
            cumple: row.cumple?.trim() || null,
            prioridad: row.prioridad?.trim() || 'P2',
            last_touch: parseFecha(row.last_touch),
            next_touch: parseFecha(row.next_touch),
            estado: row.estado?.trim() || 'activo',
            pausa_hasta: parseFecha(row.pausa_hasta),
            pausa_motivo: row.pausa_motivo?.trim() || null,
            oportunidad: row.oportunidad?.trim() || null,
            notas: row.notas?.trim() || null,
            manager_id: managerId,
          };
        })
        .filter(c => c !== null);

      if (contactosParaInsertar.length === 0) {
        setImportando(false);
        return;
      }

      // Insertar en BD
      const { error } = await supabase
        .from('contactos')
        .insert(contactosParaInsertar);

      if (error) {
        setErrores([`Error al importar: ${error.message}`]);
        setImportando(false);
        return;
      }

      setPaso('done');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);

    } catch (err: any) {
      setErrores([`Error inesperado: ${err.message}`]);
      setImportando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-lg font-medium text-gray-900">Importar contactos masivamente</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={importando}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {paso === 'upload' && (
            <>
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Instrucciones</h3>
                <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                  <li>Descarga la plantilla Excel</li>
                  <li>Llena los datos de tus contactos</li>
                  <li>Sube el archivo completado (Excel o CSV)</li>
                </ol>
              </div>

              <button
                onClick={descargarPlantilla}
                className="mb-6 px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
              >
                📥 Descargar plantilla Excel
              </button>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csvInput"
                />
                <label
                  htmlFor="csvInput"
                  className="cursor-pointer block"
                >
                  <div className="text-4xl mb-2">📂</div>
                  <p className="text-sm text-gray-700 mb-1">
                    Haz clic para seleccionar un archivo
                  </p>
                  <p className="text-xs text-gray-500">
                    Formatos soportados: Excel (.xlsx, .xls) o CSV
                  </p>
                </label>
              </div>

              {errores.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-900 mb-2">Errores encontrados:</p>
                  <ul className="text-sm text-red-700 space-y-1">
                    {errores.map((err, idx) => (
                      <li key={idx}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {paso === 'preview' && (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-700">
                  Se importarán <strong>{preview.length} contactos</strong>. Revisa la vista previa:
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden mb-6 max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Nombre</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Empresa</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">País</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Prioridad</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-gray-900">{row.nombre}</td>
                        <td className="px-3 py-2 text-gray-700">{row.empresa}</td>
                        <td className="px-3 py-2 text-gray-700">{row.pais}</td>
                        <td className="px-3 py-2 text-gray-700">{row.prioridad}</td>
                        <td className="px-3 py-2 text-gray-700 text-xs">{row.manager_email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 10 && (
                  <div className="p-3 bg-gray-50 text-center text-xs text-gray-600">
                    ... y {preview.length - 10} contactos más
                  </div>
                )}
              </div>

              {errores.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-900 mb-2">Errores:</p>
                  <ul className="text-sm text-red-700 space-y-1">
                    {errores.map((err, idx) => (
                      <li key={idx}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setPaso('upload');
                    setArchivo(null);
                    setPreview([]);
                  }}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
                  disabled={importando}
                >
                  Cancelar
                </button>
                <button
                  onClick={importar}
                  disabled={importando || errores.length > 0}
                  className="px-4 py-2 text-sm text-white rounded-md font-medium hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: '#9C0C54' }}
                >
                  {importando ? 'Importando...' : `Importar ${preview.length} contactos`}
                </button>
              </div>
            </>
          )}

          {paso === 'done' && (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                ¡Importación completada!
              </p>
              <p className="text-sm text-gray-700">
                Se importaron {preview.length} contactos correctamente
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}