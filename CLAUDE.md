# CLAUDE.md — Área de Salud Naranjo

Sitio web informativo del **Área de Salud Naranjo** (CCSS, Naranjo, Alajuela, Costa Rica).
Idioma del sitio: `es-CR`. Todo el contenido visible, URLs (slugs) y mensajes al usuario van en español.

Referencia visual: https://convex-train-416759.framer.app/ (plantilla "Dentiva" de Framer).
Se replica su estructura y estilo: top bar → nav con CTA → hero (eyebrow + H1 + 2 CTAs + badges) →
estadísticas → tarjetas de servicios → bloques de valor → pasos numerados → FAQ → "Visítenos" con
horarios → CTA final → footer completo.

## Stack
- **Node.js 24** + **Express 4**
- **EJS**: render en servidor (el contenido debe llegar en el HTML para SEO; nada depende de JS)
- **`node:sqlite`** (`DatabaseSync`, nativo de Node 24, sin dependencias compiladas). BD en `data/asn.db`
- `express-session` (store propio en SQLite), `bcryptjs`, `helmet`, `multer`, `compression`
- CSS propio con variables, sin frameworks. JS mínimo (`public/js/main.js`) como mejora progresiva.
- Variables de entorno: `.env` cargado con `process.loadEnvFile()` (ver `.env.example`).

## Comandos
```bash
npm install
npm run seed           # crea tablas y carga datos de ejemplo (borra los existentes)
npm run create-admin   # crea/actualiza usuario admin: npm run create-admin -- usuario contraseña
npm run dev            # node --watch, http://localhost:3000
npm start              # producción
```

> **Red corporativa:** si `npm install` falla con `SELF_SIGNED_CERT_IN_CHAIN`, usar
> `NODE_OPTIONS=--use-system-ca npm install` (confía en el almacén de certificados de Windows).
> No desactivar `strict-ssl`.

## Estructura
```
server.js              Express: helmet/CSP, compresión, estáticos, sesión, rutas, 404/500
db/database.js         Conexión SQLite + creación de tablas (idempotente)
db/seed.js             Datos de ejemplo (marcados con // TODO: dato real)
db/session-store.js    Store de express-session sobre SQLite
lib/site.js            Datos globales del sitio (nombre, dirección, teléfonos, horarios) + JSON-LD
lib/util.js            slugify, formateo de fechas es-CR
middleware/auth.js     requireAuth, CSRF, rate limit de login
routes/public.js       /, /servicios, /nosotros, /directorio, /anuncios, /anuncios/:slug
routes/admin.js        /admin: login, CRUD de anuncios, directorio y servicios
routes/seo.js          /sitemap.xml, /robots.txt
views/partials/        head.ejs (TODAS las meta SEO), header.ejs, footer.ejs, iconos
views/admin/           vistas del panel (noindex)
public/                css, js, img, uploads (imágenes de anuncios)
scripts/create-admin.js
```

## Diseño (tokens de la referencia)
| Token | Valor | Uso |
|---|---|---|
| `--primary` | `#0e9f8e` | acentos, iconos, decoración |
| `--primary-dark` | `#0b7f72` | botones y texto en color (contraste AA) |
| `--ink` | `#0f1f24` | texto principal |
| `--muted` | `#5b6b70` | texto secundario |
| `--line` | `#e3ecec` | bordes |
| `--mint` | `#e6f6f3` | fondos suaves, chips |
| `--cream` | `#f6f1ea` | secciones alternas |
| `--surface` | `#fafcfc` | fondo de página |
| `--star` / `--danger` | `#f5b301` / `#e5484d` | acentos |

Tipografías: **Manrope** (títulos) e **Inter** (texto). Radios: 12 / 16 / 20 px y pill (999px).
Etiquetas "eyebrow" en MAYÚSCULAS sobre cada H2. No usar `#0e9f8e` para texto pequeño (falla AA).

## Convenciones
- HTML semántico: `header`, `nav`, `main`, `section` (con `aria-labelledby`), `article`, `footer`.
- **Un solo `<h1>` por página**; jerarquía h2 → h3 sin saltos.
- `alt` en todas las imágenes; `width`/`height` y `loading="lazy"` (excepto la imagen principal).
- Mobile-first, contraste WCAG AA, `:focus-visible` visible, skip link, `prefers-reduced-motion`.
- Teléfonos siempre como `<a href="tel:+506XXXXXXXX">`.
- Comentarios y nombres en el código pueden estar en español, consistentes con el archivo.

## SEO — obligatorio para toda página pública nueva
1. Pasar a `head.ejs`: `title` único (≤ 60 caracteres), `description` (≤ 160), `path` (canonical) y opcionalmente `ogImage` y `jsonLd` extra.
2. Open Graph y Twitter Card se generan desde esos valores.
3. JSON-LD: `MedicalOrganization` va en todas las páginas; añadir `BreadcrumbList` en páginas internas
   y el tipo específico (`FAQPage`, `NewsArticle`, `ItemList`...) cuando aplique.
4. Agregar la URL a `routes/seo.js` (sitemap).
5. Las páginas de admin llevan `noindex, nofollow` y están bloqueadas en `robots.txt`.

## Seguridad
- Toda ruta bajo `/admin` (excepto login) usa `requireAuth`.
- Contraseñas con bcrypt; cookie de sesión `httpOnly`, `sameSite=lax`, `secure` en producción.
- Todos los formularios POST llevan `_csrf` (ver `middleware/auth.js`). En formularios multipart el token va en la query (`?_csrf=`).
- En EJS usar `<%= %>` (escapa). `<%-` solo para partials o JSON-LD ya serializado con `jsonLd()`.
- SQL siempre con parámetros (`?`), nunca concatenando strings.
- Subidas: solo jpg/png/webp ≤ 2 MB, nombre aleatorio.
- `.env` y `data/` fuera del control de versiones.

## Datos
Los datos de ejemplo (teléfonos, misión, visión, FODA, servicios, horarios, estadísticas) están en
`db/seed.js` y `lib/site.js`, marcados con `// TODO: dato real`. Reemplazarlos por la información oficial.
Anuncios, directorio y servicios se administran desde `/admin`.
