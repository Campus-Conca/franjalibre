/**
 * Inscripción al rally «El soplo de Ehécatl»
 * Posada navideña 2026 · Campus Concá (UAQ)
 *
 * Recibe los registros de la página (doPost), cuenta inscritos (doGet)
 * y, desde el menú «Posada» de la hoja, arma los equipos mixtos,
 * la lista por nombre para repartir paliacates y los mensajes para capitanes.
 *
 * Contrato con la página (no cambiar un lado sin el otro):
 *   POST cuerpo JSON (text/plain): {accion:"inscribir", nombre, adscripcion, semestre, grupo,
 *        area, sexo, whatsapp, celular, plataforma, ajuste, detalle, anterior, sitio, version}
 *        (anterior = WhatsApp con el que se registró antes, si está corrigiendo sus datos)
 *   → {ok:true, estado:"nuevo"|"actualizado", total} | {ok:false, error:"cerrado"|"datos"|"servidor", mensaje}
 *   GET ?accion=conteo → {ok:true, total, abierto, cierre}
 */

const VERSION = '1.0';
const H = { INS: 'Inscripciones', CFG: 'Config', EQ: 'Equipos', NOM: 'Por nombre', CAP: 'Capitanes', RES: 'Resumen' };
const COLS = ['Fecha', 'Nombre', 'Adscripción', 'Semestre', 'Grupo', 'Área', 'Sexo', 'WhatsApp',
  'Celular para el equipo', 'Plataforma', 'Ajuste para moverse', 'Detalle del ajuste',
  'Equipo (manual)', 'Notas', 'Actualizado'];
const C = {}; COLS.forEach((n, i) => { C[n] = i; });
const ADS = { Prepa: 'estudiante', PAS: 'estudiante', Agroindustrial: 'estudiante', Docente: 'adulto', Administrativo: 'adulto' };
const SEXOS = ['Mujer', 'Hombre', 'Prefiero no decir'];
const GRUPOS = ['', 'A', 'B', 'C', 'D'];
const PLATAFORMAS = ['', 'iPhone', 'Android', 'No sé'];
const ZONA = 'America/Mexico_City';

const CFG_DEF = [
  ['CIERRE', '2026-11-22 23:59', 'Fecha y hora (centro de México) en que la hoja deja de aceptar registros. Vacío = abierta.'],
  ['TAMANO_EQUIPO', 6, 'Personas por equipo.'],
  ['MIN_EQUIPOS', 5, 'El rally necesita al menos cinco sobres (A a E).'],
  ['MAX_EQUIPOS', 10, 'Hay diez sobres (A a J).'],
  ['COLORES', 'Rojo, Azul, Verde, Amarillo, Morado, Naranja, Rosa, Negro, Blanco, Café', 'Un color de paliacate por equipo, en orden.'],
  ['APP_URL', '', 'Enlace de la app que reciben los capitanes.'],
  ['MENSAJE_CAPITAN', 'Hola, {nombre}. En el rally de la posada del martes 24 vas a llevar la app de tu equipo. Antes del martes abre este enlace en tu celular y agrégalo a la pantalla de inicio: {app} . Llega con pila. Con quién te tocó lo vas a saber en el arcotecho.', 'Usa {nombre} y {app}.']
];

const HEX = {
  rojo: '#d93025', azul: '#1a56c4', verde: '#2e8b45', amarillo: '#f4c20d', morado: '#7b3fb0', naranja: '#f07c00',
  rosa: '#e85d9a', negro: '#222222', blanco: '#ffffff', 'café': '#7a4a2a', cafe: '#7a4a2a', turquesa: '#15a89a', gris: '#9e9e9e', vino: '#7b1e3a'
};

/* ───────────── Web: recibir y contar ───────────── */

function doGet(e) {
  const accion = (e && e.parameter && e.parameter.accion) || '';
  if (accion === 'conteo') {
    const cfg = leeConfig_();
    return json_({ ok: true, total: totalInscritos_(), abierto: abierta_(cfg), cierre: textoCierre_(cfg) });
  }
  return json_({ ok: true, servicio: 'inscripcion-soplo', version: VERSION });
}

function doPost(e) {
  try {
    let d = {};
    try { d = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return json_({ ok: false, error: 'datos', mensaje: 'No se entendió el envío.' }); }
    if (d.sitio) return json_({ ok: true, estado: 'nuevo', total: 0 }); // trampa para robots
    const cfg = leeConfig_();
    if (!abierta_(cfg)) return json_({ ok: false, error: 'cerrado', mensaje: 'La inscripción ya cerró.' });
    const r = valida(d);
    if (r.error) return json_({ ok: false, error: 'datos', mensaje: r.error });

    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const sh = hoja_(H.INS, COLS);
      const ahora = new Date();
      const n = sh.getLastRow() - 1;
      const filas = n > 0 ? sh.getRange(2, 1, n, COLS.length).getValues() : [];
      const busca = w => filas.findIndex(f => String(f[C['WhatsApp']]).replace(/\D/g, '').slice(-10) === w);
      const anterior = normalizaWhats(d.anterior); // si corrigió su propio número
      let idx = anterior ? busca(anterior) : -1;
      if (idx < 0) idx = busca(r.whatsapp);
      const fila = [ahora, r.nombre, r.adscripcion, r.semestre, r.grupo, r.area, r.sexo, r.whatsapp,
        r.celular, r.plataforma, r.ajuste, r.detalle, '', '', ''];
      let estado = 'nuevo';
      if (idx >= 0) {
        const vieja = filas[idx];
        fila[C['Fecha']] = vieja[C['Fecha']];
        fila[C['Equipo (manual)']] = vieja[C['Equipo (manual)']];
        fila[C['Notas']] = vieja[C['Notas']];
        fila[C['Actualizado']] = ahora;
        sh.getRange(idx + 2, 1, 1, COLS.length).setValues([fila]);
        estado = 'actualizado';
      } else {
        sh.getRange(sh.getLastRow() + 1, 1, 1, COLS.length).setValues([fila]);
      }
      return json_({ ok: true, estado: estado, total: totalInscritos_() });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'servidor', mensaje: 'Algo falló del lado de la hoja. Intenta otra vez en un momento.' });
  }
}

/** Valida y limpia un registro. Devuelve {error} o el registro limpio. La página también valida, pero aquí manda. */
function valida(d) {
  const txt = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
  const segura = s => /^[=+\-@]/.test(s) ? "'" + s : s; // evita fórmulas en la hoja
  const nombre = txt(d.nombre, 80);
  if (nombre.length < 3 || !/[a-záéíóúüñ]/i.test(nombre)) return { error: 'Escribe tu nombre y apellido.' };
  const adscripcion = txt(d.adscripcion, 30);
  if (!ADS[adscripcion]) return { error: 'Elige quién eres en el campus.' };
  const estudiante = ADS[adscripcion] === 'estudiante';
  let semestre = '', grupo = '', area = '';
  if (estudiante) {
    const m = txt(d.semestre, 4).match(/^([1-9])/);
    if (!m) return { error: 'Elige tu semestre.' };
    semestre = m[1] + '°';
    grupo = txt(d.grupo, 8).toUpperCase().replace('UNO SOLO', '');
    if (GRUPOS.indexOf(grupo) < 0) grupo = '';
  } else {
    area = segura(txt(d.area, 60));
  }
  const sexo = txt(d.sexo, 20);
  if (SEXOS.indexOf(sexo) < 0) return { error: 'Elige una opción en «Sexo».' };
  const whatsapp = normalizaWhats(d.whatsapp);
  if (!whatsapp) return { error: 'El WhatsApp debe tener 10 dígitos.' };
  const celular = txt(d.celular, 3);
  if (celular !== 'Sí' && celular !== 'No') return { error: 'Dinos si puedes llevar tu celular.' };
  let plataforma = celular === 'Sí' ? txt(d.plataforma, 10) : '';
  if (PLATAFORMAS.indexOf(plataforma) < 0) plataforma = '';
  const ajuste = txt(d.ajuste, 3);
  if (ajuste !== 'Sí' && ajuste !== 'No') return { error: 'Dinos si necesitas algún ajuste para moverte.' };
  const detalle = ajuste === 'Sí' ? segura(txt(d.detalle, 140)) : '';
  return { nombre: segura(nombre), adscripcion, semestre, grupo, area, sexo, whatsapp, celular, plataforma, ajuste, detalle };
}

/** Deja 10 dígitos (quita lada 52 o 521 si viene). Devuelve '' si no cuadra. */
function normalizaWhats(v) {
  let s = String(v == null ? '' : v).replace(/\D/g, '');
  if (s.length === 13 && s.indexOf('521') === 0) s = s.slice(3);
  else if (s.length === 12 && s.indexOf('52') === 0) s = s.slice(2);
  return s.length === 10 ? s : '';
}

/* ───────────── Menú de la hoja ───────────── */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Posada')
    .addItem('Preparar la hoja', 'prepararHoja')
    .addSeparator()
    .addItem('Armar equipos', 'armarEquipos')
    .addItem('Mensajes para capitanes', 'mensajesCapitanes')
    .addToUi();
}

function prepararHoja() {
  const ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(ZONA);
  const ins = hoja_(H.INS, COLS);
  ins.setFrozenRows(1);
  ins.getRange(1, 1, 1, COLS.length).setFontWeight('bold').setBackground('#15123a').setFontColor('#fbf4e6');
  ins.getRange(2, C['WhatsApp'] + 1, ins.getMaxRows() - 1, 1).setNumberFormat('@');
  ins.getRange(2, C['Fecha'] + 1, ins.getMaxRows() - 1, 1).setNumberFormat('dd/MM HH:mm');
  ins.getRange(2, C['Actualizado'] + 1, ins.getMaxRows() - 1, 1).setNumberFormat('dd/MM HH:mm');
  const regla = SpreadsheetApp.newDataValidation().requireNumberBetween(1, 10).setAllowInvalid(false)
    .setHelpText('Número de equipo (1 a 10) para fijar a esta persona. Vacío = lo decide el armado.').build();
  ins.getRange(2, C['Equipo (manual)'] + 1, ins.getMaxRows() - 1, 1).setDataValidation(regla);
  [150, 220, 120, 80, 60, 140, 120, 110, 110, 90, 90, 200, 110, 200, 110].forEach((w, i) => ins.setColumnWidth(i + 1, w));

  const cfg = ss.getSheetByName(H.CFG) || ss.insertSheet(H.CFG);
  cfg.getRange('B:B').setNumberFormat('@');
  if (cfg.getLastRow() === 0) cfg.getRange(1, 1, 1, 3).setValues([['Clave', 'Valor', 'Para qué sirve']]).setFontWeight('bold');
  const tiene = cfg.getLastRow() > 1 ? cfg.getRange(2, 1, cfg.getLastRow() - 1, 1).getValues().map(r => String(r[0])) : [];
  CFG_DEF.forEach(([k, v, nota]) => { if (tiene.indexOf(k) < 0) cfg.appendRow([k, String(v), nota]); });
  cfg.setColumnWidth(1, 160); cfg.setColumnWidth(2, 420); cfg.setColumnWidth(3, 380);
  SpreadsheetApp.getUi().alert('Hoja lista. Falta publicar el script como aplicación web y pegar su URL en la página.');
}

function armarEquipos() {
  const ui = SpreadsheetApp.getUi();
  const cfg = leeConfig_();
  const personas = leePersonas_();
  if (personas.length < 3) { ui.alert('Todavía no hay suficientes inscripciones para armar equipos.'); return; }
  const res = armar(personas, cfg);
  escribeEquipos_(res, cfg);
  ui.alert(`Listo: ${res.equipos.length} equipos con ${personas.length} personas.\n\n` +
    (res.alertas.length ? 'Revisa:\n• ' + res.alertas.join('\n• ') : 'Sin alertas.') +
    '\n\nPara mover a alguien, escribe su número de equipo en «Equipo (manual)» y vuelve a armar.');
}

function mensajesCapitanes() {
  const ss = SpreadsheetApp.getActive();
  const eq = ss.getSheetByName(H.EQ);
  if (!eq || eq.getLastRow() < 2) { SpreadsheetApp.getUi().alert('Primero arma los equipos.'); return; }
  const cfg = leeConfig_();
  const datos = eq.getRange(2, 1, eq.getLastRow() - 1, 10).getValues();
  const caps = datos.filter(f => f[3] === 'Capitán(a)');
  const sh = limpiaHoja_(H.CAP, ['Equipo', 'Color', 'Capitán(a)', 'WhatsApp', 'Enviar']);
  const filas = [], ligas = [];
  caps.forEach(f => {
    const nombre = String(f[2]).split(' ')[0];
    const texto = String(cfg.MENSAJE_CAPITAN || '').replace(/\{nombre\}/g, nombre).replace(/\{app\}/g, cfg.APP_URL || '(falta el enlace de la app)');
    const url = 'https://wa.me/52' + String(f[9]).replace(/\D/g, '').slice(-10) + '?text=' + encodeURIComponent(texto);
    filas.push([f[0], f[1], f[2], String(f[9]), '']);
    ligas.push([SpreadsheetApp.newRichTextValue().setText('Abrir WhatsApp').setLinkUrl(url).build()]);
  });
  if (filas.length) {
    sh.getRange(2, 4, filas.length, 1).setNumberFormat('@');
    sh.getRange(2, 1, filas.length, 5).setValues(filas);
    sh.getRange(2, 5, ligas.length, 1).setRichTextValues(ligas);
  }
  pintaColores_(sh, filas.length, 2);
  ss.setActiveSheet(sh);
  if (!cfg.APP_URL) SpreadsheetApp.getUi().alert('Ojo: APP_URL está vacío en Config; el mensaje saldrá sin enlace.');
}

/* ───────────── Armado de equipos (función pura, se prueba fuera de Google) ───────────── */

/**
 * personas: [{id, nombre, ads, tipo:'estudiante'|'adulto', grupoKey, sexo, celular:bool, plataforma, ajuste:bool, manual:number|0}]
 * cfg: {TAMANO_EQUIPO, MIN_EQUIPOS, MAX_EQUIPOS, COLORES}
 * → {equipos:[{n, color, miembros:[persona], capitan:persona|null, alertas:[]}], alertas:[]}
 */
function armar(personas, cfg) {
  const T = Number(cfg.TAMANO_EQUIPO) || 6, MIN = Number(cfg.MIN_EQUIPOS) || 5, MAX = Number(cfg.MAX_EQUIPOS) || 10;
  const colores = String(cfg.COLORES || '').split(',').map(s => s.trim()).filter(Boolean);
  const N = personas.length, alertas = [];
  let k = Math.max(MIN, Math.min(MAX, Math.round(N / T)));
  if (N < k * 3) {
    k = Math.max(1, Math.floor(N / 3));
    alertas.push(`Con ${N} personas solo salen ${k} equipos de al menos tres; el rally pide ${MIN}.`);
  }
  const maxManual = personas.reduce((m, p) => Math.max(m, p.manual || 0), 0);
  if (maxManual > k) {
    if (maxManual <= MAX) { k = maxManual; alertas.push(`Hay personas fijadas hasta el equipo ${maxManual}; se arman ${k} equipos.`); }
    else alertas.push(`«Equipo (manual)» pide el equipo ${maxManual}, pero el máximo es ${MAX}; esas personas se reparten.`);
  }
  const base = Math.floor(N / k), sobra = N % k;
  const eqs = [];
  for (let i = 0; i < k; i++) eqs.push({ n: i + 1, color: colores[i] || ('Equipo ' + (i + 1)), cap: base + (i < sobra ? 1 : 0), miembros: [] });
  const ctx = { k, adultos: personas.filter(p => p.tipo === 'adulto').length, tels: personas.filter(p => p.celular).length };
  const libre = e => e.miembros.length < e.cap;
  const delta = (e, p) => costoEquipo(e.miembros.concat([p]), ctx) - costoEquipo(e.miembros, ctx);
  const mejor = (p, candidatos) => {
    let elegido = null, mc = Infinity;
    candidatos.forEach(e => {
      const c = delta(e, p) + e.miembros.length * 0.01;
      if (c < mc - 1e-9) { mc = c; elegido = e; }
    });
    return elegido;
  };
  const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es');
  const sinAsignar = new Set(personas);
  const pon = (p, e) => { e.miembros.push(p); sinAsignar.delete(p); };

  // 1. Fijados a mano
  personas.filter(p => p.manual >= 1 && p.manual <= k).forEach(p => { p.fijo = true; pon(p, eqs[p.manual - 1]); });
  eqs.forEach(e => { if (e.miembros.length > e.cap) e.cap = e.miembros.length; });
  // 2. Docentes y personal, uno por equipo mientras alcancen
  [...sinAsignar].filter(p => p.tipo === 'adulto').sort((a, b) => (a.grupoKey || '').localeCompare(b.grupoKey || '') || porNombre(a, b))
    .forEach(p => {
      const c = eqs.filter(libre);
      const menos = Math.min(...c.map(e => e.miembros.filter(m => m.tipo === 'adulto').length));
      pon(p, mejor(p, c.filter(e => e.miembros.filter(m => m.tipo === 'adulto').length === menos)) || c[0]);
    });
  // 3. Un celular por equipo
  eqs.filter(e => !e.miembros.some(m => m.celular)).sort((a, b) => a.miembros.length - b.miembros.length).forEach(e => {
    if (!libre(e)) return;
    const tel = [...sinAsignar].filter(p => p.celular).sort(porNombre);
    if (!tel.length) return;
    let elegido = tel[0], mc = Infinity;
    tel.forEach(p => { const c = delta(e, p); if (c < mc) { mc = c; elegido = p; } });
    pon(elegido, e);
  });
  // 4. El resto, primero los de grupos grandes
  const tam = {};
  personas.forEach(p => { if (p.grupoKey) tam[p.grupoKey] = (tam[p.grupoKey] || 0) + 1; });
  [...sinAsignar].sort((a, b) => (tam[b.grupoKey] || 0) - (tam[a.grupoKey] || 0) || porNombre(a, b)).forEach(p => {
    const c = eqs.filter(libre);
    pon(p, mejor(p, c.length ? c : eqs.slice().sort((a, b) => a.miembros.length - b.miembros.length)));
  });
  // 5. Mejora por intercambios
  for (let vuelta = 0; vuelta < 40; vuelta++) {
    let mejoro = false;
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
      const A = eqs[i], B = eqs[j];
      for (let a = 0; a < A.miembros.length; a++) for (let b = 0; b < B.miembros.length; b++) {
        const pa = A.miembros[a], pb = B.miembros[b];
        if (pa.fijo || pb.fijo) continue;
        const antes = costoEquipo(A.miembros, ctx) + costoEquipo(B.miembros, ctx);
        const nA = A.miembros.slice(); nA[a] = pb;
        const nB = B.miembros.slice(); nB[b] = pa;
        if (costoEquipo(nA, ctx) + costoEquipo(nB, ctx) < antes - 1e-9) { A.miembros = nA; B.miembros = nB; mejoro = true; }
      }
    }
    if (!mejoro) break;
  }
  // 6. Capitán y alertas por equipo
  eqs.forEach(e => {
    e.miembros.sort((a, b) => (b.celular - a.celular) || ((a.tipo === 'adulto') - (b.tipo === 'adulto')) || porNombre(a, b));
    e.capitan = e.miembros.find(m => m.celular) || null;
    e.alertas = alertasEquipo(e, ctx);
    if (e.alertas.length) alertas.push(`Equipo ${e.n} (${e.color}): ${e.alertas.join('; ')}.`);
  });
  if (colores.length < k) alertas.push(`Faltan colores en Config: hay ${colores.length} para ${k} equipos.`);
  return { equipos: eqs, alertas };
}

/** Costo de un equipo: más alto = peor mezcla. */
function costoEquipo(m, ctx) {
  let c = 0;
  const cuenta = f => { const o = {}; m.forEach(p => { const v = f(p); if (v) o[v] = (o[v] || 0) + 1; }); return o; };
  Object.values(cuenta(p => p.grupoKey)).forEach(v => { if (v > 1) c += 10 * (v - 1); if (v > 2) c += 200 * (v - 2); });
  Object.values(cuenta(p => p.ads)).forEach(v => { c += 2 * v * v; });
  const s = cuenta(p => (p.sexo === 'Mujer' || p.sexo === 'Hombre') ? p.sexo : '');
  c += 4 * Math.pow((s.Mujer || 0) - (s.Hombre || 0), 2);
  const ad = m.filter(p => p.tipo === 'adulto').length;
  c += 30 * ad * ad;
  if (ad === 0 && ctx.adultos >= ctx.k) c += 300;
  if (!m.some(p => p.celular)) c += ctx.tels >= ctx.k ? 1000 : 400;
  const aj = m.filter(p => p.ajuste).length;
  if (aj > 1) c += 50 * (aj - 1);
  return c;
}

function alertasEquipo(e, ctx) {
  const a = [];
  if (!e.miembros.some(p => p.celular)) a.push('nadie lleva celular');
  const g = {};
  e.miembros.forEach(p => { if (p.grupoKey) g[p.grupoKey] = (g[p.grupoKey] || 0) + 1; });
  Object.keys(g).forEach(k => { if (g[k] > 2) a.push(`${g[k]} del mismo grupo (${k.replace(/\|/g, ' ').trim()})`); });
  if (new Set(e.miembros.map(p => p.ads)).size === 1 && e.miembros.length > 1) a.push('todos del mismo programa');
  if (e.miembros.filter(p => p.ajuste).length > 1) a.push('más de una persona con ajuste para moverse');
  return a;
}

/* ───────────── Lectura y escritura ───────────── */

function leePersonas_() {
  const sh = hoja_(H.INS, COLS);
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, COLS.length).getValues()
    .map((f, i) => aPersona(f, i))
    .filter(p => p.nombre && !/^baja/i.test(p.notas));
}

/** Convierte una fila de «Inscripciones» en persona para el armado. */
function aPersona(f, i) {
  const ads = String(f[C['Adscripción']]).trim();
  const tipo = ADS[ads] || 'estudiante';
  const area = String(f[C['Área']]).trim().toLowerCase();
  const grupoKey = tipo === 'estudiante'
    ? [ads, String(f[C['Semestre']]).trim(), String(f[C['Grupo']]).trim() || 'U'].join('|')
    : (area ? ads + '|' + area : '');
  const manual = parseInt(f[C['Equipo (manual)']], 10);
  return {
    id: i + 2, nombre: String(f[C['Nombre']]).replace(/^'/, '').trim(), ads, tipo, grupoKey,
    semestre: String(f[C['Semestre']]), grupo: String(f[C['Grupo']]), area: String(f[C['Área']]),
    sexo: String(f[C['Sexo']]), whatsapp: String(f[C['WhatsApp']]),
    celular: String(f[C['Celular para el equipo']]) === 'Sí', plataforma: String(f[C['Plataforma']]),
    ajuste: String(f[C['Ajuste para moverse']]) === 'Sí', manual: isNaN(manual) ? 0 : manual,
    notas: String(f[C['Notas']] || '')
  };
}

function escribeEquipos_(res, cfg) {
  const ss = SpreadsheetApp.getActive();
  const detalle = p => p.tipo === 'estudiante' ? `${p.semestre} ${p.grupo}`.trim() : p.area;
  // Equipos
  const eq = limpiaHoja_(H.EQ, ['Equipo', 'Color', 'Nombre', 'Papel', 'Adscripción', 'Semestre / grupo / área', 'Sexo', 'Celular', 'Ajuste', 'WhatsApp']);
  const filas = [];
  res.equipos.forEach(e => e.miembros.forEach(p => filas.push([e.n, e.color, p.nombre, p === e.capitan ? 'Capitán(a)' : '',
    p.ads, detalle(p), p.sexo, p.celular ? (p.plataforma || 'Sí') : '', p.ajuste ? 'Sí' : '', p.whatsapp])));
  if (filas.length) {
    eq.getRange(2, 10, filas.length, 1).setNumberFormat('@');
    eq.getRange(2, 1, filas.length, 10).setValues(filas);
  }
  pintaColores_(eq, filas.length, 2);
  // Por nombre (para repartir paliacates)
  const nom = limpiaHoja_(H.NOM, ['Nombre', 'Color', 'Equipo']);
  const lista = [];
  res.equipos.forEach(e => e.miembros.forEach(p => lista.push([p.nombre, e.color, e.n])));
  lista.sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'es'));
  if (lista.length) nom.getRange(2, 1, lista.length, 3).setValues(lista);
  nom.getRange(1, 1, Math.max(1, lista.length + 1), 3).setFontSize(14);
  pintaColores_(nom, lista.length, 2);
  // Resumen
  const rs = limpiaHoja_(H.RES, ['Equipo', 'Color', 'Personas', 'Mujeres', 'Hombres', 'Programas', 'Celulares', 'Capitán(a)', 'Alertas']);
  const filasR = res.equipos.map(e => {
    const prog = {};
    e.miembros.forEach(p => { prog[p.ads] = (prog[p.ads] || 0) + 1; });
    return [e.n, e.color, e.miembros.length, e.miembros.filter(p => p.sexo === 'Mujer').length,
      e.miembros.filter(p => p.sexo === 'Hombre').length,
      Object.keys(prog).map(k => `${k} ${prog[k]}`).join(' · '),
      e.miembros.filter(p => p.celular).length, e.capitan ? e.capitan.nombre : '—', e.alertas.join('; ')];
  });
  if (filasR.length) rs.getRange(2, 1, filasR.length, 9).setValues(filasR);
  pintaColores_(rs, filasR.length, 2);
  rs.getRange(filasR.length + 3, 1).setValue('Armado: ' + Utilities.formatDate(new Date(), ZONA, 'dd/MM/yyyy HH:mm'));
  if (res.alertas.length) rs.getRange(filasR.length + 4, 1, res.alertas.length, 1).setValues(res.alertas.map(a => [a]));
  ss.setActiveSheet(rs);
}

/* ───────────── Utilidades ───────────── */

function leeConfig_() {
  const o = {};
  CFG_DEF.forEach(([k, v]) => { o[k] = v; });
  const sh = SpreadsheetApp.getActive().getSheetByName(H.CFG);
  if (sh && sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(([k, v]) => { if (k) o[String(k).trim()] = v; });
  return o;
}

function fechaCierre_(cfg) {
  const v = cfg.CIERRE;
  if (v instanceof Date) return v;
  const m = String(v || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  return new Date(`${m[1]}-${m[2]}-${m[3]}T${(m[4] || '23').padStart(2, '0')}:${m[5] || '59'}:00-06:00`);
}

function abierta_(cfg) { const f = fechaCierre_(cfg); return !f || new Date() < f; }
function textoCierre_(cfg) { const f = fechaCierre_(cfg); return f ? Utilities.formatDate(f, ZONA, "yyyy-MM-dd'T'HH:mm:ssXXX") : ''; }

function totalInscritos_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(H.INS);
  if (!sh || sh.getLastRow() < 2) return 0;
  return sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues().filter(r => String(r[0]).trim()).length;
}

function hoja_(nombre, encabezados) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(nombre);
  if (!sh) sh = ss.insertSheet(nombre);
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, encabezados.length).setValues([encabezados]).setFontWeight('bold');
  return sh;
}

function limpiaHoja_(nombre, encabezados) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
  sh.clear();
  sh.getRange(1, 1, 1, encabezados.length).setValues([encabezados]).setFontWeight('bold').setBackground('#15123a').setFontColor('#fbf4e6');
  sh.setFrozenRows(1);
  return sh;
}

/** Pinta la columna de color (colIdx, base 1) con el color del paliacate. */
function pintaColores_(sh, n, colIdx) {
  if (n < 1) return;
  const r = sh.getRange(2, colIdx, n, 1);
  const vals = r.getValues();
  r.setBackgrounds(vals.map(v => [HEX[String(v[0]).trim().toLowerCase()] || '#ffffff']));
  r.setFontColors(vals.map(v => [/(negro|azul|morado|café|cafe|vino|verde|rojo)/i.test(String(v[0])) ? '#ffffff' : '#1a1535']));
  r.setFontWeight('bold');
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
