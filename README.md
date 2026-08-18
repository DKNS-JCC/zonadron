# Zona Dron

App móvil para saber, de un vistazo y en lenguaje claro, **si puedes volar tu dron en un punto
concreto de España**.

Consulta en directo las **Zonas Geográficas UAS oficiales de ENAIRE** (formato ED-318, el mismo dato
que hay detrás de ENAIRE Drones) y responde con un veredicto sencillo: puedes volar, puedes volar con
condiciones, necesitas autorización o no puedes volar.

> **Aviso**: es una herramienta de consulta independiente. No sustituye a los servicios oficiales de
> ENAIRE ni a la normativa. La responsabilidad del vuelo es siempre del piloto.

---

## Qué hace

| Pantalla | Para qué sirve |
|---|---|
| **Volar aquí** | Coge tu posición por GPS y te da el veredicto del punto exacto donde estás. |
| **Mapa** | Mapa con las capas oficiales de ENAIRE pintadas encima. Toca cualquier punto para consultarlo. |
| **Buscar** | Escribe una dirección, un municipio o unas coordenadas y consulta ese punto. |
| **Normas** | Resumen de la normativa aplicable y enlaces a todas las fuentes oficiales. |

### Lo que responde

- **Hasta qué altura puedes subir sin pedirle permiso a nadie**, como número directo. Es el suelo
  más bajo de las zonas que exigen autorización, acotado al límite legal de 120 m. En vez de ir
  probando alturas hasta que deje de salir en rojo, te lo dice: *"60 m sin pedir permiso; por encima
  entras en CTR SALAMANCA"*.
- **NOTAM**: avisos temporales (ejercicios militares, zonas activadas unos días, espectáculos
  aéreos). Son restricciones reales que no están en el mapa de zonas porque no son permanentes, y
  son las que pillan por sorpresa. Se consultan al servicio de NOTAM para UAS de ENAIRE.
- **Margen hasta la siguiente zona restringida** y rumbo: saber que estás fuera no basta si el borde
  pasa a 80 m.
- **Condiciones de vuelo**: rachas, viento, lluvia, visibilidad y hora del ocaso, con umbrales según
  el tipo de dron.
- **Modo sin cobertura**: descarga por wifi las zonas de 25 km a la redonda más una rejilla de
  elevaciones, y responde sin datos móviles. Los NOTAM no se guardan (cambian a diario y uno viejo es
  peor que ninguno) y la app lo dice.

### Interfaz

- **El veredicto es lo primero de la pantalla**: tarjeta de color sólido, legible con sol directo y
  de un vistazo. La altura de vuelo vive dentro de esa tarjeta, plegada, en vez de por encima.
- **Las zonas se listan plegadas**, una fila cada una; se abren si quieres el detalle y el texto
  oficial íntegro de ENAIRE.
- **En el mapa, mover la cruz consulta el punto solo** y el resultado aparece en una hoja inferior sin
  salir del mapa.
- **Historial** de los últimos puntos consultados, y botón de compartir (veredicto + coordenadas +
  zonas + contactos).
- **Solicitud de autorización redactada sola**: en las zonas que publican correo de contacto, un
  botón abre tu app de correo con la petición escrita y tus datos rellenados. La envías tú.
- **Ajustes** con tus datos de operador (nombre, número UAS de AESA, contacto, modelo y número de
  serie del dron). Se guardan sólo en el móvil.
- **Vista previa del mapa** en cada resultado, para comprobar de un vistazo dónde ha caído el punto
  cuando buscas por nombre.

### Lo que la diferencia de la app de ENAIRE

- **Un veredicto, no un muro de texto.** La app clasifica las zonas por severidad y te dice lo que
  tienes que hacer en una frase. El mensaje oficial íntegro sigue estando ahí, a un toque de distancia.
- **La altura importa de verdad.** Muchas zonas empiezan a 300 m o más y están referidas al *nivel del
  mar*. La app pide la elevación real del terreno en tu punto y convierte todos los límites a altura
  sobre el suelo. Volando a 120 m en Los Monegros el resultado es «puedes volar»; a 400 m, ya entra la
  TMA de Zaragoza. Ese cálculo es la diferencia entre una respuesta útil y un «consulta la normativa».
- **Sin ruido.** La capa `ZGUAS_Urbano` de ENAIRE son en realidad las cuatro FIR españolas: cubre el
  país entero y su texto sólo dice «compruebe si está en entorno urbano». Si se contase como una zona
  más, *cualquier* punto de España saldría en rojo. Aquí se muestra como aviso permanente, completo,
  pero sin contaminar el veredicto. Está documentado en `src/api/enaire.ts` (`ADVISORY_LAYERS`).
- **Todo en el móvil.** No hay servidor propio, ni caché intermedia, ni copia local de las zonas. El
  teléfono habla directamente con ENAIRE, así que el dato es siempre el vigente.

---

## Fuentes de datos

| Dato | Fuente | Enlace |
|---|---|---|
| Zonas Geográficas UAS | ENAIRE — servicio `SRV_UAS_ZG_data_V2` (ArcGIS REST, ED-318) | <https://aip.enaire.es/AIP/UAS-es.html> |
| Documentación del servicio | ENAIRE — servAIS API | <https://aip.enaire.es/recursos/descargas/ZGUAS/servAIS_APIDOC.pdf> |
| Elevación del terreno | Copernicus DEM GLO-90 vía Open-Meteo | <https://open-meteo.com/en/docs/elevation-api> |
| Búsqueda de lugares | Nominatim / OpenStreetMap | <https://nominatim.openstreetmap.org/> |
| Mapa base | OpenStreetMap (y CARTO en modo oscuro) | <https://www.openstreetmap.org/copyright> |
| Normativa | RD 517/2024, Reglamentos (UE) 2019/947 y 2019/945, guía UAS-OPS-DT01 de AESA | <https://www.seguridadaerea.gob.es/es/ambitos/drones> |

Ninguna de estas fuentes necesita clave de API ni registro.

---

## Cómo ejecutarla

Requisitos: Node.js 20 o superior.

```bash
npm install
npm start
```

Después:

- **En tu móvil**: instala **Expo Go** (Android/iOS) y escanea el QR que aparece en la terminal.
- **En un emulador**: `npm run android` o `npm run ios`.
- **En el navegador** (útil para ver la interfaz rápido): `npm run web`.

### Generar un APK / IPA instalable

El proyecto usa el flujo estándar de Expo, así que:

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview   # APK instalable
eas build --platform ios                          # requiere cuenta de desarrollador de Apple
```

También puedes generar los proyectos nativos y compilarlos tú (`npx expo prebuild`).

---

## Verificación

El motor de decisión se comprueba contra el servicio **real** de ENAIRE, no contra datos simulados:

```bash
npm run test:motor
```

Consulta puntos conocidos (pistas de Barajas, El Prat, Puerta del Sol, Sagrada Família, campo abierto
en Los Monegros) y comprueba que el veredicto es el que debe ser, que la altura cambia el resultado,
que ningún aviso general se cuela en el veredicto y que la limpieza del HTML oficial no deja marcado.

También hay comprobación de tipos:

```bash
npm run typecheck
```

---

## Cómo está montado

```
app/                     Rutas (expo-router)
  (tabs)/index.tsx         "Volar aquí": GPS + veredicto
  (tabs)/mapa.tsx          Mapa con las capas de ENAIRE
  (tabs)/buscar.tsx        Buscador de lugares
  (tabs)/info.tsx          Normativa y fuentes
  resultado.tsx            Resultado de un punto elegido en mapa o búsqueda

src/
  api/enaire.ts            Cliente del servicio oficial de ENAIRE
  api/elevation.ts         Elevación del terreno
  api/geocode.ts           Búsqueda de lugares y geocodificación inversa
  logic/verdict.ts         Motor: cálculo vertical, vigencia y veredicto
  logic/html.ts            Conversión del HTML oficial a texto legible
  logic/labels.ts          Traducción de los códigos ED-318 a lenguaje llano
  logic/rules.ts           Resumen de normativa con sus fuentes
  map/mapHtml.ts           Mapa Leaflet embebido
  map/leafletVendor.ts     Leaflet empaquetado (generado, no editar a mano)
  components/              Interfaz
```

### Decisiones técnicas que conviene conocer

- **Las capas de ENAIRE se consultan en serie, no en paralelo.** El servicio rechaza las peticiones
  simultáneas del mismo cliente devolviendo HTML en vez de JSON, lo que producía resultados
  incompletos sin avisar. En secuencia tarda alrededor de un segundo.
- **Se piden todos los campos (`outFields=*`).** Las tres capas no comparten esquema exacto; pedir una
  lista fija hacía fallar dos de ellas en silencio.
- **El mapa es Leaflet dentro de un WebView**, no `react-native-maps`. Así no hace falta ninguna clave
  de Google/Apple Maps y se pueden superponer las teselas oficiales de ENAIRE tal cual las dibuja su
  visor. Leaflet va empaquetado dentro de la app (`npm run vendor:leaflet` lo regenera) para no
  depender de un CDN.
- **Ante la duda, lo más restrictivo.** Si falta la elevación del terreno, la unidad o la referencia
  vertical de una zona, esa zona se considera aplicable y se avisa en pantalla.
- **Una respuesta parcial nunca es un "sí".** Si alguna de las tres capas de ENAIRE no responde y no
  se ha encontrado nada restrictivo, el veredicto es «No se ha podido comprobar», no «Puedes volar».
  Es la comprobación más importante de `npm run test:motor`.
- **Las fechas de ENAIRE se interpretan como UTC** y con margen antes de dar una zona por caducada:
  darla por caducada la saca del veredicto.
- **Alturas medidas desde el punto de referencia del aeródromo.** 519 de las 1.679 zonas
  aeronáuticas dicen "90 m AGL" pero su texto aclara que esos metros se miden desde el punto de
  referencia del aeródromo, no desde el suelo donde estás. La app lee esa elevación del texto oficial
  y recalcula: en el helipuerto del Hospital de Salamanca (ARP a 770 m), en un punto con el terreno a
  785 m la zona empieza a 75 m sobre ti, no a 90. Tomarlo al pie de la letra era permisivo de más
  siempre que el terreno estuviera por encima del aeródromo. Ver `src/logic/reference.ts`.

---

## Licencia y créditos

Código de la app: úsalo como quieras.

- Zonas Geográficas UAS © ENAIRE.
- Mapa base © colaboradores de OpenStreetMap (ODbL).
- Leaflet © Volodymyr Agafonkin y CloudMade (BSD-2-Clause).
