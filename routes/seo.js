// sitemap.xml y robots.txt
const express = require('express');
const { db } = require('../db/database');
const { urlAbs } = require('../lib/site');
const { listarVisibles, contarVisibles } = require('../lib/anuncios');

const router = express.Router();

const PAGINAS = [
  { ruta: '/', freq: 'weekly', prioridad: '1.0' },
  { ruta: '/servicios', freq: 'monthly', prioridad: '0.9' },
  { ruta: '/directorio', freq: 'monthly', prioridad: '0.9' },
  { ruta: '/nosotros', freq: 'yearly', prioridad: '0.7' },
  { ruta: '/anuncios', freq: 'daily', prioridad: '0.8' },
];

const escXml = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

router.get('/sitemap.xml', (req, res) => {
  const anuncios = listarVisibles({ limite: Math.max(contarVisibles(), 1) });
  const ultimo = db.prepare('SELECT MAX(actualizado) AS f FROM anuncios').get().f;
  const urls = [
    ...PAGINAS.map((p) => ({
      loc: urlAbs(p.ruta),
      lastmod: p.ruta === '/' || p.ruta === '/anuncios' ? ultimo : null,
      freq: p.freq,
      prioridad: p.prioridad,
    })),
    ...anuncios.map((a) => ({
      loc: urlAbs('/anuncios/' + a.slug),
      lastmod: a.actualizado,
      freq: 'monthly',
      prioridad: '0.6',
    })),
  ];

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map(
        (u) =>
          `  <url><loc>${escXml(u.loc)}</loc>` +
          (u.lastmod ? `<lastmod>${String(u.lastmod).slice(0, 10)}</lastmod>` : '') +
          `<changefreq>${u.freq}</changefreq><priority>${u.prioridad}</priority></url>`
      )
      .join('\n') +
    '\n</urlset>\n';

  res.type('application/xml').send(xml);
});

router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${urlAbs('/sitemap.xml')}\n`);
});

module.exports = router;
