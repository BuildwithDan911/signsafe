import { notFound } from "next/navigation";
import LabClient from "./LabClient";

export const metadata = {
  title: "SignSafe - Clocked Integration Lab",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LabPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <LabClient />;
}
