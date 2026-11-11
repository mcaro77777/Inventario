import { Component, OnInit, HostListener, Optional, ViewChild, ChangeDetectionStrategy, signal } from '@angular/core';
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
import { PerfilService, PerfilDto } from '../../../../core/services/perfil.service';
// Excel export con estilos
// XLSX se cargará dinámicamente al exportar para evitar advertencias en navegador

@Component({
  selector: 'app-mantenedor-perfiles',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ProgressBarModule,
    InputTextModule,
    DialogModule,
    ButtonModule,
    ConfirmDialogModule,
    ToastModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './mantenedor-perfiles.component.html',
  styles: [
    `
    :host {
      --panel-top: var(--surface-1, #ffffff);
      --panel-bot: var(--surface-2, #EEF2F8);
    }

    /* Botones fuertes */
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

    /* Tabla compacta, header y contenedor tipo tarjeta */
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
  ]
  ,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MantenedorPerfilesComponent implements OnInit {
  @ViewChild('dt') dt!: Table;
  readonly perfiles = signal<PerfilDto[]>([]);
  readonly perfilSeleccionado = signal<PerfilDto | null>(null);
  loading = false;

  perfilForm!: FormGroup;
  readonly formHabilitado = signal<boolean>(false);
  readonly scrollHeight = signal<string>('400px');
  // Control del diálogo
  showDialog = false;

  constructor(
    private fb: FormBuilder,
    private perfilSrv: PerfilService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    @Optional() private ref?: DynamicDialogRef
  ) { }

  ngOnInit(): void {
    this.updateScrollHeight();
    this.crearFormulario();
    this.cargarPerfiles();
    this.updateScrollHeight();
  }

  /* Data */
  private cargarPerfiles(): void {
    this.loading = true;
    this.perfilSrv.listar().subscribe({
      next: d => {
        const raw = d || [];
        // Normalizar para que la tabla tenga siempre 'id', 'nombre', 'descripcion'
        const normalized = raw.map((p: any) => ({
          id: p.id ?? p.id_perfil ?? p.idPerfil ?? 0,
          nombre: p.nombre ?? p.name ?? '',
          descripcion: p.descripcion ?? p.description ?? ''
        })) as PerfilDto[];
        this.perfiles.set(normalized);
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  /* UI helpers */
  @HostListener('window:resize') onResize() { this.updateScrollHeight(); }

  /** Volver a la página anterior (sin depender del Router) */
  volver(): void { try { window.history.back(); } catch {} }

  private updateScrollHeight(): void {
    const offset = this.formHabilitado() ? 330 : 180;
    this.scrollHeight.set(`${Math.max(150, window.innerHeight - offset)}px`);
  }

  /* Form */
  private crearFormulario(): void {
    this.perfilForm = this.fb.group({
      id: [0],
      nombre: ['', Validators.required],
      descripcion: ['']
    });
  }

  // Ya no se habilitan/deshabilitan campos; el formulario se muestra u oculta con *ngIf
  private actualizarHabilitacion(): void { /* deprecado */ }

  mostrarToastsErrores(): void {
    Object.entries(this.perfilForm.controls).forEach(([k, ctl]) => {
      if (ctl.invalid) {
        const label = k.charAt(0).toUpperCase() + k.slice(1);
        this.messageService.add({ severity: 'error', summary: 'Error de validación', detail: `${label}: Campo obligatorio`, life: 4000 });
      }
    });
  }

  /* Acciones */
  modoCrear(): void {
    this.limpiarFormulario();
    this.formHabilitado.set(true);
    this.showDialog = true;
    this.updateScrollHeight();
  }

  seleccionarPerfil(p: PerfilDto | PerfilDto[] | undefined): void {
    if (!p) return;
    const perfil = Array.isArray(p) ? p[0] : p;
    if (!perfil) return;
    this.perfilSeleccionado.set(perfil);
    this.perfilForm.patchValue(perfil);
    this.formHabilitado.set(true);
    this.showDialog = true;
    this.updateScrollHeight();
  }

  limpiarFormulario(): void {
    this.perfilForm.reset({ id: 0 });
    this.perfilSeleccionado.set(null);
    this.formHabilitado.set(false);
    this.updateScrollHeight();
  }

  cancelar(): void { this.limpiarFormulario(); this.showDialog = false; }

  clearFilters(): void {
    try { this.dt?.reset(); } catch {}
  }

  /** Confirma y elimina el perfil seleccionado */
  confirmarEliminar(): void {
    const id = this.perfilForm.value.id;
    if (!id) { return; }
    this.confirmationService.confirm({
      message: '¿Deseas eliminar este perfil?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-trash',
      accept: () => {
        this.perfilSrv.eliminar(id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Perfil eliminado correctamente' });
            this.recargarListado();
            this.cancelar();
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el perfil' })
        });
      }
    });
  }

  guardar(): void {
    if (this.perfilForm.invalid) {
      this.perfilForm.markAllAsTouched();
      this.mostrarToastsErrores();
      return;
    }

    const dto = this.perfilForm.value as PerfilDto;
    const isNew = dto.id === 0;

    const onSuccess = () => {
      this.messageService.add({ severity: 'success', summary: isNew ? 'Guardado' : 'Actualizado', detail: isNew ? 'Perfil creado correctamente' : 'Perfil actualizado correctamente' });
      this.recargarListado();
      this.cancelar();
      this.showDialog = false;
    };

    this.confirmationService.confirm({
      message: isNew ? '¿Deseas guardar este nuevo perfil?' : '¿Deseas actualizar este perfil?',
      header: isNew ? 'Confirmar creación' : 'Confirmar actualización',
      icon: isNew ? 'pi pi-check' : 'pi pi-refresh',
      accept: () => {
        if (isNew) {
          this.perfilSrv.crear(dto).subscribe(onSuccess);
        } else {
          this.perfilSrv.actualizar(dto).subscribe(onSuccess);
        }
      }
    });
  }

  recargarListado(): void { this.cargarPerfiles(); }

  /* Dialog */
  cerrarDialogo(): void { this.ref?.close(); }

  /* ------------------ Exportar Excel ------------------ */
  async exportarExcel(): Promise<void> {
    // Usar filas filtradas si existen; en caso contrario, todas las filas
    const filtered = this.dt?.filteredValue as PerfilDto[] | null | undefined;
    const items = Array.isArray(filtered) ? filtered : this.perfiles();
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

    const headers = ['Nombre', 'Descripción'];
    const aoa: any[][] = [headers];
    items.forEach(p => aoa.push([
      p.nombre,
      p.descripcion ?? ''
    ]));

    const XLSX = await import('xlsx-js-style');
    const ws: any = XLSX.utils.aoa_to_sheet(aoa);
    (ws as any)['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }) };

    const colWidths = headers.map((h, idx) => {
      const max = aoa.reduce((m, row) => Math.max(m, String(row[idx] ?? '').length), h.length);
      return { wch: max + 2 };
    });
    (ws as any)['!cols'] = colWidths;

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
    XLSX.utils.book_append_sheet(wb, ws, 'Perfiles');
    XLSX.writeFile(wb, 'mantenedor_perfiles.xlsx', { cellStyles: true });
  }
}

