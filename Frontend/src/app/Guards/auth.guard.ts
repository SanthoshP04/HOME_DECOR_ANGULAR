import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private http: HttpClient, private router: Router) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.http.get<any>('http://localhost:7000/api/users/user/user', { withCredentials: true })
      .pipe(
        map(response => {
          // If backend confirms user is logged in
          if (response?.data) {
            if (response.data.isAdmin) {
              // Prevent admins from accessing user pages
              Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: "Admins can't access this page!",
              });
              this.router.navigate(['/admin']);
              return false;
            }
            return true; // ✅ Normal user → allow
          } else {
            // No user data → treat as not logged in
            this.showLoginError();
            return false;
          }
        }),
        catchError(() => {
          // API call failed → assume not logged in
          this.showLoginError();
          return of(false);
        })
      );
  }

  private showLoginError() {
    Swal.fire({
      icon: 'error',
      title: 'Oops...',
      text: 'You need to login first!',
    });
    this.router.navigate(['/login']);
  }
}
