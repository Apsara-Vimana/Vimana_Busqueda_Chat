# SearXNG oficial (Python va DENTRO de la imagen; tu chat Node no se toca)
FROM docker.io/searxng/searxng:latest

# Config con format json + limiter off
COPY settings.yml /etc/searxng/settings.yml

# Puerto interno típico de la imagen
EXPOSE 8080

# La imagen oficial ya define el entrypoint
