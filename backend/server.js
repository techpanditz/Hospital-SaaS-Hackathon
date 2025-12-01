require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const authRoutes = require('./routes/auth.routes');
const tenantRoutes = require('./routes/tenant.routes');
const patientRoutes = require('./routes/patient.routes');
const userRoutes = require('./routes/users.routes');
const prescriptionRoutes = require('./routes/prescription.routes');
const dashboardRoutes = require('./routes/dashboard.routes'); 
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");

require('./middleware/authMiddleware'); // initializes passport strategy

const app = express();

app.use(express.json());
app.use(passport.initialize());
app.use('/api/users', userRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/dashboard', dashboardRoutes);

console.log("✅ DATABASE_URL loaded:", !!process.env.DATABASE_URL);

// Simple healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await require("./config/db").query("select now()");
    res.json({ db: "connected", time: result.rows[0] });
  } catch (err) {
    console.error("❌ DB test failed:", err.message);
    res.status(500).json({ db: "failed", error: err.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/patients', patientRoutes);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const PORT = process.env.PORT || 4000;


const cors = require("cors");

app.use(cors({
  origin: "https://hospital-saas-hackathon-frontend.onrender.com",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.options("*", cors());

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
