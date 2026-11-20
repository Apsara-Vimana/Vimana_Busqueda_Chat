# Apsara Vimana — 3 chats + SearXNG

## Chats (cada uno con su Neon en Render)

| Pool | URL del chat | INSTANCE_POOL |
|------|----------------|---------------|
| A | https://vimana-chat.onrender.com | `A` |
| B | https://apsara-vimana-chat-b-aibp.onrender.com | `B` |
| C | https://apsara-vimana-c.onrender.com | `C` |

En **cada** Web Service del chat:

- `DATABASE_URL` = Neon **de ese** servicio
- `INSTANCE_POOL` = `A` o `B` o `C`
- `SEARXNG_URL` = SearXNG que use ese chat
- `OPENROUTER_API_KEY` = tu clave
- `ACCESS_CODES` = opcional

## SearXNG

| Pool | URL prevista | Estado |
|------|----------------|--------|
| 1 / A | https://apsara-searxng.onrender.com | En uso cuando hay cuota |
| 2 / B | https://apsara2-searxng.onrender.com | Crear cuando se pueda |
| 3 / C | https://apsara3-searxng.onrender.com | Crear cuando se pueda |

Deploy SearXNG: Root Directory = `searxng-service`, Runtime = Docker, mismo repo.

Por ahora los tres chats pueden apuntar al **mismo** SearXNG activo:

```text
SEARXNG_URL=https://apsara-searxng.onrender.com
```

Cuando existan 2 y 3, en B y C cambia solo `SEARXNG_URL`.
