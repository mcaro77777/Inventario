import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { Table } from 'primeng/table';
import { StockService, ProductoStockDto } from '../../../core/services/stock.service';
import { ProductoService, ProductoDto } from '../../../core/services/producto.service';

interface Row { categoria: string; producto: string; sku?: string | null; stockActual: number }

@Component({
  standalone: true,
  selector: 'app-productos-stock-dialog',
  imports: [CommonModule, TableModule, InputTextModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dialog-content">
      <div class="progressbar" *ngIf="isLoading"></div>
      <div class="header-row">
        <h3 class="title">Productos en stock</h3>
        <div class="header-actions">
          <button type="button" class="export-btn" (click)="exportExcel()">Exportar Excel</button>
        </div>
      </div>
      <p class="subtitle" *ngIf="categoriaNombre">Categoría: <strong>{{ categoriaNombre }}</strong></p>

      <p-table
        #dt
        [value]="rows"
        dataKey="producto"
        [paginator]="false"
        [size]="'small'"
        [rowHover]="true"
        styleClass="mantenedor-datatable p-datatable-sm">

        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="categoria">Categoría <p-sortIcon field="categoria"></p-sortIcon></th>
            <th pSortableColumn="producto">Producto <p-sortIcon field="producto"></p-sortIcon></th>
            <th pSortableColumn="stockActual">Stock <p-sortIcon field="stockActual"></p-sortIcon></th>
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
                (input)="dt.filter($any($event.target).value, 'producto', 'contains')" />
            </th>
            <th>
              <input pInputText class="w-full p-inputtext-sm" placeholder="Filtrar stock"
                (click)="$event.stopPropagation()"
                (input)="dt.filter($any($event.target).value, 'stockActual', 'contains')" />
            </th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-row>
          <tr>
            <td>{{ row.categoria }}</td>
            <td>{{ row.producto }}</td>
            <td>{{ row.stockActual }}</td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="3" class="text-center">No hay registros encontrados.</td>
          </tr>
        </ng-template>
      </p-table>

      <div *ngIf="rows.length === 0" class="empty">No hay productos en stock.</div>
    </div>
  `,
  styles: [`
    .dialog-content{ padding: 2.25rem .75rem .75rem; position:relative; margin-top:.25rem }
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
export class ProductosStockDialogComponent implements OnInit {
  private stockSvc = inject(StockService);
  private productoSvc = inject(ProductoService);
  private cfg = inject(DynamicDialogConfig);
  private ref = inject(DynamicDialogRef);
  private cdr = inject(ChangeDetectorRef);
  @ViewChild('dt') table!: Table;

  categoriaId: number | null = null;
  categoriaNombre: string | null = null;
  rows: Row[] = [];
  isLoading = true;

  ngOnInit(): void {
    this.categoriaId = this.cfg.data?.categoriaId ?? null;
    this.categoriaNombre = this.cfg.data?.categoriaNombre ?? null;

    this.stockSvc.listarStock(true).subscribe(stock => {
      const list = Array.isArray(stock) ? stock : [];
      const enStock = list.filter(p => (p.stockActual ?? 0) > 0);
      if (this.categoriaId == null) {
        this.rows = enStock.map(this.mapRow);
        setTimeout(()=>{ this.isLoading = false; this.cdr.markForCheck(); }, 0);
      } else {
        this.productoSvc.listar().subscribe((catalogo: ProductoDto[] | null) => {
          const safeCat = Array.isArray(catalogo) ? catalogo : [];
          const ids = new Set(safeCat.filter(c => c.id_categoria === this.categoriaId).map(c => c.id_producto));
          this.rows = enStock.filter(p => ids.has(p.idProducto)).map(this.mapRow);
          setTimeout(()=>{ this.isLoading = false; this.cdr.markForCheck(); }, 0);
        });
      }
    });
  }

  private mapRow = (p: ProductoStockDto): Row => ({
    categoria: p.categoriaNombre ?? '—',
    producto: p.nombre,
    sku: p.sku ?? '',
    stockActual: p.stockActual ?? 0
  });

  close(){ this.ref.close(); }

  exportExcel(){
    const current: Row[] = this.table?.filteredValue ?? this.rows;
    const th = ['Categoría','Producto','Stock'];
    const rows = current.map(r => `<tr><td>${esc(r.categoria)}</td><td>${esc(r.producto)}</td><td>${esc(r.stockActual)}</td></tr>`).join('');
    const tableHtml = `<!DOCTYPE html><html><head><meta charset='utf-8'></head><body><table border='1'><thead><tr>${th.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'productos_en_stock.xls'; a.click();
    URL.revokeObjectURL(url);
    function esc(s:any){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  }
}
