// Panel: confirmación antes de eliminar y contador de caracteres del resumen.
document.addEventListener('submit', (e) => {
  const form = e.target.closest('form[data-confirmar]');
  if (form && !window.confirm(form.dataset.confirmar)) e.preventDefault();
});

document.addEventListener('DOMContentLoaded', () => {
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
