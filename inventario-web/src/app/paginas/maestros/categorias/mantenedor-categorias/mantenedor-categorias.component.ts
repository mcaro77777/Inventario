import { Component, OnInit, HostListener, ViewChild, ChangeDetectionStrategy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ProgressBarModule } from 'primeng/progressbar';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { Optional } from '@angular/core';
import { ToastModule } from 'primeng/toast';
import { CategoriaService, CategoriaDto } from '../../../../core/services/categoria.service';
import { exportAoaToXlsx } from '../../../../shared/utils/excel-export';


@Component({
  selector: 'app-mantenedor-categorias',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ProgressBarModule,
    InputTextModule,
    ButtonModule,
    DialogModule,
    ConfirmDialogModule,
    ToastModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './mantenedor-categorias.component.html',
  styles: [
    `
    :host {
      --panel-top: var(--surface-1, #ffffff);
      --panel-bot: var(--surface-2, #EEF2F8);
    }

    :host ::ng-deep .btn-strong-green { background-color: #2e7d32 !important; border-color: #2e7d32 !important; color: #fff !important; border-width: 1px !important; background-image: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.12)) !important; box-shadow: 0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12) !important; }
    :host ::ng-deep .btn-strong-amber { background-color: #f9a825 !important; border-color: #f9a825 !important; color: #fff !important; border-width: 1px !important; background-image: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(0,0,0,0.10)) !important; box-shadow: 0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.18) !important; }
    :host ::ng-deep .btn-strong-navy { background-color: #0d47a1 !important; border-color: #0d47a1 !important; color: #fff !important; border-width: 1px !important; background-image: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.14)) !important; box-shadow: 0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.16) !important; }

    :host ::ng-deep .export-button-container { display:flex; align-items:center; gap:.5rem; flex-wrap:nowrap; }
    :host ::ng-deep .export-button-container .toolbar-spacer { flex:1 1 auto; }

    :host ::ng-deep .p-datatable.p-datatable-sm .p-datatable-tbody > tr > td,
    :host ::ng-deep .p-datatable.p-datatable-sm .p-datatable-thead > tr > th { padding: 0.35rem 0.5rem; }
    :host ::ng-deep .p-datatable.p-datatable-sm .p-datatable-tbody > tr { line-height: 1.15; }

    :host ::ng-deep .mantenedor-datatable .p-datatable-thead > tr > th { background: var(--panel-top, #ffffff) !important; border-bottom: 1px solid var(--surface-border) !important; }
    :host ::ng-deep .mantenedor-datatable .p-datatable-thead > tr:first-child > th:first-child { border-top-left-radius: 8px; }
    :host ::ng-deep .mantenedor-datatable .p-datatable-thead > tr:first-child > th:last-child { border-top-right-radius: 8px; }
    :host ::ng-deep .p-inputtext.p-inputtext-sm { padding: 0.25rem 0.5rem; }

    :host ::ng-deep .mantenedor-datatable.p-datatable-sm { border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); background: linear-gradient(180deg, var(--panel-top, #ffffff), var(--panel-bot, #EEF2F8)); }
    /* Fila fija para alinear con virtualScrollOptions.itemSize (48px) */
    :host ::ng-deep .mantenedor-datatable .p-datatable-tbody > tr { height: 48px; }
    :host ::ng-deep .mantenedor-datatable .p-datatable-tbody > tr > td { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    /* Sin reglas de layout forzadas; igual que Proveedores */

    /* Ajuste de separación superior para igualar Proveedores */
    :host .page-header { margin-bottom: .125rem; }
    :host ::ng-deep .export-button-container { margin-top: 0; margin-bottom: .125rem; }

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
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MantenedorCategoriasComponent implements OnInit {
  @ViewChild('dt') dt!: Table;
  // Signals state
  readonly categorias = signal<CategoriaDto[]>([]);
  readonly categoriaSeleccionada = signal<CategoriaDto | null>(null);
  readonly loading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  // Control del diálogo
  showDialog = false;

  categoriaForm!: FormGroup;
  readonly formHabilitado = signal<boolean>(false);
  readonly scrollHeight = signal<string>('400px');

  constructor(
    private fb: FormBuilder,
    private categoriaSrv: CategoriaService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    @Optional() private ref?: DynamicDialogRef
  ) { }

  /* ------------------ Init ------------------ */
  ngOnInit(): void {
    this.updateScrollHeight();
    this.crearFormulario();
    this.cargarCategorias();
    this.actualizarHabilitacion();
  }

  /* ------------------ Data ------------------ */
  private cargarCategorias(): void {
    this.loading.set(true);
    this.categoriaSrv.listar().subscribe({
      next: data => {
        this.categorias.set(data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  /* ------------------ UI Helpers ------------------ */
  @HostListener('window:resize')
  onResize() { this.updateScrollHeight(); }

  /** Volver a la página anterior (sin depender del Router) */
  volver(): void {
    try { window.history.back(); } catch {}
  }

  private updateScrollHeight(): void {
    // Alinear offsets con mantenedor de productos para misma altura visual de tabla
    const offset = this.formHabilitado() ? 260 : 110;
    const vh = window.innerHeight;
    // Restar un buffer mayor para evitar que aparezca el scroll del body
    const buffer = 120; // margen de seguridad para evitar scroll del body
    this.scrollHeight.set(`${Math.max(200, vh - offset - buffer)}px`);
  }

  /* ------------------ Form ------------------ */
  private crearFormulario(): void {
    this.categoriaForm = this.fb.group({
      id: [0],
      nombre: ['', Validators.required]
    });
  }

  // Ya no se habilitan/deshabilitan campos; el formulario se muestra/oculta con *ngIf
  private actualizarHabilitacion(): void { /* deprecado */ }

  mostrarToastsErrores(): void {
    Object.entries(this.categoriaForm.controls).forEach(([k, ctl]) => {
      if (ctl.invalid) {
        const label = k.charAt(0).toUpperCase() + k.slice(1);
        this.messageService.add({ severity: 'error', summary: 'Error de validación', detail: `${label}: Campo obligatorio`, life: 4000 });
      }
    });
  }

  /* ------------------ Acciones ------------------ */
  modoCrear(): void {
    this.limpiarFormulario();
    this.formHabilitado.set(true);
    this.showDialog = true;
    this.updateScrollHeight();
  }

  seleccionarCategoria(cat: CategoriaDto | CategoriaDto[] | undefined): void {
    if (!cat) { return; }
    const categoria = Array.isArray(cat) ? cat[0] : cat;
    if (!categoria) return;
    this.categoriaSeleccionada.set(categoria);
    this.categoriaForm.patchValue(categoria);
    this.formHabilitado.set(true);
    this.showDialog = true;
    this.updateScrollHeight();
  }

  limpiarFormulario(): void {
    this.categoriaForm.reset({ id: 0 });
    this.categoriaSeleccionada.set(null);
    this.formHabilitado.set(false);
    this.updateScrollHeight();
  }

  cancelar(): void { this.limpiarFormulario(); this.showDialog = false; }

  clearFilters(): void {
    try { this.dt?.reset(); } catch {}
  }

  /** Confirma y elimina la categoría seleccionada */
  confirmarEliminar(): void {
    const id = this.categoriaForm.value.id;
    if (!id) { return; }
    this.confirmationService.confirm({
      message: '¿Deseas eliminar esta categoría?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-trash',
      accept: () => {
        this.saving.set(true);
        this.categoriaSrv.eliminar(id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Categoría eliminada correctamente' });
            this.recargarListado();
            this.cancelar();
            this.saving.set(false);
          },
          error: () => { this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la categoría' }); this.saving.set(false); }
        });
      }
    });
  }

  guardar(): void {
    if (this.categoriaForm.invalid) {
      this.categoriaForm.markAllAsTouched();
      this.mostrarToastsErrores();
      return;
    }
    const dto = this.categoriaForm.value as CategoriaDto;
    const isNew = dto.id === 0;

    const onSuccess = () => {
      this.messageService.add({
        severity: 'success',
        summary: isNew ? 'Guardado' : 'Actualizado',
        detail: isNew ? 'Categoría creada correctamente' : 'Categoría actualizada correctamente'
      });
      this.recargarListado();
      this.cancelar();
      this.showDialog = false;
    };

    this.confirmationService.confirm({
      message: isNew ? '¿Deseas guardar esta nueva categoría?' : '¿Deseas actualizar esta categoría?',
      header: isNew ? 'Confirmar creación' : 'Confirmar actualización',
      icon: isNew ? 'pi pi-check' : 'pi pi-refresh',
      accept: () => {
        this.saving.set(true);
        if (isNew) {
          this.categoriaSrv.crear(dto).subscribe({
            next: () => { onSuccess(); this.saving.set(false); },
            error: () => { this.saving.set(false); }
          });
        } else {
          this.categoriaSrv.actualizar(dto).subscribe({
            next: () => { onSuccess(); this.saving.set(false); },
            error: () => { this.saving.set(false); }
          });
        }
      }
    });
  }

  recargarListado(): void { this.cargarCategorias(); }

  /* ------------------ Dialog ------------------ */
  cerrarDialogo(): void { this.ref?.close(); }

  /* ------------------ Exportar Excel ------------------ */
  async exportarExcel(): Promise<void> {
    // Tomar filas filtradas si existen; en caso contrario, todas las filas
    const filtered = this.dt?.filteredValue as CategoriaDto[] | null | undefined;
    const items = Array.isArray(filtered) ? filtered : this.categorias();
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

    const headers = ['Nombre'];
    const aoa: any[][] = [headers];
    items.forEach(cat => aoa.push([cat.nombre]));

    await exportAoaToXlsx(aoa, 'Categorias', 'mantenedor_categorias.xlsx');
  }
}
