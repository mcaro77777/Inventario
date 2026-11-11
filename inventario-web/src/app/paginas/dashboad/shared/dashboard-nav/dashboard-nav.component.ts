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
interface NavGroup { label:string; icon:string; route?:string; items?:NavItem[]; }

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
        <ng-container *ngFor="let group of advancedGroups">
          <a *ngIf="group.route" [routerLink]="['/menu','dashboard-bi',group.route]" routerLinkActive="active" class="nav-group direct" (click)="onNavClick()">
            <i [class]="group.icon"></i><span>{{group.label}}</span>
          </a>
          <div *ngIf="group.items" class="nav-group">
            <span class="group-label"><i [class]="group.icon"></i>{{group.label}}</span>
            <span class="group-links">
              <a *ngFor="let item of group.items" [routerLink]="['/menu','dashboard-bi',item.route]" routerLinkActive="active" (click)="onNavClick()">{{item.label}}</a>
            </span>
          </div>
        </ng-container>
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
      gap: 0.45rem;
      padding: 0.5rem;
      background: var(--surface-card);
      border-radius: 12px;
      border: 1px solid var(--surface-border);
      margin-bottom: 1rem;
      overflow-x: auto;
      scrollbar-width: thin;
    }
    .nav-group { display:flex; align-items:center; gap:.4rem; min-height:42px; padding:.3rem .45rem; border:1px solid var(--surface-border); border-radius:9px; background:var(--surface-ground); white-space:nowrap; }
    .nav-group.direct { padding:.55rem .75rem; color:var(--text-color-secondary); text-decoration:none; font-size:.78rem; font-weight:750; }
    .nav-group.direct:hover,.nav-group.direct.active { color:var(--primary-color); background:var(--surface-card); border-color:color-mix(in srgb,var(--primary-color) 45%,var(--surface-border)); }
    .group-label { display:flex; align-items:center; gap:.35rem; padding:0 .3rem; color:var(--text-color-secondary); font-size:.67rem; font-weight:800; text-transform:uppercase; letter-spacing:.04em; }
    .group-links { display:flex; gap:.15rem; }
    .group-links a { padding:.4rem .5rem; color:var(--text-color-secondary); border-radius:6px; text-decoration:none; font-size:.74rem; }
    .group-links a:hover { color:var(--text-color); background:var(--surface-hover); }
    .group-links a.active { color:var(--primary-color); background:var(--surface-card); box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--primary-color) 35%,transparent); font-weight:750; }
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
      .dashboard-nav{align-items:stretch}.nav-group{flex:0 0 auto}.group-label{display:none}
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

  advancedGroups: NavGroup[] = [
    { label:'Panorama', icon:'pi pi-home', route:'resumen' },
    { label:'Stock y riesgos', icon:'pi pi-exclamation-triangle', route:'stock-riesgo' },
    { label:'Flujo operativo', icon:'pi pi-sync', items:[
      { label:'Movimientos', route:'movimientos', icon:'' }, { label:'Solicitudes', route:'solicitudes', icon:'' }, { label:'Compras', route:'compras', icon:'' }
    ]},
    { label:'Análisis', icon:'pi pi-chart-bar', items:[
      { label:'Clientes', route:'clientes-deptos', icon:'' }, { label:'Tendencias', route:'ejecutivo', icon:'' }
    ]}
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
