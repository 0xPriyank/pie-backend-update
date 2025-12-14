import {
  Gender,
  ContactType,
  AddressType,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  ShippingType,
  ShippingFee,
  SellerShippingAddressType,
  CartStatus,
  VariantType,
  KYCDocumentType,
  Customer,
  Seller,
  Admin,
  Product,
  Promotion,
  File
} from "@prisma/client";
import bcrypt from "bcrypt";
import { faker } from "@faker-js/faker";
import prisma from "./../src/config/db.config";
import slugify from "slugify";

const SALT_ROUNDS = 10;

//  TODO: Improve password generation logic for better security
// const generatePass = (length: number) => {
//   const upperChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
//   const lowerChars = "abcdefghijklmnopqrstuvwxyz";
//   const numberChars = "0123456789";

//   const characterPool = upperChars + lowerChars + numberChars;

//   let password = "";
//   for (let i = 0; i < length; i++) {
//     const char = characterPool.charAt(Math.floor(Math.random() * characterPool.length));
//     password += char;
//   }
//   return password;
// };

const generatePass = (length: number) => {
  return "Test@1234";
};

faker.seed(42);

async function main() {
  console.log("🌱 Starting database seeding with Faker...");

  // ---------------------------------------------------------------------
  // 1. Create Admins
  // ---------------------------------------------------------------------
  console.log("Creating admins...");
  const admins: Admin[] = [];

  for (let i = 0; i < 5; i++) {
    const adminPassword = await bcrypt.hash(generatePass(8), SALT_ROUNDS);
    const admin = await prisma.admin.create({
      data: {
        fullName: faker.person.fullName(),
        email: faker.internet.email(),
        password: adminPassword,
        isVerified: true
      }
    });
    admins.push(admin);
  }

  // ---------------------------------------------------------------------
  // 2. Create Tax Slabs (GST with different percentages)
  // ---------------------------------------------------------------------
  console.log("Creating tax slabs...");
  const taxSlabData = [
    { title: "GST 0%", percentage: 0 },
    { title: "GST 5%", percentage: 5 },
    { title: "GST 12%", percentage: 12 },
    { title: "GST 18%", percentage: 18 }
  ];

  const taxSlabs = await Promise.all(taxSlabData.map((data) => prisma.taxSlab.create({ data })));

  // ---------------------------------------------------------------------
  // 3. Create Clothing Categories
  // ---------------------------------------------------------------------
  console.log("Creating clothing categories...");
  const categoryData = [
    {
      name: "Men's Clothing",
      slug: "men-clothing",
      taxId: faker.helpers.arrayElement(taxSlabs).id
    }, // 12% GST
    {
      name: "Women's Clothing",
      slug: "women-clothing",
      taxId: faker.helpers.arrayElement(taxSlabs).id
    }, // 12% GST
    { name: "Kids Clothing", slug: "kid-clothing", taxId: faker.helpers.arrayElement(taxSlabs).id }, // 5% GST
    { name: "Accessories", slug: "accessories", taxId: faker.helpers.arrayElement(taxSlabs).id }, // 12% GST
    { name: "Footwear", slug: "footwear", taxId: faker.helpers.arrayElement(taxSlabs).id } // 12% GST
  ];

  const categories = await Promise.all(
    categoryData.map((data) => prisma.category.create({ data }))
  );

  // Manually defined realistic subcategory names
  const subcategoryNames = [
    "T-Shirts",
    "Shirts",
    "Jeans",
    "Trousers",
    "Dresses",
    "Tops",
    "Kurtas",
    "Sarees",
    "Boys Clothing",
    "Girls Clothing"
  ];

  const subCategoryData = subcategoryNames.map((name) => {
    // Randomly assign parent category and tax
    const parentCategory = faker.helpers.arrayElement(categories.slice(0, 3));
    const tax = faker.helpers.arrayElement(taxSlabs);
    const slug = slugify(name, { lower: true, strict: true });

    return {
      name,
      slug,
      parentCategoryId: parentCategory.id,
      taxId: tax.id
    };
  });

  const subCategories = await Promise.all(
    subCategoryData.map((data) => prisma.category.create({ data }))
  );

  // ---------------------------------------------------------------------
  // 4. Create Colors
  // ---------------------------------------------------------------------
  console.log("Creating colors...");
  const colorData = [
    { name: "Red", value: "#FF0000" },
    { name: "Blue", value: "#0000FF" },
    { name: "Green", value: "#00FF00" },
    { name: "Black", value: "#000000" },
    { name: "White", value: "#FFFFFF" },
    { name: "Yellow", value: "#FFFF00" },
    { name: "Purple", value: "#800080" },
    { name: "Orange", value: "#FFA500" },
    { name: "Pink", value: "#FFC0CB" },
    { name: "Brown", value: "#A52A2A" },
    { name: "Gray", value: "#808080" },
    { name: "Navy", value: "#000080" }
  ];

  const colors = await Promise.all(colorData.map((data) => prisma.color.create({ data })));

  // ---------------------------------------------------------------------
  // 5. Create Sizes
  // ---------------------------------------------------------------------
  console.log("Creating sizes...");
  const sizeData = [
    { name: "XS", value: "Extra Small" },
    { name: "S", value: "Small" },
    { name: "M", value: "Medium" },
    { name: "L", value: "Large" },
    { name: "XL", value: "Extra Large" },
    { name: "XXL", value: "Double Extra Large" },
    { name: "28", value: "28 inches" },
    { name: "30", value: "30 inches" },
    { name: "32", value: "32 inches" },
    { name: "34", value: "34 inches" },
    { name: "36", value: "36 inches" },
    { name: "38", value: "38 inches" },
    { name: "40", value: "40 inches" },
    { name: "42", value: "42 inches" }
  ];

  const sizes = await Promise.all(sizeData.map((data) => prisma.size.create({ data })));

  // ---------------------------------------------------------------------
  // 6. Create Customers with Contacts and Addresses
  // ---------------------------------------------------------------------
  console.log("Creating customers...");
  const customers: Customer[] = [];

  const emailSet = new Set();
  const contactSet = new Set();
  for (let i = 0; i < 15; i++) {
    let email = faker.internet.email();
    while (emailSet.has(email)) {
      email = faker.internet.email(); // keep retrying until unique
    }
    emailSet.add(email);

    const customerData = {
      email: faker.internet.email(),
      fullName: faker.person.fullName(),
      password: await bcrypt.hash(generatePass(8), SALT_ROUNDS),
      dateOfBirth: faker.date.birthdate({ min: 18, max: 65, mode: "age" }),
      gender: faker.helpers.arrayElement([Gender.MALE, Gender.FEMALE, Gender.OTHER]),
      referralCode: faker.string.alphanumeric(8).toUpperCase(),
      loyaltyPoints: faker.number.int({ min: 0, max: 1000 }),
      isVerified: faker.datatype.boolean(0.8) // 80% verified
    };

    const customer = await prisma.customer.create({
      data: customerData
    });

    let contact = faker.phone.number();
    while (contactSet.has(contact)) {
      contact = faker.phone.number();
    }
    contactSet.add(contact);

    // Create contact for customer
    const newContact = await prisma.customerContact.create({
      data: {
        type: ContactType.MOBILE,
        number: faker.phone.number(),
        isVerified: faker.datatype.boolean(0.9)
      }
    });

    // Update customer with contact
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        contact: {
          connect: {
            id: newContact.id
          }
        }
      }
    });

    // Create shipping address
    await prisma.shippingAddress.create({
      data: {
        fullName: customer.fullName,
        contact: newContact.number,
        customerId: customer.id,
        type: faker.helpers.arrayElement([
          AddressType.HOME,
          AddressType.SHIPPING,
          AddressType.BILLING
        ]),
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        country: "India",
        pincode: faker.location.zipCode("######"),
        isMain: false
      }
    });

    customers.push(customer);
  }

  // ---------------------------------------------------------------------
  // 7. Create Sellers with Complete Onboarding
  // ---------------------------------------------------------------------
  console.log("Creating sellers...");
  const sellers: Seller[] = [];

  for (let i = 0; i < 8; i++) {
    const sellerData = {
      email: faker.internet.email(),
      fullName: faker.person.fullName(),
      password: await bcrypt.hash(generatePass(8), SALT_ROUNDS),
      businessType: faker.helpers.arrayElement([
        "Retail",
        "Wholesale",
        "Manufacturer",
        "Dropshipper"
      ]),
      businessName: faker.company.name(),
      legalName: faker.company.name(),
      country: "India",
      rating: faker.number.float({ min: 3.5, max: 5.0, fractionDigits: 1 }),
      followers: faker.number.int({ min: 50, max: 5000 }),
      isVerified: faker.datatype.boolean(0.7),
      onboardingComplete: faker.datatype.boolean(0.8),
      shippingType: faker.helpers.arrayElement([
        ShippingType.SELF_FULFILLED,
        ShippingType.PLATFORM_COURIER
      ]),
      shippingFee: faker.helpers.arrayElement([ShippingFee.free, ShippingFee.paid])
    };

    const seller = await prisma.seller.create({
      data: sellerData
    });

    // Create contact for seller
    const contact = await prisma.sellerContact.create({
      data: {
        type: ContactType.WORK,
        number: faker.phone.number(),
        isVerified: faker.datatype.boolean(0.9)
      }
    });

    await prisma.seller.update({
      where: { id: seller.id },
      data: {
        contact: {
          connect: {
            id: contact.id
          }
        }
      }
    });

    // Create seller address
    await prisma.sellerAddress.create({
      data: {
        fullName: seller.fullName,
        contact: contact.number,
        sellerId: seller.id,
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        country: "India",
        pincode: faker.location.zipCode("######")
      }
    });

    // Create shipping addresses for seller
    const shippingAddressData = [
      {
        addressLine1: faker.location.streetAddress(),
        addressLine2: faker.location.secondaryAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        country: "India",
        pincode: faker.location.zipCode("######"),
        fullName: seller.fullName,
        contact: contact.number,
        type: SellerShippingAddressType.PICKUP,
        sellerId: seller.id
      },
      {
        addressLine1: faker.location.streetAddress(),
        addressLine2: faker.location.secondaryAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        country: "India",
        pincode: faker.location.zipCode("######"),
        fullName: seller.fullName,
        contact: contact.number,
        type: SellerShippingAddressType.RETURN,
        sellerId: seller.id
      }
    ];

    await prisma.sellerShippingAddress.createMany({
      data: shippingAddressData
    });

    // Create storefront info
    await prisma.storefrontInfo.create({
      data: {
        sellerId: seller.id,
        storeName: faker.company.name(),
        storeDescription: faker.lorem.paragraph(),
        storeLocation: faker.location.city(),
        isBrandOwner: faker.datatype.boolean(),
        productCategories: faker.helpers.arrayElements(
          ["Men's Clothing", "Women's Clothing", "Kids Clothing", "Accessories"],
          { min: 1, max: 3 }
        )
      }
    });

    // Create GST info
    await prisma.gSTInfo.create({
      data: {
        sellerId: seller.id,
        gstin: faker.string.alphanumeric(15).toUpperCase(),
        withoutGst: faker.datatype.boolean(0.1),
        exemptionReason: faker.datatype.boolean(0.1) ? faker.lorem.sentence() : null,
        gstRate: faker.helpers.arrayElement([0, 5, 12, 18])
      }
    });

    // Create KYC info
    await prisma.kYCInfo.create({
      data: {
        sellerId: seller.id,
        kycDone: faker.datatype.boolean(0.8),
        kycLink: faker.datatype.boolean(0.8) ? faker.internet.url() : null,
        kycDocumentType: faker.helpers.arrayElement([
          KYCDocumentType.pan,
          KYCDocumentType.aadhaar,
          KYCDocumentType.driving_license,
          KYCDocumentType.voter_id
        ])
      }
    });

    // Create bank details
    await prisma.bankDetails.create({
      data: {
        accountName: seller.fullName,
        accountNumber: faker.finance.accountNumber(),
        ifscCode: faker.finance.bic(),
        sellerId: seller.id
      }
    });

    // Create onboarding progress
    const progressSteps = [
      "businessInfo",
      "gst",
      "storefront",
      "shipping",
      "bank",
      "kyc",
      "legal",
      "done"
    ];

    await prisma.sellerOnboardingProgress.create({
      data: {
        sellerId: seller.id,
        progressStep: faker.helpers.arrayElements(progressSteps, { min: 3, max: 5 }),
        completed: seller.onboardingComplete || false
      }
    });

    sellers.push(seller);
  }

  // ---------------------------------------------------------------------
  // 8. Create Products with Images (Clothing Focus)
  // ---------------------------------------------------------------------
  console.log("Creating clothing products...");
  const products: Product[] = [];

  // Clothing product names organized by category
  const clothingProducts = {
    mens: [
      "Classic Cotton T-Shirt",
      "Formal White Shirt",
      "Blue Denim Jeans",
      "Black Formal Trousers",
      "Polo T-Shirt",
      "Casual Shirt",
      "Slim Fit Jeans",
      "Chino Pants",
      "Denim Jacket",
      "Sweater"
    ],
    womens: [
      "Floral Summer Dress",
      "Casual Top",
      "Designer Kurta",
      "Silk Saree",
      "Maxi Dress",
      "Crop Top",
      "Anarkali Suit",
      "Cotton Saree",
      "Blouse",
      "Skirt"
    ],
    kids: [
      "Kids T-Shirt",
      "Girls Dress",
      "Boys Shirt",
      "Kids Jeans",
      "Kids Sweater",
      "Kids Jacket",
      "Kids Shorts",
      "Kids Skirt"
    ],
    accessories: [
      "Leather Belt",
      "Silk Scarf",
      "Woolen Cap",
      "Cotton Handkerchief",
      "Sunglasses",
      "Watch",
      "Necklace",
      "Earrings"
    ],
    footwear: [
      "Running Shoes",
      "Formal Shoes",
      "Casual Sneakers",
      "Sandals",
      "Boots",
      "Flip Flops",
      "Heels",
      "Sports Shoes"
    ]
  };

  const allProductNames = [
    ...clothingProducts.mens,
    ...clothingProducts.womens,
    ...clothingProducts.kids,
    ...clothingProducts.accessories,
    ...clothingProducts.footwear
  ];

  for (let i = 0; i < 20; i++) {
    const seller = faker.helpers.arrayElement(sellers);
    const category = faker.helpers.arrayElement([...categories, ...subCategories]);
    const color = faker.helpers.arrayElement(colors);
    const size = faker.helpers.arrayElement(sizes);

    const price = faker.number.int({ min: 200, max: 5000 });
    const discount = faker.number.float({ min: 0, max: 50, fractionDigits: 1 });
    const originalPrice = Math.round(price * (1 + discount / 100));

    // Create product images
    const imageCount = faker.number.int({ min: 1, max: 3 });
    const productImages: File[] = [];

    for (let j = 0; j < imageCount; j++) {
      const image = await prisma.file.create({
        data: {
          src: faker.image.urlLoremFlickr({ category: "fashion" }),
          mimeType: "image/jpeg",
          format: "jpg",
          isMain: j === 0, // First image is main
          alt: faker.lorem.words(3)
        }
      });
      productImages.push(image);
    }

    const productDetails = [
      "Premium Cotton",
      "Fast Shipping",
      "Easy Returns",
      "Warranty Included",
      "Eco-Friendly",
      "Handcrafted",
      "Sustainable Material",
      "Comfortable Fit"
    ];

    const product = await prisma.product.create({
      data: {
        name: faker.helpers.arrayElement(allProductNames),
        sku: faker.string.alphanumeric(8).toUpperCase(),
        details: faker.helpers.arrayElements(productDetails, { min: 2, max: 4 }),
        categories: {
          connect: [{ id: category.id }]
        },
        shortDescription: faker.commerce.productDescription(),
        description: faker.lorem.paragraphs(2),
        price: price,
        discount: discount,
        originalPrice: originalPrice,
        inStock: faker.datatype.boolean(0.8),
        stockAvailable: faker.number.int({ min: 0, max: 1000 }),
        sellerId: seller.id,
        colorId: color.id,
        sizeId: size.id,
        rating: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
        reviewCount: faker.number.int({ min: 0, max: 500 }),
        isActive: faker.datatype.boolean(0.9),
        images: {
          connect: productImages.map((img) => ({ id: img.id }))
        }
      }
    });

    // Create variants for some products
    if (faker.datatype.boolean(0.4)) {
      const variantCount = faker.number.int({ min: 1, max: 3 });
      const usedSkus = new Set<string>();

      for (let v = 0; v < variantCount; v++) {
        let sku: string;

        // Ensure unique SKU per product
        do {
          sku = faker.string.alphanumeric(8).toUpperCase();
        } while (usedSkus.has(sku));
        usedSkus.add(sku);

        await prisma.variant.create({
          data: {
            sku,
            name: faker.helpers.arrayElement(["Color", "Size", "Material"]),
            value: faker.helpers.arrayElement([
              "Red",
              "Blue",
              "Large",
              "Small",
              "Cotton",
              "Polyester",
              "Silk",
              "Denim"
            ]),
            type: faker.helpers.arrayElement([VariantType.COLOR, VariantType.SIZE]),
            stock: faker.number.int({ min: 0, max: 100 }),
            inStock: faker.datatype.boolean(0.8),
            productId: product.id
          }
        });
      }
    }

    products.push(product);
  }

  // ---------------------------------------------------------------------
  // 9. Create Promotions
  // ---------------------------------------------------------------------
  console.log("Creating promotions...");
  const promotions: Promotion[] = [];
  const usedCodes = new Set<string>();

  for (let i = 0; i < 8; i++) {
    let code: string;

    // Generate unique promotion code
    do {
      code = faker.string.alphanumeric(8).toUpperCase();
    } while (usedCodes.has(code));

    usedCodes.add(code);

    const promotion = await prisma.promotion.create({
      data: {
        code,
        description: faker.lorem.sentence(),
        discount: faker.number.float({ min: 5, max: 50, fractionDigits: 1 }),
        isPercentage: faker.datatype.boolean(0.8),
        startDate: faker.date.recent({ days: 30 }),
        endDate: faker.date.soon({ days: 60 }),
        active: faker.datatype.boolean(0.8),
        sellerId: faker.helpers.arrayElement(sellers).id,
        adminId: faker.helpers.arrayElement(admins).id
      }
    });

    promotions.push(promotion);
  }

  // ---------------------------------------------------------------------
  // 10. Create Carts and Cart Items
  // ---------------------------------------------------------------------
  console.log("Creating carts...");
  for (let i = 0; i < 8; i++) {
    const customer = customers[i];
    const cartItems = faker.helpers.arrayElements(products, { min: 1, max: 5 });

    await prisma.cart.create({
      data: {
        customerId: customer.id,
        status: faker.helpers.arrayElement([
          CartStatus.ACTIVE,
          CartStatus.CHECKED_OUT,
          CartStatus.ABANDONED
        ]),
        items: {
          create: cartItems.map((product) => ({
            productId: product.id,
            quantity: faker.number.int({ min: 1, max: 5 }),
            unitPrice: product.price,
            colorId: product.colorId,
            sizeId: product.sizeId
          }))
        }
      }
    });
  }

  // ---------------------------------------------------------------------
  // 11. Create Wishlists
  // ---------------------------------------------------------------------
  console.log("Creating wishlists...");
  for (let i = 0; i < 10; i++) {
    const customer = customers[i];
    const product = faker.helpers.arrayElement(products);

    await prisma.wishlist.create({
      data: {
        customerId: customer.id,
        productId: product.id
      }
    });
  }

  // ---------------------------------------------------------------------
  // 12. Create Reviews
  // ---------------------------------------------------------------------
  console.log("Creating reviews...");
  for (let i = 0; i < 50; i++) {
    const customer = faker.helpers.arrayElement(customers);
    const product = faker.helpers.arrayElement(products);

    await prisma.review.create({
      data: {
        rating: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
        content: faker.lorem.paragraph(),
        authorId: customer.id,
        productId: product.id
      }
    });
  }

  // ---------------------------------------------------------------------
  // 13. Create Orders and Order Items
  // ---------------------------------------------------------------------
  console.log("Creating orders...");
  for (let i = 0; i < 16; i++) {
    const customer = faker.helpers.arrayElement(customers);
    const orderItems = faker.helpers.arrayElements(products, { min: 1, max: 4 });

    const subTotal = orderItems.reduce((sum, product) => sum + product.price, 0);
    const shippingCharge = faker.number.int({ min: 0, max: 200 });
    const tax = Math.round(subTotal * 0.12); // 12% GST for clothing
    const total = subTotal + shippingCharge + tax;

    const order = await prisma.orders.create({
      data: {
        customerId: customer.id,
        subTotal: subTotal,
        shippingCharge: shippingCharge,
        tax: tax,
        total: total,
        paidAmount: faker.datatype.boolean(0.8) ? total : 0,
        orderStatus: faker.helpers.arrayElement([
          OrderStatus.Pending,
          OrderStatus.Processing,
          OrderStatus.Shipped,
          OrderStatus.Delivered,
          OrderStatus.Canceled
        ]),
        paymentStatus: faker.helpers.arrayElement([
          PaymentStatus.NOT_PAID,
          PaymentStatus.PENDING,
          PaymentStatus.SUCCESS,
          PaymentStatus.FAILED
        ]),
        paymentMethod: faker.helpers.arrayElement([
          PaymentMethod.RAZORPAY,
          PaymentMethod.CASH_ON_DELIVERY,
          PaymentMethod.UPI,
          PaymentMethod.CARD
        ]),
        isPaid: faker.datatype.boolean(0.8),
        orderPlacedAt: faker.date.recent({ days: 30 }),
        orderNotes: faker.datatype.boolean(0.3) ? faker.lorem.sentence() : null,
        isGift: faker.datatype.boolean(0.1),
        razorpayOrderId: faker.datatype.boolean(0.7) ? faker.string.alphanumeric(20) : null,
        razorpayPaymentId: faker.datatype.boolean(0.6) ? faker.string.alphanumeric(20) : null,
        isPaymentVerified: faker.datatype.boolean(0.7)
      }
    });

    // Create order items
    for (const product of orderItems) {
      const quantity = faker.number.int({ min: 1, max: 3 });
      const unitPrice = product.price;
      const discountAmount = Math.round(unitPrice * (product.discount / 100));
      const totalPrice = (unitPrice - discountAmount) * quantity;

      await prisma.orderItems.create({
        data: {
          productId: product.id,
          sellerId: product.sellerId,
          tax: Math.round(totalPrice * 0.12),
          quantity: quantity,
          unitPrice: unitPrice,
          discountAmount: discountAmount,
          totalPrice: totalPrice,
          productName: product.name,
          productSKU: product.sku,
          ordersId: order.id
        }
      });
    }
  }

  // ---------------------------------------------------------------------
  // 14. Create OTPs
  // ---------------------------------------------------------------------
  console.log("Creating OTPs...");
  for (let i = 0; i < 15; i++) {
    await prisma.otp.create({
      data: {
        otp: faker.string.numeric(6),
        email: faker.internet.email(),
        expiresAt: faker.date.soon({ days: 1 }),
        attempts: faker.number.int({ min: 0, max: 3 }),
        verified: faker.datatype.boolean(0.7),
        resetToken: faker.datatype.boolean(0.3) ? faker.string.alphanumeric(32) : null,
        resetExpires: faker.datatype.boolean(0.3) ? faker.date.soon({ days: 1 }) : null
      }
    });
  }

  console.log("✅ Database seeding complete!");
  console.log(`📊 Created:
  - ${customers.length} customers
  - ${sellers.length} sellers
  - ${admins.length} admins
  - ${products.length} clothing products
  - ${categories.length + subCategories.length} clothing categories
  - ${colors.length} colors
  - ${sizes.length} sizes
  - ${taxSlabs.length} GST tax slabs
  - Multiple orders, carts, reviews, and analytics events`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
