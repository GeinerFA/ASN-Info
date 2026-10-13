// Mejora progresiva: el sitio funciona sin JavaScript.
document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', () => {
  // Menú móvil
  const boton = document.querySelector('.menu-boton');
  const nav = document.getElementById('menu-principal');
  if (boton && nav) {
    const cerrar = () => {
      nav.classList.remove('abierto');
      boton.setAttribute('aria-expanded', 'false');
      boton.setAttribute('aria-label', 'Abrir menú');
    };
    boton.addEventListener('click', () => {
      const abierto = nav.classList.toggle('abierto');
      boton.setAttribute('aria-expanded', String(abierto));
      boton.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    });
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) cerrar(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('abierto')) { cerrar(); boton.focus(); }
    });
  }

  // Buscador del directorio
  const buscador = document.querySelector('.buscador');
  const entrada = document.getElementById('buscar-directorio');
  if (buscador && entrada) {
    buscador.hidden = false;
    const vacio = document.getElementById('directorio-vacio');
    const normalizar = (t) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    const grupos = [...document.querySelectorAll('[data-grupo]')].map((g) => ({
      el: g,
      filas: [...g.querySelectorAll('[data-fila]')].map((f) => ({
        el: f,
        texto: normalizar(g.querySelector('h2').textContent + ' ' + f.textContent),
      })),
    }));

    entrada.addEventListener('input', () => {
      const q = normalizar(entrada.value.trim());
      let total = 0;
      grupos.forEach((g) => {
        let visibles = 0;
        g.filas.forEach((f) => {
          const ok = !q || f.texto.includes(q);
          f.el.hidden = !ok;
          if (ok) visibles++;
        });
        g.el.hidden = visibles === 0;
        total += visibles;
      });
      vacio.hidden = total > 0;
    });
  }
});
