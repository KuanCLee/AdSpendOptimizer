import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#881337", "#db2777"]; // Colors for two lines

const OverviewChart = ({data}) => {
  const [salesData, setSalesData] = useState([]);

  useEffect(() => {
    setSalesData(data);
  }, [data]);
  
  return (
    <motion.div
      className="bg-gray-50 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <h2 className="text-lg font-medium mb-4 text-pink-700">Rx Overview</h2>



      <div className="grid grid-cols-1 gap-8 h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={salesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
            <XAxis dataKey="name" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(31, 41, 55, 0.8)",
                borderColor: "#4B5563",
              }}
              itemStyle={{ color: "#E5E7EB" }}
              formatter={(value) => `${value.toFixed(2)}`}
            />
            <Line
              type="monotone"
              dataKey="actual_rx"
              stroke={COLORS[0]}
              strokeWidth={3}
              dot={{ fill: COLORS[0], strokeWidth: 2, r: 6 }}
              activeDot={{ r: 8, strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="pred_rx"
              stroke={COLORS[1]}
              strokeWidth={3}
              dot={{ fill: COLORS[1], strokeWidth: 2, r: 6 }}
              activeDot={{ r: 8, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default OverviewChart;
