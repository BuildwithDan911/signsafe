import React from "react";

interface PaperCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
  className?: string;
  badge?: string;
  badgeColor?: "default" | "red" | "amber" | "green";
  foldedCorner?: boolean;
  colorTab?: "red" | "amber" | "green" | "navy";
  tabLabel?: string;
}

const badgeColorMap = {
  default: "bg-[#14213D]/5 text-[#14213D] border-[#14213D]/10",
  red: "bg-[#D64545]/10 text-[#A62626] border-[#D64545]/20",
  amber: "bg-[#E8A33D]/10 text-[#8A560B] border-[#E8A33D]/25",
  green: "bg-[#2FA36B]/10 text-[#1E734A] border-[#2FA36B]/25",
};

const tabColorMap = {
  red: "bg-[#A62626] text-white",
  amber: "bg-[#E8A33D] text-[#14213D]",
  green: "bg-[#1E734A] text-white",
  navy: "bg-[#14213D] text-[#FBF8F1]",
};

export default function PaperCard({
  children,
  interactive = false,
  className = "",
  badge,
  badgeColor = "default",
  foldedCorner = false,
  colorTab,
  tabLabel,
  ...props
}: PaperCardProps) {
  const accessibleName = props["aria-label"] || badge || tabLabel || "SignSafe information card";

  const cardBody = (
    <div
      role="group"
      aria-label={accessibleName}
      className={`paper-card relative overflow-hidden p-5 sm:p-6 md:p-7 ${
        interactive ? "paper-card-interactive cursor-pointer" : ""
      } ${className}`}
      {...props}
    >
      {/* Folded Dog-Ear Corner */}
      {foldedCorner && (
        <div
          aria-hidden="true"
          className="absolute top-0 right-0 w-5 h-5 sm:w-6 sm:h-6 pointer-events-none z-20"
          style={{
            background: "linear-gradient(225deg, #FBF8F1 50%, #D8D2C5 50%)",
            borderBottomLeftRadius: "3px",
            boxShadow: "-1px 1px 3px rgba(20, 33, 61, 0.12)",
          }}
        />
      )}

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

  if (colorTab) {
    return (
      <div className="relative pt-2.5">
        <div className="absolute top-0 left-5 sm:left-6 z-10">
          <div
            className={`px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-t-md shadow-xs ${tabColorMap[colorTab]}`}
          >
            {tabLabel || colorTab}
          </div>
        </div>
        {cardBody}
      </div>
    );
  }

  return cardBody;
}
