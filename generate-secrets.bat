@echo off
echo ============================================
echo PIE Backend - Quick Setup Helper
echo ============================================
echo.

echo Generating JWT Secrets...
echo.

node -e "console.log('Copy these to your .env file:\n')"
node -e "console.log('ACCESS_TOKEN_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('REFRESH_TOKEN_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

echo.
echo ============================================
echo Next Steps:
echo ============================================
echo 1. Copy the secrets above to your .env file
echo 2. Follow SETUP_GUIDE.md for other credentials
echo 3. Setup database (Supabase/Docker)
echo 4. Setup email (Gmail app password)
echo 5. Setup Razorpay (test keys)
echo 6. Setup Cloudinary or AWS S3
echo 7. Run: npm run db:push
echo 8. Run: npm run dev
echo ============================================
echo.

pause
