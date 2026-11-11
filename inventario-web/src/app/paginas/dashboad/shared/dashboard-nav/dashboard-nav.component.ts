// ======================== DashboardNavComponent ========================
// Navegación tipo tabs para el dashboard
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DashboardFiltersService } from '../../../../core/services/dashboard-filters.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ProgressSpinnerModule],
  template: `
    <div class="nav-wrapper">
      <nav class="mode-nav" aria-label="Nivel de dashboard">
        <a [routerLink]="['/menu', 'dashboard-bi', 'simple']"
           class="mode-tab"
           [class.active]="!advancedMode"
           (click)="onNavClick()">
          <i class="pi pi-sparkles"></i>
          <span><strong>Simple</strong><small>Lo importante de hoy</small></span>
        </a>
        <a [routerLink]="['/menu', 'dashboard-bi', 'resumen']"
           class="mode-tab"
           [class.active]="advancedMode"
           (click)="onNavClick()">
          <i class="pi pi-chart-bar"></i>
          <span><strong>Avanzado</strong><small>Análisis y tendencias</small></span>
        </a>
      </nav>

      <nav class="dashboard-nav" *ngIf="advancedMode" aria-label="Secciones del análisis avanzado">
        <a *ngFor="let item of advancedItems"
           [routerLink]="['/menu', 'dashboard-bi', item.route]"
           routerLinkActive="active"
           class="nav-tab"
           (click)="onNavClick()">
          <i [class]="item.icon"></i>
          <span>{{ item.label }}</span>
        </a>
      </nav>
      
      <!-- Loading overlay -->
      <div class="loading-overlay" *ngIf="filtersService.loading()">
        <p-progressSpinner strokeWidth="4" animationDuration="0.8s"></p-progressSpinner>
        <span>Cargando...</span>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-nav {
      display: flex;
      gap: 0.15rem;
      padding: 0.5rem;
      background: var(--surface-card);
      border-radius: 12px;
      border: 1px solid var(--surface-border);
      margin-bottom: 1rem;
      overflow-x: auto;
      scrollbar-width: thin;
    }
    .mode-nav {
      display: inline-grid;
      grid-template-columns: repeat(2, minmax(180px, 1fr));
      gap: 0.35rem;
      padding: 0.35rem;
      margin-bottom: 0.85rem;
      background: var(--surface-ground);
      border: 1px solid var(--surface-border);
      border-radius: 14px;
    }
    .mode-tab {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-height: 58px;
      padding: 0.65rem 1rem;
      color: var(--text-color-secondary);
      text-decoration: none;
      border: 1px solid transparent;
      border-radius: 10px;
      transition: all 0.2s ease;
    }
    .mode-tab > i { font-size: 1.15rem; }
    .mode-tab span { display: flex; flex-direction: column; gap: 0.1rem; }
    .mode-tab strong { font-size: 0.9rem; }
    .mode-tab small { font-size: 0.72rem; opacity: 0.72; }
    .mode-tab:hover { color: var(--text-color); background: var(--surface-hover); }
    .mode-tab.active {
      color: var(--primary-color);
      background: var(--surface-card);
      border-color: color-mix(in srgb, var(--primary-color) 30%, transparent);
      box-shadow: 0 6px 18px rgba(31, 35, 48, 0.08);
    }
    .nav-tab {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.7rem 0.8rem;
      border-radius: 8px;
      text-decoration: none;
      color: var(--text-color-secondary);
      font-weight: 500;
      font-size: 0.82rem;
      white-space: nowrap;
      transition: all 0.2s;
      border: 2px solid transparent;
    }
    .nav-tab:hover {
      background: var(--surface-hover);
      color: var(--text-color);
    }
    .nav-tab.active {
      background: var(--surface-card);
      color: var(--text-color);
      border-color: var(--primary-color);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      transform: translateY(-1px);
      font-weight: 700;
    }
    .nav-tab.active i {
      color: var(--primary-color);
      transform: scale(1.1);
    }
    .nav-tab i {
      font-size: 1rem;
    }
    @media (max-width: 768px) {
      .nav-tab span {
        display: none;
      }
      .nav-tab {
        padding: 0.75rem;
      }
      .mode-nav { display: grid; width: 100%; grid-template-columns: 1fr 1fr; }
      .mode-tab { min-width: 0; padding: 0.55rem 0.7rem; }
      .mode-tab small { display: none; }
    }
    .nav-wrapper {
      position: relative;
    }
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      z-index: 9999;
      color: white;
      font-weight: 600;
      font-size: 1rem;
    }
  `]
})
export class DashboardNavComponent {
  filtersService = inject(DashboardFiltersService);
  private router = inject(Router);

  advancedMode = false;

  advancedItems: NavItem[] = [
    { label: 'Panorama', route: 'resumen', icon: 'pi pi-home' },
    { label: 'Stock y riesgos', route: 'stock-riesgo', icon: 'pi pi-exclamation-triangle' },
    { label: 'Movimientos', route: 'movimientos', icon: 'pi pi-chart-line' },
    { label: 'Solicitudes', route: 'solicitudes', icon: 'pi pi-inbox' },
    { label: 'Compras', route: 'compras', icon: 'pi pi-shopping-cart' },
    { label: 'Clientes', route: 'clientes-deptos', icon: 'pi pi-users' },
    { label: 'Tendencias', route: 'ejecutivo', icon: 'pi pi-chart-bar' }
  ];

  constructor() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        if (event.url.includes('dashboard-bi')) {
          this.filtersService.setLoading(true);
        }
      }
      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        this.advancedMode = !this.router.url.includes('/dashboard-bi/simple');
        this.filtersService.setLoading(false);
      }
    });
    this.advancedMode = !this.router.url.includes('/dashboard-bi/simple');
  }

  onNavClick(): void {
    this.filtersService.setLoading(true);
  }
}
