import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-dashboard-loader',
  standalone: true,
  template: `
    <div class="loader-backdrop" role="status" aria-live="polite" [attr.aria-label]="label">
      <div class="loader-card">
        <div class="loader-ring" aria-hidden="true">
          <span class="loader-core"><i class="pi pi-chart-bar"></i></span>
        </div>
        <div class="loader-copy">
          <strong>{{ label }}</strong>
          <small>Estamos preparando la información más reciente</small>
        </div>
        <div class="loader-track" aria-hidden="true"><span></span></div>
      </div>
    </div>
  `,
  styles: [`
    .loader-backdrop {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: grid;
      place-items: center;
      padding: 1.25rem;
      background: color-mix(in srgb, var(--surface-ground) 72%, transparent);
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
    }
    .loader-card {
      width: min(340px, 100%);
      display: grid;
      justify-items: center;
      gap: .9rem;
      padding: 1.5rem 1.6rem 1.25rem;
      color: var(--text-color);
      background: color-mix(in srgb, var(--surface-card) 94%, transparent);
      border: 1px solid color-mix(in srgb, var(--primary-color) 22%, var(--surface-border));
      border-radius: 18px;
      box-shadow: 0 18px 55px rgba(15, 23, 42, .18);
    }
    .loader-ring {
      width: 58px;
      height: 58px;
      display: grid;
      place-items: center;
      border: 4px solid color-mix(in srgb, var(--primary-color) 16%, var(--surface-border));
      border-top-color: var(--primary-color);
      border-right-color: color-mix(in srgb, var(--primary-color) 62%, #7c3aed);
      border-radius: 50%;
      animation: loader-spin .85s linear infinite;
      will-change: transform;
    }
    .loader-core {
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      color: var(--primary-color);
      background: color-mix(in srgb, var(--primary-color) 12%, var(--surface-card));
      border-radius: 50%;
      animation: loader-spin-reverse .85s linear infinite;
    }
    .loader-core i { font-size: 1rem; }
    .loader-copy { display: grid; gap: .25rem; text-align: center; }
    .loader-copy strong { font-size: .98rem; letter-spacing: -.01em; }
    .loader-copy small { color: var(--text-color-secondary); font-size: .76rem; line-height: 1.4; }
    .loader-track {
      width: 100%;
      height: 4px;
      overflow: hidden;
      background: color-mix(in srgb, var(--primary-color) 12%, var(--surface-border));
      border-radius: 999px;
    }
    .loader-track span {
      display: block;
      width: 42%;
      height: 100%;
      background: linear-gradient(90deg, var(--primary-color), #8b5cf6);
      border-radius: inherit;
      animation: loader-progress 1.15s ease-in-out infinite;
      will-change: transform;
    }
    @keyframes loader-spin { to { transform: rotate(360deg); } }
    @keyframes loader-spin-reverse { to { transform: rotate(-360deg); } }
    @keyframes loader-progress {
      0% { transform: translateX(-115%); }
      55% { transform: translateX(95%); }
      100% { transform: translateX(245%); }
    }
    @media (prefers-reduced-motion: reduce) {
      .loader-ring, .loader-core, .loader-track span { animation-duration: 2.4s; }
    }
  `]
})
export class DashboardLoaderComponent {
  @Input() label = 'Actualizando dashboard';
}
