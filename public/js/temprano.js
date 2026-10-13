// Se carga sin "defer" en <head> para marcar el documento antes del primer pintado
// y evitar que el contenido animado parpadee. Sin este archivo todo queda visible.
(function () {
  var html = document.documentElement;
  html.classList.add('js');
  var reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducido || !('IntersectionObserver' in window)) return;
  html.classList.add('animar');
  // Red de seguridad: si main.js no llega a ejecutarse, se muestra todo.
  setTimeout(function () {
    if (!window.asnAnimaciones) html.classList.remove('animar');
  }, 3000);
})();
