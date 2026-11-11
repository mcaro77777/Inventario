// ======================== FilterBarComponent ========================
// Barra de filtros global para el dashboard (estilo Power BI slicers)
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DashboardFiltersService } from '../../../../core/services/dashboard-filters.service';
import { DashboardApiService } from '../../../../core/services/dashboard-api.service';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectModule, InputTextModule, ButtonModule],
  template: `
    <!-- Barra compacta de filtros -->
    <div class="filter-bar-compact">
      <div class="filter-left">
        <div class="period-label">
          <i class="pi pi-calendar"></i>
          <span>{{ getPeriodLabel() }}</span>
        </div>
        <div class="bookmarks">
          <button *ngFor="let b of bookmarks" class="bookmark-btn"
                  [class.active]="filtersService.filters().bookmark === b.value"
                  (click)="filtersService.setBookmark(b.value)">{{ b.label }}</button>
        </div>
      </div>

      <div class="filter-selects primary-filters">
        <p-select [options]="categorias()" [(ngModel)]="selectedCategoria"
                   (onChange)="onCategoriaChange($event)"
                   optionLabel="nombre" optionValue="id"
                   [filter]="true" filterPlaceHolder="Buscar..."
                   placeholder="Categoría" [showClear]="true"
                   styleClass="filter-select-sm"></p-select>
        <button type="button" class="more-filters" [class.active]="showMoreFilters" (click)="showMoreFilters = !showMoreFilters">
          <i class="pi pi-sliders-h"></i> Más filtros <span *ngIf="advancedFilterCount">{{ advancedFilterCount }}</span>
        </button>
      </div>

      <div class="filter-selects advanced-filters" *ngIf="showMoreFilters">
        <p-select [options]="productosFiltrados" [(ngModel)]="selectedProducto"
                   (onChange)="onProductoChange($event)"
                   optionLabel="nombre" optionValue="id"
                   [filter]="true" filterPlaceHolder="Buscar..."
                   placeholder="Producto" [showClear]="true"
                   styleClass="filter-select-sm"></p-select>
        <p-select [options]="proveedores()" [(ngModel)]="selectedProveedor"
                   (onChange)="onProveedorChange($event)"
                   optionLabel="nombre" optionValue="id"
                   [filter]="true" filterPlaceHolder="Buscar..."
                   placeholder="Proveedor" [showClear]="true"
                   styleClass="filter-select-sm"></p-select>
        <p-select [options]="departamentos()" [(ngModel)]="selectedDepartamento"
                   (onChange)="onDepartamentoChange($event)"
                   optionLabel="nombre" optionValue="id"
                   [filter]="true" filterPlaceHolder="Buscar..."
                   placeholder="Departamento" [showClear]="true"
                   styleClass="filter-select-sm"></p-select>
      </div>

      <button pButton icon="pi pi-filter-slash"
              class="p-button-text p-button-secondary p-button-sm btn-clear"
              (click)="resetFilters()" [disabled]="!hasActiveFilters()" pTooltip="Limpiar filtros"></button>
    </div>

    <!-- Chips de filtros activos (solo si hay filtros) -->
    <div class="active-filters" *ngIf="hasActiveFilters()">
      <span class="filter-chip" *ngIf="selectedCategoria">{{ getSelectedCategoriaName() }}<i class="pi pi-times" (click)="clearCategoria()"></i></span>
      <span class="filter-chip" *ngIf="selectedProveedor">{{ getSelectedProveedorName() }}<i class="pi pi-times" (click)="clearProveedor()"></i></span>
      <span class="filter-chip" *ngIf="selectedDepartamento">{{ getSelectedDepartamentoName() }}<i class="pi pi-times" (click)="clearDepartamento()"></i></span>
      <span class="filter-chip" *ngIf="selectedProducto">{{ getSelectedProductoName() }}<i class="pi pi-times" (click)="clearProducto()"></i></span>
    </div>
  `,
  styles: [`
    .filter-bar-compact {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem;
      background: var(--surface-card);
      border-radius: 10px;
      border: 1px solid var(--surface-border);
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
    }
    .filter-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .bookmarks {
      display: flex;
      gap: 0.15rem;
      padding: 0.15rem;
      background: var(--surface-ground);
      border-radius: 6px;
    }
    .bookmark-btn {
      padding: 0.3rem 0.6rem;
      border: none;
      background: transparent;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.8rem;
      color: var(--text-color-secondary);
      transition: all 0.2s;
    }
    .bookmark-btn:hover { background: var(--surface-hover); }
    .bookmark-btn.active {
      background: #3b82f6;
      color: white;
      font-weight: 600;
    }
    .filter-selects {
      display: flex;
      flex: 1;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .primary-filters { min-width: 210px; }
    .advanced-filters {
      flex-basis: 100%;
      margin-left: auto;
      padding-top: 0.55rem;
      border-top: 1px solid var(--surface-border);
    }
    .more-filters {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      min-height: 36px;
      padding: 0 0.75rem;
      color: var(--text-color-secondary);
      background: var(--surface-ground);
      border: 1px solid var(--surface-border);
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.78rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .more-filters:hover,.more-filters.active { color: var(--primary-color); border-color: color-mix(in srgb,var(--primary-color) 45%,var(--surface-border)); }
    .more-filters span { display:grid; min-width:18px; height:18px; place-items:center; color:#fff; background:var(--primary-color); border-radius:99px; font-size:.65rem; }
    :host ::ng-deep .filter-select-sm {
      min-width: 140px;
      flex: 1;
      border-radius: 6px;
    }
    :host ::ng-deep .filter-select-sm .p-select-label {
      padding: 0.4rem 0.6rem;
      font-size: 0.8rem;
    }
    :host ::ng-deep .filter-select-sm .p-select-item.p-highlight {
      background: #3b82f6 !important;
      color: white !important;
    }
    .btn-clear { padding: 0.4rem; }
    .period-label {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.6rem;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .period-label i {
      font-size: 1rem;
    }
    .active-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .filter-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.75rem;
      background: var(--primary-100);
      color: var(--primary-700);
      border-radius: 16px;
      font-size: 0.8rem;
      font-weight: 500;
    }
    .filter-chip i {
      cursor: pointer;
      opacity: 0.7;
      font-size: 0.7rem;
    }
    .filter-chip i:hover {
      opacity: 1;
    }
    @media (max-width: 768px) {
      .filter-bar-compact { align-items: stretch; overflow: hidden; }
      .filter-left { width: 100%; min-width: 0; flex-wrap: wrap; }
      .bookmarks { flex: 1 1 220px; min-width: 0; overflow-x: auto; }
      .bookmark-btn { flex: 0 0 auto; }
      .filter-selects { width: 100%; min-width: 0; flex: none; }
      .primary-filters { display: grid; grid-template-columns: minmax(0, 1fr) auto; }
      .advanced-filters { display: grid; grid-template-columns: 1fr; }
      :host ::ng-deep .filter-select-sm { width: 100%; min-width: 0; }
      .btn-clear:disabled { display: none; }
    }
  `]
})
export class FilterBarComponent implements OnInit {
  filtersService = inject(DashboardFiltersService);
  private dashboardApi = inject(DashboardApiService);

  bookmarks = [
    { label: '7 días', value: '7d' as const },
    { label: '30 días', value: '30d' as const },
    { label: '90 días', value: '90d' as const },
    { label: 'Todo', value: 'all' as const }
  ];

  // Usar signals del servicio para opciones (persisten entre navegación)
  categorias = this.filtersService.categorias;
  proveedores = this.filtersService.proveedores;
  departamentos = this.filtersService.departamentos;
  productos = this.filtersService.productos;

  selectedCategoria: number | null = null;
  selectedProveedor: number | null = null;
  selectedDepartamento: number | null = null;
  selectedProducto: number | null = null;
  showMoreFilters = false;

  get advancedFilterCount(): number {
    return [this.selectedProducto, this.selectedProveedor, this.selectedDepartamento].filter(Boolean).length;
  }

  // Productos filtrados por categoría seleccionada (usa el servicio)
  get productosFiltrados(): any[] {
    return this.filtersService.getProductosFiltrados(this.selectedCategoria);
  }

  ngOnInit(): void {
    // Solo cargar si no hay datos en cache
    if (!this.filtersService.optionsLoaded()) {
      this.loadFilterOptions();
    }
    // Sincronizar selección con filtros del servicio
    const f = this.filtersService.filters();
    this.selectedCategoria = f.categoriaId;
    this.selectedProveedor = f.proveedorId;
    this.selectedDepartamento = f.departamentoId;
    this.selectedProducto = f.productoId;
    this.showMoreFilters = this.advancedFilterCount > 0;
  }

  private loadFilterOptions(): void {
    this.dashboardApi.tablaResumen2().subscribe({
      next: (data) => {
        console.log('FilterBar data loaded:', data?.length, 'records');
        if (!data || data.length === 0) {
          console.warn('No data returned from API');
          return;
        }

        // Extraer categorías únicas
        const catMap = new Map<string, number>();
        data.forEach((r: any) => {
          const cat = r.categoria_nombre || r.categoria;
          if (cat && !catMap.has(cat)) {
            catMap.set(cat, r.id_categoria || catMap.size + 1);
          }
        });
        const categorias = Array.from(catMap.entries()).map(([nombre, id]) => ({ id, nombre }));

        // Extraer proveedores únicos
        const provMap = new Map<string, number>();
        data.forEach((r: any) => {
          const prov = r.ingreso_proveedor_nombre || r.producto_proveedor_nombre || r.proveedor;
          const provId = r.ingreso_proveedor_id || r.producto_proveedor_id;
          if (prov && !provMap.has(prov)) {
            provMap.set(prov, provId || provMap.size + 1);
          }
        });
        const proveedores = Array.from(provMap.entries()).map(([nombre, id]) => ({ id, nombre }));

        // Extraer departamentos únicos
        const deptMap = new Map<string, number>();
        data.forEach((r: any) => {
          const dept = r.departamento_nombre || r.departamento;
          if (dept && !deptMap.has(dept)) {
            deptMap.set(dept, r.id_departamento || deptMap.size + 1);
          }
        });
        const departamentos = Array.from(deptMap.entries()).map(([nombre, id]) => ({ id, nombre }));

        // Extraer productos únicos y mapear a categoría
        const prodMap = new Map<string, number>();
        const productoCategoriaMap = new Map<number, number>();
        data.forEach((r: any) => {
          const prod = r.producto_nombre || r.producto;
          const prodId = r.id_producto || r.producto_id;
          const catId = r.id_categoria;
          if (prod && !prodMap.has(prod)) {
            const id = prodId || prodMap.size + 1;
            prodMap.set(prod, id);
            // Guardar relación producto -> categoría
            if (catId) {
              productoCategoriaMap.set(id, catId);
            }
          }
        });
        const productos = Array.from(prodMap.entries()).map(([nombre, id]) => ({ id, nombre }));

        // Guardar en servicio (cache global)
        this.filtersService.setFilterOptions({ categorias, proveedores, departamentos, productos });
        this.filtersService.setProductoCategoriaMap(productoCategoriaMap);
        console.log('Opciones cacheadas - Categorias:', categorias.length, 'Proveedores:', proveedores.length, 'Deptos:', departamentos.length, 'Productos:', productos.length);
      },
      error: (err) => {
        console.error('Error loading filter options:', err);
      }
    });
  }

  onCategoriaChange(event: any): void {
    const selected = this.categorias().find(c => c.id === event.value);
    this.filtersService.filterByCategoria(event.value, selected?.nombre || null);
    // Limpiar producto seleccionado al cambiar categoría
    this.selectedProducto = null;
    this.filtersService.filterByProducto(null);
  }

  onProveedorChange(event: any): void {
    const selected = this.proveedores().find(p => p.id === event.value);
    this.filtersService.filterByProveedor(event.value, selected?.nombre || null);
  }

  onDepartamentoChange(event: any): void {
    const selected = this.departamentos().find(d => d.id === event.value);
    this.filtersService.filterByDepartamento(event.value, selected?.nombre || null);
  }

  onProductoChange(event: any): void {
    this.filtersService.filterByProducto(event.value);
  }

  resetFilters(): void {
    this.selectedCategoria = null;
    this.selectedProveedor = null;
    this.selectedDepartamento = null;
    this.selectedProducto = null;
    this.filtersService.resetAll();
  }

  // Métodos para periodo y chips
  getPeriodLabel(): string {
    if (this.filtersService.filters().bookmark === 'all') return 'Todo el historial';
    const { start, end } = this.filtersService.dateRange();
    const fmt = (d: Date) => d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
    const bookmark = this.filtersService.filters().bookmark;
    const labels: Record<string, string> = { '7d': '7 días', '30d': '30 días', '90d': '90 días', 'all': 'Todo' };
    return `${labels[bookmark]}: ${fmt(start)} – ${fmt(end)}`;
  }

  hasActiveFilters(): boolean {
    return !!(this.selectedCategoria || this.selectedProveedor || this.selectedDepartamento || this.selectedProducto);
  }

  getSelectedCategoriaName(): string {
    return this.categorias().find(c => c.id === this.selectedCategoria)?.nombre || '';
  }

  getSelectedProveedorName(): string {
    return this.proveedores().find(p => p.id === this.selectedProveedor)?.nombre || '';
  }

  getSelectedDepartamentoName(): string {
    return this.departamentos().find(d => d.id === this.selectedDepartamento)?.nombre || '';
  }

  clearCategoria(): void {
    this.selectedCategoria = null;
    this.filtersService.filterByCategoria(null, null);
  }

  clearProveedor(): void {
    this.selectedProveedor = null;
    this.filtersService.filterByProveedor(null, null);
  }

  clearDepartamento(): void {
    this.selectedDepartamento = null;
    this.filtersService.filterByDepartamento(null, null);
  }

  clearProducto(): void {
    this.selectedProducto = null;
    this.filtersService.filterByProducto(null);
  }

  getSelectedProductoName(): string {
    return this.productos().find(p => p.id === this.selectedProducto)?.nombre || '';
  }
}
