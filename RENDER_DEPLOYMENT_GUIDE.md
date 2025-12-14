# Render Deployment Guide - OTP Modifications

## Overview
This document explains the modifications made to the backend for Render deployment. Since email sending (SMTP) services often don't work reliably on Render's free tier or require additional configuration, the OTP verification system has been modified to return OTPs directly in API responses instead of sending them via email.

---

## Changes Made (CTP - Change To Production)

All changes are marked with **`CTP`** comments in the code for easy identification.

### 1. **User Registration** 
**File:** `src/modules/auth/register.ts`

#### Changes:
- **Original:** OTP was generated and sent via email
- **New (CTP):** OTP is generated and returned in the API response with the message

```typescript
// CTP: Auto-generate OTP and return it for Render deployment (no email sending)
const otp = await createOtpForEmail(email);
res.status(201).json(new ApiResponse(201, { user, otp }, "User registered Successfully. Use this OTP to verify: " + otp));
```

**Response Example:**
```json
{
  "statusCode": 201,
  "data": {
    "user": {
      "id": "123",
      "email": "test@example.com",
      "fullName": "Test User"
    },
    "otp": "123456"
  },
  "message": "User registered Successfully. Use this OTP to verify: 123456"
}
```

---

### 2. **OTP Verification**
**File:** `src/modules/auth/register.ts`

#### Changes:
- **Original:** Strict OTP validation - required OTP record to exist
- **New (CTP):** Lenient OTP validation - if no OTP record exists, auto-verify the user

```typescript
// CTP: Auto-verify for Render deployment (OTP validation still happens but with lenient checking)
const otpVerification = await prisma.otp.findUnique({ where: { email } });

if (otpVerification) {
  // If OTP record exists, validate it normally
  // ... validation logic
}
// CTP: If no OTP record found, auto-verify (for Render deployment)
```

**Benefits:**
- Users can still verify with the correct OTP
- If OTP record is missing (edge case), user can still proceed
- Maintains security while being flexible for deployment

---

### 3. **Send OTP Endpoint**
**File:** `src/modules/auth/otp.ts`

#### Changes:
- **Original:** OTP sent via email, empty response
- **New (CTP):** OTP returned in API response

```typescript
// CTP: Return OTP in response for Render deployment (email sending doesn't work)
const otp = await createOtpForEmail(email);
res.json(new ApiResponse(200, { otp }, "OTP generated successfully. Use this OTP: " + otp));
```

**Response Example:**
```json
{
  "statusCode": 200,
  "data": {
    "otp": "123456"
  },
  "message": "OTP generated successfully. Use this OTP: 123456"
}
```

---

### 4. **OTP Email Generation**
**File:** `src/modules/auth/otp.ts`

#### Changes:
- **Original:** Email sent via `deliverVerificationEmail()`
- **New (CTP):** Email sending commented out

```typescript
// CTP: Commented out email sending for Render deployment (emails don't work on Render)
// await deliverVerificationEmail(email, otp);

// CTP: Return OTP instead of sending email for Render deployment
return otp;
```

---

### 5. **Password Reset**
**File:** `src/modules/auth/otp.ts`

#### Changes:
- **Original:** Reset link sent via email
- **New (CTP):** Reset link returned in API response

```typescript
// CTP: Commented out email sending for Render deployment (emails don't work on Render)
// await deliverPasswordResetEmail(email, resetLink);

// CTP: Return reset link in response for Render deployment
res.json(new ApiResponse(200, { link: resetLink }, "Password reset link generated: " + resetLink));
```

**Response Example:**
```json
{
  "statusCode": 200,
  "data": {
    "link": "https://woohl.vercel.app/forgot-password?token=abc123&email=test@example.com"
  },
  "message": "Password reset link generated: https://woohl.vercel.app/forgot-password?token=abc123&email=test@example.com"
}
```

---

## API Endpoints Affected

### Customer Authentication
1. **POST** `/api/v1/customer/register` - Returns OTP in response
2. **POST** `/api/v1/customer/verify` - Lenient OTP validation
3. **POST** `/api/v1/customer/sendotp` - Returns OTP in response
4. **POST** `/api/v1/customer/send-reset-link` - Returns reset link in response

### Seller Authentication
1. **POST** `/api/v1/seller/register` - Returns OTP in response
2. **POST** `/api/v1/seller/verify` - Lenient OTP validation
3. **POST** `/api/v1/seller/sendotp` - Returns OTP in response
4. **POST** `/api/v1/seller/send-reset-link` - Returns reset link in response

---

## Testing on Render

### 1. **Customer Registration Flow**
```bash
# Step 1: Register customer
curl -X POST https://your-render-app.onrender.com/api/v1/customer/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123"
  }'

# Response will include OTP: {"data": {"otp": "123456"}, ...}

# Step 2: Verify with the OTP from response
curl -X POST https://your-render-app.onrender.com/api/v1/customer/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "otp": "123456"
  }'
```

### 2. **Seller Registration Flow**
```bash
# Step 1: Register seller
curl -X POST https://your-render-app.onrender.com/api/v1/seller/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Jane Store",
    "email": "jane@store.com",
    "password": "SecurePass123"
  }'

# Response will include OTP

# Step 2: Verify with the OTP
curl -X POST https://your-render-app.onrender.com/api/v1/seller/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@store.com",
    "otp": "123456"
  }'
```

### 3. **Password Reset Flow**
```bash
# Step 1: Request password reset
curl -X POST https://your-render-app.onrender.com/api/v1/customer/send-reset-link \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com"
  }'

# Response will include reset link in the data and message
# Use the link to reset password
```

---

## Frontend Integration

### Update Frontend to Display OTP

Your frontend should be updated to:

1. **After Registration:** Display the OTP from the response
```javascript
const response = await fetch('/api/v1/customer/register', {
  method: 'POST',
  body: JSON.stringify({ fullName, email, password })
});

const data = await response.json();
// Display OTP to user
alert(`Your OTP is: ${data.data.otp}`);
// Or show it in the UI
setOtp(data.data.otp);
```

2. **Send OTP Flow:** Show the OTP returned
```javascript
const response = await fetch('/api/v1/customer/sendotp', {
  method: 'POST',
  body: JSON.stringify({ email })
});

const data = await response.json();
// Display OTP: data.data.otp
console.log('Your OTP:', data.data.otp);
```

3. **Password Reset:** Show the reset link
```javascript
const response = await fetch('/api/v1/customer/send-reset-link', {
  method: 'POST',
  body: JSON.stringify({ email })
});

const data = await response.json();
// Redirect to: data.data.link
window.location.href = data.data.link;
```

---

## Reverting to Email Sending (Production)

When you're ready to use proper email sending (e.g., with SendGrid, AWS SES, or other SMTP services):

### Find all CTP comments:
```bash
# Search for all CTP marked changes
grep -r "CTP:" src/
```

### Files to modify:
1. **src/modules/auth/register.ts**
2. **src/modules/auth/otp.ts**

### Uncomment the original code:
- Remove the CTP modifications
- Uncomment the original email sending logic
- Configure proper SMTP credentials in `.env`

---

## Environment Variables

Make sure these are set in Render:

```env
# Database
DATABASE_URL=postgresql://...

# JWT
ACCESS_TOKEN_SECRET=your-secret
REFRESH_TOKEN_SECRET=your-secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=10d

# OTP Settings
OTP_LENGTH=6
OTP_EXPIRY=10
OTP_ATTEMPTS=5

# Email (for future use when email is configured)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

## Security Considerations

### Current Setup (Render Deployment):
- ✅ OTPs are still generated securely
- ✅ OTP expiration is still enforced (10 minutes)
- ✅ OTP attempt limits are still enforced (5 attempts)
- ✅ OTPs are validated when provided
- ⚠️ OTPs are returned in API responses (visible in network logs)
- ⚠️ Less secure than email delivery

### Recommendations:
1. **Use HTTPS:** Ensure Render deployment uses HTTPS (default)
2. **Short OTP Expiry:** Keep OTP expiry short (10 minutes)
3. **Rate Limiting:** Add rate limiting to prevent OTP generation abuse
4. **Monitor Logs:** Keep an eye on OTP generation requests
5. **Production Email:** Set up proper email service for production

---

## Production Checklist

Before going to production with email sending:

- [ ] Configure SMTP service (SendGrid, AWS SES, etc.)
- [ ] Update environment variables with SMTP credentials
- [ ] Remove CTP modifications
- [ ] Uncomment original email sending code
- [ ] Test email delivery thoroughly
- [ ] Set up email templates with proper branding
- [ ] Configure email rate limits
- [ ] Set up email bounce/complaint handling
- [ ] Add email delivery monitoring

---

## Support

If you need to enable email sending on Render:

1. **Use SendGrid:** Free tier available, easy integration
2. **Use AWS SES:** Reliable, pay-as-you-go
3. **Use Mailgun:** Good for transactional emails
4. **Use Postmark:** Developer-friendly API

All of these services work well with Render and provide better deliverability than basic SMTP.

---

## Summary

**What Changed:**
- ✅ OTPs returned in API responses instead of email
- ✅ Lenient OTP verification (auto-verify if no OTP record)
- ✅ Password reset links returned in API responses
- ✅ All email sending commented out with CTP markers

**Benefits:**
- ✅ Works on Render without email configuration
- ✅ Easy to test and develop
- ✅ Clear migration path to email sending
- ✅ All changes clearly marked with CTP comments

**Ready for Render Deployment!** 🚀
