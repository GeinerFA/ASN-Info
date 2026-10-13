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
    calle: 'Naranjo centro, contiguo al parque central', // TODO: dato real
    ciudad: 'Naranjo',
    provincia: 'Alajuela',
    codigoPostal: '20601',
    pais: 'CR',
  },
  geo: { lat: 10.0987, lng: -84.3786 }, // TODO: dato real
  telefono: '2103-1700', // Central telefónica
  emergencias: '911',
  unidadProgramatica: '2235',
  correo: 'asnaranjo@ccss.sa.cr', // TODO: dato real
  mapaUrl: 'https://www.google.com/maps/search/?api=1&query=%C3%81rea+de+Salud+Naranjo+CCSS',
  horarioCorto: 'Lun–Vie 7:00–16:00 · Urgencias 07:00-22:00',
  horarios: [
    { dia: 'Lunes a jueves', horas: '7:00 - 22:00', dias: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'], abre: '07:00', cierra: '22:00' },
    { dia: 'Viernes', horas: '7:00 - 22:00', dias: ['Friday'], abre: '07:00', cierra: '22:00' },
    { dia: 'Sábado y domingo', horas: 'Cerrado', dias: [] },
    { dia: 'Servicio de urgencias', horas: '07:00 - 22:00, de Lunes a Viernes', dias: [] },
  ],
  estadisticas: [
    { valor: '11', etiqueta: 'EBAIS en el cantón' },
    { valor: '45+', etiqueta: 'Años de servicio' },
    { valor: '50 000+', etiqueta: 'Personas adscritas' },
    { valor: '7–22 h', etiqueta: 'Urgencias, lunes a viernes' },
  ],
  redes: {
    facebook: 'https://www.facebook.com/', // TODO: dato real
  },
};

const navegacion = [
  { href: '/servicios', texto: 'Servicios' },
  { href: '/nosotros', texto: 'Nosotros' },
  { href: '/directorio', texto: 'Directorio' },
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
    email: site.correo,
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
    openingHoursSpecification: site.horarios
      .filter((h) => h.dias.length)
      .map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: h.dias, opens: h.abre, closes: h.cierra })),
    sameAs: Object.values(site.redes),
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
