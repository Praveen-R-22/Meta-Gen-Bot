import React, { useState, useEffect } from "react";
import {
  Modal,
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Paper,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import axios from "axios";

// Get API URL from environment
const API_URL = window.env.API_URL;

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '95%', md: 900 },
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
};

export default function SemanticCatalogModal({ open, onClose, onSuccess, user }) {
  const [newCatalogName, setNewCatalogName] = useState("");
  const [catalogs, setCatalogs] = useState([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchCatalogs = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_URL}/api/semantic_catalogs`, {
        withCredentials: true,
      });

      const payload = res?.data?.catalogs ?? res?.data?.catalog ?? (Array.isArray(res?.data) ? res.data : []);
      const rows = (payload || []).map((c, idx) => ({
        id: String(c.id ?? c.catalog_id ?? idx),
        name: c.catalog_name ?? c.name ?? c.semantic_catalog_name ?? `Catalog ${idx}`,
        table_count: c.table_count ?? 0,
        // (Other fields can be added to the grid as needed)
      }));
      
      setCatalogs(rows);
      if (rows.length > 0) {
        // Auto-select the first catalog by default
        setSelectedCatalogId(rows[0].id);
      } else {
        setSelectedCatalogId(null);
      }

    } catch (err) {
      console.error("Failed to fetch catalogs:", err);
      setError("Failed to load existing catalogs. " + (err.response?.data?.error || err.message));
      setCatalogs([]);
      setSelectedCatalogId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCatalogs();
      setNewCatalogName(""); // Clear name field on open
      setError("");
    }
  }, [open, user]); // Re-fetch when opened or user changes

  const handleCreateOrMerge = async () => {
    const isCreatingNew = newCatalogName.trim() !== "";
    const isMerging = !isCreatingNew && selectedCatalogId;

    if (!isCreatingNew && !isMerging) {
      setError("Please enter a new catalog name OR select an existing catalog to merge into.");
      return;
    }

    const payload = {
      newCatalogName: isCreatingNew ? newCatalogName.trim() : null,
      existingCatalogId: isMerging ? selectedCatalogId : null,
    };
    
    // Pass this data structure back to the parent
    onSuccess(payload);
    onClose();
  };

  const columns = [
    { field: "id", headerName: "ID", width: 100 },
    { field: "name", headerName: "Catalog Name", flex: 1, minWidth: 300 },
    { field: "table_count", headerName: "Table Count", width: 150, align: 'right', headerAlign: 'right' },
  ];

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <Typography variant="h6" gutterBottom color="text.primary">
          Create or Merge Semantic Catalog
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          label="New Catalog Name (to create new)"
          fullWidth
          value={newCatalogName}
          onChange={(e) => {
            setNewCatalogName(e.target.value);
            if (e.target.value) {
              setSelectedCatalogId(null); // Deselect existing if typing a new name
            }
          }}
          sx={{ mb: 2 }}
        />

        <Typography variant="subtitle1" sx={{ mb: 1, color: 'text.secondary' }}>
          Or select existing catalog (to merge)
        </Typography>

        <Paper sx={{ height: 360, width: '100%', mb: 2 }}>
          <DataGrid
            rows={catalogs}
            columns={columns}
            loading={loading}
            pageSizeOptions={[5, 10]}
            initialState={{ pagination: { paginationModel: { pageSize: 5 }}}}
            selectionModel={selectedCatalogId ? [selectedCatalogId] : []}
            onSelectionModelChange={(newSelection) => {
              const newId = newSelection.length > 0 ? String(newSelection[0]) : null;
              setSelectedCatalogId(newId);
              if (newId) {
                setNewCatalogName(""); // Clear new name if selecting existing
              }
            }}
            hideFooterSelectedRowCount
          />
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 'auto' }}>
          <Button variant="outlined" color="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateOrMerge}
            disabled={loading}
          >
            {newCatalogName ? "Create and Save" : "Merge and Save"}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}