// --- UPDATED: Helper function to format large numbers ---
export const formatNumber = (num) => {
    let originalValue = num;
    let prefix = '';
    
    if (typeof num === 'string' || num instanceof String) {
      num = num.toString(); // Ensure it's a string
      
      // Don't format percentages
      if(num.endsWith('%')) {
          return originalValue;
      }
  
      // Check for prefix
      if (num.startsWith('$')) {
        prefix = '$';
      }
      
      // Strip currency symbols, commas, and trailing/leading spaces
      const cleanedString = num.replace(/[$,\s]/g, '');
      num = parseFloat(cleanedString);
    }
  
    if (typeof num !== 'number' || isNaN(num)) {
      return originalValue; // Return original value if not a number
    }
  
    if (Math.abs(num) < 1000) {
      // For small numbers, format to 2 decimal places if needed
      return prefix + num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
  
    const si = [
      { value: 1, symbol: "" },
      { value: 1e3, symbol: "K" },
      { value: 1e6, symbol: "M" },
      { value: 1e9, symbol: "B" },
      { value: 1e12, symbol: "T" },
    ];
  
    const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
    let i;
    for (i = si.length - 1; i > 0; i--) {
      if (Math.abs(num) >= si[i].value) {
        break;
      }
    }
    let formattedValue = (num / si[i].value).toFixed(2).replace(rx, "$1") + si[i].symbol;
    return prefix + formattedValue;
  };