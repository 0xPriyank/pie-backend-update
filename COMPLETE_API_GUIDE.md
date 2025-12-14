# 🚀 Complete API Testing Guide - PIE Backend

**One file. Everything you need. Simple and correct.**

---

## 📋 What You'll Learn

1. How to set up database (5 minutes)
2. How to register and login
3. How to create products with variants (Shopify-style)
4. How to manage orders

**Server URL:** `http://localhost:5000`

---

## 🎯 Quick Setup

### 1. Start the Server
```bash
npm run dev
# Should show: Server is running on http://localhost:5000
```

### 2. Open Prisma Studio
```bash
npx prisma studio
# Opens at: http://localhost:5555
```

### 3. Postman Setup
Create environment variables:
- `base_url` = `http://localhost:5000`
- `seller_token` = (will get after login)
- `product_id` = (will get after creating product)

---

## 💾 STEP 1: Database Setup (Do This First!)

### Open Prisma Studio
```bash
npx prisma studio
```
Opens at http://localhost:5555

### Create These Records (In Order):

#### A. TaxSlab Table
Click "Add record":
- **title**: `Standard GST`
- **percentage**: `18`
- Click Save → **Copy the ID**

#### B. Category Table  
Click "Add record":
- **name**: `T-Shirts`
- **slug**: `t-shirts`
- **taxId**: *Paste the TaxSlab ID from above*
- Click Save → **Copy the ID**

#### C. Color Table
Add these 4 records:

| name  | value   |
|-------|---------|
| Red   | #FF0000 |
| Blue  | #0000FF |
| Black | #000000 |
| White | #FFFFFF |

**Copy one Color ID** (any one is fine)

#### D. Size Table
Add these 4 records:

| name   | value |
|--------|-------|
| Small  | S     |
| Medium | M     |
| Large  | L     |
| XL     | XL    |

**Copy one Size ID** (any one is fine)

### ✅ Done! Save These IDs:
```
Tax ID:      _______________________
Category ID: _______________________
Color ID:    _______________________
Size ID:     _______________________
```

---

## 🔐 STEP 2: Register & Login
## 🔐 STEP 2: Register & Login

### A. Register Seller
```http
POST {{base_url}}/api/v1/seller/register
Content-Type: application/json

{
  "email": "test@seller.com",
  "password": "Test@123",
  "name": "John Seller",
  "businessName": "My Shop",
  "phone": "+919876543210"
}
```

### B. Verify Email (Optional - Skip if No Email Setup)
```http
POST {{base_url}}/api/v1/seller/verify
Content-Type: application/json

{
  "email": "test@seller.com",
  "otp": "123456"
}
```

### C. Login
```http
POST {{base_url}}/api/v1/seller/login
Content-Type: application/json

{
  "email": "test@seller.com",
  "password": "Test@123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "seller": { "id": "...", "email": "test@seller.com" },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR..."
  }
}
```

**📌 IMPORTANT:** Copy the `accessToken` → Save in Postman as `seller_token`

### D. Use Token in All Requests
Add this header to every request:
```
Authorization: Bearer {{seller_token}}
```

---

## 🛍️ STEP 3: Create Product

### Create Your First Product
```http
POST {{base_url}}/api/v1/seller/product
Authorization: Bearer {{seller_token}}
Content-Type: application/json

{
  "name": "Premium Cotton T-Shirt",
  "sku": "TSHIRT-001",
  "categories": ["<PASTE_CATEGORY_ID_HERE>"],
  "shortDescription": "Comfortable cotton t-shirt",
  "description": "High quality 100% cotton",
  "price": 2999,
  "discount": 10,
  "stockAvailable": 100,
  "colorId": "<PASTE_COLOR_ID_HERE>",
  "sizeId": "<PASTE_SIZE_ID_HERE>",
  "tags": ["cotton", "casual"]
}
```

**✅ Success! Save the `product_id` from response**

---

## 🎨 STEP 4: Add Variants (Shopify-Style)

### A. Add Color Options
```http
POST {{base_url}}/api/seller/product-options
Authorization: Bearer {{seller_token}}
Content-Type: application/json

{
  "productId": "<YOUR_PRODUCT_ID>",
  "name": "Color",
  "position": 1,
  "values": [
    { "value": "Red", "position": 1 },
    { "value": "Blue", "position": 2 },
    { "value": "Black", "position": 3 }
  ]
}
```

### B. Add Size Options
```http
POST {{base_url}}/api/seller/product-options
Authorization: Bearer {{seller_token}}
Content-Type: application/json

{
  "productId": "<YOUR_PRODUCT_ID>",
  "name": "Size",
  "position": 2,
  "values": [
    { "value": "S", "position": 1 },
    { "value": "M", "position": 2 },
    { "value": "L", "position": 3 }
  ]
}
```

### C. Auto-Generate All Variants (Magic! ✨)
```http
POST {{base_url}}/api/seller/product-variants/auto-generate
Authorization: Bearer {{seller_token}}
Content-Type: application/json

{
  "productId": "<YOUR_PRODUCT_ID>",
  "basePrice": 2999.00,
  "baseSku": "TSHIRT",
  "inventoryPerVariant": 50
}
```

**Result:** Creates **3 colors × 3 sizes = 9 variants** automatically!

```
✅ TSHIRT-RED-S
✅ TSHIRT-RED-M
✅ TSHIRT-RED-L
✅ TSHIRT-BLUE-S
✅ TSHIRT-BLUE-M
... (9 total)
```

### D. View All Variants
```http
GET {{base_url}}/api/seller/product-variants/{{product_id}}
Authorization: Bearer {{seller_token}}
```

### E. Update Single Variant
```http
PUT {{base_url}}/api/seller/product-variants/{{variant_id}}
Authorization: Bearer {{seller_token}}
Content-Type: application/json

{
  "price": 3499,
  "inventory": 100
}
```

---

## 🛒 STEP 5: Orders (Optional)

### Customer Side

#### 1. Register Customer
```http
POST {{base_url}}/api/v1/customer/register
Content-Type: application/json

{
  "email": "customer@test.com",
  "password": "Test@123",
  "name": "John Customer",
  "phone": "+919876543210"
}
```

#### 2. Login Customer
```http
POST {{base_url}}/api/v1/customer/login
Content-Type: application/json

{
  "email": "customer@test.com",
  "password": "Test@123"
}
```
**Save `accessToken` as `customer_token`**

#### 3. Create Order
```http
POST {{base_url}}/api/orders
Authorization: Bearer {{customer_token}}
Content-Type: application/json

{
  "items": [
    {
      "productId": "<product_id>",
      "variantId": "<variant_id>",
      "quantity": 2,
      "price": 2999
    }
  ],
  "shippingAddressId": "<address_id>",
  "paymentMethod": "RAZORPAY"
}
```

### Seller Side

#### View Orders
```http
GET {{base_url}}/api/seller/sub-orders
Authorization: Bearer {{seller_token}}
```

#### Accept Order
```http
POST {{base_url}}/api/seller/sub-orders/{{sub_order_id}}/accept
Authorization: Bearer {{seller_token}}
```

#### Update Status
```http
PUT {{base_url}}/api/seller/sub-orders/{{sub_order_id}}/status
Authorization: Bearer {{seller_token}}
Content-Type: application/json

{
  "status": "PROCESSING"
}
```

---

## 🔄 STEP 6: Complete Order → Return → Refund Flow

### Prerequisites: Create Order First

Before you can test returns, you need a **DELIVERED** order. Here's the complete flow:

---

### A. Customer: Add Product to Cart

#### 1. Add to Cart
```http
POST {{base_url}}/api/v1/customer/cart
Authorization: Bearer {{customer_token}}
Content-Type: application/json

{
  "productId": "<your_product_id>",
  "quantity": 2,
  "colorId": "<your_color_id>",
  "sizeId": "<your_size_id>"
}
```

#### 2. View Cart
```http
GET {{base_url}}/api/v1/customer/cart
Authorization: Bearer {{customer_token}}
```

**Copy the `cart.id` from response**

---

### B. Customer: Create Order from Cart

```http
POST {{base_url}}/api/orders
Authorization: Bearer {{customer_token}}
Content-Type: application/json

{
  "cartId": "<cart_id>",
  "shippingAddress": {
    "fullName": "John Doe",
    "contact": "+919876543210",
    "email": "customer@test.com",
    "street": "123 Main Street, Apartment 4B",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "pincode": "400001",
    "landmark": "Near City Mall"
  },
  "paymentMethod": "CASH_ON_DELIVERY",
  "notes": "Please deliver between 10 AM - 6 PM"
}
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "id": "master_order_123...",
    "orderNumber": "ORD-2025-00001",
    "status": "PENDING",
    "subOrders": [
      {
        "id": "sub_order_abc...",  // ← SAVE THIS: subOrderId
        "subOrderNumber": "SO-2025-00001",
        "sellerId": "seller_xyz...",
        "status": "PENDING",
        "items": [
          {
            "id": "item_def...",  // ← SAVE THIS: subOrderItemId
            "productId": "...",
            "variantId": "...",
            "quantity": 2,
            "price": 2999
          }
        ],
        "totalAmount": 5998
      }
    ],
    "totalAmount": 5998
  }
}
```

**✅ IMPORTANT:** Copy these IDs:
- `subOrders[0].id` → This is your **subOrderId**
- `subOrders[0].items[0].id` → This is your **subOrderItemId**

---

### C. Seller: Accept & Deliver Order

#### 1. View Your Orders
```http
GET {{base_url}}/api/seller/sub-orders
Authorization: Bearer {{seller_token}}
```

#### 2. Accept Order
```http
POST {{base_url}}/api/seller/sub-orders/{{sub_order_id}}/accept
Authorization: Bearer {{seller_token}}
```

#### 3. Update Status to DELIVERED
```http
PUT {{base_url}}/api/seller/sub-orders/{{sub_order_id}}/status
Authorization: Bearer {{seller_token}}
Content-Type: application/json

{
  "status": "DELIVERED",
  "notes": "Order delivered successfully"
}
```

**Status Flow:**
```
PENDING → CONFIRMED → PROCESSING → PACKED → SHIPPED → OUT_FOR_DELIVERY → DELIVERED
```

---

### D. Customer: Request Return (After Delivery)

#### 1. Request Return (Within 7 Days)
```http
POST {{base_url}}/api/v1/customer/returns
Authorization: Bearer {{customer_token}}
Content-Type: application/json

{
  "subOrderId": "sub_order_abc...",
  "reason": "Product defective - screen not working properly",
  "description": "The screen has dead pixels and touch is not responsive",
  "items": [
    {
      "subOrderItemId": "item_def...",
      "quantity": 1,
      "refundAmount": 2699
    }
  ],
  "pickupAddress": "123 Main St, Apartment 4B"
}
```

```

**Validation Rules:**
- ✅ Order must be **DELIVERED** status
- ✅ Within **7 days** of delivery
- ✅ Reason must be at least 10 characters
- ✅ Cannot return more than ordered quantity
- ✅ Cannot create duplicate return for same items

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "return_123...",
    "returnNumber": "RET-2025-00001",
    "status": "REQUESTED",
    "reason": "Product defective",
    "createdAt": "2025-12-13T10:00:00Z"
  }
}
```

#### 2. Get My Returns
```http
GET {{base_url}}/api/v1/customer/returns
Authorization: Bearer {{customer_token}}
```

Query params: `?status=REQUESTED&page=1&limit=20`

#### 3. Get Return Details
```http
GET {{base_url}}/api/v1/customer/returns/{{return_id}}
Authorization: Bearer {{customer_token}}
```

#### 4. Cancel Return (Before Approved)
```http
POST {{base_url}}/api/v1/customer/returns/{{return_id}}/cancel
Authorization: Bearer {{customer_token}}
```

---

### E. Seller: Manage Returns

#### 1. Get All Returns
```http
GET {{base_url}}/api/v1/seller/returns
Authorization: Bearer {{seller_token}}
```

Query params: `?status=REQUESTED&page=1&limit=20`

**Statuses:**
- `REQUESTED` - Customer requested return
- `APPROVED` - Seller approved
- `REJECTED` - Seller rejected
- `PICKED_UP` - Product picked up
- `IN_TRANSIT` - On the way back
- `RECEIVED` - Seller received product
- `INSPECTED` - Seller inspected product
- `COMPLETED` - Return completed

#### 2. Get Return Details
```http
GET {{base_url}}/api/v1/seller/returns/{{return_id}}
Authorization: Bearer {{seller_token}}
```

#### 3. Approve Return
```http
PUT {{base_url}}/api/v1/seller/returns/{{return_id}}/status
Authorization: Bearer {{seller_token}}
Content-Type: application/json

{
  "status": "APPROVED"
}
```

#### 4. Reject Return
```http
PUT {{base_url}}/api/v1/seller/returns/{{return_id}}/status
Authorization: Bearer {{seller_token}}
Content-Type: application/json

{
  "status": "REJECTED",
  "rejectionReason": "Product shows signs of physical damage not covered by return policy"
}
```

#### 5. Update Return Status (Pickup → Delivery)
```http
PUT {{base_url}}/api/v1/seller/returns/{{return_id}}/status
Authorization: Bearer {{seller_token}}
Content-Type: application/json

{
  "status": "PICKED_UP",
  "trackingNumber": "DTDC9876543210"
}
```

**Status Flow:**
```
REQUESTED → APPROVED → PICKED_UP → IN_TRANSIT → RECEIVED → INSPECTED → COMPLETED
         ↘ REJECTED
```

---

### F. Seller: Process Refunds

#### 1. Process Refund (After Inspection)
```http
POST {{base_url}}/api/v1/seller/refunds
Authorization: Bearer {{seller_token}}
Content-Type: application/json

{
  "returnId": "<return_id>",
  "amount": 2699,
  "method": "ORIGINAL_PAYMENT_METHOD",
  "transactionId": "TXN123456789"
}
```

**Refund Methods:**
- `ORIGINAL_PAYMENT_METHOD` - Refund to original payment
- `WALLET` - Refund to customer wallet
- `BANK_TRANSFER` - Direct bank transfer
- `STORE_CREDIT` - Store credit for future purchases

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "refund_123...",
    "refundNumber": "REF-2025-00001",
    "amount": 2699,
    "status": "INITIATED",
    "method": "ORIGINAL_PAYMENT_METHOD"
  }
}
```

#### 2. Get All Refunds
```http
GET {{base_url}}/api/v1/seller/refunds
Authorization: Bearer {{seller_token}}
```

Query params: `?status=PENDING&page=1&limit=20`

**Refund Statuses:**
- `PENDING` - Created, awaiting initiation
- `INITIATED` - Refund initiated with gateway
- `PROCESSING` - Being processed
- `COMPLETED` - Refund completed
- `FAILED` - Refund failed
- `CANCELLED` - Cancelled

#### 3. Get Refund Details
```http
GET {{base_url}}/api/v1/seller/refunds/{{refund_id}}
Authorization: Bearer {{seller_token}}
```

#### 4. Update Refund Status
```http
PUT {{base_url}}/api/v1/seller/refunds/{{refund_id}}/status
Authorization: Bearer {{seller_token}}
Content-Type: application/json

{
  "status": "COMPLETED",
  "transactionId": "TXN_FINAL_123"
}
```

#### 5. Mark Refund as Failed
```http
PUT {{base_url}}/api/v1/seller/refunds/{{refund_id}}/status
Authorization: Bearer {{seller_token}}
Content-Type: application/json

{
  "status": "FAILED",
  "failureReason": "Insufficient funds in merchant account"
}
```

---

## � STEP 7: Payment Webhooks (Phase 5)

### Overview

Phase 5 implements automatic order status updates via payment gateway webhooks. When customers complete payments through Razorpay or Cashfree, your server automatically receives notifications and updates orders.

**Benefits:**
- ✅ Automatic order confirmation on payment success
- ✅ Real-time payment status updates  
- ✅ Inventory automatically reduced
- ✅ Failed payment tracking
- ✅ Refund handling

---

### A. Setup Webhook Endpoints

#### 1. Add Environment Variables

Add to your `.env` file:

```env
# Razorpay Webhook (Optional but recommended)
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret_here

# Cashfree Webhook (Optional)
CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET_KEY=your_cashfree_secret_key  
CASHFREE_WEBHOOK_SECRET=your_cashfree_webhook_secret
```

#### 2. Webhook URLs

Your server exposes these webhook endpoints:

```
Razorpay: http://localhost:5000/api/webhooks/razorpay
Cashfree: http://localhost:5000/api/webhooks/cashfree
Test:     http://localhost:5000/api/webhooks/test (dev only)
```

**For Production:** Replace `localhost:5000` with your domain (e.g., `https://api.yourdomain.com`)

---

### B. Configure Razorpay Webhook

#### 1. Login to Razorpay Dashboard

Go to: https://dashboard.razorpay.com/

#### 2. Add Webhook

1. Navigate to **Settings** → **Webhooks**
2. Click **+ Add New Webhook**
3. Enter webhook URL: `https://yourdomain.com/api/webhooks/razorpay`
4. Select events:
   - ✅ `payment.authorized`
   - ✅ `payment.captured`
   - ✅ `payment.failed`
   - ✅ `refund.created`
   - ✅ `refund.processed`
5. Enter a webhook secret (save this for .env)
6. Click **Create Webhook**

#### 3. Test Webhook

Use Razorpay's test mode to verify:

```bash
# Test payment will trigger webhook
curl -X POST https://yourdomain.com/api/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{"test": "razorpay_webhook"}'
```

---

### C. Configure Cashfree Webhook

#### 1. Login to Cashfree Dashboard

Go to: https://merchant.cashfree.com/

#### 2. Add Webhook

1. Navigate to **Developers** → **Webhooks**
2. Click **Add Webhook Endpoint**
3. Enter webhook URL: `https://yourdomain.com/api/webhooks/cashfree`
4. Select events:
   - ✅ `PAYMENT_SUCCESS_WEBHOOK`
   - ✅ `PAYMENT_FAILED_WEBHOOK`
5. Enter webhook secret (save this for .env)
6. Click **Save**

---

### D. Payment Flow

#### 1. Customer Creates Order
```http
POST http://localhost:5000/api/orders
Authorization: Bearer {{customer_token}}

{
  "cartId": "<cart_id>",
  "shippingAddress": { ... },
  "paymentMethod": "RAZORPAY"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderNumber": "ORD-2025-00001",
    "status": "PENDING",
    "paymentStatus": "NOT_PAID",
    "finalAmount": 5998
  }
}
```

#### 2. Customer Pays (Frontend)

Customer completes payment on Razorpay/Cashfree payment page.

#### 3. Webhook Auto-Updates Order

**What happens automatically:**

```
1. Payment gateway sends webhook to your server
2. Server verifies webhook signature (security)
3. Server validates payment amount matches order
4. Server updates order status: PENDING → CONFIRMED
5. Server updates payment status: NOT_PAID → PAID
6. Server reduces inventory for ordered items
7. Server updates all sub-orders to CONFIRMED
```

#### 4. Check Order Status

```http
GET http://localhost:5000/api/orders/{{order_id}}
Authorization: Bearer {{customer_token}}
```

**Response after webhook:**
```json
{
  "success": true,
  "data": {
    "orderNumber": "ORD-2025-00001",
    "status": "CONFIRMED",
    "paymentStatus": "PAID",
    "finalAmount": 5998,
    "subOrders": [
      {
        "status": "CONFIRMED",
        "paymentStatus": "PAID"
      }
    ]
  }
}
```

---

### E. Webhook Events Handled

#### Razorpay Events

| Event | Description | Action |
|-------|-------------|--------|
| `payment.authorized` | Payment authorized by bank | Mark order as PAID |
| `payment.captured` | Payment captured successfully | Mark order as CONFIRMED |
| `payment.failed` | Payment failed | Log failure, keep order PENDING |
| `refund.created` | Refund initiated | Mark order as REFUNDED |
| `refund.processed` | Refund completed | Restore inventory |

#### Cashfree Events

| Status | Description | Action |
|--------|-------------|--------|
| `SUCCESS` | Payment successful | Mark order as CONFIRMED |
| `FAILED` | Payment failed | Log failure |
| `CANCELLED` | User cancelled payment | Keep order PENDING |
| `USER_DROPPED` | User abandoned payment | Keep order PENDING |

---

### F. Testing Webhooks Locally

#### Using ngrok (Recommended)

```bash
# 1. Install ngrok
# Download from: https://ngrok.com/download

# 2. Start your server
npm run dev

# 3. Expose localhost with ngrok
ngrok http 5000

# 4. Copy the ngrok URL (e.g., https://abc123.ngrok.io)

# 5. Use this URL in Razorpay/Cashfree webhook settings:
https://abc123.ngrok.io/api/webhooks/razorpay
```

#### Test Webhook Manually

```http
POST http://localhost:5000/api/webhooks/test
Content-Type: application/json

{
  "event": "payment.captured",
  "payment_id": "pay_test123",
  "order_id": "order_test456",
  "amount": 599800,
  "status": "captured"
}
```

---

### G. Error Handling

#### Webhook Logs

Check your server terminal for webhook logs:

```bash
✅ Razorpay webhook signature verified
📥 Razorpay webhook received: payment.captured - Payment ID: pay_xxxxx
✅ Payment pay_xxxxx captured successfully
```

#### Common Issues

**❌ Error: "Invalid signature"**
```
Problem: Webhook secret mismatch
Fix: Verify RAZORPAY_WEBHOOK_SECRET in .env matches Razorpay dashboard
```

**❌ Error: "Order not found"**
```
Problem: Order ID doesn't exist
Fix: Ensure order was created before webhook
```

**❌ Error: "Payment amount mismatch"**
```
Problem: Paid amount ≠ order amount
Fix: Check for price tampering, verify cart total
```

#### Webhook Retry Logic

- ✅ Server always returns 200 OK (even on errors)
- ✅ Prevents infinite retries from payment gateway
- ✅ Errors logged for manual investigation
- ✅ Failed webhooks can be replayed from gateway dashboard

---

### H. Security Features

#### 1. Signature Verification

**Razorpay:**
```typescript
signature = HMAC-SHA256(webhook_secret, webhook_body)
```

**Cashfree:**
```typescript
signature = HMAC-SHA256(webhook_secret, timestamp + webhook_body)
```

#### 2. Amount Validation

Server validates payment amount matches order total (prevents tampering).

#### 3. Idempotency

Webhook can be received multiple times safely - duplicate payments ignored.

---

## �📝 Complete Order → Return → Refund Summary

### Quick Reference: Getting Required IDs

**To test returns, follow these steps in order:**

```
1. Customer Login → Get customer_token
2. Add to Cart → POST /api/v1/customer/cart
3. View Cart → GET /api/v1/customer/cart (get cartId)
4. Create Order → POST /api/orders with cartId
   ✅ SAVE: subOrderId (from response.subOrders[0].id)
   ✅ SAVE: subOrderItemId (from response.subOrders[0].items[0].id)
5. Seller Login → Get seller_token
6. Accept Order → POST /api/seller/sub-orders/{subOrderId}/accept
7. Mark as Delivered → PUT /api/seller/sub-orders/{subOrderId}/status with "DELIVERED"
8. Create Return → POST /api/v1/customer/returns (use saved IDs)
9. Seller Approves → PUT /api/v1/seller/returns/{returnId}/status with "APPROVED"
10. Update Return Status → Track pickup, transit, received, inspected
11. Process Refund → POST /api/v1/seller/refunds
12. Complete Refund → PUT /api/v1/seller/refunds/{refundId}/status with "COMPLETED"
```

---

## 🆘 Common Errors & Fixes

### ❌ Error: 500 "Product with this SKU already exists"
**Problem:** The SKU is already used by another product
**Fix:** Change the SKU to something unique:
```json
{
  "sku": "TSHIRT-006"  // ← Change this number
}
```
**Or** delete the old product in Prisma Studio first.

### ❌ Error: 400 "Seller is not verified"
**Problem:** Your seller account needs verification
**Fix:** Complete email verification:
```http
POST {{base_url}}/api/v1/seller/verify
{
  "email": "test@seller.com",
  "otp": "123456"
}
```

### ❌ Error: 400 "Invalid uuid"
**Problem:** Using placeholder IDs like `<paste-id-here>`
**Fix:** Use real UUIDs from Prisma Studio (format: `a1b2c3d4-e5f6-4a5b-8c9d-...`)

### ❌ Error: 401 Unauthorized  
**Problem:** Token missing or expired
**Fix:** Login again and copy the new accessToken

### ❌ Error: 400 "categories Required"
**Problem:** Missing required fields
**Fix:** Make sure ALL required fields are in the request:
- name, sku, categories, shortDescription, description
- price, discount, stockAvailable, colorId, sizeId, tags

### ❌ Error: 400 "Order must be delivered"
**Problem:** Trying to create return for non-delivered order
**Fix:** Seller must update order status to DELIVERED first:
```http
PUT {{base_url}}/api/seller/sub-orders/{{sub_order_id}}/status
{
  "status": "DELIVERED"
}
```

### ❌ Error: 400 "Return window has expired"
**Problem:** Trying to return after 7 days
**Fix:** Returns must be requested within 7 days of delivery

### ❌ Error: 400 "Cannot find subOrderId"
**Problem:** Using wrong ID or placeholder
**Fix:** Get real subOrderId from order creation response:
```
Order Response → data.subOrders[0].id
```

### ❌ Error: 400 "subOrderItemId not found"
**Problem:** Using wrong item ID
**Fix:** Get real subOrderItemId from order response:
```
Order Response → data.subOrders[0].items[0].id
```

### ❌ Error: 400 "Return already exists for this item"
**Problem:** Duplicate return request
**Fix:** Check existing returns: GET /api/v1/customer/returns

### ❌ Error: Prisma Client corrupted
**Problem:** Prisma Studio shows weird errors
**Fix:**
```bash
npx prisma generate
npm run dev
```

---

## 📚 All Available Routes

### Authentication
```
POST   /api/v1/seller/register
POST   /api/v1/seller/verify
POST   /api/v1/seller/login
POST   /api/v1/customer/register
POST   /api/v1/customer/login
```

### Products (Old API)
```
POST   /api/v1/seller/product       - Create product
GET    /api/v1/seller/product/all   - Get all your products
GET    /api/v1/seller/product/:id   - Get single product
PATCH  /api/v1/seller/product/:id   - Update product
DELETE /api/v1/seller/product/:id   - Delete product
```

### Product Options (New - Shopify Style)
```
POST   /api/seller/product-options           - Add option (Color/Size)
GET    /api/seller/product-options/:productId - Get all options
PUT    /api/seller/product-options/:optionId  - Update option
DELETE /api/seller/product-options/:optionId  - Delete option
```

### Product Variants (New - Shopify Style)
```
POST   /api/seller/product-variants/auto-generate     - Generate all variants
GET    /api/seller/product-variants/:productId        - Get all variants
GET    /api/seller/product-variants/single/:variantId - Get one variant
PUT    /api/seller/product-variants/:variantId        - Update variant
DELETE /api/seller/product-variants/:variantId        - Delete variant
PUT    /api/seller/product-variants/bulk-update       - Bulk update
```

### Orders
```
# Cart (Customer)
POST   /api/v1/customer/cart              - Add to cart
GET    /api/v1/customer/cart              - View cart
PATCH  /api/v1/customer/cart/:cartItemId  - Update cart item

# Orders (Customer)
POST   /api/orders                - Create order from cart
GET    /api/orders                - Get my orders
GET    /api/orders/:orderId       - Get order details
POST   /api/orders/:orderId/cancel - Cancel order

# Sub-Orders (Seller)
GET    /api/seller/sub-orders     - Get orders (seller)
POST   /api/seller/sub-orders/:id/accept  - Accept order
PUT    /api/seller/sub-orders/:id/status  - Update status
```

### Categories
```
GET    /api/v1/category           - Get all categories
POST   /api/v1/category           - Create category
GET    /api/v1/category/:slug     - Get by slug
```

### Returns & Refunds (Phase 4 - NEW!)
```
# Customer Routes
POST   /api/v1/customer/returns                - Create return request
GET    /api/v1/customer/returns                - Get my returns
GET    /api/v1/customer/returns/:returnId      - Get return details
POST   /api/v1/customer/returns/:returnId/cancel - Cancel return

# Seller Routes - Returns
GET    /api/v1/seller/returns                  - Get all returns
GET    /api/v1/seller/returns/:returnId        - Get return details
PUT    /api/v1/seller/returns/:returnId/status - Update return status

# Seller Routes - Refunds
POST   /api/v1/seller/refunds                  - Process refund
GET    /api/v1/seller/refunds                  - Get all refunds
GET    /api/v1/seller/refunds/:refundId        - Get refund details
PUT    /api/v1/seller/refunds/:refundId/status - Update refund status
```

### Payment Webhooks (Phase 5 - NEW!)
```
# Payment Gateway Webhooks (No auth required)
POST   /api/webhooks/razorpay                  - Razorpay payment webhook
POST   /api/webhooks/cashfree                  - Cashfree payment webhook
POST   /api/webhooks/test                      - Test webhook (dev only)
```

---

## 🎯 Quick Test Checklist

```
✅ 1. Database Setup (Prisma Studio)
   □ Created TaxSlab
   □ Created Category
   □ Created 4 Colors
   □ Created 4 Sizes

✅ 2. Register & Login
   □ Registered seller
   □ Logged in
   □ Got access token

✅ 3. Create Product
   □ Created base product
   □ Saved product ID

✅ 4. Add Variants
   □ Added Color option (3 values)
   □ Added Size option (3 values)
   □ Auto-generated 9 variants

✅ 5. Manage Variants
   □ Viewed all variants
   □ Updated variant price
   □ Updated variant inventory

✅ 6. Returns & Refunds (Phase 4)
   □ Customer added product to cart
   □ Customer created order from cart
   □ Seller accepted order
   □ Seller marked order as DELIVERED
   □ Customer created return request
   □ Seller approved return
   □ Updated return status (PICKED_UP → RECEIVED)
   □ Processed refund
   □ Marked refund as COMPLETED

✅ 7. Payment Webhooks (Phase 5)
   □ Added RAZORPAY_WEBHOOK_SECRET to .env
   □ Configured webhook URL in Razorpay dashboard
   □ Tested webhook with ngrok
   □ Created order with RAZORPAY payment method
   □ Completed test payment
   □ Verified order auto-updated to CONFIRMED
   □ Verified payment status changed to PAID
```

---

## 💡 Pro Tips

1. **Save IDs immediately** - Write them down as you get them
2. **Use Postman environment variables** - Makes testing 10x faster
3. **Start with 2-3 variants** - Don't overwhelm yourself
4. **Check server logs** - See exactly what's happening
5. **One-time setup** - Colors/Sizes never need recreation

---

## 🎉 You're Done!

**Start testing:**
1. ✅ Database setup → 5 minutes
2. ✅ Register + Login → 2 minutes  
3. ✅ Create product → 1 minute
4. ✅ Add variants → 2 minutes
5. ✅ Create orders → 3 minutes
6. ✅ Payment webhooks → 5 minutes
7. ✅ Invoice generation → Auto

**Total time: ~20 minutes to complete e-commerce flow!**

---

## 📄 Phase 6: Invoice Generation Quick Reference

### Customer Invoice APIs

```http
# Get all customer invoices
GET /api/invoices/customer
Authorization: Bearer {{customer_token}}

# Download invoice PDF
GET /api/invoices/suborder/{{subOrderId}}/download

# Get invoice details (JSON)
GET /api/invoices/suborder/{{subOrderId}}
```

### Seller Invoice APIs

```http
# Get all seller invoices
GET /api/invoices/seller
Authorization: Bearer {{seller_token}}
```

### Invoice Features

✅ Auto-generated on payment success  
✅ GST breakdown (CGST/SGST/IGST)  
✅ PDF format (A4, professional)  
✅ Unique numbering: INV-2025-XXXXXX  
✅ Seller-wise invoicing (one per SubOrder)

**For complete Phase 6 details, see:** `PHASE_6_SUMMARY.md`

---

## 📦 Phase 7: Shipmozo Shipping Integration Quick Reference

### Customer Shipment APIs

```http
# Get all customer shipments
GET /api/shipments/customer
Authorization: Bearer {{customer_token}}

# Get tracking information (public - no auth)
GET /api/shipments/suborder/{{subOrderId}}/tracking
```

### Seller Shipment APIs

```http
# Get all seller shipments
GET /api/shipments/seller
Authorization: Bearer {{seller_token}}

# Create shipment manually
POST /api/shipments/suborder/{{subOrderId}}
Authorization: Bearer {{seller_token}}
Content-Type: application/json

{
  "pickupAddress": {
    "name": "Seller Name",
    "phone": "9876543210",
    "address": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  },
  "deliveryAddress": {
    "name": "Customer Name",
    "phone": "9123456780",
    "address": "456 Park Ave",
    "city": "Delhi",
    "state": "Delhi",
    "pincode": "110001",
    "country": "India"
  },
  "items": [
    {
      "name": "Product Name",
      "quantity": 2,
      "price": 1500,
      "weight": 0.5
    }
  ],
  "paymentMode": "prepaid"
}

# Download shipping label
GET /api/shipments/suborder/{{subOrderId}}/label
Authorization: Bearer {{seller_token}}

# Cancel shipment
POST /api/shipments/suborder/{{subOrderId}}/cancel
Authorization: Bearer {{seller_token}}
```

### Shipment Features

✅ Auto-created on payment success  
✅ Real-time tracking (9 statuses)  
✅ AWB number generation  
✅ Shipping label download  
✅ Webhook integration  
✅ Multi-courier support  
✅ Public tracking (no auth)  
✅ COD & prepaid support

**Shipment Statuses:**  
`PENDING` → `LABEL_CREATED` → `PICKED_UP` → `IN_TRANSIT` → `OUT_FOR_DELIVERY` → `DELIVERED`

**For complete Phase 7 details, see:** `PHASE_7_SUMMARY.md`

---

## 📁 Phase 8: CSV Import/Export Quick Reference

### Product Variant CSV APIs

```http
# Export product variants
GET /api/csv/products/export?isActive=true
Authorization: Bearer {{seller_token}}

# Import/update product variants
POST /api/csv/products/import
Authorization: Bearer {{seller_token}}
Content-Type: multipart/form-data
Body: file=<csv_file>

# Download product import template
GET /api/csv/templates/products
```

### Order CSV APIs

```http
# Export orders
GET /api/csv/orders/export?status=CONFIRMED
Authorization: Bearer {{seller_token}}
```

### Inventory Bulk Update

```http
# Bulk update inventory
POST /api/csv/inventory/update
Authorization: Bearer {{seller_token}}
Content-Type: multipart/form-data
Body: file=<csv_file>

# Download inventory template
GET /api/csv/templates/inventory
```

### CSV Statistics

```http
# Get export statistics
GET /api/csv/stats
Authorization: Bearer {{seller_token}}
```

### CSV Features

✅ Product variant export/import  
✅ Order export with filtering  
✅ Bulk inventory update  
✅ CSV templates (no auth)  
✅ Row-level error reporting  
✅ Stream-based processing  
✅ 10MB file limit  
✅ Seller data isolation

**CSV Formats:**
- **Product Import:** sku, price, inventory, title, weight, isActive
- **Inventory Update:** sku, inventory

**For complete Phase 8 details, see:** `PHASE_8_SUMMARY.md`

---

## 🎉 **All 8 Phases Complete!**

**Project Status:**  
✅ Phase 1-4: Products, Orders, Returns/Refunds (100%)  
✅ Phase 5: Payment Webhooks (100%)  
✅ Phase 6: GST Invoice Generation (100%)  
✅ Phase 7: Shipmozo Shipping Integration (100%)  
✅ Phase 8: CSV Import/Export (100%)

**Server:** http://localhost:5000  
**Documentation:** Check PHASE_*_SUMMARY.md files for detailed guides

---

**Need help?** Check server logs at `npm run dev` terminal

**Happy Testing! 🚀**



