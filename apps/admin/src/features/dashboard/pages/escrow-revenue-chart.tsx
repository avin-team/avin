import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@avin/ui/components/chart";
import type { ChartConfig } from "@avin/ui/components/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

const chartConfig = {
  escrowHold: {
    color: "var(--color-escrowHold, #3b82f6)",
    label: "Dòng tiền Escrow (VND)",
  },
  revenue: {
    color: "var(--color-revenue, #10b981)",
    label: "Phí sàn thu được (VND)",
  },
} satisfies ChartConfig;

const formatShortCurrency = (value: number): string => {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B ₫`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M ₫`;
  }
  return `${(value / 1000).toFixed(0)}K ₫`;
};

const formatCurrencyVND = (value: number): string =>
  `${value.toLocaleString("vi-VN")} ₫`;

const renderTooltipFormatter = (
  value: unknown,
  name: unknown
): React.ReactNode => (
  <div className="flex items-center justify-between gap-4 w-full">
    <span className="text-muted-foreground">
      {name === "escrowHold" ? "Escrow Hold" : "Phí sàn"}
    </span>
    <span className="font-semibold">{formatCurrencyVND(Number(value))}</span>
  </div>
);

export const EscrowRevenueChart = ({
  data,
}: {
  data: { date: string; escrowHold: number; revenue: number }[];
}) => (
  <ChartContainer config={chartConfig} className="h-full w-full">
    <AreaChart data={data} margin={{ bottom: 0, left: 10, right: 10, top: 10 }}>
      <defs>
        <linearGradient id="fillEscrow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
      <YAxis
        tickLine={false}
        axisLine={false}
        tickFormatter={formatShortCurrency}
        width={60}
      />
      <ChartTooltip
        content={<ChartTooltipContent formatter={renderTooltipFormatter} />}
      />
      <Area
        type="monotone"
        dataKey="escrowHold"
        stroke="#3b82f6"
        strokeWidth={2}
        fillOpacity={1}
        fill="url(#fillEscrow)"
        name="escrowHold"
      />
      <Area
        type="monotone"
        dataKey="revenue"
        stroke="#10b981"
        strokeWidth={2}
        fillOpacity={1}
        fill="url(#fillRevenue)"
        name="revenue"
      />
    </AreaChart>
  </ChartContainer>
);
