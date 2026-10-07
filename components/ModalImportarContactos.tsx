'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import Ventana from '@/components/ui/Ventana';
import * as XLSX from 'xlsx';
import { componerCumple, leerCumple, normalizarFecha, sugerirProximo } from '@/lib/cartera';

/** Cumpleaños desde Excel: fecha completa, serie numérica o 'DD/MM' sin año. */
function cumpleDesdeCelda(valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const texto = typeof valor === 'number' ? normalizarFecha(valor) : String(valor).trim();
  const c = leerCumple(texto);
  return c ? componerCumple(c.dia, c.mes, c.anio) : null;
}

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

  const instrucciones = [
    'Nombre y apellido del contacto',
    'Pais del contacto',
    'Empresa del contacto',
    'Area del contacto',
    'Cargo del contacto',
    'Mail del contacto',
    'Telelfono del contacto',
    'Cumpleaños: DD/MM (sin año) o DD/MM/AAAA',
    'P1 / P2 / P3 (P1 es 30 dias, P2 es 60 dias y P3 es 75 dias)',
    'Último contacto: DD/MM/AAAA',
    'Próximo contacto: DD/MM/AAAA. Si lo dejas vacío se calcula con la prioridad',
    'activo / pausa / inactivo (TODO en minusculas)',
    'Hasta cuándo está en pausa: DD/MM/AAAA',
    'Texto libre',
    'Texto libre',
    'Texto libre',
    'Mail del manager owner',
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, instrucciones]);
  
  // Congelar la primera fila (headers)
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Contactos');
  
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
        const filas = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as ContactoCSV[];
        // La plantilla trae una fila de instrucciones bajo los encabezados: se ignora
        const conInstrucciones = filas[0]?.nombre === 'Nombre y apellido del contacto';
        const jsonData = conInstrucciones ? filas.slice(1) : filas;
        // Número de fila real en el Excel, para que los avisos apunten bien
        const fila = (idx: number) => idx + (conInstrucciones ? 3 : 2);
        
        // Validación básica
        const erroresTemp: string[] = [];
        
        jsonData.forEach((row, idx) => {
          if (!row.nombre) erroresTemp.push(`Fila ${fila(idx)}: Falta nombre`);
          if (!row.empresa) erroresTemp.push(`Fila ${fila(idx)}: Falta empresa`);
          if (!row.manager_email) erroresTemp.push(`Fila ${fila(idx)}: Falta manager_email`);
          if (row.prioridad && !['P1', 'P2', 'P3'].includes(row.prioridad)) {
            erroresTemp.push(`Fila ${fila(idx)}: Prioridad debe ser P1, P2 o P3`);
          }
          if (row.estado && !['activo', 'pausa', 'inactivo'].includes(row.estado)) {
            erroresTemp.push(`Fila ${fila(idx)}: Estado debe ser activo, pausa o inactivo`);
          }
          // Una fecha que no se entiende no se guarda como texto: se avisa antes de importar
          (['next_touch', 'last_touch', 'pausa_hasta'] as const).forEach((col) => {
            const v = row[col] as unknown;
            if (v !== '' && v !== null && v !== undefined && !normalizarFecha(v)) {
              erroresTemp.push(`Fila ${fila(idx)}: ${col} "${v}" no es una fecha válida (usa DD/MM/AAAA)`);
            }
          });
          const cumple = row.cumple as unknown;
          if (cumple !== '' && cumple !== null && cumple !== undefined && !cumpleDesdeCelda(cumple)) {
            erroresTemp.push(`Fila ${fila(idx)}: cumple "${cumple}" no es válido (usa DD/MM o DD/MM/AAAA)`);
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

          const prioridad = String(row.prioridad ?? '').trim() || 'P2';
          const lastTouch = normalizarFecha(row.last_touch);
          // Todo contacto sale con próximo contacto: si no vino, se calcula por su cadencia
          const nextTouch = normalizarFecha(row.next_touch) ?? sugerirProximo(prioridad, lastTouch);

          return {
            nombre: row.nombre.trim(),
            pais: row.pais?.trim() || null,
            empresa: row.empresa.trim(),
            area: row.area?.trim() || null,
            cargo: row.cargo?.trim() || null,
            email: row.email?.trim() || null,
            telefono: row.telefono?.trim() || null,
            cumple: cumpleDesdeCelda(row.cumple),
            prioridad,
            last_touch: lastTouch,
            next_touch: nextTouch,
            estado: row.estado?.trim() || 'activo',
            pausa_hasta: normalizarFecha(row.pausa_hasta),
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
    <Ventana titulo="Importar contactos masivamente" onClose={() => !importando && onClose()} ancho="sm:max-w-4xl">
        <div className="p-4 sm:p-6">
          {paso === 'upload' && (
            <>
              <div className="mb-6">
                <h3 className="text-sm font-medium text-mbc mb-2">Instrucciones</h3>
                <ol className="text-sm text-tinta space-y-1 list-decimal list-inside">
                  <li>Descarga la plantilla Excel</li>
                  <li>Llena los datos de tus contactos</li>
                  <li>Sube el archivo completado (Excel o CSV)</li>
                </ol>
              </div>

              <button
                onClick={descargarPlantilla}
                className="mb-6 px-4 py-2 text-sm border border-ceramica-300 rounded-md hover:bg-ceramica text-tinta"
              >
                📥 Descargar plantilla Excel
              </button>

              <div className="border-2 border-dashed border-ceramica-300 rounded-lg p-8 text-center">
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
                  <p className="text-sm text-tinta mb-1">
                    Haz clic para seleccionar un archivo
                  </p>
                  <p className="text-xs text-arena">
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
                <p className="text-sm text-tinta">
                  Se importarán <strong>{preview.length} contactos</strong>. Revisa la vista previa:
                </p>
              </div>

              <div className="border border-ceramica-300 rounded-lg overflow-hidden mb-6 max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-ceramica sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-tinta">Nombre</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-tinta">Empresa</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-tinta">País</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-tinta">Prioridad</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-tinta">Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-mbc">{row.nombre}</td>
                        <td className="px-3 py-2 text-tinta">{row.empresa}</td>
                        <td className="px-3 py-2 text-tinta">{row.pais}</td>
                        <td className="px-3 py-2 text-tinta">{row.prioridad}</td>
                        <td className="px-3 py-2 text-tinta text-xs">{row.manager_email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 10 && (
                  <div className="p-3 bg-ceramica text-center text-xs text-arena">
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
                  className="px-4 py-2 text-sm border border-ceramica-300 rounded-md hover:bg-ceramica text-tinta"
                  disabled={importando}
                >
                  Cancelar
                </button>
                <button
                  onClick={importar}
                  disabled={importando || errores.length > 0}
                  className="px-4 py-2 text-sm text-white rounded-md font-medium hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: '#0A3A6B' }}
                >
                  {importando ? 'Importando...' : `Importar ${preview.length} contactos`}
                </button>
              </div>
            </>
          )}

          {paso === 'done' && (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-lg font-medium text-mbc mb-2">
                ¡Importación completada!
              </p>
              <p className="text-sm text-tinta">
                Se importaron {preview.length} contactos correctamente
              </p>
            </div>
          )}
        </div>
    </Ventana>
  );
}