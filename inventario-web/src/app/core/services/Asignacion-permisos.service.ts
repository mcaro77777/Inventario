import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PerfilDto {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface PermisoDto {
  id_permiso: number;
  recurso: string;
  tipo: string;
  descripcion?: string;
  asignado?: boolean;
}

@Injectable({ providedIn: 'root' })
export class PerfilService {

  private readonly baseUrl = `${environment.apiUrl}/Perfiles`;

  constructor(private http: HttpClient) {}

  // ─────────────────────────────────────────────────────────
  // CRUD de perfiles
  // ─────────────────────────────────────────────────────────
  listar(): Observable<PerfilDto[]> {
    return this.http.get<PerfilDto[]>(this.baseUrl);
  }

  insertar(dto: PerfilDto): Observable<number> {
    return this.http.post<number>(this.baseUrl, dto);
  }

  actualizar(dto: PerfilDto): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${dto.id}`, dto);
  }

  // ─────────────────────────────────────────────────────────
  // Permisos de perfil
  // ─────────────────────────────────────────────────────────
  listarPermisosConAsignacion(idPerfil: number): Observable<(PermisoDto & { asignado: boolean })[]> {
    return this.http.get<(PermisoDto & { asignado: boolean })[]>(`${this.baseUrl}/${idPerfil}/permisos`);
  }

  guardarAsignacion(idPerfil: number, idsPermisos: number[]): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${idPerfil}/permisos`, idsPermisos);
  }
}
