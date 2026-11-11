import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'theme';
  constructor() { this.setDarkMode(localStorage.getItem(this.storageKey) === 'dark'); }
  isDarkMode(): boolean { return document.documentElement.dataset['theme'] === 'oscuro'; }
  toggleTheme(): void { this.setDarkMode(!this.isDarkMode()); }
  setDarkMode(enabled: boolean): void {
    document.documentElement.dataset['theme'] = enabled ? 'oscuro' : 'claro';
    document.body.classList.toggle('dark-theme', enabled);
    localStorage.setItem(this.storageKey, enabled ? 'dark' : 'light');
  }
}
