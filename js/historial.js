/**
 * historial.js — Historial y Seguimiento de Reservas
 * Lunch Go — Sistema de Reservas de Almuerzos
 *
 * Funcionalidades:
 * - Verifica acceso y determina el rol del usuario
 * - Muestra el historial completo (admin) o solo las del empleado (empleado)
 * - Permite filtrar por fecha, estado y nombre de almuerzo
 * - Respeta los permisos de cada rol (admin ve todo, empleado solo lo suyo)
 * - Muestra mensaje cuando no hay registros
 */

// ============================================================
// CONTROL DE ACCESO
// ============================================================

const sesionHist = verificarAcceso(); // null redirige al login
if (!sesionHist) throw new Error('Sin sesión');

const esAdmin = sesionHist.rol === 'administrador';

// ============================================================
// REFERENCIAS AL DOM
// ============================================================

const navBrand     = document.getElementById('nav-brand');
const navLinks     = document.getElementById('nav-links');
const navNombre    = document.getElementById('nav-nombre');
const navAvatar    = document.getElementById('nav-avatar');
const btnLogout    = document.getElementById('btn-logout');
const btnPanel     = document.getElementById('btn-volver-panel');
const btnPanelTxt  = document.getElementById('btn-panel-texto');
const histRolLabel = document.getElementById('historial-rol-label');

const filtroFecha    = document.getElementById('filtro-fecha');
const filtroEstado   = document.getElementById('filtro-estado');
const filtroAlmuerzo = document.getElementById('filtro-almuerzo');
const btnLimpiar     = document.getElementById('btn-limpiar-filtros');

const resumenResultados = document.getElementById('resumen-resultados');
const tablaContainer    = document.getElementById('tabla-container');
const tablaHistBody     = document.getElementById('tabla-historial-body');
const emptyHistorial    = document.getElementById('empty-historial');
const emptyHistTxt      = document.getElementById('empty-historial-texto');
const colEmpleado       = document.getElementById('col-empleado');

btnLogout.addEventListener('click', cerrarSesion);

// ============================================================
// CONFIGURAR INTERFAZ SEGÚN ROL
// ============================================================

function configurarInterfazHistorial() {
  navNombre.textContent = sesionHist.nombre.split(' ')[0];
  navAvatar.textContent = sesionHist.iniciales || sesionHist.nombre.slice(0,2).toUpperCase();

  if (esAdmin) {
    navBrand.href = 'administrador.html';
    btnPanel.href = 'administrador.html';
    btnPanelTxt.textContent = 'Volver al panel admin';
    histRolLabel.textContent = 'Vista completa — Todos los empleados';
    navLinks.innerHTML = `
      <a href="administrador.html" class="navbar__link">
        Panel
      </a>
      <a href="qr.html" class="navbar__link">
        Recogida
      </a>
      <a href="historial.html" class="navbar__link active" aria-current="page">
        Historial
      </a>
    `;
  } else {
    navBrand.href = 'empleado.html';
    btnPanel.href = 'empleado.html';
    btnPanelTxt.textContent = 'Volver al menú';
    histRolLabel.textContent = 'Mis reservas — ' + sesionHist.nombre;
    // Ocultar columna de empleado para empleados (solo ven sus propias reservas)
    colEmpleado.style.display = 'none';
    navLinks.innerHTML = `
      <a href="empleado.html" class="navbar__link">
        Menú
      </a>
      <a href="qr.html" class="navbar__link">
        Recogida
      </a>
      <a href="historial.html" class="navbar__link active" aria-current="page">
        Historial
      </a>
    `;
  }
}

// ============================================================
// OBTENER RESERVAS SEGÚN ROL
// ============================================================

/**
 * Retorna las reservas que el usuario actual puede ver.
 * Admin: todas. Empleado: solo las suyas.
 * @returns {Array}
 */
function obtenerReservasVisibles() {
  const todas = obtenerReservas();
  if (esAdmin) return todas;
  return todas.filter(function(r) { return r.empleadoId === sesionHist.id; });
}

// ============================================================
// APLICAR FILTROS
// ============================================================

/**
 * Aplica los filtros seleccionados sobre las reservas visibles.
 * @returns {Array} Reservas filtradas
 */
function aplicarFiltros() {
  let reservas = obtenerReservasVisibles();

  const fecha    = filtroFecha.value;
  const estado   = filtroEstado.value;
  const almuerzo = filtroAlmuerzo.value.trim().toLowerCase();

  if (fecha) {
    reservas = reservas.filter(function(r) { return r.fecha === fecha; });
  }

  if (estado) {
    reservas = reservas.filter(function(r) { return r.estado === estado; });
  }

  if (almuerzo) {
    reservas = reservas.filter(function(r) {
      return r.platoNombre.toLowerCase().includes(almuerzo);
    });
  }

  // Ordenar: más recientes primero
  return reservas.sort(function(a, b) { return new Date(b.fechaHora) - new Date(a.fechaHora); });
}

// ============================================================
// RENDERIZAR TABLA
// ============================================================

function renderizarHistorial() {
  const reservas = aplicarFiltros();
  tablaHistBody.innerHTML = '';

  // Actualizar resumen
  const total = reservas.length;
  resumenResultados.textContent = total === 0
    ? 'Sin resultados'
    : `Mostrando ${total} reserva${total !== 1 ? 's' : ''}`;

  if (reservas.length === 0) {
    emptyHistorial.classList.remove('hidden');
    tablaContainer.style.display = 'none';

    const tieneReservas = obtenerReservasVisibles().length > 0;
    emptyHistTxt.textContent = tieneReservas
      ? 'No hay reservas que coincidan con los filtros. Prueba con otros criterios o limpia los filtros.'
      : esAdmin
        ? 'Aún no se han registrado reservas en el sistema. Las reservas aparecerán aquí una vez que los empleados las realicen.'
        : 'Aún no tienes reservas registradas. Ve al menú del día y realiza tu primera reserva.';
    return;
  }

  emptyHistorial.classList.add('hidden');
  tablaContainer.style.display = '';

  reservas.forEach(function(r) {
    const badgeClass = {
      'reservada':  'badge--reserved',
      'entregada':  'badge--done',
      'cancelada':  'badge--cancel',
      'pendiente':  'badge--pending'
    }[r.estado] || 'badge--pending';

    const badgeLabel = {
      'reservada':  '📘 Reservada',
      'entregada':  '✅ Entregada',
      'cancelada':  '❌ Cancelada',
      'pendiente':  '⏳ Pendiente'
    }[r.estado] || r.estado;

    const fechaFormateada = r.fecha
      ? new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-CR', {
          weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
        })
      : '—';

    const horaReserva = r.fechaHora
      ? new Date(r.fechaHora).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })
      : '—';

    const horaEntrega = r.fechaEntrega
      ? new Date(r.fechaEntrega).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })
      : '—';

    const tr = document.createElement('tr');

    // La columna de empleado solo aparece para admin
    const celdaEmpleado = esAdmin
      ? `<td>
           <div style="display:flex; align-items:center; gap: var(--space-2);">
             <div class="navbar__avatar" style="width:26px; height:26px; font-size:11px;" aria-hidden="true">
               ${escapeHTML(r.empleadoIniciales || r.empleadoNombre.slice(0,2).toUpperCase())}
             </div>
             <div>
               <div style="font-weight:600; font-size: var(--font-size-sm);">${escapeHTML(r.empleadoNombre)}</div>
               <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); font-family:monospace;">
                 ${escapeHTML(ocultarCedula(r.empleadoCedula))}
               </div>
             </div>
           </div>
         </td>`
      : '';

    tr.innerHTML = `
      <td style="font-size: var(--font-size-sm); white-space: nowrap;">${fechaFormateada}</td>
      ${celdaEmpleado}
      <td>
        <div style="display:flex; align-items:center; gap: var(--space-2);">
          <span aria-hidden="true">${r.platoEmoji || '🍽️'}</span>
          <span style="font-weight:500;">${escapeHTML(r.platoNombre)}</span>
        </div>
      </td>
      <td>
        <span class="badge ${badgeClass}" aria-label="Estado: ${badgeLabel}">${badgeLabel}</span>
      </td>
      <td style="font-size: var(--font-size-sm); color: var(--color-text-muted); white-space:nowrap;">${horaReserva}</td>
      <td style="font-size: var(--font-size-sm); color: var(--color-text-muted); white-space:nowrap;">${horaEntrega}</td>
    `;

    tablaHistBody.appendChild(tr);
  });
}

// ============================================================
// EVENTOS DE FILTROS
// ============================================================

filtroFecha.addEventListener('change', renderizarHistorial);
filtroEstado.addEventListener('change', renderizarHistorial);
filtroAlmuerzo.addEventListener('input', function() {
  // Debounce simple para no renderizar en cada tecla
  clearTimeout(filtroAlmuerzo._timer);
  filtroAlmuerzo._timer = setTimeout(renderizarHistorial, 300);
});

btnLimpiar.addEventListener('click', function() {
  filtroFecha.value    = '';
  filtroEstado.value   = '';
  filtroAlmuerzo.value = '';
  renderizarHistorial();
});

// ============================================================
// UTILIDAD — Escape HTML
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

// ============================================================
// INICIALIZACIÓN
// ============================================================

function inicializar() {
  configurarInterfazHistorial();
  // Poner la fecha de hoy por defecto en el filtro de fecha
  filtroFecha.value = fechaHoy();
  renderizarHistorial();
}

inicializar();
