import type { Metadata } from "next";
import { HomeContent } from "./HomeContent";

export const metadata: Metadata = {
  title: "Landing Zone Console",
  description: "Manage Azure infrastructure and observability for the landing zone.",
};

export default function Home() {
  return <HomeContent />;
}
