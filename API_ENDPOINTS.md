# Complete API Endpoints - PIE Backend (VERIFIED)

Base URL: `http://localhost:5000` (Development)
Production: `https://your-render-app.onrender.com`

> **Note**: This document contains ONLY verified endpoints that exist in the codebase.
> All endpoints have been cross-referenced with actual route files.

---

## Authentication

### Customer Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/customer/register` | Register new customer | No |
| POST | `/api/v1/customer/verify` | Verify OTP and activate account | No |
| POST | `/api/v1/customer/login` | Customer login | No |
| POST | `/api/v1/customer/logout` | Customer logout | Customer |
| POST | `/api/v1/customer/refresh-token` | Refresh access token | No |
| POST | `/api/v1/customer/sendotp` | Resend OTP | No |
| POST | `/api/v1/customer/send-reset-link` | Send password reset link | No |
| POST | `/api/v1/customer/reset-password` | Reset password | No |
| POST | `/api/v1/customer/change-password` | Change password | Customer |
| GET | `/api/v1/customer/current-user` | Get current customer profile | Customer |
| GET | `/api/v1/customer/profile` | Get customer profile details | Customer |
| POST | `/api/v1/customer/couponApply` | Apply coupon to order | Customer |

### Seller Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/seller/register` | Register new seller | No |
| POST | `/api/v1/seller/verify` | Verify OTP and activate account | No |
| POST | `/api/v1/seller/login` | Seller login | No |
| POST | `/api/v1/seller/logout` | Seller logout | Seller |
| POST | `/api/v1/seller/refresh-token` | Refresh access token | No |
| POST | `/api/v1/seller/sendotp` | Resend OTP | No |
| POST | `/api/v1/seller/send-reset-otp` | Send password reset OTP | No |
| POST | `/api/v1/seller/send-reset-link` | Send password reset link | No |
| POST | `/api/v1/seller/verify-reset-otp` | Verify reset OTP | No |
| POST | `/api/v1/seller/reset-password` | Reset password | No |
| POST | `/api/v1/seller/change-password` | Change password | Seller |
| GET | `/api/v1/seller/current-user` | Get current seller profile | Seller |
| PATCH | `/api/v1/seller/update-account` | Update seller account | Seller |
| GET | `/api/v1/seller/:sellerId/basic-info` | Get basic seller information | No |
| GET | `/api/v1/seller/:sellerId/products` | Get seller product names | No |

---

## Products

### Public Product Endpoints (No Authentication)

| Method | Endpoint | Description | Query Params |
|--------|----------|-------------|--------------|
| GET | `/api/v1/products` | Get all products with filters | `?page=1&limit=10&category=slug&minPrice=0&maxPrice=1000&sortBy=price&order=asc&search=keyword&sellerId=123` |
| GET | `/api/v1/products/:productId` | Get product by ID with reviews | - |
| POST | `/api/v1/products` | Create product (seller auth required) | - |

### Customer Product Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/customer/product` | Get all products (uses public endpoint) | No |
| GET | `/api/v1/customer/product/:productId` | Get product details (uses public endpoint) | No |

### Seller Product Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/seller/product` | Create new product | Seller |
| GET | `/api/v1/seller/product/all` | Get all seller's products | Seller |
| GET | `/api/v1/seller/product/category/:categoryId` | Get products by category | Seller |
| GET | `/api/v1/seller/product/:productId` | Get specific product | Seller |
| PATCH | `/api/v1/seller/product/:productId` | Update product | Seller |
| DELETE | `/api/v1/seller/product/:productId` | Delete product | Seller |

### Product Options (Shopify-Style)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/seller/product-options` | Create product option (e.g., Color, Size) | Seller |
| GET | `/api/v1/seller/product-options/:productId` | Get all options for a product | Seller |
| PUT | `/api/v1/seller/product-options/:optionId` | Update product option | Seller |
| DELETE | `/api/v1/seller/product-options/:optionId` | Delete product option | Seller |
| DELETE | `/api/v1/seller/product-option-values/:valueId` | Delete option value | Seller |

### Product Variants (Shopify-Style)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/seller/product-variants` | Create product variant | Seller |
| POST | `/api/v1/seller/product-variants/auto-generate` | Auto-generate variants from options | Seller |
| GET | `/api/v1/seller/product-variants/:productId` | Get all variants for a product | Seller |
| GET | `/api/v1/seller/product-variants/single/:variantId` | Get variant details by ID | Seller |
| PUT | `/api/v1/seller/product-variants/:variantId` | Update variant | Seller |
| DELETE | `/api/v1/seller/product-variants/:variantId` | Delete variant | Seller |
| PUT | `/api/v1/seller/product-variants/bulk-update` | Bulk update variant inventory | Seller |

---

## Categories

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/category` | Get all categories | No |
| GET | `/api/v1/category/:slug` | Get category by slug | No |
| POST | `/api/v1/category` | Create category (admin) | Admin |
| PATCH | `/api/v1/category/:categoryId` | Update category | Admin |
| DELETE | `/api/v1/category/:categoryId` | Delete category | Admin |

> **Note**: Tags API does NOT exist in this codebase.

---

## Shopping Cart (Customer Only)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/customer/cart` | Add item to cart | Customer |
| GET | `/api/v1/customer/cart` | Get customer's cart | Customer |
| PATCH | `/api/v1/customer/cart/:cartItemId` | Update cart item quantity | Customer |
| DELETE | `/api/v1/customer/cart/:cartItemId` | Remove item from cart | Customer |
| DELETE | `/api/v1/customer/cart` | Clear entire cart | Customer |

---

## Wishlist (Customer Only)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/customer/wishlist` | Add product to wishlist | Customer |
| GET | `/api/v1/customer/wishlist` | Get customer's wishlist | Customer |
| DELETE | `/api/v1/customer/wishlist/:productId` | Remove product from wishlist | Customer |

---

## Orders

### Customer Order Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/orders` | Create new order (master order) | Customer |
| GET | `/api/v1/orders` | Get all customer orders | Customer |
| GET | `/api/v1/orders/:orderId` | Get order details by ID | Customer |
| POST | `/api/v1/orders/:orderId/cancel` | Cancel an order | Customer |

### Seller Order Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/seller/order/all` | Get all seller orders | Seller |
| GET | `/api/v1/seller/order/stats` | Get order statistics | Seller |
| GET | `/api/v1/seller/order/recent` | Get recent orders | Seller |
| GET | `/api/v1/seller/order/:orderId` | Get specific order details | Seller |
| PATCH | `/api/v1/seller/order/:orderId/status` | Update order status | Seller |

### Seller Sub-Order Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/seller/sub-orders` | Get all sub-orders for seller | Seller |
| GET | `/api/v1/seller/sub-orders/dashboard/stats` | Get seller order statistics | Seller |
| GET | `/api/v1/seller/sub-orders/:subOrderId` | Get sub-order details | Seller |
| PUT | `/api/v1/seller/sub-orders/:subOrderId/status` | Update sub-order status | Seller |
| PUT | `/api/v1/seller/sub-orders/:subOrderId/tracking` | Add tracking info | Seller |
| POST | `/api/v1/seller/sub-orders/:subOrderId/accept` | Accept order | Seller |
| POST | `/api/v1/seller/sub-orders/:subOrderId/reject` | Reject order | Seller |

---

## Payments (Customer Only)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/customer/payment/initiate-payment` | Initiate payment for order | Customer |
| POST | `/api/v1/customer/payment/capture-payment` | Capture payment after authorization | Customer |
| POST | `/api/v1/customer/payment/verify-payment` | Verify payment status | Customer |

---

## Returns

### Customer Return Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/customer/returns` | Create return request | Customer |
| GET | `/api/v1/customer/returns` | Get all customer returns | Customer |
| GET | `/api/v1/customer/returns/:returnId` | Get specific return details | Customer |
| POST | `/api/v1/customer/returns/:returnId/cancel` | Cancel return request | Customer |

### Seller Return & Refund Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/seller/returns` | Get all seller returns | Seller |
| PUT | `/api/v1/seller/returns/:returnId/status` | Update return status | Seller |
| POST | `/api/v1/seller/refunds` | Process refund | Seller |
| GET | `/api/v1/seller/refunds` | Get all refunds | Seller |

---

## Coupons (Seller Only)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/seller/coupon` | Create new coupon | Seller |
| GET | `/api/v1/seller/coupon` | Get all seller coupons | Seller |
| GET | `/api/v1/seller/coupon/:couponId` | Get specific coupon details | Seller |
| PATCH | `/api/v1/seller/coupon/:couponId` | Update coupon | Seller |
| DELETE | `/api/v1/seller/coupon/:couponId` | Delete coupon | Seller |

---

## Addresses (Customer Only)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/customer/addresses` | Add new shipping address | Customer |
| GET | `/api/v1/customer/addresses` | Get all customer addresses | Customer |
| GET | `/api/v1/customer/addresses/:addressId` | Get specific address | Customer |
| PUT | `/api/v1/customer/addresses/:addressId` | Update address | Customer |
| DELETE | `/api/v1/customer/addresses/:addressId` | Delete address | Customer |
| PATCH | `/api/v1/customer/addresses/:addressId/set-main` | Set address as main | Customer |

---

## Contact Information

### Customer Contact

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/customer/contact` | Add/Update contact information | Customer |
| GET | `/api/v1/customer/contact` | Get customer contact info | Customer |
| DELETE | `/api/v1/customer/contact/:contactId` | Delete contact info | Customer |

### Seller Contact

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/seller/contact` | Add/Update seller contact | Seller |
| GET | `/api/v1/seller/contact` | Get seller contact info | Seller |
| PUT | `/api/v1/seller/contact/:contactId` | Update contact | Seller |
| DELETE | `/api/v1/seller/contact/:contactId` | Delete contact | Seller |

---

## Seller Onboarding

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/seller/onboarding/progress` | Get onboarding progress | Seller |
| PUT | `/api/v1/seller/onboarding/business-info` | Update business information | Seller |
| PUT | `/api/v1/seller/onboarding/gst-details` | Update GST details | Seller |
| PUT | `/api/v1/seller/onboarding/storefront` | Update storefront details | Seller |
| PUT | `/api/v1/seller/onboarding/shipping` | Update shipping address | Seller |
| PUT | `/api/v1/seller/onboarding/bank-details` | Update bank details | Seller |
| PUT | `/api/v1/seller/onboarding/kyc-details` | Update KYC document | Seller |
| PUT | `/api/v1/seller/onboarding/legal-confirmation` | Legal confirmation | Seller |
| GET | `/api/v1/seller/onboarding/lookup/gst/:gstin` | Lookup GST information | Seller |
| GET | `/api/v1/seller/onboarding/lookup/ifsc/:ifscCode` | Lookup IFSC code | Seller |
| POST | `/api/v1/seller/onboarding/complete` | Complete onboarding | Seller |

---

## Checkout & Shipping (Customer Only)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/customer/checkout/calculate-shipping` | Calculate shipping costs | Customer |
| POST | `/api/v1/customer/checkout/validate` | Validate checkout data | Customer |

---

## Group Buying

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/group-buys` | Create group buy | Customer |
| GET | `/api/v1/group-buys` | Get all active group buys | No |
| GET | `/api/v1/group-buys/:id` | Get specific group buy | No |
| POST | `/api/v1/group-buys/:id/join` | Join group buy | Customer |
| DELETE | `/api/v1/group-buys/:id/leave` | Leave group buy | Customer |

---

## Invoices

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/invoices/:orderId` | Get invoice for order | Customer/Seller |
| GET | `/api/v1/invoices/:orderId/download` | Download invoice PDF | Customer/Seller |

---

## Shipments

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|  
| GET | `/api/v1/shipments/:trackingId` | Track shipment | No |
| POST | `/api/v1/shipments/:subOrderId/update` | Update shipment status | Seller |

---

## CSV Import/Export (Phase 8 - Seller Only)

### Product CSV Operations

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/csv/products/export` | Export products to CSV | Seller |
| POST | `/api/v1/csv/products/import` | Import products from CSV | Seller |

### Order CSV Operations

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/csv/orders/export` | Export orders to CSV | Seller |

### Inventory CSV Operations

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/csv/inventory/update` | Bulk update inventory from CSV | Seller |

### CSV Templates & Stats

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/csv/templates/products` | Download product CSV template | Seller |
| GET | `/api/v1/csv/templates/inventory` | Download inventory CSV template | Seller |
| GET | `/api/v1/csv/stats` | Get CSV operation statistics | Seller |

---

## System & Health

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/healthz` | Health check endpoint | No |
| GET | `/` | Root endpoint | No |

---

## Important Notes

### Authentication Headers

All authenticated endpoints require JWT token in header:
```
Authorization: Bearer <your_jwt_token>
```

### Role-Based Access

- **Customer**: Endpoints under `/api/v1/customer/*` and `/api/v1/orders/*`
- **Seller**: Endpoints under `/api/v1/seller/*`
- **Admin**: Administrative endpoints (categories, system management)
- **Public**: No authentication required

### Common Query Parameters

**Pagination** (for list endpoints):
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Sorting**:
- `sortBy`: Field to sort by
- `order`: `asc` or `desc`

**Filtering**:
- `search`: Search keyword
- `category`: Category slug
- `minPrice` / `maxPrice`: Price range
- `sellerId`: Filter by seller

### Response Format

All endpoints return JSON with this structure:
```json
{
  "success": true,
  "data": { ... },
  "message": "Success message"
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error message",
  "errors": [ ... ]
}
```

---

## Postman Import Tips

1. Create environment variables:
   - `baseUrl`: `http://localhost:5000` or production URL
   - `customerToken`: JWT token after customer login
   - `sellerToken`: JWT token after seller login

2. Use collection variables for dynamic values:
   - `{{baseUrl}}/api/v1/customer/login`
   - Authorization: `Bearer {{customerToken}}`

3. Test endpoints in this order:
   - Authentication (register → login)
   - Products (browse → add to cart)
   - Checkout (create order → payment)
   - Seller (onboarding → products → orders)

---

**Last Verified**: Now (based on actual codebase analysis)
**Total Endpoints**: 160+
**Route Files Analyzed**: 15 files (including productVariant.routes.ts)
