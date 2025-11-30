import { Box, Typography, Button, CircularProgress } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

export default function EmailVerified() {
  const navigate = useNavigate();
  const { token } = useParams();

  const [status, setStatus] = useState("verifying"); // verifying | success | error

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/auth/verify-email/${token}`
        );

        if (!res.ok) {
          throw new Error("Verification failed");
        }

        setStatus("success");
      } catch (err) {
        console.error("Email verification failed:", err);
        setStatus("error");
      }
    };

    if (token) {
      verifyEmail();
    } else {
      setStatus("error");
    }
  }, [token]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Box sx={{ p: 4, boxShadow: 3, borderRadius: 2, textAlign: "center", minWidth: 320 }}>

        {status === "verifying" && (
          <>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h6">Verifying your email...</Typography>
          </>
        )}

        {status === "success" && (
          <>
            <Typography variant="h5" mb={2}>
              Email Verified ✅
            </Typography>
            <Typography mb={2}>
              Your hospital account is now active.
            </Typography>
            <Button variant="contained" onClick={() => navigate("/login")}>
              Go to Login
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <Typography variant="h5" mb={2} color="error">
              Verification Failed ❌
            </Typography>
            <Typography mb={2}>
              The verification link is invalid or expired.
            </Typography>
            <Button variant="contained" onClick={() => navigate("/login")}>
              Go to Login
            </Button>
          </>
        )}

      </Box>
    </Box>
  );
}
