"use client";

import { secondsToPixels, formatTime, PIXELS_PER_SECOND, LABEL_WIDTH } from "@/lib/timelineUtils";

interface Props {
  totalDuration: number;
}

export default function TimelineRuler({ totalDuration }: Props) {
  const totalWidth = secondsToPixels(totalDuration) + 24;
  const tickInterval = PIXELS_PER_SECOND >= 60 ? 1 : 5;

  const majorTicks: number[] = [];
  for (let s = 0; s <= totalDuration; s += tickInterval) {
    majorTicks.push(s);
  }

  const midTicks: number[] = [];
  for (let s = tickInterval / 2; s < totalDuration; s += tickInterval) {
    midTicks.push(s);
  }

  return (
    <div
      className="relative h-7 bg-gray-50 border-b border-gray-200 select-none flex-shrink-0"
      style={{ width: totalWidth + LABEL_WIDTH, minWidth: "100%" }}
    >
      <div style={{ width: LABEL_WIDTH }} className="absolute left-0 top-0 h-full bg-gray-50 border-r border-gray-200" />
      <div style={{ position: "absolute", left: LABEL_WIDTH, top: 0, right: 0, bottom: 0 }}>

        {midTicks.map((s) => (
          <div
            key={`mid-${s}`}
            className="absolute top-0 -translate-x-1/2"
            style={{ left: secondsToPixels(s) }}
          >
            <div className="w-px h-1.5 bg-gray-300" />
          </div>
        ))}

        {majorTicks.map((s) => (
          <div
            key={`major-${s}`}
            className="absolute top-0 flex flex-col items-center -translate-x-1/2"
            style={{ left: secondsToPixels(s) }}
          >
            <div className="w-px h-3 bg-gray-300" />
            <span className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">
              {formatTime(s)}
            </span>
          </div>
        ))}

        {totalDuration % tickInterval !== 0 && (
          <div
            className="absolute top-0 flex flex-col items-center -translate-x-1/2"
            style={{ left: secondsToPixels(totalDuration) }}
          >
            <div className="w-px h-3" style={{ backgroundColor: "#C4842A" }} />
            <span className="text-[10px] mt-0.5 whitespace-nowrap" style={{ color: "#C4842A" }}>
              {formatTime(totalDuration)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
