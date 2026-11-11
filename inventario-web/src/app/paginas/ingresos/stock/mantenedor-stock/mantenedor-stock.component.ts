import { Component, ViewChild, OnInit, inject, ChangeDetectionStrategy, DestroyRef, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Table, TableModule } from 'primeng/table';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputTextModule } from 'primeng/inputtext';
import { DialogService, DynamicDialogRef, DynamicDialogModule } from 'primeng/dynamicdialog';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../../../core/services/auth.service';
import { EgresosStockComponent } from '../egresos-stock/egresos-stock.component';
import { HistoriaProductoComponent } from '../historia-producto/historia-producto.component';
import { IngresadorStockComponent } from '../ingresador-stock/ingresador-stock.component';
import { MantenedorCategoriasComponent } from '../../../../paginas/maestros/categorias/mantenedor-categorias/mantenedor-categorias.component';
// Eliminado: ya no abrimos productos como diálogo
import { MantenedorProveedoresComponent } from '../../../../paginas/maestros/proveedores/mantanedor-proveedores/mantanedor-proveedores.component';
import { MantenedorClientesComponent } from '../../../../paginas/maestros/clientes/mantenedor-clientes/mantenedor-clientes.component';
import { StockService } from '../../../../core/services/stock.service';
import { exportAoaToXlsx } from '../../../../shared/utils/excel-export';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, timeout, of } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-mantenedor-stock',
  standalone: true,
  templateUrl: './mantenedor-stock.component.html',
  styles: [
    `
    /* ====== Acentos y botones (copiados de guia-pallet) ====== */
    :host {
      --accent: #2e7d32; /* green 800 */
      --accent-halo: rgba(46,125,50,0.25);
      --accent-dark-base: rgba(76,175,80,0.65);
      --accent-dark-hover: rgba(76,175,80,0.85);
      --accent-dark-focus: #43a047;
      --accent-dark-halo: rgba(76,175,80,0.35);
      /* Fallbacks locales para panel si no existen en tokens globales */
      --panel-top: var(--surface-1, #ffffff);
      --panel-bot: var(--surface-2, #eef2f8);
    }

    /* (No se fuerza color en todos los botones; usar clases strong abajo) */

    /* Clases fuertes reutilizables */
    :host ::ng-deep .mantenedor-actions .btn-strong-green,
    :host ::ng-deep .export-button-container .btn-strong-green {
      background-color: #2e7d32 !important;
      border-color: #2e7d32 !important;
      color: #fff !important;
      border-width: 1px !important;
      background-image: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.12)) !important;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12) !important;
    }
    :host ::ng-deep .mantenedor-actions .btn-strong-green:hover,
    :host ::ng-deep .export-button-container .btn-strong-green:hover {
      filter: brightness(1.08);
    }
    :host ::ng-deep .mantenedor-actions .btn-strong-amber,
    :host ::ng-deep .export-button-container .btn-strong-amber {
      background-color: #f9a825 !important;
      border-color: #f9a825 !important;
      color: #fff !important;
      border-width: 1px !important;
      background-image: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(0,0,0,0.10)) !important;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.18) !important;
    }
    :host ::ng-deep .mantenedor-actions .btn-strong-navy,
    :host ::ng-deep .export-button-container .btn-strong-navy {
      background-color: #0d47a1 !important;
      border-color: #0d47a1 !important;
      color: #fff !important;
      border-width: 1px !important;
      background-image: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.14)) !important;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.16) !important;
    }

    :host ::ng-deep .export-button-container {
      display: flex;
      align-items: center;
      gap: .5rem;
      flex-wrap: nowrap;
    }
    :host ::ng-deep .export-button-container .toolbar-spacer {
      flex: 1 1 auto;
    }
    :host ::ng-deep .p-datatable.p-datatable-sm .p-datatable-tbody > tr > td,
    :host ::ng-deep .p-datatable.p-datatable-sm .p-datatable-thead > tr > th {
      padding: 0.35rem 0.5rem;
    }
    /* Header no transparente - fondo sólido */
    :host ::ng-deep .mantenedor-datatable .p-datatable-thead > tr > th {
      background: #f8fafc !important;
      border-bottom: 1px solid #e2e8f0 !important;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    :host ::ng-deep .mantenedor-datatable .p-datatable-thead {
      position: sticky;
      top: 0;
      z-index: 10;
    }
    :host ::ng-deep .mantenedor-datatable .p-datatable-thead > tr {
      background: #f8fafc !important;
    }
    :host ::ng-deep .mantenedor-datatable .p-datatable-thead > tr:nth-child(2) > th {
      background: #ffffff !important;
      border-bottom: 1px solid #e2e8f0 !important;
    }
    :host ::ng-deep .mantenedor-datatable .p-datatable-thead > tr:first-child > th:first-child {
      border-top-left-radius: 8px;
    }
    :host ::ng-deep .mantenedor-datatable .p-datatable-thead > tr:first-child > th:last-child {
      border-top-right-radius: 8px;
    }
    :host ::ng-deep .p-datatable.p-datatable-sm .p-datatable-tbody > tr {
      line-height: 1.15;
    }
    :host ::ng-deep .p-multiselect.p-inputwrapper-sm .p-multiselect-label,
    :host ::ng-deep .p-inputtext.p-inputtext-sm {
      padding: 0.25rem 0.5rem;
    }
    
    /* ====== Estado pill (alineado con guia-pallet) ====== */
    :host ::ng-deep .estado-pill {
      display: inline-flex; align-items: center; gap: 6px;
      font-weight: 700; font-size: 12px; letter-spacing: .2px;
      padding: 2px 10px; border-radius: 9999px;
      border: 1px solid transparent;
      text-transform: uppercase;
      user-select: none;
    }
    :host ::ng-deep .estado-pill.OK { background: rgba(46,125,50,.15); color: #66bb6a; border-color: rgba(102,187,106,.45); }
    :host ::ng-deep .estado-pill.ALERTA { background: rgba(211,47,47,.15); color: #ef5350; border-color: rgba(239,83,80,.45); }
    :host ::ng-deep .estado-pill.DEFAULT { background: rgba(25,118,210,.15); color: #64b5f6; border-color: rgba(100,181,246,.45); }
    
    /* Stock Mínimo badge - color amarillo */
    :host ::ng-deep .stock-minimo-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 36px;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 12px;
      background: rgba(234, 179, 8, 0.12);
      color: #ca8a04;
      border: 1px solid rgba(234, 179, 8, 0.25);
    }
    
    /* Stock Actual badge - color azul */
    :host ::ng-deep .stock-actual-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 36px;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 12px;
      background: rgba(33, 150, 243, 0.12);
      color: #1976d2;
      border: 1px solid rgba(33, 150, 243, 0.25);
    }
    
    @media (prefers-color-scheme: dark) {
      :host ::ng-deep .estado-pill.OK { background: rgba(76,175,80,.18); color: #81c784; border-color: rgba(129,199,132,.55); }
      :host ::ng-deep .estado-pill.ALERTA { background: rgba(244,67,54,.18); color: #ef9a9a; border-color: rgba(239,154,154,.55); }
      :host ::ng-deep .estado-pill.DEFAULT { background: rgba(33,150,243,.18); color: #90caf9; border-color: rgba(144,202,249,.55); }
      :host ::ng-deep .stock-minimo-badge {
        background: rgba(234, 179, 8, 0.18);
        color: #fbbf24;
        border-color: rgba(251, 191, 36, 0.35);
      }
      :host ::ng-deep .stock-actual-badge {
        background: rgba(33, 150, 243, 0.18);
        color: #64b5f6;
        border-color: rgba(100, 181, 246, 0.35);
      }
    }
    
    /* ====== Dark mode para badges y pills (body.dark-theme) ====== */
    :host ::ng-deep body.dark-theme .estado-pill.OK,
    body.dark-theme :host ::ng-deep .estado-pill.OK { 
      background: rgba(76,175,80,.25); 
      color: #a5d6a7; 
      border-color: rgba(165,214,167,.6); 
    }
    :host ::ng-deep body.dark-theme .estado-pill.ALERTA,
    body.dark-theme :host ::ng-deep .estado-pill.ALERTA { 
      background: rgba(244,67,54,.25); 
      color: #ef9a9a; 
      border-color: rgba(239,154,154,.6); 
    }
    :host ::ng-deep body.dark-theme .estado-pill.DEFAULT,
    body.dark-theme :host ::ng-deep .estado-pill.DEFAULT { 
      background: rgba(33,150,243,.25); 
      color: #90caf9; 
      border-color: rgba(144,202,249,.6); 
    }
    :host ::ng-deep body.dark-theme .stock-minimo-badge,
    body.dark-theme :host ::ng-deep .stock-minimo-badge {
      background: rgba(234, 179, 8, 0.25);
      color: #fde047;
      border-color: rgba(253, 224, 71, 0.5);
    }
    :host ::ng-deep body.dark-theme .stock-actual-badge,
    body.dark-theme :host ::ng-deep .stock-actual-badge {
      background: rgba(59, 130, 246, 0.25);
      color: #93c5fd;
      border-color: rgba(147, 197, 253, 0.5);
    }

    /* ====== Indicadores de resumen ====== */
    :host ::ng-deep .indicators-row {
      display: flex;
      gap: 1rem;
      margin: 0.75rem 0;
      flex-wrap: wrap;
    }
    :host ::ng-deep .indicator-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 1rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #fff;
      min-width: 160px;
      flex: 1;
      cursor: pointer;
      transition: box-shadow 0.15s, border-color 0.15s;
      border-left-width: 4px;
    }
    :host ::ng-deep .indicator-card:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    :host ::ng-deep .indicator-card--active {
      box-shadow: 0 2px 12px rgba(0,0,0,0.12);
    }
    :host ::ng-deep .indicator-card--total {
      border-left-color: #3b82f6;
      background: linear-gradient(90deg, #fff 0%, rgba(59,130,246,0.08) 100%);
    }
    :host ::ng-deep .indicator-card--green {
      border-left-color: #22c55e;
      background: linear-gradient(90deg, #fff 0%, rgba(34,197,94,0.08) 100%);
    }
    :host ::ng-deep .indicator-card--yellow {
      border-left-color: #eab308;
      background: linear-gradient(90deg, #fff 0%, rgba(234,179,8,0.10) 100%);
    }
    :host ::ng-deep .indicator-card--red {
      border-left-color: #ef4444;
      background: linear-gradient(90deg, #fff 0%, rgba(239,68,68,0.08) 100%);
    }
    :host ::ng-deep .indicator-value {
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1;
    }
    :host ::ng-deep .indicator-card--total .indicator-value { color: #3b82f6; }
    :host ::ng-deep .indicator-card--green .indicator-value { color: #22c55e; }
    :host ::ng-deep .indicator-card--yellow .indicator-value { color: #ca8a04; }
    :host ::ng-deep .indicator-card--red .indicator-value { color: #ef4444; }
    :host ::ng-deep .indicator-text {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    :host ::ng-deep .indicator-title {
      font-weight: 600;
      font-size: 0.8rem;
      color: #334155;
    }
    :host ::ng-deep .indicator-desc {
      font-size: 0.7rem;
      color: #64748b;
    }

    /* ====== Dark mode para indicadores ====== */
    :host ::ng-deep body.dark-theme .indicator-card,
    body.dark-theme :host ::ng-deep .indicator-card {
      background: var(--surface-1);
      border-color: var(--border-soft);
    }
    :host ::ng-deep body.dark-theme .indicator-card--total,
    body.dark-theme :host ::ng-deep .indicator-card--total {
      background: linear-gradient(90deg, var(--surface-1) 0%, rgba(59,130,246,0.15) 100%);
    }
    :host ::ng-deep body.dark-theme .indicator-card--green,
    body.dark-theme :host ::ng-deep .indicator-card--green {
      background: linear-gradient(90deg, var(--surface-1) 0%, rgba(34,197,94,0.15) 100%);
    }
    :host ::ng-deep body.dark-theme .indicator-card--yellow,
    body.dark-theme :host ::ng-deep .indicator-card--yellow {
      background: linear-gradient(90deg, var(--surface-1) 0%, rgba(234,179,8,0.18) 100%);
    }
    :host ::ng-deep body.dark-theme .indicator-card--red,
    body.dark-theme :host ::ng-deep .indicator-card--red {
      background: linear-gradient(90deg, var(--surface-1) 0%, rgba(239,68,68,0.15) 100%);
    }
    :host ::ng-deep body.dark-theme .indicator-title,
    body.dark-theme :host ::ng-deep .indicator-title {
      color: #e2e8f0;
    }
    :host ::ng-deep body.dark-theme .indicator-desc,
    body.dark-theme :host ::ng-deep .indicator-desc {
      color: #94a3b8;
    }
    :host ::ng-deep body.dark-theme .indicator-card--total .indicator-value,
    body.dark-theme :host ::ng-deep .indicator-card--total .indicator-value { color: #60a5fa; }
    :host ::ng-deep body.dark-theme .indicator-card--green .indicator-value,
    body.dark-theme :host ::ng-deep .indicator-card--green .indicator-value { color: #4ade80; }
    :host ::ng-deep body.dark-theme .indicator-card--yellow .indicator-value,
    body.dark-theme :host ::ng-deep .indicator-card--yellow .indicator-value { color: #facc15; }
    :host ::ng-deep body.dark-theme .indicator-card--red .indicator-value,
    body.dark-theme :host ::ng-deep .indicator-card--red .indicator-value { color: #f87171; }

    /* ====== Panel Header estilo 2DA INSTANCIA ====== */
    :host ::ng-deep .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.6rem 1rem;
      background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin-bottom: 0.5rem;
    }
    :host ::ng-deep .panel-header-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    :host ::ng-deep .panel-icon {
      font-size: 1rem;
      color: #64748b;
    }
    :host ::ng-deep .panel-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: #334155;
      margin: 0;
      letter-spacing: 0.5px;
    }

    :host ::ng-deep body.dark-theme .panel-title,
    body.dark-theme :host ::ng-deep .panel-title {
      color: var(--ink-0, #ffffff) !important;
    }
    :host ::ng-deep body.dark-theme .panel-icon,
    body.dark-theme :host ::ng-deep .panel-icon {
      color: var(--ink-1, #e5e7eb) !important;
    }
    :host ::ng-deep .panel-header-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    :host ::ng-deep .btn-export {
      background: linear-gradient(180deg, #2e7d32 0%, #1b5e20 100%) !important;
      border: none !important;
      color: #fff !important;
      font-size: 0.8rem !important;
      padding: 0.4rem 0.75rem !important;
      border-radius: 6px !important;
    }
    :host ::ng-deep .btn-export:hover {
      filter: brightness(1.1);
    }
    :host ::ng-deep .btn-filter {
      background: linear-gradient(180deg, #f9a825 0%, #f57f17 100%) !important;
      border: none !important;
      color: #fff !important;
      font-size: 0.8rem !important;
      padding: 0.4rem 0.75rem !important;
      border-radius: 6px !important;
    }
    :host ::ng-deep .btn-filter:hover {
      filter: brightness(1.1);
    }

    /* ====== Eliminar doble scroll ====== */
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
    }
    main {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }
    :host ::ng-deep .p-datatable-wrapper {
      flex: 1;
      overflow: auto !important;
    }

    /* ====== Estilos de Diálogos (popup) ====== */
    :host ::ng-deep .p-dialog .p-dialog-header {
      font-weight: 700;
      background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
      border-bottom: 1px solid #e2e8f0;
      padding: 0.75rem 1rem;
    }
    :host ::ng-deep .p-dialog .p-dialog-header .p-dialog-title {
      font-size: 0.95rem;
      color: #334155;
    }
    :host ::ng-deep .p-dialog .p-dialog-content {
      background: #fff;
      color: #334155;
      padding: 1rem;
    }
    :host ::ng-deep .p-dialog .p-dialog-footer {
      background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
      border-top: 1px solid #e2e8f0;
      padding: 0.75rem 1rem;
    }
    :host ::ng-deep .p-dialog {
      border-radius: 12px;
      box-shadow: 0 25px 50px rgba(0,0,0,0.15);
      border: 1px solid #e2e8f0;
    }

    /* Cabecera de caso dentro de diálogos */
    :host ::ng-deep .case-header-box {
      border: 1px solid #e0e7ff;
      background: #f8f9ff;
      border-radius: 8px;
      padding: 0.75rem;
      margin-bottom: 1rem;
    }
    :host ::ng-deep .case-header-pill {
      background: #f4f7ff;
      border-radius: 6px;
      padding: 0.25rem 0.5rem;
      font-weight: 600;
      font-size: 0.85rem;
    }

    /* Botones dentro de diálogos */
    :host ::ng-deep .p-dialog .btn-accent,
    :host ::ng-deep .p-dialog .p-button.p-button-primary {
      background: #3b82f6 !important;
      border: none !important;
      color: #fff !important;
      border-radius: 6px;
      font-weight: 500;
    }
    :host ::ng-deep .p-dialog .btn-accent:hover,
    :host ::ng-deep .p-dialog .p-button.p-button-primary:hover {
      background: #2563eb !important;
    }
    :host ::ng-deep .p-dialog .btn-secondary,
    :host ::ng-deep .p-dialog .p-button.p-button-secondary {
      background: #fff !important;
      border: 1px solid #e2e8f0 !important;
      color: #475569 !important;
      border-radius: 6px;
      font-weight: 500;
    }
    :host ::ng-deep .p-dialog .btn-secondary:hover,
    :host ::ng-deep .p-dialog .p-button.p-button-secondary:hover {
      background: #f8fafc !important;
      border-color: #cbd5e1 !important;
    }

    /* Inputs dentro de diálogos */
    :host ::ng-deep .p-dialog .p-inputtext,
    :host ::ng-deep .p-dialog .p-dropdown,
    :host ::ng-deep .p-dialog .p-select,
    :host ::ng-deep .p-dialog input[type="text"],
    :host ::ng-deep .p-dialog input[type="number"] {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
    }
    :host ::ng-deep .p-dialog .p-inputtext:focus,
    :host ::ng-deep .p-dialog input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59,130,246,0.15);
      outline: none;
    }
    :host ::ng-deep .p-dialog label,
    :host ::ng-deep .p-dialog .form-label {
      font-size: 0.85rem;
      font-weight: 500;
      color: #475569;
      margin-bottom: 0.25rem;
    }

    /* Tablas dentro de diálogos */
    :host ::ng-deep .p-dialog .p-datatable .p-datatable-thead > tr > th {
      background: #f8fafc !important;
      font-size: 0.8rem;
      font-weight: 600;
      color: #475569;
      padding: 0.5rem 0.75rem;
    }
    :host ::ng-deep .p-dialog .p-datatable .p-datatable-tbody > tr > td {
      font-size: 0.85rem;
      padding: 0.5rem 0.75rem;
    }

    /* ====== Estilo Popup Requerimiento Información ====== */
    /* Grid del formulario */
    :host ::ng-deep .ingreso-form-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    :host ::ng-deep .ingreso-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    :host ::ng-deep .ingreso-row > .ingreso-panel,
    :host ::ng-deep .ingreso-row > :host ::ng-deep .p-panel {
      flex: 1 1 280px;
      min-width: 250px;
    }

    /* Paneles estilo requerimiento */
    :host ::ng-deep .ingreso-panel,
    :host ::ng-deep .p-dialog .p-panel {
      margin-bottom: 0;
      border-radius: 12px;
      border: 1px solid rgba(148, 163, 184, 0.4);
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
      overflow: hidden;
    }
    :host ::ng-deep .ingreso-panel .p-panel-header,
    :host ::ng-deep .p-dialog .p-panel .p-panel-header {
      background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
      border-bottom: 1px solid rgba(148, 163, 184, 0.3);
      padding: 10px 14px;
      font-weight: 600;
      font-size: 0.875rem;
      color: #334155;
      border-radius: 12px 12px 0 0;
    }
    :host ::ng-deep .ingreso-panel .p-panel-content,
    :host ::ng-deep .p-dialog .p-panel .p-panel-content {
      padding: 14px;
      background: #ffffff;
      border-radius: 0 0 12px 12px;
    }

    /* Cabecera del caso con pills */
    :host ::ng-deep .case-header-box {
      border: 1px solid #e0e7ff;
      background: linear-gradient(135deg, #f8f9ff 0%, #eef2ff 100%);
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 14px;
    }
    :host ::ng-deep .case-header-box .form-fields {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 0;
    }
    :host ::ng-deep .case-header-pill {
      background: linear-gradient(135deg, #f4f7ff 0%, #e8edff 100%);
      border-radius: 8px;
      padding: 6px 10px;
      display: flex;
      justify-content: flex-start;
      gap: 6px;
      border: 1px solid rgba(148, 163, 184, 0.25);
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
    :host ::ng-deep .form-control {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 0.875rem;
      background: #fff;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    :host ::ng-deep .form-control:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
      outline: none;
    }
    :host ::ng-deep textarea.form-control {
      resize: vertical;
      min-height: 80px;
    }

    /* Flex helpers */
    :host ::ng-deep .misat-flex-row-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    /* Header inline del diálogo */
    :host ::ng-deep .misat-dialog-header-inline {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
    }

    /* Footer del diálogo con botones */
    :host ::ng-deep .misat-dialog-footer-primary {
      min-width: 140px;
    }

    /* Tabla dentro del panel de adjuntos */
    :host ::ng-deep .table {
      width: 100%;
      border-collapse: collapse;
    }
    :host ::ng-deep .table th,
    :host ::ng-deep .table td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
      font-size: 0.85rem;
    }
    :host ::ng-deep .table th {
      background: #f8fafc;
      font-weight: 600;
      color: #475569;
    }
    :host ::ng-deep .table-responsive {
      overflow-x: auto;
    }

    /* Select/Dropdown dentro de diálogos */
    :host ::ng-deep .p-dialog .p-select,
    :host ::ng-deep .p-dialog .p-dropdown {
      width: 100%;
      border-radius: 8px;
    }
    :host ::ng-deep .p-dialog .p-select .p-select-label,
    :host ::ng-deep .p-dialog .p-dropdown .p-dropdown-label {
      padding: 8px 12px;
      font-size: 0.875rem;
    }
    `
  ],

  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    MultiSelectModule,
    ToastModule,
    ProgressSpinnerModule,
    InputTextModule,
    DynamicDialogModule,
    ButtonModule,
    TooltipModule,
    DialogModule
  ],
  providers: [DialogService, MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MantenedorStockComponent implements OnInit {

  stockListado: any[] = []; // Carga real desde tu servicio
  private _todosLosProductos: any[] = []; // Backup para filtrar
  loading = false;
  // Altura responsiva y tamaño de item para virtual scroll (alineado con MisAtenciones)
  tablaAltura: string = 'calc(100vh - 320px)';
  rowItemSize: number = 48;

  // Indicadores de resumen
  totalProductos = 0;

  // Dialog de ejemplo
  dialogRequerimientoVisible = false;
  totalOk = 0;
  totalBajo = 0;
  totalCritico = 0;
  filtroIndicador: 'TODOS' | 'OK' | 'BAJO' | 'CRITICO' = 'TODOS';

  columns: any[] = [
    { field: 'categoriaNombre', header: 'Categoría', filterType: 'text' },
    { field: 'nombre', header: 'Nombre', filterType: 'text' },
    { field: 'sku', header: 'SKU', filterType: 'text' },
    { field: 'stockMinimo', header: 'Stock Mínimo', filterType: 'numeric' },
    { field: 'stockActual', header: 'Stock Actual', filterType: 'numeric' },
    { field: 'color', header: 'Color', filterType: 'numeric' },
    { field: 'proveedor_id', header: 'Proveedor', filterType: 'numeric' }
  ];
  selectedColumns: any[] = [];
  visibleColumns: any[] = [];
  columnOptions: any[] = [];
  selectedFilters: Record<string, string | string[]> = {};
  filterOptions: { [key: string]: any[] } = {};

  private ref?: DynamicDialogRef;

  @ViewChild('dt') dt!: Table;

  private readonly dialogService = inject(DialogService);
  private readonly messageService = inject(MessageService);
  private readonly auth = inject(AuthService);
  private readonly stockService = inject(StockService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.columnOptions = this.columns.map(col => ({ label: col.header, value: col }));
    
    // Ocultar proveedor por defecto
    this.selectedColumns = this.columns.filter(c => c.field !== 'proveedor_id');
    this.visibleColumns = [...this.selectedColumns];
    // Ajuste inicial de altura
    this.updateTablaAltura();
    this.cargarStock();
  }

  generateColumnsFromData(): void {
    const sample = this.stockListado[0];
    this.columns = Object.keys(sample).map(key => ({
      field: key,
      header: this.formatHeader(key),
      filterType: typeof sample[key] === 'number' ? 'numeric' : 'text'
    }));
  }

  formatHeader(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  updateVisibleColumns(): void {
    this.visibleColumns = this.selectedColumns;
  }

  // trackBy for columns iteration to reduce DOM churn
  trackCol(index: number, col: any): string {
    return col.field;
  }

  generateFilterOptions(): void {
    this.filterOptions = {};
    this.columns.forEach(col => {
      if (col.filterType === 'multiSelect') {
        this.filterOptions[col.field] = [
          ...new Set(this.stockListado.map((item: any) => item[col.field]))
        ]
          .filter(value => value !== null && value !== undefined)
          .map(value => ({ label: value, value }));
      }
    });
  }

  applyFilter(field: string): void {
    const column = this.columns.find(col => col.field === field);
    const matchMode = column?.filterType === 'multiSelect' ? 'in' : 'contains';
    this.dt?.filter(this.selectedFilters[field], field, matchMode);
  }

  clearFilters(): void {
    this.selectedFilters = {};
    this.dt?.reset();
  }

  async exportarExcel(): Promise<void> {
    // Usar filas filtradas si existen; en caso contrario, todas las filas
    const filtered = this.dt?.filteredValue as any[] | null | undefined;
    const isFiltered = Array.isArray(filtered);
    const rows = isFiltered ? filtered! : this.stockListado;
    if (!rows || rows.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay registros para exportar' });
      return;
    }

    // Aviso al usuario sobre la cantidad a exportar
    this.messageService.add({
      severity: 'info',
      summary: 'Exportando',
      detail: `Exportando ${rows.length} registro(s)${isFiltered ? ' (filtrados)' : ''} a Excel...`,
      life: 2000
    });

    /*
     * 1. Construir los datos visibles usando los encabezados legibles.
     * 2. Calcular el ancho óptimo de las columnas basándonos
     *    en el texto más largo de cada columna (encabezado o dato).
     * 3. Aplicar estilo al encabezado (fondo azul y texto blanco/bold).
     */

    const headers = this.visibleColumns.map(col => col.header);

    // Crear AOA (array-of-arrays) para preservar el orden de las columnas
    const aoa: any[][] = [headers];
    rows.forEach(row => {
      aoa.push(headers.map(header => {
        const col = this.visibleColumns.find(c => c.header === header)!;
        return row[col.field];
      }));
    });

    await exportAoaToXlsx(aoa, 'Stock', 'mantenedor_stock.xlsx');
  }

  abrirDialogoAgregar(productoId?: number, proveedorId?: number): void {
    const ref = this.dialogService.open(IngresadorStockComponent, {
      header: 'Ingreso de Stock',
      width: '80vw',
      draggable: true,
      maximizable: true,
      closable: true,
      modal: true,
      contentStyle: { overflow: 'auto' },
      dismissableMask: true,
      data: (productoId || proveedorId) ? { productoId, proveedorId } : undefined
    });
    ref.onClose.subscribe(result => { if (result) this.recargar(); });
  }

  abrirDialogoHistorial(productoId: number): void {
    this.dialogService.open(HistoriaProductoComponent, {
      width: '80vw',
      contentStyle: { overflow: 'auto' },
      dismissableMask: true,
      data: { productoId }
    });
  }

  abrirDialogoEgresos(row: any): void {
    const productoId = row.idProducto ?? row.id;
    if (row.stockActual <= 0 || (row.stockMinimo != null && row.stockActual <= row.stockMinimo)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Stock insuficiente',
        detail: 'No se puede retirar producto sin reabastecer el stock.'
      });
      return;
    }

    const ref = this.dialogService.open(EgresosStockComponent, {
      header: 'Solicitar Productos',
      width: '80vw',
      draggable: true,
      maximizable: true,
      closable: true,
      modal: true,
      contentStyle: { overflow: 'auto' },
      dismissableMask: true,
      data: { productoId }
    });
    ref.onClose.subscribe(result => { if (result) this.recargar(); });
  }

  abrirDialogoProductos(): void {
    // Navegar a la página completa del mantenedor de productos
    this.router.navigate(['/menu', 'productos']);
  }

  abrirDialogoCategorias(): void {
    // Navegar a la página completa del mantenedor de categorías (sin popup)
    this.router.navigate(['/menu', 'categorias']);
  }

  abrirDialogoProveedores(): void {
    // Navegar a la página completa del mantenedor de proveedores (sin popup)
    this.router.navigate(['/menu', 'proveedores']);
  }

  abrirDialogoClientes(): void {
    // Navegar a la página completa del mantenedor de clientes (sin popup)
    this.router.navigate(['/menu', 'clientes']);
  }

  abrirDialogoDepartamentos(): void {
    // Navegar a la página completa del mantenedor de departamentos (sin popup)
    this.router.navigate(['/menu', 'departamentos']);
  }

  /** Volver al menú principal */
  volver(): void {
    this.router.navigate(['/menu']);
  }

  abrirGenerico(componente: any): void {
    const ref = this.dialogService.open(componente, {
      width: '80vw',
      draggable: true,
      maximizable: true,
      modal: true,
      contentStyle: { overflow: 'auto' },
      dismissableMask: true
    });
    ref.onClose.subscribe(result => { if (result) this.recargar(); });
  }

  tienePermiso(nombreBoton: string): boolean {
    return this.auth.tienePermiso(nombreBoton);
  }

  recargar(): void {
    this.cargarStock();
  }

  private cargarStock(): void {
    this.loading = true;
    this.stockService
      .listarStock(true)
      .pipe(
        timeout(15000), // corta si el backend no responde en 15s
        catchError(err => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el stock (tiempo de espera agotado o error de red)' });
          return of([] as any[]);
        }),
        finalize(() => { this.loading = false; }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (data) => {
          const rawData = data ?? [];
          // Garantizar que cada registro tenga propiedad 'id' compatible con la tabla/acciones
          this._todosLosProductos = rawData.map((item: any) => ({
            ...item,
            id: item.id ?? item.idProducto ?? item.id_producto
          }));
          this.stockListado = [...this._todosLosProductos];
          this.filtroIndicador = 'TODOS';
          this.recalcularIndicadores();

          // mantener columnas predefinidas
          this.updateVisibleColumns();
          this.generateFilterOptions();
          this.updateTablaAltura();
          this.cdr.markForCheck();
        },
        error: () => {
          // error ya gestionado en catchError; este bloque se activará solo si algo se escapa
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el stock' });
          this.updateTablaAltura();
          this.cdr.markForCheck();
        }
      });
  }

  /** Recalcula los indicadores de resumen */
  private recalcularIndicadores(): void {
    this.totalProductos = this._todosLosProductos.length;
    this.totalOk = this._todosLosProductos.filter(p => p.color === 1).length;
    this.totalBajo = this._todosLosProductos.filter(p => p.color === 0 && p.stockActual > 0).length;
    this.totalCritico = this._todosLosProductos.filter(p => p.stockActual === 0 || p.stockActual == null).length;
  }

  /** Filtra la tabla por indicador seleccionado */
  filtrarPorIndicador(filtro: 'TODOS' | 'OK' | 'BAJO' | 'CRITICO'): void {
    this.filtroIndicador = filtro;
    switch (filtro) {
      case 'OK':
        this.stockListado = this._todosLosProductos.filter(p => p.color === 1);
        break;
      case 'BAJO':
        this.stockListado = this._todosLosProductos.filter(p => p.color === 0 && p.stockActual > 0);
        break;
      case 'CRITICO':
        this.stockListado = this._todosLosProductos.filter(p => p.stockActual === 0 || p.stockActual == null);
        break;
      default:
        this.stockListado = [...this._todosLosProductos];
    }
    this.cdr.markForCheck();
  }

  // Altura responsiva de la tabla (zoneless-friendly)
  @HostListener('window:resize')
  private updateTablaAltura(): void {
    const next = 'calc(100vh - 320px)';
    if (this.tablaAltura !== next) {
      this.tablaAltura = next;
    }
  }

}
