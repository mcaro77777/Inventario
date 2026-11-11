import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface UnidadMedidaDto {
  id: number;
  descripcion: string;
}

@Injectable({ providedIn: 'root' })
export class UnidadMedidaService {
  private readonly baseUrl = `${environment.apiUrl}/UnidadMedida`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  listar(): Observable<UnidadMedidaDto[]> {
    return this.http.get<UnidadMedidaDto[]>(this.baseUrl);
  }

  crear(dto: Omit<UnidadMedidaDto, 'id' | 'usuario_creacion'>): Observable<number> {
    const payload = { ...dto, usuario_creacion: this.auth.token() };
    return this.http.post<number>(this.baseUrl, payload);
  }

  actualizar(dto: Omit<UnidadMedidaDto, 'usuario_modificacion'> & { id: number }): Observable<void> {
    const payload = { ...dto, usuario_modificacion: this.auth.token() };
    return this.http.put<void>(`${this.baseUrl}/${dto.id}`, payload);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
