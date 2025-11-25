import React, { useState, useRef } from "react";
import Logo from "../assets/analytics_hub_logo_with_text.png"; 
import Logo2 from "../assets/analytics_hub_logo.png";
import {
  AppBar,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Snackbar,
  Toolbar,
  Typography,
  TextField,
  Alert,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const API_URL = window.env.API_URL;

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  const usernameRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!username || !password) {
      setErrorMsg("Please enter both username and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });

      const data = await res.json();

      if (data?.success) {
        login({ username: data.username, role: data.role });
        setSuccessMsg("Login successful — redirecting...");
        setTimeout(() => navigate("/"), 600);
      } else {
        setErrorMsg(data?.message || data?.error || "Invalid username or password.");
      }
    } catch (err) {
      setErrorMsg("Network error — please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordToggle = () => setShowPassword((s) => !s);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <img src={Logo2} alt="Analytics Hub Logo2" style={{ width: 60, height: 60, objectFit: "contain" }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Link href="#" color="inherit" underline="none" sx={{ fontSize: 14 }}>Help</Link>
            <Link href="#" color="inherit" underline="none" sx={{ fontSize: 14 }}>Contact</Link>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Hero / Background */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          bgcolor: 'background.default',
          background: `linear-gradient(180deg, ${theme.palette.primary.main}0F 0%, ${theme.palette.primary.dark}05 100%)`,
        }}
      >
        <Grid container justifyContent="center" alignItems="center">
            <Grid item xs={12} sm={10} md={6} lg={4}>
              <Paper elevation={6} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3 }} component="form" onSubmit={handleSubmit}>
                
                {/* Centered Logo at the top */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                  <img 
                    src={Logo} 
                    alt="Analytics Hub Logo" 
                    style={{ 
                      width: 150, 
                      height: 40, 
                      objectFit: "fill",
                      color:"black" 
                    }} 
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <LockOutlinedIcon sx={{ color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Sign in</Typography>
                    <Typography variant="body2" color="text.secondary">Enter your credentials to continue</Typography>
                  </Box>
                </Box>

                <TextField
                  inputRef={usernameRef}
                  autoFocus
                  required
                  fullWidth
                  id="username"
                  label="Username"
                  margin="normal"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />

                <TextField
                  required
                  fullWidth
                  id="password"
                  label="Password"
                  margin="normal"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          onClick={handlePasswordToggle}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                  <FormControlLabel
                    control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} color="primary" />}
                    label="Remember me"
                  />
                  <Link href="#" underline="hover" sx={{ fontSize: 14 }}>Forgot password?</Link>
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{ 
                    mt: 2, 
                    py: 1.2, 
                    borderRadius: 2, 
                    textTransform: 'none', 
                    bgcolor: 'primary.main', 
                    '&:hover': { bgcolor: 'primary.dark' } 
                  }}
                >
                  {loading ? <CircularProgress size={20} thickness={5} color="inherit" /> : 'Login'}
                </Button>

                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">By signing in you agree to our <Link href="#">Terms</Link> and <Link href="#">Privacy</Link>.</Typography>
                </Box>
              </Paper>

              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Need an account? <Link href="#">Request access</Link></Typography>
              </Box>
            </Grid>
          </Grid>
      </Box>

      <Box component="footer" sx={{ bgcolor: 'primary.main', color: '#fff', py: 1.5, textAlign: 'center' }}>
        <Typography variant="body2">© {new Date().getFullYear()} Data and Analytics Practice – Analytics Hub. All Rights Reserved.</Typography>
      </Box>

      <Snackbar open={!!errorMsg} autoHideDuration={6000} onClose={() => setErrorMsg("")} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setErrorMsg("")} severity="error" sx={{ width: '100%' }}>{errorMsg}</Alert>
      </Snackbar>
      <Snackbar open={!!successMsg} autoHideDuration={3000} onClose={() => setSuccessMsg("")} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSuccessMsg("")} severity="success" sx={{ width: '100%' }}>{successMsg}</Alert>
      </Snackbar>
    </Box>
  );
}