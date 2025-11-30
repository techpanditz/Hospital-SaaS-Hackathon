const db = require('../config/db');

async function setTenantSchema(req, res, next) {
  try {
    const tenantId = req.user.tenantId;

    const result = await db.query(
      'SELECT schema_name FROM public.tenants WHERE id = $1',
      [tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid tenant' });
    }

    const schemaName = result.rows[0].schema_name;

    // Attach schema name to request
    req.tenantSchema = schemaName;

    // Set schema for this connection
    await db.query(`SET search_path TO ${schemaName};`);

    next();
  } catch (err) {
    console.error('Tenant context error:', err);
    res.status(500).json({ message: 'Tenant resolution failed' });
  }
}

module.exports = { setTenantSchema };
