# 🚀 PIE Backend - Complete Setup Guide

## 📋 Prerequisites Checklist
- [x] Node.js installed (v18+)
- [x] npm/bun installed
- [ ] PostgreSQL database ready
- [ ] All external service accounts created

---

## 🔧 Step-by-Step Credential Setup

### **1. Create .env File**
```bash
# Copy the example file
cp .env.example .env
```

---

### **2. DATABASE SETUP (Required ✅)**

#### **Option A: Local PostgreSQL with Docker (Recommended for Development)**

**Step 1:** Install Docker Desktop
- Download from: https://www.docker.com/products/docker-desktop

**Step 2:** Run PostgreSQL Container
```bash
docker run --name postgres-container -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=secret -e POSTGRES_DB=pie-admin -p 5432:5432 -d postgres
```

**Step 3:** Update .env
```env
DATABASE_URL="postgresql://admin:secret@localhost:5432/pie-admin"
DIRECT_URL="postgresql://admin:secret@localhost:5432/pie-admin"
```

#### **Option B: Supabase (Free Cloud Database)**

**Step 1:** Create Supabase Account
- Go to: https://supabase.com/
- Click "Start your project" (Free tier available)

**Step 2:** Create New Project
- Click "New Project"
- Enter project name (e.g., "pie-backend")
- Choose region closest to you
- Set a strong database password
- Wait 2-3 minutes for project setup

**Step 3:** Get Connection Strings
- Go to Project Settings > Database
- Find "Connection string" section
- Copy "Connection pooling" URL for DATABASE_URL
- Copy "Direct connection" URL for DIRECT_URL

**Step 4:** Update .env
```env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

#### **Option C: Neon (Alternative Free Cloud Database)**

**Step 1:** Create Neon Account
- Go to: https://neon.tech/
- Sign up with GitHub (Free tier: 512 MB storage)

**Step 2:** Create Project
- Click "Create a project"
- Choose region
- Wait for provisioning

**Step 3:** Get Connection String
- Copy the connection string provided

**Step 4:** Update .env
```env
DATABASE_URL="postgresql://[user]:[password]@[host]/[database]?sslmode=require"
DIRECT_URL="postgresql://[user]:[password]@[host]/[database]?sslmode=require"
```

---

### **3. JWT SECRETS (Required ✅)**

**Generate Random Secrets:**

**Option 1: Using Node.js**
```bash
node -e "console.log('ACCESS_TOKEN_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('REFRESH_TOKEN_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

**Option 2: Using PowerShell**
```powershell
# Generate 64-character random hex strings
-join ((48..57) + (97..102) | Get-Random -Count 64 | % {[char]$_})
```

**Option 3: Use Online Generator**
- Go to: https://generate-random.org/api-token-generator
- Generate two 64-character tokens

**Update .env:**
```env
ACCESS_TOKEN_SECRET=your_generated_access_token_here
ACCESS_TOKEN_EXPIRY=1h
REFRESH_TOKEN_SECRET=your_generated_refresh_token_here
REFRESH_TOKEN_EXPIRY=15d
```

---

### **4. EMAIL SERVICE (Required ✅)**

#### **Using Gmail (Free & Easy)**

**Step 1:** Enable 2-Factor Authentication
- Go to: https://myaccount.google.com/security
- Enable "2-Step Verification"

**Step 2:** Generate App Password
- Go to: https://myaccount.google.com/apppasswords
- Select "Mail" and "Other (Custom name)"
- Enter "PIE Backend"
- Click "Generate"
- Copy the 16-character password (remove spaces)

**Step 3:** Update .env
```env
MAIL_USER=your-gmail@gmail.com
MAIL_PASS=your-16-character-app-password
```

#### **Alternative: SendGrid (Professional)**

**Step 1:** Create SendGrid Account
- Go to: https://sendgrid.com/ (Free tier: 100 emails/day)
- Sign up

**Step 2:** Create API Key
- Go to Settings > API Keys
- Click "Create API Key"
- Copy the key

**Step 3:** Configure (requires code changes)

---

### **5. RAZORPAY PAYMENT (Required ✅)**

**Step 1:** Create Razorpay Account
- Go to: https://razorpay.com/
- Sign up (Available in India)

**Step 2:** Activate Test Mode
- Dashboard > Settings > API Keys
- Click "Generate Test Keys" (for development)

**Step 3:** Get Credentials
- Copy "Key ID" 
- Copy "Key Secret"

**Step 4:** Update .env
```env
RAZORPAY_KEY=rzp_test_xxxxxxxxxxxx
RAZORPAY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

**Note:** For production, generate Live Keys after business verification

---

### **6. CLOUDINARY FILE STORAGE (Optional but Recommended)**

**Step 1:** Create Cloudinary Account
- Go to: https://cloudinary.com/
- Sign up (Free tier: 25GB storage, 25GB bandwidth/month)

**Step 2:** Get Credentials
- Dashboard shows:
  - Cloud Name
  - API Key
  - API Secret

**Step 3:** Update .env
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER_NAME=pie-backend
```

---

### **7. AWS S3 FILE STORAGE (Alternative to Cloudinary)**

**Step 1:** Create AWS Account
- Go to: https://aws.amazon.com/
- Sign up (Free tier: 5GB storage for 12 months)

**Step 2:** Create IAM User
- Go to IAM Console
- Create user with "Programmatic access"
- Attach policy: "AmazonS3FullAccess"
- Save Access Key ID and Secret Access Key

**Step 3:** Create S3 Bucket
- Go to S3 Console
- Click "Create bucket"
- Enter bucket name (e.g., "pie-backend-files")
- Choose region
- Uncheck "Block all public access" (for file serving)

**Step 4:** Update .env
```env
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=pie-backend-files
```

---

### **8. DAAKIT LOGISTICS (Optional - Client Specific)**

**This requires client's existing Daakit account credentials.**

**If client has account:**
```env
DAAKIT_USERNAME=client_username
DAAKIT_PASSWORD=client_password
```

**If not available:** Leave empty for now
```env
DAAKIT_USERNAME=
DAAKIT_PASSWORD=
```

---

### **9. OTHER SETTINGS (Keep Default)**

```env
# Server
PORT=4000
NODE_ENV=development

# CORS (adjust if frontend is on different port)
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
CORS_CREDENTIALS=true
CORS_EXPOSE_HEADERS=Content-Type,Authorization
CORS_ALLOW_HEADERS=Origin,Content-Type,Accept,Authorization
CORS_ALLOW_METHODS=GET,POST,PUT,DELETE,PATCH
CORS_MAX_AGE=600

# OTP
OTP_EXPIRY=5
OTP_ATTEMPTS=3
OTP_LENGTH=6
```

---

## 🚀 **Running the Backend**

### **Step 1: Install Dependencies**
```bash
npm install
# or
bun install
```

### **Step 2: Setup Database**
```bash
# Push schema to database
npm run db:push

# (Optional) Seed with sample data
npm run db:seed
```

### **Step 3: Start Development Server**
```bash
npm run dev
```

### **Step 4: Verify Setup**
Open browser: http://localhost:4000

You should see:
```json
{
  "success": true,
  "message": "Pie API Service",
  "available_versions": {
    "v1": {
      "status": "active",
      "route": "/api/v1",
      "url": "http://localhost:4000/api/v1"
    }
  }
}
```

Check health: http://localhost:4000/healthz
Should return: `ok`

---

## ✅ **Minimum Required Setup (Quick Start)**

To run the backend with minimum setup:

1. **Database** ✅ (Supabase free tier or local Docker)
2. **JWT Secrets** ✅ (Generate random strings)
3. **Email** ✅ (Gmail with app password)
4. **Razorpay** ✅ (Test mode keys)
5. **File Storage** ⚠️ (Pick ONE: Cloudinary OR AWS S3)

**Daakit** can be left empty if not using logistics features.

---

## 🔍 **Priority Order for Setup**

### **MUST HAVE (To run server):**
1. ✅ Database (PostgreSQL)
2. ✅ JWT Secrets
3. ✅ Email Service (for OTP)

### **SHOULD HAVE (For full functionality):**
4. ✅ Razorpay (for payments)
5. ✅ Cloudinary or AWS S3 (for file uploads)

### **NICE TO HAVE (Optional):**
6. ⚠️ Daakit (for shipping integration)

---

## 🆘 **Troubleshooting**

### **Database Connection Failed**
```bash
# Test connection
npm run db:studio
```
- Check if PostgreSQL is running
- Verify DATABASE_URL format
- Ensure firewall allows connection

### **Port Already in Use**
```bash
# Change PORT in .env
PORT=5000
```

### **Prisma Errors**
```bash
# Regenerate Prisma Client
npx prisma generate

# Reset database (WARNING: Deletes all data)
npm run db:reset
```

### **Module Not Found**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## 📞 **Need Help?**

**Common Issues:**
- Database connection → Check connection string format
- Email not sending → Verify Gmail app password
- File upload fails → Check Cloudinary/AWS credentials
- Payment fails → Use Razorpay test keys first

**Check Logs:**
```bash
# Server logs show in terminal when running npm run dev
```

---

## 🎯 **Next Steps After Setup**

1. Test API endpoints using Postman/Thunder Client
2. Create admin user account
3. Test seller registration flow
4. Test customer registration flow
5. Test product creation
6. Test payment integration (test mode)

---

## 📝 **Quick Reference - Complete .env Template**

```env
# Server
PORT=4000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
CORS_CREDENTIALS=true
CORS_EXPOSE_HEADERS=Content-Type,Authorization
CORS_ALLOW_HEADERS=Origin,Content-Type,Accept,Authorization
CORS_ALLOW_METHODS=GET,POST,PUT,DELETE,PATCH
CORS_MAX_AGE=600

# JWT (GENERATE NEW ONES!)
ACCESS_TOKEN_SECRET=generate_random_64_char_hex_string
ACCESS_TOKEN_EXPIRY=1h
REFRESH_TOKEN_SECRET=generate_random_64_char_hex_string
REFRESH_TOKEN_EXPIRY=15d

# Database (REQUIRED)
DATABASE_URL=postgresql://user:password@host:port/database
DIRECT_URL=postgresql://user:password@host:port/database

# OTP
OTP_EXPIRY=5
OTP_ATTEMPTS=3
OTP_LENGTH=6

# Email (REQUIRED)
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-gmail-app-password

# Razorpay (REQUIRED for payments)
RAZORPAY_KEY=rzp_test_your_key
RAZORPAY_SECRET=your_secret

# Cloudinary (REQUIRED for images)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER_NAME=pie-backend

# AWS (Alternative to Cloudinary)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your_bucket_name

# Daakit (Optional)
DAAKIT_USERNAME=
DAAKIT_PASSWORD=
```

---

**✅ You're all set! Follow the steps above to get your credentials and run the backend.**
