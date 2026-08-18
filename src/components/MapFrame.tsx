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

    React.useImperativeHandle(ref, () => ({
      post: (message: object) => webRef.current?.postMessage(JSON.stringify(message)),
    }));

    return (
      <WebView
        ref={webRef}
        source={{ html, baseUrl: 'https://servais.enaire.es' }}
        originWhitelist={['*']}
        onMessage={(event) => {
          try {
            onMessage(JSON.parse(event.nativeEvent.data));
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
