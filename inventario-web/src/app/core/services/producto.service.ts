import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface ProductoDto {
  /** Alias conveniente para id_producto */
  id: number;
  id_producto: number;
  nombre: string;
  sku?: string | null;
  id_categoria?: number | null;
  unidad_medida_id?: number | null;
  marca?: string | null;
  modelo?: string | null;
  stock_minimo?: number | null;
  proveedor_id?: number | null;
  descripcion?: string | null;
  unidad_medida?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private readonly baseUrl = `${environment.apiUrl}/Productos`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  /** Lista todos los productos tal como los entrega la API. */
  listar(): Observable<ProductoDto[]> {
    return this.http.get<ProductoDto[]>(this.baseUrl);
  }

  /**
   * Crea un nuevo producto.
   * El backend genera el identificador, por ello se omiten los campos id e id_producto.
   */
  crear(dto: Omit<ProductoDto, 'id' | 'id_producto' | 'usuario_creacion'>): Observable<number> {
    const payload = { ...dto, usuario_creacion: this.auth.token() };
    return this.http.post<number>(this.baseUrl, payload);
  }

  /** Actualiza los datos de un producto existente. */
  actualizar(dto: Omit<ProductoDto, 'usuario_modificacion'> & { id_producto: number }): Observable<void> {
    const payload = { ...dto, usuario_modificacion: this.auth.token() };
    return this.http.put<void>(`${this.baseUrl}/${dto.id_producto}`, payload);
  }

  /** Elimina un producto por su id. */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
