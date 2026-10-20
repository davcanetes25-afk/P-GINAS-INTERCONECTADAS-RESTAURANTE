/**
 * empleado.js — Panel del Empleado
 * Lunch Go — Sistema de Reservas de Almuerzos
 *
 * Funcionalidades:
 * - Muestra el menú del día y proteína del día
 * - Permite seleccionar un almuerzo y reservarlo
 * - Guarda reservas en LocalStorage
 * - Muestra las reservas del empleado con sus estados
 * - Permite cancelar reservas dentro del horario autorizado
 * - Aplica validaciones de horario (08:00 – 10:00 reservas; hasta 10:30 cancelaciones)
 */

// ============================================================
// INICIALIZACIÓN Y CONTROL DE ACCESO
// ============================================================

// Verificar que el usuario sea empleado (o admin que accede como empleado)
const sesion = verificarAcceso(); // null redirige a login
if (!sesion) throw new Error('Sin sesión'); // Detener ejecución si no hay sesión

// ============================================================
// REFERENCIAS AL DOM
// ============================================================

const navNombre        = document.getElementById('nav-nombre');
const navAvatar        = document.getElementById('nav-avatar');
const saludoHora       = document.getElementById('saludo-hora');
const bienvenidaNombre = document.getElementById('bienvenida-nombre');
const fechaHoyEl       = document.getElementById('fecha-hoy');
const avisoHorario     = document.getElementById('aviso-horario');
const avisoHorarioTxt  = document.getElementById('aviso-horario-texto');
const estadoHorarioBadge = document.getElementById('estado-horario-badge');

const proteinaBanner = document.getElementById('proteina-banner');
const proteinaEmoji  = document.getElementById('proteina-emoji');
const proteinaNombre = document.getElementById('proteina-nombre');
const proteinaDesc   = document.getElementById('proteina-desc');

const menuGrid    = document.getElementById('menu-grid');
const reservaPanel = document.getElementById('reserva-panel');
const seleccionNombre = document.getElementById('seleccion-nombre');
const btnReservar = document.getElementById('btn-reservar');

const misReservasContainer = document.getElementById('mis-reservas-container');

// Modal reserva
const modalReserva    = document.getElementById('modal-reserva');
const modalDetalle    = document.getElementById('modal-reserva-detalle');
const btnConfirmar    = document.getElementById('btn-confirmar-reserva');
const btnCancelarModal = document.getElementById('btn-cancelar-modal');

// Modal detalles
const modalDetalles   = document.getElementById('modal-detalles');
const detalleEmoji    = document.getElementById('detalle-emoji');
const detalleNombre   = document.getElementById('detalle-nombre');
const detalleDesc     = document.getElementById('detalle-desc');
const detalleAcomp    = document.getElementById('detalle-acompanamientos');
const btnCerrarDet    = document.getElementById('btn-cerrar-detalles');
const btnSelDesde     = document.getElementById('btn-seleccionar-desde-detalles');

// Botón de cierre de sesión
document.getElementById('btn-logout').addEventListener('click', cerrarSesion);

// ============================================================
// ESTADO LOCAL DE LA PÁGINA
// ============================================================

let planoSeleccionado = null; // Plato actualmente seleccionado
let planoDetalleAbierto = null; // Plato cuyo modal de detalles está abierto

// ============================================================
// CONFIGURACIÓN DE INTERFAZ AL CARGAR
// ============================================================

function configurarInterfazUsuario() {
  // Datos del usuario en la barra de navegación
  navNombre.textContent = sesion.nombre.split(' ')[0];
  navAvatar.textContent = sesion.iniciales || sesion.nombre.slice(0, 2).toUpperCase();

  // Saludo según hora del día
  const hora = new Date().getHours();
  let saludo = 'Buenos días';
  if (hora >= 12 && hora < 19) saludo = 'Buenas tardes';
  else if (hora >= 19) saludo = 'Buenas noches';
  saludoHora.textContent = saludo + ',';

  // Nombre completo en bienvenida
  bienvenidaNombre.textContent = sesion.nombre;

  // Fecha de hoy en español
  fechaHoyEl.textContent = new Date().toLocaleDateString('es-CR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

// ============================================================
// VALIDACIÓN DE HORARIO
// ============================================================

/**
 * Evalúa el horario actual y muestra el aviso correspondiente.
 * @returns {{ puedeReservar: boolean, puedeCancelar: boolean }}
 */
function evaluarHorario() {
  const ahora = new Date();
  const h = ahora.getHours();
  const m = ahora.getMinutes();
  const totalMin = h * 60 + m;

  const inicioReservas = 8 * 60;          // 08:00
  const finReservas    = 10 * 60;         // 10:00
  const finCancelacion = 10 * 60 + 30;   // 10:30

  const puedeReservar  = totalMin >= inicioReservas && totalMin < finReservas;
  const puedeCancelar  = totalMin < finCancelacion;

  if (!puedeReservar) {
    avisoHorario.classList.remove('hidden');
    if (totalMin < inicioReservas) {
      avisoHorarioTxt.textContent =
        'Las reservas abren a las 8:00 a. m. y cierran a las 10:00 a. m. Vuelve en un momento.';
      estadoHorarioBadge.textContent = '🔒 Reservas cerradas';
      estadoHorarioBadge.className = 'badge badge--cancel';
    } else {
      avisoHorarioTxt.textContent =
        'El horario de reservas (8:00 – 10:00 a. m.) ha finalizado por hoy. ' +
        'Las cancelaciones se permitían hasta las 10:30 a. m.';
      estadoHorarioBadge.textContent = '🔒 Fuera de horario';
      estadoHorarioBadge.className = 'badge badge--cancel';
    }
  } else {
    avisoHorario.classList.add('hidden');
    estadoHorarioBadge.textContent = '🟢 Reservas abiertas';
    estadoHorarioBadge.className = 'badge badge--done';
  }

  // Deshabilitar botón de reserva si fuera de horario
  btnReservar.disabled = !puedeReservar;
  if (!puedeReservar) {
    btnReservar.title = 'Las reservas solo se aceptan entre las 8:00 y las 10:00 a. m.';
  }

  return { puedeReservar, puedeCancelar };
}

// ============================================================
// PROTEÍNA DEL DÍA
// ============================================================

function renderizarProteina() {
  const proteina = obtenerProteina();
  proteinaEmoji.textContent = proteina.emoji || '🍗';
  proteinaNombre.textContent = proteina.nombre || 'Pollo asado';
  proteinaDesc.textContent   = proteina.descripcion || '';
}

// ============================================================
// MENÚ DEL DÍA
// ============================================================

function renderizarMenu() {
  const menu = obtenerMenu().filter(function(p) { return p.activo; });
  menuGrid.innerHTML = '';

  if (menu.length === 0) {
    menuGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-state__icon">🍽️</div>
        <p class="empty-state__title">Sin opciones disponibles</p>
        <p class="empty-state__text">El administrador aún no ha configurado el menú de hoy.</p>
      </div>
    `;
    return;
  }

  menu.forEach(function(plato) {
    const isSelected = planoSeleccionado && planoSeleccionado.id === plato.id;
    const acompTags = (plato.acompañamientos || [])
      .map(function(a) { return `<span class="meal-card__tag">🌿 ${a}</span>`; })
      .join('');

    const card = document.createElement('article');
    card.className = 'meal-card' + (isSelected ? ' selected' : '');
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', plato.nombre);
    card.setAttribute('data-id', plato.id);
    card.innerHTML = `
      <div class="meal-card__selected-check" aria-hidden="true">✓</div>
      <div class="meal-card__header">
        <span class="meal-card__emoji" aria-hidden="true">${plato.emoji || '🍽️'}</span>
        <span class="meal-card__name">${plato.nombre}</span>
        <span class="meal-card__badge">${plato.categoria || 'Almuerzo'}</span>
      </div>
      <div class="meal-card__body">
        <p class="meal-card__description">${plato.descripcion}</p>
        <div>${acompTags}</div>
      </div>
      <div class="meal-card__footer">
        <button
          class="btn btn--ghost btn--sm"
          data-action="detalles"
          data-id="${plato.id}"
          aria-label="Ver detalles de ${plato.nombre}"
        >
          <span aria-hidden="true">🔍</span> Ver detalles
        </button>
        <button
          class="btn btn--secondary btn--sm"
          data-action="seleccionar"
          data-id="${plato.id}"
          aria-label="Seleccionar ${plato.nombre} para reservar"
          style="flex:1;"
        >
          ${isSelected ? '✅ Seleccionado' : '🍽️ Seleccionar'}
        </button>
      </div>
    `;

    menuGrid.appendChild(card);
  });

  // Event listeners en las tarjetas
  menuGrid.addEventListener('click', manejarClickMenu);
}

/** Maneja los clics dentro del grid de menú */
function manejarClickMenu(e) {
  const btnDetalles   = e.target.closest('[data-action="detalles"]');
  const btnSeleccionar = e.target.closest('[data-action="seleccionar"]');

  if (btnDetalles) {
    const plato = obtenerMenu().find(function(p) { return p.id === btnDetalles.dataset.id; });
    if (plato) abrirDetalles(plato);
  }

  if (btnSeleccionar) {
    const plato = obtenerMenu().find(function(p) { return p.id === btnSeleccionar.dataset.id; });
    if (plato) seleccionarPlato(plato);
  }
}

/** Selecciona un plato para reservar */
function seleccionarPlato(plato) {
  const horario = evaluarHorario();
  if (!horario.puedeReservar) return;

  planoSeleccionado = plato;
  seleccionNombre.textContent = plato.nombre;
  reservaPanel.classList.remove('hidden');
  renderizarMenu(); // Refrescar estilos
}

// ============================================================
// MODAL — DETALLES DEL PLATO
// ============================================================

function abrirDetalles(plato) {
  planoDetalleAbierto = plato;
  detalleEmoji.textContent = plato.emoji || '🍽️';
  detalleNombre.textContent = plato.nombre;
  detalleDesc.textContent   = plato.descripcion;
  detalleAcomp.innerHTML = (plato.acompañamientos || [])
    .map(function(a) { return `<span class="meal-card__tag">🌿 ${a}</span>`; })
    .join('');
  modalDetalles.classList.remove('hidden');
}

btnCerrarDet.addEventListener('click', function() {
  modalDetalles.classList.add('hidden');
  planoDetalleAbierto = null;
});

btnSelDesde.addEventListener('click', function() {
  if (planoDetalleAbierto) {
    seleccionarPlato(planoDetalleAbierto);
    modalDetalles.classList.add('hidden');
  }
});

modalDetalles.addEventListener('click', function(e) {
  if (e.target === modalDetalles) modalDetalles.classList.add('hidden');
});

// ============================================================
// MODAL — CONFIRMACIÓN DE RESERVA
// ============================================================

btnReservar.addEventListener('click', function() {
  if (!planoSeleccionado) return;
  const horario = evaluarHorario();
  if (!horario.puedeReservar) return;

  // Comprobar si ya tiene una reserva activa hoy
  const hoy = fechaHoy();
  const reservasHoy = obtenerReservas().filter(function(r) {
    return r.empleadoId === sesion.id &&
           r.fecha === hoy &&
           r.estado !== 'cancelada';
  });

  if (reservasHoy.length > 0) {
    // Ya tiene reserva — no duplicar
    mostrarNotificacion('Ya tienes una reserva registrada para hoy. Cancela la anterior para reservar un plato diferente.', 'warning');
    modalReserva.classList.add('hidden');
    return;
  }

  // Mostrar detalles en el modal
  const plato = planoSeleccionado;
  const proteina = obtenerProteina();
  modalDetalle.innerHTML = `
    <div style="display:flex; align-items:center; gap: var(--space-4); margin-bottom:var(--space-4);">
      <span style="font-size: 40px;" aria-hidden="true">${plato.emoji || '🍽️'}</span>
      <div>
        <p style="font-size: var(--font-size-lg); font-weight:700; color: var(--color-text);">${plato.nombre}</p>
        <p style="font-size: var(--font-size-sm); color: var(--color-text-muted);">${plato.descripcion}</p>
      </div>
    </div>
    <div style="border-top: 1px solid var(--color-border); padding-top: var(--space-3);">
      <p style="font-size: var(--font-size-sm); color: var(--color-text-muted);">
        🍗 <strong>Proteína del día:</strong> ${proteina.nombre || 'Por definir'}<br>
        📅 <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-CR', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}<br>
        👤 <strong>Empleado:</strong> ${sesion.nombre}
      </p>
    </div>
  `;
  modalReserva.classList.remove('hidden');
});

btnCancelarModal.addEventListener('click', function() {
  modalReserva.classList.add('hidden');
});

modalReserva.addEventListener('click', function(e) {
  if (e.target === modalReserva) modalReserva.classList.add('hidden');
});

btnConfirmar.addEventListener('click', function() {
  if (!planoSeleccionado) return;

  const hoy = fechaHoy();

  // Doble verificación de duplicado
  const reservasExistentes = obtenerReservas().filter(function(r) {
    return r.empleadoId === sesion.id &&
           r.fecha === hoy &&
           r.estado !== 'cancelada';
  });

  if (reservasExistentes.length > 0) {
    mostrarNotificacion('Ya tienes una reserva registrada para hoy.', 'warning');
    modalReserva.classList.add('hidden');
    return;
  }

  // Crear nueva reserva
  const reserva = {
    id:           generarId(),
    empleadoId:   sesion.id,
    empleadoNombre: sesion.nombre,
    empleadoCedula: sesion.cedula,
    empleadoIniciales: sesion.iniciales,
    platoId:      planoSeleccionado.id,
    platoNombre:  planoSeleccionado.nombre,
    platoEmoji:   planoSeleccionado.emoji || '🍽️',
    fecha:        hoy,
    fechaHora:    new Date().toISOString(),
    estado:       'reservada',
    fechaEntrega: null
  };

  const reservas = obtenerReservas();
  reservas.push(reserva);
  guardarReservas(reservas);

  modalReserva.classList.add('hidden');
  planoSeleccionado = null;
  reservaPanel.classList.add('hidden');
  renderizarMenu();
  renderizarMisReservas();
  mostrarNotificacion('¡Reserva confirmada! Recuerda pasar al restaurante con tu cédula.', 'success');
});

// ============================================================
// MIS RESERVAS
// ============================================================

function renderizarMisReservas() {
  const hoy = fechaHoy();
  const horario = evaluarHorario();
  const reservas = obtenerReservas().filter(function(r) {
    return r.empleadoId === sesion.id && r.fecha === hoy;
  });

  misReservasContainer.innerHTML = '';

  if (reservas.length === 0) {
    misReservasContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📅</div>
        <p class="empty-state__title">Sin reservas para hoy</p>
        <p class="empty-state__text">Selecciona un almuerzo del menú y realiza tu reserva entre las 8:00 y las 10:00 a. m.</p>
      </div>
    `;
    return;
  }

  reservas.forEach(function(r) {
    const badgeClass = {
      'reservada':  'badge--reserved',
      'pendiente':  'badge--pending',
      'entregada':  'badge--done',
      'cancelada':  'badge--cancel'
    }[r.estado] || 'badge--pending';

    const badgeLabel = {
      'reservada':  '📘 Reservada',
      'pendiente':  '⏳ Pendiente',
      'entregada':  '✅ Entregada',
      'cancelada':  '❌ Cancelada'
    }[r.estado] || r.estado;

    const puedeModificar = r.estado === 'reservada' && horario.puedeCancelar;

    const item = document.createElement('div');
    item.className = 'reservation-item';
    item.setAttribute('role', 'article');
    item.setAttribute('aria-label', `Reserva: ${r.platoNombre}`);
    item.innerHTML = `
      <div style="font-size: 28px; flex-shrink:0;" aria-hidden="true">${r.platoEmoji}</div>
      <div class="reservation-item__info">
        <p class="reservation-item__meal">${r.platoNombre}</p>
        <p class="reservation-item__date">
          ${new Date(r.fechaHora).toLocaleTimeString('es-CR', {hour:'2-digit', minute:'2-digit'})} —
          ${r.fechaEntrega ? '🎉 Recogida: ' + formatearFecha(r.fechaEntrega) : 'Pendiente de recogida'}
        </p>
      </div>
      <div class="reservation-item__info" style="text-align:right; flex:0;">
        <span class="badge ${badgeClass}" aria-label="Estado: ${badgeLabel}">${badgeLabel}</span>
      </div>
      <div class="reservation-item__actions">
        ${puedeModificar ? `
          <button
            class="btn btn--danger btn--sm"
            data-action="cancelar"
            data-id="${r.id}"
            aria-label="Cancelar reserva de ${r.platoNombre}"
          >
            ❌ Cancelar
          </button>
        ` : ''}
        ${r.estado === 'reservada' ? `
          <a href="qr.html" class="btn btn--primary btn--sm" aria-label="Ir a confirmar recogida">
            📱 Recoger
          </a>
        ` : ''}
      </div>
    `;

    misReservasContainer.appendChild(item);
  });

  // Delegación de eventos para cancelar
  misReservasContainer.addEventListener('click', manejarCancelacion);
}

let yaEscuchando = false; // Evitar registrar el listener más de una vez

function manejarCancelacion(e) {
  const btnCancelar = e.target.closest('[data-action="cancelar"]');
  if (!btnCancelar) return;

  const horario = evaluarHorario();
  if (!horario.puedeCancelar) {
    mostrarNotificacion('El horario de cancelación (hasta las 10:30 a. m.) ya finalizó.', 'warning');
    return;
  }

  const id = btnCancelar.dataset.id;
  if (!confirm('¿Deseas cancelar esta reserva? Esta acción no se puede deshacer.')) return;

  const reservas = obtenerReservas();
  const idx = reservas.findIndex(function(r) { return r.id === id; });
  if (idx !== -1) {
    reservas[idx].estado = 'cancelada';
    guardarReservas(reservas);
    renderizarMisReservas();
    mostrarNotificacion('Reserva cancelada correctamente.', 'success');
  }
}

// ============================================================
// NOTIFICACIONES TOAST
// ============================================================

let toastTimeout = null;

/**
 * Muestra un mensaje de notificación temporal en la parte inferior de la pantalla.
 * @param {string} mensaje
 * @param {'success'|'error'|'warning'|'info'} tipo
 */
function mostrarNotificacion(mensaje, tipo) {
  // Crear o reutilizar el toast
  let toast = document.getElementById('toast-notificacion');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notificacion';
    toast.style.cssText = `
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      z-index: 9999; min-width: 300px; max-width: 90vw;
      border-radius: var(--radius-lg); padding: var(--space-4) var(--space-6);
      font-size: var(--font-size-sm); font-weight: 600;
      display: flex; align-items: center; gap: var(--space-3);
      box-shadow: var(--shadow-lg); animation: slideUp 0.3s ease;
    `;
    document.body.appendChild(toast);
  }

  const iconos = { success: '✓', error: '!', warning: '!', info: 'i' };
  const colores = {
    success: 'background:#e8f0e8; color:#42654b; border:1px solid #ccdccc;',
    error:   'background:#f4e9e7; color:#8e4b46; border:1px solid #e6ceca;',
    warning: 'background:#f4eddf; color:#816333; border:1px solid #e8dcc6;',
    info:    'background:#edf1ee; color:#536b5d; border:1px solid #dce4dd;'
  };

  toast.style.cssText += colores[tipo] || colores.info;
  toast.innerHTML = `<span aria-hidden="true">${iconos[tipo] || 'i'}</span> ${mensaje}`;
  toast.removeAttribute('hidden');
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(function() {
    toast.style.animation = 'fadeIn 0.3s ease reverse';
    setTimeout(function() { toast.style.display = 'none'; }, 300);
  }, 4000);

  toast.style.display = 'flex';
}

// ============================================================
// INICIALIZACIÓN DE LA PÁGINA
// ============================================================

function inicializar() {
  configurarInterfazUsuario();
  evaluarHorario();
  renderizarProteina();
  renderizarMenu();
  renderizarMisReservas();
}

inicializar();
