import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

const OptimizationTable = ({
  startingSpends,
  optimizationResult,
  estimatedReturn,
  handleStartingSpendChange,
  getOptimizedChange,
  getROI,
}) => {
  const allTactics = ["PDE", "Email", "PaidSearch"];
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredTactics, setFilteredTactics] = useState(allTactics);

  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    setFilteredTactics(
      allTactics.filter((tactic) => tactic.toLowerCase().includes(lower))
    );
  }, [searchTerm]);

  const getNewSpend = (tactic) => {
    return tactic === "PDE"
      ? optimizationResult.spend_A
      : tactic === "Email"
      ? optimizationResult.spend_B
      : optimizationResult.spend_C;
  };

  return (
    <motion.div
    className='bg-violet-500 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700'
    initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-rose-700">Optimization Results</h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Filter tactics..."
            className="bg-gray-100 text-gray-700 placeholder-gray-400 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>
      </div>

      <div className="overflow-x-auto">
      <table className='bg-violet-500 min-w-full divide-y divide-gray-700'>
      <thead className="bg-violet-500 text-rose-700">
            <tr>
              <th className="px-6 py-3 text-left font-medium uppercase tracking-wider">Tactic</th>
              <th className="px-6 py-3 text-left font-medium uppercase tracking-wider">Starting Spend</th>
              <th className="px-6 py-3 text-left font-medium uppercase tracking-wider">New Spend</th>
              <th className="px-6 py-3 text-left font-medium uppercase tracking-wider">Optimized Change</th>
              <th className="px-6 py-3 text-left font-medium uppercase tracking-wider">ROI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-violet-100 text-gray-100">
            {filteredTactics.map((tactic) => {
              const newSpend = getNewSpend(tactic);
              return (
                <motion.tr key={tactic} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{tactic}</td>
                  <td className="text-gray-600 px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      className="w-full border rounded px-2 py-1"
                      value={startingSpends[tactic]}
                      onChange={(e) => handleStartingSpendChange(tactic, e.target.value)}
                    />
                  </td>
                  <td className="text-green-500 px-6 py-4 whitespace-nowrap">${newSpend.toFixed(2)}</td>
                  <td className="text-gray-500 px-6 py-4 whitespace-nowrap">
                    {getOptimizedChange(startingSpends[tactic], newSpend)}
                  </td>
                  <td className="text-gray-500 px-6 py-4 whitespace-nowrap">
                    {getROI(newSpend, estimatedReturn[tactic])}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default OptimizationTable;
