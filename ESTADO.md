# Estado del proyecto — Sitio del Área de Salud Naranjo

Sitio informativo del Área de Salud Naranjo (CCSS, U.P. 2235), con panel de administración.
Las reglas de código, de SEO y de seguridad están en [CLAUDE.md](CLAUDE.md). Léalas antes de hacer cambios.

## Cómo correrlo

```bash
npm install            # en la red de la CCSS: NODE_OPTIONS=--use-system-ca npm install
cp .env.example .env
npm run create-admin -- <usuario> <contraseña>
npm run dev            # http://localhost:3000  ·  panel: /admin
```

`npm install` también activa los hooks de git que sincronizan los datos. Hay que correrlo **una vez** después de clonar.
No use `npm run seed`: reemplaza los datos reales por datos de ejemplo.

Stack: Node 24 + Express + EJS (render en servidor) + SQLite nativo (`node:sqlite`). Sin frameworks de CSS ni de JS.

## Datos compartidos por git (automático)

Lo que se crea en el panel (anuncios, directorio, servicios, misión y visión) viaja con git:

- **Al hacer commit**, se exporta la base de datos a `datos/*.jsonl` y se incluye en el commit.
- **Al hacer pull** (y al arrancar el servidor), se carga en la base de datos lo que llegó en `datos/`.
- Si ambos editan a la vez, se combina **registro por registro**. Si los dos cambiaron el mismo registro,
  gana la versión del repositorio y se muestra un aviso.
- Las imágenes de los anuncios (`public/uploads/`) también van en el commit.
- **No se comparten** usuarios, contraseñas ni sesiones: cada persona crea su propio usuario admin.

Recomendación: haga **commit antes de pull** cuando haya editado datos en el panel.
Comandos manuales, por si hacen falta: `npm run datos:exportar` y `npm run datos:importar` (con `-- --forzar` para sobrescribir).

## Qué está hecho

| Parte | Estado |
|---|---|
| Inicio, Servicios, Nosotros (misión, visión y valores), Anuncios | ✅ |
| Directorio telefónico como menú del IVR (central 2103-1700, 9 opciones y 3 submenús) | ✅ |
| Ubicación "EBAIS externos" (fuera del IVR, con teléfono directo) | ✅ creada, **sin EBAIS cargados** |
| Panel `/admin`: anuncios (con imagen y vencimiento), directorio, servicios, misión/visión | ✅ |
| SEO: meta tags, Open Graph, JSON-LD, `sitemap.xml`, `robots.txt` | ✅ |
| Logo CCSS (negro) en el navbar, el footer, el panel y el favicon | ✅ |
| Rediseño estilo [Medilea](https://medilea.webflow.io/): paleta verde/azul noche, Mona Sans + Playfair, animaciones al hacer scroll, contadores, marquesina | ✅ |
| Se eliminó: análisis FODA, correo electrónico | — |

## Pendiente

- **Datos reales:** coordenadas, enlace de Facebook y estadísticas del inicio (`lib/site.js`, marcados `TODO`).
- **Verificar extensiones del IVR** que se transcribieron de una imagen borrosa: Farmacia (1064), EBAIS Barrio El Carmen (1035), Jefatura de Registros (1065), Recursos Humanos (1006), Servicios Generales (1009), Obstetricia (1127) y Odontología (1100).
- **EBAIS externos:** cargar la lista con sus teléfonos desde Panel → Directorio.
- **Fotos reales:** el hero es un carrusel de 3 fotos (`site.heroFotos` en `lib/site.js`): la entrada de Urgencias (foto propia, escalada desde 900 px), la iglesia de Naranjo (Wikimedia, CC BY-SA 4.0, el crédito se muestra en el hero) y un pasillo genérico. Conviene reemplazarlas por fotos oficiales de la sede nueva en alta resolución. "Quiénes somos" usa una foto del edificio de **Radio Santa Clara, con su marca de agua** (`public/img/fotos/sede-naranjo.jpg`): **pedir permiso a la emisora o reemplazarla por una foto oficial** antes de publicar. "Visítenos" muestra el mapa de Google Maps. El footer usa `public/img/fotos/pasillo.webp`.
- **Logo anterior** (cruz verde, `public/img/logo.svg`) todavía en: la imagen para redes (`og-image.png`) y el logo del JSON-LD.
- **Producción:** definir hosting, `SITE_URL` con el dominio real, `SESSION_SECRET` y `NODE_ENV=production` en `.env`.
- **Calidad:** no se ha corrido Lighthouse ni se ha probado en un teléfono real.

## Dónde está cada cosa

- `lib/site.js`: nombre, teléfonos, horarios y estadísticas (datos globales).
- `db/directorio-ivr.js`: datos del IVR. `lib/directorio.js`: árbol del menú y enlaces `tel:`.
- `routes/`: `public.js` (páginas), `admin.js` (panel), `seo.js` (sitemap y robots).
- `views/partials/head.ejs`: todas las meta tags de SEO.
- `public/css/styles.css`: estilos del sitio (tokens de diseño en `:root`).
- `media/`: logos originales de la CCSS (negro y azul).
