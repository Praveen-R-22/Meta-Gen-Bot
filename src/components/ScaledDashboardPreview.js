import React from "react";
import DynamicDashboard from "../components/DynamicDashboard";
import { Box } from '@mui/material';

export default function ScaledDashboardPreview({ item }) {

  const scale = 0.62;
  const width = "160%"; // (1 / scale)
  const height = "160%"; // (1 / scale)

  return (
    <Box sx={{
      width: "100%",
      height: "100%",
      overflow: "hidden",
      position: "relative",
      bgcolor: 'background.default', // Theme-aware background
      borderRadius: 1,
    }}>
      <Box
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: width,
          height: height,
          pointerEvents: "none", // Prevents interaction with the scaled-down version
        }}
      >
        <DynamicDashboard
          dashboardData={item.dashboardData}
          rawData={item.rawData}
          question={item.question}
        />
      </Box>
    </Box>
  );
}