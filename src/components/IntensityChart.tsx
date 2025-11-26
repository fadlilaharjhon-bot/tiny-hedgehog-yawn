import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface ChartData {
  time: string;
  intensity: number;
}

interface IntensityChartProps {
  data: ChartData[];
}

const IntensityChart = ({ data }: IntensityChartProps) => {
  return (
    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 text-white">
      <CardHeader>
        <CardTitle>Grafik Intensitas Real-time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.2)" />
              <XAxis dataKey="time" stroke="rgba(255, 255, 255, 0.7)" />
              <YAxis domain={[0, 1023]} stroke="rgba(255, 255, 255, 0.7)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(20, 20, 30, 0.8)",
                  borderColor: "rgba(255, 255, 255, 0.3)",
                  color: "white"
                }}
                labelStyle={{ color: "#aaa" }}
              />
              <Line
                type="monotone"
                dataKey="intensity"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default IntensityChart;