# FitStridee — versión web

Web app estática de rutinas de gym, en casa y calistenia. Sin build, sin servidor,
sin cuentas, sin anuncios y gratis. La misma lógica de datos y rutinas que la APK
de Android (`~/workspace/fitstridee/app/`).

## Qué incluye (v1.2 web — layout referencia Drive)

- **Tres modos elegibles:** **Gym** (barra, polea, máquinas, mancuernas),
  **Casa** (peso corporal + 2 mancuernas; incluye la rutina mixta de Alan:
  flexiones, fondos entre sillas, sentadilla búlgara, plancha, sentadilla
  goblet, remo a un brazo, press de hombro, zancadas y curl) y **Calistenia**
  (solo peso corporal, con progresiones de fácil a difícil).
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
- **Medir (nuevo v1.2):** pregunta “¿Cuál es tu peso actual?”, toggle
  kg/lb, número grande y **regla deslizante** (40–200 kg / 90–440 lb) que
  guarda el peso de hoy; historial con gráfico; **figura corporal con 7
  puntos numerados** (cuello, pecho, cintura, brazo, cadera, muslo,
  pantorrilla) que enfocan su campo de medida. Todo en `localStorage`:
  nada sale de tu teléfono.
- **Seguir (nuevo v1.2):** calorías quemadas por semana y mapa de calor de
  4 semanas, **sin candado ni Premium** (chip “Sin candado” / “Gratis”).
- **Diseño v3.2:** negro `#0B0B0B` + grafito `#1C1C1E` + blanco `#FFFFFF`, tipografías
  Anton / Archivo Black / Inter (locales, sin CDN) y logo F Garra v3. Layout
  de las capturas de referencia de Drive (estructura, no assets).

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | App completa (8 vistas: Seguir, Entrenar, Rutina, Ejercicios, Detalle, Sesión, Generador, Medir) |
| `styles.css` | Sistema de diseño v3.2 |
| `app.js` | Lógica: modos, rutinas, detalle de rutina con mapa corporal, generador, diario de sesión con RM, temporizador, historial, regla de peso, calorías y mapa de calor |
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

Verificado 2026-11-21 (v1.2): `node --check` de `app.js` y `data/data.js` OK; servidor
local sirve los archivos con 200; probado en Chromium headless: detalle de
rutina (4 pestañas, 9 filas, mapa corporal), diario (reloj de sesión,
descanso 0:59 con cuenta atrás en el check, RM Epley 93.3 para 70 kg × 10),
regla de peso (85.0 kg → 87.0 al deslizar → 192.0 lb), calorías y mapa de
calor (28 celdas) en Seguir. GIF de ejemplo (`0662-I4hDWkc.gif`) responde 200
en GitHub Raw (en el sandbox de pruebas las imágenes externas no cargan por
el túnel, no es un fallo de la web).

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

## Qué falta / próximos pasos

- [ ] Elegir el logo final (A2 F Garra provisional; B2/C2 siguen en
  `~/workspace/fitstridee/logo/`).
- [ ] Confirmar licencia de los GIFs de Gym visual para redistribución
  (o cambiar a `free-exercise-db`).
- [ ] Sincronizar mejoras de la investigación de competencia
  (`~/workspace/fitstridee/research/COMPETENCIA.md`) entre web y APK.
- [ ] Subir cada versión a Drive en `FitStridee/Versiones/vX.Y.Z-web/`.
