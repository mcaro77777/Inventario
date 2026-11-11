import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Strong typing for dashboard options used by the template
export interface DashboardOption {
  id: string;
  title: string;
  description: string;
  category: string;
  route: string[];
  // Either an SVG symbol id or an emoji/icon string
  iconId?: string;
  icon?: string;
}

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [CommonModule, FormsModule],
  templateUrl: './menu.html'
})
export class HomeComponent {
  searchTerm: string = '';
  viewMode: 'grid' | 'list' = 'grid';
  accent: 'blue' | 'green' = 'blue';
  comfortMode: boolean = false;

  // All dashboard options data
  allDashboardOptions: DashboardOption[] = [
    // Maestros
    { id: 'perfiles', title: 'Perfiles', description: 'Administra perfiles del sistema.', category: 'maestros', icon: '👥', route: ['/menu','perfiles'] },
    { id: 'asocia-permisos', title: 'Asocia permisos', description: 'Asigna permisos a los perfiles.', category: 'maestros', icon: '🛡️', route: ['/menu','asignacion-permisos'] },
    { id: 'productos', title: 'Productos', description: 'Administra el catálogo de productos.', category: 'maestros', icon: '📦', route: ['/menu','productos'] },
    { id: 'categorias', title: 'Categorías', description: 'Gestiona categorías de productos.', category: 'maestros', icon: '🏷️', route: ['/menu','categorias'] },
    { id: 'proveedores', title: 'Proveedores', description: 'Mantén tus proveedores.', category: 'maestros', icon: '🚚', route: ['/menu','proveedores'] },
    { id: 'clientes', title: 'Clientes', description: 'Gestiona tus clientes.', category: 'maestros', icon: '👥', route: ['/menu','clientes'] },
    { id: 'departamentos', title: 'Departamentos', description: 'Administra departamentos.', category: 'maestros', icon: '🏢', route: ['/menu','departamentos'] }
  ];

  // Filtered options based on search
  filteredOptions: DashboardOption[] = this.allDashboardOptions;

  // Filter options based on search term
  filterOptions() {
    if (!this.searchTerm.trim()) {
      this.filteredOptions = this.allDashboardOptions;
      return;
    }
    
    const searchLower = this.searchTerm.toLowerCase();
    this.filteredOptions = this.allDashboardOptions.filter(option => 
      option.title.toLowerCase().includes(searchLower) ||
      option.description.toLowerCase().includes(searchLower) ||
      option.category.toLowerCase().includes(searchLower)
    );
  }

  // Get filtered options by category
  getOptionsByCategory(category: string): DashboardOption[] {
    return this.filteredOptions.filter(option => option.category === category);
  }

  // Check if category has visible options
  hasCategoryOptions(category: string): boolean {
    return this.getOptionsByCategory(category).length > 0;
  }

  // Set view mode for toggle buttons
  setView(mode: 'grid' | 'list') {
    this.viewMode = mode;
  }

  toggleAccent() {
    this.accent = this.accent === 'blue' ? 'green' : 'blue';
  }

  toggleComfort() {
    this.comfortMode = !this.comfortMode;
  }

  constructor(private router: Router) {}

  // Navegar al hacer click en una tarjeta
  open(option: DashboardOption) {
    if (option?.route) {
      this.router.navigate(option.route);
    }
  }
}
