# Audivox Mobile Security Policy

## Controles implementados

- **Validación estricta de entradas:** las búsquedas, nombres, correos y límites de paginación se sanean antes de llamar a servicios remotos.
- **Bloqueo de anuncios e interrupciones:** el `WebView` solo permite navegación HTTPS hacia `y2mate`, aplica una CSP embebida, desactiva cookies de terceros y bloquea dominios publicitarios conocidos.
- **Protección de red:** las descargas y llamadas externas rechazan dominios bloqueados y tráfico no HTTPS.
- **Credenciales sin hardcodear:** `LASTFM_API_KEY`, `YOUTUBE_CONVERTER_ENDPOINT` y `AUDIVOX_WORKER_URL` se leen desde variables de entorno nativas (`AUDIVOX_LASTFM_API_KEY`, `AUDIVOX_YOUTUBE_CONVERTER_ENDPOINT`, `AUDIVOX_WORKER_URL`).
- **Detección de root/jailbreak:** Android e iOS exponen una señal nativa; si el entorno parece comprometido, la app no muestra la navegación principal.
- **Modo estricto:** se activa por defecto y silencia avisos/popup no esenciales dentro del flujo de descargas.
- **Red Android endurecida:** `cleartext` queda deshabilitado mediante `network_security_config`.

## Variables de entorno requeridas

### Android

Exporta estas variables antes de compilar:

- `AUDIVOX_LASTFM_API_KEY`
- `AUDIVOX_YOUTUBE_CONVERTER_ENDPOINT`
- `AUDIVOX_WORKER_URL`
- `AUDIVOX_STRICT_MODE_ENABLED` (`true` por defecto)

### iOS

Define las mismas variables al ejecutar `xcodebuild` o desde tu esquema local.

## CI/CD y merges a `develop`

El workflow `.github/workflows/security-test.yml` ejecuta en `push` y `pull_request` hacia `develop`:

1. `npm ci`
2. `npm run lint`
3. `npm test -- --watch=false --runInBand`
4. `npm audit --audit-level=critical`
5. CodeQL SAST

Para bloquear merges, configura la protección de rama de GitHub y marca como obligatorios los checks:

- `Lint, tests and dependency scan`
- `CodeQL SAST`

## Ejecución local

Desde `Mobile/Audivox`:

```bash
npm ci
npm run lint
npm test -- --watch=false --runInBand
npm audit --audit-level=critical
```

Opcionalmente exporta las variables de entorno antes de compilar la app nativa.
