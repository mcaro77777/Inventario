import { Routes } from '@angular/router';
import { authGuard } from './core/services/auth.guard';

export const routes: Routes = [
  // Default: go to login
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Login
  {
    path: 'login',
    loadComponent: () =>
      import('./paginas/login/login.component').then(m => m.LoginComponent)
  },

  // Main layout (menu) with child routes
  {
    path: 'menu',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./paginas/menu/menu.component').then(m => m.LayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard-bi', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () =>
          import('./paginas/home/home.component').then(m => m.HomeComponent)
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./paginas/home/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'tabla-resumen2',
        loadComponent: () =>
          import('./paginas/dashboad/tabla-resumen2/tabla-resumen2.component').then(m => m.TablaResumen2Component)
      },
      // Dashboard BI (estilo Power BI)
      {
        path: 'dashboard-bi',
        children: [
          { path: '', redirectTo: 'resumen', pathMatch: 'full' },
          {
            path: 'resumen',
            loadComponent: () =>
              import('./paginas/dashboad/resumen/dashboard-resumen.component').then(m => m.DashboardResumenComponent)
          },
          {
            path: 'stock-riesgo',
            loadComponent: () =>
              import('./paginas/dashboad/stock-riesgo/dashboard-stock-riesgo.component').then(m => m.DashboardStockRiesgoComponent)
          },
          {
            path: 'movimientos',
            loadComponent: () =>
              import('./paginas/dashboad/movimientos/dashboard-movimientos.component').then(m => m.DashboardMovimientosComponent)
          },
          {
            path: 'solicitudes',
            loadComponent: () =>
              import('./paginas/dashboad/solicitudes/dashboard-solicitudes.component').then(m => m.DashboardSolicitudesComponent)
          },
          {
            path: 'compras',
            loadComponent: () =>
              import('./paginas/dashboad/compras/dashboard-compras.component').then(m => m.DashboardComprasComponent)
          },
          {
            path: 'clientes-deptos',
            loadComponent: () =>
              import('./paginas/dashboad/clientes-deptos/dashboard-clientes-deptos.component').then(m => m.DashboardClientesDeptosComponent)
          },
          {
            path: 'producto/:id',
            loadComponent: () =>
              import('./paginas/dashboad/producto-detalle/dashboard-producto-detalle.component').then(m => m.DashboardProductoDetalleComponent)
          },
          {
            path: 'ejecutivo',
            loadComponent: () =>
              import('./paginas/dashboad/ejecutivo/dashboard-ejecutivo.component').then(m => m.DashboardEjecutivoComponent)
          }
        ]
      },
      {
        path: 'mantenedores',
        loadComponent: () =>
          import('./paginas/maestros/menu/menu').then(m => m.HomeComponent)
      },
      {
        path: 'ingreso',
        loadComponent: () =>
          import('./paginas/ingreso/menu').then(m => m.MenuComponent)
      },
      {
        path: 'stock',
        loadComponent: () =>
          import('./paginas/ingresos/stock/mantenedor-stock/mantenedor-stock.component').then(m => m.MantenedorStockComponent)
      },
      {
        path: 'solicitar-productos',
        loadComponent: () =>
          import('./paginas/ingresos/stock/lista-solicitar-productos/lista-solicitar-productos.component').then(m => m.ListaSolicitarProductosComponent)
      },
      {
        path: 'mis-solicitudes',
        loadComponent: () => import('./paginas/ingresos/stock/solicitud-cliente/solicitud-cliente.component').then(m => m.SolicitudClienteComponent),
        data: { title: 'Solicitud Cliente' }
      },
      {
        path: 'estado-solicitudes',
        loadComponent: () => import('./paginas/ingresos/stock/solicitud-operador/solicitud-operador.component').then(m => m.SolicitudesPendientesComponent),
        data: { title: 'Solicitud Operador' }
      },
      {
        path: 'solicitud-cliente',
        loadComponent: () => import('./paginas/ingresos/stock/solicitud-cliente/solicitud-cliente.component').then(m => m.SolicitudClienteComponent),
        data: { title: 'Solicitud Cliente' }
      },
      {
        path: 'solicitud-operador',
        loadComponent: () => import('./paginas/ingresos/stock/solicitud-operador/solicitud-operador.component').then(m => m.SolicitudesPendientesComponent),
        data: { title: 'Solicitud Operador' }
      },
      {
        path: 'productos',
        loadComponent: () =>
          import('./paginas/maestros/productos/mantenedor-productos/mantenedor-productos.component').then(m => m.MantenedorProductosComponent)
      },
      {
        path: 'categorias',
        loadComponent: () =>
          import('./paginas/maestros/categorias/mantenedor-categorias/mantenedor-categorias.component').then(m => m.MantenedorCategoriasComponent)
      },
      {
        path: 'departamentos',
        loadComponent: () =>
          import('./paginas/maestros/departamentos/mantenedor-departamentos/mantenedor-departamentos.component').then(m => m.MantenedorDepartamentosComponent)
      },
      {
        path: 'unidad-medida',
        loadComponent: () =>
          import('./paginas/maestros/unidad-medida/mantenedor-unidad-medida/mantenedor-unidad-medida.component').then(m => m.MantenedorUnidadMedidaComponent)
      },
      {
        path: 'proveedores',
        loadComponent: () =>
          import('./paginas/maestros/proveedores/mantanedor-proveedores/mantanedor-proveedores.component').then(m => m.MantenedorProveedoresComponent)
      },
      {
        path: 'clientes',
        loadComponent: () =>
          import('./paginas/maestros/clientes/mantenedor-clientes/mantenedor-clientes.component').then(m => m.MantenedorClientesComponent)
      },
      {
        path: 'perfiles',
        loadComponent: () =>
          import('./paginas/maestros/perfiles/mantenedor-perfiles/mantenedor-perfiles.component').then(m => m.MantenedorPerfilesComponent)
      },
      {
        path: 'asignacion-permisos',
        loadComponent: () =>
          import('./paginas/maestros/perfiles/asignacion-permisos/asignacion-permisos').then(m => m.AsignacionPermisosComponent)
      }
    ]
  },

  // Fallback
  { path: '**', redirectTo: 'login' }
];
