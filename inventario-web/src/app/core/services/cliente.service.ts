import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface ClienteDto {
  id: number;
  nombre: string;
  rut?: string | null;
  usuario: string;
  clave?: string | null;
  id_perfil: number;
  id_departamento: number;
}

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly baseUrl = `${environment.apiUrl}/Clientes`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  listar(): Observable<ClienteDto[]> {
    return this.http.get<ClienteDto[]>(this.baseUrl);
  }

  crear(dto: Omit<ClienteDto, 'id' | 'usuario_creacion'>): Observable<number> {
    const payload = { ...dto, usuario_creacion: this.auth.token() };
    return this.http.post<number>(this.baseUrl, payload);
  }

  actualizar(dto: Omit<ClienteDto, 'usuario_modificacion'> & { id: number }): Observable<void> {
    const payload = { ...dto, usuario_modificacion: this.auth.token() };
    return this.http.put<void>(`${this.baseUrl}/${dto.id}`, payload);
  }

  /** Elimina un cliente por su id. */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}


