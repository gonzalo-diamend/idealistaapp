# Plan de ejecución · Alerta Idealista → Telegram/WhatsApp

## Objetivo
Crear un servicio que lea resultados de búsquedas de Idealista, aplique tus patrones/filtros y envíe alertas automáticas por Telegram o WhatsApp.

## Estado
- ✅ **Fase 1 completada**.
- ✅ **Fase 2 completada** (este PR).
- 🔜 Fase 3 pendiente (robustez avanzada).

## Fases

### Fase 1 · MVP técnico (completada)
- [x] Estructura base del proyecto `apps/alerta`.
- [x] Carga de configuración por variables de entorno (`.env`).
- [x] Colector de anuncios desde URLs de búsqueda de Idealista (JSON-LD + fallback HTML).
- [x] Aplicación de filtros/patrones sobre los anuncios.
- [x] Persistencia local de anuncios ya vistos (evitar duplicados).
- [x] Notificador Telegram.
- [x] Notificador WhatsApp (Twilio API).
- [x] Modo `DRY_RUN` para validación sin envío real.
- [x] Tests unitarios base (parser y filtros).

### Fase 2 · Operación continua (completada)
- [x] Programación interna por intervalo (`RUN_MODE=watch`).
- [x] Logs estructurados en JSON.
- [x] Reintentos y backoff en llamadas HTTP (fetch + notificaciones).

### Fase 3 · Robustez
- [ ] Soporte multi-zona y multi-idioma.
- [ ] Dashboard simple de configuración.
- [ ] Persistencia en base de datos y métricas.

## Próximos pasos
1. Ejecutar en `DRY_RUN=true` y ajustar filtros.
2. Activar Telegram y validar entregas.
3. Activar WhatsApp (Twilio) si lo necesitas.
4. Definir persistencia en DB y métricas (Fase 3).

## Riesgos / consideraciones
- Idealista puede cambiar estructura HTML y romper el parser fallback.
- Verificar términos de uso y cumplimiento legal del scraping en tu país.
- WhatsApp suele requerir proveedor oficial (ej. Twilio) y números validados.
