import { Component, OnInit } from '@angular/core';
import { FormGroup, FormsModule, FormBuilder } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { Validators } from '@angular/forms';
import { CommonModule } from '@angular/common'; // <-- Add this import
import Swal from 'sweetalert2';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    FormsModule,
    HttpClientModule,
    RouterModule,
    ReactiveFormsModule,
    CommonModule // <-- Add CommonModule here
  ],
  templateUrl: './register.component.html',
})
export class RegisterComponent implements OnInit {
  form: FormGroup;
  verificationCodeForm: FormGroup;
  isVerificationPending = false;
  registeredEmail: string = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit() {
    this.form = this.formBuilder.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      gender: ['', Validators.required]
    });
    
    this.verificationCodeForm = this.formBuilder.group({
      code: ['', Validators.required]
    });
  }

  submit() {
    let user = this.form.getRawValue();
    const emailRegex: RegExp = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;

    if (user.username.length < 3) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Username must be at least 3 characters long!',
      });
      return;
    } else if (!emailRegex.test(user.email)) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Invalid email!',
      });
      return;
    } else if (user.password !== user.confirmPassword) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Passwords do not match!',
      });
      return;
    } else if (user.password.length < 8) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Password must be at least 8 characters long!',
      });
      return;
    } else if (
      !user.gender ||
      !['male', 'female'].includes(user.gender.toLowerCase())
    ) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: "Gender must be 'male' or 'female'!",
      });
      return;
    }

    this.http.post('http://localhost:7000/api/users/register', user, {
      withCredentials: true,
    })
    .subscribe({
      next: (response: any) => {
        if (response.needsVerification) {
          this.isVerificationPending = true;
          this.registeredEmail = this.form.get('email')?.value;
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Registration successful! A verification code has been sent to your email.'
          });
        } else {
          this.router.navigate(['/login']);
        }
      },
      error: (err) => {
        Swal.fire('Error', err.error.message, 'error');
      }
    });
  }

  verifyEmail() {
    const code = this.verificationCodeForm.get('code')?.value;
    if (this.verificationCodeForm.valid) {
      this.http.post('http://localhost:7000/api/users/verify-email', { email: this.registeredEmail, code: code })
        .subscribe({
          next: (response: any) => {
            Swal.fire({
              icon: 'success',
              title: 'Success!',
              text: response.message
            }).then(() => {
              this.router.navigate(['/login']);
            });
          },
          error: (err) => {
            Swal.fire('Error', err.error.message, 'error');
          }
        });
    }
  }

  resendVerificationCode() {
    this.http.post('http://localhost:7000/api/users/resend-verification', { email: this.registeredEmail })
      .subscribe({
        next: (response: any) => {
          Swal.fire({
            icon: 'success',
            title: 'Sent!',
            text: response.message
          });
        },
        error: (err) => {
          Swal.fire('Error', err.error.message, 'error');
        }
      });
  }
}