import React from 'react';
import type { ViewStyle } from 'react-native';
import type { MapFrameHandle, MapFrameProps } from './MapFrame';

/**
 * Versión para navegador: react-native-webview no existe en web, así que se usa
 * un iframe con el mismo HTML y el mismo protocolo de mensajes.
 */
export const MapFrame = React.forwardRef<MapFrameHandle, MapFrameProps>(
  ({ html, onMessage }, ref) => {
    const frameRef = React.useRef<HTMLIFrameElement | null>(null);

    React.useImperativeHandle(ref, () => ({
      post: (message: object) =>
        frameRef.current?.contentWindow?.postMessage(JSON.stringify(message), '*'),
    }));

    React.useEffect(() => {
      const handler = (event: MessageEvent) => {
        if (typeof event.data !== 'string') return;
        try {
          onMessage(JSON.parse(event.data));
        } catch {
          /* mensaje no reconocido */
        }
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }, [onMessage]);

    return (
      <iframe
        ref={frameRef}
        srcDoc={html}
        title="Mapa de zonas UAS"
        style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
      />
    );
  },
);

MapFrame.displayName = 'MapFrame';
