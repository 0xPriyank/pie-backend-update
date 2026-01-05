# Product API Changes Summary

## Overview
The product creation endpoint has been completely updated to match the client's new requirements. The old format has been replaced (not versioned) with a new, more flexible format that supports variants with dynamic options.

---

## What Changed

### 🔴 OLD Format (Removed)
```json
{
  "name": "Product Name",
  "sku": "PROD-001",
  "categories": ["uuid-1", "uuid-2"],  // UUID array
  "colorId": "color-uuid",              // Required UUID
  "sizeId": "size-uuid",                // Required UUID
  "shortDescription": "Short desc",
  "description": "Long description",
  "price": 100,
  "discount": 10,                       // Percentage
  "stockAvailable": 50,                 // Direct stock number
  "tags": ["tag1", "tag2"]
}
```

### ✅ NEW Format (Current)
```json
{
  "title": "Product Name",               // Changed from "name"
  "sku": "PROD-001",
  "status": "draft",                     // NEW: "draft" | "active" | "archived"
  "category": "Toys & Games",            // Single string (not UUID array)
  "price": 100,
  "compareAtPrice": 120,                 // NEW: Original price for discount display
  "shortDescription": "Short desc",
  "description": "Long description",
  
  "inventory": {                         // NEW: Structured inventory
    "trackQuantity": true,
    "quantity": 50
  },
  
  "variants": [                          // NEW: Dynamic variants with options
    {
      "options": [
        { "name": "Size", "value": "S" },
        { "name": "Color", "value": "Black" }
      ],
      "price": 998,
      "quantity": 10
    },
    {
      "options": [
        { "name": "Size", "value": "M" },
        { "name": "Color", "value": "Red" }
      ],
      "price": 1200,
      "quantity": 5
    }
  ],
  
  "images": [                            // NEW: Direct URLs (not fileIds)
    {
      "url": "https://example.com/image1.jpg",
      "alt": "Product front view"
    }
  ],
  
  "weight": 10,                          // NEW: Product weight (grams)
  "dimensions": {                        // NEW: Product dimensions
    "length": 9,
    "width": 7,
    "height": 5
  },
  
  "tags": ["tag1", "tag2"]
}
```

---

## Key Differences

| Feature | OLD Format | NEW Format |
|---------|-----------|------------|
| **Product Name** | `name` (required) | `title` (required) |
| **Status** | ❌ Not available | ✅ `"draft"` \| `"active"` \| `"archived"` |
| **Category** | `categories` (UUID array) | `category` (string - auto-created if missing) |
| **Stock** | `stockAvailable` (number) | `inventory.quantity` + `inventory.trackQuantity` |
| **Compare Price** | ❌ Not available | ✅ `compareAtPrice` (for showing discounts) |
| **Variants** | Fixed via `colorId` & `sizeId` | Dynamic with any options (Size, Color, Material, etc.) |
| **Images** | Reference by `fileId` | Direct URLs in `images` array |
| **Weight** | ❌ Not available | ✅ `weight` (optional, in grams) |
| **Dimensions** | ❌ Not available | ✅ `dimensions` object (optional) |

---

## Variant System

### How Variants Work Now

1. **Options are auto-created** from your variants
   - If you send `{ "name": "Size", "value": "S" }`, the system creates a "Size" option with value "S"
   - Options are reused across variants (e.g., "Size: S" is created once, used in multiple variants)

2. **Variant SKUs are auto-generated**
   - Format: `{product-sku}-{option-values}`
   - Example: `TSHIRT-001-S-BLA-M-RED`

3. **Variant titles are auto-generated**
   - Format: `{value1} / {value2} / {value3}`
   - Example: `"S / Black"` or `"M / Red"`

4. **Each variant has its own**:
   - Price
   - Inventory/quantity
   - SKU (auto-generated)
   - Options (Size, Color, Material, etc.)

### Example Variant Creation

**Request:**
```json
{
  "variants": [
    {
      "options": [
        { "name": "Size", "value": "S" },
        { "name": "Color", "value": "Black" }
      ],
      "price": 998,
      "quantity": 10
    }
  ]
}
```

**Database Result:**
- **ProductOption** records created: `Size`, `Color`
- **ProductOptionValue** records: `S`, `Black`
- **ProductVariant** created with:
  - SKU: `PROD-001-S-BLA`
  - Title: `S / Black`
  - Price: 998
  - Inventory: 10
  - Links to option values

---

## Migration Guide

### If you have existing code using the OLD format:

1. **Change `name` to `title`**
   ```diff
   - "name": "My Product"
   + "title": "My Product"
   ```

2. **Replace `categories` UUID array with single `category` string**
   ```diff
   - "categories": ["uuid-1", "uuid-2"]
   + "category": "Toys & Games"
   ```
   ℹ️ The category will be auto-created if it doesn't exist

3. **Replace `stockAvailable` with `inventory` object**
   ```diff
   - "stockAvailable": 50
   + "inventory": {
   +   "trackQuantity": true,
   +   "quantity": 50
   + }
   ```

4. **Remove `colorId` and `sizeId`, use `variants` instead**
   ```diff
   - "colorId": "uuid-1",
   - "sizeId": "uuid-2"
   + "variants": [
   +   {
   +     "options": [
   +       { "name": "Size", "value": "M" },
   +       { "name": "Color", "value": "Blue" }
   +     ],
   +     "price": 100,
   +     "quantity": 50
   +   }
   + ]
   ```

5. **Add `status` field** (required)
   ```diff
   + "status": "active"  // or "draft" or "archived"
   ```

6. **Replace file IDs with direct image URLs**
   ```diff
   - (Upload files separately and reference by fileId)
   + "images": [
   +   { "url": "https://...", "alt": "Product image" }
   + ]
   ```

7. **Optional: Add new fields**
   ```json
   "compareAtPrice": 150,
   "weight": 500,
   "dimensions": {
     "length": 10,
     "width": 8,
     "height": 3
   }
   ```

---

## Files Modified

### 1. **Schema** ([src/schemas/product.schema.ts](src/schemas/product.schema.ts))
- ✅ Updated `createProductSchema` to new format
- ❌ Removed `createProductSchemaV1` (old format)
- ❌ Removed `createProductSchemaV2` (temporary)

### 2. **Service** ([src/services/seller/product.service.ts](src/services/seller/product.service.ts))
- ✅ Replaced `createProduct` function with new implementation
- ❌ Removed `createProductV2` function
- Features:
  - Auto-creates categories by name/slug
  - Auto-creates tags
  - Dynamically creates ProductOption and ProductOptionValue
  - Auto-generates variant SKUs and titles
  - Stores image URLs directly

### 3. **Controller** ([src/controllers/seller/product.controller.ts](src/controllers/seller/product.controller.ts))
- ✅ Kept `createSellerProduct` (now uses new format)
- ❌ Removed `createSellerProductV2`
- ❌ Removed V2 imports

### 4. **Routes** ([src/routes/seller/product.routes.ts](src/routes/seller/product.routes.ts))
- ✅ `POST /seller/product` - Now accepts new format
- ❌ Removed `POST /seller/product/v2`
- ❌ Removed V2 imports and routes

---

## API Endpoint

**Endpoint:** `POST /api/v1/seller/product`

**Headers:**
```
Authorization: Bearer <seller-jwt-token>
Content-Type: application/json
```

**Request Body Example:**
```json
{
  "title": "Premium Cotton T-Shirt",
  "sku": "TSHIRT-PREMIUM-001",
  "status": "active",
  "category": "Clothing",
  "price": 2999,
  "compareAtPrice": 3999,
  "shortDescription": "Comfortable cotton t-shirt",
  "description": "High-quality cotton t-shirt with premium stitching",
  "inventory": {
    "trackQuantity": true,
    "quantity": 100
  },
  "variants": [
    {
      "options": [
        { "name": "Size", "value": "S" },
        { "name": "Color", "value": "Black" }
      ],
      "price": 2999,
      "quantity": 20
    },
    {
      "options": [
        { "name": "Size", "value": "M" },
        { "name": "Color", "value": "Black" }
      ],
      "price": 2999,
      "quantity": 30
    },
    {
      "options": [
        { "name": "Size", "value": "L" },
        { "name": "Color", "value": "White" }
      ],
      "price": 3199,
      "quantity": 25
    }
  ],
  "images": [
    {
      "url": "https://example.com/tshirt-black.jpg",
      "alt": "Black T-Shirt Front"
    },
    {
      "url": "https://example.com/tshirt-white.jpg",
      "alt": "White T-Shirt Front"
    }
  ],
  "weight": 200,
  "dimensions": {
    "length": 30,
    "width": 25,
    "height": 2
  },
  "tags": ["cotton", "premium", "comfortable"]
}
```

**Success Response (201):**
```json
{
  "statusCode": 201,
  "data": {
    "id": "product-uuid",
    "name": "Premium Cotton T-Shirt",
    "sku": "TSHIRT-PREMIUM-001",
    "status": "active",
    "price": 2999,
    "compareAtPrice": 3999,
    "productVariants": [
      {
        "id": "variant-uuid-1",
        "sku": "TSHIRT-PREMIUM-001-S-BLA",
        "title": "S / Black",
        "price": 2999,
        "inventory": 20,
        "optionValues": [
          {
            "id": "value-uuid-1",
            "value": "S",
            "option": {
              "id": "option-uuid-1",
              "name": "Size"
            }
          },
          {
            "id": "value-uuid-2",
            "value": "Black",
            "option": {
              "id": "option-uuid-2",
              "name": "Color"
            }
          }
        ]
      }
      // ... more variants
    ],
    "categories": [...],
    "tags": [...],
    "files": [...]
  },
  "message": "Product created successfully"
}
```

---

## Testing Checklist

- [ ] Create product with new format
- [ ] Verify `title` is stored as `name` in database
- [ ] Verify `category` string creates/finds category by name
- [ ] Verify `status` is stored correctly
- [ ] Verify `inventory.quantity` updates `stockAvailable`
- [ ] Verify `inventory.trackQuantity` is stored
- [ ] Verify `compareAtPrice` is stored
- [ ] Verify `weight` and `dimensions` are stored
- [ ] Verify variants are created with correct options
- [ ] Verify variant SKUs are auto-generated correctly
- [ ] Verify variant titles are auto-generated correctly
- [ ] Verify images are stored with URLs
- [ ] Verify tags are auto-created if missing
- [ ] GET product returns correct variant structure
- [ ] Duplicate SKU returns error

---

## Questions?

If you encounter any issues or need clarification:

1. Check the new request format in this document
2. Verify all required fields are present
3. Check that `status` is one of: `"draft"`, `"active"`, `"archived"`
4. Ensure `variants` array is not empty
5. Verify image URLs are valid

**Note:** The old format is no longer supported. All product creation must use the new format.
