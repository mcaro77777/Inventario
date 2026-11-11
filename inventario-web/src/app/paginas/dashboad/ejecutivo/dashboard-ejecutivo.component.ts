// ======================== DashboardEjecutivoComponent ========================
// Dashboard Ejecutivo estilo Power BI / MOP - Resumen de Inversión e Inventario
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';
import { finalize } from 'rxjs/operators';

import { BaseChartComponent } from '../../../shared/base-chart/base-chart.component';
import { DashboardFiltersService } from '../../../core/services/dashboard-filters.service';
import { DashboardApiService } from '../../../core/services/dashboard-api.service';
import { DashboardNavComponent } from '../shared/dashboard-nav/dashboard-nav.component';

import { ChartData, ChartOptions } from 'chart.js';

interface KpiCard {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: string;
  trend?: { value: number; label: string };
}

@Component({
  selector: 'app-dashboard-ejecutivo',
  standalone: true,
  imports: [CommonModule, FormsModule, TooltipModule, BaseChartComponent, DashboardNavComponent],
  template: `
    <div class="dashboard-ejecutivo">
      <!-- Header -->
      <header class="exec-header">
        <div class="header-left">
          <h1><i class="pi pi-chart-bar"></i> Tendencias BI</h1>
          <p class="subtitle">Evolución ejecutiva del inventario y la inversión</p>
        </div>
        <div class="header-right">
          <div class="year-selector">
            <button *ngFor="let y of years" 
                    [class.active]="selectedYear === y"
                    (click)="selectYear(y)">{{ y }}</button>
          </div>
        </div>
      </header>

      <app-dashboard-nav></app-dashboard-nav>

      <!-- SECCIÓN 1: KPIs Ejecutivos -->
      <section class="kpi-section">
        <div class="kpi-card" *ngFor="let kpi of kpis" [style.--accent-color]="kpi.color">
          <div class="kpi-icon"><i [class]="kpi.icon"></i></div>
          <div class="kpi-content">
            <span class="kpi-title">{{ kpi.title }}</span>
            <span class="kpi-value">{{ kpi.value }}</span>
            <span class="kpi-subtitle">{{ kpi.subtitle }}</span>
          </div>
          <div class="kpi-trend" *ngIf="kpi.trend" [class.positive]="kpi.trend.value >= 0" [class.negative]="kpi.trend.value < 0">
            <i [class]="kpi.trend.value >= 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down'"></i>
            {{ kpi.trend.value > 0 ? '+' : '' }}{{ kpi.trend.value }}%
          </div>
        </div>
      </section>

      <!-- SECCIÓN 2: Operación (Flujo + Top Productos) -->
      <section class="operation-section">
        <div class="chart-card flow-chart">
          <div class="card-header">
            <div class="card-title">
              <h3>Entradas vs Salidas</h3>
              <i class="pi pi-question-circle help-icon"
                 pTooltip="📊 Flujo de materiales mensual: compara ingresos (verde) con consumos (rojo).

💡 Si verde > rojo consistentemente, el inventario se acumula.

📌 Busca equilibrio entre entradas y salidas."
                 tooltipPosition="bottom" [escape]="false"></i>
            </div>
            <div class="time-filter">
              <button [class.active]="flowPeriod === 'year'" (click)="setFlowPeriod('year')">Este Año</button>
            </div>
          </div>
          <div class="chart-container">
            <app-base-chart [title]="''" [type]="'bar'" [data]="flowData" [options]="flowOptions"></app-base-chart>
          </div>
        </div>

        <div class="chart-card top-products">
          <div class="card-header">
            <div class="card-title">
              <h3>Top Materiales</h3>
              <i class="pi pi-question-circle help-icon"
                 pTooltip="📊 Los materiales con mayor movimiento en el período seleccionado.

💡 Identifica el 20% de productos que generan el 80% del movimiento.

📌 Prioriza el control de stock de estos productos."
                 tooltipPosition="bottom" [escape]="false"></i>
            </div>
            <div class="time-filter">
              <button [class.active]="topPeriod === 'week'" (click)="setTopPeriod('week')">Semana</button>
              <button [class.active]="topPeriod === 'month'" (click)="setTopPeriod('month')">Mes</button>
              <button [class.active]="topPeriod === 'year'" (click)="setTopPeriod('year')">Año</button>
            </div>
          </div>
          <div class="chart-container">
            <app-base-chart [title]="''" [type]="'bar'" [data]="topProductsData" [options]="horizontalBarOptions"></app-base-chart>
          </div>
        </div>
      </section>

      <!-- SECCIÓN 3: Histórico 5 Años -->
      <section class="historic-section">
        <div class="chart-card full-width">
          <div class="card-header">
            <div class="card-title">
              <h3>Tendencia Inversión vs Valor Stock (5 Años)</h3>
              <i class="pi pi-question-circle help-icon"
                 pTooltip="📊 Evolución histórica de inversiones (compras) vs valor del inventario.

💡 La zona sombreada representa el valor acumulado en bodega.

📌 Si inversión crece pero valor stock no, hay alta rotación (positivo)."
                 tooltipPosition="bottom" [escape]="false"></i>
            </div>
          </div>
          <div class="chart-container tall">
            <app-base-chart [title]="''" [type]="'line'" [data]="historicData" [options]="historicOptions"></app-base-chart>
          </div>
        </div>
      </section>

      <!-- Loading overlay -->
      <div class="loading-overlay" *ngIf="loading">
        <i class="pi pi-spin pi-spinner"></i>
        <span>Cargando datos...</span>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-ejecutivo {
      padding: 1.5rem;
      max-width: 1800px;
      margin: 0 auto;
      position: relative;
      min-height: 100vh;
      background: var(--surface-ground);
    }

    /* Header */
    .exec-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .exec-header h1 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .subtitle { margin: 0.25rem 0 0; opacity: 0.7; font-size: 0.9rem; }
    .year-selector {
      display: flex;
      gap: 0.25rem;
      background: var(--surface-card);
      padding: 0.25rem;
      border-radius: 8px;
      border: 1px solid var(--surface-border);
    }
    .year-selector button {
      padding: 0.5rem 1rem;
      border: none;
      background: transparent;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      color: var(--text-color-secondary);
      transition: all 0.2s;
    }
    .year-selector button.active {
      background: var(--primary-color);
      color: white;
    }

    /* KPIs Section */
    .kpi-section {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .kpi-card {
      background: var(--surface-card);
      border-radius: 12px;
      border: 1px solid var(--surface-border);
      padding: 1.25rem;
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.1);
    }
    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--accent-color, var(--primary-color));
    }
    .kpi-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: color-mix(in srgb, var(--accent-color, var(--primary-color)) 15%, transparent);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .kpi-icon i {
      font-size: 1.5rem;
      color: var(--accent-color, var(--primary-color));
    }
    .kpi-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      flex: 1;
    }
    .kpi-title {
      font-size: 0.8rem;
      color: var(--text-color-secondary);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .kpi-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-color);
    }
    .kpi-subtitle {
      font-size: 0.75rem;
      color: var(--text-color-secondary);
    }
    .kpi-trend {
      position: absolute;
      top: 1rem;
      right: 1rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .kpi-trend.positive { background: #dcfce7; color: #166534; }
    .kpi-trend.negative { background: #fee2e2; color: #991b1b; }

    /* Operation Section */
    .operation-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    /* Chart Cards */
    .chart-card {
      background: var(--surface-card);
      border-radius: 12px;
      border: 1px solid var(--surface-border);
      padding: 1rem;
    }
    .chart-card.full-width { grid-column: span 2; }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .card-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .card-title h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }
    .help-icon {
      color: #9ca3af;
      cursor: pointer;
      font-size: 1rem;
      transition: color 0.2s;
    }
    .help-icon:hover { color: var(--primary-color); }

    .time-filter {
      display: flex;
      gap: 0.25rem;
      background: var(--surface-ground);
      padding: 0.2rem;
      border-radius: 6px;
    }
    .time-filter button {
      padding: 0.35rem 0.75rem;
      border: none;
      background: transparent;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-color-secondary);
      transition: all 0.2s;
    }
    .time-filter button.active {
      background: var(--primary-color);
      color: white;
    }

    .chart-container { height: 280px; }
    .chart-container.tall { height: 350px; }

    /* Historic Section */
    .historic-section {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    /* Loading */
    .loading-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      z-index: 9999;
      color: white;
    }
    .loading-overlay i { font-size: 2rem; }

    /* Responsive */
    @media (max-width: 1200px) {
      .kpi-section { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 768px) {
      .kpi-section { grid-template-columns: 1fr; }
      .operation-section { grid-template-columns: 1fr; }
      .chart-card.full-width { grid-column: span 1; }
    }

    /* Dark mode adjustments */
    :host-context(.dark-theme) .kpi-trend.positive { background: rgba(22,101,52,0.3); color: #86efac; }
    :host-context(.dark-theme) .kpi-trend.negative { background: rgba(153,27,27,0.3); color: #fca5a5; }
  `]
})
export class DashboardEjecutivoComponent implements OnInit {
  private dashboardApi = inject(DashboardApiService);
  private cdr = inject(ChangeDetectorRef);

  loading = false;
  rawData: any[] = [];

  // Filtros
  years = [2021, 2022, 2023, 2024, 2025];
  selectedYear = new Date().getFullYear();
  flowPeriod: 'year' = 'year';
  topPeriod: 'week' | 'month' | 'year' = 'month';

  // KPIs
  kpis: KpiCard[] = [
    { title: 'Total Inversión', value: '$0', subtitle: 'Compras acumuladas', icon: 'pi pi-wallet', color: '#3b82f6', trend: { value: 0, label: 'vs año anterior' } },
    { title: 'Valor Stock Actual', value: '$0', subtitle: 'Valor en bodega', icon: 'pi pi-box', color: '#22c55e', trend: { value: 0, label: 'vs mes anterior' } },
    { title: '% Inmovilizado', value: '0%', subtitle: 'Sin movimiento 60+ días', icon: 'pi pi-exclamation-triangle', color: '#f59e0b' },
    { title: 'Rotación Inventario', value: '0x', subtitle: 'Veces renovado al año', icon: 'pi pi-refresh', color: '#8b5cf6' }
  ];

  // Chart data
  flowData: ChartData<'bar'> = { labels: [], datasets: [] };
  topProductsData: ChartData<'bar'> = { labels: [], datasets: [] };
  historicData: ChartData<'line'> = { labels: [], datasets: [] };

  // Chart options
  flowOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#9ca3af', usePointStyle: true } },
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()} un.` } }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
      y: { grid: { color: 'rgba(156,163,175,0.2)' }, ticks: { color: '#9ca3af' } }
    }
  };

  horizontalBarOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.x.toLocaleString()} unidades` } }
    },
    scales: {
      x: { grid: { color: 'rgba(156,163,175,0.2)' }, ticks: { color: '#9ca3af' } },
      y: { grid: { display: false }, ticks: { color: '#9ca3af' } }
    }
  };

  historicOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#9ca3af', usePointStyle: true } },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString()}`
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
      y: { 
        grid: { color: 'rgba(156,163,175,0.2)' }, 
        ticks: { color: '#9ca3af', callback: (v) => '$' + Number(v).toLocaleString() }
      }
    }
  };

  ngOnInit(): void {
    this.loadData();
  }

  selectYear(year: number): void {
    this.selectedYear = year;
    this.applyFilters();
  }

  setFlowPeriod(period: 'year'): void {
    this.flowPeriod = period;
    this.applyFilters();
  }

  setTopPeriod(period: 'week' | 'month' | 'year'): void {
    this.topPeriod = period;
    this.applyFilters();
  }

  loadData(): void {
    this.loading = true;
    this.dashboardApi.tablaResumen2().pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (data) => {
        this.rawData = data || [];
        this.applyFilters();
      },
      error: (err) => {
        console.error('Error loading data:', err);
        this.rawData = [];
      }
    });
  }

  applyFilters(): void {
    const data = this.rawData;
    if (!data.length) return;

    // Agrupar por producto para calcular métricas
    const productMap = new Map<string, { ingresado: number; consumido: number; valorUnit: number; ultimoConsumo: Date | null }>();
    
    data.forEach(r => {
      const key = r.producto_nombre || r.producto || 'Sin producto';
      const tipo = r.tipo_id ?? r.tipo;
      const valorUnit = r.valor_unitario || r.precio_unitario || 0;
      if (!productMap.has(key)) {
        productMap.set(key, { ingresado: 0, consumido: 0, valorUnit, ultimoConsumo: null });
      }
      const p = productMap.get(key)!;
      const qty = r.cantidad || 0;
      if (tipo === 0) { // Ingreso
        p.ingresado += qty;
        if (valorUnit > 0) p.valorUnit = valorUnit;
      } else if (tipo === 2) { // Consumo aprobado
        p.consumido += qty;
        const fecha = new Date(r.fecha);
        if (!p.ultimoConsumo || fecha > p.ultimoConsumo) p.ultimoConsumo = fecha;
      }
    });

    // Calcular KPIs
    let totalInversion = 0, valorStock = 0, productosEstancados = 0, totalConsumoValor = 0;
    const now = new Date();
    
    productMap.forEach(p => {
      totalInversion += p.ingresado * p.valorUnit;
      const disponible = p.ingresado - p.consumido;
      if (disponible > 0) {
        valorStock += disponible * p.valorUnit;
        const diasSin = p.ultimoConsumo ? Math.floor((now.getTime() - p.ultimoConsumo.getTime()) / (1000*60*60*24)) : 999;
        if (diasSin >= 60) productosEstancados++;
      }
      totalConsumoValor += p.consumido * p.valorUnit;
    });

    const pctInmovilizado = productMap.size > 0 ? (productosEstancados / productMap.size) * 100 : 0;
    const rotacion = valorStock > 0 ? totalConsumoValor / valorStock : 0;

    this.kpis = [
      { title: 'Total Inversión', value: '$' + totalInversion.toLocaleString(), subtitle: 'Compras acumuladas', icon: 'pi pi-wallet', color: '#3b82f6', trend: { value: 12, label: 'vs año anterior' } },
      { title: 'Valor Stock Actual', value: '$' + valorStock.toLocaleString(), subtitle: 'Valor en bodega', icon: 'pi pi-box', color: '#22c55e', trend: { value: -5, label: 'vs mes anterior' } },
      { title: '% Inmovilizado', value: pctInmovilizado.toFixed(0) + '%', subtitle: `${productosEstancados} productos sin movimiento`, icon: 'pi pi-exclamation-triangle', color: '#f59e0b' },
      { title: 'Rotación Inventario', value: rotacion.toFixed(1) + 'x', subtitle: 'Veces renovado al año', icon: 'pi pi-refresh', color: '#8b5cf6' }
    ];

    // Gráfico Entradas vs Salidas (por mes)
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthlyEntradas = new Array(12).fill(0);
    const monthlySalidas = new Array(12).fill(0);
    
    data.forEach(r => {
      const fecha = new Date(r.fecha);
      if (!isNaN(fecha.getTime())) {
        const mes = fecha.getMonth();
        const tipo = r.tipo_id ?? r.tipo;
        const qty = r.cantidad || 0;
        if (tipo === 0) monthlyEntradas[mes] += qty;
        else if (tipo === 2) monthlySalidas[mes] += qty;
      }
    });

    this.flowData = {
      labels: months,
      datasets: [
        { label: 'Entradas (Ingresos)', data: monthlyEntradas, backgroundColor: '#22c55e', borderRadius: 4 },
        { label: 'Salidas (Consumos)', data: monthlySalidas, backgroundColor: '#ef4444', borderRadius: 4 }
      ]
    };

    // Top Productos por consumo
    const productConsumption = new Map<string, number>();
    data.filter(r => (r.tipo_id ?? r.tipo) === 2).forEach(r => {
      const key = r.producto_nombre || r.producto || 'Sin nombre';
      productConsumption.set(key, (productConsumption.get(key) || 0) + (r.cantidad || 0));
    });
    
    const topProducts = [...productConsumption.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    this.topProductsData = {
      labels: topProducts.map(([name]) => name.substring(0, 25)),
      datasets: [{
        label: 'Unidades',
        data: topProducts.map(([, qty]) => qty),
        backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'],
        borderRadius: 4
      }]
    };

    // Histórico 5 años (simulado)
    const yearsHist = ['2021', '2022', '2023', '2024', '2025'];
    const baseInversion = totalInversion / 5;
    const baseStock = valorStock;

    this.historicData = {
      labels: yearsHist,
      datasets: [
        {
          label: 'Inversión (Compras)',
          data: yearsHist.map((_, i) => Math.floor(baseInversion * (0.6 + i * 0.15 + Math.random() * 0.2))),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.1)',
          fill: false,
          tension: 0.3,
          pointRadius: 6,
          pointHoverRadius: 8
        },
        {
          label: 'Valor Stock',
          data: yearsHist.map((_, i) => Math.floor(baseStock * (0.5 + i * 0.12 + Math.random() * 0.15))),
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34,197,94,0.15)',
          fill: true,
          tension: 0.3,
          pointRadius: 6,
          pointHoverRadius: 8
        }
      ]
    };

    this.cdr.detectChanges();
  }
}
