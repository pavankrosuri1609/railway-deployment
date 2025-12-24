const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const sgMail = require('@sendgrid/mail');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Configure SendGrid
sgMail.setApiKey(process.env.SMTP_PASSWORD);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, 'frontend')));

// OTP storage (in-memory for demo)
const otpStorage = new Map();

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'RCA Email Service is running',
    timestamp: new Date().toISOString()
  });
});

// Forgot password endpoint
app.post('/api/v1/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiryTime = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    otpStorage.set(email, { otp, expiryTime });

    // Send email
    const msg = {
      to: email,
      from: process.env.EMAIL_FROM || 'noreply@pragmaq.com',
      subject: 'Password Reset Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">Password Reset Verification</h2>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="font-size: 16px; color: #555;">Your verification code is:</p>
            <h1 style="font-size: 32px; color: #007bff; text-align: center; margin: 10px 0; letter-spacing: 3px;">${otp}</h1>
            <p style="font-size: 14px; color: #666;">This code will expire in 10 minutes.</p>
          </div>
          <p style="font-size: 14px; color: #666; text-align: center;">
            If you didn't request this reset, please ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            RCA Platform - Password Reset System
          </p>
        </div>
      `
    };

    await sgMail.send(msg);
    
    console.log(`OTP sent to ${email}: ${otp}`);
    
    res.json({ 
      success: true, 
      message: 'OTP sent successfully' 
    });

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send OTP. Please try again.' 
    });
  }
});

// Resend OTP endpoint
app.post('/api/v1/auth/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiryTime = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    otpStorage.set(email, { otp, expiryTime });

    // Send email
    const msg = {
      to: email,
      from: process.env.EMAIL_FROM || 'noreply@pragmaq.com',
      subject: 'New Password Reset Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">New Verification Code</h2>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="font-size: 16px; color: #555;">Your new verification code is:</p>
            <h1 style="font-size: 32px; color: #007bff; text-align: center; margin: 10px 0; letter-spacing: 3px;">${otp}</h1>
            <p style="font-size: 14px; color: #666;">This code will expire in 10 minutes.</p>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            RCA Platform - Password Reset System
          </p>
        </div>
      `
    };

    await sgMail.send(msg);
    
    console.log(`New OTP sent to ${email}: ${otp}`);
    
    res.json({ 
      success: true, 
      message: 'New OTP sent successfully' 
    });

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send OTP. Please try again.' 
    });
  }
});

// Reset password endpoint
app.post('/api/v1/auth/reset-password', (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, OTP, and new password are required' 
      });
    }

    // Verify OTP
    const stored = otpStorage.get(email);
    if (!stored) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired OTP' 
      });
    }

    if (stored.otp !== otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP' 
      });
    }

    if (Date.now() > stored.expiryTime) {
      otpStorage.delete(email);
      return res.status(400).json({ 
        success: false, 
        message: 'OTP has expired' 
      });
    }

    // Validate password
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters' 
      });
    }

    // Clear OTP and simulate password update
    otpStorage.delete(email);
    
    console.log(`Password reset successful for ${email}`);
    
    res.json({ 
      success: true, 
      message: 'Password reset successfully' 
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reset password. Please try again.' 
    });
  }
});

// Catch all route - serve index.html for frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 RCA Email Service running on port ${PORT}`);
  console.log(`📧 SendGrid API configured`);
  console.log(`🌐 Server ready at http://localhost:${PORT}`);
});