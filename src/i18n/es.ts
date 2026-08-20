/**
 * Textos de la interfaz en español. Éste es el diccionario de referencia: el
 * inglés tiene que tener las mismas claves y las mismas firmas, y el
 * compilador lo comprueba (ver `Messages` en `en.ts`).
 *
 * Lo que NO entra aquí: nada que venga de ENAIRE, de los NOTAM o del catálogo
 * de espacios protegidos, y tampoco el correo de solicitud de autorización
 * (`src/logic/request.ts`), que va dirigido a gestores españoles y se manda
 * siempre en español.
 */

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const es = {
  /* --- Códigos ED-318 en lenguaje llano (labels.ts) ----------------- */

  'zoneType.PROHIBITED': 'Prohibido',
  'zoneType.REQ_AUTHORIZATION': 'Requiere autorización',
  'zoneType.CONDITIONAL': 'Con condiciones',
  'zoneType.NO_RESTRICTION': 'Sin restricción',
  'zoneType.UNKNOWN': 'Sin clasificar',

  'zoneType.explain.PROHIBITED': 'Aquí no se puede volar. La zona está prohibida para drones.',
  'zoneType.explain.REQ_AUTHORIZATION':
    'Aquí sólo puedes volar si antes pides permiso y te lo conceden. Sin esa autorización, el vuelo no es legal.',
  'zoneType.explain.CONDITIONAL':
    'Puedes volar, pero cumpliendo unas condiciones concretas (altura, distancia, coordinación previa…).',
  'zoneType.explain.NO_RESTRICTION': 'Esta zona no impone restricciones adicionales.',
  'zoneType.explain.UNKNOWN': 'ENAIRE no ha clasificado el tipo de restricción de esta zona.',

  'reason.AIR_TRAFFIC': 'Tráfico aéreo',
  'reason.SENSITIVE': 'Instalación sensible',
  'reason.PRIVACY': 'Privacidad',
  'reason.POPULATION': 'Zona poblada',
  'reason.NATURE': 'Espacio natural',
  'reason.NOISE': 'Ruido',
  'reason.EMERGENCY': 'Emergencias',
  'reason.AIR_DEFENCE': 'Defensa aérea',
  'reason.DANGEROUS_MATERIAL': 'Material peligroso',
  'reason.MILITARY': 'Militar',
  'reason.OTHER': 'Otros motivos',

  'reason.explain.AIR_TRAFFIC':
    'Hay aviones o helicópteros tripulados operando por aquí (espacio aéreo controlado, aeropuerto o helipuerto cercano).',
  'reason.explain.SENSITIVE': 'Se protege una instalación sensible o crítica.',
  'reason.explain.PRIVACY': 'Se protege la intimidad de las personas.',
  'reason.explain.POPULATION': 'Es una aglomeración de personas o un entorno urbano.',
  'reason.explain.NATURE': 'Es un espacio natural protegido y la fauna puede verse afectada.',
  'reason.explain.NOISE': 'Se limita el ruido en la zona.',
  'reason.explain.EMERGENCY': 'Puede haber operaciones de emergencia.',
  'reason.explain.AIR_DEFENCE': 'Zona relacionada con la defensa aérea.',
  'reason.explain.DANGEROUS_MATERIAL': 'Hay materiales peligrosos en la zona.',
  'reason.explain.MILITARY': 'Es una zona de interés militar.',
  'reason.explain.OTHER': 'ENAIRE agrupa aquí otros motivos; consulta el texto oficial.',
  'reason.fallback': (motivo: string) => `Motivo: ${motivo}.`,

  'layer.aero': 'Aeronáutica',
  'layer.urbano': 'Aviso urbano',
  'layer.infraestructuras': 'Infraestructura',

  'layer.description.aero':
    'Zonas por seguridad del espacio aéreo: aeropuertos, helipuertos, espacio aéreo controlado, zonas prohibidas y restringidas.',
  'layer.description.urbano':
    'Aviso general de ENAIRE, no una zona concreta: cubre toda España y recuerda que debes ' +
    'comprobar tú si vuelas en entorno urbano, y qué obligaciones tienes si es así.',
  'layer.description.infraestructuras':
    'Protección de infraestructuras críticas: ferrocarril, carreteras, energía, agua, puertos, hospitales, etc.',

  'verticalRef.AGL': 'sobre el terreno',
  'verticalRef.AMSL': 'sobre el nivel del mar',
  'verticalRef.W84': 'sobre el elipsoide WGS-84',
  'verticalRef.UNKNOWN': '(referencia no indicada)',

  'level.LIBRE': 'Puedes volar',
  'level.CONDICIONES': 'Con condiciones',
  'level.AUTORIZACION': 'Necesitas autorización',
  'level.PROHIBIDO': 'No puedes volar',
  'level.DESCONOCIDO': 'Sin comprobar del todo',

  /* --- Motor de decisión (verdict.ts) ------------------------------- */

  'verdict.headline.LIBRE': 'Puedes volar',
  'verdict.headline.CONDICIONES': 'Puedes volar, con condiciones',
  'verdict.headline.AUTORIZACION': 'Necesitas autorización',
  'verdict.headline.PROHIBIDO': 'No puedes volar',
  'verdict.headline.DESCONOCIDO': 'No se ha podido comprobar',

  'verdict.vertical.referenceMissing':
    'Esta zona mide sus alturas desde el punto de referencia del aeródromo, pero ENAIRE no ' +
    'publica a qué altitud está. Sin ese dato no se puede calcular si te afecta o no, así que ' +
    'se considera que sí. Consulta el texto oficial y coordina con el gestor.',
  'verdict.vertical.referenceNoTerrain':
    'Esta zona mide sus alturas desde el punto de referencia del aeródromo y no se ha podido ' +
    'obtener la elevación del terreno en tu punto, así que se considera que te afecta.',
  'verdict.vertical.notConvertible':
    'No se ha podido convertir con seguridad la franja de alturas de esta zona ' +
    '(falta la elevación del terreno o la referencia vertical). Se considera que te afecta.',
  'verdict.vertical.originReference': (arp: string, terreno: string, suelo: string) =>
    ` Esta zona mide sus alturas desde el punto de referencia del aeródromo (${arp} m sobre el nivel del mar), no desde el suelo: en tu punto el terreno está a ${terreno} m, así que la zona empieza a ${suelo} m por encima de ti.`,
  'verdict.vertical.originTerrain': ' Calculado con la elevación real del terreno en este punto.',
  'verdict.vertical.above': (suelo: string, vuelo: string) =>
    `Esta zona empieza a ${suelo} m sobre el terreno, por encima de los ${vuelo} m a los que piensas volar.`,
  'verdict.vertical.underground':
    'El techo de esta zona queda por debajo del nivel del terreno en este punto, así que no aplica a tu vuelo.',
  'verdict.vertical.noCeiling': 'sin techo declarado',
  'verdict.vertical.ceilingAt': (techo: string) => `hasta ${techo} m sobre el terreno`,
  'verdict.vertical.inside': (vuelo: string, suelo: string, techo: string) =>
    `Tu vuelo (0 → ${vuelo} m sobre el terreno) entra en la franja de esta zona (desde ${suelo} m, ${techo}).`,

  'verdict.timing.expired': (fecha: string) =>
    `ENAIRE indica que esta zona dejó de estar vigente el ${fecha}.`,
  'verdict.timing.scheduled': (fecha: string) => `Esta zona entra en vigor el ${fecha}.`,
  'verdict.timing.days': (dias: string) => `días: ${dias}`,
  'verdict.timing.hours': (desde: string, hasta: string) => `horario: ${desde} a ${hasta}`,
  'verdict.timing.limited': (detalle: string) =>
    `Esta zona tiene condiciones de aplicación limitadas${detalle}. Comprueba el texto oficial antes de volar.`,

  'verdict.incompleteNote': (n: number) =>
    ` No se ${plural(n, 'ha', 'han')} podido consultar ${n} de las 3 capas oficiales de ENAIRE.`,
  'verdict.summary.unknown':
    'No se ha podido comprobar este punto por completo.',
  'verdict.summary.unknownRetry':
    ' Vuelve a intentarlo con mejor cobertura: hasta entonces, da por hecho que puede haber restricciones.',
  'verdict.summary.freeWithZonesAbove': (vuelo: string, n: number) =>
    `No hay ninguna zona geográfica UAS que te afecte volando hasta ${vuelo} m sobre el terreno. ` +
    `Sí hay ${n} ${plural(n, 'zona', 'zonas')} en este punto, pero ${plural(n, 'empieza', 'empiezan')} por encima de esa altura.`,
  'verdict.summary.free':
    'ENAIRE no publica ninguna zona geográfica UAS que te afecte en este punto. Siguen aplicando las reglas generales de la categoría en la que operes.',
  'verdict.summary.prohibited': (n: number) =>
    `Estás dentro de ${n} ${plural(n, 'zona prohibida', 'zonas prohibidas')} para drones. No vueles aquí.`,
  'verdict.summary.authorization': (n: number) =>
    `Estás dentro de ${n} ${plural(n, 'zona que exige', 'zonas que exigen')} permiso previo. Sin esa autorización el vuelo no es legal.`,
  'verdict.summary.conditional': (n: number) =>
    `Estás dentro de ${n} ${plural(n, 'zona con condiciones', 'zonas con condiciones')}. Puedes volar si cumples lo que indica cada una.`,
  'verdict.summary.review': 'Revisa las zonas listadas antes de volar.',
  'verdict.summary.allAtOnce': (n: number) =>
    ` En total te ${plural(n, 'afecta', 'afectan')} ${n} ${plural(n, 'zona', 'zonas')}: se cumplen todas a la vez, no vale con la menos restrictiva.`,

  'verdict.maxFree.unknownLayer': 'No se ha podido determinar: falta consultar alguna capa oficial.',
  'verdict.maxFree.unknownBand': (zona: string) =>
    `No se puede calcular hasta qué altura puedes subir sin permiso: la franja de "${zona}" no se ha podido determinar.`,
  'verdict.maxFree.none': (zona: string) =>
    `Aquí no puedes volar a ninguna altura sin autorización (${zona}).`,
  'verdict.maxFree.legalLimit': (metros: number) =>
    `Puedes subir hasta ${metros} m, el límite general de la categoría abierta.`,
  'verdict.maxFree.limitedBy': (metros: number, zona: string) =>
    `Puedes subir hasta ${metros} m sin pedir permiso. Por encima, ${zona}.`,

  'verdict.advice.advisory':
    'Esto no es una zona concreta: ENAIRE lo publica cubriendo todo el país como recordatorio. ' +
    'Mira a tu alrededor y decide si estás en entorno urbano según la definición del texto oficial; ' +
    'si lo estás, cumple lo que indica antes de volar.',
  'verdict.advice.prohibited': 'No vueles. Esta zona está prohibida para drones.',
  'verdict.advice.authorizationContact': (contacto: string) =>
    `Solicita autorización antes de volar. Contacto publicado por ENAIRE: ${contacto}.`,
  'verdict.advice.authorization':
    'Solicita autorización antes de volar. ENAIRE no publica un contacto directo para esta zona: ' +
    'consulta el texto oficial y, si no queda claro, pregunta a AESA o al gestor de la zona.',
  'verdict.advice.conditionalContact': (contacto: string) =>
    `Puedes volar cumpliendo las condiciones del texto oficial. Contacto: ${contacto}.`,
  'verdict.advice.conditional':
    'Puedes volar, pero cumpliendo las condiciones que figuran en el texto oficial de esta zona.',
  'verdict.advice.noRestriction': 'Esta zona no añade restricciones.',
  'verdict.advice.unknown':
    'ENAIRE no ha clasificado esta zona. Trátala como restringida y consulta el texto oficial.',

  'verdict.band.undetermined': 'Franja de alturas no determinada',
  'verdict.band.noCeiling': 'sin techo',
  'verdict.band.range': (desde: string, hasta: string) => `De ${desde} a ${hasta} sobre el terreno`,
  'verdict.band.shortUndetermined': 'alturas sin determinar',
  'verdict.band.shortFrom': (desde: string) => `desde ${desde} m`,
  'verdict.band.shortRange': (desde: string, hasta: string) => `de ${desde} a ${hasta} m`,

  /* --- Consulta y errores (query.ts, api/) -------------------------- */

  'query.timeout':
    'ENAIRE está tardando demasiado en responder y no tienes descargada esta zona para volar sin cobertura.',
  'zone.untitled': (capa: string) => `Zona ${capa.toLowerCase()}`,
  'zone.titled': (capa: string, id: string) => `${capa} ${id}`,

  /* --- Tiempo y viento (weather.ts) --------------------------------- */

  'weather.headline.danger': 'Mejor no volar ahora',
  'weather.headline.caution': 'Se puede volar con cuidado',
  'weather.headline.ok': 'Buenas condiciones para volar',
  'weather.note.gustDanger': (racha: string, dron: string, limite: string) =>
    `Rachas de ${racha} m/s: por encima de lo que aguanta ${dron} (unos ${limite} m/s).`,
  'weather.note.gustCaution': (racha: string) =>
    `Rachas de ${racha} m/s. Se vuela, pero el dron irá justo y la batería durará menos.`,
  'weather.note.rain': (mm: string) =>
    `Está lloviendo (${mm} mm). La mayoría de drones no son estancos.`,
  'weather.note.visibility': (km: number) =>
    `Visibilidad de ${km} km. Volar en alcance visual exige verlo bien en todo momento.`,
  'weather.note.night': 'Ya ha anochecido: el vuelo nocturno tiene requisitos añadidos.',
  'weather.note.sunsetSoon': (min: number) => `Quedan ${min} min para el ocaso.`,
  'weather.note.allGood': 'Viento flojo, sin lluvia y con buena visibilidad.',

  /* --- Sol y sombras (sun.ts) --------------------------------------- */

  'sun.light.noche': 'Noche',
  'sun.light.azul': 'Hora azul',
  'sun.light.dorada': 'Hora dorada',
  'sun.light.dia': 'Luz de día',
  /** Rosa de los vientos, empezando por el norte y en sentido horario. */
  'sun.compass': 'N,NNE,NE,ENE,E,ESE,SE,SSE,S,SSO,SO,OSO,O,ONO,NO,NNO',

  /* --- Mapa de altura libre (offline/coverage.ts) ------------------- */

  'coverage.legend.max': 'Hasta 120 m',
  'coverage.legend.high': '60 – 119 m',
  'coverage.legend.mid': '30 – 59 m',
  'coverage.legend.low': 'Menos de 30 m',
  'coverage.legend.none': 'Nada sin permiso',
  'coverage.legend.unknown': 'Sin determinar',

  /* --- Pestañas ----------------------------------------------------- */

  'tab.here': 'Volar aquí',
  'tab.map': 'Mapa',
  'tab.search': 'Buscar',
  'tab.notebook': 'Cuaderno',
  'tab.settings': 'Ajustes',

  /* --- Tiempo relativo (HistoryContext) ----------------------------- */

  'timeAgo.now': 'ahora',
  'timeAgo.justNow': 'ahora mismo',
  'timeAgo.minutes': (n: number) => `hace ${n} min`,
  'timeAgo.hours': (n: number) => `hace ${n} h`,
  'timeAgo.yesterday': 'ayer',
  'timeAgo.days': (n: number) => `hace ${n} días`,

  /* --- Tarjeta del veredicto ---------------------------------------- */

  'verdictCard.a11y': (titular: string, resumen: string) => `${titular}. ${resumen}`,
  'verdictCard.a11ySoftened': (titular: string, espacio: string, resumen: string) =>
    `${titular}, pero estás en ${espacio}. ${resumen}`,
  'verdictCard.favoriteAdd': 'Guardar en favoritos',
  'verdictCard.favoriteRemove': 'Quitar de favoritos',
  'verdictCard.refresh': 'Volver a consultar',
  'verdictCard.protectedNote': (espacio: string, figura: string) =>
    `ENAIRE no restringe este punto, pero estás en ${espacio}${figura}, donde volar suele estar prohibido o exigir permiso del gestor. Mira más abajo.`,
  'verdictCard.notams': (n: number) =>
    `${n} NOTAM en vigor · revisa abajo`,
  'verdictCard.heightA11y': (metros: number) =>
    `Altura de vuelo: ${metros} metros sobre el terreno. Tocar para cambiar.`,
  'verdictCard.heightLabel': (metros: number) => `hasta ${metros} m sobre el terreno`,
  'verdictCard.heightHint':
    'Las zonas que empiezan por encima de esta altura dejan de contar. Cambiarla cambia la respuesta de verdad.',
  'verdictCard.queriedAt': (cuando: string) => `Consultado a ENAIRE ${cuando}`,
  'verdictCard.noHeight': 'Ni a ras de suelo puedes volar aquí sin autorización.',
  'verdictCard.freeSuffix': 'sin pedir permiso',
  'verdictCard.freeLegal': 'Es el límite general de la categoría abierta, no hay ninguna zona por debajo.',
  'verdictCard.freeLimitedBy': (zona: string) => `Por encima entras en ${zona}.`,
  'verdictPill.free': (metros: number, n: number) =>
    `Hasta ${metros} m sin permiso · ${n} ${n === 1 ? 'zona' : 'zonas'}`,
  'verdictPill.blocked': (n: number) =>
    `Sin autorización, aquí no se vuela · ${n} ${n === 1 ? 'zona' : 'zonas'}`,
  'verdictPill.zones': (n: number) => `${n} ${n === 1 ? 'zona te afecta' : 'zonas te afectan'}`,

  /* --- Pantalla de resultado ---------------------------------------- */

  'result.offlineBanner': (fecha: string) =>
    `Sin conexión: resuelto con la zona que descargaste${fecha}.`,
  'result.offlineElevation': (margen: number) =>
    ` La elevación del terreno es interpolada (±${margen} m, aplicada hacia el lado restrictivo) y `,
  'result.offlineNotams': 'no se han podido consultar los NOTAM',
  'result.offlineNotamsTail': ', que son avisos temporales y cambian a diario.',
  'result.incomplete': (capas: string) =>
    `No ha respondido ${capas}. Esta comprobación está incompleta: no la des por buena.`,
  'result.noTerrain':
    'No se ha podido obtener la elevación del terreno en este punto. Las zonas con límites referidos al nivel del mar se muestran como si te afectaran, por prudencia.',
  'result.directions': 'Cómo llegar',
  'result.logged': 'Registrado',
  'result.logFlight': 'Registrar vuelo',
  'result.share': 'Compartir',
  'result.openEnaire': 'Ver en ENAIRE',
  'result.light': 'Luz y sombras aquí',
  'result.affectingOne': 'La zona que te afecta',
  'result.affectingMany': (n: number) => `Las ${n} zonas que te afectan`,
  'result.notAffecting': (n: number) =>
    `${n} ${n === 1 ? 'zona que no te afecta' : 'zonas que no te afectan'} a esta altura`,
  'result.advisories': 'Avisos de ENAIRE para toda España',
  'result.expired': 'Zonas ya no vigentes',
  'result.dataTitle': 'Datos y fuentes de esta consulta',
  'result.coords': 'Coordenadas',
  'result.accuracy': 'Precisión de la posición',
  'result.terrain': 'Elevación del terreno',
  'result.terrainUnavailable': 'No disponible',
  'result.metresAmsl': (m: number) => `${m} m sobre el nivel del mar`,
  'result.metresAgl': (m: number) => `${m} m sobre el terreno`,
  'result.droneReaches': 'Tu dron llegaría a',
  'result.zonesHere': 'Zonas en el punto',
  'result.zonesHereValue': (n: number, avisos: number) => `${n} (+${avisos} aviso general)`,
  'result.queriedAt': 'Consultado',
  'result.sourceZones': 'Zonas',
  'result.sourceElevation': 'Elevación',
  'result.disclaimer':
    'Consulta en directo los servicios oficiales de ENAIRE, pero no los sustituye: los horarios de los NOTAM vienen en texto libre y hay que leerlos. La responsabilidad del vuelo siempre es del piloto. ',
  'result.openEnaireDrones': 'Abrir ENAIRE Drones',

  /* --- Tarjeta de zona ---------------------------------------------- */

  'zoneCard.advisorySubtitle': 'Aviso de ENAIRE para toda España',
  'zoneCard.subtitle': (tipo: string, franja: string) => `${tipo} · ${franja}`,
  'zoneCard.a11y': (titulo: string, subtitulo: string) => `${titulo}. ${subtitulo}`,
  'zoneCard.chipAdvisory': 'Aviso general',
  'zoneCard.chipReferencePoint': 'Alturas desde el aeródromo',
  'zoneCard.chipExpired': 'No vigente',
  'zoneCard.chipLimited': 'Aplicación limitada',
  'zoneCard.requestButton': 'Preparar solicitud por correo',
  'zoneCard.requestMissing': (faltan: string) =>
    `Se abrirá tu correo con la solicitud redactada. Te falta por rellenar en Ajustes: ${faltan}; esos huecos aparecerán como [COMPLETAR].`,
  'zoneCard.requestReady':
    'Se abrirá tu app de correo con la solicitud ya redactada y tus datos rellenados. Revísala antes de enviarla: la envías tú, no la app.',
  'zoneCard.requestSpanish': 'La solicitud se redacta en español: va dirigida al gestor de la zona.',
  'zoneCard.officialDetail': 'Detalle oficial de ENAIRE',
  'zoneCard.noOfficialText':
    'ENAIRE no publica un texto descriptivo para esta zona. La información disponible es la de los campos estructurados que aparecen debajo.',
  'zoneCard.techIdentifier': 'Identificador',
  'zoneCard.techType': 'Tipo (ED-318)',
  'zoneCard.techReasons': 'Motivos',
  'zoneCard.techLimits': 'Límites publicados',
  'zoneCard.techLayer': 'Capa',
  'zoneCard.techUpdated': 'Actualizada',

  /* --- Datos del operador que faltan (request.ts) ------------------- */

  'operator.missing.name': 'tu nombre',
  'operator.missing.uasNumber': 'tu número de operador UAS',
  'operator.missing.email': 'tu correo',
  'operator.missing.phone': 'tu teléfono',
  'operator.missing.droneModel': 'el modelo del dron',

  /* --- Tarjeta del dron --------------------------------------------- */

  'droneCard.title': 'Tu dron',
  'droneCard.rulesTitle': 'Lo que te aplica a ti',
  'droneCard.disclaimer':
    'Las zonas geográficas UAS aplican igual a todos los drones: pesar poco no exime de ninguna. Esto sólo cambia las reglas generales que te enseña la app.',

  'zone.advisoryTitle': 'Entorno urbano: compruébalo antes de volar',
  'error.enaireRejected': 'El servicio de ENAIRE ha rechazado la petición',
  'error.enaire': 'Error del servicio de ENAIRE',
  'error.cancelled': 'Consulta cancelada',
  'error.downloadCancelled': 'Descarga cancelada',
  'offline.terrainSource': 'Rejilla descargada (Copernicus DEM vía Open-Meteo)',

  /* --- Minimapa, proximidad, espacios protegidos -------------------- */

  'miniMap.a11y': (lat: string, lon: string) => `Mapa del punto consultado: ${lat}, ${lon}`,
  'miniMap.loading': 'Cargando el mapa…',
  'miniMap.open': 'Ver en el mapa',

  'proximity.title': 'Margen hasta la siguiente zona',
  'proximity.none': (km: number) =>
    `No hay ninguna zona que exija permiso en ${km} km a la redonda. Tienes sitio de sobra.`,
  'proximity.upTo': (zona: string) => `hasta ${zona}`,
  'proximity.close':
    'Estás muy cerca del borde. Con viento o perdiendo de vista el dron es fácil entrar sin darte cuenta: vuela hacia el lado contrario y deja margen.',
  'proximity.footnote':
    'Distancia al borde más próximo, calculada sobre la geometría de ENAIRE simplificada a unos 10 m. Orientativa: no la uses para apurar.',
  /** Rumbos cardinales, empezando por el norte y girando en sentido horario. */
  'bearing.points': 'al norte,al noreste,al este,al sureste,al sur,al suroeste,al oeste,al noroeste',

  'protected.title': 'Espacios naturales protegidos',
  'protected.failed':
    'No se ha podido consultar el inventario de espacios protegidos. Compruébalo por tu cuenta si vas a volar en campo abierto.',
  'protected.none': 'Este punto no está dentro de ningún espacio protegido ni de Red Natura 2000.',
  'protected.insideOne': 'Estás dentro de un espacio protegido.',
  'protected.insideMany': (n: number) => `Estás dentro de ${n} espacios protegidos.`,
  'protected.managedBy': (organismo: string) => `Lo gestiona ${organismo}`,
  'protected.strict':
    'En parques y reservas el vuelo suele estar prohibido, o exige permiso del gestor del espacio. Pídelo antes de ir.',
  'protected.loose':
    'Cada espacio tiene sus propias normas (PRUG o PORN): el vuelo puede estar prohibido, exigir autorización o estar permitido. Pregunta al organismo que lo gestiona.',
  'protected.footnote': (fuente: string) =>
    `Fuente: ${fuente}. Es información ambiental, aparte de las zonas de ENAIRE: no cambia el veredicto de arriba, se suma a él.`,

  /* --- Tiempo, NOTAM y modo sin cobertura --------------------------- */

  'weather.title': 'Condiciones de vuelo',
  'weather.metric.gusts': 'rachas',
  'weather.metric.wind': 'viento',
  'weather.metric.temp': 'temp.',
  'weather.metric.sunset': 'ocaso',
  'weather.nextHours': 'Próximas horas',
  'weather.now': 'Ahora',
  'weather.hourSuffix': (hora: string) => `${hora}h`,
  'weather.gustsPerHour': 'Rachas en m/s, por hora.',
  'weather.footnote': (fuente: string) =>
    `Datos de ${fuente} en superficie. A la altura a la que vuelas sopla más. Los umbrales son orientativos: manda el manual de tu dron.`,

  'notam.title': 'Avisos temporales (NOTAM)',
  'notam.failed':
    'No se han podido consultar los NOTAM. Compruébalos en el visor oficial antes de volar.',
  'notam.openEnaire': 'Abrir ENAIRE Drones',
  'notam.none': 'No hay ningún NOTAM publicado sobre este punto.',
  'notam.active': (activos: number, futuros: string) =>
    `${activos} ${activos === 1 ? 'aviso en vigor' : 'avisos en vigor'} sobre este punto${futuros}.`,
  'notam.andUpcoming': (n: number) => ` y ${n} más por venir`,
  'notam.upcoming': (n: number) =>
    `${n} ${n === 1 ? 'aviso programado' : 'avisos programados'} sobre este punto.`,
  'notam.chipActive': 'En vigor',
  'notam.chipScheduled': 'Programado',
  'notam.rowSchedule': 'Horario',
  'notam.rowLevels': 'Alturas',
  'notam.rowEquals': 'Equivale a',
  'notam.footnote':
    'Fuente: servicio de NOTAM para UAS de ENAIRE. El horario viene en texto libre y no se interpreta: léelo. Un NOTAM en vigor puede prohibir el vuelo aunque las zonas salgan en verde.',

  'offline.title': 'Volar sin cobertura',
  'offline.packSummary': (km: number, zonas: number, mb: string) =>
    `${km} km de radio · ${zonas} zonas · ${mb} MB`,
  'offline.downloaded': (cuando: string) => `Descargada ${cuando}.`,
  'offline.stale': ' Las zonas de ENAIRE cambian: conviene volver a descargarla antes de fiarte.',
  'offline.fresh': ' Si te quedas sin datos dentro de esa área, la app responde igual.',
  'offline.noElevation':
    'No se pudo descargar la elevación del terreno de esta zona. Sin ella, toda zona referida al nivel del mar se trata como si te afectara. Vuelve a descargarla con mejor conexión para tener el margen exacto.',
  'offline.change': 'Cambiar zona',
  'offline.delete': 'Borrar',
  'offline.empty':
    'Elige en el mapa la zona donde vas a volar y descárgala. Dentro de esa área la app sigue respondiendo aunque te quedes sin datos móviles.',
  'offline.pick': 'Elegir zona en el mapa',
  'offline.notamsFootnote':
    'Los NOTAM no se descargan: cambian a diario y uno viejo es peor que ninguno. Sin cobertura la app te avisa de que faltan.',
  'offline.coverageTitle': 'Mapa de altura libre',
  'offline.coverageBody':
    'Pinta el mapa por colores según hasta dónde puedes subir en cada punto. Se calcula con esta zona descargada.',

  /* --- Controles sueltos -------------------------------------------- */

  'height.other': 'Otra',
  'height.otherA11y': 'Otra altura',
  'height.flyAtA11y': (altura: string) => `Volar a ${altura}`,
  'height.down10': 'Bajar 10 metros',
  'height.up10': 'Subir 10 metros',
  'height.inputA11y': 'Altura de vuelo en metros',
  'sheet.collapse': 'Plegar el detalle',
  'sheet.expand': 'Ver el detalle',
  'history.savedPoint': 'Punto guardado',
  'history.a11y': (sitio: string, veredicto: string, cuando: string) =>
    `${sitio}. ${veredicto}. Consultado ${cuando}.`,
  'history.line': (veredicto: string, metros: number, cuando: string) =>
    `${veredicto} · a ${metros} m · ${cuando}`,
  'favorites.a11y': (sitio: string, veredicto: string) => `${sitio}. ${veredicto}.`,
  'favorites.removeA11y': (sitio: string) => `Quitar ${sitio} de favoritos`,

  /* --- Cuaderno y diario -------------------------------------------- */

  'notebook.title': 'Cuaderno',
  'notebook.subtitle':
    'Tus sitios guardados, tus vuelos registrados y la normativa, todo en un mismo sitio.',
  'notebook.favorites': 'Favoritos',
  'notebook.favoritesEmpty':
    'Guarda un sitio tocando la estrella en cualquier resultado — el campo donde entrenas, la finca de un cliente — para tenerlo siempre a mano aquí.',
  'notebook.logTitle': 'Diario de vuelos',
  'notebook.logCount': (n: number) => `${n} vuelo${n === 1 ? '' : 's'} registrado${n === 1 ? '' : 's'}.`,
  'notebook.logLast': (sitio: string, veredicto: string, cuando: string) =>
    `Último: ${sitio} · ${veredicto} · ${cuando}`,
  'notebook.logEmpty':
    'Todavía no has registrado ningún vuelo. Desde el resultado de cualquier consulta, toca "Registrar vuelo" después de volar.',
  'notebook.openLogFull': 'Abrir diario completo',
  'notebook.openLog': 'Abrir diario',
  'notebook.rulesTitle': 'Normativa',
  'notebook.rulesBody':
    'Lo esencial de la normativa española y europea, la categoría que te aplica según tu dron, y de dónde sale cada dato de esta app.',
  'notebook.rulesButton': 'Ver normas',

  'log.title': 'Diario de vuelos',
  'log.subtitle':
    'Registro personal de dónde y cuándo has volado. No sustituye al libro de operaciones oficial que exige AESA, pero te ahorra reconstruirlo de memoria.',
  'log.emptyTitle': 'Todavía no has registrado ningún vuelo',
  'log.emptySubtitle':
    'Desde el resultado de cualquier consulta, toca "Registrar vuelo" después de volar.',
  'log.export': 'Exportar diario',
  'log.entryLine': (veredicto: string, metros: number, dron: string) =>
    `${veredicto} · ${metros} m · ${dron}`,
  'log.deleteEntry': 'Borrar esta entrada del diario',
  'log.clearAll': 'Borrar todo el diario',

  /* --- Normas y resultado ------------------------------------------- */

  'rules.title': 'Normas y fuentes',
  'rules.subtitle':
    'Lo esencial de la normativa española y europea, y de dónde sale cada dato de esta app.',
  'rules.dataTitle': 'De dónde salen los datos',
  'rules.dataBody':
    'Las zonas se consultan en tiempo real al servicio oficial de ENAIRE (Zonas Geográficas UAS, formato ED-318). La app no guarda una copia propia de las zonas ni pasa por ningún servidor intermedio: el móvil habla directamente con ENAIRE, así que siempre ves el dato vigente.',
  'rules.dataElevation': (fuente: string) =>
    `La elevación del terreno viene de ${fuente} y se usa para convertir los límites referidos al nivel del mar en altura real sobre el suelo. La búsqueda de lugares usa OpenStreetMap.`,
  'rules.disclaimer':
    'Esta aplicación es una herramienta de consulta independiente. No sustituye a los servicios oficiales de ENAIRE ni a la normativa: la responsabilidad de comprobar que un vuelo es legal y seguro es siempre del piloto. Comprueba también los NOTAM antes de volar.',
  'rules.spanishSources':
    'Los documentos oficiales están en español: los enlaces llevan al original.',

  'point.title': 'Punto consultado',
  'point.invalidCoords': 'No se han recibido coordenadas válidas.',
  'point.unexpectedError': 'Error inesperado',
  'point.retry': 'Reintentar',
  'point.favoriteChanged': (antes: string, ahora: string) =>
    `Esto ha cambiado desde que lo guardaste en favoritos: antes era «${antes}», ahora es «${ahora}».`,

  /* --- Pantalla «Volar aquí» ---------------------------------------- */

  'home.title': '¿Puedo volar aquí?',
  'home.recheck': 'Comprobar mi ubicación otra vez',
  'home.subtitle':
    'Comprueba tu punto exacto contra las Zonas Geográficas UAS oficiales de ENAIRE.',
  'home.locating': 'Buscando tu posición…',
  'home.querying': 'Consultando a ENAIRE…',
  'home.check': 'Comprobar mi ubicación',
  'home.stale':
    'Este resultado tiene más de 10 minutos. Si te has movido o ha pasado un rato, vuelve a comprobarlo antes de despegar.',
  'home.noPermission':
    'Necesito acceso a tu ubicación para comprobar dónde estás. Puedes activarlo en los ajustes del móvil, o usar las pestañas Mapa y Buscar para consultar un punto a mano.',
  'home.noFixDetail': (motivo: string) => `No se ha podido obtener tu ubicación: ${motivo}`,
  'home.noFix': 'No se ha podido obtener tu ubicación.',
  'home.heightTitle': 'Altura de vuelo',
  'home.heightHint':
    'Metros sobre el terreno. Las zonas que empiezan por encima de esta altura no cuentan: cambiarla cambia la respuesta de verdad.',
  'home.historyEmptyTitle': 'Aún no has consultado ningún punto',
  'home.historyEmptySubtitle':
    'Pulsa el botón de arriba para saber si puedes despegar donde estás, o busca un sitio concreto.',
  'home.historyTitle': 'Últimas consultas',

  /* --- Buscar -------------------------------------------------------- */

  'search.title': 'Buscar un lugar',
  'search.subtitle': 'Una dirección, un municipio o unas coordenadas, para consultar ese punto.',
  'search.placeholder': 'Ej. Playa de la Malvarrosa, o 39.47, -0.32',
  'search.a11y': 'Buscar un lugar',
  'search.clear': 'Borrar búsqueda',
  'search.failed': 'No se ha podido buscar. Comprueba tu conexión e inténtalo de nuevo.',
  'search.results': 'Resultados',
  'search.noResults': 'No se ha encontrado ningún lugar con ese nombre en España.',
  'search.recent': 'Últimas consultas',
  'search.emptyTitle': 'Busca cualquier punto de España',
  'search.emptySubtitle':
    'También puedes pegar unas coordenadas directamente, por ejemplo 39.47, -0.32.',

  /* --- Ajustes ------------------------------------------------------- */

  'settings.title': 'Ajustes',
  'settings.preferences': 'Preferencias',
  'settings.appearance': 'Aspecto',
  'settings.appearanceA11y': (aspecto: string) => `Aspecto ${aspecto}`,
  'settings.appearance.sistema': 'Automático',
  'settings.appearance.claro': 'Claro',
  'settings.appearance.oscuro': 'Oscuro',
  'settings.language': 'Idioma',
  'settings.language.system': 'Automático',
  'settings.languageA11y': (idioma: string) => `Idioma ${idioma}`,
  'settings.languageNote':
    'Cambia la interfaz. Los textos oficiales de ENAIRE, los NOTAM y los espacios protegidos siguen llegando en español: son la norma, y traducirlos sería reescribirla.',
  'settings.defaultHeight': 'Altura de vuelo por defecto',
  'settings.yourData': 'Tus datos',
  'settings.operatorAndAircraft': 'Operador y aeronave',
  'settings.missing': (n: number) => `Faltan ${n}`,
  'settings.dataNote':
    'Se usan para redactar las solicitudes de autorización. Se guardan sólo en este móvil.',
  'settings.field.name': 'Nombre o razón social',
  'settings.field.namePlaceholder': 'Jorge Cuadrado',
  'settings.field.uas': 'Número de operador UAS (AESA)',
  'settings.field.email': 'Correo de contacto',
  'settings.field.emailPlaceholder': 'tucorreo@ejemplo.com',
  'settings.field.phone': 'Teléfono de contacto',
  'settings.field.droneModel': 'Modelo del dron',
  'settings.field.droneSerial': 'Número de serie',
  'settings.field.droneSerialPlaceholder': 'El de la caja o de la app del fabricante',
  'settings.missingNote': (faltan: string) =>
    `Sin ${faltan}, las solicitudes saldrán con huecos marcados como [COMPLETAR].`,
  'settings.privacy':
    'Nada de esto sale de tu móvil. La app no tiene servidor propio ni envía correos por su cuenta: abre tu aplicación de correo con el texto redactado para que lo mandes tú.',

  /* --- Mapas base ---------------------------------------------------- */

  'basemap.mapa': 'Mapa',
  'basemap.topo': 'Topográfico',
  'basemap.satelite': 'Satélite',
  'basemap.note.mapa': 'Callejero de OpenStreetMap',
  'basemap.note.topo': 'MTN oficial del IGN, con curvas de nivel',
  'basemap.note.satelite': 'Ortofoto PNOA del IGN',

  /* --- Luz y sombras -------------------------------------------------- */

  'light.title': 'Luz y sombras',
  'light.preparingMap': 'Preparando el mapa…',
  'light.timeOfDay': 'Hora del día',
  'light.altitude': (grados: string) => `${grados}° de altura`,
  'light.bearing': (rumbo: string, grados: string) => `${rumbo} · ${grados}°`,
  'light.jump.sunrise': 'Amanecer',
  'light.jump.golden': 'Dorada',
  'light.jump.sunset': 'Ocaso',
  'light.jump.now': 'Ahora',
  'light.day': 'Día',
  'light.today': 'Hoy',
  'light.hours': 'Horas de luz',
  'light.blueMorning': 'Hora azul (mañana)',
  'light.sunrise': 'Amanecer',
  'light.goldenMorning': 'Hora dorada (mañana)',
  'light.solarNoon': 'Mediodía solar',
  'light.goldenEvening': 'Hora dorada (tarde)',
  'light.sunset': 'Ocaso',
  'light.blueEvening': 'Hora azul (tarde)',
  'light.terrainTitle': 'El sol contra el terreno',
  'light.overTheHill': 'Sale por encima del monte',
  'light.behindTheHill': 'Se esconde tras el monte',
  'light.blockedBy': (grados: string) => ` · te tapa ${grados}°`,
  'light.terrainNote':
    'Calculado muestreando la elevación real hasta 20 km en las direcciones por las que cae el sol, con corrección de curvatura y refracción. Es el ocaso que vas a ver tú, no el de la tabla.',
  'light.terrainPitch':
    'El ocaso de las tablas es el de un mundo llano. En un valle el sol se esconde tras el monte mucho antes: esto calcula la hora de verdad con el relieve que tienes alrededor.',
  'light.measuring': 'Midiendo el relieve…',
  'light.calculate': 'Calcular con el terreno',
  'light.shadows': 'Sombras',
  'light.objectHeight': 'la altura del objeto',
  'light.shadowExample': (metros: string, rumbo: string) =>
    `Un árbol de 8 m proyecta ${metros} m de sombra hacia el ${rumbo}.`,
  'light.noShadows': 'Con el sol en el horizonte o por debajo no hay sombras que medir.',

  /* --- Mapa, objetivo fotográfico y descarga -------------------------- */

  'map.preparing': 'Preparando el mapa oficial…',
  'map.querying': 'Consultando el punto de la cruz…',
  'map.queryFailed': 'No se ha podido consultar',
  'map.moveToQuery': 'Mueve el mapa para consultar un punto',
  'map.lightHere': 'Luz y sombras en este punto',
  'map.layers': 'Capas del mapa',
  'map.photoTarget': 'Quiero fotografiar esto: buscar desde dónde volar',
  'map.centerOnMe': 'Centrar en mi ubicación',
  'map.heightChip': (metros: number) => `hasta ${metros} m`,
  'map.resultHere': 'El resultado aparecerá aquí.',
  'map.webTitle': 'Mapa de zonas UAS',

  'photo.title': 'Objetivo marcado',
  'photo.clear': 'Quitar el objetivo',
  'photo.searching': 'Buscando desde dónde puedes volar…',
  'photo.needsPack':
    'Para esto necesitas la zona descargada: la búsqueda mira miles de puntos y eso no se le puede preguntar a ENAIRE uno a uno. Descárgala en Ajustes → Volar sin cobertura.',
  'photo.flyFromTarget': 'Puedes volar desde el propio objetivo',
  'photo.flyFromTargetNote':
    'No necesitas moverte: ahí mismo se puede despegar sin pedir autorización.',
  'photo.spotHeight': (metros: number) => `Desde ahí puedes subir hasta ${metros} m sin autorización`,
  'photo.spotExact': '.',
  'photo.spotLess': (querias: number) => `, que es menos de los ${querias} m que querías.`,
  'photo.spotFar': ' Ojo: queda lejos para tener el objetivo a la vista.',
  'photo.nothing': (km: number) =>
    `No hay ningún punto donde volar sin autorización en ${km} km a la redonda, dentro de la zona que tienes descargada.`,
  'photo.openSpot': 'Consultar ese punto',

  'download.title': 'Elegir zona',
  'download.preparingMap': 'Preparando el mapa…',
  'download.moveHint': 'Mueve el mapa para colocar el círculo donde vayas a volar.',
  'download.radius': 'km de radio',
  'download.radiusA11y': (km: number) => `Radio de descarga: ${km} kilómetros`,
  'download.step.zonas': 'Descargando las zonas de ENAIRE…',
  'download.step.elevacion': 'Descargando la elevación del terreno…',
  'download.step.guardando': 'Guardando en el móvil…',
  'download.button': 'Descargar esta zona',
  'download.moveFirst': 'Mueve el mapa…',
  'download.failedDetail': (motivo: string) => `No se ha podido descargar: ${motivo}`,
  'download.failed': 'No se ha podido descargar.',
  'download.fallbackName': 'Zona descargada',
  'download.footnote':
    'Cuanto más grande, más tarda y más ocupa. Un radio de 25 km suele quedarse por debajo de 3 MB. Sustituye a la zona que tuvieras descargada.',

  'history.clear': 'Borrar historial',
  'geocode.manualCoords': 'Coordenadas introducidas manualmente',
  'error.unknown': 'Error desconocido',

  'map.pointFailed': 'No se ha podido consultar este punto.',

  /* --- Texto para compartir ------------------------------------------- */

  'share.headline': (veredicto: string, sitio: string) => `${veredicto} — ${sitio}`,
  'share.thisPoint': 'punto consultado',
  'share.coords': (lat: string, lon: string) => `Coordenadas: ${lat}, ${lon}`,
  'share.height': (metros: number) => `Altura de vuelo prevista: ${metros} m sobre el terreno`,
  'share.terrain': (metros: number) => `Elevación del terreno: ${metros} m sobre el nivel del mar`,
  'share.zones': (n: number) => `Zonas que afectan (${n}):`,
  'share.checkedAt': (cuando: string) =>
    `Consultado el ${cuando} a las Zonas Geográficas UAS de ENAIRE.`,
  'share.checkSource':
    'Comprueba siempre la fuente oficial antes de volar: https://drones.enaire.es/',
  'share.logTitle': (n: number) => `Diario de vuelos — ${n} vuelo(s) registrados`,
  'share.logEntry': (veredicto: string, metros: number, dron: string) =>
    `  ${veredicto} · ${metros} m · ${dron}`,
  'share.logCoords': (lat: string, lon: string) => `  Coordenadas: ${lat}, ${lon}`,
  'share.logFooter':
    'Generado con Zona Dron. Registro personal, no sustituye a ningún libro de vuelo oficial.',

  /* --- Entorno urbano (art. 40) --------------------------------------- */

  'urban.title': 'Entorno urbano',
  'urban.headline.urbano': 'Estás en entorno urbano',
  'urban.headline.probable': 'Posible entorno urbano',
  'urban.headline.parque': 'Estás en una zona verde urbana',
  'urban.headline.noDetectado': 'No hemos detectado entorno urbano',
  'urban.headline.sinRegion': 'Sin datos en esta comunidad',
  'urban.headline.sinDatos': 'No se ha podido comprobar',

  'urban.explain.urbano':
    'Las dos fuentes coinciden. Aplica el art. 40 del RD 517/2024: en categoría abierta no puedes sobrevolar edificios, casas ni sus patios y jardines, y tienes que mantener la distancia de seguridad de tu clase de dron. Si estás registrado como operador, comunica la operación al Ministerio del Interior con cinco días de antelación.',
  'urban.explain.probable':
    'Sólo una de las dos fuentes ve suelo urbano aquí. Puede ser una casa suelta en el campo, o una urbanización nueva que la cartografía todavía no recoge. Míralo a tu alrededor y, si hay edificios, cumple el art. 40 como si lo fuera.',
  'urban.explain.parque':
    'Los parques y jardines municipales de acceso público son entorno urbano por el supuesto c) del art. 40, aunque estén rodeados de césped. Aplican las mismas obligaciones que en el resto de la ciudad.',
  'urban.explain.noDetectado':
    'Ni el Catastro ni la ocupación del suelo ven aquí suelo urbano. Eso no es un permiso: comprueba a tu alrededor si hay edificios o gente, porque la norma habla de lo que hay en el sitio, no de lo que diga un mapa.',
  'urban.explain.sinRegion':
    'Navarra y el País Vasco tienen catastro propio y el servicio estatal no responde ahí, así que preferimos no darte media respuesta. Comprueba el planeamiento urbanístico de tu municipio.',
  'urban.explain.sinDatos':
    'Los servicios de Catastro y del IGN no han respondido. Vuelve a intentarlo con mejor cobertura, y mientras tanto da por hecho que puedes estar en entorno urbano.',

  'urban.case.a': 'Núcleo urbano consolidado',
  'urban.case.b': 'Área residencial, comercial o industrial',
  'urban.case.c': 'Área recreativa de acceso público',

  'urban.catastro.urbana': 'Parcela urbana',
  'urban.catastro.rustica': 'Parcela rústica',
  'urban.catastro.sinParcela': 'Sin parcela en este punto',
  'urban.catastro.sinServicio': 'No ha respondido',
  'urban.siose.none': 'Sin dato en este punto',

  'urban.readRule': 'Qué dice el art. 40',
  'urban.summaryFallback': 'Comprobado con Catastro y ocupación del suelo',
  'urban.footnote':
    'Cruce de dos fuentes oficiales: el Catastro dice si la parcela es urbana o rústica, y el SIOSE del IGN qué ocupa el suelo (datos de 2015, CC BY 4.0 scne.es). Es una indicación, no una determinación legal: el art. 40 exige además accesos rodados, viales pavimentados, saneamiento y alumbrado, y eso no está en ningún dato público.',

  /* --- Chincheta compartida desde Maps --------------------------------- */

  'sharedPoint.failedTitle': 'No hemos podido leer ese sitio',
  'sharedPoint.failedBody':
    'El enlace compartido no lleva coordenadas que podamos comprobar. Comparte la chincheta desde Google Maps o Apple Maps, o pega las coordenadas en Buscar.',

  'sharedPoint.emptyTitle': 'No ha llegado el sitio compartido',
  'sharedPoint.emptyBody':
    'La app se ha abierto desde el menú de compartir, pero no ha recibido el enlace. En iPhone esto pasa cuando la app está instalada por sideload con un Apple ID gratuito: Apple no deja que la extensión de compartir le pase datos a la app. Copia el enlace y pégalo en Buscar.',

  'urban.surrounded':
    'Bajo tus pies el mapa de usos ve una calle, pero lo que te rodea es suelo urbano.',

  'urban.enaireFallback':
    'ENAIRE publica un aviso general para toda España recordándote que compruebes si estás en entorno urbano. Es lo único que queda cuando no hay datos: míralo a tu alrededor.',
  'urban.enaireLabel': 'ENAIRE (aviso general)',
};
