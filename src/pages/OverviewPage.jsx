import { Crosshair, PillBottle, Pill } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import Activity_Distribution from "../components/overview/Activity_Distribution"; 
import Segment_Distribution from "../components/overview/Segment_Distribution";
import OverviewChart from "../components/overview/OverviewChart";
import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";
import { Slider } from "@mui/material";
import { KeepAlive } from 'react-activation';  // Adjust based on your library

const OverviewPage = () => {
  const [salesData, setSalesData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedOption, setSelectedOption] = useState("all");
  const [range, setRange] = useState([]);
  const [selectedValue, setSelectedValue] = useState([]);
  const [timelist, setTimeList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);  // Loading state
  const [error, setError] = useState(null);  // Error state for error handling

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/data/Input.xlsx"); // Load the file from public folder
        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheetName = workbook.SheetNames[2];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        // Add 'Month', 'Year', 'Quarter' columns to the data
        const formattedData = jsonData.map((item) => {
          const rawDate = item.Week;
          const date = new Date(rawDate); // Convert the raw string to a Date object
          const year = date.getFullYear();
          const month = date.getMonth(); // Month index (0-11)
          const quarter = Math.floor(month / 3) + 1; // 1, 2, 3, or 4 for Quarter
          const formattedQuarter = `${year}Q${quarter}`;
          const yyyymm = `${year}-${(month + 1).toString().padStart(2, "0")}`;

          return {
            name: item.Week,
            actual_rx: item["Actual Rx"] || 0, // Ensure it defaults to 0 if undefined
            pred_rx: item["Predicted Rx"],
            year,
            month,
            formattedQuarter,
            yyyymm,
          };
        });

        setSalesData(formattedData);
        setFilteredData(formattedData);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(error.message);  // Set the error message in state
      } finally {
        setIsLoading(false);  // Mark loading as finished
      }
    };

    fetchData();
  }, []);

  // Show loading state
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Show error message if an error occurred
  if (error) {
    return <div>Error: {error}</div>;
  }

  // Compute totalActualRx only when salesData is available
  const totalActualRx = filteredData.reduce((sum, item) => sum + (item.actual_rx || 0), 0);
  const formattedTotalActualRx = totalActualRx.toLocaleString(); // Adds commas as thousand separators
  const totaPredRx = filteredData.reduce((sum, item) => sum + (item.pred_rx || 0), 0);
  const formattedTotalPredRx = totaPredRx.toLocaleString(); // Adds commas as thousand separators

  // Handle the filter slider change
  const handleSliderChange = (event, newValue) => {
    setSelectedValue(newValue);
    filterData(newValue); // Re-apply the filter with the new value
  };

  // Filter data based on the selected filter option (Month, Year, Quarter)
  const filterData = (newValue) => {
    let filtered = [];
    if (selectedOption === "quarter") {
      // Ensure that you correctly filter based on the selected start and end quarter indices
      filtered = salesData.filter((item) => {
        const quarterIndex = uniqueQuarters.indexOf(item.formattedQuarter);
        return quarterIndex >= newValue[0] && quarterIndex <= newValue[1];
      });
    } else if (selectedOption === "yyyymm") {
      // Ensure that you correctly filter based on the selected start and end quarter indices
      filtered = salesData.filter((item) => {
        const yyyymmIndex = uniqueyyyymms.indexOf(item.yyyymm);
        return yyyymmIndex >= newValue[0] && yyyymmIndex <= newValue[1];
      });
    } else if (selectedOption === "all") {
      filtered = salesData; // Show all data without applying any filter
    }
    setFilteredData(filtered); // Update the filtered data
  };

  // Update range and selected value based on filter option
  const handleOptionChange = (event) => {
    const newOption = event.target.value;
    setSelectedOption(newOption);

    if (newOption === "quarter") {
      const quarters = salesData.map((item) => item.formattedQuarter);
      const uniqueQuarters = [...new Set(quarters)].sort();
      setRange([0, uniqueQuarters.length - 1]); // Adjust range for quarter indices
      setSelectedValue([0, uniqueQuarters.length - 1]); // Default to all quarters
      setTimeList(uniqueQuarters)
    } else if (newOption === "yyyymm") {
      const yyyymms = salesData.map((item) => item.yyyymm);
      const uniqueyyyymms = [...new Set(yyyymms)].sort();
      setRange([0, uniqueyyyymms.length - 1]); // Adjust range for quarter indices
      setSelectedValue([0, uniqueyyyymms.length - 1]); // Default to all months
      setTimeList(uniqueyyyymms)
    } else if (newOption === "all") {
      setRange([]); // No range for "all" option
      setSelectedValue([]); // No selected value for "all"
    }
    filterData(selectedValue); 
  };

  // Generate unique quarters based on data
  const uniqueQuarters = [
    ...new Set(salesData.map((item) => item.formattedQuarter))
  ];
  const uniqueyyyymms = [
    ...new Set(salesData.map((item) => item.yyyymm))
  ];

  return (
<div className="flex flex-col h-screen">
  {/* Header stays fixed at the top */}
  <Header title="Overview" />

  {/* Scrollable content */}
  <div className="flex-1 overflow-auto relative z-10 w-full">
    <main className="max-w-7xl mx-auto py-6 px-4 lg:px-8 h-full w-full">
      {/* STATS */}
      <motion.div
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        <StatCard
          name="Actual Rx"
          icon={Pill}
          value={formattedTotalActualRx}
          color="#db2777"
          className="h-[200px] w-full"
        />
        <StatCard
          name="Predicted Rx"
          icon={Pill}
          value={formattedTotalPredRx}
          color="#db2777"
          className="h-[200px] w-full"
        />
      </motion.div>

      {/* Filter Dropdown */}
      <div className="mb-4">
        <label className="text-gray-500">Select Filter Option</label>
        <select
          value={selectedOption}
          onChange={handleOptionChange}
          className="w-full border border-gray-300 rounded-lg p-2"
        >
          <option value="all">– Select an Option –</option>
          <option value="quarter">Quarter</option>
          <option value="yyyymm">Month</option>
        </select>
      </div>

      {/* Range Filter Slider */}
      {selectedOption !== "all" && (
        <div className="mb-4">
          <Slider
            value={selectedValue}
            onChange={handleSliderChange}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => {
              if (selectedOption === "quarter") {
                const quarterIndex = value;
                return uniqueQuarters[quarterIndex] || value;
              } else if (selectedOption === "yyyymm") {
                const yyyymmIndex = value;
                return uniqueyyyymms[yyyymmIndex] || value;
              }
              return value;
            }}
            min={range[0]}
            max={range[1]}
            step={1}
            valueLabelPosition="top"
            sx={{
              color: "#be185d",
              "& .MuiSlider-thumb": {
                backgroundColor: "#be185d",
              },
              "& .MuiSlider-track": {
                backgroundColor: "#be185d",
              },
            }}
            className="w-full h-[50px]"
          />
        </div>
      )}

      {/* CHARTS */}
      <div className="grid grid-cols-1 gap-8 w-full">
        <div className="col-span-1 h-[400px] w-full">
          <OverviewChart data={filteredData} />
        </div>

        {/* Side-by-side layout */}
        <div className="grid grid-cols-2 gap-8 w-full">
          <div className="col-span-1">
            <Activity_Distribution
              selectedOption={selectedOption}
              selectedValue={selectedValue}
            />
          </div>
          <div className="col-span-1">
            <Segment_Distribution
              selectedOption={selectedOption}
              selectedValue={selectedValue}
              timelist={timelist}
            />
          </div>
        </div>
      </div>
    </main>
  </div>
</div>

  
  
  );
};

export default OverviewPage;
