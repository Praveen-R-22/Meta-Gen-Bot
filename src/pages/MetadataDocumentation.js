import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Snackbar,
  Alert,
  CircularProgress,
  Tooltip,
  Collapse,
  Paper,
  Chip,
  InputAdornment,
} from "@mui/material";
import {
  ExitToApp as ExitToAppIcon,
  Person as PersonIcon,
  SettingsEthernet as SettingsEthernetIcon,
  Schema as ERDiagramIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CloseIcon from "@mui/icons-material/Close";

// Import hooks and components for navigation and function
import { useLocation, useNavigate } from "react-router-dom";
import MiniSidebar from "./MiniSidebar";
import Sidebar from "../components/Sidebar";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import SemanticCatalogModal from "./SemanticCatalogModal"; // Import the modal
import Logo from "../assets/analytics_hub_logo.png"; // Unified Logo Import

// Use .env variable
const API_URL = window.env.API_URL;

/**
 * Renders a collapsible preview of the first 10 rows of a table.
 */
function TablePreview({ connectionInfo, connectionStatus, schema, table }) {
  const [preview, setPreview] = useState({ rows: [], columns: [] });
  const [showPreview, setShowPreview] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!connectionInfo || connectionStatus !== 'success' || !schema || !table) return;

    async function fetchTablePreview() {
      setLoading(true);
      setError(null);
      setPreview({ rows: [], columns: [] });
      try {
        const res = await fetch(`${API_URL}/preview_table`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectionInfo,
            schema: schema,
            table: table,
          }),
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
          setPreview({
            rows: data.rows.map((row, index) => ({ id: index, ...row })),
            columns: data.columns,
          });
        } else {
          setError(data.error || "Failed to fetch preview.");
          setPreview({ rows: [], columns: [] });
        }
      } catch (err) {
        setError(err.message || "A network error occurred.");
        setPreview({ rows: [], columns: [] });
      }
      setLoading(false);
    }
    fetchTablePreview();
  }, [connectionInfo, connectionStatus, schema, table]);

  if (loading) {
    return (
      <Paper sx={{ p: 2, mb: 3, textAlign: 'center', bgcolor: 'background.default' }}>
        <CircularProgress size={20} />
        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>Loading preview for {table}...</Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        <strong>Error loading preview for {table}:</strong> {error}
      </Alert>
    );
  }

  if (preview.rows.length === 0) {
    return (
        <Box mb={3} sx={{ borderRadius: 2, boxShadow: 1, bgcolor: "background.paper" }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" px={2} py={1} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'medium', color: 'text.secondary' }}>
              Table Data Preview: {table}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', pr: 1 }}>
              (No data to preview)
            </Typography>
          </Box>
        </Box>
    );
  }

  return (
    <Box mb={3} sx={{ borderRadius: 2, boxShadow: 1, bgcolor: "background.paper" }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" px={2} py={1} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'medium', color: 'text.primary' }}>
          Table Data Preview (First 10 Rows): {table}
        </Typography>
        <Button variant="text" size="small" onClick={() => setShowPreview(v => !v)}>
            {showPreview ? "Minimize" : "Expand"}
        </Button>
      </Box>
      <Collapse in={showPreview}>
        <Box sx={{ height: 300, width: '100%' }}> 
          <DataGrid
              rows={preview.rows}
              columns={preview.columns}
              disableColumnMenu
              disableRowSelectionOnClick
              density="compact"
              sx={{ border: 0, '& .MuiDataGrid-cell': { color: 'text.primary' }, '& .MuiDataGrid-columnHeaders': { color: 'text.primary' } }}
              getRowId={(row) => row.id}
          />
        </Box>
      </Collapse>
    </Box>
  );
}

/**
 * Main workspace for documentation and catalog creation.
 */
function WorkArea({ connectionInfo, connectionStatus, setSnackbar, user }) {
  // --- Access Global State ---
  const { globalState, updateGlobalState } = useAuth();
  
  // Initialize state from global cache if available, else defaults
  const [schemas, setSchemas] = useState(globalState.schemas || []);
  const [selectedSchema, setSelectedSchema] = useState(globalState.selectedSchema || "");
  const [tables, setTables] = useState(globalState.tables || []);
  const [selectedTables, setSelectedTables] = useState(globalState.selectedTables || []);
  const [mode, setMode] = useState(globalState.mode || "Single Table");
  const [selectAll, setSelectAll] = useState(false);
  const [userExtraPrompt, setUserExtraPrompt] = useState(globalState.userExtraPrompt || "");

  const [tableSchemaColumns, setTableSchemaColumns] = useState([]); 
  const [tableComments, settableComments] = useState([]);
  const [cmtcolumns, setColumnscmt] = useState([]);
  const [showComments, setShowComments] = useState(true);

  const [loading, setLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  const [extractedText, setExtractedText] = useState("");
  const [extractedERContext, setExtractedERContext] = useState("");

  const [gendesc, setgendesc] = useState(globalState.gendesc || []);
  const [bulkDescriptions, setBulkDescriptions] = useState(globalState.bulkDescriptions || []);
  const [selectionModel, setSelectionModel] = useState(globalState.selectionModel || {});

  const [modalOpen, setModalOpen] = useState(false);

  // Determine mode from URL
  const location = useLocation();
  const pageMode = location.pathname.includes('/catalog') ? 'catalog' : 'documentation';

  // --- Persistence Effects ---
  useEffect(() => { updateGlobalState('schemas', schemas); }, [schemas]);
  useEffect(() => { updateGlobalState('selectedSchema', selectedSchema); }, [selectedSchema]);
  useEffect(() => { updateGlobalState('tables', tables); }, [tables]);
  useEffect(() => { updateGlobalState('selectedTables', selectedTables); }, [selectedTables]);
  useEffect(() => { updateGlobalState('mode', mode); }, [mode]);
  useEffect(() => { updateGlobalState('userExtraPrompt', userExtraPrompt); }, [userExtraPrompt]);
  useEffect(() => { updateGlobalState('gendesc', gendesc); }, [gendesc]);
  useEffect(() => { updateGlobalState('bulkDescriptions', bulkDescriptions); }, [bulkDescriptions]);
  useEffect(() => { updateGlobalState('selectionModel', selectionModel); }, [selectionModel]);


  useEffect(() => {
    if (!connectionInfo || connectionStatus !== 'success') {
      if (schemas.length === 0) {
          setSchemas([]);
          setSelectedSchema("");
      }
      return;
    }

    async function fetchSchemas() {
      try {
        const res = await fetch(`${API_URL}/list_schemas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(connectionInfo),
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
          setSchemas(data.schemas.sort());
          if (data.schemas.length > 0 && !selectedSchema) setSelectedSchema(data.schemas[0]);
        } else {
          setSnackbar({ open: true, message: "Failed to load schemas: " + data.error, severity: "error" });
        }
      } catch (error) {
        setSnackbar({ open: true, message: "Error loading schemas: " + error.message, severity: "error" });
      }
    }

    if (schemas.length === 0) {
        fetchSchemas();
    }
  }, [connectionInfo, connectionStatus, setSnackbar, schemas.length, selectedSchema]);

  useEffect(() => {
    if (!connectionInfo || connectionStatus !== 'success' || !selectedSchema) {
      return;
    }
    
    if (tables.length > 0) return;

    async function fetchTables() {
      try {
        const res = await fetch(`${API_URL}/list_tables`, {
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
          if (data.tables.length > 0 && mode === "Single Table" && selectedTables.length === 0) {
              setSelectedTables([data.tables[0]]);
          }
        } else {
          setSnackbar({ open: true, message: "Failed to load tables: " + data.error, severity: "error" });
        }
      } catch (error) {
        setSnackbar({ open: true, message: "Error loading tables: " + error.message, severity: "error" });
      }
    }
    
    fetchTables();
  }, [connectionInfo, connectionStatus, selectedSchema, mode, setSnackbar, tables.length, selectedTables.length]);


  useEffect(() => {
    if (!connectionInfo || connectionStatus !== 'success' || !selectedSchema || selectedTables.length === 0 || mode === "Bulk Tables") {
      settableComments([]);
      setColumnscmt([]);
      return;
    }
    async function fetchTableData() {
      try {
        const res = await fetch(`${API_URL}/tablecomments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectionInfo,
            schema: selectedSchema,
            table: selectedTables[0],
          }),
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
          settableComments(data.rows.map((row, index) => ({ id: index, ...row }))); 
          setColumnscmt(data.columns);
        } else {
          settableComments([]);
          setColumnscmt([]);
        }
      } catch (error) {
        settableComments([]);
        setColumnscmt([]);
      }
    }
    fetchTableData();
  }, [connectionInfo, connectionStatus, selectedSchema, selectedTables, mode]);


  useEffect(() => {
    if (!connectionInfo || connectionStatus !== 'success' || !selectedSchema || selectedTables.length === 0 || mode === "Bulk Tables") {
      setTableSchemaColumns([]);
      return;
    }
    async function fetchTableSchema() {
      try {
        const res = await fetch(`${API_URL}/get_columns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...connectionInfo,
            schema: selectedSchema,
            table: selectedTables[0],
          }),
          credentials: 'include'
        });
        const data = await res.json();
        if (data.error) {
           console.error("Failed to load table schema: " + data.error);
           setTableSchemaColumns([]);
        } else {
          setTableSchemaColumns(data);
        }
      } catch (error) {
        console.error("Error loading table schema: " + error.message);
        setTableSchemaColumns([]);
      }
    }
    fetchTableSchema();
  }, [connectionInfo, connectionStatus, selectedSchema, selectedTables, mode]);


  useEffect(() => {
    if (mode === "Bulk Tables") {
      if (selectAll && tables.length > 0) {
          setSelectedTables([...tables]);
      }
    } else {
      if (selectedTables.length > 1) {
        setSelectedTables([selectedTables[0]]);
      }
      else if (selectedTables.length === 0 && tables.length > 0) {
         setSelectedTables([tables[0]]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectAll, mode, tables]);
  
  /**
   * Component for uploading business documents (PDF, DOCX, TXT, etc.)
   */
  function BusinessDocUploader({ onTextExtracted }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewText, setPreviewText] = useState("");
    const fileInputRef = useRef(null); 

    const handleFileChange = (event) => {
      const file = event.target.files ? event.target.files[0] : null;
      if (file) {
        setSelectedFile(file);
        setSuccessMessage("");
        onTextExtracted("");
        setPreviewText("");
        setPreviewOpen(false);
      }
    };

    const handleDrop = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        const file = event.dataTransfer.files[0];
         setSelectedFile(file);
         setSuccessMessage(""); 
         onTextExtracted("");
         setPreviewText("");
         setPreviewOpen(false); 
        event.dataTransfer.clearData(); 
      }
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        event.stopPropagation();
    };

    const clearFile = (event) => {
        event.stopPropagation();
        setSelectedFile(null);
        setSuccessMessage("");
        onTextExtracted("");
        setPreviewText("");
        setPreviewOpen(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; 
        }
    };
  
    const handleUpload = async () => {
      if (!selectedFile) {
        setSnackbar({ open: true, message: "Please select a file first!", severity: "warning" });
        return;
      }
      setUploadLoading(true);
      setSuccessMessage("");
      onTextExtracted("");
      setPreviewText("");
      setPreviewOpen(false);
  
      try {
        const formData = new FormData();
        formData.append("uploaded_doc", selectedFile);
  
        const response = await fetch(`${API_URL}/upload_doc`, {
          method: "POST",
          body: formData,
          credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.text) {
          onTextExtracted(data.text);
          setPreviewText(data.text);
          setSuccessMessage(`✅ ${selectedFile.name} processed.`);
          setPreviewOpen(true);
        } else {
          setSnackbar({ open: true, message: "Failed to process document: " + (data.error || "Unknown error"), severity: "error" });
          clearFile(new Event('synthetic'));
        }
      } catch (error) {
        setSnackbar({ open: true, message: "Error uploading file: " + error.message, severity: "error" });
        clearFile(new Event('synthetic'));
      }
  
      setUploadLoading(false);
    };
  
    return (
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          📝 Upload Supporting Document (TXT, DOCX, PDF, HTML)
        </Typography>

        <Paper
          variant="outlined"
          sx={{
            p: 2, bgcolor: "background.default", border: "2px dashed", borderColor: 'divider',
            cursor: "pointer", mb: 1, display: "flex", alignItems: "center",
            position: 'relative'
          }}
          onClick={() => !selectedFile && fileInputRef.current.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <UploadFileIcon sx={{ mr: 2, color: "primary.main" }} />
          <Typography variant="body1" sx={{ flexGrow: 1, color: selectedFile ? 'text.primary' : 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedFile ? selectedFile.name : "Drag & drop or click to select a file"}
          </Typography>
          {selectedFile && (
            <IconButton 
              onClick={clearFile} 
              size="small" 
              sx={{ ml: 1 }}
              aria-label="Clear selected file"
            >
              <CloseIcon fontSize="small"/>
            </IconButton>
          )}
        </Paper>
        <input
          ref={fileInputRef}
          accept=".txt,.docx,.pdf,.html"
          type="file"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpload}
            disabled={!selectedFile || uploadLoading}
            startIcon={uploadLoading ? null : <UploadFileIcon />}
          >
            {uploadLoading ? <CircularProgress size={24} /> : "Process Document"}
          </Button>
        </Box>

        {successMessage && (
          <Typography color="success.main" sx={{ mt: 2 }}>
            {successMessage} 
            <Button size="small" onClick={() => setPreviewOpen(!previewOpen)} sx={{ ml: 1}}>
              {previewOpen ? "Hide Preview" : "Show Preview"}
            </Button>
          </Typography>
        )}

        <Collapse in={previewOpen}>
          {previewText && (
            <Box sx={{
              mt: 1, p: 2, bgcolor: "background.default", borderRadius: 1,
              maxHeight: 300, overflowY: "auto", border: '1px solid', borderColor: 'divider'
            }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                Document Content Preview:
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", fontSize: '0.8rem', color: 'text.secondary' }}>
                {previewText.length > 1500
                  ? previewText.substring(0, 1500) + "..."
                  : previewText} 
              </Typography>
            </Box>
          )}
        </Collapse>
      </Box>
    );
  }

  /**
   * Component for uploading ER diagrams (PDF, images, etc.)
   */
  function ERDiagramUploader({ onTextExtracted }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewText, setPreviewText] = useState("");
    const fileInputRef = useRef(null); 

    const handleFileChange = (event) => {
      const file = event.target.files ? event.target.files[0] : null;
      if (file) {
        setSelectedFile(file);
        setSuccessMessage("");
        onTextExtracted("");
        setPreviewText("");
        setPreviewOpen(false);
      }
    };

    const handleDrop = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        const file = event.dataTransfer.files[0];
         setSelectedFile(file);
         setSuccessMessage(""); 
         onTextExtracted("");
         setPreviewText("");
         setPreviewOpen(false); 
        event.dataTransfer.clearData(); 
      }
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        event.stopPropagation();
    };

    const clearFile = (event) => {
        event.stopPropagation();
        setSelectedFile(null);
        setSuccessMessage("");
        onTextExtracted("");
        setPreviewText("");
        setPreviewOpen(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; 
        }
    };
  
    const handleUpload = async () => {
      if (!selectedFile) {
        setSnackbar({ open: true, message: "Please select a file first!", severity: "warning" });
        return;
      }
      setUploadLoading(true);
      setSuccessMessage("");
      onTextExtracted("");
      setPreviewText("");
      setPreviewOpen(false);
  
      try {
        const formData = new FormData();
        formData.append("uploaded_doc", selectedFile);
  
        const response = await fetch(`${API_URL}/upload_doc`, {
          method: "POST",
          body: formData,
          credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.text) {
          onTextExtracted(data.text); 
          setPreviewText(data.text);
          setSuccessMessage(`✅ ${selectedFile.name} processed.`);
          setPreviewOpen(true);
        } else {
          if (!data.success) {
            setSnackbar({ open: true, message: "Failed to process file: " + (data.error || "Unknown error"), severity: "error" });
            clearFile(new Event('synthetic'));
          } else {
            onTextExtracted(""); // No text, but file is acknowledged
            setPreviewText("(No text content could be extracted from this file. File is still noted.)");
            setSuccessMessage(`✅ ${selectedFile.name} processed (no text content).`);
            setPreviewOpen(true);
          }
        }
      } catch (error) {
        setSnackbar({ open: true, message: "Error uploading file: " + error.message, severity: "error" });
        clearFile(new Event('synthetic'));
      }
  
      setUploadLoading(false);
    };
  
    return (
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          <ERDiagramIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> 
          Upload ER Diagram (Optional: PDF, DOCX, PNG, JPG)
        </Typography>

        <Paper
          variant="outlined"
          sx={{
            p: 2, bgcolor: "background.default", border: "2px dashed", borderColor: 'divider',
            cursor: "pointer", mb: 1, display: "flex", alignItems: "center",
            position: 'relative'
          }}
          onClick={() => !selectedFile && fileInputRef.current.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <ERDiagramIcon sx={{ mr: 2, color: "primary.main" }} />
          <Typography variant="body1" sx={{ flexGrow: 1, color: selectedFile ? 'text.primary' : 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedFile ? selectedFile.name : "Drag & drop ER Diagram or click to select"}
          </Typography>
          {selectedFile && (
            <IconButton 
              onClick={clearFile} 
              size="small" 
              sx={{ ml: 1 }}
              aria-label="Clear selected file"
            >
              <CloseIcon fontSize="small"/>
            </IconButton>
          )}
        </Paper>
        <input
          ref={fileInputRef}
          accept=".txt,.docx,.pdf,.html,.png,.jpg,.jpeg"
          type="file"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpload}
            disabled={!selectedFile || uploadLoading}
            startIcon={uploadLoading ? null : <ERDiagramIcon />}
          >
            {uploadLoading ? <CircularProgress size={24} /> : "Process ER Diagram"}
          </Button>
        </Box>

        {successMessage && (
          <Typography color="success.main" sx={{ mt: 2 }}>
            {successMessage} 
            <Button size="small" onClick={() => setPreviewOpen(!previewOpen)} sx={{ ml: 1}}>
              {previewOpen ? "Hide Preview" : "Show Preview"}
            </Button>
          </Typography>
        )}

        <Collapse in={previewOpen}>
          {previewText && (
            <Box sx={{
              mt: 1, p: 2, bgcolor: "background.default", borderRadius: 1,
              maxHeight: 300, overflowY: "auto", border: '1px solid', borderColor: 'divider'
            }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                ER Diagram Content Preview:
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", fontSize: '0.8rem', color: 'text.secondary' }}>
                {previewText.length > 1500
                  ? previewText.substring(0, 1500) + "..."
                  : previewText}
              </Typography>
            </Box>
          )}
        </Collapse>
      </Box>
    );
  }
  
  // Fixed columns configuration with proper editing
  const gencolumns = [
    { field: "id", headerName: "SNo", width: 60, editable: false },
    { field: "column", headerName: "Field", width: 200, editable: false },
    { field: "type", headerName: "Type", width: 150, editable: false },
    { 
      field: "column_description", 
      headerName: "Description", 
      flex: 1, 
      minWidth: 300,
      editable: true,
      renderEditCell: (params) => (
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={params.value || ''}
          onChange={(e) => {
            params.api.setEditCellValue({
              id: params.id,
              field: params.field,
              value: e.target.value,
            });
          }}
          variant="standard"
        />
      )
    }
  ];

  // Handle cell edit for single table
  const handleCellEditCommit = (params) => {
    if (params.field === 'column_description') {
      setgendesc(prev => 
        prev.map(row => 
          row.id === params.id 
            ? { ...row, column_description: params.value } 
            : row
        )
      );
    }
  };

  // Handle cell edit for bulk tables
  const handleBulkCellEditCommit = (params, tableName) => {
    if (params.field === 'column_description') {
      setBulkDescriptions(prev => 
        prev.map(tableDesc => 
          tableDesc.tableName === tableName
            ? {
                ...tableDesc,
                description: tableDesc.description.map(row =>
                  row.id === params.id 
                    ? { ...row, column_description: params.value } 
                    : row
                )
              }
            : tableDesc
        )
      );
    }
  };

  const handleGenerateDescription = async () => {
    setLoading(true);
    setgendesc([]);
    setBulkDescriptions([]);
    setSelectionModel({});

    const combinedDocumentContext = `
--- Supporting Document Context ---
${extractedText}

--- ER Diagram Context ---
${extractedERContext}
    `;

    if (mode === "Bulk Tables") {
      if (selectedTables.length === 0) {
         setSnackbar({ open: true, message: "No tables selected for bulk generation.", severity: "warning" });
         setLoading(false);
         return;
      }
      const allDescriptions = [];
      const newSelection = {};
      const allTableNames = selectedTables.join(', ');

      for (const table of selectedTables) {
       try {
          let currentTableSchemaCols = [];
          try {
            const resCols = await fetch(`${API_URL}/get_columns`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...connectionInfo,
                schema: selectedSchema,
                table: table,
              }),
              credentials: 'include'
            });
            const dataCols = await resCols.json();
            if (!dataCols.error) {
              currentTableSchemaCols = dataCols;
            } else {
              console.error("Failed to fetch columns for table " + table, dataCols.error);
            }
          } catch (e) {
            console.error("Error fetching columns for bulk table " + table, e);
          }

          if (currentTableSchemaCols.length === 0) {
            console.warn(`Skipping table ${table} due to missing column schema.`);
            allDescriptions.push({ tableName: table, description: [], error: "Could not fetch columns" });
            continue;
          }

          const specificUserPrompt = `
This table '${table}' is part of a larger group of tables being documented: [${allTableNames}].
Use the provided ER Diagram and Supporting Document context to understand its relationships
with these other tables (especially foreign keys) when generating its column descriptions.
Additional user instructions: ${userExtraPrompt}
          `;

          const res = await fetch(`${API_URL}/generate_description`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tablename: table, 
              columns: currentTableSchemaCols,
              document_context: combinedDocumentContext,
              user_prompt: specificUserPrompt
            }),
            credentials: 'include'
          });
          const data = await res.json();
          if (data.success && data.description && data.description.columns) {
            const parsedDescription = data.description.columns;
            // Add 'type' from schema to the description objects
            const descriptionsWithType = parsedDescription.map(desc => {
                const schemaCol = currentTableSchemaCols.find(sc => sc.name === desc.column);
                return { ...desc, type: schemaCol ? schemaCol.type : '' };
            });
            allDescriptions.push({ tableName: table, description: descriptionsWithType });
            newSelection[table] = parsedDescription.map(row => row.id);
           } else {
            console.error(`Failed to generate description for table ${table}: ${data.error}`);
            allDescriptions.push({ tableName: table, description: [], error: data.error || "Generation failed" });
          }
        } catch (error) {
           console.error(`Network error generating description for table ${table}: ${error}`);
          allDescriptions.push({ tableName: table, description: [], error: "Network error" });
        }
      }
      setBulkDescriptions(allDescriptions);
      setSelectionModel(newSelection);

    } else { // Single Table Mode
      if (selectedTables.length === 0) {
         setSnackbar({ open: true, message: "No table selected.", severity: "warning" });
         setLoading(false);
         return;
      }
      if (!tableSchemaColumns || tableSchemaColumns.length === 0) {
         setSnackbar({ open: true, message: "Could not fetch table column schema. Cannot generate descriptions.", severity: "error" });
         setLoading(false);
         return;
      }
      try {
        const res = await fetch(`${API_URL}/generate_description`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tablename: selectedTables[0],
            columns: tableSchemaColumns, 
            document_context: combinedDocumentContext,
            user_prompt: userExtraPrompt
          }),
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success && data.description && data.description.columns) {
          const parsedDescription = data.description.columns;
          // Add 'type' from schema to the description objects
          const descriptionsWithType = parsedDescription.map(desc => {
              const schemaCol = tableSchemaColumns.find(sc => sc.name === desc.column);
              return { ...desc, type: schemaCol ? schemaCol.type : '' };
          });
          setgendesc(descriptionsWithType);
          
          const tableName = selectedTables[0];
          setSelectionModel({
            [tableName]: descriptionsWithType.map(row => row.id)
          });

        } else {
          setSnackbar({ open: true, message: `Failed to generate description: ${data.error || 'Unknown error'}`, severity: "error" });
          setgendesc([]);
        }
      } catch (error) {
         setSnackbar({ open: true, message: `Network error: ${error.message}`, severity: "error" });
        setgendesc([]);
      }
    }
    setLoading(false);
  };

  const handleGeneratePdf = async () => {
  let dataToExport = {};

  if (mode === "Single Table" && gendesc.length > 0) {
    const transformedData = gendesc.map(row => ({
      "Column": row.column,
      "Type": row.type || "", 
      "Description": row.column_description 
    }));
    dataToExport = { [selectedTables[0]]: transformedData };
  } else if (mode === "Bulk Tables" && bulkDescriptions.length > 0) {
    bulkDescriptions.forEach(tableDesc => {
      if (tableDesc.description.length > 0) {
        const transformedData = tableDesc.description.map(row => ({
          "Column": row.column,
          "Type": row.type || "",
          "Description": row.column_description
        }));
        dataToExport[tableDesc.tableName] = transformedData;
      }
    });
  } else {
    setSnackbar({ open: true, message: "No descriptions generated to create PDF.", severity: "warning" });
    return;
  }

  dataToExport.username = user?.username;

  try {
    const response = await axios.post(`${API_URL}/generate_pdf`, dataToExport, {
      responseType: 'blob',
      credentials: 'include'
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `metadata_documentation.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    setSnackbar({ open: true, message: "PDF downloaded successfully!", severity: "success" });
  } catch (error) {
    console.error("Error generating PDF:", error);
    setSnackbar({ open: true, message: "Failed to generate PDF. Check server logs.", severity: "error" });
  }
};

  const handleDownloadExcel = async () => {
  let dataToExport = {};

  if (mode === "Single Table" && gendesc.length > 0) {
    const transformedData = gendesc.map(row => ({
      "Column": row.column,
      "Type": row.type || "", 
      "Description": row.column_description 
    }));
    dataToExport = { [selectedTables[0]]: transformedData };
  } else if (mode === "Bulk Tables" && bulkDescriptions.length > 0) {
    bulkDescriptions.forEach(tableDesc => {
      if (tableDesc.description.length > 0) {
        const transformedData = tableDesc.description.map(row => ({
          "Column": row.column,
          "Type": row.type || "",
          "Description": row.column_description
        }));
        dataToExport[tableDesc.tableName] = transformedData;
      }
    });
  } else {
    setSnackbar({ open: true, message: "No descriptions generated to create Excel file.", severity: "warning" });
    return;
  }

  dataToExport.username = user?.username;

  try {
    const response = await axios.post(`${API_URL}/generate_excel`, dataToExport, {
      responseType: 'blob',
      credentials: 'include'
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `metadata_documentation.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error("Error generating Excel:", error);
    setSnackbar({ open: true, message: "Failed to generate Excel. Check server logs.", severity: "error" });
  }
};

  const handleUpdateDatabase = async () => {
    setUpdateLoading(true);
    
    let totalUpdates = 0;
    let totalErrors = 0;
    let errorMessages = [];

    if (mode === "Single Table") {
      const tableName = selectedTables[0];
      const selectedIds = selectionModel[tableName] || [];
      
      if (gendesc.length === 0) {
         setSnackbar({ open: true, message: "No descriptions generated to update.", severity: "warning" });
         setUpdateLoading(false);
         return;
      }
      if (selectedIds.length === 0) {
         setSnackbar({ open: true, message: "No columns selected to update.", severity: "warning" });
         setUpdateLoading(false);
         return;
      }

      const selectedComments = gendesc
        .filter(row => selectedIds.includes(row.id))
        .map(row => ({
          column: row.column,
          description: row.column_description
        }));
      
      try {
        const payload = {
          connectionInfo: connectionInfo,
          schema: selectedSchema,
          table: tableName,
          comments: selectedComments,
          username: user?.username 
        };
        const response = await axios.post(`${API_URL}/update_column_comments`, payload, { credentials: 'include' });
        if (response.data.success) {
          totalUpdates += selectedComments.length;
        } else {
          totalErrors++;
          errorMessages.push(response.data.error || `Failed to update ${tableName}`);
        }
      } catch (error) {
        totalErrors++;
        errorMessages.push(error.response?.data?.error || `Network error updating ${tableName}.`);
      }

    } else { // Bulk Table update logic
      if (bulkDescriptions.length === 0) {
         setSnackbar({ open: true, message: "No descriptions generated to update.", severity: "warning" });
         setUpdateLoading(false);
         return;
      }

      for (const tableDesc of bulkDescriptions) {
        const tableName = tableDesc.tableName;
        const selectedIds = selectionModel[tableName] || [];
        
        if (selectedIds.length === 0) {
          continue;
        }

        const selectedComments = tableDesc.description
          .filter(row => selectedIds.includes(row.id))
          .map(row => ({
            column: row.column,
            description: row.column_description
          }));
        
        if (selectedComments.length === 0) {
          continue;
        }

        try {
          const payload = {
            connectionInfo: connectionInfo,
            schema: selectedSchema,
            table: tableName,
            comments: selectedComments,
            username: user?.username 
          };
          const response = await axios.post(`${API_URL}/update_column_comments`, payload, { credentials: 'include' });
          if (response.data.success) {
            totalUpdates += selectedComments.length;
          } else {
            totalErrors++;
            errorMessages.push(response.data.error || `Failed to update ${tableName}`);
          }
        } catch (error) {
          totalErrors++;
          errorMessages.push(error.response?.data?.error || `Network error updating ${tableName}.`);
          console.error(`Error updating comments for ${tableName}:`, error);
        }
      }
    }

    if (totalErrors > 0) {
      setSnackbar({ open: true, message: `Completed with ${totalErrors} errors. ${totalUpdates} comments updated. Errors: ${errorMessages.join(', ')}`, severity: "error" });
    } else if (totalUpdates > 0) {
      setSnackbar({ open: true, message: `Successfully updated ${totalUpdates} column comments.`, severity: "success" });
      
      if (mode === "Single Table") {
        async function fetchTableComments() {
          try {
              const res = await fetch(`${API_URL}/tablecomments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  connectionInfo,
                  schema: selectedSchema,
                  table: selectedTables[0], 
                }),
                credentials: 'include'
              });
              const data = await res.json();
              if (data.success) {
                  settableComments(data.rows.map((row, index) => ({ id: index, ...row })));
                  setColumnscmt(data.columns);
              } 
          } catch (error) { console.error("Error refreshing comments:", error); }
        }
        fetchTableComments();
      }
    } else {
       setSnackbar({ open: true, message: "No changes were applied.", severity: "info" });
    }

    setUpdateLoading(false);
  };
  
  // Modal success handler
  const handleCatalogSaveSuccess = async (catalogData) => {
    setLoading(true);
    let commentsPayload = [];

    if (mode === "Single Table") {
      const tableName = selectedTables[0];
      const selectedIds = selectionModel[tableName] || [];
      if (gendesc.length === 0 || selectedIds.length === 0) {
        setSnackbar({ open: true, message: "No descriptions selected to save.", severity: "warning" });
        setLoading(false);
        return;
      }
      commentsPayload = gendesc
        .filter(row => selectedIds.includes(row.id))
        .map(row => ({
          table: tableName,
          column: row.column,
          type: row.type,
          description: row.column_description
        }));
    } else { // Bulk Tables
      if (bulkDescriptions.length === 0) {
         setSnackbar({ open: true, message: "No descriptions generated to save.", severity: "warning" });
         setLoading(false);
         return;
      }
      bulkDescriptions.forEach(tableDesc => {
        const tableName = tableDesc.tableName;
        const selectedIds = selectionModel[tableName] || [];
        if (selectedIds.length > 0) {
          const tableComments = tableDesc.description
            .filter(row => selectedIds.includes(row.id))
            .map(row => ({
              table: tableName,
              column: row.column,
              type: row.type || '',
              description: row.column_description
            }));
          commentsPayload.push(...tableComments);
        }
      });
       if (commentsPayload.length === 0) {
         setSnackbar({ open: true, message: "No columns selected to save.", severity: "warning" });
         setLoading(false);
         return;
       }
    }

    try {
      const payload = {
        connectionInfo: connectionInfo,
        appuser: user, 
        semanticdata: catalogData, 
        schema: selectedSchema,
        comments: commentsPayload, 
      };

      const response = await axios.post(
        `${API_URL}/api/semantic_catalogs/create_or_merge`,
        payload,
        { withCredentials: true }
      );

      if (response.data.success) {
        setSnackbar({ open: true, message: `Successfully saved to catalog '${response.data.catalog_name}'!`, severity: "success" });
      } else {
        throw new Error(response.data.error || "Failed to save catalog");
      }
    } catch (error) {
      console.error("Error saving semantic catalog:", error);
      setSnackbar({ open: true, message: "Error saving catalog: " + (error.response?.data?.error || error.message), severity: "error" });
    } finally {
      setLoading(false);
      setModalOpen(false);
    }
  };

  /**
   * Renders the correct set of action buttons based on the page mode.
   */
  function ThreeButtons() {
    const hasSingleDesc = gendesc.length > 0 && mode === "Single Table";
    const hasBulkDesc = bulkDescriptions.length > 0 && mode === "Bulk Tables";
    const isDisabled = !hasSingleDesc && !hasBulkDesc;
    
    const totalSelected = Object.values(selectionModel).reduce((acc, val) => acc + (val?.length || 0), 0);

    // RENDER BASED ON PAGEMODE
    if (pageMode === 'catalog') {
      return (
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Button 
            variant="contained" 
            color="primary"  
            onClick={() => setModalOpen(true)} // Open modal
            disabled={isDisabled || loading || totalSelected === 0}
          > 
            {loading ? <CircularProgress size={24} color="inherit" /> : `💾 Save ${totalSelected} Selected to Catalog`}
          </Button>
          <Button 
            variant="contained" 
            color="secondary"
            onClick={handleDownloadExcel}
            disabled={isDisabled}
          >
              📥 Download All as Excel
          </Button>
        </Box>
      );
    }

    // Default: Documentation Mode
    return (
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Button 
          variant="contained" 
          color="primary"  
          onClick={handleUpdateDatabase}
          disabled={isDisabled || updateLoading || totalSelected === 0}
        > 
          {updateLoading ? <CircularProgress size={24} color="inherit" /> : `⬆️ Update ${totalSelected} Selected Comments`}
        </Button>
        <Button 
          variant="contained" 
          color="secondary"
          onClick={handleDownloadExcel}
          disabled={isDisabled}
        >
            📥 Download All as Excel
        </Button>
        <Button 
          variant="contained" 
          color="success" 
          onClick={handleGeneratePdf}
          disabled={isDisabled}
        >
            📋 Download All as PDF
        </Button>
      </Box>
    );
  }
  

  if (!connectionInfo)
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.primary" variant="h6">
          ➡️ Please connect to a database from the sidebar to continue.
        </Typography>
      </Box>
    );

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ color: 'text.primary' }}>
        {pageMode === 'catalog' ? 'Semantic Catalog Creator' : 'Database Documentation Generator'}
      </Typography>

      {/* --- Database Selection --- */}
      <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'text.primary' }}>Database Selection</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {(connectionInfo.db_type === "PostgreSQL" || connectionInfo.db_type === "Oracle" || connectionInfo.db_type === "SQL Server" || connectionInfo.db_type === "Snowflake") && (
            <FormControl fullWidth sx={{ minWidth: 200, flexGrow: 1 }}>
                <InputLabel id="schema-select-label">Select Schema</InputLabel>
                <Select
                labelId="schema-select-label"
                value={selectedSchema}
                label="Select Schema"
                onChange={(e) => {
                  setSelectedSchema(e.target.value);
                  setSelectedTables([]); 
                  setgendesc([]); 
                  setBulkDescriptions([]);
                  setSelectAll(false);
                }}
                size="small"
                >
                {schemas.map((schema) => (
                    <MenuItem key={schema} value={schema}>
                    {schema}
                    </MenuItem>
                ))}
                </Select>
            </FormControl>
            )}

            <FormControl component="fieldset" sx={{ mt: 1 }}>
                <RadioGroup row value={mode} onChange={(e) => {
                  setMode(e.target.value);
                  setSelectAll(false);
                  setBulkDescriptions([]);
                  setgendesc([]);
                }}>
                    <FormControlLabel value="Single Table" control={<Radio size="small"/>} label="Single Table" />
                    <FormControlLabel value="Bulk Tables" control={<Radio size="small"/>} label="Bulk Tables" />
                </RadioGroup>
            </FormControl>

            {mode === "Bulk Tables" && (
                <FormControlLabel
                control={<Checkbox checked={selectAll} onChange={(e) => setSelectAll(e.target.checked)} />}
                label="Select All Tables"
                sx={{ pt: 1 }}
                />
            )}

            {mode === "Single Table" ? (
            <FormControl fullWidth sx={{ minWidth: 200, flexGrow: 1 }}>
                <InputLabel>Select Table</InputLabel>
                <Select
                value={selectedTables[0] || ""}
                label="Select Table"
                onChange={(e) => {
                    setSelectedTables([e.target.value]);
                    setgendesc([]);
                    setBulkDescriptions([]);
                }}
                size="small"
                >
                {tables.map((table) => (
                    <MenuItem key={table} value={table}>
                    {table}
                    </MenuItem>
                ))}
                </Select>
            </FormControl>
            ) : (
            <FormControl fullWidth sx={{ minWidth: 200, flexGrow: 1 }}>
                <InputLabel>Select Tables</InputLabel>
                <Select
                multiple
                value={selectedTables}
                label="Select Tables"
                onChange={(e) => {
                    const newSelection = typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value;
                    setSelectedTables(newSelection);
                    if (newSelection.length < tables.length) {
                      setSelectAll(false);
                    }
                    setgendesc([]);
                    setBulkDescriptions([]);
                }}
                size="small"
                renderValue={(selected) => selected.join(', ')}
                >
                {tables.map((table) => (
                    <MenuItem key={table} value={table}>
                       <Checkbox checked={selectedTables.indexOf(table) > -1} />
                       {table}
                    </MenuItem>
                ))}
                </Select>
            </FormControl>
            )}
        </Box>
      </Paper>
      
      {/* --- Table Info (Comments & Preview) --- */}
      {selectedTables.length > 0 && (
        <>
          {mode === "Single Table" && tableComments.length > 0 && (
              <Box mb={3} sx={{ borderRadius: 2, boxShadow: 1, bgcolor: "background.paper" }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" px={2} py={1} sx={{ borderBottom: '1px solid', borderColor: 'divider'}}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'medium', color: 'text.primary' }}>Existing Table Comments: {selectedTables[0]}</Typography>
                <Button variant="text" size="small" onClick={() => setShowComments(v => !v)}>
                    {showComments ? "Minimize" : "Expand"}
                </Button>
                </Box>
                <Collapse in={showComments}>
                    <Box sx={{ height: 250, width: '100%' }}> 
                      <DataGrid
                          rows={tableComments}
                          columns={cmtcolumns}
                          disableColumnMenu
                          disableRowSelectionOnClick
                          density="compact"
                          sx={{ border: 0, '& .MuiDataGrid-cell': { color: 'text.primary' }, '& .MuiDataGrid-columnHeaders': { color: 'text.primary' } }}
                          getRowId={(row) => row.id}
                      />
                    </Box>
                </Collapse>
              </Box>
          )}

          {selectedTables.map((table) => (
            <TablePreview
              key={table}
              connectionInfo={connectionInfo}
              connectionStatus={connectionStatus}
              schema={selectedSchema}
              table={table}
            />
          ))}
        </>
      )}

      {/* --- AI Generation Controls --- */}
       <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
        <Typography variant="h6" gutterBottom sx={{ color: 'text.primary' }}>AI Generation Configuration</Typography>
        <Box mt={1}>
          <Typography variant="subtitle1" gutterBottom sx={{ color: 'text.secondary' }}>Additional AI Instructions (optional)</Typography>
          <TextField
            fullWidth
            multiline
            rows={2}
            placeholder="Example: Keep descriptions concise and under 15 words."
            value={userExtraPrompt}
            onChange={(e) => setUserExtraPrompt(e.target.value)}
            size="small"
            sx={{ mt: 1 }}
          />
        </Box>
        
        <BusinessDocUploader onTextExtracted={setExtractedText} />
        <ERDiagramUploader onTextExtracted={setExtractedERContext} /> 
           
        <Box mt={3}>
          <Button variant="contained" color="primary" onClick={handleGenerateDescription} disabled={loading || (selectedTables.length === 0)}>
            {loading ? <CircularProgress size={24} color="inherit" /> : "✨ Generate Descriptions"}
          </Button>
        </Box>
       </Paper>

      {/* --- Generated Descriptions Area --- */}
       {(gendesc.length > 0 || bulkDescriptions.length > 0) && (
           <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
               <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                 <Typography variant="h6" gutterBottom mb={0} sx={{ color: 'text.primary' }}>Generated Descriptions</Typography>
                 {mode === "Bulk Tables" && (
                   <Box>
                     <Button
                       size="small"
                       onClick={() => {
                         const newSelection = {};
                         bulkDescriptions.forEach(desc => {
                           if (desc.description.length > 0) {
                             newSelection[desc.tableName] = desc.description.map(row => row.id);
                           }
                         });
                         setSelectionModel(newSelection);
                       }}
                     >
                       Select All
                     </Button>
                     <Button
                       size="small"
                       onClick={() => setSelectionModel({})}
                     >
                       Deselect All
                     </Button>
                   </Box>
                 )}
               </Box>
               
                {mode === "Bulk Tables" && bulkDescriptions.length > 0 && (
                bulkDescriptions.map(({ tableName, description, error }, idx) => (
                    <Box key={tableName} sx={{ mb: 3, borderRadius: 1, border: '1px solid', borderColor: 'divider', bgcolor: "background.default" }}>
                        <Typography variant="subtitle1" sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider', fontWeight: 'medium', color: 'text.primary' }}>
                            {tableName}
                            {error && <Chip label={`Error: ${error}`} color="error" size="small" sx={{ ml: 2 }}/>}
                        </Typography>
                        {description.length > 0 && (
                            <Box sx={{ height: 300, width: "100%" }}> 
                                <DataGrid
                                    rows={description}
                                    columns={gencolumns}
                                    density="compact"
                                    sx={{ 
                                      border: 0, 
                                      "& .MuiDataGrid-cell": { 
                                        whiteSpace: "normal", 
                                        wordBreak: "break-word", 
                                        lineHeight: '1.4 !important', 
                                        color: 'text.primary' 
                                      }, 
                                      '& .MuiDataGrid-columnHeaders': { color: 'text.primary' } 
                                    }}
                                    onCellEditCommit={(params) => handleBulkCellEditCommit(params, tableName)}
                                    getRowId={(row) => row.id}
                                    checkboxSelection
                                    selectionModel={selectionModel[tableName] || []}
                                    onSelectionModelChange={(newSelection) => {
                                      setSelectionModel(prev => ({
                                        ...prev,
                                        [tableName]: newSelection
                                      }));
                                    }}
                                    editMode="cell"
                                />
                            </Box>
                        )}
                    </Box>
                    ))
                )}
                
                {mode === "Single Table" && gendesc.length > 0 && (
                    <Box key={selectedTables[0]} sx={{ mb: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider', bgcolor: "background.default" }}>
                    <Box sx={{ height: 400, width: "100%" }}> 
                        <DataGrid
                        rows={gendesc}
                        columns={gencolumns}
                        onCellEditCommit={handleCellEditCommit}
                        density="compact"
                        sx={{ 
                          border: 0, 
                          "& .MuiDataGrid-cell": { 
                            whiteSpace: "normal", 
                            wordBreak: "break-word", 
                            lineHeight: '1.4 !important', 
                            color: 'text.primary' 
                          }, 
                          '& .MuiDataGrid-columnHeaders': { color: 'text.primary' } 
                        }}
                         getRowId={(row) => row.id} 
                         checkboxSelection
                         selectionModel={selectionModel[selectedTables[0]] || []}
                         onSelectionModelChange={(newSelection) => {
                           setSelectionModel({
                             [selectedTables[0]]: newSelection
                           });
                         }}
                         editMode="cell"
                        />
                    </Box>
                    </Box>
                )}
                
                {((mode === "Single Table" && gendesc.length > 0) || (mode === "Bulk Tables" && bulkDescriptions.length > 0)) && (
                    <Box mt={2}>
                        <ThreeButtons/>
                    </Box>
                )}
           </Paper>
       )}

      {/* Render the modal */}
      <SemanticCatalogModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleCatalogSaveSuccess}
        user={user}
      />
    </Box>
  );
}

/**
 * The main page component that wraps the AppBar, Sidebars, and WorkArea.
 */
export default function MetadataDocumentation() { 
  const { user, logout, globalState, updateGlobalState } = useAuth(); 
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState("");
  
  // Initialize connectionInfo from globalState or default to Snowflake with Port 443
  const [connectionInfo, setConnectionInfo] = useState(
    globalState.metaConnectionInfo || { db_type: "Snowflake", port: "443" } 
  );
  
  const [connectionStatus, setConnectionStatus] = useState(globalState.metaConnectionStatus || null);
  const [errorMessage, setErrorMessage] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  
  const location = useLocation();
  const navigate = useNavigate();

  // Persist connection state when it changes
  useEffect(() => { updateGlobalState('metaConnectionInfo', connectionInfo); }, [connectionInfo]);
  useEffect(() => { updateGlobalState('metaConnectionStatus', connectionStatus); }, [connectionStatus]);


  const handleLogout = async () => {
    await logout();
    navigate("/login");
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
        setSnackbar({ open: true, message: "Database connected successfully!", severity: "success" });
      } else {
        setConnectionStatus("error");
        setErrorMessage(data.error || "Connection failed.");
        setSnackbar({ open: true, message: data.error || "Connection failed.", severity: "error" });
      }
    } catch (err) {
      setConnectionStatus("error");
      setErrorMessage(err.message || "Connection error.");
      setSnackbar({ open: true, message: err.message || "Connection error.", severity: "error" });
    }
    setConnectLoading(false);
  };

  const handleSaveConnection = async (nickname) => {
    if (!nickname) {
      setSnackbar({ open: true, message: "Please enter a nickname to save.", severity: "warning" });
      return;
    }
     if (!connectionInfo) {
      setSnackbar({ open: true, message: "Please connect to a database first.", severity: "warning" });
      return;
    }
    setIsSaving(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/connections/save`,
        {
          nickname: nickname,
          connectionInfo: {
            ...connectionInfo,
            password: "", // Password is not saved
          },
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        setSnackbar({ open: true, message: response.data.message, severity: "success" });
      } else {
        setSnackbar({ open: true, message: response.data.error, severity: "error" });
      }
    } catch (err) {
      setSnackbar({ open: true, message: "Network error saving connection.", severity: "error" });
    }
    setIsSaving(false);
  };

  return (
    <>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {/* --- UNIFIED BRANDING --- */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <img src={Logo} alt="Analytics Hub" style={{ width: 50, height: 50, objectFit: "contain" }} />
            <Typography variant="h6" noWrap sx={{ fontWeight: 700, color: "#fff", userSelect: "none" }}>
              Data & Analytics Practice — Analytix Hub
            </Typography>
          </Box>

          {/* --- SEARCH BAR COMPONENT --- */}
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

          {/* --- USER ACTIONS --- */}
          <Tooltip title={`Role: ${user?.role || 'N/A'}`} arrow>
            <Button
              color="inherit"
              startIcon={<PersonIcon />}
              sx={{ 
                textTransform: 'none', fontWeight: 600, marginRight: 1,
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
              }}
            >
              {user?.username || 'Guest'}
            </Button>
          </Tooltip>
          
          <Tooltip title={sidebarOpen ? "Hide DB Connection" : "Show DB Connection"} arrow>
            <IconButton color="inherit" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <SettingsEthernetIcon />
            </IconButton>
          </Tooltip>

          <Button
            color="inherit"
            startIcon={<ExitToAppIcon />}
            onClick={handleLogout}
            sx={{ 
              textTransform: 'none', fontWeight: 600, borderColor: 'white',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Box 
        sx={{ 
          display: "flex", 
          mt: "64px",
          height: "calc(100vh - 64px)" 
        }}
      >
        
        <MiniSidebar currentPath={location.pathname} />
        
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 0,
            bgcolor: "background.default",
            height: "100%",
            overflow: "hidden",
          }}
        >
          <Box sx={{ height: "100%", overflowY: "auto" }}>
            <WorkArea 
              connectionInfo={connectionInfo}
              connectionStatus={connectionStatus}
              setSnackbar={setSnackbar}
              user={user} // Pass the user prop
            />
          </Box>
        </Box>

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