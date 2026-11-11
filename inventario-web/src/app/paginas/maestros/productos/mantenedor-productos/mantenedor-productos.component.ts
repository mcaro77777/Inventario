import { Component, OnInit, HostListener, ViewChild, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { Optional } from '@angular/core';
import { ToastModule } from 'primeng/toast';
import { ProductoService, ProductoDto } from '../../../../core/services/producto.service';
import { StockService } from '../../../../core/services/stock.service';
import { UnidadMedidaService, UnidadMedidaDto } from '../../../../core/services/unidad-medida.service';
import { ProveedorService, ProveedorDto } from '../../../../core/services/proveedor.service';
import { CategoriaService, CategoriaDto } from '../../../../core/services/categoria.service';
import { Router } from '@angular/router';
import { exportAoaToXlsx } from '../../../../shared/utils/excel-export';

// Tipo extendido para uso en la vista
interface ProductoRow extends ProductoDto {
  stockMinimo?: number | null;
  categoriaNombre?: string | null;
}

@Component({
  selector: 'app-mantenedor-productos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ProgressBarModule,
    InputTextModule,
    InputNumberModule,
    ButtonModule,
    DialogModule,
    ConfirmDialogModule,
    ToastModule,
    SelectModule
  ],
  styles: [
    `
    :host {
      /* Fallbacks locales para panel si no existen en tokens globales */
      --panel-top: var(--surface-1, #ffffff);
      --panel-bot: var(--surface-2, #EEF2F8);
    }

    /* Colores fuertes reutilizables (igual que stock) */
    :host ::ng-deep .btn-strong-green {
      background-color: #2e7d32 !important;
      border-color: #2e7d32 !important;
      color: #fff !important;
      border-width: 1px !important;
      background-image: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.12)) !important;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12) !important;
    }
    :host ::ng-deep .btn-strong-amber {
      background-color: #f9a825 !important;
      border-color: #f9a825 !important;
      color: #fff !important;
      border-width: 1px !important;
      background-image: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(0,0,0,0.10)) !important;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.18) !important;
    }
    :host ::ng-deep .btn-strong-navy {
      background-color: #0d47a1 !important;
      border-color: #0d47a1 !important;
      color: #fff !important;
      border-width: 1px !important;
      background-image: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.14)) !important;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.16) !important;
    }

    /* Toolbar superior (igual que stock) */
    :host ::ng-deep .export-button-container { display:flex; align-items:center; gap:.5rem; flex-wrap:nowrap; }
    :host ::ng-deep .export-button-container .toolbar-spacer { flex:1 1 auto; }

    /* Compactar paddings de tabla small */
    :host ::ng-deep .p-datatable.p-datatable-sm .p-datatable-thead > tr > th { padding: 0.35rem 0.5rem; }

    /* ====== Virtual scroll: altura exacta de filas ====== */
    :host ::ng-deep .mantenedor-datatable .p-datatable-tbody > tr {
      height: 40px;
    }
    :host ::ng-deep .mantenedor-datatable .p-datatable-tbody > tr > td {
      padding-top: 0 !important;
      padding-bottom: 0 !important;
      padding-left: 0.5rem;
      padding-right: 0.5rem;
      border-top-width: 0 !important;
      border-bottom-width: 0 !important;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      vertical-align: middle;
      line-height: 40px;
    }
    :host ::ng-deep .mantenedor-datatable .p-datatable-tbody > tr:not(:last-child) > td {
      box-shadow: inset 0 -1px 0 0 var(--surface-border, #e5e7eb);
    }

    /* Header no transparente y bordes redondeados arriba */
    :host ::ng-deep .mantenedor-datatable .p-datatable-thead {
      position: sticky;
      top: 0;
      z-index: 2;
    }
    :host ::ng-deep .mantenedor-datatable .p-datatable-thead > tr > th {
      background: #ffffff !important;
      border-bottom: 1px solid var(--surface-border) !important;
    }
    :host ::ng-deep .mantenedor-datatable .p-datatable-header-cell {
      background: #ffffff !important;
    }
    :host ::ng-deep .mantenedor-datatable .p-datatable-thead > tr:first-child > th:first-child { border-top-left-radius: 8px; }
    :host ::ng-deep .mantenedor-datatable .p-datatable-thead > tr:first-child > th:last-child { border-top-right-radius: 8px; }
    /* Virtual scroll header fix */
    :host ::ng-deep .mantenedor-datatable .p-datatable-scrollable-header,
    :host ::ng-deep .mantenedor-datatable .p-datatable-scrollable-header-box,
    :host ::ng-deep .mantenedor-datatable .p-datatable-scrollable .p-datatable-thead,
    :host ::ng-deep .mantenedor-datatable .p-datatable-wrapper .p-datatable-thead,
    :host ::ng-deep .mantenedor-datatable th {
      background: #ffffff !important;
    }
    :host ::ng-deep .mantenedor-datatable .p-datatable-scrollable-header-table {
      background: #ffffff !important;
    }

    /* Inputs filtros pequeños */
    :host ::ng-deep .p-inputtext.p-inputtext-sm { padding: 0.25rem 0.5rem; }

    /* ====== Cabecera de página ====== */
    :host ::ng-deep .page-title-section {
      margin-bottom: 0.5rem;
    }
    :host ::ng-deep .page-title {
      margin: 0 0 0.25rem 0;
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--ink-0, #1e293b);
    }
    :host ::ng-deep .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.85rem;
      color: #1976d2;
      cursor: pointer;
      text-decoration: none;
    }
    :host ::ng-deep .back-link:hover {
      text-decoration: underline;
    }

    /* ====== Barra de acciones ====== */
    :host ::ng-deep .actions-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.5rem;
      background: linear-gradient(180deg, var(--panel-top) 0%, var(--panel-bot) 100%);
      border: 1px solid var(--surface-border, #e2e8f0);
      border-radius: 10px;
      padding: 0.5rem 1rem;
      margin-bottom: 0.75rem;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    }
    :host ::ng-deep .actions-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    :host ::ng-deep .total-registros {
      font-size: 0.85rem;
      color: var(--ink-1, #64748b);
      white-space: nowrap;
    }
    `
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './mantenedor-productos.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MantenedorProductosComponent implements OnInit {
  @ViewChild('dt') dt!: Table;
  // Signals
  readonly productos = signal<ProductoRow[]>([]);
  readonly productoSeleccionado = signal<ProductoRow | null>(null);
  readonly proveedores = signal<ProveedorDto[]>([]);
  readonly categorias = signal<CategoriaDto[]>([]);
  readonly unidades = signal<UnidadMedidaDto[]>([]);
  readonly loading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  // Control del diálogo de edición/creación
  showDialog = false;

  readonly formHabilitado = signal<boolean>(false);
  readonly scrollHeight = signal<string>('400px');

  // Map derivado para nombre de categoría
  readonly categoriaMap = computed<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    for (const c of this.categorias()) map[c.id] = c.nombre as any;
    return map;
  });

  // Helpers derivados
  readonly totalRegistros = computed(() => this.productos().length);

  cerrarDialog() { this.ref?.close(true); }

  productoForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private productoSrv: ProductoService,
    private stockSrv: StockService,
    private proveedorSrv: ProveedorService,
    private categoriaSrv: CategoriaService,
    private unidadSrv: UnidadMedidaService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    @Optional() private ref?: DynamicDialogRef,
    private router?: Router
  ) { }

  // Effects
  private readonly syncSelectionToForm = effect(() => {
    // Evita correr antes de que el form exista
    if (!this.productoForm) return;
    const prod = this.productoSeleccionado();
    if (!prod) return;
    try {
      this.productoForm.patchValue({
        id: (prod as any).id ?? (prod as any).id_producto ?? 0,
        nombre: prod.nombre,
        sku: prod.sku,
        categoria: (prod as any).id_categoria ?? '',
        marca: prod.marca,
        modelo: prod.modelo,
        stockMinimo: (prod as any).stockMinimo ?? (prod as any).stock_minimo ?? 0,
        proveedor: (prod as any).proveedor_id ?? null
      }, { emitEvent: false });
      this.formHabilitado.set(true);
    } catch {}
  });

  private readonly autoHeight = effect(() => {
    // Recalcular altura al cambiar estado del form
    const _ = this.formHabilitado();
    this.updateScrollHeight();
  });

  /* Init */
  ngOnInit(): void {
    this.updateScrollHeight();
    this.crearFormulario();
    this.cargarProductos();
    this.cargarProveedores();
    this.cargarCategorias();
    this.cargarUnidades();
    this.actualizarHabilitacion();
  }

  /* Navegación */
  volver(): void {
    try {
      this.router?.navigate(['/menu', 'stock']);
    } catch {}
  }

  /* Data */
  private cargarProveedores() {
    this.proveedorSrv.listar().subscribe(p => this.proveedores.set(p ?? []));
  }
  private cargarCategorias() {
    this.categoriaSrv.listar().subscribe(c => {
      this.categorias.set(c ?? []);
      // actualizar nombres categ. en filas
      this.anotarNombreCategoria();
    });
  }

  private cargarUnidades() {
    this.unidadSrv.listar().subscribe(u => this.unidades.set(u ?? []));
  }

  private anotarNombreCategoria() {
    const map = this.categoriaMap();
    const next = (this.productos() ?? []).map((p: ProductoRow) => ({
      ...p,
      categoriaNombre: map[(p as any).id_categoria as number] ?? '',
      stockMinimo: (p as any).stockMinimo ?? (p as any).stock_minimo ?? null
    })) as any;
    this.productos.set(next);
  }

  private cargarProductos(): void {
    this.loading.set(true);
    this.productoSrv.listar().subscribe({
      next: data => { this.productos.set((data as any) || []); this.anotarNombreCategoria(); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  recargarListado(): void { this.cargarProductos(); }

  /* Excel */
  async exportarExcel(): Promise<void> {
    // Si hay filtros aplicados en la tabla, usar únicamente los registros filtrados.
    // PrimeNG establece filteredValue a null cuando no hay filtros, y a un array (posiblemente vacío) cuando sí hay filtros.
    const filtered = this.dt?.filteredValue as ProductoRow[] | null | undefined;
    const items = Array.isArray(filtered) ? filtered : this.productos();
    if (!items || items.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay registros para exportar' });
      return;
    }

    // Toast informativo
    this.messageService.add({
      severity: 'info',
      summary: 'Exportando',
      detail: `Exportando ${items.length} registro(s)${Array.isArray(filtered) ? ' (filtrados)' : ''} a Excel...`,
      life: 2000
    });

    const headers = ['Nombre', 'SKU', 'Categoría', 'Marca', 'Modelo', 'Stock Mínimo'];
    const aoa: any[][] = [headers];

    items.forEach((p: ProductoRow) => {
      aoa.push([
        p.nombre,
        p.sku,
        p.categoriaNombre,
        p.marca,
        p.modelo,
        p.stockMinimo
      ]);
    });

    await exportAoaToXlsx(aoa, 'Productos', 'mantenedor_productos.xlsx');
  }

  /* UI */
  @HostListener('window:resize') onResize() { this.updateScrollHeight(); }
  private updateScrollHeight() {
    // Menor offset cuando el formulario está oculto para que la tabla gane altura
    const offset = this.formHabilitado() ? 260 : 110;
    this.scrollHeight.set(`${Math.max(200, window.innerHeight - offset)}px`);
  }

  /* Form */
  private crearFormulario() {
    this.productoForm = this.fb.group({
      id: [0],
      nombre: ['', Validators.required],
      sku: [''],
      categoria: ['', Validators.required],
      unidadMedida: [null, Validators.required],
      marca: [''],
      modelo: [''],
      stockMinimo: [0, [Validators.required, Validators.min(0)]],
      proveedor: [null]
    });
  }

  private actualizarHabilitacion() {
    // Ahora la visibilidad del formulario se controla en la plantilla mediante *hidden*.
    // No es necesario habilitar ni deshabilitar los controles.
  }

  mostrarToastsErrores() {
    Object.entries(this.productoForm.controls).forEach(([k, ctl]) => {
      if (ctl.invalid) {
        const label = k.charAt(0).toUpperCase() + k.slice(1);
        this.messageService.add({ severity: 'error', summary: 'Error de validación', detail: `${label}: Campo obligatorio`, life: 4000 });
      }
    });
  }

  modoCrear() {
    this.limpiarFormulario();
    this.formHabilitado.set(true);
    this.showDialog = true;
    this.actualizarHabilitacion();
    this.updateScrollHeight();
  }
  seleccionarProducto(p: ProductoDto | ProductoDto[] | undefined) {
    if (!p) return;
    const prod = Array.isArray(p) ? p[0] : p;
    if (!prod) return;

    // Guardamos el producto seleccionado para posibles usos posteriores
    this.productoSeleccionado.set(prod as ProductoRow);

    // Rellenamos el formulario asegurándonos de mapear correctamente todos los campos
    this.productoForm.patchValue({
      id: (prod as any).id ?? (prod as any).id_producto ?? 0,
      nombre: prod.nombre,
      sku: prod.sku,
      categoria: (prod as any).id_categoria ?? '',
      unidadMedida: (prod as any).unidad_medida_id ?? null,
      marca: prod.marca,
      modelo: prod.modelo,
      stockMinimo: (prod as any).stockMinimo ?? (prod as any).stock_minimo ?? 0,
      proveedor: (prod as any).proveedor_id ?? null
    });

    // Habilitamos el formulario y los botones de acción
    this.formHabilitado.set(true);
    this.showDialog = true;
    this.actualizarHabilitacion();
    this.updateScrollHeight();
  }
  limpiarFormulario() {
    this.productoForm.reset({ id: 0, stockMinimo: 0, categoria: '', unidadMedida: null, proveedor: null });
    this.productoSeleccionado.set(null);
    this.formHabilitado.set(false);
    this.actualizarHabilitacion();
    this.updateScrollHeight();
  }
  cancelar() { this.limpiarFormulario(); this.showDialog = false; }

  clearFilters(): void {
    try { this.dt?.reset(); } catch {}
  }

  confirmarEliminar() {
    const id = this.productoForm.value.id;
    if (!id) { return; }
    this.saving.set(true);
    this.stockSrv.historialProducto(id).subscribe({
      next: movimientos => {
        const tieneMovimientos = Array.isArray(movimientos) && movimientos.length > 0;
        if (tieneMovimientos) {
          this.saving.set(false);
          this.messageService.add({
            severity: 'warn',
            summary: 'No se puede eliminar',
            detail: 'El producto tiene movimientos de stock registrados. Debe eliminar primero los movimientos antes de eliminar el producto.',
            life: 6000
          });
          return;
        }

        this.saving.set(false);
        this.confirmationService.confirm({
          message: '¿Deseas eliminar este producto?',
          header: 'Confirmar eliminación',
          icon: 'pi pi-trash',
          accept: () => {
            this.saving.set(true);
            this.productoSrv.eliminar(id).subscribe({
              next: () => {
                this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Producto eliminado correctamente' });
                this.recargarListado();
                this.limpiarFormulario();
                // Cerrar el diálogo después de eliminar
                this.showDialog = false;
                this.saving.set(false);
              },
              error: () => { this.saving.set(false); }
            });
          }
        });
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo validar los movimientos del producto antes de eliminar.',
          life: 6000
        });
      }
    });
  }

  guardar() {
    if (this.productoForm.invalid) { this.productoForm.markAllAsTouched(); this.mostrarToastsErrores(); return; }
    const {
      id,
      nombre,
      sku,
      categoria,
      unidadMedida,
      marca,
      modelo,
      stockMinimo,
      proveedor,
      descripcion
    } = this.productoForm.value as any;

    const catId = categoria !== null && categoria !== '' ? Number(categoria) : null;
    const provId = proveedor !== null && proveedor !== '' ? Number(proveedor) : null;

    const dto: ProductoDto = {
      id: id,
      id_producto: id,
      nombre,
      sku,
      id_categoria: catId,
      unidad_medida_id: unidadMedida !== null && unidadMedida !== '' ? Number(unidadMedida) : null,
      marca,
      modelo,
      stock_minimo: stockMinimo,
      proveedor_id: provId,
      descripcion
    } as ProductoDto;
    console.log('DTO a guardar', dto);
    const isNew = dto.id_producto === 0;
    const onSuccess = () => {
      this.messageService.add({ severity: 'success', summary: isNew ? 'Guardado' : 'Actualizado', detail: isNew ? 'Producto creado correctamente' : 'Producto actualizado correctamente' });
      this.recargarListado();
      this.productoSeleccionado.set(null);
      this.limpiarFormulario();
      this.showDialog = false;
      // Si el componente está embebido (no como diálogo) limpiamos el formulario
      if (!this.ref) {
        this.cancelar();
      }
    };
    this.confirmationService.confirm({
      message: isNew ? '¿Deseas guardar este nuevo producto?' : '¿Deseas actualizar este producto?',
      header: isNew ? 'Confirmar creación' : 'Confirmar actualización',
      icon: isNew ? 'pi pi-check' : 'pi pi-refresh',
      accept: () => {
        this.saving.set(true);
        const onError = (err: any) => {
          this.saving.set(false);
          const detail = (err?.error && (err.error.detail || err.error.title || err.error.message))
            || err?.message || err?.statusText || 'Ocurrió un error al guardar.';
          this.messageService.add({ severity: 'error', summary: 'Error al guardar', detail, life: 6000 });
          // Si es conflicto por nombre duplicado, marcar el control y enfocar
          if (err?.status === 409) {
            const ctl = this.productoForm.get('nombre');
            ctl?.setErrors({ ...(ctl.errors || {}), duplicado: true });
            ctl?.markAsTouched();
            try {
              const el = document.querySelector('input[formControlName="nombre"]') as HTMLInputElement | null;
              el?.focus();
              el?.select();
            } catch {}
          }
        };

        if (isNew) {
          this.productoSrv.crear(dto).subscribe({ next: () => { onSuccess(); this.saving.set(false); }, error: onError });
        } else {
          this.productoSrv.actualizar(dto).subscribe({ next: () => { onSuccess(); this.saving.set(false); }, error: onError });
        }
      }
    });
  }
}
