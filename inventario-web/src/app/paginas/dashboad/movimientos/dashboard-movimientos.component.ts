// ======================== DashboardMovimientosComponent ========================
// Página C: Movimientos y Tendencias
import { Component, OnInit, inject, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { finalize } from 'rxjs/operators';

import { KpiCardComponent, KpiData } from '../shared/kpi-card/kpi-card.component';
import { FilterBarComponent } from '../shared/filter-bar/filter-bar.component';
import { DashboardNavComponent } from '../shared/dashboard-nav/dashboard-nav.component';
import { DashboardLoaderComponent } from '../shared/dashboard-loader/dashboard-loader.component';
import { BaseChartComponent } from '../../../shared/base-chart/base-chart.component';
import { DashboardFiltersService } from '../../../core/services/dashboard-filters.service';
import { DashboardApiService } from '../../../core/services/dashboard-api.service';

import { ChartData, ChartOptions } from 'chart.js';

@Component({
  selector: 'app-dashboard-movimientos',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, TooltipModule, KpiCardComponent, FilterBarComponent, BaseChartComponent, DashboardNavComponent, DashboardLoaderComponent],
  template: `
    <div class="dashboard-page">
      <header class="page-header">
        <div>
          <h1><i class="pi pi-chart-line"></i> Flujo de inventario</h1>
          <p class="subtitle">Qué entró, qué salió y qué productos explican el movimiento</p>
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
        <div class="chart-card chart-wide">
          <div class="chart-header">
            <div class="chart-title">
              <h3>¿El abastecimiento acompaña al consumo?</h3>
              <i class="pi pi-question-circle help-icon"
                 pTooltip="📊 ¿Qué muestra? Evolución temporal de ingresos (entradas) vs consumos (salidas).

💡 ¿Para qué sirve? Detectar patrones estacionales y planificar reposiciones.

📌 Si consumos > ingresos por tiempo prolongado, el stock se agotará."
                 tooltipPosition="bottom" [escape]="false"></i>
            </div>
          </div>
          <app-base-chart [title]="''" [type]="'line'" [data]="timelineData" [options]="lineOptions"></app-base-chart>
        </div>

        <div class="chart-card chart-wide">
          <div class="chart-header">
            <div class="chart-title">
              <h3>¿Qué productos concentran la rotación?</h3>
              <i class="pi pi-question-circle help-icon"
                 pTooltip="📊 ¿Qué muestra? Los 10 productos con mayor cantidad de unidades movidas.

💡 ¿Para qué sirve? Identificar productos de alta rotación.

📌 Prioriza el control de stock de estos productos."
                 tooltipPosition="bottom" [escape]="false"></i>
            </div>
          </div>
          <app-base-chart [title]="''" [type]="'bar'" [data]="topProductosData" [options]="horizontalBarOptions"></app-base-chart>
        </div>
      </section>

      <!-- Tabla de movimientos recientes -->
      <section class="table-section">
        <div class="section-header">
          <h3>Detalle reciente para auditoría</h3>
          <div class="section-actions">
            <span class="count-badge">{{ movimientos.length }} registros</span>
            <button class="btn-export" (click)="exportToExcel()"><i class="pi pi-file-excel"></i> Exportar</button>
          </div>
        </div>
        <p-table [value]="movimientos" [paginator]="true" [rows]="15" styleClass="p-datatable-sm p-datatable-striped">
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="fecha">Fecha</th>
              <th pSortableColumn="tipoLabel">Tipo</th>
              <th pSortableColumn="producto">Producto</th>
              <th pSortableColumn="categoria">Categoría</th>
              <th pSortableColumn="cantidad" style="text-align:right">Cantidad</th>
              <th pSortableColumn="valor" style="text-align:right">Valor ($)</th>
              <th>Usuario</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr>
              <td>{{ row.fecha | date:'dd/MM/yyyy' }}</td>
              <td><span class="tipo-badge" [class]="'tipo-' + row.tipo">{{ row.tipoLabel }}</span></td>
              <td>{{ row.producto }}</td>
              <td>{{ row.categoria }}</td>
              <td style="text-align:right">{{ row.cantidad | number:'1.0-0' }}</td>
              <td style="text-align:right">{{ row.valor | number:'1.0-0' }}</td>
              <td>{{ row.usuario }}</td>
            </tr>
          </ng-template>
        </p-table>
      </section>

      <app-dashboard-loader *ngIf="loading" label="Actualizando movimientos"></app-dashboard-loader>
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
    .granularity-selector { display: flex; gap: 0.25rem; background: var(--surface-ground); padding: 0.25rem; border-radius: 6px; }
    .granularity-selector button { padding: 0.35rem 0.75rem; border: none; background: transparent; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
    .granularity-selector button.active { background: var(--primary-color); color: white; }

    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .charts-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
    .chart-card { background: var(--surface-card); border-radius: 12px; border: 1px solid var(--surface-border); padding: 1rem; min-height: 300px; }
    .chart-wide { grid-column: span 2; }
    .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .chart-header h3 { margin: 0; font-size: 1rem; font-weight: 600; }
    .chart-title { display: flex; align-items: center; gap: 0.5rem; }
    .help-icon { color: #9ca3af; cursor: pointer; font-size: 1rem; transition: color 0.2s; }
    .help-icon:hover { color: var(--primary-color); }

    .table-section { background: var(--surface-card); border-radius: 12px; border: 1px solid var(--surface-border); overflow: hidden; }
    .section-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid var(--surface-border); }
    .section-header h3 { margin: 0; font-size: 1rem; font-weight: 600; }
    .section-actions { display: flex; align-items: center; gap: 0.75rem; }
    .count-badge { padding: 0.25rem 0.75rem; background: var(--primary-color); color: white; border-radius: 20px; font-size: 0.75rem; }
    .btn-export { padding: 0.4rem 0.75rem; border: 1px solid #22c55e; background: #22c55e; color: white; border-radius: 6px; cursor: pointer; font-size: 0.8rem; display: flex; align-items: center; gap: 0.35rem; }
    .btn-export:hover { background: #16a34a; }

    .tipo-badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .tipo-0 { background: rgba(34,197,94,0.15); color: #22c55e; }
    .tipo-1 { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .tipo-2 { background: rgba(59,130,246,0.15); color: #3b82f6; }
    .tipo-3 { background: rgba(239,68,68,0.15); color: #ef4444; }

    .loading-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 2rem; }
    @media (max-width: 1200px) { .charts-grid { grid-template-columns: 1fr; } .chart-wide { grid-column: span 1; } }
  `]
})
export class DashboardMovimientosComponent implements OnInit {
  private router = inject(Router);
  private filtersService = inject(DashboardFiltersService);
  private dashboardApi = inject(DashboardApiService);

  loading = false;
  rawData: any[] = [];

  granularidad: 'dia' | 'semana' | 'mes' | 'anio' = 'dia';
  granularidades = [
    { label: 'Día', value: 'dia' as const },
    { label: 'Semana', value: 'semana' as const },
    { label: 'Mes', value: 'mes' as const },
    { label: 'Año', value: 'anio' as const }
  ];

  kpis: KpiData[] = [];
  movimientos: any[] = [];

  timelineData: ChartData<'line'> = { labels: [], datasets: [] };
  tipoData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  topProductosData: ChartData<'bar'> = { labels: [], datasets: [] };

  lineOptions: ChartOptions<'line'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'top', labels: { color: '#9ca3af' } } }
  };
  doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { 
      legend: { 
        position: 'right',
        labels: {
          boxWidth: 12,
          font: { size: 11 },
          color: '#9ca3af',
          generateLabels: (chart) => {
            const data = chart.data;
            const total = (data.datasets[0].data as number[]).reduce((a, b) => a + b, 0);
            return (data.labels as string[]).map((label, i) => {
              const value = (data.datasets[0].data as number[])[i];
              const pct = total > 0 ? ((value / total) * 100).toFixed(0) : '0';
              return {
                text: `${label}: ${value.toLocaleString()} (${pct}%)`,
                fillStyle: (data.datasets[0].backgroundColor as string[])[i],
                fontColor: '#9ca3af',
                hidden: false,
                index: i
              };
            });
          }
        }
      },
      tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.toLocaleString()} unidades` } }
    }
  };
  horizontalBarOptions: ChartOptions<'bar'> = {
    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } }
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

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.loading = true;
    this.dashboardApi.tablaResumen2().pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); })).subscribe({
      next: (data) => { this.rawData = data || []; this.applyFilters(); this.cdr.detectChanges(); setTimeout(() => window.dispatchEvent(new Event('resize')), 100); },
      error: (err) => { console.error('Error loading data:', err); this.rawData = []; }
    });
  }

  applyFilters(): void {
    const { start, end } = this.filtersService.dateRange();
    const filters = this.filtersService.filters();

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

    this.buildKpis(filtered);
    this.buildTimelineChart(filtered);
    this.buildTipoChart(filtered);
    this.buildTopProductosChart(filtered);
    this.buildMovimientosTable(filtered);
  }

  private buildKpis(data: any[]): void {
    const ingresos = data.filter(r => (r.tipo_id ?? r.tipo) === 0);
    const pendientes = data.filter(r => (r.tipo_id ?? r.tipo) === 1);
    const aprobados = data.filter(r => (r.tipo_id ?? r.tipo) === 2);
    const rechazados = data.filter(r => (r.tipo_id ?? r.tipo) === 3);

    const totalIngresos = ingresos.reduce((s, r) => s + (r.cantidad || 0), 0);
    const totalAprobados = aprobados.reduce((s, r) => s + (r.cantidad || 0), 0);
    const valorIngresos = ingresos.reduce((s, r) => s + (r.total || (r.cantidad || 0) * (r.valor_unitario || 0)), 0);
    const valorAprobados = aprobados.reduce((s, r) => s + (r.total || (r.cantidad || 0) * (r.valor_unitario || 0)), 0);

    const fmt = (n: number) => n.toLocaleString('es-CL');
    const fmtMoney = (n: number) => '$' + n.toLocaleString('es-CL', { maximumFractionDigits: 0 });

    this.kpis = [
      { label: 'Total Movimientos', value: fmt(data.length), icon: 'pi pi-list', color: 'blue' },
      { label: 'Ingresos', value: fmt(totalIngresos) + ' un.', icon: 'pi pi-plus-circle', color: 'green', tooltip: fmtMoney(valorIngresos) },
      { label: 'Consumos', value: fmt(totalAprobados) + ' un.', icon: 'pi pi-minus-circle', color: 'purple', tooltip: fmtMoney(valorAprobados) },
      { label: 'Pendientes', value: fmt(pendientes.length), icon: 'pi pi-clock', color: 'amber' },
      { label: 'Rechazados', value: fmt(rechazados.length), icon: 'pi pi-times-circle', color: 'red' }
    ];
  }

  private buildTimelineChart(data: any[]): void {
    const ingresosMap = new Map<string, number>();
    const consumosMap = new Map<string, number>();

    data.forEach(r => {
      const fecha = new Date(r.fecha);
      if (isNaN(fecha.getTime())) return;
      const tipo = r.tipo_id ?? r.tipo;
      let key: string;
      if (this.granularidad === 'dia') key = fecha.toISOString().split('T')[0];
      else if (this.granularidad === 'semana') key = `${fecha.getFullYear()}-S${this.getWeekNumber(fecha)}`;
      else if (this.granularidad === 'mes') key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      else key = `${fecha.getFullYear()}`;

      if (tipo === 0) ingresosMap.set(key, (ingresosMap.get(key) || 0) + (r.cantidad || 0));
      else if (tipo === 2) consumosMap.set(key, (consumosMap.get(key) || 0) + (r.cantidad || 0));
    });

    const labels = Array.from(new Set([...ingresosMap.keys(), ...consumosMap.keys()])).sort();
    this.timelineData = {
      labels,
      datasets: [
        { label: 'Ingresos', data: labels.map(l => ingresosMap.get(l) || 0), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', fill: true },
        { label: 'Consumos', data: labels.map(l => consumosMap.get(l) || 0), borderColor: '#a855f7', backgroundColor: 'rgba(168,85,247,0.1)', fill: true }
      ]
    };
  }

  private buildTipoChart(data: any[]): void {
    const tipoLabels = ['Ingresos', 'Pendientes', 'Aprobados', 'Rechazados'];
    const tipoCounts = [0, 0, 0, 0];
    data.forEach(r => {
      const tipo = r.tipo_id ?? r.tipo;
      if (tipo >= 0 && tipo < 4) tipoCounts[tipo]++;
    });
    this.tipoData = {
      labels: tipoLabels,
      datasets: [{ data: tipoCounts, backgroundColor: ['#22c55e', '#f59e0b', '#3b82f6', '#ef4444'] }]
    };
  }

  private buildTopProductosChart(data: any[]): void {
    const prodMap = new Map<string, number>();
    data.forEach(r => {
      const prod = r.producto_nombre || r.producto || 'Sin producto';
      prodMap.set(prod, (prodMap.get(prod) || 0) + (r.cantidad || 0));
    });
    const top = Array.from(prodMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
    this.topProductosData = {
      labels: top.map(([k]) => k),
      datasets: [{ data: top.map(([, v]) => v), backgroundColor: '#3b82f6' }]
    };
  }

  private buildMovimientosTable(data: any[]): void {
    const tipoLabels = ['Ingreso', 'Pendiente', 'Aprobado', 'Rechazado'];
    this.movimientos = data.map(r => ({
      fecha: new Date(r.fecha),
      tipo: r.tipo_id ?? r.tipo,
      tipoLabel: tipoLabels[r.tipo_id ?? r.tipo] || 'Desconocido',
      producto: r.producto_nombre || r.producto || 'Sin producto',
      categoria: r.categoria_nombre || r.categoria || '',
      cantidad: r.cantidad || 0,
      valor: r.total || (r.cantidad || 0) * (r.valor_unitario || 0),
      usuario: r.usuario_ingreso || ''
    })).sort((a, b) => b.fecha.getTime() - a.fecha.getTime()).slice(0, 500);
  }

  private getWeekNumber(d: Date): number {
    const onejan = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
  }

  setGranularidad(g: 'dia' | 'semana' | 'mes' | 'anio'): void {
    this.granularidad = g;
    this.buildTimelineChart(this.rawData);
  }

  navigateTo(page: string): void {
    this.router.navigate(['/menu', 'dashboard-bi', page]);
  }

  exportToExcel(): void {
    const headers = ['Fecha', 'Tipo', 'Producto', 'Categoría', 'Cantidad', 'Valor ($)', 'Usuario'];
    const rows = this.movimientos.map(r => [
      r.fecha.toLocaleDateString('es-CL'),
      r.tipoLabel,
      r.producto,
      r.categoria,
      r.cantidad,
      r.valor,
      r.usuario
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `movimientos_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  }
}
