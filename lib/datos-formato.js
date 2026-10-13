// Funciones puras (sin BD) para el formato de datos/ y la combinación de 3 vías.
// Las usan lib/datos.js y el driver de merge de git (scripts/merge-datos.js).

const normalizar = (txt) => txt.replace(/\r\n/g, '\n');

// Una fila JSON por línea, ordenada por su clave.
function aTexto(filas, clave) {
  const orden = [...filas].sort((a, b) => (a[clave] < b[clave] ? -1 : a[clave] > b[clave] ? 1 : 0));
  return orden.map((f) => JSON.stringify(f)).join('\n') + (orden.length ? '\n' : '');
}

function aFilas(texto, origen) {
  return normalizar(texto)
    .split('\n')
    .filter((l) => l.trim())
    .map((l, i) => {
      try {
        return JSON.parse(l);
      } catch {
        throw new Error(`${origen}, línea ${i + 1}: no es JSON válido (¿conflicto de git sin resolver?)`);
      }
    });
}

// Combinación de 3 vías fila por fila.
// base = última versión sincronizada, local y remoto = las dos versiones modificadas.
// Devuelve { filas, avisos }. Nunca deja marcas de conflicto.
function combinar(base, local, remoto, clave) {
  const mapa = (filas) => new Map(filas.map((f) => [f[clave], JSON.stringify(f)]));
  const [b, l, r] = [mapa(base), mapa(local), mapa(remoto)];
  const resultado = [];
  const choques = [];
  const avisos = [];

  for (const k of new Set([...b.keys(), ...l.keys(), ...r.keys()])) {
    const vb = b.get(k), vl = l.get(k), vr = r.get(k);
    let elegido;
    if (vl === vr) elegido = vl;
    else if (vl === vb) elegido = vr; // solo cambió el remoto (o lo borró)
    else if (vr === vb) elegido = vl; // solo cambió el local (o lo borró)
    else if (vb === undefined && vl !== undefined && vr !== undefined) {
      // Ambos crearon una fila nueva con la misma clave: se conservan las dos.
      elegido = vl;
      choques.push(JSON.parse(vr));
    } else {
      // Ambos modificaron la misma fila de forma distinta: gana la versión del repositorio.
      elegido = vr ?? vl;
      avisos.push(`Conflicto en "${k}": se usó la versión del repositorio. Revise ese registro en el panel.`);
    }
    if (elegido !== undefined) resultado.push(JSON.parse(elegido));
  }

  if (choques.length) {
    if (clave !== 'id') {
      avisos.push(`Claves repetidas (${choques.map((c) => c[clave]).join(', ')}): se conservó la versión local.`);
    } else {
      let max = Math.max(0, ...resultado.map((f) => f.id));
      for (const f of choques) {
        avisos.push(`Registro nuevo ${f.id} creado por ambos: el del repositorio pasó a ser el ${max + 1}.`);
        resultado.push({ ...f, id: ++max });
      }
    }
  }
  return { filas: resultado, avisos };
}

module.exports = { aTexto, aFilas, combinar, normalizar };
