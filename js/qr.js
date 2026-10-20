/**
 * qr.js — Confirmación de recogida mediante cédula
 * Lunch Go — Sistema de Reservas de Almuerzos
 *
 * Funcionalidades:
 * - Valida la cédula del empleado contra el LocalStorage
 * - Verifica que exista una reserva válida y pendiente
 * - Cambia el estado de la reserva a "entregada"
 * - Registra la fecha y hora de entrega
 * - Evita entregas duplicadas
 *
 * AVISO ACADÉMICO: La validación por cédula en LocalStorage es una simulación.
 * En producción, use autenticación de servidor.
 */

// ============================================================
// CONTROL DE ACCESO
// ============================================================

// La confirmación está disponible sin sesión; la navegación se adapta al usuario.
const sesionQR = obtenerSesion();

// ============================================================
// CONFIGURAR NAVEGACIÓN SEGÚN ROL
// ============================================================

(function configurarNav() {
  const navLinks  = document.getElementById('nav-links');
  const navNombre = document.getElementById('nav-nombre');
  const navAvatar = document.getElementById('nav-avatar');
  const navBrand  = document.getElementById('nav-brand');
  const btnLogout = document.getElementById('btn-logout');
  const mobileMenu = document.getElementById('mobile-menu');
  const linkVolverPanel = document.getElementById('link-volver-panel');

  if (sesionQR) {
    navNombre.textContent = sesionQR.nombre.split(' ')[0];
    navAvatar.textContent = sesionQR.iniciales || sesionQR.nombre.slice(0, 2).toUpperCase();

    if (sesionQR.rol === 'administrador') {
      navBrand.href = 'administrador.html';
      navLinks.innerHTML = `
        <a href="administrador.html" class="navbar__link">Panel</a>
        <a href="qr.html" class="navbar__link active" aria-current="page">Recogida</a>
        <a href="historial.html" class="navbar__link">Historial</a>
      `;
      linkVolverPanel.href = 'administrador.html';
      linkVolverPanel.textContent = 'Volver al panel';
    } else {
      navBrand.href = 'empleado.html';
      navLinks.innerHTML = `
        <a href="empleado.html" class="navbar__link">Menú</a>
        <a href="qr.html" class="navbar__link active" aria-current="page">Recogida</a>
        <a href="historial.html" class="navbar__link">Historial</a>
      `;
    }

    mobileMenu.innerHTML = navLinks.innerHTML;
    btnLogout.addEventListener('click', cerrarSesion);
  } else {
    // Acceso sin sesión.
    navNombre.textContent = 'Visitante';
    navAvatar.textContent = '?';
    navBrand.href = 'index.html';
    navLinks.innerHTML = `
      <a href="index.html" class="navbar__link">Iniciar sesión</a>
    `;
    mobileMenu.innerHTML = navLinks.innerHTML;
    btnLogout.style.display = 'none';
    linkVolverPanel.href = 'index.html';
    linkVolverPanel.textContent = 'Iniciar sesión';
  }
})();

// ============================================================
// VALIDACIÓN Y CONFIRMACIÓN DE RECOGIDA
// ============================================================

const formCedula     = document.getElementById('form-cedula');
const inputCedula    = document.getElementById('input-cedula');
const cedulaError    = document.getElementById('cedula-error');
const resultadoQR    = document.getElementById('resultado-qr');
const btnConfirmarQR = document.getElementById('btn-confirmar-qr');

// Limpiar errores al escribir
inputCedula.addEventListener('input', function() {
  this.classList.remove('error');
  cedulaError.classList.remove('visible');
  resultadoQR.classList.add('hidden');
});

formCedula.addEventListener('submit', function(e) {
  e.preventDefault();
  procesarConfirmacion();
});

/**
 * Procesa la confirmación de recogida:
 * 1. Valida la cédula
 * 2. Busca al empleado
 * 3. Busca su reserva del día
 * 4. Marca como entregada
 */
function procesarConfirmacion() {
  // Limpiar estado anterior
  cedulaError.classList.remove('visible');
  inputCedula.classList.remove('error');
  resultadoQR.classList.add('hidden');

  const cedula = inputCedula.value.trim();

  // Validar campo vacío
  if (!cedula) {
    cedulaError.textContent = 'El número de cédula es obligatorio.';
    cedulaError.classList.add('visible');
    inputCedula.classList.add('error');
    inputCedula.focus();
    return;
  }

  // Estado de carga
  btnConfirmarQR.disabled = true;
  btnConfirmarQR.textContent = 'Verificando...';

  setTimeout(function() {
    // Buscar empleado por cédula
    const usuarios = obtenerUsuarios();
    const empleado = usuarios.find(function(u) {
      return u.cedula && u.cedula.toLowerCase().replace(/[\s-]/g, '') ===
             cedula.toLowerCase().replace(/[\s-]/g, '');
    });

    if (!empleado) {
      mostrarResultadoError(
        'Cédula no encontrada',
        'No existe ningún empleado registrado con el número de cédula <strong>' + escapeHTML(cedula) + '</strong>. ' +
        'Verifica el número e intenta de nuevo.'
      );
      btnConfirmarQR.disabled = false;
      btnConfirmarQR.textContent = 'Confirmar recogida';
      return;
    }

    // Buscar reserva válida del día
    const hoy = fechaHoy();
    const reservas = obtenerReservas();
    const reservaValida = reservas.find(function(r) {
      return r.empleadoId === empleado.id &&
             r.fecha === hoy &&
             r.estado === 'reservada';
    });

    if (!reservaValida) {
      // Verificar si ya fue entregada
      const entregada = reservas.find(function(r) {
        return r.empleadoId === empleado.id &&
               r.fecha === hoy &&
               r.estado === 'entregada';
      });

      if (entregada) {
        mostrarResultadoError(
          'Almuerzo ya entregado',
          'El almuerzo de <strong>' + escapeHTML(empleado.nombre) + '</strong> ' +
          '(<strong>' + escapeHTML(entregada.platoNombre) + '</strong>) ya fue entregado el ' +
          formatearFecha(entregada.fechaEntrega) + '. ' +
          'No es posible registrar la entrega dos veces.'
        );
      } else {
        mostrarResultadoError(
          'Sin reserva para hoy',
          'No se encontró ninguna reserva activa para <strong>' + escapeHTML(empleado.nombre) + '</strong> el día de hoy. ' +
          'Asegúrate de haber realizado tu reserva entre las 8:00 y las 10:00 a. m.'
        );
      }

      btnConfirmarQR.disabled = false;
      btnConfirmarQR.textContent = 'Confirmar recogida';
      return;
    }

    // ✅ Todo válido — Registrar entrega
    const ahora = new Date().toISOString();
    const idx = reservas.findIndex(function(r) { return r.id === reservaValida.id; });
    reservas[idx].estado       = 'entregada';
    reservas[idx].fechaEntrega = ahora;
    guardarReservas(reservas);

    mostrarResultadoExito(empleado, reservaValida, ahora);

    // Limpiar formulario
    inputCedula.value = '';
    btnConfirmarQR.disabled = false;
    btnConfirmarQR.textContent = 'Confirmar recogida';

  }, 700);
}

// ============================================================
// MOSTRAR RESULTADOS
// ============================================================

function mostrarResultadoExito(empleado, reserva, fechaEntrega) {
  resultadoQR.classList.remove('hidden');
  resultadoQR.innerHTML = `
    <div class="success-animation">
      <div class="success-animation__icon" aria-hidden="true">✓</div>
      <p class="success-animation__title">¡Entrega confirmada!</p>
      <div class="success-animation__detail">
        <p><strong>${escapeHTML(empleado.nombre)}</strong></p>
        <p style="margin: var(--space-2) 0;">${escapeHTML(reserva.platoEmoji)} ${escapeHTML(reserva.platoNombre)}</p>
        <p>🕐 ${formatearFecha(fechaEntrega)}</p>
      </div>
    </div>
    <div class="alert alert--success" style="margin-top: var(--space-4);">
      <span class="alert-icon" aria-hidden="true">✓</span>
      <div>
        El almuerzo de <strong>${escapeHTML(empleado.nombre)}</strong> ha sido marcado como entregado.
        Esta entrega queda registrada y no puede volver a confirmarse.
      </div>
    </div>
  `;
  resultadoQR.focus();
}

function mostrarResultadoError(titulo, mensaje) {
  resultadoQR.classList.remove('hidden');
  resultadoQR.innerHTML = `
    <div class="alert alert--error">
      <span class="alert-icon" aria-hidden="true">!</span>
      <div>
        <strong>${titulo}</strong><br>
        <span style="font-weight:400;">${mensaje}</span>
      </div>
    </div>
  `;
  resultadoQR.focus();
  inputCedula.classList.add('error');
}

// ============================================================
// UTILIDAD — Escape HTML para evitar XSS en strings dinámicos
// ============================================================

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
