import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// AuthProvider is no longer imported here, it's in index.js
import RequireAuth from "./components/RequireAuth";
import RequireAdmin from "./components/RequireAdmin";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import MetadataDocumentation from "./pages/MetadataDocumentation";
import UserManagement from "./pages/UserManagement";
import NotAuthorized from "./pages/NotAuthorized";
import AIChatbot from "./pages/AIChatbot";
import DataPreview from "./pages/DataPreview";
import SettingsPage from "./pages/SettingsPage"; // <-- Original SettingsPage

function App() {
  return (
    // <AuthProvider> is in index.js, where it belongs
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/not-authorized" element={<NotAuthorized />} />
        
        {/* --- FIX: /AIChatbot should also be protected --- */}
        {/* <Route path="/AIChatbot" element={<AIChatbot />} /> */}
        
        <Route element={<RequireAuth />}>
          <Route path="/preview" element={<DataPreview />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/documentation" element={<MetadataDocumentation />} />
          
          {/* --- ADDED: New Catalog Route --- */}
          {/* It points to the same component, which will render differently based on path */}
          <Route path="/catalog" element={<MetadataDocumentation />} />
          {/* --- END ADDED --- */}

          <Route path="/AIChatbot" element={<AIChatbot />} /> {/* <-- MOVED HERE */}
          <Route path="/settings" element={<SettingsPage />} />
          
          <Route element={<RequireAdmin />}>
            <Route path="/users" element={<UserManagement />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;