/**
 * ¿QUÉ SE QUEDA? · BALANCE DE LA FRANJA LIBRE 2026-2 · CAMPUS CONCÁ UAQ
 * Recibe las respuestas de evaluacion.html, las guarda en esta hoja de cálculo
 * y entrega los resultados ya sumados a evaluacion-resultados.html.
 *
 * CÓMO INSTALARLO (una sola vez, unos cinco minutos)
 *  1. Crea una hoja de cálculo nueva en Drive. Nombre sugerido: «Franja Libre · Balance 2026-2».
 *  2. Extensiones → Apps Script. Borra lo que haya, pega este archivo completo y guarda.
 *  3. Arriba, elige la función «preparar» y dale Ejecutar. Acepta los permisos que pide.
 *     Se crean las pestañas Respuestas, Actividades, Citas y Voluntarios.
 *  4. Implementar → Nueva implementación → tipo «Aplicación web».
 *       Ejecutar como: Yo.   Quién tiene acceso: Cualquier usuario.
 *  5. Copia la URL que termina en /exec y pégala en scriptUrl, dentro de evaluacion-datos.js.
 *     Para comprobar que quedó, abre esa URL en el navegador: debe decir «listo».
 *
 * QUÉ GUARDA CADA PESTAÑA
 *  · Respuestas   Una fila por persona, sin nombre. Vigente = «No» cuando esa misma persona
 *                 volvió a responder desde su teléfono: cuenta solo la última.
 *                 Prueba = «Sí» cuando se contestó con ?preview: no cuenta en los resultados.
 *  · Actividades  Una fila por cada taller o evento evaluado: asistencia, veredicto y qué le
 *                 cambiaría. Es la pestaña buena para tablas dinámicas.
 *  · Citas        Las respuestas a «Si tú coordinaras la Franja…». Llegan con la casilla
 *                 Publicar apagada: solo las que marques salen en la página de resultados.
 *  · Voluntarios  Quienes se ofrecieron a dar un taller u organizar algo, con nombre y WhatsApp.
 *                 Va aparte, solo con el día y sin ninguna marca en Respuestas, para que no se
 *                 pueda saber qué contestó cada quien.
 *
 * En público solo salen sumas. Un grupo con menos de MIN_GRUPO respuestas no se desglosa, y una
 * palabra o un taller escrito a mano aparece hasta que lo repiten al menos MIN_PALABRA personas.
 * El área del personal (limpieza, jardinería, vigilancia, oficina) va solo a la columna «Área (personal)»
 * de Respuestas: no entra al JSON ni a los resultados, para que nadie quede expuesto por su área.
 * Lo escrito en las opciones «Otra» va pegado a su respuesta en Respuestas y Actividades, entre «».
 *
 * Si cambias este código: Implementar → Gestionar implementaciones → lápiz →
 * Versión: Nueva versión → Implementar. Así la misma URL /exec sirve el código nuevo.
 */

var MIN_GRUPO = 5;       // un grupo con menos respuestas no se desglosa en público
var MIN_SEGUNDOS = 15;   // respuestas más rápidas se guardan, pero no se cuentan
var MIN_PALABRA = 2;     // una palabra escrita a mano sale en público cuando la repiten al menos 2
var CACHE_SEG = 60;      // los resultados se recalculan, como mucho, una vez por minuto

var H_RESP = 'Respuestas', H_ACT = 'Actividades', H_CITAS = 'Citas', H_VOL = 'Voluntarios';
var COL_JSON = 'Datos (no editar)';
var FIJAS_RESP = ['Fecha', 'ID', 'Vigente', 'Prueba', 'Duración (s)'];
// Columnas que manda la página hoy. Si la página manda una nueva, se agrega sola antes de COL_JSON.
var COLS_RESP = [
  'Quién', 'Grupo', 'Área (personal)', 'Martes 12:10', 'Talleres', 'Eventos', 'Frenos', 'Por dónde enterarse', 'Para sumarse',
  'Tallerista: ¿otra vez?', 'Tallerista: le hizo falta', 'Palabra', 'Qué le dejó', 'Gente nueva',
  'Si ya no hubiera Franja', 'Eventos o talleres',
  'Maíz: Deporte y movimiento', 'Maíz: Arte y cultura', 'Maíz: Saberes y oficios', 'Maíz: Fiestas y mercadito',
  'Maíz: Tiempo libre', 'Maíz: Otra cosa', 'Maíz: cuál otra cosa',
  'Torneo de enero', 'Clase a la hora de la Franja (estudiantes)', 'Sin puntos, ¿habría ido? (estudiantes)',
  'Clases perdidas por eventos (docentes)', 'Clase o junta a la hora de la Franja (docentes)',
  'Salir del puesto (administrativos)', 'Aviso de los eventos (administrativos)',
  'Trabajo extra', 'Tipo de trabajo extra', 'Qué le ayudaría (administrativos)',
  'Taller que pide', 'Si coordinara la Franja'
];
var FIJAS_ACT = ['Fecha', 'ID', 'Vigente', 'Prueba', 'Quién'];
var COLS_ACT = ['Tipo', 'Actividad', 'Asistencia', 'Por qué lo dejó', 'Veredicto', 'Qué le cambiaría', 'Por qué ya no', 'Nota'];
var COLS_CITAS = ['Fecha', 'ID', 'Vigente', 'Prueba', 'Grupo', 'Si yo coordinara la Franja…', 'Publicar'];
var COLS_VOL = ['Fecha', 'Nombre', 'WhatsApp', 'Qué podría dar u organizar', 'Disposición', 'Prueba'];

var ROLES = { prepa:'Estudiante de prepa', pas:'Estudiante de PAS', agro:'Estudiante de Agroindustrial', docente:'Docente', admin:'Administrativo' };
var SEGMENTOS = { todos:null, prepa:['prepa'], lic:['pas', 'agro'], docentes:['docente'], admin:['admin'] };
var UNICAS = ['martes', 'talOtra', 'gente', 'sin', 'balance', 'torneo', 'porque', 'choque', 'suspension', 'carga', 'salir', 'aviso'];
var VARIAS = ['frenos', 'canal', 'sumarme', 'talFalto', 'dejo', 'respeto', 'cargaTipo', 'ayuda', 'deseo'];
var GROSERIAS = ['pendejo', 'pendeja', 'pendejada', 'puto', 'puta', 'putos', 'chingada', 'chingadera', 'chingar', 'verga',
  'culero', 'culera', 'mierda', 'pinche', 'cabron', 'cabrona', 'joto', 'estupido', 'estupida', 'idiota', 'imbecil',
  'mamada', 'mamadas', 'zorra', 'perra', 'maricon', 'pito', 'ojete', 'pendejos', 'naca', 'naco', 'jodido', 'jodida'];

/* ============================== INSTALACIÓN ============================== */

/** Crea las cuatro pestañas con sus encabezados. Ejecutar una sola vez. */
function preparar() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  armarHoja(libro, H_RESP, FIJAS_RESP.concat(COLS_RESP, [COL_JSON]));
  armarHoja(libro, H_ACT, FIJAS_ACT.concat(COLS_ACT));
  armarHoja(libro, H_CITAS, COLS_CITAS);
  armarHoja(libro, H_VOL, COLS_VOL);
  var primera = libro.getSheetByName('Hoja 1') || libro.getSheetByName('Sheet1');
  if (primera && primera.getLastRow() === 0 && libro.getSheets().length > 1) libro.deleteSheet(primera);
}

function armarHoja(libro, nombre, columnas) {
  var hoja = libro.getSheetByName(nombre) || libro.insertSheet(nombre);
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(columnas);
    encabezado(hoja.getRange(1, 1, 1, columnas.length));
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function encabezado(rango) {
  return rango.setFontWeight('bold').setBackground('#1A3A2A').setFontColor('#F5EED8');
}

/* ============================== RECIBIR ============================== */

function doPost(e) {
  var candado = LockService.getScriptLock();
  try {
    candado.waitLock(25000);
    var cuerpo = (e && e.postData && e.postData.contents) || '';
    if (cuerpo.length > 40000) return responder({ ok:false, error:'grande' });
    var d = JSON.parse(cuerpo);
    if (!d || d.tipo !== 'balance') return responder({ ok:false, error:'tipo' });
    if (d.web) return responder({ ok:true });                 // trampa para robots
    var r = d.r || {};
    if (!ROLES[r.rol]) return responder({ ok:false, error:'rol' });

    var id = limpiaId(d.id);
    var prueba = d.prueba === true;
    var ahora = new Date();
    var libro = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Respuestas: una fila por persona
    var hr = armarHoja(libro, H_RESP, FIJAS_RESP.concat(COLS_RESP, [COL_JSON]));
    var fila = (d.fila && typeof d.fila === 'object') ? d.fila : {};
    var claves = Object.keys(fila).filter(function (k) { return k && k.length <= 80; }).slice(0, 80);
    var enc = asegurarColumnas(hr, claves, COL_JSON);
    retirarAnteriores(hr, id);
    var segundos = numero(d.segundos);
    var limpio = limpiarR(r);
    hr.appendRow(enc.map(function (col) {
      switch (col) {
        case 'Fecha': return ahora;
        case 'ID': return id;
        case 'Vigente': return 'Sí';
        case 'Prueba': return prueba ? 'Sí' : 'No';
        case 'Duración (s)': return segundos;
        case COL_JSON: return JSON.stringify({ r:limpio, s:segundos });
        default: return celda(fila[col]);
      }
    }));

    // 2. Actividades: una fila por taller o evento evaluado
    var ha = armarHoja(libro, H_ACT, FIJAS_ACT.concat(COLS_ACT));
    retirarAnteriores(ha, id);
    var acts = Array.isArray(d.actividades) ? d.actividades.slice(0, 40) : [];
    if (acts.length) {
      var quien = celda(fila['Quién']);
      var filas = acts.map(function (a) {
        return [ahora, id, 'Sí', prueba ? 'Sí' : 'No', quien].concat(COLS_ACT.map(function (c) { return celda(a && a[c]); }));
      });
      ha.getRange(ha.getLastRow() + 1, 1, filas.length, filas[0].length).setValues(filas);
    }

    // 3. Citas: lo que cambiaría si coordinara, para moderar antes de publicar
    var hc = armarHoja(libro, H_CITAS, COLS_CITAS);
    retirarAnteriores(hc, id);
    var cita = texto(d.cita, 500);
    if (cita) {
      hc.appendRow([ahora, id, 'Sí', prueba ? 'Sí' : 'No', ROLES[r.rol], celda(cita), false]);
      hc.getRange(hc.getLastRow(), COLS_CITAS.length).insertCheckboxes();
    }

    // 4. Voluntarios: aparte y solo con el día
    var v = d.voluntario;
    if (v && (v.nombre || v.tel)) {
      var hv = armarHoja(libro, H_VOL, COLS_VOL);
      var dia = Utilities.formatDate(ahora, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      hv.appendRow([dia, celda(texto(v.nombre, 80)), celda(texto(v.tel, 20)), celda(texto(v.que, 300)),
                    celda(texto(v.disposicion, 40)), prueba ? 'Sí' : 'No']);
    }

    CacheService.getScriptCache().remove('resultados');
    return responder({ ok:true, numero:prueba ? null : contarVigentes(hr) });
  } catch (err) {
    return responder({ ok:false, error:String(err) });
  } finally {
    try { candado.releaseLock(); } catch (e2) {}
  }
}

/* ============================== ENTREGAR ============================== */

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.accion === 'resultados') {
    var cache = CacheService.getScriptCache();
    var guardado = p.fresco ? null : cache.get('resultados');
    if (guardado) return salidaJSON(guardado);
    var json = JSON.stringify(resultados());
    if (json.length < 95000) cache.put('resultados', json, CACHE_SEG);
    return salidaJSON(json);
  }
  return ContentService.createTextOutput('Balance de la Franja Libre · ¿Qué se queda? · listo')
    .setMimeType(ContentService.MimeType.TEXT);
}

function resultados() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var hr = libro.getSheetByName(H_RESP);
  var todas = [], segundos = [], primera = null, ultima = null;
  if (hr && hr.getLastRow() > 1) {
    var datos = hr.getDataRange().getValues();
    var enc = datos[0].map(String);
    var cV = enc.indexOf('Vigente'), cP = enc.indexOf('Prueba'), cJ = enc.indexOf(COL_JSON), cF = enc.indexOf('Fecha');
    for (var i = 1; i < datos.length; i++) {
      var f = datos[i];
      if (String(f[cV]) !== 'Sí' || String(f[cP]) === 'Sí') continue;
      var o = null;
      try { o = JSON.parse(f[cJ]); } catch (err) { o = null; }
      if (!o || !o.r || !ROLES[o.r.rol]) continue;
      if (o.s && o.s < MIN_SEGUNDOS) continue;
      todas.push(o.r);
      if (o.s) segundos.push(o.s);
      var fecha = f[cF] instanceof Date ? f[cF] : null;
      if (fecha) { if (!primera || fecha < primera) primera = fecha; if (!ultima || fecha > ultima) ultima = fecha; }
    }
  }
  var seg = {};
  Object.keys(SEGMENTOS).forEach(function (k) {
    var roles = SEGMENTOS[k];
    var sub = roles ? todas.filter(function (r) { return roles.indexOf(r.rol) >= 0; }) : todas;
    seg[k] = sub.length >= MIN_GRUPO ? sumar(sub) : { n:sub.length, oculto:true };
  });
  return {
    ok:true, actualizado:new Date().toISOString(), total:todas.length,
    porRol:contar(todas, 'rol'), mediana:mediana(segundos), minimo:MIN_GRUPO,
    desde:primera ? primera.toISOString() : null, hasta:ultima ? ultima.toISOString() : null,
    seg:seg, citas:citas(libro), voluntarios:contarVoluntarios(libro)
  };
}

function sumar(L) {
  var a = { n:L.length, base:{} };
  UNICAS.forEach(function (k) { a[k] = contar(L, k); a.base[k] = L.filter(function (r) { return r[k] != null && r[k] !== ''; }).length; });
  VARIAS.forEach(function (k) { a[k] = contarVarias(L, k); a.base[k] = L.filter(function (r) { return Array.isArray(r[k]) && r[k].length; }).length; });
  // Quién se sumó a qué
  a.part = { da:0, talleres:0, eventos:0, nada:0 };
  L.forEach(function (r) {
    var t = (r.talleres || []).some(function (x) { return x && x.asist && x.asist !== 'nunca'; });
    var ev = (r.eventos || []).length > 0;
    if (r.martes === 'dando') a.part.da++;
    else if (t) a.part.talleres++;
    else if (ev) a.part.eventos++;
    else a.part.nada++;
  });
  // Actividad por actividad
  a.act = {};
  L.forEach(function (r) {
    (r.talleres || []).concat(r.eventos || []).forEach(function (x) {
      if (!x || !x.id) return;
      var o = a.act[x.id] || (a.act[x.id] = { n:0, asist:{}, motivos:{}, ver:{}, cambios:{}, porqueNo:{} });
      o.n++;
      if (x.asist) inc(o.asist, x.asist);
      if (x.ver) inc(o.ver, x.ver);
      ['motivos', 'cambios', 'porqueNo'].forEach(function (k) { (x[k] || []).forEach(function (m) { inc(o[k], m); }); });
    });
  });
  // Los diez maíces
  a.maiz = { personas:0, total:0, suma:{} };
  L.forEach(function (r) {
    if (!r.maiz) return;
    var s = 0;
    Object.keys(r.maiz).forEach(function (k) {
      var v = Math.max(0, Math.min(10, Number(r.maiz[k]) || 0));
      a.maiz.suma[k] = (a.maiz.suma[k] || 0) + v; s += v;
    });
    if (s > 0) { a.maiz.personas++; a.maiz.total += s; }
  });
  a.palabras = nube(L.map(function (r) { return r.palabra; }));
  a.deseosEscritos = nube(L.map(function (r) { return r.deseoOtro; }));
  a.torneosEscritos = nube(L.map(function (r) { return r.torneoOtro; }));
  a.maizEscritos = nube(L.map(function (r) { return r.maizOtro; }));
  return a;
}

function citas(libro) {
  var h = libro.getSheetByName(H_CITAS);
  if (!h || h.getLastRow() < 2) return [];
  var datos = h.getDataRange().getValues(), enc = datos[0].map(String);
  var cV = enc.indexOf('Vigente'), cP = enc.indexOf('Prueba'), cG = enc.indexOf('Grupo'),
      cT = enc.indexOf('Si yo coordinara la Franja…'), cPub = enc.indexOf('Publicar');
  var out = [];
  for (var i = datos.length - 1; i >= 1 && out.length < 80; i--) {
    var f = datos[i];
    if (f[cPub] !== true || String(f[cV]) !== 'Sí' || String(f[cP]) === 'Sí') continue;
    var t = String(f[cT] || '').trim();
    if (t) out.push({ g:String(f[cG] || ''), t:t });
  }
  return out;
}

function contarVoluntarios(libro) {
  var h = libro.getSheetByName(H_VOL);
  if (!h || h.getLastRow() < 2) return 0;
  var datos = h.getDataRange().getValues(), cP = datos[0].map(String).indexOf('Prueba');
  return datos.slice(1).filter(function (f) { return String(f[cP]) !== 'Sí'; }).length;
}

/* ============================== AYUDAS ============================== */

function responder(objeto) { return salidaJSON(JSON.stringify(objeto)); }
function salidaJSON(texto) { return ContentService.createTextOutput(texto).setMimeType(ContentService.MimeType.JSON); }

function limpiaId(id) {
  var s = String(id || '').replace(/[^a-z0-9]/gi, '').slice(0, 32);
  return s ? 'id-' + s : 'id-' + Utilities.getUuid().replace(/-/g, '').slice(0, 16);
}
function numero(n) { n = Number(n); return isFinite(n) ? Math.max(0, Math.round(n)) : ''; }
function texto(t, max) { return String(t == null ? '' : t).replace(/\s+/g, ' ').trim().slice(0, max || 200); }
/** Lo que se escribe en la hoja nunca se evalúa como fórmula ni se convierte en número o fecha. */
function celda(v) {
  if (v == null) return '';
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  var s = String(v).slice(0, 600);
  if (/^[=+\-@]/.test(s) || /^[\d\s.,:\/-]+$/.test(s)) return "'" + s;
  return s;
}
function idSeguro(x) { return typeof x === 'string' && /^[a-z0-9-]{1,30}$/i.test(x) ? x : null; }
function lista(x) { return Array.isArray(x) ? x.map(idSeguro).filter(Boolean).slice(0, 15) : []; }

/** Deja en el JSON solo lo que sirve para sumar: identificadores cortos, sin textos libres largos. */
function limpiarR(r) {
  var o = { rol:idSeguro(r.rol) };
  UNICAS.forEach(function (k) { o[k] = idSeguro(r[k]); });
  VARIAS.forEach(function (k) { o[k] = lista(r[k]); });
  o.talleres = (Array.isArray(r.talleres) ? r.talleres : []).slice(0, 20).map(function (x) {
    return { id:idSeguro(x && x.id), asist:idSeguro(x && x.asist), motivos:lista(x && x.motivos), ver:idSeguro(x && x.ver), cambios:lista(x && x.cambios), porqueNo:lista(x && x.porqueNo) };
  }).filter(function (x) { return x.id; });
  o.eventos = (Array.isArray(r.eventos) ? r.eventos : []).slice(0, 20).map(function (x) {
    return { id:idSeguro(x && x.id), ver:idSeguro(x && x.ver), cambios:lista(x && x.cambios), porqueNo:lista(x && x.porqueNo) };
  }).filter(function (x) { return x.id; });
  o.maiz = null;
  if (r.maiz && typeof r.maiz === 'object') {
    o.maiz = {};
    var total = 0;
    Object.keys(r.maiz).slice(0, 12).forEach(function (k) {
      if (!idSeguro(k)) return;
      var v = Math.max(0, Math.min(10, Math.round(Number(r.maiz[k]) || 0)));
      o.maiz[k] = v; total += v;
    });
    if (total > 10) o.maiz = null;   // nadie tiene más de diez maíces
  }
  o.palabra = texto(r.palabra, 24).toLowerCase();
  o.deseoOtro = texto(r.deseoOtro, 60);
  o.torneoOtro = o.torneo === 'otro' ? texto(r.torneoOtro, 40) : '';
  o.maizOtro = (o.maiz && o.maiz.otra > 0) ? texto(r.maizOtro, 60) : '';
  return o;
}

function asegurarColumnas(hoja, claves, colFinal) {
  var enc = hoja.getRange(1, 1, 1, Math.max(1, hoja.getLastColumn())).getValues()[0].map(String);
  claves.forEach(function (k) {
    if (enc.indexOf(k) >= 0) return;
    var pos = enc.indexOf(colFinal);
    if (pos < 0) { pos = enc.length; enc.push(k); }
    else { hoja.insertColumnBefore(pos + 1); enc.splice(pos, 0, k); }
    encabezado(hoja.getRange(1, pos + 1).setValue(k));
  });
  return enc;
}

function retirarAnteriores(hoja, id) {
  var ultima = hoja.getLastRow();
  if (!id || ultima < 2) return;
  var enc = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(String);
  var cId = enc.indexOf('ID') + 1, cV = enc.indexOf('Vigente') + 1;
  if (!cId || !cV) return;
  var ids = hoja.getRange(2, cId, ultima - 1, 1).getValues();
  var vig = hoja.getRange(2, cV, ultima - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === id && String(vig[i][0]) === 'Sí') hoja.getRange(i + 2, cV).setValue('No');
  }
}

function contarVigentes(hoja) {
  var ultima = hoja.getLastRow();
  if (ultima < 2) return 0;
  var enc = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(String);
  var cV = enc.indexOf('Vigente') + 1, cP = enc.indexOf('Prueba') + 1;
  var v = hoja.getRange(2, cV, ultima - 1, 1).getValues(), p = hoja.getRange(2, cP, ultima - 1, 1).getValues();
  var n = 0;
  for (var i = 0; i < v.length; i++) if (String(v[i][0]) === 'Sí' && String(p[i][0]) !== 'Sí') n++;
  return n;
}

function inc(o, k) { o[k] = (o[k] || 0) + 1; }
function contar(L, k) { var o = {}; L.forEach(function (r) { if (r[k] != null && r[k] !== '') inc(o, r[k]); }); return o; }
function contarVarias(L, k) { var o = {}; L.forEach(function (r) { (r[k] || []).forEach(function (x) { inc(o, x); }); }); return o; }
function mediana(xs) {
  if (!xs.length) return null;
  var s = xs.slice().sort(function (a, b) { return a - b; }), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}
function sinAcentos(s) {
  return String(s).toLowerCase().replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
    .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/[^a-zñ0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
/** Cuenta textos cortos escritos a mano; solo devuelve los que repiten al menos MIN_PALABRA personas. */
function nube(textos) {
  var cuenta = {}, formas = {};
  textos.forEach(function (t) {
    if (!t) return;
    var k = sinAcentos(t);
    if (!k || k.length < 2) return;
    if (k.split(' ').some(function (p) { return GROSERIAS.indexOf(p) >= 0; })) return;
    cuenta[k] = (cuenta[k] || 0) + 1;
    var f = String(t).trim().toLowerCase();
    formas[k] = formas[k] || {};
    formas[k][f] = (formas[k][f] || 0) + 1;
  });
  return Object.keys(cuenta).filter(function (k) { return cuenta[k] >= MIN_PALABRA; })
    .sort(function (a, b) { return cuenta[b] - cuenta[a]; }).slice(0, 50)
    .map(function (k) {
      var fs = formas[k], mejor = Object.keys(fs).sort(function (a, b) { return fs[b] - fs[a]; })[0];
      return { t:mejor, n:cuenta[k] };
    });
}
