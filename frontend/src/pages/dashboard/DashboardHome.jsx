import { useEffect, useState } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Box,
  Button,
} from "@mui/material";
import client from "../../api/client";
import PeopleIcon from "@mui/icons-material/People";
import TodayIcon from "@mui/icons-material/Today";
import AssessmentIcon from "@mui/icons-material/Assessment";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";

export default function DashboardHome() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await client.get("/dashboard/summary");
        setSummary(res.data);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const MetricCard = ({ title, value, icon, color }) => (
    <Card sx={{ borderLeft: `6px solid ${color}`, borderRadius: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {value}
            </Typography>
          </Box>
          <Box color={color}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (!summary) {
    return (
      <Typography color="error">
        Dashboard data unavailable
      </Typography>
    );
  }

  return (
    <Box>
      {/* KPI CARDS */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Patients"
            value={summary.totalPatients}
            icon={<PeopleIcon fontSize="large" />}
            color="#1976d2"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Today's Registrations"
            value={summary.todayRegistrations}
            icon={<TodayIcon fontSize="large" />}
            color="#9c27b0"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Cases"
            value={summary.totalCases}
            icon={<AssessmentIcon fontSize="large" />}
            color="#2e7d32"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Prescriptions"
            value={summary.totalPrescriptions}
            icon={<LocalHospitalIcon fontSize="large" />}
            color="#ed6c02"
          />
        </Grid>
      </Grid>

      {/* QUICK ACTIONS */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>

          <Grid container spacing={2}>
            <Grid item>
              <Button variant="contained" href="/app/patients">
                Add Patient
              </Button>
            </Grid>

            <Grid item>
              <Button variant="outlined" href="/app/patients">
                Fetch Patient
              </Button>
            </Grid>

            <Grid item>
              <Button variant="outlined" href="/app/users">
                Manage Staff
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
