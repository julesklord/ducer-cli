# Base de Conocimientos de REAPER (Aprendizaje Continuo)

Esta base de datos almacena el aprendizaje progresivo de openDucer sobre REAPER. 

## Mandato de Seguridad
**CONFIDENCIALIDAD ESTRICTA**: Ningún dato de cliente, ruta de archivo, o stem musical debe guardarse en repositorios públicos. Los datos aquí son **puramente técnicos** (IDs de SWS, código Lua genérico, JSFX).

## Estructura

- `actions.json`: Mapeo de IDs de acciones (SWS/Nativas) a lenguaje natural (Ej: "40001" -> "Crear Pista").
- `scripts.json`: Snippets de ReaScript/Lua testeados y funcionales.
- `jsfx.json`: Información de plugins nativos descubiertos.
- `user_workflows.json`: Secuencias de acciones combinadas (Ej: Macro de Mastering).

**El sistema alimentará estos archivos de forma iterativa y automática conforme descubra nuevos comandos viables.**
