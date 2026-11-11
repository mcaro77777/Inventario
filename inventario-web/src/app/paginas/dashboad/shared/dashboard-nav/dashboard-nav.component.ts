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
      <nav class="dashboard-nav">
        <a *ngFor="let item of navItems"
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
      gap: 0.25rem;
      padding: 0.5rem;
      background: var(--surface-card);
      border-radius: 12px;
      border: 1px solid var(--surface-border);
      margin-bottom: 1rem;
      overflow-x: auto;
    }
    .nav-tab {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      border-radius: 8px;
      text-decoration: none;
      color: var(--text-color-secondary);
      font-weight: 500;
      font-size: 0.9rem;
      white-space: nowrap;
      transition: all 0.2s;
      border: 2px solid transparent;
    }
    .nav-tab:hover {
      background: var(--surface-hover);
      color: var(--text-color);
    }
    .nav-tab.active {
      background: white;
      color: #1e293b;
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

  navItems: NavItem[] = [
    { label: 'Resumen', route: 'resumen', icon: 'pi pi-home' },
    { label: 'Stock y Riesgos', route: 'stock-riesgo', icon: 'pi pi-exclamation-triangle' },
    { label: 'Movimientos', route: 'movimientos', icon: 'pi pi-chart-line' },
    { label: 'Solicitudes', route: 'solicitudes', icon: 'pi pi-inbox' },
    { label: 'Compras', route: 'compras', icon: 'pi pi-shopping-cart' },
    { label: 'Clientes/Deptos', route: 'clientes-deptos', icon: 'pi pi-users' },
    { label: 'Dashboard BI', route: 'ejecutivo', icon: 'pi pi-chart-bar' }
  ];

  constructor() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        if (event.url.includes('dashboard-bi')) {
          this.filtersService.setLoading(true);
        }
      }
      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        this.filtersService.setLoading(false);
      }
    });
  }

  onNavClick(): void {
    this.filtersService.setLoading(true);
  }
}
