/**
 * English interface strings.
 *
 * `Messages` forces this file to carry exactly the same keys as `es.ts`, with
 * the same arguments: a missing or mistyped translation is a compile error,
 * not something a user finds out about in the field.
 *
 * Official text (ENAIRE zones, NOTAMs, protected areas) is never translated —
 * it stays as published, in Spanish, whatever the interface language is.
 */

import type { es } from './es';

type Messages = {
  [K in keyof typeof es]: (typeof es)[K] extends (...args: infer A) => string
    ? (...args: A) => string
    : string;
};

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const en: Messages = {
  /* --- ED-318 codes in plain language (labels.ts) ------------------- */

  'zoneType.PROHIBITED': 'Prohibited',
  'zoneType.REQ_AUTHORIZATION': 'Authorization required',
  'zoneType.CONDITIONAL': 'Conditional',
  'zoneType.NO_RESTRICTION': 'No restriction',
  'zoneType.UNKNOWN': 'Unclassified',

  'zoneType.explain.PROHIBITED': 'You cannot fly here. This zone is closed to drones.',
  'zoneType.explain.REQ_AUTHORIZATION':
    'You can only fly here if you ask for permission first and it is granted. Without that authorization the flight is not legal.',
  'zoneType.explain.CONDITIONAL':
    'You can fly, but only if you meet specific conditions (height, distance, prior coordination…).',
  'zoneType.explain.NO_RESTRICTION': 'This zone adds no restrictions of its own.',
  'zoneType.explain.UNKNOWN': 'ENAIRE has not classified what kind of restriction this zone is.',

  'reason.AIR_TRAFFIC': 'Air traffic',
  'reason.SENSITIVE': 'Sensitive site',
  'reason.PRIVACY': 'Privacy',
  'reason.POPULATION': 'Populated area',
  'reason.NATURE': 'Natural area',
  'reason.NOISE': 'Noise',
  'reason.EMERGENCY': 'Emergency services',
  'reason.AIR_DEFENCE': 'Air defence',
  'reason.DANGEROUS_MATERIAL': 'Hazardous material',
  'reason.MILITARY': 'Military',
  'reason.OTHER': 'Other reasons',

  'reason.explain.AIR_TRAFFIC':
    'Manned aircraft or helicopters operate around here (controlled airspace, or a nearby airport or heliport).',
  'reason.explain.SENSITIVE': 'A sensitive or critical site is being protected.',
  'reason.explain.PRIVACY': "People's privacy is being protected.",
  'reason.explain.POPULATION': 'This is a crowd of people or an urban environment.',
  'reason.explain.NATURE': 'This is a protected natural area and wildlife can be disturbed.',
  'reason.explain.NOISE': 'Noise is restricted here.',
  'reason.explain.EMERGENCY': 'Emergency operations may be under way.',
  'reason.explain.AIR_DEFENCE': 'The zone is related to air defence.',
  'reason.explain.DANGEROUS_MATERIAL': 'There are hazardous materials in the area.',
  'reason.explain.MILITARY': 'This is an area of military interest.',
  'reason.explain.OTHER': 'ENAIRE groups other reasons here; check the official text.',
  'reason.fallback': (reason: string) => `Reason: ${reason}.`,

  'layer.aero': 'Aeronautical',
  'layer.urbano': 'Urban notice',
  'layer.infraestructuras': 'Infrastructure',

  'layer.description.aero':
    'Zones protecting the safety of the airspace: airports, heliports, controlled airspace, prohibited and restricted areas.',
  'layer.description.urbano':
    'A general notice from ENAIRE rather than a specific zone: it covers the whole country and ' +
    'reminds you to work out for yourself whether you are flying in an urban environment, and what that means for you.',
  'layer.description.infraestructuras':
    'Protection of critical infrastructure: railways, roads, energy, water, ports, hospitals and so on.',

  'verticalRef.AGL': 'above the ground',
  'verticalRef.AMSL': 'above sea level',
  'verticalRef.W84': 'above the WGS-84 ellipsoid',
  'verticalRef.UNKNOWN': '(reference not stated)',

  'level.LIBRE': 'You can fly',
  'level.CONDICIONES': 'With conditions',
  'level.AUTORIZACION': 'Authorization required',
  'level.PROHIBIDO': 'You cannot fly',
  'level.DESCONOCIDO': 'Not fully checked',

  /* --- Decision engine (verdict.ts) --------------------------------- */

  'verdict.headline.LIBRE': 'You can fly',
  'verdict.headline.CONDICIONES': 'You can fly, with conditions',
  'verdict.headline.AUTORIZACION': 'You need authorization',
  'verdict.headline.PROHIBIDO': 'You cannot fly',
  'verdict.headline.DESCONOCIDO': 'The check could not be completed',

  'verdict.vertical.referenceMissing':
    'This zone measures its heights from the aerodrome reference point, but ENAIRE does not ' +
    'publish that point’s altitude. Without it there is no way to work out whether the zone affects you, ' +
    'so it is assumed that it does. Read the official text and coordinate with the zone manager.',
  'verdict.vertical.referenceNoTerrain':
    'This zone measures its heights from the aerodrome reference point, and the terrain elevation at ' +
    'your location could not be obtained, so the zone is assumed to affect you.',
  'verdict.vertical.notConvertible':
    'The height band of this zone could not be converted safely (the terrain elevation or the ' +
    'vertical reference is missing). The zone is assumed to affect you.',
  'verdict.vertical.originReference': (arp: string, terrain: string, floor: string) =>
    ` This zone measures its heights from the aerodrome reference point (${arp} m above sea level), not from the ground: the terrain at your location is at ${terrain} m, so the zone starts ${floor} m above you.`,
  'verdict.vertical.originTerrain': ' Calculated with the real terrain elevation at this point.',
  'verdict.vertical.above': (floor: string, flight: string) =>
    `This zone starts at ${floor} m above the ground, higher than the ${flight} m you plan to fly at.`,
  'verdict.vertical.underground':
    'The ceiling of this zone falls below ground level at this point, so it does not apply to your flight.',
  'verdict.vertical.noCeiling': 'no ceiling declared',
  'verdict.vertical.ceilingAt': (ceiling: string) => `up to ${ceiling} m above the ground`,
  'verdict.vertical.inside': (flight: string, floor: string, ceiling: string) =>
    `Your flight (0 → ${flight} m above the ground) falls inside this zone’s band (from ${floor} m, ${ceiling}).`,

  'verdict.timing.expired': (date: string) =>
    `ENAIRE states that this zone stopped being in force on ${date}.`,
  'verdict.timing.scheduled': (date: string) => `This zone comes into force on ${date}.`,
  'verdict.timing.days': (days: string) => `days: ${days}`,
  'verdict.timing.hours': (from: string, to: string) => `hours: ${from} to ${to}`,
  'verdict.timing.limited': (detail: string) =>
    `This zone only applies under limited conditions${detail}. Check the official text before flying.`,

  'verdict.incompleteNote': (n: number) =>
    ` ${n} of ENAIRE’s 3 official layers could not be queried.`,
  'verdict.summary.unknown': 'This point could not be checked in full.',
  'verdict.summary.unknownRetry':
    ' Try again with a better connection: until then, assume there may be restrictions.',
  'verdict.summary.freeWithZonesAbove': (flight: string, n: number) =>
    `No UAS geographical zone affects you flying up to ${flight} m above the ground. ` +
    `There ${plural(n, 'is', 'are')} ${n} ${plural(n, 'zone', 'zones')} at this point, but ${plural(n, 'it starts', 'they start')} above that height.`,
  'verdict.summary.free':
    'ENAIRE publishes no UAS geographical zone affecting this point. The general rules of the category you operate in still apply.',
  'verdict.summary.prohibited': (n: number) =>
    `You are inside ${n} ${plural(n, 'zone', 'zones')} where drones are prohibited. Do not fly here.`,
  'verdict.summary.authorization': (n: number) =>
    `You are inside ${n} ${plural(n, 'zone', 'zones')} requiring prior permission. Without that authorization the flight is not legal.`,
  'verdict.summary.conditional': (n: number) =>
    `You are inside ${n} ${plural(n, 'zone', 'zones')} with conditions attached. You can fly if you meet what each one asks for.`,
  'verdict.summary.review': 'Read the zones listed below before flying.',
  'verdict.summary.allAtOnce': (n: number) =>
    ` ${n} ${plural(n, 'zone affects', 'zones affect')} you in total: all of them apply at once, you cannot go by the least restrictive one.`,

  'verdict.maxFree.unknownLayer': 'Could not be determined: an official layer is still missing.',
  'verdict.maxFree.unknownBand': (zone: string) =>
    `There is no way to work out how high you can go without permission: the band of "${zone}" could not be determined.`,
  'verdict.maxFree.none': (zone: string) =>
    `You cannot fly here at any height without authorization (${zone}).`,
  'verdict.maxFree.legalLimit': (metres: number) =>
    `You can go up to ${metres} m, the general limit of the open category.`,
  'verdict.maxFree.limitedBy': (metres: number, zone: string) =>
    `You can go up to ${metres} m without asking permission. Above that, ${zone}.`,

  'verdict.advice.advisory':
    'This is not a specific zone: ENAIRE publishes it over the whole country as a reminder. ' +
    'Look around and decide whether you are in an urban environment as the official text defines it; ' +
    'if you are, comply with what it says before flying.',
  'verdict.advice.prohibited': 'Do not fly. This zone is closed to drones.',
  'verdict.advice.authorizationContact': (contact: string) =>
    `Request authorization before flying. Contact published by ENAIRE: ${contact}.`,
  'verdict.advice.authorization':
    'Request authorization before flying. ENAIRE publishes no direct contact for this zone: ' +
    'read the official text and, if it is not clear, ask AESA or the zone manager.',
  'verdict.advice.conditionalContact': (contact: string) =>
    `You can fly if you meet the conditions in the official text. Contact: ${contact}.`,
  'verdict.advice.conditional':
    'You can fly, but only meeting the conditions set out in the official text of this zone.',
  'verdict.advice.noRestriction': 'This zone adds no restrictions.',
  'verdict.advice.unknown':
    'ENAIRE has not classified this zone. Treat it as restricted and read the official text.',

  'verdict.band.undetermined': 'Height band undetermined',
  'verdict.band.noCeiling': 'no ceiling',
  'verdict.band.range': (from: string, to: string) => `From ${from} to ${to} above the ground`,
  'verdict.band.shortUndetermined': 'heights undetermined',
  'verdict.band.shortFrom': (from: string) => `from ${from} m`,
  'verdict.band.shortRange': (from: string, to: string) => `${from} to ${to} m`,

  /* --- Queries and errors (query.ts, api/) -------------------------- */

  'query.timeout':
    'ENAIRE is taking too long to answer and you have not downloaded this area for flying without coverage.',
  'zone.untitled': (layer: string) => `${layer} zone`,
  'zone.titled': (layer: string, id: string) => `${layer} ${id}`,

  /* --- Weather and wind (weather.ts) -------------------------------- */

  'weather.headline.danger': 'Better not to fly right now',
  'weather.headline.caution': 'Flyable, with care',
  'weather.headline.ok': 'Good conditions for flying',
  'weather.note.gustDanger': (gust: string, drone: string, limit: string) =>
    `Gusts of ${gust} m/s: beyond what ${drone} can hold (around ${limit} m/s).`,
  'weather.note.gustCaution': (gust: string) =>
    `Gusts of ${gust} m/s. Flyable, but the drone will struggle and the battery will not last as long.`,
  'weather.note.rain': (mm: string) =>
    `It is raining (${mm} mm). Most drones are not waterproof.`,
  'weather.note.visibility': (km: number) =>
    `Visibility of ${km} km. Flying within visual line of sight means seeing the drone clearly at all times.`,
  'weather.note.night': 'Night has fallen: flying after dark carries extra requirements.',
  'weather.note.sunsetSoon': (min: number) => `${min} min left until sunset.`,
  'weather.note.allGood': 'Light wind, no rain and good visibility.',

  /* --- Sun and shadows (sun.ts) ------------------------------------- */

  'sun.light.noche': 'Night',
  'sun.light.azul': 'Blue hour',
  'sun.light.dorada': 'Golden hour',
  'sun.light.dia': 'Daylight',
  'sun.compass': 'N,NNE,NE,ENE,E,ESE,SE,SSE,S,SSW,SW,WSW,W,WNW,NW,NNW',

  /* --- Available-height map (offline/coverage.ts) ------------------- */

  'coverage.legend.max': 'Up to 120 m',
  'coverage.legend.high': '60 – 119 m',
  'coverage.legend.mid': '30 – 59 m',
  'coverage.legend.low': 'Under 30 m',
  'coverage.legend.none': 'Nothing without permission',
  'coverage.legend.unknown': 'Undetermined',

  /* --- Tabs --------------------------------------------------------- */

  'tab.here': 'Fly here',
  'tab.map': 'Map',
  'tab.search': 'Search',
  'tab.notebook': 'Notebook',
  'tab.settings': 'Settings',

  /* --- Relative time (HistoryContext) ------------------------------- */

  'timeAgo.now': 'just now',
  'timeAgo.justNow': 'just now',
  'timeAgo.minutes': (n: number) => `${n} min ago`,
  'timeAgo.hours': (n: number) => `${n} h ago`,
  'timeAgo.yesterday': 'yesterday',
  'timeAgo.days': (n: number) => `${n} days ago`,

  /* --- Verdict card ------------------------------------------------- */

  'verdictCard.a11y': (headline: string, summary: string) => `${headline}. ${summary}`,
  'verdictCard.a11ySoftened': (headline: string, area: string, summary: string) =>
    `${headline}, but you are in ${area}. ${summary}`,
  'verdictCard.favoriteAdd': 'Save to favourites',
  'verdictCard.favoriteRemove': 'Remove from favourites',
  'verdictCard.refresh': 'Check again',
  'verdictCard.protectedNote': (area: string, designation: string) =>
    `ENAIRE does not restrict this point, but you are in ${area}${designation}, where flying is usually prohibited or needs the manager’s permission. See below.`,
  'verdictCard.notams': (n: number) =>
    `${n} NOTAM${n === 1 ? '' : 's'} in force · check below`,
  'verdictCard.heightA11y': (metres: number) =>
    `Flight height: ${metres} metres above the ground. Tap to change.`,
  'verdictCard.heightLabel': (metres: number) => `up to ${metres} m above the ground`,
  'verdictCard.heightHint':
    'Zones that start above this height stop counting. Changing it really does change the answer.',
  'verdictCard.queriedAt': (when: string) => `Checked with ENAIRE ${when}`,
  'verdictCard.noHeight': 'You cannot fly here at any height without authorization.',
  'verdictCard.freeSuffix': 'without asking permission',
  'verdictCard.freeLegal': 'That is the general limit of the open category; no zone sits below it.',
  'verdictCard.freeLimitedBy': (zone: string) => `Above that you enter ${zone}.`,
  'verdictPill.free': (metres: number, n: number) =>
    `Up to ${metres} m without permission · ${n} ${n === 1 ? 'zone' : 'zones'}`,
  'verdictPill.blocked': (n: number) =>
    `No flying here without authorization · ${n} ${n === 1 ? 'zone' : 'zones'}`,
  'verdictPill.zones': (n: number) => `${n} ${n === 1 ? 'zone affects' : 'zones affect'} you`,

  /* --- Result screen ------------------------------------------------ */

  'result.offlineBanner': (date: string) =>
    `Offline: answered with the area you downloaded${date}.`,
  'result.offlineElevation': (margin: number) =>
    ` The terrain elevation is interpolated (±${margin} m, applied towards the restrictive side) and `,
  'result.offlineNotams': 'NOTAMs could not be checked',
  'result.offlineNotamsTail': ', and those are temporary notices that change daily.',
  'result.incomplete': (layers: string) =>
    `${layers} did not answer. This check is incomplete: do not take it as good.`,
  'result.noTerrain':
    'The terrain elevation at this point could not be obtained. Zones with limits referred to sea level are shown as if they affected you, to be safe.',
  'result.directions': 'Directions',
  'result.logged': 'Logged',
  'result.logFlight': 'Log flight',
  'result.share': 'Share',
  'result.openEnaire': 'View on ENAIRE',
  'result.light': 'Light and shadows here',
  'result.affectingOne': 'The zone affecting you',
  'result.affectingMany': (n: number) => `The ${n} zones affecting you`,
  'result.notAffecting': (n: number) =>
    `${n} ${n === 1 ? 'zone that does not affect' : 'zones that do not affect'} you at this height`,
  'result.advisories': 'ENAIRE notices for the whole country',
  'result.expired': 'Zones no longer in force',
  'result.dataTitle': 'Data and sources for this check',
  'result.coords': 'Coordinates',
  'result.accuracy': 'Position accuracy',
  'result.terrain': 'Terrain elevation',
  'result.terrainUnavailable': 'Not available',
  'result.metresAmsl': (m: number) => `${m} m above sea level`,
  'result.metresAgl': (m: number) => `${m} m above the ground`,
  'result.droneReaches': 'Your drone would reach',
  'result.zonesHere': 'Zones at this point',
  'result.zonesHereValue': (n: number, advisories: number) =>
    `${n} (+${advisories} general notice)`,
  'result.queriedAt': 'Checked',
  'result.sourceZones': 'Zones',
  'result.sourceElevation': 'Elevation',
  'result.disclaimer':
    'This app queries ENAIRE’s official services live, but does not replace them: NOTAM schedules come as free text and have to be read. Responsibility for the flight is always the pilot’s. ',
  'result.openEnaireDrones': 'Open ENAIRE Drones',

  /* --- Zone card ---------------------------------------------------- */

  'zoneCard.advisorySubtitle': 'ENAIRE notice for the whole country',
  'zoneCard.subtitle': (type: string, band: string) => `${type} · ${band}`,
  'zoneCard.a11y': (title: string, subtitle: string) => `${title}. ${subtitle}`,
  'zoneCard.chipAdvisory': 'General notice',
  'zoneCard.chipReferencePoint': 'Heights from the aerodrome',
  'zoneCard.chipExpired': 'Not in force',
  'zoneCard.chipLimited': 'Limited application',
  'zoneCard.requestButton': 'Draft the request e-mail',
  'zoneCard.requestMissing': (missing: string) =>
    `Your mail app will open with the request drafted. Still missing in Settings: ${missing}; those gaps appear as [COMPLETAR].`,
  'zoneCard.requestReady':
    'Your mail app will open with the request drafted and your details filled in. Check it before sending: you send it, not the app.',
  'zoneCard.requestSpanish': 'The request is written in Spanish: it goes to the zone manager.',
  'zoneCard.officialDetail': 'Official ENAIRE detail',
  'zoneCard.noOfficialText':
    'ENAIRE publishes no descriptive text for this zone. What is available is the structured fields shown below.',
  'zoneCard.techIdentifier': 'Identifier',
  'zoneCard.techType': 'Type (ED-318)',
  'zoneCard.techReasons': 'Reasons',
  'zoneCard.techLimits': 'Published limits',
  'zoneCard.techLayer': 'Layer',
  'zoneCard.techUpdated': 'Updated',

  /* --- Operator details still missing (request.ts) ------------------ */

  'operator.missing.name': 'your name',
  'operator.missing.uasNumber': 'your UAS operator number',
  'operator.missing.email': 'your e-mail',
  'operator.missing.phone': 'your phone number',
  'operator.missing.droneModel': 'the drone model',

  /* --- Drone card --------------------------------------------------- */

  'droneCard.title': 'Your drone',
  'droneCard.rulesTitle': 'What applies to you',
  'droneCard.disclaimer':
    'UAS geographical zones apply the same to every drone: being light exempts you from none of them. This only changes which general rules the app shows you.',

  'zone.advisoryTitle': 'Urban environment: check before flying',
  'error.enaireRejected': 'The ENAIRE service rejected the request',
  'error.enaire': 'ENAIRE service error',
  'error.cancelled': 'Query cancelled',
  'error.downloadCancelled': 'Download cancelled',
  'offline.terrainSource': 'Downloaded grid (Copernicus DEM via Open-Meteo)',

  /* --- Mini map, proximity, protected areas ------------------------- */

  'miniMap.a11y': (lat: string, lon: string) => `Map of the point checked: ${lat}, ${lon}`,
  'miniMap.loading': 'Loading the map…',
  'miniMap.open': 'Open the map',

  'proximity.title': 'Margin to the next zone',
  'proximity.none': (km: number) =>
    `No zone requiring permission within ${km} km. You have room to spare.`,
  'proximity.upTo': (zone: string) => `to ${zone}`,
  'proximity.close':
    'You are very close to the edge. With wind, or losing sight of the drone, it is easy to drift in: fly the other way and leave yourself margin.',
  'proximity.footnote':
    'Distance to the nearest edge, computed on ENAIRE geometry simplified to about 10 m. Indicative: do not use it to cut it fine.',
  'bearing.points': 'to the north,to the north-east,to the east,to the south-east,to the south,to the south-west,to the west,to the north-west',

  'protected.title': 'Protected natural areas',
  'protected.failed':
    'The protected areas inventory could not be checked. Check it yourself if you are flying in open country.',
  'protected.none': 'This point is not inside any protected area or Natura 2000 site.',
  'protected.insideOne': 'You are inside a protected area.',
  'protected.insideMany': (n: number) => `You are inside ${n} protected areas.`,
  'protected.managedBy': (body: string) => `Managed by ${body}`,
  'protected.strict':
    'In parks and reserves flying is usually prohibited, or needs permission from the site manager. Ask before you go.',
  'protected.loose':
    'Each site has its own rules (PRUG or PORN): flying may be prohibited, need authorization, or be allowed. Ask the body that manages it.',
  'protected.footnote': (source: string) =>
    `Source: ${source}. This is environmental information, separate from ENAIRE zones: it does not change the verdict above, it adds to it.`,

  /* --- Weather, NOTAMs and offline mode ----------------------------- */

  'weather.title': 'Flying conditions',
  'weather.metric.gusts': 'gusts',
  'weather.metric.wind': 'wind',
  'weather.metric.temp': 'temp.',
  'weather.metric.sunset': 'sunset',
  'weather.nextHours': 'Next hours',
  'weather.now': 'Now',
  'weather.hourSuffix': (hour: string) => `${hour}h`,
  'weather.gustsPerHour': 'Gusts in m/s, per hour.',
  'weather.footnote': (source: string) =>
    `Surface data from ${source}. It blows harder at the height you fly. The thresholds are indicative: your drone’s manual wins.`,

  'notam.title': 'Temporary notices (NOTAM)',
  'notam.failed': 'NOTAMs could not be checked. Look them up in the official viewer before flying.',
  'notam.openEnaire': 'Open ENAIRE Drones',
  'notam.none': 'No NOTAM published over this point.',
  'notam.active': (active: number, upcoming: string) =>
    `${active} ${active === 1 ? 'notice' : 'notices'} in force over this point${upcoming}.`,
  'notam.andUpcoming': (n: number) => ` and ${n} more coming`,
  'notam.upcoming': (n: number) =>
    `${n} scheduled ${n === 1 ? 'notice' : 'notices'} over this point.`,
  'notam.chipActive': 'In force',
  'notam.chipScheduled': 'Scheduled',
  'notam.rowSchedule': 'Schedule',
  'notam.rowLevels': 'Heights',
  'notam.rowEquals': 'That is',
  'notam.footnote':
    'Source: ENAIRE’s NOTAM service for UAS. The schedule comes as free text and is not interpreted: read it. A NOTAM in force can ban the flight even when the zones come out green.',

  'offline.title': 'Flying without coverage',
  'offline.packSummary': (km: number, zones: number, mb: string) =>
    `${km} km radius · ${zones} zones · ${mb} MB`,
  'offline.downloaded': (when: string) => `Downloaded ${when}.`,
  'offline.stale': ' ENAIRE zones change: download it again before trusting it.',
  'offline.fresh': ' If you run out of data inside that area, the app still answers.',
  'offline.noElevation':
    'The terrain elevation for this area could not be downloaded. Without it, every zone referred to sea level is treated as affecting you. Download it again on a better connection to get the exact margin.',
  'offline.change': 'Change area',
  'offline.delete': 'Delete',
  'offline.empty':
    'Pick the area you are going to fly in on the map and download it. Inside that area the app keeps answering even with no mobile data.',
  'offline.pick': 'Pick an area on the map',
  'offline.notamsFootnote':
    'NOTAMs are not downloaded: they change daily and a stale one is worse than none. With no coverage the app tells you they are missing.',
  'offline.coverageTitle': 'Available-height map',
  'offline.coverageBody':
    'Colours the map by how high you can go at each point. Computed from this downloaded area.',

  /* --- Odd controls ------------------------------------------------- */

  'height.other': 'Other',
  'height.otherA11y': 'Another height',
  'height.flyAtA11y': (height: string) => `Fly at ${height}`,
  'height.down10': 'Down 10 metres',
  'height.up10': 'Up 10 metres',
  'height.inputA11y': 'Flight height in metres',
  'sheet.collapse': 'Collapse the detail',
  'sheet.expand': 'Show the detail',
  'history.savedPoint': 'Saved point',
  'history.a11y': (place: string, verdict: string, when: string) =>
    `${place}. ${verdict}. Checked ${when}.`,
  'history.line': (verdict: string, metres: number, when: string) =>
    `${verdict} · at ${metres} m · ${when}`,
  'favorites.a11y': (place: string, verdict: string) => `${place}. ${verdict}.`,
  'favorites.removeA11y': (place: string) => `Remove ${place} from favourites`,

  /* --- Notebook and flight log -------------------------------------- */

  'notebook.title': 'Notebook',
  'notebook.subtitle': 'Your saved places, your logged flights and the rules, all in one place.',
  'notebook.favorites': 'Favourites',
  'notebook.favoritesEmpty':
    'Save a place by tapping the star on any result — the field where you practise, a client’s land — and it will always be here.',
  'notebook.logTitle': 'Flight log',
  'notebook.logCount': (n: number) => `${n} flight${n === 1 ? '' : 's'} logged.`,
  'notebook.logLast': (place: string, verdict: string, when: string) =>
    `Last: ${place} · ${verdict} · ${when}`,
  'notebook.logEmpty':
    'You have not logged any flight yet. From the result of any check, tap "Log flight" after you fly.',
  'notebook.openLogFull': 'Open the full log',
  'notebook.openLog': 'Open the log',
  'notebook.rulesTitle': 'Rules',
  'notebook.rulesBody':
    'The essentials of Spanish and European regulation, the category that applies to your drone, and where every figure in this app comes from.',
  'notebook.rulesButton': 'Read the rules',

  'log.title': 'Flight log',
  'log.subtitle':
    'A personal record of where and when you have flown. It does not replace the official operations log AESA requires, but it saves you rebuilding it from memory.',
  'log.emptyTitle': 'You have not logged any flight yet',
  'log.emptySubtitle': 'From the result of any check, tap "Log flight" after you fly.',
  'log.export': 'Export the log',
  'log.entryLine': (verdict: string, metres: number, drone: string) =>
    `${verdict} · ${metres} m · ${drone}`,
  'log.deleteEntry': 'Delete this entry from the log',
  'log.clearAll': 'Delete the whole log',

  /* --- Rules and result screens ------------------------------------- */

  'rules.title': 'Rules and sources',
  'rules.subtitle':
    'The essentials of Spanish and European regulation, and where every figure in this app comes from.',
  'rules.dataTitle': 'Where the data comes from',
  'rules.dataBody':
    'Zones are queried live from ENAIRE’s official service (UAS Geographical Zones, ED-318 format). The app keeps no copy of the zones and goes through no intermediate server: your phone talks to ENAIRE directly, so you always see the data in force.',
  'rules.dataElevation': (source: string) =>
    `Terrain elevation comes from ${source} and is used to turn limits referred to sea level into real height above the ground. Place search uses OpenStreetMap.`,
  'rules.disclaimer':
    'This application is an independent lookup tool. It does not replace ENAIRE’s official services or the regulation: checking that a flight is legal and safe is always the pilot’s responsibility. Check the NOTAMs before flying too.',
  'rules.spanishSources': 'The official documents are in Spanish: the links go to the originals.',

  'point.title': 'Point checked',
  'point.invalidCoords': 'No valid coordinates were received.',
  'point.unexpectedError': 'Unexpected error',
  'point.retry': 'Try again',
  'point.favoriteChanged': (before: string, now: string) =>
    `This has changed since you saved it to favourites: it used to be “${before}”, now it is “${now}”.`,

  /* --- "Fly here" screen -------------------------------------------- */

  'home.title': 'Can I fly here?',
  'home.recheck': 'Check my location again',
  'home.subtitle': 'Check your exact spot against ENAIRE’s official UAS Geographical Zones.',
  'home.locating': 'Finding your position…',
  'home.querying': 'Asking ENAIRE…',
  'home.check': 'Check my location',
  'home.stale':
    'This result is more than 10 minutes old. If you have moved, or time has passed, check again before taking off.',
  'home.noPermission':
    'I need access to your location to check where you are. You can turn it on in your phone settings, or use the Map and Search tabs to check a point by hand.',
  'home.noFixDetail': (reason: string) => `Your location could not be obtained: ${reason}`,
  'home.noFix': 'Your location could not be obtained.',
  'home.heightTitle': 'Flight height',
  'home.heightHint':
    'Metres above the ground. Zones that start above this height do not count: changing it really does change the answer.',
  'home.historyEmptyTitle': 'You have not checked any point yet',
  'home.historyEmptySubtitle':
    'Tap the button above to find out whether you can take off where you are, or search for a specific place.',
  'home.historyTitle': 'Recent checks',

  /* --- Search -------------------------------------------------------- */

  'search.title': 'Search for a place',
  'search.subtitle': 'An address, a town or a pair of coordinates, to check that point.',
  'search.placeholder': 'e.g. Playa de la Malvarrosa, or 39.47, -0.32',
  'search.a11y': 'Search for a place',
  'search.clear': 'Clear the search',
  'search.failed': 'The search failed. Check your connection and try again.',
  'search.results': 'Results',
  'search.noResults': 'No place with that name was found in Spain.',
  'search.recent': 'Recent checks',
  'search.emptyTitle': 'Search anywhere in Spain',
  'search.emptySubtitle': 'You can also paste coordinates straight in, for example 39.47, -0.32.',

  /* --- Settings ------------------------------------------------------ */

  'settings.title': 'Settings',
  'settings.preferences': 'Preferences',
  'settings.appearance': 'Appearance',
  'settings.appearanceA11y': (appearance: string) => `${appearance} appearance`,
  'settings.appearance.sistema': 'Automatic',
  'settings.appearance.claro': 'Light',
  'settings.appearance.oscuro': 'Dark',
  'settings.language': 'Language',
  'settings.language.system': 'Automatic',
  'settings.languageA11y': (language: string) => `${language} language`,
  'settings.languageNote':
    'Changes the interface. Official ENAIRE text, NOTAMs and protected areas still arrive in Spanish: that is the regulation, and translating it would mean rewriting it.',
  'settings.defaultHeight': 'Default flight height',
  'settings.yourData': 'Your details',
  'settings.operatorAndAircraft': 'Operator and aircraft',
  'settings.missing': (n: number) => `${n} missing`,
  'settings.dataNote':
    'Used to draft authorization requests. Stored only on this phone.',
  'settings.field.name': 'Name or company name',
  'settings.field.namePlaceholder': 'Jorge Cuadrado',
  'settings.field.uas': 'UAS operator number (AESA)',
  'settings.field.email': 'Contact e-mail',
  'settings.field.emailPlaceholder': 'you@example.com',
  'settings.field.phone': 'Contact phone',
  'settings.field.droneModel': 'Drone model',
  'settings.field.droneSerial': 'Serial number',
  'settings.field.droneSerialPlaceholder': 'From the box or the manufacturer’s app',
  'settings.missingNote': (missing: string) =>
    `Without ${missing}, requests will come out with gaps marked [COMPLETAR].`,
  'settings.privacy':
    'None of this leaves your phone. The app has no server of its own and sends no e-mail by itself: it opens your mail app with the text drafted so you send it.',

  /* --- Base maps ------------------------------------------------------ */

  'basemap.mapa': 'Map',
  'basemap.topo': 'Topographic',
  'basemap.satelite': 'Satellite',
  'basemap.note.mapa': 'OpenStreetMap street map',
  'basemap.note.topo': 'Official IGN topographic map, with contour lines',
  'basemap.note.satelite': 'IGN PNOA aerial imagery',

  /* --- Light and shadows ---------------------------------------------- */

  'light.title': 'Light and shadows',
  'light.preparingMap': 'Preparing the map…',
  'light.timeOfDay': 'Time of day',
  'light.altitude': (degrees: string) => `${degrees}° high`,
  'light.bearing': (bearing: string, degrees: string) => `${bearing} · ${degrees}°`,
  'light.jump.sunrise': 'Sunrise',
  'light.jump.golden': 'Golden',
  'light.jump.sunset': 'Sunset',
  'light.jump.now': 'Now',
  'light.day': 'Day',
  'light.today': 'Today',
  'light.hours': 'Daylight hours',
  'light.blueMorning': 'Blue hour (morning)',
  'light.sunrise': 'Sunrise',
  'light.goldenMorning': 'Golden hour (morning)',
  'light.solarNoon': 'Solar noon',
  'light.goldenEvening': 'Golden hour (evening)',
  'light.sunset': 'Sunset',
  'light.blueEvening': 'Blue hour (evening)',
  'light.terrainTitle': 'The sun against the terrain',
  'light.overTheHill': 'Clears the hills',
  'light.behindTheHill': 'Drops behind the hills',
  'light.blockedBy': (degrees: string) => ` · blocked by ${degrees}°`,
  'light.terrainNote':
    'Computed by sampling the real elevation out to 20 km along the directions the sun sets in, with curvature and refraction correction. This is the sunset you will actually see, not the one in the table.',
  'light.terrainPitch':
    'Table sunsets assume a flat world. In a valley the sun disappears behind the hills much earlier: this works out the real time from the terrain around you.',
  'light.measuring': 'Measuring the terrain…',
  'light.calculate': 'Compute with the terrain',
  'light.shadows': 'Shadows',
  'light.objectHeight': 'the object’s height',
  'light.shadowExample': (metres: string, bearing: string) =>
    `An 8 m tree casts ${metres} m of shadow ${bearing}.`,
  'light.noShadows': 'With the sun on the horizon or below it there are no shadows to measure.',

  /* --- Map, photo target and download --------------------------------- */

  'map.preparing': 'Preparing the official map…',
  'map.querying': 'Checking the point under the crosshair…',
  'map.queryFailed': 'The check failed',
  'map.moveToQuery': 'Move the map to check a point',
  'map.lightHere': 'Light and shadows at this point',
  'map.layers': 'Map layers',
  'map.photoTarget': 'I want to photograph this: find where to fly from',
  'map.centerOnMe': 'Centre on my location',
  'map.heightChip': (metres: number) => `up to ${metres} m`,
  'map.resultHere': 'The result will appear here.',
  'map.webTitle': 'UAS zones map',

  'photo.title': 'Target marked',
  'photo.clear': 'Clear the target',
  'photo.searching': 'Looking for somewhere you can fly from…',
  'photo.needsPack':
    'This needs the area downloaded: the search looks at thousands of points, and you cannot ask ENAIRE about them one by one. Download it in Settings → Flying without coverage.',
  'photo.flyFromTarget': 'You can fly from the target itself',
  'photo.flyFromTargetNote':
    'No need to move: you can take off right there without asking for authorization.',
  'photo.spotHeight': (metres: number) =>
    `From there you can go up to ${metres} m without authorization`,
  'photo.spotExact': '.',
  'photo.spotLess': (wanted: number) => `, which is less than the ${wanted} m you wanted.`,
  'photo.spotFar': ' Careful: that is far to keep the target in sight.',
  'photo.nothing': (km: number) =>
    `There is nowhere to fly without authorization within ${km} km, inside the area you have downloaded.`,
  'photo.openSpot': 'Check that point',

  'download.title': 'Pick an area',
  'download.preparingMap': 'Preparing the map…',
  'download.moveHint': 'Move the map to put the circle where you are going to fly.',
  'download.radius': 'km radius',
  'download.radiusA11y': (km: number) => `Download radius: ${km} kilometres`,
  'download.step.zonas': 'Downloading the ENAIRE zones…',
  'download.step.elevacion': 'Downloading the terrain elevation…',
  'download.step.guardando': 'Saving to the phone…',
  'download.button': 'Download this area',
  'download.moveFirst': 'Move the map…',
  'download.failedDetail': (reason: string) => `Download failed: ${reason}`,
  'download.failed': 'Download failed.',
  'download.fallbackName': 'Downloaded area',
  'download.footnote':
    'The bigger it is, the longer it takes and the more space it uses. A 25 km radius usually stays under 3 MB. It replaces whatever area you had downloaded.',

  'history.clear': 'Clear history',
  'geocode.manualCoords': 'Coordinates entered by hand',
  'error.unknown': 'Unknown error',

  'map.pointFailed': 'This point could not be checked.',

  /* --- Shared text ----------------------------------------------------- */

  'share.headline': (verdict: string, place: string) => `${verdict} — ${place}`,
  'share.thisPoint': 'point checked',
  'share.coords': (lat: string, lon: string) => `Coordinates: ${lat}, ${lon}`,
  'share.height': (metres: number) => `Planned flight height: ${metres} m above the ground`,
  'share.terrain': (metres: number) => `Terrain elevation: ${metres} m above sea level`,
  'share.zones': (n: number) => `Zones affecting this point (${n}):`,
  'share.checkedAt': (when: string) =>
    `Checked on ${when} against ENAIRE’s UAS Geographical Zones.`,
  'share.checkSource':
    'Always check the official source before flying: https://drones.enaire.es/',
  'share.logTitle': (n: number) => `Flight log — ${n} flight(s) recorded`,
  'share.logEntry': (verdict: string, metres: number, drone: string) =>
    `  ${verdict} · ${metres} m · ${drone}`,
  'share.logCoords': (lat: string, lon: string) => `  Coordinates: ${lat}, ${lon}`,
  'share.logFooter':
    'Generated with Zona Dron. A personal record; it does not replace any official logbook.',

  /* --- Urban environment (art. 40) ------------------------------------- */

  'urban.title': 'Urban environment',
  'urban.headline.urbano': 'You are in an urban environment',
  'urban.headline.probable': 'Possibly an urban environment',
  'urban.headline.parque': 'You are in an urban green area',
  'urban.headline.noDetectado': 'No urban environment detected',
  'urban.headline.sinRegion': 'No data for this region',
  'urban.headline.sinDatos': 'The check could not be completed',

  'urban.explain.urbano':
    'Both sources agree. Article 40 of RD 517/2024 applies: in the open category you cannot fly over buildings, houses or their yards and gardens, and you must keep the safety distance for your drone class. If you are a registered operator, notify the Ministry of the Interior five days in advance.',
  'urban.explain.probable':
    'Only one of the two sources sees urban land here. It could be a lone house in the countryside, or a new development the mapping has not caught up with. Look around you and, if there are buildings, follow article 40 as if it were.',
  'urban.explain.parque':
    'Publicly accessible municipal parks and gardens count as urban environment under case c) of article 40, however much grass there is. The same obligations as the rest of the city apply.',
  'urban.explain.noDetectado':
    'Neither the cadastre nor the land cover sees urban land here. That is not permission: look around for buildings or people, because the rule is about what is on the ground, not about what a map says.',
  'urban.explain.sinRegion':
    'Navarre and the Basque Country run their own cadastre and the national service does not answer there, so we would rather not give you half an answer. Check your municipality’s urban planning.',
  'urban.explain.sinDatos':
    'The cadastre and IGN services did not answer. Try again with a better connection, and until then assume you may be in an urban environment.',

  'urban.case.a': 'Consolidated built-up area',
  'urban.case.b': 'Residential, commercial or industrial area',
  'urban.case.c': 'Publicly accessible recreational area',

  'urban.catastro.urbana': 'Urban parcel',
  'urban.catastro.rustica': 'Rustic parcel',
  'urban.catastro.sinParcela': 'No parcel at this point',
  'urban.catastro.sinServicio': 'No answer',
  'urban.siose.none': 'No data at this point',

  'urban.readRule': 'What article 40 says',
  'urban.summaryFallback': 'Checked against the cadastre and land cover',
  'urban.footnote':
    'Two official sources crossed: the cadastre says whether the parcel is urban or rustic, and the IGN’s SIOSE says what covers the ground (2015 data, CC BY 4.0 scne.es). It is an indication, not a legal determination: article 40 also requires vehicle access, paved streets, drainage and street lighting, and no public dataset records that.',

  /* --- A pin shared from Maps ------------------------------------------ */

  'sharedPoint.failedTitle': 'That place could not be read',
  'sharedPoint.failedBody':
    'The shared link carries no coordinates we can check. Share the pin from Google Maps or Apple Maps, or paste the coordinates into Search.',

  'sharedPoint.emptyTitle': 'The shared place did not arrive',
  'sharedPoint.emptyBody':
    'The app was opened from the share menu but received no link. On iPhone this happens when the app is sideloaded with a free Apple ID: Apple does not let the share extension hand data to the app. Copy the link and paste it into Search.',

  'urban.surrounded':
    'Right under you the land cover map sees a street, but what surrounds you is urban land.',

  'urban.enaireFallback':
    'ENAIRE publishes a nationwide notice reminding you to check whether you are in an urban environment. It is all that is left when there is no data: look around you.',
  'urban.enaireLabel': 'ENAIRE (general notice)',
};
