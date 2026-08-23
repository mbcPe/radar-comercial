# ESTADO — Radar Comercial (loop de desarrollo)

Última actualización: 11-ago-2026, iteración 1 del loop.

## Contexto
Copia local en `C:\dev\radar-comercial`, rama `mejoras-local`. Nada commiteado ni pusheado.
`.env.local` tiene claves **placeholder** de Supabase: la app compila y `/demo` funciona, pero
el login y cualquier escritura real siguen sin poder probarse. El usuario debe pegar las claves reales.
Permiso de push a `mbcPe/radar-comercial`: solo lectura (hace falta colaborador o fork).

## Hecho
- Sistema de diseño Minsait en `app/globals.css` (Pruno #4F062A, Fucsia #FF0054, Cerámica #E3E2DA,
  acentos Holmes) + primitivas en `components/ui/kit.tsx`. Bloques **octogonales** (`.notch`, `.card-oct`).
- `components/AppShell.tsx`: topbar Pruno, sidebar Pruno oscuro, toggle Mi cartera / Equipo.
- Dashboard rehecho: `components/dashboard/DashboardView.tsx` (presentacional) + `app/(app)/page.tsx` (datos).
  KPIs, semáforo con donas, agenda semanal con check + medio, cumpleaños, barras de actividad, mix de canales.
- Check de agenda: inserta en `actividades` y recalcula `next_touch` (P1 30 / P2 60 / P3 75 días).
- Cumpleaños: campo `cumple` añadido a ModalEditarContacto; chip 🎂 en lista de contactos; panel en el radar.
- `/contactos`: filtro por estado (chips + `?estado=` desde el semáforo).
- `/demo`: dashboard con datos ficticios, sin Supabase.
- `docs/diagnostico-benchmark.md`: diagnóstico, benchmark (Affinity, Attio, folk, Pipedrive, HubSpot, Salesforce) y roadmap en 3 olas.
- Eliminados los datos simulados del gráfico de estados (mentían al usuario).

## Hecho en la iteración 1 del loop
- **Línea de tiempo compartida** lista: `components/timeline/TimelineView.tsx`,
  `/linea-tiempo` (datos reales) y `/demo/linea-tiempo` (ficticios). Es **horizontal**, eje con fecha +
  "hace X", etiqueta de mes al cambiar, ícono y color por medio, orden más reciente → más antiguo.
  Agrupa **por cliente (por defecto)** o por contacto; muestra avatares de todos los consultores que
  tocaron la cuenta y avisa "⚠ Contacto simultáneo" si 2+ consultores contactaron en 60 días.
  Filtro "Solo compartidos" y por medio. Entrada añadida al sidebar.
- Datos ficticios movidos a `lib/demoData.ts` (los usan `/demo` y `/demo/linea-tiempo`).

## Hecho en la iteración 2 del loop
- **Buenas prácticas + plantillas** listo: `lib/plantillas.ts` (10 situaciones con su regla de uso),
  `components/plantillas/PlantillasView.tsx`, rutas `/plantillas` y `/demo/plantillas`, ítem en el sidebar.
  Canal WhatsApp/correo, sustitución de variables desde el contacto elegido, chips de "falta completar",
  copiar, abrir en `wa.me/` o `mailto:`, y edición guardada en localStorage (`mbc-plantillas-v1`)
  hasta que exista tabla en Supabase.
- Correcciones de la auditoría UX: contraste del semáforo (`ESTADO_META.fg`), `--color-arena` a #8A8674,
  `bg-opacity-50` → `bg-black/50` (Tailwind 4 lo pintaba negro sólido), y columna "Último" de /contactos
  que mostraba `next_touch` en vez de `last_touch`.

## Hecho en la iteración 3 del loop
- **Alertas de cadencia** en `AppShell`: cuenta los contactos propios vencidos o que vencen hasta el
  domingo; badge fucsia sobre "Radar Comercial" en el menú y banda de aviso al entrar
  ("Tienes N contactos que tocar esta semana" + "Ver la agenda" + cerrar).
- **Menú móvil**: el sidebar arranca cerrado por debajo de 768px, se muestra como drawer fijo sobre
  velo negro y se cierra al navegar.
- **Puente radar → plantillas**: botón "✍ Redactar" en cada fila de la agenda que abre
  `/plantillas?contacto=<id>&situacion=<id>`. La situación se deduce del contacto: cumpleaños ≤7 días →
  cumpleaños; con oportunidad → seguimiento de propuesta; rezagado → reactivación; resto → sondeo.
  `PlantillasView` lee esos parámetros y precarga contacto y plantilla. Verificado en /demo.
- OJO, SIN VERIFICAR EN PANTALLA: badge, banda de aviso y drawer viven dentro de `AppShell`, que solo
  se monta en rutas autenticadas. Compilan y el tipado pasa, pero nadie los ha visto funcionando.

## Cambio de marca (iteración 4): de Minsait a MBC
El usuario pasó el logotipo MBC (rectángulo azul marino con esquinas achaflanadas y "MBC" en blanco)
y pidió usar esa paleta y ese arte. Repintado completo, 25 archivos:
- Tokens renombrados: `pruno` → `mbc`, `fucsia` → `acento`. Valores nuevos en `app/globals.css`:
  marino `#0A3A6B` (**estimado del logo**, cambiar aquí si el manual dice otro), `#06274A` oscuro,
  `#14548F` medio; acento interactivo `#1F6FEB`; neutros fríos `#EDF1F6` / `#D6DEE8` / `#7C8899` / `#2B3440`.
- Semáforo re-armonizado: rezagado `#D64545`, próximo `#E58413`, al día `#2E9E5B`, pausa `#0D8FA6`.
- `LogoMBC` en `components/ui/kit.tsx` (octógono con las siglas, tamaños sm/md/lg) usado en el topbar
  y en el login. Clase `.notch-sm` para el octógono pequeño.
- Verificado por estilos computados en /demo: fondo #EDF1F6, cabeceras #0A3A6B, octógono de 8 lados,
  los cuatro tintes del semáforo. Sin captura de pantalla: el panel del navegador estaba oculto.

## Modo demo (iteración 5)
`lib/modoDemo.ts` expone `MODO_DEMO` (`NEXT_PUBLIC_DEMO=1` en `.env.local`, ya activado).
Con él, `AppShell` y las 7 páginas de `app/(app)/` cortan antes de llamar a Supabase y leen
`lib/demoData.ts` (14 contactos, 94 actividades en 6 meses, 7 proyectos, 3 consultores).
Se entra sin login como Nelson Bernal y aparece un distintivo naranja "Demo" en la barra.
Verificado abriendo las 8 rutas: /, /contactos, /contactos/c1, /actividades, /linea-tiempo,
/proyectos, /equipo, /plantillas.
OJO: los modales (nuevo contacto, editar, registrar acción, pausar, proyecto, importar) siguen
escribiendo contra Supabase; en modo demo fallarán. Solo el check de la agenda está protegido.

## Línea de tiempo a escala temporal
`calcularEje()` en `TimelineView.tsx` posiciona los hitos por fecha real, no por orden:
5 px por día, con separación mínima de 34 px para que dos íconos contiguos no se pisen.
Marcas de mes a lo largo del eje y etiqueta del silencio entre contactos cuando pasan 21 días
o más (en rojo a partir de 60: "⚠ N d sin contacto"). Verificado: 28 días = 140 px, 12 = 60 px.

## Línea de tiempo minimalista
El eje muestra solo íconos, la etiqueta de mes y la fecha corta; el detalle (tipo, con quién,
fecha, autor, resultado, próximos pasos) aparece en un panel bajo el eje al pasar el cursor
o al enfocar con teclado. El ícono señalado crece un 18%.

## Modo demo con escritura (iteración 6) — RESUELTO
`lib/supabaseDemo.ts` implementa un cliente falso con la misma API (auth + constructor de consultas
encadenable: select/insert/update/delete, eq/neq/in/gte/lte, order, single, count) sobre los arrays
de `lib/demoData.ts`. `lib/supabase.ts` lo devuelve cuando `MODO_DEMO` está activo, tipado como el
cliente real para no destipar la app (si se devuelve `any`, tsc lanza 30 errores TS7006).
Con esto los 6 modales y todas las escrituras funcionan en memoria; se pierden al recargar.
Verificado en el navegador: check de agenda con medio WhatsApp → el contacto sale de la semana
y el KPI de actividades pasa de 17 a 18; modal "Registrar acción" → guarda y pasa a 19.
Copia de la versión de GitHub en `C:\dev\radar-original` (worktree de origin/main en 2c1a87f) con
el mismo truco en su `lib/supabase.ts`, corriendo en el puerto 3001 para comparar.

## Nueva portada accionable (iteración 7)
`/` ya no es el dashboard: ahora es `components/agenda/AgendaView.tsx` — lo que toca hacer esta
semana, **agrupado por cliente** y clasificado por **temática** (🎂 cumpleaños, 📄 propuesta en juego,
🧊 relación enfriada, 🔎 sondear oportunidad, 🤝 mantener contacto). Cada temática enlaza con su
plantilla en `/plantillas?situacion=…&contacto=…`. Barra de avance de la semana, filtros por
temática con conteo, cabecera octogonal por cuenta que se pone verde al cerrarla, y botón
"Contactado" → selector de medio, igual que en el radar.
El dashboard se movió a `/dashboard` y es el **último** ítem del menú. El contador de pendientes
del sidebar pasó del ítem `radar` al ítem `agenda`.
La portada respeta el alcance "Mi cartera / Equipo" de la barra superior.
Novedad: esta pantalla sí distingue error de vacío (banda roja con el mensaje de Supabase).

## Modo enfoque + móvil (iteración 8)
- **Modo enfoque** dentro de `AgendaView`: botón "▶ Modo enfoque" en la portada. Muestra una tarjeta
  a la vez con contador "1 de N", barra de avance, la temática en grande y tres acciones:
  Contactado (→ selector de medio), Posponer 7 días (`onPosponer`, mueve `next_touch` sin registrar
  actividad) y Saltar. Pantalla de cierre al terminar la cola.
  Verificado en navegador: posponer sacó a Rosa de la semana (badge 2→1), el siguiente fue Luis Pareja,
  contactado por WhatsApp, y salió la pantalla de cierre.
- **Móvil**: el sidebar ya era cajón superpuesto con velo y se cierra al navegar; ajustado para que
  arranque bajo la barra (`top-[52px]`) en vez de taparla.

## Adaptativo (iteración 9) — COMPLETO
- `/contactos`: la tabla de 11 columnas se oculta bajo `md` y aparece una lista de tarjetas
  (nombre + 🎂, empresa · cargo, chips de estado/prioridad/próximo, oportunidad y dos botones
  de 40px). Encima de `md` sigue la tabla intacta.
- Ficha de contacto: las filas del historial pasan de `grid-cols-[80px_1fr_140px]` a una columna en móvil.
- **Bug encontrado midiendo**: en la portada las tarjetas de cuenta medían 389px dentro de 375 y
  quedaban cortadas — los hijos de un grid no bajan de su ancho de contenido. Arreglado con `min-w-0`.
- `globals.css`: `:focus-visible` global (antes no había ninguno) y altura mínima de 40px para
  botones, selects y date en <768px.
- Verificado a 375px en /, /dashboard, /contactos, /contactos/c1, /linea-tiempo, /plantillas, /equipo:
  **0 elementos desbordados** fuera de contenedores con scroll propio y **0 botones bajo 40px**.
  A 1280px vuelve la tabla y los botones compactos. Build de producción en verde.

## Móvil real (iteración 10)
Causa principal de "en el teléfono no funciona": el servidor solo escuchaba en localhost.
`package.json` ahora usa `next dev -H 0.0.0.0`; la PC es 192.168.1.4, así que desde el
celular se entra por http://192.168.1.4:3000. Falta abrir el puerto en el firewall de Windows
(perfil Público activo, sin regla de entrada para el 3000): es acción del usuario, con admin.

Arreglos de layout específicos de teléfono en `AppShell.tsx`:
- El scroll vivía en `<main overflow-y-auto>` dentro de un contenedor `overflow-hidden`. Ese
  scroll anidado impide que el navegador móvil oculte su barra de direcciones y rompe el
  desplazamiento por inercia. Ahora en <768px scrollea el documento (`md:overflow-hidden`,
  `md:overflow-y-auto`).
- `min-w-0` en `<main>`: sin eso un hijo ancho estira el flex y aparece scroll horizontal.
- `min-h-[100dvh]` junto a `min-h-screen`: 100vh cuenta la barra del navegador y corta contenido.

Verificado a 375px con el menú ABIERTO (caso que no había probado): el panel es `fixed` y se
superpone, `<main>` conserva sus 375px, hay velo, 0 elementos desbordados y el documento scrollea.
Nota: en el panel de vista previa la transición de ancho del menú queda congelada
(`CSSTransition` en `currentTime: 0`) porque el panel no dibuja frames; en un teléfono real anima.

## Pendiente (orden de ataque)
1. Estados de error en el resto de pantallas (solo la portada distingue error de vacío). (propuesta 1 del agente UX): sidebar drawer < md, tarjetas en vez
   de tabla en /contactos, y pantalla de una tarjeta a la vez con botón grande y swipe.
3. Enlazar plantillas desde la agenda del radar y desde la ficha ("Redactar" con la situación elegida).
4. Antiguo pendiente: **plantillas** — `/plantillas`: plantillas WhatsApp/correo con formato Minsait por
   tipo de contacto (cumpleaños, seguimiento de propuesta, sondeo de oportunidad, post-reunión,
   reactivación, aporte de valor, felicitación por hito/nombramiento, cierre de año).
   Variables `{{nombre}} {{empresa}} {{propuesta}}`, botón copiar y abrir en WhatsApp/mailto.
3. **Alertas de contacto** — badge de pendientes en el sidebar y aviso al entrar.
4. Rediseño de layout pendiente en: `/contactos`, ficha de contacto, `/actividades`, `/proyectos`, `/equipo`.
5. Ola 1 del roadmap: snapshot diario de estados, digest semanal por correo, RLS por rol.

## Auditoría UX (agente experto, iteración 1)
Corregido ya: contraste del semáforo (`ESTADO_META` ahora expone `fg` oscuro para texto),
`--color-arena` oscurecida a #8A8674, `bg-opacity-50` → `bg-black/50` en dos modales
(no existe en Tailwind 4: pintaba el velo negro sólido), y la columna "Último" de /contactos
que mostraba `next_touch` en vez de `last_touch`.

Pendiente de la auditoría, por orden de impacto:
- **Móvil**: sidebar de 208px fija y tabla de 11 columnas. Hace falta drawer < md y lista de tarjetas.
- **Errores tragados**: las consultas destructuran solo `data`; si falla, se muestra "no tienes contactos"
  (mentira). Separar estados cargando / error / vacío y quitar `alert()`/`confirm()` por toasts.
- **Jerarquía**: la agenda del día está bajo ~700px de KPIs; subirla arriba del pliegue y bajar el
  reporting. Seis cabeceras Pruno iguales compiten entre sí: dejar una por pantalla.
- **Teclado y toque**: filas de tabla con `onClick` por celda (no tabulables), chips de 21px
  (mínimo WCAG 24px), sin `:focus-visible` global, modales sin `role="dialog"` ni Escape.
- **Duplicación de reglas**: umbrales del semáforo en 4 archivos y cadencia P1/P2/P3 en 2.
  Extraer `lib/cartera.ts`. Además "activo" se define de dos formas distintas en el dashboard.
- **Check sin deshacer**: al marcar contactado la fila desaparece; falta toast "deshacer" 8s.
- Menores: `.sort()` muta el estado en /contactos; `chart.js` sigue en package.json sin usarse;
  la ficha de contacto monta su propia barra de marca dentro del AppShell (duplicada).

## Propuestas disruptivas priorizadas (mismo agente)
1. **Modo Triage** — una tarjeta a la vez a pantalla completa, con la excusa de contacto y tres
   botones grandes (Contactado / Posponer 7 días / Saltar); swipe en móvil. Convierte el CRM en
   una tarea de 90 segundos. Va junto con el layout móvil.
2. **Briefing diario 7:30 por WhatsApp** + pantalla `/hoy` de una columna, generados del mismo objeto.
3. **Generador de la excusa de contacto** (primero plantillas, luego IA) — se une con la sección
   de plantillas ya pendiente.
Siguientes: expediente de cuenta `/cuentas/[empresa]` con bloque de "huecos" de cobertura;
mapa de calor cuenta × mes en escala monocroma Pruno; matriz quién-conoce-a-quién con botón
"pedir presentación"; captura por voz con ficha previa editable; barra de comandos Ctrl+K.

## Reglas aprendidas en esta sesión
- Los bordes de los bloques Pruno son **octógonos** (ocho lados), no chaflán de dos esquinas.
- Nunca reescribir archivos con `Get-Content -Raw` + `Set-Content`: rompe los acentos (UTF-8 → cp1252).
  Usar `[System.IO.File]::ReadAllText/WriteAllText` con UTF8 sin BOM.
- Tras tocar `globals.css`, Turbopack sirve CSS cacheado: hay que reiniciar `npm run dev` y borrar `.next`.
