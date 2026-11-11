import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface ProveedorDto {
  id: number;
  nombre: string;
  rut?: string | null;
  telefono?: string | null;
  tipoProveedor?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProveedorService {
  private readonly baseUrl = `${environment.apiUrl}/Proveedores`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  listar(): Observable<ProveedorDto[]> {
    return this.http.get<ProveedorDto[]>(this.baseUrl);
  }

  crear(dto: Omit<ProveedorDto, 'id' | 'usuario_creacion'>): Observable<number> {
    const payload = { ...dto, usuario_creacion: this.auth.token() };
    return this.http.post<number>(this.baseUrl, payload);
  }

  actualizar(dto: Omit<ProveedorDto, 'usuario_modificacion'> & { id: number }): Observable<void> {
    const payload = { ...dto, usuario_modificacion: this.auth.token() };
    return this.http.put<void>(`${this.baseUrl}/${dto.id}`, payload);
  }

  /** Elimina un proveedor por su id. */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
