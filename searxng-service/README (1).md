# Apsara SearXNG (segundo servicio en Render)

Este directorio es **independiente** del chat Node.
Python solo vive dentro de la imagen Docker de SearXNG.

## Despliegue en Render

1. Sube esta carpeta a GitHub (mismo repo en `/searxng-service` o repo aparte).
2. Render → New → Web Service → conecta el repo.
3. Ajustes:
   - **Root Directory:** `searxng-service` (si está en el mismo repo)
   - **Runtime:** Docker
   - **Dockerfile Path:** `Dockerfile`
   - Plan: Free (se dormirá; cold start 30–60 s)
4. Tras el deploy, copia la URL, ej: `https://apsara-searxng.onrender.com`
5. En el servicio del **chat** Apsara → Environment:
   ```
   SEARXNG_URL=https://apsara-searxng.onrender.com
   ```
6. Prueba:
   ```
   https://apsara-searxng.onrender.com/search?q=dharma&format=json
   ```
   Debe devolver JSON (no 403).

## Keepalive (opcional, anti-sueño)

GitHub Action o cron que haga GET a esa URL cada 10 min.

## No mezclar

- No pongas `server.js` ni `package.json` aquí.
- El chat sigue siendo Node en el otro servicio.
