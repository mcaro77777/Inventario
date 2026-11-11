import { Component, OnInit, HostListener, Optional, ViewChild, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ProgressBarModule } from 'primeng/progressbar';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';

// Additional imports from the known-good file
import { PerfilService, PerfilDto } from '../../../../core/services/perfil.service';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { ClienteService, ClienteDto } from '../../../../core/services/cliente.service';
import { DepartamentoService, DepartamentoDto } from '../../../../core/services/departamento.service';

@Component({
  selector: 'app-mantenedor-clientes',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ProgressBarModule,
    InputTextModule,
    SelectModule,
    DialogModule,
    ButtonModule,
    ConfirmDialogModule,
    ToastModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './mantenedor-clientes.component.html',
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
  ]
  ,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MantenedorClientesComponent implements OnInit {
  @ViewChild('dt') dt!: Table;
  readonly clientes = signal<ClienteDto[]>([]);
  readonly loading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  perfiles: PerfilDto[] = [];
  private perfilMap = new Map<number, string>();
  departamentos: DepartamentoDto[] = [];
  private departamentoMap = new Map<number, string>();
  readonly clienteSeleccionado = signal<ClienteDto | null>(null);
  clienteForm!: FormGroup;
  readonly formHabilitado = signal<boolean>(false);
  // Control del diálogo
  showDialog = false;
  // Mensaje de error específico para RUT
  rutErrorMsg: string = '';

  /** Altura dinámica para virtual scroll */
  readonly scrollHeight = signal<string>('400px');

  constructor(
    private fb: FormBuilder,
    private clienteSrv: ClienteService,
    private perfilSrv: PerfilService,
    private departamentoSrv: DepartamentoService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    @Optional() private ref?: DynamicDialogRef
  ) { }

  ngOnInit(): void {
    this.updateScrollHeight();
    this.crearFormulario();
    this.cargarClientes();
    this.perfilSrv.listar().subscribe(p => {
      this.perfiles = p;
      this.perfilMap = new Map(p.map(x => [x.id, x.nombre]));
    });
    this.departamentoSrv.listar().subscribe(d => {
      this.departamentos = d;
      this.departamentoMap = new Map(d.map(x => [x.id, x.nombre]));
    });
    this.actualizarHabilitacion();

    // Limpiar error de RUT duplicado cuando el usuario modifica el campo
    const rutCtl = this.clienteForm.get('rut');
    rutCtl?.valueChanges.subscribe(() => {
      const errs = rutCtl.errors || {} as any;
      if (errs['rutDuplicado']) {
        delete errs['rutDuplicado'];
        rutCtl.setErrors(Object.keys(errs).length ? errs : null);
      }
      this.rutErrorMsg = '';
    });
  }

  // Getters para el template
  get f() { return this.clienteForm.controls; }
  get nombre() { return this.clienteForm.get('nombre'); }
  get usuario() { return this.clienteForm.get('usuario'); }
  get clave() { return this.clienteForm.get('clave'); }

  private cargarClientes(): void {
    this.loading.set(true);
    this.clienteSrv.listar().subscribe({
      next: data => { this.clientes.set(data ?? []); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  // Ya no se habilitan/deshabilitan campos individualmente; se mostrará u ocultará el formulario
  private actualizarHabilitacion(): void { /* Sin uso, se mantiene por compatibilidad */ }

  modoCrear(): void {
    this.limpiarFormulario();
    this.formHabilitado.set(true);
    this.updateScrollHeight();
    this.showDialog = true;
  }

  seleccionarCliente(c: ClienteDto | ClienteDto[] | undefined): void {
    if (!c) { return; }
    const cli: ClienteDto | undefined = Array.isArray(c) ? c[0] : c;
    if (!cli) { return; }
    this.clienteSeleccionado.set(cli);
    this.clienteForm.patchValue(cli);
    this.formHabilitado.set(true);
    this.updateScrollHeight();
    this.showDialog = true;
  }

  limpiarFormulario(): void {
    this.clienteForm.reset({ id: 0 });
    this.clienteSeleccionado.set(null);
    this.formHabilitado.set(false);
    this.updateScrollHeight();
  }

  cancelar(): void { this.limpiarFormulario(); this.showDialog = false; }

  clearFilters(): void {
    try { this.dt?.reset(); } catch {}
  }

  /** Confirma y elimina el cliente seleccionado */
  confirmarEliminar(): void {
    const id = this.clienteForm.value.id;
    if (!id) { return; }
    this.confirmationService.confirm({
      message: '¿Deseas eliminar este cliente?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-trash',
      accept: () => {
        this.saving.set(true);
        this.clienteSrv.eliminar(id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Cliente eliminado correctamente' });
            this.cargarClientes();
            this.cancelar();
            this.saving.set(false);
          },
          error: () => { this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el cliente' }); this.saving.set(false); }
        });
      }
    });
  }

  @HostListener('window:resize') onResize() { this.updateScrollHeight(); }

  private updateScrollHeight(): void {
    const offset = this.formHabilitado() ? 330 : 180;
    const newHeight = Math.max(200, window.innerHeight - offset);
    this.scrollHeight.set(`${newHeight}px`);
  }

  /** Volver a la página anterior (sin depender del Router) */
  volver(): void { try { window.history.back(); } catch {} }

  /** FormGroup */
  private crearFormulario(): void {
    this.clienteForm = this.fb.group({
      id: [0],
      nombre: ['', Validators.required],
      rut: [''],
      usuario: ['', Validators.required],
      clave: ['', Validators.required],
      id_perfil: [null, Validators.required],
      id_departamento: [null, Validators.required]
    });
  }

  private mostrarToastsErrores(): void {
    Object.entries(this.clienteForm.controls).forEach(([k, ctl]) => {
      if ((ctl as any).invalid) {
        const label = k.charAt(0).toUpperCase() + k.slice(1);
        this.messageService.add({ severity: 'error', summary: 'Error de validación', detail: `${label}: Campo obligatorio`, life: 4000 });
      }
    });
  }

  guardar(): void {
    if (this.clienteForm.invalid) {
      this.clienteForm.markAllAsTouched();
      this.mostrarToastsErrores();
      return;
    }

    const cliente = this.clienteForm.value as ClienteDto;

    if (cliente.id === 0) {
      this.confirmationService.confirm({
        message: '¿Deseas guardar este nuevo cliente?',
        header: 'Confirmar creación',
        icon: 'pi pi-check',
        accept: () => {
          this.saving.set(true);
          this.clienteSrv.crear(cliente).subscribe({
            next: () => {
              this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Cliente creado correctamente' });
              this.cargarClientes();
              this.cancelar();
              this.showDialog = false;
              this.saving.set(false);
            },
            error: (err) => {
              if (err?.status === 409) {
                const msg = (typeof err?.error === 'string' && err.error) ? err.error : 'Ya existe un cliente con este RUT.';
                this.messageService.add({ severity: 'error', summary: 'RUT duplicado', detail: msg });
                this.rutErrorMsg = msg;
                this.clienteForm.get('rut')?.setErrors({ rutDuplicado: true });
              } else {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear el cliente' });
              }
              this.saving.set(false);
            }
          });
        }
      });
    } else {
      this.confirmationService.confirm({
        message: '¿Deseas actualizar este cliente?',
        header: 'Confirmar actualización',
        icon: 'pi pi-refresh',
        accept: () => {
          this.saving.set(true);
          this.clienteSrv.actualizar(cliente).subscribe({
            next: () => {
              this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Cliente actualizado correctamente' });
              this.cargarClientes();
              this.cancelar();
              this.showDialog = false;
              this.saving.set(false);
            },
            error: (err) => {
              if (err?.status === 409) {
                const msg = (typeof err?.error === 'string' && err.error) ? err.error : 'Ya existe un cliente con este RUT.';
                this.messageService.add({ severity: 'error', summary: 'RUT duplicado', detail: msg });
                this.rutErrorMsg = msg;
                this.clienteForm.get('rut')?.setErrors({ rutDuplicado: true });
              } else {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar el cliente' });
              }
              this.saving.set(false);
            }
          });
        }
      });
    }
  }

  nombrePerfil(id: number | null): string {
    if (!id) { return ''; }
    return this.perfilMap.get(id) ?? id.toString();
  }

  nombreDepartamento(id: number | null): string {
    if (!id) { return ''; }
    return this.departamentoMap.get(id) ?? id.toString();
  }

  /* Dialog */
  cerrarDialogo(): void { this.ref?.close(); }

  /* ------------------ Exportar Excel ------------------ */
  async exportarExcel(): Promise<void> {
    // Usar filas filtradas si existen; en caso contrario, todas las filas
    const filtered = this.dt?.filteredValue as ClienteDto[] | null | undefined;
    const items = Array.isArray(filtered) ? filtered : this.clientes();
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
    const headers = ['Nombre', 'RUT', 'Usuario', 'Perfil'];
    const aoa: any[][] = [headers];
    items.forEach(c => aoa.push([
      c.nombre,
      c.rut,
      c.usuario,
      this.nombrePerfil(c.id_perfil ?? null)
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
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, 'mantenedor_clientes.xlsx', { cellStyles: true });
  }
}

