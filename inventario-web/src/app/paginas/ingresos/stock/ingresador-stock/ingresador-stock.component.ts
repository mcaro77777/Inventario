/****************************************************************************************
 * ingresador-stock.component.ts  –  Versión sin errores de tipos
 ****************************************************************************************/
import { Component, OnInit, DestroyRef } from '@angular/core';
import {
  FormBuilder, FormGroup, Validators,
  AbstractControl, ValidationErrors, ReactiveFormsModule
} from '@angular/forms';
import { CommonModule } from '@angular/common';

/* PrimeNG */
import { SelectModule }   from 'primeng/select';
import { DatePickerModule }   from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule }  from 'primeng/inputtext';
import { ButtonModule }     from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule }      from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageService, ConfirmationService }   from 'primeng/api';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';

/* Servicio y DTOs */
import { StockService, IngresoStockDto, ArchivoUploadResultDto } from '../../../../core/services/stock.service';
import { ProductoService, ProductoDto } from '../../../../core/services/producto.service';
import { ProveedorService, ProveedorDto } from '../../../../core/services/proveedor.service';

import { combineLatest, map, startWith } from 'rxjs';
import { takeUntilDestroyed }            from '@angular/core/rxjs-interop';

@Component({
  standalone: true,
  selector   : 'app-ingresador-stock',
  templateUrl: './ingresador-stock.component.html',
  styles: [`
    /* ====== Estilos MisAtenciones para popup ====== */

    /* Grid del formulario */
    :host ::ng-deep .ingreso-form-grid {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    :host ::ng-deep .ingreso-row {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
    }
    :host ::ng-deep .ingreso-row > .ingreso-panel {
      flex: 1 1 300px;
      min-width: 280px;
    }

    /* Paneles estilo MisAtenciones */
    :host ::ng-deep .ingreso-panel {
      margin-bottom: 0;
      border-radius: 12px;
      border: 1px solid rgba(148, 163, 184, 0.4);
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
      overflow: hidden;
      background: #fff;
    }
    :host ::ng-deep .ingreso-panel .p-panel-header {
      background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
      border-bottom: 1px solid rgba(148, 163, 184, 0.3);
      padding: 10px 14px;
      font-weight: 600;
      font-size: 0.875rem;
      color: #334155;
      border-radius: 12px 12px 0 0;
    }
    :host ::ng-deep .ingreso-panel .p-panel-content {
      padding: 14px;
      background: #ffffff;
      border-radius: 0 0 12px 12px;
    }

    /* Campos del formulario */
    :host ::ng-deep .form-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    :host ::ng-deep .form-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #475569;
    }
    :host ::ng-deep .required-asterisk {
      color: #ef4444;
      margin-left: 2px;
    }

    /* Flex helpers */
    :host ::ng-deep .misat-flex-row-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    /* Inputs PrimeNG estilizados */
    :host ::ng-deep .form-control-select,
    :host ::ng-deep .form-control-date,
    :host ::ng-deep .form-control-number {
      width: 100%;
    }
    :host ::ng-deep .p-select,
    :host ::ng-deep .p-datepicker,
    :host ::ng-deep .p-inputnumber {
      width: 100%;
    }
    :host ::ng-deep .p-select .p-select-label,
    :host ::ng-deep .p-inputtext,
    :host ::ng-deep .p-inputnumber-input {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 0.875rem;
      background: #fff;
    }
    :host ::ng-deep .p-select:not(.p-disabled):hover,
    :host ::ng-deep .p-inputtext:enabled:hover {
      border-color: #cbd5e1;
    }
    :host ::ng-deep .p-select.p-focus,
    :host ::ng-deep .p-inputtext:enabled:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
      outline: none;
    }
    :host ::ng-deep .readonly .p-inputnumber-input {
      background: #f8fafc;
      color: #64748b;
    }

    /* Botón upload */
    :host ::ng-deep .btn-upload {
      background: linear-gradient(180deg, #2e7d32 0%, #1b5e20 100%) !important;
      border: none !important;
      color: #fff !important;
      border-radius: 8px !important;
      font-size: 0.8rem !important;
    }

    /* Archivo subido indicator */
    :host ::ng-deep .archivo-subido {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 6px;
      color: #16a34a;
      font-size: 0.75rem;
    }
    :host ::ng-deep .archivo-subido i {
      color: #16a34a;
    }
    :host ::ng-deep .archivo-subido a {
      color: #2563eb;
      text-decoration: none;
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    :host ::ng-deep .archivo-subido a:hover {
      text-decoration: underline;
    }

    /* Lista de gastos */
    :host ::ng-deep .gastos-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    :host ::ng-deep .gastos-list li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px;
      background: #f8fafc;
      border-radius: 6px;
      margin-bottom: 6px;
      font-size: 0.85rem;
    }

    /* Footer con botones */
    :host ::ng-deep .dialog-footer-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
    }
    :host ::ng-deep .btn-accent {
      background: linear-gradient(180deg, #2e7d32 0%, #1b5e20 100%) !important;
      border: none !important;
      color: #fff !important;
      border-radius: 8px !important;
      padding: 8px 16px !important;
      font-weight: 500 !important;
    }
    :host ::ng-deep .btn-accent:hover {
      filter: brightness(1.1);
    }
    :host ::ng-deep .btn-secondary {
      background: #fff !important;
      border: 1px solid #cbd5e1 !important;
      color: #475569 !important;
      border-radius: 8px !important;
      padding: 8px 16px !important;
      font-weight: 500 !important;
    }
    :host ::ng-deep .btn-secondary:hover {
      background: #f8fafc !important;
      border-color: #94a3b8 !important;
    }

    /* Modo oscuro - inputs y dropdowns */
    body.dark-theme :host ::ng-deep .p-select .p-select-label,
    body.dark-theme :host ::ng-deep .p-inputtext,
    body.dark-theme :host ::ng-deep .p-inputnumber-input {
      background: var(--input) !important;
      color: #ffffff !important;
      border-color: #475569 !important;
    }
    body.dark-theme :host ::ng-deep .p-select {
      background: var(--input) !important;
      border-color: #475569 !important;
    }
    body.dark-theme :host ::ng-deep .p-select .p-select-label:not(.p-placeholder) {
      color: #ffffff !important;
    }
    body.dark-theme :host ::ng-deep .p-select .p-select-label.p-placeholder {
      color: rgba(255,255,255,0.5) !important;
    }
  `],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectModule,
    DatePickerModule,
    InputTextModule,
    InputNumberModule,
    FileUploadModule,
    ButtonModule,
    ToastModule,
    ConfirmDialogModule
    ,ProgressBarModule
  ],
  providers: [MessageService, ConfirmationService]
})
export class IngresadorStockComponent implements OnInit {

  constructor(
    private fb : FormBuilder,
    private msg: MessageService,
    private confirmation: ConfirmationService,
    private ref: DynamicDialogRef,
    private config: DynamicDialogConfig,
    private stockSrv: StockService,
    private productoSrv: ProductoService,
    private proveedorSrv: ProveedorService,
    private destroyRef: DestroyRef
  ) {}

  /* ───────── Combos ───────── */
  productos  : ProductoDto[]  = [];
  proveedores: ProveedorDto[] = [];
  estados = [
    { id:1, nombre:'Disponible' },
    { id:2, nombre:'Pendiente'  }
  ];

  /* Form y lista de gastos */
  formulario!: FormGroup;
  gastos: { desc: string; valor: number }[] = [];
  saving = false;

  /* Archivos adjuntos */
  archivosAdjuntos: { [key: string]: { fileName: string; originalName: string } } = {};

  private preselectedProductoId: number | null = null;
  private preselectedProveedorId: number | null = null;

  /* ─────────────────── Init ─────────────────── */
  ngOnInit(): void {
    this.preselectedProductoId   = this.config?.data?.productoId   ?? null;
    this.preselectedProveedorId = this.config?.data?.proveedorId ?? null;
    this.crearFormulario();
    this.registrarCalculos();
    this.cargarCombos();
  }

  /* ───────── FormGroup ───────── */
  private crearFormulario(): void {
    this.formulario = this.fb.group({
      producto     : [null, Validators.required],
      proveedor    : [null, Validators.required],
      fecha        : [new Date(), [Validators.required, this.noFutureValidator]],
      marca        : [''],
      modelo       : [''],
      estado       : [1, Validators.required],
      cantidad     : [null, [Validators.required, Validators.min(1)]],
      valorUnitario: [null, [Validators.required, Validators.min(0)]],
      subTotal     : [{ value:null, disabled:true }],
      descuento    : [0, [Validators.min(0), Validators.max(100)]],
      subTotalIVA  : [{ value:null, disabled:true }],
      total        : [{ value:null, disabled:true }],
      gastoDesc    : [''],
      gastoValor   : [null, Validators.min(0)]
    });
  }

  /* ───────── Cálculos de totales ───────── */
  private registrarCalculos(): void {
    const c = (n:string) => this.formulario.get(n)!;

    combineLatest([
      c('cantidad')    .valueChanges.pipe(startWith(null)),
      c('valorUnitario').valueChanges.pipe(startWith(null)),
      c('descuento')    .valueChanges.pipe(startWith(0)),
      c('proveedor')    .valueChanges.pipe(startWith(null))
    ])
    .pipe(
      map(([cant, vUnit, desc, prov]) => this.calcSubTotales(+cant, +vUnit, +desc, prov)),
      takeUntilDestroyed(this.destroyRef)
    )
    .subscribe();

    c('subTotalIVA').valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.calcTotal());
  }

  private calcSubTotales(cant:number, vUnit:number, desc:number, provId:number | null): void {
  // Determinar IVA según tipo de proveedor
  const prov   = this.proveedores.find(p => p.id === provId);
  const ivaRate = prov?.tipoProveedor === 'Local' ? 0 : 0.19;  // Local sin IVA, Nacional con IVA

    if (!cant || !vUnit) {
      this.formulario.patchValue({ subTotal:null, subTotalIVA:null }, { emitEvent:false });
      return;
    }
    const subTotal = cant * vUnit;
  const base    = subTotal * (1 + ivaRate);
  const subTotalIVA = base - (base * desc / 100);

    this.formulario.patchValue({ subTotal, subTotalIVA }, { emitEvent:false });
    this.calcTotal();
  }

  private calcTotal(): void {
    const subIva = this.formulario.get('subTotalIVA')!.value as number | null;
    const gastosTotal = this.gastos.reduce((a,g) => a + g.valor, 0);
    const total = (subIva ?? 0) - gastosTotal;
    this.formulario.patchValue({ total }, { emitEvent:false });
  }

  /* ───────── Gastos ───────── */
  addGasto(): void {
    const desc  = this.formulario.get('gastoDesc')!.value?.trim();
    const valor = +this.formulario.get('gastoValor')!.value;

    if (!desc || !valor) {
      this.msg.add({ severity:'warn', summary:'Completa descripción y valor' });
      return;
    }
    this.gastos.push({ desc, valor });
    this.formulario.patchValue({ gastoDesc:'', gastoValor:null });
    this.calcTotal();
  }
  removeGasto(i:number): void { this.gastos.splice(i,1); this.calcTotal(); }

  /* ───────── Validación fecha futura ───────── */
  private noFutureValidator = (ctrl: AbstractControl): ValidationErrors | null => {
    const v:Date|null = ctrl.value;
    return (v && v > new Date()) ? { futureDate:true } : null;
  };

  /* ───────── Submit ───────── */
  private toNum = (v:any): number|null => {
    const n = Number(v); return isNaN(n) ? null : n;
  };

  onSubmit(): void {
    if (this.formulario.invalid) { this.formulario.markAllAsTouched(); this.mostrarToastsErrores(); return; }

    const raw = this.formulario.getRawValue();

    /* Resolvemos nombre/SKU/proveedorNombre a partir de los arrays (opcional) */
    const prodSel = this.productos  .find(p => p.id === raw.producto);
    const provSel = this.proveedores.find(p => p.id === raw.proveedor);

    const payload: IngresoStockDto = {
      /* IDs */
      producto       : this.toNum(raw.producto)!,
      proveedor      : this.toNum(raw.proveedor),     
      fecha          : raw.fecha instanceof Date ? raw.fecha.toISOString().split('T')[0] : raw.fecha,
      estado         : this.toNum(raw.estado)!,
      cantidad       : this.toNum(raw.cantidad)!,
      valorUnitario  : this.toNum(raw.valorUnitario)!,      
      descuento      : this.toNum(raw.descuento)!,      
      tipo           : 0,
      docOrdenCompra : this.archivosAdjuntos['ordenCompra']?.fileName ?? null,
      docFactura     : this.archivosAdjuntos['factura']?.fileName ?? null,
      docGuiaDespacho: this.archivosAdjuntos['guiaDespacho']?.fileName ?? null,
      docNotaCreditoDebito: this.archivosAdjuntos['notaCreditoDebito']?.fileName ?? null
    };

    this.saving = true;
    this.stockSrv.ingresar(payload).subscribe({
      next : () => {
        console.log('Ingreso guardado' + payload);
        this.msg.add({ severity:'success', summary:'Ingreso guardado', life:3000 });
        this.saving = false;
        this.ref.close(payload);
      },
      error: () => {
        this.saving = false;
        this.msg.add({ severity:'error',   summary:'Error al guardar',  life:4000 });
      }
    });
  }

  /* ───────── Confirmación Guardar ───────── */
  confirmarGuardar(): void {
    // Primero validar. Si hay errores, mostrarlos y no abrir el confirm.
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.mostrarToastsErrores();
      return;
    }

    // Si es válido, recién mostrar confirmación
    this.confirmation.confirm({
      header: 'Confirmar',
      message: '¿Deseas guardar el ingreso?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: () => this.onSubmit()
    });
  }

  /* ───────── Toasts de error ───────── */
  private mostrarToastsErrores(): void {
    Object.entries(this.formulario.controls).forEach(([k, ctl]) => {
      if (ctl.invalid) {
        const label = k.charAt(0).toUpperCase() + k.slice(1);
        this.msg.add({ severity:'error', summary:'Error de validación', detail:`${label}: Campo obligatorio`, life:4000 });
      }
    });
  }

  /* ───────── Cerrar diálogo ───────── */
  cerrarDialogo(): void { this.ref.close(); }

  /* ───────── Cargar combos vía servicio ───────── */
  private cargarCombos(): void {
    this.productoSrv.listar().subscribe({
      next : d => {
      // Normalizar para que cada producto tenga propiedad 'id'
      this.productos = (d ?? []).map((p: any) => ({
        ...p,
        id: p.id ?? p.id_producto ?? p.idProducto
      }));
      if (this.preselectedProductoId) {
        // Si el id existe en la lista, seleccionar
        const exists = this.productos.some(p => p.id === this.preselectedProductoId);
        if (exists) {
          this.formulario.patchValue({ producto: this.preselectedProductoId });
        this.formulario.get('producto')?.disable();
        }
      }
    },
      error: () => this.msg.add({ severity:'error', summary:'Error al cargar productos', life:4000 })
    });
    this.proveedorSrv.listar().subscribe({
      next : d => {
        this.proveedores = (d ?? []).map(p => ({
          ...p,
          label: p.tipoProveedor ? `${p.nombre} (${p.tipoProveedor})` : p.nombre
        }));
        if (this.preselectedProveedorId) {
          const exists = this.proveedores.some(p => p.id === this.preselectedProveedorId);
          if (exists) {
            this.formulario.patchValue({ proveedor: this.preselectedProveedorId });
          }
        }
      },
      error: () => this.msg.add({ severity:'error', summary:'Error al cargar proveedores', life:4000 })
    });
  }

  /* ───────── Upload de archivos ───────── */
  onUpload(event: any, tipo: string): void {
    const file = event.files?.[0];
    if (!file) return;

    this.stockSrv.uploadArchivo(file, tipo).subscribe({
      next: (result: ArchivoUploadResultDto) => {
        this.archivosAdjuntos[tipo] = {
          fileName: result.fileName,
          originalName: result.originalName
        };
        this.msg.add({
          severity: 'success',
          summary: 'Archivo subido',
          detail: `${result.originalName} cargado correctamente`,
          life: 3000
        });
      },
      error: (err) => {
        console.error('Error al subir archivo:', err);
        this.msg.add({
          severity: 'error',
          summary: 'Error al subir',
          detail: `No se pudo subir ${file.name}`,
          life: 4000
        });
      }
    });
  }

  /* Obtener URL de archivo para visualizar */
  getArchivoUrl(tipo: string): string | null {
    const archivo = this.archivosAdjuntos[tipo];
    return archivo ? this.stockSrv.getArchivoUrl(archivo.fileName) : null;
  }
}
