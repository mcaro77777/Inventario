import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { Table } from 'primeng/table';
import { DashboardApiService, InventoryDetailRowDto } from '../../../core/services/dashboard-api.service';

@Component({
  standalone: true,
  selector: 'app-valor-inventario-dialog',
  imports: [CommonModule, TableModule, InputTextModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dialog-content">
      <div class="progressbar" *ngIf="isLoading"></div>
      <div class="header-row">
        <h3 class="title">Detalle valor inventario</h3>
        <div class="header-actions">
          <button type="button" class="export-btn" (click)="exportExcel()">Exportar Excel</button>
        </div>
      </div>
      <p class="subtitle" *ngIf="categoriaNombre">Categoría: <strong>{{ categoriaNombre }}</strong></p>

      <p-table #dt [value]="rows" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '680px' }" [paginator]="false" showGridlines>
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="categoria" style="width: 24%">Categoría <p-sortIcon field="categoria"></p-sortIcon></th>
            <th pSortableColumn="nombre" style="width: 36%">Producto <p-sortIcon field="nombre"></p-sortIcon></th>
            <th pSortableColumn="cantidad" style="width: 10%">Cantidad <p-sortIcon field="cantidad"></p-sortIcon></th>
            <th pSortableColumn="precioPromedio" style="width: 15%">Precio Prom. <p-sortIcon field="precioPromedio"></p-sortIcon></th>
            <th pSortableColumn="total" style="width: 15%">Total <p-sortIcon field="total"></p-sortIcon></th>
          </tr>
          <tr>
            <th>
              <input pInputText class="w-full p-inputtext-sm" placeholder="Filtrar categoría"
                     (click)="$event.stopPropagation()"
                     (input)="dt.filter($any($event.target).value, 'categoria', 'contains')" />
            </th>
            <th>
              <input pInputText class="w-full p-inputtext-sm" placeholder="Filtrar producto"
                     (click)="$event.stopPropagation()"
                     (input)="dt.filter($any($event.target).value, 'nombre', 'contains')" />
            </th>
            <th>
              <input pInputText class="w-full p-inputtext-sm" placeholder="Filtrar cantidad"
                     (click)="$event.stopPropagation()"
                     (input)="dt.filter($any($event.target).value, 'cantidad', 'contains')" />
            </th>
            <th>
              <input pInputText class="w-full p-inputtext-sm" placeholder="Filtrar precio"
                     (click)="$event.stopPropagation()"
                     (input)="dt.filter($any($event.target).value, 'precioPromedio', 'contains')" />
            </th>
            <th>
              <input pInputText class="w-full p-inputtext-sm" placeholder="Filtrar total"
                     (click)="$event.stopPropagation()"
                     (input)="dt.filter($any($event.target).value, 'total', 'contains')" />
            </th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-r>
          <tr>
            <td>{{ r.categoria }}</td>
            <td>{{ r.nombre }}</td>
            <td>{{ r.cantidad }}</td>
            <td>{{ r.precioPromedio | number:'1.0-0' }}</td>
            <td>{{ r.total | number:'1.0-0' }}</td>
          </tr>
        </ng-template>
        <ng-template pTemplate="footer">
          <tr>
            <td colspan="2" style="text-align:right"><strong>Total</strong></td>
            <td><strong>{{ totalCantidad }}</strong></td>
            <td></td>
            <td><strong>{{ totalValor | number:'1.0-0' }}</strong></td>
          </tr>
        </ng-template>
      </p-table>

      <div *ngIf="rows.length === 0 && !isLoading" class="empty">No hay datos de valoración.</div>
    </div>
  `,
  styles: [`
    .dialog-content{ padding: 1rem .75rem .75rem; position:relative }
    .header-row{ display:flex; align-items:center; justify-content:space-between; gap:.5rem }
    .header-actions{ display:flex; align-items:center; gap:.5rem }
    .title{ margin:.25rem 0 .25rem; font-size:1.05rem }
    .subtitle{ margin:0 0 .75rem; color:#6b7280 }
    .empty{ padding:.5rem; color:#6b7280 }
    .progressbar{ height:3px; width:100%; border-radius:2px; margin:.25rem 0 .35rem; background:linear-gradient(90deg,#6366f1,#22c55e,#f59e0b,#ef4444); background-size:400% 100%; animation:progress-run 1s linear infinite }
    .export-btn{ border:1px solid #e5e7eb; background:#fff; color:#111827; padding:.35rem .6rem; border-radius:.5rem; cursor:pointer }
    @keyframes progress-run{ 0%{ background-position:100% 0 } 100%{ background-position:-100% 0 } }
  `]
})
export class ValorInventarioDialogComponent implements OnInit {
  private api = inject(DashboardApiService);
  private cfg = inject(DynamicDialogConfig);
  private ref = inject(DynamicDialogRef);
  private cdr = inject(ChangeDetectorRef);
  @ViewChild('dt') table!: Table;

  categoriaId: number | null = null;
  categoriaNombre: string | null = null;
  rows: InventoryDetailRowDto[] = [];
  isLoading = true;

  ngOnInit(): void {
    this.categoriaId = this.cfg.data?.categoriaId ?? null;
    this.categoriaNombre = this.cfg.data?.categoriaNombre ?? null;

    this.api.inventoryDetail(this.categoriaId).subscribe({
      next: (data)=>{ this.rows = data; this.isLoading = false; this.cdr.markForCheck(); },
      error: _ => { this.rows = []; this.isLoading = false; this.cdr.markForCheck(); }
    });
  }

  exportExcel(){
    const current: InventoryDetailRowDto[] = this.table?.filteredValue ?? this.rows;
    const th = ['Categoría','Producto','Cantidad','Precio Prom.','Total'];
    const rows = current.map(r => `<tr><td>${esc(r.categoria??'')}</td><td>${esc(r.nombre)}</td><td>${r.cantidad}</td><td>${r.precioPromedio}</td><td>${r.total}</td></tr>`).join('');
    const tableHtml = `<!DOCTYPE html><html><head><meta charset='utf-8'></head><body><table border='1'><thead><tr>${th.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'valor_inventario.xls'; a.click();
    URL.revokeObjectURL(url);
    function esc(s:any){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  }

  get totalCantidad(): number {
    return (this.rows || []).reduce((a, b) => a + (b?.cantidad || 0), 0);
  }

  get totalValor(): number {
    return (this.rows || []).reduce((a, b) => a + (b?.total || 0), 0);
  }
}
