// ======================== DashboardResumenComponent ========================
// Página A: Resumen Ejecutivo - KPIs, gráficos principales, alertas
import { Component, OnInit, inject, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { KpiCardComponent, KpiData } from '../shared/kpi-card/kpi-card.component';
import { FilterBarComponent } from '../shared/filter-bar/filter-bar.component';
import { AlertTableComponent, AlertRow } from '../shared/alert-table/alert-table.component';
import { DashboardNavComponent } from '../shared/dashboard-nav/dashboard-nav.component';
import { BaseChartComponent, ChartClickEvent } from '../../../shared/base-chart/base-chart.component';
import { DashboardFiltersService } from '../../../core/services/dashboard-filters.service';
import { DashboardApiService } from '../../../core/services/dashboard-api.service';

import { ChartData, ChartOptions } from 'chart.js';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-dashboard-resumen',
  standalone: true,
  imports: [CommonModule, KpiCardComponent, FilterBarComponent, AlertTableComponent, BaseChartComponent, DashboardNavComponent, TooltipModule],
  template: `
    <div class="dashboard-page">
      <!-- Header -->
      <header class="page-header">
        <div>
          <span class="eyebrow">ANÁLISIS AVANZADO</span>
          <h1>Panorama del inventario</h1>
          <p class="subtitle">Explora tendencias, costos, riesgos y comportamiento operacional</p>
        </div>
      </header>

      <!-- Navegación tabs -->
      <app-dashboard-nav></app-dashboard-nav>

      <!-- Filtros globales -->
      <app-filter-bar></app-filter-bar>

      <!-- KPIs -->
      <section class="kpi-grid">
        <app-kpi-card *ngFor="let kpi of kpis" [data]="kpi" (click)="onKpiClick(kpi)"></app-kpi-card>
      </section>

      <!-- Gráficos principales -->
      <section class="charts-grid">
        <!-- Gráfico temporal: Ingresos vs Consumos -->
        <div class="chart-card chart-wide">
          <div class="chart-header">
            <div class="chart-title">
              <h3>Ingresos vs Consumos en el Tiempo</h3>
              <i class="pi pi-question-circle help-icon" 
                 pTooltip="📊 ¿Qué muestra? Compara lo que ENTRA a bodega (compras) vs lo que SALE (consumo interno).

💡 ¿Para qué sirve? Detectar si estás consumiendo más de lo que compras (stock bajará) o viceversa.

📌 Ejemplo: Si las barras rojas (consumo) son consistentemente mayores que las azules (ingreso), necesitas aumentar las compras o el stock se agotará."
                 tooltipPosition="bottom" [escape]="false"></i>
            </div>
            <div class="granularity-selector">
              <button *ngFor="let g of granularidades" 
                      [class.active]="granularidad === g.value"
                      (click)="setGranularidad(g.value)">{{ g.label }}</button>
            </div>
          </div>
          <app-base-chart [title]="''" [type]="'bar'" [data]="timeSeriesData" [options]="timeSeriesOptions"></app-base-chart>
        </div>

        <!-- Top 10 por Gasto -->
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">
              <h3>Top 10 Productos por Gasto ($)</h3>
              <i class="pi pi-question-circle help-icon"
                 pTooltip="📊 ¿Qué muestra? Los 10 productos en los que más DINERO se ha gastado en el período.

💡 ¿Para qué sirve? Identificar dónde se concentra el presupuesto y buscar alternativas más económicas.

📌 Ejemplo: Si 'Filtro de aceite' aparece primero con $500.000, evalúa si hay proveedores más baratos o si se está usando de más."
                 tooltipPosition="bottom" [escape]="false"></i>
            </div>
          </div>
          <app-base-chart [title]="''" [type]="'bar'" [data]="topGastoData" [options]="horizontalBarOptions"></app-base-chart>
        </div>

        <!-- Top 10 por Volumen -->
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">
              <h3>Top 10 Productos por Volumen</h3>
              <i class="pi pi-question-circle help-icon"
                 pTooltip="📊 ¿Qué muestra? Los 10 productos más SOLICITADOS en cantidad de unidades.

💡 ¿Para qué sirve? Saber qué productos tienen mayor demanda para asegurar stock suficiente.

📌 Ejemplo: Si 'Guantes de seguridad' lidera con 500 unidades, asegúrate de tener stock de reserva porque se piden mucho."
                 tooltipPosition="bottom" [escape]="false"></i>
            </div>
          </div>
          <app-base-chart [title]="''" [type]="'bar'" [data]="topVolumenData" [options]="horizontalBarOptions"></app-base-chart>
        </div>

        <!-- Barras por Categoría (click para filtrar) -->
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">
              <h3>Gasto por Categoría</h3>
              <i class="pi pi-question-circle help-icon"
                 pTooltip="📊 ¿Qué muestra? Cuánto dinero se gastó en cada categoría de productos.

💡 ¿Para qué sirve? Ver qué áreas consumen más presupuesto. Haz clic en una barra para filtrar todo el dashboard.

📌 Ejemplo: Si 'Repuestos Vehículos' domina el gasto, quizás convenga evaluar si es mejor comprar vehículos nuevos que seguir reparando."
                 tooltipPosition="bottom" [escape]="false"></i>
            </div>
            <span class="chart-hint" *ngIf="!crossFilterCategory">Click en barra para filtrar</span>
            <button class="clear-filter-btn" *ngIf="crossFilterCategory" (click)="clearCrossFilter()">
              <i class="pi pi-times"></i> {{ crossFilterCategory }}
            </button>
          </div>
          <app-base-chart [title]="''" [type]="'bar'" [data]="categoriaData" [options]="horizontalBarOptions"
                          (chartClick)="onCategoriaChartClick($event)"></app-base-chart>
        </div>
      </section>

      <!-- Tabla de Alertas -->
      <section class="alerts-section">
        <div class="alerts-header">
          <span></span>
          <button class="btn-export" (click)="exportToExcel()"><i class="pi pi-file-excel"></i> Exportar Resumen</button>
        </div>
        <app-alert-table [title]="'Productos en Riesgo'" [rows]="alertRows" (rowClicked)="onAlertClick($event)"></app-alert-table>
      </section>

      <!-- Loading overlay -->
      <div class="loading-overlay" *ngIf="loading">
        <i class="pi pi-spin pi-spinner"></i>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-page {
      padding: 1.5rem;
      max-width: 1800px;
      margin: 0 auto;
      position: relative;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .page-header h1 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 700;
    }
    .eyebrow {
      display: block;
      margin-bottom: 0.35rem;
      color: var(--primary-color);
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.09em;
    }
    .subtitle {
      margin: 0.25rem 0 0;
      opacity: 0.7;
      font-size: 0.9rem;
    }
    .header-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .btn-nav {
      padding: 0.5rem 1rem;
      border: 1px solid var(--surface-border);
      background: var(--surface-card);
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s;
    }
    .btn-nav:hover {
      background: var(--primary-color);
      color: white;
      border-color: var(--primary-color);
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(235px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    /* Charts Grid */
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .chart-card {
      background: var(--surface-card);
      border-radius: 12px;
      border: 1px solid var(--surface-border);
      padding: 1rem;
      min-height: 350px;
    }
    .chart-wide {
      grid-column: span 2;
    }
    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .chart-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }
    .chart-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .help-icon {
      color: #9ca3af;
      cursor: pointer;
      font-size: 1rem;
      transition: color 0.2s;
    }
    .help-icon:hover {
      color: var(--primary-color);
    }
    .granularity-selector {
      display: flex;
      gap: 0.25rem;
      background: var(--surface-ground);
      padding: 0.25rem;
      border-radius: 6px;
    }
    .granularity-selector button {
      padding: 0.35rem 0.75rem;
      border: none;
      background: transparent;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
    }
    .granularity-selector button.active {
      background: #3b82f6;
      color: white;
      font-weight: 600;
      box-shadow: 0 2px 4px rgba(59,130,246,0.3);
    }
    .granularity-selector button:hover:not(.active) {
      background: rgba(59,130,246,0.1);
    }

    /* Cross-filter UI */
    .chart-hint {
      font-size: 0.75rem;
      color: var(--text-color-secondary);
      font-style: italic;
    }
    .clear-filter-btn {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      background: var(--primary-color);
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 0.75rem;
      cursor: pointer;
    }
    .clear-filter-btn:hover {
      background: var(--primary-700);
    }

    /* Alerts */
    .alerts-section {
      margin-top: 1.5rem;
    }
    .alerts-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .btn-export {
      padding: 0.4rem 0.75rem;
      border: 1px solid #22c55e;
      background: #22c55e;
      color: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.8rem;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.2s;
    }
    .btn-export:hover { background: #16a34a; }

    /* Loading */
    .loading-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      border-radius: 12px;
    }

    @media (max-width: 1200px) {
      .charts-grid { grid-template-columns: 1fr; }
      .chart-wide { grid-column: span 1; }
    }
    @media (max-width: 768px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .page-header { flex-direction: column; }
    }
  `]
})
export class DashboardResumenComponent implements OnInit {
  private router = inject(Router);
  private filtersService = inject(DashboardFiltersService);
  private dashboardApi = inject(DashboardApiService);

  loading = false;
  rawData: any[] = [];
  crossFilterCategory: string | null = null;

  // KPIs
  kpis: KpiData[] = [];

  // Gráficos
  granularidad: 'dia' | 'semana' | 'mes' | 'anio' = 'dia';
  granularidades = [
    { label: 'Día', value: 'dia' as const },
    { label: 'Semana', value: 'semana' as const },
    { label: 'Mes', value: 'mes' as const },
    { label: 'Año', value: 'anio' as const }
  ];

  timeSeriesData: ChartData<'bar'> = { labels: [], datasets: [] };
  topGastoData: ChartData<'bar'> = { labels: [], datasets: [] };
  topVolumenData: ChartData<'bar'> = { labels: [], datasets: [] };
  categoriaData: ChartData<'doughnut'> = { labels: [], datasets: [] };

  timeSeriesOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: { 
        type: 'linear', position: 'left', 
        title: { display: true, text: 'Valor ($)' },
        ticks: { callback: (v) => '$' + Number(v).toLocaleString() }
      },
      y1: { 
        type: 'linear', position: 'right', 
        title: { display: true, text: 'Unidades' }, 
        grid: { drawOnChartArea: false },
        ticks: { callback: (v) => Number(v).toLocaleString() }
      }
    },
    plugins: { 
      legend: { position: 'top', labels: { color: '#9ca3af' } },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const val = ctx.parsed.y;
            const label = ctx.dataset.label || '';
            if (label.includes('$')) return `${label}: $${val.toLocaleString()}`;
            return `${label}: ${val.toLocaleString()} un.`;
          }
        }
      }
    }
  };

  horizontalBarOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } }
  };

  doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'right', labels: { color: '#9ca3af' } } }
  };

  // Alertas
  alertRows: AlertRow[] = [];

  private cdr = inject(ChangeDetectorRef);

  constructor() {
    // Re-aplicar filtros cuando cambien (sin recargar API)
    effect(() => {
      const filters = this.filtersService.filters();
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
    this.dashboardApi.tablaResumen2().pipe(
      finalize(() => { this.loading = false; this.cdr.markForCheck(); })
    ).subscribe({
      next: (data) => {
        console.log('Dashboard data loaded:', data?.length, 'records');
        this.rawData = data || [];
        this.applyFilters();
        this.cdr.detectChanges();
        // Disparar resize para que Chart.js renderice correctamente
        setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
      },
      error: (err) => {
        console.error('Error loading dashboard data:', err);
        this.rawData = [];
      }
    });
  }

  private applyFilters(): void {
    const filters = this.filtersService.filters();
    const { start, end } = this.filtersService.dateRange();

    console.log('Applying filters:', { bookmark: filters.bookmark, categoriaId: filters.categoriaId, start, end, totalRecords: this.rawData.length });

    let filtered = this.rawData.filter(r => {
      const fecha = new Date(r.fecha);
      if (!isNaN(fecha.getTime()) && (fecha < start || fecha > end)) return false;
      
      // Filtro por categoría (usar nombre porque los IDs del combo son generados)
      if (filters.categoriaNombre) {
        const catNombre = r.categoria_nombre || r.categoria || '';
        if (catNombre.toLowerCase() !== filters.categoriaNombre.toLowerCase()) return false;
      }

      if (filters.productoId && Number(r.id_producto || r.producto_id) !== filters.productoId) return false;
      
      // Filtro por proveedor
      if (filters.proveedorNombre) {
        const provNombre = r.ingreso_proveedor_nombre || r.producto_proveedor_nombre || r.proveedor || '';
        if (provNombre.toLowerCase() !== filters.proveedorNombre.toLowerCase()) return false;
      }
      
      // Filtro por departamento
      if (filters.departamentoNombre) {
        const deptNombre = r.departamento_nombre || r.departamento || '';
        if (deptNombre.toLowerCase() !== filters.departamentoNombre.toLowerCase()) return false;
      }
      
      // Filtro por texto de búsqueda
      const producto = r.producto_nombre || r.producto || '';
      if (filters.searchText && !producto.toLowerCase().includes(filters.searchText.toLowerCase())) return false;
      
      // Cross-filter por categoría (desde click en gráfico)
      if (this.crossFilterCategory) {
        const catNombre = r.categoria_nombre || r.categoria || '';
        if (catNombre.toLowerCase() !== this.crossFilterCategory.toLowerCase()) return false;
      }
      
      return true;
    });

    console.log('Filtered records:', filtered.length);

    this.calculateKpis(filtered);
    this.buildTimeSeriesChart(filtered);
    this.buildTopCharts(filtered);
    this.buildCategoriaChart(filtered);
    this.buildAlertTable(filtered);
  }

  private numero(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private totalMovimiento(row: any): number {
    const total = this.numero(row.total);
    return total !== 0 ? total : this.numero(row.cantidad) * this.numero(row.valor_unitario);
  }

  private calculateKpis(data: any[]): void {
    // Agrupar por producto para calcular stock
    const productMap = new Map<string, { ingresado: number; reservado: number; consumido: number; minimo: number; valorUnitario: number; ultimoConsumo: Date | null }>();

    data.forEach(r => {
      const key = r.producto_nombre || r.producto || 'Sin producto';
      const tipo = r.tipo_id ?? r.tipo;
      const minimo = this.numero(r.producto_stock_minimo ?? r.minimo);
      const valorUnit = this.numero(r.valor_unitario ?? r.precio_unitario);
      if (!productMap.has(key)) {
        productMap.set(key, { ingresado: 0, reservado: 0, consumido: 0, minimo, valorUnitario: valorUnit, ultimoConsumo: null });
      }
      const p = productMap.get(key)!;
      const qty = this.numero(r.cantidad);
      if (tipo === 0) {
        p.ingresado += qty;
        if (valorUnit > 0) p.valorUnitario = valorUnit; // Actualizar precio más reciente
      }
      else if (tipo === 1) p.reservado += qty;  // Pendiente (reserva)
      else if (tipo === 2) {
        p.consumido += qty;  // Aprobado (consumo)
        const fecha = new Date(r.fecha);
        if (!p.ultimoConsumo || fecha > p.ultimoConsumo) p.ultimoConsumo = fecha;
      }
    });

    let stockIngresado = 0, stockReservado = 0, stockConsumido = 0, productosEnRiesgo = 0;
    let valorTotalInventario = 0, valorEstancado = 0, productosEstancados = 0;
    const now = new Date();
    const diasEstancado = 60;

    productMap.forEach(p => {
      stockIngresado += p.ingresado;
      stockReservado += p.reservado;
      stockConsumido += p.consumido;
      const disponible = p.ingresado - p.reservado - p.consumido;
      if (disponible <= p.minimo) productosEnRiesgo++;
      
      // Valor del inventario disponible
      if (disponible > 0) {
        valorTotalInventario += disponible * p.valorUnitario;
        
        // Stock estancado: tiene stock pero sin consumo en 60+ días
        const diasSinConsumo = p.ultimoConsumo ? Math.floor((now.getTime() - p.ultimoConsumo.getTime()) / (1000*60*60*24)) : 999;
        if (diasSinConsumo >= diasEstancado) {
          valorEstancado += disponible * p.valorUnitario;
          productosEstancados++;
        }
      }
    });

    const stockDisponible = stockIngresado - stockReservado - stockConsumido;

    // Gasto total (usar campo 'total' del DTO que ya está calculado)
    const gastoTotal = data.filter(r => (r.tipo_id ?? r.tipo) === 2).reduce((sum, r) => sum + this.totalMovimiento(r), 0);

    // Pendientes actuales
    const pendientes = data.filter(r => (r.tipo_id ?? r.tipo) === 1).length;

    // Calcular variaciones (simplificado - comparar con periodo anterior)
    const { start: prevStart, end: prevEnd } = this.filtersService.previousDateRange();
    const prevData = this.rawData.filter(r => {
      const fecha = new Date(r.fecha);
      return fecha >= prevStart && fecha <= prevEnd;
    });
    const prevConsumo = prevData.filter(r => (r.tipo_id ?? r.tipo) === 2).reduce((s, r) => s + this.numero(r.cantidad), 0);
    const prevGasto = prevData.filter(r => (r.tipo_id ?? r.tipo) === 2).reduce((s, r) => s + this.totalMovimiento(r), 0);

    const consumoVar = prevConsumo > 0 ? ((stockConsumido - prevConsumo) / prevConsumo) * 100 : 0;
    const gastoVar = prevGasto > 0 ? ((gastoTotal - prevGasto) / prevGasto) * 100 : 0;

    const fmt = (n: number) => n.toLocaleString('es-CL');
    const fmtMoney = (n: number) => '$' + n.toLocaleString('es-CL', { maximumFractionDigits: 0 });
    const fmtTrend = (n: number) => (n >= 0 ? '↑' : '↓') + Math.abs(n).toFixed(1) + '%';

    this.kpis = [
      { label: 'Valor Inventario', value: fmtMoney(valorTotalInventario), icon: 'pi pi-database', color: 'blue', tooltip: 'Valor total del stock disponible en bodega' },
      { label: 'Stock Estancado', value: fmtMoney(valorEstancado), icon: 'pi pi-pause-circle', color: 'amber', tooltip: `${productosEstancados} productos sin movimiento en ${diasEstancado}+ días` },
      { label: 'Consumido', value: fmt(stockConsumido), icon: 'pi pi-check-circle', color: 'green', trend: fmtTrend(consumoVar), trendPositive: consumoVar <= 0, tooltip: 'Salidas aprobadas en el periodo' },
      { label: 'Gasto Periodo', value: fmtMoney(gastoTotal), icon: 'pi pi-wallet', color: 'purple', trend: fmtTrend(gastoVar), trendPositive: gastoVar <= 0, tooltip: 'Valor monetario del consumo' },
      { label: 'En Riesgo', value: fmt(productosEnRiesgo), icon: 'pi pi-exclamation-triangle', color: 'red', tooltip: 'Stock disponible <= stock mínimo' },
      { label: 'Pendientes', value: fmt(pendientes), icon: 'pi pi-clock', color: 'gray', tooltip: 'Solicitudes esperando aprobación' }
    ];
  }

  private buildTimeSeriesChart(data: any[]): void {
    // Agrupar por fecha según granularidad: Ingresos vs Consumos
    const ingresoUnidMap = new Map<string, number>();
    const ingresoValorMap = new Map<string, number>();
    const consumoUnidMap = new Map<string, number>();
    const consumoValorMap = new Map<string, number>();

    data.forEach(r => {
      const tipo = r.tipo_id ?? r.tipo;
      if (tipo !== 0 && tipo !== 2) return; // Solo ingresos (0) y consumos aprobados (2)
      const fecha = new Date(r.fecha);
      if (isNaN(fecha.getTime())) return;
      let key: string;
      if (this.granularidad === 'dia') {
        key = fecha.toISOString().split('T')[0];
      } else if (this.granularidad === 'semana') {
        const week = this.getWeekNumber(fecha);
        key = `${fecha.getFullYear()}-S${week}`;
      } else if (this.granularidad === 'mes') {
        key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = `${fecha.getFullYear()}`;
      }

      const cantidad = this.numero(r.cantidad);
      const valor = this.totalMovimiento(r);

      if (tipo === 0) { // Ingreso
        ingresoUnidMap.set(key, (ingresoUnidMap.get(key) || 0) + cantidad);
        ingresoValorMap.set(key, (ingresoValorMap.get(key) || 0) + valor);
      } else { // Consumo aprobado
        consumoUnidMap.set(key, (consumoUnidMap.get(key) || 0) + cantidad);
        consumoValorMap.set(key, (consumoValorMap.get(key) || 0) + valor);
      }
    });

    const allKeys = new Set([...ingresoUnidMap.keys(), ...consumoUnidMap.keys()]);
    const labels = Array.from(allKeys).sort();

    this.timeSeriesData = {
      labels,
      datasets: [
        {
          label: 'Ingreso ($)',
          data: labels.map(l => ingresoValorMap.get(l) || 0),
          backgroundColor: '#3b82f6',
          borderColor: '#2563eb',
          borderWidth: 1,
          borderRadius: 4,
          yAxisID: 'y',
          stack: 'valor'
        },
        {
          label: 'Consumo ($)',
          data: labels.map(l => consumoValorMap.get(l) || 0),
          backgroundColor: '#ef4444',
          borderColor: '#dc2626',
          borderWidth: 1,
          borderRadius: 4,
          yAxisID: 'y',
          stack: 'valor2'
        },
        {
          label: 'Ingreso (un.)',
          data: labels.map(l => ingresoUnidMap.get(l) || 0),
          backgroundColor: 'rgba(59,130,246,0.4)',
          borderColor: '#3b82f6',
          borderWidth: 2,
          borderRadius: 4,
          yAxisID: 'y1',
          stack: 'unid'
        },
        {
          label: 'Consumo (un.)',
          data: labels.map(l => consumoUnidMap.get(l) || 0),
          backgroundColor: 'rgba(239,68,68,0.4)',
          borderColor: '#ef4444',
          borderWidth: 2,
          borderRadius: 4,
          yAxisID: 'y1',
          stack: 'unid2'
        }
      ]
    };
  }

  private buildTopCharts(data: any[]): void {
    // Top 10 por gasto
    const gastoByProd = new Map<string, number>();
    const volumenByProd = new Map<string, number>();

    data.filter(r => (r.tipo_id ?? r.tipo) === 2).forEach(r => {
      const prod = r.producto_nombre || r.producto || 'Sin producto';
      gastoByProd.set(prod, (gastoByProd.get(prod) || 0) + this.totalMovimiento(r));
      volumenByProd.set(prod, (volumenByProd.get(prod) || 0) + this.numero(r.cantidad));
    });

    const topGasto = Array.from(gastoByProd.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const topVolumen = Array.from(volumenByProd.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);

    this.topGastoData = {
      labels: topGasto.map(([k]) => k),
      datasets: [{ data: topGasto.map(([, v]) => v), backgroundColor: '#a855f7' }]
    };

    this.topVolumenData = {
      labels: topVolumen.map(([k]) => k),
      datasets: [{ data: topVolumen.map(([, v]) => v), backgroundColor: '#3b82f6' }]
    };
  }

  private buildCategoriaChart(data: any[]): void {
    const gastoByCat = new Map<string, number>();
    data.filter(r => (r.tipo_id ?? r.tipo) === 2).forEach(r => {
      const cat = r.categoria_nombre || r.categoria || 'Sin categoría';
      gastoByCat.set(cat, (gastoByCat.get(cat) || 0) + this.totalMovimiento(r));
    });

    const sorted = Array.from(gastoByCat.entries()).sort((a, b) => b[1] - a[1]);
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];

    // Top 7 + Otros si hay más de 7 categorías
    let finalData: [string, number][];
    if (sorted.length > 7) {
      const top7 = sorted.slice(0, 7);
      const otros = sorted.slice(7).reduce((sum, [, v]) => sum + v, 0);
      finalData = [...top7, ['Otros', otros]];
    } else {
      finalData = sorted;
    }

    this.categoriaData = {
      labels: finalData.map(([k]) => k),
      datasets: [{
        data: finalData.map(([, v]) => v),
        backgroundColor: finalData.map((_, i) => i === finalData.length - 1 && sorted.length > 7 ? '#94a3b8' : colors[i % colors.length])
      }]
    };
  }

  private buildAlertTable(data: any[]): void {
    const productMap = new Map<string, { cat: string; ingresado: number; reservado: number; consumido: number; minimo: number; dias: number }>();

    data.forEach(r => {
      const key = r.producto_nombre || r.producto || 'Sin producto';
      const tipo = r.tipo_id ?? r.tipo;
      const cat = r.categoria_nombre || r.categoria || '';
      const minimo = r.producto_stock_minimo || r.minimo || 0;
      if (!productMap.has(key)) {
        productMap.set(key, { cat, ingresado: 0, reservado: 0, consumido: 0, minimo, dias: 0 });
      }
      const p = productMap.get(key)!;
      const qty = this.numero(r.cantidad);
      if (tipo === 0) p.ingresado += qty;
      else if (tipo === 1) p.reservado += qty;
      else if (tipo === 2) { p.consumido += qty; p.dias++; }
    });

    this.alertRows = [];
    const { start, end } = this.filtersService.dateRange();
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    productMap.forEach((p, prod) => {
      const disponible = p.ingresado - p.reservado - p.consumido;
      const consumoDiario = p.consumido / totalDays;
      const cobertura = consumoDiario > 0 ? Math.floor(disponible / consumoDiario) : 999;

      let semaforo: 'red' | 'amber' | 'green' = 'green';
      let semaforoTip = 'Stock OK';

      if (disponible <= 0) {
        semaforo = 'red';
        semaforoTip = 'QUIEBRE: Sin stock disponible';
      } else if (disponible <= p.minimo) {
        semaforo = 'red';
        semaforoTip = 'CRÍTICO: Por debajo del mínimo';
      } else if (cobertura < 7) {
        semaforo = 'amber';
        semaforoTip = 'RIESGO: Cobertura < 7 días';
      } else if (p.reservado > disponible * 0.5) {
        semaforo = 'amber';
        semaforoTip = 'ALERTA: Alta reserva pendiente';
      }

      if (semaforo !== 'green') {
        this.alertRows.push({
          producto: prod,
          categoria: p.cat,
          stockDisponible: disponible,
          stockMinimo: p.minimo,
          reservado: p.reservado,
          consumoDiario,
          coberturaDias: cobertura,
          semaforo,
          semaforoTip
        });
      }
    });

    // Ordenar por severidad
    this.alertRows.sort((a, b) => {
      const order = { red: 0, amber: 1, green: 2 };
      return order[a.semaforo] - order[b.semaforo];
    });
  }

  private getWeekNumber(d: Date): number {
    const onejan = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
  }

  setGranularidad(g: 'dia' | 'semana' | 'mes' | 'anio'): void {
    this.granularidad = g;
    this.buildTimeSeriesChart(this.rawData);
  }

  navigateTo(page: string): void {
    this.router.navigate(['/menu', 'dashboard-bi', page]);
  }

  onKpiClick(kpi: KpiData): void {
    if (kpi.label === 'Productos en Riesgo') {
      this.navigateTo('stock-riesgo');
    } else if (kpi.label === 'Pendientes') {
      this.navigateTo('solicitudes');
    }
  }

  onAlertClick(row: AlertRow): void {
    // Navegar al detalle del producto
    this.router.navigate(['/menu', 'dashboard-bi', 'producto', row.producto]);
  }

  // Cross-filter: click en categoría filtra los demás gráficos
  onCategoriaChartClick(event: ChartClickEvent): void {
    if (event.label && event.label !== 'Otros') {
      this.crossFilterCategory = event.label;
      this.applyFilters();
    }
  }

  clearCrossFilter(): void {
    this.crossFilterCategory = null;
    this.applyFilters();
  }

  exportToExcel(): void {
    // Exportar KPIs y alertas
    const lines: string[] = [];
    
    // KPIs
    lines.push('RESUMEN EJECUTIVO');
    lines.push('Fecha de exportación;' + new Date().toLocaleString('es-CL'));
    lines.push('');
    lines.push('INDICADORES CLAVE');
    this.kpis.forEach(k => lines.push(`${k.label};${k.value}`));
    lines.push('');
    
    // Alertas
    lines.push('PRODUCTOS EN RIESGO');
    lines.push('Producto;Categoría;Disponible;Mínimo;Reservado;Cobertura;Estado');
    this.alertRows.forEach(r => {
      const estado = r.semaforo === 'red' ? 'CRÍTICO' : 'ALERTA';
      lines.push(`${r.producto};${r.categoria};${r.stockDisponible};${r.stockMinimo};${r.reservado};${r.coberturaDias || 'N/A'};${estado}`);
    });

    const csvContent = lines.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `resumen_ejecutivo_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  }
}
