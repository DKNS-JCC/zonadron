import React from 'react';
import type { ViewStyle } from 'react-native';
import type { MapFrameHandle, MapFrameProps } from './MapFrame';
import { t } from '../i18n';

/**
 * Versión para navegador: react-native-webview no existe en web, así que se usa
 * un iframe con el mismo HTML y el mismo protocolo de mensajes.
 */
export const MapFrame = React.forwardRef<MapFrameHandle, MapFrameProps>(
  ({ html, onMessage }, ref) => {
    const frameRef = React.useRef<HTMLIFrameElement | null>(null);
    // Mismo motivo que en la versión nativa: hasta el 'ready' del iframe no hay
    // nadie escuchando, así que lo que llegue antes se guarda y se suelta luego.
    const ready = React.useRef(false);
    const pending = React.useRef<object[]>([]);

    const send = React.useCallback((message: object) => {
      frameRef.current?.contentWindow?.postMessage(JSON.stringify(message), '*');
    }, []);

    React.useImperativeHandle(ref, () => ({
      post: (message: object) => {
        if (!ready.current) {
          pending.current.push(message);
          return;
        }
        send(message);
      },
    }));

    React.useEffect(() => {
      ready.current = false;
      pending.current = [];
    }, [html]);

    React.useEffect(() => {
      const handler = (event: MessageEvent) => {
        if (typeof event.data !== 'string') return;
        try {
          const data = JSON.parse(event.data);
          if ((data as { type?: string })?.type === 'ready' && !ready.current) {
            ready.current = true;
            const queued = pending.current;
            pending.current = [];
            for (const msg of queued) send(msg);
          }
          onMessage(data);
        } catch {
          /* mensaje no reconocido */
        }
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }, [onMessage, send]);

    return (
      <iframe
        ref={frameRef}
        srcDoc={html}
        title={t('map.webTitle')}
        style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
      />
    );
  },
);

MapFrame.displayName = 'MapFrame';
