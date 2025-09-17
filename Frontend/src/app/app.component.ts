import { Component } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError, RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    LoginComponent,
    RegisterComponent,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    NgIf
  ],
  templateUrl: './app.component.html',
})
export class AppComponent {
  title = 'Frontend';
  loading = false;
  
  // Configurable loading duration in milliseconds
  private loadingDuration = 2000; 

  constructor(private router: Router) {
    // Listen to route events
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.loading = true;
      }
      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        // Add delay before hiding loading
        setTimeout(() => {
          this.loading = false;
        }, this.loadingDuration);
      }
    });
  }
}