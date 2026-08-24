# Ficha de Google Play: textos y respuestas

Todo lo que pide la consola, listo para copiar. El procedimiento de compilar y
subir está en [`publicar.md`](publicar.md); esto es el contenido.

---

## 0. La casilla de «cumple las Políticas del Programa para Desarrolladores»

Esa declaración la firma el desarrollador, no la puede firmar nadie por él. Lo
que sigue es lo que hace la aplicación de verdad, contrastado con el código, para
que al marcarla se esté diciendo la verdad:

| Política que aplica | Qué hace la app |
|---|---|
| Falsedad / suplantación | No usa la marca ni el logotipo de ENAIRE ni de AESA, y no dice ni sugiere ser oficial. Las cita como fuente de datos, que es lo que son. |
| Afirmaciones engañosas | No promete legalidad: enseña el veredicto con el texto oficial delante y con el descargo de responsabilidad en el resultado y en Normas. La responsabilidad del vuelo es del piloto y lo dice la app. |
| Datos de usuario | No hay cuentas, no hay servidor propio, no hay analítica ni rastreadores. Lo que el usuario guarda vive en el almacenamiento privado de la app. |
| Permisos | Cuatro y ninguno delicado: `INTERNET`, `VIBRATE`, `ACCESS_COARSE_LOCATION` y `ACCESS_FINE_LOCATION`. Sin ubicación en segundo plano, sin acceso a todos los archivos, sin superponerse a otras apps. |
| Ubicación | Se usa en primer plano, para una función que el usuario pide, y se explica en la propia pantalla. Se puede usar la app entera sin conceder el permiso: buscando el sitio o marcándolo en el mapa. |
| Anuncios | No hay. |
| Pagos | No hay compras ni suscripciones. El enlace de apoyo es externo y no desbloquea nada dentro de la app. |
| Apps gubernamentales | No lo es, y no se presenta como tal. |
| Contenido | Sin contenido sensible de ningún tipo. |

**Los tres permisos que se han quitado** (`SYSTEM_ALERT_WINDOW`,
`READ_EXTERNAL_STORAGE` y `WRITE_EXTERNAL_STORAGE`) los metía la plantilla de
Expo sin que la app los usara. Están bloqueados en `app.json` con
`android.blockedPermissions`. Pedir permisos que no se usan es motivo de rechazo
y, en una app cuyo argumento es la privacidad, además queda fatal.

---

## 1. Textos de la ficha

Escritos evitando lo que más suspensiones provoca: nada de «oficial», ningún
superlativo, ninguna marca ajena metida para posicionar, ninguna promesa que la
app no cumpla, y el descargo de responsabilidad dentro de la propia descripción.

### Nombre de la aplicación (máx. 30)

```
Zona Dron
```

### Descripción breve (máx. 80)

**Español**

```
¿Puedes volar tu dron aquí? Zonas UAS, altura libre y consulta sin cobertura.
```

**English**

```
Can you fly your drone here? UAS zones, free height, and offline checks.
```

### Descripción completa (máx. 4000)

**Español**

```
Zona Dron responde a una sola pregunta: ¿puedo volar mi dron aquí?

Marca un punto en España —donde estás, un sitio buscado o una chincheta
compartida desde otra app de mapas— y la aplicación consulta las zonas
geográficas UAS que publica ENAIRE, las cruza con la altura a la que piensas
volar y te dice en qué situación estás: libre, con condiciones, con autorización
previa o prohibido.

QUÉ VAS A VER

• El veredicto del punto, explicado en lenguaje llano y con el texto oficial de
  la zona delante para que puedas leerlo tú.
• Hasta qué altura puedes subir sin pedir permiso a nadie.
• Qué zona te afecta, desde qué altura y por qué, con los datos de contacto de
  quien la gestiona cuando los publica.
• Un borrador de solicitud de autorización con tus datos y los de tu dron, listo
  para que lo revises y lo envíes tú desde tu aplicación de correo.
• Viento, visibilidad, amanecer, ocaso, hora dorada y hora azul del punto exacto.
• Amanecer y ocaso reales teniendo en cuenta el relieve, no sólo el horizonte
  teórico.

SIN COBERTURA

Se vuela en el campo, que es justo donde no hay datos móviles. Descarga por wifi
el área donde vas a volar y la comprobación se hace entera en el teléfono. Las
respuestas sin conexión se marcan como tales y llevan la fecha de descarga, para
que sepas de cuándo son los datos que estás viendo.

TU EQUIPO Y TUS PAPELES

Guarda tus drones con su modelo, número de serie y clase, y ten a mano el carnet
de piloto, el registro de operador, el seguro o la declaración de conformidad.
Puedes ponerle fecha de caducidad a cada documento y la aplicación te avisa antes
de que se te pase. Todo se guarda en tu teléfono.

PRIVACIDAD

No hay cuentas ni registro. No hay anuncios. No hay analítica ni rastreadores. No
hay servidor propio: lo único que sale del teléfono son las coordenadas del punto
que consultas, y sólo para preguntárselo a los servicios que responden. Lo que
guardas se queda contigo. El código es libre y se puede revisar.

AVISO IMPORTANTE

Zona Dron es una herramienta de consulta independiente. No es un servicio oficial
y no está afiliada a ENAIRE ni a AESA. No sustituye a la publicación oficial del
AIP, a los NOTAM ni a la normativa vigente: la responsabilidad de comprobar que
un vuelo es legal y seguro es siempre del piloto.

FUENTES

Zonas geográficas UAS y NOTAM de ENAIRE; cartografía del IGN y del PNOA;
elevación del terreno y meteorología de Open-Meteo; búsqueda de lugares de
OpenStreetMap; usos del suelo y espacios protegidos del Catastro, el MITECO y el
IEPNB. Normativa: Reglamentos (UE) 2019/947 y 2019/945 y Real Decreto 517/2024.

Código y política de privacidad: https://dkns-jcc.github.io/zonadron/
```

**English**

```
Zona Dron answers one question: can I fly my drone here?

Mark a spot in Spain — where you are, a place you searched, or a pin shared from
another maps app — and the app checks the UAS geographical zones published by
ENAIRE, cross-references them with the height you plan to fly at, and tells you
where you stand: free, conditional, authorisation required, or forbidden.

WHAT YOU GET

• The verdict for the spot, in plain language, with the zone's official text in
  front of you so you can read it yourself.
• How high you can climb without asking anyone for permission.
• Which zone affects you, from what height and why, with the contact details of
  whoever manages it when those are published.
• A draft authorisation request with your details and your drone's, ready for you
  to review and send from your own mail app.
• Wind, visibility, sunrise, sunset, golden hour and blue hour for that exact
  spot.
• Real sunrise and sunset accounting for the terrain, not just the theoretical
  horizon.

WITHOUT COVERAGE

Flying happens out in the field, which is exactly where there is no mobile data.
Download the area over wi-fi and the whole check runs on the phone. Offline
answers are marked as such and carry their download date, so you know how old the
data you are looking at is.

YOUR GEAR AND YOUR PAPERWORK

Keep your drones with their model, serial number and class, and your pilot
certificate, operator registration, insurance or declaration of conformity within
reach. Give any document an expiry date and the app warns you before it runs out.
It all stays on your phone.

PRIVACY

No accounts, no sign-up. No ads. No analytics, no trackers. No server of its own:
the only thing that leaves the phone is the coordinates of the spot you are
checking, and only to ask the services that answer. What you save stays with you.
The source code is open and can be reviewed.

IMPORTANT NOTICE

Zona Dron is an independent reference tool. It is not an official service and is
not affiliated with ENAIRE or AESA. It does not replace the official AIP
publication, NOTAMs or the regulations in force: checking that a flight is legal
and safe is always the pilot's responsibility.

SOURCES

UAS geographical zones and NOTAMs from ENAIRE; cartography from IGN and PNOA;
terrain elevation and weather from Open-Meteo; place search from OpenStreetMap;
land use and protected areas from Catastro, MITECO and IEPNB. Regulations:
(EU) 2019/947 and 2019/945, and Royal Decree 517/2024.

Source code and privacy policy: https://dkns-jcc.github.io/zonadron/
```

---

## 2. Respuestas a los formularios

### Ficha principal

| Campo | Respuesta |
|---|---|
| Idioma por defecto | Español (España) — añadir English (United States) como segundo idioma |
| Tipo | Aplicación (no es un juego) |
| Gratuita o de pago | **Gratuita** (una app gratuita no se puede convertir en de pago después) |
| Categoría | Mapas y navegación |
| Etiquetas | Mapas, Navegación, Utilidades, Viajes, Tiempo |
| Correo de contacto | El de la cuenta de desarrollador |
| Sitio web | `https://dkns-jcc.github.io/zonadron/` |
| Política de privacidad | `https://dkns-jcc.github.io/zonadron/privacidad` |

### Contenido de la aplicación

| Sección | Respuesta |
|---|---|
| Acceso a la aplicación | Toda la funcionalidad está disponible sin restricciones de acceso. No hay cuentas ni credenciales. |
| Anuncios | **No**, la app no contiene anuncios. |
| Clasificación del contenido | Cuestionario IARC: **no** a todo (violencia, sexo, lenguaje, drogas, apuestas, contenido generado por usuarios, compartir ubicación con otros usuarios). Sale PEGI 3. |
| Público objetivo | 16-17 y 18 o más. **No** dirigida a menores. La edad mínima para pilotar en categoría abierta es 16 años. |
| Apps de noticias | No |
| Apps gubernamentales | No |
| Finanzas, salud, COVID | No |
| Programa de la biblioteca de datos | No aplica |

### Seguridad de los datos (aquí es donde suspenden fichas)

La app **no recopila ni almacena** nada fuera del dispositivo, pero **sí
transmite** las coordenadas del punto consultado a los servicios que responden. Se
declara así:

| Pregunta | Respuesta |
|---|---|
| ¿Recopila o comparte datos de usuario? | **Sí** |
| Tipo de dato | Ubicación → Ubicación aproximada y Ubicación precisa |
| ¿Recopilado? | **No** (no se almacena en ningún servidor) |
| ¿Compartido? | **Sí** — se envían las coordenadas a terceros para poder responder |
| Finalidad | **Funciones de la aplicación** (sólo ésa) |
| ¿Obligatorio? | **Opcional**: se puede usar la app buscando el sitio o marcándolo en el mapa |
| ¿Se cifra en tránsito? | **Sí** (todas las peticiones van por HTTPS) |
| ¿Se pueden solicitar la eliminación? | **No**, porque no se conserva nada que borrar |
| Archivos y documentos del usuario | **No** se recopilan ni se comparten: se quedan en el almacenamiento privado de la app |
| Identificadores, contactos, mensajes, fotos, salud, finanzas | No |

Y el enlace a la política de privacidad, que detalla servicio por servicio qué
recibe cada uno.

### Declaración de permisos

Ninguno de los permisos de la app está en la lista de los que exigen formulario
(ubicación en segundo plano, todos los archivos, SMS, registro de llamadas,
accesibilidad, `QUERY_ALL_PACKAGES`). Si la consola pregunta por la ubicación:
sólo en primer plano, para comprobar el punto donde está el usuario, y la app
funciona sin ella.

---

## 3. Recursos gráficos

| Recurso | Requisito de Play | Dónde está |
|---|---|---|
| Icono | 512×512 PNG de 32 bits | `docs/tienda/icono-512.png` |
| Gráfico destacado | 1024×500 PNG o JPEG, **sin canal alfa** | `docs/tienda/destacado-1024x500.png` |
| Capturas de teléfono | Mínimo 2, máximo 8. Cada lado entre 320 y 3840 px, y **el lado largo no puede pasar del doble del corto** | `capturas/es/` y `capturas/en/`, a 780×1520 (1,95:1) |

Las capturas se regeneran con `npm run web:export && npm run capturas` (y
`npm run capturas en`). El tamaño de captura está fijado en
[`scripts/capturas.mjs`](../scripts/capturas.mjs) precisamente por el límite de
proporción: un móvil moderno es 19,5:9 y se sale del máximo que acepta Play.

Sugerencia de orden para las ocho capturas: el veredicto de un punto, el mapa con
las zonas, un resultado que exige autorización, luz y sombras, el cuaderno, el
perfil con la flota, la descarga sin cobertura y los ajustes.

---

## 4. Subirlo

1. **Compilar el paquete de Android** (AAB, que es lo que acepta Play):

   ```bash
   npx eas build --platform android --profile production
   ```

   Al terminar, descargar el `.aab` desde el enlace que da EAS.

2. **Firma**: en la primera subida, aceptar **Play App Signing**. Google se
   queda con la clave de firma y tú subes con la de EAS. Ojo: a partir de ahí, la
   versión de Play y las APK que se reparten por GitHub tienen firmas distintas y
   no se actualizan entre sí (ver `publicar.md`).

3. **Pruebas internas** primero: Versiones → Pruebas → Pruebas internas → Crear
   versión → subir el `.aab` → notas de la versión → revisar y lanzar. Instálala
   en tu móvil desde el enlace de la lista de testers y comprueba lo que no se
   puede probar en el navegador: consulta con GPS, chincheta compartida desde
   Google Maps, y añadir y abrir un documento.

4. **Contenido de la aplicación**: rellenar todas las declaraciones de la sección
   2. La ficha no se puede publicar hasta que estén todas en verde.

5. **Pruebas cerradas**: si la cuenta es personal y nueva, Google puede exigir un
   periodo de prueba cerrada con un mínimo de testers durante varias semanas antes
   de permitir producción. Es lo que más tarda: empezar cuanto antes.

6. **Producción**, por fases: empezar en el 10-20 % y subir si no aparecen fallos
   en Android vitals.

7. **Etiquetar la versión en git** y publicar la APK en la release de GitHub para
   quien la instale a mano.
