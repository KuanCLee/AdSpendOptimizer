import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

import { motion } from "framer-motion";
import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard_Style_2";
import OptimizationTable from "../components/optimization/OptimizationTable";

const OptimizationPage = () => {
  const [optimizationResult, setOptimizationResult] = useState({
    spend: {},
    return: {},
    total_return: 0,
    budget: 0,
  });
  const [channelLimits, setChannelLimits] = useState({});
  const [processedSpendData, setProcessedSpendData] = useState({});
  const [budget, setBudget] = useState("");
  const [lockedChannels, setFreezeedChannels] = useState({
    velo: {
      locked: false,
      dtc: {}, // Freeze DTC section for Velop
      hcp: {}, // Freeze HCP section for Velop
      other:{}
    },
    grizzly: {
      locked: false,
      dtc: {}, // Freeze DTC section for Grizzly
      hcp: {}, // Freeze HCP section for Grizzly
      other:{}
    },
  });
  const handleLimitChange = (channelName, limitType, value) => {
    setChannelLimits((prev) => ({
      ...prev,
      [channelName]: {
        ...prev[channelName],
        [limitType]: value,
      },
    }));
  };
  const [selectedBrand, setSelectedBrand] = useState("all"); // Default to All
  const handleCheckboxChange = (brand, channelName) => {
    setFreezeedChannels((prevState) => ({
      ...prevState,
      [brand]: {
        ...prevState[brand],
        [channelName]: !prevState[brand][channelName],
      },
    }));
  };
  const handleSectionCheckboxChange = (brand, section) => {
    setFreezeedChannels((prevState) => ({
      ...prevState,
      [brand]: {
        ...prevState[brand],
        [section]: !prevState[brand][section],
      },
    }));
  };
  const handleBrandChange = (event) => {
    setSelectedBrand(event.target.value);
  };
  // Handle keydown event
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();  // Prevent default form submission behavior (if inside a form)
      handleOptimize();  // Trigger the optimize function
    }
  };
  const handleOptimize = async () => {
    const parsedBudget = parseInt(budget);
    if (isNaN(parsedBudget) || parsedBudget <= 0) {
      console.warn("Invalid budget input.");
      setOptimizationResult({
        spend: {},
        return: {},
        total_return: 0,
        budget: 0,
      });
      return;
    }
    const frozen_channels_data = await processSpendData();
    // Calculate total frozen budget
    const totalFrozen = Object.values(frozen_channels_data)
      .filter((v) => typeof v === "number")
      .reduce((sum, val) => sum + val, 0);
    if (totalFrozen > parsedBudget) {
      console.error(
        `Frozen channels (${totalFrozen}) exceed the input budget (${parsedBudget}).`
      );
      alert(
        `The frozen spend total (${totalFrozen}) exceeds the input budget (${parsedBudget}). Please adjust.`
      );
      return;
    }
    try {
      const response = await fetch("https://127.0.0.1:8000/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget: parsedBudget,
          brand: selectedBrand,
          channelLimits: channelLimits,
          frozen_channels_data: frozen_channels_data,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setOptimizationResult(result);
      } else {
        console.error("Optimization failed");
      }
    } catch (error) {
      console.error("Fetch error:", error);
    }
    };
  const channelRows = Object.keys(optimizationResult.spend).map((channel) => ({
    name: channel,
    // channel.charAt(0).toUpperCase() + channel.slice(1),
    spend: optimizationResult.spend[channel]?.toFixed(2) || "0.00",
    channelReturn: optimizationResult.return[channel]?.toFixed(2) || "0.00",
  }));
  const totalSpend = Object.values(optimizationResult.spend)
    .reduce((acc, value) => acc + parseFloat(value || 0), 0)
    .toFixed(2);
  const totalReturn = Object.values(optimizationResult.return)
    .reduce((acc, value) => acc + parseFloat(value || 0), 0)
    .toFixed(2);
  // Logic to filter and store spend data based on brand and section lock status
  const fetchFrozenChannels = async () => {
  const response = await fetch("/data/Input.xlsx");
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  // Sheet index 3 for velo
  const veloSheet = workbook.Sheets[workbook.SheetNames[3]];
  const veloData = XLSX.utils.sheet_to_json(veloSheet, { header: 1 });
  const veloHeaders = veloData[0].slice(1).map((col) => ({ [`${col}_velo`]: null }));
  // Sheet index 4 for grizzly
  const grizzlySheet = workbook.Sheets[workbook.SheetNames[4]];
  const grizzlyData = XLSX.utils.sheet_to_json(grizzlySheet, { header: 1 });
  const grizzlyHeaders = grizzlyData[0].slice(1).map((col) => ({ [`${col}_grizzly`]: null }));
  return { veloHeaders, grizzlyHeaders };
  };
  useEffect(() => {
    const loadFrozenData = async () => {
      const { veloHeaders, grizzlyHeaders } = await fetchFrozenChannels();

      setFreezeedChannels((prev) => ({
        ...prev,
        velo: {
          ...prev.velo,
          other: veloHeaders.reduce((acc, obj) => ({ ...acc, ...obj }), {}),
        },
        grizzly: {
          ...prev.grizzly,
          other: grizzlyHeaders.reduce((acc, obj) => ({ ...acc, ...obj }), {}),
        },
      }));
    };

    loadFrozenData();
  }, []);
  const processSpendData = async () => {
    const { veloHeaders, grizzlyHeaders } = await fetchFrozenChannels();
    const allHeaders = [...veloHeaders, ...grizzlyHeaders];
    const processedSpend = {};
    allHeaders.forEach((channelObj) => {
      const channel = Object.keys(channelObj)[0].toLowerCase(); // e.g., "Column1_velo"
      const section = channel.toLowerCase().includes("dtc")
        ? "dtc"
        : channel.toLowerCase().includes("hcp")
        ? "hcp"
        : "other";

      const brand = channel.toLowerCase().includes("velo") ? "velo" : "grizzly";
      const channelData = optimizationResult.spend?.[channel];
      const isChannelLocked = lockedChannels[brand]?.locked;
      const isSectionLocked = lockedChannels[brand]?.[section];
      const isChannelSpecificallyLocked = lockedChannels[brand]?.[channel];
      if (isChannelSpecificallyLocked || isChannelLocked || isSectionLocked) {
        processedSpend[channel] = channelData ?? 0;
      } else {
        processedSpend[channel] = null;
      }
    });
    return processedSpend;
  };
  return (
    <div className="flex flex-col h-screen relative z-10">
      <Header title="Optimization Page" />
      <div className="flex-1 overflow-auto relative z-10 w-full">
        <main className="max-w-full mx-auto py-6 px-2 lg:px-4">
          {/* Budget Input Field */}
          <div>
            <label htmlFor="budget" className="block text-gray-800 font-medium mb-2">
              Enter Budget:
            </label>
            <input
              type="number"
              id="budget"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              onKeyDown={handleKeyDown}  // Listen for Enter key
              className="p-2 border rounded w-full"
              placeholder="e.g. 50000"
            />
          </div>

          {/* Brand Selection Dropdown */}
          <div className="mb-6">
            <label htmlFor="brand" className="block text-gray-800 font-medium mb-2">
              Select Brand:
            </label>
            <select
              id="brand"
              value={selectedBrand}
              onChange={handleBrandChange}
              className="p-2 border rounded w-full"
            >
              <option value="all">All</option>
              <option value="grizzly">Grizzly</option>
              <option value="velo">Velop</option>
            </select>
          </div>

          {/* VeloChannels Section */}
          <motion.div
            className="backdrop-filter backdrop-blur-lg shadow-lg rounded-xl p-6 border grid grid-cols-1 gap-5 lg:grid-cols-2 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <div>
              <h3 className="text-rose-700 text-lg font-semibold mb-4 ">
                Velo Channels
                <input
                  type="checkbox"
                  className="ml-3"
                  checked={lockedChannels.velo?.locked}
                  onChange={() => handleCheckboxChange("velo", "locked")}
                />
                <span className="ml-2 text-gray-800">Freeze Velo Section</span>
              </h3>
              <div className="mb-6">
                <h4 className="text-rose-700 text-md font-medium mb-2">
                  DTC Section
                  <input
                    type="checkbox"
                    className="ml-3"
                    checked={lockedChannels.velo?.dtc}
                    onChange={() => handleSectionCheckboxChange("velo", "dtc")}
                  />
                  <span className="ml-2 text-gray-800">Freeze DTC Section</span>
                </h4>
                <table className="min-w-full bg-rose-800 text-white border border-rose-700">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b">Channel</th>
                      <th className="py-2 px-4 border-b">Spend</th>
                      <th className="py-2 px-4 border-b">Return</th>
                      <th className="py-2 px-4 border-b">Freeze Channel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channelRows
                      .filter(({ name }) => name.toLowerCase().includes("velo") && name.toLowerCase().includes("dtc"))
                      .map(({ name, spend, channelReturn }) => (
                        <tr key={name}>
                          <td className="py-2 px-4 border-b">{name
                                .replace("Dtc_", "")
                                .replace("Hcp_", "")
                                .replace("_Velo", "")
                                .replace("_", " ")
                                .replace("_", " ")
                                .toLowerCase()}
                          </td>
                          <td className="py-2 px-4 border-b">${spend}</td>
                          <td className="py-2 px-4 border-b">${channelReturn}</td>
                          <td className="py-2 px-4 border-b">
                            <input
                              type="checkbox"
                              checked={lockedChannels.velo[name] || false}
                              onChange={() => handleCheckboxChange("velo", name)}
                            />
                          </td>
                            <td className="py-2 px-2 border-b">
                          <input
                            type="number"
                            className="w-20 p-1 text-black"
                            placeholder="Min"
                            value={channelLimits[name]?.lower || ""}
                            onChange={(e) => handleLimitChange(name, "lower", e.target.value)}
                          />
                        </td>
                        <td className="py-2 px-2 border-b">
                          <input
                            type="number"
                            className="w-20 p-1 text-black"
                            placeholder="Max"
                            value={channelLimits[name]?.upper || ""}
                            onChange={(e) => handleLimitChange(name, "upper", e.target.value)}
                          />
                        </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="mb-6">
                <h4 className="text-rose-700 text-md font-medium mb-2 ">
                  HCP Section
                  <input
                    type="checkbox"
                    className="ml-3"
                    checked={lockedChannels.velo?.hcp}
                    onChange={() => handleSectionCheckboxChange("velo", "hcp")}
                  />
                  <span className="ml-2 text-gray-800">Freeze HCP Section</span>
                </h4>
                <table className="min-w-full bg-rose-800 text-white border border-rose-700">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b">Channel</th>
                      <th className="py-2 px-4 border-b">Spend</th>
                      <th className="py-2 px-4 border-b">Return</th>
                      <th className="py-2 px-4 border-b">Freeze Channel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channelRows
                      .filter(({ name }) => name.toLowerCase().includes("velo") && name.toLowerCase().includes("hcp") )
                      .map(({ name, spend, channelReturn }) => (
                        <tr key={name}>
                          <td className="py-2 px-4 border-b">{name
                                .replace("Dtc_", "")
                                .replace("Hcp_", "")
                                .replace("_Velo", "")
                                .replace("_", " ")
                                .replace("_", " ")
                                .toLowerCase()
                                }
                          </td>                          
                          <td className="py-2 px-4 border-b">${spend}</td>
                          <td className="py-2 px-4 border-b">${channelReturn}</td>
                          <td className="py-2 px-4 border-b">
                            <input
                              type="checkbox"
                              checked={lockedChannels.velo[name] || false}
                              onChange={() => handleCheckboxChange("velo", name)}
                            />
                          </td>
                            <td className="py-2 px-2 border-b">
                          <input
                            type="number"
                            className="w-20 p-1 text-black"
                            placeholder="Min"
                            value={channelLimits[name]?.lower || ""}
                            onChange={(e) => handleLimitChange(name, "lower", e.target.value)}
                          />
                        </td>
                        <td className="py-2 px-2 border-b">
                          <input
                            type="number"
                            className="w-20 p-1 text-black"
                            placeholder="Max"
                            value={channelLimits[name]?.upper || ""}
                            onChange={(e) => handleLimitChange(name, "upper", e.target.value)}
                          />
                        </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>


              <div className="mb-6">
                <h4 className="text-rose-700 text-md font-medium mb-2">
                  Other Section
                  <input
                    type="checkbox"
                    className="ml-3"
                    checked={lockedChannels.velo?.other}
                    onChange={() => handleSectionCheckboxChange("velo","other")}
                  />
                  <span className="ml-2 text-gray-800">Freeze Other Section</span>
                </h4>
                <table className="min-w-full bg-rose-800 text-white border border-rose-700">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b">Channel</th>
                      <th className="py-2 px-4 border-b">Spend</th>
                      <th className="py-2 px-4 border-b">Return</th>
                      <th className="py-2 px-4 border-b">Freeze Channel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channelRows
                      .filter(({ name }) => name.toLowerCase().includes("velo") && !name.toLowerCase().includes("dtc")&& !name.toLowerCase().includes("hcp"))
                      .map(({ name, spend, channelReturn }) => (
                        <tr key={name}>
                          <td className="py-2 px-4 border-b">{name
                                .replace("Dtc_", "")
                                .replace("Hcp_", "")
                                .replace("_Velo", "")
                                .replace("_", " ")
                                .replace("_", " ")
                                .toLowerCase()}
                          </td>
                          <td className="py-2 px-4 border-b">${spend}</td>
                          <td className="py-2 px-4 border-b">${channelReturn}</td>
                          <td className="py-2 px-4 border-b">
                            <input
                              type="checkbox"
                              checked={lockedChannels.velo[name] || false}
                              onChange={() => handleCheckboxChange("velo", name)}
                            />
                          </td>
                            <td className="py-2 px-2 border-b">
                          <input
                            type="number"
                            className="w-20 p-1 text-black"
                            placeholder="Min"
                            value={channelLimits[name]?.lower || ""}
                            onChange={(e) => handleLimitChange(name, "lower", e.target.value)}
                          />
                        </td>
                        <td className="py-2 px-2 border-b">
                          <input
                            type="number"
                            className="w-20 p-1 text-black"
                            placeholder="Max"
                            value={channelLimits[name]?.upper || ""}
                            onChange={(e) => handleLimitChange(name, "upper", e.target.value)}
                          />
                        </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div> 
            </div>

            {/* Grizzly Channels Section */}
            <div>
              <h3 className="text-rose-700 text-lg font-semibold mb-4">
                Grizzly Channels
                <input
                  type="checkbox"
                  className="ml-3"
                  checked={lockedChannels.grizzly?.locked}
                  onChange={() => handleCheckboxChange("grizzly", "locked")}
                />
                <span className="ml-2 text-gray-800">Freeze Grizzly Section</span>
              </h3>
              <div className="mb-6">
                <h4 className="text-rose-700 text-md font-medium mb-2">
                  DTC Section
                  <input
                    type="checkbox"
                    className="ml-3"
                    checked={lockedChannels.grizzly?.dtc}
                    onChange={() => handleSectionCheckboxChange("grizzly", "dtc")}
                  />
                  <span className="ml-2 text-gray-800">Freeze DTC Section</span>
                </h4>
                <table className="min-w-full bg-rose-800 text-white border border-rose-700">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b">Channel</th>
                      <th className="py-2 px-4 border-b">Spend</th>
                      <th className="py-2 px-4 border-b">Return</th>
                      <th className="py-2 px-4 border-b">Freeze Channel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channelRows
                      .filter(({ name }) => name.toLowerCase().includes("grizzly") && name.toLowerCase().includes("dtc") )
                      .map(({ name, spend, channelReturn }) => (
                        <tr key={name}>
                          <td className="py-2 px-4 border-b">{name
                                .replace("Dtc_", "")
                                .replace("Hcp_", "")
                                .replace("_Grizzly", "")
                                .replace("_", " ")
                                .replace("_", " ")
                                .toLowerCase()}
                          </td>                              
                          <td className="py-2 px-4 border-b">${spend}</td>
                          <td className="py-2 px-4 border-b">${channelReturn}</td>
                          <td className="py-2 px-4 border-b">
                            <input
                              type="checkbox"
                              checked={lockedChannels.grizzly[name] || false}
                              onChange={() => handleCheckboxChange("grizzly", name)}
                            />
                          </td>
                            <td className="py-2 px-2 border-b">
                          <input
                            type="number"
                            className="w-20 p-1 text-black"
                            placeholder="Min"
                            value={channelLimits[name]?.lower || ""}
                            onChange={(e) => handleLimitChange(name, "lower", e.target.value)}
                          />
                        </td>
                        <td className="py-2 px-2 border-b">
                          <input
                            type="number"
                            className="w-20 p-1 text-black"
                            placeholder="Max"
                            value={channelLimits[name]?.upper || ""}
                            onChange={(e) => handleLimitChange(name, "upper", e.target.value)}
                          />
                        </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="mb-6">
                <h4 className="text-rose-700 text-md font-medium mb-2">
                  HCP Section
                  <input
                    type="checkbox"
                    className="ml-3"
                    checked={lockedChannels.grizzly?.hcp}
                    onChange={() => handleSectionCheckboxChange("grizzly", "hcp")}
                  />
                  <span className="ml-2 text-gray-800">Freeze HCP Section</span>
                </h4>
                <table className="min-w-full bg-rose-800 text-white border border-rose-700">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b">Channel</th>
                      <th className="py-2 px-4 border-b">Spend</th>
                      <th className="py-2 px-4 border-b">Return</th>
                      <th className="py-2 px-4 border-b">Freeze Channel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channelRows
                      .filter(({ name }) => name.toLowerCase().includes("grizzly") && name.toLowerCase().includes("hcp") )
                      .map(({ name, spend, channelReturn }) => (
                        <tr key={name}>
                          <td className="py-2 px-4 border-b">{name
                                .replace("Dtc_", "")
                                .replace("Hcp_", "")
                                .replace("_Grizzly", "")
                                .replace("_", " ")
                                .replace("_", " ")
                                .toLowerCase()}
                          </td>                               
                          <td className="py-2 px-4 border-b">${spend}</td>
                          <td className="py-2 px-4 border-b">${channelReturn}</td>
                          <td className="py-2 px-4 border-b">
                            <input
                              type="checkbox"
                              checked={lockedChannels.grizzly[name] || false}
                              onChange={() => handleCheckboxChange("grizzly", name)}
                            />
                          </td>
                            <td className="py-2 px-2 border-b">
                          <input
                            type="number"
                            className="w-20 p-1 text-black"
                            placeholder="Min"
                            value={channelLimits[name]?.lower || ""}
                            onChange={(e) => handleLimitChange(name, "lower", e.target.value)}
                          />
                        </td>
                        <td className="py-2 px-2 border-b">
                          <input
                            type="number"
                            className="w-20 p-1 text-black"
                            placeholder="Max"
                            value={channelLimits[name]?.upper || ""}
                            onChange={(e) => handleLimitChange(name, "upper", e.target.value)}
                          />
                        </td>                        
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
                            <div className="mb-6">
                <h4 className="text-rose-700 text-md font-medium mb-2">
                  Other Section
                  <input
                    type="checkbox"
                    className="ml-3"
                    checked={lockedChannels.grizzly?.other}
                    onChange={() => handleSectionCheckboxChange("grizzly",'other')}
                  />
                  <span className="ml-2 text-gray-800">Freeze Other Section</span>
                </h4>
                <table className="min-w-full bg-rose-800 text-white border border-rose-700">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b">Channel</th>
                      <th className="py-2 px-4 border-b">Spend</th>
                      <th className="py-2 px-4 border-b">Return</th>
                      <th className="py-2 px-4 border-b">Freeze Channel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channelRows
                      .filter(({ name }) => name.toLowerCase().includes("grizzly") && !name.toLowerCase().includes("dtc")&& !name.toLowerCase().includes("hcp"))
                      .map(({ name, spend, channelReturn }) => (
                        <tr key={name}>
                          <td className="py-2 px-4 border-b">{name
                                .replace("Dtc_", "")
                                .replace("Hcp_", "")
                                .replace("_Grizzly", "")
                                .replace("_", " ")
                                .replace("_", " ")
                                .toLowerCase()}
                          </td>
                          <td className="py-2 px-4 border-b">${spend}</td>
                          <td className="py-2 px-4 border-b">${channelReturn}</td>
                          <td className="py-2 px-4 border-b">
                            <input
                              type="checkbox"
                              checked={lockedChannels.grizzly[name] || false}
                              onChange={() => handleCheckboxChange("grizzly", name)}
                            />
                          </td>
                            <td className="py-2 px-2 border-b">
                          <input
                            type="number"
                            className="w-20 p-1 text-black"
                            placeholder="Min"
                            value={channelLimits[name]?.lower || ""}
                            onChange={(e) => handleLimitChange(name, "lower", e.target.value)}
                          />
                        </td>
                        <td className="py-2 px-2 border-b">
                          <input
                            type="number"
                            className="w-20 p-1 text-black"
                            placeholder="Max"
                            value={channelLimits[name]?.upper || ""}
                            onChange={(e) => handleLimitChange(name, "upper", e.target.value)}
                          />
                        </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div> 
            </div>
          </motion.div>
      <div className="mb-10">
      </div>


 
        </main>
      </div>
    </div>
  );
};

export default OptimizationPage;
