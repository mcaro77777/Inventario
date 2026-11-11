import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface NavItem { etiqueta: string; ruta: string; icono: string; permiso: string; }

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly menuAbierto = signal(false);
  readonly oscuro = signal(localStorage.getItem('theme') === 'dark');

  private readonly operaciones: NavItem[] = [
    { etiqueta: 'Dashboard', ruta: '/menu/dashboard-bi', icono: 'pi-chart-bar', permiso: 'menu.tabla_resumen' },
    { etiqueta: 'Stock', ruta: '/menu/stock', icono: 'pi-box', permiso: 'menu.ingresos' },
    { etiqueta: 'Solicitar productos', ruta: '/menu/solicitar-productos', icono: 'pi-shopping-cart', permiso: 'menu.solicitudes' },
    { etiqueta: 'Mis solicitudes', ruta: '/menu/mis-solicitudes', icono: 'pi-inbox', permiso: 'menu.solicitudes' },
    { etiqueta: 'Gestionar solicitudes', ruta: '/menu/estado-solicitudes', icono: 'pi-check-square', permiso: 'menu.ingresos' }
  ];
  private readonly administracion: NavItem[] = [
    { etiqueta: 'Productos', ruta: '/menu/productos', icono: 'pi-tags', permiso: 'menu.configuracion' },
    { etiqueta: 'Categorías', ruta: '/menu/categorias', icono: 'pi-sitemap', permiso: 'menu.configuracion' },
    { etiqueta: 'Proveedores', ruta: '/menu/proveedores', icono: 'pi-truck', permiso: 'menu.configuracion' },
    { etiqueta: 'Clientes', ruta: '/menu/clientes', icono: 'pi-users', permiso: 'menu.configuracion' },
    { etiqueta: 'Departamentos', ruta: '/menu/departamentos', icono: 'pi-building', permiso: 'menu.configuracion' },
    { etiqueta: 'Unidades de medida', ruta: '/menu/unidad-medida', icono: 'pi-sliders-h', permiso: 'menu.configuracion' },
    { etiqueta: 'Perfiles', ruta: '/menu/perfiles', icono: 'pi-id-card', permiso: 'menu.configuracion' },
    { etiqueta: 'Permisos', ruta: '/menu/asignacion-permisos', icono: 'pi-shield', permiso: 'menu.configuracion' }
  ];

  readonly itemsOperacion = computed(() => this.operaciones.filter((item) => this.auth.tienePermiso(item.permiso)));
  readonly itemsAdministracion = computed(() => this.administracion.filter((item) => this.auth.tienePermiso(item.permiso)));
  readonly iniciales = computed(() => (this.auth.username() || 'Usuario').split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase());

  constructor() { this.aplicarTema(); }
  cerrarMenu(): void { this.menuAbierto.set(false); }
  alternarTema(): void { this.oscuro.update((valor) => !valor); localStorage.setItem('theme', this.oscuro() ? 'dark' : 'light'); this.aplicarTema(); }
  salir(): void { this.auth.logout(); void this.router.navigate(['/login']); }
  private aplicarTema(): void { document.documentElement.dataset['theme'] = this.oscuro() ? 'oscuro' : 'claro'; document.body.classList.toggle('dark-theme', this.oscuro()); }
}
