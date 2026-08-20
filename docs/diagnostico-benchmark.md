# Radar Comercial → ERP simple de contactos MBC
Diagnóstico, benchmark y hoja de ruta · 11-ago-2026

---

## 1. Qué es hoy la herramienta

Next.js 16 + Supabase, 4 tablas (`contactos`, `actividades`, `proyectos`, `managers`) y 5 pantallas.
El concepto es bueno y poco común: **la herramienta no gestiona un pipeline de oportunidades, gestiona la
disciplina de contacto**. `prioridad` (P1/P2/P3) define cada cuántos días hay que tocar a alguien y
`next_touch` alimenta un semáforo. Eso es exactamente lo que un equipo de consultoría necesita y lo que
los CRM grandes hacen mal.

### Hallazgos que hay que corregir sí o sí

| # | Hallazgo | Evidencia | Impacto |
|---|---|---|---|
| 1 | **El gráfico "Evolución de estados" mostraba datos inventados.** El código generaba la serie histórica con un factor aritmético sobre la foto actual | comentario `// Simular datos históricos` en el dashboard anterior | Un gerente tomaba decisiones sobre una curva falsa. **Ya eliminado** en el rediseño |
| 2 | El toggle "Vista propia / Vista total" no afectaba al dashboard | el dashboard cargaba siempre toda la cartera | El control miente al usuario. Pendiente: decidir si el radar es siempre del equipo (y quitar el toggle ahí) |
| 3 | Las 4 tarjetas del semáforo llevaban a `/contactos` sin filtrar | 4 `router.push('/contactos')` idénticos | Clic inútil. **Corregido**: ahora enlazan a `/contactos?estado=…` (falta leer el parámetro en la página de contactos) |
| 4 | No hay histórico de estados | no existe tabla de snapshots | Imposible responder "¿mejoramos respecto al mes pasado?" sin inventar. Ver Ola 1 |
| 5 | `prioridad` no genera automáticamente el `next_touch` | se fija a mano en cada modal | La cadencia depende de que el consultor no se olvide |
| 6 | Sin control de acceso por rol | `es_admin` existe en `managers` pero no se usa | Cualquier manager ve y edita toda la cartera |

---

## 2. Benchmark: qué hacen los mejores del mundo

Seis referentes, ordenados de "más parecido a lo que necesitamos" a "más lejano".

| Herramienta | Su apuesta | Lo que vale la pena copiar | Lo que NO debemos copiar |
|---|---|---|---|
| **Affinity** (CRM de private capital / VC) | *Relationship intelligence*: puntúa la fuerza de cada relación con datos reales de interacción y detecta quién del equipo tiene el mejor camino de entrada a una cuenta | **Captura automática de actividad** desde correo y calendario, y **score de relación**. Es el modelo conceptual más cercano a lo que MBC necesita | Su precio y su complejidad de deal-flow |
| **Attio** | CRM "data-native", modelo relacional flexible, atributos rellenados por IA | Enriquecimiento automático de empresa/cargo; vistas guardadas por usuario | Su nivel de configurabilidad: para 8 consultores es sobreingeniería |
| **folk** | CRM ligero, "agenda compartida" del equipo | Simplicidad radical de la ficha de contacto; recordatorios de seguimiento | Poca profundidad analítica |
| **Pipedrive** | Pipeline visual, time-to-value muy corto | Tablero kanban por etapa y actividades obligatorias por etapa | El pipeline por etapas no es nuestro problema principal |
| **HubSpot (Breeze)** | Agentes de IA: investigación de contactos, salud del cliente, scoring predictivo | **Lead scoring** y **alertas de cuenta en riesgo** | Su suite completa: coste y adopción |
| **Salesforce (Einstein/Agentforce)** | IA que ejecuta, no solo sugiere | Resúmenes automáticos de interacción | Todo lo demás para este tamaño de equipo |

**El dato que ordena la discusión:** entre el 50% y el 63% de las implantaciones de CRM fracasan, y la causa
número uno es la carga de registro manual — un comercial dedica del orden de 3 a 6 horas por semana a
meter datos. Las firmas que capturan la actividad automáticamente alcanzan 96-100% de adopción.
**Traducción para MBC: cada campo que obliguemos a llenar a mano es una apuesta contra la adopción.**

Fuentes: [Affinity — activity capture](https://www.affinity.co/product/activity-capture) · [Affinity — relationship intelligence](https://www.affinity.co/blog/relationship-intelligence) · [Attio — best CRM for startups](https://attio.com/f/best-crm-for-startups) · [folk — Attio review](https://www.folk.app/articles/attio-crm-review-ai-powered-crm-for-modern-gtm-teams) · [HubSpot AI tools 2026](https://www.hublead.io/blog/hubspot-ai-tools) · [SuperOffice — CRM statistics](https://www.superoffice.com/blog/50-crm-statistics/) · [gain.io — CRM adoption challenges](https://gain.io/blog/crm-adoption-challenges-why-sales-teams-fail-to-use-their-crm-and-how-to-fix-it)

---

## 3. Hoja de ruta funcional

Criterio de priorización: **cada punto debe reducir trabajo manual o evitar una pérdida de negocio.**
Lo que solo "se ve bonito en el dashboard" va al final.

### Ola 1 — Que la disciplina se sostenga sola (2-3 semanas)
1. **Cadencia automática.** Al registrar una acción, `next_touch = fecha + días(prioridad)`. Se acabó fijar la fecha a mano.
2. **Snapshot diario de la cartera.** Un job que guarde el conteo por estado. Sin esto no hay tendencia honesta.
3. **Filtro por estado en `/contactos`** leyendo `?estado=`, ya enlazado desde el semáforo.
4. **Digest semanal por correo**: "tienes 4 contactos vencidos". Es la funcionalidad que hace que la gente vuelva a la herramienta.
5. **Permisos por rol**: consultor ve y edita lo suyo, admin ve todo (RLS en Supabase, hoy inexistente).

### Ola 2 — Reducir el registro manual (3-4 semanas)
6. **Captura de actividad desde Outlook/Graph API**: correos y reuniones con el contacto se registran solos. Es el punto de mayor retorno de todo el backlog — es lo que hace Affinity.
7. **Score de relación** simple y explicable: recencia + frecuencia + antigüedad + proyectos cerrados. Nada de caja negra.
8. **Mapa "quién conoce a quién"**: qué consultor tiene la relación más fuerte con cada cuenta. Directo del playbook de Affinity y muy útil en una firma donde varios tocan al mismo cliente.
9. **Importación con detección de duplicados** (hoy el importador CSV/XLSX no valida repetidos).

### Ola 3 — De contactos a ERP comercial (según apetito)
10. **Oportunidades como entidad propia** con monto, probabilidad y fecha estimada (hoy `oportunidad` es solo texto libre en el contacto).
11. **Forecast ponderado** y comparación contra meta por consultor.
12. **Resumen de interacción con IA** al pegar notas de reunión → resultado + próximos pasos estructurados.

---

## 4. Rediseño UX/UI aplicado

**Arte:** paleta extraída de los propios decks — Pruno `#4F062A`, Fucsia `#FF0054`, Gris Cerámica `#E3E2DA`,
y los acentos del deck Holmes (verde `#44B757`, naranja `#E56813`, cian `#00B0BD`, morado `#8661F5`).
El magenta anterior (`#9C0C54`) no era ningún color corporativo.

**Gestos visuales tomados de los decks:** fondo cerámica con contenedores blancos; cabeceras Pruno con
chaflán; antetítulo en versalitas + título-afirmación; chips fucsia; banda Pruno de cierre con el "so what".

**Cambios de fondo, no solo de piel:**
- Semáforo con proporción visible (barra 100% + donas por estado), no cuatro números sueltos.
- Titular del dashboard como afirmación: *"3 contactos están rezagados y necesitan acción esta semana"*.
- "Foco de hoy" con acción directa desde la fila.
- Gráficos en SVG propio con color de marca exacto, sin Chart.js.
- Fuera los datos simulados.
- `/demo` con datos ficticios para revisar diseño o enseñar la herramienta sin exponer la cartera real.
