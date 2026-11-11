/****************************************************************************************
 * Dashboard Inventario – con barra apilada 100 % para “Capacidad Bodegas”
 ****************************************************************************************/
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { FormsModule }       from '@angular/forms';
import { Router }            from '@angular/router';
import { finalize }          from 'rxjs/operators';

/* componentes base */
import { BaseChartComponent }    from '../../../shared/base-chart/base-chart.component';
// BaseTableComponent removed for now (template usage is commented out). Define TableColumn locally below.

/* PrimeNG */
import { TableModule }  from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule }    from 'primeng/tag';
import { RippleModule } from 'primeng/ripple';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { DashboardApiService, DashboardKpisDto, LabeledValueDto, TimeseriesDualDto } from '../../../core/services/dashboard-api.service';
import { CategoriaService, CategoriaDto } from '../../../core/services/categoria.service';
import { ThemeService } from '../../../core/services/theme.service';
import { DashboardNavComponent } from '../../dashboad/shared/dashboard-nav/dashboard-nav.component';

/* Chart.js */
import {
  ChartData, ChartOptions, ChartType
} from 'chart.js';

import { IngresadorStockComponent }
  from '../../ingresos/stock/ingresador-stock/ingresador-stock.component';
import { SinStockDialogComponent } from './sin-stock-dialog.component';
import { BajoMinimoDialogComponent } from './bajo-minimo-dialog.component';
import { ProductosStockDialogComponent } from './productos-stock-dialog.component';
import { ValorInventarioDialogComponent } from './valor-inventario-dialog.component';

/* ─── Tipos locales ─── */
interface Stat {
  label:string; value:string; icon:string;
  colorKey:'blue'|'green'|'purple'|'amber'|'red';
  trend:string; trendPositive:boolean;
}
// Local definition replacing the missing shared Table component types
interface TableColumn { field:string; header:string; type?: 'action' | 'currency' | string }
interface Producto { id:number; nombre:string; categoria?:string|null; stock:number; min:number; }
interface PurchaseOrder { oc:string; proveedor:string; dias:number; monto:number; }
interface ChartCfg<T extends ChartType = ChartType>{
  title:string; type:T;
  data:ChartData<T, number[], string>;
  options:ChartOptions<T>;
  helpText?:string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports:[
    CommonModule,
    FormsModule,
    BaseChartComponent, DashboardNavComponent,
    TableModule, ButtonModule, TagModule, RippleModule, DynamicDialogModule
  ],
  providers:[DialogService]
})
export class DashboardComponent implements OnInit {
  // ─── Filtro de categoría ───
  categorias: {label:string; value:number|null}[] = [{ label:'Todas', value:null }];
  categoriaSeleccionada: number | null = null;
  // Loading general
  isLoading = false;
  private pending = 0;

  /* ═════ KPIs ═════ */
  stats: Stat[] = [
    { label:'Productos en Stock', value:'Cargando…', icon:'pi pi-box',    colorKey:'blue',   trend:'', trendPositive:true },
    { label:'Sin Stock',          value:'Cargando…', icon:'pi pi-times',  colorKey:'red',    trend:'', trendPositive:true },
    { label:'Bajo Mínimo',        value:'Cargando…', icon:'pi pi-warning',colorKey:'amber',  trend:'', trendPositive:true },
    { label:'Valor Inventario',   value:'Cargando…', icon:'pi pi-wallet', colorKey:'purple', trend:'', trendPositive:true }
  ];

  /* ═════ Stock crítico ═════ */
  criticalColumns: TableColumn[] = [
    { field:'nombre', header:'Producto' },
    { field:'codigo', header:'SKU' },
    { field:'stock',  header:'Stock' },
    { field:'min',    header:'Mínimo' },
    { field:'',       header:'', type:'action' }
  ];
  criticalItems: Producto[] = [];
  criticalLoadError = false;

  /* ═════ Órdenes en curso ═════ */
  poColumns: TableColumn[] = [
    { field:'oc',        header:'OC'        },
    { field:'proveedor', header:'Proveedor' },
    { field:'dias',      header:'Días'      },
    { field:'monto',     header:'Monto', type:'currency' }
  ];
  pos: PurchaseOrder[] = [
    { oc:'OC-10234', proveedor:'Ferretería Central', dias:3,  monto:680 },
    { oc:'OC-10235', proveedor:'Makita Chile',       dias:11, monto:1_450 },
    { oc:'OC-10236', proveedor:'Bodega GV SpA',      dias:7,  monto:280 }
  ];

  /* ═════ Charts fila 1 ═════ */
  salesChart: ChartCfg<'line'> = {
    title:'Movimientos (7 d)',
    type:'line',
    helpText:'Muestra la cantidad de movimientos de inventario (ingresos y egresos) durante los últimos 7 días. Permite identificar patrones de actividad y días con mayor flujo.',
    data:{
      labels:['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'],
      datasets:[{
        label:'Movimientos',
        data:[180,220,200,240,250,230,255],
        borderColor:'#3b82f6',
        backgroundColor:'rgba(59,130,246,.15)',
        tension:.4, fill:true, borderWidth:2, pointRadius:0
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{
        x:{ grid:{display:false}, ticks:{color:'#6b7280'}, border:{ display:false } },
        y:{ beginAtZero:true, grid:{color:'#f3f4f6'},
            ticks:{ color:'#6b7280', callback:(v:string|number)=>` ${v}` }, border:{ display:false } }
      }
    }
  };

  valueChart: ChartCfg<'bar'> = {
    title:'Valor Inventario (6 m)',
    type:'bar',
    helpText:'Evolución del valor total del inventario durante los últimos 6 meses. Ayuda a identificar tendencias de crecimiento o reducción del stock valorizado.',
    data:{
      labels:['Ene','Feb','Mar','Abr','May','Jun'],
      datasets:[{ data:[96,98,103,101,99,97],
                  backgroundColor:'#6366f1' }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{
        x:{ grid:{display:false} },
        y:{ beginAtZero:true,
            ticks:{ callback:(v:string|number)=>`$${v} M` } }
      }
    }
  };

  categoryChart: ChartCfg<'doughnut'> = {
    title:'Stock por Categoría',
    type:'doughnut',
    helpText:'Distribución porcentual de productos por categoría. Haz clic en una sección para ver el detalle de esa categoría.',
    data:{
      labels:['Repuestos','Insumos','Herramientas','Oficina'],
      datasets:[{
        data:[45,28,18,9],
        backgroundColor:['#6366f1','#22c55e','#f97316','#ef4444'],
        borderWidth:0, offset:5, borderRadius:5
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false, cutout:'68%',
      plugins:{ legend:{ position:'right',
                         labels:{ usePointStyle:true, padding:18, boxWidth:10,
                                  color:'#6b7280', font:{size:12} } } }
    }
  };

  chartsRow1: ChartCfg[] = [this.salesChart, this.valueChart, this.categoryChart];

  /* ═════ Charts fila 2 ═════ */

  consumptionChart: ChartCfg<'bar'> = {
    title:'Consumo por Depto (30 d)',
    type:'bar',
    helpText:'Cantidad de egresos por departamento en los últimos 30 días. Identifica qué áreas consumen más recursos del inventario.',
    data:{
      labels:['Mantención','Producción','Oficina','Logística'],
      datasets:[
        { label:'Ingresos', data:[120,80,40,130], backgroundColor:'#22c55e' },
        { label:'Egresos',  data:[110,95,50,140], backgroundColor:'#ef4444' }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{position:'bottom'} },
      scales:{ x:{stacked:true}, y:{stacked:true, beginAtZero:true} }
    }
  };

  /** Nueva barra apilada 100 %: muestra % libre / ocupado / congelado */
  occupancyChart: ChartCfg<'bar'> = {
    title:'Capacidad Bodegas (Jun)',
    type:'bar',
    data:{
      labels:Array.from({length:30},(_,i)=>String(i+1)),
      datasets:[
        { label:'Libre',     data:Array(30).fill(40), backgroundColor:'#22c55e', stack:'tot' },
        { label:'Ocupado',   data:Array(30).fill(35), backgroundColor:'#f59e0b', stack:'tot' },
        { label:'Congelado', data:Array(30).fill(25), backgroundColor:'#ef4444', stack:'tot' }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{position:'bottom'} },
      scales:{
        x:{ stacked:true, grid:{display:false} },
        y:{ stacked:true, beginAtZero:true, max:100,
            ticks:{ callback:(v:string|number)=>`${v}%` } }
      }
    }
  };

  /* ═════ Acciones rápidas ═════ */
  constructor(private dialog:DialogService,
              private dash:DashboardApiService,
              private cdr: ChangeDetectorRef,
              private categoriasSvc: CategoriaService,
              private theme: ThemeService,
              private router: Router){}

  irA(ruta: string): void {
    void this.router.navigateByUrl(ruta);
  }

  abrirProducto(producto: Producto): void {
    void this.router.navigate(['/menu', 'dashboard-bi', 'producto', producto.nombre]);
  }

  abrirDialogoIngreso(){
    this.dialog.open(IngresadorStockComponent,{
      header:'Nuevo Ingreso de Stock',
      width:'60vw', dismissableMask:true
    });
  }
  abrirWizardReposicion(){
    console.log('Abrir wizard de reposición');
  }

  // Click en KPI: abrir detalle sin stock
  onStatClick(stat: Stat){
    const total = parseInt((stat.value || '0').replace(/\D/g,''), 10) || 0;
    const catOpt = this.categorias.find(c => c.value === this.categoriaSeleccionada) ?? {label:'Todas', value:null};
    if (stat.label === 'Sin Stock'){
      this.dialog.open(SinStockDialogComponent,{
        header: `Sin Stock (${total})`,
        width: '60vw',
        closable: true,
        closeOnEscape: true,
        dismissableMask: true,
        data: { categoriaId: this.categoriaSeleccionada, categoriaNombre: catOpt.label }
      });
      return;
    }
    if (stat.label === 'Productos en Stock'){
      this.dialog.open(ProductosStockDialogComponent,{
        header: `Productos en Stock (${total})`,
        width: '60vw',
        closable: true,
        closeOnEscape: true,
        dismissableMask: true,
        data: { categoriaId: this.categoriaSeleccionada, categoriaNombre: catOpt.label }
      });
      return;
    }
    if (stat.label === 'Bajo Mínimo'){
      this.dialog.open(BajoMinimoDialogComponent,{
        header: `Bajo Mínimo (${total})`,
        width: '60vw',
        closable: true,
        closeOnEscape: true,
        dismissableMask: true,
        data: { categoriaId: this.categoriaSeleccionada, categoriaNombre: catOpt.label }
      });
      return;
    }
    if (stat.label === 'Valor Inventario'){
      this.dialog.open(ValorInventarioDialogComponent,{
        header: `Valor Inventario` ,
        width: '70vw',
        closable: true,
        closeOnEscape: true,
        dismissableMask: true,
        data: { categoriaId: this.categoriaSeleccionada, categoriaNombre: catOpt.label }
      });
      return;
    }
  }

  /* ═════ Init & anim KPI ═════ */
  ngOnInit():void{
    this.updateChartColors();
    this.loadCategorias();
    this.reloadAll();
  }

  /** Actualiza colores de gráficos según tema actual */
  private updateChartColors(): void {
    const textColor = this.chartTextColor();
    const gridColor = this.chartGridColor();

    // salesChart
    this.salesChart.options = {
      ...this.salesChart.options,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: textColor }, border: { display: false } },
        y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor, callback: (v: string | number) => ` ${v}` }, border: { display: false } }
      }
    };

    // valueChart
    this.valueChart.options = {
      ...this.valueChart.options,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: textColor }, border: { display: false } },
        y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor, callback: (v: string | number) => `$${v} M` }, border: { display: false } }
      }
    };

    // categoryChart
    this.categoryChart.options = {
      ...this.categoryChart.options,
      plugins: { legend: { position: 'right', labels: { usePointStyle: true, padding: 18, boxWidth: 10, color: textColor, font: { size: 12 } } } }
    };

    // consumptionChart
    this.consumptionChart.options = {
      ...this.consumptionChart.options,
      plugins: { legend: { position: 'bottom', labels: { color: textColor } } },
      scales: {
        x: { stacked: true, ticks: { color: textColor }, grid: { display: false }, border: { display: false } },
        y: { stacked: true, beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor }, border: { display: false } }
      }
    };

    // occupancyChart
    this.occupancyChart.options = {
      ...this.occupancyChart.options,
      plugins: { legend: { position: 'bottom', labels: { color: textColor } } },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { color: textColor }, border: { display: false } },
        y: { stacked: true, beginAtZero: true, max: 100, ticks: { color: textColor, callback: (v: string | number) => `${v}%` }, grid: { color: gridColor }, border: { display: false } }
      }
    };

    this.chartsRow1 = [this.salesChart, this.valueChart, this.categoryChart];
  }

  private loadCategorias(){
    this.categoriasSvc.listar().subscribe({
      next: (rows:CategoriaDto[])=>{
        const safeRows = Array.isArray(rows) ? rows : [];
        const opts = safeRows.map(r=> ({label:r.nombre, value:r.id}));
        this.categorias = [{label:'Todas', value:null}, ...opts];
        this.cdr.markForCheck();
      },
      error: _ => {
        this.categorias = [{label:'Todas', value:null}];
        this.cdr.markForCheck();
      }
    });
  }

  onCategoriaChange(){
    this.reloadAll();
  }

  private reloadAll(){
    // Cargas independientes para mantener la pantalla útil aunque una falle.
    this.isLoading = true;
    this.pending = 6;
    this.loadKpis();
    this.loadMovements7d();
    this.loadValue6m();
    this.loadStockByCategory();
    this.loadConsumptionByDept();
    this.loadCriticalItems();
  }

  private onReqDone(){
    this.pending = Math.max(0, this.pending - 1);
    if (this.pending === 0) {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  private loadKpis(){
    this.dash.kpis(this.categoriaSeleccionada)
      .pipe(finalize(()=> this.onReqDone()))
      .subscribe({
      next: (k:DashboardKpisDto)=>{
        const fmt = (n:number)=> n.toLocaleString();
        const money = (n:number)=> `$ ${n.toLocaleString('es-CL')}`;
        this.stats[0].value = fmt(k.productosEnStock);
        this.stats[1].value = fmt(k.sinStock);
        this.stats[2].value = fmt(k.bajoMinimo);
        this.stats[3].value = money(k.valorInventario);
        // limpiar trend placeholders
        this.stats.forEach(s=> s.trend = '');
        this.cdr.markForCheck();
      },
      error: _ => {
        // Mostrar estado de error en KPIs
        this.stats = this.stats.map(s => ({...s, value: '-', trend: 'Error', trendPositive: false }));
        this.cdr.markForCheck();
      }
    });

    // Fallback: si en 3s sigue en "Cargando…", muestra 0 (sin datos) para evitar skeleton eterno
    setTimeout(() => {
      if (this.stats.every(s => s.value === 'Cargando…')){
        this.stats = [
          { ...this.stats[0], value: '0' },
          { ...this.stats[1], value: '0' },
          { ...this.stats[2], value: '0' },
          { ...this.stats[3], value: '$ 0' }
        ];
        this.stats.forEach(s=> s.trend = '');
        this.cdr.markForCheck();
      }
    }, 3000);
  }

  private loadMovements7d(){
    this.dash.movimientos7d(this.categoriaSeleccionada)
      .pipe(finalize(()=> this.onReqDone()))
      .subscribe((rows:TimeseriesDualDto[] | null)=>{
      const safeRows = Array.isArray(rows) ? rows : [];
      this.salesChart = {
        title:'Movimientos (7 d)',
        type:'line',
        helpText:'Muestra la cantidad de movimientos de inventario (ingresos y egresos) durante los últimos 7 días. Permite identificar patrones de actividad y días con mayor flujo.',
        data:{
          labels: safeRows.map(r=> r.label.slice(5)),
          datasets:[{
            label:'Ingresos',
            data: safeRows.map(r=> Number(r.serieA)),
            borderColor:'#22c55e',
            backgroundColor:'rgba(34,197,94,.15)',
            tension:.4, fill:true, borderWidth:2, pointRadius:0
          },{
            label:'Egresos',
            data: safeRows.map(r=> Number(r.serieB)),
            borderColor:'#ef4444',
            backgroundColor:'rgba(239,68,68,.08)',
            tension:.4, fill:true, borderWidth:2, pointRadius:0
          }]
        },
        options:{
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{ labels:{ color: this.chartTextColor() } } },
          scales:{
            x:{ ticks:{ color:this.chartTextColor() }, grid:{ color:this.chartGridColor() }, border:{ display:false } },
            y:{ ticks:{ color:this.chartTextColor() }, grid:{ color:this.chartGridColor() } }
          }
        }
      };
      this.refreshRow1();
    });
  }

  private loadValue6m(){
    this.dash.valor6m(this.categoriaSeleccionada)
      .pipe(finalize(()=> this.onReqDone()))
      .subscribe((rows:LabeledValueDto[] | null)=>{
      const safeRows = Array.isArray(rows) ? rows : [];
      this.valueChart = {
        title:'Valor Inventario (6 m)',
        type:'bar',
        helpText:'Evolución del valor total del inventario durante los últimos 6 meses. Ayuda a identificar tendencias de crecimiento o reducción del stock valorizado.',
        data:{ labels: safeRows.map(r=> r.label), datasets:[{ data: safeRows.map(r=> Number(r.value)), backgroundColor:'#6366f1' }] },
        options:{
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{display:false} },
          scales:{ x:{ ticks:{ color:this.chartTextColor() }, grid:{ color:this.chartGridColor() }, border:{ display:false } },
                   y:{ ticks:{ color:this.chartTextColor() }, grid:{ color:this.chartGridColor() } } }
        }
      };
      this.refreshRow1();
    });
  }

  private loadStockByCategory(){
    this.dash.stockPorCategoria(this.categoriaSeleccionada)
      .pipe(finalize(()=> this.onReqDone()))
      .subscribe((rows:LabeledValueDto[] | null)=>{
      const safeRows = Array.isArray(rows) ? rows : [];
      const colors=['#6366f1','#22c55e','#f97316','#ef4444','#0ea5e9','#84cc16'];
      this.categoryChart = {
        title:'Stock por Categoría',
        type:'doughnut',
        helpText:'Distribución porcentual de productos por categoría. Haz clic en una sección para ver el detalle de esa categoría.',
        data:{
          labels: safeRows.map(r=> r.label),
          datasets:[{ data: safeRows.map(r=> Number(r.value)), backgroundColor: safeRows.map((_,i)=> colors[i%colors.length]), borderWidth:0, offset:5, borderRadius:5 }]
        },
        options:{
          responsive:true, maintainAspectRatio:false, cutout:'68%',
          plugins:{ legend:{ position:'right', labels:{ usePointStyle:true, padding:18, boxWidth:10, color:this.chartTextColor(), font:{size:12} } } }
        }
      };
      this.refreshRow1();
    });
  }

  private loadConsumptionByDept(){
    this.dash.consumoPorDept30d(this.categoriaSeleccionada)
      .pipe(finalize(()=> this.onReqDone()))
      .subscribe((rows:LabeledValueDto[] | null)=>{
      const safeRows = Array.isArray(rows) ? rows : [];
      this.consumptionChart = {
        title:'Consumo por Depto (30 d)',
        type:'bar',
        helpText:'Cantidad de egresos por departamento en los últimos 30 días. Identifica qué áreas consumen más recursos del inventario.',
        data:{ labels: safeRows.map(r=> r.label), datasets:[ { label:'Egresos', data: safeRows.map(r=> Number(r.value)), backgroundColor:'#ef4444' } ] },
        options:{
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{position:'bottom', labels:{ color:this.chartTextColor() } } },
          scales:{ x:{ ticks:{ color:this.chartTextColor() }, grid:{ color:this.chartGridColor() }, border:{ display:false } },
                   y:{ ticks:{ color:this.chartTextColor() }, grid:{ color:this.chartGridColor() } } }
        }
      };
    });
  }

  private loadCriticalItems(): void {
    this.criticalLoadError = false;
    this.dash.bajoMinimo(6, this.categoriaSeleccionada)
      .pipe(finalize(() => this.onReqDone()))
      .subscribe({
        next: rows => {
          this.criticalItems = (Array.isArray(rows) ? rows : []).map(row => ({
            id: Number(row.productoId),
            nombre: row.nombre,
            categoria: row.categoria,
            stock: Number(row.stockActual),
            min: Number(row.stockMinimo)
          }));
          this.cdr.markForCheck();
        },
        error: () => {
          this.criticalItems = [];
          this.criticalLoadError = true;
          this.cdr.markForCheck();
        }
      });
  }

  private refreshRow1(){
    this.chartsRow1 = [ this.salesChart, this.valueChart, this.categoryChart ];
  }

  private animateKPI(i:number,start:number,goal:number,ms:number){
    const step=Math.ceil((goal-start)/(ms/20));
    const t=setInterval(()=>{
      const v=+this.stats[i].value.replace(/\D/g,'');
      if(v>=goal){ clearInterval(t); return; }
      this.stats[i].value=(v+step).toLocaleString();
    },20);
  }

  // ─── Colores dependientes del tema para Chart.js ───
  private chartTextColor(): string {
    // Texto de ejes y leyendas: claro en dark, oscuro en light
    return this.theme.isDarkMode() ? '#e5e7eb' /* gray-200 */ : '#374151' /* gray-700 */;
  }

  private chartGridColor(): string {
    // Líneas de grilla: más sutil en ambos temas
    return this.theme.isDarkMode() ? 'rgba(255,255,255,0.1)' : '#e5e7eb';
  }
}
