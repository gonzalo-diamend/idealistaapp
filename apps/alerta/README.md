# Alerta de Idealista → Telegram / WhatsApp (Fases 1 + 2)

## Qué hace hoy
1. Lee búsquedas de Idealista (`IDEALISTA_SEARCH_URLS`).
2. Extrae anuncios desde JSON-LD y fallback HTML.
3. Aplica filtros (precio, habitaciones, m², keywords).
4. Evita duplicados guardando IDs en archivo local.
5. Envía novedades por Telegram y/o WhatsApp.
6. Genera logs estructurados JSON.
7. Reintenta llamadas HTTP con backoff exponencial.
8. Puede correr una vez (`RUN_MODE=once`) o en loop (`RUN_MODE=watch`).

## Configuración
1. Copia `apps/alerta/.env.example` como `apps/alerta/.env`.
2. Carga tus URLs y credenciales.
3. Primera corrida recomendada: `DRY_RUN=true`.

## Comandos
```bash
npm run alerta:check
npm run test
npm run test:ci
npm run alerta:start
```

## GitHub Actions
- Workflow: `.github/workflows/alerta-ci.yml`.
- Ejecuta checks estáticos + tests unitarios en Node 20 y 22.

## Alcance de Fase 2
- Scheduler interno por intervalo (`POLL_INTERVAL_SECONDS`).
- Reintentos configurables (`RETRY_COUNT`, `RETRY_BASE_DELAY_MS`).
- Logging estructurado para observabilidad.
