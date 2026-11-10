/**
 * Calculator tool registry (PRD §5, §6, §7).
 * Single source of truth for tool metadata, categories, and search keywords.
 */

import type {
  CalculatorMeta,
  CalculatorCategory,
  CalculatorId,
  CategoryMeta,
  SearchResult,
} from "../types";

// ── Categories (PRD §5.1) ────────────────────────────────────

export const CATEGORIES: CategoryMeta[] = [
  {
    id: "basic-math",
    name: "Basic Mathematics",
    description: "Everyday arithmetic and percentage calculations",
    icon: "calculator",
  },
  {
    id: "scientific-math",
    name: "Scientific Mathematics",
    description: "Trigonometry, logarithms, powers and more",
    icon: "flask",
  },
  {
    id: "financial",
    name: "Financial Calculations",
    description: "GST, EMI, loans, interest and tax",
    icon: "banknote",
  },
  {
    id: "shopping-discounts",
    name: "Shopping & Discounts",
    description: "Discounts, offers, BOGO and bill estimation",
    icon: "shopping-cart",
  },
  {
    id: "date-time",
    name: "Date & Time",
    description: "Age, date difference, countdown and durations",
    icon: "calendar",
  },
  {
    id: "conversion",
    name: "Unit & Currency Conversion",
    description: "Convert units and currencies instantly",
    icon: "arrow-left-right",
  },
  {
    id: "personal",
    name: "Personal Calculations",
    description: "BMI, salary, split bills and daily utilities",
    icon: "user",
  },
];

// ── Tool registry ────────────────────────────────────────────

export const CALCULATORS: CalculatorMeta[] = [
  // ── Available (Phases 2–6) ──
  {
    id: "basic",
    name: "Basic Calculator",
    description: "Addition, subtraction, multiplication, division and percentages",
    category: "basic-math",
    icon: "calculator",
    keywords: [
      "calculator", "basic", "arithmetic", "add", "subtract", "multiply",
      "divide", "plus", "minus", "times", "math", "quick calc",
    ],
    status: "available",
    route: "/calculator/basic",
  },
  {
    id: "scientific",
    name: "Scientific Calculator",
    description: "sin, cos, tan, log, ln, powers, roots, factorial and more",
    category: "scientific-math",
    icon: "flask",
    keywords: [
      "scientific", "sin", "cos", "tan", "trigonometry", "log", "ln",
      "logarithm", "power", "root", "sqrt", "factorial", "pi", "euler",
      "radians", "degrees", "equation",
    ],
    status: "available",
    route: "/calculator/scientific",
  },
  {
    id: "gst",
    name: "GST Calculator",
    description: "Calculate GST inclusive or exclusive with CGST, SGST and IGST",
    category: "financial",
    icon: "percent",
    keywords: [
      "gst", "tax", "goods and services tax", "cgst", "sgst", "igst",
      "how much gst", "gst rate", "inclusive", "exclusive", "indirect tax",
      "intra-state", "inter-state",
    ],
    status: "available",
    route: "/calculator/gst",
  },
  {
    id: "emi",
    name: "EMI Calculator",
    description: "Monthly loan instalment with amortisation schedule",
    category: "financial",
    icon: "landmark",
    keywords: [
      "emi", "loan", "monthly payment", "instalment", "installment",
      "monthly loan payment", "home loan", "car loan", "personal loan",
      "amortisation", "amortization", "repayment",
    ],
    status: "available",
    route: "/calculator/emi",
  },
  {
    id: "interest",
    name: "Loan & Interest Calculator",
    description: "Simple and compound interest with flexible compounding",
    category: "financial",
    icon: "trending-up",
    keywords: [
      "interest", "simple interest", "compound interest", "loan",
      "maturity", "principal", "compounding", "quarterly", "half-yearly",
      "fd", "fixed deposit", "savings",
    ],
    status: "available",
    route: "/calculator/interest",
  },
  {
    id: "percentage",
    name: "Percentage Calculator",
    description: "10 modes: find %, increase, decrease, reverse and more",
    category: "basic-math",
    icon: "percent",
    keywords: [
      "percentage", "percent", "%", "increase", "decrease", "difference",
      "reverse percentage", "discount percent", "profit", "loss", "marks",
      "what percent", "x is what percent",
    ],
    status: "available",
    route: "/calculator/percentage",
  },
  {
    id: "discount",
    name: "Discount & Shopping Calculator",
    description: "Calculate exactly what you pay — discounts, BOGO, bills",
    category: "shopping-discounts",
    icon: "tag",
    keywords: [
      "discount", "off", "sale", "offer", "20% off", "how much off",
      "shop", "shopping", "mrp", "price", "payable", "bogo",
      "buy one get one", "buy x get y", "coupon", "cashback",
      "counter bill", "basket", "compare offers",
    ],
    status: "available",
    priority: "high",
    route: "/calculator/discount",
  },
  {
    id: "age",
    name: "Age Calculator",
    description: "Exact age from date of birth with next birthday countdown",
    category: "date-time",
    icon: "cake",
    keywords: [
      "age", "birthday", "date of birth", "dob", "how old", "born",
      "next birthday", "days until birthday", "age on date",
    ],
    status: "available",
    route: "/calculator/age",
  },
  {
    id: "date-time",
    name: "Date & Time Calculator",
    description: "Date difference, add/subtract days, working days, countdown",
    category: "date-time",
    icon: "calendar",
    keywords: [
      "date", "time", "days between", "date difference", "countdown",
      "add days", "subtract days", "working days", "duration",
      "time difference", "weeks", "months", "elapsed",
    ],
    status: "available",
    route: "/calculator/date-time",
  },
  {
    id: "unit",
    name: "Unit Converter",
    description: "Convert length, weight, temperature, area, speed and more",
    category: "conversion",
    icon: "arrow-left-right",
    keywords: [
      "convert", "unit", "converter", "length", "weight", "temperature",
      "kg to pounds", "miles", "celsius", "fahrenheit", "area", "volume",
      "speed", "storage", "pressure", "energy", "cm to inches", "metres",
    ],
    status: "available",
    route: "/calculator/unit",
  },
  {
    id: "currency",
    name: "Currency Calculator",
    description: "Live exchange rates with caching and freshness indicators",
    category: "conversion",
    icon: "coins",
    keywords: [
      "currency", "exchange rate", "convert money", "inr", "usd", "eur",
      "gbp", "dollar", "rupee", "forex", "foreign exchange", "money",
      "how much usd", "rate",
    ],
    status: "available",
    route: "/calculator/currency",
  },

  // ── Planned (Phase 7+ / PRD §7) ──
  {
    id: "salary",
    name: "Salary Calculator",
    description: "In-hand salary, deductions and take-home pay",
    category: "financial",
    icon: "wallet",
    keywords: [
      "salary", "in-hand", "take home", "deduction", "ctc", "pay",
      "gross salary", "inhand", "offer letter",
    ],
    status: "available",
    route: "/calculator/salary",
  },
  {
    id: "profit-loss",
    name: "Profit & Loss Calculator",
    description: "Profit margin, markup, cost price and selling price",
    category: "financial",
    icon: "chart",
    keywords: [
      "profit", "loss", "margin", "markup", "cost price", "selling price",
      "profit percent", "gain", "cp", "sp", "how much profit",
    ],
    status: "available",
    route: "/calculator/profit-loss",
  },
  {
    id: "ratio",
    name: "Ratio & Proportion Calculator",
    description: "Simplify ratios and solve proportions",
    category: "basic-math",
    icon: "equal",
    keywords: ["ratio", "proportion", "simplify", "fraction"],
    status: "planned",
    route: "/calculator/ratio",
  },
  {
    id: "split-bill",
    name: "Split Bill Calculator",
    description: "Split expenses fairly among friends",
    category: "personal",
    icon: "users",
    keywords: ["split", "bill", "share", "friends", "group", "expense split"],
    status: "planned",
    route: "/calculator/split-bill",
  },
  {
    id: "bmi",
    name: "BMI Calculator",
    description: "Body Mass Index with category guidance",
    category: "personal",
    icon: "heart",
    keywords: ["bmi", "body mass index", "weight", "height", "health", "obesity"],
    status: "planned",
    route: "/calculator/bmi",
  },
  {
    id: "fuel",
    name: "Fuel Cost Calculator",
    description: "Trip fuel cost and mileage",
    category: "personal",
    icon: "fuel",
    keywords: ["fuel", "petrol", "diesel", "mileage", "trip", "gas"],
    status: "planned",
    route: "/calculator/fuel",
  },
  {
    id: "electricity",
    name: "Electricity Calculator",
    description: "Bill estimate from units consumed",
    category: "personal",
    icon: "zap",
    keywords: ["electricity", "power", "units", "bill", "energy consumption"],
    status: "planned",
    route: "/calculator/electricity",
  },
];

// ── Lookup helpers ───────────────────────────────────────────

export function getCalculator(id: CalculatorId): CalculatorMeta | undefined {
  return CALCULATORS.find((c) => c.id === id);
}

export function getCalculatorsByCategory(
  category: CalculatorCategory,
): CalculatorMeta[] {
  return CALCULATORS.filter((c) => c.category === category);
}

export function getAvailableCalculators(): CalculatorMeta[] {
  return CALCULATORS.filter((c) => c.status === "available");
}

export function getCategory(id: CalculatorCategory): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

// ── Search (PRD §5.1) ───────────────────────────────────────

/**
 * Search calculators by name, description, keywords and synonyms.
 * Scores matches so the best result appears first.
 */
export function searchCalculators(
  query: string,
  options?: { includePlanned?: boolean },
): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const pool = options?.includePlanned
    ? CALCULATORS
    : CALCULATORS.filter((c) => c.status === "available");

  const terms = q.split(/\s+/).filter(Boolean);
  const results: SearchResult[] = [];

  for (const tool of pool) {
    let bestScore = 0;
    let matchedOn = "";

    const name = tool.name.toLowerCase();
    const desc = tool.description.toLowerCase();

    for (const term of terms) {
      // Exact name match — strongest signal
      if (name === term) {
        if (100 > bestScore) {
          bestScore = 100;
          matchedOn = tool.name;
        }
      }
      // Name contains term
      else if (name.includes(term)) {
        const score = 70 + (term.length / name.length) * 10;
        if (score > bestScore) {
          bestScore = score;
          matchedOn = tool.name;
        }
      }
      // Keyword match (synonyms etc.)
      const keywordHit = tool.keywords.find(
        (k) => k === term || k.includes(term) || term.includes(k),
      );
      if (keywordHit) {
        const score = keywordHit === term ? 80 : 55;
        if (score > bestScore) {
          bestScore = score;
          matchedOn = keywordHit;
        }
      }
      // Description match — weakest
      if (desc.includes(term)) {
        const score = 30;
        if (score > bestScore) {
          bestScore = score;
          matchedOn = tool.description;
        }
      }
    }

    // Multi-term bonus: all terms matched somewhere
    if (terms.length > 1) {
      const allMatched = terms.every(
        (t) =>
          name.includes(t) ||
          desc.includes(t) ||
          tool.keywords.some((k) => k.includes(t) || t.includes(k)),
      );
      if (allMatched) bestScore += 15;
    }

    if (bestScore > 0) {
      // Boost high-priority tools slightly
      if (tool.priority === "high") bestScore += 5;
      results.push({ tool, score: bestScore, matchedOn });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
