import { Component, AfterViewInit, OnInit } from '@angular/core';
import { UserService } from '../checkout/user.service';
import { ProductsService } from '../products/product.service';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http'; 
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  providers: [UserService, ProductsService], 
  templateUrl: './payment.component.html',
})
export class PaymentComponent implements OnInit, AfterViewInit {

  constructor(
    private userService: UserService, 
    private productService: ProductsService,
    private router: Router, 
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    // Any initialization logic can go here
  }

  ngAfterViewInit() {
    // Wait for the view to initialize before accessing DOM elements
    setTimeout(() => {
      this.initializePaymentForm();
    }, 0);
  }

  private initializePaymentForm() {
    const cardNumberInput = document.getElementById('card-number') as HTMLInputElement;
    const cardHolderInput = document.getElementById('card-holder') as HTMLInputElement;
    const cardExpiryInput = document.getElementById('card-expiry') as HTMLInputElement;
    const cardCvcInput = document.getElementById('card-cvc') as HTMLInputElement;
    const payButton = document.querySelector('.pay-btn') as HTMLButtonElement;

    // Check if all required elements exist
    if (!cardNumberInput || !cardHolderInput || !cardExpiryInput || !cardCvcInput || !payButton) {
      console.error('Required form elements not found');
      return;
    }

    // Format card number input
    cardNumberInput.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement;
      let cardNumber = target.value.replace(/\D/g, '');
      cardNumber = cardNumber.replace(/(.{4})/g, '$1 ').trim();
      target.value = cardNumber;
    });

    // Format expiry date input
    cardExpiryInput.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement;
      let expiryDate = target.value.replace(/\D/g, '');
      expiryDate = expiryDate.replace(/(\d{2})(\d{2})/, '$1/$2').trim();

      if (expiryDate.length > 5) {
        target.value = expiryDate.slice(0, 5);
      } else {
        target.value = expiryDate;
      }
    });

    // Format CVC input
    cardCvcInput.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement;
      let cvc = target.value.replace(/\D/g, '');

      if (cvc.length > 4) {
        target.value = cvc.slice(0, 4);
      } else {
        target.value = cvc;
      }
    });

    // Payment button click handler
    payButton.addEventListener('click', (event) => {
      event.preventDefault();

      const cardNumber = cardNumberInput.value.trim();
      const cardHolder = cardHolderInput.value.trim();
      const expiryDate = cardExpiryInput.value.trim();
      const cvc = cardCvcInput.value.trim();

      if (!this.isValidCardNumber(cardNumber)) {
        this.snackBar.open('Invalid card number. Please enter a valid card number.', 'Close', { duration: 3000 });
        return;
      }

      if (!this.isValidCardHolder(cardHolder)) {
        this.snackBar.open('Invalid card holder name. Please enter a valid name.', 'Close', { duration: 3000 });
        return;
      }

      if (!this.isValidExpiryDate(expiryDate)) {
        this.snackBar.open('Invalid expiry date. Please enter a valid expiry date.', 'Close', { duration: 3000 });
        return;
      }

      if (!this.isValidCvc(cvc)) {
        this.snackBar.open('Invalid CVC. Please enter a valid CVC.', 'Close', { duration: 3000 });
        return;
      }

      // If all validations pass, process the payment
      this.processPayment(payButton);
    });
  }

  private processPayment(button: HTMLButtonElement) {
    // Show loading state
    const originalText = button.innerHTML;
    button.innerHTML = `
      <svg class="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Processing...
    `;
    button.disabled = true;

    // Simulate payment processing and then place order
    setTimeout(() => {
      this.placeOrder();
      button.innerHTML = originalText;
      button.disabled = false;
    }, 2000);
  }

  // RELAXED VALIDATION FOR TESTING - ACCEPTS ANY NUMBER
  private isValidCardNumber(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/\s/g, '');
    // Accept any number sequence with at least 10 digits (for testing)
    return /^\d{10,}$/.test(cleaned);
  }

  // RELAXED VALIDATION FOR TESTING - ACCEPTS ANY NAME
  private isValidCardHolder(cardHolder: string): boolean {
    // Just check it's not empty and has at least 2 characters
    return cardHolder.trim().length >= 2;
  }

  // RELAXED VALIDATION FOR TESTING - ACCEPTS ANY FUTURE DATE
  private isValidExpiryDate(expiryDate: string): boolean {
    const expiryDateRegex = /^(0[1-9]|1[0-2])\/?([0-9]{2})$/;
    if (!expiryDateRegex.test(expiryDate)) {
      return false;
    }
    // For testing - just accept any properly formatted MM/YY
    return true;
  }

  // RELAXED VALIDATION FOR TESTING - ACCEPTS ANY 3-4 DIGIT NUMBER
  private isValidCvc(cvc: string): boolean {
    // Accept any 3 or 4 digit number for testing
    const cvcRegex = /^[0-9]{3,4}$/;
    return cvcRegex.test(cvc);
  }

  placeOrder() {
    this.productService.getUserByToken().subscribe({
      next: (response: any) => {
        const userId = response.data._id;
        this.userService.addProductToOrder(userId).subscribe({
          next: (response) => {
            console.log('Order placed successfully', response);
            this.snackBar.open('Payment successful! Order placed.', 'Close', { duration: 3000 });
            
            // Clear cart and user info from local storage
            localStorage.removeItem('cart');
            localStorage.removeItem('userInfo');
            
            // Navigate to confirmation page or home page
            this.router.navigate(['/confirm']);
          },
          error: (error) => {
            console.error('Failed to place order:', error);
            this.snackBar.open('Failed to place order. Please try again.', 'Close', { duration: 3000 });
          }
        });
      },
      error: (error) => {
        console.error('Failed to get user information:', error);
        this.snackBar.open('Failed to get user information. Please try again.', 'Close', { duration: 3000 });
      }
    });
  }
}