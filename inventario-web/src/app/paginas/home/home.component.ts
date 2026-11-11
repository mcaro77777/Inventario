import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './home.component.html'
})
export class HomeComponent {
  searchTerm: string = '';
  viewMode: 'dashboard' | 'stats' = 'dashboard';

  // All dashboard options data
  allDashboardOptions = [
    // Operaciones Principales
    { id: 'pallets', title: 'Ingresos de Pallets', description: 'Gestiona y revisa todas tus ingresos pendientes y completadas de pallets.', category: 'operaciones', icon: '📋' },
    { id: 'despachos', title: 'Despachos', description: 'Controla el buzón de despachos y notificaciones importantes del sistema.', category: 'operaciones', icon: '📬' },
    { id: 'reportes', title: 'Reportes y Estadísticas', description: 'Analiza el rendimiento y métricas detalladas de todas las operaciones.', category: 'operaciones', icon: '📊' },
    
    // Gestión del Sistema
    { id: 'empresarial', title: 'Configuración Empresarial', description: 'Personaliza configuraciones generales y parámetros del sistema.', category: 'sistema', icon: '🏢' },
    { id: 'agricola', title: 'Gestión Agrícola', description: 'Administra categorías, productos y elementos específicos del sector.', category: 'sistema', icon: '🌱' },
    { id: 'usuarios', title: 'Usuarios y Permisos', description: 'Gestiona usuarios del sistema y sus niveles de acceso.', category: 'sistema', icon: '👥' },
    
    // Monitoreo y Control
    { id: 'auditoria', title: 'Auditoría del Sistema', description: 'Revisa logs de actividad y seguimiento de operaciones realizadas.', category: 'monitoreo', icon: '🔍' },
    { id: 'estado', title: 'Estado del Sistema', description: 'Monitorea el rendimiento y estado general de la plataforma.', category: 'monitoreo', icon: '⚡' },
    { id: 'mantenimiento', title: 'Mantenimiento', description: 'Accede a herramientas de mantenimiento y configuración avanzada.', category: 'monitoreo', icon: '🔧' }
  ];

  // Filtered options based on search
  filteredOptions = this.allDashboardOptions;

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
  getOptionsByCategory(category: string) {
    return this.filteredOptions.filter(option => option.category === category);
  }

  // Check if category has visible options
  hasCategoryOptions(category: string): boolean {
    return this.getOptionsByCategory(category).length > 0;
  }

  // Set view mode for toggle buttons
  setView(mode: 'dashboard' | 'stats') {
    this.viewMode = mode;
  }
}
