const express = require('express');
const db = require('../config/db');
const { authRequired, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

async function getTenantSchema(tenantId) {
  const result = await db.query(
    'SELECT schema_name FROM public.tenants WHERE id = $1',
    [tenantId]
  );
  if (result.rows.length === 0) {
    throw new Error('Tenant not found');
  }
  return result.rows[0].schema_name;
}

/**
 * Dashboard summary for hospital
 * GET /api/dashboard/summary
 */
router.get(
  '/summary',
  authRequired,
  requireRole(['HOSPITAL_ADMIN']),
  async (req, res) => {
    try {
      const schemaName = await getTenantSchema(req.user.tenantId);

      const totalPatientsResult = await db.query(
        `SELECT COUNT(*) AS count FROM ${schemaName}.patients`
      );

      const todayPatientsResult = await db.query(
        `SELECT COUNT(*) AS count
         FROM ${schemaName}.patients
         WHERE created_at::date = CURRENT_DATE`
      );

      const totalCasesResult = await db.query(
        `SELECT COUNT(*) AS count FROM ${schemaName}.cases`
      );

      const totalPrescriptionsResult = await db.query(
        `SELECT COUNT(*) AS count FROM ${schemaName}.prescriptions`
      );

      res.json({
        totalPatients: parseInt(totalPatientsResult.rows[0].count, 10),
        todayRegistrations: parseInt(todayPatientsResult.rows[0].count, 10),
        totalCases: parseInt(totalCasesResult.rows[0].count, 10),
        totalPrescriptions: parseInt(totalPrescriptionsResult.rows[0].count, 10),
      });
    } catch (err) {
      console.error('Error in dashboard summary:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

module.exports = router;
