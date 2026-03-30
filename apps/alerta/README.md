# Alerta de Idealista → Telegram (MVP)

## Qué hace hoy
1. Lee una o más búsquedas de Idealista (`IDEALISTA_SEARCH_URLS`).
2. Extrae anuncios usando **JSON-LD como fuente principal** y fallback HTML.
3. Aplica filtros por precio, habitaciones, m² y keywords.
4. Deduplica anuncios entre múltiples URLs de búsqueda por `id`.
5. Evita repetidos con persistencia local (`seen`).
6. Envía alertas por Telegram (canal principal del MVP).
7. WhatsApp queda opcional (fase posterior).
8. Corre en `RUN_MODE=once` o `RUN_MODE=watch`.

## Lógica de keywords
- `REQUIRED_KEYWORDS`: deben cumplirse **todas**.
- `BLOCKED_KEYWORDS`: si aparece **cualquiera**, el anuncio se bloquea.
- El matching normaliza texto (minúsculas, tildes y espacios).

## Setup rápido
1. Copiar `apps/alerta/.env.example` a `apps/alerta/.env`.
2. Completar URL(s) de búsqueda y credenciales.
3. Primera corrida con `DRY_RUN=true`.
4. Revisar logs.
5. Pasar a `DRY_RUN=false`.
6. Ejecutar primero con `RUN_MODE=once`.
7. Luego dejar en `RUN_MODE=watch`.
8. En `DRY_RUN=true` se previsualiza y **no** se persiste `seen`.

## Ejemplo realista de `.env`
```env
IDEALISTA_SEARCH_URLS=https://www.idealista.com/alquiler-viviendas/madrid-madrid/con-precio-hasta_1400,publicado_ultimas-48-horas/

MAX_PRICE=1400
MIN_ROOMS=2
MIN_AREA=60
REQUIRED_KEYWORDS=terraza,jardin
BLOCKED_KEYWORDS=interior,bajo

DRY_RUN=true
RUN_MODE=once
POLL_INTERVAL_SECONDS=3600
MAX_RESULTS_PER_RUN=10
HTTP_TIMEOUT_MS=15000

ENABLE_TELEGRAM=true
TELEGRAM_BOT_TOKEN=123456:ABCDEF
TELEGRAM_CHAT_ID=-1001234567890

ENABLE_WHATSAPP=false
```

## Comandos
```bash
npm run alerta:check
npm run test
npm run alerta:start
```

## Operación MVP recomendada
- Runtime principal: local, VPS pequeña o Docker con volumen persistente.
- Config sugerida para producción MVP:
  - `RUN_MODE=watch`
  - `POLL_INTERVAL_SECONDS=3600`
  - `DRY_RUN=false`
  - Telegram activo
  - `STATE_FILE` en disco persistente

## CI y GitHub Actions
- GitHub Actions se mantiene para CI (checks/tests).
- **No** se recomienda usar GitHub Actions como runtime continuo del bot por la persistencia local del estado.

## Limitaciones del MVP
- Scraping basado en HTML/JSON-LD (puede romperse si Idealista cambia).
- Persistencia local en archivo JSON.
- Puede requerir ajustes ante bloqueos anti-bot.
- No ideal para runtimes stateless sin storage persistente.
- WhatsApp es opcional y no prioritario en esta etapa.
