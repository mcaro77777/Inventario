import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface DepartamentoDto {
  id: number;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class DepartamentoService {
  private readonly baseUrl = `${environment.apiUrl}/Departamentos`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  listar(): Observable<DepartamentoDto[]> {
    return this.http.get<DepartamentoDto[]>(this.baseUrl);
  }

  crear(dto: Omit<DepartamentoDto, 'id' | 'usuario_creacion'>): Observable<number> {
    const payload = { ...dto, usuario_creacion: this.auth.token() };
    return this.http.post<number>(this.baseUrl, payload);
  }

  actualizar(dto: Omit<DepartamentoDto, 'usuario_modificacion'> & { id: number }): Observable<void> {
    const payload = { ...dto, usuario_modificacion: this.auth.token() };
    return this.http.put<void>(`${this.baseUrl}/${dto.id}`, payload);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
