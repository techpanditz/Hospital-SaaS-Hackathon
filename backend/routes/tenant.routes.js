const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const crypto = require("crypto");
const { sendEmail } = require("../utils/mailer");

const router = express.Router();

// Helper to generate schema name
function generateSchemaName() {
  const random = Math.random().toString(36).substring(2, 8);
  return `tenant_${random}`;
}

router.post('/register-hospital', async (req, res) => {
  const {
    name,
    address,
    contactEmail,
    contactPhone,
    licenseNumber,
    adminName,
    adminEmail,
    adminPhone,
    adminPassword,
  } = req.body;

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // ✅ Ensure license is unique
    const licenseCheck = await client.query(
      'SELECT id FROM public.tenants WHERE license_number = $1',
      [licenseNumber]
    );

    if (licenseCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'License number already registered' });
    }

    // Ensure admin email unique
    const emailCheck = await client.query(
      'SELECT id FROM public.users WHERE email = $1',
      [adminEmail]
    );

    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Admin email already registered' });
    }


    const schemaName = generateSchemaName();

    // 1. Create schema
    await client.query(`CREATE SCHEMA ${schemaName};`);

    // 2. Apply tenant schema SQL template
    const schemaSqlPath = path.join(__dirname, '..', 'db', 'tenant_schema.sql');
    let schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');
    schemaSql = schemaSql.replace(/__SCHEMA__/g, schemaName);
    await client.query(schemaSql);

    // 3. Insert tenant
    const tenantResult = await client.query(
      `INSERT INTO public.tenants
       (name, address, contact_email, contact_phone, license_number, schema_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [name, address, contactEmail, contactPhone, licenseNumber, schemaName]
    );

    const tenantId = tenantResult.rows[0].id;

    // 4. Create admin user
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const userResult = await client.query(
      `INSERT INTO public.users
       (tenant_id, full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [tenantId, adminName, adminEmail, passwordHash, 'HOSPITAL_ADMIN']
    );

    const adminUserId = userResult.rows[0].id;

    // ✅ 5. Create email verification token
    const verifyToken = crypto.randomBytes(32).toString("hex");

    await client.query(
      `INSERT INTO public.email_verification_tokens (user_id, token)
       VALUES ($1, $2)`,
      [adminUserId, verifyToken]
    );

    // ✅ 6. Send verification email
    const verifyLink = `${process.env.FRONTEND_BASE_URL}/verify-email/${verifyToken}`;

    await sendEmail({
      to: adminEmail,
      subject: "Verify your Hospital CRM account",
      html: `
        <div style="font-family: Arial; padding: 20px;">
          <h2>Email Verification</h2>
          <p>Please verify your account to activate your hospital:</p>
          <a href="${verifyLink}"
             style="padding:10px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">
            Verify Email
          </a>
        </div>
      `,
    });

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Hospital registered successfully',
      tenantId,
      adminUserId,
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Register hospital error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });

  } finally {
    client.release();
  }
});

module.exports = router;
