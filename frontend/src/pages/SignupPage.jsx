import { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  Paper,
} from "@mui/material";
import client from "../api/client";
import { useNavigate } from "react-router-dom";

export default function SignupPage() {
  const [form, setForm] = useState({
    name: "",
    address: "",
    contactEmail: "",
    contactPhone: "",
    licenseNumber: "",
    adminName: "",
    adminEmail: "",
    adminPhone: "",
    adminPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      setLoading(true);
      await client.post("/tenants/register-hospital", form);
      setSuccess(
        "Hospital registered successfully. Please verify your email to activate your account."
      );
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f5f7fb",
        px: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: "100%",
          maxWidth: 640,   // ✅ tight container to remove empty right space
          p: 4,
          borderRadius: 2,
        }}
      >
        <Typography variant="h5" mb={2} textAlign="center">
          Hospital Signup
        </Typography>

        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <Typography fontWeight={600} mb={1}>
            Hospital Details
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Hospital Name" name="name" onChange={handleChange} required />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Address" name="address" onChange={handleChange} required />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Contact Email" name="contactEmail" onChange={handleChange} required />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Contact Phone" name="contactPhone" onChange={handleChange} required />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="License Number" name="licenseNumber" onChange={handleChange} required />
            </Grid>
          </Grid>

          <Typography mt={3} mb={1} fontWeight={600}>
            Admin Details
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Admin Name" name="adminName" onChange={handleChange} required />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Admin Email" name="adminEmail" onChange={handleChange} required />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Admin Phone" name="adminPhone" onChange={handleChange} required />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Admin Password"
                name="adminPassword"
                type="password"
                onChange={handleChange}
                required
              />
            </Grid>
          </Grid>

                  {success && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <strong>Demo / Sandbox Mode</strong>
            <br />
            Email verification links are sent only to:
            <br />
            <strong>seo.dhru1@gmail.com</strong>
            <br />
            Even if you registered with <strong>{form.adminEmail}</strong>,
            please check <strong>seo.dhru1@gmail.com</strong> to verify your account.
          </Alert>
        )}


          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, py: 1.2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={22} /> : "REGISTER"}
          </Button>

          <Button fullWidth sx={{ mt: 1 }} onClick={() => navigate("/login")}>
            Already have an account? Login
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
