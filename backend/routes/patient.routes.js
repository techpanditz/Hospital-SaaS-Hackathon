const express = require('express');
const db = require('../config/db');
const { authRequired, requireRole } = require('../middleware/authMiddleware');
const multer = require('multer');
const supabase = require('../config/supabaseStorage');

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// Helper: get schema name for current tenant
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

// Helper: generate 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


/**
 * Create patient in current tenant
 * POST /api/patients
 */
// Create patient in current tenant

router.post(
  '/',
  authRequired,
  requireRole(['DOCTOR', 'HOSPITAL_ADMIN']),
  async (req, res) => {
    const { aadhaar, fullName, phone, dateOfBirth, gender, department } = req.body;

    if (!aadhaar || !fullName) {
      return res.status(400).json({ message: 'aadhaar and fullName are required' });
    }

    if (!/^\d{12}$/.test(aadhaar)) {
      return res.status(400).json({ message: 'aadhaar must be exactly 12 digits' });
    }

    const client = await db.pool.connect();

    try {
      const schemaName = await getTenantSchema(req.user.tenantId);

      // ✅ BLOCK DUPLICATE AADHAAR IN SAME HOSPITAL
      const duplicate = await db.query(
        `SELECT id FROM ${schemaName}.patients WHERE aadhaar = $1`,
        [aadhaar]
      );

      if (duplicate.rows.length > 0) {
        return res.status(400).json({
          message: 'Aadhaar already exists for another patient in this hospital'
        });
      }


      await client.query('BEGIN');

      const insertPatientSql = `
        INSERT INTO ${schemaName}.patients (aadhaar, full_name, phone, date_of_birth, gender, department)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, aadhaar, full_name, phone, department
      `;
      const patientResult = await client.query(insertPatientSql, [
        aadhaar,
        fullName,
        phone || null,
        dateOfBirth || null,
        gender || null,
        department || null,
      ]);

      const patient = patientResult.rows[0];

      await client.query(
        `INSERT INTO public.global_patients
         (aadhaar, full_name, phone, tenant_schema, tenant_patient_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [patient.aadhaar, patient.full_name, patient.phone, schemaName, patient.id]
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Patient created successfully',
        patient,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error creating patient:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    } finally {
      client.release();
    }
  }
);

/**
 * List/search patients in current tenant (FR-9 + ABAC)
 * GET /api/patients
 * Query params: search, aadhaar, phone, page, pageSize
 */
router.get(
  '/',
  authRequired,
  requireRole(['DOCTOR', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'NURSE']),
  async (req, res) => {
    const { search, aadhaar, phone, page = 1, pageSize = 20 } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);

    try {
      const schemaName = await getTenantSchema(req.user.tenantId);

      let whereClauses = [];
      let params = [];
      let paramIndex = 1;

      if (aadhaar) {
        whereClauses.push(`aadhaar = $${paramIndex++}`);
        params.push(aadhaar);
      }

      if (phone) {
        whereClauses.push(`phone = $${paramIndex++}`);
        params.push(phone);
      }

      if (search) {
        whereClauses.push(`full_name ILIKE $${paramIndex++}`);
        params.push(`%${search}%`);
      }

      // ABAC: doctors only see patients in their department (if they have one)
      if (req.user.role === 'DOCTOR') {
        const userResult = await db.query(
          'SELECT department FROM public.users WHERE id = $1',
          [req.user.id]
        );
        const userDept = userResult.rows[0]?.department;
        if (userDept) {
          whereClauses.push(`department = $${paramIndex++}`);
          params.push(userDept);
        }
      }

      const whereSql = whereClauses.length
        ? `WHERE ${whereClauses.join(' AND ')}`
        : '';

      const querySql = `
        SELECT id, aadhaar, full_name, phone, date_of_birth, gender, blood_group, patient_type, department, created_at
        FROM ${schemaName}.patients
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT ${parseInt(pageSize, 10)} OFFSET ${offset}
      `;

      const result = await db.query(querySql, params);

      res.json({
        patients: result.rows,
        page: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10),
      });
    } catch (err) {
      console.error('Error listing patients:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);



/**
 * Fetch patients across all tenants by Aadhaar (reference only)
 * POST /api/patients/fetch-by-aadhaar
 */
router.post(
  '/fetch-by-aadhaar',
  authRequired,
  requireRole(['DOCTOR', 'HOSPITAL_ADMIN']),
  async (req, res) => {
    const { aadhaar } = req.body;

    if (!aadhaar || !/^\d{12}$/.test(aadhaar)) {
      return res.status(400).json({ message: 'Valid 12-digit aadhaar is required' });
    }

    try {
      const result = await db.query(
        `SELECT id, aadhaar, full_name, phone, tenant_schema, tenant_patient_id
         FROM public.global_patients
         WHERE aadhaar = $1`,
        [aadhaar]
      );

      const matches = result.rows.map((row) => ({
        globalPatientId: row.id,
        aadhaar: row.aadhaar,
        fullName: row.full_name,
        phone: row.phone,
        tenantSchema: row.tenant_schema,
        tenantPatientId: row.tenant_patient_id,
      }));

      res.json({ matches });
    } catch (err) {
      console.error('Error fetching by aadhaar:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

/**
 * Request OTP for importing a specific global patient into current tenant
 * POST /api/patients/request-import-otp
 */
router.post(
  '/request-import-otp',
  authRequired,
  requireRole(['DOCTOR', 'HOSPITAL_ADMIN']),
  async (req, res) => {
    const { globalPatientId } = req.body;

    if (!globalPatientId) {
      return res.status(400).json({ message: 'globalPatientId is required' });
    }

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Ensure global patient exists
      const gpResult = await client.query(
        `SELECT id, aadhaar, phone
         FROM public.global_patients
         WHERE id = $1`,
        [globalPatientId]
      );

      if (gpResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Global patient not found' });
      }

      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Insert OTP entry
      await client.query(
        `INSERT INTO public.patient_import_otps
         (global_patient_id, otp_code, expires_at)
         VALUES ($1, $2, $3)`,
        [globalPatientId, otp, expiresAt]
      );

      await client.query('COMMIT');

      // For hackathon: simulate sending via email/SMS by logging to console
      console.log(
        `IMPORT OTP for globalPatientId=${globalPatientId} | OTP=${otp} (valid 10 min)`
      );

      res.json({
        message: 'OTP generated and (simulated) sent to patient email/phone',
        // For demo only – in real production you would NOT return this
        otpDemo: otp,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error generating import OTP:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    } finally {
      client.release();
    }
  }
);

/**
 * Verify OTP and import patient + cases into current tenant schema
 * POST /api/patients/verify-otp
 */
router.post(
  '/verify-otp',
  authRequired,
  requireRole(['DOCTOR', 'HOSPITAL_ADMIN']),
  async (req, res) => {
    const { globalPatientId, otp, importPrescriptions } = req.body;
    const destSchema = req.user.tenant_schema;
    let newPatientId;

    if (!globalPatientId || !otp) {
      return res.status(400).json({ message: 'globalPatientId and otp are required' });
    }

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // 1) Validate OTP
      const otpResult = await client.query(
        `SELECT id, otp_code, expires_at, used
         FROM public.patient_import_otps
         WHERE global_patient_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [globalPatientId]
      );

      if (otpResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'No OTP found for this patient' });
      }

      const otpRow = otpResult.rows[0];
      const now = new Date();

      if (otpRow.used) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'OTP already used' });
      }

      if (now > otpRow.expires_at) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'OTP expired' });
      }

      if (otpRow.otp_code !== otp) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Invalid OTP' });
      }

      // 2) Get global patient reference
      const gpResult = await client.query(
        `SELECT id, aadhaar, full_name, phone, tenant_schema, tenant_patient_id
         FROM public.global_patients
         WHERE id = $1`,
        [globalPatientId]
      );

      if (gpResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Global patient not found' });
      }

      const globalPatient = gpResult.rows[0];

      const sourceSchema = globalPatient.tenant_schema;
      const sourcePatientId = globalPatient.tenant_patient_id;
      const destSchema = await getTenantSchema(req.user.tenantId);

      // 3) Fetch patient & cases from source schema
      const srcPatientResult = await client.query(
        `SELECT id, aadhaar, full_name, phone, date_of_birth, gender
         FROM ${sourceSchema}.patients
         WHERE id = $1`,
        [sourcePatientId]
      );

      if (srcPatientResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Source patient not found' });
      }

      const srcPatient = srcPatientResult.rows[0];

      const srcCasesResult = await client.query(
        `SELECT id, diagnosis, notes, created_at
         FROM ${sourceSchema}.cases
         WHERE patient_id = $1`,
        [sourcePatientId]
      );

      const srcCases = srcCasesResult.rows;

      // 4) Insert patient into destination schema
const destPatientResult = await client.query(
  `INSERT INTO ${destSchema}.patients
   (aadhaar, full_name, phone, date_of_birth, gender)
   VALUES ($1, $2, $3, $4, $5)
   RETURNING id`,
  [
    srcPatient.aadhaar,
    srcPatient.full_name,
    srcPatient.phone,
    srcPatient.date_of_birth,
    srcPatient.gender,
  ]
);

// ✅ FIX: declare ONCE and correctly
newPatientId = destPatientResult.rows[0].id;

//==========================
if (importPrescriptions) {

  // 1. Get prescriptions from source tenant
  const presRes = await client.query(`
    SELECT * FROM ${sourceSchema}.prescriptions
    WHERE patient_id = $1
  `, [sourcePatientId]);

  for (const pres of presRes.rows) {

    // ✅ FIX: use destSchema (NOT currentSchema)
    const newPres = await client.query(`
      INSERT INTO ${destSchema}.prescriptions
      (patient_id, doctor_id, diagnosis, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [
      newPatientId,
      pres.doctor_id,
      pres.diagnosis,
      pres.notes
    ]);

    const itemsRes = await client.query(`
      SELECT * FROM ${sourceSchema}.prescription_items
      WHERE prescription_id = $1
    `, [pres.id]);

    for (const item of itemsRes.rows) {
      await client.query(`
        INSERT INTO ${destSchema}.prescription_items
        (prescription_id, medicine_name, dosage, frequency, duration, instructions)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        newPres.rows[0].id,
        item.medicine_name,
        item.dosage,
        item.frequency,
        item.duration,
        item.instructions
      ]);
    }
  }
}
//==========================

      // 5) Insert cases into destination schema
      for (const c of srcCases) {
        await client.query(
          `INSERT INTO ${destSchema}.cases
           (patient_id, diagnosis, notes, created_at)
           VALUES ($1, $2, $3, $4)`,
          [newPatientId, c.diagnosis, c.notes, c.created_at]
        );
      }

      // 6) Add new row into global_patients for the dest tenant
      await client.query(
        `INSERT INTO public.global_patients
         (aadhaar, full_name, phone, tenant_schema, tenant_patient_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          srcPatient.aadhaar,
          srcPatient.full_name,
          srcPatient.phone,
          destSchema,
          newPatientId,
        ]
      );

      // 7) Mark OTP as used
      await client.query(
        `UPDATE public.patient_import_otps
         SET used = true
         WHERE id = $1`,
        [otpRow.id]
      );

      await client.query('COMMIT');

      res.json({
        message: 'Patient imported successfully',
        newPatientId,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error verifying OTP / importing patient:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    } finally {
      client.release();
    }
  }
);

// EXPORT PATIENTS AS CSV
router.get('/export', authRequired, async (req, res) => {
  try {
    const schema = await getTenantSchema(req.user.tenantId);

    const result = await db.query(`
      SELECT 
        full_name,
        aadhaar,
        phone,
        gender,
        date_of_birth,
        patient_type,
        created_at
      FROM ${schema}.patients
      ORDER BY created_at DESC
    `);

    const rows = result.rows;

    let csv = "Full Name,Aadhaar,Phone,Gender,DOB,Type,Created At\n";

    rows.forEach((p) => {
      csv += `"${p.full_name}","${p.aadhaar}","${p.phone || ""}","${p.gender || ""}","${p.date_of_birth || ""}","${p.patient_type || ""}","${p.created_at}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=patients.csv");
    res.status(200).send(csv);

  } catch (err) {
    console.error("Export patients error:", err);
    res.status(500).json({
      message: "Failed to export patients",
      error: err.message,
    });
  }
});



/**
 * Get single patient full details
 * GET /api/patients/:id
 */
router.get(
  '/:id',
  authRequired,
  requireRole(['DOCTOR', 'HOSPITAL_ADMIN', 'NURSE', 'RECEPTIONIST']),
  async (req, res) => {
    const { id } = req.params;

    try {
      const schemaName = await getTenantSchema(req.user.tenantId);

      const patientResult = await db.query(
        `SELECT *
         FROM ${schemaName}.patients
         WHERE id = $1`,
        [id]
      );

      if (patientResult.rows.length === 0) {
        return res.status(404).json({ message: 'Patient not found in this hospital' });
      }

      const patient = patientResult.rows[0];

      const casesResult = await db.query(
        `SELECT *
         FROM ${schemaName}.cases
         WHERE patient_id = $1
         ORDER BY created_at DESC`,
        [id]
      );

      const prescriptionsResult = await db.query(
        `SELECT p.id, p.created_at, u.full_name AS doctor_name
         FROM ${schemaName}.prescriptions p
         JOIN public.users u ON p.doctor_id = u.id
         WHERE p.patient_id = $1
         ORDER BY p.created_at DESC`,
        [id]
      );

      res.json({
        patient,
        cases: casesResult.rows,
        prescriptions: prescriptionsResult.rows,
      });
    } catch (err) {
      console.error('Error fetching patient details:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);





/**
 * Export patients (JSON export)
 * GET /api/patients/export
 */
router.get(
  '/export/all',
  authRequired,
  requireRole(['HOSPITAL_ADMIN']),
  async (req, res) => {
    try {
      const schemaName = await getTenantSchema(req.user.tenantId);

      const result = await db.query(
        `SELECT *
         FROM ${schemaName}.patients
         ORDER BY created_at DESC`
      );

      res.json({
        exportedAt: new Date().toISOString(),
        total: result.rows.length,
        patients: result.rows,
      });
    } catch (err) {
      console.error('Error exporting patients:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

/**
 * Upload patient profile photo (Supabase Storage)
 * POST /api/patients/:id/photo
 */
router.post(
  '/:id/photo',
  authRequired,
  requireRole(['DOCTOR', 'HOSPITAL_ADMIN', 'RECEPTIONIST']),
  upload.single('photo'),
  async (req, res) => {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No photo uploaded' });
    }

    try {
      const schemaName = await getTenantSchema(req.user.tenantId);

      // Upload to Supabase Storage
      const fileExt = req.file.originalname.split('.').pop();
      const fileName = `patient_${id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('patient-photos')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
        });

      if (uploadError) {
        console.error(uploadError);
        return res.status(500).json({ message: 'Photo upload failed' });
      }

      // Get public URL
      const { data } = supabase.storage
        .from('patient-photos')
        .getPublicUrl(fileName);

      const photoUrl = data.publicUrl;

      // Save URL in tenant DB
      const result = await db.query(
        `UPDATE ${schemaName}.patients
         SET profile_photo_url = $1
         WHERE id = $2
         RETURNING id, profile_photo_url`,
        [photoUrl, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Patient not found in this hospital' });
      }

      res.json({
        message: 'Profile photo uploaded to Supabase',
        profilePhotoUrl: result.rows[0].profile_photo_url,
      });
    } catch (err) {
      console.error('Supabase photo upload error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * Update patient details
 * PUT /api/patients/:id
 */
/**
 * Update patient details
 * PUT /api/patients/:id
 */
router.put(
  '/:id',
  authRequired,
  requireRole(['DOCTOR', 'HOSPITAL_ADMIN', 'RECEPTIONIST']),
  async (req, res) => {
    const patientId = req.params.id;

    const {
      aadhaar,
      fullName,
      phone,
      dateOfBirth,
      gender,
      department,
      blood_group,
      address,
      emergency_contact,
      patient_type,
    } = req.body;

    try {
      const schemaName = await getTenantSchema(req.user.tenantId);

      // ✅ BLOCK DUPLICATE AADHAAR ON UPDATE (EXCLUDE CURRENT PATIENT)
      if (aadhaar) {
        const duplicate = await db.query(
          `SELECT id FROM ${schemaName}.patients 
           WHERE aadhaar = $1 AND id != $2`,
          [aadhaar, patientId]
        );

        if (duplicate.rows.length > 0) {
          return res.status(400).json({
            message: 'Aadhaar already exists for another patient in this hospital',
          });
        }
      }

      const result = await db.query(
        `UPDATE ${schemaName}.patients
         SET
           aadhaar = COALESCE($1, aadhaar),
           full_name = COALESCE($2, full_name),
           phone = COALESCE($3, phone),
           date_of_birth = COALESCE($4, date_of_birth),
           gender = COALESCE($5, gender),
           department = COALESCE($6, department),
           blood_group = COALESCE($7, blood_group),
           address = COALESCE($8, address),
           emergency_contact = COALESCE($9, emergency_contact),
           patient_type = COALESCE($10, patient_type)
         WHERE id = $11
         RETURNING *`,
        [
          aadhaar,
          fullName,
          phone,
          dateOfBirth,
          gender,
          department,
          blood_group,
          address,
          emergency_contact,
          patient_type,
          patientId,
        ]
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ message: 'Patient not found in this hospital' });
      }

      res.json({
        message: 'Patient updated successfully',
        patient: result.rows[0],
      });
    } catch (err) {
      console.error('Update patient error:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);



module.exports = router;


