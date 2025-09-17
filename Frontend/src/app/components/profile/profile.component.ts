import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UserPictureComponent } from './profile components/user-picture/user-picture.component';
import { PendingOrdersComponent } from './profile components/pending-orders/pending-orders.component';
import { UserInfoComponent } from './profile components/user-info/user-info.component';
import { AcceptedOrdersComponent } from './profile components/accepted-orders/accepted-orders.component';
import { RejectedOrdersComponent } from './profile components/rejected-orders/rejected-orders.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [UserPictureComponent,
    PendingOrdersComponent,
    UserInfoComponent,
    AcceptedOrdersComponent,
    RejectedOrdersComponent],
  templateUrl: './profile.component.html',
 
})
export class ProfileComponent {
  constructor(private http: HttpClient, private router: Router) { }

  // -------------------------------------- logout function --------------------------------------------

logout(): void {
  this.http.post("http://localhost:7000/api/users/user/logout", {}, { withCredentials: true }).subscribe({
    next: (response) => {
      console.log('Logout successful:', response);
    },
    error: (error) => {
      console.error('Logout error:', error);
      // Navigate even if there's an error (in case the session is already invalid)
      this.router.navigate(["/login"]);
    },
    complete: () => {
      console.log('Logout request completed');
      this.router.navigate(["/login"]);
    }
  });
}

  // ---------------------------------------------------------------------------------------------------

}
