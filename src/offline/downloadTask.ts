/**
 * La descarga del paquete, fuera de la pantalla que la lanza.
 *
 * Descargar una zona tarda minutos, y la mayor parte de ese tiempo es esperar
 * al límite por minuto de Open-Meteo (ver `src/api/openMeteo.ts`). Si la tarea
 * viviera dentro del componente de la pantalla, salir de ella la mataría y el
 * usuario tendría que quedarse mirando una barra sin poder usar la app.
 *
 * Así que vive aquí: un único proceso a nivel de módulo al que las pantallas se
 * suscriben. Se lanza desde "Descargar zona", se sigue viendo desde la tarjeta
 * de Ajustes, y navegar no lo interrumpe.
 *
 * Ojo con el alcance: esto sobrevive a la NAVEGACIÓN, no a que el sistema mate
 * la app. Si el usuario la cierra a mitad, la descarga se pierde — `buildPack`
 * sólo escribe el fichero al terminar, así que no queda un paquete a medias.
 */

import { useCallback, useSyncExternalStore } from 'react';
import { describePoint } from '../api/geocode';
import { t } from '../i18n';
import { buildPack, type BuildProgress, type PackMeta } from './pack';

export interface DownloadTarget {
  center: { lat: number; lon: number };
  radiusKm: number;
  /** Nombre del sitio; llega en cuanto lo resuelve el geocodificador. */
  label: string | null;
}

export type DownloadState =
  | { status: 'idle' }
  | { status: 'running'; target: DownloadTarget; progress: BuildProgress }
  | { status: 'done'; target: DownloadTarget; meta: PackMeta }
  | { status: 'error'; target: DownloadTarget; message: string }
  | { status: 'cancelled'; target: DownloadTarget };

let state: DownloadState = { status: 'idle' };
let controller: AbortController | null = null;
const listeners = new Set<() => void>();

function emit(next: DownloadState) {
  state = next;
  for (const l of listeners) l();
}

export function getDownloadState(): DownloadState {
  return state;
}

export function subscribeDownload(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** true si hay una descarga en curso ahora mismo. */
export function isDownloading(): boolean {
  return state.status === 'running';
}

/**
 * Lanza la descarga. Devuelve false si ya hay una en marcha: dos a la vez se
 * pisarían el fichero y se repartirían el presupuesto de la API, tardando el
 * doble las dos.
 */
export function startDownload(center: { lat: number; lon: number }, radiusKm: number): boolean {
  if (state.status === 'running') return false;

  const target: DownloadTarget = { center, radiusKm, label: null };
  controller = new AbortController();
  const signal = controller.signal;

  emit({ status: 'running', target, progress: { step: 'zonas', pct: 0 } });

  void (async () => {
    try {
      const label = (await describePoint(center.lat, center.lon).catch(() => null))
        ?? t('download.fallbackName');
      // El nombre llega tarde a propósito: no se hace esperar a la descarga por
      // una etiqueta. Se refleja en cuanto está.
      const named: DownloadTarget = { ...target, label };
      const current = getDownloadState();
      if (current.status === 'running') {
        emit({ status: 'running', target: named, progress: current.progress });
      }

      const meta = await buildPack(
        center,
        label,
        radiusKm,
        (progress) => {
          // Una respuesta que llega tras cancelar no debe resucitar el estado.
          if (signal.aborted || getDownloadState().status !== 'running') return;
          emit({ status: 'running', target: named, progress });
        },
        signal,
      );

      if (signal.aborted) {
        emit({ status: 'cancelled', target: named });
        return;
      }
      emit({ status: 'done', target: named, meta });
    } catch (err) {
      const running = getDownloadState();
      const named = running.status === 'running' ? running.target : target;
      if (signal.aborted) {
        emit({ status: 'cancelled', target: named });
        return;
      }
      emit({
        status: 'error',
        target: named,
        message: err instanceof Error ? err.message : t('download.failed'),
      });
    } finally {
      controller = null;
    }
  })();

  return true;
}

export function cancelDownload(): void {
  controller?.abort();
}

/** Se llama tras enseñar el resultado, para volver a dejar la tarjeta limpia. */
export function clearDownloadOutcome(): void {
  if (state.status !== 'running') emit({ status: 'idle' });
}

/**
 * Qué está pasando ahora mismo, en una línea. Vive aquí y no en la pantalla de
 * descarga porque la tarjeta de Ajustes enseña lo mismo mientras baja.
 */
export function stepLabel(progress: BuildProgress): string {
  return progress.step === 'zonas'
    ? t('download.step.zonas')
    : progress.step === 'elevacion'
      ? t('download.step.elevacion')
      : t('download.step.guardando');
}

/**
 * Lo que queda, en cristiano. Devuelve null cuando todavía no hay una
 * estimación: mejor no poner nada que poner un número inventado.
 */
export function remainingLabel(progress: BuildProgress): string | null {
  const secs = progress.etaSeconds;
  if (secs === undefined) return null;
  if (secs < 60) return t('download.remainingSoon');
  return t('download.remaining', Math.round(secs / 60));
}

/** Estado de la descarga, reactivo, para cualquier pantalla. */
export function useDownloadState(): DownloadState {
  const subscribe = useCallback((listener: () => void) => subscribeDownload(listener), []);
  return useSyncExternalStore(subscribe, getDownloadState, getDownloadState);
}
