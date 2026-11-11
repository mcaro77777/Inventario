// ======================== AlertTableComponent ========================
// Tabla de alertas con semáforo para productos en riesgo
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';

export interface AlertRow {
  producto: string;
  productoId?: number;
  categoria: string;
  stockDisponible: number;
  stockMinimo: number;
  reservado: number;
  consumoDiario: number;
  coberturaDias: number;
  semaforo: 'red' | 'amber' | 'green';
  semaforoTip: string;
}

@Component({
  selector: 'app-alert-table',
  standalone: true,
  imports: [CommonModule, TableModule, TooltipModule],
  template: `
    <div class="alert-table-container">
      <div class="table-header">
        <h3><i class="pi pi-exclamation-triangle"></i> {{ title }}</h3>
        <span class="badge" [class]="badgeClass">{{ rows.length }} productos</span>
      </div>
      <p-table [value]="rows" [paginator]="rows.length > 10" [rows]="10"
               styleClass="p-datatable-sm p-datatable-striped"
               [scrollable]="true" scrollHeight="400px">
        <ng-template pTemplate="header">
          <tr>
            <th style="width:40px"></th>
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
          <tr class="clickable-row" (click)="onRowClick(row)">
            <td>
              <span class="semaforo" [class]="'semaforo-' + row.semaforo" [pTooltip]="row.semaforoTip"></span>
            </td>
            <td>{{ row.producto }}</td>
            <td>{{ row.categoria }}</td>
            <td style="text-align:right">{{ row.stockDisponible | number:'1.0-0' }}</td>
            <td style="text-align:right">{{ row.stockMinimo | number:'1.0-0' }}</td>
            <td style="text-align:right">{{ row.reservado | number:'1.0-0' }}</td>
            <td style="text-align:right">{{ row.consumoDiario | number:'1.1-1' }}</td>
            <td style="text-align:right">
              <span [class.text-danger]="row.coberturaDias < 7" [class.text-warning]="row.coberturaDias >= 7 && row.coberturaDias < 14">
                {{ row.coberturaDias | number:'1.0-0' }} días
              </span>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8" class="text-center text-muted">Sin alertas</td></tr>
        </ng-template>
      </p-table>
    </div>
  `,
  styles: [`
    .alert-table-container {
      background: var(--surface-card);
      border-radius: 12px;
      border: 1px solid var(--surface-border);
      overflow: hidden;
    }
    .table-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      border-bottom: 1px solid var(--surface-border);
    }
    .table-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge.badge-danger { background: rgba(239,68,68,0.15); color: #ef4444; }
    .badge.badge-warning { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .badge.badge-success { background: rgba(34,197,94,0.15); color: #22c55e; }
    .semaforo {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .semaforo-red { background: #ef4444; box-shadow: 0 0 6px #ef4444; }
    .semaforo-amber { background: #f59e0b; box-shadow: 0 0 6px #f59e0b; }
    .semaforo-green { background: #22c55e; box-shadow: 0 0 6px #22c55e; }
    .clickable-row { cursor: pointer; }
    .clickable-row:hover { background: var(--surface-hover) !important; }
    .text-danger { color: #ef4444; font-weight: 600; }
    .text-warning { color: #f59e0b; font-weight: 600; }
    .text-center { text-align: center; }
    .text-muted { opacity: 0.6; }
  `]
})
export class AlertTableComponent {
  @Input() title = 'Alertas de Stock';
  @Input() rows: AlertRow[] = [];
  @Output() rowClicked = new EventEmitter<AlertRow>();

  get badgeClass(): string {
    const redCount = this.rows.filter(r => r.semaforo === 'red').length;
    const amberCount = this.rows.filter(r => r.semaforo === 'amber').length;
    if (redCount > 0) return 'badge-danger';
    if (amberCount > 0) return 'badge-warning';
    return 'badge-success';
  }

  onRowClick(row: AlertRow): void {
    this.rowClicked.emit(row);
  }
}
