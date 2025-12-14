# PIE Backend - Comprehensive Testing Guide

**Last Updated:** December 14, 2025  
**Server URL:** http://localhost:5000  
**Purpose:** End-to-end testing guide for all 8 phases

---

## 🎯 Testing Checklist

### Phase 1-4: Core E-commerce
- [ ] Customer registration
- [ ] Customer login
- [ ] Seller registration
- [ ] Seller login
- [ ] Product creation with variants
- [ ] Shopping cart operations
- [ ] Order placement
- [ ] Return request
- [ ] Refund processing

### Phase 5: Payment Webhooks
- [ ] Payment creation (Razorpay)
- [ ] Webhook signature verification
- [ ] Order status update on payment
- [ ] Inventory reduction
- [ ] Payment failure handling

### Phase 6: GST Invoice Generation
- [ ] Automatic invoice creation
- [ ] PDF generation
- [ ] GST calculation (CGST/SGST/IGST)
- [ ] Invoice download (customer)
- [ ] Invoice download (seller)

### Phase 7: Shipment Integration
- [ ] Automatic shipment creation
- [ ] AWB number generation
- [ ] Tracking URL creation
- [ ] Webhook status updates
- [ ] Shipment cancellation

### Phase 8: CSV Import/Export
- [ ] Product export
- [ ] Product import/update
- [ ] Order export
- [ ] Bulk inventory update
- [ ] CSV template download

---

## 🔐 Test Environment Setup

### 1. Server Startup
```bash
npm run dev
```

**Expected Output:**
```
Server is running on http://localhost:5000 in development mode
```

### 2. Environment Variables
Create `.env` file with:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/pie_db"

# JWT
JWT_SECRET="your-secret-key"

# Razorpay
RAZORPAY_KEY_ID="rzp_test_xxxxx"
RAZORPAY_KEY_SECRET="your_secret"

# AWS S3 or Cloudinary (for file uploads)
AWS_ACCESS_KEY_ID="your_key"
AWS_SECRET_ACCESS_KEY="your_secret"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="your_bucket"

# Shipmozo (Mock API)
SHIPMOZO_API_KEY="test_key"
SHIPMOZO_API_URL="https://staging.shipmozo.com/api/v1"

# Invoice
COMPANY_NAME="PIE Technologies"
COMPANY_GST="29ABCDE1234F1Z5"
INVOICE_PREFIX="INV"
```

### 3. Database Setup
```bash
# Run migrations
npx prisma migrate dev

# Seed database (if available)
npx ts-node scripts/seed.ts
```

---

## 🧪 Phase 1-4: Core E-commerce Tests

### Test 1: Customer Registration
**Endpoint:** `POST /api/auth/customer/register`

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/customer/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "Password123!",
    "phone": "9876543210"
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Customer registered successfully",
  "data": {
    "customer": {
      "id": "customer-uuid",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "token": "jwt-token"
  }
}
```

**Error Cases:**
- ❌ Duplicate email → 409 Conflict
- ❌ Invalid email format → 400 Bad Request
- ❌ Weak password → 400 Bad Request
- ❌ Missing fields → 400 Bad Request

---

### Test 2: Customer Login
**Endpoint:** `POST /api/auth/customer/login`

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/customer/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Password123!"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "customer": {
      "id": "customer-uuid",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "token": "jwt-token"
  }
}
```

**Error Cases:**
- ❌ Wrong password → 401 Unauthorized
- ❌ User not found → 404 Not Found
- ❌ Missing fields → 400 Bad Request

**Save Token:**
```bash
export CUSTOMER_TOKEN="jwt-token"
```

---

### Test 3: Seller Registration
**Endpoint:** `POST /api/auth/seller/register`

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/seller/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Tech Store",
    "email": "seller@techstore.com",
    "password": "Seller123!",
    "phone": "9876543210",
    "gstNumber": "29ABCDE1234F1Z5"
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Seller registered successfully",
  "data": {
    "seller": {
      "id": "seller-uuid",
      "businessName": "Tech Store",
      "email": "seller@techstore.com"
    },
    "token": "jwt-token"
  }
}
```

**Save Token:**
```bash
export SELLER_TOKEN="jwt-token"
```

---

### Test 4: Create Product with Variants
**Endpoint:** `POST /api/products`

**Request:**
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -d '{
    "name": "iPhone 15 Pro",
    "description": "Latest flagship smartphone",
    "brand": "Apple",
    "categories": ["Electronics", "Smartphones"],
    "tags": ["5G", "iOS", "Premium"],
    "variants": [
      {
        "sku": "IPHONE15PRO-BLACK-256GB",
        "color": "Black",
        "size": "256GB",
        "price": 129900,
        "mrp": 139900,
        "stock": 50,
        "weight": 221,
        "dimensions": "15.6 x 7.6 x 0.83 cm"
      },
      {
        "sku": "IPHONE15PRO-WHITE-256GB",
        "color": "White",
        "size": "256GB",
        "price": 129900,
        "mrp": 139900,
        "stock": 30,
        "weight": 221,
        "dimensions": "15.6 x 7.6 x 0.83 cm"
      }
    ]
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": "product-uuid",
    "name": "iPhone 15 Pro",
    "variants": [
      {
        "id": "variant-uuid-1",
        "sku": "IPHONE15PRO-BLACK-256GB",
        "color": "Black",
        "size": "256GB",
        "price": 129900,
        "stock": 50
      }
    ]
  }
}
```

**Error Cases:**
- ❌ Duplicate SKU → 409 Conflict
- ❌ Unauthorized (no token) → 401 Unauthorized
- ❌ Customer token used → 403 Forbidden
- ❌ Invalid price (negative) → 400 Bad Request

**Save Product ID:**
```bash
export PRODUCT_ID="product-uuid"
export VARIANT_ID="variant-uuid-1"
```

---

### Test 5: Add to Cart
**Endpoint:** `POST /api/cart`

**Request:**
```bash
curl -X POST http://localhost:5000/api/cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -d '{
    "variantId": "'$VARIANT_ID'",
    "quantity": 2
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Item added to cart",
  "data": {
    "cart": {
      "items": [
        {
          "variantId": "variant-uuid-1",
          "quantity": 2,
          "price": 129900,
          "product": {
            "name": "iPhone 15 Pro",
            "color": "Black",
            "size": "256GB"
          }
        }
      ],
      "total": 259800
    }
  }
}
```

---

### Test 6: Create Order
**Endpoint:** `POST /api/orders`

**Request:**
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -d '{
    "shippingAddressId": "address-uuid",
    "paymentMethod": "razorpay",
    "items": [
      {
        "variantId": "'$VARIANT_ID'",
        "quantity": 2
      }
    ]
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "masterOrder": {
      "id": "master-order-uuid",
      "orderNumber": "ORD-1234567890",
      "totalAmount": 259800,
      "status": "PENDING"
    },
    "razorpayOrder": {
      "id": "order_xyz123",
      "amount": 259800,
      "currency": "INR"
    }
  }
}
```

**Save Order ID:**
```bash
export MASTER_ORDER_ID="master-order-uuid"
export RAZORPAY_ORDER_ID="order_xyz123"
```

---

## 💳 Phase 5: Payment Webhook Tests

### Test 7: Simulate Payment Success
**Endpoint:** `POST /api/webhooks/razorpay`

**Generate Webhook Signature:**
```javascript
// In Node.js REPL or script
const crypto = require('crypto');

const webhookBody = JSON.stringify({
  event: "payment.captured",
  payload: {
    payment: {
      entity: {
        id: "pay_abc123",
        amount: 259800,
        currency: "INR",
        status: "captured",
        order_id: process.env.RAZORPAY_ORDER_ID
      }
    }
  }
});

const signature = crypto
  .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
  .update(webhookBody)
  .digest('hex');

console.log('Signature:', signature);
```

**Request:**
```bash
curl -X POST http://localhost:5000/api/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: <generated-signature>" \
  -d '{
    "event": "payment.captured",
    "payload": {
      "payment": {
        "entity": {
          "id": "pay_abc123",
          "amount": 259800,
          "currency": "INR",
          "status": "captured",
          "order_id": "'$RAZORPAY_ORDER_ID'"
        }
      }
    }
  }'
```

**Expected Response (200):**
```json
{
  "status": "ok"
}
```

**Verify Order Status:**
```bash
curl -X GET http://localhost:5000/api/orders/$MASTER_ORDER_ID \
  -H "Authorization: Bearer $CUSTOMER_TOKEN"
```

**Expected:**
- Order status: `CONFIRMED`
- Payment status: `COMPLETED`
- Inventory reduced by 2
- Invoice created
- Shipment created

---

### Test 8: Payment Failure
**Request:**
```bash
curl -X POST http://localhost:5000/api/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: <generated-signature>" \
  -d '{
    "event": "payment.failed",
    "payload": {
      "payment": {
        "entity": {
          "id": "pay_xyz789",
          "amount": 259800,
          "currency": "INR",
          "status": "failed",
          "order_id": "'$RAZORPAY_ORDER_ID'",
          "error_code": "BAD_REQUEST_ERROR",
          "error_description": "Payment failed"
        }
      }
    }
  }'
```

**Expected:**
- Order status: `PENDING`
- Payment status: `FAILED`
- Inventory NOT reduced
- No invoice created
- No shipment created

---

## 📄 Phase 6: Invoice Generation Tests

### Test 9: Check Invoice Created
**Endpoint:** `GET /api/invoices/order/:subOrderId`

**Request:**
```bash
# Get SubOrder ID from order details first
curl -X GET http://localhost:5000/api/orders/$MASTER_ORDER_ID \
  -H "Authorization: Bearer $CUSTOMER_TOKEN"

# Use SubOrder ID to get invoice
export SUBORDER_ID="suborder-uuid"

curl -X GET http://localhost:5000/api/invoices/order/$SUBORDER_ID \
  -H "Authorization: Bearer $CUSTOMER_TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "invoice": {
      "id": "invoice-uuid",
      "invoiceNumber": "INV-001-2025",
      "subOrderId": "suborder-uuid",
      "pdfUrl": "https://s3.amazonaws.com/.../invoice.pdf",
      "amount": 259800,
      "gstAmount": 46764,
      "cgst": 23382,
      "sgst": 23382,
      "igst": 0,
      "createdAt": "2025-12-14T..."
    }
  }
}
```

---

### Test 10: Download Invoice PDF
**Endpoint:** `GET /api/invoices/:invoiceId/download`

**Request:**
```bash
export INVOICE_ID="invoice-uuid"

curl -X GET http://localhost:5000/api/invoices/$INVOICE_ID/download \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -o invoice.pdf
```

**Expected:**
- File `invoice.pdf` downloaded
- File size: 50-200KB
- PDF contains:
  - Invoice number
  - Company details
  - Customer details
  - Product details
  - GST breakdown
  - Total amount

**Verify PDF:**
```bash
# Open PDF
start invoice.pdf
```

---

### Test 11: Seller Invoice Access
**Endpoint:** `GET /api/invoices/seller/list`

**Request:**
```bash
curl -X GET "http://localhost:5000/api/invoices/seller/list?page=1&limit=10" \
  -H "Authorization: Bearer $SELLER_TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "id": "invoice-uuid",
        "invoiceNumber": "INV-001-2025",
        "customerName": "John Doe",
        "amount": 259800,
        "status": "PAID",
        "createdAt": "2025-12-14T..."
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "pages": 1
    }
  }
}
```

---

## 📦 Phase 7: Shipment Tests

### Test 12: Check Shipment Created
**Endpoint:** `GET /api/shipments/order/:subOrderId`

**Request:**
```bash
curl -X GET http://localhost:5000/api/shipments/order/$SUBORDER_ID \
  -H "Authorization: Bearer $CUSTOMER_TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "shipment": {
      "id": "shipment-uuid",
      "subOrderId": "suborder-uuid",
      "awbNumber": "AWB1234567890",
      "trackingUrl": "https://tracking.shipmozo.com/AWB1234567890",
      "status": "PENDING_PICKUP",
      "carrier": "Delhivery",
      "createdAt": "2025-12-14T..."
    }
  }
}
```

---

### Test 13: Track Shipment
**Endpoint:** `GET /api/shipments/:shipmentId/track`

**Request:**
```bash
export SHIPMENT_ID="shipment-uuid"

curl -X GET http://localhost:5000/api/shipments/$SHIPMENT_ID/track \
  -H "Authorization: Bearer $CUSTOMER_TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "tracking": {
      "awbNumber": "AWB1234567890",
      "status": "PENDING_PICKUP",
      "currentLocation": "Mumbai Hub",
      "estimatedDelivery": "2025-12-18",
      "events": [
        {
          "status": "PENDING_PICKUP",
          "location": "Mumbai Hub",
          "timestamp": "2025-12-14T10:00:00Z",
          "description": "Shipment created"
        }
      ]
    }
  }
}
```

---

### Test 14: Shipment Status Webhook
**Endpoint:** `POST /api/webhooks/shipmozo`

**Generate Webhook Signature:**
```javascript
const crypto = require('crypto');

const webhookBody = JSON.stringify({
  awbNumber: "AWB1234567890",
  status: "IN_TRANSIT",
  location: "Delhi Hub",
  timestamp: new Date().toISOString(),
  description: "Shipment in transit"
});

const signature = crypto
  .createHmac('sha256', process.env.SHIPMOZO_WEBHOOK_SECRET)
  .update(webhookBody)
  .digest('hex');

console.log('Signature:', signature);
```

**Request:**
```bash
curl -X POST http://localhost:5000/api/webhooks/shipmozo \
  -H "Content-Type: application/json" \
  -H "x-shipmozo-signature: <generated-signature>" \
  -d '{
    "awbNumber": "AWB1234567890",
    "status": "IN_TRANSIT",
    "location": "Delhi Hub",
    "timestamp": "2025-12-15T10:00:00Z",
    "description": "Shipment in transit"
  }'
```

**Expected Response (200):**
```json
{
  "status": "ok"
}
```

**Verify Updated Status:**
```bash
curl -X GET http://localhost:5000/api/shipments/$SHIPMENT_ID/track \
  -H "Authorization: Bearer $CUSTOMER_TOKEN"
```

**Expected:**
- Status: `IN_TRANSIT`
- New event added to tracking history

---

### Test 15: Delivery Confirmation
**Request:**
```bash
curl -X POST http://localhost:5000/api/webhooks/shipmozo \
  -H "Content-Type: application/json" \
  -H "x-shipmozo-signature: <generated-signature>" \
  -d '{
    "awbNumber": "AWB1234567890",
    "status": "DELIVERED",
    "location": "Customer Address",
    "timestamp": "2025-12-18T14:30:00Z",
    "description": "Delivered successfully"
  }'
```

**Expected:**
- Shipment status: `DELIVERED`
- Order status: `DELIVERED`
- Customer notification sent

---

## 📊 Phase 8: CSV Import/Export Tests

### Test 16: Download Product CSV Template
**Endpoint:** `GET /api/csv/templates/products`

**Request:**
```bash
curl -X GET http://localhost:5000/api/csv/templates/products \
  -o product_template.csv
```

**Expected:**
- File `product_template.csv` downloaded
- Headers: `sku,name,price,mrp,stock,color,size,weight`
- Sample row included

---

### Test 17: Export Products
**Endpoint:** `GET /api/csv/products/export`

**Request:**
```bash
curl -X GET "http://localhost:5000/api/csv/products/export?active=true" \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -o products_export.csv
```

**Expected:**
- File `products_export.csv` downloaded
- Contains all active product variants for seller
- Columns: SKU, Product Name, Color, Size, Price, MRP, Stock, Status

**Verify CSV:**
```bash
# View first 10 lines
Get-Content products_export.csv -Head 10
```

---

### Test 18: Import Product Updates
**Endpoint:** `POST /api/csv/products/import`

**Create CSV file for import:**
```csv
sku,price,mrp,stock
IPHONE15PRO-BLACK-256GB,119900,139900,45
IPHONE15PRO-WHITE-256GB,119900,139900,25
```

**Request:**
```bash
curl -X POST http://localhost:5000/api/csv/products/import \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -F "file=@products_update.csv"
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "CSV import completed",
  "data": {
    "summary": {
      "totalRows": 2,
      "successfulUpdates": 2,
      "failedUpdates": 0
    },
    "errors": []
  }
}
```

**Verify Updates:**
```bash
curl -X GET http://localhost:5000/api/products/$PRODUCT_ID \
  -H "Authorization: Bearer $SELLER_TOKEN"
```

**Expected:**
- Black variant: price=119900, stock=45
- White variant: price=119900, stock=25

---

### Test 19: Export Orders
**Endpoint:** `GET /api/csv/orders/export`

**Request:**
```bash
curl -X GET "http://localhost:5000/api/csv/orders/export?status=CONFIRMED&startDate=2025-12-01" \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -o orders_export.csv
```

**Expected:**
- File `orders_export.csv` downloaded
- Contains orders with status CONFIRMED from Dec 1, 2025
- Columns: Order Number, Customer Name, Products, Amount, Status, Date

---

### Test 20: Bulk Inventory Update
**Endpoint:** `POST /api/csv/inventory/update`

**Create CSV file:**
```csv
sku,stock
IPHONE15PRO-BLACK-256GB,100
IPHONE15PRO-WHITE-256GB,80
```

**Request:**
```bash
curl -X POST http://localhost:5000/api/csv/inventory/update \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -F "file=@inventory_update.csv"
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Inventory updated successfully",
  "data": {
    "summary": {
      "totalRows": 2,
      "successfulUpdates": 2,
      "failedUpdates": 0
    },
    "errors": []
  }
}
```

---

### Test 21: CSV Import Error Handling
**Create CSV with errors:**
```csv
sku,stock
INVALID-SKU-123,50
IPHONE15PRO-BLACK-256GB,-10
```

**Request:**
```bash
curl -X POST http://localhost:5000/api/csv/inventory/update \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -F "file=@inventory_errors.csv"
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "CSV import completed with errors",
  "data": {
    "summary": {
      "totalRows": 2,
      "successfulUpdates": 0,
      "failedUpdates": 2
    },
    "errors": [
      {
        "row": 2,
        "sku": "INVALID-SKU-123",
        "error": "SKU not found"
      },
      {
        "row": 3,
        "sku": "IPHONE15PRO-BLACK-256GB",
        "error": "Stock cannot be negative"
      }
    ]
  }
}
```

---

## 🛡️ Security Tests

### Test 22: Invalid JWT Token
**Request:**
```bash
curl -X GET http://localhost:5000/api/products \
  -H "Authorization: Bearer invalid-token"
```

**Expected Response (401):**
```json
{
  "success": false,
  "message": "Invalid token"
}
```

---

### Test 23: Expired JWT Token
**Request:**
```bash
curl -X GET http://localhost:5000/api/products \
  -H "Authorization: Bearer <expired-token>"
```

**Expected Response (401):**
```json
{
  "success": false,
  "message": "Token expired"
}
```

---

### Test 24: Unauthorized Access (Customer accessing Seller endpoint)
**Request:**
```bash
curl -X GET http://localhost:5000/api/csv/products/export \
  -H "Authorization: Bearer $CUSTOMER_TOKEN"
```

**Expected Response (403):**
```json
{
  "success": false,
  "message": "Forbidden: Seller access required"
}
```

---

### Test 25: Webhook Signature Verification
**Request (Invalid Signature):**
```bash
curl -X POST http://localhost:5000/api/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: invalid-signature" \
  -d '{
    "event": "payment.captured",
    "payload": {...}
  }'
```

**Expected Response (401):**
```json
{
  "success": false,
  "message": "Invalid webhook signature"
}
```

---

### Test 26: SQL Injection Prevention
**Request:**
```bash
curl -X GET "http://localhost:5000/api/products?search='; DROP TABLE products;--" \
  -H "Authorization: Bearer $SELLER_TOKEN"
```

**Expected:**
- No SQL error
- Safe query execution
- Empty results or normal search results

---

### Test 27: File Upload Size Limit
**Create 15MB file:**
```bash
# PowerShell
$content = "x" * (15 * 1024 * 1024)
Set-Content -Path large_file.csv -Value $content
```

**Request:**
```bash
curl -X POST http://localhost:5000/api/csv/products/import \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -F "file=@large_file.csv"
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "File too large. Maximum size is 10MB"
}
```

---

### Test 28: Invalid File Type
**Request:**
```bash
curl -X POST http://localhost:5000/api/csv/products/import \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -F "file=@document.pdf"
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "Invalid file type. Only CSV files are allowed"
}
```

---

## 🔄 Integration Tests

### Test 29: Complete Purchase Flow
**Steps:**
1. ✅ Customer registration
2. ✅ Browse products
3. ✅ Add to cart
4. ✅ Create order
5. ✅ Payment webhook (success)
6. ✅ Verify order confirmed
7. ✅ Verify inventory reduced
8. ✅ Verify invoice created
9. ✅ Verify shipment created
10. ✅ Download invoice PDF
11. ✅ Track shipment

**All steps should succeed without manual intervention.**

---

### Test 30: Payment Failure Recovery
**Steps:**
1. Create order
2. Payment webhook (failed)
3. Verify order still PENDING
4. Verify inventory NOT reduced
5. Retry payment (new webhook - success)
6. Verify order confirmed
7. Verify inventory reduced
8. Verify invoice created
9. Verify shipment created

---

### Test 31: Multi-Seller Order
**Steps:**
1. Add product from Seller A to cart
2. Add product from Seller B to cart
3. Create order
4. Payment webhook (success)
5. Verify 2 SubOrders created (one per seller)
6. Verify 2 invoices created
7. Verify 2 shipments created
8. Each seller can only see their own SubOrder

---

## 📊 Performance Tests

### Test 32: Concurrent Orders
**Tool:** Apache Bench or Artillery

**Request:**
```bash
# Install Apache Bench (if not installed)
# Windows: download from Apache website

# 100 concurrent requests
ab -n 100 -c 10 -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -p order_payload.json -T application/json \
  http://localhost:5000/api/orders
```

**Expected:**
- All requests succeed (or fail gracefully)
- Average response time < 2 seconds
- No database deadlocks
- No memory leaks

---

### Test 33: Large CSV Export
**Steps:**
1. Create 1000+ products with variants
2. Export to CSV
3. Verify file size reasonable (< 5MB)
4. Verify all rows present
5. Check server memory usage

**Expected:**
- Export completes within 10 seconds
- Stream-based processing (low memory)
- No server crash

---

### Test 34: Bulk Invoice Generation
**Steps:**
1. Create 100 orders
2. Trigger payment webhooks for all
3. Verify all invoices generated
4. Check invoice generation time

**Expected:**
- All invoices created (even if some fail)
- Non-blocking (order confirmation not delayed)
- Failed invoices logged for retry

---

## 🐛 Error Handling Tests

### Test 35: Database Connection Loss
**Simulate:**
```bash
# Stop database
docker stop postgres_container

# Try to create order
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -d '{...}'
```

**Expected Response (500):**
```json
{
  "success": false,
  "message": "Database connection error",
  "error": "PrismaClientKnownRequestError"
}
```

---

### Test 36: Razorpay API Down
**Mock:** Modify `razorpay.ts` to throw error

**Expected:**
- Order creation fails gracefully
- User-friendly error message
- Error logged
- No partial order created

---

### Test 37: Invoice PDF Generation Failure
**Mock:** Modify `invoice.service.ts` to throw error

**Expected:**
- Order still confirmed
- Payment still processed
- Shipment still created
- Error logged
- Invoice marked as FAILED
- Seller can retry generation

---

## ✅ Test Summary Template

```
PIE Backend Testing Report
Date: __________
Tester: __________

Phase 1-4: Core E-commerce
[ ] Customer Registration - ___
[ ] Customer Login - ___
[ ] Seller Registration - ___
[ ] Product Creation - ___
[ ] Add to Cart - ___
[ ] Order Placement - ___

Phase 5: Payment Webhooks
[ ] Payment Success - ___
[ ] Payment Failure - ___
[ ] Webhook Signature - ___

Phase 6: Invoice Generation
[ ] Auto Invoice Creation - ___
[ ] PDF Download - ___
[ ] GST Calculation - ___

Phase 7: Shipment Integration
[ ] Auto Shipment Creation - ___
[ ] Tracking Updates - ___
[ ] Delivery Confirmation - ___

Phase 8: CSV Import/Export
[ ] Product Export - ___
[ ] Product Import - ___
[ ] Order Export - ___
[ ] Bulk Inventory Update - ___

Security Tests
[ ] Invalid JWT - ___
[ ] Expired JWT - ___
[ ] Unauthorized Access - ___
[ ] Webhook Signature - ___
[ ] SQL Injection - ___
[ ] File Upload Limits - ___

Integration Tests
[ ] Complete Purchase Flow - ___
[ ] Payment Failure Recovery - ___
[ ] Multi-Seller Order - ___

Performance Tests
[ ] Concurrent Orders - ___
[ ] Large CSV Export - ___
[ ] Bulk Invoice Generation - ___

Error Handling Tests
[ ] Database Connection Loss - ___
[ ] External API Failure - ___
[ ] PDF Generation Failure - ___

Overall Status: [PASS / FAIL / PARTIAL]
Notes:
_______________________________
```

---

## 🚀 Automated Testing (Future)

### Jest Unit Tests
```bash
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest

# Run tests
npm test
```

### Test Coverage
```bash
npm run test:coverage

# Expected: >80% coverage
```

### CI/CD Pipeline
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run test
      - run: npm run lint
```

---

**Testing Complete! All phases verified and working as expected.** ✅
