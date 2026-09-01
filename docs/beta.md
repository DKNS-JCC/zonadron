---
layout: default
title: Entrar en la beta de Android
lang: es
description: >-
  Zona Dron está en pruebas cerradas en Google Play. Deja tu correo de Google,
  te añado a la lista y te llega el enlace de descarga.
---

# Entrar en la beta

<p class="entradilla">
Zona Dron está en pruebas cerradas en Google Play. Para entrar hacen falta dos
cosas: un móvil Android y que yo te añada a la lista de probadores. Eso segundo
es lo que se hace en esta página.
</p>

<div class="pasos">
  <div class="paso">
    <span class="n">1</span>
    <p><strong>Dejas tu correo de Google</strong> en el formulario de aquí abajo.</p>
  </div>
  <div class="paso">
    <span class="n">2</span>
    <p><strong>Te añado a la lista de probadores.</strong> Lo hago a mano, así que no es instantáneo: normalmente el mismo día.</p>
  </div>
  <div class="paso">
    <span class="n">3</span>
    <p><strong>Te escribo con el enlace de descarga.</strong> A partir de ahí se instala desde la Play Store como cualquier otra aplicación, y se actualiza sola.</p>
  </div>
</div>

<div class="aviso">
  <strong>Tiene que ser tu correo de Google.</strong> El mismo con el que tienes
  abierta la Play Store en el móvil, que muchas veces no es el del trabajo ni el
  que usas para escribir. Si no coincide, el enlace de descarga te dirá que la
  aplicación no está disponible. Es el fallo número uno y se arregla mirándolo
  antes: <em>Play Store → tu foto arriba a la derecha → ahí sale la cuenta</em>.
</div>

<div class="formulario">
  <iframe
    src="https://docs.google.com/forms/d/e/1FAIpQLScUVMjfEPRfUBzK73kEl5mu0BM_eZd7Lwwtl1pugMfESExVyQ/viewform?embedded=true"
    title="Formulario de alta en la beta de Zona Dron"
    loading="lazy">Cargando el formulario…</iframe>
</div>

<p class="alternativa">
  ¿No te carga el formulario? Escríbeme por
  <a href="https://github.com/DKNS-JCC/zonadron/issues/new">GitHub</a>
  o por mensaje directo en Instagram y te añado igual.
</p>

## Qué hago con tu correo

Lo pego en la lista de probadores de Google Play y te escribo una vez con el
enlace. Nada más: no hay lista de distribución, no hay boletín, no se lo paso a
nadie y no acaba en ninguna herramienta de analítica. Cuando termine la beta, la
lista se borra.

Conviene decirlo claro porque el argumento de esta aplicación es justo el
contrario: **Zona Dron no te pide el correo en ningún momento.** No tiene cuentas
ni servidor propio, y lo que guardas se queda en tu móvil — está detallado en la
[política de privacidad](privacidad). El correo lo pido yo, aquí fuera, y sólo
porque Google necesita saber a quién dejar entrar en unas pruebas cerradas.

## Qué se espera de ti

Poco, y nada obligatorio:

- **Que no la desinstales durante las dos primeras semanas**, aunque no la
  abras. Google cuenta los días que el grupo la tiene instalada, y si el grupo se
  queda corto la cuenta se reinicia y hay que empezar de cero.
- **Que me digas lo que no funcione.** Sobre todo esto: si consultas un sitio que
  conoces bien y la aplicación te dice algo que no te cuadra, eso es lo que más
  me sirve de todo.

Puedes salirte cuando quieras, sin avisar y sin explicar por qué.

## Tengo iPhone

Entonces no necesitas nada de esto: la beta cerrada es cosa de Google. Zona Dron
funciona en iPhone y en iPad, pero no está en la App Store —publicar allí cuesta
99 € al año y esto es un proyecto libre—, así que se instala desde el archivo de
la última versión con un Apple ID gratuito.

Los pasos están explicados con capturas, incluido lo único incómodo, que es que
Apple hace caducar a los siete días cualquier aplicación firmada así:

<div class="botones">
  <a class="boton" href="https://github.com/DKNS-JCC/zonadron#iphone-o-ipad--paso-a-paso">Cómo instalarla en iPhone</a>
  <a class="boton secundario" href="https://github.com/DKNS-JCC/zonadron/releases/latest">Descargas</a>
</div>

## Y si prefieres no dar ningún correo

También vale. El `.apk` de Android está publicado en abierto y se instala sin
tienda, sin cuenta y sin pedirme permiso a mí:

<div class="botones">
  <a class="boton secundario" href="https://github.com/DKNS-JCC/zonadron/releases/latest">Descargar el APK</a>
</div>

Lo único que te pierdes es que se actualice sola.

<div class="aviso">
  <strong>Esto no es un servicio oficial.</strong> Zona Dron consulta y ordena
  información publicada por ENAIRE, pero la fuente con valor legal es el AIP y
  las publicaciones oficiales de AESA. Antes de volar, la responsabilidad de
  comprobarlo es del piloto.
</div>

<style>
  /* Sólo lo que esta página necesita y no hay en la plantilla. */
  .pasos {
    display: grid;
    gap: 0.75rem;
    margin: 1.75rem 0;
  }
  .paso {
    display: flex;
    align-items: flex-start;
    gap: 0.9rem;
    background: var(--superficie);
    border: 1px solid var(--linea);
    border-radius: 14px;
    padding: 0.9rem 1.1rem;
  }
  .paso .n {
    flex: none;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 50%;
    background: var(--acento);
    color: #fff;
    font-weight: 700;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 0.1rem;
  }
  .paso p { margin: 0; font-size: 0.98rem; }
  .formulario {
    background: var(--superficie);
    border: 1px solid var(--linea);
    border-radius: 14px;
    overflow: hidden;
    margin: 1.75rem 0 1rem;
  }
  .formulario iframe {
    display: block;
    width: 100%;
    /* Medido en el formulario real: 1511 px a 390 de ancho y 1207 px a 640.
       Google no redimensiona el marco desde dentro, así que si el alto se queda
       corto aparece una barra de scroll dentro de otra. Sobra antes que
       falte. */
    height: 1560px;
    border: 0;
  }
  @media (min-width: 34rem) {
    .formulario iframe { height: 1240px; }
  }
  .alternativa { font-size: 0.92rem; color: var(--texto-2); }
</style>
