# Estado del proyecto — Sitio del Área de Salud Naranjo

Sitio informativo del Área de Salud Naranjo (CCSS, U.P. 2235), con panel de administración.
Las reglas de código, de SEO y de seguridad están en [CLAUDE.md](CLAUDE.md). Léalas antes de hacer cambios.

## Cómo correrlo

```bash
npm install            # en la red de la CCSS: NODE_OPTIONS=--use-system-ca npm install
cp .env.example .env
npm run seed           # crea la BD con datos de ejemplo (BORRA anuncios, servicios y directorio)
npm run create-admin -- <usuario> <contraseña>
npm run dev            # http://localhost:3000  ·  panel: /admin
```

El directorio telefónico se carga solo la primera vez que arranca el servidor con una BD nueva.
Para restablecerlo sin tocar anuncios ni servicios: `npm run cargar-directorio` (reemplaza el directorio actual).

Stack: Node 24 + Express + EJS (render en servidor) + SQLite nativo (`node:sqlite`). Sin frameworks de CSS ni de JS.

> La base de datos (`data/asn.db`) **no está en git**. Al clonar, usted tendrá los datos de ejemplo del seed,
> no el contenido que se editó desde el panel en la máquina original.

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

- **Datos reales:** dirección, coordenadas, enlace de Facebook y estadísticas del inicio (`lib/site.js`, marcados `TODO`).
- **Verificar extensiones del IVR** que se transcribieron de una imagen borrosa: Farmacia (1064), EBAIS Barrio El Carmen (1035), Jefatura de Registros (1065), Recursos Humanos (1006), Servicios Generales (1009), Obstetricia (1127) y Odontología (1100).
- **EBAIS externos:** cargar la lista con sus teléfonos desde Panel → Directorio.
- **Fotos reales:** el inicio tiene 3 espacios de foto con relleno provisional (hero, "Quiénes somos" y "Visítenos"). Copiarlas a `public/img/fotos/` y poner las rutas en `site.fotos` (`lib/site.js`).
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
