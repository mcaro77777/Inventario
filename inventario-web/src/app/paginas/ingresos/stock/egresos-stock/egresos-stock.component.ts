import { Component, OnInit, DestroyRef, Type } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';



import { StockService } from '../../../../core/services/stock.service';
import { ProductoService, ProductoDto } from '../../../../core/services/producto.service';
import { ClienteService, ClienteDto } from '../../../../core/services/cliente.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-egresos-stock',
  templateUrl: './egresos-stock.component.html',
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

    /* Paneles */
    :host ::ng-deep .ingreso-panel {
      flex: 1 1 280px;
      min-width: 260px;
      border-radius: 12px;
      border: 1px solid rgba(148, 163, 184, 0.4);
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
      overflow: hidden;
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

    /* Flex helpers */
    :host ::ng-deep .misat-flex-row-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
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
    :host ::ng-deep .form-label .required {
      color: #ef4444;
    }
    :host ::ng-deep .form-control {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 0.875rem;
      background: #fff;
      transition: border-color 0.15s, box-shadow 0.15s;
      width: 100%;
    }
    :host ::ng-deep .form-control:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
      outline: none;
    }

    /* Select y DatePicker */
    :host ::ng-deep .form-control-select,
    :host ::ng-deep .form-control-date {
      width: 100%;
    }
    :host ::ng-deep .form-control-select .p-select,
    :host ::ng-deep .p-select {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      width: 100%;
    }
    :host ::ng-deep .p-datepicker {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }

    /* Footer de botones */
    :host ::ng-deep .dialog-footer-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
    }
    :host ::ng-deep .btn-secondary {
      background: #fff !important;
      border: 1px solid #e2e8f0 !important;
      color: #475569 !important;
      border-radius: 8px;
      padding: 8px 20px;
      font-weight: 500;
    }
    :host ::ng-deep .btn-secondary:hover {
      background: #f8fafc !important;
      border-color: #cbd5e1 !important;
    }
    :host ::ng-deep .btn-accent {
      background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%) !important;
      border: none !important;
      color: #fff !important;
      border-radius: 8px;
      padding: 8px 20px;
      font-weight: 500;
    }
    :host ::ng-deep .btn-accent:hover {
      filter: brightness(1.08);
    }
  `],
  imports:[
    CommonModule,
    ReactiveFormsModule,
    SelectModule,
    DatePickerModule,
    InputTextModule,
    ButtonModule,
    ToastModule,
    ConfirmDialogModule,
    ProgressBarModule
  ],
  providers:[MessageService, ConfirmationService]
})
export class EgresosStockComponent implements OnInit {
  constructor(
    private fb: FormBuilder,
    private msg: MessageService,
    private confirmation: ConfirmationService,
    private ref: DynamicDialogRef,
    private config: DynamicDialogConfig,
    private stockSrv: StockService,
    private productoSrv: ProductoService,
    private clienteSrv: ClienteService,
    private auth: AuthService,
    private destroyRef: DestroyRef
  ) {}

  productos: ProductoDto[] = [];
  private preselectedProductoId: number | null = null;
  clientes : ClienteDto[]  = [];
  private preselectedClienteId: number | null = null;

  formulario!: FormGroup;
  saving = false;
  

  ngOnInit(): void {
    this.preselectedProductoId = this.config?.data?.productoId ?? null;
    this.preselectedClienteId = this.auth.usuarioIdActual;
    this.crearFormulario();
    this.cargarCombos();
  }

  /* ───────── Utilidades ───────── */
  private toNum = (v:any): number|null => { const n = Number(v); return isNaN(n)? null : n; };

  private noFutureValidator = (ctrl: AbstractControl): ValidationErrors | null => {
    const v:Date|null = ctrl.value;
    return (v && v > new Date()) ? { futureDate:true } : null;
  };

  private mostrarToastsErrores(): void {
    Object.entries(this.formulario.controls).forEach(([k, ctl]) => {
      if (ctl.invalid) {
        const label = k.charAt(0).toUpperCase() + k.slice(1);
        this.msg.add({ severity:'error', summary:'Error de validación', detail:`${label}: Campo obligatorio`, life:4000 });
      }
    });
  }

  /* ───────── Form ───────── */
  private crearFormulario(): void {
    this.formulario = this.fb.group({
      producto     : [null, Validators.required],
      cliente      : [null, Validators.required],
      fecha        : [{ value: new Date(), disabled: true }, [this.noFutureValidator]],
      cantidad     : [null, [Validators.required, Validators.min(1)]]
    });
  }

  onSubmit(): void {
    if (this.formulario.invalid) { this.formulario.markAllAsTouched(); this.mostrarToastsErrores(); return; }

    const raw = this.formulario.getRawValue();

    const payload = {
      producto       : this.toNum(raw.producto)!,
      fecha          : raw.fecha instanceof Date ? raw.fecha.toISOString().split('T')[0] : raw.fecha,
      cliente        : this.toNum(raw.cliente)!,
      cantidad       : this.toNum(raw.cantidad)!,
      tipo           : 1,  // 1 = retiro/egreso
      valorUnitario  : 0,  // No aplica para egresos
      descuento      : 0
    };

    this.saving = true;
    this.stockSrv.egresar(payload as any).subscribe({
      next : () => { 
        this.msg.add({ severity:'success', summary:'Solicitud enviada', detail:'El egreso fue registrado correctamente', life:3000 }); 
        this.saving = false; 
        this.ref.close(payload); 
      },
      error: (err) => { 
        this.saving = false; 
        const detail = err?.error?.detail || err?.message || 'No se pudo procesar la solicitud';
        this.msg.add({ severity:'error', summary:'Error al guardar', detail, life:4000 }); 
      }
    });
  }

  cerrarDialogo(): void { this.ref.close(); }

  confirmarGuardar(): void {
    if (this.formulario.invalid) { this.formulario.markAllAsTouched(); this.mostrarToastsErrores(); return; }
    this.confirmation.confirm({
      header: 'Confirmar',
      message: '¿Deseas guardar la solicitud?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: () => this.onSubmit()
    });
  }

  onMaximize(): void {
    const dlg = document.querySelector('.p-dynamic-dialog') as HTMLElement | null;
    if (dlg) dlg.classList.toggle('custom-max');
  }

  private cargarCombos(): void {
    this.productoSrv.listar().subscribe({
      next: d => {
        // Normalizar para que cada producto tenga propiedad 'id'
        this.productos = (d ?? []).map((p: any) => ({
          ...p,
          id: p.id ?? p.id_producto ?? p.idProducto
        }));
       
        if (this.preselectedProductoId) {
          const exists = this.productos.some(p => p.id === this.preselectedProductoId);
          if (exists) {
            // retrasamos para asegurar que el dropdown ya procesó la lista
            setTimeout(() => {
              this.formulario.patchValue({ producto: this.preselectedProductoId });
              this.formulario.get('producto')?.disable();
            });
          }
        }
      }
    });
    this.clienteSrv.listar().subscribe({
      next: d => {
        // Normalizar para que cada cliente tenga propiedad 'id'
        this.clientes = (d ?? []).map((c: any) => ({
          ...c,
          id: c.id ?? c.id_cliente ?? c.idCliente
        }));
        if (this.preselectedClienteId) {
          const exists = this.clientes.some(c => c.id === this.preselectedClienteId);
          if (exists) {
            setTimeout(() => {
              this.formulario.patchValue({ cliente: this.preselectedClienteId });
              this.formulario.get('cliente')?.disable();
            });
          }
        }
      }
    });
  }
}
