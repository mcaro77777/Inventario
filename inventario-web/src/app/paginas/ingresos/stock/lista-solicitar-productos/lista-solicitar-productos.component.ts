import { Component, ViewChild, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, HostListener, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Table, TableModule } from 'primeng/table';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputTextModule } from 'primeng/inputtext';
import { DialogService, DynamicDialogModule, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../../../core/services/auth.service';
import { EgresosStockComponent } from '../egresos-stock/egresos-stock.component';
import { HistoriaProductoComponent } from '../historia-producto/historia-producto.component';
import { MantenedorProductosComponent } from '../../../../paginas/maestros/productos/mantenedor-productos/mantenedor-productos.component';
import { MantenedorCategoriasComponent } from '../../../../paginas/maestros/categorias/mantenedor-categorias/mantenedor-categorias.component';
import { MantenedorProveedoresComponent } from '../../../../paginas/maestros/proveedores/mantanedor-proveedores/mantanedor-proveedores.component';
import { MantenedorClientesComponent } from '../../../../paginas/maestros/clientes/mantenedor-clientes/mantenedor-clientes.component';
import { MantenedorPerfilesComponent } from '../../../../paginas/maestros/perfiles/mantenedor-perfiles/mantenedor-perfiles.component';
import { StockService } from '../../../../core/services/stock.service';
import { exportAoaToXlsx } from '../../../../shared/utils/excel-export';

@Component({
  selector: 'app-lista-solicitar-productos',
  standalone: true,
  templateUrl: './lista-solicitar-productos.component.html',
  styles: [`
    /* ====== Acentos y botones ====== */
    :host {
      --accent: #2e7d32;
      --accent-halo: rgba(46,125,50,0.25);
      display: block;
      height: 100%;
      overflow: hidden;
    }
    main {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }
    :host ::ng-deep .p-datatable-wrapper {
      flex: 1;
      overflow: auto !important;
    }

    /* Header no transparente */
    :host ::ng-deep .mantenedor-datatable .p-datatable-thead > tr > th {
      background: #f8fafc !important;
      border-bottom: 1px solid #e2e8f0 !important;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    :host ::ng-deep .mantenedor-datatable .p-datatable-thead {
      position: sticky;
      top: 0;
      z-index: 10;
    }
    :host ::ng-deep .mantenedor-datatable .p-datatable-thead > tr {
      background: #f8fafc !important;
    }
    :host ::ng-deep .mantenedor-datatable .p-datatable-thead > tr:nth-child(2) > th {
      background: #ffffff !important;
      border-bottom: 1px solid #e2e8f0 !important;
    }

    /* Estado pill */
    :host ::ng-deep .estado-pill {
      display: inline-flex; align-items: center; gap: 6px;
      font-weight: 700; font-size: 12px; letter-spacing: .2px;
      padding: 2px 10px; border-radius: 9999px;
      border: 1px solid transparent;
      text-transform: uppercase;
      user-select: none;
    }
    :host ::ng-deep .estado-pill.OK { background: rgba(46,125,50,.15); color: #66bb6a; border-color: rgba(102,187,106,.45); }
    :host ::ng-deep .estado-pill.ALERTA { background: rgba(211,47,47,.15); color: #ef5350; border-color: rgba(239,83,80,.45); }
    :host ::ng-deep .estado-pill.DEFAULT { background: rgba(25,118,210,.15); color: #64b5f6; border-color: rgba(100,181,246,.45); }

    /* Stock Mínimo badge - amarillo */
    :host ::ng-deep .stock-minimo-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 36px;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 12px;
      background: rgba(234, 179, 8, 0.12);
      color: #ca8a04;
      border: 1px solid rgba(234, 179, 8, 0.25);
    }
    
    /* Stock Actual badge - azul */
    :host ::ng-deep .stock-actual-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 36px;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 12px;
      background: rgba(33, 150, 243, 0.12);
      color: #1976d2;
      border: 1px solid rgba(33, 150, 243, 0.25);
    }

    /* Indicadores de resumen */
    :host ::ng-deep .indicators-row {
      display: flex;
      gap: 1rem;
      margin: 0.75rem 0;
      flex-wrap: wrap;
    }
    :host ::ng-deep .indicator-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 1rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #fff;
      min-width: 160px;
      flex: 1;
      cursor: pointer;
      transition: box-shadow 0.15s, border-color 0.15s;
      border-left-width: 4px;
    }
    :host ::ng-deep .indicator-card:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    :host ::ng-deep .indicator-card--active {
      box-shadow: 0 2px 12px rgba(0,0,0,0.12);
    }
    :host ::ng-deep .indicator-card--total {
      border-left-color: #3b82f6;
      background: linear-gradient(90deg, #fff 0%, rgba(59,130,246,0.08) 100%);
    }
    :host ::ng-deep .indicator-card--green {
      border-left-color: #22c55e;
      background: linear-gradient(90deg, #fff 0%, rgba(34,197,94,0.08) 100%);
    }
    :host ::ng-deep .indicator-card--yellow {
      border-left-color: #eab308;
      background: linear-gradient(90deg, #fff 0%, rgba(234,179,8,0.10) 100%);
    }
    :host ::ng-deep .indicator-card--red {
      border-left-color: #ef4444;
      background: linear-gradient(90deg, #fff 0%, rgba(239,68,68,0.08) 100%);
    }
    :host ::ng-deep .indicator-value {
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1;
    }
    :host ::ng-deep .indicator-card--total .indicator-value { color: #3b82f6; }
    :host ::ng-deep .indicator-card--green .indicator-value { color: #22c55e; }
    :host ::ng-deep .indicator-card--yellow .indicator-value { color: #ca8a04; }
    :host ::ng-deep .indicator-card--red .indicator-value { color: #ef4444; }
    :host ::ng-deep .indicator-text {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    :host ::ng-deep .indicator-title {
      font-weight: 600;
      font-size: 0.8rem;
      color: #334155;
    }
    :host ::ng-deep .indicator-desc {
      font-size: 0.7rem;
      color: #64748b;
    }

    /* Panel Header */
    :host ::ng-deep .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.6rem 1rem;
      background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin-bottom: 0.5rem;
    }
    :host ::ng-deep .panel-header-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    :host ::ng-deep .panel-icon {
      font-size: 1rem;
      color: #64748b;
    }
    :host ::ng-deep .panel-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: #334155;
      margin: 0;
      letter-spacing: 0.5px;
    }

    :host ::ng-deep body.dark-theme .panel-title,
    body.dark-theme :host ::ng-deep .panel-title {
      color: var(--ink-0, #ffffff) !important;
    }
    :host ::ng-deep body.dark-theme .panel-icon,
    body.dark-theme :host ::ng-deep .panel-icon {
      color: var(--ink-1, #e5e7eb) !important;
    }
    :host ::ng-deep .panel-header-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    :host ::ng-deep .btn-export {
      background: linear-gradient(180deg, #2e7d32 0%, #1b5e20 100%) !important;
      border: none !important;
      color: #fff !important;
      font-size: 0.8rem !important;
      padding: 0.4rem 0.75rem !important;
      border-radius: 6px !important;
    }
    :host ::ng-deep .btn-export:hover {
      filter: brightness(1.1);
    }
    :host ::ng-deep .btn-filter {
      background: linear-gradient(180deg, #f9a825 0%, #f57f17 100%) !important;
      border: none !important;
      color: #fff !important;
      font-size: 0.8rem !important;
      padding: 0.4rem 0.75rem !important;
      border-radius: 6px !important;
    }
    :host ::ng-deep .btn-filter:hover {
      filter: brightness(1.1);
    }

    :host ::ng-deep .p-datatable.p-datatable-sm .p-datatable-tbody > tr > td,
    :host ::ng-deep .p-datatable.p-datatable-sm .p-datatable-thead > tr > th {
      padding: 0.35rem 0.5rem;
    }
  `],

  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    MultiSelectModule,
    ToastModule,
    ProgressSpinnerModule,
    InputTextModule,
    DynamicDialogModule,
    ButtonModule,
    TooltipModule
  ],
  providers: [DialogService, MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListaSolicitarProductosComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  // Estado con Signals (OnPush-friendly)
  stockListado = signal<any[]>([]);
  private _todosLosProductos: any[] = [];
  loading = signal(false);

  // Altura responsiva
  tablaAltura: string = 'calc(100vh - 320px)';
  rowItemSize: number = 48;

  // Indicadores de resumen
  totalProductos = 0;
  totalOk = 0;
  totalBajo = 0;
  totalCritico = 0;
  filtroIndicador: 'TODOS' | 'OK' | 'BAJO' | 'CRITICO' = 'TODOS';

  columns = signal<any[]>([
    { field: 'categoriaNombre', header: 'Categoría', filterType: 'text' },
    { field: 'nombre', header: 'Nombre', filterType: 'text' },
    { field: 'sku', header: 'SKU', filterType: 'text' },
    { field: 'stockMinimo', header: 'Stock Mínimo', filterType: 'numeric' },
    { field: 'stockActual', header: 'Stock Actual', filterType: 'numeric' },
    { field: 'color', header: 'Color', filterType: 'numeric' }
  ]);
  selectedColumns = signal<any[]>([]);
  visibleColumns = computed(() => this.selectedColumns().length ? this.selectedColumns() : this.columns());
  columnOptions = computed(() => this.columns().map(col => ({ label: col.header, value: col })));
  selectedFilters: Record<string, string | string[]> = {};
  filterOptions = signal<{ [key: string]: any[] }>({});

  private ref?: DynamicDialogRef;

  exportarExcel(): void {
    // Si existen filtros en la tabla, usar solo las filas filtradas
    const filtered = this.dt?.filteredValue as any[] | null | undefined;
    const dataSrc = Array.isArray(filtered) ? filtered : this.stockListado();
    if (!dataSrc || dataSrc.length === 0) {
      this.messageService.add({severity:'warn', summary:'Sin datos', detail:'No hay registros para exportar'});
      return;
    }
    // Toast informativo
    this.messageService.add({
      severity: 'info',
      summary: 'Exportando',
      detail: `Exportando ${dataSrc.length} registro(s)${Array.isArray(filtered) ? ' (filtrados)' : ''} a Excel...`,
      life: 2000
    });
    const headers = this.visibleColumns().map(col => col.header);
    const aoa: any[][] = [headers];
    dataSrc.forEach(row => {
      aoa.push(headers.map(header => {
        const col = this.visibleColumns().find(c => c.header === header)!;
        return row[col.field];
      }));
    });

    exportAoaToXlsx(aoa, 'Stock', 'solicitar_productos.xlsx');
  }

  @ViewChild('dt') dt!: Table;

  constructor(
    private dialogService: DialogService,
    private messageService: MessageService,
    private auth: AuthService,
    private stockService: StockService
  ) { }

  ngOnInit(): void {
    this.selectedColumns.set([...this.columns()]);
    this.cargarStock();
  }

  generateColumnsFromData(): void {
    const sample = this.stockListado()[0];
    if (!sample) return;
    const cols = Object.keys(sample).map(key => ({
      field: key,
      header: this.formatHeader(key),
      filterType: typeof sample[key] === 'number' ? 'numeric' : 'text'
    }));
    this.columns.set(cols);
    this.selectedColumns.set([...cols]);
  }

  formatHeader(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  onSelectColumns(newCols: any[]): void {
    this.selectedColumns.set(newCols);
  }

  generateFilterOptions(): void {
    const next: { [key: string]: any[] } = {};
    this.columns().forEach(col => {
      if (col.filterType === 'multiSelect') {
        next[col.field] = [
          ...new Set(this.stockListado().map((item: any) => item[col.field]))
        ]
          .filter(value => value !== null && value !== undefined)
          .map(value => ({ label: value, value }));
      }
    });
    this.filterOptions.set(next);
  }

  applyFilter(field: string): void {
    const column = this.columns().find(col => col.field === field);
    const matchMode = column?.filterType === 'multiSelect' ? 'in' : 'contains';
    this.dt?.filter(this.selectedFilters[field], field, matchMode);
  }

  clearFilters(): void {
    this.selectedFilters = {};
    this.dt?.reset();
  }

  abrirDialogoAgregar(productoId?: number): void {
    const ref = this.dialogService.open(MantenedorProductosComponent, {
      header: 'Mantenedor de Productos',
      width: '80vw',
      draggable: true,
      maximizable: true,
      closable: true,
      modal: true,
      contentStyle: { overflow: 'auto' },
      dismissableMask: true,
      data: productoId ? { productoId } : undefined
    });
    ref.onClose.subscribe(result => { if (result) this.recargar(); });
  }

  abrirDialogoHistorial(productoId: number): void {
    const productoNombre = this.stockListado().find(p => (p.idProducto ?? p.id) === productoId)?.nombre;
    this.dialogService.open(HistoriaProductoComponent, {
      width: '80vw',
      contentStyle: { overflow: 'auto' },
      dismissableMask: true,
      data: { productoId, productoNombre }
    });
  }

  abrirDialogoEgresos(row: any): void {
    const productoId = row.idProducto ?? row.id;
    const productoNombre = row.nombre;
    if (row.stockActual <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Stock insuficiente',
        detail: 'No se puede retirar producto sin reabastecer el stock.'
      });
      return;
    }

    const ref = this.dialogService.open(EgresosStockComponent, {
      width: '80vw',
      contentStyle: { overflow: 'auto' },
      dismissableMask: true,
      data: { productoId, productoNombre }
    });
    ref.onClose.subscribe(result => { if (result) this.recargar(); });
  }

  abrirDialogoProductos(): void {
    this.abrirGenerico(MantenedorProductosComponent);
  }

  abrirDialogoCategorias(): void {
    this.abrirGenerico(MantenedorCategoriasComponent);
  }

  abrirDialogoProveedores(): void {
    this.abrirGenerico(MantenedorProveedoresComponent);
  }

  abrirDialogoClientes(): void {
    this.abrirGenerico(MantenedorClientesComponent);
  }

  abrirDialogoPerfiles(): void {
    this.abrirGenerico(MantenedorPerfilesComponent);
  }

  abrirGenerico(componente: any): void {
    const ref = this.dialogService.open(componente, {
      width: '80vw',
      contentStyle: { overflow: 'auto' },
      dismissableMask: true
    });
    ref.onClose.subscribe(result => { if (result) this.recargar(); });
  }

  tienePermiso(nombreBoton: string): boolean {
    return this.auth.botones()?.includes(nombreBoton) ?? false;
  }

  recargar(): void {
    this.cargarStock();
  }

  private cargarStock(): void {
    this.loading.set(true);
    this.stockService.listarStock().subscribe({
      next: (data) => {
        this._todosLosProductos = data ?? [];
        this.stockListado.set([...this._todosLosProductos]);
        this.calcularIndicadores();
        this.generateFilterOptions();
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el stock' });
        this.cdr.markForCheck();
      }
    });
  }

  // Calcular indicadores de resumen
  private calcularIndicadores(): void {
    const todos = this._todosLosProductos;
    this.totalProductos = todos.length;
    this.totalOk = todos.filter(p => p.color === 1).length;
    this.totalBajo = todos.filter(p => p.color === 0).length;
    this.totalCritico = todos.filter(p => p.stockActual === 0).length;
  }

  // Filtrar por indicador
  filtrarPorIndicador(indicador: 'TODOS' | 'OK' | 'BAJO' | 'CRITICO'): void {
    this.filtroIndicador = indicador;
    switch (indicador) {
      case 'OK':
        this.stockListado.set(this._todosLosProductos.filter(p => p.color === 1));
        break;
      case 'BAJO':
        this.stockListado.set(this._todosLosProductos.filter(p => p.color === 0));
        break;
      case 'CRITICO':
        this.stockListado.set(this._todosLosProductos.filter(p => p.stockActual === 0));
        break;
      default:
        this.stockListado.set([...this._todosLosProductos]);
    }
    this.cdr.markForCheck();
  }

  // TrackBy para columnas
  trackCol(index: number, col: any): string {
    return col.field;
  }

}
