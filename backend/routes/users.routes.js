const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authRequired, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Helper to create user with a specific role
async function createUserWithRole(tenantId, data, role) {
  const { fullName, email, phone, password, department, specialization, shift } = data;

  if (!fullName || !email || !password) {
    throw new Error('fullName, email, password are required');
  }

  const existing = await db.query(
    'SELECT id FROM public.users WHERE email = $1',
    [email]
  );

  if (existing.rows.length > 0) {
    throw new Error('User with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await db.query(
    `INSERT INTO public.users
     (tenant_id, full_name, email, password_hash, role, department, specialization, shift)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [tenantId, fullName, email, passwordHash, role, department || null, specialization || null, shift || null]
  );

  return result.rows[0].id;
}

// Create doctor (HOSPITAL_ADMIN only)
router.post(
  '/create-doctor',
  authRequired,
  requireRole(['HOSPITAL_ADMIN']),
  async (req, res) => {
    try {
      const doctorId = await createUserWithRole(req.user.tenantId, req.body, 'DOCTOR');
      res.status(201).json({
        message: 'Doctor created successfully',
        doctorId,
      });
    } catch (err) {
      console.error('Error creating doctor:', err);
      res.status(400).json({ message: err.message });
    }
  }
);

// Create nurse
router.post(
  '/create-nurse',
  authRequired,
  requireRole(['HOSPITAL_ADMIN']),
  async (req, res) => {
    try {
      const nurseId = await createUserWithRole(req.user.tenantId, req.body, 'NURSE');
      res.status(201).json({
        message: 'Nurse created successfully',
        nurseId,
      });
    } catch (err) {
      console.error('Error creating nurse:', err);
      res.status(400).json({ message: err.message });
    }
  }
);

// Create receptionist
router.post(
  '/create-receptionist',
  authRequired,
  requireRole(['HOSPITAL_ADMIN']),
  async (req, res) => {
    try {
      const id = await createUserWithRole(req.user.tenantId, req.body, 'RECEPTIONIST');
      res.status(201).json({
        message: 'Receptionist created successfully',
        receptionistId: id,
      });
    } catch (err) {
      console.error('Error creating receptionist:', err);
      res.status(400).json({ message: err.message });
    }
  }
);

// Create pharmacist
router.post(
  '/create-pharmacist',
  authRequired,
  requireRole(['HOSPITAL_ADMIN']),
  async (req, res) => {
    try {
      const id = await createUserWithRole(req.user.tenantId, req.body, 'PHARMACIST');
      res.status(201).json({
        message: 'Pharmacist created successfully',
        pharmacistId: id,
      });
    } catch (err) {
      console.error('Error creating pharmacist:', err);
      res.status(400).json({ message: err.message });
    }
  }
);

// List users in current tenant
router.get(
  '/',
  authRequired,
  requireRole(['HOSPITAL_ADMIN']),
  async (req, res) => {
    try {
      const result = await db.query(
        `SELECT id, full_name, email, role, phone, department, specialization, shift, status, created_at
         FROM public.users
         WHERE tenant_id = $1
         ORDER BY created_at DESC`,
        [req.user.tenantId]
      );

      res.json({ users: result.rows });
    } catch (err) {
      console.error('Error listing users:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Change user status (ACTIVE/INACTIVE)
router.patch(
  '/:id/status',
  authRequired,
  requireRole(['HOSPITAL_ADMIN']),
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    try {
      const result = await db.query(
        `UPDATE public.users
         SET status = $1
         WHERE id = $2 AND tenant_id = $3
         RETURNING id`,
        [status, id, req.user.tenantId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found in this tenant' });
      }

      res.json({ message: 'User status updated' });
    } catch (err) {
      console.error('Error updating user status:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * Update user profile (not password, not role)
 * PUT /api/users/:id
 */
router.put(
  '/:id',
  authRequired,
  requireRole(['HOSPITAL_ADMIN']),
  async (req, res) => {
    const { id } = req.params;
    const {
      fullName,
      phone,
      email,
      department,
      specialization,
      shift,
    } = req.body;

    try {
      // If email is being changed, check uniqueness
      if (email) {
        const existing = await db.query(
          'SELECT id FROM public.users WHERE email = $1 AND id <> $2',
          [email, id]
        );

        if (existing.rows.length > 0) {
          return res.status(400).json({ message: 'Email already in use by another user' });
        }
      }

      const result = await db.query(
        `UPDATE public.users
         SET
           full_name = COALESCE($1, full_name),
           phone = COALESCE($2, phone),
           email = COALESCE($3, email),
           department = COALESCE($4, department),
           specialization = COALESCE($5, specialization),
           shift = COALESCE($6, shift)
         WHERE id = $7 AND tenant_id = $8
         RETURNING id, full_name, email, phone, role, department, specialization, shift, status`,
        [
          fullName,
          phone,
          email,
          department,
          specialization,
          shift,
          id,
          req.user.tenantId,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found in this hospital' });
      }

      res.json({
        message: 'User updated successfully',
        user: result.rows[0],
      });
    } catch (err) {
      console.error('Update user error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * Change password (logged-in user)
 * POST /api/users/change-password
 */
router.post(
  '/change-password',
  authRequired,
  async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'currentPassword and newPassword are required',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: 'New password must be at least 8 characters long',
      });
    }

    try {
      // Fetch current user's password hash
      const userResult = await db.query(
        `SELECT password_hash
         FROM public.users
         WHERE id = $1`,
        [req.user.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const user = userResult.rows[0];

      const isMatch = await require('bcryptjs').compare(
        currentPassword,
        user.password_hash
      );

      if (!isMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      const newHash = await require('bcryptjs').hash(newPassword, 10);

      await db.query(
        `UPDATE public.users
         SET password_hash = $1
         WHERE id = $2`,
        [newHash, req.user.id]
      );

      res.json({ message: 'Password changed successfully' });
    } catch (err) {
      console.error('Change password error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);


module.exports = router;
