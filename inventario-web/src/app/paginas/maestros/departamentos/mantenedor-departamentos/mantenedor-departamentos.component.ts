import { Component, OnInit, ChangeDetectionStrategy, Optional, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ProgressBarModule } from 'primeng/progressbar';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

import { DepartamentoService, DepartamentoDto } from '../../../../core/services/departamento.service';

@Component({
  selector: 'app-mantenedor-departamentos',
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
  templateUrl: './mantenedor-departamentos.component.html',
  styles: [
    `
    :host {
      /* Fallbacks locales para panel si no existen en tokens globales */
      --panel-top: var(--surface-1, #ffffff);
      --panel-bot: var(--surface-2, #EEF2F8);
    }

    /* Colores fuertes reutilizables (igual que categorías) */
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

    /* Toolbar superior */
    :host ::ng-deep .export-button-container { display:flex; align-items:center; gap:.5rem; flex-wrap:nowrap; }
    :host ::ng-deep .export-button-container .toolbar-spacer { flex:1 1 auto; }

    /* Tabla compacta y header */
    :host ::ng-deep .p-datatable.p-datatable-sm .p-datatable-tbody > tr > td,
    :host ::ng-deep .p-datatable.p-datatable-sm .p-datatable-thead > tr > th { padding: 0.35rem 0.5rem; }
    :host ::ng-deep .p-datatable.p-datatable-sm .p-datatable-tbody > tr { line-height: 1.15; }
    :host ::ng-deep .mantenedor-datatable .p-datatable-thead > tr > th {
      background: var(--panel-top, var(--surface-1, #ffffff)) !important;
      border-bottom: 1px solid var(--surface-border) !important;
    }
    :host ::ng-deep .mantenedor-datatable .p-datatable-thead > tr:first-child > th:first-child { border-top-left-radius: 8px; }
    :host ::ng-deep .mantenedor-datatable .p-datatable-thead > tr:first-child > th:last-child { border-top-right-radius: 8px; }
    :host ::ng-deep .p-inputtext.p-inputtext-sm { padding: 0.25rem 0.5rem; }

    /* Contenedor tabla como tarjeta */
    :host ::ng-deep .mantenedor-datatable.p-datatable-sm {
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      background: linear-gradient(180deg, var(--panel-top, #ffffff), var(--panel-bot, #EEF2F8));
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
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MantenedorDepartamentosComponent implements OnInit {
  @ViewChild('dt') dt!: Table;

  readonly items = signal<DepartamentoDto[]>([]);
  readonly loading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly seleccionado = signal<DepartamentoDto | null>(null);
  readonly formHabilitado = signal<boolean>(false);
  showDialog = false;

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private svc: DepartamentoService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    @Optional() private ref?: DynamicDialogRef
  ) {}

  ngOnInit(): void {
    this.crearFormulario();
    this.cargar();
  }

  private crearFormulario(): void {
    this.form = this.fb.group({
      id: [0],
      nombre: ['', Validators.required]
    });
  }

  private cargar(): void {
    this.loading.set(true);
    this.svc.listar().subscribe({
      next: (d) => { this.items.set(d ?? []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  // UI actions
  modoCrear(): void {
    this.form.reset({ id: 0 });
    this.seleccionado.set(null);
    this.formHabilitado.set(true);
    this.showDialog = true;
  }

  seleccionar(row: DepartamentoDto | DepartamentoDto[] | undefined): void {
    if (!row) return;
    const r = Array.isArray(row) ? row[0] : row;
    if (!r) return;
    this.seleccionado.set(r);
    this.form.patchValue(r);
    this.formHabilitado.set(true);
    this.showDialog = true;
  }

  cancelar(): void {
    this.form.reset({ id: 0 });
    this.seleccionado.set(null);
    this.formHabilitado.set(false);
    this.showDialog = false;
  }

  clearFilters(): void { try { this.dt?.reset(); } catch {}
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const dto = this.form.value as DepartamentoDto;
    if (dto.id === 0) {
      this.confirmationService.confirm({
        message: '¿Deseas guardar este nuevo departamento?',
        header: 'Confirmar creación', icon: 'pi pi-check',
        accept: () => {
          this.saving.set(true);
          this.svc.crear({ nombre: dto.nombre }).subscribe({
            next: () => { this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Departamento creado correctamente' }); this.cargar(); this.cancelar(); this.saving.set(false); },
            error: () => { this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear' }); this.saving.set(false); }
          });
        }
      });
    } else {
      this.confirmationService.confirm({
        message: '¿Deseas actualizar este departamento?',
        header: 'Confirmar actualización', icon: 'pi pi-refresh',
        accept: () => {
          this.saving.set(true);
          this.svc.actualizar(dto).subscribe({
            next: () => { this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Departamento actualizado correctamente' }); this.cargar(); this.cancelar(); this.saving.set(false); },
            error: () => { this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar' }); this.saving.set(false); }
          });
        }
      });
    }
  }

  eliminarSeleccionado(): void {
    const id = this.form.value.id;
    if (!id) return;
    this.confirmationService.confirm({
      message: '¿Deseas eliminar este departamento?',
      header: 'Confirmar eliminación', icon: 'pi pi-trash',
      accept: () => {
        this.saving.set(true);
        this.svc.eliminar(id).subscribe({
          next: () => { this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Departamento eliminado' }); this.cargar(); this.cancelar(); this.saving.set(false); },
          error: () => { this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' }); this.saving.set(false); }
        });
      }
    });
  }

  nombreColumna(row: DepartamentoDto): string { return row?.nombre ?? ''; }

  /** Volver a la página anterior (sin depender del Router) */
  volver(): void { try { window.history.back(); } catch {} }

  /** Exportar listado a Excel (usa la tabla filtrada si aplica) */
  async exportarExcel(): Promise<void> {
    try {
      const filtered = this.dt?.filteredValue as DepartamentoDto[] | null | undefined;
      const rows = Array.isArray(filtered) ? filtered! : this.items();
      if (!rows || rows.length === 0) {
        this.messageService.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay registros para exportar' });
        return;
      }

      const headers = ['Nombre'];
      const aoa: any[][] = [headers];
      rows.forEach(r => aoa.push([r.nombre]));

      const XLSX = await import('xlsx-js-style');
      const ws: any = XLSX.utils.aoa_to_sheet(aoa);
      // Autofiltro en encabezado
      (ws as any)['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }) };
      // Ancho de columna simple
      (ws as any)['!cols'] = [{ wch: 40 }];
      // Estilo del encabezado
      headers.forEach((_, idx) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: idx });
        if (ws[cellRef]) {
          (ws[cellRef] as any).s = {
            fill: { fgColor: { rgb: '1F4E78' } },
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
      });

      const wb: any = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Departamentos');
      XLSX.writeFile(wb, 'departamentos.xlsx', { cellStyles: true });
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo exportar a Excel' });
    }
  }
}
