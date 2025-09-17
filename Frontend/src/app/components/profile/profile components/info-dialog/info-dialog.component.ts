import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { UserServiceService } from '../../../../services/user-service.service';
import { OrderServiceService } from '../../../../services/order-service.service';

@Component({
  selector: 'app-info-dialog',
  templateUrl: './info-dialog.component.html',

  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  providers: [UserServiceService, OrderServiceService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class InfoDialogComponent implements OnInit {
  personalInfoForm!: FormGroup;
  userInfo: any;
  id: any;
  hidePassword = true;
  isLoading = false;
  updateError: string | null = null;

  // Icons - using relative paths or consider moving to assets/images/
  showIcon: string = 'assets/images/visible-icon-28.jpg';
  hideIcon: string = 'assets/images/visibility-icon-16.jpg';

  imageFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private userService: UserServiceService,
    private router: Router,
    private dialog: MatDialog,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.loadUserInfo();
  }

  private initializeForm(): void {
    this.personalInfoForm = this.fb.group(
      {
        fullName: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        image: [''],
        password: ['', [Validators.minLength(6)]], // Only required if user wants to change it
        confirmPassword: [''],
      },
      {
        validators: [this.passwordMatchValidator.bind(this)]
      }
    );
  }

  // ✅ Proper password match validator with correct typing
  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    // Only validate if password is provided
    if (password && password !== confirmPassword) {
      return { mismatch: true };
    }

    return null;
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  private loadUserInfo(): void {
    this.isLoading = true;

    this.http
      .get<any>('http://localhost:7000/api/users/user/user', {
        withCredentials: true,
      })
      .subscribe({
        next: (response) => {
          this.id = response.data._id;
          this.userInfo = response.data;

          // Patch values into form
          this.personalInfoForm.patchValue({
            fullName: response.data.username || '',
            email: response.data.email || '',
            // Don't patch password fields for security
          });

          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load user info', err);
          this.updateError = 'Failed to load user information';
          this.isLoading = false;
        },
      });
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;

    if (target.files && target.files.length > 0) {
      const file = target.files[0];

      // Validate file type and size
      if (this.isValidImageFile(file)) {
        this.imageFile = file;
        console.log('Selected file:', this.imageFile.name);

        // Update form control
        this.personalInfoForm.patchValue({ image: file.name });
      } else {
        this.updateError = 'Please select a valid image file (max 5MB)';
        target.value = ''; // Clear the input
      }
    }
  }

  private isValidImageFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    return validTypes.includes(file.type) && file.size <= maxSize;
  }

  updateUser(): void {
    // Clear previous errors
    this.updateError = null;

    // Mark all fields as touched to show validation errors
    this.personalInfoForm.markAllAsTouched();

    if (!this.personalInfoForm.valid) {
      console.error('Form is not valid');
      this.updateError = 'Please fix the form errors before submitting';
      return;
    }

    if (!this.id) {
      this.updateError = 'User ID is missing';
      return;
    }

    this.isLoading = true;
    const formValues = this.personalInfoForm.value;
    const updatePayload = new FormData();

    // Add required fields
    updatePayload.append('username', formValues.fullName.trim());
    updatePayload.append('email', formValues.email.trim());

    // Only add password if it's provided and not empty
    if (formValues.password && formValues.password.trim()) {
      updatePayload.append('password', formValues.password);
    }

    // Add image if selected
    if (this.imageFile) {
      updatePayload.append('image', this.imageFile);
    }

    this.userService.updateUser(this.id, updatePayload).subscribe({
      next: (response: any) => {
        console.log('Update successful', response);
        this.isLoading = false;

        // Close dialog and navigate
        this.dialog.closeAll();

        // Navigate with proper error handling
        this.router
          .navigateByUrl('/home', { skipLocationChange: true })
          .then(() => {
            return this.router.navigate(['/profile']);
          })
          .catch((navError) => {
            console.error('Navigation error:', navError);
          });
      },
      error: (err: any) => {
        console.error('Failed to update user:', err);
        this.isLoading = false;

        // Handle specific error cases
        if (err.status === 400) {
          this.updateError = 'Invalid data provided';
        } else if (err.status === 401) {
          this.updateError = 'Authentication failed. Please log in again.';
        } else if (err.status === 409) {
          this.updateError = 'Email already exists';
        } else {
          this.updateError = 'Failed to update profile. Please try again.';
        }
      },
    });
  }

  // Getter methods for easy access in template
  get fullNameControl() {
    return this.personalInfoForm.get('fullName');
  }

  get emailControl() {
    return this.personalInfoForm.get('email');
  }

  get passwordControl() {
    return this.personalInfoForm.get('password');
  }

  get confirmPasswordControl() {
    return this.personalInfoForm.get('confirmPassword');
  }

  // Check if passwords don't match
  get passwordMismatch(): boolean {
    return this.personalInfoForm.hasError('mismatch') &&
      this.confirmPasswordControl?.touched === true;
  }
}