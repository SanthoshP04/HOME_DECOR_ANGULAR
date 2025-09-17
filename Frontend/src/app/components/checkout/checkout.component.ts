import { Component, OnInit } from '@angular/core';
import { UserService } from './user.service';
import { User } from './user.model';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ProductsService } from '../products/product.service';
import { Product } from '../products/product.model';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule],
  providers: [UserService, ProductsService],
  templateUrl: './checkout.component.html'
  
})
export class CheckoutComponent implements OnInit {
  user: User | null = null;
  cart: any;
  products: Product[] = [];
  userForm!: FormGroup;
  formSubmitted = false;

  // popup for order success
  paymentSuccessful = false;

  // Delivery charge in rupees
  deliveryCost: number = 300;

  constructor(
    private userService: UserService,
    private productService: ProductsService,
    private router: Router,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit(): void {
    this.userForm = this.formBuilder.group({
      fullName: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      address: ['', Validators.required],
      paymentMethod: ['cash', Validators.required]
    });

    // Fetch logged-in user details
    this.productService.getUserByToken().subscribe((response: any) => {
      const userId = response.data._id;

      this.userService.getUserById(userId).subscribe(user => {
        this.user = user;
        this.userForm.patchValue({
          fullName: user.username,
          email: user.email
        });
      });

      this.userService.getCartByUserId(userId).subscribe((cart: any) => {
        console.log(cart);
        this.cart = cart;
        this.loadProducts();
      });
    });
  }

  loadProducts() {
    if (!this.cart || !this.cart.cart) return;

    this.cart.cart.forEach((item: { product: string; quantity: number }) => {
      this.productService.getProductById(item.product).subscribe({
        next: (product: Product) => {
          this.products.push(product);
        },
        error: error => {
          console.log(error);
        }
      });
    });
  }

  // Get product by ID safely
  getProductById(productId: string): Product | undefined {
    return this.products.find(product => product._id === productId);
  }

  // Calculate totals
  calculateSubtotal(): number {
    if (!this.cart || !this.cart.cart) return 0;

    return this.cart.cart.reduce((sum: number, item: any) => {
      const product = this.getProductById(item.product);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
  }

  calculateGrandTotal(): number {
    return this.calculateSubtotal() + this.deliveryCost;
  }

  navigateToPayment() {
    this.formSubmitted = true;
    if (this.userForm.valid) {
      localStorage.setItem('userInfo', JSON.stringify(this.userForm.value));
      localStorage.setItem('cart', JSON.stringify(this.cart));

      this.router.navigate(['/payment']);
    }
  }

  placeOrder() {
    this.formSubmitted = true;
    if (this.userForm.valid) {
      this.productService.getUserByToken().subscribe((response: any) => {
        const userId = response.data._id;
        this.userService.addProductToOrder(userId).subscribe(
          () => {
            this.paymentSuccessful = true;
            this.router.navigate(['/confirm']);
          },
          error => {
            console.error('Failed to place order:', error);
          }
        );
      });
    }
  }

  closePopup() {
    this.paymentSuccessful = false;
  }
}
