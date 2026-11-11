import { Component, Input, Output, EventEmitter, HostListener, ViewChild, AfterViewInit, OnChanges, SimpleChanges, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgChartsModule, BaseChartDirective } from 'ng2-charts';
import {
  ChartTypeRegistry,
  ChartData,
  ChartOptions,
  ActiveElement,
  ChartEvent
} from 'chart.js';

export interface ChartClickEvent {
  label: string;
  value: number;
  datasetIndex: number;
  index: number;
}

@Component({
  selector: 'app-base-chart',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './base-chart.component.html',
  styleUrls: ['./base-chart.component.scss']
})
export class BaseChartComponent implements AfterViewInit, OnChanges {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  
  @Input() title: string = '';
  
  private initialized = false;
  
  constructor(private zone: NgZone) {}
  @Input() type: keyof ChartTypeRegistry = 'line';
  @Input() data!: ChartData<any, any, any>;
  @Input() options!: ChartOptions<any>;
  @Input() minItems: number = 0; // Mínimo de items para mostrar el gráfico (0 = sin mínimo)
  @Input() helpText: string = ''; // Texto de ayuda para el gráfico
  
  @Output() chartClick = new EventEmitter<ChartClickEvent>();
  
  showHelp = false;
  @Output() expandRange = new EventEmitter<void>(); // Emitir cuando se pide expandir rango

  get hasEnoughData(): boolean {
    if (!this.data?.datasets?.length) return false;
    const dataLength = this.data.labels?.length || this.data.datasets[0]?.data?.length || 0;
    return this.minItems === 0 || dataLength >= this.minItems;
  }

  get dataCount(): number {
    if (!this.data?.datasets?.length) return 0;
    return this.data.labels?.length || this.data.datasets[0]?.data?.length || 0;
  }

  get isSinglePoint(): boolean {
    return this.type === 'line' && this.dataCount === 1;
  }

  get singlePointValue(): number {
    if (!this.isSinglePoint || !this.data?.datasets?.[0]?.data?.[0]) return 0;
    return this.data.datasets[0].data[0] as number;
  }

  get singlePointLabel(): string {
    if (!this.isSinglePoint || !this.data?.labels?.[0]) return '';
    return this.data.labels[0] as string;
  }

  onExpandRange(): void {
    this.expandRange.emit();
  }

  toggleHelp(): void {
    this.showHelp = !this.showHelp;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.help-container')) {
      this.showHelp = false;
    }
  }

  onChartClick(event: any): void {
    if (event.active && event.active.length > 0) {
      const element = event.active[0];
      const datasetIndex = element.datasetIndex;
      const index = element.index;
      const label = this.data.labels?.[index] as string || '';
      const value = (this.data.datasets[datasetIndex]?.data[index] as number) || 0;
      
      this.chartClick.emit({ label, value, datasetIndex, index });
    }
  }

  ngAfterViewInit(): void {
    this.initialized = true;
    this.updateChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.initialized && (changes['data'] || changes['options'] || changes['type'])) {
      this.updateChart();
    }
  }

  private updateChart(): void {
    if (this.chart?.chart) {
      this.zone.runOutsideAngular(() => {
        setTimeout(() => {
          this.chart?.update();
        }, 0);
      });
    }
  }
}
