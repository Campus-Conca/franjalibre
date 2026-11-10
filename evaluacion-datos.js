/* ==========================================================================
   ¿QUÉ SE QUEDA? · Balance de la Franja Libre 2026-2 · Campus Concá UAQ
   Datos compartidos por evaluacion.html (el instrumento) y
   evaluacion-resultados.html (los resultados públicos).

   Lo que se cambia aquí:
   · scriptUrl  → la URL /exec del Apps Script (Code-evaluacion.gs).
                  Mientras esté vacía, el instrumento no se abre al público.
   · abre/cierra → ventana en que el instrumento recibe respuestas.
                  Con ?preview en la dirección se puede probar antes; esas
                  respuestas llegan marcadas como prueba y no cuentan.
   · talleres y eventos → lo que se evalúa. Un evento con fecha futura no
                  aparece en el pasaporte hasta ese día. Un evento con
                  anual:true se pregunta para el próximo año («¿qué hacemos el
                  próximo año?») y no para enero.

   Regla de las listas: cuando una pregunta da a escoger entre muchas cosas,
   lleva cinco categorías como máximo, cada una ligada a una decisión distinta
   de la coordinación, y al final «Otra», que abre un renglón para escribir lo
   que no cupo. Las escalas (nunca / a veces / seguido…) no llevan «Otra»
   porque ya cubren todas las respuestas.

   Si cambias el número de versión de este archivo, súbelo también en las
   tres páginas que lo cargan (evaluacion-datos.js?v=N en evaluacion.html,
   evaluacion-resultados.html e index.html) para que no se junte con el viejo.
   ========================================================================== */

window.EVAL = {
  scriptUrl: 'https://script.google.com/macros/s/AKfycbxsojXv7Tpk7LlAiWlgOUud_WI67gha0vvEx27FVz24yswF8yGc37w548a1uK7do4CnxA/exec',
  semestre: '2026-2',
  proximo: 'enero–junio 2027',
  anio: '2027',      // el año de las fiestas anuales que se evalúan
  abre:   '2026-11-26T11:00:00-06:00',   // jueves del cierre de la Franja
  cierra: '2026-12-11T23:59:00-06:00',
  url: 'https://franjalibre.campusconcauaq.workers.dev/evaluacion',
  minimoGrupo: 5,   // un grupo con menos respuestas no se desglosa en público

  roles: [
    { id:'prepa',   e:'🎒', t:'Estudiante de prepa', corto:'Prepa', grupo:'estudiante', seg:'prepa' },
    { id:'pas',     e:'🌱', t:'Estudiante de PAS', s:'Producción Agropecuaria Sustentable', corto:'PAS', grupo:'estudiante', seg:'lic' },
    { id:'agro',    e:'⚙️', t:'Estudiante de Agroindustrial', s:'Ingeniería Agroindustrial', corto:'Agroindustrial', grupo:'estudiante', seg:'lic' },
    { id:'docente', e:'📚', t:'Docente', corto:'Docentes', grupo:'docente', seg:'docentes' },
    { id:'admin',   e:'🧰', t:'Personal administrativo o de apoyo', s:'Limpieza, jardinería, vigilancia u oficina', corto:'Administrativos', grupo:'admin', seg:'admin' }
  ],

  /* El área solo se pregunta al personal. Cambia la redacción de sus preguntas
     y la lista de «¿qué te cargó más?». En público nunca se desglosa por área:
     en un campus chico, una o dos personas por área serían reconocibles.
     «de» completa la frase «el personal de…». */
  areas: [
    { id:'limpieza',   e:'🧹', t:'Limpieza',   s:'Intendencia: salones, baños y áreas comunes', de:'el personal de limpieza' },
    { id:'jardineria', e:'🌳', t:'Jardinería', s:'Áreas verdes, canchas y riego', de:'el personal de jardinería' },
    { id:'vigilancia', e:'🔦', t:'Vigilancia', s:'Caseta, accesos y rondines', de:'el personal de vigilancia' },
    { id:'oficina',    e:'🗂️', t:'Oficina',    s:'Servicios escolares, coordinación, biblioteca', de:'el personal de oficina' },
    { id:'otra',       e:'✏️', t:'Otra área',  texto:true, ph:'¿Cuál? Escríbela', de:'el personal del campus' }
  ],

  segmentos: [
    { id:'todos',    t:'Todo el campus' },
    { id:'prepa',    t:'Prepa' },
    { id:'lic',      t:'Licenciaturas' },
    { id:'docentes', t:'Docentes' },
    { id:'admin',    t:'Administrativos' }
  ],

  /* Talleres permanentes 2026-2 (portada de la Franja). «cat» es la maceta de la milpa a la que pertenece. */
  talleres: [
    { id:'yoga',        e:'🧘', t:'Yoga',               dia:'Martes', hora:'11:00–12:00', cat:'deporte' },
    { id:'ajedrez',     e:'♟️', t:'Ajedrez',            dia:'Martes', hora:'12:00–13:00', cat:'saberes' },
    { id:'balonmano',   e:'🤾', t:'Balonmano',          dia:'Martes', hora:'11:30–13:00', cat:'deporte' },
    { id:'calistenia',  e:'🏋️', t:'Calistenia',         dia:'Martes', hora:'11:30–12:30', cat:'deporte' },
    { id:'pintura-mar', e:'🎨', t:'Pintura',            dia:'Martes', hora:'11:30–13:00', cat:'arte' },
    { id:'guitarra',    e:'🎸', t:'Guitarra',           dia:'Martes', hora:'12:00–13:00', cat:'arte' },
    { id:'escritura',   e:'✍️', t:'Escritura creativa', dia:'Jueves', hora:'12:00–13:00', cat:'arte' },
    { id:'basquetbol',  e:'🏀', t:'Básquetbol',         dia:'Jueves', hora:'11:30–13:00', cat:'deporte' },
    { id:'pintura-jue', e:'🖌️', t:'Pintura',            dia:'Jueves', hora:'11:30–13:00', cat:'arte' },
    { id:'zumba',       e:'🕺', t:'Zumba',              dia:'Jueves', hora:'12:00–13:00', cat:'deporte' },
    { id:'ingles',      e:'🌐', t:'Inglés',             dia:'Jueves', hora:'11:30–13:00', cat:'saberes' },
    { id:'teatro',      e:'🎭', t:'Teatro',             dia:'Jueves', hora:'11:30–13:00', cat:'arte' },
    { id:'danza',       e:'💃', t:'Danza · huapango',   dia:'Martes y jueves', hora:'11:30–13:00', cat:'arte' }
  ],

  /* Eventos del semestre. «con» completa la frase «¿Qué hacemos en enero con…?»
     «disfraz» viste al conejo guía igual que en el cartel de ese evento.
     Un evento sin «fecha» sale en el pasaporte desde el primer día.
     Los ids no pueden repetir los de los talleres (ya hay un taller «basquetbol»). */
  eventos: [
    { id:'feria',      e:'🎪', t:'Feria de Intercambio de Saberes', corto:'Feria de Saberes', fecha:'2026-08-27', cuando:'Jueves 27 de agosto', con:'la Feria de Saberes', cat:'saberes' },
    { id:'mercadito',  e:'🛒', t:'Mercadito y trueque', corto:'Mercadito', fecha:'2026-08-27', cuando:'Cuatro fechas, de agosto a noviembre', con:'el Mercadito y el trueque', cat:'fiestas' },
    { id:'disfraces',  e:'🦸', t:'Concurso de disfraces', corto:'Disfraces', fecha:'2026-10-29', cuando:'Día de Muertos · jueves 29 de octubre', con:'el concurso de disfraces', cat:'fiestas', disfraz:'mascara', anual:true },
    { id:'torneo-futbol',     e:'⚽', t:'Torneo de fútbol', corto:'Fútbol', cuando:'Semestre 2026-2', con:'el torneo de fútbol', cat:'deporte', disfraz:'banda' },
    { id:'torneo-basquetbol', e:'🏀', t:'Torneo de básquetbol', corto:'Básquetbol', cuando:'Semestre 2026-2', con:'el torneo de básquetbol', cat:'deporte', disfraz:'banda' },
    { id:'voleibol',   e:'🏐', t:'Torneo de voleibol mixto', corto:'Voleibol', fecha:'2026-11-05', cuando:'Jueves de 11:00 a 12:00', con:'el torneo de voleibol', cat:'deporte', disfraz:'banda' },
    { id:'posada',     e:'🪅', t:'Posada navideña', corto:'Posada', fecha:'2026-11-24', cuando:'Martes 24 de noviembre', con:'la Posada', cat:'fiestas', disfraz:'venda', anual:true }
  ],

  /* La milpa: cinco macetas y una para lo que no cupo. «s» da ejemplos para quien la ve por primera vez.
     Quien siembra en «deporte» contesta después de qué deporte quiere el torneo. */
  maiz: [
    { id:'deporte', e:'🏐', t:'Deporte y movimiento', s:'torneos, básquet, yoga, zumba' },
    { id:'arte',    e:'🎨', t:'Arte y cultura',       s:'música, danza, pintura, teatro' },
    { id:'saberes', e:'📚', t:'Saberes y oficios',    s:'inglés, ajedrez, cocina, feria de saberes' },
    { id:'fiestas', e:'🎉', t:'Fiestas y mercadito',  s:'posada, disfraces, trueque' },
    { id:'libre',   e:'🌙', t:'Tiempo libre',         s:'un rato sin actividades, para descansar' },
    { id:'otra',    e:'✏️', t:'Otra cosa',            s:'la escribes abajo', texto:true }
  ],

  /* Opciones. Una «t» con llaves estudiante/docente/admin cambia según quién responde;
     dentro del personal, una llave de área (limpieza, jardineria, vigilancia, oficina)
     gana sobre «admin». «s» es una línea de aclaración bajo la opción.
     «solo» excluye a las demás; «texto» abre un renglón para escribir (con «ph» de guía).
     «r» es el nombre corto que usan los resultados cuando la opción se repite entre listas. */
  op: {
    martes: {
      estudiante: [
        { id:'taller',  e:'🎨', t:'En un taller de la Franja' },
        { id:'dando',   e:'🧑‍🏫', t:'Dando o ayudando en un taller' },
        { id:'libre',   e:'🍽️', t:'Comiendo, descansando o con mis amigos' },
        { id:'escuela', e:'📖', t:'Con cosas de la escuela', s:'Clase, examen, tarea o estudiando' },
        { id:'fuera',   e:'🚶', t:'Fuera del campus' },
        { id:'otra',    e:'✏️', t:'Otra cosa', texto:true, ph:'¿Dónde o haciendo qué?' }
      ],
      docente: [
        { id:'dando',   e:'🧑‍🏫', t:'Dando mi taller' },
        { id:'taller',  e:'🎨', t:'En un taller, como participante' },
        { id:'trabajo', e:'💻', t:'Trabajando', s:'Dando clase, en junta, planeando o calificando' },
        { id:'libre',   e:'☕', t:'Comiendo o descansando' },
        { id:'fuera',   e:'🚗', t:'No estoy en el campus a esa hora' },
        { id:'otra',    e:'✏️', t:'Otra cosa', texto:true, ph:'¿Dónde o haciendo qué?' }
      ],
      admin: [
        { id:'puesto', e:'🛠️', t:{ admin:'En mi puesto, trabajando', limpieza:'Limpiando o en mis tareas', jardineria:'Trabajando en las áreas verdes',
                                  vigilancia:'En la caseta o en un rondín', oficina:'En la oficina, atendiendo' } },
        { id:'taller', e:'🎨', t:'En un taller' },
        { id:'dando',  e:'🧑‍🏫', t:'Dando un taller' },
        { id:'libre',  e:'☕', t:'En mi descanso o comiendo' },
        { id:'fuera',  e:'🌙', t:'No estoy a esa hora: mi turno es otro' },
        { id:'otra',   e:'✏️', t:'Otra cosa', texto:true, ph:'¿Dónde o haciendo qué?' }
      ]
    },
    asist: [
      { id:'siempre', e:'🔥', t:'Casi siempre' },
      { id:'aveces',  e:'🌤️', t:'A veces' },
      { id:'deje',    e:'🚪', t:'Lo dejé a medias' },
      { id:'nunca',   e:'👻', t:'Me apunté, pero nunca fui' }
    ],
    /* Por qué lo dejó a medias: cada opción apunta a quien puede arreglarlo
       (el horario, quien da el taller, la organización, el ambiente) o dice que fue cosa de uno. */
    motivos: [
      { id:'choque',      e:'⏰', t:{ estudiante:'Se me juntaba con clase u otra cosa de la escuela', docente:'Se me juntaba con clases o juntas', admin:'No podía dejar mi puesto' } },
      { id:'expectativa', e:'🤔', t:'No era lo que esperaba', s:'El nivel, el ritmo o lo que se hacía' },
      { id:'cancelaba',   e:'❌', t:'Se cancelaba seguido o empezaba tarde' },
      { id:'grupo',       e:'😶', t:'No me sentí a gusto en el grupo' },
      { id:'ganas',       e:'😴', t:'Se me fueron las ganas', s:'Cosas mías: cansancio u otras prioridades' },
      { id:'otra',        e:'✏️', t:'Otra razón', texto:true, ph:'¿Cuál? Escríbela' }
    ],
    /* Por qué nunca llegó: quien no fue no puede opinar del taller, así que aquí pesan
       el horario, el aviso de inicio, la pena de llegar solo y el cambio de planes. */
    motivosNunca: [
      { id:'choque',  e:'⏰', t:{ estudiante:'Se me juntaba con clase u otra cosa de la escuela', docente:'Se me juntaba con clases o juntas', admin:'No podía dejar mi puesto' } },
      { id:'inicio',  e:'📅', t:'No supe cuándo ni dónde empezaba' },
      { id:'solo',    e:'🙈', t:'Me dio pena llegar sin conocer a nadie' },
      { id:'cambie',  e:'🔁', t:'Me fui a otro taller' },
      { id:'ganas',   e:'😴', t:'Cambié de opinión', s:'Se me fueron las ganas o tuve otras prioridades' },
      { id:'otra',    e:'✏️', t:'Otra razón', texto:true, ph:'¿Cuál? Escríbela' }
    ],
    veredicto: [
      { id:'igual',   e:'✅', t:'Que siga igual',        sello:'Se queda' },
      { id:'cambios', e:'🔧', t:'Que siga, con cambios', sello:'Con cambios' },
      { id:'no',      e:'✋', t:'Que ya no siga',        sello:'Se va' }
    ],
    /* Qué cambiarle a un taller: tiempo, forma de enseñar, recursos, lugar y organización. */
    cambiosTaller: [
      { id:'horario',      t:'Horario o duración' },
      { id:'forma',        t:'Cómo se da: nivel, ritmo o práctica' },
      { id:'material',     t:'Material o equipo' },
      { id:'espacio',      t:'Espacio o cupo' },
      { id:'organizacion', t:'Organización y avisos' },
      { id:'otra',         t:'Otra cosa', texto:true, ph:'¿Qué otra cosa le cambiarías?' }
    ],
    /* Qué cambiarle a un evento. «Más/menos seguido» no se ofrece en las fiestas de cada año. */
    cambiosEvento: [
      { id:'cuando',       t:'Cuándo y dónde: fecha, horario o lugar' },
      { id:'dinamica',     t:'Qué se hace: actividades, reglas o premios' },
      { id:'organizacion', t:'Organización y avisos' },
      { id:'mas',          t:'Que sea más seguido' },
      { id:'menos',        t:'Que sea menos seguido' },
      { id:'otra',         t:'Otra cosa', texto:true, ph:'¿Qué otra cosa le cambiarías?' }
    ],
    porqueNo: [
      { id:'gusto',        t:'No me gustó' },
      { id:'organizacion', t:'Estuvo mal organizado' },
      { id:'utilidad',     t:'No le veo sentido' },
      { id:'tiempo',       t:'Le quita tiempo a otras cosas' },
      { id:'reemplazo',    t:'Mejor otra cosa en su lugar', texto:true, ph:'¿Qué pondrías en su lugar?' },
      { id:'otra',         t:'Otra razón', texto:true, ph:'¿Cuál razón? Escríbela' }
    ],
    /* Por qué no se sumó a ningún taller. Una categoría por palanca:
       aviso, oferta, horario, pertenencia y preferencia por descansar.
       Lo de «sin compromiso semanal» se pregunta del otro lado, en «sumarme». */
    frenos: [
      { id:'enterar',  e:'📢', t:'No me enteré, o me enteré tarde' },
      { id:'interes',  e:'🤷', t:'Ningún taller me llamó la atención' },
      { id:'choque',   e:'⏰', t:{ estudiante:'Tenía clase, examen o práctica a esa hora', docente:'Tenía clase, juntas o trabajo a esa hora', admin:'No puedo dejar mi puesto' } },
      { id:'pena',     e:'🙈', t:{ estudiante:'Me dio pena, o no conocía a nadie', docente:'Sentí que era para estudiantes, o me dio pena', admin:'Sentí que era para estudiantes, o me dio pena' } },
      { id:'descanso', e:'🍽️', t:'Prefiero ese rato para comer o descansar' },
      { id:'otra',     e:'✏️', t:'Otra razón', texto:true, ph:'¿Cuál? Escríbela' }
    ],
    canal: [
      { id:'whatsapp', e:'💬', t:{ estudiante:'El WhatsApp de mi grupo', docente:'El WhatsApp de docentes', admin:'El WhatsApp del personal' } },
      { id:'clase',    e:'🧑‍🏫', t:{ estudiante:'Que lo digan en clase', docente:'Que lo digan en junta', admin:'Que me lo diga mi jefe o jefa' } },
      { id:'carteles', e:'📌', t:'Carteles en el campus' },
      { id:'redes',    e:'📱', t:'Redes sociales o la página de la Franja' },
      { id:'boca',     e:'🗣️', t:'Que alguien me invite en persona' },
      { id:'otra',     e:'✏️', t:'Otro medio', texto:true, ph:'¿Cuál? Escríbelo' }
    ],
    /* Qué haría que se sume: lo que «frenos» no cubre (formato, compañía, reconocimiento o permiso) y la salida honesta. */
    sumarme: [
      { id:'gusto',   e:'🎯', t:'Que haya un taller de algo que me guste' },
      { id:'sueltas', e:'🎟️', t:'Actividades sueltas, sin apuntarme cada semana' },
      { id:'amigos',  e:'👯', t:'Ir con alguien que conozco' },
      { id:'cuenta',  e:'🏅', t:{ estudiante:'Que cuente: puntos, créditos o constancia', docente:'Que se reconozca: constancia u horas', admin:'Tener permiso, o alguien que me cubra' } },
      { id:'nada',    e:'🛋️', t:'Nada: ese rato es mío y está bien', solo:true },
      { id:'otra',    e:'✏️', t:'Otra cosa', texto:true, ph:'¿Qué haría que te sumes?' }
    ],
    talOtra: [
      { id:'igual',   e:'✅', t:'Sí, igual' },
      { id:'cambios', e:'🔧', t:'Sí, con cambios' },
      { id:'no',      e:'✋', t:'No' }
    ],
    talFalto: [
      { id:'continuidad', e:'👥', t:'Un grupo constante', s:'Que la gente no dejara de ir y que no se suspendiera tanto' },
      { id:'recursos',    e:'🧰', t:'Material o un espacio adecuado' },
      { id:'apoyo',       e:'🤝', t:'Apoyo de la coordinación', s:'Difusión, avisos, permisos, resolver problemas' },
      { id:'pago',        e:'🏅', t:'Pago o reconocimiento a tiempo' },
      { id:'nada',        e:'👌', t:'Nada, estuvo bien', solo:true },
      { id:'otra',        e:'✏️', t:'Otra cosa', texto:true, ph:'¿Qué te hizo falta?' }
    ],
    /* Lo que deja la Franja, en los cuatro propósitos que la sostienen. */
    dejo: [
      { id:'bienestar', e:'💪', t:'Sentirme mejor', s:'Moverme, despejarme, darme un respiro' },
      { id:'aprender',  e:'🧠', t:'Aprender algo nuevo' },
      { id:'convivir',  e:'🤝', t:'Conocer gente y sentirme parte del campus' },
      { id:'raices',    e:'🌽', t:'Acercarme a las tradiciones de la Sierra' },
      { id:'nada',      e:'🤷', t:'Nada en especial', solo:true },
      { id:'otra',      e:'✏️', t:'Otra cosa', texto:true, ph:'¿Qué te dejó?' }
    ],
    gente: [
      { id:'0', n:'0',   t:'Ninguna' },
      { id:'1', n:'1–2', t:'Una o dos' },
      { id:'3', n:'3–5', t:'De tres a cinco' },
      { id:'6', n:'6+',  t:'Más de cinco' }
    ],
    sin: [
      { id:'mucho', e:'😢', t:'La extrañaría mucho' },
      { id:'poco',  e:'🙁', t:'Un poco' },
      { id:'igual', e:'😐', t:'Me daría igual' },
      { id:'mejor', e:'😌', t:'Mejor sin ella' }
    ],
    balance: [
      { id:'talleres', e:'🧩', t:'Menos eventos: que los talleres avancen' },
      { id:'igual',    e:'⚖️', t:'Así como estuvo' },
      { id:'eventos',  e:'🎪', t:'Más eventos, aunque haya menos talleres' }
    ],
    torneo: [
      { id:'futbol',     e:'⚽', t:'Fútbol' },
      { id:'basquetbol', e:'🏀', t:'Básquetbol' },
      { id:'voleibol',   e:'🏐', t:'Voleibol' },
      { id:'ajedrez',    e:'♟️', t:'Ajedrez', s:'Para que entre quien no juega en cancha' },
      { id:'ninguno',    e:'🙅', t:'Ninguno: mejor talleres' },
      { id:'otro',       e:'✏️', t:'Otro deporte', texto:true, ph:'¿Cuál? Escribe el deporte' }
    ],

    /* ---------- Solo estudiantes ---------- */
    choque: [
      { id:'nunca',   e:'👍', t:'Nunca' },
      { id:'pocas',   e:'🤏', t:'Una o dos veces' },
      { id:'seguido', e:'😤', t:'Tres veces o más' }
    ],
    porque: [
      { id:'igual',   e:'💚', t:'Sí, igual' },
      { id:'menos',   e:'🤏', t:'Sí, pero menos seguido' },
      { id:'puntos',  e:'🏅', t:'No: iba sobre todo por los puntos' },
      { id:'nosabia', e:'❓', t:'No sabía que daba puntos' }
    ],

    /* ---------- Solo docentes ---------- */
    suspension: [
      { id:'menos', e:'👍', t:'Sí, perdí menos clases' },
      { id:'igual', e:'😐', t:'No noté diferencia' },
      { id:'mas',   e:'👎', t:'Al contrario, perdí más' },
      { id:'nose',  e:'🆕', t:'No sé: es mi primer semestre aquí' }
    ],
    /* Si la hora de la Franja se usó para clase o junta, y por qué: cada razón tiene un responsable
       distinto (horarios, calendario, dirección, prácticas de campo). */
    respeto: [
      { id:'nunca',    e:'🙌', t:'No, nunca', solo:true },
      { id:'horario',  e:'📅', t:'Sí: mi horario oficial cae a esa hora' },
      { id:'reponer',  e:'🔁', t:'Sí: para reponer clases perdidas' },
      { id:'junta',    e:'🗣️', t:'Sí: me citaron a junta o comisión' },
      { id:'practica', e:'🚜', t:'Sí: una práctica o salida que no cabía en otro horario' },
      { id:'otra',     e:'✏️', t:'Sí, por otra razón', texto:true, ph:'¿Cuál? Escríbela' }
    ],

    /* ---------- Docentes y personal ---------- */
    carga: [
      { id:'nada',      e:'😎', t:'Nada' },
      { id:'poco',      e:'🙂', t:'Poco' },
      { id:'bastante',  e:'😓', t:'Bastante' },
      { id:'demasiado', e:'🥵', t:'Demasiado' }
    ],
    /* Qué cargó más, con la lista de cada quien: docentes y cada área del personal.
       «admin» es la lista para quien eligió «otra área». */
    cargaTipo: {
      docente: [
        { id:'clases',    e:'🔁', t:'Mover o reponer clases' },
        { id:'cuidar',    e:'👀', t:'Cuidar a mis grupos en los eventos' },
        { id:'organizar', e:'📦', t:'Organizar o montar un evento' },
        { id:'papeleo',   e:'📝', t:'Papeleo: listas, puntos o constancias', r:'Papeleo y trámites' },
        { id:'taller',    e:'🧑‍🏫', t:'Preparar o dar mi taller' },
        { id:'otra',      e:'✏️', t:'Otra cosa', texto:true, ph:'¿Qué más te cargó?' }
      ],
      limpieza: [
        { id:'basura',     e:'🗑️', t:'Basura y limpieza después de los eventos', r:'Basura y limpieza después de los eventos' },
        { id:'banos',      e:'🚻', t:'Baños con más uso' },
        { id:'salones',    e:'🎨', t:'Salones que los talleres dejaban sucios' },
        { id:'mobiliario', e:'🪑', t:'Mover mesas, sillas o material', r:'Mover mesas, sillas o material' },
        { id:'tarde',      e:'⏰', t:'Quedarme más tarde o venir otro día', r:'Quedarse más tiempo o venir otro día' },
        { id:'otra',       e:'✏️', t:'Otra cosa', texto:true, ph:'¿Qué más te cargó?' }
      ],
      jardineria: [
        { id:'canchas',    e:'⚽', t:'Preparar canchas o espacios para los eventos' },
        { id:'danos',      e:'🌱', t:'Arreglar pasto, plantas o áreas maltratadas' },
        { id:'basura',     e:'🗑️', t:'Recoger basura en las áreas verdes', r:'Basura y limpieza después de los eventos' },
        { id:'mobiliario', e:'🪑', t:'Mover mesas, sillas, carpas o material', r:'Mover mesas, sillas o material' },
        { id:'tarde',      e:'⏰', t:'Quedarme más tarde o venir otro día', r:'Quedarse más tiempo o venir otro día' },
        { id:'otra',       e:'✏️', t:'Otra cosa', texto:true, ph:'¿Qué más te cargó?' }
      ],
      vigilancia: [
        { id:'accesos',         e:'🚪', t:'Controlar la entrada de visitantes' },
        { id:'estacionamiento', e:'🚗', t:'Cuidar el estacionamiento y los autos' },
        { id:'espacios',        e:'🔑', t:'Abrir, cerrar y cuidar espacios', r:'Abrir, cerrar o prestar espacios' },
        { id:'incidentes',      e:'🛡️', t:'Cuidar el orden o atender algún problema' },
        { id:'tarde',           e:'⏰', t:'Quedarme más tiempo o cubrir otro turno', r:'Quedarse más tiempo o venir otro día' },
        { id:'otra',            e:'✏️', t:'Otra cosa', texto:true, ph:'¿Qué más te cargó?' }
      ],
      oficina: [
        { id:'papeleo',   e:'📝', t:'Papeleo: oficios, permisos o constancias', r:'Papeleo y trámites' },
        { id:'prestamos', e:'🔑', t:'Prestar espacios, material o equipo', r:'Abrir, cerrar o prestar espacios' },
        { id:'informes',  e:'🙋', t:'Dar informes o atender visitantes' },
        { id:'difusion',  e:'📣', t:'Avisos, carteles o redes' },
        { id:'compras',   e:'🧾', t:'Compras, pagos o comprobantes' },
        { id:'otra',      e:'✏️', t:'Otra cosa', texto:true, ph:'¿Qué más te cargó?' }
      ],
      admin: [
        { id:'basura',     e:'🧹', t:'Limpiar o recoger después', r:'Basura y limpieza después de los eventos' },
        { id:'mobiliario', e:'🪑', t:'Mover mesas, sillas o material', r:'Mover mesas, sillas o material' },
        { id:'espacios',   e:'🔑', t:'Abrir, cuidar o prestar espacios', r:'Abrir, cerrar o prestar espacios' },
        { id:'papeleo',    e:'📝', t:'Papeleo o trámites', r:'Papeleo y trámites' },
        { id:'tarde',      e:'⏰', t:'Quedarme más tiempo o venir otro día', r:'Quedarse más tiempo o venir otro día' },
        { id:'otra',       e:'✏️', t:'Otra cosa', texto:true, ph:'¿Qué más te cargó?' }
      ]
    },

    /* ---------- Solo personal ---------- */
    salir: [
      { id:'si',        e:'👍', t:'Sí, cuando quise' },
      { id:'aveces',    e:'🤞', t:'A veces, pidiendo permiso' },
      { id:'no',        e:'🚫', t:{ admin:'No: no puedo dejar mi puesto', limpieza:'No: a esa hora me toca trabajar', jardineria:'No: a esa hora me toca trabajar',
                                    vigilancia:'No: la vigilancia no se puede dejar sola', oficina:'No: alguien tiene que atender' } },
      { id:'nointeres', e:'🤷', t:'No me llamó la atención' }
    ],
    aviso: [
      { id:'semana', e:'📅', t:'Con una semana o más' },
      { id:'dias',   e:'🗓️', t:'Dos o tres días antes' },
      { id:'encima', e:'⏰', t:'Un día antes o el mismo día' },
      { id:'nunca',  e:'🤷', t:'No me avisaban: me enteraba ahí' }
    ],
    /* Qué ayudaría en los eventos: que quien organiza haga su parte (dicho para cada área),
       más manos, compensar el tiempo extra y tomar en cuenta al personal al planear. */
    ayuda: [
      { id:'orden',     e:'📋', t:{ admin:'Que quien organiza haga su parte y deje todo en orden', limpieza:'Que quien organiza deje limpio y recoja su basura',
                                    jardineria:'Que se cuiden las áreas verdes y se recoja la basura', vigilancia:'Que me pasen antes la lista de quién va a entrar',
                                    oficina:'Que los trámites y préstamos se pidan con tiempo' } },
      { id:'manos',     e:'🙋', t:'Más manos: que alguien más ayude ese día' },
      { id:'compensar', e:'⏰', t:'Tiempo libre o pago por las horas extra' },
      { id:'planear',   e:'🗣️', t:'Que nos tomen en cuenta al planear' },
      { id:'nada',      e:'👌', t:'Nada, así está bien', solo:true },
      { id:'otra',      e:'✏️', t:'Otra cosa', texto:true, ph:'¿Qué te ayudaría?' }
    ],

    /* Talleres nuevos: uno por cada hueco de la oferta actual (cocina y primeros auxilios
       para saberes y oficios, foto y canto para arte, defensa personal para movimiento).
       Lo demás se escribe en el renglón de «otro taller». */
    deseo: [
      { id:'cocina',   e:'🍳', t:'Cocina' },
      { id:'auxilios', e:'🩹', t:'Primeros auxilios' },
      { id:'foto',     e:'📷', t:'Fotografía y video' },
      { id:'defensa',  e:'🥋', t:'Defensa personal' },
      { id:'canto',    e:'🎤', t:'Canto o banda' }
    ],
    voluntario: [
      { id:'si',     e:'🙋', t:'¡Sí, cuenta conmigo!' },
      { id:'talvez', e:'🤔', t:'Tal vez, platiquemos' },
      { id:'no',     e:'🙂', t:'Por ahora no' }
    ]
  }
};
