// app.config.ts
import { ApplicationConfig, provideZonelessChangeDetection, LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsCL from '@angular/common/locales/es-CL';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { AuthInterceptor } from './core/services/AuthInterceptor';

/* Registrar locale español (separador decimal “,”, etc.) */
registerLocaleData(localeEsCL);

export const appConfig: ApplicationConfig = {
  providers: [
    /* Zoneless (sin ZoneJS) */
    provideZonelessChangeDetection(),

    /* Locale global */
    { provide: LOCALE_ID, useValue: 'es-CL' },

    /* Animaciones (PrimeNG) */
    provideAnimations(),

    /* Router con transiciones (omite la transición inicial para evitar InvalidStateError) */
    provideRouter(routes, withViewTransitions({ skipInitialTransition: true })),

    /* HTTP Client */
    provideHttpClient(withInterceptors([AuthInterceptor])),

    /* Tema PrimeNG (Aura) */
    providePrimeNG({ theme: { preset: Aura } })
  ]
};
