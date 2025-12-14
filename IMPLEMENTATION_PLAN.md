# 🚀 Shopify-Level Multi-Vendor Platform Implementation Plan

## 📋 Executive Summary

Transforming PIE Backend into a complete Shopify-level multi-vendor marketplace by enhancing existing modules with:
- Multi-axis variant system (Size × Color × Material combinations)
- Order splitting (Master Order → Sub-Orders per seller)
- Payment webhooks (Razorpay + Cashfree)
- Shipmozo shipping integration
- GST-compliant invoicing
- Return/Refund workflows
- CSV bulk operations

---

## 🎯 Implementation Phases

### **Phase 1: Database Schema Enhancement** (Day 1-2)
**Status:** 🟡 In Progress

#### Tasks:
- [ ] Create new models for enhanced features
- [ ] Add ProductOption, ProductOptionValue models
- [ ] Add ProductVariant model (Shopify-style)
- [ ] Add MasterOrder, SubOrder, SubOrderItem models
- [ ] Add Return, ReturnItem, Refund models
- [ ] Add CommissionRule model
- [ ] Add ShipmozoShipment, ShipmentEvent models
- [ ] Add Invoice model
- [ ] Add ImportJob model for CSV operations
- [ ] Add Global Attributes system
- [ ] Run migration to update database

#### Deliverables:
- ✅ `enhanced-schema.prisma` - New models designed
- [ ] Updated main `schema.prisma`
- [ ] Migration files
- [ ] ERD diagram

---

### **Phase 2: Enhanced Product & Variant System** (Day 3-5)
**Status:** ⚪ Not Started

#### A. Product Option Management
```typescript
POST   /api/v1/seller/products/{id}/options
GET    /api/v1/seller/products/{id}/options
PUT    /api/v1/seller/products/{id}/options/{optionId}
DELETE /api/v1/seller/products/{id}/options/{optionId}
```

#### B. Variant Generation & Management
```typescript
POST   /api/v1/seller/products/{id}/variants/generate  // Auto-generate from options
GET    /api/v1/seller/products/{id}/variants
POST   /api/v1/seller/products/{id}/variants
PUT    /api/v1/seller/products/{id}/variants/{variantId}
DELETE /api/v1/seller/products/{id}/variants/{variantId}
POST   /api/v1/seller/products/{id}/variants/{variantId}/images
```

#### C. Enhanced Product Creation
```typescript
POST   /api/v1/seller/products  // With full Shopify fields
PUT    /api/v1/seller/products/{id}
GET    /api/v1/seller/products
GET    /api/v1/seller/products/{id}
DELETE /api/v1/seller/products/{id}  // Soft delete
```

#### Features:
- Multi-axis variant combinations
- Variant-specific pricing, inventory, images
- SKU uniqueness per seller
- Slug generation and validation
- Brand, HSN code, GST rate
- Global + custom attributes
- Bulk variant operations

#### Deliverables:
- [ ] Product Option Controller
- [ ] Product Variant Controller
- [ ] Enhanced Product Controller
- [ ] Product Option Service
- [ ] Variant Generation Service
- [ ] Validation schemas (Zod)
- [ ] Unit tests

---

### **Phase 3: Order Splitting System** (Day 6-8)
**Status:** ⚪ Not Started

#### A. Master Order Creation
```typescript
POST   /api/v1/customer/checkout/create-master-order
```

**Flow:**
1. Customer cart contains items from multiple sellers
2. System creates ONE master order
3. Automatically splits into sub-orders per seller
4. Each sub-order has its own sub-order number
5. Calculate commission per sub-order

#### B. Sub-Order APIs (Seller)
```typescript
GET    /api/v1/seller/orders                           // List all sub-orders
GET    /api/v1/seller/orders/{subOrderId}             // Sub-order details
POST   /api/v1/seller/orders/{subOrderId}/accept      // Accept order
POST   /api/v1/seller/orders/{subOrderId}/fulfill     // Mark as fulfilled
POST   /api/v1/seller/orders/{subOrderId}/ship        // Ship with tracking
POST   /api/v1/seller/orders/{subOrderId}/cancel      // Cancel order
GET    /api/v1/seller/orders/{subOrderId}/invoice     // Get invoice PDF
```

#### C. Master Order APIs (Customer)
```typescript
GET    /api/v1/customer/orders                        // List master orders
GET    /api/v1/customer/orders/{masterOrderId}        // Master order details
POST   /api/v1/customer/orders/{masterOrderId}/cancel // Cancel entire order
```

#### D. Admin APIs
```typescript
GET    /api/v1/admin/orders                           // All orders
GET    /api/v1/admin/orders/{masterOrderId}           // Any order details
GET    /api/v1/admin/orders/sub/{subOrderId}          // Sub-order details
```

#### Features:
- Automatic order splitting logic
- Commission calculation (global + category-level)
- Seller payout calculation
- Order status aggregation
- Partial fulfillment support
- Order search & filters

#### Deliverables:
- [ ] Order Splitting Service
- [ ] Master Order Controller
- [ ] Sub-Order Controller (Seller)
- [ ] Commission Service
- [ ] Order Status Aggregation Service
- [ ] Validation schemas
- [ ] Unit tests

---

### **Phase 4: Payment Webhooks** (Day 9-10)
**Status:** ⚪ Not Started

#### A. Razorpay Webhooks
```typescript
POST   /api/v1/webhooks/razorpay/payment
POST   /api/v1/webhooks/razorpay/refund
```

#### B. Cashfree Webhooks
```typescript
POST   /api/v1/webhooks/cashfree/payment
POST   /api/v1/webhooks/cashfree/refund
```

#### Features:
- Signature verification
- Duplicate webhook handling
- Payment status updates
- Async processing with queue
- Webhook retry logic
- Failure reconciliation

#### Deliverables:
- [ ] Webhook Controller
- [ ] Signature Verification Middleware
- [ ] Payment Status Update Service
- [ ] Webhook Logger
- [ ] Integration tests

---

### **Phase 5: Shipmozo Integration** (Day 11-13)
**Status:** ⚪ Not Started

#### A. Shipmozo APIs
```typescript
POST   /api/v1/seller/shipmozo/create-shipment        // Create shipment
POST   /api/v1/seller/shipmozo/generate-label         // Generate label
GET    /api/v1/seller/shipmozo/track/{awb}            // Track shipment
POST   /api/v1/seller/shipmozo/cancel/{shipmentId}    // Cancel shipment
GET    /api/v1/seller/shipmozo/serviceable/{pincode}  // Check serviceability
```

#### B. Shipmozo Webhooks
```typescript
POST   /api/v1/webhooks/shipmozo/tracking             // Tracking updates
```

#### Features:
- Label generation
- AWB number allocation
- Tracking updates
- Delivery status mapping
- RTO handling
- Rate calculation
- Bulk label generation

#### Deliverables:
- [ ] Shipmozo API Client
- [ ] Shipmozo Controller
- [ ] Shipment Service
- [ ] Webhook Handler
- [ ] Status Mapping Service
- [ ] Integration tests

---

### **Phase 6: GST Invoice Generation** (Day 14-16)
**Status:** ⚪ Not Started

#### A. Invoice APIs
```typescript
POST   /api/v1/invoices/master/{masterOrderId}        // Generate master invoice
POST   /api/v1/invoices/sub-order/{subOrderId}        // Generate sub-order invoice
GET    /api/v1/invoices/{invoiceId}/pdf               // Download PDF
GET    /api/v1/invoices/{invoiceId}/send              // Email invoice
```

#### Features:
- Master invoice (customer view)
- Sub-order invoice (seller view)
- Packing slip generation
- IGST/CGST/SGST calculation
- GST-compliant format
- Invoice numbering sequence
- PDF generation (Puppeteer)
- Email delivery

#### Deliverables:
- [ ] Invoice Service
- [ ] Invoice Controller
- [ ] GST Calculation Service
- [ ] PDF Template (HTML)
- [ ] PDF Generation Service
- [ ] Email Service Integration
- [ ] Unit tests

---

### **Phase 7: Return & Refund System** (Day 17-19)
**Status:** ⚪ Not Started

#### A. Return APIs
```typescript
POST   /api/v1/customer/returns/create                // Customer creates return
GET    /api/v1/customer/returns                       // List customer returns
GET    /api/v1/customer/returns/{returnId}            // Return details

POST   /api/v1/seller/returns/{returnId}/approve      // Seller approves
POST   /api/v1/seller/returns/{returnId}/reject       // Seller rejects
POST   /api/v1/seller/returns/{returnId}/received     // Mark as received
GET    /api/v1/seller/returns                         // List seller returns
```

#### B. Refund APIs
```typescript
POST   /api/v1/seller/refunds/initiate                // Initiate refund
GET    /api/v1/seller/refunds/{refundId}/status       // Check refund status
GET    /api/v1/admin/refunds                          // All refunds
```

#### Features:
- Line-item returns
- Return reasons
- Approval workflow
- Inventory restock on return
- Refund processing
- Partial refunds
- Refund to original payment method
- Store credit option

#### Deliverables:
- [ ] Return Controller (Customer)
- [ ] Return Controller (Seller)
- [ ] Refund Controller
- [ ] Return Service
- [ ] Refund Service
- [ ] Inventory Adjustment Service
- [ ] Payment Gateway Refund Integration
- [ ] Unit tests

---

### **Phase 8: CSV Import/Export** (Day 20-22)
**Status:** ⚪ Not Started

#### A. Import APIs
```typescript
POST   /api/v1/seller/products/import                 // Upload CSV
GET    /api/v1/seller/products/import/{jobId}         // Check import status
GET    /api/v1/seller/products/import/{jobId}/errors  // Download error log
GET    /api/v1/seller/products/import-template        // Download CSV template
```

#### B. Export APIs
```typescript
POST   /api/v1/seller/products/export                 // Export products
GET    /api/v1/seller/products/export/{jobId}         // Download export file
```

#### Features:
- CSV parsing and validation
- Bulk product creation
- Bulk variant creation
- SKU uniqueness validation
- Error reporting
- Async processing with job queue
- Download error logs
- CSV templates

#### Deliverables:
- [ ] CSV Parser Service
- [ ] Import Job Service
- [ ] Export Job Service
- [ ] Validation Service
- [ ] Import Controller
- [ ] Export Controller
- [ ] CSV Templates
- [ ] Unit tests

---

### **Phase 9: Global Attributes System** (Day 23-24)
**Status:** ⚪ Not Started

#### A. Admin APIs
```typescript
POST   /api/v1/admin/attributes                       // Create attribute
GET    /api/v1/admin/attributes                       // List attributes
PUT    /api/v1/admin/attributes/{id}                  // Update attribute
DELETE /api/v1/admin/attributes/{id}                  // Delete attribute
POST   /api/v1/admin/categories/{id}/attributes       // Link to category
```

#### B. Seller APIs
```typescript
GET    /api/v1/seller/attributes/category/{id}        // Get category attributes
POST   /api/v1/seller/products/{id}/attributes        // Set product attributes
```

#### Features:
- Global attribute definitions
- Category-level attributes
- Product-level custom attributes
- Attribute inheritance
- Input type validation
- Required field enforcement

#### Deliverables:
- [ ] Attribute Controller (Admin)
- [ ] Attribute Controller (Seller)
- [ ] Attribute Service
- [ ] Validation Service
- [ ] Unit tests

---

### **Phase 10: Commission & Analytics** (Day 25-26)
**Status:** ⚪ Not Started

#### A. Commission APIs
```typescript
POST   /api/v1/admin/commissions                      // Create commission rule
GET    /api/v1/admin/commissions                      // List rules
PUT    /api/v1/admin/commissions/{id}                 // Update rule
DELETE /api/v1/admin/commissions/{id}                 // Delete rule
```

#### B. Analytics APIs
```typescript
GET    /api/v1/seller/analytics/dashboard             // Seller dashboard
GET    /api/v1/seller/analytics/sales                 // Sales analytics
GET    /api/v1/seller/analytics/products              // Product performance
GET    /api/v1/admin/analytics/platform               // Platform analytics
```

#### Features:
- Global commission rules
- Category-specific commission
- Seller-specific commission
- Commission calculation per order
- Seller payout calculation
- Sales reports
- Product performance metrics

#### Deliverables:
- [ ] Commission Controller
- [ ] Commission Service
- [ ] Analytics Controller
- [ ] Analytics Service
- [ ] Report Generation Service
- [ ] Unit tests

---

### **Phase 11: Enhanced API Features** (Day 27-28)
**Status:** ⚪ Not Started

#### A. Search & Filters
```typescript
GET    /api/v1/seller/products?search=&status=&category=&sort=
GET    /api/v1/seller/orders?status=&dateFrom=&dateTo=&sort=
```

#### B. Bulk Operations
```typescript
POST   /api/v1/seller/products/bulk-update            // Bulk price update
POST   /api/v1/seller/products/bulk-delete            // Bulk delete
POST   /api/v1/seller/variants/bulk-update            // Bulk inventory update
```

#### C. Media Library
```typescript
GET    /api/v1/seller/media                           // List all media
POST   /api/v1/seller/media/upload                    // Upload to library
DELETE /api/v1/seller/media/{id}                      // Delete from library
POST   /api/v1/seller/media/{id}/attach               // Attach to product
```

#### Deliverables:
- [ ] Search Service
- [ ] Filter Service
- [ ] Bulk Operations Service
- [ ] Media Library Service
- [ ] Controllers for all features
- [ ] Unit tests

---

### **Phase 12: Documentation & Testing** (Day 29-30)
**Status:** ⚪ Not Started

#### A. API Documentation
- [ ] OpenAPI/Swagger specification
- [ ] Postman collection update
- [ ] API usage examples
- [ ] Authentication guide
- [ ] Webhook documentation

#### B. Testing
- [ ] Unit tests for all services
- [ ] Integration tests for APIs
- [ ] End-to-end tests for critical flows
- [ ] Load testing
- [ ] Security testing

#### C. Deployment
- [ ] Environment configuration guide
- [ ] Database migration scripts
- [ ] Deployment checklist
- [ ] Monitoring setup
- [ ] Error tracking setup

#### Deliverables:
- [ ] Complete OpenAPI docs
- [ ] Updated Postman collection
- [ ] Test coverage report
- [ ] Deployment guide
- [ ] Production checklist

---

## 📊 Progress Tracking

### Overall Progress: 5% Complete

| Phase | Status | Progress | ETA |
|-------|--------|----------|-----|
| 1. Database Schema | 🟡 In Progress | 50% | Day 2 |
| 2. Product & Variants | ⚪ Not Started | 0% | Day 5 |
| 3. Order Splitting | ⚪ Not Started | 0% | Day 8 |
| 4. Payment Webhooks | ⚪ Not Started | 0% | Day 10 |
| 5. Shipmozo Integration | ⚪ Not Started | 0% | Day 13 |
| 6. Invoice Generation | ⚪ Not Started | 0% | Day 16 |
| 7. Return & Refund | ⚪ Not Started | 0% | Day 19 |
| 8. CSV Import/Export | ⚪ Not Started | 0% | Day 22 |
| 9. Global Attributes | ⚪ Not Started | 0% | Day 24 |
| 10. Commission & Analytics | ⚪ Not Started | 0% | Day 26 |
| 11. Enhanced Features | ⚪ Not Started | 0% | Day 28 |
| 12. Documentation & Testing | ⚪ Not Started | 0% | Day 30 |

---

## 🎯 Critical Path

**Must Complete First:**
1. Database Schema (Phase 1) ← **CURRENT**
2. Product & Variants (Phase 2)
3. Order Splitting (Phase 3)
4. Payment Webhooks (Phase 4)

**High Priority:**
5. Invoice Generation (Phase 6)
6. Shipmozo Integration (Phase 5)
7. Return & Refund (Phase 7)

**Medium Priority:**
8. CSV Import/Export (Phase 8)
9. Global Attributes (Phase 9)
10. Commission & Analytics (Phase 10)

---

## 🚀 Next Immediate Actions

1. **Complete `.env` setup** (Email + Razorpay)
2. **Merge enhanced schema** with existing schema
3. **Run database migration**
4. **Start Phase 2** - Product & Variant System

---

**Estimated Total Timeline: 30 days (6 weeks)**

**Ready to proceed? I'll start with completing Phase 1 (Database Schema).**
