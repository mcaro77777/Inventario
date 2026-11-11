// ======================== DashboardSolicitudesComponent ========================
// Página D: Solicitudes - Embudo + Aging
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
import { BaseChartComponent } from '../../../shared/base-chart/base-chart.component';
import { DashboardFiltersService } from '../../../core/services/dashboard-filters.service';
import { DashboardApiService } from '../../../core/services/dashboard-api.service';

import { ChartData, ChartOptions } from 'chart.js';

interface SolicitudRow {
  id: number;
  producto: string;
  cliente: string;
  departamento: string;
  cantidad: number;
  fecha: Date;
  diasPendiente: number;
  estado: string;
}

@Component({
  selector: 'app-dashboard-solicitudes',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, TooltipModule, KpiCardComponent, FilterBarComponent, BaseChartComponent, DashboardNavComponent],
  template: `
    <div class="dashboard-page">
      <header class="page-header">
        <div>
          <h1><i class="pi pi-inbox"></i> Solicitudes</h1>
          <p class="subtitle">Análisis de solicitudes y consumo por departamento</p>
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
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">
              <h3>Top Productos Más Solicitados</h3>
              <i class="pi pi-question-circle help-icon"
                 pTooltip="📊 ¿Qué muestra? Los 10 productos con mayor cantidad de unidades solicitadas y aprobadas.

💡 ¿Para qué sirve? Identificar los productos de mayor demanda para priorizar su disponibilidad.

📌 Asegúrate de mantener stock suficiente de estos productos."
                 tooltipPosition="bottom" [escape]="false"></i>
            </div>
          </div>
          <app-base-chart [title]="''" [type]="'bar'" [data]="topProductosData" [options]="horizontalBarOptions"></app-base-chart>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">
              <h3>Gasto por Departamento ($)</h3>
              <i class="pi pi-question-circle help-icon"
                 pTooltip="📊 ¿Qué muestra? Valor monetario de las solicitudes aprobadas por cada departamento.

💡 ¿Para qué sirve? Controlar el presupuesto y detectar departamentos con alto consumo.

📌 Útil para asignar presupuestos y negociar con proveedores."
                 tooltipPosition="bottom" [escape]="false"></i>
            </div>
          </div>
          <app-base-chart [title]="''" [type]="'bar'" [data]="gastoDeptoData" [options]="horizontalBarMoneyOptions"></app-base-chart>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">
              <h3>Solicitudes por Departamento</h3>
              <i class="pi pi-question-circle help-icon"
                 pTooltip="📊 ¿Qué muestra? Cantidad de solicitudes (pendientes + aprobadas) por departamento.

💡 ¿Para qué sirve? Ver qué áreas generan más demanda de productos.

📌 Alta cantidad puede indicar necesidad de revisar procesos o stock asignado."
                 tooltipPosition="bottom" [escape]="false"></i>
            </div>
          </div>
          <app-base-chart [title]="''" [type]="'bar'" [data]="deptData" [options]="horizontalBarOptions"></app-base-chart>
        </div>
      </section>

      <!-- Tabla de solicitudes pendientes -->
      <section class="table-section">
        <div class="section-header">
          <h3>Solicitudes Pendientes</h3>
          <div class="section-actions">
            <span class="count-badge">{{ solicitudes.length }} solicitudes</span>
            <button class="btn-export" (click)="exportToExcel()"><i class="pi pi-file-excel"></i> Exportar</button>
          </div>
        </div>
        <p-table [value]="solicitudes" [paginator]="true" [rows]="15"
                 styleClass="p-datatable-sm p-datatable-striped"
                 [scrollable]="true" scrollHeight="400px">
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="producto">Producto</th>
              <th pSortableColumn="cliente">Cliente</th>
              <th pSortableColumn="departamento">Departamento</th>
              <th pSortableColumn="cantidad" style="text-align:right">Cantidad</th>
              <th pSortableColumn="fecha">Fecha</th>
              <th pSortableColumn="diasPendiente" style="text-align:right">Días</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr [class.critical-row]="row.diasPendiente > diasCritico">
              <td>{{ row.producto }}</td>
              <td>{{ row.cliente }}</td>
              <td>{{ row.departamento }}</td>
              <td style="text-align:right">{{ row.cantidad | number:'1.0-0' }}</td>
              <td>{{ row.fecha | date:'dd/MM/yyyy' }}</td>
              <td style="text-align:right" [class.text-danger]="row.diasPendiente > diasCritico">{{ row.diasPendiente }}</td>
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
    .header-actions { display: flex; gap: 0.5rem; }
    .btn-nav { padding: 0.5rem 1rem; border: 1px solid var(--surface-border); background: var(--surface-card); border-radius: 8px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s; }
    .btn-nav:hover, .btn-nav.active { background: var(--primary-color); color: white; border-color: var(--primary-color); }

    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .charts-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
    .chart-card { background: var(--surface-card); border-radius: 12px; border: 1px solid var(--surface-border); padding: 1rem; min-height: 300px; }
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
    .critical-row { background: rgba(239,68,68,0.1) !important; }
    .text-danger { color: #ef4444; font-weight: 600; }

    .loading-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 2rem; }

    @media (max-width: 1200px) { .charts-grid { grid-template-columns: 1fr; } }
  `]
})
export class DashboardSolicitudesComponent implements OnInit {
  private router = inject(Router);
  private filtersService = inject(DashboardFiltersService);
  private dashboardApi = inject(DashboardApiService);

  loading = false;
  rawData: any[] = [];
  diasCritico = 7;
  solosCriticos = false;

  kpis: KpiData[] = [];
  solicitudes: SolicitudRow[] = [];

  topProductosData: ChartData<'bar'> = { labels: [], datasets: [] };
  gastoDeptoData: ChartData<'bar'> = { labels: [], datasets: [] };
  deptData: ChartData<'bar'> = { labels: [], datasets: [] };

  horizontalBarOptions: ChartOptions<'bar'> = {
    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
    plugins: { 
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.x.toLocaleString()} unidades` } }
    }
  };
  horizontalBarMoneyOptions: ChartOptions<'bar'> = {
    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
    scales: { x: { ticks: { callback: (v) => '$' + Number(v).toLocaleString() } } },
    plugins: { 
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => '$' + ctx.parsed.x.toLocaleString() } }
    }
  };

  private cdr = inject(ChangeDetectorRef);

  constructor() {
    effect(() => { this.filtersService.filters(); if (this.rawData.length > 0) { this.applyFilters(); this.cdr.detectChanges(); } });
  }

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
    const now = new Date();

    let filtered = this.rawData.filter(r => {
      const fecha = new Date(r.fecha);
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

    // KPIs
    const pendientes = filtered.filter(r => (r.tipo_id ?? r.tipo) === 1);
    const aprobados = filtered.filter(r => (r.tipo_id ?? r.tipo) === 2);
    const rechazados = filtered.filter(r => (r.tipo_id ?? r.tipo) === 3);
    const total = pendientes.length + aprobados.length + rechazados.length;
    const pctAprobacion = total > 0 ? (aprobados.length / total * 100) : 0;
    const pctRechazo = total > 0 ? (rechazados.length / total * 100) : 0;

    const diasPendientes = pendientes.map(r => Math.floor((now.getTime() - new Date(r.fecha).getTime()) / (1000*60*60*24)));
    const avgDias = diasPendientes.length > 0 ? diasPendientes.reduce((a,b)=>a+b,0) / diasPendientes.length : 0;
    const criticos = diasPendientes.filter(d => d > this.diasCritico).length;

    // Calcular tiempo promedio de atención (para aprobados)
    const tiemposAtencion: number[] = [];
    aprobados.forEach(r => {
      const fechaSolicitud = new Date(r.fecha_solicitud || r.fecha_creacion || r.fecha);
      const fechaAprobacion = new Date(r.fecha_aprobacion || r.fecha_actualizacion || r.fecha);
      if (!isNaN(fechaSolicitud.getTime()) && !isNaN(fechaAprobacion.getTime())) {
        const dias = Math.max(0, Math.floor((fechaAprobacion.getTime() - fechaSolicitud.getTime()) / (1000*60*60*24)));
        tiemposAtencion.push(dias);
      }
    });
    const tiempoPromedioAtencion = tiemposAtencion.length > 0 
      ? tiemposAtencion.reduce((a,b) => a+b, 0) / tiemposAtencion.length 
      : 0;

    // % Atendidas rápido (en menos de 2 días)
    const atendidasRapido = tiemposAtencion.filter(t => t <= 2).length;
    const pctRapido = tiemposAtencion.length > 0 ? (atendidasRapido / tiemposAtencion.length) * 100 : 0;

    // Valor total solicitado (aprobados)
    const valorAprobado = aprobados.reduce((sum, r) => sum + (r.total || (r.cantidad || 0) * (r.valor_unitario || 0)), 0);
    const fmtMoney = (n: number) => '$' + n.toLocaleString('es-CL', { maximumFractionDigits: 0 });

    this.kpis = [
      { label: 'Pendientes', value: pendientes.length, icon: 'pi pi-clock', color: 'amber', tooltip: 'Solicitudes esperando aprobación' },
      { label: 'Valor Aprobado', value: fmtMoney(valorAprobado), icon: 'pi pi-wallet', color: 'purple', tooltip: 'Valor total de solicitudes aprobadas' },
      { label: '% Aprobación', value: pctAprobacion.toFixed(0) + '%', icon: 'pi pi-check', color: 'green', tooltip: 'Tasa de aprobación' },
      { label: 'Atención Prom.', value: tiempoPromedioAtencion.toFixed(1) + 'd', icon: 'pi pi-stopwatch', color: 'blue', tooltip: 'Tiempo promedio para aprobar solicitudes' },
      { label: '% Rápidas', value: pctRapido.toFixed(0) + '%', icon: 'pi pi-bolt', color: 'green', tooltip: 'Solicitudes atendidas en ≤2 días' },
      { label: 'Críticos', value: criticos, icon: 'pi pi-exclamation-triangle', color: 'red', tooltip: `Pendientes > ${this.diasCritico} días` }
    ];

    // Top productos más solicitados (aprobados = consumo real)
    const prodMap = new Map<string, number>();
    aprobados.forEach(r => {
      const prod = r.producto_nombre || r.producto || 'Sin producto';
      prodMap.set(prod, (prodMap.get(prod) || 0) + (r.cantidad || 0));
    });
    const topProds = Array.from(prodMap.entries()).sort((a,b) => b[1] - a[1]).slice(0, 10);
    this.topProductosData = {
      labels: topProds.map(([k]) => k.length > 25 ? k.substring(0, 25) + '...' : k),
      datasets: [{ data: topProds.map(([,v]) => v), backgroundColor: '#3b82f6', borderRadius: 4 }]
    };

    // Gasto por departamento (valor $ de solicitudes aprobadas)
    const gastoDeptoMap = new Map<string, number>();
    aprobados.forEach(r => {
      const dept = r.departamento_nombre || r.departamento || 'Sin depto';
      const valor = r.total || (r.cantidad || 0) * (r.valor_unitario || 0);
      gastoDeptoMap.set(dept, (gastoDeptoMap.get(dept) || 0) + valor);
    });
    const gastoDeptoSorted = Array.from(gastoDeptoMap.entries()).sort((a,b) => b[1] - a[1]).slice(0, 10);
    this.gastoDeptoData = {
      labels: gastoDeptoSorted.map(([k]) => k),
      datasets: [{ data: gastoDeptoSorted.map(([,v]) => v), backgroundColor: '#8b5cf6', borderRadius: 4 }]
    };

    // Solicitudes por departamento (cantidad de solicitudes)
    const deptMap = new Map<string, number>();
    [...pendientes, ...aprobados].forEach(r => {
      const dept = r.departamento_nombre || r.departamento || 'Sin depto';
      deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
    });
    const deptSorted = Array.from(deptMap.entries()).sort((a,b) => b[1] - a[1]).slice(0, 10);
    this.deptData = {
      labels: deptSorted.map(([k]) => k),
      datasets: [{ data: deptSorted.map(([,v]) => v), backgroundColor: '#22c55e', borderRadius: 4 }]
    };

    // Tabla
    this.solicitudes = pendientes.map((r, i) => ({
      id: i,
      producto: r.producto_nombre || r.producto || 'Sin producto',
      cliente: r.cliente_nombre || r.cliente || 'Sin cliente',
      departamento: r.departamento_nombre || r.departamento || 'Sin depto',
      cantidad: r.cantidad || 0,
      fecha: new Date(r.fecha),
      diasPendiente: Math.floor((now.getTime() - new Date(r.fecha).getTime()) / (1000*60*60*24)),
      estado: 'Pendiente'
    }));

    if (this.solosCriticos) {
      this.solicitudes = this.solicitudes.filter(s => s.diasPendiente > this.diasCritico);
    }
    this.solicitudes.sort((a,b) => b.diasPendiente - a.diasPendiente);
  }

  toggleCriticos(): void {
    this.solosCriticos = !this.solosCriticos;
    this.applyFilters();
  }

  navigateTo(page: string): void {
    this.router.navigate(['/menu', 'dashboard-bi', page]);
  }

  exportToExcel(): void {
    const headers = ['Producto', 'Cliente', 'Departamento', 'Cantidad', 'Fecha', 'Días Pendiente'];
    const rows = this.solicitudes.map(r => [
      r.producto,
      r.cliente,
      r.departamento,
      r.cantidad,
      r.fecha.toLocaleDateString('es-CL'),
      r.diasPendiente
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `solicitudes_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  }
}
