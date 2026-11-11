// src/app/core/services/auth.service.ts
import { Injectable, signal, computed, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable, of } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly authUrl = `${environment.apiUrl}/auth`;
  private readonly baseUrl = environment.apiUrl;

  // ──────────────────────────────────────────────────────────
  // TOKEN
  // ──────────────────────────────────────────────────────────
  private tokenSignal = signal<string | null>(localStorage.getItem('token'));
  token = computed(() => this.tokenSignal());

  // ──────────────────────────────────────────────────────────
  // BOTONES
  // ──────────────────────────────────────────────────────────
  private botonesSignal = signal<string[] | null>(
    JSON.parse(localStorage.getItem('botones') || 'null')
  );
  botones = computed(() => this.botonesSignal());

  // ──────────────────────────────────────────────────────────
  // MENÚS  (NUEVO)
  // ──────────────────────────────────────────────────────────
  private menusSignal = signal<string[] | null>(
    JSON.parse(localStorage.getItem('menus') || 'null')
  );
  menus = computed(() => this.menusSignal());

  // ──────────────────────────────────────────────────────────
  // USUARIO
  // ──────────────────────────────────────────────────────────
  private usernameSignal = signal<string | null>(localStorage.getItem('username'));
  username = computed(() => this.usernameSignal());
  private usuarioId: number | null = Number(localStorage.getItem('usuarioId')) || null;

  /** Devuelve el id del usuario autenticado o null si no hay sesión. */
  get usuarioIdActual(): number | null {
    return this.usuarioId;
  }

  constructor(private http: HttpClient) { }

  // ══════════════════════════════════════════════════════════
  // LOGIN
  // ══════════════════════════════════════════════════════════
  login(usuario: string, password: string): Observable<void> {
    return this.http
      .post<{ token: string; id_usuario: number }>(
        `${this.authUrl}/login`,
        { usuario, password }
      )
      .pipe(
        tap(res => {
          // 1) Guardar token
          this.tokenSignal.set(res.token);
          localStorage.setItem('token', res.token);

          // 2) Guardar id de usuario
          this.usuarioId = res.id_usuario;
          localStorage.setItem('usuarioId', String(res.id_usuario));

          // 3) Guardar username ingresado
          this.usernameSignal.set(usuario);
          localStorage.setItem('username', usuario);
        }),
        // 4) Cargar permisos (botones + menús) en paralelo
        tap(res => {
          forkJoin([
            this.cargarPermiso('botones', this.botonesSignal, 'botones', res.id_usuario),
            this.cargarPermiso('menus',   this.menusSignal,   'menus',   res.id_usuario)
          ]).subscribe();
        }),
        map(() => void 0)
      );
  }

  // ══════════════════════════════════════════════════════════
  // CARGAR PERMISOS GENÉRICO  (botones / menús)
  // ══════════════════════════════════════════════════════════
  private cargarPermiso(
    endpoint: 'botones' | 'menus',
    targetSignal: WritableSignal<string[] | null>,
    storageKey: 'botones' | 'menus',
    usuarioId: number
  ): Observable<string[]> {

    return this.http
      .get<string[]>(`${this.baseUrl}/Clientes/${usuarioId}/${endpoint}`)
      .pipe(
        tap(permisos => {
          targetSignal.set(permisos);
          localStorage.setItem(storageKey, JSON.stringify(permisos));
        })
      );
  }

  // Métodos de refresco individuales (por si los necesitas)
  refreshBotones(): Observable<string[]> {
    if (this.usuarioId == null)
      return this.botonesSignal() ? of(this.botonesSignal()!) : of([]);
    return this.cargarPermiso('botones', this.botonesSignal, 'botones', this.usuarioId);
  }

  refreshMenus(): Observable<string[]> {
    if (this.usuarioId == null)
      return this.menusSignal() ? of(this.menusSignal()!) : of([]);
    return this.cargarPermiso('menus', this.menusSignal, 'menus', this.usuarioId);
  }

  // ══════════════════════════════════════════════════════════
  // LOGOUT
  // ══════════════════════════════════════════════════════════
  logout(): void {
    this.tokenSignal.set(null);
    this.botonesSignal.set(null);
    this.menusSignal.set(null);
    this.usuarioId = null;
    this.usernameSignal.set(null);

    localStorage.removeItem('token');
    localStorage.removeItem('botones');
    localStorage.removeItem('menus');
    localStorage.removeItem('usuarioId');
    localStorage.removeItem('username');
  }

  // ══════════════════════════════════════════════════════════
  // UTILIDADES
  // ══════════════════════════════════════════════════════════
  tienePermiso(recurso: string): boolean {
    return (this.botonesSignal()?.includes(recurso) || this.menusSignal()?.includes(recurso)) ?? false;
  }

  isAuthenticated(): boolean {
    return !!this.tokenSignal();
  }
}
