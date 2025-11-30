const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const db = require('../config/db');
require('dotenv').config();

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      // Fetch user
      const result = await db.query(
        'SELECT id, email, role, tenant_id FROM public.users WHERE id = $1',
        [jwt_payload.userId]
      );

      if (result.rows.length === 0) {
        return done(null, false);
      }

      const user = result.rows[0];

      // ✅ FETCH TENANT SCHEMA USING TENANT_ID
      const tenantRes = await db.query(
        'SELECT schema_name FROM public.tenants WHERE id = $1',
        [user.tenant_id]
      );

      if (tenantRes.rows.length === 0) {
        return done(null, false);
      }

      const tenantSchema = tenantRes.rows[0].schema_name;

      // ✅ ATTACH EVERYTHING CLEANLY
      return done(null, {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id,
        tenantSchema, // ✅ THIS FIXES EXPORT & ALL TENANT QUERIES
      });
    } catch (err) {
      return done(err, false);
    }
  })
);

const authRequired = passport.authenticate('jwt', { session: false });

const requireRole = (roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  next();
};

module.exports = {
  authRequired,
  requireRole,
};
