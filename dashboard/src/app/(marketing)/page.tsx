import { Hero } from "@/components/marketing/sections/hero";
import { Problem } from "@/components/marketing/sections/problem";
import { Architecture } from "@/components/marketing/sections/architecture";
import { Features } from "@/components/marketing/sections/features";
import { DetectionEngine } from "@/components/marketing/sections/detection-engine";
import { Technology } from "@/components/marketing/sections/technology";
import { InteractiveDemo } from "@/components/marketing/sections/interactive-demo";
import { FAQ } from "@/components/marketing/sections/faq";
import { CTA } from "@/components/marketing/sections/cta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Problem />
      <Architecture />
      <Features />
      <DetectionEngine />
      <Technology />
      <InteractiveDemo />
      <FAQ />
      <CTA />
    </>
  );
}
