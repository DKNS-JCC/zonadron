---
layout: default
title: Política de privacidad
lang: es
permalink: /privacidad
description: >-
  Zona Dron no recoge datos personales, no tiene cuentas ni servidor propio y no
  lleva anuncios ni rastreadores. Todo se queda en tu móvil.
---

# Política de privacidad de Zona Dron

*Última actualización: 24 de septiembre de 2026. Se aplica a Zona Dron (`es.zonadron.app`) en todas sus versiones.*

**English version: [privacy policy](privacy).**

## Lo corto

Zona Dron no recoge datos personales, no tiene cuentas de usuario, no tiene
servidor propio y no lleva publicidad ni rastreadores. Todo lo que guardas en la
app se queda en tu móvil.

## Qué se guarda, y dónde

Estas cosas se guardan **únicamente en el almacenamiento privado de la
aplicación, en tu dispositivo**. No se envían a ningún sitio, ni al desarrollador
ni a terceros:

- Tus ajustes (altura por defecto, idioma, aspecto, color de acento, mapa base).
- Tus datos de operador: nombre, número de operador UAS, correo y teléfono.
- Tus drones: alias, marca, modelo, número de serie, peso, clase y notas.
- Los documentos que añades (carnets, seguros, declaraciones de conformidad…).
  Los archivos se copian a la carpeta privada de la aplicación.
- Tus sitios guardados, tu historial de consultas y tu diario de vuelos.
- Los paquetes de datos que descargas para volar sin cobertura.

Se borran cuando los borras tú desde la app, o cuando desinstalas la aplicación.
Si tienes activada la copia de seguridad de Android, el sistema puede incluir
estos datos en la copia de tu propio dispositivo; eso lo gestiona Google con tu
cuenta, no la aplicación.

## Qué sale del móvil, y por qué

Para responder a «¿puedo volar aquí?» hay que preguntárselo a servicios
oficiales. Cuando haces una consulta, la aplicación envía **las coordenadas del
punto consultado** —y sólo eso— a estos servicios:

| Servicio | Para qué | Qué recibe |
|---|---|---|
| ENAIRE | Zonas geográficas UAS y NOTAM | Coordenadas del punto |
| Open-Meteo | Tiempo, viento y elevación del terreno | Coordenadas del punto |
| Nominatim (OpenStreetMap) | Buscar sitios por nombre y nombres de lugar | Texto buscado o coordenadas |
| IGN / IDEE / PNOA | Mapas base y cartografía | Coordenadas de las teselas del mapa |
| Catastro, MITECO, IEPNB | Uso del suelo y espacios protegidos | Coordenadas del punto |
| AIP de ENAIRE | Cartas y ficha del aeródromo, sólo al generar una EARO | Nada tuyo: se pide la página pública del aeródromo |
| Aviation Weather Center (NOAA) | METAR del aeródromo, sólo al generar una EARO | El indicador del aeródromo (por ejemplo, LEVC) |
| Google Maps / Apple Maps | Resolver un enlace que tú compartes con la app | El enlace compartido |

Esas peticiones no llevan tu identidad, ni tu nombre, ni un identificador de
dispositivo, ni tus datos de operador, ni tus documentos: sólo el punto que hace
falta para consultar. Cada uno de esos servicios tiene su propia política de
privacidad y verá, como cualquier servidor, la dirección IP desde la que le
llega la petición.

En modo sin cobertura, con un paquete descargado, la comprobación se hace entera
en el dispositivo y no sale nada.

Las solicitudes de autorización y demás correos que prepara la aplicación no los
manda ella: se abren en tu aplicación de correo, con los papeles que marques
adjuntos, y eres tú quien los revisa y los envía.

## Ubicación

La aplicación pide permiso de ubicación para comprobar el punto donde estás.
Esa ubicación se usa en el momento para hacer la consulta y no se guarda en
ningún servidor. Puedes usar la app sin dar el permiso: basta con buscar el sitio
o marcarlo en el mapa.

## Los documentos que guardas

Los archivos que añades a la carpeta de documentos se copian al almacenamiento
privado de la aplicación en tu dispositivo. **No se suben a ningún sitio.** Sólo
salen de ahí cuando tú lo pides: al pulsar «Abrir» o «Compartir», que es cuando
se le pasan a la aplicación que tú elijas, o al marcarlos para adjuntarlos a un
correo que luego mandas tú.

## Avisos

La aplicación puede mostrar avisos del sistema, por ejemplo la víspera de un
vuelo que tengas apuntado o antes de que caduque un documento. Esos avisos se
programan y se generan **en el propio móvil**: no hay servidor que los mande ni
notificaciones push, y no sale ningún dato para ello. El permiso de avisos sólo
se pide cuando hay algo que avisar, y puedes quitarlo cuando quieras desde los
ajustes del sistema.

## Compras

Si la aplicación ofrece algo de pago, la compra se hace **con Google Play** y se
rige por sus condiciones. Tus datos de pago los trata Google; el desarrollador
no los ve. Google le da al desarrollador los datos del pedido que da a cualquier
vendedor (número de pedido, producto, importe y país), que sólo se usan para
atender devoluciones y consultas. La aplicación guarda en el móvil la
confirmación de la compra, para seguir funcionando sin cobertura.

## Publicidad, analítica y perfilado

No hay. Ni publicidad, ni SDK de analítica, ni rastreadores, ni perfiles de
usuario, ni venta de datos a nadie. Si la aplicación falla, Google Play puede
darle al desarrollador un informe anónimo del fallo, como con cualquier
aplicación de la tienda; eso es de Google Play, no algo que añada la aplicación.

## Menores

La aplicación no está dirigida a menores y no recoge datos de nadie, tampoco de
ellos.

## Tus derechos

Como no se recoge ni se almacena ningún dato personal fuera de tu dispositivo,
no hay nada que el desarrollador pueda consultar, corregir o borrar por ti: los
datos son tuyos y están en tu móvil, y se borran desde la propia app o
desinstalándola.

## Código a la vista

El código fuente está publicado y se puede leer en
<https://github.com/DKNS-JCC/zonadron>, para que cualquiera pueda comprobar cómo
trata la aplicación tus datos. Está a la vista, no es de código abierto: las
condiciones de uso del código están en su licencia.

## Cambios en esta política

Si alguna vez cambia, se actualizará este documento con su fecha y se contará en
las notas de la versión correspondiente.

## Condiciones de uso

El uso de la aplicación se rige por sus [condiciones de uso](condiciones).

## Contacto

Jorge Cuadrado — a través de las incidencias del repositorio:
<https://github.com/DKNS-JCC/zonadron/issues>
