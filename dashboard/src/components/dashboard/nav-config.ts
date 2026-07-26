import {
  LayoutDashboard,
  Radar,
  ShieldAlert,
  Clock,
  GitBranch,
  ScrollText,
  FileBarChart,
  ChartLine,
  Settings,
  MessagesSquare,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: "threats" | "incidents";
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Assistant",
    items: [
      { label: "AI Chat", href: "/chat", icon: MessagesSquare },
    ],
  },
  {
    title: "Monitor",
    items: [
      { label: "Overview", href: "/overview", icon: LayoutDashboard },
      { label: "Live Monitoring", href: "/monitoring", icon: Radar },
      { label: "Threat Detection", href: "/threats", icon: ShieldAlert, badgeKey: "threats" },
    ],
  },
  {
    title: "Investigate",
    items: [
      { label: "Attack Timeline", href: "/timeline", icon: Clock },
      { label: "Attack Graph", href: "/graph", icon: GitBranch },
      { label: "Logs", href: "/logs", icon: ScrollText },
    ],
  },
  {
    title: "Analyze",
    items: [
      { label: "Reports", href: "/reports", icon: FileBarChart },
      { label: "Analytics", href: "/analytics", icon: ChartLine },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);
