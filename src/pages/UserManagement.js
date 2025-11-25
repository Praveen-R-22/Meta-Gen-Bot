import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  AppBar,
  Toolbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  CssBaseline,
  Tooltip,
  CircularProgress,
  Autocomplete,
  Chip,
  Checkbox,
  InputAdornment,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  ExitToApp as ExitToAppIcon,
  Person as PersonIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import { useAuth } from "../contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import MiniSidebar from "./MiniSidebar";
import axios from "axios";
import Logo from "../assets/analytics_hub_logo.png"; 

const API_URL = window.env.API_URL;

export default function UserManagement() {
  // --- 1. Get globalState and updateGlobalState ---
  const { user, logout, globalState, updateGlobalState } = useAuth();
  const [search, setSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  // --- 2. Initialize State from Cache (if available) ---
  const [users, setUsers] = useState(globalState.users || []);
  const [allCatalogs, setAllCatalogs] = useState(globalState.allCatalogs || []);
  
  // We don't usually cache "loading" states or form inputs for this page
  const [loading, setLoading] = useState(!globalState.users); // Only show loader if no cached data
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Form & Dialog States
  const [openCreate, setOpenCreate] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [selectedCatalogs, setSelectedCatalogs] = useState([]); 

  const [openEdit, setOpenEdit] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editPassword, setEditPassword] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // --- 3. API Functions (Updated to Cache Data) ---

  const fetchUsers = useCallback(async () => {
    // We only set loading true if we don't have data yet, or if we want to show a refresh spinner
    if (users.length === 0) setLoading(true);
    
    try {
      const response = await axios.get(`${API_URL}/api/users/list`, { withCredentials: true });
      if (response.data.success) {
        // --- FIX: Normalize keys to lowercase ---
        // Snowflake returns uppercase keys (ID, USERNAME) but DataGrid needs 'id' and 'username'
        const normalizedUsers = response.data.users.map(u => {
          const lowerCased = {};
          for (const key in u) {
            lowerCased[key.toLowerCase()] = u[key];
          }
          return lowerCased;
        });

        setUsers(normalizedUsers);
        // --- UPDATE CACHE ---
        updateGlobalState("users", normalizedUsers);
      } else {
        setSnackbar({ open: true, message: response.data.error || "Failed to fetch users", severity: "error" });
      }
    } catch (error) {
      setSnackbar({ open: true, message: "Network error fetching users", severity: "error" });
    }
    setLoading(false);
  }, [updateGlobalState, users.length]);

  const fetchCatalogs = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/semantic_catalogs/list_all`, { withCredentials: true });
      if (response.data.success) {
        setAllCatalogs(response.data.catalogs);
        // --- UPDATE CACHE ---
        updateGlobalState("allCatalogs", response.data.catalogs);
      } else {
        setSnackbar({ open: true, message: response.data.error || "Failed to fetch catalogs", severity: "error" });
      }
    } catch (error) {
      setSnackbar({ open: true, message: "Network error fetching catalogs", severity: "error" });
    }
    setCatalogLoading(false);
  }, [updateGlobalState]);

  // --- 4. Effects ---
  
  useEffect(() => {
    // Only fetch on mount if we don't have data in the cache
    // OR if you prefer to always refresh background data, you can remove the if check.
    if (!globalState.users) {
        fetchUsers();
    }
  }, [globalState.users, fetchUsers]);

  // Dialog Handlers
  const handleOpenCreate = () => {
    setNewUsername("");
    setNewPassword("");
    setNewEmail("");
    setNewRole("user");
    setSelectedCatalogs([]);
    setOpenCreate(true);
    // Always fetch catalogs when opening to ensure we have the latest options
    fetchCatalogs();
  };

  const handleCloseCreate = () => {
    setOpenCreate(false);
    // We don't clear allCatalogs here so the cache persists
  };

  const handleOpenEdit = (userToEdit) => {
    setSelectedUser(userToEdit);
    setEditPassword("");
    setOpenEdit(true);
  };

  const handleCloseEdit = () => {
    setOpenEdit(false);
    setSelectedUser(null);
  };

  const handleCreateUser = async () => {
    if (!newUsername || !newPassword || !newEmail) {
      setSnackbar({ open: true, message: "Please fill all required fields", severity: "warning" });
      return;
    }
    try {
      const response = await axios.post(
        `${API_URL}/api/users/create`,
        {
          username: newUsername,
          password: newPassword,
          email: newEmail,
          role: newRole,
          assigned_catalogs: selectedCatalogs,
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        setSnackbar({ open: true, message: "User created successfully!", severity: "success" });
        
        // --- THIS IS KEY: Refresh the list immediately ---
        // This will fetch new data from server AND update the global cache
        fetchUsers(); 
        
        handleCloseCreate();
      } else {
        setSnackbar({ open: true, message: response.data.error || "Failed to create user", severity: "error" });
      }
    } catch (error) {
      setSnackbar({ open: true, message: error.response?.data?.error || "Network error creating user", severity: "error" });
    }
  };

  const handleUpdatePassword = async () => {
    if (!editPassword) {
      setSnackbar({ open: true, message: "Password cannot be empty", severity: "warning" });
      return;
    }
    try {
      const response = await axios.post(
        `${API_URL}/api/users/update_password`,
        { username: selectedUser.username, newPassword: editPassword },
        { withCredentials: true }
      );

      if (response.data.success) {
        setSnackbar({ open: true, message: "Password updated successfully!", severity: "success" });
        handleCloseEdit();
      } else {
        setSnackbar({ open: true, message: response.data.error || "Failed to update password", severity: "error" });
      }
    } catch (error) {
      setSnackbar({ open: true, message: error.response?.data?.error || "Network error updating password", severity: "error" });
    }
  };

  const columns = [
    { field: "id", headerName: "ID", width: 90 },
    { field: "username", headerName: "Username", flex: 1, minWidth: 150 },
    { field: "email", headerName: "Email", flex: 1, minWidth: 200 },
    { field: "role", headerName: "Role", flex: 1, minWidth: 120 },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      width: 100,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <IconButton
          onClick={() => handleOpenEdit(params.row)}
          color="primary"
          aria-label="edit password"
          disabled={user.role !== "admin"}
        >
          <EditIcon />
        </IconButton>
      ),
    },
  ];

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <img src={Logo} alt="Analytics Hub" style={{ width: 50, height: 50, objectFit: "contain" }} />
            <Typography variant="h6" noWrap sx={{ fontWeight: 700, color: "#fff", userSelect: "none" }}>
              Data & Analytics Practice — Analytix Hub
            </Typography>
          </Box>

          {/* --- SEARCH BAR --- */}
          <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center", px: { xs: 1, sm: 6 }, marginLeft: 30, marginRight: -5 }}>
            <TextField
              placeholder="Search dashboards, questions, users..."
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: { xs: "100%", sm: 350 }, bgcolor: "background.paper", borderRadius: 2 }}
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
            />
          </Box>

          <Tooltip title={`Role: ${user?.role || "N/A"}`} arrow>
            <Button
              color="inherit"
              startIcon={<PersonIcon />}
              sx={{ textTransform: "none", fontWeight: 600, marginRight: 1, "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)" }}}
            >
              {user?.username || "Guest"}
            </Button>
          </Tooltip>

          <Button
            color="inherit"
            startIcon={<ExitToAppIcon />}
            onClick={handleLogout}
            sx={{ textTransform: "none", fontWeight: 600, borderColor: "white", "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)" }}}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: "flex", mt: "64px", height: "calc(100vh - 64px)", boxSizing: "border-box", overflow: "hidden" }}>
        <MiniSidebar currentPath={location.pathname} />
        <Box component="main" sx={{ flexGrow: 1, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", p: 3, bgcolor: "background.default" }}>
          <Box sx={{ flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Typography variant="h4" gutterBottom mb={0} color="text.primary">User Management</Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
              disabled={user.role !== "admin"}
            >
              Create New User
            </Button>
          </Box>

          <Box sx={{ flexGrow: 1, width: "100%", overflow: "hidden" }}>
            <DataGrid
              rows={users}
              columns={columns}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              disableRowSelectionOnClick
              sx={{
                height: "100%",
                width: "100%",
                bgcolor: "background.paper",
                boxShadow: 2,
                color: "text.primary",
                "& .MuiDataGrid-columnHeaders": { bgcolor: "background.default", color: "text.primary", fontWeight: "bold" },
                "& .MuiDataGrid-cell": { color: "text.secondary" },
                "& .MuiDataGrid-footerContainer": { bgcolor: "background.paper", color: "text.secondary" },
                "& .MuiTablePagination-root": { color: "text.secondary" },
              }}
            />
          </Box>
        </Box>

        <Dialog open={openCreate} onClose={handleCloseCreate} maxWidth="sm" fullWidth>
          <DialogTitle>Create New User</DialogTitle>
          <DialogContent>
            <TextField autoFocus margin="dense" label="Username" fullWidth variant="outlined" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required />
            <TextField margin="dense" label="Password" type="password" fullWidth variant="outlined" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            <TextField margin="dense" label="Email" type="email" fullWidth variant="outlined" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
            <FormControl fullWidth margin="dense" variant="outlined">
              <InputLabel id="role-select-label">Role</InputLabel>
              <Select labelId="role-select-label" value={newRole} onChange={(e) => setNewRole(e.target.value)} label="Role">
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth margin="dense" variant="outlined">
              <Autocomplete
                multiple
                id="assign-catalogs-autocomplete"
                options={allCatalogs}
                getOptionLabel={(option) => option.name}
                value={allCatalogs.filter((cat) => selectedCatalogs.includes(cat.id))}
                onChange={(event, newValue) => { setSelectedCatalogs(newValue.map((cat) => cat.id)); }}
                loading={catalogLoading}
                disableCloseOnSelect
                renderOption={(props, option, { selected }) => (
                  <li {...props}>
                    <Checkbox style={{ marginRight: 8 }} checked={selected} />
                    {option.name}
                  </li>
                )}
                renderTags={(value, getTagProps) => value.map((option, index) => ( <Chip label={option.name} {...getTagProps({ index })} /> ))}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    label="Assign Catalogs (Optional)"
                    placeholder="Select catalogs"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {catalogLoading ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCreate} color="secondary">Cancel</Button>
            <Button onClick={handleCreateUser} variant="contained" color="primary">Create</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openEdit} onClose={handleCloseEdit} maxWidth="sm" fullWidth>
          <DialogTitle>Update Password for {selectedUser?.username}</DialogTitle>
          <DialogContent>
            <TextField autoFocus margin="dense" label="New Password" type="password" fullWidth variant="outlined" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} required />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEdit} color="secondary">Cancel</Button>
            <Button onClick={handleUpdatePassword} variant="contained" color="primary">Update Password</Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </>
  );
}