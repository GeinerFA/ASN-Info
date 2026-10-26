// Servidor del sitio Área de Salud Naranjo.
const path = require('node:path');
const fs = require('node:fs');

if (fs.existsSync(path.join(__dirname, '.env'))) process.loadEnvFile(path.join(__dirname, '.env'));

const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const session = require('express-session');

const SqliteStore = require('./db/session-store');
const { site, navegacion, urlAbs, organizacionLd, jsonLd } = require('./lib/site');
const { fechaLarga, fechaCorta, telHref, textoBoton, cifraHora, tituloCursiva, horarios, horariosVista, hora12 } = require('./lib/util');
const { icono } = require('./lib/iconos');

const app = express();
const PROD = process.env.NODE_ENV === 'production';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        frameSrc: ['https://www.google.com', 'https://maps.google.com'], // mapa de Visítenos
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: PROD ? [] : null,
      },
    },
    hsts: PROD,
  })
);
app.use(compression());
app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: PROD ? '7d' : 0,
    setHeaders(res, ruta) {
      if (ruta.includes(`${path.sep}uploads${path.sep}`)) res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  })
);
app.use(express.urlencoded({ extended: false, limit: '200kb' }));

app.use(
  session({
    store: new SqliteStore(),
    name: 'asn.sid',
    secret: process.env.SESSION_SECRET || 'solo-para-desarrollo',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: PROD, maxAge: 8 * 60 * 60 * 1000 },
  })
);

if (PROD && !process.env.SESSION_SECRET) {
  console.warn('ADVERTENCIA: defina SESSION_SECRET en .env para producción.');
}

// Variables disponibles en todas las vistas.
app.use((req, res, next) => {
  Object.assign(res.locals, {
    site, navegacion, urlAbs, jsonLd, fechaLarga, fechaCorta, telHref, icono, textoBoton, cifraHora, tituloCursiva, horarios, horariosVista, hora12,
    organizacionLd: organizacionLd(),
    rutaActual: req.path,
    anio: new Date().getFullYear(),
  });
  next();
});

app.use(require('./routes/seo'));
app.use(require('./routes/public'));
app.use('/admin', require('./routes/admin'));

app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Página no encontrada | ' + site.nombre,
    description: 'La página que busca no existe o fue movida.',
    path: req.path,
    noindex: true,
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).send('La imagen supera el tamaño máximo de 2 MB.');
  res.status(500).send('Ocurrió un error inesperado. Intente de nuevo más tarde.');
});

// Carga en la BD los datos que llegaron por git (datos/), si cambiaron. Ver lib/datos.js.
console.log('[datos] ' + require('./lib/datos').importar().mensaje);

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`Área de Salud Naranjo en http://localhost:${PORT}`));
