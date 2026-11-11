import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [],
  templateUrl: './menu.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuComponent {
  private readonly auth = inject(AuthService);

  // Exponer username al template
  get username(): string | null {
    return this.auth.username();
  }
}
