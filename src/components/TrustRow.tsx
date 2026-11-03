import React from "react";
import { Lock, Scale, CheckCircle } from "lucide-react";

export default function TrustRow() {
  const trustPoints = [
    {
      icon: Lock,
      title: "Your key stays on our server",
      description: "Document processing runs strictly within secure server boundaries.",
    },
    {
      icon: Scale,
      title: "Signals add up, nothing alone is a verdict",
      description: "Multiple warning signs provide context. You always make the final decision.",
    },
    {
      icon: CheckCircle,
      title: "Every warning tells you one thing to check yourself",
      description: "Direct, actionable verification steps instead of vague AI scores.",
    },
  ];

  return (
    <section className="w-full max-w-[1100px] mx-auto my-12 sm:my-16 px-4">
      <div className="bg-[#FAF7F0] border border-[#14213D]/10 rounded-2xl p-6 sm:p-10 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {trustPoints.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex items-start gap-3.5">
                <div className="p-2 rounded-lg bg-[#FFFFFF] border border-[#14213D]/10 text-[#14213D] shadow-2xs flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-[#14213D]" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-serif text-base sm:text-[17px] font-bold text-[#14213D] leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-xs sm:text-[14px] text-[#14213D]/70 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
