# CLAUDE.md — Área de Salud Naranjo

Sitio web informativo del **Área de Salud Naranjo** (CCSS, Naranjo, Alajuela, Costa Rica).
Idioma del sitio: `es-CR`. Todo el contenido visible, URLs (slugs) y mensajes al usuario van en español.

Referencia visual: https://medilea.webflow.io/ (plantilla "Medilea" de Webflow).
Se replica su estilo y sus transiciones: top bar → nav con CTA → hero oscuro (eyebrow + H1 + 2 CTAs +
badges + marquesina de servicios) → "Quiénes somos" con foto y contadores → tarjetas de servicios →
compromiso → anuncios → pasos numerados → FAQ → "Visítenos" con horarios → CTA final oscuro → footer.
No se copian testimonios ni médicos de la plantilla (no hay datos reales).

## Stack
- **Node.js 24** + **Express 4**
- **EJS**: render en servidor (el contenido debe llegar en el HTML para SEO; nada depende de JS)
- **`node:sqlite`** (`DatabaseSync`, nativo de Node 24, sin dependencias compiladas). BD en `data/asn.db`
- `express-session` (store propio en SQLite), `bcryptjs`, `helmet`, `multer`, `compression`
- CSS propio con variables, sin frameworks. JS mínimo (`public/js/main.js`) como mejora progresiva.
- Variables de entorno: `.env` cargado con `process.loadEnvFile()` (ver `.env.example`).

## Comandos
```bash
npm install            # además activa hooks de git y el driver de merge (scripts/configurar-git.js)
npm run create-admin   # crea/restablece un SUPERADMIN: npm run create-admin -- usuario contraseña
npm run dev            # node --watch, http://localhost:3000
npm start              # producción
npm run datos:exportar # BD -> datos/*.jsonl (normalmente lo hace el hook pre-commit)
npm run datos:importar # datos/*.jsonl -> BD (normalmente lo hacen post-merge y el arranque)
npm run seed -- --forzar  # SOLO para empezar de cero con datos de ejemplo (reemplaza los datos reales)
```

### Sincronización de datos por git
El contenido del panel se versiona en `datos/*.jsonl` (una fila por línea). `lib/datos.js` exporta e importa,
`lib/datos-formato.js` combina fila por fila (base = `data/sync/`, la última sincronización) y
`scripts/merge-datos.js` es el driver de merge de git (`.gitattributes`: `merge=datos`).
Hooks en `.githooks/`: `pre-commit` (exporta y hace `git add datos public/uploads`), `post-merge` y `post-rewrite` (importan).
No se sincronizan `usuarios` ni `sesiones`. Si se agrega una tabla de contenido, sumarla a `TABLAS` en `lib/datos.js`.

> **Red corporativa:** si `npm install` falla con `SELF_SIGNED_CERT_IN_CHAIN`, usar
> `NODE_OPTIONS=--use-system-ca npm install` (confía en el almacén de certificados de Windows).
> No desactivar `strict-ssl`.

## Estructura
```
server.js              Express: helmet/CSP, compresión, estáticos, sesión, rutas, 404/500
db/database.js         Conexión SQLite + creación de tablas (idempotente)
db/seed.js             Datos de ejemplo (marcados con // TODO: dato real)
db/directorio-ivr.js   Datos del directorio según el diagrama del IVR (central 2103-1700, U.P. 2235)
db/session-store.js    Store de express-session sobre SQLite
lib/directorio.js      Árbol del menú IVR (parent_id/opcion, 2 niveles) y enlaces tel: con la ruta de opciones
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
| `--primary` | `#09735c` | botones, texto en color, iconos (AA sobre blanco y menta) |
| `--primary-dark` | `#065a48` | hover, chips |
| `--primary-claro` | `#5fd0b0` | acentos sobre fondos oscuros (nunca sobre blanco) |
| `--ink` | `#0f1e4c` | texto principal y títulos |
| `--night` | `#07112f` | hero, encabezados de página, CTA final, footer |
| `--muted` | `#575757` | texto secundario |
| `--line` | `#e6e6e6` | bordes |
| `--mint` | `#f1f7f3` | secciones alternas, fondos suaves |
| `--gris` | `#f8fafc` | secciones alternas |
| `--danger` | `#e5484d` | emergencias |

Tipografías: **Mona Sans** (todo, títulos en peso 500) y **Playfair Display** cursiva para una palabra
destacada por título: `<span class="cursiva">palabra</span>`. Radios: 10 (botones) / 12 / 16 / 20 px y pill.
Etiquetas "eyebrow" (pastilla sin punto) en MAYÚSCULAS sobre cada H2. Dentro de un fondo oscuro, añadir la
clase `oscuro` al contenedor (ajusta eyebrow y `.cursiva`).

Botones: `<a class="boton boton--primario" href="…"><%- textoBoton('Texto') %><span class="boton__icono"><%- icono('arrow') %></span></a>`.
`textoBoton()` (lib/util.js) genera el texto que "rueda" al pasar el mouse. Variantes: `primario`, `secundario`, `claro`, `contorno-claro`.

Fotos: `partials/foto.ejs` (`src`, `alt`, `clase`, `figura`, `ancho`, `alto`, `prioridad`). Sin `src` muestra un
relleno con degradado. Las rutas están en `site.fotos` (lib/site.js).
Hero: carrusel de fondo con `site.heroFotos` (fundido cada 6,5 s, botón de pausa, no avanza solo con movimiento reducido).
Toda foto con licencia CC lleva `credito` y `creditoUrl`; no usar fotos de medios de prensa sin permiso.

## Animaciones (public/js/main.js + public/js/temprano.js, sin librerías)
- `temprano.js` (sin defer, en `<head>`) pone `.js` y `.animar` en `<html>`; `.animar` solo si no hay
  `prefers-reduced-motion`. Todo estado oculto en CSS va bajo `.animar`, así sin JS o con movimiento reducido
  el contenido siempre se ve.
- `data-revelar` (`""`, `izquierda`, `derecha`, `escala`, `foto`): entra al hacer scroll. `data-retardo="ms"`.
- `data-revelar-grupo` en el contenedor: escalona los `data-revelar` hijos.
- `data-palabras` en H1/H2: el título aparece palabra por palabra (respeta `.cursiva`).
- `data-contador` en un número: contador tipo tragamonedas; al terminar se restaura el texto original.
- Lo que está dentro de `.hero__grid` o `.encabezado-pagina` se anima al cargar, no al hacer scroll.

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
- Toda ruta bajo `/admin` (excepto login) usa `requireAuth`, que carga el usuario desde la BD en cada petición
  (si se desactiva o cambia su contraseña, `version_sesion` cambia y la sesión se cierra).
- **Roles y permisos** (`lib/permisos.js`): `Superadmin` (`es_super = 1`) tiene todo y es el único que administra
  usuarios y la matriz, ambos en la misma página `/admin/usuarios` (`soloSuper`; `POST /admin/permisos` guarda la matriz).
  Un usuario solo tiene usuario, contraseña y rol. Los demás roles usan la matriz `rol_permisos`.
  Toda ruta nueva del panel lleva `permiso('modulo.accion')`; en las vistas, mostrar botones con `puede('modulo.accion')`.
  Un permiso nuevo se agrega en `MODULOS` y aparece solo en la matriz. No se puede eliminar/degradar al último superadmin ni a uno mismo.
- `npm run create-admin -- usuario contraseña` crea o restablece un **superadmin** (recuperación de acceso).
- Contraseñas con bcrypt; cookie de sesión `httpOnly`, `sameSite=lax`, `secure` en producción.
- Todos los formularios POST llevan `_csrf` (ver `middleware/auth.js`). En formularios multipart el token va en la query (`?_csrf=`).
- En EJS usar `<%= %>` (escapa). `<%-` solo para partials o JSON-LD ya serializado con `jsonLd()`.
- SQL siempre con parámetros (`?`), nunca concatenando strings.
- Subidas: solo jpg/png/webp ≤ 2 MB, nombre aleatorio.
- CSP (`server.js`): `frame-src` solo permite Google Maps (mapa de Visítenos). No agregar otros orígenes sin necesidad.
- `.env` y `data/` fuera del control de versiones.

## Datos
Los datos de ejemplo (teléfonos, misión, visión, valores, servicios, horarios, estadísticas) están en
`db/seed.js` y `lib/site.js`, marcados con `// TODO: dato real`. Reemplazarlos por la información oficial.
Anuncios, directorio (menú IVR: opciones y submenús) y servicios se administran desde `/admin`.
