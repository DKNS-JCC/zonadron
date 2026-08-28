import { ENAIRE_SERVICE } from '../api/enaire';
import { LEAFLET_CSS, LEAFLET_JS } from './leafletVendor';

export interface MapOptions {
  lat: number;
  lon: number;
  zoom: number;
  /** ids reales de las capas del servicio de ENAIRE. */
  layerIds: { aero: number; urbano: number; infraestructuras: number };
  /** Capas visibles al abrir el mapa. */
  visible: { aero: boolean; urbano: boolean; infraestructuras: boolean };
  dark: boolean;
  /** Mapa base con el que se abre: el que el usuario dejó guardado. */
  basemap?: 'mapa' | 'topo' | 'satelite';
  /** false para una vista previa estática (no se puede mover ni hacer zoom). */
  interactive?: boolean;
  /** Marcador fijo, para las vistas previas de un punto concreto. */
  marker?: { lat: number; lon: number } | null;
}

/**
 * Mapa Leaflet embebido en un WebView.
 *
 * - Base: OpenStreetMap (oscurecido con un filtro CSS en el tema oscuro).
 * - Encima: las capas oficiales de ENAIRE, pedidas al endpoint `export` del
 *   propio servicio ArcGIS. El dibujo de las zonas es el que publica ENAIRE.
 *
 * Se usa WebView (en vez de react-native-maps) por dos motivos: no necesita
 * ninguna clave de API de Google/Apple y permite superponer exactamente las
 * teselas oficiales de ENAIRE.
 *
 * IMPORTANTE: este HTML se construye UNA sola vez. El tema y las capas se
 * cambian por mensajes, nunca reconstruyendo el HTML: reconstruirlo recarga el
 * WebView y el usuario pierde la posición, el zoom y el marcador.
 */
export function buildMapHtml(opts: MapOptions): string {
  const {
    lat,
    lon,
    zoom,
    layerIds,
    visible,
    dark,
    basemap = 'mapa',
    interactive = true,
    marker = null,
  } = opts;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<style>${LEAFLET_CSS}</style>
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: ${dark ? '#0A1017' : '#F1F4F9'}; }
  .leaflet-container { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: transparent; }
  .leaflet-control-attribution { font-size: 9px; opacity: .8; }
  .leaflet-bottom.leaflet-right { margin-bottom: 4px; }

  /* Mapa base oscuro sin depender de nadie: las mismas teselas claras de OSM,
     invertidas en claridad. Antes se pedía el dark_all de CARTO, pero desde que
     exige clave estampa "API KEY REQUIRED" sobre la tesela en cuanto la IP del
     usuario supera su cuota anónima: una operadora móvil entera comparte IP, así
     que a unos usuarios les salía y a otros no. El filtro va en el contenedor de
     la capa base, no en el panel de teselas, para que las zonas de ENAIRE y la
     capa de alturas que van encima conserven sus colores. */
  .base-dark {
    filter: invert(1) hue-rotate(185deg) brightness(.82) contrast(.88) saturate(.35);
  }

  /* Retícula: mismo lenguaje visual que el marcador de posición */
  .crosshair {
    display: ${interactive ? 'block' : 'none'};
    position: absolute; left: 50%; top: 50%; margin-left: -17px; margin-top: -17px;
    width: 34px; height: 34px; pointer-events: none; z-index: 600;
    border: 3px solid #fff; border-radius: 50%;
    box-shadow: 0 0 0 2px rgba(11,18,32,.5), 0 3px 10px rgba(0,0,0,.35);
  }
  /* Las celdas se ven como celdas: la resolución es la que es y disimularla
     con un degradado sería fingir una precisión que no hay. */
  .coverage { image-rendering: pixelated; image-rendering: crisp-edges; }

  /* Tu posición: punto azul y, si el móvil tiene brújula, hacia dónde miras */
  .me-wrap { position: relative; width: 76px; height: 76px; }
  .me-cone {
    position: absolute; left: 0; top: 0; width: 76px; height: 76px;
    transform-origin: 50% 50%; opacity: 0;
    transition: transform .18s linear, opacity .2s linear;
  }
  .me-dot {
    position: absolute; left: 50%; top: 50%;
    width: 16px; height: 16px; margin: -8px 0 0 -8px; border-radius: 50%;
    background: #1355E8; border: 3px solid #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,.45);
  }

  .crosshair:after {
    content: ''; position: absolute; left: 50%; top: 50%;
    width: 6px; height: 6px; margin: -3px 0 0 -3px; border-radius: 50%;
    background: #fff; box-shadow: 0 0 0 1.5px rgba(11,18,32,.5);
  }
</style>
</head>
<body>
<div id="map"></div>
<div class="crosshair" id="crosshair"></div>
<script>${LEAFLET_JS}</script>
<script>
(function () {
  // Puente con la app: en móvil vía WebView, en la vista web vía iframe.
  var post = function (obj) {
    var payload = JSON.stringify(obj);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(payload);
    else if (window.parent && window.parent !== window) window.parent.postMessage(payload, '*');
  };

  // Cualquier texto que venga de un mensaje y acabe en un divIcon pasa por
  // aquí antes. Hoy sólo se le pasan cadenas propias (horas, distancias
  // formateadas), pero el sumidero es innerHTML vía L.divIcon: si el día de
  // mañana alguien enchufa ahí un nombre de sitio o un texto de ENAIRE, esto
  // es lo único que evita que se ejecute como HTML.
  var esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  var INTERACTIVE = ${interactive ? 'true' : 'false'};
  var map = L.map('map', {
    zoomControl: false,
    attributionControl: true,
    dragging: INTERACTIVE,
    touchZoom: INTERACTIVE,
    scrollWheelZoom: INTERACTIVE,
    doubleClickZoom: INTERACTIVE,
    boxZoom: INTERACTIVE,
    keyboard: INTERACTIVE,
    tap: INTERACTIVE
  }).setView([${lat}, ${lon}], ${zoom});

  // Mapas base. Para España los del Instituto Geográfico Nacional son mejores
  // que los genéricos y son oficiales y gratuitos; fuera de España no cubren,
  // pero esta app sólo mira España.
  var IGN = 'https://www.ign.es/wmts/';
  function ignUrl(service, layer, format) {
    return IGN + service + '?service=WMTS&request=GetTile&version=1.0.0&layer=' + layer +
      '&style=default&tilematrixset=GoogleMapsCompatible&format=' + format +
      '&TileMatrix={z}&TileCol={x}&TileRow={y}';
  }

  // dim: la tesela llega en claro y el tema oscuro la oscurece con .base-dark.
  // El MTN y la ortofoto no lo llevan: invertir curvas de nivel o una foto aérea
  // no da un mapa oscuro, da un negativo.
  var BASES = {
    mapa: { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '&copy; OpenStreetMap', max: 19, dim: true },
    topo: { url: ignUrl('mapa-raster', 'MTN', 'image/jpeg'), attr: 'MTN &copy; Instituto Geográfico Nacional', max: 18 },
    // over: rotulación transparente encima. La ortofoto sola es bonita pero no
    // dice dónde está uno; el IGN publica un callejero preparado justo para eso
    // (IGNBaseOrto: núcleos, viales, hidrografía y límites sobre fondo vacío),
    // que es lo que hace el híbrido de Google.
    satelite: {
      url: ignUrl('pnoa-ma', 'OI.OrthoimageCoverage', 'image/jpeg'),
      attr: 'PNOA &copy; Instituto Geográfico Nacional', max: 19,
      over: ignUrl('ign-base', 'IGNBaseOrto', 'image/png')
    }
  };

  var baseLayer = null;
  var baseLayerId = null;
  var overLayer = null;
  var baseId = '${basemap}';
  var isDark = ${dark ? 'true' : 'false'};

  function setBase(id, dark) {
    if (id) baseId = id;
    if (dark !== undefined && dark !== null) isDark = dark;
    var cfg = BASES[baseId] || BASES.mapa;
    // El tema ya no cambia la URL de las teselas, sólo el filtro: mientras la
    // base sea la misma se conserva la capa y cambiar de tema no recarga nada.
    if (!baseLayer || baseLayerId !== baseId) {
      if (baseLayer) map.removeLayer(baseLayer);
      if (overLayer) { map.removeLayer(overLayer); overLayer = null; }
      baseLayer = L.tileLayer(cfg.url, { maxZoom: 19, maxNativeZoom: cfg.max, attribution: cfg.attr });
      baseLayerId = baseId;
      baseLayer.addTo(map);
      baseLayer.bringToBack();
      // zIndex por encima del 1 que traen las demás capas de teselas: los
      // nombres se leen también sobre las zonas de ENAIRE, que van teñidas.
      if (cfg.over) {
        overLayer = L.tileLayer(cfg.over, { maxZoom: 19, maxNativeZoom: cfg.max, zIndex: 3 });
        overLayer.addTo(map);
      }
    }
    var box = baseLayer.getContainer();
    if (box) {
      if (isDark && cfg.dim) box.classList.add('base-dark');
      else box.classList.remove('base-dark');
    }
    // Sobre satélite el fondo oscuro disimula las teselas que faltan.
    document.body.style.background = (baseId === 'satelite' || isDark) ? '#0A1017' : '#F1F4F9';
  }
  setBase('${basemap}', ${dark ? 'true' : 'false'});

  // --- Capas oficiales de ENAIRE (endpoint export del servicio ArcGIS) ---
  // Una sola capa que pide las tres a la vez (layers=show:a,b,c): una petición
  // por tesela en lugar de tres. El servicio limita las peticiones simultáneas.
  var LAYER_IDS = ${JSON.stringify(layerIds)};
  var visibleKeys = ${JSON.stringify(visible)};

  function activeIds() {
    return Object.keys(LAYER_IDS)
      .filter(function (k) { return visibleKeys[k]; })
      .map(function (k) { return LAYER_IDS[k]; });
  }

  var EnaireLayer = L.TileLayer.extend({
    getTileUrl: function (coords) {
      var size = this.getTileSize();
      var nwPoint = coords.scaleBy(size);
      var sePoint = nwPoint.add(size);
      var nw = map.options.crs.project(map.unproject(nwPoint, coords.z));
      var se = map.options.crs.project(map.unproject(sePoint, coords.z));
      var bbox = [nw.x, se.y, se.x, nw.y].join(',');
      return '${ENAIRE_SERVICE}/export?bbox=' + bbox +
        '&bboxSR=3857&imageSR=3857&size=256,256&dpi=96&format=png32&transparent=true' +
        '&layers=show:' + activeIds().join(',') + '&f=image';
    }
  });

  // 0.35: por encima de esto el mapa base deja de leerse y no se distingue
  // dónde está el borde de la zona, que es justo lo que hay que ver.
  var enaire = new EnaireLayer('', {
    opacity: 0.35, maxZoom: 19, attribution: 'Zonas UAS &copy; ENAIRE',
    updateWhenIdle: true, keepBuffer: 1
  });
  if (activeIds().length) enaire.addTo(map);

  function applyVisibility(next) {
    visibleKeys = next;
    if (activeIds().length === 0) {
      if (map.hasLayer(enaire)) map.removeLayer(enaire);
      return;
    }
    if (!map.hasLayer(enaire)) enaire.addTo(map);
    enaire.redraw();
  }

  // --- Capa de alturas libres ("hasta dónde puedo subir") ---
  // Se pinta como una imagen: una rejilla de cien mil rectángulos vectoriales
  // dejaría el mapa inservible en un móvil.
  //
  // Llega un byte por celda (metros de altura libre, o unknownByte) y las
  // paradas de la rampa; el color se interpola aqui. Ver encodeCoverage en
  // src/offline/coverage.ts.
  var coverageLayer = null;

  /** 256 colores precalculados: uno por cada metro posible, más el gris. */
  function buildRamp(stops, unknownColor) {
    function hex(c) {
      var n = parseInt(c.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    var top = stops[stops.length - 1][0];
    var lut = new Uint8Array(256 * 3);
    for (var m = 0; m <= 255; m++) {
      var v = m > top ? top : m;
      var rgb = hex(stops[stops.length - 1][1]);
      if (v <= stops[0][0]) {
        rgb = hex(stops[0][1]);
      } else {
        for (var i = 1; i < stops.length; i++) {
          if (v > stops[i][0]) continue;
          var a = hex(stops[i - 1][1]);
          var b = hex(stops[i][1]);
          var tt = (v - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
          rgb = [
            a[0] + (b[0] - a[0]) * tt,
            a[1] + (b[1] - a[1]) * tt,
            a[2] + (b[2] - a[2]) * tt
          ];
          break;
        }
      }
      lut[m * 3] = rgb[0];
      lut[m * 3 + 1] = rgb[1];
      lut[m * 3 + 2] = rgb[2];
    }
    return lut;
  }

  function drawCoverage(msg) {
    var bin = atob(msg.data);
    var lut = buildRamp(msg.stops, msg.unknownColor);
    var unknown = (function () {
      var n = parseInt(msg.unknownColor.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    })();

    var canvas = document.createElement('canvas');
    canvas.width = msg.cols;
    canvas.height = msg.rows;
    var ctx = canvas.getContext('2d');
    var img = ctx.createImageData(msg.cols, msg.rows);
    var px = img.data;

    for (var r = 0; r < msg.rows; r++) {
      // La fila 0 de los datos es el borde sur; en el lienzo es la de abajo.
      var dstRow = (msg.rows - 1 - r) * msg.cols;
      var srcRow = r * msg.cols;
      for (var c = 0; c < msg.cols; c++) {
        var byte = bin.charCodeAt(srcRow + c);
        var o = (dstRow + c) * 4;
        if (byte === msg.unknownByte) {
          px[o] = unknown[0]; px[o + 1] = unknown[1]; px[o + 2] = unknown[2];
        } else {
          px[o] = lut[byte * 3]; px[o + 1] = lut[byte * 3 + 1]; px[o + 2] = lut[byte * 3 + 2];
        }
        px[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    if (coverageLayer) map.removeLayer(coverageLayer);
    coverageLayer = L.imageOverlay(
      canvas.toDataURL(),
      [[msg.bbox.minLat, msg.bbox.minLon], [msg.bbox.maxLat, msg.bbox.maxLon]],
      { opacity: 0.5, interactive: false, className: 'coverage' }
    ).addTo(map);
  }

  function clearCoverage() {
    if (coverageLayer) { map.removeLayer(coverageLayer); coverageLayer = null; }
  }

  // --- Círculo de descarga: se queda en el centro y sigue al mapa ---
  var downloadCircle = null;
  var downloadRadius = 0;

  function updateDownloadCircle() {
    if (!downloadRadius) return;
    var c = map.getCenter();
    if (!downloadCircle) {
      downloadCircle = L.circle(c, {
        radius: downloadRadius,
        color: '#1355E8', weight: 3, fillColor: '#1355E8', fillOpacity: 0.12
      }).addTo(map);
    } else {
      downloadCircle.setLatLng(c);
      downloadCircle.setRadius(downloadRadius);
    }
  }

  function clearDownloadCircle() {
    if (downloadCircle) { map.removeLayer(downloadCircle); downloadCircle = null; }
    downloadRadius = 0;
  }

  // --- Trayectoria del sol ---
  var sunLayers = [];

  function destination(lat, lon, azimuth, metres) {
    var rad = azimuth * Math.PI / 180;
    var dLat = (metres / 111320) * Math.cos(rad);
    var dLon = (metres / (111320 * Math.cos(lat * Math.PI / 180))) * Math.sin(rad);
    return [lat + dLat, lon + dLon];
  }

  function clearSunPath() {
    sunLayers.forEach(function (l) { map.removeLayer(l); });
    sunLayers = [];
  }

  function drawSunPath(msg) {
    clearSunPath();
    var o = msg.origin;
    // La longitud del rayo se ajusta al zoom para que siempre se vea.
    var base = 40075016 * Math.cos(o.lat * Math.PI / 180) / Math.pow(2, map.getZoom() + 8) * 220;

    (msg.rays || []).forEach(function (ray) {
      var length = base * (ray.main ? 1.25 : 0.85);
      var line = L.polyline([[o.lat, o.lon], destination(o.lat, o.lon, ray.azimuth, length)], {
        color: ray.color,
        weight: ray.main ? 3 : 1.5,
        opacity: ray.main ? 0.95 : 0.5,
        interactive: false
      }).addTo(map);
      sunLayers.push(line);
      if (ray.label) {
        var end = destination(o.lat, o.lon, ray.azimuth, length * 1.06);
        var tag = L.marker(end, {
          interactive: false,
          icon: L.divIcon({
            className: '',
            html: '<div style="white-space:nowrap;font:600 11px -apple-system,sans-serif;color:' + ray.color +
                  ';text-shadow:0 0 3px #000,0 0 3px #000,0 0 6px #000">' + esc(ray.label) + '</div>',
            iconSize: [0, 0]
          })
        }).addTo(map);
        sunLayers.push(tag);
      }
    });

    if (msg.current && msg.current.azimuth != null) {
      var cur = L.polyline([[o.lat, o.lon], destination(o.lat, o.lon, msg.current.azimuth, base * 1.5)], {
        color: msg.current.color, weight: 5, opacity: 1, interactive: false
      }).addTo(map);
      sunLayers.push(cur);
    }

    if (msg.shadow) {
      var sh = L.polyline([[o.lat, o.lon], destination(o.lat, o.lon, msg.shadow.azimuth, base * msg.shadow.scale)], {
        color: '#111827', weight: 4, opacity: 0.55, dashArray: '6,7', interactive: false
      }).addTo(map);
      sunLayers.push(sh);
    }

    var dot = L.circleMarker([o.lat, o.lon], {
      radius: 6, color: '#fff', weight: 3, fillColor: '#1355E8', fillOpacity: 1, interactive: false
    }).addTo(map);
    sunLayers.push(dot);
  }

  // --- Objetivo fotográfico y punto volable más cercano ---
  var targetLayers = [];

  function clearTarget() {
    targetLayers.forEach(function (l) { map.removeLayer(l); });
    targetLayers = [];
  }

  function drawTarget(msg) {
    clearTarget();
    var t = msg.target;

    // Chincheta en SVG con ancla explícita en la punta. Con un emoji la punta
    // no coincide con su caja, y la chincheta quedaba descentrada de la línea.
    var pinSvg =
      '<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M13 33.5C13 33.5 24.5 20.6 24.5 12.6 24.5 6.2 19.4 1 13 1 6.6 1 1.5 6.2 1.5 12.6c0 8 11.5 20.9 11.5 20.9z"' +
      ' fill="#BE2318" stroke="#FFFFFF" stroke-width="2"/>' +
      '<circle cx="13" cy="12.4" r="4.4" fill="#FFFFFF"/></svg>';

    var pin = L.marker([t.lat, t.lon], {
      interactive: false,
      icon: L.divIcon({
        className: '',
        html: '<div style="filter:drop-shadow(0 2px 4px rgba(0,0,0,.45))">' + pinSvg + '</div>',
        iconSize: [26, 34],
        iconAnchor: [13, 34]
      })
    }).addTo(map);
    targetLayers.push(pin);

    if (msg.spot) {
      var s = msg.spot;
      var line = L.polyline([[t.lat, t.lon], [s.lat, s.lon]], {
        color: '#07835A', weight: 4, opacity: 0.9, dashArray: '2,8', lineCap: 'round', interactive: false
      }).addTo(map);
      targetLayers.push(line);

      // Pequeño: la cruz del mapa se queda encima y dos círculos grandes
      // superpuestos no se entienden.
      var ring = L.circleMarker([s.lat, s.lon], {
        radius: 7, color: '#FFFFFF', weight: 2.5, fillColor: '#07835A', fillOpacity: 1, interactive: false
      }).addTo(map);
      targetLayers.push(ring);

      var mid = [(t.lat + s.lat) / 2, (t.lon + s.lon) / 2];
      // Con iconSize [0,0] la caja del icono se queda a cero y el texto se sale
      // de su fondo: hay que darle tamaño y anclarlo por el centro.
      var tag = L.marker(mid, {
        interactive: false,
        icon: L.divIcon({
          className: '',
          html: '<div style="width:100%;height:100%;display:flex;align-items:center;' +
                'justify-content:center;white-space:nowrap;background:#07835A;color:#fff;' +
                'font:700 12px -apple-system,sans-serif;border-radius:999px;' +
                'box-shadow:0 2px 6px rgba(0,0,0,.35)">' + esc(msg.label) + '</div>',
          iconSize: [74, 24],
          iconAnchor: [37, 12]
        })
      }).addTo(map);
      targetLayers.push(tag);

      // La cruz del mapa es lo que la app consulta, así que tiene que quedarse
      // sobre el punto seguro: si se encuadran los dos extremos, la cruz cae en
      // mitad de la línea y el panel enseña el veredicto de un punto que no es
      // ninguno de los dos.
      var bounds = L.latLngBounds([[t.lat, t.lon], [s.lat, s.lon]]).pad(0.35);
      // Un nivel menos porque el centro va en un extremo, no en el medio.
      var z = Math.max(11, Math.min(17, map.getBoundsZoom(bounds) - 1));
      map.setView([s.lat, s.lon], z, { animate: true });
    }
  }

  // --- Áreas de los NOTAM ---
  // El polígono del aviso, no un icono en su centro: lo que hace falta saber
  // es si el sitio al que vas cae dentro o fuera del borde.
  //
  // Naranja porque es el color con el que la app habla de avisos temporales
  // (ver NotamCard); relleno flojo para no tapar las zonas de ENAIRE, que
  // mandan más, y borde de trazos en los que todavía no están en vigor.
  var notamLayers = [];

  function clearNotams() {
    notamLayers.forEach(function (l) { map.removeLayer(l); });
    notamLayers = [];
  }

  function drawNotams(msg) {
    clearNotams();
    (msg.areas || []).forEach(function (area) {
      var active = !!area.activeNow;
      var poly = L.polygon(area.rings, {
        color: active ? '#E8720C' : '#B8791F',
        weight: active ? 2.5 : 2,
        opacity: active ? 0.95 : 0.7,
        dashArray: active ? null : '5,6',
        fillColor: '#E8720C',
        fillOpacity: active ? 0.16 : 0.07,
        interactive: false
      }).addTo(map);
      notamLayers.push(poly);
    });
  }

  var marker = null;

  function setMarker(lat, lon) {
    if (marker) map.removeLayer(marker);
    marker = L.circleMarker([lat, lon], {
      radius: 7, color: '#FFFFFF', weight: 3, fillColor: '#1355E8', fillOpacity: 1
    }).addTo(map);
  }

  // --- Dónde estás y hacia dónde miras ---
  // Punto azul, círculo de precisión y, si el móvil tiene brújula, un cono en
  // la dirección a la que apuntas. Es lo mismo que enseña cualquier app de
  // mapas, y aquí sirve para saber si la cruz está delante o detrás de ti.
  var meMarker = null;
  var meCircle = null;
  // Ángulo acumulado, sin recortar a [0,360): girar de 359° a 1° son dos
  // grados, no una vuelta entera al revés, y la transición CSS interpola por
  // donde le digamos.
  var meAngle = 0;

  var ME_HTML =
    '<div class="me-wrap">' +
      '<div class="me-cone">' +
        '<svg width="76" height="76" viewBox="0 0 76 76" xmlns="http://www.w3.org/2000/svg">' +
          '<defs><radialGradient id="meCone" cx="50%" cy="50%" r="50%">' +
            // Arranca justo fuera del punto: por debajo de eso el degradado
            // queda tapado por el propio punto y sólo ensucia el borde.
            '<stop offset="22%" stop-color="#1355E8" stop-opacity=".85"/>' +
            '<stop offset="100%" stop-color="#1355E8" stop-opacity="0"/>' +
          '</radialGradient></defs>' +
          '<path d="M38 38 L17.9 5.8 A38 38 0 0 1 58.1 5.8 Z" fill="url(#meCone)"/>' +
        '</svg>' +
      '</div>' +
      '<div class="me-dot"></div>' +
    '</div>';

  function setMe(msg) {
    var latlng = [msg.lat, msg.lon];
    if (!meMarker) {
      meMarker = L.marker(latlng, {
        interactive: false,
        // Por encima de todo lo demás: es la referencia de dónde estás.
        zIndexOffset: 1000,
        icon: L.divIcon({ className: '', html: ME_HTML, iconSize: [76, 76], iconAnchor: [38, 38] })
      }).addTo(map);
    } else {
      meMarker.setLatLng(latlng);
    }

    // El círculo de precisión sólo cuando dice algo: con dos metros no se ve
    // bajo el punto, y con dos kilómetros tapa la pantalla sin informar.
    if (msg.accuracy > 8 && msg.accuracy < 2000) {
      if (!meCircle) {
        meCircle = L.circle(latlng, {
          radius: msg.accuracy, color: '#1355E8', weight: 1, fillOpacity: 0.08, interactive: false
        }).addTo(map);
      } else {
        meCircle.setLatLng(latlng);
        meCircle.setRadius(msg.accuracy);
      }
    } else if (meCircle) {
      map.removeLayer(meCircle);
      meCircle = null;
    }

    var el = meMarker.getElement();
    var cone = el ? el.querySelector('.me-cone') : null;
    if (!cone) return;
    // Sin brújula (o con una que no se ha calibrado) no se enseña dirección:
    // un cono apuntando a un sitio cualquiera es peor que ningún cono.
    if (msg.heading === null || msg.heading === undefined) {
      cone.style.opacity = '0';
      return;
    }
    meAngle += ((msg.heading - meAngle) % 360 + 540) % 360 - 180;
    cone.style.opacity = '1';
    cone.style.transform = 'rotate(' + meAngle + 'deg)';
  }

  function clearMe() {
    if (meMarker) { map.removeLayer(meMarker); meMarker = null; }
    if (meCircle) { map.removeLayer(meCircle); meCircle = null; }
  }

  map.on('click', function (e) {
    map.panTo(e.latlng, { animate: true });
  });

  map.on('move', function () { updateDownloadCircle(); });
  map.on('movestart', function () { post({ type: 'movestart' }); });
  map.on('moveend', function () {
    var c = map.getCenter();
    post({ type: 'move', lat: c.lat, lon: c.lng, zoom: map.getZoom() });
  });

  // --- Mensajes desde React Native ---
  function handleMessage(raw) {
    var msg;
    try { msg = JSON.parse(raw); } catch (err) { return; }
    if (msg.type === 'center') {
      map.setView([msg.lat, msg.lon], msg.zoom || map.getZoom(), { animate: true });
    } else if (msg.type === 'marker') {
      setMarker(msg.lat, msg.lon);
    } else if (msg.type === 'notams') {
      drawNotams(msg);
    } else if (msg.type === 'notamsOff') {
      clearNotams();
    } else if (msg.type === 'me') {
      setMe(msg);
    } else if (msg.type === 'meOff') {
      clearMe();
    } else if (msg.type === 'layers') {
      applyVisibility(msg.visible);
    } else if (msg.type === 'theme') {
      setBase(null, msg.dark);
    } else if (msg.type === 'basemap') {
      setBase(msg.base, null);
    } else if (msg.type === 'circle') {
      downloadRadius = msg.radiusM;
      updateDownloadCircle();
    } else if (msg.type === 'circleOff') {
      clearDownloadCircle();
    } else if (msg.type === 'sunpath') {
      drawSunPath(msg);
    } else if (msg.type === 'sunpathOff') {
      clearSunPath();
    } else if (msg.type === 'target') {
      drawTarget(msg);
    } else if (msg.type === 'targetOff') {
      clearTarget();
    } else if (msg.type === 'coverage') {
      drawCoverage(msg);
    } else if (msg.type === 'coverageOff') {
      clearCoverage();
    } else if (msg.type === 'invalidate') {
      map.invalidateSize();
    }
  }

  document.addEventListener('message', function (e) { handleMessage(e.data); });
  window.addEventListener('message', function (e) { handleMessage(e.data); });

  var INITIAL_MARKER = ${marker ? JSON.stringify(marker) : 'null'};
  if (INITIAL_MARKER) setMarker(INITIAL_MARKER.lat, INITIAL_MARKER.lon);

  var c0 = map.getCenter();
  post({ type: 'ready', lat: c0.lat, lon: c0.lng, zoom: map.getZoom(), interactive: INTERACTIVE });
})();
</script>
</body>
</html>`;
}
