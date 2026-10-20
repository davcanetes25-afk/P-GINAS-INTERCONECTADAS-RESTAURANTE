/**
 * administrador.js — Panel Administrativo
 * Lunch Go — Sistema de Reservas de Almuerzos
 *
 * Funcionalidades:
 * - Verifica acceso de administrador
 * - Muestra estadísticas del día (total, entregadas, pendientes, canceladas)
 * - Permite crear, editar y desactivar platos del menú
 * - Permite configurar la proteína del día
 * - Muestra tabla de control de entregas con datos del día
 * - Oculta parcialmente las cédulas de los empleados
 */

// ============================================================
// CONTROL DE ACCESO — Solo administradores
// ============================================================

const sesionAdmin = verificarAcceso('administrador');
if (!sesionAdmin) throw new Error('Acceso denegado');

// ============================================================
// REFERENCIAS AL DOM
// ============================================================

const navNombre    = document.getElementById('nav-nombre');
const navAvatar    = document.getElementById('nav-avatar');
const fechaHoyEl   = document.getElementById('fecha-hoy-admin');
const btnLogout    = document.getElementById('btn-logout');

// Estadísticas
const statTotal      = document.getElementById('stat-total');
const statEntregadas = document.getElementById('stat-entregadas');
const statPendientes = document.getElementById('stat-pendientes');
const statCanceladas = document.getElementById('stat-canceladas');

// Proteína
const proteinaEmojiInput  = document.getElementById('proteina-emoji-input');
const proteinaNombreInput = document.getElementById('proteina-nombre-input');
const proteinaDescInput   = document.getElementById('proteina-desc-input');
const btnGuardarProteina  = document.getElementById('btn-guardar-proteina');
const msgProteina         = document.getElementById('msg-proteina');

// Menú
const platoEditId       = document.getElementById('plato-edit-id');
const platoEmoji        = document.getElementById('plato-emoji');
const platoNombre       = document.getElementById('plato-nombre');
const platoDesc         = document.getElementById('plato-desc');
const platoAcomp        = document.getElementById('plato-acomp');
const platoCategoria    = document.getElementById('plato-categoria');
const platoNombreError  = document.getElementById('plato-nombre-error');
const platoDescError    = document.getElementById('plato-desc-error');
const btnGuardarPlato   = document.getElementById('btn-guardar-plato');
const btnGuardarText    = document.getElementById('btn-guardar-text');
const btnNuevoPlato     = document.getElementById('btn-nuevo-plato');
const btnCancelarEdicion = document.getElementById('btn-cancelar-edicion');
const msgMenu           = document.getElementById('msg-menu');
const menuFormTitle     = document.getElementById('menu-form-title-text');
const tablaMenuBody     = document.getElementById('tabla-menu-body');

// Entregas
const tablaEntregasBody = document.getElementById('tabla-entregas-body');
const emptyEntregas     = document.getElementById('empty-entregas');

btnLogout.addEventListener('click', cerrarSesion);

// ============================================================
// CONFIGURAR INTERFAZ
// ============================================================

function configurarInterfaz() {
  navNombre.textContent = sesionAdmin.nombre.split(' ')[0];
  navAvatar.textContent = sesionAdmin.iniciales || 'AD';

  const hora = new Date().getHours();
  let saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  document.getElementById('admin-saludo').textContent = saludo + ', ' + sesionAdmin.nombre.split(' ')[0];

  fechaHoyEl.textContent = new Date().toLocaleDateString('es-CR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

// ============================================================
// ESTADÍSTICAS DEL DÍA
// ============================================================

function actualizarEstadisticas() {
  const hoy = fechaHoy();
  const reservas = obtenerReservas().filter(function(r) { return r.fecha === hoy; });

  statTotal.textContent      = reservas.length;
  statEntregadas.textContent = reservas.filter(function(r) { return r.estado === 'entregada'; }).length;
  statPendientes.textContent = reservas.filter(function(r) { return r.estado === 'reservada'; }).length;
  statCanceladas.textContent = reservas.filter(function(r) { return r.estado === 'cancelada'; }).length;
}

// ============================================================
// PROTEÍNA DEL DÍA
// ============================================================

function cargarProteina() {
  const proteina = obtenerProteina();
  proteinaEmojiInput.value  = proteina.emoji || '🍗';
  proteinaNombreInput.value = proteina.nombre || '';
  proteinaDescInput.value   = proteina.descripcion || '';
}

btnGuardarProteina.addEventListener('click', function() {
  const nombre = proteinaNombreInput.value.trim();
  if (!nombre) {
    mostrarMensaje(msgProteina, 'El nombre de la proteína es obligatorio.', 'error');
    return;
  }

  guardarProteina({
    emoji:       proteinaEmojiInput.value.trim() || '🍗',
    nombre:      nombre,
    descripcion: proteinaDescInput.value.trim()
  });

  mostrarMensaje(msgProteina, '✅ Proteína del día guardada correctamente.', 'success');
});

// ============================================================
// GESTIÓN DEL MENÚ
// ============================================================

function renderizarMenuAdmin() {
  const menu = obtenerMenu();
  tablaMenuBody.innerHTML = '';

  if (menu.length === 0) {
    tablaMenuBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center" style="padding: var(--space-8); color: var(--color-text-muted);">
          No hay platos configurados.
        </td>
      </tr>
    `;
    return;
  }

  menu.forEach(function(plato) {
    const acompStr = (plato.acompañamientos || []).join(', ') || '—';
    const estadoHtml = plato.activo
      ? '<span class="badge badge--done">✅ Activo</span>'
      : '<span class="badge badge--cancel">❌ Inactivo</span>';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="display:flex; align-items:center; gap: var(--space-3);">
          <span style="font-size:20px;" aria-hidden="true">${plato.emoji || '🍽️'}</span>
          <div>
            <div style="font-weight:600;">${escapeHTML(plato.nombre)}</div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
              ${escapeHTML(plato.descripcion.slice(0, 60))}${plato.descripcion.length > 60 ? '…' : ''}
            </div>
          </div>
        </div>
      </td>
      <td>${escapeHTML(plato.categoria || 'Almuerzo')}</td>
      <td style="font-size: var(--font-size-xs); color: var(--color-text-muted); max-width: 200px;">
        ${escapeHTML(acompStr)}
      </td>
      <td>${estadoHtml}</td>
      <td>
        <div style="display:flex; gap: var(--space-2); flex-wrap:wrap;">
          <button
            class="btn btn--secondary btn--sm"
            data-action="editar"
            data-id="${plato.id}"
            aria-label="Editar plato ${escapeHTML(plato.nombre)}"
          >
            ✏️ Editar
          </button>
          <button
            class="btn btn--ghost btn--sm"
            data-action="toggle"
            data-id="${plato.id}"
            aria-label="${plato.activo ? 'Desactivar' : 'Activar'} plato ${escapeHTML(plato.nombre)}"
          >
            ${plato.activo ? '🚫 Desactivar' : '✅ Activar'}
          </button>
        </div>
      </td>
    `;
    tablaMenuBody.appendChild(tr);
  });

  // Delegación de eventos
  tablaMenuBody.onclick = manejarAccionesMenu;
}

function manejarAccionesMenu(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  const accion = btn.dataset.action;

  if (accion === 'editar') {
    const plato = obtenerMenu().find(function(p) { return p.id === id; });
    if (plato) cargarPlatoEnFormulario(plato);
  }

  if (accion === 'toggle') {
    const menu = obtenerMenu();
    const idx  = menu.findIndex(function(p) { return p.id === id; });
    if (idx !== -1) {
      menu[idx].activo = !menu[idx].activo;
      guardarMenu(menu);
      renderizarMenuAdmin();
    }
  }
}

function cargarPlatoEnFormulario(plato) {
  platoEditId.value      = plato.id;
  platoEmoji.value       = plato.emoji || '';
  platoNombre.value      = plato.nombre;
  platoDesc.value        = plato.descripcion;
  platoAcomp.value       = (plato.acompañamientos || []).join(', ');
  platoCategoria.value   = plato.categoria || 'Casado';

  menuFormTitle.textContent    = 'Editar plato';
  btnGuardarText.textContent   = 'Guardar cambios';
  btnCancelarEdicion.classList.remove('hidden');

  // Scroll al formulario
  document.getElementById('menu-admin-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function limpiarFormularioPlato() {
  platoEditId.value    = '';
  platoEmoji.value     = '';
  platoNombre.value    = '';
  platoDesc.value      = '';
  platoAcomp.value     = '';
  platoCategoria.value = 'Casado';

  menuFormTitle.textContent  = 'Agregar plato al menú';
  btnGuardarText.textContent = 'Agregar plato';
  btnCancelarEdicion.classList.add('hidden');

  platoNombreError.classList.remove('visible');
  platoDescError.classList.remove('visible');
  platoNombre.classList.remove('error');
  platoDesc.classList.remove('error');
  msgMenu.classList.add('hidden');
}

btnNuevoPlato.addEventListener('click', limpiarFormularioPlato);
btnCancelarEdicion.addEventListener('click', limpiarFormularioPlato);

btnGuardarPlato.addEventListener('click', function() {
  // Limpiar errores
  platoNombreError.classList.remove('visible');
  platoDescError.classList.remove('visible');
  platoNombre.classList.remove('error');
  platoDesc.classList.remove('error');
  msgMenu.classList.add('hidden');

  const nombre = platoNombre.value.trim();
  const desc   = platoDesc.value.trim();

  let valido = true;

  if (!nombre) {
    platoNombreError.textContent = 'El nombre del plato es obligatorio.';
    platoNombreError.classList.add('visible');
    platoNombre.classList.add('error');
    valido = false;
  }

  if (!desc) {
    platoDescError.textContent = 'La descripción es obligatoria.';
    platoDescError.classList.add('visible');
    platoDesc.classList.add('error');
    valido = false;
  }

  if (!valido) return;

  const menu   = obtenerMenu();
  const editId = platoEditId.value;

  const acompArray = platoAcomp.value
    .split(',')
    .map(function(a) { return a.trim(); })
    .filter(function(a) { return a.length > 0; });

  if (editId) {
    // Editar existente
    const idx = menu.findIndex(function(p) { return p.id === editId; });
    if (idx !== -1) {
      menu[idx].emoji          = platoEmoji.value.trim() || '🍽️';
      menu[idx].nombre         = nombre;
      menu[idx].descripcion    = desc;
      menu[idx].acompañamientos = acompArray;
      menu[idx].categoria      = platoCategoria.value;
    }
    guardarMenu(menu);
    mostrarMensaje(msgMenu, '✅ Plato actualizado correctamente.', 'success');
  } else {
    // Nuevo plato
    const nuevoPlato = {
      id:              'menu_' + Date.now(),
      emoji:           platoEmoji.value.trim() || '🍽️',
      nombre:          nombre,
      descripcion:     desc,
      acompañamientos: acompArray,
      categoria:       platoCategoria.value,
      activo:          true
    };
    menu.push(nuevoPlato);
    guardarMenu(menu);
    mostrarMensaje(msgMenu, '✅ Plato agregado al menú correctamente.', 'success');
    limpiarFormularioPlato();
  }

  renderizarMenuAdmin();
});

// ============================================================
// CONTROL DE ENTREGAS
// ============================================================

function renderizarEntregas() {
  const hoy = fechaHoy();
  const reservas = obtenerReservas()
    .filter(function(r) { return r.fecha === hoy; })
    .sort(function(a, b) { return new Date(b.fechaHora) - new Date(a.fechaHora); });

  tablaEntregasBody.innerHTML = '';

  if (reservas.length === 0) {
    emptyEntregas.classList.remove('hidden');
    document.querySelector('#tabla-entregas').style.display = 'none';
    return;
  }

  emptyEntregas.classList.add('hidden');
  document.querySelector('#tabla-entregas').style.display = '';

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

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="display:flex; align-items:center; gap: var(--space-3);">
          <div class="navbar__avatar" style="width:30px; height:30px; font-size:12px;" aria-hidden="true">
            ${escapeHTML(r.empleadoIniciales || r.empleadoNombre.slice(0,2).toUpperCase())}
          </div>
          <span style="font-weight:600;">${escapeHTML(r.empleadoNombre)}</span>
        </div>
      </td>
      <td style="font-family: monospace; font-size: var(--font-size-sm);">
        ${escapeHTML(ocultarCedula(r.empleadoCedula))}
      </td>
      <td>
        <div style="display:flex; align-items:center; gap: var(--space-2);">
          <span aria-hidden="true">${r.platoEmoji || '🍽️'}</span>
          <span>${escapeHTML(r.platoNombre)}</span>
        </div>
      </td>
      <td style="font-size: var(--font-size-sm); color: var(--color-text-muted);">
        ${r.fechaHora ? new Date(r.fechaHora).toLocaleTimeString('es-CR', {hour:'2-digit', minute:'2-digit'}) : '—'}
      </td>
      <td style="font-size: var(--font-size-sm); color: var(--color-text-muted);">
        ${r.fechaEntrega ? new Date(r.fechaEntrega).toLocaleTimeString('es-CR', {hour:'2-digit', minute:'2-digit'}) : '—'}
      </td>
      <td>
        <span class="badge ${badgeClass}" aria-label="Estado: ${badgeLabel}">${badgeLabel}</span>
      </td>
    `;
    tablaEntregasBody.appendChild(tr);
  });
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Muestra un mensaje de éxito o error en un contenedor.
 * @param {HTMLElement} container
 * @param {string} texto
 * @param {'success'|'error'|'warning'|'info'} tipo
 */
function mostrarMensaje(container, texto, tipo) {
  container.className = 'alert alert--' + tipo + ' mt-4';
  container.innerHTML = `
    <span class="alert-icon" aria-hidden="true">
      ${tipo === 'success' ? '✅' : tipo === 'error' ? '❌' : 'ℹ️'}
    </span>
    ${texto}
  `;
  container.classList.remove('hidden');

  setTimeout(function() { container.classList.add('hidden'); }, 4000);
}

/** Escapa HTML para prevenir XSS */
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
  configurarInterfaz();
  cargarProteina();
  actualizarEstadisticas();
  renderizarMenuAdmin();
  renderizarEntregas();

  // Actualizar estadísticas cada 30 segundos (por si otro tab confirma entrega)
  setInterval(function() {
    actualizarEstadisticas();
    renderizarEntregas();
  }, 30000);
}

inicializar();
