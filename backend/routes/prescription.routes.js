const express = require('express');
const db = require('../config/db');
const { authRequired, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Helper from patient routes: get schema
async function getTenantSchema(tenantId) {
  const result = await db.query(
    'SELECT schema_name FROM public.tenants WHERE id = $1',
    [tenantId]
  );
  if (result.rows.length === 0) {
    throw new Error('Tenant not found for this user');
  }
  return result.rows[0].schema_name;
}

/**
 * Create prescription for patient (FR-10)
 * POST /api/prescriptions
 */
router.post(
  '/',
  authRequired,
  requireRole(['DOCTOR', 'HOSPITAL_ADMIN']),
  async (req, res) => {
    const { patientId, medicines, diagnosis, notes } = req.body;

    // medicines MUST be an array of objects
    if (!patientId || !Array.isArray(medicines) || medicines.length === 0) {
      return res
        .status(400)
        .json({ message: 'patientId and medicines are required' });
    }

    const client = await db.pool.connect();

    try {
      const schemaName = await getTenantSchema(req.user.tenantId);

      await client.query('BEGIN');

      // Ensure patient exists in this tenant
      const patientResult = await client.query(
        `SELECT id FROM ${schemaName}.patients WHERE id = $1`,
        [patientId]
      );

      if (patientResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res
          .status(404)
          .json({ message: 'Patient not found in this hospital' });
      }

      // Insert prescription header
      const presResult = await client.query(
  `INSERT INTO ${schemaName}.prescriptions
   (patient_id, doctor_id, diagnosis, notes)
   VALUES ($1, $2, $3, $4)
   RETURNING id, created_at`,
  [patientId, req.user.id, diagnosis || null, notes || null]
);


      const prescription = presResult.rows[0];

      // Insert medicines/items
      for (const med of medicines) {
        await client.query(
          `INSERT INTO ${schemaName}.prescription_items
           (prescription_id, medicine_name, dosage, frequency, duration, instructions)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            prescription.id,
            med.name, // frontend will send { name, dosage, ... }
            med.dosage || null,
            med.frequency || null,
            med.duration || null,
            med.instructions || null,
          ]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Prescription created successfully',
        prescriptionId: prescription.id,
        createdAt: prescription.created_at,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error creating prescription:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    } finally {
      client.release();
    }
  }
);

/**
 * List prescriptions for a patient
 * GET /api/prescriptions/patient/:patientId
 */
router.get(
  '/patient/:patientId',
  authRequired,
  requireRole(['DOCTOR', 'HOSPITAL_ADMIN', 'NURSE', 'PHARMACIST']),
  async (req, res) => {
    const { patientId } = req.params;

    try {
      const schemaName = await getTenantSchema(req.user.tenantId);

      const presResult = await db.query(
        `SELECT p.id, p.patient_id, p.doctor_id, p.created_at, p.diagnosis, p.notes,
                u.full_name AS doctor_name
         FROM ${schemaName}.prescriptions p
         JOIN public.users u ON p.doctor_id = u.id
         WHERE p.patient_id = $1
         ORDER BY p.created_at DESC`,
        [patientId]
      );

      const prescriptions = [];

      for (const pres of presResult.rows) {
        const itemsResult = await db.query(
          `SELECT id, medicine_name, dosage, frequency, duration, instructions
           FROM ${schemaName}.prescription_items
           WHERE prescription_id = $1`,
          [pres.id]
        );

        prescriptions.push({
          id: pres.id,
          createdAt: pres.created_at,
          doctorId: pres.doctor_id,
          doctorName: pres.doctor_name,
          diagnosis: pres.diagnosis,
          notes: pres.notes,
          items: itemsResult.rows,
        });
      }

      res.json({ prescriptions });
    } catch (err) {
      console.error('Error listing prescriptions:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

/**
 * Update prescription (replace medicines)
 * PUT /api/prescriptions/:prescriptionId
 */
router.put(
  '/:prescriptionId',
  authRequired,
  requireRole(['DOCTOR']),
  async (req, res) => {
    const { prescriptionId } = req.params;
    const { medicines } = req.body;

    if (!Array.isArray(medicines) || medicines.length === 0) {
      return res
        .status(400)
        .json({ message: 'medicines array is required' });
    }

    const client = await db.pool.connect();

    try {
      const schemaName = await getTenantSchema(req.user.tenantId);

      await client.query('BEGIN');

      // Ensure prescription exists in this tenant
      const presCheck = await client.query(
        `SELECT id FROM ${schemaName}.prescriptions WHERE id = $1`,
        [prescriptionId]
      );

      if (presCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res
          .status(404)
          .json({ message: 'Prescription not found in this hospital' });
      }

      // Delete old items
      await client.query(
        `DELETE FROM ${schemaName}.prescription_items WHERE prescription_id = $1`,
        [prescriptionId]
      );

      // Insert new items
      for (const med of medicines) {
        await client.query(
          `INSERT INTO ${schemaName}.prescription_items
           (prescription_id, medicine_name, dosage, frequency, duration, instructions)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            prescriptionId,
            med.name,
            med.dosage || null,
            med.frequency || null,
            med.duration || null,
            med.instructions || null,
          ]
        );
      }

      await client.query('COMMIT');

      res.json({ message: 'Prescription updated successfully' });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error updating prescription:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    } finally {
      client.release();
    }
  }
);

/**
 * Delete prescription
 * DELETE /api/prescriptions/:prescriptionId
 */
router.delete(
  '/:prescriptionId',
  authRequired,
  requireRole(['DOCTOR']),
  async (req, res) => {
    const { prescriptionId } = req.params;

    const client = await db.pool.connect();

    try {
      const schemaName = await getTenantSchema(req.user.tenantId);

      const result = await client.query(
        `DELETE FROM ${schemaName}.prescriptions WHERE id = $1 RETURNING id`,
        [prescriptionId]
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ message: 'Prescription not found in this hospital' });
      }

      res.json({ message: 'Prescription deleted successfully' });
    } catch (err) {
      console.error('Error deleting prescription:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    } finally {
      client.release();
    }
  }
);

module.exports = router;
