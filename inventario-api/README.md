# Inventario API en Go

Reimplementación en Go de la API de inventario DAP/MOP. Usa exclusivamente la base PostgreSQL existente y el esquema `inv`; no crea, migra ni altera tablas.

## Incluye

- autenticación BCrypt y JWT HS256;
- permisos de menús y botones por perfil;
- mantenedores de inventario;
- stock, movimientos, solicitudes y certificados PDF;
- archivos adjuntos con directorio persistente;
- dashboards y reportes;
- healthcheck real contra PostgreSQL;
- servidor de la SPA Angular, logging estructurado y apagado ordenado;
- imagen Docker multi-stage sin privilegios.

## Configuración

Copie `.env.example` y configure las variables en el entorno. La aplicación no carga archivos `.env` automáticamente.

```text
DATABASE_URL=postgres://usuario:clave@host:5432/inventario?sslmode=require
JWT_SECRET=una-clave-de-al-menos-32-caracteres
APP_BASE_URL=http://localhost:8080
```

## Comandos

```bash
go test ./...
go vet ./...
go run ./cmd/api check-db
go run ./cmd/api serve
```

`check-db` valida la conexión y las diez tablas requeridas del esquema `inv` sin modificar datos.

## Angular

```powershell
.\scripts\publicar-angular.ps1 -Origen "..\inventario-web\dist\inventario-web\browser"
```

## Docker

```bash
docker build -t inventario-api:local .
docker run --rm -p 8080:8080 --env-file .env -v inventario-uploads:/data/uploads inventario-api:local
```

La aplicación no registra cadenas de conexión, claves, tokens ni contraseñas.
