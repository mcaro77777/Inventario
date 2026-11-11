// ======================== KpiCardComponent ========================
// Card reutilizable para KPIs del dashboard
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';

export interface KpiData {
  label: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'gray';
  trend?: string;
  trendPositive?: boolean;
  tooltip?: string;
  // Nuevos campos para Δ y drivers
  deltaAbsolute?: number; // Δ absoluto vs periodo anterior
  deltaPercent?: number;  // Δ % vs periodo anterior
  driver?: string;        // Texto del driver principal (ej: "Subió por: Producto X")
  driverValue?: string;   // Valor del driver (ej: "+$12.000")
}

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule, TooltipModule],
  template: `
    <div class="kpi-card" [class]="'kpi-' + data.color" [pTooltip]="data.tooltip || ''" tooltipPosition="top">
      <div class="kpi-icon">
        <i [class]="data.icon"></i>
      </div>
      <div class="kpi-content">
        <span class="kpi-label">{{ data.label }}</span>
        <span class="kpi-value">{{ data.value }}</span>
        
        <!-- Delta absoluto y % -->
        <div class="kpi-delta" *ngIf="data.deltaAbsolute !== undefined || data.deltaPercent !== undefined">
          <span class="delta-absolute" [class.positive]="(data.deltaAbsolute || 0) > 0" [class.negative]="(data.deltaAbsolute || 0) < 0">
            {{ formatDelta(data.deltaAbsolute) }}
          </span>
          <span class="delta-percent" *ngIf="data.deltaPercent !== undefined" [class.positive]="data.deltaPercent > 0" [class.negative]="data.deltaPercent < 0">
            ({{ data.deltaPercent > 0 ? '+' : '' }}{{ data.deltaPercent | number:'1.1-1' }}%)
          </span>
        </div>
        
        <!-- Driver -->
        <div class="kpi-driver" *ngIf="data.driver">
          <span class="driver-text">{{ data.driver }}</span>
          <span class="driver-value" *ngIf="data.driverValue">{{ data.driverValue }}</span>
        </div>
        
        <!-- Trend legacy -->
        <span *ngIf="data.trend && !data.deltaAbsolute" class="kpi-trend" [class.positive]="data.trendPositive" [class.negative]="!data.trendPositive">
          {{ data.trend }}
        </span>
      </div>
    </div>
  `,
  styles: [`
    .kpi-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      border-radius: 12px;
      background: var(--surface-card);
      border: 1px solid var(--surface-border);
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
    }
    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .kpi-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }
    .kpi-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .kpi-label {
      font-size: 0.85rem;
      opacity: 0.7;
      font-weight: 500;
    }
    .kpi-value {
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1.2;
    }
    .kpi-trend {
      font-size: 0.8rem;
      font-weight: 600;
    }
    .kpi-trend.positive { color: #22c55e; }
    .kpi-trend.negative { color: #ef4444; }

    /* Delta */
    .kpi-delta {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .delta-absolute.positive, .delta-percent.positive { color: #22c55e; }
    .delta-absolute.negative, .delta-percent.negative { color: #ef4444; }
    .delta-percent { opacity: 0.8; }

    /* Driver */
    .kpi-driver {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.7rem;
      color: var(--text-color-secondary);
      margin-top: 0.25rem;
      cursor: pointer;
    }
    .kpi-driver:hover {
      color: var(--primary-color);
    }
    .driver-value {
      font-weight: 600;
      color: var(--primary-color);
    }

    /* Colores */
    .kpi-blue .kpi-icon { background: rgba(59,130,246,0.15); color: #3b82f6; }
    .kpi-green .kpi-icon { background: rgba(34,197,94,0.15); color: #22c55e; }
    .kpi-amber .kpi-icon { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .kpi-red .kpi-icon { background: rgba(239,68,68,0.15); color: #ef4444; }
    .kpi-purple .kpi-icon { background: rgba(168,85,247,0.15); color: #a855f7; }
    .kpi-gray .kpi-icon { background: rgba(107,114,128,0.15); color: #6b7280; }
  `]
})
export class KpiCardComponent {
  @Input() data!: KpiData;

  formatDelta(value: number | undefined): string {
    if (value === undefined || value === 0) return '—';
    const prefix = value > 0 ? '+' : '';
    if (Math.abs(value) >= 1000000) {
      return `${prefix}${(value / 1000000).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1000) {
      return `${prefix}${(value / 1000).toFixed(1)}K`;
    }
    return `${prefix}${value.toLocaleString()}`;
  }
}
