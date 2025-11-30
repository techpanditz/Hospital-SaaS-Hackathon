import React, { useEffect, useState } from 'react';
import Menu from '@mui/material/Menu';
import { Checkbox, FormControlLabel } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import VisibilityIcon from "@mui/icons-material/Visibility";
//import { Button } from "@mui/material";

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
  Chip,
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

const [openPrescriptionList, setOpenPrescriptionList] = useState(false);
const [prescriptions, setPrescriptions] = useState([]);
const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
const [prescError, setPrescError] = useState("");

  const currentTenantSchema = localStorage.getItem('tenantSchema');
  const existingPatientAadhaars = patients.map((p) => p.aadhaar);


  

  const tenantNameMap = {
    tenant_hm7f75: 'Apollo Hospital',
    tenant_7zz302: 'City Care Hospital',
  };

  // Add Patient dropdown menu
  const [addMenuAnchor, setAddMenuAnchor] = useState(null);
  const addMenuOpen = Boolean(addMenuAnchor);

  // Aadhaar Fetch + OTP
  const [fetchResults, setFetchResults] = useState([]);
  const [selectedFetchRecord, setSelectedFetchRecord] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [fetchLoading, setFetchLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [fetchOpen, setFetchOpen] = useState(false);
  const [aadhaarInput, setAadhaarInput] = useState('');
  const [importPrescriptions, setImportPrescriptions] = useState(true);

  // View patient
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const fetchPrescriptions = async (patientId) => {
    try {
      setLoadingPrescriptions(true);
      setPrescError("");
      const res = await client.get(`/prescriptions/patient/${patientId}`);
      setPrescriptions(res.data || []);
    } catch (err) {
      setPrescError("Failed to load prescriptions");
    } finally {
      setLoadingPrescriptions(false);
    }
  };
  
  const [loadingDetails, setLoadingDetails] = useState(false);

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

  // Prescription dialog state
  const [prescOpen, setPrescOpen] = useState(false);
  const [prescSaving, setPrescSaving] = useState(false);
  const [prescForm, setPrescForm] = useState({
    diagnosis: '',
    notes: '',
  });

  // FULL medicine structure: name, dosage, frequency, duration, instructions
  const [medicines, setMedicines] = useState([
    { name: '', dosage: '', frequency: '', duration: '', instructions: '' },
  ]);

  const handleMedicineChange = (index, field, value) => {
    setMedicines((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  const addMedicineRow = () => {
    setMedicines((prev) => [
      ...prev,
      { name: '', dosage: '', frequency: '', duration: '', instructions: '' },
    ]);
  };

  const removeMedicineRow = (index) => {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  // Aadhaar search
  const handleAadhaarSearch = async () => {
    console.log('Searching Aadhaar:', aadhaarInput);

    if (!aadhaarInput) {
      alert('Enter Aadhaar number');
      return;
    }

    setFetchLoading(true);

    try {
      const res = await client.post('/patients/fetch-by-aadhaar', {
        aadhaar: aadhaarInput,
      });

      console.log('Aadhaar API response:', res.data);

      if (!res.data || !Array.isArray(res.data.matches)) {
        alert('Invalid response format from server');
        setFetchResults([]);
      } else {
        setFetchResults(res.data.matches);
      }
    } catch (err) {
      console.error('Aadhaar search API error:', err);
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
        importPrescriptions,
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

  // CREATE PRESCRIPTION (works from table icon + view modal)
  const handleSavePrescription = async () => {
    // selectedPatient can be:
    // - { patient, prescriptions? } from openPatient()
    // - { patient: p } from table icon
    const patientObj = selectedPatient?.patient || selectedPatient;
    const patientId = patientObj?.id;

    if (!patientId) {
      alert('No patient selected');
      return;
    }

    const cleanMeds = medicines
      .map((m) => ({
        name: m.name.trim(),
        dosage: m.dosage.trim(),
        frequency: m.frequency.trim(),
        duration: m.duration.trim(),
        instructions: m.instructions.trim(),
      }))
      .filter((m) => m.name); // require at least medicine name

    if (!cleanMeds.length) {
      alert('At least one medicine name is required');
      return;
    }

    if (!prescForm.diagnosis.trim()) {
      alert('Diagnosis is required');
      return;
    }

    try {
      setPrescSaving(true);

      await client.post('/prescriptions', {
        patientId,
        diagnosis: prescForm.diagnosis.trim(),
        notes: prescForm.notes.trim(),
        medicines: cleanMeds,
      });

      alert('Prescription added successfully');

      setPrescForm({
        diagnosis: '',
        notes: '',
      });
      setMedicines([
        {
          name: '',
          dosage: '',
          frequency: '',
          duration: '',
          instructions: '',
        },
      ]);
      setPrescOpen(false);

      // Refresh details if we have full patient context
      if (selectedPatient?.patient) {
        await openPatient(patientId);
      }
    } catch (err) {
      alert(
        err.response?.data?.message || 'Failed to save prescription'
      );
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
      setSelectedPatient(res.data);
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
        dateOfBirth: p.date_of_birth
          ? p.date_of_birth.substring(0, 10)
          : '',
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
      await client.put(`/patients/${editForm.id}`, {
        aadhaar: editForm.aadhaar,
        fullName: editForm.fullName,
        phone: editForm.phone,
        dateOfBirth: editForm.dateOfBirth,
        gender: editForm.gender,
        department: editForm.department,
        blood_group: editForm.blood_group,
        address: editForm.address,
        emergency_contact: editForm.emergency_contact,
        patient_type: editForm.patient_type,
      });
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
        <Box display="flex" gap={2}>
        <Button
          variant="contained"
          endIcon={<ArrowDropDownIcon />}
          onClick={(e) => setAddMenuAnchor(e.currentTarget)}
        >
          + Add Patient
        </Button>

        <Button
      variant="outlined"
      onClick={() => {
        const token = localStorage.getItem("token");
        const baseUrl =
          import.meta.env.VITE_API_URL || "http://localhost:4000/api";

        window.open(
          `${baseUrl}/patients/export?token=${token}`,
          "_blank"
        );
      }}
    >
      Export CSV
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
            <AddIcon fontSize="small" sx={{ mr: 1 }} />
            Add New Patient
          </MenuItem>

          <MenuItem
            onClick={() => {
              setAddMenuAnchor(null);
              setFetchOpen(true);
            }}
          >
            <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
            Fetch Existing Patient
          </MenuItem>
        </Menu>
        </Box>
      </Box>

      <Box sx={{ mb: 2, maxWidth: 300 }}>
        <TextField
          fullWidth
          label="Search by name or phone"
          size="small"
          value={search}
          onChange={(e) => {
            setPage(0);
            setSearch(e.target.value);
          }}
        />
      </Box>

      <Paper elevation={3}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        ) : (
          <>
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
                  {patients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No patients found
                      </TableCell>
                    </TableRow>
                  ) : (
                    patients.map((p) => (
                      <TableRow key={p.id} hover>
                        <TableCell
                          sx={{ cursor: 'pointer' }}
                          onClick={() => openPatient(p.id)}
                        >
                          {p.full_name}
                        </TableCell>
                        <TableCell>{p.phone}</TableCell>
                        <TableCell>{p.department}</TableCell>
                        <TableCell><Chip
                            label={p.patient_type}
                            size="small"
                            sx={{
                              backgroundColor: p.patient_type === "IPD" ? "#1565c0" : "#2e7d32",
                              color: "white",
                              fontWeight: 600,
                            }}
                          /></TableCell>
                        <TableCell>{p.blood_group}</TableCell>
                        <TableCell>
                          {new Date(p.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => openEdit(p.id)}
                            title="Edit Patient"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>

                          {/* Add Prescription from table row */}
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedPatient({ patient: p });
                              setPrescOpen(true);
                            }}
                            title="Add Prescription"
                          >
                            <LocalHospitalIcon fontSize="small" />
                          </IconButton>
                          

                          <IconButton
                          color="info"
                          onClick={() => {
                            setSelectedPatient(p);
                            setOpenPrescriptionList(true);
                            fetchPrescriptions(p.id);
                          }}
                        >
                          <VisibilityIcon />
                        </IconButton>

                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 20]}
            />
          </>
        )}
      </Paper>

      {/* ADD PATIENT */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Patient</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            margin="dense"
            label="Aadhaar"
            value={form.aadhaar}
            onChange={(e) => setForm({ ...form, aadhaar: e.target.value })}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Full Name"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <TextField
            fullWidth
            margin="dense"
            type="date"
            label="Date of Birth"
            InputLabelProps={{ shrink: true }}
            value={form.dateOfBirth}
            onChange={(e) =>
              setForm({ ...form, dateOfBirth: e.target.value })
            }
          />
          <TextField
            fullWidth
            margin="dense"
            label="Gender"
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Department"
            value={form.department}
            onChange={(e) =>
              setForm({ ...form, department: e.target.value })
            }
          />
          <TextField
            fullWidth
            margin="dense"
            label="Blood Group"
            value={form.blood_group}
            onChange={(e) =>
              setForm({ ...form, blood_group: e.target.value })
            }
          />
          <TextField
            fullWidth
            margin="dense"
            label="Address"
            value={form.address}
            onChange={(e) =>
              setForm({ ...form, address: e.target.value })
            }
          />
          <TextField
            fullWidth
            margin="dense"
            label="Emergency Contact"
            value={form.emergency_contact}
            onChange={(e) =>
              setForm({ ...form, emergency_contact: e.target.value })
            }
          />
          <TextField
            select
            fullWidth
            margin="dense"
            label="Patient Type"
            value={form.patient_type}
            onChange={(e) =>
              setForm({ ...form, patient_type: e.target.value })
            }
          >
            <MenuItem value="OPD">OPD</MenuItem>
            <MenuItem value="IPD">IPD</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained" disabled={saving}>
            {saving ? 'Saving...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* VIEW PATIENT */}
      <Dialog
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Patient Details</DialogTitle>
        <DialogContent dividers>
          {loadingDetails || !selectedPatient ? (
            <Box sx={{ textAlign: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Typography variant="h6">
                {selectedPatient.patient.full_name}
              </Typography>
              <Typography>Phone: {selectedPatient.patient.phone}</Typography>
              <Typography>
                Department: {selectedPatient.patient.department}
              </Typography>
              <Typography>
                Type: {selectedPatient.patient.patient_type}
              </Typography>
              <Typography>
                Blood Group: {selectedPatient.patient.blood_group}
              </Typography>
              <Typography>
                Address: {selectedPatient.patient.address}
              </Typography>
              <Typography>
                Emergency: {selectedPatient.patient.emergency_contact}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewOpen(false)}>Close</Button>

          {/* Add Prescription from Patient Detail modal */}
          <Button
            variant="contained"
            onClick={() => {
              // keep current selectedPatient (already has .patient)
              setPrescOpen(true);
            }}
          >
            + Add Prescription
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT PATIENT */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Patient</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            margin="dense"
            label="Aadhaar"
            value={editForm.aadhaar}
            onChange={(e) =>
              setEditForm({ ...editForm, aadhaar: e.target.value })
            }
          />
          <TextField
            fullWidth
            margin="dense"
            label="Full Name"
            value={editForm.fullName}
            onChange={(e) =>
              setEditForm({ ...editForm, fullName: e.target.value })
            }
          />
          <TextField
            fullWidth
            margin="dense"
            label="Phone"
            value={editForm.phone}
            onChange={(e) =>
              setEditForm({ ...editForm, phone: e.target.value })
            }
          />
          <TextField
            fullWidth
            margin="dense"
            type="date"
            label="Date of Birth"
            InputLabelProps={{ shrink: true }}
            value={editForm.dateOfBirth}
            onChange={(e) =>
              setEditForm({ ...editForm, dateOfBirth: e.target.value })
            }
          />
          <TextField
            fullWidth
            margin="dense"
            label="Gender"
            value={editForm.gender}
            onChange={(e) =>
              setEditForm({ ...editForm, gender: e.target.value })
            }
          />
          <TextField
            fullWidth
            margin="dense"
            label="Department"
            value={editForm.department}
            onChange={(e) =>
              setEditForm({ ...editForm, department: e.target.value })
            }
          />
          <TextField
            fullWidth
            margin="dense"
            label="Blood Group"
            value={editForm.blood_group}
            onChange={(e) =>
              setEditForm({ ...editForm, blood_group: e.target.value })
            }
          />
          <TextField
            fullWidth
            margin="dense"
            label="Address"
            value={editForm.address}
            onChange={(e) =>
              setEditForm({ ...editForm, address: e.target.value })
            }
          />
          <TextField
            fullWidth
            margin="dense"
            label="Emergency Contact"
            value={editForm.emergency_contact}
            onChange={(e) =>
              setEditForm({
                ...editForm,
                emergency_contact: e.target.value,
              })
            }
          />
          <TextField
            select
            fullWidth
            margin="dense"
            label="Patient Type"
            value={editForm.patient_type}
            onChange={(e) =>
              setEditForm({ ...editForm, patient_type: e.target.value })
            }
          >
            <MenuItem value="OPD">OPD</MenuItem>
            <MenuItem value="IPD">IPD</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button
            onClick={handleEditSave}
            variant="contained"
            disabled={editSaving}
          >
            {editSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* FETCH FROM OTHER HOSPITAL */}
      <Dialog
        open={fetchOpen}
        onClose={() => setFetchOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Fetch Patient from Other Hospital</DialogTitle>

        <DialogContent dividers>
          <TextField
            fullWidth
            label="Enter Aadhaar Number"
            value={aadhaarInput}
            onChange={(e) => setAadhaarInput(e.target.value)}
            margin="dense"
          />

          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={handleAadhaarSearch}
              disabled={fetchLoading}
            >
              {fetchLoading ? 'Searching...' : 'Search'}
            </Button>
          </Box>

          {/* Search Results */}
          {fetchResults.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2">
                Select Patient Record
              </Typography>

              {fetchResults.map((r) => {
                const alreadyExists =
                  existingPatientAadhaars.includes(r.aadhaar);

                return (
                  <Box
                    key={r.globalPatientId}
                    sx={{
                      border: '1px solid',
                      borderColor: alreadyExists ? '#f44336' : '#ddd',
                      p: 1,
                      mt: 1,
                      borderRadius: 1,
                      cursor: alreadyExists ? 'not-allowed' : 'pointer',
                      backgroundColor: alreadyExists ? '#ffecec' : '#fff',
                      opacity: alreadyExists ? 0.7 : 1,
                    }}
                    onClick={async () => {
                      if (alreadyExists) return;

                      try {
                        await client.post('/patients/request-import-otp', {
                          globalPatientId: r.globalPatientId,
                        });

                        setSelectedFetchRecord(r);
                        setResendTimer(30);
                      } catch (err) {
                        alert(
                          err.response?.data?.message ||
                            'Failed to send OTP'
                        );
                      }
                    }}
                  >
                    <Typography>{r.fullName}</Typography>

                    <Typography variant="body2">
                      Source:{' '}
                      {tenantNameMap[r.tenantSchema] ||
                        'Unknown Hospital'}
                      <span
                        style={{
                          fontSize: 11,
                          color: '#888',
                          marginLeft: 6,
                        }}
                      >
                        ({r.tenantSchema})
                      </span>
                    </Typography>

                    {alreadyExists && (
                      <Typography variant="caption" color="error">
                        Already Added
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}

          {/* OTP Input */}
          <FormControlLabel
            control={
              <Checkbox
                checked={importPrescriptions}
                onChange={(e) => setImportPrescriptions(e.target.checked)}
              />
            }
            label="Also import prescriptions"
          />

          {selectedFetchRecord && (
            <>
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2">Enter OTP</Typography>
                <TextField
                  fullWidth
                  margin="dense"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                />
              </Box>

              <Box sx={{ mt: 1 }}>
                <Button
                  size="small"
                  disabled={resendTimer > 0}
                  onClick={async () => {
                    try {
                      await client.post('/patients/request-import-otp', {
                        globalPatientId:
                          selectedFetchRecord.globalPatientId,
                      });

                      setResendTimer(30);
                    } catch (err) {
                      alert(
                        err.response?.data?.message ||
                          'Failed to resend OTP'
                      );
                    }
                  }}
                >
                  {resendTimer > 0
                    ? `Resend OTP in ${resendTimer}s`
                    : 'Resend OTP'}
                </Button>
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setFetchOpen(false)}>Cancel</Button>

          {selectedFetchRecord && (
            <Button
              variant="contained"
              onClick={handleVerifyOtp}
              disabled={otpLoading}
            >
              {otpLoading ? 'Verifying...' : 'Verify & Import'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* CREATE PRESCRIPTION (full details) */}
      <Dialog
        open={prescOpen}
        onClose={() => setPrescOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>New Prescription</DialogTitle>

        <DialogContent dividers>
          <TextField
            fullWidth
            margin="dense"
            label="Diagnosis"
            value={prescForm.diagnosis}
            onChange={(e) =>
              setPrescForm({
                ...prescForm,
                diagnosis: e.target.value,
              })
            }
          />

          <TextField
            fullWidth
            margin="dense"
            label="Notes"
            multiline
            rows={2}
            value={prescForm.notes}
            onChange={(e) =>
              setPrescForm({
                ...prescForm,
                notes: e.target.value,
              })
            }
          />

          {medicines.map((med, index) => (
            <Box
              key={index}
              sx={{
                mt: 2,
                p: 2,
                border: '1px solid #ddd',
                borderRadius: 1,
              }}
            >
              <Typography variant="subtitle2">
                Medicine {index + 1}
              </Typography>

              <TextField
                fullWidth
                margin="dense"
                label="Medicine Name"
                value={med.name}
                onChange={(e) =>
                  handleMedicineChange(index, 'name', e.target.value)
                }
              />

              <TextField
                fullWidth
                margin="dense"
                label="Dosage"
                value={med.dosage}
                onChange={(e) =>
                  handleMedicineChange(index, 'dosage', e.target.value)
                }
              />

              <TextField
                fullWidth
                margin="dense"
                label="Frequency"
                value={med.frequency}
                onChange={(e) =>
                  handleMedicineChange(index, 'frequency', e.target.value)
                }
              />

              <TextField
                fullWidth
                margin="dense"
                label="Duration"
                value={med.duration}
                onChange={(e) =>
                  handleMedicineChange(index, 'duration', e.target.value)
                }
              />

              <TextField
                fullWidth
                margin="dense"
                label="Instructions"
                value={med.instructions}
                onChange={(e) =>
                  handleMedicineChange(
                    index,
                    'instructions',
                    e.target.value
                  )
                }
              />

              {medicines.length > 1 && (
                <Box sx={{ mt: 1 }}>
                  <Button
                    color="error"
                    size="small"
                    onClick={() => removeMedicineRow(index)}
                  >
                    Remove
                  </Button>
                </Box>
              )}
            </Box>
          ))}

          <Box sx={{ mt: 2 }}>
            <Button onClick={addMedicineRow}>+ Add Medicine</Button>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setPrescOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={prescSaving}
            onClick={handleSavePrescription}
          >
            {prescSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>



      <Dialog
  open={openPrescriptionList}
  onClose={() => setOpenPrescriptionList(false)}
  fullWidth
  maxWidth="md"
>
  <DialogTitle>
    Prescription History — {selectedPatient?.full_name}
  </DialogTitle>

  <DialogContent dividers>
    {loadingPrescriptions ? (
      <Box textAlign="center" py={3}>
        <CircularProgress />
      </Box>
    ) : prescError ? (
      <Alert severity="error">{prescError}</Alert>
    ) : prescriptions.length === 0 ? (
      <Typography>No prescriptions found.</Typography>
    ) : (
      prescriptions.map((p) => (
        <Box
          key={p.id}
          sx={{
            border: "1px solid #ddd",
            borderRadius: 2,
            p: 2,
            mb: 2,
            backgroundColor: "#fafafa",
          }}
        >
          <Typography fontWeight={600}>
            Date: {new Date(p.created_at).toLocaleDateString()}
          </Typography>

          <Typography variant="body2" color="text.secondary" mb={1}>
            Diagnosis: {p.diagnosis || "N/A"}
          </Typography>

          <Divider sx={{ my: 1 }} />

          {p.items?.length > 0 ? (
            p.items.map((item, idx) => (
              <Box key={idx} sx={{ pl: 1, mb: 1 }}>
                <Typography fontWeight={500}>
                  {idx + 1}. {item.medicine_name}
                </Typography>
                <Typography variant="body2">
                  Dosage: {item.dosage} | Frequency: {item.frequency} | Duration: {item.duration}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Instructions: {item.instructions || "-"}
                </Typography>
              </Box>
            ))
          ) : (
            <Typography variant="body2">No medicine items.</Typography>
          )}
        </Box>
      ))
    )}
  </DialogContent>

  <DialogActions>
    <Button onClick={() => setOpenPrescriptionList(false)}>Close</Button>
  </DialogActions>
</Dialog>

    </Box>
    
  );
}
