import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductsService } from './product.service';
import { UserService } from '../checkout/user.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  providers: [UserService, ProductsService],
  templateUrl: './products.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class ProductsComponent implements OnInit {
  products: any[] = [];
  filteredProducts: any[] = [];
  selectedCategory: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 8;
  paginatedProducts: any[] = [];
  totalPages: number = 0;

  // Default min/max
  minPrice: number = 1000;
  maxPrice: number = 100000;

  isLargeView: boolean = false;
  searchTerm: string = '';

  categories: string[] = [
    'All Categories',
    'Chair',
    'Table',
    'Sofa',
    'Bed',
    'Wardrobe',
    'Dressing Tables',
    'Dining Tables',
    'Study Tables',
    'TV and Media Units',
  ];

  constructor(
    private userService: UserService,
    private productService: ProductsService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params: any) => {
      this.selectedCategory = params['category'] || '';
      this.loadProducts();
    });
  }

  loadProducts(): void {
    this.productService.getAllProducts().subscribe(
      (response: any) => {
        this.products = response.filter((product: any) => product.quantity > 0);
        this.applyAllFilters();
      },
      (error: any) => {
        console.error('Error loading products:', error);
      }
    );
  }

  // Apply all filters in sequence
  applyAllFilters(): void {
    let filtered = [...this.products];

    if (
      this.selectedCategory &&
      this.selectedCategory !== '' &&
      this.selectedCategory !== 'All Categories'
    ) {
      filtered = filtered.filter(
        (product) =>
          product.category.toLowerCase() ===
          this.selectedCategory.toLowerCase()
      );
    }

    if (this.minPrice !== undefined || this.maxPrice !== undefined) {
      filtered = filtered.filter((product) => {
        const price = product.price;
        return (
          (this.minPrice === undefined || price >= this.minPrice) &&
          (this.maxPrice === undefined || price <= this.maxPrice)
        );
      });
    }

    if (this.searchTerm) {
      filtered = filtered.filter((product) =>
        product.title.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    this.filteredProducts = filtered;
    
    // Reset to first page and update pagination
    this.currentPage = 1;
    this.refreshPagination();
  }

  // Calculate total pages
  calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage);
  }

  // Update paginated products
  updatePaginatedProducts(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedProducts = this.filteredProducts.slice(startIndex, endIndex);
  }

  // Refresh pagination (calculate pages and update display)
  refreshPagination(): void {
    this.calculateTotalPages();
    this.updatePaginatedProducts();
  }

  // Method to go to specific page
  goToPage(page: number | string): void {
    const pageNum = typeof page === 'number' ? page : parseInt(page.toString());
    if (pageNum >= 1 && pageNum <= this.totalPages) {
      this.currentPage = pageNum;
      this.updatePaginatedProducts();
    }
  }

  // Method to get visible page numbers for pagination
  getVisiblePages(): (number | string)[] {
    const visiblePages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (this.totalPages <= maxVisiblePages) {
      // Show all pages if total pages is less than or equal to max visible
      for (let i = 1; i <= this.totalPages; i++) {
        visiblePages.push(i);
      }
    } else {
      // Show first page
      visiblePages.push(1);

      let startPage = Math.max(2, this.currentPage - 1);
      let endPage = Math.min(this.totalPages - 1, this.currentPage + 1);

      // Add dots after first page if needed
      if (startPage > 2) {
        visiblePages.push('...');
        startPage = Math.max(startPage, this.currentPage - 1);
      }

      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        visiblePages.push(i);
      }

      // Add dots before last page if needed
      if (endPage < this.totalPages - 1) {
        visiblePages.push('...');
      }

      // Show last page
      visiblePages.push(this.totalPages);
    }

    return visiblePages;
  }

  // Method to get start index for results info
  getStartIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage;
  }

  // Method to get end index for results info
  getEndIndex(): number {
    const endIndex = this.currentPage * this.itemsPerPage;
    return Math.min(endIndex, this.filteredProducts.length);
  }

  // Helper method to check if page is a number (for template)
  isNumber(value: any): boolean {
    return typeof value === 'number';
  }

  // Min slider handler
  applyMinChange(): void {
    if (this.minPrice > this.maxPrice) {
      this.minPrice = this.maxPrice;
    }
    this.applyAllFilters();
  }

  // Max slider handler
  applyMaxChange(): void {
    if (this.maxPrice < this.minPrice) {
      this.maxPrice = this.minPrice;
    }
    this.applyAllFilters();
  }

  resetPriceFilter(): void {
    this.minPrice = 1000;
    this.maxPrice = 100000;
    this.applyAllFilters();
  }

  applyCategoryFilter(category: string): void {
    this.selectedCategory = category;
    this.applyAllFilters();
  }

  applyNameFilter(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.applyAllFilters();
  }

  clearAllFilters(): void {
    this.selectedCategory = '';
    this.minPrice = 1000;
    this.maxPrice = 100000;
    this.searchTerm = '';
    this.applyAllFilters();

    const searchInput = document.querySelector(
      'input[placeholder*="Search"]'
    ) as HTMLInputElement;
    if (searchInput) {
      searchInput.value = '';
    }
  }

  setViewMode(mode: 'grid' | 'large'): void {
    this.isLargeView = mode === 'large';
  }

  trackByProductId(index: number, product: any): string {
    return product._id;
  }

  navigateToProductDetails(productId: string): void {
    this.router.navigate(['product', productId]);
  }

  addToCart(product: any): void {
    this.productService.getUserByToken().subscribe(
      (response: any) => {
        const userId = response.data._id;
        const quantity = 1;
        this.userService.addProductToCart(userId, product._id, quantity).subscribe(
          (res: any) => {
            console.log('Item added to cart successfully:', res);
          },
          (err: any) => {
            if (err.error && err.error.message) {
              console.error('Error adding item to cart:', err.error.message);
            } else {
              console.error('Error adding item to cart:', err);
            }
          }
        );
      },
      (error: any) => {
        if (error.error && error.error.message) {
          console.error('Error getting user details:', error.error.message);
        } else {
          console.error('Error getting user details:', error);
        }
      }
    );
  }

  addToWishlist(product: any): void {
    console.log('Adding to wishlist:', product.title);
  }
}