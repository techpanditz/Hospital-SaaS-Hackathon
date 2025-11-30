import React, { useEffect, useState } from 'react';
import Menu from '@mui/material/Menu';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';

import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  TablePagination,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import client from '../../api/client';

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [resendTimer, setResendTimer] = useState(0);
  const existingPatientAadhaars = patients.map(p => p.aadhaar);

  const tenantNameMap = {
    tenant_hm7f75: 'Apollo Hospital',
    tenant_7zz302: 'City Care Hospital',
  };

  // Add Patient dropdown
  const [addMenuAnchor, setAddMenuAnchor] = useState(null);
  const addMenuOpen = Boolean(addMenuAnchor);

  // Aadhaar Fetch
  const [fetchResults, setFetchResults] = useState([]);
  const [selectedFetchRecord, setSelectedFetchRecord] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [fetchLoading, setFetchLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [fetchOpen, setFetchOpen] = useState(false);
  const [aadhaarInput, setAadhaarInput] = useState('');

  const handleAadhaarSearch = async () => {
    if (!aadhaarInput) {
      alert('Enter Aadhaar number');
      return;
    }

    setFetchLoading(true);

    try {
      const res = await client.post('/patients/fetch-by-aadhaar', { aadhaar: aadhaarInput });

      if (!res.data || !Array.isArray(res.data.matches)) {
        alert('Invalid response format from server');
        setFetchResults([]);
      } else {
        setFetchResults(res.data.matches);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Aadhaar search failed');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpInput || !selectedFetchRecord) {
      alert('OTP required');
      return;
    }

    setOtpLoading(true);
    try {
      await client.post('/patients/verify-otp', {
        globalPatientId: selectedFetchRecord.globalPatientId,
        otp: otpInput,
      });

      alert('Patient imported successfully');

      setFetchOpen(false);
      setFetchResults([]);
      setSelectedFetchRecord(null);
      setOtpInput('');
      setAadhaarInput('');

      fetchPatients();
    } catch (err) {
      alert(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setOtpLoading(false);
    }
  };

  // ✅ NORMALIZED: selectedPatient is ALWAYS the patient object
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Prescription
  const [prescOpen, setPrescOpen] = useState(false);
  const [prescForm, setPrescForm] = useState({ diagnosis: '', medicines: '', notes: '' });
  const [prescSaving, setPrescSaving] = useState(false);

  const handleSavePrescription = async () => {

    console.log('Sending prescription payload:', {
  patientId: selectedPatient?.id,
  diagnosis: prescForm.diagnosis,
  medicines: prescForm.medicines,
  notes: prescForm.notes,
});

    if (!selectedPatient?.id) {
      alert('No patient selected');
      return;
    }

    if (!prescForm.diagnosis.trim() || !prescForm.medicines.trim()) {
      alert('Diagnosis and medicines are required');
      return;
    }

    try {
      setPrescSaving(true);

      await client.post('/prescriptions', {
        patientId: selectedPatient.id,
        diagnosis: prescForm.diagnosis.trim(),
        medicines: prescForm.medicines.trim(),
        notes: prescForm.notes,
      });

      alert('Prescription added successfully');

      setPrescForm({ diagnosis: '', medicines: '', notes: '' });
      setPrescOpen(false);

      openPatient(selectedPatient.id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save prescription');
    } finally {
      setPrescSaving(false);
    }
  };

  useEffect(() => {
    if (resendTimer === 0) return;

    const interval = setInterval(() => {
      setResendTimer((t) => t - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [resendTimer]);

  // Create patient
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    aadhaar: '',
    fullName: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    department: '',
    blood_group: '',
    address: '',
    emergency_contact: '',
    patient_type: 'OPD',
  });

  // View patient
  const [viewOpen, setViewOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Edit patient
  const [editForm, setEditForm] = useState({
    id: null,
    aadhaar: '',
    fullName: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    department: '',
    blood_group: '',
    address: '',
    emergency_contact: '',
    patient_type: 'OPD',
  });
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const fetchPatients = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await client.get('/patients', {
        params: {
          search,
          page: page + 1,
          pageSize,
        },
      });
      setPatients(res.data.patients || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [page, pageSize, search]);

  const resetCreateForm = () =>
    setForm({
      aadhaar: '',
      fullName: '',
      phone: '',
      dateOfBirth: '',
      gender: '',
      department: '',
      blood_group: '',
      address: '',
      emergency_contact: '',
      patient_type: 'OPD',
    });

  const handleCreate = async () => {
    setSaving(true);
    try {
      await client.post('/patients', form);
      setOpen(false);
      resetCreateForm();
      fetchPatients();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create patient');
    } finally {
      setSaving(false);
    }
  };

  const openPatient = async (id) => {
    setLoadingDetails(true);
    setViewOpen(true);
    try {
      const res = await client.get(`/patients/${id}`);
      setSelectedPatient(res.data.patient); // ✅ normalized
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load patient');
      setViewOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const openEdit = async (id) => {
    try {
      const res = await client.get(`/patients/${id}`);
      const p = res.data.patient;
      setEditForm({
        id: p.id,
        aadhaar: p.aadhaar,
        fullName: p.full_name || '',
        phone: p.phone || '',
        dateOfBirth: p.date_of_birth ? p.date_of_birth.substring(0, 10) : '',
        gender: p.gender || '',
        department: p.department || '',
        blood_group: p.blood_group || '',
        address: p.address || '',
        emergency_contact: p.emergency_contact || '',
        patient_type: p.patient_type || 'OPD',
      });
      setEditOpen(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load patient for edit');
    }
  };

  const handleEditSave = async () => {
    if (!editForm.id) return;
    setEditSaving(true);
    try {
      await client.put(`/patients/${editForm.id}`, editForm);
      setEditOpen(false);
      fetchPatients();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update patient');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Patients</Typography>
        <Button
          variant="contained"
          endIcon={<ArrowDropDownIcon />}
          onClick={(e) => setAddMenuAnchor(e.currentTarget)}
        >
          + Add Patient
        </Button>
        <Menu
          anchorEl={addMenuAnchor}
          open={addMenuOpen}
          onClose={() => setAddMenuAnchor(null)}
        >
          <MenuItem
            onClick={() => {
              setAddMenuAnchor(null);
              setOpen(true);
            }}
          >
            <AddIcon fontSize="small" sx={{ mr: 1 }} /> Add New Patient
          </MenuItem>

          <MenuItem
            onClick={() => {
              setAddMenuAnchor(null);
              setFetchOpen(true);
            }}
          >
            <DownloadIcon fontSize="small" sx={{ mr: 1 }} /> Fetch Existing Patient
          </MenuItem>
        </Menu>
      </Box>

      <Paper>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Full Name</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Blood Group</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {patients.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell
                      onClick={() => openPatient(p.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      {p.full_name}
                    </TableCell>
                    <TableCell>{p.phone}</TableCell>
                    <TableCell>{p.department}</TableCell>
                    <TableCell>{p.patient_type}</TableCell>
                    <TableCell>{p.blood_group}</TableCell>
                    <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => openEdit(p.id)}
                        title="Edit Patient"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>

                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedPatient(p); // ✅ fixed
                          setPrescOpen(true);
                        }}
                        title="Add Prescription"
                      >
                        <LocalHospitalIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* CREATE PRESCRIPTION */}
      <Dialog open={prescOpen} onClose={() => setPrescOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Prescription</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            margin="dense"
            label="Diagnosis"
            value={prescForm.diagnosis}
            onChange={(e) => setPrescForm({ ...prescForm, diagnosis: e.target.value })}
          />

          <TextField
            fullWidth
            margin="dense"
            label="Medicines"
            multiline
            rows={3}
            value={prescForm.medicines}
            onChange={(e) => setPrescForm({ ...prescForm, medicines: e.target.value })}
          />

          <TextField
            fullWidth
            margin="dense"
            label="Notes"
            multiline
            rows={3}
            value={prescForm.notes}
            onChange={(e) => setPrescForm({ ...prescForm, notes: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrescOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={prescSaving} onClick={handleSavePrescription}>
            {prescSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
