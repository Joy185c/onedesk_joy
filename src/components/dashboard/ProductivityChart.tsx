'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, BarChart2 } from 'lucide-react';

interface TrendItem {
  day: string;
  completed: number;
  created: number;
}

interface ProductivityChartProps {
  trend: TrendItem[];
}

export const ProductivityChart: React.FC<ProductivityChartProps> = ({ trend }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxVal = Math.max(...trend.map((t) => Math.max(t.completed, t.created)), 20);

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-bold text-[#18251D] flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#20E34A]" />
            Weekly Delivery Velocity
          </CardTitle>
          <p className="text-xs text-[#778079] mt-0.5">
            Tasks completed vs created across all authorized projects.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#20E34A]" />
            <span className="text-[#5E6962] font-medium text-[11px]">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#CBD3CE]" />
            <span className="text-[#5E6962] font-medium text-[11px]">Created</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 flex-1 flex flex-col justify-end">
        {/* Visual Bar Chart */}
        <div className="h-44 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-[#E5E9E6]">
          {trend.map((item, idx) => {
            const completedHeight = Math.round((item.completed / maxVal) * 100);
            const createdHeight = Math.round((item.created / maxVal) * 100);
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={item.day}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute -top-10 z-10 px-2 py-1 rounded-lg bg-[#082F1B] text-white text-[10px] font-semibold whitespace-nowrap shadow-lg flex items-center gap-1.5">
                    <span className="text-[#20E34A]">{item.completed} completed</span>
                    <span className="text-[#849E8E]">/</span>
                    <span className="text-[#D2DFD7]">{item.created} created</span>
                  </div>
                )}

                {/* Bars Group */}
                <div className="w-full flex items-end justify-center gap-1.5 h-full">
                  {/* Created Bar */}
                  <div
                    className="w-2.5 sm:w-3.5 rounded-t-md bg-[#E5E9E6] group-hover:bg-[#CBD3CE] transition-all duration-300"
                    style={{ height: `${createdHeight}%` }}
                  />
                  {/* Completed Bar */}
                  <div
                    className="w-2.5 sm:w-3.5 rounded-t-md bg-[#20E34A] group-hover:bg-[#1BC640] transition-all duration-300 shadow-2xs"
                    style={{ height: `${completedHeight}%` }}
                  />
                </div>

                {/* Day Label */}
                <span className="text-[11px] font-semibold text-[#778079] mt-2 group-hover:text-[#18251D] transition-colors">
                  {item.day}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="mt-3 flex items-center justify-between text-xs text-[#778079]">
          <div className="flex items-center gap-1 text-[#064E24] font-medium text-[11px]">
            <TrendingUp className="w-3.5 h-3.5 text-[#20E34A]" />
            <span>Peak throughput recorded on Friday (16 completed)</span>
          </div>
          <span className="text-[11px]">7-day cycle</span>
        </div>
      </CardContent>
    </Card>
  );
};

