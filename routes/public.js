// Páginas públicas.
const express = require('express');
const { db, getContenido } = require('../db/database');
const { site, urlAbs, migasLd } = require('../lib/site');
const { listarVisibles, contarVisibles, buscarVisible } = require('../lib/anuncios');

const router = express.Router();
const POR_PAGINA = 9;

const listarServicios = () => db.prepare('SELECT * FROM servicios ORDER BY orden, id').all();

function agruparDirectorio() {
  const grupos = new Map();
  for (const fila of db.prepare('SELECT * FROM directorio ORDER BY orden, id').all()) {
    if (!grupos.has(fila.departamento)) grupos.set(fila.departamento, []);
    grupos.get(fila.departamento).push(fila);
  }
  return [...grupos].map(([departamento, contactos]) => ({ departamento, contactos }));
}

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
      'Medicina general, urgencias 24 horas, odontología, farmacia, laboratorio, vacunación y más servicios del Área de Salud Naranjo.',
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
    title: `Misión, visión y FODA | ${site.nombre}`,
    description:
      'Conozca la misión, la visión, los valores y el análisis FODA del Área de Salud Naranjo de la CCSS.',
    path: '/nosotros',
    mision: getContenido('mision', ''),
    vision: getContenido('vision', ''),
    valores: getContenido('valores', []),
    foda: getContenido('foda', { fortalezas: [], oportunidades: [], debilidades: [], amenazas: [] }),
    jsonLdExtra: [migasLd([{ nombre: 'Nosotros', ruta: '/nosotros' }])],
  });
});

router.get('/directorio', (req, res) => {
  const grupos = agruparDirectorio();
  res.render('directorio', {
    title: `Directorio telefónico | ${site.nombre}`,
    description:
      'Teléfonos y extensiones del Área de Salud Naranjo: urgencias, farmacia, laboratorio, EBAIS y oficinas administrativas.',
    path: '/directorio',
    grupos,
    jsonLdExtra: [migasLd([{ nombre: 'Directorio telefónico', ruta: '/directorio' }])],
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

module.exports = router;
