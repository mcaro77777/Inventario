import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DashboardKpisDto {
  productosEnStock: number;
  sinStock: number;
  bajoMinimo: number;
  valorInventario: number;
  rotacion30d: number;
}

export interface LabeledValueDto { label: string; value: number }
export interface TimeseriesDualDto { label: string; serieA: number; serieB: number }
export interface LowStockRowDto {
  productoId: number; nombre: string; categoria?: string | null;
  stockActual: number; stockMinimo: number;
}
export interface InventoryDetailRowDto {
  productoId: number; nombre: string; categoria?: string | null;
  cantidad: number; precioPromedio: number; total: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private base = `${environment.apiUrl}/Dashboard`;
  constructor(private http: HttpClient) {}

  kpis(categoriaId?: number | null): Observable<DashboardKpisDto> {
    const empty: DashboardKpisDto = { productosEnStock: 0, sinStock: 0, bajoMinimo: 0, valorInventario: 0, rotacion30d: 0 };
    const url = categoriaId ? `${this.base}/kpis?categoriaId=${categoriaId}` : `${this.base}/kpis`;
    return this.http.get<DashboardKpisDto | null>(url).pipe(
      map(res => res ?? empty)
    );
  }
  movimientos7d(categoriaId?: number | null): Observable<TimeseriesDualDto[]> {
    const url = categoriaId ? `${this.base}/series/movimientos-7d?categoriaId=${categoriaId}` : `${this.base}/series/movimientos-7d`;
    return this.http.get<TimeseriesDualDto[]>(url);
  }
  valor6m(categoriaId?: number | null): Observable<LabeledValueDto[]> {
    const url = categoriaId ? `${this.base}/series/valor-6m?categoriaId=${categoriaId}` : `${this.base}/series/valor-6m`;
    return this.http.get<LabeledValueDto[]>(url);
  }
  stockPorCategoria(categoriaId?: number | null): Observable<LabeledValueDto[]> {
    const url = categoriaId ? `${this.base}/breakdown/stock-categoria?categoriaId=${categoriaId}` : `${this.base}/breakdown/stock-categoria`;
    return this.http.get<LabeledValueDto[]>(url);
  }
  consumoPorDept30d(categoriaId?: number | null): Observable<LabeledValueDto[]> {
    const url = categoriaId ? `${this.base}/consumo/departamento-30d?categoriaId=${categoriaId}` : `${this.base}/consumo/departamento-30d`;
    return this.http.get<LabeledValueDto[]>(url);
  }
  bajoMinimo(top = 20, categoriaId?: number | null): Observable<LowStockRowDto[]> {
    const url = categoriaId ? `${this.base}/tabla/bajo-minimo?top=${top}&categoriaId=${categoriaId}` : `${this.base}/tabla/bajo-minimo?top=${top}`;
    return this.http.get<LowStockRowDto[]>(url);
  }

  inventoryDetail(categoriaId?: number | null): Observable<InventoryDetailRowDto[]> {
    const url = categoriaId ? `${this.base}/inventory/detail?categoriaId=${categoriaId}` : `${this.base}/inventory/detail`;
    return this.http.get<InventoryDetailRowDto[]>(url);
  }

  tablaResumen2(): Observable<Record<string, any>[]> {
    const url = `${this.base}/tabla-resumen2`;
    return this.http.get<Record<string, any>[]>(url);
  }
}
