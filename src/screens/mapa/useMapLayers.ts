import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { getLayerIds } from '../../api/enaire';
import {
  COVERAGE_STOPS,
  COVERAGE_UNKNOWN_BYTE,
  COVERAGE_UNKNOWN_COLOR,
  computeCoverageGrid,
  encodeCoverage,
} from '../../offline/coverage';
import { loadPack } from '../../offline/pack';
import { useSettings } from '../../state/SettingsContext';
import type { LayerKey } from '../../types';

const FALLBACK_LAYER_IDS = { aero: 2, urbano: 3, infraestructuras: 0 };

export interface MapView {
  lat: number;
  lon: number;
  zoom: number;
}

/**
 * Qué se pinta encima del mapa: las capas oficiales de ENAIRE, el mapa base y
 * el mapa de altura libre. Los tres se controlan desde el mismo panel de
 * leyenda, así que comparten un solo hook.
 *
 * El mapa de altura libre necesita saber qué área hay visible ahora mismo —
 * `onViewChanged` es lo que lo mantiene al día según se mueve el mapa, y
 * repinta si `showCoverage` está activo.
 */
export function useMapLayers(send: (msg: object) => void, scheme: 'light' | 'dark') {
  const { showCoverage, basemap, setBasemap } = useSettings();

  const [layerIds, setLayerIds] = useState<typeof FALLBACK_LAYER_IDS | null>(null);
  // La capa "urbano" de ENAIRE cubre España entera (son las FIR, ver
  // ADVISORY_LAYERS): pintada por defecto taparía todo el mapa sin aportar nada.
  const [visible, setVisible] = useState<Record<LayerKey, boolean>>({
    aero: true,
    urbano: false,
    infraestructuras: true,
  });
  const initialVisible = useRef(visible);
  const [legendOpen, setLegendOpen] = useState(false);
  const [coverageState, setCoverageState] = useState<'off' | 'calculando' | 'on' | 'sin-paquete'>('off');
  // Lado real de la celda pintada: al alejar el mapa la celda crece, y la
  // leyenda tiene que decir con qué resolución se está mirando.
  const [cellMetres, setCellMetres] = useState<number | null>(null);
  const viewRef = useRef<MapView | null>(null);

  useEffect(() => {
    let alive = true;
    getLayerIds()
      .then((ids) => alive && setLayerIds(ids))
      .catch(() => alive && setLayerIds(FALLBACK_LAYER_IDS));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    send({ type: 'theme', dark: scheme === 'dark' });
  }, [scheme, send]);

  useEffect(() => {
    send({ type: 'basemap', base: basemap });
  }, [basemap, send]);

  /**
   * Repite tema y mapa base. Se llama en el 'ready' del mapa: los efectos de
   * arriba se disparan aunque todavía no exista el WebView, y esos mensajes se
   * pierden por el camino. Sin esto, el mapa base guardado en los ajustes no
   * llegaba nunca y el mapa se abría siempre con el callejero.
   */
  const resync = useCallback(() => {
    send({ type: 'theme', dark: scheme === 'dark' });
    send({ type: 'basemap', base: basemap });
  }, [send, scheme, basemap]);

  const toggleLayer = useCallback(
    (key: LayerKey) => {
      Haptics.selectionAsync().catch(() => {});
      setVisible((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        send({ type: 'layers', visible: next });
        return next;
      });
    },
    [send],
  );

  /**
   * Pinta la altura libre de cada celda del área visible. Se calcula con el
   * paquete descargado: sin él no hay geometría en el móvil y no se puede.
   */
  const paintCoverage = useCallback(async () => {
    const view = viewRef.current;
    if (!view) return;
    setCoverageState('calculando');
    const pack = await loadPack();
    if (!pack) {
      setCoverageState('sin-paquete');
      send({ type: 'coverageOff' });
      return;
    }
    // Área visible aproximada a partir del centro y el zoom.
    const spanLat = (360 / Math.pow(2, view.zoom)) * 1.2;
    const spanLon = spanLat / Math.cos((view.lat * Math.PI) / 180);
    const area = {
      minLat: view.lat - spanLat / 2,
      maxLat: view.lat + spanLat / 2,
      minLon: view.lon - spanLon / 2,
      maxLon: view.lon + spanLon / 2,
    };
    const grid = computeCoverageGrid(pack, area);
    if (grid.bbox.maxLat <= grid.bbox.minLat || grid.bbox.maxLon <= grid.bbox.minLon) {
      setCoverageState('sin-paquete');
      send({ type: 'coverageOff' });
      return;
    }
    // Las alturas van empaquetadas (un byte por celda) y el color lo pone el
    // mapa con estas mismas paradas: a 10 m de celda, mandar cien mil cadenas
    // de color por cada movimiento del mapa no es viable. Ver encodeCoverage.
    send({
      type: 'coverage',
      bbox: grid.bbox,
      rows: grid.rows,
      cols: grid.cols,
      data: encodeCoverage(grid.values),
      stops: COVERAGE_STOPS,
      unknownByte: COVERAGE_UNKNOWN_BYTE,
      unknownColor: COVERAGE_UNKNOWN_COLOR,
    });
    setCellMetres(Math.round(grid.cellMetres));
    setCoverageState('on');
  }, [send]);

  useEffect(() => {
    if (!showCoverage) {
      send({ type: 'coverageOff' });
      setCoverageState('off');
    }
  }, [showCoverage, send]);

  /** Llamar en cada 'move'/'ready' del mapa con el nuevo centro y zoom. */
  const onViewChanged = useCallback(
    (view: MapView) => {
      viewRef.current = view;
      if (showCoverage) paintCoverage();
    },
    [showCoverage, paintCoverage],
  );

  return {
    layerIds,
    visible,
    initialVisible,
    toggleLayer,
    legendOpen,
    setLegendOpen,
    coverageState,
    cellMetres,
    showCoverage,
    basemap,
    setBasemap,
    onViewChanged,
    resync,
  };
}
