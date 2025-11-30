import React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Link,
  Stack,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import PeopleIcon from "@mui/icons-material/People";
import AnalyticsIcon from "@mui/icons-material/Analytics";

// Adjust branding colors as per your app
const BRAND_BLUE = "#2563eb";
const BG_DARK = "#0f172a";
const TEXT_LIGHT = "#e5e7eb";

export default function LandingPage() {
  return (
    <Box sx={{ backgroundColor: "#ffffff", color: "#111", minHeight: "100vh" }}>
      {/* HEADER / NAVBAR */}
      <AppBar position="static" sx={{ backgroundColor: BG_DARK }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, color: TEXT_LIGHT }}>
            Hospital CRM
          </Typography>
          <Button component={RouterLink} to="/" color="inherit">
            Home
          </Button>
          <Button component={RouterLink} to="/" color="inherit">
            Services
          </Button>
          <Button component={RouterLink} to="/" color="inherit">
            Pricing
          </Button>
          <Button component={RouterLink} to="/api-docs" color="inherit">
            API Docs
          </Button>
          <Button component={RouterLink} to="/login" color="inherit">
            Login
          </Button>
          <Button component={RouterLink} to="/signup" variant="outlined" sx={{ ml: 1, color: TEXT_LIGHT, borderColor: TEXT_LIGHT }}>
            Sign Up
          </Button>
        </Toolbar>
      </AppBar>

      {/* HERO SECTION */}
      <Box sx={{ py: 8, backgroundColor: BRAND_BLUE, color: "#fff" }}>
        <Container maxWidth="md">
          <Typography variant="h3" fontWeight={700} gutterBottom>
            Simplify Your Hospital Management
          </Typography>
          <Typography variant="h6" mb={4}>
            Manage patients, prescriptions, records and hospitals — all in one secure platform.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button
              component={RouterLink}
              to="/signup"
              variant="contained"
              sx={{ backgroundColor: "#fff", color: BRAND_BLUE, fontWeight: 600 }}
            >
              Get Started
            </Button>
            <Button
              component={RouterLink}
              to="/login"
              variant="outlined"
              sx={{ borderColor: "#fff", color: "#fff" }}
            >
              Login
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* FEATURES */}
      <Box sx={{ py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h4" align="center" gutterBottom>
            Features
          </Typography>
          <Grid container spacing={4} sx={{ mt: 4 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <LocalHospitalIcon sx={{ fontSize: 40, color: BRAND_BLUE }} />
                  <Typography variant="h6" mt={2} mb={1}>
                    Multi-Hospital Support
                  </Typography>
                  <Typography variant="body2">
                    Register multiple hospitals under one platform. Data isolated per hospital, secure and scalable.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <PeopleIcon sx={{ fontSize: 40, color: BRAND_BLUE }} />
                  <Typography variant="h6" mt={2} mb={1}>
                    Patient & History Management
                  </Typography>
                  <Typography variant="body2">
                    Add, edit, search patients; maintain full history including previous hospitals — with consent and OTP.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <CheckCircleIcon sx={{ fontSize: 40, color: BRAND_BLUE }} />
                  <Typography variant="h6" mt={2} mb={1}>
                    Prescription & Case Management
                  </Typography>
                  <Typography variant="body2">
                    Create, update, view prescriptions per patient. Complete medication & dosage tracking for doctors.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <AnalyticsIcon sx={{ fontSize: 40, color: BRAND_BLUE }} />
                  <Typography variant="h6" mt={2} mb={1}>
                    Real-Time Dashboard
                  </Typography>
                  <Typography variant="body2">
                    View hospital-wide metrics: patients count, daily registrations, prescriptions — all on one dashboard.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Add more feature cards as needed */}

          </Grid>
        </Container>
      </Box>

      {/* CALL TO ACTION */}
      <Box sx={{ py: 6, backgroundColor: BRAND_BLUE, color: "#fff" }}>
        <Container maxWidth="sm" sx={{ textAlign: "center" }}>
          <Typography variant="h5" mb={3}>
            Ready to get started?
          </Typography>
          <Button
            component={RouterLink}
            to="/signup"
            variant="contained"
            sx={{ backgroundColor: "#fff", color: BRAND_BLUE, fontWeight: 600 }}
          >
            Create Hospital Account
          </Button>
        </Container>
      </Box>

      {/* FOOTER */}
      <Box sx={{ backgroundColor: "#111", color: "#888", py: 4 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} sm={6}>
              <Typography variant="h6" color="#fff">Hospital CRM</Typography>
              <Typography variant="body2">
                © {new Date().getFullYear()} Hospital CRM. All rights reserved.
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} sx={{ textAlign: { xs: "left", sm: "right" } }}>
              <Link href="mailto:info@yourhospitalcrm.com" color="inherit" underline="hover">
                Contact Us
              </Link>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}
