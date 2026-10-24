# Vimana Busqueda Chat — Apsara Vimana (Node)

Chat + metabuscador del proyecto **Vimana**.  
Stack: **Node.js + Express + Neon (opcional)**. Búsquedas **gratuitas** (SearXNG → DuckDuckGo → Wikipedia).

## Estructura

```
server.js              # API + estáticos
package.json
lib/engine.js          # Motor (math, maestros, glosario, búsqueda)
lib/neon.js            # Historial en Neon (opcional)
public/index.html      # UI chat (foto Apsara)
public/imagenes/...
glosarios/*.txt
data/ayurveda.json
```

## Render

1. Conecta este repo en **Web Service**
2. Runtime: **Node**
3. Build: `npm install`
4. Start: `npm start`
5. Environment (opcional):

```
DATABASE_URL=postgresql://...@....neon.tech/neondb?sslmode=require
SEARXNG_URL=https://searx.be
```

## Local

```bash
npm install
npm start
# http://localhost:3000
```

## API

- `GET /api/ping` — health
- `POST /api/chat` — body JSON `{ "q": "tu pregunta" }`

## Cascada del motor

1. Matemáticas / saludo / identidad  
2. Maestros locales  
3. Glosario TXT  
4. SearXNG → DuckDuckGo → Wikipedia (último)  
5. Botón Yahoo  

Servicio comunitario del proyecto Vimana.
