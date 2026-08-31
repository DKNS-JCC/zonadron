/**
 * Configuración de Metro.
 *
 * Sólo cambia una cosa respecto a la de Expo: añadir `docx` a la lista de
 * extensiones que se empaquetan como recurso. Metro trae `pdf` de serie —por
 * eso el impreso del Ministerio del Interior funcionaba sin tocar nada— pero
 * no `docx`, y la plantilla de la EARO que publica ENAIRE es un documento de
 * Word. Sin esta línea, el `require` de `assets/earo-abierta.docx` falla al
 * compilar el paquete.
 */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('docx');

module.exports = config;
