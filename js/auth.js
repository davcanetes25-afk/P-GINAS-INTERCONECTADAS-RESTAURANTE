/**
 * auth.js — Autenticación y datos de demostración
 * Lunch Go — Sistema de Reservas de Almuerzos
 *
 * AVISO ACADÉMICO: Este módulo utiliza LocalStorage para simular
 * autenticación. No almacena contraseñas reales de forma segura.
 * En producción, la autenticación debe realizarse en un servidor.
 */

// ============================================================
// USUARIOS DE DEMOSTRACIÓN
// ============================================================

/**
 * Lista de usuarios de prueba precargados.
 * La contraseña se almacena en texto plano solo para demostración académica.
 */
const DEMO_USERS = [
  {
    id: 'emp001',
    nombre: 'Carlos Rodríguez',
    email: 'empleado@lunchgo.com',
    password: 'Empleado123',
    cedula: '1-0123-4567',
    rol: 'empleado',
    iniciales: 'CR'
  },
  {
    id: 'emp002',
    nombre: 'María González',
    email: 'maria@lunchgo.com',
    password: 'Empleado123',
    cedula: '2-0234-5678',
    rol: 'empleado',
    iniciales: 'MG'
  },
  {
    id: 'emp003',
    nombre: 'José Hernández',
    email: 'jose@lunchgo.com',
    password: 'Empleado123',
    cedula: '3-0345-6789',
    rol: 'empleado',
    iniciales: 'JH'
  },
  {
    id: 'adm001',
    nombre: 'Administrador',
    email: 'admin@lunchgo.com',
    password: 'Admin123',
    cedula: '9-0000-0001',
    rol: 'administrador',
    iniciales: 'AD'
  }
];

// ============================================================
// MENÚ INICIAL DE DEMOSTRACIÓN
// ============================================================

const MENU_DEMO = [
  {
    id: 'menu001',
    nombre: 'Casado Tradicional',
    descripcion: 'Arroz, frijoles, ensalada fresca y proteína del día con tortillas caseras.',
    acompañamientos: ['Arroz blanco', 'Frijoles molidos', 'Ensalada', 'Tortillas'],
    emoji: '🍛',
    activo: true,
    categoria: 'Casado'
  },
  {
    id: 'menu002',
    nombre: 'Sopa del Chef',
    descripcion: 'Sopa de vegetales frescos con proteína, acompañada de arroz y pan artesanal.',
    acompañamientos: ['Arroz blanco', 'Pan artesanal', 'Fruta de temporada'],
    emoji: '🍲',
    activo: true,
    categoria: 'Sopa'
  },
  {
    id: 'menu003',
    nombre: 'Plato Vegetariano',
    descripcion: 'Selección de vegetales salteados, granos y proteína vegetal con arroz integral.',
    acompañamientos: ['Arroz integral', 'Vegetales salteados', 'Frijoles negros'],
    emoji: '🥗',
    activo: true,
    categoria: 'Vegetariano'
  },
  {
    id: 'menu004',
    nombre: 'Pasta al Gusto',
    descripcion: 'Pasta fresca con salsa a elección: napolitana o boloñesa, con pan de ajo.',
    acompañamientos: ['Pan de ajo', 'Ensalada verde', 'Queso rallado'],
    emoji: '🍝',
    activo: true,
    categoria: 'Pasta'
  }
];

// ============================================================
// FUNCIONES DE INICIALIZACIÓN
// ============================================================

/**
 * Inicializa los datos de demostración en LocalStorage.
 * Solo agrega los datos si no existen; no sobrescribe datos existentes.
 */
function inicializarDatos() {
  // Usuarios: no sobrescribir si ya existen
  if (!localStorage.getItem('lg_usuarios')) {
    localStorage.setItem('lg_usuarios', JSON.stringify(DEMO_USERS));
  }

  // Menú: no sobrescribir si ya existe
  if (!localStorage.getItem('lg_menu')) {
    localStorage.setItem('lg_menu', JSON.stringify(MENU_DEMO));
  }

  // Reservas: inicializar array vacío si no existe
  if (!localStorage.getItem('lg_reservas')) {
    localStorage.setItem('lg_reservas', JSON.stringify([]));
  }

  // Proteína del día: valor por defecto
  if (!localStorage.getItem('lg_proteina_dia')) {
    localStorage.setItem('lg_proteina_dia', JSON.stringify({
      nombre: 'Pollo asado',
      descripcion: 'Pechuga de pollo marinada al horno con hierbas frescas',
      emoji: '🍗'
    }));
  }
}

// ============================================================
// AUTENTICACIÓN
// ============================================================

/**
 * Intenta autenticar al usuario con las credenciales provistas.
 * @param {string} email - Correo o usuario
 * @param {string} password - Contraseña
 * @returns {object|null} - Objeto de usuario o null si falla
 */
function autenticar(email, password) {
  const usuarios = JSON.parse(localStorage.getItem('lg_usuarios') || '[]');
  const usuario = usuarios.find(
    u => u.email.toLowerCase() === email.toLowerCase().trim() &&
         u.password === password
  );
  return usuario || null;
}

/**
 * Guarda la sesión actual en LocalStorage.
 * @param {object} usuario - Objeto de usuario autenticado
 */
function guardarSesion(usuario) {
  // Guardamos copia sin contraseña
  const sesion = { ...usuario };
  delete sesion.password;
  localStorage.setItem('lg_sesion', JSON.stringify(sesion));
}

/**
 * Obtiene el usuario actualmente autenticado.
 * @returns {object|null}
 */
function obtenerSesion() {
  const sesion = localStorage.getItem('lg_sesion');
  return sesion ? JSON.parse(sesion) : null;
}

/**
 * Cierra la sesión y redirige al login.
 */
function cerrarSesion() {
  localStorage.removeItem('lg_sesion');
  window.location.href = 'index.html';
}

/**
 * Verifica que el usuario esté autenticado y tenga el rol correcto.
 * Si no, redirige al login.
 * @param {string} rolRequerido - 'empleado' | 'administrador' | null (cualquiera)
 */
function verificarAcceso(rolRequerido = null) {
  const sesion = obtenerSesion();
  if (!sesion) {
    window.location.href = 'index.html';
    return null;
  }
  if (rolRequerido && sesion.rol !== rolRequerido) {
    // Redirigir según rol real
    if (sesion.rol === 'administrador') {
      window.location.href = 'administrador.html';
    } else {
      window.location.href = 'empleado.html';
    }
    return null;
  }
  return sesion;
}

// ============================================================
// HELPERS DE DATOS
// ============================================================

/** @returns {Array} Lista de usuarios */
function obtenerUsuarios() {
  return JSON.parse(localStorage.getItem('lg_usuarios') || '[]');
}

/** @returns {Array} Lista de platos del menú */
function obtenerMenu() {
  return JSON.parse(localStorage.getItem('lg_menu') || '[]');
}

/**
 * Guarda los platos del menú.
 * @param {Array} menu
 */
function guardarMenu(menu) {
  localStorage.setItem('lg_menu', JSON.stringify(menu));
}

/** @returns {Array} Lista de reservas */
function obtenerReservas() {
  return JSON.parse(localStorage.getItem('lg_reservas') || '[]');
}

/**
 * Guarda la lista de reservas.
 * @param {Array} reservas
 */
function guardarReservas(reservas) {
  localStorage.setItem('lg_reservas', JSON.stringify(reservas));
}

/** @returns {object} Proteína del día */
function obtenerProteina() {
  return JSON.parse(localStorage.getItem('lg_proteina_dia') || '{}');
}

/**
 * Guarda la proteína del día.
 * @param {object} proteina
 */
function guardarProteina(proteina) {
  localStorage.setItem('lg_proteina_dia', JSON.stringify(proteina));
}

// ============================================================
// UTILIDADES DE HORARIO
// ============================================================

/**
 * Verifica si la hora actual está dentro del rango de reservas (08:00–10:00).
 * @returns {boolean}
 */
function dentroHorarioReservas() {
  const ahora = new Date();
  const horas = ahora.getHours();
  const minutos = ahora.getMinutes();
  const totalMin = horas * 60 + minutos;
  return totalMin >= 8 * 60 && totalMin < 10 * 60;
}

/**
 * Verifica si se puede cancelar/modificar una reserva (hasta las 10:30).
 * @returns {boolean}
 */
function dentroHorarioCancelacion() {
  const ahora = new Date();
  const horas = ahora.getHours();
  const minutos = ahora.getMinutes();
  const totalMin = horas * 60 + minutos;
  return totalMin < 10 * 60 + 30;
}

/**
 * Formatea una fecha ISO a string legible en español.
 * @param {string} isoString
 * @returns {string}
 */
function formatearFecha(isoString) {
  if (!isoString) return '—';
  const fecha = new Date(isoString);
  return fecha.toLocaleString('es-CR', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

/**
 * Retorna la fecha actual en formato YYYY-MM-DD.
 * @returns {string}
 */
function fechaHoy() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Genera un ID único para una reserva.
 * @returns {string}
 */
function generarId() {
  return 'res_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
}

/**
 * Oculta parcialmente una cédula para mostrar en tablas.
 * Ej: "1-0123-4567" → "1-****-4567"
 * @param {string} cedula
 * @returns {string}
 */
function ocultarCedula(cedula) {
  if (!cedula) return '—';
  const partes = cedula.split('-');
  if (partes.length === 3) {
    return `${partes[0]}-****-${partes[2]}`;
  }
  // Si no tiene guiones, ocultar parte del medio
  const len = cedula.length;
  if (len > 4) {
    return cedula.slice(0, 2) + '****' + cedula.slice(-2);
  }
  return '****';
}

// ============================================================
// INICIALIZACIÓN AUTOMÁTICA AL CARGAR EL MÓDULO
// ============================================================
inicializarDatos();
