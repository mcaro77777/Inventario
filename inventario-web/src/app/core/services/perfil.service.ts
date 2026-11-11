import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface PerfilDto {
  id: number;
  nombre: string;
  descripcion?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient, private auth: AuthService) {}

  listar(): Observable<PerfilDto[]> {
    return this.http.get<PerfilDto[]>(`${this.baseUrl}/Perfiles`);
  }

  crear(dto: Omit<PerfilDto, 'id' | 'usuario_creacion'>): Observable<number> {
    const payload = { ...dto, usuario_creacion: this.auth.token() };
    return this.http.post<number>(`${this.baseUrl}/Perfiles`, payload);
  }

  actualizar(dto: Omit<PerfilDto, 'usuario_modificacion'> & { id: number }): Observable<void> {
    const payload = { ...dto, usuario_modificacion: this.auth.token() };
    return this.http.put<void>(`${this.baseUrl}/Perfiles/${dto.id}`, payload);
  }

  /** Elimina un perfil por su id. */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/Perfiles/${id}`);
  }
}
