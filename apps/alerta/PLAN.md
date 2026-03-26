# Plan de ejecución · Alerta Idealista → Telegram/WhatsApp

## Objetivo
Crear un servicio que lea resultados de búsquedas de Idealista, aplique tus patrones/filtros y envíe alertas automáticas por Telegram o WhatsApp.

## Fases

### Fase 0 · Definición funcional
- [ ] Definir búsquedas fuente (URLs de Idealista guardadas por ti).
- [ ] Definir filtros funcionales por búsqueda:
  - precio máximo
  - metros mínimos
  - habitaciones mínimas
  - palabras clave requeridas / bloqueadas
- [ ] Definir canales y formato de notificación.

### Fase 1 · MVP técnico (en ejecución)
- [x] Estructura base del proyecto `apps/alerta`.
- [x] Carga de configuración por variables de entorno (`.env`).
- [x] Colector de anuncios desde URLs de búsqueda de Idealista.
- [x] Aplicación de filtros/patrones sobre los anuncios.
- [x] Persistencia local de anuncios ya vistos (evitar duplicados).
- [x] Notificador Telegram.
- [x] Notificador WhatsApp (Twilio API).
- [x] Punto de entrada ejecutable.

### Fase 2 · Operación continua
- [ ] Programar ejecución periódica (cron / GitHub Actions / VPS).
- [ ] Añadir logs estructurados y alertas de error.
- [ ] Añadir reintentos y backoff en llamadas HTTP.

### Fase 3 · Robustez
- [ ] Tests automáticos (parsing + filtros + formato).
- [ ] Soporte multi-zona y multi-idioma.
- [ ] Dashboard simple de configuración.

## Próximos pasos inmediatos
1. Completar `.env` con tus tokens y búsquedas reales.
2. Ejecutar un primer ciclo manual y validar resultados.
3. Ajustar filtros para reducir ruido.
4. Pasar a ejecución programada cada X minutos.

## Riesgos / consideraciones
- Idealista puede cambiar estructura HTML y romper el parser.
- Verificar términos de uso y cumplimiento legal del scraping en tu país.
- WhatsApp suele requerir proveedor oficial (ej. Twilio) y números validados.
