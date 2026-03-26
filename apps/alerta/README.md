# Alerta de Idealista → Telegram / WhatsApp (Fase 1)

## Qué hace esta fase
1. Lee una o varias búsquedas de Idealista (`IDEALISTA_SEARCH_URLS`).
2. Extrae anuncios desde JSON-LD y fallback HTML.
3. Aplica filtros (precio, habitaciones, m², keywords).
4. Evita duplicados guardando anuncios ya vistos en archivo local.
5. Envía novedades por Telegram y/o WhatsApp (Twilio).
6. Permite ejecución de validación sin envío real con `DRY_RUN=true`.

## Configuración
1. Copia `apps/alerta/.env.example` como `apps/alerta/.env`.
2. Carga tus URLs reales y credenciales.
3. En primera ejecución deja `DRY_RUN=true`.

## Comandos
```bash
npm run test
npm run alerta:start
```

## Alcance de Fase 1
- MVP funcional con persistencia local.
- Cobertura de tests unitarios básicos (parser + filtros).
- Sin scheduler en producción todavía (queda para Fase 2).
