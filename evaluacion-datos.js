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
   Si cambias el número de versión de este archivo, súbelo también en las
   dos páginas (evaluacion-datos.js?v=N) para que no se junte con el viejo.
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
    { id:'admin',   e:'🗂️', t:'Administrativo o de apoyo', s:'Oficinas, biblioteca, vigilancia, intendencia…', corto:'Administrativos', grupo:'admin', seg:'admin' }
  ],

  segmentos: [
    { id:'todos',    t:'Todo el campus' },
    { id:'prepa',    t:'Prepa' },
    { id:'lic',      t:'Licenciaturas' },
    { id:'docentes', t:'Docentes' },
    { id:'admin',    t:'Administrativos' }
  ],

  /* Talleres permanentes 2026-2 (portada de la Franja) */
  talleres: [
    { id:'yoga',        e:'🧘', t:'Yoga',               dia:'Martes', hora:'11:00–12:00', cat:'cuerpo' },
    { id:'ajedrez',     e:'♟️', t:'Ajedrez',            dia:'Martes', hora:'12:00–13:00', cat:'mente' },
    { id:'balonmano',   e:'🤾', t:'Balonmano',          dia:'Martes', hora:'11:30–13:00', cat:'deporte' },
    { id:'calistenia',  e:'🏋️', t:'Calistenia',         dia:'Martes', hora:'11:30–12:30', cat:'cuerpo' },
    { id:'pintura-mar', e:'🎨', t:'Pintura',            dia:'Martes', hora:'11:30–13:00', cat:'arte' },
    { id:'guitarra',    e:'🎸', t:'Guitarra',           dia:'Martes', hora:'12:00–13:00', cat:'arte' },
    { id:'escritura',   e:'✍️', t:'Escritura creativa', dia:'Jueves', hora:'12:00–13:00', cat:'mente' },
    { id:'basquetbol',  e:'🏀', t:'Básquetbol',         dia:'Jueves', hora:'11:30–13:00', cat:'deporte' },
    { id:'pintura-jue', e:'🖌️', t:'Pintura',            dia:'Jueves', hora:'11:30–13:00', cat:'arte' },
    { id:'zumba',       e:'🕺', t:'Zumba',              dia:'Jueves', hora:'12:00–13:00', cat:'cuerpo' },
    { id:'ingles',      e:'🌐', t:'Inglés',             dia:'Jueves', hora:'11:30–13:00', cat:'mente' },
    { id:'teatro',      e:'🎭', t:'Teatro',             dia:'Jueves', hora:'11:30–13:00', cat:'arte' },
    { id:'danza',       e:'💃', t:'Danza · huapango',   dia:'Martes y jueves', hora:'11:30–13:00', cat:'arte' }
  ],

  /* Eventos del semestre. «con» completa la frase «¿Qué hacemos en enero con…?»
     «disfraz» viste al conejo guía igual que en el cartel de ese evento. */
  eventos: [
    { id:'feria',      e:'🎪', t:'Feria de Intercambio de Saberes', corto:'Feria de Saberes', fecha:'2026-08-27', cuando:'Jueves 27 de agosto', con:'la Feria de Saberes', cat:'saberes' },
    { id:'mercadito',  e:'🛒', t:'Mercadito y trueque', corto:'Mercadito', fecha:'2026-08-27', cuando:'Cuatro fechas, de agosto a noviembre', con:'el Mercadito y el trueque', cat:'mercadito' },
    { id:'maiz',       e:'🌽', t:'Día del Maíz', corto:'Día del Maíz', fecha:'2026-09-29', cuando:'Martes 29 de septiembre', con:'el Día del Maíz', cat:'fiestas', disfraz:'palma', anual:true },
    { id:'disfraces',  e:'🦸', t:'Concurso de disfraces', corto:'Disfraces', fecha:'2026-10-29', cuando:'Día de Muertos · jueves 29 de octubre', con:'el concurso de disfraces', cat:'fiestas', disfraz:'mascara', anual:true },
    { id:'voleibol',   e:'🏐', t:'Torneo de voleibol mixto', corto:'Voleibol', fecha:'2026-11-05', cuando:'Jueves de 11:00 a 12:00', con:'el torneo de voleibol', cat:'deporte', disfraz:'banda' },
    { id:'posada',     e:'🪅', t:'Posada navideña', corto:'Posada', fecha:'2026-11-24', cuando:'Martes 24 de noviembre', con:'la Posada', cat:'fiestas', disfraz:'venda', anual:true },
    { id:'cierre',     e:'🎉', t:'Cierre y muestra de talleres', corto:'Cierre', fecha:'2026-11-26', cuando:'Jueves 26 de noviembre', con:'el cierre y la muestra', cat:'fiestas' }
  ],

  /* Las ocho macetas de los diez maíces */
  maiz: [
    { id:'deporte',   e:'🏐', t:'Deporte y torneos' },
    { id:'arte',      e:'🎨', t:'Arte, música y danza' },
    { id:'cuerpo',    e:'🧘', t:'Cuerpo y bienestar' },
    { id:'mente',     e:'📚', t:'Idiomas y mente' },
    { id:'saberes',   e:'🛠️', t:'Oficios y saberes' },
    { id:'fiestas',   e:'🎉', t:'Fiestas del campus' },
    { id:'mercadito', e:'🛒', t:'Mercadito y trueque' },
    { id:'libre',     e:'🌙', t:'Tiempo libre, sin nada' }
  ],

  /* Opciones. Una «t» con llaves estudiante/docente/admin cambia según quién responde.
     «solo» excluye a las demás; «texto» abre un renglón para escribir. */
  op: {
    martes: {
      estudiante: [
        { id:'taller', e:'🎨', t:'En mi taller' },
        { id:'dando',  e:'🧑‍🏫', t:'Dando o ayudando en un taller' },
        { id:'comer',  e:'🍽️', t:'Comiendo o descansando' },
        { id:'tarea',  e:'📖', t:'Haciendo tarea o estudiando' },
        { id:'amigos', e:'💬', t:'Con mis amigos, platicando' },
        { id:'clase',  e:'🏫', t:'En clase o con algún maestro' },
        { id:'fuera',  e:'🚶', t:'Fuera del campus' }
      ],
      docente: [
        { id:'dando',   e:'🧑‍🏫', t:'Dando mi taller' },
        { id:'taller',  e:'🎨', t:'En un taller, como participante' },
        { id:'trabajo', e:'💻', t:'Trabajando: planear, calificar, papeles' },
        { id:'atender', e:'🙋', t:'Atendiendo estudiantes' },
        { id:'junta',   e:'🗣️', t:'En junta o comisión' },
        { id:'comer',   e:'☕', t:'Comiendo o descansando' },
        { id:'fuera',   e:'🚶', t:'Fuera del campus' }
      ],
      admin: [
        { id:'puesto', e:'🗂️', t:'En mi puesto, atendiendo' },
        { id:'taller', e:'🎨', t:'En un taller' },
        { id:'dando',  e:'🧑‍🏫', t:'Dando un taller' },
        { id:'apoyo',  e:'🛠️', t:'Apoyando algún evento de la Franja' },
        { id:'comer',  e:'☕', t:'Comiendo o descansando' }
      ]
    },
    asist: [
      { id:'siempre', e:'🔥', t:'Casi siempre' },
      { id:'aveces',  e:'🌤️', t:'A veces' },
      { id:'deje',    e:'🚪', t:'Lo dejé a medias' },
      { id:'nunca',   e:'👻', t:'Me apunté, pero nunca fui' }
    ],
    motivos: [
      { id:'choque',      e:'⏰', t:'Se me juntaba con clase o trabajo' },
      { id:'expectativa', e:'🤔', t:'No era lo que esperaba' },
      { id:'nivel',       e:'📈', t:'El nivel o el ritmo no me acomodó' },
      { id:'ganas',       e:'😴', t:'Se me fueron las ganas' },
      { id:'grupo',       e:'😶', t:'No me sentí a gusto' },
      { id:'cancelaba',   e:'❌', t:'Se cancelaba seguido' },
      { id:'cambie',      e:'🔁', t:'Me cambié a otro taller' },
      { id:'otra',        e:'✏️', t:'Otra cosa', texto:true }
    ],
    veredicto: [
      { id:'igual',   e:'✅', t:'Que siga igual',        sello:'Se queda' },
      { id:'cambios', e:'🔧', t:'Que siga, con cambios', sello:'Con cambios' },
      { id:'no',      e:'✋', t:'Que ya no siga',        sello:'Se va' }
    ],
    cambiosTaller: [
      { id:'horario',      t:'Horario' },
      { id:'duracion',     t:'Duración' },
      { id:'nivel',        t:'Nivel: más básico o más avanzado' },
      { id:'practica',     t:'Más práctica' },
      { id:'material',     t:'Material' },
      { id:'espacio',      t:'Espacio o salón' },
      { id:'cupo',         t:'Cupo' },
      { id:'organizacion', t:'Organización' },
      { id:'otra',         t:'Otra cosa', texto:true }
    ],
    cambiosEvento: [
      { id:'fecha',        t:'Fecha u horario' },
      { id:'duracion',     t:'Duración' },
      { id:'difusion',     t:'Más difusión' },
      { id:'organizacion', t:'Organización' },
      { id:'lugar',        t:'Lugar' },
      { id:'dinamica',     t:'Dinámica o actividades' },
      { id:'mas',          t:'Que sea más seguido' },
      { id:'menos',        t:'Que sea menos seguido' },
      { id:'otra',         t:'Otra cosa', texto:true }
    ],
    porqueNo: [
      { id:'gusto',        t:'No me gustó' },
      { id:'organizacion', t:'Estuvo mal organizado' },
      { id:'utilidad',     t:'No le veo utilidad' },
      { id:'tiempo',       t:'Le quita tiempo a otras cosas' },
      { id:'reemplazo',    t:'Mejor otra cosa en su lugar', texto:true },
      { id:'otra',         t:'Otra razón', texto:true }
    ],
    frenos: [
      { id:'enterar',    e:'📢', t:'No me enteré, o me enteré tarde' },
      { id:'interes',    e:'🤷', t:'Ningún taller me llamó la atención' },
      { id:'choque',     e:'⏰', t:{ estudiante:'Tenía clase, examen o tarea a esa hora', docente:'Tenía clase, juntas o trabajo', admin:'No puedo dejar mi puesto' } },
      { id:'descanso',   e:'🍽️', t:'Prefiero ese rato para comer o descansar' },
      { id:'pena',       e:'🙈', t:'Me dio pena, o no conocía a nadie' },
      { id:'cupo',       e:'🚫', t:'El cupo ya estaba lleno' },
      { id:'costo',      e:'💸', t:'Había que pagar o comprar material' },
      { id:'compromiso', e:'📅', t:'No quería comprometerme cada semana' },
      { id:'sentido',    e:'👎', t:'No le veo sentido' },
      { id:'otra',       e:'✏️', t:'Otra razón', texto:true }
    ],
    canal: [
      { id:'whatsapp', e:'💬', t:{ estudiante:'El WhatsApp de mi grupo', docente:'El WhatsApp de docentes', admin:'El WhatsApp del personal' } },
      { id:'clase',    e:'🧑‍🏫', t:{ estudiante:'Que lo digan en clase', docente:'Que lo digan en junta', admin:'Que me lo diga mi jefe o jefa' } },
      { id:'carteles', e:'📌', t:'Carteles en el campus' },
      { id:'redes',    e:'📱', t:'Redes del campus' },
      { id:'pagina',   e:'🌐', t:'La página de la Franja' },
      { id:'boca',     e:'🗣️', t:'Alguien que me invite' }
    ],
    sumarme: [
      { id:'gusto',   e:'🎯', t:'Un taller de algo que de verdad me guste' },
      { id:'aviso',   e:'📣', t:'Enterarme antes y mejor' },
      { id:'amigos',  e:'👯', t:'Que vayan mis amigos o mi grupo' },
      { id:'cuenta',  e:'🏅', t:{ estudiante:'Que cuente: puntos, créditos o constancia', docente:'Que se reconozca: constancia u horas', admin:'Tener permiso, o alguien que me cubra' } },
      { id:'horario', e:'⏰', t:'Otro horario' },
      { id:'sueltas', e:'🎟️', t:'Actividades sueltas, sin compromiso semanal' },
      { id:'nada',    e:'🛋️', t:'Nada: ese rato lo uso en otra cosa y está bien', solo:true }
    ],
    talOtra: [
      { id:'igual',   e:'✅', t:'Sí, igual' },
      { id:'cambios', e:'🔧', t:'Sí, con cambios' },
      { id:'no',      e:'✋', t:'No' }
    ],
    talFalto: [
      { id:'material',   e:'🧰', t:'Material' },
      { id:'espacio',    e:'🏫', t:'Un espacio adecuado' },
      { id:'difusion',   e:'📣', t:'Más difusión' },
      { id:'constancia', e:'📉', t:'Que el grupo fuera constante' },
      { id:'pago',       e:'💰', t:'Pago o reconocimiento a tiempo' },
      { id:'apoyo',      e:'🤝', t:'Apoyo de la coordinación' },
      { id:'tiempo',     e:'⏱️', t:'Más tiempo por sesión' },
      { id:'nada',       e:'👌', t:'Nada, estuvo bien', solo:true },
      { id:'otra',       e:'✏️', t:'Otra cosa', texto:true }
    ],
    dejo: [
      { id:'mover',       e:'💪', t:'Moverme y sentirme mejor' },
      { id:'aprender',    e:'🧠', t:'Aprender algo nuevo' },
      { id:'gente',       e:'🤝', t:'Conocer gente de otros grupos' },
      { id:'respiro',     e:'😌', t:'Un respiro entre clases' },
      { id:'raices',      e:'🌽', t:'Acercarme a las tradiciones de la Sierra' },
      { id:'pertenencia', e:'🏡', t:'Sentirme parte del campus' },
      { id:'nada',        e:'🤷', t:'Nada en especial', solo:true }
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
      { id:'balonmano',  e:'🤾', t:'Balonmano' },
      { id:'ajedrez',    e:'♟️', t:'Ajedrez' },
      { id:'otro',       e:'✏️', t:'Otro deporte', texto:true },
      { id:'ninguno',    e:'🙅', t:'Ninguno: mejor talleres' }
    ],
    porque: [
      { id:'gusto',   e:'💚', t:'Por gusto, aunque no diera puntos' },
      { id:'ambos',   e:'⚖️', t:'Por gusto y por los puntos' },
      { id:'puntos',  e:'🏅', t:'Sobre todo por los puntos o créditos' },
      { id:'nosabia', e:'❓', t:'No sabía que daba puntos' }
    ],
    choque: [
      { id:'nunca',   e:'👍', t:'Nunca' },
      { id:'pocas',   e:'🤏', t:'Una o dos veces' },
      { id:'seguido', e:'😤', t:'Seguido' }
    ],
    suspension: [
      { id:'menos', e:'👍', t:'Sí, se notó' },
      { id:'igual', e:'😐', t:'No noté diferencia' },
      { id:'mas',   e:'👎', t:'Al contrario, perdí más' }
    ],
    carga: [
      { id:'nada',      e:'😎', t:'Nada' },
      { id:'poco',      e:'🙂', t:'Poco' },
      { id:'bastante',  e:'😓', t:'Bastante' },
      { id:'demasiado', e:'🥵', t:'Demasiado' }
    ],
    cargaTipo: [
      { id:'limpieza',   e:'🧹', t:'Limpieza' },
      { id:'vigilancia', e:'🔦', t:'Vigilancia o seguridad' },
      { id:'espacios',   e:'🔑', t:'Prestar espacios o material' },
      { id:'visitantes', e:'🙋', t:'Atender visitantes' },
      { id:'montar',     e:'📦', t:'Organizar o montar' },
      { id:'clases',     e:'📚', t:'Reponer o mover clases' },
      { id:'otra',       e:'✏️', t:'Otra', texto:true }
    ],
    salir: [
      { id:'si',        e:'👍', t:'Sí, cuando quise' },
      { id:'aveces',    e:'🤞', t:'A veces, con permiso' },
      { id:'no',        e:'🗂️', t:'No, alguien tiene que atender' },
      { id:'nointeres', e:'🤷', t:'No me interesó' }
    ],
    deseo: [
      { id:'foto',     e:'📷', t:'Fotografía' },
      { id:'cocina',   e:'🍳', t:'Cocina' },
      { id:'futbol',   e:'⚽', t:'Fútbol' },
      { id:'auxilios', e:'🩹', t:'Primeros auxilios' },
      { id:'huerto',   e:'🌱', t:'Huerto' },
      { id:'compu',    e:'💻', t:'Computación' },
      { id:'canto',    e:'🎤', t:'Canto o banda' },
      { id:'lectura',  e:'📖', t:'Club de lectura' },
      { id:'tejido',   e:'🧶', t:'Tejido o bordado' },
      { id:'defensa',  e:'🥋', t:'Defensa personal' },
      { id:'cine',     e:'🎬', t:'Cine club' },
      { id:'debate',   e:'🗣️', t:'Debate y oratoria' }
    ],
    voluntario: [
      { id:'si',     e:'🙋', t:'¡Sí, cuenta conmigo!' },
      { id:'talvez', e:'🤔', t:'Tal vez, platiquemos' },
      { id:'no',     e:'🙂', t:'Por ahora no' }
    ]
  }
};
