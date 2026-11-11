// ======================== DashboardComprasComponent ========================
// Página E: Compras/Ingresos - Gasto y proveedores
import { Component, OnInit, inject, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { finalize } from 'rxjs/operators';

import { KpiCardComponent, KpiData } from '../shared/kpi-card/kpi-card.component';
import { FilterBarComponent } from '../shared/filter-bar/filter-bar.component';
import { DashboardNavComponent } from '../shared/dashboard-nav/dashboard-nav.component';
import { BaseChartComponent } from '../../../shared/base-chart/base-chart.component';
import { DashboardFiltersService } from '../../../core/services/dashboard-filters.service';
import { DashboardApiService } from '../../../core/services/dashboard-api.service';

import { ChartData, ChartOptions } from 'chart.js';

@Component({
  selector: 'app-dashboard-compras',
  standalone: true,
  imports: [CommonModule, TableModule, TooltipModule, KpiCardComponent, FilterBarComponent, BaseChartComponent, DashboardNavComponent],
  template: `
    <div class="dashboard-page">
      <header class="page-header">
        <div>
          <h1><i class="pi pi-shopping-cart"></i> Compras e Ingresos</h1>
          <p class="subtitle">Concentración de compras, evolución y trazabilidad</p>
        </div>
      </header>

      <app-dashboard-nav></app-dashboard-nav>
      <app-filter-bar></app-filter-bar>

      <section class="kpi-grid">
        <app-kpi-card *ngFor="let kpi of kpis" [data]="kpi"></app-kpi-card>
      </section>

      <section class="charts-grid">
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">
              <h3>¿En qué proveedores se concentra el gasto?</h3>
              <i class="pi pi-question-circle help-icon"
                 pTooltip="📊 ¿Qué muestra? Los 10 proveedores con mayor gasto acumulado en el periodo.

💡 ¿Para qué sirve? Identificar proveedores clave para negociar mejores condiciones.

📌 Concentrar compras en pocos proveedores puede dar poder de negociación."
                 tooltipPosition="bottom" [escape]="false"></i>
            </div>
          </div>
          <app-base-chart [title]="''" [type]="'bar'" [data]="proveedorData" [options]="horizontalBarOptions"></app-base-chart>
        </div>
        <div class="chart-card chart-wide">
          <div class="chart-header">
            <div class="chart-title">
              <h3>¿Cómo evoluciona el gasto y qué categorías lo explican?</h3>
              <i class="pi pi-question-circle help-icon"
                 pTooltip="📊 ¿Qué muestra? Evolución del gasto mensual separado por categoría de producto.

💡 ¿Para qué sirve? Detectar tendencias de gasto y planificar presupuestos.

📌 Picos inusuales pueden indicar compras especiales o problemas de planificación."
                 tooltipPosition="bottom" [escape]="false"></i>
            </div>
          </div>
          <app-base-chart [title]="''" [type]="'line'" [data]="gastoMensualData" [options]="lineOptions"></app-base-chart>
        </div>
      </section>

      <section class="table-section">
        <div class="section-header">
          <h3>Detalle de compras para auditoría</h3>
          <div class="section-actions">
            <span class="count-badge">{{ ingresos.length }} registros</span>
            <button class="btn-export" (click)="exportToExcel()"><i class="pi pi-file-excel"></i> Exportar</button>
          </div>
        </div>
        <p-table [value]="ingresos" [paginator]="true" [rows]="15" styleClass="p-datatable-sm p-datatable-striped">
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="fecha">Fecha</th>
              <th pSortableColumn="proveedor">Proveedor</th>
              <th pSortableColumn="producto">Producto</th>
              <th pSortableColumn="categoria">Categoría</th>
              <th pSortableColumn="cantidad" style="text-align:right">Cantidad</th>
              <th pSortableColumn="total" style="text-align:right">Total ($)</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr>
              <td>{{ row.fecha | date:'dd/MM/yyyy' }}</td>
              <td>{{ row.proveedor }}</td>
              <td>{{ row.producto }}</td>
              <td>{{ row.categoria }}</td>
              <td style="text-align:right">{{ row.cantidad | number:'1.0-0' }}</td>
              <td style="text-align:right">{{ row.total | number:'1.0-0' }}</td>
            </tr>
          </ng-template>
        </p-table>
      </section>

      <div class="loading-overlay" *ngIf="loading"><i class="pi pi-spin pi-spinner"></i></div>
    </div>
  `,
  styles: [`
    .dashboard-page { padding: 1.5rem; max-width: 1800px; margin: 0 auto; position: relative; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
    .page-header h1 { margin: 0; font-size: 1.75rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; }
    .subtitle { margin: 0.25rem 0 0; opacity: 0.7; font-size: 0.9rem; }
    .btn-nav { padding: 0.5rem 1rem; border: 1px solid var(--surface-border); background: var(--surface-card); border-radius: 8px; cursor: pointer; }
    .btn-nav:hover { background: var(--primary-color); color: white; }

    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
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
    .section-header h3 { margin: 0; }
    .section-actions { display: flex; align-items: center; gap: 0.75rem; }
    .count-badge { padding: 0.25rem 0.75rem; background: var(--primary-color); color: white; border-radius: 20px; font-size: 0.75rem; }
    .btn-export { padding: 0.4rem 0.75rem; border: 1px solid #22c55e; background: #22c55e; color: white; border-radius: 6px; cursor: pointer; font-size: 0.8rem; display: flex; align-items: center; gap: 0.35rem; }
    .btn-export:hover { background: #16a34a; }

    .loading-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 2rem; }
    @media (max-width: 1200px) { .charts-grid { grid-template-columns: 1fr; } .chart-wide { grid-column: span 1; } }
  `]
})
export class DashboardComprasComponent implements OnInit {
  private router = inject(Router);
  private filtersService = inject(DashboardFiltersService);
  private dashboardApi = inject(DashboardApiService);

  loading = false;
  rawData: any[] = [];

  kpis: KpiData[] = [];
  ingresos: any[] = [];

  proveedorData: ChartData<'bar'> = { labels: [], datasets: [] };
  pieProveedorData: ChartData<'pie'> = { labels: [], datasets: [] };
  gastoMensualData: ChartData<'line'> = { labels: [], datasets: [] };

  horizontalBarOptions: ChartOptions<'bar'> = { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
  pieOptions: ChartOptions<'pie'> = { 
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
                text: `${label}: $${value.toLocaleString()} (${pct}%)`,
                fillStyle: (data.datasets[0].backgroundColor as string[])[i],
                fontColor: '#9ca3af',
                hidden: false,
                index: i
              };
            });
          }
        } 
      },
      tooltip: { callbacks: { label: (ctx) => `$${ctx.parsed.toLocaleString()}` } }
    } 
  };
  lineOptions: ChartOptions<'line'> = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: '#9ca3af' } } } };

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
      if (tipo !== 0) return false; // Solo ingresos
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
      
      // Filtro por texto
      const producto = r.producto_nombre || r.producto || '';
      if (filters.searchText && !producto.toLowerCase().includes(filters.searchText.toLowerCase())) return false;
      return true;
    });

    const gastoTotal = filtered.reduce((s, r) => s + (r.total || (r.cantidad || 0) * (r.valor_unitario || 0)), 0);
    const provMap = new Map<string, number>();
    filtered.forEach(r => {
      const prov = r.ingreso_proveedor_nombre || r.producto_proveedor_nombre || r.proveedor || 'Sin proveedor';
      provMap.set(prov, (provMap.get(prov) || 0) + (r.total || (r.cantidad || 0) * (r.valor_unitario || 0)));
    });
    const topProv = Array.from(provMap.entries()).sort((a, b) => b[1] - a[1]);
    const topProvName = topProv.length > 0 ? topProv[0][0] : '-';

    this.kpis = [
      { label: 'Gasto Total', value: '$' + gastoTotal.toLocaleString('es-CL', { maximumFractionDigits: 0 }), icon: 'pi pi-wallet', color: 'purple' },
      { label: 'Proveedor #1', value: topProvName, icon: 'pi pi-truck', color: 'blue', tooltip: 'Mayor gasto en el periodo' },
      { label: 'Ingresos', value: filtered.length, icon: 'pi pi-plus-circle', color: 'green' },
      { label: 'Proveedores', value: provMap.size, icon: 'pi pi-users', color: 'amber' }
    ];

    // Gráfico proveedores
    const top10 = topProv.slice(0, 10);
    this.proveedorData = { labels: top10.map(([k]) => k), datasets: [{ data: top10.map(([, v]) => v), backgroundColor: '#a855f7' }] };

    // Pie de proveedores (top 6 + otros)
    const top6 = topProv.slice(0, 6);
    const otrosGasto = topProv.slice(6).reduce((s, [, v]) => s + v, 0);
    const pieLabels = top6.map(([k]) => k.length > 20 ? k.substring(0, 20) + '...' : k);
    const pieValues = top6.map(([, v]) => v);
    if (otrosGasto > 0) {
      pieLabels.push('Otros');
      pieValues.push(otrosGasto);
    }
    const pieColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#64748b'];
    this.pieProveedorData = { 
      labels: pieLabels, 
      datasets: [{ data: pieValues, backgroundColor: pieColors.slice(0, pieLabels.length), borderWidth: 2, borderColor: 'var(--surface-card)' }] 
    };

    // Gasto mensual por categoría
    const catMonthMap = new Map<string, Map<string, number>>();
    filtered.forEach(r => {
      const cat = r.categoria_nombre || r.categoria || 'Sin categoría';
      const fecha = new Date(r.fecha);
      if (isNaN(fecha.getTime())) return;
      const month = fecha.toISOString().slice(0, 7);
      if (!catMonthMap.has(cat)) catMonthMap.set(cat, new Map());
      const m = catMonthMap.get(cat)!;
      m.set(month, (m.get(month) || 0) + (r.total || (r.cantidad || 0) * (r.valor_unitario || 0)));
    });
    const months = Array.from(new Set(filtered.map(r => new Date(r.fecha).toISOString().slice(0, 7)))).sort();
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7'];
    this.gastoMensualData = {
      labels: months,
      datasets: Array.from(catMonthMap.entries()).slice(0, 5).map(([cat, mMap], i) => ({
        label: cat,
        data: months.map(m => mMap.get(m) || 0),
        borderColor: colors[i % colors.length],
        fill: false
      }))
    };

    // Tabla
    this.ingresos = filtered.map(r => ({
      fecha: new Date(r.fecha),
      proveedor: r.ingreso_proveedor_nombre || r.producto_proveedor_nombre || r.proveedor || 'Sin proveedor',
      producto: r.producto_nombre || r.producto || 'Sin producto',
      categoria: r.categoria_nombre || r.categoria || 'Sin categoría',
      cantidad: r.cantidad || 0,
      total: r.total || (r.cantidad || 0) * (r.valor_unitario || 0)
    })).sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }

  navigateTo(page: string): void { this.router.navigate(['/menu', 'dashboard-bi', page]); }

  exportToExcel(): void {
    const headers = ['Fecha', 'Proveedor', 'Producto', 'Categoría', 'Cantidad', 'Total ($)'];
    const rows = this.ingresos.map(r => [
      r.fecha.toLocaleDateString('es-CL'),
      r.proveedor,
      r.producto,
      r.categoria,
      r.cantidad,
      r.total
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `compras_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  }
}
