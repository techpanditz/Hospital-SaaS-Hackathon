import React from 'react';
import { Typography } from '@mui/material';

export default function PrescriptionsPage() {
  return (
    <>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Prescriptions
      </Typography>
      <Typography variant="body2">
        We will wire this to patient details and prescription APIs later.
      </Typography>
    </>
  );
}
