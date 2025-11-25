import React, { useState, useEffect, useRef } from "react"; 
import { useAuth } from "../contexts/AuthContext";
import {
  Box,
  Typography,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  CssBaseline,
  Tooltip,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Snackbar,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormLabel, 
  TextField,
  InputAdornment, // Added
} from "@mui/material";
import {
  ExitToApp as ExitToAppIcon,
  Person as PersonIcon,
  UploadFile as UploadFileIcon,
  Analytics as AnalyticsIcon,
  Download as DownloadIcon,
  SettingsEthernet as SettingsEthernetIcon,
  Storage as StorageIcon, 
  Close as CloseIcon,
  Search as SearchIcon, // Added
} from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import MiniSidebar from "./MiniSidebar";
import Sidebar from "../components/Sidebar";
import axios from "axios";
import Logo from "../assets/analytics_hub_logo.png"; 

const API_URL = window.env.API_URL;
const fileInputAccept = ".csv, .xls, .xlsx, .tsv, .json, .parquet";

export default function DataPreview() {
  const { user, logout, globalState, updateGlobalState } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // --- Search State ---
  const [search, setSearch] = useState("");

  // --- Init state from globalState ---
  const [mode, setMode] = useState(globalState.previewMode || "file");
  const [selectedFile, setSelectedFile] = useState(globalState.previewSelectedFile || null);
  const [reportFilename, setReportFilename] = useState(globalState.previewReportFilename || null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(globalState.previewSidebarOpen || false);
  
  // Initialize with default port 443
  const [connectionInfo, setConnectionInfo] = useState(globalState.previewConnectionInfo || { db_type: "Snowflake", port: "443" });
  
  const [connectionStatus, setConnectionStatus] = useState(globalState.previewConnectionStatus || null);
  const [errorMessage, setErrorMessage] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false); 
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const [schemas, setSchemas] = useState(globalState.previewSchemas || []);
  const [selectedSchema, setSelectedSchema] = useState(globalState.previewSelectedSchema || "");
  const [tables, setTables] = useState(globalState.previewTables || []);
  const [selectedTable, setSelectedTable] = useState(globalState.previewSelectedTable || "");
  
  const [analysisMode, setAnalysisMode] = useState(globalState.previewAnalysisMode || "custom");
  const [customRowCount, setCustomRowCount] = useState(globalState.previewCustomRowCount || "1000");

  // --- Persistence Effects ---
  useEffect(() => { updateGlobalState('previewMode', mode); }, [mode, updateGlobalState]);
  useEffect(() => { updateGlobalState('previewSelectedFile', selectedFile); }, [selectedFile, updateGlobalState]);
  useEffect(() => { updateGlobalState('previewReportFilename', reportFilename); }, [reportFilename, updateGlobalState]);
  useEffect(() => { updateGlobalState('previewSidebarOpen', sidebarOpen); }, [sidebarOpen, updateGlobalState]);
  useEffect(() => { updateGlobalState('previewConnectionInfo', connectionInfo); }, [connectionInfo, updateGlobalState]);
  useEffect(() => { updateGlobalState('previewConnectionStatus', connectionStatus); }, [connectionStatus, updateGlobalState]);
  useEffect(() => { updateGlobalState('previewSchemas', schemas); }, [schemas, updateGlobalState]);
  useEffect(() => { updateGlobalState('previewSelectedSchema', selectedSchema); }, [selectedSchema, updateGlobalState]);
  useEffect(() => { updateGlobalState('previewTables', tables); }, [tables, updateGlobalState]);
  useEffect(() => { updateGlobalState('previewSelectedTable', selectedTable); }, [selectedTable, updateGlobalState]);
  useEffect(() => { updateGlobalState('previewAnalysisMode', analysisMode); }, [analysisMode, updateGlobalState]);
  useEffect(() => { updateGlobalState('previewCustomRowCount', customRowCount); }, [customRowCount, updateGlobalState]);


  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleModeChange = (event, newMode) => {
    if (newMode !== null) {
      setMode(newMode);
      setReportFilename(null);
      setError(null);
      if (newMode === "database") {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files ? event.target.files[0] : null;
    if (file) {
      const fileExt = file.name.split('.').pop().toLowerCase();
      const validExts = fileInputAccept.split(',').map(ext => ext.trim().replace('.', ''));
      
      if (!validExts.includes(fileExt)) {
          const validTypes = fileInputAccept.replace(/\./g, '').toUpperCase();
          setError(`Invalid file type. Please upload one of: ${validTypes}`);
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
      }
      
      setSelectedFile(file);
      setReportFilename(null);
      setError(null);
    }
  };
  
  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  
  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const pseudoEvent = { target: { files: files } };
      handleFileChange(pseudoEvent);
      if(fileInputRef.current) fileInputRef.current.files = files;
      event.dataTransfer.clearData();
    }
  };
  
  const clearFile = (event) => {
      event.stopPropagation(); 
      setSelectedFile(null);
      setReportFilename(null);
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; 
      }
  };


  const handleFileAnalyze = async () => {
    if (!selectedFile) {
      setError("Please select a file first.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setReportFilename(null);
    const formData = new FormData();
    formData.append("data_file", selectedFile);
    try {
      const response = await axios.post(
        `${API_URL}/api/generate_profiling_report`,
        formData,
        { 
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true
        }
      );
      if (response.data.success) {
        setReportFilename(response.data.report_filename);
      } else {
        setError(response.data.error || "Failed to generate report.");
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "An error occurred while communicating with the server."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectionInfoChange = (field, value) => {
    setConnectionInfo((prev) => ({
      ...(prev || {}), 
      [field]: value,
    }));
  };

  const handleConnect = async (connInfo) => {
    setConnectLoading(true);
    setConnectionStatus(null);
    setErrorMessage("");
    setSchemas([]);
    setSelectedSchema("");
    setTables([]);
    setSelectedTable("");
    try {
      const response = await fetch(`${API_URL}/connect_database`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(connInfo),
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setConnectionStatus("success");
        setConnectionInfo(connInfo); 
        setSnackbar({
          open: true,
          message: "Database connected successfully!",
          severity: "success",
        });
      } else {
        setConnectionStatus("error");
        setErrorMessage(data.error || "Connection failed.");
        setSnackbar({
          open: true,
          message: data.error || "Connection failed.",
          severity: "error",
        });
      }
    } catch (err) {
      setConnectionStatus("error");
      setErrorMessage(err.message || "Connection error.");
      setSnackbar({
        open: true,
        message: err.message || "Connection error.",
        severity: "error",
      });
    }
    setConnectLoading(false);
  };

  const handleSaveConnection = async (nickname) => {
    setIsSaving(true);
    setSnackbar({
      open: true,
      message: "Save connection from the AI Chatbot page.",
      severity: "info",
    });
    setTimeout(() => setIsSaving(false), 1000);
  };

  useEffect(() => {
    if (schemas.length > 0 && connectionInfo && connectionStatus === 'success') {
        return;
    }

    async function fetchSchemas() {
      try {
        const res = await fetch(API_URL + "/list_schemas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(connectionInfo),
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
          setSchemas(data.schemas.sort());
        } else {
          setSnackbar({ open: true, message: "Failed to load schemas: " + data.error, severity: "error" });
        }
      } catch (error) {
        setSnackbar({ open: true, message: "Error loading schemas: " + error.message, severity: "error" });
      }
    }
    
    if (connectionInfo && connectionStatus === 'success' && mode === 'database') {
      fetchSchemas(); 
    }
  }, [connectionInfo, connectionStatus, mode]); 

  useEffect(() => {
    if (tables.length > 0 && selectedSchema) {
        return;
    }

    async function fetchTables() {
      try {
        const res = await fetch(API_URL + "/list_tables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectionInfo,
            schema: selectedSchema,
          }),
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
          setTables(data.tables.sort());
        } else {
          setSnackbar({ open: true, message: "Failed to load tables: ".concat(data.error), severity: "error" });
        }
      } catch (error) {
        setSnackbar({ open: true, message: "Error loading tables: ".concat(error.message), severity: "error" });
      }
    }
    
    if (connectionInfo && connectionStatus === 'success' && selectedSchema && mode === 'database') {
      fetchTables();
    }
  }, [connectionInfo, connectionStatus, selectedSchema, mode]); 
  
  const handleDatabaseAnalyze = async () => {
    if (!connectionInfo || !selectedSchema || !selectedTable) {
      setError("Please connect and select a schema and table.");
      return;
    }
    
    let rowCountToSend;
    if (analysisMode === 'full') {
      rowCountToSend = 'full';
    } else {
      const count = parseInt(customRowCount, 10);
      if (isNaN(count) || count <= 0) {
        setError("Please enter a valid, positive number for the row count.");
        return;
      }
      rowCountToSend = count.toString();
    }
    
    setIsLoading(true);
    setError(null);
    setReportFilename(null);
    try {
      const response = await axios.post(
        `${API_URL}/api/generate_db_profiling_report`,
        {
          connectionInfo: connectionInfo,
          schema: selectedSchema,
          table: selectedTable,
          rowCount: rowCountToSend,
        },
        { withCredentials: true }
      );
      if (response.data.success) {
        setReportFilename(response.data.report_filename);
      } else {
        setError(response.data.error || "Failed to generate report.");
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "An error occurred while communicating with the server."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!reportFilename) return;
    setIsDownloading(true);
    try {
      const response = await axios.get(
        `${API_URL}/reports/${reportFilename}`,
        { 
          responseType: "blob",
          withCredentials: true
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", reportFilename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading file:", err);
      setError("Failed to download the report.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleAnalysisModeChange = (event, newMode) => {
    if (newMode !== null) {
      setAnalysisMode(newMode);
    }
  };

  return (
    <>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          
          {/* --- UNIFIED BRANDING --- */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <img src={Logo} alt="Analytics Hub" style={{ width: 50, height: 50, objectFit: "contain" }} />
            <Typography variant="h6" noWrap sx={{ fontWeight: 700, color: "#fff", userSelect: "none" }}>
              Data & Analytics Practice — Analytix Hub
            </Typography>
          </Box>
          {/* ----------------------- */}

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

          {/* --- RIGHT SIDE ACTIONS --- */}
          <Tooltip title={`Role: ${user?.role || "N/A"}`} arrow>
            <Button
              color="inherit"
              startIcon={<PersonIcon />}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                marginRight: 1,
                "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)" },
              }}
            >
              {user?.username || "Guest"}
            </Button>
          </Tooltip>

          {/* Sidebar Toggle - Only active in database mode */}
          <Tooltip title={sidebarOpen ? "Hide DB Connection" : "Show DB Connection"} arrow>
            <span>
              <IconButton
                color="inherit"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                disabled={mode !== 'database'}
                sx={{ 
                  opacity: mode !== 'database' ? 0.5 : 1 
                }}
              >
                <SettingsEthernetIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Button
            color="inherit"
            startIcon={<ExitToAppIcon />}
            onClick={handleLogout}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              marginLeft: 1,
              "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)" },
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: "flex", mt: "64px", height: "calc(100vh - 64px)" }}>
        <MiniSidebar currentPath={location.pathname} />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 4,
            bgcolor: "background.default",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "auto", 
          }}
        >
          <Box sx={{ flexShrink: 0 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: "text.primary" }}> 
              Exploratory Data Analysis
            </Typography>
            <Typography variant="body1" gutterBottom sx={{ color: "text.secondary", mb: 2 }}>
              Generate a full interactive analysis from a file or a database table.
            </Typography>
          </Box>

          <Paper elevation={2} sx={{ p: 2, bgcolor: "background.paper", flexShrink: 0, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <ToggleButtonGroup
                  color="primary"
                  value={mode}
                  exclusive
                  onChange={handleModeChange}
                  aria-label="Analysis Mode"
                  fullWidth
                >
                  <ToggleButton value="file" aria-label="file mode">
                    <UploadFileIcon sx={{ mr: 1 }} />
                    Analyze File
                  </ToggleButton>
                  <ToggleButton value="database" aria-label="database mode">
                    <StorageIcon sx={{ mr: 1 }} />
                    Analyze Database
                  </ToggleButton>
                </ToggleButtonGroup>
              </Grid>

              <Grid item xs={12} md={8}>
                {reportFilename && (
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    startIcon={
                      isDownloading ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <DownloadIcon />
                      )
                    }
                  >
                    {isDownloading ? "Downloading..." : "Download Report"}
                  </Button>
                )}
              </Grid>
            </Grid>
          </Paper>
          
          {mode === 'file' && (
            <Paper elevation={2} sx={{ p: 2, bgcolor: "background.paper", flexShrink: 0, mb: 2 }}>
              <Grid container spacing={2} alignItems="center">
                
                <Grid item xs={12} md={8}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      bgcolor: isDragging ? "action.hover" : "background.default",
                      border: "2px dashed",
                      borderColor: isDragging ? "primary.main" : "divider",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "background-color 0.2s, border-color 0.2s",
                    }}
                    onClick={() => !selectedFile && fileInputRef.current.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                      <UploadFileIcon sx={{ mr: 2, color: "primary.main", flexShrink: 0 }} />
                      <Typography variant="body1" noWrap sx={{ color: selectedFile ? 'text.primary' : 'text.secondary' }}>
                        {selectedFile ? selectedFile.name : "Drag & drop file here or click to select"}
                      </Typography>
                    </Box>
                    {selectedFile && (
                      <IconButton
                        onClick={clearFile}
                        size="small"
                        sx={{ ml: 1, flexShrink: 0 }}
                        aria-label="Clear selected file"
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Paper>
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    id="file-upload-input"
                    accept={fileInputAccept}
                    onChange={handleFileChange}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Button
                    variant="contained" color="primary" fullWidth
                    onClick={handleFileAnalyze}
                    disabled={!selectedFile || isLoading}
                    startIcon={ isLoading ? <CircularProgress size={20} color="inherit" /> : <AnalyticsIcon /> }
                  >
                    {isLoading ? "Generating..." : "Generate from File"}
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          )}
          
          {mode === 'database' && (
             <Paper elevation={2} sx={{ p: 2, bgcolor: "background.paper", flexShrink: 0, mb: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth disabled={!connectionInfo || connectionStatus !== 'success'} sx={{ minWidth: 240 }}>
                    <InputLabel id="schema-select-label">Schema</InputLabel>
                    <Select
                      labelId="schema-select-label"
                      value={selectedSchema}
                      label="Schema"
                      onChange={(e) => {
                        setSelectedSchema(e.target.value);
                        setSelectedTable("");
                        setTables([]);
                      }}
                    >
                      {schemas.map((s) => ( <MenuItem key={s} value={s}>{s}</MenuItem> ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                   <FormControl fullWidth disabled={!selectedSchema} sx={{ minWidth: 240 }}>
                    <InputLabel id="table-select-label">Table</InputLabel>
                    <Select
                      labelId="table-select-label"
                      value={selectedTable}
                      label="Table"
                      onChange={(e) => setSelectedTable(e.target.value)}
                    >
                      {tables.map((t) => ( <MenuItem key={t} value={t}>{t}</MenuItem>))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={8}>
                  <FormControl component="fieldset" disabled={!selectedTable}>
                    <FormLabel component="legend" sx={{ fontSize: '0.8rem', mb: 0.5 }}>Data Scope</FormLabel>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <ToggleButtonGroup
                        color="primary"
                        value={analysisMode}
                        exclusive
                        onChange={handleAnalysisModeChange}
                        aria-label="data scope"
                      >
                        <ToggleButton value="custom">Custom Count</ToggleButton>
                        <ToggleButton value="full">Full Table</ToggleButton>
                      </ToggleButtonGroup>
                      <TextField
                        label="Row Count"
                        type="number"
                        size="small"
                        value={customRowCount}
                        onChange={(e) => setCustomRowCount(e.target.value)}
                        disabled={analysisMode === 'full' || !selectedTable}
                        inputProps={{ min: 1 }}
                        sx={{ width: 150 }}
                      />
                    </Box>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Button
                    variant="contained" color="primary" fullWidth
                    onClick={handleDatabaseAnalyze}
                    disabled={!selectedTable || isLoading}
                    startIcon={ isLoading ? <CircularProgress size={20} color="inherit" /> : <AnalyticsIcon /> }
                    sx={{ height: '56px' }}
                  >
                    {isLoading ? "Generating..." : "Generate from DB"}
                  </Button>
                </Grid>
              </Grid>
             </Paper>
          )}

          <Box sx={{ flexGrow: 1, overflow: "hidden", minHeight: { xs: "500px", md: "800px"} }}> 
            {isLoading && (
              <Box
                sx={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", height: "100%", color: "text.secondary",
                }}
              >
                <CircularProgress size={40} sx={{ mb: 2 }} />
                <Typography>
                  Generating interactive report, this may take a minute...
                </Typography>
              </Box>
            )}
            {error && <Alert severity="error">{error}</Alert>}
            {reportFilename && !isLoading && (
              <Paper
                component="iframe"
                src={`${API_URL}/reports/${reportFilename}`} 
                title="Data Profile Report"
                sx={{
                  width: "100%", height: "100%",
                  border: "1px solid", 
                  borderColor: "divider", 
                  borderRadius: 2,
                }}
              />
            )}
          </Box>
        </Box>

        {mode === 'database' && (
            <Sidebar
                open={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                onConnect={handleConnect}
                connectionStatus={connectionStatus}
                errorMessage={errorMessage}
                loading={connectLoading}
                connectionInfo={connectionInfo}
                onConnectionInfoChange={handleConnectionInfoChange} 
                onSaveConnection={handleSaveConnection} 
                isSaving={isSaving} 
            />
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}