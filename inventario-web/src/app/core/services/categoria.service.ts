import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface CategoriaDto {
  id: number;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private readonly baseUrl = `${environment.apiUrl}/Categorias`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  /** Devuelve el listado de categorías tal como lo entrega la API */
  listar(): Observable<CategoriaDto[]> {
    return this.http.get<CategoriaDto[]>(this.baseUrl);
  }

  /** Crea una nueva categoría */
  crear(dto: Omit<CategoriaDto, 'id' | 'usuario_creacion'>): Observable<number> {
    const payload = { ...dto, usuario_creacion: this.auth.token() };
    return this.http.post<number>(this.baseUrl, payload);
  }

  /** Actualiza una categoría existente */
  actualizar(dto: Omit<CategoriaDto, 'usuario_modificacion'> & { id: number }): Observable<void> {
    const payload = { ...dto, usuario_modificacion: this.auth.token() };
    return this.http.put<void>(`${this.baseUrl}/${dto.id}`, payload);
  }

  /** Elimina una categoría por su id. */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
