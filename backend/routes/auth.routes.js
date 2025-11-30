const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const { authRequired } = require('../middleware/authMiddleware');
const { sendEmail } = require("../utils/mailer");

const router = express.Router();

// =======================
// ✅ LOGIN
// =======================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  /*if (!user.email_verified) {
  return res.status(403).json({
    message: "Please verify your email before logging in",
  });
}*/

  try {
    const result = await db.query(
      'SELECT id, email, password_hash, role, tenant_id, status FROM public.users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'User is not active' });
    }

    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        tenantId: user.tenant_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// =======================
// ✅ FORGOT PASSWORD (REAL EMAIL SENDING)
// =======================
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const result = await db.query(
      'SELECT id, email FROM public.users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.json({ message: 'If that email exists, a reset link has been sent' });
    }

    const user = result.rows[0];

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      `INSERT INTO public.password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)` ,
      [user.id, token, expiresAt]
    );

    const resetLink = `${process.env.FRONTEND_BASE_URL}/reset-password/${token}`;

    // ✅ SEND EMAIL (REAL)
    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Password Reset</h2>
          <p>You requested a password reset for your Hospital CRM account.</p>
          <p>Click the button below to reset your password:</p>
          <a
            href="${resetLink}"
            style="
              display: inline-block;
              margin-top: 12px;
              padding: 10px 20px;
              background: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 6px;
            "
          >
            Reset Password
          </a>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            If you did not request this, please ignore this email.
          </p>
        </div>
      `,
    });

    console.log(`✅ Password reset email sent to ${user.email}`);

    res.json({ message: 'If that email exists, a reset link has been sent' });

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// =======================
// ✅ RESET PASSWORD
// =======================
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: 'token and password are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT id, user_id, expires_at, used
       FROM public.password_reset_tokens
       WHERE token = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [token]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const row = result.rows[0];
    const now = new Date();

    if (row.used || now > row.expires_at) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await client.query(
      'UPDATE public.users SET password_hash = $1 WHERE id = $2',
      [passwordHash, row.user_id]
    );

    await client.query(
      'UPDATE public.password_reset_tokens SET used = true WHERE id = $1',
      [row.id]
    );

    await client.query('COMMIT');

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});
// =======================
// ✅ Email Verification
// =======================
router.get("/verify-email/:token", async (req, res) => {
  const { token } = req.params;

  try {
    const result = await db.query(
      `SELECT id, user_id FROM public.email_verification_tokens WHERE token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid verification token" });
    }

    const row = result.rows[0];

    await db.query(
      "UPDATE public.users SET email_verified = true WHERE id = $1",
      [row.user_id]
    );

    await db.query(
      "DELETE FROM public.email_verification_tokens WHERE id = $1",
      [row.id]
    );

    res.redirect(`${process.env.FRONTEND_BASE_URL}/email-verified`);
  } catch (err) {
    console.error("Verify email error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// =======================
// ✅ LOGOUT
// =======================
router.post('/logout', authRequired, async (req, res) => {
  try {
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
