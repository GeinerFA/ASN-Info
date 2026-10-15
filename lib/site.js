// Datos globales del sitio y generadores de JSON-LD.
// TODO: dato real — reemplazar dirección, teléfonos, horarios, coordenadas y estadísticas.

const SITE_URL = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

const site = {
  url: SITE_URL,
  nombre: 'Área de Salud Naranjo',
  nombreCorto: 'AS Naranjo',
  institucion: 'Caja Costarricense de Seguro Social (CCSS)',
  descripcion:
    'Área de Salud Naranjo de la CCSS: servicios de salud, EBAIS, directorio telefónico, horarios y anuncios para la población de Naranjo, Alajuela.',
  direccion: {
    calle: 'Calle Cinco',
    ciudad: 'Naranjo',
    provincia: 'Alajuela',
    codigoPostal: '20601',
    pais: 'CR',
  },
  // Ubicación de la sede según su ficha en Google Maps (Clínica de Naranjo, Plus Code 4J2F+PRM).
  geo: { lat: 10.1018396, lng: -84.3754674 },
  // Id de la ficha en Google Maps (cid): el mapa incrustado abre centrado en ella, con su nombre.
  mapaCid: '11468676411635948523',
  telefono: '2103-1700', // Central telefónica
  emergencias: '911',
  // Quejas, sugerencias y felicitaciones (también en el directorio: opción 5, ext. 1104)
  contraloria: { nombre: 'Contraloría de Servicios', correo: 'cs_asn@ccss.sa.cr', extension: '1104' },
  unidadProgramatica: '2235',
  // Ficha del Área de Salud en Google Maps (botón "Cómo llegar" y enlace del footer).
  mapaUrl: 'https://maps.app.goo.gl/Ho4pFg2vttbbkNKQ8',
  horarioCorto: 'Lun–Vie 7:00\u00a0a.m. – 4:00\u00a0p.m. · Urgencias 7:00\u00a0a.m. – 10:00\u00a0p.m.',
  horarios: [
    { dia: 'Lunes a jueves', horas: '7:00\u00a0a.m. – 10:00\u00a0p.m.', dias: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'], abre: '07:00', cierra: '22:00' },
    { dia: 'Viernes', horas: '7:00\u00a0a.m. – 10:00\u00a0p.m.', dias: ['Friday'], abre: '07:00', cierra: '22:00' },
    { dia: 'Sábado y domingo', horas: 'Cerrado', dias: [] },
    { dia: 'Servicio de urgencias', horas: '7:00\u00a0a.m. – 10:00\u00a0p.m., de lunes a viernes', dias: [] },
  ],
  estadisticas: [
    { valor: '11', etiqueta: 'EBAIS en el cantón' },
    { valor: '45+', etiqueta: 'Años de servicio' },
    { valor: '50\u00a0000+', etiqueta: 'Personas adscritas' },
    { valor: '7\u00a0a.m. – 10\u00a0p.m.', etiqueta: 'Urgencias, lunes a viernes' },
  ],
  // Fotografías del sitio. Mientras sean null se muestra un relleno con degradado.
  // TODO: foto real — copiar a public/img/fotos/ y poner la ruta, ej. '/img/fotos/hero.jpg'
  fotos: {
    // Foto de Radio Santa Clara (con su marca de agua). TODO: pedir permiso o reemplazar por una foto oficial.
    nosotros: '/img/fotos/sede-naranjo.jpg',
  },
  // Carrusel de fondo del hero (se alternan con fundido). Horizontales, ~1920 px de ancho.
  // Si una foto exige atribución (licencia CC), se indica en `credito` y se muestra mientras está visible.
  heroFotos: [
    { src: '/img/fotos/hero-sede.webp', ancho: 1920, alto: 1079, posicion: 'center 45%', descripcion: 'Entrada de Urgencias de la sede del Área de Salud Naranjo' },
    {
      src: '/img/fotos/hero-naranjo.webp', ancho: 1920, alto: 1080, posicion: 'center 35%', descripcion: 'Iglesia de Naranjo, Alajuela',
      credito: 'Foto: Rodtico21 · CC BY-SA 4.0', creditoUrl: 'https://commons.wikimedia.org/wiki/File:Naranjo_Church_Costa_Rica.jpg',
    },
    { src: '/img/fotos/hero-pasillo.webp', ancho: 1920, alto: 1100, posicion: 'center 50%', descripcion: 'Pasillo de atención' }, // TODO: foto real de la sede
  ],
};

// Mapa incrustado de Visítenos: la ficha de Google Maps, centrada y con su marcador.
site.mapaEmbed = 'https://maps.google.com/maps?output=embed&hl=es&z=17&cid=' + site.mapaCid;

const navegacion = [
  { href: '/servicios', texto: 'Servicios' },
  { href: '/nosotros', texto: 'Nosotros' },
  { href: '/contraloria', texto: 'Contraloría' },
  { href: '/anuncios', texto: 'Anuncios' },
  { href: '/#contacto', texto: 'Contacto' },
];

function urlAbs(ruta = '/') {
  if (/^https?:\/\//.test(ruta)) return ruta;
  return SITE_URL + (ruta.startsWith('/') ? ruta : '/' + ruta);
}

function organizacionLd() {
  return {
    '@context': 'https://schema.org',
    '@type': ['MedicalOrganization', 'MedicalClinic'],
    '@id': urlAbs('/#organizacion'),
    name: site.nombre,
    alternateName: 'Área de Salud Naranjo CCSS',
    description: site.descripcion,
    url: urlAbs('/'),
    logo: urlAbs('/img/logo.svg'),
    image: urlAbs('/img/og-image.png'),
    telephone: '+506' + site.telefono.replace(/\D/g, ''),
    medicalSpecialty: ['PrimaryCare', 'Dentistry', 'Pharmacy', 'Emergency'],
    isAcceptingNewPatients: true,
    parentOrganization: {
      '@type': 'GovernmentOrganization',
      name: site.institucion,
      url: 'https://www.ccss.sa.cr',
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.direccion.calle,
      addressLocality: site.direccion.ciudad,
      addressRegion: site.direccion.provincia,
      postalCode: site.direccion.codigoPostal,
      addressCountry: site.direccion.pais,
    },
    geo: { '@type': 'GeoCoordinates', latitude: site.geo.lat, longitude: site.geo.lng },
    hasMap: site.mapaUrl,
    areaServed: { '@type': 'City', name: 'Naranjo, Alajuela' },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: site.contraloria.nombre,
      email: site.contraloria.correo,
      availableLanguage: 'es',
    },
    openingHoursSpecification: site.horarios
      .filter((h) => h.dias.length)
      .map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: h.dias, opens: h.abre, closes: h.cierra })),
  };
}

function migasLd(migas) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ nombre: 'Inicio', ruta: '/' }, ...migas].map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: m.nombre,
      item: urlAbs(m.ruta),
    })),
  };
}

// Serializa JSON-LD de forma segura para incrustarlo en <script> (evita cerrar la etiqueta).
function jsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

module.exports = { site, navegacion, urlAbs, organizacionLd, migasLd, jsonLd };
