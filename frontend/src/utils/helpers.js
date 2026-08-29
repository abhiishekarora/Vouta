export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const INR = (n) =>
  "\u20B9" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export const monthKey = (d) => {
  const dt = new Date(d);
  return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0");
};

export const monthLabel = (key) => {
  if (!key || !key.includes("-")) return "";
  const [y, m] = key.split("-");
  const dt = new Date(Number(y), Number(m) - 1, 1);
  return dt.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const EXPENSE_CATEGORIES = [
  "Rent", "Salaries", "Marketing", "Software & tools", "Travel",
  "Food", "Utilities", "Compliance & legal", "Manufacturing", "Other",
];

export const INCOME_CATEGORIES = ["Sales", "Investment", "Loan", "Refund", "Other"];

export const STAMP_STYLES = {
  paid: { label: "Paid", color: "var(--teal)" },
  sent: { label: "Sent", color: "var(--brass)" },
  draft: { label: "Draft", color: "var(--ink-soft)" },
  overdue: { label: "Overdue", color: "var(--brick)" },
};

export const PRIORITY_STYLES = {
  high: { label: "High", color: "var(--brick)" },
  medium: { label: "Medium", color: "var(--brass)" },
  low: { label: "Low", color: "var(--ink-soft)" },
};

export const DOCUMENT_CATEGORIES = [
  "Incorporation & registration",
  "Board resolutions & minutes",
  "Statutory registers",
  "Certificates & licenses",
  "Agreements & contracts",
  "IP & trademark",
  "Banking & financial",
  "Policies",
  "Insurance",
  "Other",
];

export const MANUAL_DOC_STATUSES = ["Filed", "Pending", "Valid"];

export const DOC_STATUS_STYLES = {
  Valid: { color: "var(--teal)" },
  "Expiring soon": { color: "var(--brass)" },
  Expired: { color: "var(--brick)" },
  Filed: { color: "var(--ink-soft)" },
  Pending: { color: "var(--ink-soft)" },
};

export function computeDocStatus(doc) {
  if (!doc.expiryDate) return doc.status || "Filed";
  const today = new Date(todayISO());
  const exp = new Date(doc.expiryDate);
  const diffDays = Math.floor((exp - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "Expired";
  if (diffDays <= 30) return "Expiring soon";
  return "Valid";
}

export const BUSINESS_TYPES = [
  "Private Limited Company",
  "Limited Liability Partnership (LLP)",
  "Partnership Firm",
  "Sole Proprietorship",
  "One Person Company (OPC)",
  "Public Limited Company",
  "Section 8 / Nonprofit",
  "Other",
];

export const DEPARTMENTS = [
  "Engineering",
  "Design",
  "Product",
  "Marketing",
  "Operations",
  "Sales",
  "Legal & Compliance",
  "Other",
];

export const PROJECT_STATUSES = ["Not Started", "Active", "Blocked", "Completed"];

export const PRIORITY_COLORS = {
  high: "var(--brick)",
  medium: "var(--brass)",
  low: "var(--ink-soft)",
};

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// hashPassword removed — passwords are hashed server-side with bcrypt.
