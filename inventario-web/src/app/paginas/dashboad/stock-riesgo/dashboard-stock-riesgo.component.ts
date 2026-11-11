// ======================== DashboardStockRiesgoComponent ========================
// Página B: Stock y Riesgos - Control de quiebres y reservas
import { Component, OnInit, inject, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { finalize } from 'rxjs/operators';

import { FilterBarComponent } from '../shared/filter-bar/filter-bar.component';
import { DashboardNavComponent } from '../shared/dashboard-nav/dashboard-nav.component';
import { BaseChartComponent } from '../../../shared/base-chart/base-chart.component';
import { KpiCardComponent, KpiData } from '../shared/kpi-card/kpi-card.component';
import { DashboardFiltersService } from '../../../core/services/dashboard-filters.service';
import { DashboardApiService } from '../../../core/services/dashboard-api.service';

import { ChartData, ChartOptions } from 'chart.js';

interface StockRow {
  producto: string;
  categoria: string;
  disponible: number;
  reservado: number;
  consumido: number;
  minimo: number;
  cobertura: number | null; // null = infinita (sin consumo)
  coberturaLabel: string;
  rotacion: number;
  semaforo: 'red' | 'amber' | 'green';
  tipoRiesgo: 'bajo_minimo' | 'alta_rotacion' | 'reserva_alta' | 'sin_riesgo';
  faltante: number; // minimo - disponible (si > 0)
  severidad: number; // % bajo mínimo
}

@Component({
  selector: 'app-dashboard-stock-riesgo',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, TooltipModule, FilterBarComponent, BaseChartComponent, DashboardNavComponent, KpiCardComponent],
  template: `
    <div class="dashboard-page">
      <header class="page-header">
        <div>
          <h1><i class="pi pi-exclamation-triangle"></i> Stock y Riesgos</h1>
          <p class="subtitle">Control de quiebres, reservas y cobertura</p>
        </div>
        <div class="header-actions">
          <div class="top-n-selector">
            <label>Top N:</label>
            <select [(ngModel)]="topN" (change)="applyFilters()">
              <option [value]="10">10</option>
              <option [value]="20">20</option>
              <option [value]="50">50</option>
              <option [value]="100">100</option>
            </select>
          </div>
        </div>
      </header>

      <app-dashboard-nav></app-dashboard-nav>
      <app-filter-bar></app-filter-bar>

      <!-- KPIs -->
      <section class="kpi-grid">
        <app-kpi-card *ngFor="let kpi of kpis" [data]="kpi"></app-kpi-card>
      </section>

      <!-- Gráficos -->
      <section class="charts-grid">
        <!-- Barras: Stock por Categoría -->
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">
              <h3>Stock Disponible por Categoría</h3>
              <i class="pi pi-question-circle help-icon"
                 pTooltip="📊 ¿Qué muestra? Cantidad de unidades disponibles agrupadas por categoría.

💡 ¿Para qué sirve? Identificar qué categorías tienen más stock y detectar desbalances.

📌 Tip: Haz clic en una barra para ocultarla y comparar mejor las demás."
                 tooltipPosition="bottom" [escape]="false"></i>
            </div>
            <button *ngIf="excludedCategories.size > 0" class="btn-clear-filter" (click)="clearExcludedCategories()">
              <i class="pi pi-filter-slash"></i> Mostrar todas ({{excludedCategories.size}} ocultas)
            </button>
          </div>
          <p class="chart-hint" *ngIf="excludedCategories.size === 0">Clic en una barra para ocultarla</p>
          <app-base-chart [title]="''" [type]="'bar'" [data]="barCategoriaData" [options]="barHorizontalOptions" (chartClick)="onCategoriaChartClick($event)"></app-base-chart>
        </div>

        <!-- Barras: Composición de Stock -->
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">
              <h3>Composición de Stock</h3>
              <i class="pi pi-question-circle help-icon"
                 pTooltip="📊 ¿Qué muestra? Distribución del inventario en tres estados: Disponible, Reservado y Consumido.

💡 ¿Para qué sirve? Entender cómo se distribuye el stock y si hay mucho comprometido en reservas.

📌 Alerta: Si 'Reservado' es muy alto, podrías tener problemas de disponibilidad."
                 tooltipPosition="bottom" [escape]="false"></i>
            </div>
          </div>
          <app-base-chart [title]="''" [type]="'bar'" [data]="barComposicionData" [options]="barOptions"></app-base-chart>
        </div>

        <!-- Productos Sin Movimiento (dinero estancado) -->
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">
              <h3><i class="pi pi-pause-circle" style="color:#f59e0b"></i> Sin Movimiento (60+ días)</h3>
              <i class="pi pi-question-circle help-icon"
                 pTooltip="📊 ¿Qué muestra? Productos con stock que NO se han consumido en 60+ días.

💡 ¿Para qué sirve? Detectar capital inmovilizado ('dinero dormido') que podría liberarse.

📌 Acción: Considera promociones, devoluciones o ajustes de inventario para estos productos."
                 tooltipPosition="bottom" [escape]="false"></i>
            </div>
            <span class="estancado-total">{{ totalEstancadoFormatted }}</span>
          </div>
          <app-base-chart [title]="''" [type]="'bar'" [data]="estancadoData" [options]="estancadoOptions"></app-base-chart>
        </div>

        <!-- Análisis ABC -->
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">
              <h3><i class="pi pi-chart-pie" style="color:#3b82f6"></i> Análisis ABC (Valor Inventario)</h3>
              <i class="pi pi-question-circle help-icon"
                 pTooltip="📊 ¿Qué muestra? Clasificación de productos por su valor económico en el inventario.

💡 Clasificación:
• A (80% valor): Pocos productos, alto valor - ¡Control estricto!
• B (15% valor): Valor medio - Control moderado
• C (5% valor): Muchos productos, bajo valor - Control básico

📌 Prioriza la gestión de productos clase A."
                 tooltipPosition="bottom" [escape]="false"></i>
            </div>
          </div>
          <div class="abc-summary">
            <div class="abc-item abc-a"><span class="abc-label">A</span><span class="abc-value">{{ abcData.a.pct }}% valor</span><span class="abc-count">{{ abcData.a.count }} productos</span></div>
            <div class="abc-item abc-b"><span class="abc-label">B</span><span class="abc-value">{{ abcData.b.pct }}% valor</span><span class="abc-count">{{ abcData.b.count }} productos</span></div>
            <div class="abc-item abc-c"><span class="abc-label">C</span><span class="abc-value">{{ abcData.c.pct }}% valor</span><span class="abc-count">{{ abcData.c.count }} productos</span></div>
          </div>
          <app-base-chart [title]="''" [type]="'doughnut'" [data]="abcChartData" [options]="abcChartOptions"></app-base-chart>
        </div>
      </section>

      <!-- Matriz de productos -->
      <section class="matrix-section">
        <div class="section-header">
          <h3>Matriz de Stock por Producto</h3>
          <div class="section-actions">
            <span class="count-badge">{{ stockRows.length }} productos</span>
            <button class="btn-export" (click)="exportToExcel()"><i class="pi pi-file-excel"></i> Exportar</button>
          </div>
        </div>
        <p-table [value]="stockRows" [paginator]="true" [rows]="20"
                 [globalFilterFields]="['producto', 'categoria']"
                 styleClass="p-datatable-sm p-datatable-striped"
                 [scrollable]="true" scrollHeight="500px">
          <ng-template pTemplate="header">
            <tr>
              <th style="width:40px"></th>
              <th pSortableColumn="producto">Producto</th>
              <th pSortableColumn="categoria">Categoría</th>
              <th pSortableColumn="disponible" style="text-align:right">Disponible</th>
              <th pSortableColumn="minimo" style="text-align:right">Mínimo</th>
              <th pSortableColumn="faltante" style="text-align:right">Faltante</th>
              <th pSortableColumn="severidad" style="text-align:right">Severidad</th>
              <th pSortableColumn="cobertura" style="text-align:right">Cobertura</th>
              <th style="width:120px">Tipo Riesgo</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr class="clickable-row" (click)="onProductClick(row)">
              <td><span class="semaforo" [class]="'semaforo-' + row.semaforo"></span></td>
              <td>{{ row.producto }}</td>
              <td>{{ row.categoria }}</td>
              <td style="text-align:right" [class.text-danger]="row.disponible <= 0">{{ row.disponible | number:'1.0-0' }}</td>
              <td style="text-align:right">{{ row.minimo | number:'1.0-0' }}</td>
              <td style="text-align:right" [class.text-danger]="row.faltante > 0">{{ row.faltante > 0 ? row.faltante : '-' }}</td>
              <td style="text-align:right">
                <span *ngIf="row.severidad > 0" class="severity-badge" [class.high]="row.severidad >= 50">{{ row.severidad }}%</span>
                <span *ngIf="row.severidad === 0">-</span>
              </td>
              <td style="text-align:right" [class.text-warning]="row.cobertura !== null && row.cobertura < 14">
                {{ row.coberturaLabel }}
              </td>
              <td>
                <span class="risk-tag" [class]="'risk-' + row.tipoRiesgo">{{ getRiskLabel(row.tipoRiesgo) }}</span>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </section>

      <div class="loading-overlay" *ngIf="loading"><i class="pi pi-spin pi-spinner"></i></div>
    </div>
  `,
  styles: [`
    .dashboard-page { padding: 1.5rem; max-width: 1800px; margin: 0 auto; position: relative; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
    .page-header h1 { margin: 0; font-size: 1.75rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; }
    .subtitle { margin: 0.25rem 0 0; opacity: 0.7; font-size: 0.9rem; }
    .header-actions { display: flex; gap: 1rem; align-items: center; }
    .btn-nav { padding: 0.5rem 1rem; border: 1px solid var(--surface-border); background: var(--surface-card); border-radius: 8px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s; }
    .btn-nav:hover { background: var(--primary-color); color: white; border-color: var(--primary-color); }
    .top-n-selector { display: flex; align-items: center; gap: 0.5rem; }
    .top-n-selector select { padding: 0.5rem; border-radius: 6px; border: 1px solid var(--surface-border); background: var(--surface-card); }

    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }

    .charts-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
    .chart-card { background: var(--surface-card); border-radius: 12px; border: 1px solid var(--surface-border); padding: 1rem; min-height: 350px; }
    .chart-wide { grid-column: span 2; }
    .estancado-total { padding: 0.25rem 0.75rem; background: #fef3c7; color: #92400e; border-radius: 6px; font-size: 0.85rem; font-weight: 600; }
    .chart-header { margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
    .chart-header h3 { margin: 0; font-size: 1rem; font-weight: 600; }
    .chart-title { display: flex; align-items: center; gap: 0.5rem; }
    .help-icon { color: #9ca3af; cursor: pointer; font-size: 1rem; transition: color 0.2s; }
    .help-icon:hover { color: var(--primary-color); }
    .btn-clear-filter { padding: 0.25rem 0.5rem; font-size: 0.75rem; border: 1px solid var(--surface-border); background: var(--surface-card); border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 0.25rem; }
    .btn-clear-filter:hover { background: var(--primary-color); color: white; border-color: var(--primary-color); }
    .chart-hint { font-size: 0.75rem; color: var(--text-color-secondary); margin: 0 0 0.5rem; font-style: italic; }

    .matrix-section { background: var(--surface-card); border-radius: 12px; border: 1px solid var(--surface-border); overflow: hidden; }
    .section-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid var(--surface-border); }
    .section-header h3 { margin: 0; font-size: 1rem; font-weight: 600; }
    .section-actions { display: flex; align-items: center; gap: 0.75rem; }
    .count-badge { padding: 0.25rem 0.75rem; background: var(--primary-color); color: white; border-radius: 20px; font-size: 0.75rem; }
    .btn-export { padding: 0.4rem 0.75rem; border: 1px solid #22c55e; background: #22c55e; color: white; border-radius: 6px; cursor: pointer; font-size: 0.8rem; display: flex; align-items: center; gap: 0.35rem; transition: all 0.2s; }
    .btn-export:hover { background: #16a34a; }

    .abc-summary { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
    .abc-item { flex: 1; padding: 0.5rem; border-radius: 8px; text-align: center; }
    .abc-a { background: #dbeafe; border: 2px solid #3b82f6; }
    .abc-b { background: #fef3c7; border: 2px solid #f59e0b; }
    .abc-c { background: #f3f4f6; border: 2px solid #9ca3af; }
    .abc-label { display: block; font-size: 1.25rem; font-weight: 700; }
    .abc-a .abc-label { color: #1d4ed8; }
    .abc-b .abc-label { color: #b45309; }
    .abc-c .abc-label { color: #4b5563; }
    .abc-value { display: block; font-size: 0.85rem; font-weight: 600; color: #374151; }
    .abc-count { display: block; font-size: 0.7rem; color: #6b7280; }
    :host-context(.dark-theme) .abc-a, :host-context([data-theme="dark"]) .abc-a { background: rgba(59,130,246,0.25); border-color: #60a5fa; }
    :host-context(.dark-theme) .abc-b, :host-context([data-theme="dark"]) .abc-b { background: rgba(245,158,11,0.25); border-color: #fbbf24; }
    :host-context(.dark-theme) .abc-c, :host-context([data-theme="dark"]) .abc-c { background: rgba(156,163,175,0.25); border-color: #6b7280; }
    :host-context(.dark-theme) .abc-a .abc-label, :host-context([data-theme="dark"]) .abc-a .abc-label { color: #93c5fd; }
    :host-context(.dark-theme) .abc-b .abc-label, :host-context([data-theme="dark"]) .abc-b .abc-label { color: #fcd34d; }
    :host-context(.dark-theme) .abc-c .abc-label, :host-context([data-theme="dark"]) .abc-c .abc-label { color: #d1d5db; }
    :host-context(.dark-theme) .abc-value, :host-context([data-theme="dark"]) .abc-value { color: #f3f4f6; }
    :host-context(.dark-theme) .abc-count, :host-context([data-theme="dark"]) .abc-count { color: #d1d5db; }

    .semaforo { display: inline-block; width: 12px; height: 12px; border-radius: 50%; }
    .semaforo-red { background: #ef4444; box-shadow: 0 0 6px #ef4444; }
    .semaforo-amber { background: #f59e0b; box-shadow: 0 0 6px #f59e0b; }
    .semaforo-green { background: #22c55e; box-shadow: 0 0 6px #22c55e; }
    .clickable-row { cursor: pointer; }
    .clickable-row:hover { background: var(--surface-hover) !important; }
    .text-danger { color: #ef4444; font-weight: 600; }
    .text-warning { color: #f59e0b; font-weight: 600; }

    .severity-badge { padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; background: #fef3c7; color: #92400e; }
    .severity-badge.high { background: #fee2e2; color: #991b1b; }
    .risk-tag { padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 500; white-space: nowrap; }
    .risk-bajo_minimo { background: #fee2e2; color: #991b1b; }
    .risk-alta_rotacion { background: #fef3c7; color: #92400e; }
    .risk-reserva_alta { background: #dbeafe; color: #1e40af; }
    .risk-sin_riesgo { background: #dcfce7; color: #166534; }

    .loading-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 2rem; border-radius: 12px; }

    @media (max-width: 1200px) { .charts-grid { grid-template-columns: 1fr; } }
  `]
})
export class DashboardStockRiesgoComponent implements OnInit {
  private router = inject(Router);
  private filtersService = inject(DashboardFiltersService);
  private dashboardApi = inject(DashboardApiService);

  loading = false;
  rawData: any[] = [];
  topN = 50;

  kpis: KpiData[] = [];
  stockRows: StockRow[] = [];
  barCategoriaData: ChartData<'bar'> = { labels: [], datasets: [] };
  barComposicionData: ChartData<'bar'> = { labels: [], datasets: [] };
  estancadoData: ChartData<'bar'> = { labels: [], datasets: [] };
  abcChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  abcData = { a: { pct: 0, count: 0 }, b: { pct: 0, count: 0 }, c: { pct: 0, count: 0 } };
  totalEstancadoFormatted = '$0';
  excludedCategories = new Set<string>();
  private allCategoriesData: Array<{cat: string; val: number}> = [];
  private stockWithValue: Array<{producto: string; valor: number; clase: string}> = [];

  getRiskLabel(tipo: string): string {
    const labels: Record<string, string> = {
      'bajo_minimo': 'Bajo mínimo',
      'alta_rotacion': 'Alta rotación',
      'reserva_alta': 'Reserva alta',
      'sin_riesgo': 'OK'
    };
    return labels[tipo] || tipo;
  }

  barHorizontalOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    scales: {
      x: { beginAtZero: true, title: { display: true, text: 'Cantidad' } }
    },
    plugins: { 
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.x.toLocaleString()} unidades` } }
    }
  };

  barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Cantidad' } }
    },
    plugins: { 
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed.y.toLocaleString()}` } }
    }
  };

  estancadoOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    scales: {
      x: { beginAtZero: true, ticks: { callback: (v) => '$' + Number(v).toLocaleString() } }
    },
    plugins: { 
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `$${ctx.parsed.x.toLocaleString()} en stock sin movimiento` } }
    }
  };

  abcChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `Clase ${ctx.label}: $${ctx.parsed.toLocaleString()}` } }
    }
  };

  private cdr = inject(ChangeDetectorRef);

  constructor() {
    effect(() => {
      this.filtersService.filters();
      if (this.rawData.length > 0) {
        this.applyFilters();
        this.cdr.detectChanges();
      }
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.dashboardApi.tablaResumen2().pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); })).subscribe({
      next: (data) => {
        console.log('StockRiesgo data loaded:', data?.length, 'records');
        this.rawData = data || [];
        this.applyFilters();
        this.cdr.detectChanges();
        setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
      },
      error: (err) => {
        console.error('Error loading data:', err);
        this.rawData = [];
      }
    });
  }

  applyFilters(): void {
    const filters = this.filtersService.filters();
    const { start, end } = this.filtersService.dateRange();

    let filtered = this.rawData.filter(r => {
      const fecha = new Date(r.fecha);
      if (!isNaN(fecha.getTime()) && (fecha < start || fecha > end)) return false;
      
      // Filtro por categoría
      if (filters.categoriaNombre) {
        const catNombre = r.categoria_nombre || r.categoria || '';
        if (catNombre.toLowerCase() !== filters.categoriaNombre.toLowerCase()) return false;
      }
      
      // Filtro por proveedor
      if (filters.proveedorNombre) {
        const provNombre = r.ingreso_proveedor_nombre || r.producto_proveedor_nombre || '';
        if (provNombre.toLowerCase() !== filters.proveedorNombre.toLowerCase()) return false;
      }
      
      // Filtro por departamento
      if (filters.departamentoNombre) {
        const deptNombre = r.departamento_nombre || r.departamento || '';
        if (deptNombre.toLowerCase() !== filters.departamentoNombre.toLowerCase()) return false;
      }
      
      // Filtro por texto
      const producto = r.producto_nombre || r.producto || '';
      if (filters.searchText && !producto.toLowerCase().includes(filters.searchText.toLowerCase())) return false;
      return true;
    });

    console.log('StockRiesgo filtered:', filtered.length, 'records');

    this.buildStockMatrix(filtered);
    this.buildKpis();
    this.buildBarCategoriaChart();
    this.buildBarComposicionChart();
    this.buildEstancadoChart(filtered);
    this.buildAbcAnalysis(filtered);
  }

  private buildKpis(): void {
    const totalProductos = this.stockRows.length;
    const productosEnRiesgo = this.stockRows.filter(r => r.semaforo === 'red').length;
    const productosAlerta = this.stockRows.filter(r => r.semaforo === 'amber').length;
    
    // Cobertura promedio (solo productos con consumo)
    const conCobertura = this.stockRows.filter(r => r.cobertura !== null && r.cobertura > 0);
    const coberturaPromedio = conCobertura.length > 0 
      ? conCobertura.reduce((sum, r) => sum + (r.cobertura || 0), 0) / conCobertura.length 
      : 0;
    
    // Rotación promedio
    const rotacionPromedio = totalProductos > 0 
      ? this.stockRows.reduce((sum, r) => sum + r.rotacion, 0) / totalProductos 
      : 0;

    // Stock total
    const stockTotal = this.stockRows.reduce((sum, r) => sum + Math.max(0, r.disponible), 0);
    const reservadoTotal = this.stockRows.reduce((sum, r) => sum + r.reservado, 0);

    const fmt = (n: number) => n.toLocaleString('es-CL');

    this.kpis = [
      { label: 'Stock Total', value: fmt(stockTotal), icon: 'pi pi-box', color: 'blue', tooltip: 'Unidades disponibles en bodega' },
      { label: 'Cobertura Prom.', value: coberturaPromedio > 365 ? '>1 año' : Math.round(coberturaPromedio) + ' días', icon: 'pi pi-calendar', color: 'green', tooltip: 'Días promedio que dura el stock actual' },
      { label: 'Rotación', value: rotacionPromedio.toFixed(2) + 'x', icon: 'pi pi-sync', color: 'purple', tooltip: 'Veces que rota el inventario en el periodo' },
      { label: 'En Riesgo', value: productosEnRiesgo, icon: 'pi pi-exclamation-triangle', color: 'red', tooltip: 'Productos bajo stock mínimo' },
      { label: 'En Alerta', value: productosAlerta, icon: 'pi pi-bell', color: 'amber', tooltip: 'Productos con cobertura < 7 días o reserva alta' },
      { label: 'Reservado', value: fmt(reservadoTotal), icon: 'pi pi-lock', color: 'gray', tooltip: 'Unidades en solicitudes pendientes' }
    ];
  }

  private buildStockMatrix(data: any[]): void {
    const productMap = new Map<string, { cat: string; ingresado: number; reservado: number; consumido: number; minimo: number; dias: number }>();
    const { start, end } = this.filtersService.dateRange();
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    data.forEach(r => {
      const key = r.producto_nombre || r.producto || 'Sin producto';
      const tipo = r.tipo_id ?? r.tipo;
      const cat = r.categoria_nombre || r.categoria || '';
      const minimo = r.producto_stock_minimo || r.minimo || 0;
      if (!productMap.has(key)) {
        productMap.set(key, { cat, ingresado: 0, reservado: 0, consumido: 0, minimo, dias: 0 });
      }
      const p = productMap.get(key)!;
      const qty = r.cantidad || 0;
      if (tipo === 0) p.ingresado += qty;
      else if (tipo === 1) p.reservado += qty;
      else if (tipo === 2) { p.consumido += qty; p.dias++; }
    });

    this.stockRows = [];
    productMap.forEach((p, prod) => {
      const disponible = p.ingresado - p.reservado - p.consumido;
      const consumoDiario = p.consumido / totalDays;
      const cobertura = consumoDiario > 0 ? Math.floor(disponible / consumoDiario) : null;
      const stockPromedio = (p.ingresado + disponible) / 2;
      const rotacion = stockPromedio > 0 ? p.consumido / stockPromedio : 0;

      // Determinar tipo de riesgo y semáforo
      let semaforo: 'red' | 'amber' | 'green' = 'green';
      let tipoRiesgo: 'bajo_minimo' | 'alta_rotacion' | 'reserva_alta' | 'sin_riesgo' = 'sin_riesgo';
      const faltante = Math.max(0, p.minimo - disponible);
      const severidad = p.minimo > 0 ? Math.round((faltante / p.minimo) * 100) : 0;

      if (disponible <= 0 || disponible <= p.minimo) {
        semaforo = 'red';
        tipoRiesgo = 'bajo_minimo';
      } else if (cobertura !== null && cobertura < 7) {
        semaforo = 'amber';
        tipoRiesgo = 'alta_rotacion';
      } else if (p.reservado > disponible * 0.5) {
        semaforo = 'amber';
        tipoRiesgo = 'reserva_alta';
      }

      // Etiqueta de cobertura
      const coberturaLabel = cobertura === null ? '∞' : (cobertura > 365 ? '>1 año' : `${cobertura}d`);

      this.stockRows.push({
        producto: prod,
        categoria: p.cat,
        disponible,
        reservado: p.reservado,
        consumido: p.consumido,
        minimo: p.minimo,
        cobertura,
        coberturaLabel,
        rotacion,
        semaforo,
        tipoRiesgo,
        faltante,
        severidad
      });
    });

    // Ordenar por semáforo y limitar
    this.stockRows.sort((a, b) => {
      const order = { red: 0, amber: 1, green: 2 };
      return order[a.semaforo] - order[b.semaforo];
    });
    this.stockRows = this.stockRows.slice(0, this.topN);
  }

  private buildBarCategoriaChart(): void {
    const catMap = new Map<string, number>();

    this.stockRows.forEach(r => {
      const cat = r.categoria || 'Sin categoría';
      catMap.set(cat, (catMap.get(cat) || 0) + Math.max(0, r.disponible));
    });

    // Guardar todos los datos para poder restaurar
    this.allCategoriesData = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([cat, val]) => ({ cat, val }));

    // Filtrar las excluidas
    const filtered = this.allCategoriesData.filter(d => !this.excludedCategories.has(d.cat));
    const labels = filtered.map(d => d.cat.length > 25 ? d.cat.substring(0, 25) + '...' : d.cat);
    const data = filtered.map(d => d.val);

    this.barCategoriaData = {
      labels,
      datasets: [{
        label: 'Stock Disponible',
        data,
        backgroundColor: '#22c55e',
        borderRadius: 4
      }]
    };
  }

  onCategoriaChartClick(event: any): void {
    const index = event?.index;
    if (index === undefined || index === null) return;
    const filtered = this.allCategoriesData.filter(d => !this.excludedCategories.has(d.cat));
    if (index >= 0 && index < filtered.length) {
      const cat = filtered[index].cat;
      this.excludedCategories.add(cat);
      this.updateBarCategoriaChart();
    }
  }

  clearExcludedCategories(): void {
    this.excludedCategories.clear();
    this.updateBarCategoriaChart();
  }

  private updateBarCategoriaChart(): void {
    const filtered = this.allCategoriesData.filter(d => !this.excludedCategories.has(d.cat));
    const labels = filtered.map(d => d.cat.length > 25 ? d.cat.substring(0, 25) + '...' : d.cat);
    const data = filtered.map(d => d.val);

    this.barCategoriaData = {
      labels,
      datasets: [{
        label: 'Stock Disponible',
        data,
        backgroundColor: '#22c55e',
        borderRadius: 4
      }]
    };
    this.cdr.detectChanges();
  }

  private buildBarComposicionChart(): void {
    let totalDisponible = 0, totalReservado = 0, totalConsumido = 0;
    this.stockRows.forEach(r => {
      totalDisponible += Math.max(0, r.disponible);
      totalReservado += r.reservado;
      totalConsumido += r.consumido;
    });

    this.barComposicionData = {
      labels: ['Disponible', 'Reservado', 'Consumido'],
      datasets: [{
        label: 'Cantidad',
        data: [totalDisponible, totalReservado, totalConsumido],
        backgroundColor: ['#22c55e', '#f59e0b', '#3b82f6'],
        borderRadius: 4
      }]
    };
  }

  private buildEstancadoChart(data: any[]): void {
    const now = new Date();
    const diasLimite = 60;
    
    // Agrupar por producto: calcular stock disponible y último consumo
    const productMap = new Map<string, { disponible: number; valorUnit: number; ultimoConsumo: Date | null }>();
    
    data.forEach(r => {
      const key = r.producto_nombre || r.producto || 'Sin producto';
      const tipo = r.tipo_id ?? r.tipo;
      const qty = r.cantidad || 0;
      const valorUnit = r.valor_unitario || r.precio_unitario || 0;
      
      if (!productMap.has(key)) {
        productMap.set(key, { disponible: 0, valorUnit, ultimoConsumo: null });
      }
      const p = productMap.get(key)!;
      
      if (tipo === 0) {
        p.disponible += qty;
        if (valorUnit > 0) p.valorUnit = valorUnit;
      } else if (tipo === 1) {
        p.disponible -= qty; // Reservado
      } else if (tipo === 2) {
        p.disponible -= qty; // Consumido
        const fecha = new Date(r.fecha);
        if (!p.ultimoConsumo || fecha > p.ultimoConsumo) p.ultimoConsumo = fecha;
      }
    });

    // Filtrar productos estancados (stock > 0 y sin consumo en 60+ días)
    const estancados: Array<{ prod: string; valor: number; dias: number }> = [];
    let totalEstancado = 0;

    productMap.forEach((p, prod) => {
      if (p.disponible > 0) {
        const diasSinConsumo = p.ultimoConsumo 
          ? Math.floor((now.getTime() - p.ultimoConsumo.getTime()) / (1000*60*60*24))
          : 999;
        
        if (diasSinConsumo >= diasLimite) {
          const valorEstancado = p.disponible * p.valorUnit;
          estancados.push({ prod, valor: valorEstancado, dias: diasSinConsumo });
          totalEstancado += valorEstancado;
        }
      }
    });

    // Ordenar por valor y tomar top 10
    const top10 = estancados.sort((a, b) => b.valor - a.valor).slice(0, 10);
    
    this.totalEstancadoFormatted = '$' + totalEstancado.toLocaleString('es-CL', { maximumFractionDigits: 0 });
    
    this.estancadoData = {
      labels: top10.map(e => e.prod.length > 30 ? e.prod.substring(0, 30) + '...' : e.prod),
      datasets: [{
        label: 'Valor estancado',
        data: top10.map(e => e.valor),
        backgroundColor: '#f59e0b',
        borderRadius: 4
      }]
    };
  }

  private buildAbcAnalysis(data: any[]): void {
    // Calcular valor de inventario por producto
    const productMap = new Map<string, { disponible: number; valorUnit: number }>();
    
    data.forEach(r => {
      const key = r.producto_nombre || r.producto || 'Sin producto';
      const tipo = r.tipo_id ?? r.tipo;
      const qty = r.cantidad || 0;
      const valorUnit = r.valor_unitario || r.precio_unitario || 0;
      
      if (!productMap.has(key)) {
        productMap.set(key, { disponible: 0, valorUnit });
      }
      const p = productMap.get(key)!;
      if (valorUnit > 0) p.valorUnit = valorUnit;
      
      if (tipo === 0) p.disponible += qty;
      else if (tipo === 1 || tipo === 2) p.disponible -= qty;
    });

    // Calcular valor total por producto
    this.stockWithValue = [];
    productMap.forEach((p, prod) => {
      if (p.disponible > 0) {
        this.stockWithValue.push({ producto: prod, valor: p.disponible * p.valorUnit, clase: '' });
      }
    });

    // Ordenar por valor descendente
    this.stockWithValue.sort((a, b) => b.valor - a.valor);

    // Calcular ABC (A=80%, B=15%, C=5%)
    const valorTotal = this.stockWithValue.reduce((sum, p) => sum + p.valor, 0);
    let acumulado = 0;
    let countA = 0, countB = 0, countC = 0;
    let valorA = 0, valorB = 0, valorC = 0;

    this.stockWithValue.forEach(p => {
      acumulado += p.valor;
      const pctAcum = (acumulado / valorTotal) * 100;
      
      if (pctAcum <= 80) {
        p.clase = 'A';
        countA++;
        valorA += p.valor;
      } else if (pctAcum <= 95) {
        p.clase = 'B';
        countB++;
        valorB += p.valor;
      } else {
        p.clase = 'C';
        countC++;
        valorC += p.valor;
      }
    });

    this.abcData = {
      a: { pct: valorTotal > 0 ? Math.round((valorA / valorTotal) * 100) : 0, count: countA },
      b: { pct: valorTotal > 0 ? Math.round((valorB / valorTotal) * 100) : 0, count: countB },
      c: { pct: valorTotal > 0 ? Math.round((valorC / valorTotal) * 100) : 0, count: countC }
    };

    this.abcChartData = {
      labels: ['A', 'B', 'C'],
      datasets: [{
        data: [valorA, valorB, valorC],
        backgroundColor: ['#3b82f6', '#f59e0b', '#9ca3af'],
        borderWidth: 0
      }]
    };
  }

  exportToExcel(): void {
    // Crear CSV con los datos de stock
    const headers = ['Producto', 'Categoría', 'Disponible', 'Reservado', 'Consumido', 'Mínimo', 'Cobertura', 'Rotación', 'Riesgo', 'Clase ABC'];
    
    // Agregar clase ABC a cada producto
    const abcMap = new Map(this.stockWithValue.map(p => [p.producto, p.clase]));
    
    const rows = this.stockRows.map(r => [
      r.producto,
      r.categoria,
      r.disponible,
      r.reservado,
      r.consumido,
      r.minimo,
      r.coberturaLabel,
      r.rotacion.toFixed(2),
      this.getRiskLabel(r.tipoRiesgo),
      abcMap.get(r.producto) || 'C'
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    
    // Crear y descargar archivo
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `stock_riesgo_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  }

  navigateTo(page: string): void {
    this.router.navigate(['/menu', 'dashboard-bi', page]);
  }

  onProductClick(row: StockRow): void {
    this.router.navigate(['/menu', 'dashboard-bi', 'producto', row.producto]);
  }
}
