import React, { useEffect, useState, Fragment } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  Box,
  Typography,
  Button,
  Stack,
  AppBar,
  Toolbar,
  IconButton,
  CssBaseline,
  Tooltip,
  Grid,
  Paper,
  Avatar,
  Divider,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  TextField,
  InputAdornment,
  Skeleton,
} from "@mui/material";

import {
  Person as PersonIcon,
  ExitToApp as ExitToAppIcon,
  Login as LoginIcon,
  Timer as TimerIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  PushPin as PushPinIcon,
  Close as CloseIcon,
  Dashboard as DashboardIcon,
  Search as SearchIcon,
  FileDownload as FileDownloadIcon,
  WrongLocation as UnpinIcon,
  CalendarToday as CalendarTodayIcon,
  TableView as ExcelIcon,
} from "@mui/icons-material";

import { useNavigate, useLocation } from "react-router-dom";
import MiniSidebar from "./MiniSidebar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import ScaledDashboardPreview from "../components/ScaledDashboardPreview";
import DynamicDashboard from "../components/DynamicDashboard";
import ChatWithTableComponent from "../components/ChatWithTableComponent"; 
import Logo from "../assets/analytics_hub_logo.png"; 
import { formatNumber } from "../utils/formatNumber"; 

const API_URL = window.env.API_URL;
const UNIFIED_CARD_HEIGHT = 180; 

function StatCard({ title, value, icon, loading }) {
  return (
    <Paper elevation={3} sx={{ p: 2, display: "flex", alignItems: "center", gap: 2, borderRadius: 2, bgcolor: "background.paper", height: "100%", boxShadow: 2 }}>
      <Avatar sx={{ bgcolor: "primary.main", color: "white", width: 52, height: 52 }}>{icon}</Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" noWrap>{title}</Typography>
        {loading ? <Box sx={{ mt: 1 }}><Skeleton width="60%" height={28} /></Box> : <Typography variant="h6" fontWeight={700} sx={{ mt: 0.5 }}>{typeof value === 'number' && formatNumber ? formatNumber(value) : value}</Typography>}
      </Box>
    </Paper>
  );
}

function SectionHeader({ icon, title, actionLabel, onAction }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {icon}<Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>{title}</Typography>
      </Box>
      {actionLabel && <Button variant="outlined" size="small" onClick={onAction} sx={{ textTransform: "none", borderRadius: 2 }}>{actionLabel}</Button>}
    </Box>
  );
}

const truncateText = (text, length) => {
  if (!text) return "Pending...";
  const plainText = text.replace(/(\*|_|`|#|\||:-|\[|\]|\(|\))/g, "");
  return plainText.length <= length ? plainText : plainText.substring(0, length) + "...";
};

export default function Dashboard() {
  const { user, logout, pinnedItems, pinnedDashboards, setPinnedItems, setPinnedDashboards, globalState, updateGlobalState } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [kpis, setKpis] = useState(globalState.dashboardKpis || null);
  const [loadingKpis, setLoadingKpis] = useState(!globalState.dashboardKpis);

  const [selectedPin, setSelectedPin] = useState(null);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [dashboardModalOpen, setDashboardModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (globalState.dashboardKpis) {
        setLoadingKpis(false);
        return;
    }

    let cancelled = false;
    const fetchKpis = async () => {
      if (!user) return;
      setLoadingKpis(true);
      try {
        const res = await fetch(`${API_URL}/api/user/dashboard_kpis`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        const data = await res.json();
        if (!cancelled) {
          if (data.success) {
              setKpis(data.kpis);
              updateGlobalState('dashboardKpis', data.kpis);
          } else {
              setKpis(null);
          }
        }
      } catch (err) {
        console.error("Failed to load KPIs:", err);
        if (!cancelled) setKpis(null);
      } finally {
        if (!cancelled) setLoadingKpis(false);
      }
    };
    fetchKpis();
    return () => { cancelled = true; };
  }, [user, updateGlobalState]); 

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user?.username }),
        credentials: "include",
      });
    } catch (err) { console.error("Error logging out on backend:", err); }
    logout();
    navigate("/login");
  };

  const formatLastLogin = (dateString) => {
    if (!dateString || dateString === "Never logged in") return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (e) { return "Invalid Date"; }
  };

  const handleUnpinDashboard = (e, itemToRemove) => {
    e.stopPropagation();
    setPinnedDashboards((prev) => prev.filter((item) => item.question !== itemToRemove.question));
  };

  const handleUnpinQa = (e, itemToRemove) => {
    e.stopPropagation();
    setPinnedItems((prev) => prev.filter((item) => item.question !== itemToRemove.question));
  };

  const handleOpenPinModal = (item) => { setSelectedPin(item); setPinModalOpen(true); };
  const handleClosePinModal = () => setPinModalOpen(false);
  const handleOpenDashboardModal = (item) => { setSelectedDashboard(item); setDashboardModalOpen(true); };
  const handleCloseDashboardModal = () => setDashboardModalOpen(false);

  return (
    <Fragment>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <img src={Logo} alt="Analytics Hub" style={{ width: 50, height: 50, objectFit: "contain" }} />
            <Typography variant="h6" noWrap sx={{ fontWeight: 700, color: "#fff", userSelect: "none" }}>
              Data & Analytics Practice — Analytix Hub
            </Typography>
          </Box>

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
          
          <Button
            color="inherit"
            startIcon={<ExitToAppIcon />}
            onClick={handleLogout}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)" },
            }}
          >
            Logout
          </Button>
          
        </Toolbar>
      </AppBar>

      <Box sx={{ display: "flex", mt: "64px", height: "calc(100vh - 64px)" }}>
        <MiniSidebar currentPath={location.pathname} />
        <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, bgcolor: "background.default", height: "100%", overflow: "auto" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, mb: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: "primary.main" }}>Welcome, {user?.username || "User"}!</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Quick snapshot of your workspace and recent activity.</Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <Button variant="contained" startIcon={<FileDownloadIcon />} onClick={() => console.log("Export Summary")} sx={{ textTransform: "none", borderRadius: 2 }}>Export Summary</Button>
              <Button variant="outlined" onClick={() => navigate("/documentation")} sx={{ textTransform: "none", borderRadius: 2 }}>Documentation</Button>
            </Stack>
          </Box>

          <Box sx={{ flexGrow: 1, mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4} lg={2}><StatCard title="Total Logins" value={kpis?.TOTAL_LOGINS ?? 0} icon={<LoginIcon />} loading={loadingKpis} /></Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}><StatCard title="Minutes Active" value={kpis?.TOTAL_DURATION_MINUTES ?? 0} icon={<TimerIcon />} loading={loadingKpis} /></Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}><StatCard title="Columns Updated" value={kpis?.TOTAL_COLUMNS_UPDATED ?? 0} icon={<EditIcon />} loading={loadingKpis} /></Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}><StatCard title="PDF Downloads" value={kpis?.TOTAL_PDF_DOWNLOADS ?? 0} icon={<DownloadIcon />} loading={loadingKpis} /></Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}><StatCard title="Excel Downloads" value={kpis?.TOTAL_EXCEL_DOWNLOADS ?? 0} icon={<ExcelIcon />} loading={loadingKpis} /></Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}><StatCard title="Last Login" value={formatLastLogin(kpis?.LAST_LOGIN_TIME)} icon={<CalendarTodayIcon />} loading={loadingKpis} /></Grid>
            </Grid>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 3 }}>
            <SectionHeader icon={<DashboardIcon color="primary" />} title="Pinned Dashboards" actionLabel="Manage" onAction={() => navigate("/dashboards")} />
            {pinnedDashboards && pinnedDashboards.length > 0 ? (
              <Grid container spacing={2}>
                {pinnedDashboards.map((item, idx) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={idx}>
                    <Paper elevation={2} onClick={() => handleOpenDashboardModal(item)} sx={{ p: 1, bgcolor: "background.paper", borderRadius: 2, height: 380, cursor: "pointer", transition: "transform 0.12s, box-shadow 0.12s", "&:hover": { transform: "translateY(-4px)", boxShadow: 6 }, display: "flex", flexDirection: "column", position: "relative" }}>
                      <Tooltip title="Unpin Dashboard">
                        <IconButton size="small" onClick={(e) => handleUnpinDashboard(e, item)} sx={{ position: "absolute", top: 8, right: 8, zIndex: 10, bgcolor: "rgba(255,255,255,0.8)", "&:hover": { bgcolor: "white", color: "error.main" } }}><UnpinIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1, pr: 4 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title || truncateText(item.question, 40)}</Typography>
                      </Box>
                      <Box sx={{ flex: 1, borderRadius: 1, overflow: "hidden" }}>
                        {item.previewImageBase64 ? <img src={`data:image/png;base64,${item.previewImageBase64}`} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} /> : <Box sx={{ width: "100%", height: "100%", bgcolor: "#f4f7fb", display: "flex", alignItems: "center", justifyContent: "center" }}><ScaledDashboardPreview item={item} /></Box>}
                      </Box>
                      <Box sx={{ mt: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="caption" color="text.secondary">Updated: {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "—"}</Typography>
                        <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); handleOpenDashboardModal(item); }} sx={{ textTransform: "none" }}>Preview</Button>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            ) : <Typography variant="body2" color="text.secondary">No pinned dashboards yet.</Typography>}
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 3 }}>
            <SectionHeader icon={<PushPinIcon color="primary" />} title="Pinned Q&A" actionLabel="Manage" onAction={() => navigate("/chat")} />
            {pinnedItems && pinnedItems.length > 0 ? (
              <Grid container spacing={2}>
                {pinnedItems.map((item, idx) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={idx}>
                    <Paper elevation={1} onClick={() => handleOpenPinModal(item)} sx={{ p: 2, borderRadius: 2, height: UNIFIED_CARD_HEIGHT, cursor: "pointer", transition: "box-shadow 0.12s", "&:hover": { boxShadow: 6 }, display: "flex", flexDirection: "column", position: "relative" }}>
                      <IconButton size="small" onClick={(e) => handleUnpinQa(e, item)} sx={{ position: "absolute", top: 8, right: 8, zIndex: 10, "&:hover": { color: "error.main" } }}><UnpinIcon fontSize="small" /></IconButton>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, pr: 4, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Q: {truncateText(item.question, 80)}</Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary", flexGrow: 1, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>A: {truncateText(item.answer, 180)}</Typography>
                      <Box sx={{ mt: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="caption" color="text.secondary">{item.source || "AI"}</Typography>
                        <Button size="small" variant="text" onClick={(e) => { e.stopPropagation(); handleOpenPinModal(item); }} sx={{ textTransform: "none" }}>Open</Button>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            ) : <Typography variant="body2" color="text.secondary">No pinned Q&A.</Typography>}
          </Box>
        </Box>
      </Box>

      <Dialog open={pinModalOpen} onClose={handleClosePinModal} fullWidth maxWidth="lg" scroll="paper">
        <DialogTitle sx={{ bgcolor: "primary.main", color: "white", p: 2 }}>
          Pinned Q&A
          <IconButton onClick={handleClosePinModal} sx={{ position: "absolute", right: 12, top: 12, color: "white" }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3, bgcolor: "background.default" }}>
          {selectedPin ? (
            <>
              <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2, color: "text.primary" }}>
                Q: {selectedPin.question}
              </Typography>
              <ChatWithTableComponent 
                llmOutput={selectedPin.answer} 
                sqlJson={selectedPin.table} 
                defaultPageSize={5} 
              />
            </>
          ) : (
            <Skeleton />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClosePinModal} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dashboardModalOpen} onClose={handleCloseDashboardModal} fullWidth maxWidth="lg" scroll="paper">
        <DialogTitle sx={{ bgcolor: "primary.main", color: "white", p: 2 }}>Pinned Dashboard <IconButton onClick={handleCloseDashboardModal} sx={{ position: "absolute", right: 12, top: 12, color: "white" }}><CloseIcon /></IconButton></DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>{selectedDashboard ? <Box sx={{ height: "75vh" }}><DynamicDashboard dashboardData={selectedDashboard.dashboardData} rawData={selectedDashboard.rawData} isLoading={false} /></Box> : <Skeleton variant="rectangular" height={420} />}</DialogContent>
        <DialogActions sx={{ p: 2 }}><Button onClick={handleCloseDashboardModal} variant="contained">Close</Button></DialogActions>
      </Dialog>
    </Fragment>
  );
}