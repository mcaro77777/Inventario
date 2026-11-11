# Inventario DAP/MOP

Migración completa del sistema de inventario:

- `inventario-api`: API Go 1.24 conectada a PostgreSQL, esquema `inv`.
- `inventario-web`: frontend Angular 20 responsive.
- `Dockerfile`: compilación multi-stage de Angular y Go para EasyPanel.

## Construcción local

```bash
docker build -t inventario:local .
```

## EasyPanel

Configure la aplicación con:

- repositorio: `mcaro77777/Inventario`;
- rama: `main`;
- ruta de compilación: `/`;
- puerto interno: `8080`;
- volumen persistente: `/data/uploads`.

Variables obligatorias:

```text
APP_ENV=production
APP_BASE_URL=https://dominio-del-inventario
DATABASE_URL=postgres://usuario:clave@host:5432/inventario?sslmode=require
JWT_SECRET=una-clave-aleatoria-de-al-menos-32-caracteres
JWT_ISSUER=inventario-api
JWT_AUDIENCE=inventario-web
JWT_HOURS=8
```

Variables opcionales de conexión:

```text
DB_MAX_OPEN_CONNS=20
DB_MAX_IDLE_CONNS=10
DB_CONN_MAX_LIFETIME_MINUTES=30
```

El contenedor ejecuta con un usuario sin privilegios, sirve Angular y API desde el mismo origen y expone el healthcheck en `/api/health`.
