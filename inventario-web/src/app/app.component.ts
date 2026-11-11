import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ThemeService } from './core/services/theme.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  providers: [MessageService]
})
export class AppComponent implements OnInit {
  title = 'Inventario DAP';

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    // El servicio se inicializa automáticamente en el constructor
    // y detectará la preferencia del sistema Windows
  }
}
