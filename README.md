# FitStridee — versión web

Web app estática de rutinas de gym, en casa y calistenia. Sin build, sin servidor,
sin cuentas, sin anuncios y gratis. La misma lógica de datos y rutinas que la APK
de Android (`~/workspace/fitstridee/app/`).

## Qué incluye (web v1.1.1)

- **Tres modos elegibles:** **Gym** (barra, polea, máquinas, mancuernas),
  **Casa** (peso corporal + 2 mancuernas; incluye la rutina mixta de Alan:
  flexiones, fondos entre sillas, sentadilla búlgara, plancha, sentadilla
  goblet, remo a un brazo, press de hombro, zancadas y curl) y **Calistenia**
  (solo peso corporal, con progresiones de fácil a difícil).
- **Programa de Leo — Pecho en casa, Día 1 a Día 14 (nuevo v1.1.0):** las 3
  variantes de flexiones de rodillas del reel de Leo (@84leo_24,
  https://www.instagram.com/reel/DdOod-lMTLq/) con sus series exactas —
  normales 3×8–12, diamante 3×10–12, manos abiertas 3×10–15 —, seguimiento
  día a día (marca cada variante; el día se completa con las 3) y paso a
  flexiones normales al terminar los 14 días. El reel no detalla reps por
  día, así que cada día repite las mismas 3 variantes; no se inventó
  ninguna progresión diaria.
- **Rutinas propias (nuevo v1.1.0):** crear, editar, duplicar y eliminar
  rutinas propias, sin límite, guardadas en `localStorage`. Se pueden
  entrenar como cualquier rutina fija.
- **Sustitución en 1 toque (nuevo v1.1.0):** en la sesión y en el detalle
  de rutina, "Cambiar 🔀" muestra hasta 6 ejercicios del mismo músculo y
  mismo equipo; un toque cambia. En rutinas fijas, el cambio se guarda
  como copia propia para no perder la original.
- **Progresión automática (nuevo v1.1.0):** al empezar una sesión, cada
  ejercicio ya trae prellenadas las reps y el peso sugeridos según la
  regla visible: primero reps hasta el tope del rango; si completas todas
  las series al tope, subes peso (con mancuernas fijas o peso corporal,
  subes por reps); cada 4ª semana es descarga (menos series, mismo peso).
  La regla se muestra en cada ejercicio y en Seguir.
- **Regla de días perdidos (nuevo v1.1.1):** si la última vez que entrenaste
  un ejercicio fue hace 2 días o más, te quedas en el mismo lugar, pero la
  meta baja 2 reps (pierdes las 2 que ibas a ganar y 2 más: hiciste 15, te
  tocaban 17, faltaste días y tu siguiente meta es 13). El peso no sube y se
  aplica una sola vez por hueco; al completar, la progresión normal retoma
  desde ahí. La descarga de la 4ª semana va primero. En el programa de Leo
  se muestra el aviso en la pantalla del programa.
- **Estadísticas completas (nuevo v1.1.0):** vista "Tus números" con
  volumen por semana (últimas 6), volumen por músculo (últimos 28 días),
  racha, peso y cintura (con cambio desde el inicio) y lista de récords
  por ejercicio (peso máx., más reps sin peso, volumen máx. en una
  sesión). Medir ahora guarda el historial de medidas y muestra la
  evolución de la cintura con gráfico.
- **Rutinas por modo:** cuerpo completo A/B/C, Empuje, Jalón, Pierna
  (6–7 rutinas por modo; calistenia suma Circuito core). Todas con series,
  reps y descanso sugeridos.
- **Detalle de rutina (nuevo v1.2):** pestañas Rutina A/B/C (+ Mixta en
  Casa), cabecera con duración, kcal, intensidad y **mapa corporal
  frontal/espalda** con los músculos trabajados en blanco, y filas con
  miniatura, equipo · Bilateral y píldora `4 x 12 · 20`. Botón “Continuar”.
- **1.324 ejercicios** con buscador y filtros por músculo y equipo, nombres en
  español en los 200 curados, pasos en español y GIF animado bajo demanda.
- **Sesión — diario de entrenamiento (nuevo v1.2):** cronómetro de sesión
  (transcurrido / estimado) + “Finalizar ✓”, por ejercicio: segmentado
  equipo · Bilateral, tarjetas Peso máx. y Volumen máx., **tabla de Rep Max
  estimadas (Epley)**, tabla de series con check que muestra los segundos
  de descanso mientras corre, chips 00:30/01:00/01:30/02:00 y tarjeta de
  siguiente ejercicio. Cambio de ejercicio por otro del mismo músculo y
  guardado en el historial local.
- **Generador de semana por reglas** (sin IA en la nube, sin API keys):
  modo × días/semana (2–5) × nivel (principiante/intermedio/avanzado),
  con regla de progresión publicada (primero reps, luego peso) y 48 h entre
  sesiones del mismo músculo.
- **Medir (v1.3, figuras nuevas):** pregunta “¿Cuál es tu peso actual?”, toggle
  kg/lb, número grande y **regla deslizante** (40–200 kg / 90–440 lb) que
  guarda el peso de hoy; historial con gráfico; **figura corporal detallada
  propia con 7 puntos numerados** (cuello, pecho, cintura, brazo, cadera, muslo,
  pantorrilla) que enfocan su campo de medida. Todo en `localStorage`:
  nada sale de tu teléfono.
- **Seguir (nuevo v1.2):** calorías por semana (estimación, etiquetada como
  tal) y mapa de calor de 4 semanas, **sin candado ni Premium** (chip “Sin
  candado” / “Gratis”).
- **Diseño v3.3:** negro `#0B0B0B` + grafito `#1C1C1E` + blanco `#FFFFFF`, tipografías
  Anton / Archivo Black / Inter (locales, sin CDN) y logo F Garra v3. Layout
  de las capturas de referencia de Drive (estructura, no assets) y figuras
  corporales detalladas propias (fuente: `design/assets/figures.py`).

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | App completa (11 vistas: Seguir, Entrenar, Rutina, Ejercicios, Detalle, Sesión, Generador, Medir, Leo, Estadísticas, Editor de rutina propia) |
| `styles.css` | Sistema de diseño v3.3 |
| `app.js` | Lógica: modos, rutinas, detalle de rutina con mapa corporal, generador, diario de sesión con RM, temporizador, historial, regla de peso, calorías (estimación) y mapa de calor, programa de Leo, rutinas propias, sustitución en 1 toque, progresión automática con regla visible, estadísticas completas (volumen por semana/músculo, récords, cintura) |
| `data/data.js` | 1.324 ejercicios + 200 curados, en JS para que funcione también abriendo el archivo (`file://`) |
| `data/exercises.json` / `data/curated.json` | Los mismos datos en JSON (fuente de `data.js`) |
| `assets/` | Logo v3 (símbolo + wordmark), icono de app y fuentes |
| `manifest.json` | Para instalarla como app desde el navegador |
| `.nojekyll` | Para que GitHub Pages sirva los archivos tal cual |

## Datos y licencias

- Ejercicios: dataset
  [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset)
  (datos MIT). Recortado a instrucciones en español; los nombres en español
  son traducción propia para los 200 ejercicios curados.
- GIFs e imágenes: **© Gym visual — https://gymvisual.com/**, cargados bajo
  demanda desde GitHub Raw
  (`raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/…`).
  La atribución aparece en el detalle de cada ejercicio y en el pie de la web.
  ⚠️ Revisa los términos de Gym visual antes de redistribuir los GIFs en
  producción; el plan B legal es `free-exercise-db` (dominio público, fotos
  estáticas, sin GIF).

## Probarla en local

```bash
cd ~/workspace/fitstridee/web
python3 -m http.server 8811
# abre http://127.0.0.1:8811/
```

También funciona abriendo `index.html` directamente en el navegador (los datos
van en `data/data.js`, no por `fetch`, justo para eso). Sin internet se ve todo
menos los GIF, que se cargan bajo demanda.

Verificado 2026-11-24 (web v1.1.1): `node --check` de `app.js` y `data/data.js`
OK; servidor local sirve los archivos con 200; probado en jsdom (Node) con
31 comprobaciones — programa de Leo (14 días, reps exactas, día 1 marcado
al completar las 3 variantes), rutinas propias (crear, ver, duplicar,
sustitución que crea copia), sustitución en sesión (6 opciones, cambio en
1 toque), sesión con sugerencia prellenada y guardado con detalle
(peso/reps/volumen por serie), estadísticas, evolución de la cintura y
formato de duración ("45 min", "1 h 05 min" en vez de "00:45") — todas
en verde y sin errores de página. Regla de días perdidos verificada
2026-11-24 con 12 comprobaciones en Node (vm con stubs de DOM): hueco de
3 días 12→10 reps, sin hueco 12→14 (progresión normal), ejemplo de Alan
15→13, `leoGapInfo` con y sin hueco — todas en verde. El Chromium directo
del sandbox no
arranca (error "Hatch WebGL domain policy is required for browser
startup"), así que la comprobación visual en navegador real queda
pendiente para el agente principal. GIF de ejemplo
(`0662-I4hDWkc.gif`) responde 200 en GitHub Raw (en el sandbox de
pruebas las imágenes externas no cargan por el túnel, no es un fallo
de la web).

## Publicarla en GitHub Pages

Repo sugerido: **Alitan999/fitstridee-web** (nuevo, público). La web ya está
lista para Pages: estática, rutas relativas, `.nojekyll` incluido.

1. Crea el repo `fitstridee-web` en GitHub (cuenta Alitan999).
2. Sube todo el contenido de esta carpeta `web/` a la raíz del repo, rama `main`
   (sin la carpeta `web/` en sí: `index.html` debe quedar en la raíz).
3. En el repo: **Settings → Pages → Build and deployment → Deploy from a branch
   → Branch: `main` / `/ (root)` → Save**.
4. Espera 1–2 minutos. La web quedará en
   `https://alitan999.github.io/fitstridee-web/`.
5. Comprueba: abre la URL, cambia a los tres modos (Gym / Casa / Calistenia),
   abre una rutina, entra a un ejercicio y verifica que el GIF carga.

Para actualizarla después: sube los archivos cambiados a `main` y Pages
republica solo. No hace falta tocar nada en el repo de la APK.

## Firebase (Analytics + Hosting, proyecto `fitstridee`)

- La web inicializa Firebase con el SDK modular por CDN
  (`https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js` y
  `firebase-analytics.js`, config de la app web de Alan) en un
  `<script type="module">` aparte en `index.html`, con `try/catch`:
  si no hay red o el CDN no carga, solo queda un aviso en consola y
  la app sigue 100% local. `window.FIT_FIREBASE.ready` dice si cargó.
- Hosting ya preparado: `firebase.json` (`public: "."`) y `.firebaserc`
  (proyecto por defecto `fitstridee`). Para desplegar a
  `https://fitstridee.web.app` (con la sesión de Google de Alan):
  `firebase login`, `firebase deploy` desde esta carpeta. GitHub Pages
  sigue funcionando igual; es un segundo hosting, no un reemplazo.

## Qué falta / próximos pasos

- [ ] Elegir el logo final (A2 F Garra provisional; B2/C2 siguen en
  `~/workspace/fitstridee/logo/`).
- [ ] Confirmar licencia de los GIFs de Gym visual para redistribución
  (o cambiar a `free-exercise-db`).
- [ ] Sincronizar mejoras de la investigación de competencia
  (`~/workspace/fitstridee/research/COMPETENCIA.md`) entre web y APK.
- [ ] Subir cada versión a Drive en `FitStridee/Versiones/vX.Y.Z-web/`.
