/**
 * TORNEO DE FÚTBOL MIXTO · FRANJA LIBRE · CAMPUS CONCÁ UAQ
 * Recibe los registros de torneo.html y los guarda en la hoja de cálculo.
 *
 * CÓMO INSTALARLO
 *  1. Crea una hoja de cálculo nueva en Drive: "Torneo Franja Libre 2026-2".
 *  2. Extensiones → Apps Script. Borra el contenido y pega este archivo.
 *  3. Cambia CORREO_ORGANIZA por el correo que debe recibir los avisos.
 *  4. Ejecuta una vez la función preparar() para crear las pestañas y encabezados.
 *  5. Implementar → Nueva implementación → Aplicación web.
 *       Ejecutar como: Yo.   Quién tiene acceso: Cualquier usuario.
 *  6. Copia la URL que termina en /exec y pégala en la constante SCRIPT_URL de torneo.html.
 *
 * Si más adelante cambias el código, hay que crear una NUEVA implementación
 * (o actualizar la versión) para que la URL /exec sirva el código nuevo.
 */

var CORREO_ORGANIZA = 'eduardo.lusan@gmail.com';   // ← a quién le llegan los avisos
var HOJA_EQUIPOS = 'Equipos';
var HOJA_INTEGRANTES = 'Integrantes';

var COLS_EQUIPOS = [
  'Fecha de registro', 'Equipo', 'Color', 'Capitanea', 'WhatsApp', 'Correo',
  'Días disponibles', 'Mujeres', 'Hombres', 'Plantilla', 'Estado', 'Observaciones'
];
var COLS_INTEGRANTES = [
  'Fecha de registro', 'Equipo', 'Nombre', 'Género', 'Adscripción'
];

/** Crea las pestañas con sus encabezados. Ejecutar una sola vez. */
function preparar() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  armarHoja(libro, HOJA_EQUIPOS, COLS_EQUIPOS);
  armarHoja(libro, HOJA_INTEGRANTES, COLS_INTEGRANTES);
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
    if (d.tipo && d.tipo !== 'torneo') return responder({ ok: false, error: 'tipo' });

    var equipos = hoja(HOJA_EQUIPOS, COLS_EQUIPOS);

    // Un solo nombre de equipo por torneo
    if (nombreOcupado(equipos, d.equipo)) {
      return responder({ ok: false, error: 'duplicado' });
    }

    var sello = new Date();
    var gente = Array.isArray(d.integrantes) ? d.integrantes : [];
    var mujeres = gente.filter(function (p) { return p.genero === 'Mujer'; }).length;
    var hombres = gente.filter(function (p) { return p.genero === 'Hombre'; }).length;

    equipos.appendRow([
      sello, d.equipo || '', d.color || '', d.capitan || '', d.telefono || '', d.correo || '',
      d.dias || '', mujeres, hombres, d.plantilla || '', 'Registrado', ''
    ]);

    if (gente.length) {
      var integrantes = hoja(HOJA_INTEGRANTES, COLS_INTEGRANTES);
      var filas = gente.map(function (p) {
        return [sello, d.equipo || '', p.nombre || '', p.genero || '', p.adscripcion || ''];
      });
      integrantes.getRange(integrantes.getLastRow() + 1, 1, filas.length, COLS_INTEGRANTES.length)
                 .setValues(filas);
    }

    avisar(d, gente);
    acusar(d, gente);

    return responder({ ok: true });
  } catch (err) {
    return responder({ ok: false, error: String(err) });
  } finally {
    candado.releaseLock();
  }
}

/** Prueba rápida en el navegador: la URL /exec debe responder "torneo listo". */
function doGet() {
  return ContentService
    .createTextOutput('Torneo Franja Libre · registro listo')
    .setMimeType(ContentService.MimeType.TEXT);
}

function responder(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}

function nombreOcupado(hojaEquipos, nombre) {
  if (!nombre) return false;
  var ultima = hojaEquipos.getLastRow();
  if (ultima < 2) return false;
  var clave = normalizar(nombre);
  var existentes = hojaEquipos.getRange(2, 2, ultima - 1, 1).getValues();
  return existentes.some(function (fila) { return normalizar(fila[0]) === clave; });
}

function normalizar(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Aviso a quien organiza el torneo. */
function avisar(d, gente) {
  if (!CORREO_ORGANIZA) return;
  var lista = gente.map(function (p, i) {
    return (i + 1) + '. ' + p.nombre + ' — ' + p.genero + ' — ' + p.adscripcion;
  }).join('\n');

  var cuerpo =
    'Nuevo equipo en el torneo de fútbol mixto de la Franja Libre.\n\n' +
    'EQUIPO: ' + (d.equipo || '') + '\n' +
    'Color: ' + (d.color || '—') + '\n' +
    'Capitanea: ' + (d.capitan || '') + '\n' +
    'Contacto: ' + (d.correo || '') + ' · ' + (d.telefono || '') + '\n\n' +
    'PLANTILLA\n' + lista + '\n\n' +
    'Días disponibles: ' + (d.dias || '—') + '\n' +
    'Registrado: ' + (d.enviada || '') + '\n';

  MailApp.sendEmail({
    to: CORREO_ORGANIZA,
    subject: 'Torneo Franja Libre · nuevo equipo: ' + (d.equipo || 'sin nombre'),
    body: cuerpo
  });
}

/** Acuse a quien capitanea. */
function acusar(d, gente) {
  if (!d.correo || d.correo.indexOf('@') < 1) return;
  var lista = gente.map(function (p) { return '· ' + p.nombre + ' (' + p.adscripcion + ')'; }).join('\n');

  var cuerpo =
    'Hola, ' + (d.capitan || '') + '.\n\n' +
    'El equipo "' + (d.equipo || '') + '" quedó registrado en el torneo de fútbol mixto ' +
    'de la Franja Libre, Campus Concá.\n\n' +
    'Plantilla registrada:\n' + lista + '\n\n' +
    'Días disponibles: ' + (d.dias || '—') + '\n' +
    'Horario de los partidos: 11:00 a 11:30 h\n\n' +
    'Al cerrar el registro se arman el calendario y el sistema de competencia con todos los ' +
    'equipos inscritos. El rol de partidos llega a este correo y al WhatsApp que dejaste, y se ' +
    'publica en la página de la Franja Libre.\n\n' +
    'Si algo cambia en la plantilla, responde este mensaje.\n\n' +
    'Franja Libre · Campus Concá · UAQ';

  MailApp.sendEmail({
    to: d.correo,
    subject: 'Registro confirmado · ' + (d.equipo || 'tu equipo') + ' · Torneo Franja Libre',
    body: cuerpo
  });
}
