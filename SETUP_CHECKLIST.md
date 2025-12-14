# 🎯 PIE Backend Setup Checklist

## ✅ Progress Tracker

### 1. Environment Setup
- [ ] Node.js installed (v18+)
- [ ] npm/bun installed and working
- [ ] `node_modules` installed (`npm install` completed)
- [ ] `.env` file created from `.env.example`

### 2. Database Configuration (REQUIRED)
**Choose ONE option:**
- [ ] **Option A:** Docker PostgreSQL container running
- [ ] **Option B:** Supabase account created and connection string copied
- [ ] **Option C:** Neon database created and connection string copied
- [ ] DATABASE_URL added to `.env`
- [ ] DIRECT_URL added to `.env`
- [ ] Test connection: `npm run db:studio` works

### 3. JWT Secrets (REQUIRED)
- [ ] Run `generate-secrets.bat` (Windows) or `generate-secrets.sh` (Mac/Linux)
- [ ] ACCESS_TOKEN_SECRET added to `.env`
- [ ] REFRESH_TOKEN_SECRET added to `.env`

### 4. Email Service (REQUIRED)
- [ ] Gmail 2FA enabled
- [ ] Gmail App Password generated
- [ ] MAIL_USER added to `.env`
- [ ] MAIL_PASS added to `.env`

### 5. Payment Gateway (REQUIRED)
- [ ] Razorpay account created
- [ ] Test mode activated
- [ ] RAZORPAY_KEY added to `.env`
- [ ] RAZORPAY_SECRET added to `.env`

### 6. File Storage (REQUIRED - Pick ONE)
**Option A: Cloudinary (Recommended)**
- [ ] Cloudinary account created
- [ ] CLOUDINARY_CLOUD_NAME added to `.env`
- [ ] CLOUDINARY_API_KEY added to `.env`
- [ ] CLOUDINARY_API_SECRET added to `.env`
- [ ] CLOUDINARY_FOLDER_NAME added to `.env`

**Option B: AWS S3**
- [ ] AWS account created
- [ ] IAM user created with S3 access
- [ ] S3 bucket created
- [ ] AWS_ACCESS_KEY_ID added to `.env`
- [ ] AWS_SECRET_ACCESS_KEY added to `.env`
- [ ] AWS_REGION added to `.env`
- [ ] AWS_S3_BUCKET_NAME added to `.env`

### 7. Logistics Integration (OPTIONAL)
- [ ] Daakit credentials obtained from client
- [ ] DAAKIT_USERNAME added to `.env` (or left empty)
- [ ] DAAKIT_PASSWORD added to `.env` (or left empty)

### 8. Database Initialization
- [ ] Run `npm run db:push` - Schema pushed successfully
- [ ] (Optional) Run `npm run db:seed` - Sample data seeded

### 9. Start Server
- [ ] Run `npm run dev` - Server starts without errors
- [ ] Open http://localhost:4000 - API info page displays
- [ ] Check http://localhost:4000/healthz - Returns "ok"
- [ ] Check http://localhost:4000/api/v1 - Returns v1 info

### 10. Test Basic Functionality
- [ ] Can register a customer
- [ ] Receive OTP email
- [ ] Can verify customer with OTP
- [ ] Can login as customer
- [ ] Can register a seller
- [ ] Can verify seller with OTP

---

## 🚨 Minimum Required to Run Server

**These 5 items are MANDATORY:**

1. ✅ **Database** (Supabase/Docker/Neon)
   - DATABASE_URL
   - DIRECT_URL

2. ✅ **JWT Secrets**
   - ACCESS_TOKEN_SECRET
   - REFRESH_TOKEN_SECRET

3. ✅ **Email Service**
   - MAIL_USER
   - MAIL_PASS

4. ✅ **Payment Gateway**
   - RAZORPAY_KEY
   - RAZORPAY_SECRET

5. ✅ **File Storage** (ONE)
   - Cloudinary OR AWS S3

---

## 📝 Quick Commands Reference

```bash
# Generate JWT secrets
./generate-secrets.bat    # Windows
./generate-secrets.sh     # Mac/Linux

# Install dependencies
npm install

# Setup database
npm run db:push

# Seed sample data (optional)
npm run db:seed

# Start development server
npm run dev

# Open Prisma Studio (database GUI)
npm run db:studio

# Build for production
npm run build

# Start production server
npm start
```

---

## ⏱️ Estimated Setup Time

- **Quick Setup** (minimum required): 30-45 minutes
  - Database: 5-10 minutes
  - Email: 5 minutes
  - Razorpay: 10 minutes
  - Cloudinary: 5 minutes
  - Configuration: 5-10 minutes

- **Full Setup** (all services): 60-90 minutes
  - Includes AWS S3 setup
  - Includes testing all features

---

## 🆘 Stuck? Check This

### Can't connect to database?
→ Re-check connection string format in `.env`
→ Ensure database is running (Docker) or accessible (cloud)
→ Try: `npm run db:studio` to test connection

### Server won't start?
→ Check if PORT 4000 is available
→ Look for error messages in terminal
→ Verify all REQUIRED env variables are set

### Email not sending?
→ Ensure Gmail 2FA is enabled
→ Use App Password, not regular password
→ Check MAIL_USER and MAIL_PASS are correct

### File upload failing?
→ Verify Cloudinary or AWS credentials
→ Check bucket permissions (AWS)
→ Test credentials in their respective dashboards

---

## ✅ Setup Complete When...

- [x] Server starts without errors
- [x] Health check returns "ok"
- [x] Can access API docs
- [x] Database connection working
- [x] Can register and verify users
- [x] Emails are being sent
- [x] File uploads working (test image upload)

---

**📖 For detailed instructions, see SETUP_GUIDE.md**
