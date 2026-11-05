// Servidor del sitio Área de Salud Naranjo.
const path = require("node:path");
const fs = require("node:fs");

// Carga segura del .env sin romper si Node es una versión anterior a la 20.6
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(envPath);
  } else {
    // Parser simple y nativo para .env en caso de Node < 20.6
    try {
      const envConfig = fs.readFileSync(envPath, "utf-8");
      envConfig.split(/\r?\n/).forEach((line) => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || "";
          if (value.startsWith('"') && value.endsWith('"'))
            value = value.slice(1, -1);
          if (!process.env[key]) process.env[key] = value;
        }
      });
    } catch (e) {
      console.warn("No se pudo leer el archivo .env:", e.message);
    }
  }
}

const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const session = require("express-session");

const SqliteStore = require("./db/session-store");
const {
  site,
  navegacion,
  urlAbs,
  organizacionLd,
  jsonLd,
} = require("./lib/site");
const {
  fechaLarga,
  fechaCorta,
  telHref,
  textoBoton,
  cifraHora,
  tituloCursiva,
  horarios,
  horariosVista,
  hora12,
} = require("./lib/util");
const { icono } = require("./lib/iconos");

const app = express();
const PROD = process.env.NODE_ENV === "production";

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        frameSrc: ["https://www.google.com", "https://maps.google.com"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: PROD ? [] : null,
      },
    },
    hsts: PROD,
  }),
);

app.use(compression());

app.use(
  express.static(path.join(__dirname, "public"), {
    maxAge: PROD ? "7d" : 0,
    setHeaders(res, ruta) {
      if (ruta.includes(`${path.sep}uploads${path.sep}`)) {
        res.setHeader("X-Content-Type-Options", "nosniff");
      }
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "200kb" }));

app.use(
  session({
    store: new SqliteStore(),
    name: "asn.sid",
    secret: process.env.SESSION_SECRET || "solo-para-desarrollo",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: PROD,
      maxAge: 8 * 60 * 60 * 1000,
    },
  }),
);

if (PROD && !process.env.SESSION_SECRET) {
  console.warn("ADVERTENCIA: defina SESSION_SECRET en .env para producción.");
}

// Variables disponibles en todas las vistas.
app.use((req, res, next) => {
  Object.assign(res.locals, {
    site,
    navegacion,
    urlAbs,
    jsonLd,
    fechaLarga,
    fechaCorta,
    telHref,
    icono,
    textoBoton,
    cifraHora,
    tituloCursiva,
    horarios,
    horariosVista,
    hora12,
    organizacionLd: organizacionLd(),
    rutaActual: req.path,
    anio: new Date().getFullYear(),
  });
  next();
});

app.use(require("./routes/seo"));
app.use(require("./routes/public"));
app.use("/admin", require("./routes/admin"));

app.use((req, res) => {
  res.status(404).render("404", {
    title: "Página no encontrada | " + site.nombre,
    description: "La página que busca no existe o fue movida.",
    path: req.path,
    noindex: true,
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === "LIMIT_FILE_SIZE")
    return res.status(400).send("La imagen supera el tamaño máximo de 2 MB.");
  res
    .status(500)
    .send("Ocurrió un error inesperado. Intente de nuevo más tarde.");
});

// Carga en la BD con try/catch para que no tire el servidor si hay error de permisos
try {
  const libDatos = require("./lib/datos");
  if (libDatos && typeof libDatos.importar === "function") {
    console.log("[datos] " + libDatos.importar().mensaje);
  }
} catch (err) {
  console.error(
    "[datos ERROR]: No se pudieron importar los datos iniciales:",
    err.message,
  );
}

// OBLIGATORIO PARA IISNODE:
// iisnode pasa una Named Pipe en process.env.PORT. NO debe forzarse a 3000 si IIS ya provee uno.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor iniciado escuchando en: ${PORT}`);
});
