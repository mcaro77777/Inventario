/**************************************************************************
 *  asignacion-permisos.component.ts – Angular 20 zoneless + signals
 *  · Lista todos los perfiles con p-radioButton
 *  · Al seleccionar un perfil carga la tabla de permisos
 *  · Tabla con filtros por columna, virtual scroll y checkbox editable
 **************************************************************************/

import { Component, inject, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

/* ─── PrimeNG ────────────────────────────────────────────────────────── */
import { RadioButton }       from 'primeng/radiobutton';
import { Table, TableModule } from 'primeng/table';
import { Checkbox }          from 'primeng/checkbox';
import { Button }            from 'primeng/button';
import { Toast }             from 'primeng/toast';
import { MultiSelect }       from 'primeng/multiselect';
import { InputText }         from 'primeng/inputtext';
import { ProgressSpinner }   from 'primeng/progressspinner';
import { MessageService }    from 'primeng/api';
import { forkJoin }          from 'rxjs';

/* ─── Servicios de tu app ────────────────────────────────────────────── */
import { PerfilService, PerfilDto, PermisoDto }
        from '../../../../core/services/Asignacion-permisos.service';
import { AuthService }
        from '../../../../core/services/auth.service';

/* ─── Fila tipada con index signature para los filtros ──────────────── */
interface PermisoRow extends PermisoDto {
  asignado: boolean;
  [key: string]: any;
}

@Component({
  selector: 'app-asignacion-permisos',
  standalone: true,
  templateUrl: './asignacion-permisos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  imports: [
    FormsModule,
    RadioButton, TableModule, Checkbox, Button,
    Toast, MultiSelect, InputText, ProgressSpinner
  ],
  styles: [`
    :host {
      --panel-top: var(--surface-1, #ffffff);
      --panel-bot: var(--surface-2, #EEF2F8);
      display: block;
    }

    /* Botones fuertes */
    :host ::ng-deep .btn-strong-green { background-color: #2e7d32 !important; border-color: #2e7d32 !important; color: #fff !important; }
    :host ::ng-deep .btn-strong-amber { background-color: #f9a825 !important; border-color: #f9a825 !important; color: #fff !important; }
    :host ::ng-deep .btn-strong-navy { background-color: #0d47a1 !important; border-color: #0d47a1 !important; color: #fff !important; }

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

    /* Selector de perfiles */
    :host ::ng-deep .perfil-selector {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: linear-gradient(180deg, var(--panel-top) 0%, var(--panel-bot) 100%);
      border: 1px solid var(--surface-border, #e2e8f0);
      border-radius: 10px;
      padding: 0.75rem 1rem;
      margin-bottom: 0.75rem;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
      flex-wrap: wrap;
    }
    :host ::ng-deep .perfil-selector label.selector-title {
      font-weight: 600;
      color: var(--ink-0, #1e293b);
      margin-right: 0.5rem;
    }
    :host ::ng-deep .perfil-radio-group {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    :host ::ng-deep .perfil-radio-item {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    :host ::ng-deep .perfil-radio-item label {
      cursor: pointer;
      font-size: 0.9rem;
    }

    /* Tabla */
    :host ::ng-deep .p-datatable.p-datatable-sm .p-datatable-tbody > tr > td,
    :host ::ng-deep .p-datatable.p-datatable-sm .p-datatable-thead > tr > th { padding: 0.35rem 0.5rem; }
    :host ::ng-deep .p-datatable.p-datatable-sm .p-datatable-tbody > tr { line-height: 1.15; }
    :host ::ng-deep .mantenedor-datatable .p-datatable-thead > tr > th {
      background: var(--panel-top, #ffffff) !important;
      border-bottom: 1px solid var(--surface-border) !important;
    }
    :host ::ng-deep .mantenedor-datatable .p-datatable-thead > tr:first-child > th:first-child { border-top-left-radius: 8px; }
    :host ::ng-deep .mantenedor-datatable .p-datatable-thead > tr:first-child > th:last-child { border-top-right-radius: 8px; }
    :host ::ng-deep .mantenedor-datatable.p-datatable-sm {
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      background: linear-gradient(180deg, var(--panel-top, #ffffff), var(--panel-bot, #EEF2F8));
    }

    /* Filtros en tabla */
    :host ::ng-deep .filter-row th { padding: 0.25rem 0.5rem; }
    :host ::ng-deep .filter-row input,
    :host ::ng-deep .filter-row .p-multiselect { width: 100%; font-size: 0.85rem; }

    /* Spinner centrado */
    :host ::ng-deep .tabla-wrapper { position: relative; min-height: 200px; }
    :host ::ng-deep .spinner-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.7);
      z-index: 10;
      border-radius: 8px;
    }

    /* ====== Dark mode ====== */
    :host-context(body.dark-theme) {
      --panel-top: #445266;
      --panel-bot: #3d4a5c;
    }
    :host-context(body.dark-theme) ::ng-deep .perfil-selector,
    :host-context(body.dark-theme) ::ng-deep .actions-bar {
      background: linear-gradient(180deg, var(--surface-2) 0%, var(--surface-1) 100%);
      border-color: var(--border-soft);
    }
    :host-context(body.dark-theme) ::ng-deep .perfil-selector label.selector-title,
    :host-context(body.dark-theme) ::ng-deep .perfil-radio-item label {
      color: #e2e8f0;
    }
    :host-context(body.dark-theme) ::ng-deep .mantenedor-datatable.p-datatable-sm {
      background: linear-gradient(180deg, var(--surface-2), var(--surface-1));
    }
    :host-context(body.dark-theme) ::ng-deep .mantenedor-datatable .p-datatable-thead > tr > th {
      background: #3a4556 !important;
      color: #e2e8f0 !important;
      border-color: #475569 !important;
    }
    :host-context(body.dark-theme) ::ng-deep .mantenedor-datatable .p-datatable-tbody > tr {
      background: #38434f !important;
      color: #e2e8f0 !important;
    }
    :host-context(body.dark-theme) ::ng-deep .mantenedor-datatable .p-datatable-tbody > tr:nth-child(even) {
      background: #334155 !important;
    }
    :host-context(body.dark-theme) ::ng-deep .mantenedor-datatable .p-datatable-tbody > tr > td {
      border-color: #475569 !important;
      color: #e2e8f0 !important;
    }
    :host-context(body.dark-theme) ::ng-deep .filter-row input,
    :host-context(body.dark-theme) ::ng-deep .filter-row .p-multiselect {
      background: #334155 !important;
      border-color: #475569 !important;
      color: #e2e8f0 !important;
    }
    :host-context(body.dark-theme) ::ng-deep .filter-row .p-multiselect .p-multiselect-label {
      color: #e2e8f0 !important;
    }
    :host-context(body.dark-theme) ::ng-deep .spinner-overlay {
      background: rgba(30,41,59,0.8);
    }
    :host-context(body.dark-theme) ::ng-deep .text-center {
      color: #94a3b8 !important;
    }
    /* Tabla wrapper y empty message en dark */
    :host-context(body.dark-theme) ::ng-deep .tabla-wrapper {
      background: var(--surface-1) !important;
      border-radius: 8px;
    }
    :host-context(body.dark-theme) ::ng-deep .p-datatable-wrapper {
      background: var(--surface-1) !important;
    }
    :host-context(body.dark-theme) ::ng-deep .p-datatable {
      background: var(--surface-1) !important;
    }
    :host-context(body.dark-theme) ::ng-deep .p-datatable .p-datatable-table {
      background: var(--surface-1) !important;
    }
    :host-context(body.dark-theme) ::ng-deep .p-datatable-emptymessage td {
      background: var(--surface-1) !important;
      color: #94a3b8 !important;
    }
    :host-context(body.dark-theme) ::ng-deep .p-datatable-emptymessage tr {
      background: var(--surface-1) !important;
    }
    :host-context(body.dark-theme) ::ng-deep .p-scroller,
    :host-context(body.dark-theme) ::ng-deep .p-scroller-viewport,
    :host-context(body.dark-theme) ::ng-deep .p-virtualscroller,
    :host-context(body.dark-theme) ::ng-deep .p-scroller-content {
      background: var(--surface-1) !important;
    }
    :host-context(body.dark-theme) ::ng-deep .p-datatable-scrollable .p-datatable-wrapper {
      background: var(--surface-1) !important;
    }
    :host-context(body.dark-theme) ::ng-deep .p-datatable-scrollable-body {
      background: var(--surface-1) !important;
    }
    :host-context(body.dark-theme) ::ng-deep table {
      background: var(--surface-1) !important;
    }
    :host-context(body.dark-theme) main {
      background: transparent;
    }
  `]
})
export class AsignacionPermisosComponent {

  /* ─── Inyección ─── */
  private readonly perfilSvc = inject(PerfilService);
  private readonly authSvc   = inject(AuthService);
  private readonly msg       = inject(MessageService);

  /* ─── Signals ─── */
  readonly listaPerfiles      = signal<PerfilDto[]>([]);
  readonly perfilSeleccionado = signal<PerfilDto | null>(null);
  readonly listaPermisos      = signal<PermisoRow[]>([]);
  readonly loading            = signal(false);
  readonly filterOpts         = signal<Record<string, any[]>>({});
  readonly seleccionFiltro    = signal<Record<string, string | string[]>>({});

  /* ─── Tabla ─── */
  readonly dt = viewChild<Table>('dt');

  readonly columns = [
    { field: 'recurso',     header: 'Recurso',     filterType: 'text' },
    { field: 'tipo',        header: 'Tipo',        filterType: 'multiSelect' },
    { field: 'descripcion', header: 'Descripción', filterType: 'text' },
    { field: 'asignado',    header: 'Asignado' }
  ];

  constructor() {
    this.perfilSvc.listar().subscribe(p => this.listaPerfiles.set(p));
  }

  /* ─── Seleccionar perfil ─── */
  seleccionarPerfil(perfil: PerfilDto): void {
    this.perfilSeleccionado.set(perfil);
    this.cargarPermisos();
  }

  /* ─── Cargar permisos ─── */
  cargarPermisos(): void {
    const perfil = this.perfilSeleccionado();
    if (!perfil) return;

    this.loading.set(true);
    this.perfilSvc.listarPermisosConAsignacion(perfil.id).subscribe({
      next: res => {
        this.listaPermisos.set(res as PermisoRow[]);
        this.buildFilterOptions();
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  /* ─── Filtros dinámicos ─── */
  private buildFilterOptions(): void {
    const opts: Record<string, any[]> = {};
    this.columns.forEach(c => {
      if (c.filterType === 'multiSelect') {
        const valores = [...new Set(
          this.listaPermisos().map(r => r[c.field])
        )].filter(v => v != null);
        opts[c.field] = valores.map(v => ({ label: v, value: v }));
      }
    });
    this.filterOpts.set(opts);
  }

  aplicarFiltro(field: string, value: any): void {
    const filtro = { ...this.seleccionFiltro(), [field]: value };
    this.seleccionFiltro.set(filtro);
    const tipo = this.columns.find(c => c.field === field)?.filterType;
    const modo = tipo === 'multiSelect' ? 'in' : 'contains';
    this.dt()?.filter(value, field, modo);
  }

  limpiarFiltros(): void {
    this.seleccionFiltro.set({});
    this.dt()?.reset();
  }

  /* ─── Toggle asignado ─── */
  toggleAsignado(row: PermisoRow): void {
    row.asignado = !row.asignado;
  }

  /* ─── Guardar cambios ─── */
  guardarCambios(): void {
    const perfil = this.perfilSeleccionado();
    if (!perfil) return;

    const idsSeleccionados = this.listaPermisos()
      .filter(p => p.asignado)
      .map(p => p.id_permiso);

    this.perfilSvc.guardarAsignacion(perfil.id, idsSeleccionados).subscribe(() => {
      this.msg.add({ severity: 'success', summary: 'Éxito', detail: 'Permisos actualizados' });
      forkJoin([this.authSvc.refreshBotones(), this.authSvc.refreshMenus()]).subscribe();
    });
  }
}
