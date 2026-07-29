/**
 * TORNEO DE FÚTBOL · FRANJA LIBRE · CAMPUS CONCÁ UAQ
 * Recibe los registros de torneo.html y los guarda en la hoja de cálculo.
 * Atiende dos tipos de envío: equipos (rama femenil o varonil) y árbitros.
 *
 * CÓMO INSTALARLO
 *  1. Abre la hoja de cálculo del torneo en Drive.
 *  2. Extensiones → Apps Script. Borra el contenido y pega este archivo.
 *  3. Cambia CORREO_ORGANIZA por el correo que debe recibir los avisos, o déjalo
 *     vacío ('') si prefieres que todo quede solo en la hoja, sin correo alguno.
 *  4. Ejecuta una vez la función preparar() para crear las pestañas y encabezados.
 *  5. Implementar → Nueva implementación → Aplicación web.
 *       Ejecutar como: Yo.   Quién tiene acceso: Cualquier usuario.
 *  6. Copia la URL que termina en /exec y pégala en la constante SCRIPT_URL de torneo.html.
 *
 * Si más adelante cambias el código, hay que crear una NUEVA implementación
 * (o actualizar la versión) para que la URL /exec sirva el código nuevo.
 */

var CORREO_ORGANIZA = 'eduardo.lusan@gmail.com';   // ← avisos por registro nuevo; '' para desactivarlos
var HOJA_EQUIPOS = 'Equipos';
var HOJA_INTEGRANTES = 'Integrantes';
var HOJA_ARBITROS = 'Árbitros';

var COLS_EQUIPOS = [
  'Fecha de registro', 'Rama', 'Equipo', 'Color', 'Capitanea', 'WhatsApp',
  'Días disponibles', 'Plantilla', 'Estado', 'Observaciones'
];
var COLS_INTEGRANTES = [
  'Fecha de registro', 'Rama', 'Equipo', 'Nombre', 'Adscripción', 'Rol'
];
var COLS_ARBITROS = [
  'Fecha de registro', 'Nombre', 'Adscripción', 'WhatsApp',
  'Días disponibles', 'Rama que puede arbitrar', 'Estado', 'Observaciones'
];

/** Crea las pestañas con sus encabezados. Ejecutar una sola vez. */
function preparar() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  armarHoja(libro, HOJA_EQUIPOS, COLS_EQUIPOS);
  armarHoja(libro, HOJA_INTEGRANTES, COLS_INTEGRANTES);
  armarHoja(libro, HOJA_ARBITROS, COLS_ARBITROS);
}

function armarHoja(libro, nombre, columnas) {
  var hoja = libro.getSheetByName(nombre) || libro.insertSheet(nombre);
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(columnas);
    hoja.getRange(1, 1, 1, columnas.length)
        .setFontWeight('bold')
        .setBackground('#1A3A2A')
        .setFontColor('#F5EED8');
    hoja.setFrozenRows(1);
    hoja.autoResizeColumns(1, columnas.length);
  }
  return hoja;
}

function hoja(nombre, columnas) {
  return armarHoja(SpreadsheetApp.getActiveSpreadsheet(), nombre, columnas);
}

/** Punto de entrada del formulario. */
function doPost(e) {
  var candado = LockService.getScriptLock();
  try {
    candado.waitLock(20000);
    var d = JSON.parse(e.postData.contents);

    if (d.tipo === 'arbitro') return guardarArbitro(d);
    if (!d.tipo || d.tipo === 'torneo') return guardarEquipo(d);
    return responder({ ok: false, error: 'tipo' });

  } catch (err) {
    return responder({ ok: false, error: String(err) });
  } finally {
    candado.releaseLock();
  }
}

/** Prueba rápida en el navegador: la URL /exec debe responder este texto. */
function doGet() {
  return ContentService
    .createTextOutput('Torneo Franja Libre · registro listo (equipos y árbitros)')
    .setMimeType(ContentService.MimeType.TEXT);
}

function responder(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ===================== EQUIPOS ===================== */

function guardarEquipo(d) {
  var equipos = hoja(HOJA_EQUIPOS, COLS_EQUIPOS);

  // Un mismo nombre puede repetirse entre ramas, pero no dentro de la misma
  if (nombreOcupado(equipos, d.rama, d.equipo)) {
    return responder({ ok: false, error: 'duplicado' });
  }

  var sello = new Date();
  var gente = Array.isArray(d.integrantes) ? d.integrantes : [];

  equipos.appendRow([
    sello, d.rama || '', d.equipo || '', d.color || '', d.capitan || '', d.telefono || '',
    d.dias || '', d.plantilla || '', 'Registrado', ''
  ]);

  if (gente.length) {
    var integrantes = hoja(HOJA_INTEGRANTES, COLS_INTEGRANTES);
    var filas = gente.map(function (p, i) {
      return [sello, d.rama || '', d.equipo || '', p.nombre || '', p.adscripcion || '',
              (i === gente.length - 1 ? 'Relevo' : 'Titular')];
    });
    integrantes.getRange(integrantes.getLastRow() + 1, 1, filas.length, COLS_INTEGRANTES.length)
               .setValues(filas);
  }

  avisarEquipo(d, gente);
  return responder({ ok: true });
}

function nombreOcupado(hojaEquipos, rama, nombre) {
  if (!nombre) return false;
  var ultima = hojaEquipos.getLastRow();
  if (ultima < 2) return false;
  var claveRama = normalizar(rama), claveEquipo = normalizar(nombre);
  var datos = hojaEquipos.getRange(2, 2, ultima - 1, 2).getValues();   // columnas Rama y Equipo
  return datos.some(function (fila) {
    return normalizar(fila[0]) === claveRama && normalizar(fila[1]) === claveEquipo;
  });
}

function avisarEquipo(d, gente) {
  if (!CORREO_ORGANIZA) return;
  var lista = gente.map(function (p, i) {
    return (i + 1) + '. ' + p.nombre + ' — ' + p.adscripcion +
           (i === gente.length - 1 ? ' (relevo)' : '');
  }).join('\n');

  var cuerpo =
    'Nuevo equipo en el torneo de fútbol de la Franja Libre.\n\n' +
    'RAMA: ' + (d.rama || '') + '\n' +
    'EQUIPO: ' + (d.equipo || '') + '\n' +
    'Color: ' + (d.color || '—') + '\n' +
    'Capitanea: ' + (d.capitan || '') + '\n' +
    'WhatsApp: ' + (d.telefono || '') + '\n\n' +
    'PLANTILLA\n' + lista + '\n\n' +
    'Días disponibles: ' + (d.dias || '—') + '\n' +
    'Registrado: ' + (d.enviada || '') + '\n';

  MailApp.sendEmail({
    to: CORREO_ORGANIZA,
    subject: 'Torneo Franja Libre · ' + (d.rama || 'sin rama') + ' · nuevo equipo: ' + (d.equipo || 'sin nombre'),
    body: cuerpo
  });
}

/* ===================== ÁRBITROS ===================== */

function guardarArbitro(d) {
  var arbitros = hoja(HOJA_ARBITROS, COLS_ARBITROS);

  arbitros.appendRow([
    new Date(), d.nombre || '', d.adscripcion || '', d.telefono || '',
    d.dias || '', d.ramas || '', 'Anotado', ''
  ]);

  if (CORREO_ORGANIZA) {
    MailApp.sendEmail({
      to: CORREO_ORGANIZA,
      subject: 'Torneo Franja Libre · nueva persona para arbitrar: ' + (d.nombre || 'sin nombre'),
      body:
        'Alguien se anotó para arbitrar en el torneo de fútbol de la Franja Libre.\n\n' +
        'Nombre: ' + (d.nombre || '') + '\n' +
        'Adscripción: ' + (d.adscripcion || '') + '\n' +
        'WhatsApp: ' + (d.telefono || '') + '\n' +
        'Días disponibles: ' + (d.dias || '—') + '\n' +
        'Rama que puede arbitrar: ' + (d.ramas || '—') + '\n' +
        'Registrado: ' + (d.enviada || '') + '\n'
    });
  }

  return responder({ ok: true });
}

/* ===================== UTILIDAD ===================== */

function normalizar(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
