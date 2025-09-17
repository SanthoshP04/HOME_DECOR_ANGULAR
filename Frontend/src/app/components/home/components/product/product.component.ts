import { Component, OnInit, Inject } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { ActivatedRoute } from '@angular/router';
import { SingleProductService } from '../../../../Services/single-product.service';

import { CartProductsCountService } from '../../../../Services/cart-products-count.service';
import { HomeProductService } from '../../../../services/home-product.service';

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [HttpClientModule, CommonModule, MatIconModule, MatDialogModule, MatButtonModule],
  providers: [HomeProductService],
  templateUrl: './product.component.html',
//  styleUrl: './product.component.css'
})
export class ProductComponent implements OnInit {
  FourProducts: any[] = [];

  constructor(
    private productService: HomeProductService,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.productService.getFourProducts().subscribe({
      next: (data: any) => {
        // Get only first 4 products
        this.FourProducts = data.slice(0, 4);
        console.log('Four products loaded:', this.FourProducts);
      },
      error: (err: any) => {
        console.error('Error loading products:', err);
      }
    });
  }

  openDialog(productId: string): void {
    this.productService.getProductById(productId).subscribe({
      next: (product) => {
        const dialogRef = this.dialog.open(DialogContentExampleDialog, {
          data: { product },
          width: '500px', // Optional: set dialog width
          height: 'auto'
        });

        dialogRef.afterClosed().subscribe(result => {
          console.log(`Dialog result: ${result}`);
        });
      },
      error: (err: any) => {
        console.error('Error loading product:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Could not load product details. Please try again.',
        });
      }
    });
  }
}

@Component({
  selector: 'app-product-alert',
  templateUrl: '../../../single-product-details/one-product/product-alert.component.html',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, FormsModule, HttpClientModule],
  providers: [SingleProductService],

})
export class DialogContentExampleDialog implements OnInit {
  product: any;
  quantity: number = 1;
  user_id: any;
  ID: any;
  products_number: number = 0;

  constructor(
    public dialogRef: MatDialogRef<DialogContentExampleDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private productService: SingleProductService,
    private route: ActivatedRoute,
    private productsCount: CartProductsCountService
  ) {
    this.product = data.product;
    this.ID = this.product._id;
  }

  ngOnInit(): void {
    console.log('Product in dialog:', this.product);

    this.productService.getUserToken().subscribe({
      next: (data: any) => {
        console.log('User data:', data);
        this.user_id = data.data._id;
        this.products_number = data.data.carts?.length || 0;
      },
      error: (err: any) => {
        console.error('Cannot get user token:', err);
        // Handle case where user is not logged in
        Swal.fire({
          icon: 'warning',
          title: 'Authentication Required',
          text: 'Please log in to add products to cart.',
        });
      }
    });
  }

  /**************** Quantity input ****************/
  incrementQuantity(): void {
    if (this.quantity < this.product.quantity) {
      this.quantity++;
    }
  }

  decrementQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  onQuantityChange(): void {
    // Ensure quantity is within valid range
    if (this.quantity < 1) {
      this.quantity = 1;
    } else if (this.quantity > this.product.quantity) {
      this.quantity = this.product.quantity;
    }
    console.log('Quantity changed to:', this.quantity);
  }

  /**************** Add to cart ****************/
  addProductToCart(): void {
    // Check if user is logged in
    if (!this.user_id) {
      Swal.fire({
        icon: 'warning',
        title: 'Authentication Required',
        text: 'Please log in to add products to cart.',
      });
      return;
    }

    // Check stock availability
    if (this.product.quantity >= this.quantity) {
      this.productService.addProductToCart(this.user_id, this.ID, this.quantity)
        .subscribe({
          next: (data: any) => {
            console.log('Product added to cart:', data);
            Swal.fire({
              icon: 'success',
              title: 'Success!',
              text: 'Product added to cart successfully',
            }).then(() => {
              // Update cart count
              this.productsCount.updateData(this.products_number + 1);
              // Close dialog
              this.dialogRef.close('added');
            });
          },
          error: (err: any) => {
            console.error('Cannot add product to cart:', err);
            Swal.fire({
              icon: 'error',
              title: 'Oops...',
              text: 'Cannot add product to cart. Please try again later.',
            });
          }
        });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Insufficient Stock',
        text: 'There is not enough quantity in stock!',
      });
    }
  }

  /**************** Close dialog ****************/
  closeDialog(): void {
    this.dialogRef.close();
  }
}