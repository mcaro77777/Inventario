import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { Chart } from 'chart.js';

// Configurar Chart.js para modo oscuro
function setupChartColors() {
  const isDark = document.body.classList.contains('dark-theme');
  const textColor = isDark ? '#e5e7eb' : '#374151';
  const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  Chart.defaults.color = textColor;
  Chart.defaults.borderColor = gridColor;

  // Configurar title de forma segura
  if (Chart.defaults.plugins?.title) {
    (Chart.defaults.plugins.title as any).color = textColor;
  }

  // Configurar legend labels de forma segura
  if (Chart.defaults.plugins?.legend?.labels) {
    (Chart.defaults.plugins.legend.labels as any).color = textColor;
  }
}

// Ejecutar después de que el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  setupChartColors();
  const observer = new MutationObserver(() => setupChartColors());
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
});

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));
