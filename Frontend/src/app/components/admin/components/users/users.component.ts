import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../Services/user.service';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { ViewUserComponent } from './view-user/view-user.component';
import { EditUserComponent } from './edit-user/edit-user.component';
import { CreateUserComponent } from './create-user/create-user.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [RouterModule, HttpClientModule, CommonModule],
  templateUrl: './users.component.html',
  providers: [UserService],
})
export class UsersComponent {
  constructor(
    private myuserService: UserService,
    private dialog: MatDialog,
    public router: Router, // Changed from private to public
    private http: HttpClient
  ) {}

  users: any;
  userId: any;
  
  ngOnInit() {
    this.myuserService.getUsers().subscribe((data) => {
      this.users = data;
    });
  }

  deleteUser(id: any) {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You won\'t be able to revert this!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.myuserService.deleteUser(id).subscribe((data) => {
          console.log(data);
          this.users = this.users.filter((user: any) => user.id !== id);
          Swal.fire({
            icon: 'success',
            title: 'User was Deleted successfully',
          }).then(() => {
            // Refresh the component data instead of navigating
            this.ngOnInit();
          });
        });
      }
    });
  }

  editUser(id: any) {
    this.myuserService.getUserById(id).subscribe((data) => {
      const user = data;
      const dialogRef = this.dialog.open(EditUserComponent, {
        width: '500px',
        data: {
          userFromParent: user,
        },
      });

      // Refresh data after dialog closes
      dialogRef.afterClosed().subscribe(() => {
        this.ngOnInit();
      });
    });
  }

  createUser() {
    const dialogRef = this.dialog.open(CreateUserComponent, {
      width: '500px',
    });

    // Refresh data after dialog closes
    dialogRef.afterClosed().subscribe(() => {
      this.ngOnInit();
    });
  }

  viewUser(id: any) {
    this.myuserService.getUserById(id).subscribe((data) => {
      const user = data;

      this.dialog.open(ViewUserComponent, {
        width: '500px',
        data: {
          userFromParent: user,
        },
      });
    });
  }

  logout(): void {
    Swal.fire({
      title: 'Are you sure you want to logout?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, logout!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.http
          .post(
            'http://localhost:7000/api/users/user/logout',
            {},
            { withCredentials: true }
          )
          .subscribe({
            complete: () => this.router.navigate(['/login']),
            error: (error) => {
              console.error('Logout error:', error);
              // Navigate to login even if there's an error
              this.router.navigate(['/login']);
            }
          });
      }
    });
  }
}