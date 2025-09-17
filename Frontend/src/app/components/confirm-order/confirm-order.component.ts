import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { Router } from '@angular/router';

@Component({
  selector: 'app-confirm-order',
  standalone: true,
  imports: [],
  templateUrl: './confirm-order.component.html',
  //  styleUrl: './confirm-order.component.css'
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ConfirmOrderComponent {
  constructor(private router: Router) { }

  continueShopping() {
    window.location.href = '/products';
  }
}
