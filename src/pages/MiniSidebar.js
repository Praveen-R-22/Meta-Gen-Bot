import React from "react";
import { Box, Tooltip, IconButton } from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Storage as StorageIcon,
  SmartToy as SmartToyIcon,
  Preview as PreviewIcon,
  Settings as SettingsIcon,
  Group as GroupIcon,
  Category as CategoryIcon, // Import the new icon
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const miniWidth = 56;

export default function MiniSidebar({ currentPath }) {
  const navigate = useNavigate();

  // Menu items with icons & routes
  const menuItems = [
    { icon: <DashboardIcon />, label: "Dashboard", path: "/" },
    { icon: <StorageIcon />, label: "Documentation", path: "/documentation" },
    // Add the new Semantic Catalog link
    { icon: <CategoryIcon />, label: "Semantic Catalog", path: "/catalog" },
    { icon: <SmartToyIcon />, label: "AI Assistants", path: "/AIChatbot" },
    { icon: <PreviewIcon />, label: "Data Preview", path: "/preview" },
    { icon: <SettingsIcon />, label: "Settings", path: "/settings" },
    { icon: <GroupIcon />, label: "User Management", path: "/users" },
  ];

  return (
    <Box
      sx={{
        width: miniWidth,
        bgcolor: "#00475b", // This color is from the original theme
        height: "100%", // Changed from 100vh to fill parent
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        pt: 2,
        boxShadow: "2px 0 8px rgba(0,0,0,0.15)",
      }}
    >
      {menuItems.map(({ icon, label, path }) => (
        <Tooltip title={label} placement="right" key={label} arrow>
          <IconButton
            color={currentPath === path ? "primary" : "default"}
            onClick={() => navigate(path)}
            size="large"
            sx={{
              mb: 1.5,
              bgcolor: currentPath === path ? "#009CDE" : "transparent",
              "&:hover": {
                bgcolor: "#007aba",
                color: "#fff",
              },
              color: currentPath === path ? "#fff" : "#cfd8dc",
              borderRadius: 2,
            }}
          >
            {icon}
          </IconButton>
        </Tooltip>
      ))}
    </Box>
  );
}