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
  /** false para una vista previa estática (no se puede mover ni hacer zoom). */
  interactive?: boolean;
  /** Marcador fijo, para las vistas previas de un punto concreto. */
  marker?: { lat: number; lon: number } | null;
}

/**
 * Mapa Leaflet embebido en un WebView.
 *
 * - Base: OpenStreetMap (y CARTO en modo oscuro).
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
  const { lat, lon, zoom, layerIds, visible, dark, interactive = true, marker = null } = opts;

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

  /* Retícula: mismo lenguaje visual que el marcador de posición */
  .crosshair {
    display: ${interactive ? 'block' : 'none'};
    position: absolute; left: 50%; top: 50%; margin-left: -17px; margin-top: -17px;
    width: 34px; height: 34px; pointer-events: none; z-index: 600;
    border: 3px solid #fff; border-radius: 50%;
    box-shadow: 0 0 0 2px rgba(11,18,32,.5), 0 3px 10px rgba(0,0,0,.35);
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

  var BASES = {
    light: { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '&copy; OpenStreetMap' },
    dark: { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attr: '&copy; OpenStreetMap &copy; CARTO' }
  };
  var baseLayer = null;
  function setBase(mode) {
    var cfg = BASES[mode] || BASES.light;
    if (baseLayer) map.removeLayer(baseLayer);
    baseLayer = L.tileLayer(cfg.url, { maxZoom: 19, attribution: cfg.attr });
    baseLayer.addTo(map);
    baseLayer.bringToBack();
    document.body.style.background = mode === 'dark' ? '#0A1017' : '#F1F4F9';
  }
  setBase('${dark ? 'dark' : 'light'}');

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

  var marker = null;
  var accuracyCircle = null;

  function setMarker(lat, lon) {
    if (marker) map.removeLayer(marker);
    marker = L.circleMarker([lat, lon], {
      radius: 7, color: '#FFFFFF', weight: 3, fillColor: '#1355E8', fillOpacity: 1
    }).addTo(map);
  }

  map.on('click', function (e) {
    map.panTo(e.latlng, { animate: true });
  });

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
    } else if (msg.type === 'accuracy') {
      if (accuracyCircle) map.removeLayer(accuracyCircle);
      accuracyCircle = L.circle([msg.lat, msg.lon], {
        radius: msg.radius, color: '#1355E8', weight: 1, fillOpacity: 0.08
      }).addTo(map);
    } else if (msg.type === 'layers') {
      applyVisibility(msg.visible);
    } else if (msg.type === 'theme') {
      setBase(msg.dark ? 'dark' : 'light');
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
