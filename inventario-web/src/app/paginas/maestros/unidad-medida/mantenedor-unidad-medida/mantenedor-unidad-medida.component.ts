import { Component, OnInit, HostListener, ViewChild, ChangeDetectionStrategy, signal, Optional } from '@angular/core';
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
import { ToastModule } from 'primeng/toast';
import { UnidadMedidaService, UnidadMedidaDto } from '../../../../core/services/unidad-medida.service';
import { exportAoaToXlsx } from '../../../../shared/utils/excel-export';

@Component({
  selector: 'app-mantenedor-unidad-medida',
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
  templateUrl: './mantenedor-unidad-medida.component.html',
  styles: [
    `
    :host {
      --panel-top: var(--surface-1, #ffffff);
      --panel-bot: var(--surface-2, #EEF2F8);
      --td-py: 4px;
      --td-px: 8px;
      display: block;
    }
    :host ::ng-deep .btn-strong-green { background-color: #2e7d32 !important; border-color: #2e7d32 !important; color: #fff !important; border-width: 1px !important; background-image: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.12)) !important; box-shadow: 0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12) !important; }
    :host ::ng-deep .btn-strong-amber { background-color: #f9a825 !important; border-color: #f9a825 !important; color: #fff !important; border-width: 1px !important; background-image: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(0,0,0,0.10)) !important; box-shadow: 0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.18) !important; }
    :host ::ng-deep .btn-strong-navy { background-color: #0d47a1 !important; border-color: #0d47a1 !important; color: #fff !important; border-width: 1px !important; background-image: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.14)) !important; box-shadow: 0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.16) !important; }
    :host ::ng-deep .export-button-container { display:flex; align-items:center; gap:.5rem; flex-wrap:nowrap; }
    :host ::ng-deep .export-button-container .toolbar-spacer { flex:1 1 auto; }
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
    :host ::ng-deep .mantenedor-datatable .p-datatable-thead > tr > th { background: var(--panel-top, #ffffff) !important; border-bottom: 1px solid var(--surface-border) !important; }
    :host ::ng-deep .mantenedor-datatable .p-datatable-thead > tr:first-child > th:first-child { border-top-left-radius: 8px; }
    :host ::ng-deep .mantenedor-datatable .p-datatable-thead > tr:first-child > th:last-child { border-top-right-radius: 8px; }
    :host ::ng-deep .p-inputtext.p-inputtext-sm { padding: 0.25rem 0.5rem; }
    :host ::ng-deep .mantenedor-datatable.p-datatable-sm { border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); background: linear-gradient(180deg, var(--panel-top, #ffffff), var(--panel-bot, #EEF2F8)); }

    /* Ocultar doble scrollbar del virtual scroll */
    :host ::ng-deep .mantenedor-datatable .p-datatable-wrapper {
      overflow: hidden !important;
    }
    :host ::ng-deep .mantenedor-datatable .p-scroller {
      overflow: auto !important;
    }
    :host ::ng-deep .mantenedor-datatable .p-datatable-scrollable-body {
      overflow: hidden !important;
    }

    :host main { display: block; }

    :host ::ng-deep .p-datatable table { border-collapse: separate; border-spacing: 0; box-sizing: border-box; }

    /* Ajuste de separación superior para igualar Categorías/Proveedores */
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
export class MantenedorUnidadMedidaComponent implements OnInit {
  @ViewChild('dt') dt!: Table;

  readonly unidades = signal<UnidadMedidaDto[]>([]);
  readonly unidadSeleccionada = signal<UnidadMedidaDto | null>(null);
  readonly loading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);

  showDialog = false;
  form!: FormGroup;
  readonly formHabilitado = signal<boolean>(false);
  readonly scrollHeight = signal<string>('400px');

  constructor(
    private fb: FormBuilder,
    private srv: UnidadMedidaService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    @Optional() private ref?: DynamicDialogRef
  ) {}

  ngOnInit(): void {
    this.updateScrollHeight();
    this.crearFormulario();
    this.cargar();
  }

  private cargar(): void {
    this.loading.set(true);
    this.srv.listar().subscribe({
      next: data => { this.unidades.set(data || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  @HostListener('window:resize') onResize() { this.updateScrollHeight(); }
  volver(): void { try { window.history.back(); } catch {} }
  private updateScrollHeight(): void {
    const offset = this.formHabilitado() ? 260 : 110;
    const vh = window.innerHeight;
    const buffer = 72;
    this.scrollHeight.set(`${Math.max(200, vh - offset - buffer)}px`);
  }

  private crearFormulario(): void {
    this.form = this.fb.group({ id: [0], descripcion: ['', Validators.required] });
  }

  mostrarToastsErrores(): void {
    Object.entries(this.form.controls).forEach(([k, ctl]) => {
      if (ctl.invalid) this.messageService.add({ severity: 'error', summary: 'Error de validación', detail: `${k}: Campo obligatorio`, life: 4000 });
    });
  }

  modoCrear(): void { this.limpiarFormulario(); this.formHabilitado.set(true); this.showDialog = true; this.updateScrollHeight(); }
  seleccionar(item: UnidadMedidaDto | UnidadMedidaDto[] | undefined): void {
    if (!item) return; const u = Array.isArray(item) ? item[0] : item; if (!u) return;
    this.unidadSeleccionada.set(u); this.form.patchValue(u); this.formHabilitado.set(true); this.showDialog = true; this.updateScrollHeight();
  }
  limpiarFormulario(): void { this.form.reset({ id: 0 }); this.unidadSeleccionada.set(null); this.formHabilitado.set(false); this.updateScrollHeight(); }
  cancelar(): void { this.limpiarFormulario(); this.showDialog = false; }
  clearFilters(): void { try { this.dt?.reset(); } catch {} }

  confirmarEliminar(): void {
    const id = this.form.value.id; if (!id) return;
    this.confirmationService.confirm({
      message: '¿Deseas eliminar esta unidad de medida?', header: 'Confirmar eliminación', icon: 'pi pi-trash',
      accept: () => {
        this.saving.set(true);
        this.srv.eliminar(id).subscribe({
          next: () => { this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Unidad de medida eliminada correctamente' }); this.recargarListado(); this.cancelar(); this.saving.set(false); },
          error: () => { this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la unidad de medida' }); this.saving.set(false); }
        });
      }
    });
  }

  guardar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.mostrarToastsErrores(); return; }
    const dto = this.form.value as UnidadMedidaDto; const isNew = dto.id === 0;
    const onSuccess = () => {
      this.messageService.add({ severity: 'success', summary: isNew ? 'Guardado' : 'Actualizado', detail: isNew ? 'Unidad de medida creada correctamente' : 'Unidad de medida actualizada correctamente' });
      this.recargarListado(); this.cancelar(); this.showDialog = false;
    };
    this.confirmationService.confirm({
      message: isNew ? '¿Deseas guardar esta nueva unidad de medida?' : '¿Deseas actualizar esta unidad de medida?',
      header: isNew ? 'Confirmar creación' : 'Confirmar actualización',
      icon: isNew ? 'pi pi-check' : 'pi pi-refresh',
      accept: () => {
        this.saving.set(true);
        if (isNew) {
          this.srv.crear(dto).subscribe({ next: () => { onSuccess(); this.saving.set(false); }, error: () => { this.saving.set(false); } });
        } else {
          this.srv.actualizar(dto).subscribe({ next: () => { onSuccess(); this.saving.set(false); }, error: () => { this.saving.set(false); } });
        }
      }
    });
  }

  recargarListado(): void { this.cargar(); }

  /* ------------------ Exportar Excel ------------------ */
  async exportarExcel(): Promise<void> {
    const filtered = this.dt?.filteredValue as UnidadMedidaDto[] | null | undefined;
    const items = Array.isArray(filtered) ? filtered : this.unidades();
    if (!items || items.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay registros para exportar' });
      return;
    }
    this.messageService.add({ severity: 'info', summary: 'Exportando', detail: `Exportando ${items.length} registro(s) a Excel...`, life: 2000 });
    const headers = ['Descripción'];
    const aoa: any[][] = [headers];
    items.forEach(u => aoa.push([u.descripcion]));
    await exportAoaToXlsx(aoa, 'UnidadMedida', 'mantenedor_unidad_medida.xlsx');
  }
}
