import dotenv from 'dotenv';
dotenv.config(); // ⬅️ MUST go at the very top

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function sendVerificationEmail(to, token) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const verificationLink = `${baseUrl}/verify?token=${token}`;


  const mailOptions = {
    from: `"Pokémon Tag Engine" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Verify Your Account',
    html: `
      <h2>Welcome!</h2>
      <p>Please verify your account by clicking the link below:</p>
      <a href="${verificationLink}">Verify My Account</a>
      <p>This link will expire in 24 hours.</p>
    `
  };

  return transporter.sendMail(mailOptions);
}

function sendPasswordResetEmail(to, resetLink) {
  const mailOptions = {
    from: `"Pokémon Tag Engine" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Reset Your Password',
    html: `
      <h2>Password Reset</h2>
      <p>You requested to reset your password. Click the link below to continue:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>This link will expire in 1 hour.</p>
    `
  };

  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Present' : '❌ MISSING');


  return transporter.sendMail(mailOptions);
}

export { sendVerificationEmail, sendPasswordResetEmail };
