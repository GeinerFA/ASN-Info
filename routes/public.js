// Páginas públicas.
const express = require('express');
const { db, getContenido } = require('../db/database');
const { site, urlAbs, migasLd } = require('../lib/site');
const { listarVisibles, contarVisibles, buscarVisible } = require('../lib/anuncios');
const { arbol, marcar } = require('../lib/directorio');
const { telHref } = require('../lib/util');
const { csrfToken, csrfValido } = require('../middleware/auth');
const contraloria = require('../lib/contraloria');

const router = express.Router();
const POR_PAGINA = 9;

const listarServicios = () => db.prepare('SELECT * FROM servicios ORDER BY orden, id').all();


router.get('/', (req, res) => {
  const faq = getContenido('faq', []);
  const servicios = listarServicios();
  res.render('index', {
    title: `${site.nombre} | CCSS Naranjo, Alajuela`,
    description: site.descripcion,
    path: '/',
    servicios: servicios.filter((s) => s.destacado).slice(0, 6),
    anuncios: listarVisibles({ limite: 3 }),
    faq,
    jsonLdExtra: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: site.nombre,
        url: urlAbs('/'),
        inLanguage: 'es-CR',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((f) => ({
          '@type': 'Question',
          name: f.p,
          acceptedAnswer: { '@type': 'Answer', text: f.r },
        })),
      },
    ],
  });
});

router.get('/servicios', (req, res) => {
  const servicios = listarServicios();
  res.render('servicios', {
    title: `Servicios de salud | ${site.nombre}`,
    description:
      'Medicina general, urgencias de lunes a viernes de 7 a 22 h, odontología, farmacia, laboratorio, vacunación y más servicios del Área de Salud Naranjo.',
    path: '/servicios',
    servicios,
    jsonLdExtra: [
      migasLd([{ nombre: 'Servicios', ruta: '/servicios' }]),
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Servicios del ' + site.nombre,
        itemListElement: servicios.map((s, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'MedicalProcedure',
            name: s.nombre,
            description: s.descripcion,
          },
        })),
      },
    ],
  });
});

router.get('/nosotros', (req, res) => {
  res.render('nosotros', {
    title: `Misión, visión y valores | ${site.nombre}`,
    description:
      'Conozca la misión, la visión y los valores del Área de Salud Naranjo de la Caja Costarricense de Seguro Social.',
    path: '/nosotros',
    mision: getContenido('mision', ''),
    vision: getContenido('vision', ''),
    valores: getContenido('valores', []),
    jsonLdExtra: [migasLd([{ nombre: 'Nosotros', ruta: '/nosotros' }])],
  });
});

router.get('/directorio', (req, res) => {
  const menu = arbol();
  res.render('directorio', {
    title: `Directorio telefónico | ${site.nombre}`,
    description:
      `Llame al ${site.telefono} y marque la opción: Dirección Médica, Farmacia, Laboratorio, EBAIS, servicios médicos y administrativos del Área de Salud Naranjo.`,
    path: '/directorio',
    menu,
    marcar,
    jsonLdExtra: [
      migasLd([{ nombre: 'Directorio telefónico', ruta: '/directorio' }]),
      {
        '@context': 'https://schema.org',
        '@type': 'MedicalOrganization',
        '@id': urlAbs('/#organizacion'),
        contactPoint: menu.flatMap((m) => (m.hijos.length ? m.hijos : m.externo ? [] : [m])).map((c) => ({
          '@type': 'ContactPoint',
          contactType: c.nombre,
          telephone: telHref(c.telefono || site.telefono),
          areaServed: 'CR',
          availableLanguage: 'es',
        })),
      },
    ],
  });
});

router.get('/anuncios', (req, res) => {
  const total = contarVisibles();
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pagina = Math.min(Math.max(parseInt(req.query.pagina, 10) || 1, 1), paginas);
  const ruta = pagina > 1 ? `/anuncios?pagina=${pagina}` : '/anuncios';
  res.render('anuncios', {
    title: `Anuncios y noticias${pagina > 1 ? ` (página ${pagina})` : ''} | ${site.nombre}`,
    description: 'Avisos, campañas de salud, eventos y noticias del Área de Salud Naranjo.',
    path: ruta,
    anuncios: listarVisibles({ limite: POR_PAGINA, pagina }),
    pagina,
    paginas,
    jsonLdExtra: [migasLd([{ nombre: 'Anuncios', ruta: '/anuncios' }])],
  });
});

router.get('/anuncios/:slug', (req, res, next) => {
  const anuncio = buscarVisible(req.params.slug);
  if (!anuncio) return next();
  const ruta = '/anuncios/' + anuncio.slug;
  const imagen = anuncio.imagen ? urlAbs('/uploads/' + anuncio.imagen) : urlAbs('/img/og-image.png');
  res.render('anuncio', {
    title: `${anuncio.titulo} | ${site.nombre}`,
    description: anuncio.resumen || anuncio.contenido.slice(0, 155),
    path: ruta,
    ogImage: imagen,
    ogType: 'article',
    anuncio,
    otros: listarVisibles({ limite: 4 }).filter((a) => a.id !== anuncio.id).slice(0, 3),
    jsonLdExtra: [
      migasLd([
        { nombre: 'Anuncios', ruta: '/anuncios' },
        { nombre: anuncio.titulo, ruta },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: anuncio.titulo.slice(0, 110),
        description: anuncio.resumen,
        image: [imagen],
        datePublished: anuncio.fecha_publicacion,
        dateModified: anuncio.actualizado.replace(' ', 'T'),
        mainEntityOfPage: urlAbs(ruta),
        inLanguage: 'es-CR',
        author: { '@type': 'Organization', name: site.nombre, url: urlAbs('/') },
        publisher: {
          '@type': 'Organization',
          name: site.nombre,
          logo: { '@type': 'ImageObject', url: urlAbs('/img/logo.svg') },
        },
      },
    ],
  });
});

// ---------- Contraloría de Servicios: datos de contacto + formulario que llega al correo institucional ----------
function vistaContraloria(res, extra = {}) {
  res.render('contraloria', {
    title: `Contraloría de Servicios | ${site.nombre}`,
    description:
      `Quejas, sugerencias y felicitaciones para la Contraloría de Servicios del Área de Salud Naranjo: teléfono ${site.telefono}, correo o formulario en línea.`,
    path: '/contraloria',
    tipos: contraloria.TIPOS,
    valores: {},
    errores: {},
    jsonLdExtra: [
      migasLd([{ nombre: 'Contraloría de Servicios', ruta: '/contraloria' }]),
      {
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        name: `Contraloría de Servicios — ${site.nombre}`,
        url: urlAbs('/contraloria'),
        inLanguage: 'es-CR',
        mainEntity: {
          '@type': 'ContactPoint',
          contactType: site.contraloria.nombre,
          email: site.contraloria.correo,
          telephone: telHref(site.telefono),
          availableLanguage: 'es',
          areaServed: 'CR',
        },
      },
    ],
    ...extra,
  });
}

router.get('/contraloria', csrfToken, (req, res) => {
  vistaContraloria(res, { enviado: req.query.enviado === '1' });
});

router.post('/contraloria', csrfToken, async (req, res, next) => {
  try {
    const { datos, errores } = contraloria.validar(req.body);
    // Trampa para robots: campo oculto que una persona nunca llena. Se responde como si se hubiera enviado.
    if (req.body.sitio_web) return res.redirect(303, '/contraloria?enviado=1#formulario');
    if (!csrfValido(req)) errores.general = 'La página estuvo abierta mucho tiempo. Revise sus datos y envíe de nuevo.';
    else if (!contraloria.puedeEnviar(req.ip)) errores.general = `Ya envió varios mensajes en la última hora. Intente más tarde o escriba a ${site.contraloria.correo}.`;
    if (Object.keys(errores).length) {
      return vistaContraloria(res.status(422), { valores: datos, errores });
    }
    const ok = await contraloria.enviar(datos, req.ip);
    if (!ok) {
      return vistaContraloria(res.status(503), {
        valores: datos,
        errores: { general: `No pudimos enviar su mensaje en este momento. Intente de nuevo más tarde o escriba directamente a ${site.contraloria.correo}.` },
      });
    }
    res.redirect(303, '/contraloria?enviado=1#formulario');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
