// Carga datos de EJEMPLO. Ejecutar: npm run seed
// ATENCIÓN: borra anuncios, directorio, servicios y contenido existentes (no toca usuarios).
// TODO: dato real — reemplazar todo este contenido por la información oficial del Área de Salud.
const { db, setContenido } = require('./database');
const { slugify, hoyISO } = require('../lib/util');

const servicios = [
  ['Medicina general', 'Consulta externa para la atención integral de personas de todas las edades en su EBAIS.', 'stethoscope', 'Lun–Vie 7:00–16:00', 1],
  ['Servicio de urgencias', 'Atención inmediata de situaciones que ponen en riesgo la salud, las 24 horas.', 'siren', '24 horas, todos los días', 1],
  ['Odontología', 'Prevención, limpiezas, extracciones y restauraciones para niños, embarazadas y adultos.', 'tooth', 'Lun–Vie 7:00–16:00', 1],
  ['Farmacia', 'Despacho de medicamentos con receta, incluidas las recetas de control crónico.', 'pill', 'Lun–Vie 7:00–19:00', 1],
  ['Laboratorio clínico', 'Toma de muestras y análisis de sangre, orina y otros exámenes indicados por su médico.', 'flask', 'Lun–Vie 6:00–14:00', 1],
  ['Vacunación', 'Esquema nacional de vacunación para niños y adultos, y campañas como la de influenza.', 'syringe', 'Lun–Vie 7:00–15:00', 1],
  ['Enfermería', 'Curaciones, inyectables, control de presión arterial y seguimiento de pacientes crónicos.', 'heart', 'Lun–Vie 7:00–16:00', 0],
  ['Control prenatal', 'Seguimiento del embarazo, educación prenatal y atención a la madre y el bebé.', 'baby', 'Lun–Vie 7:00–16:00', 0],
  ['Psicología', 'Atención en salud mental para personas referidas por su médico de EBAIS.', 'brain', 'Lun–Vie 7:00–16:00', 0],
  ['Nutrición', 'Orientación alimentaria para el control del peso, la diabetes, la hipertensión y otras condiciones.', 'apple', 'Lun–Vie 7:00–16:00', 0],
  ['Trabajo Social', 'Apoyo a personas y familias en situación de vulnerabilidad, y coordinación con otras instituciones.', 'users', 'Lun–Vie 7:00–16:00', 0],
  ['Atención domiciliar', 'Visitas de los ATAP y del equipo de salud a hogares, adultos mayores y personas encamadas.', 'home', 'Según programación del EBAIS', 0],
];

// [departamento, servicio, teléfono, extensión, horario]
const directorio = [
  ['Central telefónica', 'Información general', '2103-1700', null, 'Lun–Vie 7:00–16:00'],
  ['Urgencias', 'Servicio de urgencias', '2103-1700', null, '24 horas'],
  ['Dirección médica', 'Dirección del Área de Salud', '2103-1700', '101', 'Lun–Vie 7:00–16:00'],
  ['Dirección médica', 'Administración', '2103-1700', '102', 'Lun–Vie 7:00–16:00'],
  ['Servicios de apoyo', 'Farmacia', '2103-1700', '120', 'Lun–Vie 7:00–19:00'],
  ['Servicios de apoyo', 'Laboratorio clínico', '2103-1700', '130', 'Lun–Vie 6:00–14:00'],
  ['Servicios de apoyo', 'Registros de Salud (REDES)', '2103-1700', '140', 'Lun–Vie 7:00–16:00'],
  ['Servicios de apoyo', 'Odontología', '2103-1700', '150', 'Lun–Vie 7:00–16:00'],
  ['Servicios de apoyo', 'Trabajo Social', '2103-1700', '160', 'Lun–Vie 7:00–16:00'],
  ['Servicios de apoyo', 'Contraloría de Servicios', '2103-1700', '170', 'Lun–Vie 7:00–16:00'],
  ['EBAIS', 'EBAIS Naranjo Centro', '2103-1700', null, 'Lun–Vie 7:00–16:00'],
  ['EBAIS', 'EBAIS San Juan', '2103-1700', null, 'Lun–Vie 7:00–16:00'],
  ['EBAIS', 'EBAIS San Miguel', '2103-1700', null, 'Lun–Vie 7:00–16:00'],
  ['EBAIS', 'EBAIS Cirrí', '2103-1700', null, 'Lun–Vie 7:00–16:00'],
  ['EBAIS', 'EBAIS San Jerónimo', '2103-1700', null, 'Lun–Vie 7:00–16:00'],
  ['EBAIS', 'EBAIS El Rosario', '2103-1700', null, 'Lun–Vie 7:00–16:00'],
  ['Emergencias nacionales', 'Sistema de Emergencias 9-1-1', '911', null, '24 horas'],
  ['Emergencias nacionales', 'Línea de la CCSS (consultas y citas)', '905-2272-622', null, 'Lun–Vie 7:00–19:00'],
];

const contenido = {
  mision:
    'Brindar servicios integrales de salud a la población del cantón de Naranjo, con calidad, calidez, equidad y oportunidad, por medio de la promoción, prevención, atención y rehabilitación, con la participación activa de la comunidad.',
  vision:
    'Ser un Área de Salud líder en la atención primaria de la región, reconocida por su excelencia, su innovación y su compromiso humano, y que contribuya al bienestar y a una mejor calidad de vida de las personas de Naranjo.',
  valores: [
    { titulo: 'Solidaridad', texto: 'Servimos a todas las personas sin distinción y con sentido de comunidad.' },
    { titulo: 'Calidez humana', texto: 'Atendemos con respeto, empatía y trato digno.' },
    { titulo: 'Compromiso', texto: 'Damos lo mejor de nosotros por la salud de cada persona usuaria.' },
    { titulo: 'Transparencia', texto: 'Actuamos con ética y rendimos cuentas a la población.' },
  ],
  foda: {
    fortalezas: [
      'Personal comprometido y con experiencia en atención primaria.',
      'Red de EBAIS distribuida en todo el cantón.',
      'Expediente Digital Único en Salud (EDUS) implementado.',
      'Servicio de urgencias disponible las 24 horas.',
    ],
    oportunidades: [
      'Alianzas con la Municipalidad, escuelas y asociaciones comunales.',
      'Uso creciente de la App EDUS para citas y consultas.',
      'Programas nacionales de promoción de la salud.',
      'Participación activa de la Junta de Salud.',
    ],
    debilidades: [
      'Infraestructura que requiere ampliación y mantenimiento.',
      'Tiempos de espera para algunas especialidades.',
      'Recurso humano limitado ante el crecimiento de la población.',
    ],
    amenazas: [
      'Aumento de enfermedades crónicas no transmisibles.',
      'Envejecimiento de la población.',
      'Brotes de enfermedades emergentes (dengue, virus respiratorios).',
      'Restricciones presupuestarias institucionales.',
    ],
  },
  faq: [
    {
      p: '¿Cómo saco una cita en mi EBAIS?',
      r: 'Puede solicitarla desde la App EDUS, en la ventanilla de REDES de su EBAIS o por teléfono en el horario de atención. Tenga a mano su número de cédula.',
    },
    {
      p: '¿Qué documentos debo presentar?',
      r: 'Su cédula de identidad o DIMEX vigente. Para menores de edad se presenta la cédula de la persona menor o su constancia de nacimiento, junto con la persona encargada.',
    },
    {
      p: '¿Cuál es el horario del servicio de urgencias?',
      r: 'El servicio de urgencias atiende las 24 horas, todos los días del año. Ante una emergencia que ponga en riesgo la vida, llame al 9-1-1.',
    },
    {
      p: '¿Cómo retiro mis medicamentos de control crónico?',
      r: 'Presente su cédula en la ventanilla de farmacia en la fecha indicada en su receta. También puede autorizar a otra persona para retirarlos.',
    },
    {
      p: '¿Qué hago si no estoy asegurado?',
      r: 'Acérquese a la oficina de Validación de Derechos para conocer las opciones de aseguramiento. Las urgencias se atienden siempre.',
    },
    {
      p: '¿Dónde presento una queja o sugerencia?',
      r: 'En la Contraloría de Servicios del Área de Salud, de forma presencial o por teléfono. Su opinión nos ayuda a mejorar.',
    },
  ],
};

const hoy = hoyISO();
const anuncios = [
  {
    titulo: 'Campaña de vacunación contra la influenza 2026',
    resumen: 'Inicia la vacunación contra la influenza para adultos mayores, embarazadas y personas con enfermedades crónicas.',
    contenido:
      'El Área de Salud Naranjo invita a la población a vacunarse contra la influenza estacional.\n\nGrupos prioritarios: personas mayores de 65 años, embarazadas, niños de 6 meses a 4 años y personas con enfermedades crónicas.\n\nPresente su cédula y su carné de vacunas en cualquiera de nuestros EBAIS, de lunes a viernes de 7:00 a.m. a 3:00 p.m.',
    categoria: 'Campañas',
    destacado: 1,
  },
  {
    titulo: 'Nuevo horario de farmacia',
    resumen: 'A partir de este mes la farmacia amplía su horario de atención hasta las 7:00 p.m.',
    contenido:
      'Para mejorar el servicio, la farmacia del Área de Salud Naranjo atenderá de lunes a viernes de 7:00 a.m. a 7:00 p.m.\n\nRecuerde retirar sus medicamentos de control crónico en la fecha indicada.',
    categoria: 'Avisos',
    destacado: 0,
  },
  {
    titulo: 'Feria de la salud en el parque central',
    resumen: 'Toma de presión, glicemia, vacunación y charlas de prevención, gratis para toda la comunidad.',
    contenido:
      'Acompáñenos en la feria de la salud en el parque central de Naranjo.\n\nHabrá toma de presión arterial y glicemia, vacunación, charlas de nutrición y de prevención del dengue, y actividades para niños.',
    categoria: 'Eventos',
    destacado: 0,
  },
];

db.exec('DELETE FROM anuncios; DELETE FROM directorio; DELETE FROM servicios; DELETE FROM contenido;');

const insServicio = db.prepare(
  'INSERT INTO servicios (nombre, descripcion, icono, horario, destacado, orden) VALUES (?, ?, ?, ?, ?, ?)'
);
servicios.forEach((s, i) => insServicio.run(...s, i));

const insDir = db.prepare(
  'INSERT INTO directorio (departamento, servicio, telefono, extension, horario, orden) VALUES (?, ?, ?, ?, ?, ?)'
);
directorio.forEach((d, i) => insDir.run(...d, i));

for (const [clave, valor] of Object.entries(contenido)) setContenido(clave, valor);

const insAnuncio = db.prepare(
  'INSERT INTO anuncios (titulo, slug, resumen, contenido, categoria, destacado, publicado, fecha_publicacion) VALUES (?, ?, ?, ?, ?, ?, 1, ?)'
);
anuncios.forEach((a) =>
  insAnuncio.run(a.titulo, slugify(a.titulo), a.resumen, a.contenido, a.categoria, a.destacado, hoy)
);

console.log(
  `Datos de ejemplo cargados: ${servicios.length} servicios, ${directorio.length} contactos, ${anuncios.length} anuncios.`
);
