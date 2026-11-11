import { Component, OnInit, ChangeDetectionStrategy, signal, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { FileUploadModule } from 'primeng/fileupload';
import { SelectModule } from 'primeng/select';
import { ConfirmationService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
import { StockService, HistoriaProductoDto, ActualizarMovimientoDto } from '../../../../core/services/stock.service';
import { ProveedorService } from '../../../../core/services/proveedor.service';

@Component({
  selector: 'app-historia-producto',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, ProgressSpinnerModule, ButtonModule, DialogModule, InputNumberModule, ConfirmDialogModule, InputTextModule, TooltipModule, FileUploadModule, SelectModule],
  templateUrl: './historia-producto.component.html',
  styles: [
    `
    /* Ensure dialog content and table have good contrast in dark mode */
    body.dark-theme :host ::ng-deep .p-dialog .p-dialog-content { color:#ffffff; }
    body.dark-theme :host ::ng-deep .p-datatable { color:#ffffff; }
    body.dark-theme :host ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      color:#ffffff; border-bottom: 1px solid var(--surface-border);
      background: color-mix(in oklab, var(--surface-ground, #0f1720) 92%, #ffffff 8%);
    }
    body.dark-theme :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
      color:#ffffff; border-bottom: 1px solid color-mix(in oklab, var(--surface-border), transparent 40%);
    }
    /* Estilos para el diálogo de edición - estilo paneles como ingresador-stock */
    :host ::ng-deep .p-dialog-mask .p-dialog { max-height: 85vh !important; }
    :host ::ng-deep .p-dialog-mask .p-dialog .p-dialog-content { overflow-y: auto !important; max-height: calc(85vh - 120px) !important; }
    :host ::ng-deep .edit-form-grid { display: flex; flex-direction: column; gap: 14px; }
    :host ::ng-deep .edit-row { display: flex; gap: 14px; flex-wrap: wrap; }
    :host ::ng-deep .edit-row > .edit-panel { flex: 1 1 300px; min-width: 280px; }
    :host ::ng-deep .edit-panel {
      border-radius: 12px;
      border: 1px solid rgba(148, 163, 184, 0.4);
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
      overflow: hidden;
      background: #fff;
    }
    :host ::ng-deep .edit-panel .panel-header {
      background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
      border-bottom: 1px solid rgba(148, 163, 184, 0.3);
      padding: 10px 14px;
      font-weight: 600;
      font-size: 0.875rem;
      color: #334155;
      border-radius: 12px 12px 0 0;
    }
    :host ::ng-deep .edit-panel .panel-content { padding: 14px; background: #ffffff; border-radius: 0 0 12px 12px; }
    :host ::ng-deep .form-field { display: flex; flex-direction: column; gap: 4px; }
    :host ::ng-deep .form-label { font-size: 0.8rem; font-weight: 600; color: #475569; }
    :host ::ng-deep .flex-row-wrap { display: flex; flex-wrap: wrap; gap: 12px; }
    :host ::ng-deep .doc-item { flex: 1; min-width: 160px; display: flex; flex-direction: column; gap: 4px; }
    :host ::ng-deep .doc-item label { font-size: 0.8rem; font-weight: 500; color: #475569; }
    :host ::ng-deep .doc-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    :host ::ng-deep .doc-name { font-size: 0.75rem; color: #16a34a; }
    :host ::ng-deep .readonly-input .p-inputnumber-input { background: #f8fafc; color: #64748b; }
    /* Modo oscuro para paneles de edición */
    body.dark-theme :host ::ng-deep .edit-panel { background: var(--surface-1); border-color: var(--border-soft); }
    body.dark-theme :host ::ng-deep .edit-panel .panel-header { background: linear-gradient(180deg, var(--surface-2) 0%, var(--surface-1) 100%); color: #f1f5f9; border-color: var(--border-soft); }
    body.dark-theme :host ::ng-deep .edit-panel .panel-content { background: var(--surface-1); }
    body.dark-theme :host ::ng-deep .form-label { color: #cbd5e1; }
    body.dark-theme :host ::ng-deep .doc-item label { color: #cbd5e1; }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService]
})
export class HistoriaProductoComponent implements OnInit {

  productoId!: number;
  loading = signal(false);
  historial = signal<HistoriaProductoDto[]>([]);

  editDialogVisible = false;
  movimientoEnEdicion: HistoriaProductoDto | null = null;
  cantidadEdit: number | null = null;
  valorUnitarioEdit: number | null = null;
  descuentoEdit: number | null = null;
  proveedorEdit: number | null = null;
  subTotalEdit: number | null = null;
  totalIvaEdit: number | null = null;
  docsEdit = { ordenCompra: null as string | null, factura: null as string | null, guiaDespacho: null as string | null, notaCreditoDebito: null as string | null };
  
  visorDocVisible = false;
  visorDocUrl: SafeResourceUrl | null = null;

  proveedores: { id: number; label: string; tipoProveedor?: string | null }[] = [];
  private proveedorSrv = inject(ProveedorService);
  private sanitizer = inject(DomSanitizer);
  private cdr = inject(ChangeDetectorRef);

  constructor(private config: DynamicDialogConfig,
              private ref: DynamicDialogRef,
              private stockSrv: StockService,
              private confirm: ConfirmationService) {}

  ngOnInit(): void {
    this.productoId = this.config?.data?.productoId;
    if (!this.productoId) return;
    this.cargarHistorial();
    this.cargarProveedores();
  }

  private cargarProveedores(): void {
    this.proveedorSrv.listar().subscribe({
      next: (data) => {
        this.proveedores = (data ?? []).map(p => ({
          id: p.id,
          label: `${p.nombre} (${p.tipoProveedor ?? 'N/A'})`,
          tipoProveedor: p.tipoProveedor
        }));
      }
    });
  }

  private cargarHistorial(): void {
    this.loading.set(true);
    this.stockSrv.historialProducto(this.productoId).subscribe({
      next: d => { this.historial.set(d ?? []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  close(): void { this.ref.close(); }

  abrirEditar(row: HistoriaProductoDto): void {
    this.movimientoEnEdicion = row;
    this.cantidadEdit = row.cantidad;
    this.valorUnitarioEdit = row.valorUnitario;
    this.descuentoEdit = row.descuento;
    this.proveedorEdit = row.idProveedor ?? null;
    this.docsEdit = {
      ordenCompra: row.docOrdenCompra ?? null,
      factura: row.docFactura ?? null,
      guiaDespacho: row.docGuiaDespacho ?? null,
      notaCreditoDebito: row.docNotaCreditoDebito ?? null
    };
    this.calcularTotales();
    this.editDialogVisible = true;
  }

  calcularTotales(): void {
    const cant = this.cantidadEdit ?? 0;
    const vUnit = this.valorUnitarioEdit ?? 0;
    const desc = this.descuentoEdit ?? 0;
    
    if (!cant || !vUnit) {
      this.subTotalEdit = null;
      this.totalIvaEdit = null;
      return;
    }
    
    // Determinar IVA según tipo de proveedor
    const prov = this.proveedores.find(p => p.id === this.proveedorEdit);
    const ivaRate = prov?.tipoProveedor === 'Local' ? 0 : 0.19;
    
    this.subTotalEdit = cant * vUnit;
    const base = this.subTotalEdit * (1 + ivaRate);
    this.totalIvaEdit = base - (base * desc / 100);
  }

  guardarEdicion(): void {
    if (!this.movimientoEnEdicion || this.cantidadEdit == null || this.cantidadEdit <= 0 || this.valorUnitarioEdit == null || this.valorUnitarioEdit < 0) {
      this.editDialogVisible = false;
      return;
    }
    this.loading.set(true);
    const dto: ActualizarMovimientoDto = {
      cantidad: this.cantidadEdit,
      valorUnitario: this.valorUnitarioEdit,
      descuento: this.descuentoEdit ?? 0,
      idProveedor: this.proveedorEdit,
      estado: this.movimientoEnEdicion.estado,
      docOrdenCompra: this.docsEdit.ordenCompra,
      docFactura: this.docsEdit.factura,
      docGuiaDespacho: this.docsEdit.guiaDespacho,
      docNotaCreditoDebito: this.docsEdit.notaCreditoDebito
    };
    this.stockSrv.actualizarMovimiento(this.movimientoEnEdicion.idIngreso, dto).subscribe({
      next: () => {
        this.editDialogVisible = false;
        this.cargarHistorial();
      },
      error: () => {
        this.loading.set(false);
        this.editDialogVisible = false;
      }
    });
  }

  getDocName(filePath: string | null): string {
    if (!filePath) return '';
    return filePath.split('/').pop() ?? filePath;
  }

  eliminarDocEdit(tipo: 'ordenCompra' | 'factura' | 'guiaDespacho' | 'notaCreditoDebito'): void {
    this.docsEdit[tipo] = null;
  }

  onUploadEdit(event: any, tipo: 'ordenCompra' | 'factura' | 'guiaDespacho' | 'notaCreditoDebito'): void {
    const file = event.files?.[0];
    if (!file) return;
    this.stockSrv.uploadArchivo(file, tipo).subscribe({
      next: (result) => {
        this.docsEdit[tipo] = result.fileName;
      },
      error: (err) => console.error('Error subiendo archivo:', err)
    });
  }

  eliminar(row: HistoriaProductoDto): void {
    this.confirm.confirm({
      message: '¿Deseas eliminar este movimiento de stock?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-trash',
      accept: () => {
        this.loading.set(true);
        this.stockSrv.eliminarMovimiento(row.idIngreso).subscribe({
          next: () => this.cargarHistorial(),
          error: () => this.loading.set(false)
        });
      }
    });
  }

  visualizarDocumento(fileName: string): void {
    const url = this.stockSrv.getArchivoUrl(fileName);
    this.visorDocUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.visorDocVisible = true;
    this.cdr.markForCheck();
  }
}
