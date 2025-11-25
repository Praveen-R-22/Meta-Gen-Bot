import "regenerator-runtime/runtime";
import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  List,
  ListItem,
  CircularProgress,
  Divider,
  Avatar,
  Chip,
  Snackbar,
  Alert,
  Tooltip,
  Button,
  Stack,
  CssBaseline,
  AppBar,
  Toolbar,
  InputAdornment
} from "@mui/material";
import {
  ViewModule,
  Dashboard,
  Forum,
  Storage,
  ExitToApp as ExitToAppIcon,
  Person as PersonIcon,
  SettingsEthernet as SettingsEthernetIcon,
  ThumbUp,
  ThumbDown,
  ThumbUpOutlined,
  ThumbDownOutlined,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  PushPin as PushPinIcon,
  PushPinOutlined as PushPinOutlinedIcon,
  Delete as DeleteIcon,
  Storage as StorageIcon,
  Chat as ChatIcon,
  AddLink as AddLinkIcon,
  StopCircle as StopCircleIcon,
  ArrowDownward as ArrowDownwardIcon,
  Search as SearchIcon,  
} from "@mui/icons-material";
import SendIcon from "@mui/icons-material/Send";
import { useNavigate, useLocation } from "react-router-dom";
import MiniSidebar from "./MiniSidebar";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";
import DynamicDashboard from "../components/DynamicDashboard";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import axios from "axios";
import ChatWithTableComponent from "../components/ChatWithTableComponent";
import Logo from "../assets/analytics_hub_logo.png"; 

const API_URL = window.env.API_URL;

const truncateText = (text, length) => {
  if (!text) return "Pending...";
  const plainText = text.replace(/(\*|_|`|#|\||:-|\[|\]|\(|\))/g, "");
  if (plainText.length <= length) return plainText;
  return plainText.substring(0, length) + "...";
};

const SuggestionChips = ({ suggestions, onSuggestionClick, loading }) => {
  const defaultSuggestions = [
    "What is Snowflake?",
    "Explain data warehousing",
    "What is a primary key vs foreign key?",
  ];

  if (loading) {
      return (
          <Box sx={{ display: "flex", alignItems: 'center', py: 1, mt: 1 }}>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              <Typography variant="caption" color="text.secondary">Generating suggestions...</Typography>
          </Box>
      )
  }

  const suggestionsToShow = suggestions && suggestions.length > 0 ? suggestions : defaultSuggestions;

  return (
    <Box
      sx={{
        display: "flex",
        overflowX: "auto",
        py: 1,
        mt: 1,
        "&::-webkit-scrollbar": { height: "8px" },
        "&::-webkit-scrollbar-track": { background: "#f1f1f1", borderRadius: "4px" },
        "&::-webkit-scrollbar-thumb": { background: "#ccc", borderRadius: "4px" },
        "&::-webkit-scrollbar-thumb:hover": { background: "#aaa" },
      }}
    >
      {suggestionsToShow.map((q) => (
        <Chip
          key={q}
          label={q}
          onClick={() => onSuggestionClick(q)}
          sx={{
            mr: 1,
            flexShrink: 0,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            "&:hover": {
              bgcolor: "action.hover",
              cursor: "pointer",
            },
            color: "text.primary"
          }}
        />
      ))}
    </Box>
  );
};

const LayoutControlButtons = ({ layoutMode, setLayoutMode, sidebarOpen, setSidebarOpen, dashboardData, isDashboardLoading, setUserLayoutChange }) => (
  <Box
    sx={{
      position: 'fixed',
      bottom: 80,
      right: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      zIndex: 9999,
      bgcolor: 'background.paper',
      borderRadius: 2,
      p: 1,
      boxShadow: 3,
      border: '1px solid',
      borderColor: 'divider',
    }}
  >
    <Tooltip title={!dashboardData && !isDashboardLoading ? "No dashboard available" : "Show Dashboard Only"} arrow placement="left">
      <IconButton
        onClick={() => {
          setUserLayoutChange(true);
          setLayoutMode('dashboardOnly');
        }}
        disabled={!dashboardData && !isDashboardLoading}
        color={layoutMode === 'dashboardOnly' ? 'primary' : 'default'}
        size="small"
        sx={{
          bgcolor: layoutMode === 'dashboardOnly' ? 'action.selected' : 'transparent',
          '&:hover': { bgcolor: 'action.hover' },
          '&:disabled': { opacity: 0.5 }
        }}
      >
        <Dashboard />
      </IconButton>
    </Tooltip>
    
    <Tooltip title={!dashboardData && !isDashboardLoading ? "No dashboard available for split view" : "Split View (50/50)"} arrow placement="left">
      <IconButton
        onClick={() => {
          setUserLayoutChange(true);
          setLayoutMode('split');
        }}
        disabled={!dashboardData && !isDashboardLoading}
        color={layoutMode === 'split' ? 'primary' : 'default'}
        size="small"
        sx={{
          bgcolor: layoutMode === 'split' ? 'action.selected' : 'transparent',
          '&:hover': { bgcolor: 'action.hover' },
          '&:disabled': { opacity: 0.5 }
        }}
      >
        <ViewModule />
      </IconButton>
    </Tooltip>
    
    <Tooltip title="Show Chat Only" arrow placement="left">
      <IconButton
        onClick={() => {
          setUserLayoutChange(true);
          setLayoutMode('chatOnly');
        }}
        color={layoutMode === 'chatOnly' ? 'primary' : 'default'}
        size="small"
        sx={{
          bgcolor: layoutMode === 'chatOnly' ? 'action.selected' : 'transparent',
          '&:hover': { bgcolor: 'action.hover' }
        }}
      >
        <Forum />
      </IconButton>
    </Tooltip>

    <Tooltip title={sidebarOpen ? "Hide Connection Panel" : "Show Connection Panel"} arrow placement="left">
      <IconButton
        onClick={() => setSidebarOpen(!sidebarOpen)}
        color={sidebarOpen ? 'primary' : 'default'}
        size="small"
        sx={{
          bgcolor: sidebarOpen ? 'action.selected' : 'transparent',
          '&:hover': { bgcolor: 'action.hover' }
        }}
      >
        <Storage />
      </IconButton>
    </Tooltip>
  </Box>
);

export default function AIChatbot() {
  const {
    user,
    logout,
    pinnedItems,
    setPinnedItems,
    pinnedDashboards, 
    setPinnedDashboards, 
    globalState,      
    updateGlobalState 
  } = useAuth();

  const welcomeMessageTemplate = {
    sender: "ai",
    text: "Hello! How can I help you today?",
    type: "welcome_actions",
  };

  const [messages, setMessages] = useState(globalState.chatMessages || [welcomeMessageTemplate]);
  const [qaHistory, setQaHistory] = useState(globalState.qaHistory || []);
  const [search, setSearch] = useState("");
  
  const [connectionInfo, setConnectionInfo] = useState(
    globalState.metaConnectionInfo || { db_type: "Snowflake", port: "443" }
  );
  const [connectionStatus, setConnectionStatus] = useState(globalState.metaConnectionStatus || null);
  const [dashboardData, setDashboardData] = useState(globalState.dashboardData || null);
  const [rawData, setRawData] = useState(globalState.rawData || null);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false); 
  const [abortController, setAbortController] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const [pinSnackbar, setPinSnackbar] = useState({ open: false, message: "" });
  const [layoutMode, setLayoutMode] = useState('chatOnly');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const [savedConnections, setSavedConnections] = useState([]);
  const [dynamicSuggestions, setDynamicSuggestions] = useState([]);
  
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  
  const [catalogs, setCatalogs] = useState([]);
  const [welcomeCatalogs, setWelcomeCatalogs] = useState([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState(null);
  const [userLayoutChange, setUserLayoutChange] = useState(false);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  useEffect(() => { updateGlobalState('chatMessages', messages); }, [messages]);
  useEffect(() => { updateGlobalState('qaHistory', qaHistory); }, [qaHistory]);
  useEffect(() => { updateGlobalState('metaConnectionInfo', connectionInfo); }, [connectionInfo]);
  useEffect(() => { updateGlobalState('metaConnectionStatus', connectionStatus); }, [connectionStatus]);
  useEffect(() => { updateGlobalState('dashboardData', dashboardData); }, [dashboardData]);
  useEffect(() => { updateGlobalState('rawData', rawData); }, [rawData]);

  useEffect(() => {
    setInput(transcript);
  }, [transcript]);

  useEffect(() => {
    if (connectionStatus === "success") {
      setSidebarOpen(false);
    }
  }, [connectionStatus]);

  useEffect(() => {
    if (dashboardData && layoutMode === 'chatOnly' && !userLayoutChange) {
      setLayoutMode('split');
    }
  }, [dashboardData, layoutMode, userLayoutChange]);

  useEffect(() => {
    if (!dashboardData) {
      setUserLayoutChange(false);
    }
  }, [dashboardData]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    async function fetchInitialData() {
      if (!user) return;
      
      const hasCachedHistory = globalState.chatMessages && globalState.chatMessages.length > 0;

      try {
        const userId = user.username;
        
        const requests = [
            axios.get(`${API_URL}/api/connections/list`, { withCredentials: true }),
            axios.get(`${API_URL}/api/semantic_catalogs`, { withCredentials: true })
        ];

        if (!hasCachedHistory) {
            requests.push(axios.get(`${API_URL}/api/chat/history?userId=${userId}`, { withCredentials: true }));
        }

        const results = await Promise.all(requests);
        const connectionsResponse = results[0];
        const catalogsResponse = results[1];
        const historyResponse = hasCachedHistory ? null : results[2];

        if (historyResponse && historyResponse.data) {
            let initialMessages = [];
            if (historyResponse.data.messages && historyResponse.data.messages.length > 0) {
                initialMessages = historyResponse.data.messages;
            }
            
            if (initialMessages.length === 0 || initialMessages[initialMessages.length - 1].type !== 'welcome_actions') {
               initialMessages.push(welcomeMessageTemplate);
            }
            setMessages(initialMessages);

            if (historyResponse.data.qaHistory && historyResponse.data.qaHistory.length > 0) {
                setQaHistory(
                    historyResponse.data.qaHistory.map((qa) => ({
                    ...qa,
                    is_helpful: qa.is_helpful === undefined ? null : qa.is_helpful,
                    }))
                );
            }
        } else if (hasCachedHistory) {
             setMessages(prev => {
                 if (prev.length === 0 || prev[prev.length - 1].type !== 'welcome_actions') {
                     return [...prev, welcomeMessageTemplate];
                 }
                 return prev;
             });
        }

        if (connectionsResponse.data.success) {
          setSavedConnections(connectionsResponse.data.connections);
        }

        const payload = catalogsResponse?.data?.catalogs ?? catalogsResponse?.data?.catalog ?? [];
        const rows = (payload || []).map((c, idx) => ({
          id: String(c.id ?? c.catalog_id ?? idx),
          name: c.catalog_name ?? c.name ?? c.semantic_catalog_name ?? `Catalog ${idx}`,
          raw: c,
        }));
        setCatalogs(rows);
        setWelcomeCatalogs(rows.slice(0, 5));

      } catch (err) {
        console.error("Failed to fetch initial data", err);
        setSnackbar({
          open: true,
          message: "Network error loading data.",
          severity: "error",
        });
      }
    }

    fetchInitialData();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const fetchDynamicSuggestions = async (connInfo) => {
    setSuggestionsLoading(true);
    try {
      setDynamicSuggestions([]);
      const response = await axios.post(
        `${API_URL}/api/chat/generate_suggestions`,
        { connectionInfo: connInfo },
        { withCredentials: true }
      );
      if (response.data.success) {
        setDynamicSuggestions(response.data.suggestions);
        if (response.data.suggestions.length > 0) {
          setMessages((prev) => [
            ...prev,
            {
              sender: "ai",
              text: "Here are some suggestions based on your database:",
              type: "suggestion_actions",
              suggestions: response.data.suggestions,
            },
          ]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch suggestions:", err);
    } finally {
        setSuggestionsLoading(false);
    }
  };

  const handleConnectionInfoChange = (field, value) => {
    setConnectionInfo((prev) => ({
      ...(prev || {}),
      [field]: value,
    }));
  };

  const handleConnect = async (connInfoToTest) => {
    setLoading(true);
    setConnectionStatus(null);
    setErrorMessage("");
    setDashboardData(null);
    setRawData(null);
    setSelectedCatalogId(null);
    
    try {
      const response = await fetch(`${API_URL}/connect_database`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(connInfoToTest),
        credentials: "include",
      });
      const data = await response.json();
      
      if (data.success) {
        setConnectionStatus("success");
        setConnectionInfo(connInfoToTest);
        setSnackbar({
          open: true,
          message: "Database connected successfully!",
          severity: "success",
        });
        await fetchDynamicSuggestions(connInfoToTest);
      } else {
        setConnectionStatus("error");
        setErrorMessage(data.error || "Connection failed.");
        setSnackbar({
          open: true,
          message: data.error || "Connection failed.",
          severity: "error",
        });
      }
    } catch (err) {
      setConnectionStatus("error");
      setErrorMessage(err.message || "Connection error.");
      setSnackbar({
        open: true,
        message: err.message || "Connection error.",
        severity: "error",
      });
    }
    setLoading(false);
  };

  const handleSaveConnection = async (nickname) => {
    if (!nickname || !connectionInfo) {
      setSnackbar({
        open: true,
        message: !nickname ? "Please enter a nickname to save." : "Please connect to a database first.",
        severity: "warning",
      });
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
            password: "",
          },
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        setSnackbar({
          open: true,
          message: response.data.message,
          severity: "success",
        });
        const connectionsResponse = await axios.get(`${API_URL}/api/connections/list`, {
          withCredentials: true,
        });
        if (connectionsResponse.data.success) {
          setSavedConnections(connectionsResponse.data.connections);
        }
      } else {
        setSnackbar({
          open: true,
          message: response.data.error,
          severity: "error",
        });
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Network error saving connection.",
        severity: "error",
      });
    }
    setIsSaving(false);
  };

  const handleLoadConnection = (savedConn) => {
    setConnectionInfo({
      ...savedConn.connectionInfo,
      nickname: savedConn.nickname,
      password: "",
    });
    setConnectionStatus(null);
    setErrorMessage("");
    setDynamicSuggestions([]);
    setDashboardData(null);
    setRawData(null);
    setSelectedCatalogId(null);
    setSnackbar({
      open: true,
      message: `Loaded '${savedConn.nickname}'. Enter password and connect.`,
      severity: "info",
    });
    setSidebarOpen(true);
  };

  const handleDeleteConnection = async (nickname) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/connections/delete`,
        { nickname: nickname },
        { withCredentials: true }
      );
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: response.data.message,
          severity: "success",
        });
        setSavedConnections(prev => prev.filter(conn => conn.nickname !== nickname));
      } else {
        setSnackbar({
          open: true,
          message: response.data.error,
          severity: "error",
        });
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Network error deleting connection.",
        severity: "error",
      });
    }
  };

  const saveChatHistory = async (currentMessages, currentQaHistory) => {
    if (!user || !currentMessages || !currentQaHistory) return;
    if (currentMessages.length <= 1 && currentMessages[0].type === "welcome_actions" && currentQaHistory.length === 0) return;
    
    try {
      const userId = user.username;
      await axios.post(
        `${API_URL}/api/chat/save`,
        {
          userId,
          messages: currentMessages,
          qaHistory: currentQaHistory,
        },
        { withCredentials: true }
      );
    } catch (err) {
      console.error("Failed to save chat history", err);
    }
  };

  const handleSend = async (question) => {
    if (listening) {
      SpeechRecognition.stopListening();
    }

    const newQuestionText = (question || input).trim();
    if (!newQuestionText) return;

    const newMessagesWithUser = [
      ...messages,
      { sender: "user", text: newQuestionText },
    ];
    const newQA = { question: newQuestionText, answer: "", is_helpful: null };
    const newQaHistoryWithQuestion = [...qaHistory, newQA];

    setMessages(newMessagesWithUser);
    setQaHistory(newQaHistoryWithQuestion);
    setInput("");
    resetTranscript();
    setIsLoading(true);
    setIsDashboardLoading(true);
    setDashboardData(null);
    setRawData(null);

    const controller = new AbortController();
    setAbortController(controller);

    let aiAnswer;
    let errorText;
    let receivedDashboardData = null;
    let receivedRawData = [];
    let receivedTableData = null;

    const activeConnection = connectionStatus === "success" ? connectionInfo : null;

    try {
      const response = await axios.post(
        `${API_URL}/api/chat/intelligent_query`,
        {
          prompt: newQuestionText,
          connectionInfo: activeConnection,
          catalogid: selectedCatalogId,
        },
        { 
            withCredentials: true,
            signal: controller.signal 
        }
      );

      if (response.data && response.data.reply) {
        aiAnswer = response.data.reply;
        receivedDashboardData = response.data.dashboard_data;
        
        let raw = response.data.raw_data;
        if (typeof raw === "string") raw = JSON.parse(raw);
        if (raw && !Array.isArray(raw)) raw = [raw];
        receivedRawData = raw || [];
        
        let table = response.data.table_data;
        if (table && typeof table === "string") table = JSON.parse(table);
        if (table && Array.isArray(table)) {
          receivedTableData = table;
        }
      } else {
        errorText = response.data.error || "Sorry, no response from AI.";
      }
    } catch (error) {
      if (axios.isCancel(error)) {
        errorText = "Response generation stopped by user.";
      } else {
        errorText = error.response?.data?.error || "Error communicating with AI";
      }
    } finally {
      setIsLoading(false);
      setIsDashboardLoading(false);
      setAbortController(null);

      const answerText = aiAnswer || errorText;
      
      // Store table data in the message to render properly
      const aiMessage = {
        sender: "ai",
        text: answerText,
        table: receivedTableData,
      };

      const finalMessages = [...newMessagesWithUser, aiMessage];
      
      // Update history with table data so pinning works
      const finalQaHistory = newQaHistoryWithQuestion.map((qa, index) =>
        index === newQaHistoryWithQuestion.length - 1
          ? { ...qa, answer: answerText, table: receivedTableData }
          : qa
      );

      setMessages(finalMessages);
      setQaHistory(finalQaHistory);
      setDashboardData(receivedDashboardData);
      setRawData(receivedRawData);

      await saveChatHistory(finalMessages, finalQaHistory);
    }
  };

  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
  };

  const handleFeedback = (answerText, feedbackValue) => {
    const finalQaHistory = qaHistory.map((qa) =>
      qa.answer === answerText ? { ...qa, is_helpful: feedbackValue } : qa
    );
    setQaHistory(finalQaHistory);
    saveChatHistory(messages, finalQaHistory);
  };

  const handlePinToggle = (qaToToggle) => {
    const isPinned = pinnedItems.some((p) => p.question === qaToToggle.question);
    if (isPinned) {
      setPinnedItems(pinnedItems.filter((p) => p.question !== qaToToggle.question));
      setPinSnackbar({ open: true, message: "Q&A Unpinned" });
    } else {
      setPinnedItems([...pinnedItems, qaToToggle]);
      setPinSnackbar({ open: true, message: "Q&A Pinned to Dashboard" });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleListen = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true });
    }
  };

  const fetchCatalogDetailsAndGenerate = async (catalog) => {
    if (!catalog) return;
    setIsLoading(true);
    setIsDashboardLoading(true);
    setDashboardData(null);
    setRawData(null);
    
    try {
      const detailsRes = await axios.get(
        `${API_URL}/api/semantic_catalogs/${catalog.id}/details`,
        { withCredentials: true }
      );
      
      const metadata = detailsRes.data?.details ?? detailsRes.data ?? [];
      const connectdetail = detailsRes.data.connection_info;
      
      setConnectionInfo(connectdetail);
      setConnectionStatus("success");
      setSelectedCatalogId(catalog.id);

      const groupedByTable = metadata.reduce((acc, row) => {
        const tbl = row.table_name ?? row.table ?? "unknown_table";
        if (!acc[tbl]) acc[tbl] = [];
        acc[tbl].push({
          column: row.column_name ?? row.column,
          description: row.description ?? row.column_description ?? row.desc ?? "",
        });
        return acc;
      }, {});

      const dashboardPayload = {
        summary: `Metadata for catalog: ${catalog.name}. Contains ${Object.keys(groupedByTable).length} table(s).`,
        key_metrics: [
          {label: "Total Tables", value: Object.keys(groupedByTable).length}, 
          {label: "Total Columns", value: metadata.length}
        ],
        chart_specs: [],
        tables: Object.keys(groupedByTable).map((t) => ({
          table_name: t,
          columns: groupedByTable[t]
        })),
        raw: catalog.raw
      };

      setDashboardData(dashboardPayload);
      setRawData(metadata);

      const aiRes = await axios.post(
        `${API_URL}/api/chat/generate_from_metadata`,
        {
          catalog_id: catalog.id,
          catalog_name: catalog.name,
          metadata: dashboardPayload.tables,
          connectionInfo: connectdetail 
        },
        { withCredentials: true }
      );
      
      if (aiRes.data.success && aiRes.data.suggestions.length > 0) {
        setDynamicSuggestions(aiRes.data.suggestions);
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: `Loaded catalog '${catalog.name}'. Here are some suggestions:`,
            type: "suggestion_actions",
            suggestions: aiRes.data.suggestions,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: `Loaded catalog '${catalog.name}'. You can now ask questions about its tables.`,
          },
        ]);
      }
    } catch (err) {
      console.error("Failed to fetch catalog details:", err);
      setSnackbar({ open: true, message: "Could not load catalog details.", severity: "error" });
    } finally {
      setIsLoading(false);
      setIsDashboardLoading(false);
    }
  };

  const handleWelcomeAction = (action) => {
    if (action === "general") {
      if (inputRef.current) {
        inputRef.current.focus();
      }
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Great! Ask me anything in the text box below.",
        },
      ]);
    } else if (action === "connect") {
      setSidebarOpen(true);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "The connection panel is open. Please enter your database details.",
        },
      ]);
    } else if (action === "load") {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Please select a saved connection from the list above the chat box.",
        },
      ]);
    }
  };

  const renderMessage = (msg, idx) => {
    const isUser = msg.sender === "user";

    if (msg.type === "welcome_actions") {
      return (
        <ListItem key={idx} sx={{ flexDirection: "column", alignItems: "flex-start" }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <Avatar sx={{ bgcolor: "secondary.main", color: "white", width: 28, height: 28, fontWeight: "bold", fontSize: 13, mt: 0.5 }}>
              AI
            </Avatar>
            <Paper elevation={3} sx={{ p: 1.5, maxWidth: "80%", bgcolor: "background.paper", color: "text.primary", borderRadius: 3 }}>
              <Typography variant="body1">{msg.text}</Typography>
              
              {welcomeCatalogs && welcomeCatalogs.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 2, fontWeight: 'bold' }}>Explore a catalog:</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}>
                    {welcomeCatalogs.map((c) => (
                      <Button key={c.id}
                        size="small"
                        variant="outlined"
                        onClick={() => fetchCatalogDetailsAndGenerate(c)}
                        sx={{ textTransform: "none" }}
                      >
                        {c.name}
                      </Button>
                    ))}
                  </Stack>
                </>
              )}

              <Stack direction="column" spacing={1} sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<ChatIcon />}
                  onClick={() => handleWelcomeAction("general")}
                  sx={{ justifyContent: "flex-start" }}
                >
                  Start General Chat
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  color="secondary"
                  startIcon={<StorageIcon />}
                  onClick={() => handleWelcomeAction("load")}
                  sx={{ justifyContent: "flex-start" }}
                  disabled={savedConnections.length === 0}
                >
                  Select Saved Connection
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  color="secondary"
                  startIcon={<AddLinkIcon />}
                  onClick={() => handleWelcomeAction("connect")}
                  sx={{ justifyContent: "flex-start" }}
                >
                  Connect to New Database
                </Button>
              </Stack>
            </Paper>
          </Box>
        </ListItem>
      );
    }

    if (msg.type === "suggestion_actions" && msg.suggestions) {
      return (
        <ListItem key={idx} sx={{ flexDirection: "column", alignItems: "flex-start" }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <Avatar sx={{ bgcolor: "secondary.main", color: "white", width: 28, height: 28, fontWeight: "bold", fontSize: 13, mt: 0.5 }}>
              AI
            </Avatar>
            <Paper elevation={3} sx={{ p: 1.5, maxWidth: "80%", bgcolor: "background.paper", color: "text.primary", borderRadius: 3 }}>
              <Typography variant="body1">{msg.text}</Typography>
              <Stack direction="column" spacing={1} sx={{ mt: 2 }}>
                {msg.suggestions.map((q, qIdx) => (
                  <Chip
                    key={qIdx}
                    label={q}
                    onClick={() => handleSend(q)}
                    sx={{
                      cursor: "pointer",
                      bgcolor: "background.default", 
                      border: "1px solid",
                      borderColor: "divider",
                      color: "text.primary", 
                      "&:hover": { bgcolor: "action.hover" }, 
                      justifyContent: "flex-start",
                      p: 1,
                      height: "auto",
                      "& .MuiChip-label": {
                        whiteSpace: "normal",
                        lineHeight: 1.4,
                      },
                    }}
                  />
                ))}
              </Stack>
            </Paper>
          </Box>
        </ListItem>
      );
    }

    let qaPair = null;
    let currentFeedback = null;
    if (!isUser) {
      qaPair = [...qaHistory].reverse().find((qa) => qa.answer === msg.text);
      currentFeedback = qaPair?.is_helpful ?? null;
    }

    return (
      <ListItem
        key={idx}
        sx={{
          flexDirection: "column",
          alignItems: isUser ? "flex-end" : "flex-start",
          mb: 1,
          gap: 0.5,
        }}
      >
        <Box
          sx={{
            display: "flex",
            width: "100%",
            justifyContent: isUser ? "flex-end" : "flex-start",
            alignItems: "flex-start",
            gap: 1,
          }}
        >
          {!isUser && (
            <Avatar sx={{ bgcolor: "secondary.main", color: "white", width: 28, height: 28, fontWeight: "bold", fontSize: 13, mt: 0.5 }}>
              AI
            </Avatar>
          )}
          <Paper
            elevation={3}
            sx={{
              p: 1.25,
              maxWidth: "80%",
              bgcolor: isUser ? "primary.main" : "background.paper",
              color: isUser ? "white" : "text.primary",
              borderRadius: 3,
              fontSize: 14,
              wordBreak: "break-word",
              boxShadow: isUser
                ? "0 2px 12px rgba(0,156,222,0.4)"
                : "0 2px 8px rgba(0,0,0,0.1)",
              "& p": {
                margin: 0,
                lineHeight: 1.6,
                "&:not(:last-child)": { mb: 1.5 },
              },
              "& ol, & ul": { my: 1, pl: 3 },
              "& li": { lineHeight: 1.6, mb: 0.5 },
              "& code": {
                bgcolor: isUser ? "rgba(0,0,0,0.2)" : "action.selected",
                px: 0.5,
                borderRadius: 1,
                fontFamily: "monospace",
                fontSize: "0.9em",
              },
              "& pre": {
                bgcolor: isUser ? "rgba(0,0,0,0.2)" : "action.selected",
                p: 1.5,
                borderRadius: 1,
                overflowX: "auto",
              },
              "& pre > code": { bgcolor: "transparent", px: 0, fontSize: "0.9em" },
              "& strong, & b": {
                color: isUser ? "white" : "text.primary",
                fontWeight: 700,
              },
            }}
          >
            {/* Check for table data AND message text containing SQL marker/format to render Rich View */}
            {msg.table && Array.isArray(msg.table) && msg.table.length > 0 ? (
              <ChatWithTableComponent llmOutput={msg.text} sqlJson={msg.table} />
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {msg.text}
              </ReactMarkdown>
            )}
          </Paper>
          {isUser && (
            <Avatar sx={{ bgcolor: "primary.main", color: "white", width: 28, height: 28, fontWeight: "bold", fontSize: 13, mt: 0.5 }}>
              U
            </Avatar>
          )}
        </Box>
        {!isUser && qaPair && (
          <Box sx={{ pl: "36px", display: "flex", alignItems: "center", gap: 1 }}>
            <Tooltip title={pinnedItems.some(p => p.question === qaPair.question) ? "Unpin Q&A" : "Pin Q&A"} arrow>
              <IconButton
                size="small"
                onClick={() => handlePinToggle(qaPair)}
                color={pinnedItems.some(p => p.question === qaPair.question) ? "primary" : "default"}
              >
                {pinnedItems.some(p => p.question === qaPair.question) ? 
                  <PushPinIcon fontSize="small" /> : 
                  <PushPinOutlinedIcon fontSize="small" />
                }
              </IconButton>
            </Tooltip>

            <Tooltip title="Helpful" arrow>
              <IconButton
                size="small"
                onClick={() => handleFeedback(msg.text, true)}
                disabled={currentFeedback !== null}
                color={currentFeedback === true ? "primary" : "default"}
              >
                {currentFeedback === true ? <ThumbUp /> : <ThumbUpOutlined />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Not Helpful" arrow>
              <IconButton
                size="small"
                onClick={() => handleFeedback(msg.text, false)}
                disabled={currentFeedback !== null}
                color={currentFeedback === false ? "error" : "default"}
              >
                {currentFeedback === false ? <ThumbDown /> : <ThumbDownOutlined />}
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </ListItem>
    );
  };

  const lastUserQuestion = [...messages].reverse().find(m => m.sender === 'user')?.text;
  const isDashboardPinned = lastUserQuestion && pinnedDashboards.some(p => p.question === lastUserQuestion);

  const handlePinDashboardToggle = () => {
    if (!lastUserQuestion || !dashboardData || !rawData) {
      setSnackbar({ open: true, message: "No dashboard to pin.", severity: "warning" });
      return;
    }

    if (isDashboardPinned) {
      setPinnedDashboards(prev => prev.filter(p => p.question !== lastUserQuestion));
      setPinSnackbar({ open: true, message: "Dashboard Unpinned" });
    } else {
      setPinnedDashboards(prev => [
        ...prev,
        {
          question: lastUserQuestion,
          dashboardData: dashboardData,
          rawData: rawData
        }
      ]);
      setPinSnackbar({ open: true, message: "Dashboard Pinned to Homepage" });
    }
  };

  if (!browserSupportsSpeechRecognition && user) {
    console.error("This browser does not support speech recognition.");
  }
  
  if (!user) {
    return null;
  }

  return (
    <>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
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
          height: "calc(100vh - 64px)",
          bgcolor: "background.default",
        }}
      >
        <MiniSidebar currentPath={location.pathname} />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: "flex",
            height: "100%",
            overflow: "hidden",
            p: 2,
            gap: 2,
          }}
        >
          {(layoutMode === 'split' || layoutMode === 'dashboardOnly') && (dashboardData || isDashboardLoading)&&(
            <Box
              sx={{
                flex: 1,
                minWidth: layoutMode === 'dashboardOnly' ? "100%" : "400px",
                maxWidth: layoutMode === 'dashboardOnly' ? "100%" : "50%",
                bgcolor: "background.paper",
                p: 2,
                borderRadius: 3,
                boxShadow: 3,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                transition: "all 0.3s ease",
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexShrink: 0 }}>
                <Typography variant="h6" sx={{ color: "text.primary" }}>
                  Analysis Dashboard
                </Typography>
                <Box>
                  <Tooltip title={isDashboardPinned ? "Unpin Dashboard" : "Pin to Homepage"} arrow>
                    <span>
                      <IconButton
                        onClick={handlePinDashboardToggle}
                        disabled={!dashboardData || !lastUserQuestion}
                        color={isDashboardPinned ? "primary" : "default"}
                        size="small"
                      >
                        {isDashboardPinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}
                      </IconButton>
                    </span>
                  </Tooltip>
                  {layoutMode === 'dashboardOnly' && (
                    <Tooltip title="Show Split View" arrow>
                      <IconButton
                        onClick={() => setLayoutMode('split')}
                        size="small"
                        sx={{ ml: 1 }}
                      >
                        <SettingsEthernetIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>

              <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                <DynamicDashboard
                  dashboardData={dashboardData}
                  rawData={rawData}
                  isLoading={isDashboardLoading}
                  question={lastUserQuestion}
                />
              </Box>
            </Box>
          )}

          {(layoutMode === 'split' || layoutMode === 'chatOnly') && (
            <Box
              sx={{
                flex: 1,
                minWidth: layoutMode === 'chatOnly' ? "100%" : "350px",
                maxWidth: layoutMode === 'chatOnly' ? "100%" : "50%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                boxShadow: 3,
                borderRadius: 3,
                bgcolor: "background.paper",
                p: 2,
                transition: "all 0.3s ease",
                position: 'relative'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexShrink: 0 }}>
                <Typography variant="h6" sx={{ color: "text.primary" }}>
                  Chat with MetadataGenbot
                </Typography>
                {layoutMode === 'chatOnly' && (
                  <Tooltip title="Show Split View" arrow>
                    <IconButton
                      onClick={() => setLayoutMode('split')}
                      size="small"
                    >
                      <SettingsEthernetIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>

              {savedConnections.length > 0 && (
                <Box sx={{ flexShrink: 0, mb: 1, overflowX: "auto", pb: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    SAVED CONNECTIONS:
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                    {savedConnections.map((conn) => (
                      <Chip
                        key={conn.id}
                        icon={<StorageIcon />}
                        label={conn.nickname}
                        onClick={() => handleLoadConnection(conn)}
                        onDelete={() => handleDeleteConnection(conn.nickname)}
                        deleteIcon={<DeleteIcon />}
                        sx={{
                          cursor: "pointer",
                          bgcolor: "background.default",
                          border: "1px solid",
                          borderColor: "divider",
                          color: "text.primary",
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              <List
                sx={{
                  flexGrow: 1,
                  overflowY: "auto",
                  bgcolor: "background.default",
                  p: 2,
                  borderRadius: 2, 
                  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)",
                  mb: 2,
                }}
              >
                {messages.map(renderMessage)}
                <div ref={messagesEndRef} />
              </List>

              <Divider sx={{ flexShrink: 0 }} />

              <Box sx={{ flexShrink: 0, mt: 1 }}>
                <Box
                  component="form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  sx={{ display: "flex", alignItems: "center", mb: 0 }}
                >
                  <Tooltip title="Scroll to Bottom">
                    <IconButton onClick={scrollToBottom} size="small" color="primary" sx={{ mr: 1 }}>
                        <ArrowDownwardIcon />
                    </IconButton>
                  </Tooltip>

                  <TextField
                    label={listening ? "Listening..." : "Ask MetadataGenbot..."}
                    inputRef={inputRef}
                    variant="outlined"
                    fullWidth
                    multiline
                    maxRows={3}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    sx={{ bgcolor: "background.default", borderRadius: 3 }}
                    margin="dense"
                  />

                  {browserSupportsSpeechRecognition && (
                    <Tooltip title={listening ? "Stop Listening" : "Start Listening"}>
                      <IconButton
                        color={listening ? "error" : "primary"}
                        sx={{ ml: 1, p: 1.5 }}
                        onClick={handleListen}
                      >
                        {listening ? <MicOffIcon /> : <MicIcon />}
                      </IconButton>
                    </Tooltip>
                  )}

                  {isLoading ? (
                    <Tooltip title="Stop Generation">
                        <IconButton 
                            color="error" 
                            onClick={handleStopGeneration} 
                            sx={{ ml: 1, p: 1.5 }}
                        >
                            <StopCircleIcon fontSize="large" />
                        </IconButton>
                    </Tooltip>
                  ) : (
                    <IconButton
                        color="primary"
                        sx={{ ml: 1, p: 1.5 }}
                        onClick={() => handleSend()}
                        disabled={!input.trim()}
                        aria-label="send message"
                    >
                        <SendIcon fontSize="medium" />
                    </IconButton>
                  )}
                </Box>

                <SuggestionChips
                  suggestions={dynamicSuggestions}
                  onSuggestionClick={(question) => {
                    setInput(question);
                  }}
                  loading={suggestionsLoading}
                />
              </Box>
            </Box>
          )}

        <LayoutControlButtons 
          layoutMode={layoutMode}
          setLayoutMode={setLayoutMode}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          dashboardData={dashboardData}
          isDashboardLoading={isDashboardLoading}
          setUserLayoutChange={setUserLayoutChange}
        />
        </Box>

        <Sidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          connectionInfo={connectionInfo}
          onConnectionInfoChange={handleConnectionInfoChange}
          onConnect={handleConnect}
          connectionStatus={connectionStatus}
          errorMessage={errorMessage}
          loading={loading}
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
      <Snackbar
        open={pinSnackbar.open}
        autoHideDuration={3000}
        onClose={() => setPinSnackbar({ ...pinSnackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert
          onClose={() => setPinSnackbar({ ...pinSnackbar, open: false })}
          severity="success"
          sx={{ width: "100%" }}
        >
          {pinSnackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}