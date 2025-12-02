import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Typography,
  Chip,
} from "@mui/material";

import client from "../../api/client";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [userType, setUserType] = useState("DOCTOR");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    department: "",
    specialization: "", // doctor only
    shift: "", // nurse only
  });

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setForm({
      fullName: "",
      email: "",
      phone: "",
      password: "",
      department: "",
      specialization: "",
      shift: "",
    });
  };

  const handleCreateUser = async () => {
    try {
      setCreating(true);

      if (!form.fullName || !form.email || !form.phone || !form.password || !form.department) {
        alert("All required fields must be filled");
        return;
      }

      if (userType === "DOCTOR" && !form.specialization) {
        alert("Specialization is required for Doctor");
        return;
      }

      if (userType === "NURSE" && !form.shift) {
        alert("Shift is required for Nurse");
        return;
      }

      const payload =
        userType === "DOCTOR"
          ? {
              fullName: form.fullName,
              email: form.email,
              phone: form.phone,
              password: form.password,
              department: form.department,
              specialization: form.specialization,
            }
          : {
              fullName: form.fullName,
              email: form.email,
              phone: form.phone,
              password: form.password,
              department: form.department,
              shift: form.shift,
            };

      const url =
        userType === "DOCTOR"
          ? "/users/create-doctor"
          : "/users/create-nurse";

      await client.post(url, payload);

      alert("User created successfully");
      setAddOpen(false);
      resetForm();

      const res = await client.get("/users");
      setUsers(res.data.users || res.data || []);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await client.get("/users");
        setUsers(res.data.users || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">User Management</Typography>

        <Button variant="contained" onClick={() => setAddOpen(true)}>
          + Add User
        </Button>
      </Box>

      <Paper>
        {loading ? (
          <Box textAlign="center" py={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box p={2}>
            <Alert severity="error">{error}</Alert>
          </Box>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead sx={{ backgroundColor: "#f5f7fa" }}>
                <TableRow>
                  <TableCell>Full Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => {
                  const status = u.status || (u.is_active ? "ACTIVE" : "INACTIVE");

                  return (
                    <TableRow
                      key={u.id}
                      sx={{
                        "&:nth-of-type(odd)": { backgroundColor: "#fafafa" },
                        "&:hover": { backgroundColor: "#eef3f8" },
                      }}
                    >
                      <TableCell>{u.full_name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.phone || "-"}</TableCell>
                      <TableCell>{u.role || u.user_role || u.type || "-"}</TableCell>

                      <TableCell>
                        <Chip
                          label={status}
                          size="small"
                          sx={{
                            backgroundColor:
                              status === "ACTIVE"
                                ? "#2e7d32"
                                : status === "SUSPENDED"
                                ? "#d32f2f"
                                : "#9e9e9e",
                            color: "white",
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add New {userType}</DialogTitle>

        <DialogContent>
          <TextField
            select
            fullWidth
            margin="dense"
            label="User Type"
            value={userType}
            onChange={(e) => setUserType(e.target.value)}
          >
            <MenuItem value="DOCTOR">Doctor</MenuItem>
            <MenuItem value="NURSE">Nurse</MenuItem>
          </TextField>

          <TextField fullWidth margin="dense" label="Full Name" name="fullName" value={form.fullName} onChange={handleFormChange} />
          <TextField fullWidth margin="dense" label="Email" name="email" value={form.email} onChange={handleFormChange} />
          <TextField fullWidth margin="dense" label="Phone" name="phone" value={form.phone} onChange={handleFormChange} />
          <TextField fullWidth margin="dense" label="Password" name="password" type="password" value={form.password} onChange={handleFormChange} />
          <TextField fullWidth margin="dense" label="Department" name="department" value={form.department} onChange={handleFormChange} />

          {userType === "DOCTOR" && (
            <TextField fullWidth margin="dense" label="Specialization" name="specialization" value={form.specialization} onChange={handleFormChange} />
          )}

          {userType === "NURSE" && (
            <TextField fullWidth margin="dense" label="Shift" name="shift" value={form.shift} onChange={handleFormChange} />
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateUser} disabled={creating} variant="contained">
            {creating ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
