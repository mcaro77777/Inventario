import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/* ──────────── DTOs ──────────── */
export interface GastoDto {
  detalle: string;
  monto: number;
}

export interface IngresoStockDto {
  producto: number;
  productoNombre?: string | null;
  productoSKU?: string | null;
  proveedor?: number | null;
  cliente?: number | null;
  proveedorNombre?: string | null;
  fecha: string;                // yyyy‑MM‑dd
  estado?: number | null;
  cantidad: number;
  valorUnitario: number;
  subTotal?: number | null;
  descuento?: number;
  subTotalIVA?: number | null;
  total?: number | null;
  gastos?: GastoDto[] | null;
  tipo: number;                 // 0 = ingreso, 1 = retiro, etc.
  docOrdenCompra?: string | null;
  docFactura?: string | null;
  docGuiaDespacho?: string | null;
  docNotaCreditoDebito?: string | null;
}

export interface ProductoStockDto {
  idProducto: number;
  nombre: string;
  sku?: string | null;
  categoriaNombre?: string | null;
  stockMinimo?: number | null;
  stockActual: number;
  proveedor_id?: number | null;
  color?: number | null;
}

export interface HistoriaProductoDto {
  idIngreso: number;
  fecha: string;                // yyyy‑MM‑dd
  tipo: number;                 // 0 = Ingreso, 1 = Retiro
  cantidad: number;
  valorUnitario: number;
  descuento: number;
  totalConIVA: number;
  proveedorNombre?: string | null;
  docOrdenCompra?: string | null;
  docFactura?: string | null;
  docGuiaDespacho?: string | null;
  docNotaCreditoDebito?: string | null;
  idProveedor?: number | null;
  estado?: number | null;
}

export interface ActualizarMovimientoDto {
  cantidad: number;
  valorUnitario: number;
  descuento: number;
  idProveedor?: number | null;
  estado?: number | null;
  docOrdenCompra?: string | null;
  docFactura?: string | null;
  docGuiaDespacho?: string | null;
  docNotaCreditoDebito?: string | null;
}

export interface SolicitudClienteDto {
  idIngreso: number;
  idProducto: number;
  productoNombre: string;
  categoriaNombre: string;
  cantidad: number;
  tipo: number;
  idCliente: number;
  clienteNombre: string;   // 🆕 nombre del cliente
  observacion: string;
}

/* ──────────── Servicio ──────────── */
@Injectable({ providedIn: 'root' })
export class StockService {
  // API roots por recurso (similar a CasosListadoService)
  private readonly baseIngresosUrl = `${environment.apiUrl}/IngresosStock`;
  private readonly baseRetirosUrl  = `${environment.apiUrl}/RetirosStock`;

  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  /** Cache frío para el listado de stock (invalidado tras mutaciones) */
  private cacheStock$?: Observable<ProductoStockDto[]>;

  /* --------- Altas / Bajas --------- */
  ingresar(dto: Omit<IngresoStockDto, 'usuario_creacion'>): Observable<number> {
    const payload = { ...dto, usuario_creacion: this.auth.token() };
    return this.http.post<number>(this.baseIngresosUrl, payload)
      .pipe(tap(() => { this.cacheStock$ = undefined; }));
  }

  egresar(dto: Omit<IngresoStockDto, 'usuario_creacion'>): Observable<number> {
    const payload = { ...dto, usuario_creacion: this.auth.token() };
    return this.http.post<number>(this.baseRetirosUrl, payload)
      .pipe(tap(() => { this.cacheStock$ = undefined; }));
  }

  /* --------- Consultas generales --------- */
  listarStock(force = false): Observable<ProductoStockDto[]> {
    if (!force && this.cacheStock$) return this.cacheStock$;
    const url = force ? `${this.baseIngresosUrl}?_ts=${Date.now()}` : this.baseIngresosUrl;
    const req$ = this.http.get<ProductoStockDto[]>(url).pipe(shareReplay(1));
    this.cacheStock$ = req$;
    return req$;
  }

  historialProducto(productoId: number): Observable<HistoriaProductoDto[]> {
    return this.http.get<HistoriaProductoDto[]>(`${this.baseIngresosUrl}/historial/${productoId}`);
  }

  actualizarCantidadMovimiento(idIngreso: number, nuevaCantidad: number, nuevoValorUnitario: number): Observable<void> {
    const payload = { cantidad: nuevaCantidad, valorUnitario: nuevoValorUnitario };
    return this.http.put<void>(`${this.baseIngresosUrl}/${idIngreso}/cantidad`, payload);
  }

  eliminarMovimiento(idIngreso: number): Observable<void> {
    return this.http.delete<void>(`${this.baseIngresosUrl}/${idIngreso}`);
  }

  actualizarMovimiento(idIngreso: number, dto: ActualizarMovimientoDto): Observable<void> {
    return this.http.put<void>(`${this.baseIngresosUrl}/${idIngreso}`, dto)
      .pipe(tap(() => { this.cacheStock$ = undefined; }));
  }

  /* --------- Solicitudes por cliente --------- */
  solicitudesPorCliente(clienteId: number): Observable<SolicitudClienteDto[]> {
    return this.http.get<SolicitudClienteDto[]>(`${this.baseIngresosUrl}/solicitudes/${clienteId}`);
  }

  /* --------- Solicitudes pendientes (operador) --------- */
  solicitudesPorAprobar(): Observable<SolicitudClienteDto[]> {
    return this.http.get<SolicitudClienteDto[]>(`${this.baseIngresosUrl}/solicitudes/pendientes`);
  }

  actualizarEstadoSolicitud(idIngreso: number, tipo: number, observacion?: string | null): Observable<void> {
    const payload = { tipo, observacion: observacion ?? null };
    return this.http.put<void>(`${this.baseIngresosUrl}/solicitudes/${idIngreso}/estado`, payload);
  }

  eliminarSolicitud(idIngreso: number): Observable<void> {
    return this.http.delete<void>(`${this.baseIngresosUrl}/solicitudes/${idIngreso}`)
      .pipe(tap(() => { this.cacheStock$ = undefined; }));
  }

  urlCertificadoSolicitud(idIngreso: number): string {
    return `${this.baseIngresosUrl}/solicitudes/${idIngreso}/certificado`;
  }

  /* --------- Upload de archivos --------- */
  private readonly baseArchivosUrl = `${environment.apiUrl}/Archivos`;

  uploadArchivo(file: File, tipo: string): Observable<ArchivoUploadResultDto> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ArchivoUploadResultDto>(
      `${this.baseArchivosUrl}/upload?tipo=${encodeURIComponent(tipo)}`,
      formData
    );
  }

  getArchivoUrl(fileName: string): string {
    return `${this.baseArchivosUrl}/${fileName}`;
  }
}

export interface ArchivoUploadResultDto {
  fileName: string;
  originalName: string;
  size: number;
  tipo: string;
}
