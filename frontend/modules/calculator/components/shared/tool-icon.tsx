import type { ComponentType } from "react";
import {
  ArrowLeftRight,
  Banknote,
  BarChart3,
  Calculator,
  CakeSlice,
  CalendarDays,
  Coins,
  Equal,
  FlaskConical,
  Fuel,
  HeartPulse,
  Landmark,
  Percent,
  ShoppingCart,
  Tag,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

/** Icon resolver for tool/category icons by registry icon name. */
const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  calculator: Calculator,
  flask: FlaskConical,
  percent: Percent,
  banknote: Banknote,
  "shopping-cart": ShoppingCart,
  tag: Tag,
  landmark: Landmark,
  "trending-up": TrendingUp,
  cake: CakeSlice,
  calendar: CalendarDays,
  "arrow-left-right": ArrowLeftRight,
  coins: Coins,
  wallet: Wallet,
  chart: BarChart3,
  equal: Equal,
  users: Users,
  heart: HeartPulse,
  fuel: Fuel,
  zap: Zap,
};

export function ToolIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? ICONS.calculator!;
  return <Icon className={className} />;
}
