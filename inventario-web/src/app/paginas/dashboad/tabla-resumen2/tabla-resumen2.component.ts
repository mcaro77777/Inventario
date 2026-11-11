import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { finalize } from 'rxjs/operators';
import { ViewChild } from '@angular/core';

import { BaseChartComponent } from '../../../shared/base-chart/base-chart.component';
import { DashboardApiService } from '../../../core/services/dashboard-api.service';

import { ChartData, ChartOptions, ChartTypeRegistry } from 'chart.js';

@Component({
  selector: 'app-tabla-resumen2',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, InputTextModule, TooltipModule, BaseChartComponent],
  template: `
    <main class="dashboard-main">
      <div class="dashboard-container">
        <!-- Header -->
        <header class="dashboard-header">
          <div>
            <h1>Resumen Ejecutivo – Inventario</h1>
            <p class="subtitle">Gestión, decisión y control de stock en tiempo real</p>
          </div>
          <div class="header-actions">
            <div class="bookmark-btns">
              <button [class.active]="bookmarkDays === 7" (click)="setBookmark(7)">7 días</button>
              <button [class.active]="bookmarkDays === 30" (click)="setBookmark(30)">30 días</button>
              <button [class.active]="bookmarkDays === 90" (click)="setBookmark(90)">90 días</button>
              <button [class.active]="bookmarkDays === 0" (click)="setBookmark(0)">Todo</button>
            </div>
            <button class="btn-refresh" (click)="cargar()" [disabled]="loading">
              <i class="pi pi-refresh" [class.pi-spin]="loading"></i> Actualizar
            </button>
          </div>
        </header>

        <div class="progress-bar" *ngIf="loading"></div>

        <!-- Filtros -->
        <section class="filters-section">
          <div class="filter-group">
            <label>Categoría</label>
            <select [(ngModel)]="categoriaSeleccionada" (change)="aplicarFiltros()">
              <option value="">Todas</option>
              <option *ngFor="let c of categorias" [value]="c">{{ c }}</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Proveedor</label>
            <select [(ngModel)]="proveedorSeleccionado" (change)="aplicarFiltros()">
              <option value="">Todos</option>
              <option *ngFor="let p of proveedores" [value]="p">{{ p }}</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Departamento</label>
            <select [(ngModel)]="departamentoSeleccionado" (change)="aplicarFiltros()">
              <option value="">Todos</option>
              <option *ngFor="let d of departamentos" [value]="d">{{ d }}</option>
            </select>
          </div>
          <div class="filter-group search-box">
            <label>Buscar</label>
            <input pInputText placeholder="Producto, SKU, Cliente…" [(ngModel)]="texto" (input)="aplicarFiltros()" />
          </div>
        </section>

        <!-- KPIs -->
        <section class="kpi-grid">
          <div *ngFor="let kpi of kpis" class="kpi-card" [class]="'kpi-' + kpi.color"
               [pTooltip]="kpi.tooltip" tooltipPosition="bottom">
            <div class="kpi-icon"><i [class]="kpi.icon"></i></div>
            <div class="kpi-content">
              <span class="kpi-label">{{ kpi.label }}</span>
              <span class="kpi-value">{{ kpi.value }}</span>
              <span class="kpi-trend" *ngIf="kpi.trend" [class.positive]="kpi.trendPositive" [class.negative]="!kpi.trendPositive">
                <i [class]="kpi.trendPositive ? 'pi pi-arrow-up' : 'pi pi-arrow-down'"></i> {{ kpi.trend }}
              </span>
            </div>
          </div>
        </section>

        <!-- Gráficos principales -->
        <section class="charts-row">
          <div class="chart-card chart-wide">
            <div class="chart-header">
              <span class="chart-title">Gasto y Consumo en el Tiempo</span>
              <div class="granularity-btns">
                <button [class.active]="granularity === 'day'" (click)="setGranularity('day')">Día</button>
                <button [class.active]="granularity === 'week'" (click)="setGranularity('week')">Semana</button>
                <button [class.active]="granularity === 'month'" (click)="setGranularity('month')">Mes</button>
              </div>
            </div>
            <app-base-chart
              [title]="''"
              [type]="chartTimeSeries.type"
              [data]="chartTimeSeries.data"
              [options]="chartTimeSeries.options">
            </app-base-chart>
          </div>
        </section>

        <section class="charts-row charts-3col">
          <div class="chart-card">
            <app-base-chart
              [title]="chartTopGasto.title"
              [type]="chartTopGasto.type"
              [data]="chartTopGasto.data"
              [options]="chartTopGasto.options">
            </app-base-chart>
          </div>
          <div class="chart-card">
            <app-base-chart
              [title]="chartTopVolumen.title"
              [type]="chartTopVolumen.type"
              [data]="chartTopVolumen.data"
              [options]="chartTopVolumen.options">
            </app-base-chart>
          </div>
          <div class="chart-card">
            <app-base-chart
              [title]="chartTreemap.title"
              [type]="chartTreemap.type"
              [data]="chartTreemap.data"
              [options]="chartTreemap.options">
            </app-base-chart>
          </div>
        </section>

        <!-- Tabla de Alertas -->
        <section class="alerts-section">
          <h3><i class="pi pi-exclamation-triangle"></i> Productos en Riesgo / Quiebre / Reservas Altas</h3>
          <p-table [value]="alertRows" [scrollable]="true" scrollHeight="280px" [rowHover]="true" styleClass="p-datatable-sm p-datatable-striped">
            <ng-template pTemplate="header">
              <tr>
                <th style="width:50px">Estado</th>
                <th pSortableColumn="producto">Producto <p-sortIcon field="producto"></p-sortIcon></th>
                <th pSortableColumn="categoria">Categoría <p-sortIcon field="categoria"></p-sortIcon></th>
                <th pSortableColumn="stockDisponible" style="text-align:right">Disponible <p-sortIcon field="stockDisponible"></p-sortIcon></th>
                <th pSortableColumn="stockMinimo" style="text-align:right">Mínimo <p-sortIcon field="stockMinimo"></p-sortIcon></th>
                <th pSortableColumn="reservado" style="text-align:right">Reservado <p-sortIcon field="reservado"></p-sortIcon></th>
                <th pSortableColumn="consumoDiario" style="text-align:right">Consumo/día <p-sortIcon field="consumoDiario"></p-sortIcon></th>
                <th pSortableColumn="coberturaDias" style="text-align:right">Cobertura <p-sortIcon field="coberturaDias"></p-sortIcon></th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr>
                <td style="text-align:center">
                  <span class="semaforo" [class]="row.semaforo" [pTooltip]="row.semaforoTip"></span>
                </td>
                <td>{{ row.producto }}</td>
                <td>{{ row.categoria }}</td>
                <td style="text-align:right">{{ row.stockDisponible | number:'1.0-0' }}</td>
                <td style="text-align:right">{{ row.stockMinimo | number:'1.0-0' }}</td>
                <td style="text-align:right">{{ row.reservado | number:'1.0-0' }}</td>
                <td style="text-align:right">{{ row.consumoDiario | number:'1.2-2' }}</td>
                <td style="text-align:right">{{ row.coberturaDias | number:'1.0-0' }} días</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="8" style="text-align:center;opacity:.6;">Sin alertas activas</td></tr>
            </ng-template>
          </p-table>
        </section>

      </div>
    </main>
  `,
  styles: [`
    .dashboard-main { padding: 1rem; background: var(--surface-ground, #f8fafc); min-height: 100vh; }
    .dashboard-container {
      max-width: 1600px; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem;
    }
    .dashboard-header {
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;
      background: var(--surface-card, #fff); padding: 1rem 1.25rem; border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }
    .dashboard-header h1 { margin: 0; font-size: 1.5rem; font-weight: 600; }
    .dashboard-header .subtitle { margin: .25rem 0 0; opacity: .65; font-size: .9rem; }
    .header-actions { display: flex; gap: .75rem; align-items: center; flex-wrap: wrap; }
    .bookmark-btns { display: flex; gap: 4px; }
    .bookmark-btns button, .granularity-btns button {
      padding: .4rem .7rem; border: 1px solid var(--surface-border, #e2e8f0); background: var(--surface-card, #fff);
      border-radius: 6px; cursor: pointer; font-size: .8rem; transition: all .15s;
    }
    .bookmark-btns button.active, .granularity-btns button.active {
      background: var(--primary-color, #6366f1); color: #fff; border-color: var(--primary-color, #6366f1);
    }
    .btn-refresh {
      display: flex; align-items: center; gap: .35rem; padding: .5rem .85rem;
      border: 1px solid var(--primary-color, #6366f1); background: var(--primary-color, #6366f1);
      color: #fff; border-radius: 8px; cursor: pointer; font-weight: 500;
    }
    .btn-refresh:disabled { opacity: .6; cursor: not-allowed; }
    .progress-bar {
      height: 3px; border-radius: 2px;
      background: linear-gradient(90deg,#6366f1,#22c55e,#f59e0b,#ef4444);
      background-size: 300% 100%; animation: progress-run 1s linear infinite;
    }
    @keyframes progress-run { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }

    .filters-section {
      display: flex; gap: .75rem; flex-wrap: wrap; align-items: flex-end;
      background: var(--surface-card, #fff); padding: .85rem 1rem; border-radius: 10px;
      box-shadow: 0 1px 2px rgba(0,0,0,.04);
    }
    .filter-group { display: flex; flex-direction: column; gap: .2rem; min-width: 160px; }
    .filter-group label { font-size: .75rem; opacity: .65; font-weight: 500; }
    .filter-group select, .filter-group input {
      padding: .45rem .55rem; border: 1px solid var(--surface-border, #e2e8f0);
      border-radius: 8px; font-size: .85rem; background: var(--surface-ground, #f8fafc);
    }
    .search-box { flex: 1; min-width: 200px; }
    .search-box input { width: 100%; }

    .kpi-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: .75rem;
    }
    .kpi-card {
      display: flex; gap: .75rem; align-items: center; padding: 1rem;
      background: var(--surface-card, #fff); border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,.05);
      border-left: 4px solid transparent; cursor: default;
    }
    .kpi-card.kpi-blue { border-left-color: #6366f1; }
    .kpi-card.kpi-green { border-left-color: #22c55e; }
    .kpi-card.kpi-amber { border-left-color: #f59e0b; }
    .kpi-card.kpi-red { border-left-color: #ef4444; }
    .kpi-card.kpi-purple { border-left-color: #8b5cf6; }
    .kpi-icon { font-size: 1.5rem; opacity: .7; }
    .kpi-content { display: flex; flex-direction: column; }
    .kpi-label { font-size: .75rem; opacity: .6; font-weight: 500; }
    .kpi-value { font-size: 1.25rem; font-weight: 700; }
    .kpi-trend { font-size: .7rem; display: flex; align-items: center; gap: .2rem; }
    .kpi-trend.positive { color: #22c55e; }
    .kpi-trend.negative { color: #ef4444; }

    .charts-row { display: flex; gap: 1rem; flex-wrap: wrap; }
    .chart-card {
      flex: 1; min-width: 300px; background: var(--surface-card, #fff); border-radius: 10px;
      padding: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,.05);
    }
    .chart-wide { flex: 1 1 100%; min-height: 280px; }
    .charts-3col .chart-card { flex: 1 1 calc(33% - 1rem); min-width: 280px; }
    .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: .5rem; }
    .chart-title { font-weight: 600; font-size: .95rem; }
    .granularity-btns { display: flex; gap: 4px; }

    .alerts-section {
      background: var(--surface-card, #fff); border-radius: 10px; padding: 1rem;
      box-shadow: 0 1px 3px rgba(0,0,0,.05);
    }
    .alerts-section h3 { margin: 0 0 .75rem; font-size: 1rem; display: flex; align-items: center; gap: .4rem; }
    .semaforo {
      display: inline-block; width: 14px; height: 14px; border-radius: 50%;
    }
    .semaforo.verde { background: #22c55e; }
    .semaforo.amarillo { background: #f59e0b; }
    .semaforo.rojo { background: #ef4444; }
  `]
})
export class TablaResumen2Component {
  @ViewChild('dt') table!: Table;

  private allRows: Record<string, any>[] = [];
  filteredRows: Record<string, any>[] = [];
  loading = false;

  bookmarkDays = 30;
  granularity: 'day' | 'week' | 'month' = 'day';

  categoriaSeleccionada = '';
  proveedorSeleccionado = '';
  departamentoSeleccionado = '';
  texto = '';

  categorias: string[] = [];
  proveedores: string[] = [];
  departamentos: string[] = [];

  kpis: Array<{
    label: string; value: string; icon: string; color: string;
    trend: string; trendPositive: boolean; tooltip: string;
  }> = [];

  alertRows: Array<{
    producto: string; categoria: string; stockDisponible: number; stockMinimo: number;
    reservado: number; consumoDiario: number; coberturaDias: number;
    semaforo: string; semaforoTip: string;
  }> = [];

  chartTimeSeries = this.emptyChart('line');
  chartTopGasto = this.emptyChart('bar');
  chartTopVolumen = this.emptyChart('bar');
  chartTreemap = this.emptyChart('doughnut');

  constructor(private dash: DashboardApiService) {}

  ngOnInit(): void {
    this.cargar();
  }

  setBookmark(days: number): void {
    this.bookmarkDays = days;
    this.aplicarFiltros();
  }

  setGranularity(g: 'day' | 'week' | 'month'): void {
    this.granularity = g;
    this.buildCharts();
  }

  cargar(): void {
    this.loading = true;
    this.dash
      .tablaResumen2()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: data => {
          this.allRows = Array.isArray(data) ? data : [];
          this.categorias = this.uniqStr(this.allRows.map(r => this.asStr(r['categoria_nombre'])));
          this.proveedores = this.uniqStr(this.allRows.map(r => this.asStr(r['producto_proveedor_nombre']) || this.asStr(r['ingreso_proveedor_nombre'])));
          this.departamentos = this.uniqStr(this.allRows.map(r => this.asStr(r['departamento_nombre'])));
          this.aplicarFiltros();
        },
        error: () => {
          this.allRows = [];
          this.filteredRows = [];
          this.recalcular();
        }
      });
  }

  aplicarFiltros(): void {
    const now = new Date();
    const desde = this.bookmarkDays > 0 ? new Date(now.getTime() - this.bookmarkDays * 24 * 60 * 60 * 1000) : null;
    const cat = this.categoriaSeleccionada.toLowerCase();
    const prov = this.proveedorSeleccionado.toLowerCase();
    const dep = this.departamentoSeleccionado.toLowerCase();
    const q = this.texto.toLowerCase();

    this.filteredRows = this.allRows.filter(r => {
      const f = this.parseAnyDate(r['fecha']);
      if (desde && (!f || f < desde)) return false;

      if (cat && this.asStr(r['categoria_nombre']).toLowerCase() !== cat) return false;
      if (prov) {
        const p1 = this.asStr(r['producto_proveedor_nombre']).toLowerCase();
        const p2 = this.asStr(r['ingreso_proveedor_nombre']).toLowerCase();
        if (p1 !== prov && p2 !== prov) return false;
      }
      if (dep && this.asStr(r['departamento_nombre']).toLowerCase() !== dep) return false;
      if (q) {
        const hay = [
          this.asStr(r['producto_nombre']),
          this.asStr(r['producto_sku']),
          this.asStr(r['cliente_nombre'])
        ].some(x => x.toLowerCase().includes(q));
        if (!hay) return false;
      }
      return true;
    });

    this.recalcular();
  }

  private recalcular(): void {
    this.computeKpis();
    this.computeAlerts();
    this.buildCharts();
  }

  private computeKpis(): void {
    const rows = this.filteredRows;
    const fmt = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString('es-CL') : '0');
    const fmtMoney = (n: number) => `$ ${fmt(n)}`;

    const ingresos = rows.filter(r => Number(r['tipo_id']) === 0);
    const pendientes = rows.filter(r => Number(r['tipo_id']) === 1);
    const aprobados = rows.filter(r => Number(r['tipo_id']) === 2);

    const stockIngresado = ingresos.reduce((a, r) => a + (Number(r['cantidad']) || 0), 0);
    const stockReservado = pendientes.reduce((a, r) => a + (Number(r['cantidad']) || 0), 0);
    const stockConsumido = aprobados.reduce((a, r) => a + (Number(r['cantidad']) || 0), 0);
    const stockDisponible = stockIngresado - stockReservado - stockConsumido;

    const gastoTotal = aprobados.reduce((a, r) => a + (Number(r['total']) || 0), 0);
    const pendientesCount = pendientes.length;

    const productosEnRiesgo = this.countProductosEnRiesgo(rows);

    const prevRows = this.getPreviousPeriodRows();
    const prevAprobados = prevRows.filter(r => Number(r['tipo_id']) === 2);
    const prevGasto = prevAprobados.reduce((a, r) => a + (Number(r['total']) || 0), 0);
    const prevConsumido = prevAprobados.reduce((a, r) => a + (Number(r['cantidad']) || 0), 0);

    const gastoVar = prevGasto > 0 ? ((gastoTotal - prevGasto) / prevGasto * 100) : 0;
    const consumoVar = prevConsumido > 0 ? ((stockConsumido - prevConsumido) / prevConsumido * 100) : 0;

    this.kpis = [
      { label: 'Stock Disponible', value: fmt(stockDisponible), icon: 'pi pi-box', color: 'blue', trend: '', trendPositive: true, tooltip: 'Ingresado – Reservado – Consumido' },
      { label: 'Reservado', value: fmt(stockReservado), icon: 'pi pi-lock', color: 'amber', trend: '', trendPositive: true, tooltip: 'Unidades en solicitudes pendientes' },
      { label: 'Consumido', value: fmt(stockConsumido), icon: 'pi pi-check-circle', color: 'green', trend: this.fmtTrend(consumoVar), trendPositive: consumoVar <= 0, tooltip: `Salidas aprobadas en el periodo. Var vs anterior: ${consumoVar.toFixed(1)}%` },
      { label: 'Gasto Total', value: fmtMoney(gastoTotal), icon: 'pi pi-wallet', color: 'purple', trend: this.fmtTrend(gastoVar), trendPositive: gastoVar <= 0, tooltip: `Valor de salidas. Var vs anterior: ${gastoVar.toFixed(1)}%` },
      { label: 'Productos en Riesgo', value: fmt(productosEnRiesgo), icon: 'pi pi-exclamation-triangle', color: 'red', trend: '', trendPositive: true, tooltip: 'Stock disponible <= stock mínimo' },
      { label: 'Pendientes', value: fmt(pendientesCount), icon: 'pi pi-clock', color: 'amber', trend: '', trendPositive: true, tooltip: 'Solicitudes esperando aprobación' }
    ];
  }

  private fmtTrend(pct: number): string {
    if (!Number.isFinite(pct) || Math.abs(pct) < 0.1) return '';
    return `${Math.abs(pct).toFixed(1)}%`;
  }

  private getPreviousPeriodRows(): Record<string, any>[] {
    if (this.bookmarkDays <= 0) return [];
    const now = new Date();
    const start = new Date(now.getTime() - this.bookmarkDays * 2 * 24 * 60 * 60 * 1000);
    const end = new Date(now.getTime() - this.bookmarkDays * 24 * 60 * 60 * 1000);
    return this.allRows.filter(r => {
      const f = this.parseAnyDate(r['fecha']);
      return f && f >= start && f < end;
    });
  }

  private countProductosEnRiesgo(rows: Record<string, any>[]): number {
    const byProd: Record<string, { ingresado: number; reservado: number; consumido: number; minimo: number }> = {};
    for (const r of rows) {
      const prod = this.asKey(r['producto_nombre']) || 'Sin producto';
      if (!byProd[prod]) byProd[prod] = { ingresado: 0, reservado: 0, consumido: 0, minimo: Number(r['producto_stock_minimo']) || 0 };
      const cant = Number(r['cantidad']) || 0;
      const tipo = Number(r['tipo_id']);
      if (tipo === 0) byProd[prod].ingresado += cant;
      if (tipo === 1) byProd[prod].reservado += cant;
      if (tipo === 2) byProd[prod].consumido += cant;
      if ((Number(r['producto_stock_minimo']) || 0) > byProd[prod].minimo) byProd[prod].minimo = Number(r['producto_stock_minimo']) || 0;
    }
    let count = 0;
    for (const p of Object.values(byProd)) {
      const disp = p.ingresado - p.reservado - p.consumido;
      if (disp <= p.minimo) count++;
    }
    return count;
  }

  private computeAlerts(): void {
    const rows = this.filteredRows;
    const byProd: Record<string, { categoria: string; ingresado: number; reservado: number; consumido: number; minimo: number; dias: number }> = {};

    const now = new Date();
    for (const r of rows) {
      const prod = this.asKey(r['producto_nombre']) || 'Sin producto';
      if (!byProd[prod]) {
        byProd[prod] = {
          categoria: this.asStr(r['categoria_nombre']) || 'Sin categoría',
          ingresado: 0, reservado: 0, consumido: 0,
          minimo: Number(r['producto_stock_minimo']) || 0,
          dias: 0
        };
      }
      const cant = Number(r['cantidad']) || 0;
      const tipo = Number(r['tipo_id']);
      if (tipo === 0) byProd[prod].ingresado += cant;
      if (tipo === 1) byProd[prod].reservado += cant;
      if (tipo === 2) {
        byProd[prod].consumido += cant;
        const f = this.parseAnyDate(r['fecha']);
        if (f) {
          const daysDiff = Math.max(1, Math.ceil((now.getTime() - f.getTime()) / (1000 * 60 * 60 * 24)));
          byProd[prod].dias = Math.max(byProd[prod].dias, daysDiff);
        }
      }
    }

    this.alertRows = [];
    for (const [prod, data] of Object.entries(byProd)) {
      const disponible = data.ingresado - data.reservado - data.consumido;
      const consumoDiario = data.dias > 0 ? data.consumido / data.dias : 0;
      const cobertura = consumoDiario > 0 ? disponible / consumoDiario : 999;

      let semaforo = 'verde';
      let semaforoTip = 'OK';
      if (disponible <= 0) {
        semaforo = 'rojo';
        semaforoTip = 'Quiebre de stock';
      } else if (disponible <= data.minimo) {
        semaforo = 'rojo';
        semaforoTip = 'Stock bajo mínimo';
      } else if (data.reservado > disponible * 0.5) {
        semaforo = 'amarillo';
        semaforoTip = 'Reservas altas (>50% disp.)';
      } else if (cobertura < 7) {
        semaforo = 'amarillo';
        semaforoTip = 'Cobertura < 7 días';
      }

      if (semaforo !== 'verde') {
        this.alertRows.push({
          producto: prod,
          categoria: data.categoria,
          stockDisponible: disponible,
          stockMinimo: data.minimo,
          reservado: data.reservado,
          consumoDiario,
          coberturaDias: cobertura,
          semaforo,
          semaforoTip
        });
      }
    }

    this.alertRows.sort((a, b) => {
      if (a.semaforo === 'rojo' && b.semaforo !== 'rojo') return -1;
      if (b.semaforo === 'rojo' && a.semaforo !== 'rojo') return 1;
      return a.coberturaDias - b.coberturaDias;
    });
  }

  private buildCharts(): void {
    const rows = this.filteredRows;
    const textColor = '#374151';
    const gridColor = 'rgba(148,163,184,0.2)';

    this.buildTimeSeriesChart(rows, textColor, gridColor);
    this.buildTopGastoChart(rows, textColor, gridColor);
    this.buildTopVolumenChart(rows, textColor, gridColor);
    this.buildTreemapChart(rows, textColor);
  }

  private buildTimeSeriesChart(rows: Record<string, any>[], textColor: string, gridColor: string): void {
    const labels = this.getTimeLabels();
    const mapGasto: Record<string, number> = {};
    const mapConsumo: Record<string, number> = {};
    for (const l of labels) { mapGasto[l] = 0; mapConsumo[l] = 0; }

    for (const r of rows) {
      if (Number(r['tipo_id']) !== 2) continue;
      const f = this.parseAnyDate(r['fecha']);
      if (!f) continue;
      const key = this.getTimeBucket(f);
      if (!(key in mapGasto)) continue;
      mapGasto[key] += Number(r['total']) || 0;
      mapConsumo[key] += Number(r['cantidad']) || 0;
    }

    this.chartTimeSeries = {
      title: '',
      type: 'line',
      data: {
        labels: labels.map(l => this.formatLabel(l)),
        datasets: [
          { label: 'Gasto ($)', data: labels.map(l => mapGasto[l] || 0), borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,.1)', tension: 0.35, fill: true, yAxisID: 'y' },
          { label: 'Consumo (unid.)', data: labels.map(l => mapConsumo[l] || 0), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,.1)', tension: 0.35, fill: true, yAxisID: 'y1' }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top', labels: { color: textColor } } },
        scales: {
          x: { ticks: { color: textColor }, grid: { color: gridColor }, border: { display: false } },
          y: { type: 'linear', position: 'left', ticks: { color: '#8b5cf6' }, grid: { color: gridColor }, border: { display: false } },
          y1: { type: 'linear', position: 'right', ticks: { color: '#22c55e' }, grid: { display: false }, border: { display: false } }
        }
      }
    };
  }

  private getTimeLabels(): string[] {
    const days = this.bookmarkDays > 0 ? this.bookmarkDays : 90;
    const today = new Date();
    const labels: string[] = [];

    if (this.granularity === 'day') {
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        labels.push(this.toISODate(d));
      }
    } else if (this.granularity === 'week') {
      const weeks = Math.ceil(days / 7);
      for (let i = weeks - 1; i >= 0; i--) {
        const d = new Date(today); d.setDate(d.getDate() - i * 7);
        labels.push(this.toISOWeek(d));
      }
    } else {
      const months = Math.ceil(days / 30);
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(today); d.setMonth(d.getMonth() - i);
        labels.push(this.toISOMonth(d));
      }
    }
    return labels;
  }

  private getTimeBucket(d: Date): string {
    if (this.granularity === 'day') return this.toISODate(d);
    if (this.granularity === 'week') return this.toISOWeek(d);
    return this.toISOMonth(d);
  }

  private formatLabel(l: string): string {
    if (this.granularity === 'day') return l.slice(5);
    return l;
  }

  private toISOWeek(d: Date): string {
    const start = new Date(d); start.setDate(start.getDate() - start.getDay());
    return `W${this.toISODate(start).slice(5)}`;
  }

  private toISOMonth(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private buildTopGastoChart(rows: Record<string, any>[], textColor: string, gridColor: string): void {
    const byProd = this.groupSum(
      rows.filter(r => Number(r['tipo_id']) === 2),
      r => this.asKey(r['producto_nombre']) || 'Sin producto',
      r => Number(r['total']) || 0
    );
    const top = this.topKeys(byProd, 10);

    this.chartTopGasto = {
      title: 'Top 10 Productos por Gasto ($)',
      type: 'bar',
      data: {
        labels: top,
        datasets: [{ label: 'Gasto', data: top.map(p => byProd[p] || 0), backgroundColor: '#8b5cf6', borderRadius: 6 }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: textColor }, grid: { color: gridColor }, border: { display: false } },
          y: { ticks: { color: textColor }, grid: { display: false }, border: { display: false } }
        }
      }
    };
  }

  private buildTopVolumenChart(rows: Record<string, any>[], textColor: string, gridColor: string): void {
    const byProd = this.groupSum(
      rows.filter(r => Number(r['tipo_id']) === 2),
      r => this.asKey(r['producto_nombre']) || 'Sin producto',
      r => Number(r['cantidad']) || 0
    );
    const top = this.topKeys(byProd, 10);

    this.chartTopVolumen = {
      title: 'Top 10 Productos por Volumen (unid.)',
      type: 'bar',
      data: {
        labels: top,
        datasets: [{ label: 'Unidades', data: top.map(p => byProd[p] || 0), backgroundColor: '#22c55e', borderRadius: 6 }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: textColor }, grid: { color: gridColor }, border: { display: false } },
          y: { ticks: { color: textColor }, grid: { display: false }, border: { display: false } }
        }
      }
    };
  }

  private buildTreemapChart(rows: Record<string, any>[], textColor: string): void {
    const byCat = this.groupSum(
      rows.filter(r => Number(r['tipo_id']) === 2),
      r => this.asStr(r['categoria_nombre']) || 'Sin categoría',
      r => Number(r['total']) || 0
    );
    const cats = this.topKeys(byCat, 8);
    const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6', '#ec4899', '#14b8a6'];

    this.chartTreemap = {
      title: 'Gasto por Categoría',
      type: 'doughnut',
      data: {
        labels: cats,
        datasets: [{ data: cats.map(c => byCat[c] || 0), backgroundColor: cats.map((_, i) => colors[i % colors.length]), borderWidth: 0 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { color: textColor } } }
      }
    };
  }

  private emptyChart(type: keyof ChartTypeRegistry): { title: string; type: keyof ChartTypeRegistry; data: ChartData<keyof ChartTypeRegistry, number[], string>; options: ChartOptions<keyof ChartTypeRegistry> } {
    return { title: '', type, data: { labels: [], datasets: [] }, options: { responsive: true, maintainAspectRatio: false } };
  }

  private groupSum<T>(rows: T[], keyFn: (r: T) => string, valFn: (r: T) => number): Record<string, number> {
    const out: Record<string, number> = {};
    for (const r of rows) {
      const k = keyFn(r) || 'Sin dato';
      out[k] = (out[k] || 0) + (valFn(r) || 0);
    }
    return out;
  }

  private uniqStr(arr: string[]): string[] {
    return Array.from(new Set(arr.map(s => (s || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }

  private asStr(v: any): string {
    return v === null || v === undefined ? '' : String(v);
  }

  private asKey(v: any): string {
    return this.asStr(v).trim();
  }

  private parseAnyDate(v: any): Date | null {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    const s = String(v);
    const iso = new Date(s);
    if (!isNaN(iso.getTime())) return iso;
    return null;
  }

  private toISODate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private topKeys(a: Record<string, number>, top: number): string[] {
    return Object.entries(a)
      .sort((x, y) => (y[1] || 0) - (x[1] || 0))
      .slice(0, top)
      .map(x => x[0]);
  }
}
