import { Component, ViewChild, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Table, TableModule } from 'primeng/table';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputTextModule } from 'primeng/inputtext';
import { DynamicDialogModule, DialogService } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { exportAoaToXlsx } from '../../../../shared/utils/excel-export';

import { StockService, SolicitudClienteDto } from '../../../../core/services/stock.service';
import { AuthService } from '../../../../core/services/auth.service';

/* Configuración de columnas */
type ColumnConfig = {
  field: keyof SolicitudClienteDto;
  header: string;
  filterType: 'text' | 'numeric' | 'multiSelect';
};

@Component({
  selector: 'app-solicitud-cliente',
  standalone: true,
  templateUrl: './solicitud-cliente.component.html',
  styles: [`
    /* ====== Estilos replicados de mantenedor-stock ====== */
    :host {
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
    :host ::ng-deep .estado-pill.DEFAULT { background: rgba(234,179,8,.15); color: #ca8a04; border-color: rgba(234,179,8,.45); }

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
    TooltipModule,
    ConfirmDialogModule
  ],
  providers: [DialogService, MessageService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SolicitudClienteComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  /* ---------- datos ---------- */
  solicitudes = signal<SolicitudClienteDto[]>([]);
  private _todasLasSolicitudes: SolicitudClienteDto[] = [];
  loading = signal(false);

  // Altura responsiva
  tablaAltura: string = 'calc(100vh - 320px)';
  rowItemSize: number = 48;

  // Indicadores
  totalSolicitudes = 0;
  totalPendientes = 0;
  totalAprobadas = 0;
  totalRechazadas = 0;
  filtroIndicador: 'TODOS' | 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' = 'TODOS';

  /* -------- columnas --------- */
  columns = signal<ColumnConfig[]>([
    { field: 'categoriaNombre', header: 'Categoría',     filterType: 'text'       },
    { field: 'productoNombre',  header: 'Producto',      filterType: 'text'       },
    { field: 'cantidad',        header: 'Cantidad',      filterType: 'numeric'    },
    { field: 'tipo',            header: 'Estado',        filterType: 'multiSelect'},
    { field: 'observacion',     header: 'Observación',   filterType: 'text'       }
  ]);

  selectedColumns = signal<ColumnConfig[]>([]);
  visibleColumns  = computed(() => this.selectedColumns().length ? this.selectedColumns() : this.columns());
  columnOptions   = computed(() => this.columns().map(c => ({ label: c.header, value: c })));

  selectedFilters: Record<string, string | string[]> = {};
  filterOptions   = signal<Record<string, any[]>>({});

  /* ---------- refs / servicios ---------- */
  @ViewChild('dt') dt!: Table;

  constructor(
    private stockSrv: StockService,
    private auth: AuthService,
    private dialogSrv: DialogService,
    private msg: MessageService,
    private confirmSrv: ConfirmationService
  ) {}

  abrirCertificado(row: SolicitudClienteDto): void {
    if (!row?.idIngreso) return;
    const url = this.stockSrv.urlCertificadoSolicitud(row.idIngreso);
    try {
      window.open(url, '_blank', 'noopener');
    } catch {
      window.open(url, '_blank');
    }
  }

  /* ---------------- ciclo de vida ---------------- */
  ngOnInit(): void {
    this.selectedColumns.set([...this.columns()]);
    this.cargarSolicitudes();
  }

  /* ---------------- carga de datos -------------- */
  private cargarSolicitudes(): void {
    const idCliente = this.auth.usuarioIdActual;
    console.log('[SolicitudCliente] usuarioIdActual:', idCliente);
    
    if (!idCliente) { 
      console.warn('[SolicitudCliente] No hay usuario autenticado');
      this.msg.add({ severity:'warn', summary:'Sesión', detail:'No se encontró ID de cliente. Inicie sesión nuevamente.' });
      return; 
    }

    this.loading.set(true);
    this.stockSrv.solicitudesPorCliente(idCliente).subscribe({
      next: data => {
        console.log('[SolicitudCliente] Datos recibidos:', data);
        this._todasLasSolicitudes = data ?? [];
        this.solicitudes.set([...this._todasLasSolicitudes]);
        this.calcularIndicadores();
        this.generateFilterOptions();
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('[SolicitudCliente] Error:', err);
        this.msg.add({ severity:'error', summary:'Error', detail:'No se pudieron cargar las solicitudes' });
        this.loading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  // Calcular indicadores
  private calcularIndicadores(): void {
    const todas = this._todasLasSolicitudes;
    this.totalSolicitudes = todas.length;
    this.totalPendientes = todas.filter(s => s.tipo === 1).length;
    this.totalAprobadas = todas.filter(s => s.tipo === 2).length;
    this.totalRechazadas = todas.filter(s => s.tipo === 3).length;
  }

  // Filtrar por indicador
  filtrarPorIndicador(indicador: 'TODOS' | 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'): void {
    this.filtroIndicador = indicador;
    switch (indicador) {
      case 'PENDIENTE':
        this.solicitudes.set(this._todasLasSolicitudes.filter(s => s.tipo === 1));
        break;
      case 'APROBADO':
        this.solicitudes.set(this._todasLasSolicitudes.filter(s => s.tipo === 2));
        break;
      case 'RECHAZADO':
        this.solicitudes.set(this._todasLasSolicitudes.filter(s => s.tipo === 3));
        break;
      default:
        this.solicitudes.set([...this._todasLasSolicitudes]);
    }
    this.cdr.markForCheck();
  }

  /* ---------------- utilidades ------------------ */
  descripcionTipo(tipo: number): string {
    switch (tipo) {
      case 1: return 'Pendiente';
      case 2: return 'Aprobado';
      case 3: return 'Rechazado';
      default: return 'Otro';
    }
  }

  /* -------------- exportar a Excel -------------- */
  exportarExcel(): void {
    // Usar filas filtradas si existen; en caso contrario, todas las filas
    const filtered = this.dt?.filteredValue as SolicitudClienteDto[] | null | undefined;
    const src = Array.isArray(filtered) ? filtered : this.solicitudes();
    if (!src.length) {
      this.msg.add({ severity:'warn', summary:'Sin datos', detail:'No hay registros para exportar' });
      return;
    }

    // Toast informativo
    this.msg.add({
      severity: 'info',
      summary: 'Exportando',
      detail: `Exportando ${src.length} registro(s)${Array.isArray(filtered) ? ' (filtrados)' : ''} a Excel...`,
      life: 2000
    });

    const headers = this.visibleColumns().map(c => c.header);
    const aoa: any[][] = [headers];
    src.forEach(row => {
      aoa.push(headers.map(header => {
        const col = this.visibleColumns().find(c => c.header === header)!;
        const field = col.field;
        const valor = field === 'tipo'
          ? this.descripcionTipo(row[field] as number)
          : row[field];
        return valor;
      }));
    });

    exportAoaToXlsx(aoa, 'SolicitudesCliente', 'solicitudes_cliente.xlsx');
  }

  /* --------------- columnas visibles ------------ */
  onSelectColumns(newCols: ColumnConfig[]): void {
    this.selectedColumns.set(newCols);
  }

  /* ---------------- filtros dinámicos ----------- */
  private generateFilterOptions(): void {
    const next: Record<string, any[]> = {};
    this.columns().forEach(col => {
      if (col.filterType === 'multiSelect') {
        const distinct = new Set(this.solicitudes().map(s => s[col.field]));
        const opts = Array.from(distinct)
          .filter(v => v !== null && v !== undefined)
          .map(v => ({ label: this.descripcionTipo(v as number), value: v }));
        next[col.field] = opts;
      }
    });
    this.filterOptions.set(next);
  }

  applyFilter(field: string): void {
    const col = this.columns().find(c => c.field === field);
    const mode = col?.filterType === 'multiSelect' ? 'in' : 'contains';
    this.dt?.filter(this.selectedFilters[field], field, mode);
  }

  clearFilters(): void {
    this.selectedFilters = {};
    this.dt?.reset();
  }

  /* -------------- eliminar solicitud -------------- */
  confirmarEliminacion(row: SolicitudClienteDto): void {
    this.confirmSrv.confirm({
      message: `¿Está seguro de eliminar la solicitud de "${row.productoNombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.eliminarSolicitud(row)
    });
  }

  private eliminarSolicitud(row: SolicitudClienteDto): void {
    this.loading.set(true);
    this.stockSrv.eliminarSolicitud(row.idIngreso).subscribe({
      next: () => {
        this._todasLasSolicitudes = this._todasLasSolicitudes.filter(s => s.idIngreso !== row.idIngreso);
        this.solicitudes.set([...this._todasLasSolicitudes]);
        this.calcularIndicadores();
        this.generateFilterOptions();
        this.filtrarPorIndicador(this.filtroIndicador);
        this.msg.add({ severity: 'success', summary: 'Eliminada', detail: 'La solicitud fue eliminada correctamente' });
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('[SolicitudCliente] Error al eliminar:', err);
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la solicitud' });
        this.loading.set(false);
        this.cdr.markForCheck();
      }
    });
  }
}
