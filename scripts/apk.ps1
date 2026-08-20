# Compila el APK en local, sin pasar por EAS.
#
# Uso desde la raíz del proyecto:
#
#   .\scripts\apk.ps1              APK de depuración (necesita Metro corriendo)
#   .\scripts\apk.ps1 -Release     APK autocontenido, con el JS dentro
#   .\scripts\apk.ps1 -Prebuild    regenera android/ antes de compilar
#   .\scripts\apk.ps1 -Sdk D:\sdk  otro Android SDK
#
# Lo que resuelve, que es lo que hace perder el rato la primera vez:
#
#  - Gradle no encuentra el SDK si no están ANDROID_HOME y local.properties.
#    Y `android/` no está en git: cada `expo prebuild --clean` se lleva por
#    delante local.properties, así que se vuelve a escribir siempre.
#  - `expo prebuild` reescribe de vuelta package.json y app.json (cambia los
#    scripts a `expo run:*` y añade permisos duplicados). Se avisa al acabar
#    para que se revise el diff antes de commitear.
#
# OJO con -Release: la plantilla de Expo firma el release con `debug.keystore`
# (ver android/app/build.gradle), no con la clave de EAS. El APK se instala y
# funciona, pero NO puede actualizar encima de uno bajado de las releases:
# hay que desinstalar antes, y no sirve para publicar una actualización.

param(
  [switch]$Release,
  [switch]$Prebuild,
  [string]$Sdk = ''
)

$ErrorActionPreference = 'Stop'

$raiz = Split-Path -Parent $PSScriptRoot
$android = Join-Path $raiz 'android'

# --- SDK ---------------------------------------------------------------------
if (-not $Sdk) {
  if ($env:ANDROID_HOME) { $Sdk = $env:ANDROID_HOME } else { $Sdk = 'C:\AndroidSDK' }
}
if (-not (Test-Path $Sdk)) {
  Write-Error "No encuentro el Android SDK en '$Sdk'. Pásalo con -Sdk o pon ANDROID_HOME."
}
$env:ANDROID_HOME = $Sdk
$env:ANDROID_SDK_ROOT = $Sdk
Write-Host "SDK: $Sdk"

# --- Proyecto nativo ---------------------------------------------------------
$huboPrebuild = $false
if ($Prebuild -or -not (Test-Path $android)) {
  Write-Host 'Generando android/ con expo prebuild...'
  Push-Location $raiz
  try {
    npx expo prebuild --platform android
    if ($LASTEXITCODE -ne 0) { Write-Error 'expo prebuild ha fallado.' }
  } finally {
    Pop-Location
  }
  $huboPrebuild = $true
}

# Gradle necesita esto aunque ANDROID_HOME esté puesto, y con barras normales.
$sdkParaGradle = $Sdk.Replace('\', '/')
Set-Content -Path (Join-Path $android 'local.properties') `
  -Value "sdk.dir=$sdkParaGradle" -Encoding ascii
Write-Host "local.properties -> sdk.dir=$sdkParaGradle"

# --- Compilación -------------------------------------------------------------
if ($Release) { $tarea = 'assembleRelease' } else { $tarea = 'assembleDebug' }
Write-Host "Compilando ($tarea)..."

Push-Location $android
try {
  & .\gradlew.bat $tarea
  $codigo = $LASTEXITCODE
} finally {
  Pop-Location
}

if ($codigo -ne 0) {
  Write-Error "Gradle ha terminado con código $codigo."
}

# --- Resultado ---------------------------------------------------------------
if ($Release) { $carpeta = 'release' } else { $carpeta = 'debug' }
$apk = Get-ChildItem -Path (Join-Path $android "app\build\outputs\apk\$carpeta") -Filter '*.apk' -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if ($apk) {
  $mb = [math]::Round($apk.Length / 1MB, 1)
  Write-Host ''
  Write-Host "APK: $($apk.FullName) ($mb MB)"
  Write-Host "Instalar: adb install -r `"$($apk.FullName)`""
  if (-not $Release) {
    Write-Host 'Es de depuración: arranca Metro con `npx expo start --dev-client` o no pasará del splash.'
  } else {
    Write-Host 'Firmado con debug.keystore: desinstala antes cualquier versión bajada de las releases.'
  }
} else {
  Write-Host 'Gradle ha terminado bien pero no encuentro el APK; mira app\build\outputs\apk.'
}

if ($huboPrebuild) {
  Write-Host ''
  Write-Host 'prebuild ha tocado package.json y app.json: revisa `git diff` antes de commitear.'
}
