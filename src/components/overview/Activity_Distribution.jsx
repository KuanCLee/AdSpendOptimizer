import React, { useState, useEffect } from "react";
import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";
import { motion } from "framer-motion";

const COLORS = [
  "#fecdd3", "#fb7185", "#e11d48", "#881337", "#ec4899", "#db2777", 
  "#f87171", "#fbcfe8", "#f472b6", "#9d174d", "#fb923c", "#fbbf24", 
  "#fce7f3", "#f9a8d4", "#fbbf24", "#ff577f", "#f5a7c0", "#e63946", 
  "#d95b5b", "#e74c3c", "#c0392b", "#f44336", "#ff6b6b", "#ff8a80", 
  "#b93b3b", "#c62828", "#9b1c34", "#ff4d4f", "#d32f2f", "#e57373", 
  "#ff5252"
];

// Columns to exclude
const columnsToExclude = ["Actual Rx", "Predicted Rx"]; 

// Fetching data from Excel
const fetchExcelData = async () => {
  const response = await fetch("/data/Input.xlsx");
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheetName = workbook.SheetNames[2]; 
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet);
  
  // Filter out unwanted columns
  const filteredData = jsonData.map((row) => {
    const filteredRow = { ...row }; // Clone to avoid mutation
    columnsToExclude.forEach((col) => {
      delete filteredRow[col]; // Delete the column if it exists
    });
    return filteredRow;
  });
  return filteredData;
};

// Aggregating data based on selected option (quarter, year, or month)
const aggregateData = (data, selectedOption) => {
  const result = {};

  data.forEach((item) => {
    const rawDate = item.Week;
    const date = new Date(rawDate);
    const year = date.getFullYear();
    const month = date.getMonth();
    const quarter = Math.floor(month / 3) + 1;
    const yyyymm = `${year}-${(month + 1).toString().padStart(2, '0')}`; // Year-Month format
    const yearQuarter = `${year}Q${quarter}`;

    let aggregationLevel;
    if (selectedOption === "quarter") {
      aggregationLevel = yearQuarter; // Aggregate by quarter
    } else if (selectedOption === "year") {
      aggregationLevel = year; // Aggregate by year
    } else if (selectedOption === "yyyymm") {
      aggregationLevel = yyyymm; // Aggregate by year-month
    }

    // Initialize the result object based on the aggregation level
    if (!result[aggregationLevel]) {
      result[aggregationLevel] = {};
    }

    Object.keys(item).forEach((key) => {
      // Skip the columns to exclude
      if (columnsToExclude.includes(key)) {
        return;
      }

      if (key !== "Week") {
        const cleanKey = key.trim();
        const value = item[key];
        if (isNaN(value)) {
          return;
        }

        if (!result[aggregationLevel][cleanKey]) {
          result[aggregationLevel][cleanKey] = 0;
        }

        result[aggregationLevel][cleanKey] += value;
      }
    });
  });

  return result;
};

// Pivoting aggregated data into usable format
const pivotData = (aggregatedData) => {
  const columns = Object.keys(aggregatedData).sort();
  const rows = Array.from(new Set(Object.values(aggregatedData).flatMap(Object.keys)));

  const pivotedData = rows.map((row) => {
    const rowData = columns.map((column) => aggregatedData[column][row] || 0);
    return { row, data: rowData };
  });
  return { columns, pivotedData };
};

// Dropdown menu logic
const Activity_Distribution = ({ selectedOption, selectedValue }) => {
  const [aggregatedData, setAggregatedData] = useState({});
  const [pivotedData, setPivotedData] = useState({ columns: [], pivotedData: [] });
  const [data, setData] = useState([]);
  const [processedData, setProcessedData] = useState([]);
  const [mappingData, setMappingData] = useState([]);
  const [currentOption, setCurrentOption] = useState("dev");

  useEffect(() => {
    const loadData = async () => {
      // Fetch main data
      const fetchedData = await fetchExcelData();
  
      // Fetch mapping data for prod/business
      const mappingResponse = await fetch("/data/Input.xlsx");
      const mappingArrayBuffer = await mappingResponse.arrayBuffer();
      const mappingWorkbook = XLSX.read(mappingArrayBuffer, { type: "array" });
      const mappingSheetName = mappingWorkbook.SheetNames[0];
      const mappingSheet = mappingWorkbook.Sheets[mappingSheetName];
      const mappingJson = XLSX.utils.sheet_to_json(mappingSheet);
  
      // Update state versions
      setData(fetchedData);
      setMappingData(mappingJson);

    };
  
    loadData();
  }, []);
  console.log('ABCBA',data)

useEffect(() => {
      let tempData = data;
      if (currentOption !== "dev" ) {
        tempData = handleMapping(currentOption, data, mappingData);
      }
      const aggregated = aggregateData(tempData, selectedOption);
      setAggregatedData(aggregated);

      const pivot = pivotData(aggregated);
      setPivotedData(pivot);

}, [selectedOption, currentOption]);

  // Handles mapping logic

  const handleMapping = (option, dataArray, mappingJson) => {
    let categoryMap = {};
  
    // Step 1: Create the mapping based on the selected option
    if (option === "dev") {
      return dataArray;
    } else if (option === "channel") {
      // Map for channel
      categoryMap = mappingJson.reduce((acc, item) => {
        if (item.variable && item.Channel) {
          acc[item.variable.trim()] = item.Channel.trim();
        }
        return acc;  // Return accumulator to continue building the map
      }, {});
    } else if (option === "sub_category") {
      // Map for sub_category
      categoryMap = mappingJson.reduce((acc, item) => {
        if (item.variable && item.Sub_Category) {
          acc[item.variable.trim()] = item.Sub_Category.trim();
        }
        return acc;  // Return accumulator to continue building the map
      }, {});
    } else if (option === "category") {
      // Map for category
      categoryMap = mappingJson.reduce((acc, item) => {
        if (item.variable && item.Category) {
          acc[item.variable.trim()] = item.Category.trim();
        }
        return acc;  // Return accumulator to continue building the map
      }, {});
    }
  
    // Step 2: Map through the dataArray and apply the transformation
    const mappedData = dataArray.map((row) => {
      const mappedRow = {};
  
      // Iterate over each key-value pair in the row
      Object.entries(row).forEach(([key, value]) => {
        // Skip columns to exclude
        if (columnsToExclude.includes(key)) {
          mappedRow[key] = value;
          return;
        }
  
        // Look up the mapped key in categoryMap
        const mappedKey = categoryMap[key.trim()];
        if (mappedKey) {
          // If the mapped key exists, accumulate the values
          if (!mappedRow[mappedKey]) {
            mappedRow[mappedKey] = 0;
          }
          mappedRow[mappedKey] += Number(value) || 0;
        } else {
          // Otherwise, keep the original key
          mappedRow[key] = value;
        }
      });
  
      return mappedRow;
    });
  
    return mappedData;  // Return the final transformed data
  };
  
  
  

  const getSelectedQuartersInselectedValue = () => {
    const sortedColumns = [...pivotedData.columns].sort();
    return sortedColumns.slice(selectedValue[0], selectedValue[1] + 1);
  };

  const formattedData = pivotedData.pivotedData.map((item) => {
    const selectedQuarterselectedValue = getSelectedQuartersInselectedValue();

    const total = selectedQuarterselectedValue.reduce((sum, quarter) => {
      const index = pivotedData.columns.indexOf(quarter);
      return sum + (item.data[index] || 0);
    }, 0);

    return { name: item.row, value: total };
  });

  const totalSum = formattedData.reduce((sum, item) => sum + item.value, 0);
  const percentageData = formattedData.map((item) => {
    const numericValue = Number(item.value);
    const percentage = totalSum ? (numericValue / totalSum) * 100 : 0;
    return { name: item.name, value: percentage };
  });

  return (
    <motion.div
      className="bg-gray-50 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
    <h2 className="text-lg font-medium mb-4 text-pink-700">Activity Distribution</h2>
    <div style={{ width: "100%", height: 600 }}>
      {/* Dropdown for selecting dev, prod, business */}
      <select onChange={(e) => setCurrentOption(e.target.value)} value={currentOption}>
        <option value="channel">Channel</option>
        <option value="sub_category">Sub Category</option>
        <option value="category">Category</option>
        <option value="dev">Dev</option>
      </select>

      {/* PieChart */}
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={percentageData.map((entry) => ({
              ...entry,
              percentage:
                (entry.value / percentageData.reduce((sum, entry) => sum + entry.value, 0)) * 100,
            }))}
            cx="50%"
            cy="50%"
            outerRadius={200}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percentage }) =>
              percentage >= 5 ? `${name} ${(percentage).toFixed(2)}%` : null
            }
            labelLine={false}
          >
            {percentageData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(31, 41, 55, 0.8)",
              borderColor: "#4B5563",
            }}
            itemStyle={{ color: "#E5E7EB" }}
            formatter={(value) => `${value.toFixed(2)}%`}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
    </motion.div>
  );
};

export default Activity_Distribution;
