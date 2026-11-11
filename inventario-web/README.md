# Inventario Web

Cliente Angular 20 del sistema de inventario DAP/MOP. Conserva las funciones del sistema original y adopta el shell, tema y sistema visual de `crm-web`.

## Desarrollo

Requiere Node.js 20.19+, 22.12+ o 24.

```bash
npm install
npm start
```

El servidor de desarrollo queda en `http://localhost:4200` y deriva `/api` a `http://localhost:8080` mediante `proxy.conf.json`.

## Verificación

```bash
npm run build
npm test
```

La compilación se genera en `dist/inventario-web/browser`. En producción la API usa `/api`, por lo que Go sirve frontend y backend desde el mismo origen.

## Funciones conservadas

- autenticación, menús y permisos por perfil;
- stock, ingresos, retiros, historial y documentos;
- solicitudes de cliente y gestión de solicitudes;
- productos, categorías, proveedores, clientes, departamentos y unidades;
- perfiles y asignación de permisos;
- dashboards, gráficos, tablas y exportación Excel.
