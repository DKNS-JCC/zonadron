# Zona Dron

[![Download APK](https://img.shields.io/github/v/release/DKNS-JCC/zonadron?label=Download%20APK&style=for-the-badge&color=1355E8)](https://github.com/DKNS-JCC/zonadron/releases/latest)

Mobile application for checking drone flight restrictions in Spain using the UAS Geographical Zones published by ENAIRE.

The application lets you check a location using GPS, a map, an address, or coordinates and returns a simplified result:

- You can fly.
- You can fly with conditions.
- Authorization is required.
- You cannot fly.
- The check could not be completed.

> This application is independent of ENAIRE and does not replace official information or applicable regulations. The pilot is responsible for the flight.

## Features

### UAS zone checks

- Real-time queries of zones published by ENAIRE.
- Checks by current location, map, address, or coordinates.
- Calculation of the maximum available altitude based on detected restrictions.
- Conversion of altitude references to express them relative to the terrain when required.
- Information about temporary restrictions through NOTAMs.
- Distance and bearing to the nearest restricted zone.
- Access to the official text and contact details published for each zone.

### Photography planning

- Solar trajectory displayed on the map.
- Sunrise, sunset, golden hour, and blue hour.
- Shadow direction and length.
- Estimated sunset taking terrain elevation into account.

### Maps and utilities

- OpenStreetMap as the base map.
- Topographic mapping and orthophotography from Spain's National Geographic Institute (IGN).
- Query history.
- Result sharing.
- Generation of an authorization request using operator data.
- Offline mode for checking previously downloaded zones.
- Available-altitude map for finding suitable areas to fly.
- Search for a location from which to photograph a specific target.

## Installation

### Android APK

Download the latest version from [Releases](https://github.com/DKNS-JCC/zonadron/releases/latest).

Android may ask for permission to install applications from external sources.

### Run with Expo

Requirements:

- Node.js 20 or later.
- Expo.

Install dependencies:

```bash
npm install
```

Start the project:

```bash
npm start
```

Run on a specific platform:

```bash
npm run android
npm run ios
npm run web
```

## Build an installable application

The project uses Expo Application Services (EAS).

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
eas build --platform ios
```

Building for iOS requires an Apple Developer account.

Native projects can also be generated with:

```bash
npx expo prebuild
```

## Testing

Deterministic unit tests (pure logic, synthetic fixtures, no network — safe for CI):

```bash
npm run test:unit
```

Covers the decision engine (`verdict.ts`, including the aerodrome-reference-point
altitude recalculation), offline-mode geometry, the sun/shadow/horizon math, and
HTML sanitization. Node's built-in test runner, via `tsx`.

Live integration check against the real ENAIRE service (known locations —
airport runways, city centers, open countryside — verifying the result changes
correctly with altitude and that a partial service response never turns into a
"you can fly"):

```bash
npm run test:motor
```

This one needs network and can fail because ENAIRE is down, not because the
engine is wrong — that's why it's kept separate from `test:unit`.

Type checking is also available:

```bash
npm run typecheck
```

> **Windows note:** if `test:unit` or `test:motor` fail immediately with
> `The package "@esbuild/win32-x64" could not be found`, your `node_modules`
> is missing the Windows-specific optional dependency (common right after
> cloning if `npm install` last ran on Linux/WSL). Delete `node_modules` and
> run `npm install` again on Windows to fix it.

## Architecture

```text
app/
  (tabs)/
    index.tsx         Main screen and GPS query
    mapa.tsx          Map and zone queries
    buscar.tsx        Location search
    info.tsx          Regulations and sources
  resultado.tsx       Result for a location

src/
  api/
    enaire.ts        ENAIRE service client
    elevation.ts      Elevation lookup
    geocode.ts        Geocoding
  logic/
    verdict.ts        Decision engine
    html.ts           Official HTML cleanup
    labels.ts         ED-318 code conversion
    rules.ts          Regulatory information
    reference.ts      Altitude reference handling
  map/
    mapHtml.ts        Map integration
    leafletVendor.ts  Bundled Leaflet
  components/         UI components
```

> Note: in the actual implementation, the ENAIRE client file is `src/api/enaire.ts`.

## Technical decisions

- ENAIRE queries are performed sequentially to avoid incomplete service responses.
- All available fields are requested because the layers do not share exactly the same schema.
- The map uses Leaflet inside a WebView, avoiding dependencies on Google Maps or Apple Maps.
- Leaflet is bundled with the project and does not depend on a CDN at runtime.
- When data is incomplete or ambiguous, the application uses the most restrictive result.
- A partial service response never produces a positive result.
- ENAIRE dates are interpreted in UTC.

## Data sources

| Data | Source |
|---|---|
| UAS Geographical Zones | [ENAIRE](https://aip.enaire.es/AIP/UAS-es.html) |
| Service documentation | [servAIS API](https://aip.enaire.es/recursos/descargas/ZGUAS/servAIS_APIDOC.pdf) |
| Elevation | [Open-Meteo / Copernicus DEM GLO-90](https://open-meteo.com/en/docs/elevation-api) |
| Geocoding | [Nominatim / OpenStreetMap](https://nominatim.openstreetmap.org/) |
| Maps | [OpenStreetMap](https://www.openstreetmap.org/copyright) |
| Official cartography | National Geographic Institute (IGN) |
| Regulations | [AESA](https://www.seguridadaerea.gob.es/es/ambitos/drones) |

No API key is required for these sources.

## License and credits

The application code is published without additional restrictions.

Credits:

- UAS Geographical Zone data: © ENAIRE.
- Map data: © OpenStreetMap contributors, ODbL.
- Leaflet: © Volodymyr Agafonkin and CloudMade, BSD-2-Clause.
