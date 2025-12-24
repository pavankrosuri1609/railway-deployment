# 🚀 Railway Deployment Instructions

## Step 1: Go to Railway
1. Visit: https://railway.app
2. Sign up with GitHub

## Step 2: Create New Project
1. Click "New Project"
2. Select "Empty Project"

## Step 3: Upload Files
1. Drag and drop this entire folder to Railway
2. Railway auto-detects Spring Boot application

## Step 4: Set Environment Variables
In Railway dashboard, add these variables:
- SMTP_HOST=smtp.sendgrid.net
- SMTP_PORT=587
- SMTP_USERNAME=apikey
- SMTP_PASSWORD=MZSRVBQ8TEX5EXXQLBQKR9HH
- EMAIL_FROM=noreply@pragmaq.com

## Step 5: Deploy
1. Railway builds automatically
2. Get your URL: https://your-app-name.railway.app
3. Test with any email address

## ✅ Expected Result
- Frontend loads at the Railway URL
- Forgot password works with any email
- Receive OTP in email inbox
