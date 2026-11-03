import React from "react";

interface PaperCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
  className?: string;
  badge?: string;
  badgeColor?: "default" | "red" | "amber" | "green";
}

const badgeColorMap = {
  default: "bg-[#14213D]/5 text-[#14213D] border-[#14213D]/10",
  red: "bg-[#D64545]/10 text-[#D64545] border-[#D64545]/20",
  amber: "bg-[#E8A33D]/10 text-[#B87518] border-[#E8A33D]/25",
  green: "bg-[#2FA36B]/10 text-[#1E734A] border-[#2FA36B]/25",
};

export default function PaperCard({
  children,
  interactive = false,
  className = "",
  badge,
  badgeColor = "default",
  ...props
}: PaperCardProps) {
  return (
    <div
      className={`paper-card relative overflow-hidden p-5 sm:p-6 md:p-7 ${
        interactive ? "paper-card-interactive cursor-pointer" : ""
      } ${className}`}
      {...props}
    >
      {badge && (
        <div className="mb-3 flex items-center">
          <span
            className={`inline-block text-[11px] font-mono font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full border ${badgeColorMap[badgeColor]}`}
          >
            {badge}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
