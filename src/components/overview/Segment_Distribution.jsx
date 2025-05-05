import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
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
const columnsToExclude = ["Actual Rx", "Predicted Rx", "HCP"]; 

// Fetching data from Excel
const fetchExcelData = async () => {
  const response = await fetch("/data/Input.xlsx");
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheetName = workbook.SheetNames[1]; 
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
    const yyyymm = `${year}-${(month + 1).toString().padStart(2, '0')}`;
    const yearQuarter = `${year}Q${quarter}`;

    let aggregationLevel;
    if (selectedOption === "quarter") {
      aggregationLevel = yearQuarter;
    } else if (selectedOption === "year") {
      aggregationLevel = year;
    } else if (selectedOption === "yyyymm") {
      aggregationLevel = yyyymm;

    }

    const segment = item.Segment;
    const combinedKey = `${aggregationLevel}_${segment}`;

    // ✅ Initialize combinedKey group
    if (!result[combinedKey]) {
      result[combinedKey] = {};
    }

    Object.keys(item).forEach((fieldKey) => {
      if (columnsToExclude.includes(fieldKey)) return;
      if (fieldKey === "Week" || fieldKey === "Segment") return;

      const cleanKey = fieldKey.trim();
      const value = item[fieldKey];

      if (isNaN(value)) return;

      if (!result[combinedKey][cleanKey]) {
        result[combinedKey][cleanKey] = 0;
      }

      result[combinedKey][cleanKey] += value;
    });
  });

  return result;
};

const convertAggregatedToTable = (aggregated) => {
  const result = Object.entries(aggregated).map(([key, metrics]) => {
    // Split the key into Time and Group, and trim any leading/trailing spaces
    const [Time, Group] = key.split('_').map(value => value.trim());

    // Return the transformed object with Time, Group, and metrics
    return { Time, Group, ...metrics };
  });

  return result;
};



// Dropdown menu logic
const Segment_Distribution = ({ selectedOption, selectedValue, timelist }) => {
  const [aggregatedData, setAggregatedData] = useState({});
  const [data, setData] = useState([]);
  const [aggregated_table, setAggregatedTable] = useState({});
  const [mappingData, setMappingData] = useState([]);
  const [currentOption, setCurrentOption] = useState("dev");
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);  // Track loading state

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
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

  useEffect(() => {

      // ✅ Map or not based on selectedOption
      let tempData = data;
      if (currentOption !== "dev" ) {
        tempData = handleMapping(currentOption, data, mappingData);
      }
      
      const aggregated = aggregateData(tempData, selectedOption);
      setAggregatedData(aggregated);

      const formattedAgg = convertAggregatedToTable(aggregated);
      setAggregatedTable(formattedAgg)

      const sortedData = [...formattedAgg].sort((a, b) => {
        const timeA = a.Time;
        const timeB = b.Time;
  
        if (timeA < timeB) return -1;
        if (timeA > timeB) return 1;
  
        const groupA = a.Group;
        const groupB = b.Group;
  
        if (groupA < groupB) return -1;
        if (groupA > groupB) return 1;
  
        return 0;
      });
  
      setAggregatedTable(sortedData);
      setLoading(false);
}, [selectedValue, selectedOption, currentOption]);

  useEffect(() => {
    if (!loading) {

      filterData(selectedOption, selectedValue, timelist);
      console.log('filteredDatafilteredData',filteredData)

    }
  }, [selectedValue, selectedOption, currentOption, loading,aggregated_table ]);

  const filterData = (selectedOption, selectedValue, timelist) => {
    let filtered = [];
  
    // Filter logic based on selectedOption
    if (selectedOption === "quarter") {
      filtered = aggregated_table.filter((item) => {
        const quarterIndex = timelist.indexOf(item.Time);
        return quarterIndex >= selectedValue[0] && quarterIndex <= selectedValue[1];
      });
    } else if (selectedOption === "yyyymm") {
      filtered = aggregated_table.filter((item) => {
        const yyyymmIndex = timelist.indexOf(item.Time);
        return yyyymmIndex >= selectedValue[0] && yyyymmIndex <= selectedValue[1];
      });
    } else if (selectedOption === "all") {
      filtered = aggregated_table; // Show all data without applying any filter
    }
  
    // Group by 'Group' and sum all numeric fields (ignore 'Time')
    const grouped = Object.values(
      filtered.reduce((acc, item) => {
        // If the group doesn't exist, initialize it
        if (!acc[item.Group]) {
          acc[item.Group] = { Group: item.Group }; // Retain the 'Group' field as is
        }
  
        // Sum all other numeric fields (value1, value2, etc.)
        Object.keys(item).forEach((key) => {
          if (key !== 'Group' && key !== 'Time') {
            acc[item.Group][key] = (acc[item.Group][key] || 0) + item[key];
          }
        });
  
        return acc;
      }, {})
    );
  
    // Set the grouped data
    setFilteredData(grouped); // Update state with grouped data
  };


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
  // Object.keys(aggregated_table[0])

  const keys = filteredData && filteredData.length > 0 
  ? Object.keys(filteredData[0]).filter(k => k !== 'Time' && k !== 'Group')
  : [];

  if (loading) {
    return <div>Loading...</div>;  // Render loading state
  }

  return (
  <motion.div
    className="bg-gray-50 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-50"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
  >
    <h2 className="text-lg font-medium mb-4 text-pink-700">Segment Distribution</h2>
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
      <BarChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="Group" />
      <YAxis />
      <Tooltip
      formatter={(value, name, props) => {
        // Calculate the total value for the group
        const total = filteredData.reduce((sum, item) => {
          if (item.Group === props.payload.Group) {
            return sum + Object.keys(item)
              .filter(key => key !== 'Group' && key !== 'Time') // ignore Group and Time
              .reduce((innerSum, key) => innerSum + item[key], 0);
          }
          return sum;
        }, 0);

        // Calculate the percentage
        const percentage = total > 0 ? ((value / total) * 100).toFixed(2) : 0;
        const tooltipStyle = {
          color: percentage > 10 ? '#22c55e' : 'inherit', // Green if > 10%, else default
        };
        return (
          <span style={tooltipStyle}>{`${percentage}%`}</span>
        );        
      }}
      contentStyle={{
        backgroundColor: "rgba(31, 41, 55, 0.8)",
        borderColor: "#4B5563",
      }}
      itemStyle={{ color: "#E5E7EB" }}
    />
      <Legend />
      {keys.map((key, index) => (
        <Bar key={key} dataKey={key} stackId="a" fill={COLORS[index % COLORS.length]} />
      ))}
    </BarChart>
          </ResponsiveContainer>
          </div>
  </motion.div>
  );
};

export default Segment_Distribution;
