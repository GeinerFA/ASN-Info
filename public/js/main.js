// Mejora progresiva: el sitio funciona sin JavaScript.
// Las clases .js y .animar las pone temprano.js antes del primer pintado.
document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', () => {
  const html = document.documentElement;
  const animar = html.classList.contains('animar');
  window.asnAnimaciones = true;

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

  // Cabecera: sombra y altura compacta al hacer scroll
  const cabecera = document.querySelector('.cabecera');
  if (cabecera) {
    let pendiente = false;
    const revisar = () => {
      cabecera.classList.toggle('cabecera--fija', window.scrollY > 40);
      pendiente = false;
    };
    window.addEventListener('scroll', () => {
      if (!pendiente) { pendiente = true; requestAnimationFrame(revisar); }
    }, { passive: true });
    revisar();
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

  // Todo lo que sigue es movimiento: se omite con prefers-reduced-motion.
  if (!animar) return;

  // Títulos palabra por palabra: cada palabra queda en <span class="palabra"><span>…</span></span>.
  // Se conservan los elementos internos (.cursiva, enlaces) y el texto sigue siendo texto real.
  document.querySelectorAll('[data-palabras]').forEach((titulo) => {
    let i = 0;
    const partir = (nodo) => {
      [...nodo.childNodes].forEach((hijo) => {
        if (hijo.nodeType === Node.ELEMENT_NODE) return partir(hijo);
        if (hijo.nodeType !== Node.TEXT_NODE || !hijo.textContent.trim()) return;
        const fragmento = document.createDocumentFragment();
        hijo.textContent.split(/(\s+)/).forEach((trozo) => {
          if (!trozo) return;
          if (/^\s+$/.test(trozo)) return fragmento.append(document.createTextNode(trozo));
          const palabra = document.createElement('span');
          const interior = document.createElement('span');
          palabra.className = 'palabra';
          interior.textContent = trozo;
          interior.style.setProperty('--i', i++);
          palabra.append(interior);
          fragmento.append(palabra);
        });
        hijo.replaceWith(fragmento);
      });
    };
    partir(titulo);
  });

  // Contadores tipo tragamonedas: cada dígito es una columna 0–9 que se desliza.
  document.querySelectorAll('[data-contador]').forEach((el) => {
    const texto = el.textContent.trim();
    el.setAttribute('aria-label', texto);
    el.textContent = '';
    [...texto].forEach((c, n) => {
      if (!/\d/.test(c)) {
        const fijo = document.createElement('span');
        fijo.textContent = c;
        fijo.setAttribute('aria-hidden', 'true');
        return el.append(fijo);
      }
      const col = document.createElement('span');
      const tira = document.createElement('span');
      col.className = 'contador__col';
      col.setAttribute('aria-hidden', 'true');
      tira.className = 'contador__tira';
      // Dos vueltas de 0–9 y luego el dígito final, para que "ruede".
      for (let k = 0; k < 20; k++) tira.insertAdjacentHTML('beforeend', `<span>${k % 10}</span>`);
      tira.insertAdjacentHTML('beforeend', `<span>${c}</span>`);
      tira.style.transitionDelay = `${n * 90}ms`;
      col.append(tira);
      el.append(col);
    });
    el.dataset.revelarContador = '';
    // Al terminar de rodar se devuelve el texto original (las columnas tienen ancho fijo y dejan huecos).
    el.restaurar = () => setTimeout(() => {
      el.textContent = texto;
      el.removeAttribute('aria-label');
    }, 2300 + texto.length * 90);
  });

  // Escalonamiento: dentro de [data-revelar-grupo], cada elemento entra un poco después.
  document.querySelectorAll('[data-revelar-grupo]').forEach((grupo) => {
    grupo.querySelectorAll('[data-revelar]').forEach((el, n) => {
      if (!el.style.getPropertyValue('--retardo')) el.style.setProperty('--retardo', `${Math.min(n, 8) * 90}ms`);
    });
  });
  document.querySelectorAll('[data-retardo]').forEach((el) => {
    el.style.setProperty('--retardo', `${parseInt(el.dataset.retardo, 10) || 0}ms`);
  });

  // Revelado al entrar en pantalla
  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add('visible');
      el.querySelectorAll('.contador__tira').forEach((tira) => {
        tira.style.transform = `translateY(-${(tira.children.length - 1) * 1.1}em)`;
      });
      if (el.restaurar) el.restaurar();
      // Al terminar la entrada, las tarjetas recuperan sus transiciones de hover normales.
      if (el.hasAttribute('data-revelar')) {
        const retardo = parseInt(el.style.getPropertyValue('--retardo'), 10) || 0;
        setTimeout(() => el.classList.add('revelado'), 1000 + retardo);
      }
      observador.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });

  // Lo de arriba de la página (hero y encabezados) entra al cargar, sin esperar el scroll,
  // para que los botones principales nunca queden ocultos en pantallas bajas.
  const alCargar = [];
  document.querySelectorAll('[data-revelar], [data-palabras], [data-revelar-contador]').forEach((el) => {
    if (el.closest('.hero__grid, .encabezado-pagina')) alCargar.push(el);
    else observador.observe(el);
  });
  requestAnimationFrame(() => requestAnimationFrame(() => {
    alCargar.forEach((el) => {
      el.classList.add('visible');
      if (el.hasAttribute('data-revelar')) {
        const retardo = parseInt(el.style.getPropertyValue('--retardo'), 10) || 0;
        setTimeout(() => el.classList.add('revelado'), 1000 + retardo);
      }
    });
  }));

  // FAQ: abrir y cerrar <details> con altura animada.
  const easing = 'cubic-bezier(0.22, 1, 0.36, 1)';
  document.querySelectorAll('.faq__item').forEach((det) => {
    const resumen = det.querySelector('summary');
    let anim = null;
    resumen.addEventListener('click', (e) => {
      e.preventDefault();
      if (anim) return;
      det.style.overflow = 'hidden';
      const inicio = det.offsetHeight;
      let fin;
      if (det.open) {
        fin = resumen.offsetHeight + (det.offsetHeight - det.clientHeight);
      } else {
        det.open = true;
        fin = det.offsetHeight;
      }
      const cerrando = fin < inicio;
      anim = det.animate({ height: [`${inicio}px`, `${fin}px`] }, { duration: 450, easing });
      anim.onfinish = anim.oncancel = () => {
        if (cerrando) det.open = false;
        det.style.overflow = '';
        anim = null;
      };
    });
  });
});
