# API Sample Request Data - PIE Backend

Complete sample data for all API endpoints with request bodies, headers, and query parameters.

---

## Authentication

### Customer Registration

**POST** `/api/v1/customer/register`

```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "phoneNumber": "+919876543210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "otp": "123456",
    "expiresAt": "2025-12-21T10:30:00Z",
    "customer": {
      "id": "uuid-customer-123",
      "email": "john.doe@example.com",
      "name": "John Doe"
    }
  }
}
```

### Customer Verify OTP

**POST** `/api/v1/customer/verify`

```json
{
  "email": "john.doe@example.com",
  "otp": "123456"
}
```

### Customer Login

**POST** `/api/v1/customer/login`

```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "customer": {
      "id": "uuid-customer-123",
      "email": "john.doe@example.com",
      "name": "John Doe",
      "phoneNumber": "+919876543210",
      "isVerified": true
    }
  }
}
```

### Refresh Token

**POST** `/api/v1/customer/refresh-token`

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Change Password

**POST** `/api/v1/customer/change-password`

Headers:
```
Authorization: Bearer <accessToken>
```

```json
{
  "oldPassword": "SecurePass123!",
  "newPassword": "NewSecurePass456!"
}
```

### Reset Password Request

**POST** `/api/v1/customer/send-reset-link`

```json
{
  "email": "john.doe@example.com"
}
```

### Reset Password

**POST** `/api/v1/customer/reset-password`

```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass789!"
}
```

---

## Seller Authentication

### Seller Registration

**POST** `/api/v1/seller/register`

```json
{
  "name": "Premium Electronics Store",
  "email": "seller@premiumelectronics.com",
  "password": "SellerPass123!",
  "phoneNumber": "+919876543210",
  "businessName": "Premium Electronics Pvt Ltd",
  "gstNumber": "22AAAAA0000A1Z5"
}
```

### Seller Login

**POST** `/api/v1/seller/login`

```json
{
  "email": "seller@premiumelectronics.com",
  "password": "SellerPass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "seller": {
      "id": "uuid-seller-123",
      "email": "seller@premiumelectronics.com",
      "name": "Premium Electronics Store",
      "isVerified": true,
      "onboardingComplete": false
    }
  }
}
```

### Update Seller Account

**PATCH** `/api/v1/seller/update-account`

Headers:
```
Authorization: Bearer <sellerToken>
```

```json
{
  "name": "Premium Electronics Mega Store",
  "phoneNumber": "+919876543211",
  "shopDescription": "Leading electronics retailer in India"
}
```

---

## Seller Onboarding

### Update Business Information

**PUT** `/api/v1/seller/onboarding/business-info`

Headers:
```
Authorization: Bearer <sellerToken>
```

```json
{
  "businessName": "Premium Electronics Pvt Ltd",
  "businessType": "PRIVATE_LIMITED",
  "registrationNumber": "CIN12345678",
  "businessAddress": {
    "street": "123 MG Road",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001",
    "country": "India"
  },
  "businessPhone": "+918012345678",
  "businessEmail": "business@premiumelectronics.com"
}
```

### Update GST Details

**PUT** `/api/v1/seller/onboarding/gst-details`

```json
{
  "gstNumber": "29ABCDE1234F1Z5",
  "panNumber": "ABCDE1234F",
  "gstCertificate": "https://storage.example.com/gst-cert.pdf"
}
```

### Update Storefront

**PUT** `/api/v1/seller/onboarding/storefront`

```json
{
  "storeName": "Premium Electronics",
  "storeSlug": "premium-electronics",
  "storeDescription": "Your trusted electronics store",
  "storeLogo": "https://storage.example.com/logo.png",
  "storeBanner": "https://storage.example.com/banner.jpg",
  "storeCategories": ["Electronics", "Gadgets", "Accessories"]
}
```

### Update Shipping Address

**PUT** `/api/v1/seller/onboarding/shipping`

```json
{
  "type": "WAREHOUSE",
  "addressLine1": "Warehouse 45, Industrial Area",
  "addressLine2": "Phase 2",
  "city": "Bangalore",
  "state": "Karnataka",
  "pincode": "560099",
  "country": "India",
  "contactPerson": "Warehouse Manager",
  "contactPhone": "+918012345679"
}
```

### Update Bank Details

**PUT** `/api/v1/seller/onboarding/bank-details`

```json
{
  "accountHolderName": "Premium Electronics Pvt Ltd",
  "accountNumber": "1234567890",
  "ifscCode": "HDFC0001234",
  "bankName": "HDFC Bank",
  "branchName": "MG Road Branch",
  "accountType": "CURRENT",
  "cancelledCheque": "https://storage.example.com/cancelled-cheque.pdf"
}
```

### Get Onboarding Status

**GET** `/api/v1/seller/onboarding/progress`

Headers:
```
Authorization: Bearer <sellerToken>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "completedSteps": ["business-info", "gst-details"],
    "pendingSteps": ["storefront", "shipping", "bank-details"],
    "overallProgress": 40,
    "isComplete": false
  }
}
```

### Complete Onboarding

**POST** `/api/v1/seller/onboarding/complete`

Headers:
```
Authorization: Bearer <sellerToken>
```

```json
{
  "termsAccepted": true,
  "privacyPolicyAccepted": true
}
```

---

## Products

### Create Product (Seller)

**POST** `/api/v1/seller/product`

Headers:
```
Authorization: Bearer <sellerToken>
```

```json
{
  "name": "Samsung Galaxy S24 Ultra",
  "description": "Latest flagship smartphone with AI features",
  "shortDescription": "Premium smartphone with 200MP camera",
  "slug": "samsung-galaxy-s24-ultra",
  "price": 129999,
  "compareAtPrice": 149999,
  "costPrice": 110000,
  "sku": "SAM-S24U-512-BLACK",
  "barcode": "8801234567890",
  "trackInventory": true,
  "inventory": 50,
  "weight": 233,
  "weightUnit": "g",
  "requiresShipping": true,
  "taxable": true,
  "taxPercentage": 18,
  "categories": ["smartphones", "samsung", "flagship"],
  "tags": ["5G", "AI Camera", "Flagship", "Android"],
  "images": [
    {
      "url": "https://storage.example.com/s24-ultra-1.jpg",
      "altText": "Samsung Galaxy S24 Ultra Front",
      "position": 0
    },
    {
      "url": "https://storage.example.com/s24-ultra-2.jpg",
      "altText": "Samsung Galaxy S24 Ultra Back",
      "position": 1
    }
  ],
  "specifications": {
    "Display": "6.8 inch Dynamic AMOLED 2X",
    "Processor": "Snapdragon 8 Gen 3",
    "RAM": "12GB",
    "Storage": "512GB",
    "Camera": "200MP + 50MP + 12MP + 10MP",
    "Battery": "5000mAh",
    "OS": "Android 14"
  },
  "seoTitle": "Buy Samsung Galaxy S24 Ultra 512GB Online",
  "seoDescription": "Get the latest Samsung Galaxy S24 Ultra with 200MP camera",
  "isActive": true,
  "isFeatured": true
}
```

### Get All Products (Public)

**GET** `/api/v1/products?page=1&limit=20&category=smartphones&minPrice=50000&maxPrice=150000&sortBy=price&order=asc&search=samsung`

Query Parameters:
- `page`: 1
- `limit`: 20
- `category`: smartphones
- `minPrice`: 50000
- `maxPrice`: 150000
- `sortBy`: price (options: price, createdAt, name, popularity)
- `order`: asc (options: asc, desc)
- `search`: samsung
- `sellerId`: uuid-seller-123

### Update Product

**PATCH** `/api/v1/seller/product/:productId`

Headers:
```
Authorization: Bearer <sellerToken>
```

```json
{
  "price": 124999,
  "inventory": 45,
  "isActive": true,
  "isFeatured": false
}
```

---

## Product Options & Variants (Shopify-Style)

### Create Product Option

**POST** `/api/v1/seller/product-options`

Headers:
```
Authorization: Bearer <sellerToken>
```

```json
{
  "productId": "uuid-product-123",
  "name": "Color",
  "position": 0,
  "values": [
    {
      "value": "Titanium Black",
      "position": 0
    },
    {
      "value": "Titanium Gray",
      "position": 1
    },
    {
      "value": "Titanium Violet",
      "position": 2
    }
  ]
}
```

**Example 2: Size Option**
```json
{
  "productId": "uuid-product-123",
  "name": "Storage",
  "position": 1,
  "values": [
    { "value": "256GB", "position": 0 },
    { "value": "512GB", "position": 1 },
    { "value": "1TB", "position": 2 }
  ]
}
```

### Update Product Option

**PUT** `/api/v1/seller/product-options/:optionId`

```json
{
  "name": "Color Variant",
  "values": [
    {
      "id": "uuid-value-1",
      "value": "Titanium Black",
      "position": 0
    },
    {
      "value": "Titanium Blue",
      "position": 3
    }
  ]
}
```

### Create Product Variant

**POST** `/api/v1/seller/product-variants`

Headers:
```
Authorization: Bearer <sellerToken>
```

```json
{
  "productId": "uuid-product-123",
  "sku": "SAM-S24U-512-BLACK",
  "title": "Titanium Black / 512GB",
  "price": 129999,
  "compareAtPrice": 149999,
  "costPrice": 110000,
  "inventory": 25,
  "weight": 233,
  "imageId": "uuid-image-1",
  "optionValueIds": [
    "uuid-option-value-black",
    "uuid-option-value-512gb"
  ],
  "position": 0,
  "isActive": true
}
```

### Auto-Generate Variants

**POST** `/api/v1/seller/product-variants/auto-generate`

```json
{
  "productId": "uuid-product-123",
  "basePrice": 129999,
  "baseSku": "SAM-S24U",
  "inventoryPerVariant": 10
}
```

**Response:** This will generate all possible combinations of option values as variants.

### Bulk Update Variant Inventory

**PUT** `/api/v1/seller/product-variants/bulk-update`

```json
{
  "variants": [
    {
      "variantId": "uuid-variant-1",
      "inventory": 30,
      "price": 124999
    },
    {
      "variantId": "uuid-variant-2",
      "inventory": 15,
      "price": 134999
    }
  ]
}
```

---

## Categories

### Create Category

**POST** `/api/v1/category`

Headers:
```
Authorization: Bearer <adminToken>
```

```json
{
  "name": "Smartphones",
  "slug": "smartphones",
  "description": "Mobile phones and accessories",
  "image": "https://storage.example.com/category-smartphones.jpg",
  "parentId": null,
  "isActive": true,
  "position": 1,
  "seoTitle": "Buy Smartphones Online",
  "seoDescription": "Shop latest smartphones at best prices"
}
```

### Update Category

**PATCH** `/api/v1/category/:categoryId`

```json
{
  "name": "Smartphones & Tablets",
  "description": "Mobile devices including phones and tablets",
  "isActive": true
}
```

---

## Shopping Cart

### Add to Cart

**POST** `/api/v1/customer/cart`

Headers:
```
Authorization: Bearer <customerToken>
```

```json
{
  "productId": "uuid-product-123",
  "variantId": "uuid-variant-1",
  "quantity": 2
}
```

### Update Cart Item

**PATCH** `/api/v1/customer/cart/:cartItemId`

```json
{
  "quantity": 3
}
```

---

## Wishlist

### Add to Wishlist

**POST** `/api/v1/customer/wishlist`

Headers:
```
Authorization: Bearer <customerToken>
```

```json
{
  "productId": "uuid-product-123",
  "variantId": "uuid-variant-1"
}
```

---

## Addresses

### Add Shipping Address

**POST** `/api/v1/customer/addresses`

Headers:
```
Authorization: Bearer <customerToken>
```

```json
{
  "name": "John Doe",
  "phoneNumber": "+919876543210",
  "addressLine1": "Flat 301, Green Apartments",
  "addressLine2": "MG Road",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "country": "India",
  "addressType": "HOME",
  "isDefault": true
}
```

### Update Address

**PUT** `/api/v1/customer/addresses/:addressId`

```json
{
  "addressLine1": "Flat 302, Green Apartments",
  "phoneNumber": "+919876543211"
}
```

---

## Orders

### Create Order

**POST** `/api/v1/orders`

Headers:
```
Authorization: Bearer <customerToken>
```

```json
{
  "shippingAddressId": "uuid-address-123",
  "billingAddressId": "uuid-address-123",
  "paymentMethod": "RAZORPAY",
  "items": [
    {
      "productId": "uuid-product-123",
      "variantId": "uuid-variant-1",
      "quantity": 2,
      "price": 129999
    },
    {
      "productId": "uuid-product-456",
      "quantity": 1,
      "price": 2999
    }
  ],
  "couponCode": "FIRSTORDER",
  "specialInstructions": "Please deliver before 6 PM"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "masterOrder": {
      "id": "uuid-master-order-123",
      "orderNumber": "ORD-2025-001234",
      "totalAmount": 262997,
      "discountAmount": 5000,
      "shippingAmount": 0,
      "taxAmount": 47339,
      "finalAmount": 305336,
      "status": "PENDING",
      "paymentStatus": "PENDING"
    },
    "subOrders": [
      {
        "id": "uuid-sub-order-1",
        "sellerId": "uuid-seller-123",
        "orderNumber": "SUB-ORD-001234-1",
        "totalAmount": 259998,
        "status": "PENDING"
      },
      {
        "id": "uuid-sub-order-2",
        "sellerId": "uuid-seller-456",
        "orderNumber": "SUB-ORD-001234-2",
        "totalAmount": 2999,
        "status": "PENDING"
      }
    ]
  }
}
```

### Cancel Order

**POST** `/api/v1/orders/:orderId/cancel`

Headers:
```
Authorization: Bearer <customerToken>
```

```json
{
  "reason": "Changed my mind",
  "comments": "Found a better deal elsewhere"
}
```

### Update Order Status (Seller)

**PATCH** `/api/v1/seller/order/:orderId/status`

Headers:
```
Authorization: Bearer <sellerToken>
```

```json
{
  "status": "SHIPPED",
  "trackingNumber": "TRACK123456789",
  "carrier": "BlueDart",
  "estimatedDelivery": "2025-12-25T18:00:00Z",
  "notes": "Package dispatched from warehouse"
}
```

Status options: `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `RETURNED`

---

## Payments

### Initiate Payment

**POST** `/api/v1/customer/payment/initiate-payment`

Headers:
```
Authorization: Bearer <customerToken>
```

```json
{
  "orderId": "uuid-master-order-123",
  "amount": 305336,
  "currency": "INR",
  "paymentMethod": "RAZORPAY"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "pay_razorpay_123",
    "orderId": "order_razorpay_456",
    "amount": 305336,
    "currency": "INR",
    "key": "rzp_test_1234567890"
  }
}
```

### Verify Payment

**POST** `/api/v1/customer/payment/verify-payment`

```json
{
  "orderId": "uuid-master-order-123",
  "paymentId": "pay_razorpay_123",
  "razorpayOrderId": "order_razorpay_456",
  "razorpaySignature": "signature_hash_from_razorpay"
}
```

---

## Returns

### Create Return Request

**POST** `/api/v1/customer/returns`

Headers:
```
Authorization: Bearer <customerToken>
```

```json
{
  "subOrderId": "uuid-sub-order-1",
  "items": [
    {
      "subOrderItemId": "uuid-item-1",
      "quantity": 1,
      "reason": "DAMAGED",
      "description": "Screen has scratches",
      "images": [
        "https://storage.example.com/return-img-1.jpg",
        "https://storage.example.com/return-img-2.jpg"
      ]
    }
  ],
  "refundMethod": "ORIGINAL_PAYMENT"
}
```

Reason options: `DAMAGED`, `DEFECTIVE`, `WRONG_ITEM`, `NOT_AS_DESCRIBED`, `CHANGED_MIND`, `OTHER`

### Update Return Status (Seller)

**PUT** `/api/v1/seller/returns/:returnId/status`

Headers:
```
Authorization: Bearer <sellerToken>
```

```json
{
  "status": "APPROVED",
  "notes": "Return approved. Please ship the item back.",
  "refundAmount": 129999,
  "pickupScheduled": "2025-12-23T10:00:00Z"
}
```

Status options: `PENDING`, `APPROVED`, `REJECTED`, `PICKED_UP`, `RECEIVED`, `REFUNDED`, `COMPLETED`

### Process Refund (Seller)

**POST** `/api/v1/seller/refunds`

```json
{
  "returnId": "uuid-return-123",
  "amount": 129999,
  "refundMethod": "ORIGINAL_PAYMENT",
  "notes": "Full refund processed"
}
```

---

## Coupons

### Create Coupon

**POST** `/api/v1/seller/coupon`

Headers:
```
Authorization: Bearer <sellerToken>
```

```json
{
  "code": "NEWYEAR2025",
  "description": "New Year Sale - 20% off",
  "discountType": "PERCENTAGE",
  "discountValue": 20,
  "minOrderValue": 5000,
  "maxDiscountAmount": 2000,
  "usageLimit": 1000,
  "usagePerCustomer": 1,
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-01-31T23:59:59Z",
  "applicableProducts": ["uuid-product-123", "uuid-product-456"],
  "applicableCategories": ["smartphones", "tablets"],
  "isActive": true
}
```

Discount types: `PERCENTAGE`, `FIXED_AMOUNT`, `FREE_SHIPPING`

### Update Coupon

**PATCH** `/api/v1/seller/coupon/:couponId`

```json
{
  "discountValue": 25,
  "maxDiscountAmount": 2500,
  "isActive": false
}
```

### Apply Coupon (Customer)

**POST** `/api/v1/customer/couponApply`

Headers:
```
Authorization: Bearer <customerToken>
```

```json
{
  "couponCode": "NEWYEAR2025",
  "orderTotal": 15000
}
```

---

## Group Buying

### Create Group Buy

**POST** `/api/v1/group-buys`

Headers:
```
Authorization: Bearer <customerToken>
```

```json
{
  "productId": "uuid-product-123",
  "variantId": "uuid-variant-1",
  "targetPrice": 119999,
  "minimumParticipants": 10,
  "maximumParticipants": 50,
  "duration": 7,
  "endDate": "2025-12-28T23:59:59Z",
  "description": "Join the group buy and save ₹10,000 on Samsung S24 Ultra"
}
```

### Join Group Buy

**POST** `/api/v1/group-buys/:id/join`

Headers:
```
Authorization: Bearer <customerToken>
```

```json
{
  "quantity": 1
}
```

---

## Contact Information

### Add Customer Contact

**POST** `/api/v1/customer/contact`

Headers:
```
Authorization: Bearer <customerToken>
```

```json
{
  "phoneNumber": "+919876543210",
  "alternatePhoneNumber": "+919876543211",
  "email": "john.doe@example.com",
  "alternateEmail": "john.alternate@example.com"
}
```

### Add Seller Contact

**POST** `/api/v1/seller/contact`

Headers:
```
Authorization: Bearer <sellerToken>
```

```json
{
  "contactPerson": "Rajesh Kumar",
  "designation": "Customer Support Manager",
  "phoneNumber": "+918012345678",
  "alternatePhoneNumber": "+918012345679",
  "email": "support@premiumelectronics.com",
  "whatsappNumber": "+918012345678"
}
```

---

## CSV Operations

### Export Products

**GET** `/api/v1/csv/products/export?format=csv&includeVariants=true`

Headers:
```
Authorization: Bearer <sellerToken>
```

Query Parameters:
- `format`: csv
- `includeVariants`: true
- `categoryId`: uuid-category-123 (optional)
- `isActive`: true (optional)

### Import Products

**POST** `/api/v1/csv/products/import`

Headers:
```
Authorization: Bearer <sellerToken>
Content-Type: multipart/form-data
```

Form Data:
```
file: products.csv
mode: create (options: create, update, upsert)
validateOnly: false
```

**CSV Format:**
```csv
name,sku,price,inventory,category,description,weight,isActive
"Samsung Galaxy S24",SAM-S24-BLK,89999,50,smartphones,"Latest flagship",195,true
"iPhone 15 Pro",APPL-15PRO-BLU,134900,30,smartphones,"Apple flagship",187,true
```

### Export Orders

**GET** `/api/v1/csv/orders/export?startDate=2025-01-01&endDate=2025-12-31&status=DELIVERED`

Headers:
```
Authorization: Bearer <sellerToken>
```

Query Parameters:
- `startDate`: 2025-01-01
- `endDate`: 2025-12-31
- `status`: DELIVERED (optional)
- `format`: csv

### Bulk Update Inventory

**POST** `/api/v1/csv/inventory/update`

Headers:
```
Authorization: Bearer <sellerToken>
Content-Type: multipart/form-data
```

Form Data:
```
file: inventory.csv
```

**CSV Format:**
```csv
sku,inventory,price
SAM-S24-BLK,45,84999
APPL-15PRO-BLU,25,129900
```

---

## Checkout

### Calculate Shipping

**POST** `/api/v1/customer/checkout/calculate-shipping`

Headers:
```
Authorization: Bearer <customerToken>
```

```json
{
  "items": [
    {
      "productId": "uuid-product-123",
      "variantId": "uuid-variant-1",
      "quantity": 2,
      "weight": 233
    }
  ],
  "shippingAddressId": "uuid-address-123",
  "pincode": "400001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "shippingCost": 0,
    "estimatedDelivery": "2025-12-25",
    "carrier": "BlueDart",
    "serviceName": "Express Delivery"
  }
}
```

### Validate Checkout

**POST** `/api/v1/customer/checkout/validate`

```json
{
  "items": [
    {
      "productId": "uuid-product-123",
      "variantId": "uuid-variant-1",
      "quantity": 2
    }
  ],
  "shippingAddressId": "uuid-address-123",
  "couponCode": "NEWYEAR2025"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "subtotal": 259998,
    "discount": 5000,
    "tax": 45899,
    "shipping": 0,
    "total": 300897,
    "errors": []
  }
}
```

---

## Invoices

### Get Invoice

**GET** `/api/v1/invoices/:orderId`

Headers:
```
Authorization: Bearer <customerToken or sellerToken>
```

### Download Invoice PDF

**GET** `/api/v1/invoices/:orderId/download`

Headers:
```
Authorization: Bearer <customerToken or sellerToken>
```

Response: PDF file download

---

## Shipments

### Track Shipment

**GET** `/api/v1/shipments/:trackingId`

No authentication required.

**Response:**
```json
{
  "success": true,
  "data": {
    "trackingId": "TRACK123456789",
    "carrier": "BlueDart",
    "status": "IN_TRANSIT",
    "currentLocation": "Mumbai Hub",
    "estimatedDelivery": "2025-12-25T18:00:00Z",
    "history": [
      {
        "timestamp": "2025-12-21T10:00:00Z",
        "status": "PICKED_UP",
        "location": "Bangalore Warehouse"
      },
      {
        "timestamp": "2025-12-22T08:00:00Z",
        "status": "IN_TRANSIT",
        "location": "Mumbai Hub"
      }
    ]
  }
}
```

### Update Shipment Status (Seller)

**POST** `/api/v1/shipments/:subOrderId/update`

Headers:
```
Authorization: Bearer <sellerToken>
```

```json
{
  "status": "IN_TRANSIT",
  "location": "Delhi Hub",
  "notes": "Package in transit to delivery hub",
  "estimatedDelivery": "2025-12-24T18:00:00Z"
}
```

---

## Common Headers

### Customer Authentication
```
Authorization: Bearer <customerAccessToken>
Content-Type: application/json
```

### Seller Authentication
```
Authorization: Bearer <sellerAccessToken>
Content-Type: application/json
```

### File Upload
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

---

## Common Response Patterns

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalPages": 5,
      "totalItems": 100,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

## Testing Workflow

1. **Register & Login** → Get access token
2. **Seller Onboarding** → Complete all steps
3. **Create Products** → Add options & variants
4. **Customer Browse** → Search & filter products
5. **Add to Cart** → Manage cart items
6. **Checkout** → Validate & calculate shipping
7. **Create Order** → Process payment
8. **Track Order** → Monitor shipment
9. **Returns** → If needed

---

**Last Updated**: December 21, 2025
**Total Endpoints Covered**: 160+
**Data Format**: JSON (except CSV endpoints)
