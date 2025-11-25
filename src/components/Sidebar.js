import React, { useState, useEffect } from "react";
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import {
  ChevronLeft as ChevronLeftIcon,
  Menu as MenuIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Save as SaveIcon,
} from "@mui/icons-material";

const drawerWidth = 320;

export default function Sidebar({
  open,
  onToggle,
  onConnect,
  connectionStatus,
  errorMessage,
  loading,
  connectionInfo,
  onConnectionInfoChange,
  onSaveConnection,
  isSaving,
}) {
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    setNickname(connectionInfo?.nickname || "");
  }, [connectionInfo?.nickname]);

  const handleFieldChange = (field, value) => {
    if (field === "db_type") {
      const defaultPorts = {
        MySQL: "3306",
        PostgreSQL: "5432",
        Oracle: "1521",
        "SQL Server": "1433",
        Snowflake: "443",
      };
      onConnectionInfoChange("port", defaultPorts[value] || "");
    }
    onConnectionInfoChange(field, value);
  };

  const handleConnectClick = () => {
    onConnect(connectionInfo);
  };

  const handleSaveClick = () => {
    if (!nickname) {
      onSaveConnection(null);
      return;
    }
    onSaveConnection(nickname);
  };

  return (
    <Drawer
      variant="permanent"
      anchor="right"
      open={open}
      sx={{
        width: open ? drawerWidth : 56,
        flexShrink: 0,
        whiteSpace: "nowrap",
        boxSizing: "border-box",
        "& .MuiDrawer-paper": {
          width: open ? drawerWidth : 56,
          transition: "width 0.3s",
          overflowX: "hidden",
          p: open ? 3 : 1,
          bgcolor: "#00475b",
          color: "#fff",
          overflowY: open ? "auto" : "hidden",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: open ? "space-between" : "center",
          mb: 2,
        }}
      >
        {open && (
          <Typography variant="h6" noWrap>
            🔑 DB Connection
          </Typography>
        )}

        <Tooltip
          title={open ? "Collapse Sidebar" : "Expand Connection Sidebar"}
          placement="left"
        >
          <IconButton
            onClick={onToggle}
            size="small"
            aria-label="Toggle sidebar"
            sx={{ color: "#fff" }}
          >
            {open ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {open ? (
        <>
          <FormControl
            fullWidth
            margin="normal"
            size="small"
            sx={{ color: "#fff" }}
          >
            <InputLabel id="dbtype-label" sx={{ color: "#fff" }}>
              Choose Database
            </InputLabel>
            <Select
              labelId="dbtype-label"
              value={connectionInfo?.db_type || "Snowflake"}
              label="Choose Database"
              onChange={(e) => handleFieldChange("db_type", e.target.value)}
              sx={{ color: "#fff" }}
            >
              <MenuItem value="MySQL">MySQL</MenuItem>
              <MenuItem value="PostgreSQL">PostgreSQL</MenuItem>
              <MenuItem value="Oracle">Oracle</MenuItem>
              <MenuItem value="SQL Server">SQL Server</MenuItem>
              <MenuItem value="Snowflake">Snowflake</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Host"
            fullWidth
            margin="normal"
            size="small"
            value={connectionInfo?.host || ""}
            onChange={(e) => handleFieldChange("host", e.target.value)}
            InputLabelProps={{ sx: { color: "#fff" } }}
            sx={{ input: { color: "#fff" } }}
          />
          <TextField
            label="Port"
            fullWidth
            margin="normal"
            size="small"
            value={connectionInfo?.port || ""}
            onChange={(e) => handleFieldChange("port", e.target.value)}
            InputLabelProps={{ sx: { color: "#fff" } }}
            sx={{ input: { color: "#fff" } }}
          />
          <TextField
            label="Database / Service Name"
            fullWidth
            margin="normal"
            size="small"
            value={connectionInfo?.dbname || ""}
            onChange={(e) => handleFieldChange("dbname", e.target.value)}
            InputLabelProps={{ sx: { color: "#fff" } }}
            sx={{ input: { color: "#fff" } }}
          />
          <TextField
            label="User"
            fullWidth
            margin="normal"
            size="small"
            value={connectionInfo?.user || ""}
            onChange={(e) => handleFieldChange("user", e.target.value)}
            InputLabelProps={{ sx: { color: "#fff" } }}
            sx={{ input: { color: "#fff" } }}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            size="small"
            value={connectionInfo?.password || ""}
            onChange={(e) => handleFieldChange("password", e.target.value)}
            InputLabelProps={{ sx: { color: "#fff" } }}
            sx={{ input: { color: "#fff" } }}
          />

          <Button
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2, borderRadius: 6, textTransform: "none" }}
            onClick={handleConnectClick}
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "🚀 Connect to Database"
            )}
          </Button>

          {connectionStatus === "success" && (
            <Box display="flex" alignItems="center" mt={2} color="success.main">
              <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography>Connection active!</Typography>
            </Box>
          )}
          {connectionStatus === "error" && (
            <Box display="flex" alignItems="center" mt={2} color="error.main">
              <ErrorIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography>{errorMessage}</Typography>
            </Box>
          )}

          <Box sx={{ borderTop: "1px solid #005670", mt: 3, pt: 2 }}>
            <Typography variant="h6" color="#fff" noWrap sx={{ mb: 1 }}>
              Save Connection
            </Typography>
            <TextField
              label="Connection Nickname"
              fullWidth
              margin="Normal"
              size="small"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              InputLabelProps={{ sx: { color: "#fff" } }}
              sx={{ input: { color: "#fff" }, mt: 1 }}
              helperText="Password will not be saved."
              FormHelperTextProps={{ sx: { color: "#b0bec5" } }}
            />
            <div>

            </div>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              sx={{ borderRadius: 6, textTransform: "none", mt: 1 }} // <-- Kept as mt: 1
              onClick={handleSaveClick}
              disabled={isSaving || !nickname.trim()}
              startIcon={
                isSaving ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <SaveIcon />
                )
              }
            >
              {isSaving ? "Saving..." : "Save / Update"}
            </Button>
          </Box>
        </>
      ) : (
        <Tooltip title="Expand sidebar">
          <Box sx={{ width: 56, height: "80%" }} />
        </Tooltip>
      )}
    </Drawer>
  );
}