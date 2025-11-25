import React, { useMemo, useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  IconButton,
  Tooltip,
  Checkbox,
  FormControlLabel,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
} from "@mui/material";
import {
  Search as SearchIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Download as DownloadIcon,
  ContentCopy as ContentCopyIcon,
  Code as CodeIcon,
  Description as DescriptionIcon
} from "@mui/icons-material";

// --- Parsing Utilities ---

function extractQueryFromText(text) {
  if (!text) return { narrative: "", query: "" };

  // 1. Check for Markdown code blocks (e.g. ```sql ... ```)
  const codeBlockRegex = /```(?:sql)?\s*([\s\S]*?)```/i;
  const codeMatch = text.match(codeBlockRegex);

  if (codeMatch) {
    const query = codeMatch[1].trim();
    // Remove the code block from the text to get the narrative
    let narrative = text.replace(codeMatch[0], "").trim();
    
    // Optional: Clean up trailing labels like "**Generated Query:**" from the narrative
    narrative = narrative.replace(/(\*\*|__)?(Generated Query|Executed query)(\*\*|__)?\s*[:\-–—]?\s*$/i, "").trim();
    
    return { narrative, query };
  }

  // 2. Fallback: Look for explicit text markers if no code blocks found
  const markerMatch = text.match(/(?:Executed query|Generated Query)\s*[:\-–—]\s*/i);
  if (markerMatch) {
    const idx = markerMatch.index + markerMatch[0].length;
    const narrative = text.slice(0, markerMatch.index).trim();
    const query = text.slice(idx).trim();
    return { narrative, query };
  }

  // 3. Fallback: Heuristic check for raw SQL starting on a new line
  const lines = text.split(/\r?\n/);
  const sqlStartIndex = lines.findIndex((l) => /^\s*(SELECT|WITH|WITH RECURSIVE)\b/i.test(l));
  if (sqlStartIndex >= 0) {
    return {
      narrative: lines.slice(0, sqlStartIndex).join("\n").trim(),
      query: lines.slice(sqlStartIndex).join("\n").trim(),
    };
  }

  return { narrative: text.trim(), query: "" };
}

function highlightSQL(sql = "") {
  if (!sql) return "";
  const text = String(sql);
  const escapeHtml = (str) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  
  const KEYWORDS = ["SELECT","FROM","WHERE","GROUP","BY","ORDER","HAVING","AS","AND","OR","NOT","IN","ON","JOIN","LEFT","RIGHT","INNER","OUTER","LIMIT","OFFSET","DISTINCT","WITH","UNION","ALL","CASE","WHEN","THEN","ELSE","END","IS","NULL","BETWEEN","LIKE","ILIKE","TRUE","FALSE","OVER","PARTITION"];
  const FUNCTIONS = ["AVG","COUNT","SUM","MIN","MAX","ROUND","CAST","COALESCE","DATE_TRUNC","EXTRACT","TO_CHAR","LAG","LEAD","DENSE_RANK","ROW_NUMBER","NTILE"];

  const tokenRe = /\/\*[\s\S]*?\*\/|--.*?$|'([^']|'')*'|"([^"]|"")*"|\b\d+(\.\d+)?\b|[A-Za-z_][A-Za-z0-9_]*|[(),;=<>:+\-*/]/gim;

  let out = "";
  let lastIndex = 0;
  let m;

  while ((m = tokenRe.exec(text)) !== null) {
    if (m.index > lastIndex) out += escapeHtml(text.slice(lastIndex, m.index));
    const token = m[0];
    
    if (token.startsWith("'")) out += `<span style="color:#4caf50">${escapeHtml(token)}</span>`;
    else if (token.startsWith('"')) out += `<span style="color:#f44336">${escapeHtml(token)}</span>`;
    else if (/^\d/.test(token)) out += `<span style="color:#ff9800">${escapeHtml(token)}</span>`;
    else if (KEYWORDS.includes(token.toUpperCase())) out += `<span style="color:#2196f3; font-weight:bold">${escapeHtml(token)}</span>`;
    else if (FUNCTIONS.includes(token.toUpperCase())) out += `<span style="color:#9c27b0; font-weight:bold">${escapeHtml(token)}</span>`;
    else out += escapeHtml(token);
    
    lastIndex = tokenRe.lastIndex;
  }
  if (lastIndex < text.length) out += escapeHtml(text.slice(lastIndex));
  return out;
}

function flattenRow(obj, parentKey = "", res = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const newKey = parentKey ? `${parentKey}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
      flattenRow(v, newKey, res);
    } else {
      res[newKey] = v;
    }
  }
  return res;
}

function convertToCSV(rows, columns) {
  const escape = (val) => {
    if (val == null) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  const header = columns.map(escape).join(",");
  const body = rows.map((row) => columns.map((col) => escape(row[col])).join(",")).join("\n");
  return `${header}\n${body}`;
}

// --- Main Component ---

export default function ChatWithTableComponent({
  llmOutput = "",
  sqlJson = [],
  pageSizeOptions = [5, 10, 25],
  defaultPageSize = 5,
}) {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState({ key: null, dir: "asc" });
  const [wrapCells, setWrapCells] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState(new Set());

  // Extract Narrative and SQL
  const { narrative, query: executedQuery } = useMemo(() => extractQueryFromText(llmOutput), [llmOutput]);
  const highlightedSQL = useMemo(() => highlightSQL(executedQuery), [executedQuery]);

  // Process Table Data
  const { flattenedRows, columns } = useMemo(() => {
    if (!sqlJson || !Array.isArray(sqlJson)) return { flattenedRows: [], columns: [] };
    const rows = sqlJson.map((r, index) => ({ ...flattenRow(r), __originalIndex: index }));
    const keys = new Set();
    for (const r of rows) Object.keys(r).forEach((k) => k !== "__originalIndex" && keys.add(k));
    return { flattenedRows: rows, columns: Array.from(keys) };
  }, [sqlJson]);

  // Filtering & Sorting
  const filtered = useMemo(() => {
    if (!search) return flattenedRows;
    const q = search.toLowerCase();
    return flattenedRows.filter((row) =>
      columns.some((col) => String(row[col] ?? "").toLowerCase().includes(q))
    );
  }, [search, flattenedRows, columns]);

  const sorted = useMemo(() => {
    if (!sortBy.key) return filtered;
    const { key, dir } = sortBy;
    return [...filtered].sort((a, b) => {
      const A = a[key] ?? "";
      const B = b[key] ?? "";
      const nA = parseFloat(A);
      const nB = parseFloat(B);
      if (!Number.isNaN(nA) && !Number.isNaN(nB)) return dir === "asc" ? nA - nB : nB - nA;
      return dir === "asc" ? String(A).localeCompare(String(B)) : String(B).localeCompare(String(A));
    });
  }, [filtered, sortBy]);

  const paged = useMemo(() => {
    const start = page * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  useEffect(() => { setPage(0); }, [search, sortBy, pageSize]);
  useEffect(() => { setSelectedIndices(new Set()); }, [sqlJson]);

  const handleSort = (col) => {
    if (sortBy.key !== col) setSortBy({ key: col, dir: "asc" });
    else if (sortBy.dir === "asc") setSortBy({ key: col, dir: "desc" });
    else setSortBy({ key: null, dir: null });
  };

  const handleSelectAll = (checked) => {
    setSelectedIndices(checked ? new Set(sorted.map(r => r.__originalIndex)) : new Set());
  };

  const handleRowSelect = (originalIndex) => {
    const newSelection = new Set(selectedIndices);
    if (newSelection.has(originalIndex)) newSelection.delete(originalIndex);
    else newSelection.add(originalIndex);
    setSelectedIndices(newSelection);
  };

  const exportCSV = (selectedOnly) => {
    const rowsToExport = selectedOnly ? flattenedRows.filter(r => selectedIndices.has(r.__originalIndex)) : sorted;
    if (rowsToExport.length === 0) return;
    const csv = convertToCSV(rowsToExport, columns);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data_export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const numSelected = selectedIndices.size;
  const rowCount = sorted.length;
  const isAllSelected = numSelected > 0 && numSelected === rowCount;

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
      
      {/* 1. Summary Section */}
      <Paper elevation={2} sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <DescriptionIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6" fontWeight="600">Summary & Insights</Typography>
        </Box>
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", color: 'text.secondary', lineHeight: 1.6 }}>
          {narrative || "No narrative available."}
        </Typography>
      </Paper>

      {/* 2. SQL Section */}
      {executedQuery && (
        <Paper elevation={2} sx={{ p: 0, bgcolor: '#1e1e1e', color: '#fff', borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ p: 1.5, borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CodeIcon sx={{ mr: 1, color: '#90caf9' }} fontSize="small"/>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#e0e0e0' }}>Executed SQL Query</Typography>
            </Box>
            <Button 
                size="small" 
                sx={{ color: '#90caf9', textTransform: 'none' }}
                onClick={() => navigator.clipboard.writeText(executedQuery)}
                startIcon={<ContentCopyIcon fontSize="small" />}
            >
                Copy SQL
            </Button>
          </Box>
          <Box 
            component="pre" 
            sx={{ p: 2, m: 0, overflowX: 'auto', fontFamily: 'Consolas, monospace', fontSize: '0.85rem', lineHeight: 1.5 }}
            dangerouslySetInnerHTML={{ __html: highlightedSQL }}
          />
        </Paper>
      )}

      {/* 3. Data Table Section */}
      {flattenedRows.length > 0 && (
        <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 2 }}>
                <TextField
                  variant="outlined" size="small" placeholder="Search table..."
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} /> }}
                  sx={{ flexGrow: 1 }}
                />
                <FormControlLabel
                  control={<Checkbox size="small" checked={wrapCells} onChange={(e) => setWrapCells(e.target.checked)} />}
                  label={<Typography variant="body2">Wrap Cells</Typography>}
                />
                <Tooltip title="Export CSV">
                  <IconButton size="small" onClick={() => exportCSV(false)}><DownloadIcon /></IconButton>
                </Tooltip>
            </Box>
            
            <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                    <TableCell padding="checkbox" sx={{ bgcolor: 'background.paper' }}>
                        <Checkbox
                          size="small"
                          indeterminate={numSelected > 0 && !isAllSelected}
                          checked={isAllSelected}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                    </TableCell>
                    {columns.map((col) => (
                        <TableCell key={col} sx={{ bgcolor: 'background.paper', fontWeight: 'bold' }}>
                        <TableSortLabel
                            active={sortBy.key === col}
                            direction={sortBy.key === col ? sortBy.dir : 'asc'}
                            onClick={() => handleSort(col)}
                            IconComponent={sortBy.dir === 'asc' ? ArrowUpwardIcon : ArrowDownwardIcon}
                        >
                            {col}
                        </TableSortLabel>
                        </TableCell>
                    ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {paged.map((row) => {
                    const isSelected = selectedIndices.has(row.__originalIndex);
                    return (
                        <TableRow key={row.__originalIndex} hover selected={isSelected} onClick={() => handleRowSelect(row.__originalIndex)} sx={{ cursor: 'pointer' }}>
                        <TableCell padding="checkbox">
                            <Checkbox size="small" checked={isSelected} />
                        </TableCell>
                        {columns.map((col) => (
                            <TableCell key={col} sx={{ maxWidth: 300, whiteSpace: wrapCells ? 'normal' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'text.secondary' }}>
                            <Tooltip title={String(row[col] ?? "")} disableHoverListener={wrapCells} enterDelay={1000}>
                                <span>{String(row[col] ?? "")}</span>
                            </Tooltip>
                            </TableCell>
                        ))}
                        </TableRow>
                    );
                    })}
                    {paged.length === 0 && (
                    <TableRow><TableCell colSpan={columns.length + 1} align="center" sx={{ py: 3 }}>No results found.</TableCell></TableRow>
                    )}
                </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={pageSizeOptions}
                component="div"
                count={rowCount}
                rowsPerPage={pageSize}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => setPageSize(parseInt(e.target.value, 10))}
            />
        </Paper>
      )}
    </Box>
  );
}