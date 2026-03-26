# Alerta de Idealista → Telegram / WhatsApp (MVP)

## Qué hace
1. Lee una o varias búsquedas de Idealista (`IDEALISTA_SEARCH_URLS`).
2. Extrae anuncios detectados en la página.
3. Aplica filtros (precio, habitaciones, m², keywords).
4. Evita duplicados guardando anuncios ya vistos en un archivo local.
5. Envía cada novedad por Telegram y/o WhatsApp (Twilio).

## Configuración
1. Copia `apps/alerta/.env.example` como `apps/alerta/.env`.
2. Completa tus variables.
3. Ejecuta:

```bash
npm run alerta:start
```

## Notas
- Este MVP depende del HTML actual de Idealista y puede requerir ajustes si cambia el sitio.
- Para producción conviene ejecutar con cron cada 5-15 minutos.
