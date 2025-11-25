import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function NotAuthorized() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        p: 3,
        bgcolor: "background.default", // <-- UPDATED for theme
      }}
    >
      <Typography variant="h3" color="error.main" gutterBottom> {/* <-- UPDATED for theme */}
        🚫 Access Denied
      </Typography>
      <Typography variant="h6" color="text.secondary" textAlign="center" mb={3}>
        You do not have permission to view this page.
      </Typography>
      <Button variant="contained" color="primary" onClick={() => navigate("/")}>
        Go to Dashboard
      </Button>
    </Box>
  );
}