import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-estado-solicitudes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="page-wrap">
      <h2>Estado Solicitudes</h2>
      <p>Consulta el estado actual de tus solicitudes.</p>
      <section *ngIf="loading()">Cargando...</section>
      <section *ngIf="!loading() && items().length === 0">Sin solicitudes en seguimiento.</section>
      <ul *ngIf="!loading() && items().length > 0">
        <li *ngFor="let it of items()">{{ it }}</li>
      </ul>
    </main>
  `,
  styles: [
    `.page-wrap{padding:1rem}`
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EstadoSolicitudesComponent {
  loading = signal(false);
  items = signal<string[]>([]);
}
