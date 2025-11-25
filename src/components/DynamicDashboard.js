import React from "react";
import {
    Box,
    Typography,
    Paper,
    Grid,
    CircularProgress,
    Alert,
    Avatar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from "@mui/material";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    Cell,
} from "recharts";
import {
    BarChart as BarChartIcon,
    ShowChart as LineChartIcon,
    PieChart as PieChartIcon,
    BubbleChart as ScatterChartIcon,
    Assessment as AssessmentIcon,
} from "@mui/icons-material";
import { formatNumber } from "../utils/formatNumber"; // <-- IMPORTED

// Colors for Pie chart
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#FF00FF"];

// --- Reusable KPI Card ---
const KpiCard = ({ title, value }) => (
    <Paper
        elevation={2}
        sx={{
            p: 1.5,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 2,
            bgcolor: "background.paper", // <-- Theme-aware
            height: "100%",
        }}
    >
        <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            gutterBottom
        >
            {title}
        </Typography>
        <Typography
            variant="h6"
            fontWeight="700"
            color="text.primary" // <-- Theme-aware
            align="center"
        >
            {formatNumber(value)}
        </Typography>
    </Paper>
);

// --- Reusable Chart Rendering Component ---
const RenderChart = ({ spec, data }) => {
    const { type, title, keys } = spec;

    const chartIcon = {
        bar: <BarChartIcon color="primary" />,
        line: <LineChartIcon color="primary" />,
        pie: <PieChartIcon color="primary" />,
        scatter: <ScatterChartIcon color="primary" />,
    }[type];

    return (
        <Paper
            elevation={3}
            sx={{ p: 2, borderRadius: 3, height: "400px", width: "100%" }} // <-- Made width 100%
        >
            <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
                {chartIcon}
                <Typography variant="h6" sx={{ ml: 1, fontWeight: 600, color: 'text.primary' }}> {/* <-- Theme-aware */}
                    {title || "Chart"}
                </Typography>
            </Box>
            <ResponsiveContainer>
                {type === "bar" && keys?.x && keys?.y && (
                    <BarChart
                        data={data}
                        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={keys.x} stroke="text.secondary" /> {/* <-- Theme-aware */}
                        <YAxis stroke="text.secondary" tickFormatter={formatNumber} /> {/* <-- Theme-aware */}
                        <Tooltip wrapperStyle={{ zIndex: 1100 }} formatter={(value) => formatNumber(value)} />
                        <Legend />
                        <Bar dataKey={keys.y} fill="#009CDE" />
                    </BarChart>
                )}
                {type === "line" && keys?.x && keys?.y && (
                    <LineChart
                        data={data}
                        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={keys.x} stroke="text.secondary" /> {/* <-- Theme-aware */}
                        <YAxis stroke="text.secondary" tickFormatter={formatNumber} /> {/* <-- Theme-aware */}
                        <Tooltip wrapperStyle={{ zIndex: 1100 }} formatter={(value) => formatNumber(value)} />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey={keys.y}
                            stroke="#003554"
                            strokeWidth={2}
                        />
                    </LineChart>
                )}
                {type === "pie" && keys?.name && keys?.value && (
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey={keys.value}
                            nameKey={keys.name}
                            cx="50%"
                            cy="50%"
                            outerRadius={120}
                            fill="#8884d8"
                            labelLine={false}
                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                                const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                                return (
                                <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px">
                                    {`${(percent * 100).toFixed(0)}%`}
                                </text>
                                );
                            }}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                />
                            ))}
                        </Pie>
                        <Tooltip wrapperStyle={{ zIndex: 1100 }} formatter={(value) => formatNumber(value)} />
                        <Legend />
                    </PieChart>
                )}
                {type === "scatter" && keys?.x && keys?.y && (
                    <ScatterChart margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={keys.x} name={keys.x} stroke="text.secondary" tickFormatter={formatNumber} /> {/* <-- Theme-aware */}
                        <YAxis dataKey={keys.y} name={keys.y} stroke="text.secondary" tickFormatter={formatNumber} /> {/* <-- Theme-aware */}
                        <Tooltip
                            cursor={{ strokeDasharray: "3 3" }}
                            wrapperStyle={{ zIndex: 1100 }}
                            formatter={(value) => formatNumber(value)}
                        />
                        <Legend />
                        <Scatter name="Data" data={data} fill="#009CDE" />
                    </ScatterChart>
                )}
            </ResponsiveContainer>
        </Paper>
    );
};

// --- Main Dashboard Component ---
export default function DynamicDashboard({ dashboardData, rawData, isLoading, question }) {
    if (isLoading) {
        return (
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    color: "text.secondary",
                }}
            >
                <CircularProgress size={40} sx={{ mb: 2 }} />
                <Typography>Generating analysis...</Typography>
            </Box>
        );
    }

    if (!dashboardData || !rawData) {
        return (
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    p: 3,
                    textAlign: "center",
                }}
            >
                <Avatar
                    sx={{ bgcolor: "secondary.main", width: 56, height: 56, mb: 2 }}
                >
                    <AssessmentIcon fontSize="large" />
                </Avatar>
                <Typography variant="h6" gutterBottom color="text.primary">
                    Analysis Dashboard
                </Typography>
                <Typography color="text.secondary">
                    Ask a question about your connected database to see charts and
                    insights here.
                </Typography>
            </Box>
        );
    }
    
    // Destructure tables (added for Catalog View) from dashboardData
    const { summary, key_metrics, chart_specs, tables } = dashboardData;
    
    let parsedData = [];
    try {
        // Handle both string and array rawData
        let raw = rawData;
        if (typeof raw === "string") {
            parsedData = JSON.parse(raw);
        } else if (raw && Array.isArray(raw)) {
            parsedData = raw;
        }

        // Attempt to convert numeric values
        if (parsedData.length > 0) {
            const sample = parsedData[0];
            
            // --- FIX: Correctly check if the *parsed number* is finite ---
            const numericKeys = Object.keys(sample).filter(
                (k) =>
                    !isNaN(parseFloat(sample[k])) && isFinite(parseFloat(sample[k]))
            );
            // --- END FIX ---

            if (numericKeys.length > 0) {
                parsedData = parsedData.map((row) => {
                    const newRow = { ...row };
                    numericKeys.forEach((key) => {
                        newRow[key] = parseFloat(row[key]);
                    });
                    return newRow;
                });
            }
        }
    } catch (e) {
        console.error("Failed to parse raw data for charts:", e);
        return (
            <Alert severity="error">Error: Could not parse data for charts.</Alert>
        );
    }

    return (
        <Box sx={{ height: "100%", overflowY: "auto", p: 2 }}>
            {/* --- UPDATED: Show the question ONLY if NOT in Catalog Mode (tables is undefined) --- */}
            {question && !tables && (
                <Paper elevation={2} sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Question
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        {question}
                    </Typography>
                </Paper>
            )}
            {/* --- END UPDATED --- */}

            {summary && (
                <Paper elevation={2} sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'text.primary' }}>
                        Summary
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        {summary}
                    </Typography>
                </Paper>
            )}

            {key_metrics && key_metrics.length > 0 && (
                <Box sx={{ mb: 2 }}>
                    <Grid container spacing={2}>
                        {key_metrics.map((metric, idx) => (
                            <Grid
                                item
                                xs={12}
                                sm={6}
                                md={Math.max(12 / (key_metrics.length || 1), 3)}
                                key={idx}
                            >
                                <KpiCard title={metric.label} value={metric.value} />
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}
            
            {/* --- ADDED: Catalog Metadata Table (Only shows if 'tables' data exists) --- */}
            {tables && tables.length > 0 && (
                <Paper elevation={2} sx={{ mb: 2, borderRadius: 2, bgcolor: 'background.paper', overflow: 'hidden' }}>
                    <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                         <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            Catalog Structure
                        </Typography>
                    </Box>
                    <TableContainer sx={{ maxHeight: 400 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Table Name</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Column Name</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Description</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {tables.map((tableObj) => (
                                    tableObj.columns.map((col, idx) => (
                                        <TableRow key={`${tableObj.table_name}-${col.column}-${idx}`} hover>
                                            <TableCell sx={{ verticalAlign: 'top', color: 'text.secondary' }}>
                                                {idx === 0 ? tableObj.table_name : ''}
                                            </TableCell>
                                            <TableCell sx={{ verticalAlign: 'top' }}>{col.column}</TableCell>
                                            <TableCell sx={{ verticalAlign: 'top', color: 'text.secondary' }}>{col.description}</TableCell>
                                        </TableRow>
                                    ))
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}
            {/* --- END ADDED --- */}

            {chart_specs && chart_specs.length > 0 && (
                <Grid container spacing={2}>
                    {chart_specs.map((spec, idx) => (
                        <Grid item xs={12} lg={chart_specs.length > 1 ? 6 : 12} key={idx}>
                            <RenderChart spec={spec} data={parsedData} />
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
}