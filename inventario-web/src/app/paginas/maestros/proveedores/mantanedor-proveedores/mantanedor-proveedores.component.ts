import { Component, OnInit, HostListener, Optional, ViewChild, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ProgressBarModule } from 'primeng/progressbar';
import { InputTextModule } from 'primeng/inputtext';
import { InputMaskModule } from 'primeng/inputmask';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { exportAoaToXlsx } from '../../../../shared/utils/excel-export';

import { ProveedorService, ProveedorDto } from '../../../../core/services/proveedor.service';

/**
 * Validador RUT: acepta 1–8 dígitos con puntos de miles y guion + DV (0–9, K)
 * Formato: "1-9", "12.345-6", "7.000.000-8", "13.701.161-1", etc.
 */
export function rutValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = (control.value ?? '').toString().trim().toUpperCase();
    if (!raw) return null;

    // 1–3 dígitos, grupos opcionales ".xxx", luego "-" y dígito o "K"
    const regex = /^[0-9]{1,3}(?:\.[0-9]{3})*-[0-9K]$/;
    if (!regex.test(raw)) {
      return { rutFormato: true };
    }

    // Quitar puntos y guion para módulo 11
    const clean  = raw.replace(/\./g, '').replace(/-/g, '');
    const cuerpo = clean.slice(0, -1);
    const dv     = clean.slice(-1);

    let suma = 0, mult = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += +cuerpo[i] * mult;
      mult = mult === 7 ? 2 : mult + 1;
    }

    const resto      = suma % 11;
    const dvEsperado = resto === 0 ? '0' : resto === 1 ? 'K' : (11 - resto).toString();

    return dvEsperado === dv ? null : { rutDigito: true };
  };
}

@Component({
  selector: 'app-mantenedor-proveedores',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ProgressBarModule,
    InputTextModule,
    InputMaskModule,
    ButtonModule,
    SelectModule,
    DialogModule,
    ConfirmDialogModule,
    ToastModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './mantanedor-proveedores.component.html',
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

    /* Tabla compacta */
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
export class MantenedorProveedoresComponent implements OnInit {
  @ViewChild('dt') dt!: Table;
  // Signals
  readonly proveedores = signal<ProveedorDto[]>([]);
  readonly loading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  tiposProveedor = [
    { label: 'Local', value: 'Local' },
    { label: 'Nacional', value: 'Nacional' }
  ];

  proveedorForm!: FormGroup;
  readonly proveedorSeleccionado = signal<ProveedorDto | null>(null);
  readonly formHabilitado = signal<boolean>(false);
  readonly scrollHeight = signal<string>('400px');
  // Control del diálogo
  showDialog = false;

  constructor(
    private fb: FormBuilder,
    private proveedorSrv: ProveedorService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    @Optional() private ref?: DynamicDialogRef
  ) {}

  ngOnInit(): void {
    this.updateScrollHeight();
    this.crearFormulario();
    this.cargarProveedores();
    this.actualizarHabilitacion();
    this.updateScrollHeight();
  }

  /** Control de RUT para el template */
  get rutControl() {
    return this.proveedorForm.get('rut');
  }

  private crearFormulario(): void {
    this.proveedorForm = this.fb.group({
      id:            [0],
      nombre:        ['', Validators.required],
      rut:           ['', [Validators.required, rutValidator()]],
      telefono:      ['', [Validators.required, Validators.pattern(/^\d{9}$/)]],
      tipoProveedor: ['']
    });
  }

  cargarProveedores(): void {
    this.loading.set(true);
    this.proveedorSrv.listar().subscribe({
      next: data => { this.proveedores.set(data ?? []); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  modoCrear(): void {
    this.proveedorForm.reset({ id: 0 });
    this.proveedorSeleccionado.set(null);
    this.formHabilitado.set(true);
    this.actualizarHabilitacion();
    this.updateScrollHeight();
    this.showDialog = true;
  }

  seleccionarProveedor(selection?: ProveedorDto | ProveedorDto[]): void {
    const prov = Array.isArray(selection) ? selection[0] : selection;
    if (!prov) return;
    this.proveedorSeleccionado.set(prov);
    this.proveedorForm.patchValue(prov);
    this.formHabilitado.set(true);
    this.actualizarHabilitacion();
    this.updateScrollHeight();
    this.showDialog = true;
  }

  guardar(): void {
    if (this.proveedorForm.invalid) {
      this.proveedorForm.markAllAsTouched();
      this.mostrarToastsErrores();
      return;
    }
    const dto = this.proveedorForm.value as ProveedorDto;
    const esNuevo = dto.id === 0;
    this.confirmationService.confirm({
      message: esNuevo ? '¿Deseas guardar este nuevo proveedor?' : '¿Deseas actualizar este proveedor?',
      header:  esNuevo ? 'Confirmar creación' : 'Confirmar actualización',
      icon:    esNuevo ? 'pi pi-check' : 'pi pi-refresh',
      accept:  () => esNuevo ? this.crear(dto) : this.actualizar(dto)
    });
  }

  private crear(dto: ProveedorDto): void {
    this.saving.set(true);
    this.proveedorSrv.crear(dto).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Proveedor creado correctamente' });
        this.resetForm();
        this.showDialog = false;
        this.saving.set(false);
      },
      error: () => { this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear el proveedor' }); this.saving.set(false); }
    });
  }

  private actualizar(dto: ProveedorDto): void {
    this.saving.set(true);
    this.proveedorSrv.actualizar(dto).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Proveedor actualizado correctamente' });
        this.resetForm();
        this.showDialog = false;
        this.saving.set(false);
      },
      error: () => { this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar el proveedor' }); this.saving.set(false); }
    });
  }

  private resetForm(): void {
    this.cargarProveedores();
    this.proveedorForm.reset({ id: 0 });
    this.proveedorSeleccionado.set(null);
    this.formHabilitado.set(false);
    this.actualizarHabilitacion();
    this.updateScrollHeight();
    // Nota: No cerramos el diálogo aquí para permitir que permanezca abierto
    // después de operaciones como eliminar. Los cierres explícitos se manejan
    // en crear/actualizar/cancelar según corresponda.
  }

  private actualizarHabilitacion(): void {
    // Ya no activamos/desactivamos controles; la visibilidad se maneja en la plantilla.
  }

  cancelar(): void {
    this.resetForm();
    this.showDialog = false;
  }

  /** Confirma y elimina el proveedor seleccionado */
  confirmarEliminar(): void {
    const id = this.proveedorForm.value.id;
    if (!id) { return; }
    this.confirmationService.confirm({
      message: '¿Deseas eliminar este proveedor?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-trash',
      accept: () => {
        this.saving.set(true);
        this.proveedorSrv.eliminar(id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Proveedor eliminado correctamente' });
            this.cargarProveedores();
            this.resetForm();
            // Cerrar el popup después de eliminar
            this.showDialog = false;
            this.saving.set(false);
          },
          error: () => { this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el proveedor' }); this.saving.set(false); }
        });
      }
    });
  }

  /** Mostrar errores de RUT al perder foco */
  onRutBlur(): void {
    const ctl = this.rutControl;
    if (!ctl || !ctl.invalid) return;
    if (ctl.hasError('rutFormato')) {
      this.messageService.add({
        severity: 'error',
        summary: 'RUT inválido',
        detail: 'Formato debe ser “12.345.678-5”',
        life: 4000
      });
    } else if (ctl.hasError('rutDigito')) {
      this.messageService.add({
        severity: 'error',
        summary: 'RUT inválido',
        detail: 'Dígito verificador incorrecto',
        life: 4000
      });
    }
  }

  /** Mostrar toasts generales al guardar con errores */
  private mostrarToastsErrores(): void {
    Object.entries(this.proveedorForm.controls).forEach(([key, ctl]) => {
      if (!ctl.invalid) return;
      let detail = '';
      if (key === 'rut') {
        detail = ctl.hasError('rutFormato')
          ? 'RUT: formato inválido (p.ej. 12.345.678-5)'
          : ctl.hasError('rutDigito')
            ? 'RUT: dígito verificador incorrecto'
            : 'RUT: campo obligatorio';
      } else if (key === 'telefono') {
        detail = ctl.hasError('pattern')
          ? 'Teléfono debe contener 9 dígitos'
          : 'Teléfono: campo obligatorio';
      } else {
        detail = `${key.charAt(0).toUpperCase() + key.slice(1)}: campo obligatorio`;
      }
      this.messageService.add({ severity: 'error', summary: 'Error de validación', detail, life: 4000 });
    });
  }

  @HostListener('window:resize')
  private updateScrollHeight(): void {
    const offset = this.formHabilitado() ? 330 : 180;
    this.scrollHeight.set(`${Math.max(200, window.innerHeight - offset)}px`);
  }

  /** Volver a la página anterior (sin depender del Router) */
  volver(): void {
    try { window.history.back(); } catch {}
  }

  async exportarExcel(): Promise<void> {
    // Usar filas filtradas si existen; en caso contrario, todas las filas
    const filtered = this.dt?.filteredValue as ProveedorDto[] | null | undefined;
    const items = Array.isArray(filtered) ? filtered : this.proveedores();
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

    const headers = ['Nombre', 'RUT', 'Teléfono', 'Tipo'];
    const aoa: any[][] = [headers];
    items.forEach(p => aoa.push([p.nombre, p.rut, p.telefono, p.tipoProveedor]));

    await exportAoaToXlsx(aoa, 'Proveedores', 'mantenedor_proveedores.xlsx');
  }

  private descargar(blob: Blob, nombre: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // ───── Controles de pantalla completa ─────
  toggleMaximizar(): void {
    this.setMaximizado(true);
  }

  minimizar(): void {
    this.setMaximizado(false);
  }

  private setMaximizado(max: boolean): void {
    if (!this.ref) return;
    let overlay = (this.ref as any).el?.nativeElement as HTMLElement | null;
    while (overlay && !overlay.classList.contains('p-dynamic-dialog')) {
      overlay = overlay.parentElement;
    }
    if (!overlay) return;
    if (!overlay) return;

    if (max) {
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.maxWidth = '100vw';
      overlay.style.maxHeight = '100vh';
    } else {
      overlay.style.top = '';
      overlay.style.left = '';
      overlay.style.width = '80vw';
      overlay.style.maxWidth = '80vw';
      overlay.style.height = '';
      overlay.style.maxHeight = '';
    }
  }

  cerrarDialogo(): void {
    this.ref?.close();
  }

  clearFilters(): void {
    try { this.dt?.reset(); } catch {}
  }
}
