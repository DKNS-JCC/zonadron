# Publicar una versión

Cómo sale una versión de Zona Dron, para que dentro de seis meses salga igual de
ordenada que hoy. El canal principal es **Google Play**; las APK de las releases
de GitHub y el IPA sin firmar de iOS son canales secundarios.

---

## 1. Antes de la primera publicación en Google Play

Esto se hace una sola vez. Lo que está marcado como **bloqueante** impide enviar.

### Cuenta y ficha

- [ ] Cuenta de desarrollador verificada (documento de identidad y dirección de
      contacto pública — las cuentas personales tienen que mostrar una).
- [x] **Bloqueante:** política de privacidad en una URL pública. Publicada con
      GitHub Pages desde esta misma carpeta:
      <https://dkns-jcc.github.io/zonadron/privacidad> (en inglés,
      <https://dkns-jcc.github.io/zonadron/privacy>). La fuente es
      [`privacidad.md`](privacidad.md), en el repositorio: se cambia con un
      commit y se publica sola.
- [ ] Web de la ficha: <https://dkns-jcc.github.io/zonadron/>
- [x] **Textos, respuestas de los formularios y recursos gráficos: todo escrito
      en [`play-store.md`](play-store.md)**, listo para copiar. Incluye el
      descargo de responsabilidad dentro de la descripción, que en una app que
      roza lo normativo no es opcional.
- [x] Icono de 512×512 y gráfico destacado de 1024×500: `npm run tienda` los
      genera en [`tienda/`](tienda) con los colores de la app.
- [x] Capturas a 780×1520: `npm run web:export && npm run capturas` (y
      `npm run capturas en`). El tamaño está fijado por el límite de proporción
      de Play —el lado largo no puede pasar del doble del corto— que una captura
      de móvil moderno se salta.
- [ ] Categoría, correo de contacto y clasificación de contenido.

### Declaraciones

Las respuestas exactas, campo por campo, están en
[`play-store.md`](play-store.md#2-respuestas-a-los-formularios).

- [ ] **Seguridad de los datos.** Ojo con esto, que es donde se equivoca todo el
      mundo: la app **no recoge** datos, pero **sí envía las coordenadas del
      punto consultado a terceros** (ENAIRE, Open-Meteo, Nominatim, IGN,
      Catastro, MITECO, IEPNB) para poder responder. Se declara como ubicación
      *compartida con terceros para el funcionamiento de la app*, no recogida,
      sin identificadores, sin cuentas y sin almacenamiento en servidor. La
      lista completa y actualizada está en la política de privacidad.
- [ ] Sin anuncios. Sin compras dentro de la aplicación (mientras siga así, ver
      §4).
- [ ] Acceso a la app: toda la funcionalidad disponible sin registro ni
      credenciales.

### Pruebas previas

- [ ] **Bloqueante si aplica a la cuenta:** Google exige a las cuentas
      personales nuevas un periodo de prueba cerrada con un número mínimo de
      testers durante varias semanas antes de poder publicar en producción.
      Comprobar el requisito vigente en la consola y empezar a juntar testers
      cuanto antes: es lo que más tarda de todo esto.

#### Por dónde entran los testers

La página de alta ya está escrita: [`beta.md`](beta.md), publicada en
<https://dkns-jcc.github.io/zonadron/beta>. Es el enlace que va en la biografía
de Instagram. Le falta una sola cosa, el formulario, porque un formulario de
Google hay que crearlo desde la cuenta y no se puede dejar hecho en el
repositorio.

**El orden no se puede invertir:** el enlace de la prueba sólo funciona si esa
cuenta de Google ya está en la lista de testers. Si se manda antes de añadir a
la persona, lo que ve es «la aplicación no está disponible» y no vuelve a
intentarlo. Por eso la página promete *«te escribo con la descarga»* y no
*«descarga aquí»*.

- [ ] **La lista de testers, un Grupo de Google.** En Play Console la lista
      puede ser un pegote de correos o un grupo. Con un grupo se añade gente sin
      volver a entrar en la consola ni esperar a que propague, que con quince
      altas de una en una se nota.

- [x] **Crear el formulario** en <https://forms.google.com>, en blanco. Título:
      «Beta de Zona Dron para Android». Descripción: «Déjame tu correo de Google
      y te añado a la lista de pruebas. Te escribo con el enlace de descarga en
      cuanto estés dentro.»

- [ ] **Las cuatro preguntas**, con este texto exacto. La primera es la única
      que importa; las otras dos dan contexto y la cuarta es la que deja por
      escrito qué se hace con el dato:

      | # | Pregunta | Tipo | Descripción |
      |---|---|---|---|
      | 1 | Tu correo de Google | Respuesta corta, **obligatoria** | El mismo con el que tienes abierta la Play Store en el móvil. Si no es ése, el enlace de descarga no te funcionará. |
      | 2 | ¿Con qué dron vuelas? | Respuesta corta, opcional | Sólo por curiosidad, para saber con qué se está probando. |
      | 3 | ¿Por dónde sueles volar? | Respuesta corta, opcional | Una provincia me vale. Me sirve para comprobar zonas que conoces mejor que yo. |
      | 4 | Entiendo que mi correo se usa sólo para añadirme a la lista de pruebas de Google Play, que no se comparte con nadie más y que se borra al terminar la beta. | Casillas, una sola opción («De acuerdo»), **obligatoria** | — |

      En la pregunta 1, **validación de respuesta → Texto → Dirección de correo
      electrónico**. Ahorra la mitad de las altas fallidas.

      **Pendiente en el formulario que hay montado** (nada de esto impide
      publicar, pero conviene):

      - La descripción repite entera la página: los tres pasos y el aviso del
        correo salen dos veces seguidas cuando se ve embebido. Dejarla en una
        línea: «Déjame tu correo de Google y te añado a la lista de pruebas. Te
        escribo con el enlace en cuanto estés dentro.»
      - «Con qué dron vuelas?» va sin la interrogación de apertura.
      - Dice «correo de Gmail» en el paso 1 y «correo de Google» dos párrafos
        después. Una cuenta de Google no tiene por qué ser de Gmail, y quien
        tenga la suya en otro dominio se queda sin saber si vale. Google en los
        dos sitios.
      - Falta «¿Por dónde sueles volar?», que era opcional.

      No activar «Recopilar direcciones de correo» en la configuración del
      formulario: eso obliga a iniciar sesión, y quien llega desde Instagram con
      otra cuenta abierta en el navegador acaba dándote la equivocada, que es
      justo el fallo que se intenta evitar.

- [x] **Sacar el identificador.** Enviar → pestaña `< >` (insertar) → copiar el
      HTML del iframe. Del `src`, el trozo largo que va entre `/d/e/` y
      `/viewform` es el identificador.

- [x] **Pegarlo en [`beta.md`](beta.md)**. Hecho: el marco mide 1240 px de alto
      en escritorio y 1560 en móvil, medido sobre el formulario de verdad.
      Google no redimensiona el marco desde dentro, así que un alto corto mete
      una barra de scroll dentro de otra.

- [ ] **Vincular las respuestas a una hoja de cálculo:** pestaña Respuestas →
      icono verde de Hojas de cálculo. A partir de ahí, la columna de correos se
      selecciona entera y se pega en el Grupo de Google. Sin abrir Play Console
      una vez por persona.

- [ ] **Abrir la página desde el móvil** antes de publicar nada en Instagram, y
      mandarse una alta de prueba a uno mismo. Un enlace de biografía que no
      carga el día del lanzamiento no se arregla luego: la gente no vuelve.

- [ ] **Al terminar la beta:** borrar las respuestas del formulario y la hoja.
      La página promete que el correo se borra, y eso hay que cumplirlo.

### Firma

- [ ] Decidir firma de la app: Play App Signing (Google guarda la clave; lo
      recomendado) o subir la propia clave de EAS. **La firma de Play no es la
      del keystore de EAS**, así que quien tenga instalada una APK de GitHub
      tendrá que desinstalar para pasarse a la versión de Play, y perderá lo
      que tenga guardado (favoritos, diario, flota, documentos, paquetes). Si
      cuando llegue el momento hay usuarios reales, exportar/importar datos deja
      de ser opcional.

### Opcional pero conviene

- [x] Botón de «invitar a un café»: <https://buymeacoffee.com/dknsjcc>. Está en
      tres sitios y los tres tienen que decir lo mismo si algún día cambia:
      [`src/logic/support.ts`](../src/logic/support.ts) (tarjeta de Ajustes),
      [`.github/FUNDING.yml`](../.github/FUNDING.yml) (botón del repositorio) y
      la web ([`index.md`](index.md) y [`en.md`](en.md)). **Con `SUPPORT_URL`
      vacía la tarjeta de la app no se enseña.**
- [ ] `eas submit` para subir el AAB desde la línea de órdenes: necesita una
      cuenta de servicio de Google Play Console y su clave JSON, que **no va al
      repositorio**.

---

## 2. Cada versión

En orden. No saltarse pasos porque «es un cambio pequeño».

```bash
# 1. Rama corta, trabajo, y todo en verde antes de nada
npm run typecheck
npm run typecheck:tests
npm run test:unit
npm run test:enlaces      # si se ha tocado algo de enlaces compartidos
```

2. **Pull request** y esperar a que el CI pase. La rama `master` es lo que se
   publica: no se rompe.

3. **Subir la versión** en el mismo commit, `Bump to X.Y.Z`:
   - `package.json` → `version`
   - `app.json` → `expo.version`, `expo.android.versionCode` (+1, **siempre
     hacia arriba, nunca se repite**), `expo.ios.buildNumber`

   El repositorio manda sobre la versión: `eas.json` usa
   `appVersionSource: "local"` y el perfil de producción **no** autoincrementa,
   a propósito, para que lo que hay en Play y lo que hay en git sean lo mismo.

4. **Compilar**:

   ```bash
   npm run apk                                    # APK de pruebas (perfil preview)
   npx eas build --platform android --profile production   # AAB para Google Play
   ```

5. **Probar la APK en un móvil de verdad** antes de subir nada. Como mínimo: una
   consulta con GPS, una compartiendo una chincheta desde Google Maps, y añadir
   y abrir un documento (eso no se puede probar en el navegador).

6. **Subir el AAB** a Play, primero a pruebas internas. Notas de «Novedades» en
   español e inglés.

7. **Producción por fases**: empezar en el 10-20% y subir si no aparecen fallos
   en Android vitals. Nunca directo al 100%.

8. **Etiqueta y release de GitHub** con la APK, para quien la instale a mano:

   ```bash
   git tag vX.Y.Z && git push origin vX.Y.Z
   ```

9. **iOS**, sólo cuando toque (Actions → iOS → Run workflow). Ya no se dispara
   solo con la etiqueta: el canal principal es Play.

---

## 3. Permisos

La app declara cuatro y ninguno delicado: `INTERNET`, `VIBRATE`,
`ACCESS_COARSE_LOCATION` y `ACCESS_FINE_LOCATION`. La plantilla de Expo metía
además `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE` y `WRITE_EXTERNAL_STORAGE`
sin que la app los usara; están bloqueados en `app.json` con
`android.blockedPermissions`.

Si algún día se añade una dependencia nativa, **comprobar el manifiesto antes de
subir**:

```bash
npx expo prebuild --platform android --no-install
grep -o 'uses-permission[^>]*' android/app/src/main/AndroidManifest.xml | sort -u
```

Un permiso que aparece solo y no se usa es motivo de rechazo, y en esta app
además contradice lo que promete la ficha.

---

## 4. Qué vigilar después

- **Android vitals y fallos** en Play Console. Es la única telemetría que tiene
  el proyecto, y viene sin meter ningún SDK ni rastrear a nadie: no hace falta
  añadir nada más, y no se debe.
- **Reseñas.** Se contestan.
- **Nivel de API objetivo.** Google sube el mínimo cada año; toca una versión
  nueva con el SDK de Expo al día aunque no haya novedades.
- **Los formatos de enlace de Google Maps**, que cambian sin avisar:
  `npm run test:enlaces`.

---

## 5. Si algún día se cobra algo

Dos reglas, por este orden:

1. **El veredicto no se cobra nunca.** Saber si puedes volar en un punto es
   seguridad, y no puede depender de haber pagado. Lo que se puede cobrar son
   comodidades profesionales (exportar el registro de operaciones, más paquetes
   sin cobertura) o cosas decorativas.
2. **Cualquier cosa que se desbloquee dentro de la app pasa por la facturación
   de Google Play.** Una donación con enlace externo sólo es una donación
   mientras no dé acceso a nada; en cuanto desbloquea algo es una compra y va
   por Play Billing, con su comisión. Por eso el enlace de apoyo de Ajustes no
   desbloquea nada y lo dice en voz alta.

Antes de cobrar hay una tarea pendiente que no es opcional: **varios de los
servicios de datos que usa la app son gratuitos sólo para uso no comercial**
(Open-Meteo), o tienen políticas que no admiten uso comercial de su servidor
público (Nominatim y las teselas de OpenStreetMap). Los tres tienen sustituto
oficial español y gratuito: AEMET OpenData, CartoCiudad del IGN y las teselas
del propio IGN, que ya están en la app.
