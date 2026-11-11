import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface BaseCardStat {
  label: string;
  value: string;
  icon: string;
  colorKey: 'blue' | 'green' | 'purple' | 'amber';
  trend: string;
  trendPositive: boolean;
}

@Component({
  selector: 'app-base-card-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'base-card-grid.component.html',
  styleUrls: ['base-card-grid.component.scss']
})
export class BaseCardGridComponent {
  @Input() items: BaseCardStat[] = [];
  @Output() itemClick = new EventEmitter<BaseCardStat>();
}
