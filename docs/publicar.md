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
- [ ] Ficha de la tienda en español e inglés: descripción corta y larga,
      capturas (están en [`capturas/`](capturas), en los dos idiomas e
      iluminaciones), icono de 512×512 y gráfico destacado de 1024×500.
- [ ] En la descripción, el descargo de responsabilidad bien visible: la app
      **no sustituye** a la consulta oficial de ENAIRE ni a la publicación del
      AIP. Es una app que roza lo normativo y se mira con lupa.
- [ ] Categoría, correo de contacto y clasificación de contenido.

### Declaraciones

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

## 3. Qué vigilar después

- **Android vitals y fallos** en Play Console. Es la única telemetría que tiene
  el proyecto, y viene sin meter ningún SDK ni rastrear a nadie: no hace falta
  añadir nada más, y no se debe.
- **Reseñas.** Se contestan.
- **Nivel de API objetivo.** Google sube el mínimo cada año; toca una versión
  nueva con el SDK de Expo al día aunque no haya novedades.
- **Los formatos de enlace de Google Maps**, que cambian sin avisar:
  `npm run test:enlaces`.

---

## 4. Si algún día se cobra algo

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
