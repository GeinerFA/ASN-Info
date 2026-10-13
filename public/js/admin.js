// Panel: confirmación antes de eliminar y contador de caracteres del resumen.
document.addEventListener('submit', (e) => {
  const form = e.target.closest('form[data-confirmar]');
  if (form && !window.confirm(form.dataset.confirmar)) e.preventDefault();
});

document.addEventListener('DOMContentLoaded', () => {
  // Horarios múltiples: botón + agrega un campo, × lo quita (máximo 6).
  const MAX_HORARIOS = 6;
  document.querySelectorAll('[data-horarios]').forEach((campo) => {
    const lista = campo.querySelector('.horarios__lista');
    const agregar = campo.querySelector('[data-agregar-horario]');
    const filas = () => [...lista.querySelectorAll('.horarios__fila')];
    const actualizar = () => {
      const todas = filas();
      todas.forEach((f, i) => {
        f.querySelector('input').setAttribute('aria-label', `Horario ${i + 1}`);
        f.querySelector('[data-quitar-horario]').hidden = todas.length === 1;
      });
      agregar.hidden = false;
      agregar.disabled = todas.length >= MAX_HORARIOS;
    };

    agregar.addEventListener('click', () => {
      const nueva = filas()[0].cloneNode(true);
      const input = nueva.querySelector('input');
      input.value = '';
      input.placeholder = 'Vie 7:00–15:00';
      lista.append(nueva);
      actualizar();
      input.focus();
    });

    lista.addEventListener('click', (e) => {
      const quitar = e.target.closest('[data-quitar-horario]');
      if (!quitar || filas().length === 1) return;
      const fila = quitar.closest('.horarios__fila');
      const siguiente = fila.nextElementSibling || fila.previousElementSibling;
      fila.remove();
      actualizar();
      siguiente.querySelector('input').focus();
    });

    actualizar();
  });

  document.querySelectorAll('textarea[data-contador]').forEach((ta) => {
    const info = document.createElement('small');
    info.className = 'contador';
    info.setAttribute('aria-live', 'polite');
    ta.insertAdjacentElement('afterend', info);
    const actualizar = () => {
      const n = ta.value.length;
      info.textContent = `${n} caracteres${n > 160 ? ' (Google podría recortarlo)' : ''}`;
      info.classList.toggle('contador--alerta', n > 160);
    };
    ta.addEventListener('input', actualizar);
    actualizar();
  });
});
