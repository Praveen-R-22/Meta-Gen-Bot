import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios"; // Ensure axios is imported

const AuthContext = createContext();
const API_URL = window.env.API_URL;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // --- Theme Mode State ---
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem("themeMode");
    return savedMode || "light";
  });

  useEffect(() => {
    localStorage.setItem("themeMode", mode);
  }, [mode]);

  const toggleTheme = useCallback(() => {
    setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
  }, []);

  // --- Global State Cache ---
  const [globalState, setGlobalState] = useState({});

  const updateGlobalState = useCallback((key, value) => {
    setGlobalState(prev => {
      if (prev[key] === value) return prev;
      return { ...prev, [key]: value };
    });
  }, []);

  // --- Pinned Data State ---
  const [pinnedItems, setPinnedItemsState] = useState([]);
  const [pinnedDashboards, setPinnedDashboardsState] = useState([]);

  // 1. LOAD PREFERENCES FROM DB ON LOGIN
  useEffect(() => {
    async function fetchPreferences() {
      if (user && user.username) {
        try {
          // Replace this URL with your actual backend endpoint
          const response = await axios.get(`${API_URL}/api/user/preferences`, {
            withCredentials: true 
          });
          
          if (response.data.success) {
            // Assuming backend returns { pinned_items: [], pinned_dashboards: [] }
            setPinnedItemsState(response.data.preferences.pinned_items || []);
            setPinnedDashboardsState(response.data.preferences.pinned_dashboards || []);
          }
        } catch (error) {
          console.error("Failed to load pinned items from DB", error);
          // Optional: Fallback to localStorage if DB fails, or leave empty
        }
      } else {
        // Clear state on logout
        setPinnedItemsState([]);
        setPinnedDashboardsState([]);
      }
    }
    fetchPreferences();
  }, [user]);

  // 2. HELPER TO SAVE TO DB
  // We use this internal function to push updates to the backend
  const savePreferencesToBackend = async (newItems, newDashboards) => {
    if (!user) return;
    try {
      await axios.post(`${API_URL}/api/user/preferences`, {
        pinned_items: newItems,
        pinned_dashboards: newDashboards
      }, { withCredentials: true });
    } catch (error) {
      console.error("Failed to save preferences to DB", error);
    }
  };

  // 3. CUSTOM SETTERS (These replace the standard setState)
  // When a component calls setPinnedItems, we update UI immediately AND save to DB
  const setPinnedItems = useCallback((newItemsOrFunc) => {
    setPinnedItemsState((prev) => {
      // Handle functional updates (e.g., setPinnedItems(prev => [...prev, item]))
      const newItems = typeof newItemsOrFunc === 'function' 
        ? newItemsOrFunc(prev) 
        : newItemsOrFunc;
      
      // Save the *new* list alongside the *current* dashboards
      savePreferencesToBackend(newItems, pinnedDashboards);
      return newItems;
    });
  }, [user, pinnedDashboards]); // dependency on pinnedDashboards is needed to save complete state

  const setPinnedDashboards = useCallback((newDashboardsOrFunc) => {
    setPinnedDashboardsState((prev) => {
      const newDashboards = typeof newDashboardsOrFunc === 'function' 
        ? newDashboardsOrFunc(prev) 
        : newDashboardsOrFunc;

      // Save the *current* items alongside the *new* dashboards
      savePreferencesToBackend(pinnedItems, newDashboards);
      return newDashboards;
    });
  }, [user, pinnedItems]);


  const login = useCallback((userData) => setUser(userData), []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_URL}/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user?.username }),
        credentials: 'include'
      });
    } catch (err) {
      console.error("Error logging out on backend:", err);
    }
    setUser(null);
    setGlobalState({});
    setPinnedItemsState([]);
    setPinnedDashboardsState([]);
  }, [user]);

  const value = useMemo(() => ({
    user,
    login,
    logout,
    pinnedItems,
    setPinnedItems,       // Exposing our custom wrapper
    pinnedDashboards,
    setPinnedDashboards,  // Exposing our custom wrapper
    mode,
    toggleTheme,
    globalState,
    updateGlobalState
  }), [
    user,
    login,
    logout,
    pinnedItems,
    setPinnedItems,
    pinnedDashboards,
    setPinnedDashboards,
    mode,
    toggleTheme,
    globalState,
    updateGlobalState
  ]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);