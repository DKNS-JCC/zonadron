import React from 'react';
import { WebView } from 'react-native-webview';
import type { ViewStyle } from 'react-native';

export interface MapFrameHandle {
  post: (message: object) => void;
}

export interface MapFrameProps {
  html: string;
  onMessage: (data: unknown) => void;
  style?: ViewStyle;
}

/**
 * El mapa vive dentro de un WebView con Leaflet. Ver `MapFrame.web.tsx` para la
 * versión equivalente con iframe que se usa al ejecutar la app en navegador.
 */
export const MapFrame = React.forwardRef<MapFrameHandle, MapFrameProps>(
  ({ html, onMessage, style }, ref) => {
    const webRef = React.useRef<WebView>(null);
    // Hasta que Leaflet no ha arrancado dentro del WebView no hay nadie
    // escuchando, y un postMessage temprano se pierde sin dejar rastro. Los
    // mensajes se guardan y se sueltan de golpe cuando el mapa dice 'ready'.
    const ready = React.useRef(false);
    const pending = React.useRef<object[]>([]);

    React.useImperativeHandle(ref, () => ({
      post: (message: object) => {
        if (!ready.current) {
          pending.current.push(message);
          return;
        }
        webRef.current?.postMessage(JSON.stringify(message));
      },
    }));

    // Un html nuevo es un mapa nuevo: vuelve a estar sordo hasta su 'ready'.
    React.useEffect(() => {
      ready.current = false;
      pending.current = [];
    }, [html]);

    return (
      <WebView
        ref={webRef}
        source={{ html, baseUrl: 'https://servais.enaire.es' }}
        originWhitelist={['*']}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if ((data as { type?: string })?.type === 'ready' && !ready.current) {
              ready.current = true;
              const queued = pending.current;
              pending.current = [];
              for (const msg of queued) webRef.current?.postMessage(JSON.stringify(msg));
            }
            onMessage(data);
          } catch {
            /* mensaje no reconocido */
          }
        }}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        allowsInlineMediaPlayback
        style={[{ flex: 1 }, style]}
      />
    );
  },
);

MapFrame.displayName = 'MapFrame';
