// ======================== DashboardFiltersService ========================
// Servicio de estado global para filtros del dashboard (estilo Power BI cross-filter)
import { Injectable, signal, computed } from '@angular/core';

export interface DashboardFilters {
  // Rango de fechas
  fechaInicio: Date | null;
  fechaFin: Date | null;
  bookmark: '7d' | '30d' | '90d' | 'all';

  // Dimensiones (usar nombres para filtrar ya que los IDs no siempre están disponibles)
  categoriaId: number | null;
  categoriaNombre: string | null;
  productoId: number | null;
  proveedorId: number | null;
  proveedorNombre: string | null;
  departamentoId: number | null;
  departamentoNombre: string | null;
  clienteId: number | null;

  // Estado de movimiento (0=Ingreso, 1=Pendiente, 2=Aprobado, 3=Rechazado)
  tipoMovimiento: number | null;

  // Métrica activa
  metrica: 'gasto' | 'unidades' | 'frecuencia';

  // Texto de búsqueda
  searchText: string;
}

const defaultFilters: DashboardFilters = {
  fechaInicio: null,
  fechaFin: null,
  bookmark: '30d',
  categoriaId: null,
  categoriaNombre: null,
  productoId: null,
  proveedorId: null,
  proveedorNombre: null,
  departamentoId: null,
  departamentoNombre: null,
  clienteId: null,
  tipoMovimiento: null,
  metrica: 'gasto',
  searchText: ''
};

export interface FilterOption {
  id: number;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardFiltersService {
  // Estado principal con signals
  private _filters = signal<DashboardFilters>({ ...defaultFilters });

  // Cache de opciones de filtro (persisten entre navegación)
  private _categorias = signal<FilterOption[]>([]);
  private _proveedores = signal<FilterOption[]>([]);
  private _departamentos = signal<FilterOption[]>([]);
  private _productos = signal<FilterOption[]>([]);
  private _optionsLoaded = signal<boolean>(false);
  
  // Estado de carga global para dashboard
  private _loading = signal<boolean>(false);
  
  // Mapa producto -> categoría (persiste entre navegación)
  private _productoCategoriaMap = new Map<number, number>();

  // Exponer opciones como readonly
  readonly categorias = this._categorias.asReadonly();
  readonly proveedores = this._proveedores.asReadonly();
  readonly departamentos = this._departamentos.asReadonly();
  readonly productos = this._productos.asReadonly();
  readonly optionsLoaded = this._optionsLoaded.asReadonly();
  readonly loading = this._loading.asReadonly();

  // Exponer filtros como readonly
  readonly filters = this._filters.asReadonly();

  // Computed: rango de fechas calculado según bookmark
  readonly dateRange = computed(() => {
    const f = this._filters();
    if (f.fechaInicio && f.fechaFin) {
      return { start: f.fechaInicio, end: f.fechaFin };
    }
    const end = new Date();
    const start = new Date();
    switch (f.bookmark) {
      case '7d': start.setDate(end.getDate() - 7); break;
      case '30d': start.setDate(end.getDate() - 30); break;
      case '90d': start.setDate(end.getDate() - 90); break;
      case 'all': start.setFullYear(2000); break;
    }
    return { start, end };
  });

  // Computed: periodo anterior (para variaciones)
  readonly previousDateRange = computed(() => {
    const { start, end } = this.dateRange();
    const diff = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - diff);
    return { start: prevStart, end: prevEnd };
  });

  // Actualizar filtros (merge parcial)
  updateFilters(partial: Partial<DashboardFilters>): void {
    this._filters.update(current => ({ ...current, ...partial }));
  }

  // Setear bookmark (atajo común)
  setBookmark(bookmark: '7d' | '30d' | '90d' | 'all'): void {
    this.updateFilters({ bookmark, fechaInicio: null, fechaFin: null });
  }

  // Limpiar filtros de dimensión (para cross-filter)
  clearDimensionFilters(): void {
    this.updateFilters({
      categoriaId: null,
      categoriaNombre: null,
      productoId: null,
      proveedorId: null,
      proveedorNombre: null,
      departamentoId: null,
      departamentoNombre: null,
      clienteId: null
    });
  }

  // Reset completo
  resetAll(): void {
    this._filters.set({ ...defaultFilters });
  }

  // Cross-filter: click en categoría
  filterByCategoria(id: number | null, nombre: string | null = null): void {
    this.updateFilters({ categoriaId: id, categoriaNombre: nombre, productoId: null });
  }

  // Cross-filter: click en producto
  filterByProducto(id: number | null): void {
    this.updateFilters({ productoId: id });
  }

  // Cross-filter: click en proveedor
  filterByProveedor(id: number | null, nombre: string | null = null): void {
    this.updateFilters({ proveedorId: id, proveedorNombre: nombre });
  }

  // Cross-filter: click en departamento
  filterByDepartamento(id: number | null, nombre: string | null = null): void {
    this.updateFilters({ departamentoId: id, departamentoNombre: nombre, clienteId: null });
  }

  // Cross-filter: click en cliente
  filterByCliente(id: number | null): void {
    this.updateFilters({ clienteId: id });
  }

  // Setear opciones de filtro (cache)
  setFilterOptions(options: {
    categorias: FilterOption[];
    proveedores: FilterOption[];
    departamentos: FilterOption[];
    productos: FilterOption[];
  }): void {
    this._categorias.set(options.categorias);
    this._proveedores.set(options.proveedores);
    this._departamentos.set(options.departamentos);
    this._productos.set(options.productos);
    this._optionsLoaded.set(true);
  }

  // Setear mapa producto -> categoría
  setProductoCategoriaMap(map: Map<number, number>): void {
    this._productoCategoriaMap = map;
  }

  // Obtener categoría de un producto
  getProductoCategoria(productoId: number): number | undefined {
    return this._productoCategoriaMap.get(productoId);
  }

  // Obtener productos filtrados por categoría
  getProductosFiltrados(categoriaId: number | null): FilterOption[] {
    const todos = this._productos();
    if (!categoriaId) {
      return todos;
    }
    return todos.filter(p => this._productoCategoriaMap.get(p.id) === categoriaId);
  }

  // Control de loading global
  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }
}
