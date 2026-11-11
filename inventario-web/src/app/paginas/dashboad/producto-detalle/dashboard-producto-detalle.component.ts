// ======================== DashboardProductoDetalleComponent ========================
// Página G: Detalle Producto - Drill-through con ficha 360°
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { finalize } from 'rxjs/operators';

import { KpiCardComponent, KpiData } from '../shared/kpi-card/kpi-card.component';
import { BaseChartComponent } from '../../../shared/base-chart/base-chart.component';
import { DashboardLoaderComponent } from '../shared/dashboard-loader/dashboard-loader.component';
import { DashboardApiService } from '../../../core/services/dashboard-api.service';

import { ChartData, ChartOptions } from 'chart.js';

@Component({
  selector: 'app-dashboard-producto-detalle',
  standalone: true,
  imports: [CommonModule, TableModule, KpiCardComponent, BaseChartComponent, DashboardLoaderComponent],
  template: `
    <div class="dashboard-page">
      <header class="page-header">
        <div>
          <button class="btn-back" (click)="goBack()"><i class="pi pi-arrow-left"></i></button>
          <div>
            <h1>{{ productoNombre }}</h1>
            <p class="subtitle">Ficha 360° del producto</p>
          </div>
        </div>
      </header>

      <section class="kpi-grid">
        <app-kpi-card *ngFor="let kpi of kpis" [data]="kpi"></app-kpi-card>
      </section>

      <section class="charts-grid">
        <div class="chart-card chart-wide">
          <div class="chart-header"><h3>Consumo e Ingresos en el Tiempo</h3></div>
          <app-base-chart [title]="''" [type]="'line'" [data]="timelineData" [options]="lineOptions"></app-base-chart>
        </div>

        <div class="chart-card">
          <div class="chart-header"><h3>Top Clientes</h3></div>
          <app-base-chart [title]="''" [type]="'bar'" [data]="clientesData" [options]="horizontalBarOptions"></app-base-chart>
        </div>

        <div class="chart-card">
          <div class="chart-header"><h3>Proveedores Asociados</h3></div>
          <app-base-chart [title]="''" [type]="'bar'" [data]="proveedoresData" [options]="horizontalBarOptions"></app-base-chart>
        </div>
      </section>

      <!-- Alertas del producto -->
      <section class="alerts-section" *ngIf="alertas.length > 0">
        <h3><i class="pi pi-exclamation-triangle"></i> Alertas</h3>
        <div class="alert-list">
          <div *ngFor="let alerta of alertas" class="alert-item" [class]="'alert-' + alerta.tipo">
            <i [class]="alerta.icon"></i>
            <span>{{ alerta.mensaje }}</span>
          </div>
        </div>
      </section>

      <!-- Historial de movimientos -->
      <section class="table-section">
        <div class="section-header">
          <h3>Historial de Movimientos</h3>
          <span class="count-badge">{{ movimientos.length }} registros</span>
        </div>
        <p-table [value]="movimientos" [paginator]="true" [rows]="15" styleClass="p-datatable-sm p-datatable-striped">
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="fecha">Fecha</th>
              <th pSortableColumn="tipoLabel">Tipo</th>
              <th pSortableColumn="cantidad" style="text-align:right">Cantidad</th>
              <th pSortableColumn="precio" style="text-align:right">Precio</th>
              <th>Cliente/Proveedor</th>
              <th>Departamento</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr>
              <td>{{ row.fecha | date:'dd/MM/yyyy' }}</td>
              <td><span class="tipo-badge" [class]="'tipo-' + row.tipo">{{ row.tipoLabel }}</span></td>
              <td style="text-align:right">{{ row.cantidad | number:'1.0-0' }}</td>
              <td style="text-align:right">{{ row.precio | number:'1.0-0' }}</td>
              <td>{{ row.cliente || row.proveedor || '-' }}</td>
              <td>{{ row.departamento || '-' }}</td>
            </tr>
          </ng-template>
        </p-table>
      </section>

      <app-dashboard-loader *ngIf="loading" label="Preparando producto"></app-dashboard-loader>
    </div>
  `,
  styles: [`
    .dashboard-page { padding: 1.5rem; max-width: 1800px; margin: 0 auto; position: relative; }
    .page-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
    .page-header > div { display: flex; align-items: center; gap: 1rem; }
    .page-header h1 { margin: 0; font-size: 1.75rem; font-weight: 700; }
    .subtitle { margin: 0; opacity: 0.7; }
    .btn-back { width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--surface-border); background: var(--surface-card); cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .btn-back:hover { background: var(--primary-color); color: white; }

    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .charts-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
    .chart-card { background: var(--surface-card); border-radius: 12px; border: 1px solid var(--surface-border); padding: 1rem; min-height: 300px; }
    .chart-wide { grid-column: span 2; }
    .chart-header h3 { margin: 0 0 1rem; font-size: 1rem; font-weight: 600; }

    .alerts-section { background: var(--surface-card); border-radius: 12px; border: 1px solid var(--surface-border); padding: 1rem; margin-bottom: 1.5rem; }
    .alerts-section h3 { margin: 0 0 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .alert-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .alert-item { padding: 0.75rem 1rem; border-radius: 8px; display: flex; align-items: center; gap: 0.75rem; }
    .alert-red { background: rgba(239,68,68,0.15); color: #ef4444; }
    .alert-amber { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .alert-green { background: rgba(34,197,94,0.15); color: #22c55e; }

    .table-section { background: var(--surface-card); border-radius: 12px; border: 1px solid var(--surface-border); overflow: hidden; }
    .section-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid var(--surface-border); }
    .section-header h3 { margin: 0; }
    .count-badge { padding: 0.25rem 0.75rem; background: var(--primary-color); color: white; border-radius: 20px; font-size: 0.75rem; }

    .tipo-badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .tipo-0 { background: rgba(34,197,94,0.15); color: #22c55e; }
    .tipo-1 { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .tipo-2 { background: rgba(59,130,246,0.15); color: #3b82f6; }
    .tipo-3 { background: rgba(239,68,68,0.15); color: #ef4444; }

    .loading-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 2rem; }
    @media (max-width: 1200px) { .charts-grid { grid-template-columns: 1fr; } .chart-wide { grid-column: span 1; } }
  `]
})
export class DashboardProductoDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dashboardApi = inject(DashboardApiService);

  loading = false;
  productoNombre = '';
  rawData: any[] = [];

  kpis: KpiData[] = [];
  alertas: { tipo: string; icon: string; mensaje: string }[] = [];
  movimientos: any[] = [];

  timelineData: ChartData<'line'> = { labels: [], datasets: [] };
  clientesData: ChartData<'bar'> = { labels: [], datasets: [] };
  proveedoresData: ChartData<'bar'> = { labels: [], datasets: [] };

  lineOptions: ChartOptions<'line'> = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } };
  horizontalBarOptions: ChartOptions<'bar'> = { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

  ngOnInit(): void {
    this.productoNombre = decodeURIComponent(this.route.snapshot.params['id'] || '');
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.dashboardApi.tablaResumen2().pipe(finalize(() => this.loading = false)).subscribe(data => {
      this.rawData = data.filter((r: any) => r.producto === this.productoNombre);
      this.buildDashboard();
    });
  }

  private buildDashboard(): void {
    const data = this.rawData;
    if (data.length === 0) return;

    // KPIs
    let ingresado = 0, reservado = 0, consumido = 0, minimo = 0;
    data.forEach(r => {
      const qty = r.cantidad || 0;
      if (r.tipo === 0) ingresado += qty;
      else if (r.tipo === 1) reservado += qty;
      else if (r.tipo === 2) consumido += qty;
      if (r.minimo) minimo = r.minimo;
    });
    const disponible = ingresado - reservado - consumido;
    const consumoDiario = consumido / 30;
    const cobertura = consumoDiario > 0 ? Math.floor(disponible / consumoDiario) : 999;

    this.kpis = [
      { label: 'Stock Disponible', value: disponible.toLocaleString(), icon: 'pi pi-box', color: disponible <= minimo ? 'red' : 'blue' },
      { label: 'Reservado', value: reservado.toLocaleString(), icon: 'pi pi-lock', color: 'amber' },
      { label: 'Consumido (30d)', value: consumido.toLocaleString(), icon: 'pi pi-check-circle', color: 'green' },
      { label: 'Cobertura', value: cobertura + ' días', icon: 'pi pi-calendar', color: cobertura < 7 ? 'red' : cobertura < 14 ? 'amber' : 'green' },
      { label: 'Stock Mínimo', value: minimo.toLocaleString(), icon: 'pi pi-flag', color: 'gray' }
    ];

    // Alertas
    this.alertas = [];
    if (disponible <= 0) this.alertas.push({ tipo: 'red', icon: 'pi pi-times-circle', mensaje: 'QUIEBRE: Sin stock disponible' });
    else if (disponible <= minimo) this.alertas.push({ tipo: 'red', icon: 'pi pi-exclamation-triangle', mensaje: 'Stock por debajo del mínimo' });
    if (cobertura < 7) this.alertas.push({ tipo: 'amber', icon: 'pi pi-clock', mensaje: 'Cobertura crítica: menos de 7 días' });
    if (reservado > disponible * 0.5) this.alertas.push({ tipo: 'amber', icon: 'pi pi-lock', mensaje: 'Alta reserva pendiente' });

    // Timeline
    const monthMap = new Map<string, { ingresos: number; consumo: number }>();
    data.forEach(r => {
      const month = new Date(r.fecha).toISOString().slice(0, 7);
      if (!monthMap.has(month)) monthMap.set(month, { ingresos: 0, consumo: 0 });
      const m = monthMap.get(month)!;
      if (r.tipo === 0) m.ingresos += r.cantidad || 0;
      else if (r.tipo === 2) m.consumo += r.cantidad || 0;
    });
    const months = Array.from(monthMap.keys()).sort();
    this.timelineData = {
      labels: months,
      datasets: [
        { label: 'Ingresos', data: months.map(m => monthMap.get(m)!.ingresos), borderColor: '#22c55e', fill: false },
        { label: 'Consumo', data: months.map(m => monthMap.get(m)!.consumo), borderColor: '#3b82f6', fill: false }
      ]
    };

    // Top clientes
    const clienteMap = new Map<string, number>();
    data.filter(r => r.tipo === 2).forEach(r => {
      const c = r.cliente || 'Sin cliente';
      clienteMap.set(c, (clienteMap.get(c) || 0) + (r.cantidad || 0));
    });
    const topClientes = Array.from(clienteMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    this.clientesData = { labels: topClientes.map(([k]) => k), datasets: [{ data: topClientes.map(([, v]) => v), backgroundColor: '#3b82f6' }] };

    // Proveedores
    const provMap = new Map<string, number>();
    data.filter(r => r.tipo === 0).forEach(r => {
      const p = r.proveedor || 'Sin proveedor';
      provMap.set(p, (provMap.get(p) || 0) + (r.cantidad || 0));
    });
    const topProv = Array.from(provMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    this.proveedoresData = { labels: topProv.map(([k]) => k), datasets: [{ data: topProv.map(([, v]) => v), backgroundColor: '#a855f7' }] };

    // Movimientos
    const tipoLabels = ['Ingreso', 'Pendiente', 'Aprobado', 'Rechazado'];
    this.movimientos = data.map(r => ({
      ...r,
      fecha: new Date(r.fecha),
      tipoLabel: tipoLabels[r.tipo] || 'Desconocido'
    })).sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }

  goBack(): void {
    this.router.navigate(['/menu', 'dashboard-bi', 'resumen']);
  }
}
