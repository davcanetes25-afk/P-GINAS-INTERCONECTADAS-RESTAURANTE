/**
 * nav.js — Menú hamburguesa compartido
 * Lunch Go — Sistema de Reservas de Almuerzos
 *
 * Activa el menú desplegable móvil en todas las páginas.
 * Se ejecuta automáticamente al cargar.
 */

(function iniciarHamburguesa() {
  // Esperar a que el DOM esté listo
  function setup() {
    const btnHamburger = document.getElementById('btn-hamburger');
    const mobileMenu   = document.getElementById('mobile-menu');
    const desktopMenu  = document.querySelector('.navbar__nav');

    if (!btnHamburger || !mobileMenu) return;

    if (desktopMenu) mobileMenu.innerHTML = desktopMenu.innerHTML;

    // Abrir / cerrar al hacer clic en el botón hamburguesa
    btnHamburger.addEventListener('click', function (e) {
      e.stopPropagation();
      const abierto = mobileMenu.classList.toggle('open');
      btnHamburger.setAttribute('aria-expanded', abierto ? 'true' : 'false');
      btnHamburger.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú de navegación');
    });

    // Cerrar al hacer clic fuera del menú
    document.addEventListener('click', function (e) {
      if (!mobileMenu.contains(e.target) && e.target !== btnHamburger) {
        mobileMenu.classList.remove('open');
        btnHamburger.setAttribute('aria-expanded', 'false');
        btnHamburger.setAttribute('aria-label', 'Abrir menú de navegación');
      }
    });

    // Cerrar al hacer clic en cualquier enlace del menú
    mobileMenu.querySelectorAll('a').forEach(function (enlace) {
      enlace.addEventListener('click', function () {
        mobileMenu.classList.remove('open');
        btnHamburger.setAttribute('aria-expanded', 'false');
      });
    });

    // Cerrar al presionar Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        mobileMenu.classList.remove('open');
        btnHamburger.setAttribute('aria-expanded', 'false');
        btnHamburger.focus();
      }
    });
  }

  // Ejecutar cuando el DOM esté disponible
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
