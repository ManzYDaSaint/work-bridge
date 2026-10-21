import { Metadata } from "next";
import GrowthDashboardClient from "./GrowthDashboardClient";

export const metadata: Metadata = {
  title: "Growth Agent & Content Intelligence | Aganyu Admin",
  description: "AI-driven content strategist and editorial planner for Aganyu Founder and Company channels",
};

export default function GrowthPage() {
  return <GrowthDashboardClient />;
}
