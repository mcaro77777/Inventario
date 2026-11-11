# syntax=docker/dockerfile:1.7

FROM golang:1.24-alpine AS api-dependencias
WORKDIR /api
COPY inventario-api/go.mod inventario-api/go.sum ./
RUN go mod download

FROM api-dependencias AS api-compilacion
COPY inventario-api/ ./
ARG VERSION=dev
ARG COMMIT=desconocido
RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w -X inventario-api/internal/version.Version=${VERSION} -X inventario-api/internal/version.Commit=${COMMIT}" \
    -o /salida/inventario-api ./cmd/api

FROM alpine:3.22 AS final
RUN apk add --no-cache ca-certificates tzdata wget \
    && addgroup -S inventario \
    && adduser -S -G inventario inventario \
    && mkdir -p /app/ClientApp /data/uploads \
    && chown -R inventario:inventario /app /data

WORKDIR /app
COPY --from=api-compilacion --chown=inventario:inventario /salida/inventario-api /app/inventario-api
COPY --chown=inventario:inventario inventario-api/ClientApp/ /app/ClientApp/

USER inventario
ENV APP_ENV=production
ENV PORT=8080
ENV CLIENT_APP_DIR=/app/ClientApp
ENV UPLOAD_DIR=/data/uploads
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/api/health || exit 1

ENTRYPOINT ["/app/inventario-api"]
CMD ["serve"]
