// ======================== DashboardClientesDeptosComponent ========================
// Página F: Clientes/Departamentos - Consumo interno
import { Component, OnInit, inject, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { finalize } from 'rxjs/operators';

import { FilterBarComponent } from '../shared/filter-bar/filter-bar.component';
import { DashboardNavComponent } from '../shared/dashboard-nav/dashboard-nav.component';
import { BaseChartComponent } from '../../../shared/base-chart/base-chart.component';
import { DashboardFiltersService } from '../../../core/services/dashboard-filters.service';
import { DashboardApiService } from '../../../core/services/dashboard-api.service';

import { ChartData, ChartOptions } from 'chart.js';

@Component({
  selector: 'app-dashboard-clientes-deptos',
  standalone: true,
  imports: [CommonModule, TableModule, TooltipModule, FilterBarComponent, BaseChartComponent, DashboardNavComponent],
  template: `
    <div class="dashboard-page">
      <header class="page-header">
        <div>
          <h1><i class="pi pi-users"></i> Clientes y Departamentos</h1>
          <p class="subtitle">Análisis de consumo interno</p>
        </div>
      </header>

      <app-dashboard-nav></app-dashboard-nav>
      <app-filter-bar></app-filter-bar>

      <section class="charts-grid">
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">
              <h3>Consumo por Departamento (Unidades)</h3>
              <i class="pi pi-question-circle help-icon"
                 pTooltip="📊 ¿Qué muestra? Cantidad de unidades consumidas por cada departamento.

💡 ¿Para qué sirve? Identificar qué áreas tienen mayor consumo de productos.

📌 Compara con el presupuesto asignado a cada área."
                 tooltipPosition="bottom" [escape]="false"></i>
            </div>
          </div>
          <app-base-chart [title]="''" [type]="'bar'" [data]="deptoData" [options]="horizontalBarOptions"></app-base-chart>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">
              <h3>Gasto por Departamento ($)</h3>
              <i class="pi pi-question-circle help-icon"
                 pTooltip="📊 ¿Qué muestra? Valor monetario del consumo por departamento.

💡 ¿Para qué sirve? Controlar el presupuesto y detectar desviaciones.

📌 Alto gasto puede indicar necesidad de revisar procesos o negociar precios."
                 tooltipPosition="bottom" [escape]="false"></i>
            </div>
          </div>
          <app-base-chart [title]="''" [type]="'bar'" [data]="deptoGastoData" [options]="horizontalBarMoneyOptions"></app-base-chart>
        </div>
        <div class="chart-card chart-wide">
          <div class="chart-header">
            <div class="chart-title">
              <h3>Tendencia de Gasto por Departamento</h3>
              <i class="pi pi-question-circle help-icon"
                 pTooltip="📊 ¿Qué muestra? Evolución mensual del gasto de los 5 departamentos principales.

💡 ¿Para qué sirve? Detectar tendencias y estacionalidad en el consumo.

📌 Picos atípicos pueden indicar proyectos especiales o problemas."
                 tooltipPosition="bottom" [escape]="false"></i>
            </div>
          </div>
          <app-base-chart [title]="''" [type]="'line'" [data]="tendenciaDeptoData" [options]="lineOptions"></app-base-chart>
        </div>
        <div class="chart-card chart-wide">
          <div class="chart-header">
            <div class="chart-title">
              <h3>Matriz: Departamento × Categoría (Unidades)</h3>
              <i class="pi pi-question-circle help-icon"
                 pTooltip="📊 ¿Qué muestra? Tabla cruzada de consumo: qué categorías consume cada departamento.

💡 ¿Para qué sirve? Entender patrones de consumo y asignar stock por área.

📌 Exporta a Excel para análisis detallado."
                 tooltipPosition="bottom" [escape]="false"></i>
            </div>
            <button class="btn-export" (click)="exportToExcel()"><i class="pi pi-file-excel"></i> Exportar</button>
          </div>
          <p-table [value]="matrixRows" styleClass="p-datatable-sm p-datatable-gridlines" [scrollable]="true">
            <ng-template pTemplate="header">
              <tr>
                <th>Departamento</th>
                <th *ngFor="let cat of matrixCategorias" style="text-align:right">{{ cat }}</th>
                <th style="text-align:right;font-weight:700">Total</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr>
                <td>{{ row.depto }}</td>
                <td *ngFor="let cat of matrixCategorias" style="text-align:right">{{ row.values[cat] || 0 | number:'1.0-0' }}</td>
                <td style="text-align:right;font-weight:700">{{ row.total | number:'1.0-0' }}</td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      </section>

      <div class="loading-overlay" *ngIf="loading"><i class="pi pi-spin pi-spinner"></i></div>
    </div>
  `,
  styles: [`
    .dashboard-page { padding: 1.5rem; max-width: 1800px; margin: 0 auto; position: relative; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
    .page-header h1 { margin: 0; font-size: 1.75rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; }
    .subtitle { margin: 0.25rem 0 0; opacity: 0.7; }
    .btn-nav { padding: 0.5rem 1rem; border: 1px solid var(--surface-border); background: var(--surface-card); border-radius: 8px; cursor: pointer; }
    .btn-nav:hover { background: var(--primary-color); color: white; }

    .charts-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
    .chart-card { background: var(--surface-card); border-radius: 12px; border: 1px solid var(--surface-border); padding: 1rem; min-height: 300px; }
    .chart-wide { grid-column: span 2; }
    .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .chart-header h3 { margin: 0; font-size: 1rem; font-weight: 600; }
    .chart-title { display: flex; align-items: center; gap: 0.5rem; }
    .help-icon { color: #9ca3af; cursor: pointer; font-size: 1rem; transition: color 0.2s; }
    .help-icon:hover { color: var(--primary-color); }
    .btn-export { padding: 0.4rem 0.75rem; border: 1px solid #22c55e; background: #22c55e; color: white; border-radius: 6px; cursor: pointer; font-size: 0.8rem; display: flex; align-items: center; gap: 0.35rem; }
    .btn-export:hover { background: #16a34a; }

    .loading-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 2rem; }
    @media (max-width: 1200px) { .charts-grid { grid-template-columns: 1fr; } .chart-wide { grid-column: span 1; } }
  `]
})
export class DashboardClientesDeptosComponent implements OnInit {
  private router = inject(Router);
  private filtersService = inject(DashboardFiltersService);
  private dashboardApi = inject(DashboardApiService);

  loading = false;
  rawData: any[] = [];

  deptoData: ChartData<'bar'> = { labels: [], datasets: [] };
  deptoGastoData: ChartData<'bar'> = { labels: [], datasets: [] };
  tendenciaDeptoData: ChartData<'line'> = { labels: [], datasets: [] };
  matrixRows: any[] = [];
  matrixCategorias: string[] = [];

  horizontalBarOptions: ChartOptions<'bar'> = { 
    indexAxis: 'y', responsive: true, maintainAspectRatio: false, 
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.x.toLocaleString()} unidades` } } } 
  };

  horizontalBarMoneyOptions: ChartOptions<'bar'> = { 
    indexAxis: 'y', responsive: true, maintainAspectRatio: false, 
    scales: { x: { ticks: { callback: (v) => '$' + Number(v).toLocaleString() } } },
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => '$' + ctx.parsed.x.toLocaleString() } } } 
  };

  lineOptions: ChartOptions<'line'> = {
    responsive: true, maintainAspectRatio: false,
    scales: { y: { ticks: { callback: (v) => '$' + Number(v).toLocaleString() } } },
    plugins: { 
      legend: { position: 'top', labels: { color: '#9ca3af' } },
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString()}` } }
    }
  };

  private cdr = inject(ChangeDetectorRef);

  constructor() { effect(() => { this.filtersService.filters(); if (this.rawData.length > 0) { this.applyFilters(); this.cdr.detectChanges(); } }); }

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.loading = true;
    this.dashboardApi.tablaResumen2().pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); })).subscribe({
      next: (data) => { this.rawData = data || []; this.applyFilters(); this.cdr.detectChanges(); setTimeout(() => window.dispatchEvent(new Event('resize')), 100); },
      error: (err) => { console.error('Error:', err); this.rawData = []; }
    });
  }

  applyFilters(): void {
    const filters = this.filtersService.filters();
    const { start, end } = this.filtersService.dateRange();
    const filtered = this.rawData.filter(r => {
      const fecha = new Date(r.fecha);
      const tipo = r.tipo_id ?? r.tipo;
      if (tipo !== 2) return false; // Solo consumo aprobado
      if (!isNaN(fecha.getTime()) && (fecha < start || fecha > end)) return false;
      
      // Filtro por categoría
      if (filters.categoriaNombre) {
        const catNombre = r.categoria_nombre || r.categoria || '';
        if (catNombre.toLowerCase() !== filters.categoriaNombre.toLowerCase()) return false;
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

    // Por departamento (unidades)
    const deptoMap = new Map<string, number>();
    const deptoGastoMap = new Map<string, number>();
    filtered.forEach(r => {
      const depto = r.departamento_nombre || r.departamento || 'Sin depto';
      deptoMap.set(depto, (deptoMap.get(depto) || 0) + (r.cantidad || 0));
      const gasto = r.total || (r.cantidad || 0) * (r.valor_unitario || 0);
      deptoGastoMap.set(depto, (deptoGastoMap.get(depto) || 0) + gasto);
    });
    const deptoSorted = Array.from(deptoMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
    this.deptoData = { labels: deptoSorted.map(([k]) => k), datasets: [{ data: deptoSorted.map(([, v]) => v), backgroundColor: '#3b82f6', borderRadius: 4 }] };

    // Por departamento (gasto en $)
    const gastoSorted = Array.from(deptoGastoMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
    this.deptoGastoData = { labels: gastoSorted.map(([k]) => k), datasets: [{ data: gastoSorted.map(([, v]) => v), backgroundColor: '#8b5cf6', borderRadius: 4 }] };

    // Tendencia de gasto por departamento (top 5 deptos por mes)
    const top5Deptos = gastoSorted.slice(0, 5).map(([k]) => k);
    const deptoMonthMap = new Map<string, Map<string, number>>();
    const allMonths = new Set<string>();
    
    filtered.forEach(r => {
      const depto = r.departamento_nombre || r.departamento || 'Sin depto';
      if (!top5Deptos.includes(depto)) return;
      const fecha = new Date(r.fecha);
      if (isNaN(fecha.getTime())) return;
      const month = fecha.toISOString().slice(0, 7);
      allMonths.add(month);
      if (!deptoMonthMap.has(depto)) deptoMonthMap.set(depto, new Map());
      const m = deptoMonthMap.get(depto)!;
      const gasto = r.total || (r.cantidad || 0) * (r.valor_unitario || 0);
      m.set(month, (m.get(month) || 0) + gasto);
    });

    const months = Array.from(allMonths).sort();
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
    this.tendenciaDeptoData = {
      labels: months,
      datasets: top5Deptos.map((depto, i) => ({
        label: depto.length > 20 ? depto.substring(0, 20) + '...' : depto,
        data: months.map(m => deptoMonthMap.get(depto)?.get(m) || 0),
        borderColor: colors[i],
        backgroundColor: colors[i] + '20',
        fill: false,
        tension: 0.3
      }))
    };

    // Matriz depto x categoría
    const matrix = new Map<string, Map<string, number>>();
    const allCats = new Set<string>();
    filtered.forEach(r => {
      const depto = r.departamento_nombre || r.departamento || 'Sin depto';
      const cat = r.categoria_nombre || r.categoria || 'Sin categoría';
      allCats.add(cat);
      if (!matrix.has(depto)) matrix.set(depto, new Map());
      const m = matrix.get(depto)!;
      m.set(cat, (m.get(cat) || 0) + (r.cantidad || 0));
    });
    this.matrixCategorias = Array.from(allCats).sort();
    this.matrixRows = Array.from(matrix.entries()).map(([depto, catMap]) => {
      const values: Record<string, number> = {};
      let total = 0;
      catMap.forEach((v, k) => { values[k] = v; total += v; });
      return { depto, values, total };
    }).sort((a, b) => b.total - a.total);
  }

  navigateTo(page: string): void { this.router.navigate(['/menu', 'dashboard-bi', page]); }

  exportToExcel(): void {
    // Exportar matriz departamento x categoría
    const headers = ['Departamento', ...this.matrixCategorias, 'Total'];
    const rows = this.matrixRows.map(r => [
      r.depto,
      ...this.matrixCategorias.map(cat => r.values[cat] || 0),
      r.total
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `consumo_deptos_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  }
}
