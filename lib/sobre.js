// Sección "Quiénes somos" de la página de inicio. Se edita en /admin/contenido y se guarda en
// contenido (clave 'sobre'); lo que falte se completa con estos valores por defecto.
const { getContenido } = require('../db/database');
const { site } = require('./site');

const MAX_ESTADISTICAS = 4;

const SOBRE_DEFECTO = {
  // Entre asteriscos va la palabra en cursiva: "de *Naranjo*".
  titulo: 'Comprometidos con la salud de *Naranjo*',
  texto: `Somos el primer nivel de atención de la ${site.institucion} en el cantón. Desde la sede central y nuestra red de EBAIS acompañamos a cada familia con prevención, consulta y seguimiento.`,
  foto: null, // nombre del archivo en public/uploads; sin foto se usa la de site.fotos.nosotros
  fotoAlt: 'Edificio de la sede del Área de Salud Naranjo',
  selloTitulo: 'Parte de la CCSS',
  selloTexto: `Unidad programática ${site.unidadProgramatica}`,
  // TODO: dato real
  estadisticas: [
    { valor: '11', etiqueta: 'EBAIS en el cantón' },
    { valor: '45+', etiqueta: 'Años de servicio' },
    { valor: '50 000+', etiqueta: 'Personas adscritas' },
    { valor: '7 a.m. – 10 p.m.', etiqueta: 'Urgencias, lunes a viernes' },
  ],
};

function leerSobre() {
  const guardado = getContenido('sobre', {}) || {};
  const sobre = { ...SOBRE_DEFECTO, ...guardado };
  sobre.fotoUrl = sobre.foto ? '/uploads/' + sobre.foto : site.fotos.nosotros;
  return sobre;
}

module.exports = { SOBRE_DEFECTO, MAX_ESTADISTICAS, leerSobre };
