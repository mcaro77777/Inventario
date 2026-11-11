import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ProgressBarModule } from 'primeng/progressbar';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterModule, ProgressBarModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

  username = '';
  password = '';
  errorMsg = '';
  loading = false;

  constructor(private router: Router, private authService: AuthService) {}

  login(): void {
    if (this.loading) { return; }
    this.loading = true;
    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        this.errorMsg = '';
        this.loading = false;
        this.router.navigate(['/menu']);
      },
      error: () => {
        this.errorMsg = 'Usuario o contraseña incorrectos';
        this.loading = false;
      }
    });
  }
}
