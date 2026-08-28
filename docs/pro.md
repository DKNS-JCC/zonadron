# Versión de pago: Trámites

Documento de trabajo. **No se publica**: está en el `exclude:` de
[`_config.yml`](_config.yml) junto a `publicar.md` e `i18n.md`, porque `docs/`
es el sitio público y esto son precios y estrategia.

---

## 1. La línea

> **Consultar es gratis. Tramitar y documentar se paga.**

La app gratuita responde «¿puedo volar aquí?». La de pago responde «y aquí
tienes el papeleo hecho y la prueba de que volaste legal». Son dos productos,
no dos niveles del mismo.

De esa línea salen dos reglas que no se negocian:

1. **Nada de lo que hoy es gratis pasa a ser de pago.** Ni la flota, ni la
   pantalla de luz, ni el radio del paquete sin cobertura. Un candado sobre algo
   que ya regalabas no es valor, es escasez fabricada: da poco dinero y quema a
   la gente que recomienda la app. Todo lo de la columna de pago es cosa que hoy
   no existe.
2. **Nunca se cobra por saber si un vuelo es legal o seguro.** Aparte de que
   está feo, es la clase de cosa que se mira con lupa en la revisión de Google
   Play.

## 2. Qué entra en cada lado

| Gratis, completo y sin límites | Trámites (de pago) |
|---|---|
| Veredicto, mapa, capas, altura libre | **Planificar vuelo**: el expediente completo para una fecha, hora y radio |
| Meteo, NOTAM, zonas protegidas | **Revalidación y avisos**: qué ha cambiado desde que lo planeaste |
| Flota ilimitada | **Comunicación previa a Interior**: el impreso oficial relleno |
| Luz y sombras, horizonte de terreno incluido | **Expediente de vuelo** en PDF: hora, fuente y zonas consultadas |
| Paquete sin cobertura hasta 60 km | **Solicitud de autorización con seguimiento** |
| Diario, favoritos, historial, documentos | **Avisos de caducidad**: seguro, registro de operador, certificados |
| | **Exportar el diario** para facturar o justificar |

**Precio: 19,99 €, pago único.** El comparable no es otra app: es lo que tarda
un piloto en rellenar 73 casillas a mano, o lo que cobra por un vuelo. El
aficionado no va a pagar nunca, y está bien — se queda con una app completa de
verdad y es quien la recomienda.

## 3. Planificar vuelo

Es el núcleo. No una función más de la lista: el envase que hace que las otras
dejen de ser una lista suelta.

Un plan es un **punto (o un área), una fecha, una hora y un radio**, con todo lo
que la app sabe de eso guardado junto: zonas que toca, altura libre, veredicto,
sol y sombras, meteo, NOTAM, qué permisos hacen falta y con cuánta antelación.
Vive en el Cuaderno, al lado de favoritos y del diario.

### Un plan no es un veredicto

Es un veredicto **con fecha de caducidad**. Lo que se sabe de una fecha futura
se degrada con la distancia, y con datos muy concretos:

| Dato | ¿Sirve para una fecha futura? |
|---|---|
| Zonas UAS de ENAIRE | Sí, son permanentes — pero pueden activarse temporales |
| Sol, sombras, horizonte | **Exacto a cualquier fecha**: es SunCalc, cálculo local |
| Terreno y altura libre | Exacto |
| Meteo | **Máximo 16 días** (límite de Open-Meteo, verificado). De verdad, 3-5 |
| NOTAM | **Casi inútil a más de una semana**: todavía no están publicados |

De ahí sale la mejor pieza de interfaz del asunto: el plan tiene **confianza
creciente**. A 20 días es un plan de sol y zonas; a 3 días ya tiene meteo; a 1
día tiene NOTAM. La tarjeta enseña qué falta por confirmar, y eso da un motivo
real para volver a abrir la app antes del vuelo.

### Lo que de verdad vale dinero: el `diff`

Un plan hecho el día 1 para el día 12 está muerto el día 12. La función que se
paga es la que el día del vuelo dice:

> Desde que lo planeaste: NOTAM nuevo sobre el punto, y la altura libre baja de
> 120 a 60 m.

Es un `diff` entre dos `QueryResult`. Técnicamente es lo más fácil de toda la
lista y es lo que más se nota, y sólo lo puede hacer esta app porque es la única
que guarda el veredicto entero con sus zonas, su `queriedAt` y sus capas
fallidas.

**Filtra el ruido.** Que el viento pase de 12 a 14 km/h no es una alerta. Sólo
salta lo que cambia la legalidad o la seguridad: veredicto distinto, zona nueva,
NOTAM nuevo, altura libre que baja, o meteo que cruza un umbral que fija el
piloto. Si la alerta salta por tonterías, en dos semanas se deja de mirar y la
función está muerta.

### El radio

«Fecha, hora y radio» convierte el veredicto de un punto en el de un área, que
es lo correcto: nadie vuela clavado en una coordenada. El plan guarda **el peor
caso del radio**: la zona más restrictiva que toca y la altura libre mínima.

### Los plazos: lo que lo convierte en producto

Del plan salen cuentas atrás, y es aquí donde el paquete deja de ser un
generador de PDFs:

- Vuelo urbano el 12 → **comunicación a Interior antes del 7** (cinco días
  naturales, art. 40 del RD 517/2024, como documenta `src/logic/interior.ts`).
- Zona que requiere autorización → mándala ya, que el gestor tarda semanas.
- **Tu seguro caduca el 9 y vuelas el 12.** `src/logic/documents.ts` ya modela
  las caducidades; sólo hay que cruzarlas con la fecha del plan.

Ya no vendes «te relleno un impreso». Vendes «no se te pasa un plazo ni vuelas
con el seguro caducado».

### Ciclo de vida

```
borrador → firme → (revalidado el día D) → volado
```

`volado` es un `logFlight()` en el `FlightLogContext` que ya existe. El plan
muere convertido en entrada del diario, con el expediente PDF adjunto. El ciclo
se cierra con piezas que ya están escritas.

## 4. Revalidación y avisos

### Al abrir la app

Comprobar todos los planes en cada apertura no se sostiene: serían N planes por
(zonas + NOTAM + meteo) en cada arranque. Se escalona por cercanía, que es donde
está la información de verdad:

| Falta para el vuelo | Qué se comprueba | Cada cuánto |
|---|---|---|
| más de 7 días | zonas | 1 vez al día |
| de 7 a 2 días | zonas + NOTAM | 1 vez al día |
| menos de 48 h | todo, con meteo | al abrir, con freno de 1 h |

Sólo en primer plano: al arranque en frío, y al volver de segundo plano si han
pasado más de 30 minutos (`AppState`). Nada en segundo plano — no están esos
permisos y no se van a pedir, es parte del argumento de la ficha.

### Tres estados, no dos

| Estado | Qué se enseña |
|---|---|
| Comprobado, sin cambios | nada |
| Comprobado, hay cambios | punto rojo |
| **No se ha podido comprobar** | punto gris, «sin comprobar» |

Si esto se deja en binario, alguien vuela un día sin cobertura viendo la
pestaña limpia y creyéndose validado. Es el mismo criterio con el que la app ya
se niega a interpretar el horario de los NOTAM.

El punto se apaga al abrir **el plan**, no la pestaña. Y un cambio ya visto no
vuelve a alertar, pero tampoco desaparece: sigue en el plan hasta que el vuelo
pasa. Por plan se guarda `lastCheckedAt`, `lastCheckOk`, `changes[]` y
`acknowledgedAt`.

### Avisos del sistema

Un punto rojo sólo avisa a quien abre la app. Lo que hace falta es que no se le
pase un vuelo, y ahí la distinción es clara:

**Se puede, sin servidor y sin renunciar a nada** — avisos locales programados
en el propio móvil, porque las fechas ya se conocen:

- «Vuelas en Sevilla el día 12: la comunicación a Interior tiene que estar
  mandada antes del **7**.»
- «Tu seguro caduca el 9 y tienes un vuelo el 12.»
- La víspera: **«Mañana vuelas. Revalida el plan antes de salir.»**

Esa última no dice *si* algo ha cambiado, dice *compruébalo*. Consigue casi todo
el efecto de una notificación remota sin que nada consulte ENAIRE con la app
cerrada.

**No se puede** avisar de «ha salido un NOTAM nuevo» con la app cerrada: eso
exige un servidor sondeando ENAIRE, y con él se cae la fila de «no hay servidor
propio, no hay analítica ni rastreadores» de [`play-store.md`](play-store.md).
No compensa.

## 5. Viabilidad: comprobado, no supuesto

| Qué | Estado | Comprobación |
|---|---|---|
| Avisos locales | Sí | `expo-notifications` **57.0.15**, en la misma línea que el resto de `expo-*` del proyecto. Los avisos locales no necesitan FCM ni servidor: se programan y se disparan en el móvil |
| Compras de Google Play | Sí | `expo-iap` **5.4.0**, `peerDependencies` con `expo: '*'`; los peers de Amazon son opcionales. Necesita build de desarrollo (EAS), no Expo Go — ya se compila así con `npm run apk` |
| NOTAM de una fecha futura | Sí, **cero cambios** | `getNotamsAt(lat, lon, signal, now)` ya acepta el instante como cuarto parámetro, y `toNotam`/`pending` calculan `activeNow` y filtran contra él. Basta pasar la fecha del plan |
| Meteo de una fecha futura | Ampliar la llamada | Open-Meteo admite `forecast_days` de 0 a 16 — verificado con petición real; 17 lo rechaza. Hoy `src/api/weather.ts` pide `forecast_days: '1'` y `forecast_hours: '18'` |
| Sol, sombras, horizonte a futuro | Sí | SunCalc calcula cualquier fecha, y es local |
| Veredicto de una fecha futura | Un parámetro | `checkPoint()` no acepta instante: hay que añadirle un `at?: number` opcional y pasárselo a `getNotamsAt` |
| Veredicto de un **radio** | Trabajo real | `computeCoverageGrid()` ya calcula la rejilla de alturas libres de un área, pero **exige un `OfflinePack`**, y hoy el paquete es único (`zonadron.pack.meta.v1` es una sola clave). Ver abajo |
| Punto rojo en la pestaña | Sí | `tabBarBadge` en las `Tabs` de expo-router, en `app/(tabs)/_layout.tsx` |
| Permiso nuevo | Retocar la ficha | `POST_NOTIFICATIONS` en Android 13+. No es sensible y es opt-in; el formulario de seguridad de datos no cambia porque nada sale del móvil, pero hay que actualizar la tabla de permisos de `play-store.md`. **La app tiene que funcionar entera si se deniega** |

### El paquete múltiple

Es el único trabajo grande, y sale bien: si cada plan lleva **su propio paquete
descargado**, planificar deja el área lista para el día del vuelo aunque allí no
haya cobertura. Deja de ser una limitación artificial («varios paquetes en Pro»)
y pasa a ser lo que la función necesita para existir. Hay que convertir
`getPackMeta`/`loadPack`/`deletePack` de singleton a lista.

## 6. Arquitectura

Siguiendo las convenciones del proyecto: lógica pura sin React ni nativo (para
que `tsx --test` la pruebe entera), lo nativo aislado por plataforma como
`LiquidGlass.tsx`/`.android.tsx`, y el estado en `src/state`.

```
src/logic/plan.ts          <- puro: plazos, confianza, plansDueForCheck(), diffPlan()
src/pro/entitlement.ts     <- puro: qué funciones desbloquea el pase
src/pro/store.ts           <- único fichero que toca Play Billing (expo-iap)
src/pro/store.web.ts       <- en web nunca hay Pro
src/state/PlansContext.tsx <- zonadron.planes.v1, calcado de FlightLogContext
src/state/ProContext.tsx   <- estado, caché y restaurar compras
src/components/ProGate.tsx <- el candado y la hoja de compra
tests/plan.test.ts
tests/pro.test.ts
```

### El pase

Orden de verdad: **compra en Play > veterano por fecha de instalación > gratis.**

```ts
export function resolvePro(input: {
  purchased: boolean;
  installedAt: string | null;
  cutoff: string;
  enforced: boolean;
}): { pro: boolean; source: 'compra' | 'veterano' | 'ninguna' }
```

`enforced: false` en la versión de lanzamiento: los candados se escriben y se
prueban en producción antes de valer dinero. El día que se pone a `true`, los
veteranos no se enteran.

**Si Play no contesta —que en el campo es lo normal— se mantiene el último
estado conocido.** Nunca se bloquea a quien ya pagó por estar sin cobertura:
sería exactamente lo contrario de lo que vende la app.

### Google Play

- Un solo producto **gestionado** (no suscripción), id `pro_lifetime`.
- La fuente de verdad es Play: `getAvailablePurchases()` al arrancar devuelve lo
  que la cuenta de Google ya compró. Eso da «restaurar compra» gratis y funciona
  en un móvil nuevo.
- **`finishTransaction` / acknowledge antes de 3 días o Google reembolsa
  automáticamente.** Es el fallo número uno de quien integra Billing la primera
  vez.
- Los productos no se pueden crear hasta haber subido un AAB con la librería de
  facturación: primero build, luego ficha del producto.
- *License testing* en Play Console permite comprar el flujo entero gratis.
- Google se lleva el 15 % hasta el primer millón.
- **Sin RevenueCat.** Resolvería la validación en servidor, pero manda
  identificador y datos de dispositivo a un tercero, y obliga a reescribir la
  política de privacidad y el formulario de seguridad de datos. En una app cuyo
  argumento es ese, no compensa.
- **Licencia**: el repositorio es MIT y publica el APK. El `if (pro)` se parchea
  en dos minutos. O `src/pro/` y el módulo de Interior se van a un repositorio
  privado, o se asume que el pase es de honor. Que sea una decisión, no un
  descuido.

## 7. Reglas que no se saltan

1. **Un plan sin revalidar no enseña veredicto en verde.** Hasta que se
   revalida el día del vuelo, va en gris con «sin comprobar hoy».
2. **Un plan no es una autorización.** Que no lo parezca, y menos en el PDF. El
   descargo va más fuerte aquí que en ninguna otra pantalla.
3. **Sin cobertura no se afirma nada.** Ni un punto verde, ni una ausencia de
   punto rojo que se pueda leer como «todo bien».
4. **Si se deniega el permiso de avisos, la app funciona igual.** Los avisos son
   una comodidad, no un requisito.
5. **Para convertir, se enseña un plan de ejemplo real dentro de la app**, no un
   candado con una lista de ventajas.

## 8. Orden de trabajo

| # | Qué | ¿Toca nativo? | Cuándo |
|---|---|---|---|
| 1 | Sello de fecha de instalación (`zonadron.instalado.v1`) | no | **ya**, antes de publicar |
| 2 | `src/logic/plan.ts` + `tests/plan.test.ts` | no | ya |
| 3 | `entitlement.ts` + `ProContext` con `enforced: false` | no | ya |
| 4 | `at?: number` en `checkPoint`; meteo hasta 16 días | no | ya |
| 5 | Paquetes múltiples (singleton -> lista) | no | antes del radio |
| 6 | `PlansContext` + pantalla de plan + sección en Cuaderno | no | — |
| 7 | Expediente de vuelo en PDF y comunicación a Interior | no | — |
| 8 | `expo-notifications` + avisos de plazos | **sí** | después de producción |
| 9 | `expo-iap`, perfil de pagos, `pro_lifetime`, `enforced: true` | **sí** | 2-3 meses tras producción |

Los pasos 1 a 7 no tocan el build nativo y por tanto **no interfieren con la
prueba cerrada**. Los pasos 8 y 9 sí: van después de estar en producción.
