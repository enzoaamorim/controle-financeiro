import React, { useEffect, useMemo, useRef, useState } from "react";
import logoEA from "./assets/logo-ea.png";
import { supabase } from "./supabaseClient";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  Bell,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CreditCard,
  Database,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  Home,
  KeyRound,
  ListFilter,
  LogOut,
  Moon,
  PiggyBank,
  Plus,
  Repeat,
  RotateCcw,
  Save,
  Search,
  Upload,
  Settings,
  ShieldCheck,
  Sun,
  Target,
  Trash2,
  TrendingUp,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const THEME_KEY = "controle-financeiro-theme";
const EMAIL_CONFIRMATION_TARGET_KEY = "controle-financeiro-email-confirmation-target";
const PASSWORD_RECOVERY_TARGET_KEY = "controle-financeiro-password-recovery-target";
const MINIMUM_LOADING_TIME_MS = 1500;

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const defaultCategories = {
  income: ["Salário", "Freelance", "Venda", "Renda extra", "Reembolso", "Investimentos", "Outros"],
  expense: [
    "Mercado",
    "Transporte",
    "Alimentação",
    "Moradia",
    "Lazer",
    "Saúde",
    "Assinaturas",
    "Educação",
    "Dívidas",
    "Outros",
  ],
};

const paymentMethods = [
  "Pix",
  "Dinheiro",
  "Débito",
  "Crédito",
  "Cartão alimentação",
  "Cartão refeição",
  "Vale alimentação",
  "Vale refeição",
  "Boleto",
  "Transferência",
  "Débito automático",
  "Carteira digital",
  "Outro",
];

const cardTypes = ["Crédito", "Débito", "Crédito e Débito", "Alimentação", "Refeição", "Benefício", "Vale transporte", "Pré-pago", "Outro"];

const recurrenceTypes = [
  { value: "monthly", label: "Mensal", helper: "Todo mês no dia escolhido" },
  { value: "weekly", label: "Semanal", helper: "Toda semana a partir da data inicial" },
  { value: "biweekly", label: "Quinzenal", helper: "A cada 14 dias a partir da data inicial" },
  { value: "annual", label: "Anual", helper: "Uma vez por ano na data inicial" },
  { value: "custom_months", label: "A cada X meses", helper: "Repete no intervalo de meses definido" },
];

const monthOptions = [
  { value: "01", label: "janeiro" },
  { value: "02", label: "fevereiro" },
  { value: "03", label: "março" },
  { value: "04", label: "abril" },
  { value: "05", label: "maio" },
  { value: "06", label: "junho" },
  { value: "07", label: "julho" },
  { value: "08", label: "agosto" },
  { value: "09", label: "setembro" },
  { value: "10", label: "outubro" },
  { value: "11", label: "novembro" },
  { value: "12", label: "dezembro" },
];

const chartColors = ["#059669", "#2563eb", "#f59e0b", "#e11d48", "#8b5cf6", "#14b8a6", "#64748b", "#f97316"];

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function classNames(...items) {
  return items.filter(Boolean).join(" ");
}

function getUserDisplayName(session) {
  return session?.user?.user_metadata?.name || session?.user?.email?.split("@")[0] || "Usuário";
}

function validateEmail(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) return "Informe seu e-mail.";
  if (normalized.length > 254) return "O e-mail informado é muito longo.";
  if (normalized.includes(" ")) return "O e-mail não pode conter espaços.";

  const parts = normalized.split("@");
  if (parts.length !== 2) return "Digite um e-mail válido. Exemplo: nome@email.com.";

  const [localPart, domain] = parts;

  if (!localPart || !domain) return "Digite um e-mail válido. Exemplo: nome@email.com.";
  if (localPart.length > 64) return "A parte antes do @ está muito longa.";
  if (localPart.startsWith(".") || localPart.endsWith(".")) return "O e-mail não pode começar ou terminar com ponto.";
  if (normalized.includes("..")) return "O e-mail não pode ter pontos consecutivos.";

  const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
  if (!emailPattern.test(normalized)) return "Digite um e-mail válido. Exemplo: nome@email.com.";

  const domainLabels = domain.split(".");
  if (domainLabels.some((label) => !label || label.startsWith("-") || label.endsWith("-"))) {
    return "O domínio do e-mail parece inválido.";
  }

  const knownDomainCorrections = {
    "gmail.co": "gmail.com",
    "gmail.con": "gmail.com",
    "gmai.com": "gmail.com",
    "gmial.com": "gmail.com",
    "gmal.com": "gmail.com",
    "outlook.co": "outlook.com",
    "outlook.con": "outlook.com",
    "hotmail.co": "hotmail.com",
    "hotmail.con": "hotmail.com",
    "yahoo.co": "yahoo.com",
    "yahoo.con": "yahoo.com",
    "icloud.co": "icloud.com",
    "icloud.con": "icloud.com",
  };

  if (knownDomainCorrections[domain]) {
    return `Domínio inválido. Você quis dizer ${knownDomainCorrections[domain]}?`;
  }

  return "";
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDateBR(isoDate) {
  if (!isoDate || !isoDate.includes("-")) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function dateToISODate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODateSafe(value) {
  if (!value || typeof value !== "string" || !value.includes("-")) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) return null;
  return date;
}

function todayISODate() {
  return dateToISODate(new Date());
}

function normalizeOptionalCardDay(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.min(31, Math.max(1, Math.floor(number)));
}

function formatCardClosingDay(day) {
  const number = Number(day || 0);
  return number > 0 ? `Fecha dia ${number}` : "Sem fechamento";
}

function formatCardDueDay(day) {
  const number = Number(day || 0);
  return number > 0 ? `vence dia ${number}` : "sem vencimento";
}

function formatCardType(type) {
  return type || "Crédito";
}

function isCreditLikeCardType(type) {
  const normalized = String(type || "Crédito").toLowerCase();
  return normalized.includes("crédito") || normalized.includes("credito");
}

function isStoredValueCardType(type) {
  return !isCreditLikeCardType(type);
}

function getMonthEndISO(monthValue) {
  const [year, month] = String(monthValue || getCurrentMonth()).split("-");
  const lastDay = daysInMonth(year, month);
  return `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
}

function getAdjustmentLabel(type) {
  if (type === "credit") return "Crédito / recarga";
  if (type === "payment") return "Pagamento";
  return "Ajuste";
}

function isCardBasedPaymentMethod(method) {
  return ["Débito", "Crédito", "Cartão alimentação", "Cartão refeição", "Vale alimentação", "Vale refeição"].includes(method);
}

function cardMatchesPaymentMethod(card, method) {
  if (!card?.is_active) return false;

  const type = String(card.card_type || "Crédito").toLowerCase();
  const isCreditDebit =
    type.includes("crédito e débito") ||
    type.includes("credito e debito") ||
    type.includes("crédito/debito") ||
    type.includes("credito/debito");

  if (method === "Crédito") return type === "crédito" || type === "credito" || isCreditDebit;
  if (method === "Débito") return type === "débito" || type === "debito" || isCreditDebit;
  if (method === "Cartão alimentação" || method === "Vale alimentação") return type.includes("aliment");
  if (method === "Cartão refeição" || method === "Vale refeição") return type.includes("refei");

  return true;
}

function getCardOptionsForPaymentMethod(cards, method) {
  const activeCards = cards.filter((card) => card.is_active);

  if (!isCardBasedPaymentMethod(method)) return activeCards;

  return activeCards.filter((card) => cardMatchesPaymentMethod(card, method));
}

function normalizeTextForSearch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const expenseCategorySuggestionRules = [
  {
    category: "Alimentação",
    terms: [
      "mc donalds",
      "mcdonalds",
      "mc donald",
      "burger king",
      "bk",
      "ifood",
      "restaurante",
      "lanche",
      "pizza",
      "hamburguer",
      "padaria",
      "cafeteria",
      "starbucks",
      "subway",
      "delivery",
      "almoço",
      "almoco",
      "jantar",
    ],
  },
  {
    category: "Mercado",
    terms: ["mercado", "supermercado", "atacadao", "atacadão", "assai", "assaí", "carrefour", "extra", "pao de acucar", "pão de açúcar", "hortifruti", "feira"],
  },
  {
    category: "Transporte",
    terms: ["uber", "99", "taxi", "táxi", "combustivel", "combustível", "gasolina", "etanol", "posto", "metro", "metrô", "onibus", "ônibus", "estacionamento", "pedagio", "pedágio"],
  },
  {
    category: "Saúde",
    terms: ["farmacia", "farmácia", "drogaria", "drogasil", "droga raia", "raia", "consulta", "exame", "medico", "médico", "dentista", "remedio", "remédio"],
  },
  {
    category: "Lazer",
    terms: ["cinema", "show", "netflix", "spotify", "prime video", "disney", "hbo", "ingresso", "bar", "viagem", "passeio"],
  },
  {
    category: "Moradia",
    terms: ["aluguel", "condominio", "condomínio", "luz", "energia", "agua", "água", "internet", "vivo", "claro", "tim", "iptu", "manutencao", "manutenção"],
  },
  {
    category: "Educação",
    terms: ["faculdade", "curso", "udemy", "alura", "livro", "material", "escola", "mensalidade"],
  },
  {
    category: "Assinaturas",
    terms: ["assinatura", "icloud", "google one", "microsoft", "canva", "adobe", "app store", "play store"],
  },
  {
    category: "Dívidas",
    terms: ["emprestimo", "empréstimo", "financiamento", "parcela", "boleto", "acordo", "divida", "dívida"],
  },
];

function suggestCategoryFromDescription(description, type = "expense") {
  if (type !== "expense") return "";

  const normalized = normalizeTextForSearch(description);
  if (!normalized) return "";

  const rule = expenseCategorySuggestionRules.find((item) =>
    item.terms.some((term) => normalized.includes(normalizeTextForSearch(term)))
  );

  return rule?.category || "";
}

function maskDateBR(value) {
  const digits = value.replace(new RegExp("[^0-9]", "g"), "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function brDateToISO(value) {
  const digits = value.replace(new RegExp("[^0-9]", "g"), "");
  if (digits.length !== 8) return null;

  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  const iso = `${year}-${month}-${day}`;
  const date = new Date(`${iso}T00:00:00`);

  const isValid =
    date instanceof Date &&
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === Number(year) &&
    date.getMonth() + 1 === Number(month) &&
    date.getDate() === Number(day);

  return isValid ? iso : null;
}

function toNumber(value) {
  return Number(String(value || "").replace(",", "."));
}

function daysInMonth(year, month) {
  return new Date(Number(year), Number(month), 0).getDate();
}

function monthLabel(monthValue) {
  const [year, month] = monthValue.split("-");
  const label = monthOptions.find((item) => item.value === month)?.label || month;
  return `${label} de ${year}`;
}

function normalizeTransaction(row) {
  return {
    ...row,
    amount: Number(row.amount || 0),
  };
}

function normalizeGoal(row) {
  return {
    ...row,
    target_amount: Number(row.target_amount || 0),
    current_amount: Number(row.current_amount || 0),
  };
}

function normalizeLimit(row) {
  return {
    ...row,
    monthly_limit: Number(row.monthly_limit || 0),
  };
}

function normalizeRecurring(row) {
  const recurrenceType = row?.recurrence_type || "monthly";
  const intervalMonths = Math.max(1, Number(row?.interval_months || 1));

  return {
    ...row,
    amount: Number(row.amount || 0),
    day_of_month: Math.min(31, Math.max(1, Number(row.day_of_month || 1))),
    recurrence_type: recurrenceType,
    interval_months: intervalMonths,
    start_date: row?.start_date || "",
  };
}

function getRecurrenceTypeLabel(type) {
  return recurrenceTypes.find((item) => item.value === type)?.label || "Mensal";
}

function getRecurringFrequencyLabel(item) {
  const type = item?.recurrence_type || "monthly";
  if (type === "weekly") return "Semanal";
  if (type === "biweekly") return "Quinzenal";
  if (type === "annual") return "Anual";
  if (type === "custom_months") {
    const interval = Math.max(1, Number(item?.interval_months || 1));
    return interval === 1 ? "Mensal" : `A cada ${interval} meses`;
  }
  return "Mensal";
}

function getRecurringScheduleText(item) {
  const type = item?.recurrence_type || "monthly";
  const day = Math.min(31, Math.max(1, Number(item?.day_of_month || 1)));
  const startDate = item?.start_date ? formatDateBR(item.start_date) : "sem data inicial";

  if (type === "weekly") return `Semanal · desde ${startDate}`;
  if (type === "biweekly") return `Quinzenal · desde ${startDate}`;
  if (type === "annual") return `Anual · ${startDate}`;
  if (type === "custom_months") return `${getRecurringFrequencyLabel(item)} · dia ${day}`;
  return `Mensal · dia ${day}`;
}

function getRecurringOccurrenceDates(item, monthValue) {
  if (!item || !monthValue) return [];

  const [year, month] = String(monthValue).split("-").map(Number);
  if (!year || !month) return [];

  const type = item.recurrence_type || "monthly";
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);
  const lastDay = endOfMonth.getDate();
  const day = Math.min(Number(item.day_of_month || 1), lastDay);
  const fallbackStartDate = new Date(year, month - 1, day);
  const startDate = parseISODateSafe(item.start_date) || fallbackStartDate;

  if (type === "weekly" || type === "biweekly") {
    const stepDays = type === "weekly" ? 7 : 14;
    let current = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

    if (current < startOfMonth) {
      const diffDays = Math.floor((startOfMonth - current) / (1000 * 60 * 60 * 24));
      const stepsToMonth = Math.ceil(diffDays / stepDays);
      current.setDate(current.getDate() + stepsToMonth * stepDays);
    }

    const dates = [];
    while (current <= endOfMonth) {
      if (current >= startOfMonth) dates.push(dateToISODate(current));
      current.setDate(current.getDate() + stepDays);
    }

    return dates;
  }

  if (type === "annual") {
    const referenceMonth = startDate.getMonth() + 1;
    if (month !== referenceMonth) return [];
    const referenceDay = Math.min(Number(item.day_of_month || startDate.getDate() || 1), lastDay);
    const candidate = new Date(year, month - 1, referenceDay);
    if (candidate < startDate) return [];
    return [dateToISODate(candidate)];
  }

  if (type === "custom_months") {
    const interval = Math.max(1, Number(item.interval_months || 1));
    const monthsDiff = (year - startDate.getFullYear()) * 12 + (month - (startDate.getMonth() + 1));
    if (monthsDiff < 0 || monthsDiff % interval !== 0) return [];
    const candidate = new Date(year, month - 1, day);
    if (candidate < startDate) return [];
    return [dateToISODate(candidate)];
  }

  const candidate = new Date(year, month - 1, day);
  if (item.start_date && candidate < startDate) return [];
  return [dateToISODate(candidate)];
}

function normalizeRecurringFormPayload(form, monthValue = getCurrentMonth()) {
  const recurrenceType = form?.recurrence_type || "monthly";
  const day = Math.min(31, Math.max(1, Number(form?.day_of_month || 1)));
  const startDate = form?.start_date || `${monthValue}-${String(day).padStart(2, "0")}`;
  const intervalMonths = recurrenceType === "custom_months" ? Math.max(1, Number(form?.interval_months || 1)) : 1;

  return {
    recurrence_type: recurrenceType,
    interval_months: intervalMonths,
    start_date: startDate,
    day_of_month: day,
  };
}

function normalizeCard(row) {
  return {
    ...row,
    card_limit: Number(row.card_limit || 0),
    closing_day: normalizeOptionalCardDay(row.closing_day),
    due_day: normalizeOptionalCardDay(row.due_day),
    card_type: row?.card_type || "Crédito",
  };
}

function normalizeCardAdjustment(row) {
  return {
    ...row,
    amount: Number(row.amount || 0),
    adjustment_type: row.adjustment_type || "payment",
    date: row.date || new Date().toISOString().slice(0, 10),
  };
}

function normalizePaymentAllocation(row) {
  return {
    ...row,
    amount: Number(row.amount || 0),
    target_amount: Number(row.target_amount || 0),
    payment_date: row.payment_date || new Date().toISOString().slice(0, 10),
  };
}

function normalizePreferences(row) {
  return {
    ...row,
    monthly_income: Number(row?.monthly_income || 0),
    main_goal: row?.main_goal || "",
    currency: row?.currency || "BRL",
    default_theme: row?.default_theme || "system",
    onboarding_completed: Boolean(row?.onboarding_completed),
  };
}

function buildFinancialHealth(summary, preferences) {
  const incomeBase = Number(summary?.income || 0) || Number(preferences?.monthly_income || 0);
  const expense = Number(summary?.expense || 0);
  const balance = Number(summary?.balance || 0);
  const expenseRatio = incomeBase > 0 ? expense / incomeBase : 0;
  const savingRate = incomeBase > 0 ? Math.round((balance / incomeBase) * 100) : 0;

  if (!incomeBase) {
    return {
      label: "Em análise",
      tone: "blue",
      score: 0,
      percent: 0,
      text: "Cadastre sua renda ou lançamentos para calcular sua saúde financeira.",
    };
  }

  if (expenseRatio <= 0.5 && balance > 0) {
    return {
      label: "Excelente",
      tone: "emerald",
      score: 95,
      percent: Math.round(expenseRatio * 100),
      text: `Você usou ${Math.round(expenseRatio * 100)}% da renda e economizou ${Math.max(0, savingRate)}% neste mês.`,
    };
  }

  if (expenseRatio <= 0.75 && balance >= 0) {
    return {
      label: "Boa",
      tone: "blue",
      score: 78,
      percent: Math.round(expenseRatio * 100),
      text: `Seu mês está equilibrado: ${Math.round(expenseRatio * 100)}% da renda foi usada em despesas.`,
    };
  }

  if (expenseRatio <= 0.95 && balance >= 0) {
    return {
      label: "Atenção",
      tone: "amber",
      score: 58,
      percent: Math.round(expenseRatio * 100),
      text: `Você já comprometeu ${Math.round(expenseRatio * 100)}% da renda. Vale revisar gastos variáveis.`,
    };
  }

  return {
    label: "Crítica",
    tone: "rose",
    score: 35,
    percent: Math.round(expenseRatio * 100),
    text: balance < 0 ? "Suas despesas passaram das receitas neste mês." : "Seu orçamento está no limite. Revise despesas e limites por categoria.",
  };
}

function addMonthsToISO(isoDate, monthsToAdd) {
  const date = new Date(`${isoDate}T00:00:00`);
  const originalDay = date.getDate();
  date.setMonth(date.getMonth() + Number(monthsToAdd || 0));
  if (date.getDate() !== originalDay) date.setDate(0);
  return date.toISOString().slice(0, 10);
}

function previousMonthValue(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  const date = new Date(year, month - 2, 1);
  return date.toISOString().slice(0, 7);
}

function clampInstallments(value) {
  const number = Number(value || 1);
  if (!Number.isFinite(number)) return 1;
  return Math.min(60, Math.max(1, Math.floor(number)));
}

function getCleanInstallmentDescription(description) {
  return String(description || "").replace(/\s*\(\d+\/\d+\)\s*$/g, "").trim();
}

function buildInstallmentRows({ userId, description, category, amount, firstDate, cardId, installments, notes }) {
  const totalInstallments = clampInstallments(installments);
  const totalAmount = Number(amount || 0);
  const baseAmount = Number((totalAmount / totalInstallments).toFixed(2));
  const groupId = uid();

  return Array.from({ length: totalInstallments }).map((_, index) => {
    const installmentNumber = index + 1;
    const isLast = installmentNumber === totalInstallments;
    const adjustedAmount = isLast ? Number((totalAmount - baseAmount * (totalInstallments - 1)).toFixed(2)) : baseAmount;

    return {
      user_id: userId,
      type: "expense",
      description: `${description} (${installmentNumber}/${totalInstallments})`,
      category,
      method: "Crédito",
      amount: adjustedAmount,
      date: addMonthsToISO(firstDate, index),
      card_id: cardId,
      notes: notes || null,
      installment_group_id: groupId,
      installment_number: installmentNumber,
      installment_total: totalInstallments,
    };
  });
}

function buildInstallmentGroups(transactions, selectedMonth) {
  const monthEnd = getMonthEndISO(selectedMonth);
  const groups = new Map();

  transactions
    .filter((item) => item.installment_group_id && Number(item.installment_total || 0) > 1)
    .forEach((item) => {
      const groupId = item.installment_group_id;
      const current = groups.get(groupId) || {
        id: groupId,
        description: getCleanInstallmentDescription(item.description),
        category: item.category,
        method: item.method,
        card_id: item.card_id,
        notes: item.notes || "",
        items: [],
      };

      current.items.push(item);
      groups.set(groupId, current);
    });

  return Array.from(groups.values())
    .map((group) => {
      const items = [...group.items].sort((a, b) => Number(a.installment_number || 0) - Number(b.installment_number || 0));
      const totalInstallments = Math.max(...items.map((item) => Number(item.installment_total || items.length || 1)));
      const totalAmount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const amountUntilMonth = items.filter((item) => item.date <= monthEnd).reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const currentMonthItem = items.find((item) => item.date?.slice(0, 7) === selectedMonth);
      const currentInstallment = currentMonthItem
        ? Number(currentMonthItem.installment_number || 0)
        : Math.max(0, ...items.filter((item) => item.date <= monthEnd).map((item) => Number(item.installment_number || 0)));
      const nextItem = items.find((item) => item.date > monthEnd);
      const firstDate = items[0]?.date || "";
      const lastDate = items[items.length - 1]?.date || "";
      const remainingInstallments = Math.max(0, totalInstallments - currentInstallment);
      const remainingAmount = Math.max(0, Number((totalAmount - amountUntilMonth).toFixed(2)));
      const progress = totalInstallments > 0 ? Math.min(100, Math.round((currentInstallment / totalInstallments) * 100)) : 0;

      return {
        ...group,
        items,
        totalInstallments,
        currentInstallment,
        remainingInstallments,
        totalAmount,
        amountUntilMonth,
        remainingAmount,
        installmentAmount: items[0]?.amount || 0,
        firstDate,
        lastDate,
        nextDate: nextItem?.date || "",
        progress,
        status: currentInstallment >= totalInstallments ? "Concluído" : currentInstallment === 0 ? "Futuro" : "Em andamento",
      };
    })
    .sort((a, b) => (b.firstDate || "").localeCompare(a.firstDate || ""));
}

function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function hasAuthRedirectParams() {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace("#", ""));

  return (
    params.has("auth") ||
    params.has("next") ||
    params.has("code") ||
    params.has("type") ||
    hashParams.has("type") ||
    hashParams.has("code") ||
    hashParams.has("access_token") ||
    hashParams.has("refresh_token")
  );
}

function hasPasswordRecoveryRedirectParams() {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace("#", ""));

  return (
    params.get("auth") === "recovery" ||
    params.get("type") === "recovery" ||
    params.get("next") === "reset-password" ||
    hashParams.get("type") === "recovery" ||
    window.location.pathname.includes("reset-password")
  );
}

function markEmailConfirmationTarget() {
  try {
    localStorage.setItem(EMAIL_CONFIRMATION_TARGET_KEY, "dashboard");
    sessionStorage.setItem(EMAIL_CONFIRMATION_TARGET_KEY, "dashboard");
  } catch {
    // ignore storage errors
  }
}

function shouldOpenDashboardAfterConfirmation() {
  try {
    return (
      localStorage.getItem(EMAIL_CONFIRMATION_TARGET_KEY) === "dashboard" ||
      sessionStorage.getItem(EMAIL_CONFIRMATION_TARGET_KEY) === "dashboard"
    );
  } catch {
    return false;
  }
}

function clearEmailConfirmationTarget() {
  try {
    localStorage.removeItem(EMAIL_CONFIRMATION_TARGET_KEY);
    sessionStorage.removeItem(EMAIL_CONFIRMATION_TARGET_KEY);
  } catch {
    // ignore storage errors
  }
}

function markPasswordRecoveryTarget() {
  try {
    localStorage.setItem(PASSWORD_RECOVERY_TARGET_KEY, "update-password");
    sessionStorage.setItem(PASSWORD_RECOVERY_TARGET_KEY, "update-password");
  } catch {
    // ignore storage errors
  }
}

function shouldOpenPasswordUpdateAfterRecovery() {
  try {
    return (
      localStorage.getItem(PASSWORD_RECOVERY_TARGET_KEY) === "update-password" ||
      sessionStorage.getItem(PASSWORD_RECOVERY_TARGET_KEY) === "update-password"
    );
  } catch {
    return false;
  }
}

function clearPasswordRecoveryTarget() {
  try {
    localStorage.removeItem(PASSWORD_RECOVERY_TARGET_KEY);
    sessionStorage.removeItem(PASSWORD_RECOVERY_TARGET_KEY);
  } catch {
    // ignore storage errors
  }
}


export default function ControleFinanceiroCompleto() {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const storedTheme = localStorage.getItem(THEME_KEY);
      if (storedTheme) return storedTheme === "dark";
      return window.matchMedia?.("(prefers-color-scheme: dark)").matches || false;
    } catch {
      return true;
    }
  });

  const [authLoading, setAuthLoading] = useState(true);
  const [minimumLoadingDone, setMinimumLoadingDone] = useState(false);
  const [session, setSession] = useState(null);
  const [screen, setScreen] = useState("home");
  const [authMode, setAuthMode] = useState("login");
  const [systemMessage, setSystemMessage] = useState("");
  const firstLoadRef = useRef(false);

  useEffect(() => {
    document.title = "Controle Financeiro";

    let favicon = document.querySelector("link[rel='icon']");
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }
    favicon.href = logoEA;

    let manifest = document.querySelector("link[rel='manifest']");
    if (!manifest) {
      manifest = document.createElement("link");
      manifest.rel = "manifest";
      document.head.appendChild(manifest);
    }
    manifest.href = "/manifest.webmanifest";

    let themeColor = document.querySelector("meta[name='theme-color']");
    if (!themeColor) {
      themeColor = document.createElement("meta");
      themeColor.name = "theme-color";
      document.head.appendChild(themeColor);
    }
    themeColor.content = "#020617";

    if ("serviceWorker" in navigator && window.location.protocol === "https:") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (screen === "dashboard" && session) {
      document.title = `Controle Financeiro | ${getUserDisplayName(session)}`;
    } else {
      document.title = "Controle Financeiro";
    }
  }, [screen, session]);

  useEffect(() => {
    const theme = darkMode ? "dark" : "light";
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.backgroundColor = darkMode ? "#020617" : "#f1f5f9";
    document.body.style.backgroundColor = darkMode ? "#020617" : "#f1f5f9";
    document.body.style.color = darkMode ? "#f8fafc" : "#020617";
  }, [darkMode]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMinimumLoadingDone(true);
    }, MINIMUM_LOADING_TIME_MS);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setSystemMessage("Não foi possível carregar a sessão do usuário.");
      }

      setSession(data?.session || null);
      setAuthLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      setAuthLoading(false);

      const isActiveTab = typeof document === "undefined" || document.visibilityState === "visible";

      if (event === "PASSWORD_RECOVERY") {
        markPasswordRecoveryTarget();
      }

      if ((event === "PASSWORD_RECOVERY" && isActiveTab) || (currentSession && (hasPasswordRecoveryRedirectParams() || (shouldOpenPasswordUpdateAfterRecovery() && isActiveTab)))) {
        setSystemMessage("Link validado. Crie uma nova senha para continuar.");
        setAuthMode("update-password");
        setScreen("auth");
        return;
      }

      if (currentSession && (hasAuthRedirectParams() || shouldOpenDashboardAfterConfirmation())) {
        clearEmailConfirmationTarget();
        setSystemMessage("E-mail confirmado com sucesso. Bem-vindo ao seu painel financeiro.");
        setScreen("dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authLoading && !firstLoadRef.current) {
      const isActiveTab = typeof document === "undefined" || document.visibilityState === "visible";
      const isPasswordRecovery = hasPasswordRecoveryRedirectParams() || (shouldOpenPasswordUpdateAfterRecovery() && isActiveTab);
      const shouldGoDashboard = Boolean(session) && !isPasswordRecovery && (hasAuthRedirectParams() || shouldOpenDashboardAfterConfirmation());

      if (isPasswordRecovery) {
        setSystemMessage("Link validado. Crie uma nova senha para continuar.");
        setAuthMode("update-password");
        setScreen("auth");
      } else if (shouldGoDashboard) {
        clearEmailConfirmationTarget();
        setSystemMessage("E-mail confirmado com sucesso. Bem-vindo ao seu painel financeiro.");
        setScreen("dashboard");
      } else if (!hasAuthRedirectParams()) {
        setScreen("home");
      }

      firstLoadRef.current = true;
    }
  }, [authLoading, session]);

  useEffect(() => {
    if (authLoading) return;

    async function handleAuthRedirect() {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace("#", ""));
      const authStatus = params.get("auth");
      const authType = params.get("type") || hashParams.get("type");
      const code = params.get("code");
      const hasAccessToken = hashParams.has("access_token") || hashParams.has("refresh_token");
      const isActiveTab = typeof document === "undefined" || document.visibilityState === "visible";
      const isPasswordRecovery = authStatus === "recovery" || authType === "recovery" || params.get("next") === "reset-password" || (shouldOpenPasswordUpdateAfterRecovery() && isActiveTab);

      if (isPasswordRecovery) {
        try {
          let currentSession = session;

          if (code) {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
            currentSession = data?.session || null;
          }

          if (!currentSession) {
            const { data } = await supabase.auth.getSession();
            currentSession = data?.session || null;
          }

          setSession(currentSession);
          setSystemMessage("Link validado. Crie uma nova senha para continuar.");
          setAuthMode("update-password");
          setScreen("auth");
        } catch {
          setSystemMessage("Não foi possível validar o link de recuperação. Solicite um novo link.");
          setAuthMode("reset");
          setScreen("auth");
        } finally {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        return;
      }

      const isEmailConfirmation =
        authStatus === "confirmed" ||
        authStatus === "confirming" ||
        authType === "signup" ||
        Boolean(code) ||
        hasAccessToken ||
        shouldOpenDashboardAfterConfirmation();

      if (!isEmailConfirmation) return;

      try {
        let currentSession = session;

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          currentSession = data?.session || null;
        }

        if (!currentSession) {
          const { data } = await supabase.auth.getSession();
          currentSession = data?.session || null;
        }

        if (currentSession) {
          clearEmailConfirmationTarget();
          setSession(currentSession);
          setSystemMessage("E-mail confirmado com sucesso. Bem-vindo ao seu painel financeiro.");
          setScreen("dashboard");
        } else {
          setSystemMessage("E-mail confirmado com sucesso. Faça login para acessar sua conta.");
          setAuthMode("login");
          setScreen("auth");
        }
      } catch {
        setSystemMessage("E-mail confirmado com sucesso. Faça login para acessar sua conta.");
        setAuthMode("login");
        setScreen("auth");
      } finally {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    handleAuthRedirect();
  }, [authLoading, session]);

  function goToAuth(mode = "login") {
    setAuthMode(mode);
    setScreen("auth");
  }

  function goToDashboard() {
    if (session) {
      setScreen("dashboard");
      return;
    }
    goToAuth("login");
  }

  function startDemo() {
    setScreen("demo");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setSession(null);
    setScreen("home");
  }

  if (authLoading || !minimumLoadingDone) {
    return (
      <AppFrame darkMode={darkMode}>
        <LoadingScreen
          title="Controle Financeiro"
          subtitle="Verificando sua sessão e preparando o ambiente..."
        />
      </AppFrame>
    );
  }

  return (
    <AppFrame darkMode={darkMode}>
      {screen === "home" && (
        <HomePage
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          session={session}
          onStart={() => (session ? goToDashboard() : goToAuth("signup"))}
          onLogin={() => (session ? goToDashboard() : goToAuth("login"))}
          onDashboard={goToDashboard}
          onDemo={startDemo}
        />
      )}

      {screen === "demo" && (
        <DemoDashboard
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onBack={() => setScreen("home")}
          onCreateAccount={() => goToAuth("signup")}
        />
      )}

      {screen === "auth" && (
        <AuthScreen
          mode={authMode}
          setMode={setAuthMode}
          onBack={() => setScreen("home")}
          onSuccess={() => setScreen("dashboard")}
          systemMessage={systemMessage}
        />
      )}

      {screen === "dashboard" && session && (
        <Dashboard
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          session={session}
          onSignOut={handleSignOut}
          onHome={() => setScreen("home")}
        />
      )}

      {screen === "dashboard" && !session && (
        <AuthScreen
          mode="login"
          setMode={setAuthMode}
          onBack={() => setScreen("home")}
          onSuccess={() => setScreen("dashboard")}
          systemMessage="Entre na sua conta para acessar o painel."
        />
      )}
    </AppFrame>
  );
}


function LoadingScreen({
  title = "Controle Financeiro",
  subtitle = "Preparando seu painel financeiro...",
}) {
  return (
    <div className="loading-screen flex min-h-screen items-center justify-center px-4">
      <div className="loading-card surface-card relative overflow-hidden rounded-[2.5rem] p-8 text-center shadow-2xl">
        <div className="loading-glow loading-glow-one" />
        <div className="loading-glow loading-glow-two" />

        <div className="relative z-10">
          <div className="loading-logo-wrap mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem]">
            <img
              src={logoEA}
              alt="Logo Controle Financeiro"
              className="h-16 w-16 rounded-2xl object-cover"
            />
          </div>

          <h1 className="text-3xl font-black tracking-tight">
            {title}
          </h1>

          <p className="muted-text mx-auto mt-3 max-w-sm text-sm font-semibold leading-6">
            {subtitle}
          </p>

          <div className="loading-bar mx-auto mt-7 h-2 w-full max-w-xs overflow-hidden rounded-full">
            <div className="loading-bar-progress h-full rounded-full" />
          </div>

          <div className="mt-5 flex justify-center gap-2">
            <span className="loading-dot" />
            <span className="loading-dot loading-dot-delay-1" />
            <span className="loading-dot loading-dot-delay-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AppFrame({ darkMode, children }) {
  return (
    <div className={classNames("app-shell min-h-screen antialiased transition-colors duration-300", darkMode ? "theme-dark" : "theme-light")}>
      {children}
      <GlobalStyles />
    </div>
  );
}

function HomePage({ darkMode, setDarkMode, session, onStart, onLogin, onDashboard, onDemo }) {
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    {
      eyebrow: "Controle total do seu mês",
      title: "Veja para onde seu dinheiro está indo.",
      text: "Organize entradas, saídas, saldo, economia e categorias em uma tela clara para tomar decisões melhores no dia a dia.",
      bullets: ["Resumo mensal automático", "Gráficos por categoria", "Histórico completo de lançamentos"],
      metricTitle: "Saldo previsto",
      metricValue: "R$ 1.720,00",
      icon: <Wallet size={22} />,
    },
    {
      eyebrow: "Planejamento financeiro",
      title: "Crie metas e acompanhe sua evolução.",
      text: "Defina objetivos como reserva de emergência, viagem, notebook ou quitar dívidas, acompanhando o progresso em tempo real.",
      bullets: ["Metas personalizadas", "Progresso visual", "Valor atual e valor alvo"],
      metricTitle: "Meta concluída",
      metricValue: "62%",
      icon: <Target size={22} />,
    },
    {
      eyebrow: "Rotina automatizada",
      title: "Cadastre contas fixas e ganhe tempo.",
      text: "Registre salários, assinaturas, aluguel, academia e outras despesas recorrentes para gerar os lançamentos do mês com poucos cliques.",
      bullets: ["Receitas fixas", "Despesas recorrentes", "Geração automática mensal"],
      metricTitle: "Itens fixos",
      metricValue: "8 ativos",
      icon: <Repeat size={22} />,
    },
  ];

  const features = [
    {
      icon: <Wallet size={22} />,
      title: "Receitas e despesas",
      text: "Registre entradas e saídas com categoria, data, valor e forma de pagamento.",
    },
    {
      icon: <CalendarDays size={22} />,
      title: "Resumo mensal",
      text: "Acompanhe receitas, despesas, saldo, economia e evolução mês a mês.",
    },
    {
      icon: <BarChart3 size={22} />,
      title: "Gráficos inteligentes",
      text: "Visualize gastos por categoria, fluxo diário, comparação mensal e top gastos.",
    },
    {
      icon: <Target size={22} />,
      title: "Metas financeiras",
      text: "Crie objetivos financeiros e acompanhe quanto falta para alcançar cada meta.",
    },
    {
      icon: <ListFilter size={22} />,
      title: "Filtros completos",
      text: "Filtre por mês, tipo, categoria, descrição e ordene por data ou valor.",
    },
    {
      icon: <ShieldCheck size={22} />,
      title: "Conta segura",
      text: "Seus dados ficam vinculados ao seu usuário, com acesso individual pelo login.",
    },
  ];

  const currentSlide = slides[activeSlide];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 5500);

    return () => window.clearInterval(interval);
  }, [slides.length]);

  function goToSlide(index) {
    setActiveSlide(index);
  }

  function previousSlide() {
    setActiveSlide((current) => (current === 0 ? slides.length - 1 : current - 1));
  }

  function nextSlide() {
    setActiveSlide((current) => (current + 1) % slides.length);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8">
      <header className="home-header sticky top-4 z-20 rounded-[2rem] px-4 py-3 backdrop-blur md:px-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img src={logoEA} alt="Logo Controle Financeiro" className="h-12 w-12 rounded-2xl object-cover shadow-sm" />
            <div>
              <strong className="block text-lg font-black tracking-tight sm:text-xl">Controle Financeiro</strong>
              <span className="muted-text text-xs font-semibold">Organização financeira pessoal</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => setDarkMode((value) => !value)} className="theme-button inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition hover:scale-[1.02]">
              {darkMode ? <Sun size={17} /> : <Moon size={17} />}
              {darkMode ? "Modo claro" : "Modo escuro"}
            </button>
            <button onClick={session ? onDashboard : onLogin} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white transition hover:scale-[1.02] hover:bg-emerald-700">
              {session ? "Ir para o painel" : "Entrar / Cadastrar"}
            </button>
          </div>
        </div>
      </header>

      <section className="home-hero relative overflow-hidden rounded-[2.5rem] p-6 shadow-2xl lg:p-10">
        <div className="home-glow home-glow-one" />
        <div className="home-glow home-glow-two" />

        <div className="relative z-10 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="home-eyebrow mb-5 inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-black">
              {currentSlide.icon}
              {currentSlide.eyebrow}
            </div>

            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              {currentSlide.title}
            </h1>

            <p className="muted-text mt-6 max-w-2xl text-base leading-8 sm:text-lg">
              {currentSlide.text}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {currentSlide.bullets.map((item) => (
                <div key={item} className="home-mini-card rounded-2xl p-3 text-sm font-bold">
                  <CheckCircle2 className="mb-2 text-emerald-400" size={18} />
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={onStart} className="rounded-2xl bg-emerald-600 px-6 py-3 font-black text-white shadow-lg shadow-emerald-950/30 transition hover:scale-[1.02] hover:bg-emerald-700">
                {session ? "Ir para o painel" : "Começar agora"}
              </button>
              <button onClick={session ? onDashboard : onLogin} className="outline-button rounded-2xl px-6 py-3 font-black transition">
                {session ? "Acessar minha conta" : "Já tenho conta"}
              </button>
              {!session && (
                <button onClick={onDemo} className="ghost-demo-button rounded-2xl px-6 py-3 font-black transition">
                  Testar demonstração
                </button>
              )}
            </div>

            <div className="mt-8 flex items-center gap-3">
              <button onClick={previousSlide} className="carousel-button rounded-full px-4 py-2 font-black" aria-label="Slide anterior">
                ←
              </button>
              <div className="flex gap-2">
                {slides.map((slide, index) => (
                  <button
                    key={slide.title}
                    onClick={() => goToSlide(index)}
                    className={classNames("carousel-dot", index === activeSlide && "carousel-dot-active")}
                    aria-label={`Ir para o slide ${index + 1}`}
                  />
                ))}
              </div>
              <button onClick={nextSlide} className="carousel-button rounded-full px-4 py-2 font-black" aria-label="Próximo slide">
                →
              </button>
            </div>
          </div>

          <div className="home-preview-plus rounded-[2rem] p-5">
            <div className="preview-panel rounded-[1.5rem] p-5 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm font-black text-slate-300">Dashboard financeiro</p>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">online</span>
              </div>

              <div className="grid gap-3">
                <PreviewRow title="Receitas" value="R$ 3.200,00" tone="emerald" />
                <PreviewRow title="Despesas" value="R$ 1.480,00" tone="rose" />
                <PreviewRow title="Saldo" value="R$ 1.720,00" tone="blue" />
              </div>

              <div className="preview-progress-card mt-5 rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-emerald-300">{currentSlide.metricTitle}</p>
                    <p className="mt-1 text-xs text-slate-300">Prévia do seu controle financeiro</p>
                  </div>
                  <strong className="text-xl text-emerald-300">{currentSlide.metricValue}</strong>
                </div>
                <div className="preview-progress-track mt-4 h-2 rounded-full">
                  <div className="h-2 w-[68%] rounded-full bg-emerald-500" />
                </div>
              </div>

              <div className="preview-chart-box mt-5 grid grid-cols-7 items-end gap-2 rounded-2xl p-4">
                {[30, 55, 40, 80, 65, 95, 70].map((height, index) => (
                  <div key={index} className="preview-chart-track flex h-28 items-end rounded-xl p-1">
                    <div className="w-full rounded-lg bg-emerald-500" style={{ height: `${height}%` }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[
          ["+ Controle", "Organize todos os lançamentos"],
          ["+ Clareza", "Entenda o mês rapidamente"],
          ["+ Metas", "Acompanhe seus objetivos"],
          ["+ Limites", "Evite gastos fora do plano"],
          ["+ Relatórios", "Exporte e analise dados"],
          ["+ Segurança", "Dados separados por usuário"],
        ].map(([title, text]) => (
          <article key={title} className="home-stat-card rounded-[2rem] p-5">
            <strong className="block text-2xl font-black text-emerald-400">{title}</strong>
            <p className="muted-text mt-2 text-sm font-semibold">{text}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {features.map((item) => (
          <article key={item.title} className="surface-card home-feature-card rounded-[2rem] p-5 shadow-sm">
            <div className="mb-5 inline-flex rounded-2xl bg-emerald-500/10 p-3 text-emerald-400">{item.icon}</div>
            <h3 className="text-lg font-black">{item.title}</h3>
            <p className="muted-text mt-3 text-sm leading-7">{item.text}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="surface-card home-feature-card rounded-[2rem] p-6 shadow-sm lg:p-8">
          <h2 className="text-2xl font-black">Como funciona</h2>
          <p className="muted-text mt-3 leading-8">
            O sistema foi pensado para ser simples: você cria sua conta, registra seus lançamentos e acompanha os dados do mês em poucos minutos.
          </p>
          <div className="mt-6 space-y-4">
            <StepItem number="01" title="Crie sua conta" text="Cadastre seu nome, e-mail e senha para manter seus dados vinculados ao seu usuário." />
            <StepItem number="02" title="Registre seus lançamentos" text="Adicione receitas, despesas, metas, limites e itens fixos conforme sua rotina." />
            <StepItem number="03" title="Acompanhe sua evolução" text="Use os gráficos, filtros e relatórios para entender melhor seu dinheiro." />
          </div>
        </div>

        <div className="surface-card home-feature-card rounded-[2rem] p-6 shadow-sm lg:p-8">
          <div className="relative z-10 grid gap-6 xl:grid-cols-[1fr_0.85fr] xl:items-center">
            <div>
              <div className="mb-5 inline-flex rounded-2xl bg-emerald-500/10 p-3 text-emerald-400">
                <TrendingUp size={26} />
              </div>
              <h2 className="text-3xl font-black leading-tight sm:text-4xl">Comece a controlar seu dinheiro com mais inteligência.</h2>
              <p className="muted-text mt-4 max-w-xl text-sm leading-7">
                Centralize receitas, despesas, metas e relatórios em uma única plataforma simples para acompanhar sua evolução financeira.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <button onClick={onStart} className="rounded-2xl bg-emerald-500 px-6 py-3 font-black text-white transition hover:scale-[1.02] hover:bg-emerald-600">
                  {session ? "Abrir painel" : "Criar minha conta"}
                </button>
                <button onClick={session ? onDashboard : onLogin} className="outline-button rounded-2xl px-6 py-3 font-black transition">
                  {session ? "Voltar para minha conta" : "Entrar agora"}
                </button>
                {!session && (
                  <button onClick={onDemo} className="ghost-demo-button rounded-2xl px-6 py-3 font-black transition">
                    Ver demonstração
                  </button>
                )}
              </div>
            </div>

            <div className="field-shell rounded-[1.75rem] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black">O que você acompanha</p>
                  <p className="muted-text mt-1 text-xs">Tudo essencial, sem poluir a tela.</p>
                </div>
                <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-300">
                  <ShieldCheck size={22} />
                </div>
              </div>

              <div className="space-y-3">
                <HomeCheck title="Resumo do mês" text="Receitas, despesas, saldo e economia." />
                <HomeCheck title="Metas e limites" text="Objetivos claros e alertas por categoria." />
                <HomeCheck title="Relatórios" text="Filtros, histórico e exportação quando precisar." />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function HomeCheck({ title, text }) {
  return (
    <div className="transaction-row flex gap-3 rounded-2xl p-4">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
        <CheckCircle2 size={18} />
      </div>
      <div>
        <h3 className="text-sm font-black">{title}</h3>
        <p className="muted-text mt-1 text-xs leading-5">{text}</p>
      </div>
    </div>
  );
}

function StepItem({ number, title, text }) {
  return (
    <div className="transaction-row step-card flex gap-4 rounded-2xl p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-sm font-black text-emerald-400">
        {number}
      </div>
      <div>
        <h3 className="font-black">{title}</h3>
        <p className="muted-text mt-1 text-sm leading-6">{text}</p>
      </div>
    </div>
  );
}

function PreviewRow({ title, value, tone }) {
  return (
    <div className={classNames("preview-row flex items-center justify-between rounded-2xl px-4 py-3", `preview-row-${tone}`)}>
      <span className="font-bold">{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DemoDashboard({ darkMode, setDarkMode, onBack, onCreateAccount }) {
  const initialDemoTransactions = useMemo(
    () => [
      { id: "demo-1", type: "income", description: "Salário", category: "Salário", method: "Pix", amount: 4200, date: "2026-06-01", card_id: "", notes: "Receita demonstrativa" },
      { id: "demo-2", type: "expense", description: "Mercado do mês", category: "Mercado", method: "Crédito", amount: 520, date: "2026-06-05", card_id: "card-demo-1", notes: "Compra demonstrativa" },
      { id: "demo-3", type: "expense", description: "Restaurante", category: "Alimentação", method: "Débito", amount: 210, date: "2026-06-15", card_id: "", notes: "Almoço em família" },
      { id: "demo-4", type: "expense", description: "Combustível", category: "Transporte", method: "Crédito", amount: 180, date: "2026-06-22", card_id: "card-demo-1", notes: "Transporte" },
      { id: "demo-5", type: "expense", description: "Assinaturas", category: "Assinaturas", method: "Crédito", amount: 140, date: "2026-06-10", card_id: "card-demo-2", notes: "Streaming e aplicativos" },
      { id: "demo-6", type: "expense", description: "Cinema", category: "Lazer", method: "Pix", amount: 95.75, date: "2026-06-28", card_id: "", notes: "Fim de semana" },
    ],
    []
  );

  const initialDemoGoals = useMemo(
    () => [
      { id: "goal-demo-1", title: "Reserva de emergência", current_amount: 3200, target_amount: 6000, deadline: "2026-12-31" },
      { id: "goal-demo-2", title: "Notebook novo", current_amount: 950, target_amount: 3500, deadline: "2026-10-15" },
    ],
    []
  );

  const initialDemoCards = useMemo(
    () => [
      { id: "card-demo-1", name: "Cartão principal", card_type: "Crédito e Débito", card_limit: 3000, closing_day: 10, due_day: 15, color: "#10b981", is_active: true },
      { id: "card-demo-2", name: "Cartão refeição", card_type: "Refeição", card_limit: 1800, closing_day: 0, due_day: 0, color: "#3b82f6", is_active: true },
    ],
    []
  );

  const [demoPage, setDemoPage] = useState("dashboard");
  const [demoTransactions, setDemoTransactions] = useState(initialDemoTransactions);
  const [demoGoals, setDemoGoals] = useState(initialDemoGoals);
  const [demoCards] = useState(initialDemoCards);
  const [selectedDemoCardId, setSelectedDemoCardId] = useState("card-demo-1");
  const [toast, setToast] = useState({ open: false, message: "", type: "info" });
  const toastTimerRef = useRef(null);

  function showDemoToast(message, type = "info") {
    setToast({ open: true, message, type });

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToast((current) => ({ ...current, open: false }));
    }, 3200);
  }

  const demoSummary = useMemo(() => {
    const monthItems = demoTransactions.filter((item) => item.date?.slice(0, 7) === "2026-06");
    const income = monthItems.filter((item) => item.type === "income").reduce((total, item) => total + Number(item.amount), 0);
    const expense = monthItems.filter((item) => item.type === "expense").reduce((total, item) => total + Number(item.amount), 0);
    const balance = income - expense;
    const savingRate = income > 0 ? Math.round((balance / income) * 100) : 0;
    return { income, expense, balance, savingRate };
  }, [demoTransactions]);

  const demoExpenseByCategory = useMemo(() => {
    const map = new Map();
    demoTransactions
      .filter((item) => item.type === "expense")
      .forEach((item) => map.set(item.category, (map.get(item.category) || 0) + Number(item.amount)));
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [demoTransactions]);

  const demoDailyFlow = useMemo(() => {
    const map = new Map();
    demoTransactions.forEach((item) => {
      const day = item.date.slice(8, 10);
      const current = map.get(day) || { day, income: 0, expense: 0 };
      current[item.type] += Number(item.amount);
      map.set(day, current);
    });
    return Array.from(map.values()).sort((a, b) => Number(a.day) - Number(b.day));
  }, [demoTransactions]);

  const demoMonthlyComparison = useMemo(
    () => [
      { month: "2026-01", income: 3900, expense: 2800, balance: 1100 },
      { month: "2026-02", income: 4200, expense: 2600, balance: 1600 },
      { month: "2026-03", income: 4100, expense: 3100, balance: 1000 },
      { month: "2026-04", income: 4300, expense: 2450, balance: 1850 },
      { month: "2026-05", income: 4200, expense: 2385.75, balance: 1814.25 },
      { month: "2026-06", income: demoSummary.income, expense: demoSummary.expense, balance: demoSummary.balance },
    ],
    [demoSummary]
  );

  const demoTopExpenses = useMemo(() => {
    return [...demoTransactions]
      .filter((item) => item.type === "expense")
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 5);
  }, [demoTransactions]);

  const demoCardUsage = useMemo(() => {
    return demoCards.map((card) => {
      const spent = demoTransactions
        .filter((item) => item.type === "expense" && item.card_id === card.id)
        .reduce((total, item) => total + Number(item.amount), 0);
      const percent = card.card_limit > 0 ? Math.round((spent / card.card_limit) * 100) : 0;
      return { ...card, spent, percent, available: Math.max(0, Number(card.card_limit || 0) - spent) };
    });
  }, [demoCards, demoTransactions]);

  const demoInsights = useMemo(() => {
    const biggestExpense = demoTopExpenses[0];
    const biggestCategory = demoExpenseByCategory[0];
    const insights = [
      `Sua saúde financeira está ${demoSummary.savingRate >= 40 ? "boa" : "em atenção"}, com ${demoSummary.savingRate}% de economia no mês.`,
    ];

    if (biggestCategory) insights.push(`${biggestCategory.name} é sua maior categoria de despesa neste mês.`);
    if (biggestExpense) insights.push(`Seu maior lançamento foi ${biggestExpense.description}, no valor de ${money.format(biggestExpense.amount)}.`);
    if (demoCardUsage.some((card) => card.percent >= 30)) insights.push("Você pode abrir a área de cartões e simular compras para ver a fatura mudar em tempo real.");

    return insights.slice(0, 4);
  }, [demoSummary, demoExpenseByCategory, demoTopExpenses, demoCardUsage]);

  const demoHealth = useMemo(() => buildFinancialHealth(demoSummary, { monthly_income: 4200 }), [demoSummary]);

  function addDemoTransaction(type = "expense") {
    const expenseExamples = [
      { description: "Farmácia", category: "Saúde", method: "Pix", amount: 86.9, card_id: "" },
      { description: "Delivery", category: "Alimentação", method: "Crédito", amount: 72.5, card_id: "card-demo-1" },
      { description: "Uber", category: "Transporte", method: "Crédito", amount: 38.4, card_id: "card-demo-2" },
      { description: "Presente", category: "Lazer", method: "Débito", amount: 129.9, card_id: "" },
    ];
    const incomeExamples = [
      { description: "Freelance", category: "Freelance", method: "Pix", amount: 350, card_id: "" },
      { description: "Venda usada", category: "Venda", method: "Transferência", amount: 220, card_id: "" },
    ];
    const source = type === "income" ? incomeExamples : expenseExamples;
    const example = source[Math.floor(Math.random() * source.length)];
    const newItem = {
      id: uid(),
      type,
      ...example,
      date: "2026-06-29",
      notes: "Gerado no modo demonstração",
    };

    setDemoTransactions((current) => [newItem, ...current]);
    setDemoPage("transactions");
    showDemoToast(type === "income" ? "Receita demonstrativa adicionada." : "Despesa demonstrativa adicionada.", "success");
  }

  function duplicateDemoTransaction(item) {
    const duplicated = {
      ...item,
      id: uid(),
      description: `${item.description} (cópia)`,
      date: "2026-06-30",
    };
    setDemoTransactions((current) => [duplicated, ...current]);
    showDemoToast("Lançamento duplicado na demonstração.", "success");
  }

  function deleteDemoTransaction(id) {
    setDemoTransactions((current) => current.filter((item) => item.id !== id));
    showDemoToast("Lançamento removido apenas da demonstração.", "warning");
  }

  function depositDemoGoal(goalId, amount = 250) {
    setDemoGoals((current) =>
      current.map((goal) =>
        goal.id === goalId
          ? { ...goal, current_amount: Math.min(Number(goal.target_amount), Number(goal.current_amount) + Number(amount)) }
          : goal
      )
    );
    setDemoPage("goals");
    showDemoToast(`Valor de ${money.format(amount)} adicionado à meta demonstrativa.`, "success");
  }

  function simulateCardPurchase(cardId = selectedDemoCardId, amount = 120) {
    const card = demoCards.find((item) => item.id === cardId) || demoCards[0];
    const newItem = {
      id: uid(),
      type: "expense",
      description: "Compra simulada",
      category: "Lazer",
      method: "Crédito",
      amount,
      date: "2026-06-30",
      card_id: card.id,
      notes: "Compra gerada no modo demonstração",
    };
    setDemoTransactions((current) => [newItem, ...current]);
    setSelectedDemoCardId(card.id);
    setDemoPage("cards");
    showDemoToast(`Compra de ${money.format(amount)} simulada no ${card.name}.`, "success");
  }

  function simulateCardPayment(cardId = selectedDemoCardId, amount = 150) {
    let remaining = amount;

    setDemoTransactions((current) =>
      current
        .map((item) => {
          if (remaining <= 0 || item.type !== "expense" || item.card_id !== cardId) return item;
          const reduction = Math.min(Number(item.amount), remaining);
          remaining -= reduction;
          return { ...item, amount: Number((Number(item.amount) - reduction).toFixed(2)) };
        })
        .filter((item) => Number(item.amount) > 0)
    );

    const card = demoCards.find((item) => item.id === cardId);
    setDemoPage("cards");
    showDemoToast(`Pagamento de ${money.format(amount - remaining)} simulado${card ? ` no ${card.name}` : ""}.`, "success");
  }

  function resetDemo() {
    setDemoTransactions(initialDemoTransactions);
    setDemoGoals(initialDemoGoals);
    setSelectedDemoCardId("card-demo-1");
    setDemoPage("dashboard");
    showDemoToast("Demonstração reiniciada com os dados originais.", "info");
  }

  const demoTabs = [
    { key: "dashboard", label: "Painel", icon: <BarChart3 size={17} /> },
    { key: "transactions", label: "Lançamentos", icon: <Wallet size={17} /> },
    { key: "goals", label: "Metas", icon: <Target size={17} /> },
    { key: "cards", label: "Cartões", icon: <CreditCard size={17} /> },
    { key: "reports", label: "Relatórios", icon: <FileText size={17} /> },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-5 pb-28 sm:px-6 lg:px-8 lg:pb-8">
      <ToastCustom toast={toast} onClose={() => setToast((current) => ({ ...current, open: false }))} />

      <header className="dashboard-header surface-card rounded-[2rem] p-4 shadow-sm">
        <div className="dashboard-brand">
          <img src={logoEA} alt="Logo" className="dashboard-logo h-11 w-11 rounded-2xl object-cover" />
          <div>
            <div className="dashboard-title-row">
              <h1 className="dashboard-title">Controle Financeiro</h1>
              <span className="dashboard-user-pill demo-badge-pulse">modo demonstração</span>
            </div>
            <p className="dashboard-subtitle muted-text">Explore o painel com dados fictícios e ações interativas antes de criar sua conta.</p>
          </div>
        </div>
        <div className="dashboard-actions">
          <button onClick={() => setDarkMode((value) => !value)} className="theme-button dashboard-action-button inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition hover:scale-[1.02]">
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
            {darkMode ? "Modo claro" : "Modo escuro"}
          </button>
          <button onClick={onBack} className="outline-button dashboard-action-button inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold">
            <Home size={17} /> Home
          </button>
          <button onClick={onCreateAccount} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-700">
            Criar minha conta
          </button>
        </div>
      </header>

      <section className="demo-hero-card rounded-[2rem] p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-black text-emerald-300">
              <Eye size={16} /> Demonstração ativa
            </div>
            <h2 className="text-2xl font-black">Teste as ações sem salvar nada</h2>
            <p className="muted-text mt-2 max-w-3xl text-sm leading-7">
              Clique nos botões abaixo para simular lançamentos, compras no cartão, depósitos em metas e relatórios. Tudo muda em tempo real, mas nenhum dado é gravado.
            </p>
          </div>
          <button onClick={resetDemo} className="outline-button inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black">
            <RotateCcw size={17} /> Reiniciar demonstração
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <button onClick={() => addDemoTransaction("expense")} className="demo-action-card text-left">
            <ArrowDownCircle size={22} className="text-rose-400" />
            <strong>Simular despesa</strong>
            <span>Adiciona um gasto e atualiza gráficos.</span>
          </button>
          <button onClick={() => addDemoTransaction("income")} className="demo-action-card text-left">
            <ArrowUpCircle size={22} className="text-emerald-400" />
            <strong>Simular receita</strong>
            <span>Mostra o saldo mudando na hora.</span>
          </button>
          <button onClick={() => depositDemoGoal("goal-demo-1", 250)} className="demo-action-card text-left">
            <Target size={22} className="text-emerald-400" />
            <strong>Adicionar à meta</strong>
            <span>Aumenta o progresso da reserva.</span>
          </button>
          <button onClick={() => simulateCardPurchase("card-demo-1", 120)} className="demo-action-card text-left">
            <CreditCard size={22} className="text-blue-400" />
            <strong>Compra no cartão</strong>
            <span>Atualiza limite e fatura simulada.</span>
          </button>
        </div>
      </section>

      <nav className="dashboard-tabs surface-card rounded-[2rem] p-2 shadow-sm" aria-label="Menu da demonstração">
        {demoTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setDemoPage(tab.key)}
            className={classNames("dashboard-tab-button inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-black transition", demoPage === tab.key ? "dashboard-tab-active" : "ghost-button")}
          >
            {tab.icon} <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {demoPage === "dashboard" && (
        <DashboardOverview
          summary={demoSummary}
          expenseByCategory={demoExpenseByCategory}
          dailyFlow={demoDailyFlow}
          monthlyComparison={demoMonthlyComparison}
          topExpenses={demoTopExpenses}
          goals={demoGoals}
          selectedMonth="2026-06"
          setPage={setDemoPage}
          insights={demoInsights}
          notifications={[]}
          cardUsage={demoCardUsage}
          healthStatus={demoHealth}
        />
      )}

      {demoPage === "transactions" && (
        <DemoTransactionsPage
          transactions={demoTransactions}
          cards={demoCards}
          onAddExpense={() => addDemoTransaction("expense")}
          onAddIncome={() => addDemoTransaction("income")}
          onDuplicate={duplicateDemoTransaction}
          onDelete={deleteDemoTransaction}
        />
      )}

      {demoPage === "goals" && (
        <DemoGoalsPage
          goals={demoGoals}
          onDeposit={depositDemoGoal}
          onCreateAccount={onCreateAccount}
        />
      )}

      {demoPage === "cards" && (
        <DemoCardsPage
          cards={demoCardUsage}
          transactions={demoTransactions}
          selectedCardId={selectedDemoCardId}
          setSelectedCardId={setSelectedDemoCardId}
          onPurchase={simulateCardPurchase}
          onPayment={simulateCardPayment}
          onCreateAccount={onCreateAccount}
        />
      )}

      {demoPage === "reports" && (
        <DemoReportsPage
          summary={demoSummary}
          transactions={demoTransactions}
          goals={demoGoals}
          cards={demoCardUsage}
          onExport={() => showDemoToast("Relatório demonstrativo gerado. Na conta real, você poderá exportar CSV, PDF e backup.", "info")}
          onCreateAccount={onCreateAccount}
        />
      )}
    </div>
  );
}

function DemoTransactionsPage({ transactions, cards, onAddExpense, onAddIncome, onDuplicate, onDelete }) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((item) => type === "all" || item.type === type)
      .filter((item) => {
        const value = search.trim().toLowerCase();
        if (!value) return true;
        return [item.description, item.category, item.method].join(" ").toLowerCase().includes(value);
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, search, type]);

  return (
    <main className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <section className="surface-card rounded-[2rem] p-5 shadow-sm">
        <h2 className="text-2xl font-black">Lançamentos interativos</h2>
        <p className="muted-text mt-2 text-sm leading-7">
          Simule entradas e saídas para ver o painel reagir em tempo real.
        </p>

        <div className="mt-5 grid gap-3">
          <button onClick={onAddExpense} className="rounded-2xl bg-rose-600 px-4 py-3 font-black text-white transition hover:bg-rose-700">
            <ArrowDownCircle className="mr-2 inline" size={18} /> Adicionar despesa fake
          </button>
          <button onClick={onAddIncome} className="rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white transition hover:bg-emerald-700">
            <ArrowUpCircle className="mr-2 inline" size={18} /> Adicionar receita fake
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-300">
          Dica: use duplicar ou excluir para mostrar que a demonstração é interativa, sem alterar dados reais.
        </div>
      </section>

      <section className="surface-card rounded-[2rem] p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black">Histórico demonstrativo</h2>
            <p className="muted-text text-sm">Filtre, duplique ou exclua registros fictícios.</p>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-400">{filteredTransactions.length} itens</span>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_170px]">
          <label className="field-shell flex items-center gap-2 rounded-2xl px-3 py-2">
            <Search size={17} className="muted-icon" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Buscar lançamento..." />
          </label>
          <select value={type} onChange={(event) => setType(event.target.value)} className="input">
            <option value="all">Todos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
          </select>
        </div>

        <div className="space-y-3">
          {filteredTransactions.map((item) => {
            const isIncome = item.type === "income";
            const cardName = cards.find((card) => card.id === item.card_id)?.name;
            return (
              <article key={item.id} className="transaction-row demo-row-animate flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className={classNames("rounded-2xl p-2", isIncome ? "income-icon" : "expense-icon")}>
                    {isIncome ? <ArrowUpCircle size={22} /> : <ArrowDownCircle size={22} />}
                  </div>
                  <div>
                    <h3 className="font-black">{item.description}</h3>
                    <p className="muted-text text-sm">
                      {item.category} · {item.method} {cardName ? `· ${cardName}` : ""} · {formatDateBR(item.date)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <strong className={classNames("mr-2 text-lg", isIncome ? "text-emerald-500" : "text-rose-500")}>{isIncome ? "+" : "-"} {money.format(item.amount)}</strong>
                  <button onClick={() => onDuplicate(item)} className="outline-button rounded-xl px-3 py-2 text-xs font-black">Duplicar</button>
                  <button onClick={() => onDelete(item.id)} className="icon-button rounded-xl p-2 hover:text-rose-500" title="Excluir"><Trash2 size={17} /></button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function DemoGoalsPage({ goals, onDeposit, onCreateAccount }) {
  return (
    <main className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <section className="grid gap-4">
        {goals.map((goal) => {
          const percent = goal.target_amount > 0 ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100)) : 0;
          return (
            <article key={goal.id} className="surface-card demo-row-animate rounded-[2rem] p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-black">{goal.title}</h2>
                  <p className="muted-text text-sm">Prazo: {formatDateBR(goal.deadline)}</p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-black text-emerald-400">{percent}%</span>
              </div>
              <ProgressBar value={goal.current_amount} max={goal.target_amount} />
              <p className="muted-text mt-3 text-sm font-semibold">{money.format(goal.current_amount)} de {money.format(goal.target_amount)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[100, 250, 500].map((value) => (
                  <button key={value} onClick={() => onDeposit(goal.id, value)} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-700">
                    + {money.format(value)}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </section>

      <section className="surface-card rounded-[2rem] p-6 shadow-sm">
        <div className="rounded-2xl bg-emerald-500/10 p-4 text-emerald-300">
          <Target size={28} />
        </div>
        <h2 className="mt-5 text-2xl font-black">Metas ficam mais claras com ações rápidas</h2>
        <p className="muted-text mt-3 text-sm leading-7">
          Na conta real, o usuário pode cadastrar objetivos, acompanhar evolução e atualizar valores sem editar tudo de novo.
        </p>
        <button onClick={onCreateAccount} className="mt-6 w-full rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white transition hover:bg-emerald-700">
          Criar conta e salvar minhas metas
        </button>
      </section>
    </main>
  );
}

function DemoCardsPage({ cards, transactions, selectedCardId, setSelectedCardId, onPurchase, onPayment, onCreateAccount }) {
  const selectedCard = cards.find((card) => card.id === selectedCardId) || cards[0];
  const selectedTransactions = transactions.filter((item) => item.card_id === selectedCard?.id && item.type === "expense");

  return (
    <main className="transactions-layout grid gap-6 lg:grid-cols-[380px_1fr]">
      <section id="new-transaction-form-card" className="surface-card compact-entry-card rounded-[2rem] p-5 shadow-sm">
        <h2 className="text-2xl font-black">Fatura interativa</h2>
        <p className="muted-text mt-2 text-sm leading-7">Escolha um cartão e simule compras ou pagamento da fatura.</p>

        <div className="mt-5 grid gap-3">
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => setSelectedCardId(card.id)}
              className={classNames("transaction-row rounded-2xl p-4 text-left transition hover:scale-[1.01]", selectedCard?.id === card.id && "demo-selected-card")}
            >
              <div className="mb-2 h-3 w-12 rounded-full" style={{ background: card.color || "#059669" }} />
              <div className="flex items-center justify-between gap-3">
                <strong>{card.name}</strong>
                <span className="text-sm font-black">{card.percent}%</span>
              </div>
              <ProgressBar value={card.spent} max={card.card_limit || 1} danger={card.percent >= 90} />
              <p className="muted-text mt-2 text-xs">{money.format(card.spent)} usado de {money.format(card.card_limit)}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="surface-card rounded-[2rem] p-5 shadow-sm">
        {selectedCard ? (
          <>
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-2xl font-black">{selectedCard.name}</h2>
                <p className="muted-text text-sm">{formatCardType(selectedCard.card_type)} · {formatCardClosingDay(selectedCard.closing_day)} · {formatCardDueDay(selectedCard.due_day)}</p>
              </div>
              <strong className="text-emerald-400">{money.format(selectedCard.available)} livre</strong>
            </div>

            <section className="mb-5 grid gap-3 md:grid-cols-3">
              <MetricCard title="Limite" value={money.format(selectedCard.card_limit)} icon={<CreditCard />} tone="blue" />
              <MetricCard title="Usado" value={money.format(selectedCard.spent)} icon={<ArrowDownCircle />} tone="rose" />
              <MetricCard title="Disponível" value={money.format(selectedCard.available)} icon={<Wallet />} tone="emerald" />
            </section>

            <div className="mb-5 flex flex-wrap gap-2">
              <button onClick={() => onPurchase(selectedCard.id, 120)} className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-black text-white transition hover:bg-rose-700">Simular compra R$ 120</button>
              <button onClick={() => onPurchase(selectedCard.id, 350)} className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-black text-white transition hover:bg-rose-700">Simular compra R$ 350</button>
              <button onClick={() => onPayment(selectedCard.id, 150)} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-700">Pagar R$ 150</button>
              <button onClick={onCreateAccount} className="outline-button rounded-2xl px-4 py-2 text-sm font-black">Usar de verdade</button>
            </div>

            <div className="space-y-3">
              {selectedTransactions.length ? selectedTransactions.map((item) => (
                <article key={item.id} className="transaction-row flex items-center justify-between rounded-2xl p-4">
                  <div>
                    <strong>{item.description}</strong>
                    <p className="muted-text text-sm">{item.category} · {formatDateBR(item.date)}</p>
                  </div>
                  <strong className="text-rose-500">- {money.format(item.amount)}</strong>
                </article>
              )) : <EmptyState text="Nenhuma compra nesse cartão dentro da demonstração." />}
            </div>
          </>
        ) : (
          <EmptyState text="Selecione um cartão para visualizar a fatura." />
        )}
      </section>
    </main>
  );
}

function DemoReportsPage({ summary, transactions, goals, cards, onExport, onCreateAccount }) {
  return (
    <main className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <section className="surface-card rounded-[2rem] p-6 shadow-sm">
        <h2 className="text-2xl font-black">Relatório demonstrativo</h2>
        <p className="muted-text mt-2 text-sm leading-7">Resumo visual dos dados fictícios que mudam conforme você interage com a demonstração.</p>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <MetricCard title="Receitas" value={money.format(summary.income)} icon={<ArrowUpCircle />} tone="emerald" />
          <MetricCard title="Despesas" value={money.format(summary.expense)} icon={<ArrowDownCircle />} tone="rose" />
          <MetricCard title="Saldo" value={money.format(summary.balance)} icon={<Wallet />} tone={summary.balance >= 0 ? "blue" : "rose"} />
          <MetricCard title="Registros" value={String(transactions.length)} icon={<FileText />} tone="amber" />
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={onExport} className="rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white"><Download className="mr-2 inline" size={18} /> Simular exportação</button>
          <button onClick={onCreateAccount} className="outline-button rounded-2xl px-5 py-3 font-black">Criar conta para salvar</button>
        </div>
      </section>

      <section className="surface-card rounded-[2rem] p-6 shadow-sm">
        <h2 className="text-xl font-black">Resumo da experiência</h2>
        <div className="mt-4 space-y-3">
          <div className="transaction-row rounded-2xl p-4"><strong>{goals.length} metas</strong><p className="muted-text mt-1 text-sm">Com progresso e depósitos rápidos.</p></div>
          <div className="transaction-row rounded-2xl p-4"><strong>{cards.length} cartões</strong><p className="muted-text mt-1 text-sm">Com limite, fatura e compras simuladas.</p></div>
          <div className="transaction-row rounded-2xl p-4"><strong>{transactions.length} lançamentos</strong><p className="muted-text mt-1 text-sm">Receitas e despesas para testar filtros e gráficos.</p></div>
        </div>
      </section>
    </main>
  );
}



function AuthScreen({ mode, setMode, onBack, onSuccess, systemMessage }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState(systemMessage || "");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);
  const isLogin = mode === "login";
  const isReset = mode === "reset";
  const isUpdatePassword = mode === "update-password";

  const normalizedEmail = email.trim().toLowerCase();
  const emailValidationMessage = useMemo(() => validateEmail(email), [email]);
  const shouldShowEmailValidation = emailTouched && email.trim().length > 0;

  const passwordChecks = useMemo(
    () => ({
      minLength: password.length >= 6,
      hasLetter: /[A-Za-zÀ-ÿ]/.test(password),
      hasNumber: /\d/.test(password),
    }),
    [password]
  );

  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length;
  const passwordsMatch = !confirmPassword || password === confirmPassword;

  const subtitleText = isUpdatePassword
    ? "Digite e confirme sua nova senha para voltar ao painel."
    : isReset
      ? "Informe seu e-mail para receber um link seguro."
      : isLogin
        ? "Entre na sua conta"
        : "Crie sua conta";

  useEffect(() => {
    const isRecoveryMessage = String(systemMessage || "").toLowerCase().includes("link validado");
    setMessage(isRecoveryMessage && mode !== "update-password" ? "" : systemMessage || "");
  }, [systemMessage, mode]);

  useEffect(() => {
    setEmailTouched(false);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setResetSent(false);
    setResetCooldown(0);
  }, [mode]);

  useEffect(() => {
    if (!resetCooldown) return;
    const timer = window.setInterval(() => {
      setResetCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resetCooldown]);

  useEffect(() => {
    if (!isUpdatePassword) return;
    const timer = window.setTimeout(() => {
      clearPasswordRecoveryTarget();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [isUpdatePassword]);

  async function handleAuth(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const trimmedName = name.trim();

      if (isUpdatePassword) {
        if (password.length < 6) {
          setMessage("A nova senha precisa ter pelo menos 6 caracteres.");
          return;
        }

        if (password !== confirmPassword) {
          setMessage("As senhas não conferem. Verifique e tente novamente.");
          return;
        }

        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;

        clearPasswordRecoveryTarget();
        setMessage("Senha atualizada com sucesso. Redirecionando para seu painel...");
        window.setTimeout(() => onSuccess(), 900);
        return;
      }

      setEmailTouched(true);
      const emailError = validateEmail(normalizedEmail);

      if (emailError) {
        setMessage(emailError);
        return;
      }

      if (isReset) {
        markPasswordRecoveryTarget();
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}?auth=recovery&next=reset-password`,
        });

        if (error) throw error;
        setResetSent(true);
        setResetCooldown(60);
        setMessage("");
        return;
      }

      if (!isLogin && trimmedName.length < 2) {
        setMessage("Informe um nome com pelo menos 2 caracteres.");
        return;
      }

      if (!isReset && password.length < 6) {
        setMessage("A senha precisa ter pelo menos 6 caracteres.");
        return;
      }

      if (!isLogin && password !== confirmPassword) {
        setMessage("As senhas não conferem. Verifique e tente novamente.");
        return;
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
        onSuccess();
        return;
      }

      markEmailConfirmationTarget();

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}?auth=confirming&next=dashboard`,
          data: { name: trimmedName },
        },
      });

      if (error) {
        clearEmailConfirmationTarget();
        throw error;
      }

      if (data?.session) {
        onSuccess();
      } else {
        setMessage("Conta criada! Confirme seu e-mail para finalizar o cadastro e liberar o acesso.");
        setMode("login");
      }
    } catch (error) {
      setMessage(error.message || "Erro ao autenticar usuário.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="surface-card w-full max-w-md rounded-[2rem] p-6 shadow-xl">
        <button onClick={onBack} className="ghost-button mb-5 inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold">
          <Home size={16} /> Voltar para a Home
        </button>

        <div className="mb-6 text-center">
          <img src={logoEA} alt="Logo" className="mx-auto mb-4 h-16 w-16 rounded-2xl" />
          <h1 className="text-3xl font-black">Controle Financeiro</h1>
          <p className="muted-text mt-2 text-sm">{subtitleText}</p>
        </div>

        {isUpdatePassword && (
          <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-semibold leading-6 text-emerald-300">
            Link validado. Agora escolha uma nova senha para proteger sua conta.
          </div>
        )}

        {isReset && !resetSent && (
          <p className="mb-5 text-center text-sm font-semibold leading-6 text-slate-400">
            Enviaremos um link seguro para você criar uma nova senha.
          </p>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && !isReset && !isUpdatePassword && (
            <Field label="Nome">
              <input value={name} onChange={(event) => setName(event.target.value)} className="input" placeholder="Seu nome" required />
            </Field>
          )}

          {!isUpdatePassword && (
            <Field label="E-mail">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => {
                  setEmail(normalizedEmail);
                  setEmailTouched(true);
                }}
                className={classNames("input", shouldShowEmailValidation && emailValidationMessage ? "input-error" : "")}
                placeholder="seuemail@email.com"
                autoComplete="email"
                inputMode="email"
                spellCheck={false}
                required
              />
              {shouldShowEmailValidation && emailValidationMessage && (
                <p className="mt-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300">
                  {emailValidationMessage}
                </p>
              )}
              {shouldShowEmailValidation && !emailValidationMessage && (
                <p className="mt-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300">
                  E-mail válido.
                </p>
              )}
            </Field>
          )}

          {(!isReset || isUpdatePassword) && (
            <PasswordInput
              label={isUpdatePassword ? "Nova senha" : "Senha"}
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
              placeholder={isUpdatePassword ? "Digite a nova senha" : "Digite sua senha"}
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
          )}

          {!isLogin && !isReset && (
            <>
              <PasswordInput
                label={isUpdatePassword ? "Confirmar nova senha" : "Confirmar senha"}
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((value) => !value)}
                placeholder={isUpdatePassword ? "Digite a nova senha novamente" : "Digite a senha novamente"}
                autoComplete="new-password"
              />

              {confirmPassword && !passwordsMatch && (
                <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm font-semibold text-rose-300">
                  As senhas digitadas ainda não conferem.
                </p>
              )}

              <div className="rounded-2xl border border-slate-500/15 bg-slate-500/10 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-black">Segurança da senha</p>
                  <span className="muted-text text-xs font-bold">
                    {passwordStrength === 3 ? "Boa" : passwordStrength === 2 ? "Média" : "Básica"}
                  </span>
                </div>
                <div className="mb-3 grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((level) => (
                    <span
                      key={level}
                      className={classNames(
                        "h-2 rounded-full transition",
                        passwordStrength >= level ? "bg-emerald-500" : "bg-slate-500/20"
                      )}
                    />
                  ))}
                </div>
                <div className="grid gap-1 text-xs font-semibold">
                  <PasswordRule active={passwordChecks.minLength} text="Mínimo de 6 caracteres" />
                  <PasswordRule active={passwordChecks.hasLetter} text="Pelo menos uma letra" />
                  <PasswordRule active={passwordChecks.hasNumber} text="Pelo menos um número" />
                </div>
              </div>
            </>
          )}

          {resetSent && isReset && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-semibold leading-6 text-emerald-300">
              Link enviado. Verifique sua caixa de entrada, spam ou lixo eletrônico.
            </div>
          )}

          {message && !(isReset && resetSent) && <p className="rounded-2xl bg-slate-500/10 p-3 text-sm font-semibold text-emerald-400">{message}</p>}

          <button disabled={loading || (isReset && resetCooldown > 0)} className="w-full rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white transition hover:bg-emerald-700 disabled:opacity-60">
            {loading ? "Aguarde..." : isUpdatePassword ? "Salvar nova senha" : isReset ? (resetSent && resetCooldown > 0 ? `Reenviar em ${resetCooldown}s` : resetSent ? "Reenviar link" : "Enviar link") : isLogin ? "Entrar" : "Cadastrar"}
          </button>
        </form>

        <div className="mt-5 grid gap-2 text-center text-sm font-bold">
          {!isReset && !isUpdatePassword && (
            <button onClick={() => setMode(isLogin ? "signup" : "login")} className="text-emerald-400 hover:text-emerald-300">
              {isLogin ? "Ainda não tenho conta" : "Já tenho conta, fazer login"}
            </button>
          )}
          <button
            onClick={() => {
              if (isUpdatePassword) clearPasswordRecoveryTarget();
              setMode(isReset || isUpdatePassword ? "login" : "reset");
            }}
            className="muted-text hover:text-emerald-400"
          >
            {isReset ? "Já lembrei minha senha" : isUpdatePassword ? "Voltar para o login" : "Esqueci minha senha"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ darkMode, setDarkMode, session, onSignOut, onHome }) {
  const user = session.user;
  const userName = user?.user_metadata?.name || user?.email?.split("@")[0] || "usuário";

  const [page, setPage] = useState("dashboard");
  const [loadingData, setLoadingData] = useState(true);
  const [minimumDataLoadingDone, setMinimumDataLoadingDone] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", type: "info" });
  const toastTimeoutRef = useRef(null);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: "",
    message: "",
    confirmText: "Confirmar",
    cancelText: "Cancelar",
    danger: false,
    onConfirm: null,
  });
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));

  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [limits, setLimits] = useState([]);
  const [recurringItems, setRecurringItems] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [cardAdjustments, setCardAdjustments] = useState([]);
  const [paymentAllocations, setPaymentAllocations] = useState([]);
  const [preferences, setPreferences] = useState(null);

  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(["Todas"]);
  const [typeFilter, setTypeFilter] = useState(["all"]);
  const [cardFilter, setCardFilter] = useState(["all"]);
  const [sortBy, setSortBy] = useState("recent");

  const emptyForm = {
    type: "expense",
    description: "",
    category: "Mercado",
    method: "Pix",
    amount: "",
    date: "",
    card_id: "",
    is_installment: false,
    installments: "1",
    notes: "",
  };

  const emptyGoalForm = { title: "", target_amount: "", current_amount: "", deadline: "" };
  const emptyCardForm = { name: "", card_type: "Crédito", card_limit: "", closing_day: "0", due_day: "0", color: "#059669", is_active: true };
  const emptyRecurringForm = {
    type: "expense",
    description: "",
    category: "Mercado",
    method: "Pix",
    amount: "",
    recurrence_type: "monthly",
    interval_months: "2",
    start_date: todayISODate(),
    day_of_month: "5",
    is_active: true,
  };

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const [goalForm, setGoalForm] = useState(emptyGoalForm);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [editGoalForm, setEditGoalForm] = useState(emptyGoalForm);
  const [limitForm, setLimitForm] = useState({ category: "Mercado", monthly_limit: "" });
  const [recurringForm, setRecurringForm] = useState(emptyRecurringForm);
  const [editingRecurringId, setEditingRecurringId] = useState(null);
  const [editRecurringForm, setEditRecurringForm] = useState(emptyRecurringForm);
  const [profileName, setProfileName] = useState(userName);
  const [cardForm, setCardForm] = useState(emptyCardForm);
  const [editingCardId, setEditingCardId] = useState(null);
  const [editCardForm, setEditCardForm] = useState(emptyCardForm);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [mobileQuickActionsOpen, setMobileQuickActionsOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [preferencesForm, setPreferencesForm] = useState({ monthly_income: "", main_goal: "", currency: "BRL", default_theme: "system" });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMinimumDataLoadingDone(true);
    }, MINIMUM_LOADING_TIME_MS);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    loadAllData();
  }, [user.id]);

  useEffect(() => {
    const categories = defaultCategories[form.type];
    if (!categories.includes(form.category)) {
      setForm((current) => ({ ...current, category: categories[0] }));
    }
  }, [form.type]);

  useEffect(() => {
    const categories = defaultCategories[recurringForm.type];
    if (!categories.includes(recurringForm.category)) {
      setRecurringForm((current) => ({ ...current, category: categories[0] }));
    }
  }, [recurringForm.type]);

  function getToastType(message, type = "auto") {
    if (type !== "auto") return type;

    const lowerMessage = String(message || "").toLowerCase();

    if (lowerMessage.includes("erro") || lowerMessage.includes("inválid")) return "error";
    if (
      lowerMessage.includes("preencha") ||
      lowerMessage.includes("informe") ||
      lowerMessage.includes("atenção") ||
      lowerMessage.includes("bloqueou") ||
      lowerMessage.includes("não possui")
    ) {
      return "warning";
    }
    if (
      lowerMessage.includes("sucesso") ||
      lowerMessage.includes("salv") ||
      lowerMessage.includes("criad") ||
      lowerMessage.includes("excluíd") ||
      lowerMessage.includes("atualizad") ||
      lowerMessage.includes("importad") ||
      lowerMessage.includes("exportad") ||
      lowerMessage.includes("gerad")
    ) {
      return "success";
    }

    return "info";
  }

  function showToast(message, type = "auto") {
    const toastType = getToastType(message, type);
    setToast({ open: true, message, type: toastType });

    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = window.setTimeout(() => {
      setToast((current) => ({ ...current, open: false }));
    }, 3600);
  }

  function hideToast() {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setToast((current) => ({ ...current, open: false }));
  }

  function openConfirmModal({
    title = "Confirmação",
    message = "Tem certeza que deseja continuar?",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    danger = false,
    onConfirm,
  }) {
    setConfirmModal({ open: true, title, message, confirmText, cancelText, danger, onConfirm });
  }

  function closeConfirmModal() {
    setConfirmModal({
      open: false,
      title: "",
      message: "",
      confirmText: "Confirmar",
      cancelText: "Cancelar",
      danger: false,
      onConfirm: null,
    });
  }

  async function loadAllData() {
    setLoadingData(true);
    hideToast();

    try {
      const [transactionsResult, goalsResult, limitsResult, recurringResult, cardsResult, cardAdjustmentsResult, paymentAllocationsResult, preferencesResult] = await Promise.all([
        supabase.from("transactions").select("*").eq("user_id", user.id).order("date", { ascending: false }),
        supabase.from("goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("category_limits").select("*").eq("user_id", user.id).order("category", { ascending: true }),
        supabase.from("recurring_items").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("credit_cards").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("card_adjustments").select("*").eq("user_id", user.id).order("date", { ascending: false }),
        supabase.from("payment_allocations").select("*").eq("user_id", user.id).order("payment_date", { ascending: false }),
        supabase.from("user_preferences").select("*").eq("user_id", user.id).limit(1),
      ]);

      const error = transactionsResult.error || goalsResult.error || limitsResult.error || recurringResult.error || cardsResult.error || cardAdjustmentsResult.error || paymentAllocationsResult.error || preferencesResult.error;
      if (error) throw error;

      setTransactions((transactionsResult.data || []).map(normalizeTransaction));
      setGoals((goalsResult.data || []).map(normalizeGoal));
      setLimits((limitsResult.data || []).map(normalizeLimit));
      setRecurringItems((recurringResult.data || []).map(normalizeRecurring));
      setCreditCards((cardsResult.data || []).map(normalizeCard));
      setCardAdjustments((cardAdjustmentsResult.data || []).map(normalizeCardAdjustment));
      setPaymentAllocations((paymentAllocationsResult.data || []).map(normalizePaymentAllocation));

      let preferenceRow = (preferencesResult.data || [])[0];
      if (!preferenceRow) {
        const { data: createdPreference, error: preferenceError } = await supabase
          .from("user_preferences")
          .upsert({ user_id: user.id }, { onConflict: "user_id" })
          .select("*")
          .single();
        if (preferenceError) throw preferenceError;
        preferenceRow = createdPreference;
      }

      const normalizedPreferences = normalizePreferences(preferenceRow);
      setPreferences(normalizedPreferences);
      setPreferencesForm({
        monthly_income: normalizedPreferences.monthly_income ? String(normalizedPreferences.monthly_income) : "",
        main_goal: normalizedPreferences.main_goal || "",
        currency: normalizedPreferences.currency || "BRL",
        default_theme: normalizedPreferences.default_theme || "system",
      });
    } catch (error) {
      showToast(`Erro ao carregar dados: ${error.message}. Confira se o SQL completo foi executado no Supabase.`);
    } finally {
      setLoadingData(false);
    }
  }

  const monthTransactions = useMemo(() => {
    return transactions.filter((item) => item.date?.slice(0, 7) === selectedMonth);
  }, [transactions, selectedMonth]);

  const visibleTransactions = useMemo(() => {
    const selectedCategories = Array.isArray(categoryFilter) ? categoryFilter : [categoryFilter];
    const selectedTypes = Array.isArray(typeFilter) ? typeFilter : [typeFilter];
    const selectedCards = Array.isArray(cardFilter) ? cardFilter : [cardFilter];

    const filtered = monthTransactions
      .filter((item) => selectedCategories.includes("Todas") || selectedCategories.includes(item.category))
      .filter((item) => selectedTypes.includes("all") || selectedTypes.includes(item.type))
      .filter((item) => !dateFilter || item.date === dateFilter)
      .filter((item) => {
        if (selectedCards.includes("all")) return true;
        if (selectedCards.includes("none") && !item.card_id) return true;
        return selectedCards.includes(item.card_id);
      })
      .filter((item) => {
        const search = query.trim().toLowerCase();
        if (!search) return true;
        return [item.description, item.category, item.method, item.type, item.notes].join(" ").toLowerCase().includes(search);
      });

    return filtered.sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.date) - new Date(b.date);
      if (sortBy === "highest") return Number(b.amount) - Number(a.amount);
      if (sortBy === "lowest") return Number(a.amount) - Number(b.amount);
      return new Date(b.date) - new Date(a.date);
    });
  }, [monthTransactions, categoryFilter, typeFilter, cardFilter, dateFilter, query, sortBy]);

  const visibleRegularTransactions = useMemo(() => {
    return visibleTransactions.filter((item) => !item.card_id);
  }, [visibleTransactions]);

  const visibleCardTransactions = useMemo(() => {
    return visibleTransactions.filter((item) => item.card_id);
  }, [visibleTransactions]);

  const summary = useMemo(() => {
    const income = monthTransactions.filter((item) => item.type === "income").reduce((total, item) => total + Number(item.amount), 0);
    const expense = monthTransactions.filter((item) => item.type === "expense").reduce((total, item) => total + Number(item.amount), 0);
    const balance = income - expense;
    const savingRate = income > 0 ? Math.round((balance / income) * 100) : 0;
    return { income, expense, balance, savingRate };
  }, [monthTransactions]);

  const financialHealth = useMemo(() => buildFinancialHealth(summary, preferences), [summary, preferences]);

  const expenseByCategory = useMemo(() => {
    const map = new Map();
    monthTransactions
      .filter((item) => item.type === "expense")
      .forEach((item) => map.set(item.category, (map.get(item.category) || 0) + Number(item.amount)));
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [monthTransactions]);

  const dailyFlow = useMemo(() => {
    const map = new Map();
    monthTransactions.forEach((item) => {
      const day = item.date.slice(8, 10);
      const current = map.get(day) || { day, income: 0, expense: 0 };
      current[item.type] += Number(item.amount);
      map.set(day, current);
    });
    return Array.from(map.values()).sort((a, b) => Number(a.day) - Number(b.day));
  }, [monthTransactions]);

  const monthlyComparison = useMemo(() => {
    const map = new Map();
    transactions.forEach((item) => {
      const month = item.date?.slice(0, 7);
      if (!month) return;
      const current = map.get(month) || { month, label: monthLabel(month), income: 0, expense: 0, balance: 0 };
      current[item.type] += Number(item.amount);
      current.balance = current.income - current.expense;
      map.set(month, current);
    });

    return Array.from(map.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
  }, [transactions]);

  const topExpenses = useMemo(() => {
    return [...monthTransactions]
      .filter((item) => item.type === "expense")
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 5);
  }, [monthTransactions]);

  const allCategories = useMemo(() => {
    const categories = new Set(["Todas"]);
    transactions.forEach((item) => categories.add(item.category));
    limits.forEach((item) => categories.add(item.category));
    return Array.from(categories);
  }, [transactions, limits]);

  const categoryUsage = useMemo(() => {
    return limits.map((limit) => {
      const spent = expenseByCategory.find((item) => item.name === limit.category)?.value || 0;
      const percent = limit.monthly_limit > 0 ? Math.round((spent / limit.monthly_limit) * 100) : 0;
      return { ...limit, spent, percent, exceeded: spent > limit.monthly_limit };
    });
  }, [limits, expenseByCategory]);

  const limitAlerts = categoryUsage.filter((item) => item.exceeded);


  const previousMonthTransactions = useMemo(() => {
    const previous = previousMonthValue(selectedMonth);
    return transactions.filter((item) => item.date?.slice(0, 7) === previous);
  }, [transactions, selectedMonth]);

  const previousSummary = useMemo(() => {
    const income = previousMonthTransactions.filter((item) => item.type === "income").reduce((total, item) => total + Number(item.amount), 0);
    const expense = previousMonthTransactions.filter((item) => item.type === "expense").reduce((total, item) => total + Number(item.amount), 0);
    return { income, expense, balance: income - expense };
  }, [previousMonthTransactions]);

  const cardUsage = useMemo(() => {
    const monthEnd = getMonthEndISO(selectedMonth);

    return creditCards.map((card) => {
      const totalExpenses = transactions
        .filter((item) => item.type === "expense" && item.card_id === card.id && item.date <= monthEnd)
        .reduce((total, item) => total + Number(item.amount || 0), 0);

      const cardEvents = cardAdjustments.filter((item) => item.card_id === card.id && item.date <= monthEnd);
      const totalPayments = cardEvents
        .filter((item) => item.adjustment_type === "payment")
        .reduce((total, item) => total + Number(item.amount || 0), 0);
      const totalCredits = cardEvents
        .filter((item) => item.adjustment_type === "credit")
        .reduce((total, item) => total + Number(item.amount || 0), 0);

      const limit = Number(card.card_limit || 0);
      const storedValueCard = isStoredValueCardType(card.card_type);
      const totalAvailableBase = storedValueCard ? limit + totalCredits : limit;
      const openAmount = storedValueCard
        ? Math.max(0, totalExpenses)
        : Math.max(0, totalExpenses - totalPayments);
      const available = storedValueCard
        ? Math.max(0, totalAvailableBase - totalExpenses)
        : Math.max(0, limit - openAmount);
      const percent = totalAvailableBase > 0 ? Math.min(999, Math.round((openAmount / totalAvailableBase) * 100)) : 0;

      return {
        ...card,
        spent: openAmount,
        total_expenses: totalExpenses,
        total_payments: totalPayments,
        total_credits: totalCredits,
        total_available_base: totalAvailableBase,
        available,
        percent,
        stored_value_card: storedValueCard,
      };
    });
  }, [creditCards, transactions, cardAdjustments, selectedMonth]);

  const annualMonthlyData = useMemo(() => {
    return monthOptions.map((option) => {
      const month = `${selectedYear}-${option.value}`;
      const monthItems = transactions.filter((item) => item.date?.slice(0, 7) === month);
      const income = monthItems.filter((item) => item.type === "income").reduce((total, item) => total + Number(item.amount), 0);
      const expense = monthItems.filter((item) => item.type === "expense").reduce((total, item) => total + Number(item.amount), 0);
      return { month, label: option.label.slice(0, 3), income, expense, balance: income - expense };
    });
  }, [transactions, selectedYear]);

  const annualSummary = useMemo(() => {
    const income = annualMonthlyData.reduce((total, item) => total + item.income, 0);
    const expense = annualMonthlyData.reduce((total, item) => total + item.expense, 0);
    const bestMonth = [...annualMonthlyData].sort((a, b) => b.balance - a.balance)[0];
    const worstMonth = [...annualMonthlyData].sort((a, b) => a.balance - b.balance)[0];
    return { income, expense, balance: income - expense, bestMonth, worstMonth, averageSaving: Math.round((income - expense) / 12) };
  }, [annualMonthlyData]);

  const smartInsights = useMemo(() => {
    const insights = [];
    if (summary.expense > previousSummary.expense && previousSummary.expense > 0) {
      const diff = summary.expense - previousSummary.expense;
      const percent = Math.round((diff / previousSummary.expense) * 100);
      insights.push(`Você gastou ${percent}% a mais que no mês anterior (${money.format(diff)}).`);
    }
    if (summary.expense < previousSummary.expense && previousSummary.expense > 0) {
      const diff = previousSummary.expense - summary.expense;
      insights.push(`Você economizou ${money.format(diff)} em despesas comparado ao mês anterior.`);
    }
    if (topExpenses[0]) insights.push(`Seu maior gasto do mês foi ${topExpenses[0].description}, no valor de ${money.format(topExpenses[0].amount)}.`);
    const incomeBaseForInsight = Number(summary.income || preferences?.monthly_income || 0);
    if (incomeBaseForInsight > 0 && topExpenses[0] && Number(topExpenses[0].amount) / incomeBaseForInsight >= 0.2) {
      insights.push(`Atenção: seu maior gasto representa ${Math.round((Number(topExpenses[0].amount) / incomeBaseForInsight) * 100)}% da sua renda/base mensal.`);
    }
    if (categoryUsage.some((item) => item.exceeded)) insights.push(`Há categorias acima do limite: ${categoryUsage.filter((item) => item.exceeded).map((item) => item.category).join(", ")}.`);
    const closeGoal = goals.find((goal) => goal.target_amount > 0 && goal.current_amount / goal.target_amount >= 0.8 && goal.current_amount < goal.target_amount);
    if (closeGoal) insights.push(`Você está perto de concluir a meta "${closeGoal.title}".`);
    if (!insights.length) insights.push("Cadastre mais lançamentos para receber insights automáticos sobre sua rotina financeira.");
    return insights.slice(0, 4);
  }, [summary, previousSummary, topExpenses, categoryUsage, goals, preferences]);

  const financialNotifications = useMemo(() => {
    const notifications = [];
    const seen = new Set();
    const [year, month] = String(selectedMonth || getCurrentMonth()).split("-").map(Number);
    const currentMonth = getCurrentMonth();
    const today = new Date();
    const todayClean = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const referenceDate = selectedMonth === currentMonth ? todayClean : monthStart;
    const incomeBase = Number(summary.income || preferences?.monthly_income || 0);

    function addNotification({ title, text, tone = "blue", priority = 5, badge = "Aviso", action = "" }) {
      const key = `${title}-${text}`;
      if (seen.has(key)) return;
      seen.add(key);
      notifications.push({ title, text, tone, priority, badge, action });
    }

    if (summary.balance < 0) {
      addNotification({
        title: "Saldo negativo no mês",
        text: `Suas despesas passaram das receitas em ${money.format(Math.abs(summary.balance))}.`,
        tone: "rose",
        priority: 1,
        badge: "Crítico",
        action: "Revise os maiores gastos e veja a aba Pagamentos.",
      });
    }

    if (incomeBase > 0 && summary.expense / incomeBase >= 0.9) {
      addNotification({
        title: "Orçamento quase no limite",
        text: `Você já comprometeu ${Math.round((summary.expense / incomeBase) * 100)}% da sua renda/base mensal.`,
        tone: summary.expense > incomeBase ? "rose" : "amber",
        priority: summary.expense > incomeBase ? 1 : 2,
        badge: summary.expense > incomeBase ? "Crítico" : "Atenção",
        action: "Evite novas despesas variáveis até fechar o mês.",
      });
    }

    if (summary.expense > previousSummary.expense && previousSummary.expense > 0) {
      const diff = summary.expense - previousSummary.expense;
      const percent = Math.round((diff / previousSummary.expense) * 100);
      if (percent >= 25 && diff >= 100) {
        addNotification({
          title: "Gastos subiram rápido",
          text: `As despesas estão ${percent}% acima do mês anterior, uma diferença de ${money.format(diff)}.`,
          tone: "amber",
          priority: 3,
          badge: "Tendência",
          action: "Compare categorias no relatório mensal.",
        });
      }
    }

    categoryUsage
      .filter((item) => item.monthly_limit > 0 && item.percent >= 80)
      .forEach((item) => {
        const exceeded = item.spent > item.monthly_limit;
        addNotification({
          title: exceeded ? `Limite ultrapassado: ${item.category}` : `Limite próximo: ${item.category}`,
          text: exceeded
            ? `Você gastou ${money.format(item.spent)} em um limite de ${money.format(item.monthly_limit)}.`
            : `Você já usou ${item.percent}% do limite de ${money.format(item.monthly_limit)}.`,
          tone: exceeded ? "rose" : "amber",
          priority: exceeded ? 1 : 3,
          badge: exceeded ? "Crítico" : "Atenção",
          action: exceeded ? "Considere pausar gastos nessa categoria." : "Acompanhe antes de passar do limite.",
        });
      });

    const previousCategoryMap = new Map();
    previousMonthTransactions
      .filter((item) => item.type === "expense")
      .forEach((item) => previousCategoryMap.set(item.category, (previousCategoryMap.get(item.category) || 0) + Number(item.amount || 0)));

    expenseByCategory.forEach((item) => {
      const previousValue = previousCategoryMap.get(item.name) || 0;
      const diff = Number(item.value || 0) - previousValue;
      if (previousValue > 0 && diff >= 100 && diff / previousValue >= 0.5) {
        addNotification({
          title: `Alta incomum em ${item.name}`,
          text: `Essa categoria aumentou ${money.format(diff)} em relação ao mês anterior.`,
          tone: "amber",
          priority: 4,
          badge: "Comparativo",
          action: "Abra os lançamentos filtrando essa categoria.",
        });
      }
    });

    cardUsage.forEach((card) => {
      if (!card.is_active) return;
      const base = Number(card.total_available_base || card.card_limit || 0);
      const used = Number(card.spent || 0);
      if (base > 0 && card.percent >= 75) {
        const isCritical = card.percent >= 90;
        addNotification({
          title: `${isCritical ? "Limite crítico" : "Uso alto"}: ${card.name}`,
          text: `${card.percent}% ${card.stored_value_card ? "do saldo" : "do limite"} já está comprometido. Em aberto: ${money.format(used)}.`,
          tone: isCritical ? "rose" : "amber",
          priority: isCritical ? 1 : 3,
          badge: card.stored_value_card ? "Saldo" : "Cartão",
          action: card.stored_value_card ? "Avalie uma recarga ou reduza novos gastos." : "Evite novas compras no cartão até reduzir a fatura.",
        });
      }

      if (!card.stored_value_card && used > 0 && Number(card.due_day || 0) > 0) {
        const dueDate = new Date(year, month - 1, Number(card.due_day));
        const diffDays = Math.ceil((dueDate - referenceDate) / (1000 * 60 * 60 * 24));

        if (selectedMonth === currentMonth && diffDays < 0) {
          addNotification({
            title: `Fatura possivelmente vencida: ${card.name}`,
            text: `Há ${money.format(used)} em aberto e o vencimento foi dia ${card.due_day}.`,
            tone: "rose",
            priority: 1,
            badge: "Vencido",
            action: "Registre o pagamento na aba Pagamentos.",
          });
        } else if (diffDays >= 0 && diffDays <= 5) {
          addNotification({
            title: `Fatura próxima: ${card.name}`,
            text: `Vence em ${diffDays === 0 ? "hoje" : `${diffDays} dia(s)`}. Valor em aberto: ${money.format(used)}.`,
            tone: "blue",
            priority: 2,
            badge: "Vencimento",
            action: "Separe o valor ou faça o pagamento parcial.",
          });
        }
      }
    });

    recurringItems.filter((item) => item.is_active).forEach((item) => {
      const occurrenceDates = getRecurringOccurrenceDates(item, selectedMonth);

      occurrenceDates.forEach((occurrenceDate) => {
        const dueDate = parseISODateSafe(occurrenceDate);
        if (!dueDate) return;

        const diffDays = Math.ceil((dueDate - referenceDate) / (1000 * 60 * 60 * 24));
        const alreadyCreated = monthTransactions.some((transaction) => transaction.recurring_item_id === item.id && transaction.date === occurrenceDate);

        if (!alreadyCreated && diffDays >= 0 && diffDays <= 5) {
          addNotification({
            title: `Fixo próximo: ${item.description}`,
            text: `${item.type === "income" ? "Receita" : "Despesa"} ${getRecurringFrequencyLabel(item).toLowerCase()} de ${money.format(item.amount)} prevista para ${formatDateBR(occurrenceDate)}.`,
            tone: item.type === "income" ? "emerald" : "blue",
            priority: 3,
            badge: "Fixo",
            action: "Gere ou confirme esse lançamento no mês.",
          });
        }
      });
    });

    goals.forEach((goal) => {
      if (!goal.deadline || Number(goal.target_amount || 0) <= 0) return;
      const progress = Number(goal.current_amount || 0) / Number(goal.target_amount || 1);
      if (progress >= 1) return;
      const deadline = new Date(`${goal.deadline}T00:00:00`);
      const diffDays = Math.ceil((deadline - todayClean) / (1000 * 60 * 60 * 24));
      const missing = Math.max(0, Number(goal.target_amount || 0) - Number(goal.current_amount || 0));

      if (diffDays < 0) {
        addNotification({
          title: `Meta vencida: ${goal.title}`,
          text: `Ainda faltam ${money.format(missing)} para concluir essa meta.`,
          tone: "rose",
          priority: 2,
          badge: "Meta",
          action: "Atualize o prazo ou ajuste o valor guardado.",
        });
      } else if (diffDays <= 30) {
        addNotification({
          title: `Meta próxima do prazo: ${goal.title}`,
          text: `Faltam ${diffDays} dia(s) e ainda restam ${money.format(missing)}.`,
          tone: progress >= 0.8 ? "emerald" : "amber",
          priority: progress >= 0.8 ? 5 : 3,
          badge: "Meta",
          action: progress >= 0.8 ? "Você está perto, falta pouco." : "Considere reservar um valor este mês.",
        });
      }
    });

    const selectedMonthEndISO = getMonthEndISO(selectedMonth);
    const futureInstallments = transactions.filter((item) => item.type === "expense" && item.installment_group_id && item.date > selectedMonthEndISO);
    const futureInstallmentsTotal = futureInstallments.reduce((total, item) => total + Number(item.amount || 0), 0);
    const futureInstallmentsGroups = new Set(futureInstallments.map((item) => item.installment_group_id)).size;

    if (futureInstallmentsTotal > 0 && incomeBase > 0 && futureInstallmentsTotal / incomeBase >= 0.5) {
      addNotification({
        title: "Parcelas futuras relevantes",
        text: `${futureInstallmentsGroups} compra(s) parcelada(s) ainda somam ${money.format(futureInstallmentsTotal)} nos próximos meses.`,
        tone: "amber",
        priority: 4,
        badge: "Parcelas",
        action: "Confira as compras parceladas na aba Cartões.",
      });
    }

    if (summary.expense > 0 && summary.income === 0 && !preferences?.monthly_income) {
      addNotification({
        title: "Receita não cadastrada",
        text: "Você tem despesas no mês, mas nenhuma receita/base mensal cadastrada.",
        tone: "blue",
        priority: 6,
        badge: "Cadastro",
        action: "Cadastre sua renda para melhorar os cálculos dos alertas.",
      });
    }

    if (!limits.length && monthTransactions.some((item) => item.type === "expense")) {
      addNotification({
        title: "Crie limites por categoria",
        text: "Você já tem despesas cadastradas. Definir limites deixa os alertas mais precisos.",
        tone: "blue",
        priority: 7,
        badge: "Sugestão",
        action: "Use a aba Limites para criar seu orçamento por categoria.",
      });
    }

    return notifications
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 9);
  }, [selectedMonth, summary, previousSummary, preferences, categoryUsage, expenseByCategory, previousMonthTransactions, cardUsage, recurringItems, monthTransactions, goals, transactions, limits]);

  const calendarEvents = useMemo(() => {
    const events = monthTransactions.map((item) => ({ ...item, source: "transaction", day: Number(item.date.slice(8, 10)) }));
    recurringItems.filter((item) => item.is_active).forEach((item) => {
      getRecurringOccurrenceDates(item, selectedMonth).forEach((date, index) => {
        events.push({
          ...item,
          id: `rec-${item.id}-${date}-${index}`,
          source: "recurring",
          day: Number(date.slice(8, 10)),
          date,
        });
      });
    });
    return events.sort((a, b) => a.day - b.day);
  }, [monthTransactions, recurringItems, selectedMonth]);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = new Set([currentYear - 1, currentYear, currentYear + 1]);
    transactions.forEach((item) => item.date && years.add(Number(item.date.slice(0, 4))));
    if (selectedMonth) years.add(Number(selectedMonth.slice(0, 4)));
    return Array.from(years).filter((year) => Number.isFinite(year)).sort((a, b) => a - b);
  }, [transactions, selectedMonth]);

  async function handleTransactionSubmit(event) {
    event.preventDefault();
    const amount = toNumber(form.amount);
    const description = form.description.trim();

    if (!description || !form.date || !form.category || !amount || amount <= 0) {
      showToast("Preencha descrição, data, categoria e valor maior que zero.");
      return;
    }

    const installments = form.is_installment && form.type === "expense" ? Math.max(1, Number(form.installments || 1)) : 1;
    const cleanCardId = form.card_id || null;

    const payload = {
      user_id: user.id,
      type: form.type,
      description,
      category: form.category,
      method: form.method,
      amount,
      date: form.date,
      card_id: cleanCardId,
      notes: form.notes || null,
    };

    try {
      if (installments > 1) {
        const rows = buildInstallmentRows({
          userId: user.id,
          description,
          category: form.category,
          amount,
          firstDate: form.date,
          cardId: cleanCardId,
          installments,
          notes: form.notes,
        }).map((row) => ({
          ...row,
          method: form.method,
          card_id: cleanCardId,
        }));
        const { error } = await supabase.from("transactions").insert(rows);
        if (error) throw error;
        showToast(cleanCardId ? `${installments} parcelas criadas e enviadas para a aba Cartões.` : `${installments} parcelas criadas com sucesso.`);
      } else {
        const { error } = await supabase.from("transactions").insert(payload);
        if (error) throw error;
        showToast(cleanCardId ? "Lançamento vinculado ao cartão e enviado para a aba Cartões." : "Lançamento adicionado com sucesso.");
      }

      setSelectedMonth(payload.date.slice(0, 7));
      resetTransactionForm();
      await loadAllData();
    } catch (error) {
      showToast(`Erro ao salvar lançamento: ${error.message}`);
    }
  }

  function resetTransactionForm() {
    setForm(emptyForm);
  }

  function closeEditTransactionModal() {
    setEditingId(null);
    setEditForm(emptyForm);
  }

  function handleEditTransaction(item) {
    setEditingId(item.id);
    setEditForm({
      type: item.type,
      description: item.description,
      category: item.category,
      method: item.method,
      amount: String(item.amount),
      date: item.date,
      card_id: item.card_id || "",
      is_installment: Boolean(item.installment_total && item.installment_total > 1),
      installments: String(item.installment_total || 1),
      notes: item.notes || "",
    });
    setPage("transactions");
  }

  async function handleEditTransactionSubmit(event) {
    event.preventDefault();

    const amount = toNumber(editForm.amount);
    const description = editForm.description.trim();

    if (!editingId) {
      showToast("Nenhum lançamento selecionado para edição.", "warning");
      return;
    }

    if (!description || !editForm.date || !editForm.category || !amount || amount <= 0) {
      showToast("Preencha descrição, data, categoria e valor maior que zero.");
      return;
    }

    const payload = {
      user_id: user.id,
      type: editForm.type,
      description,
      category: editForm.category,
      method: editForm.method,
      amount,
      date: editForm.date,
      card_id: editForm.card_id || null,
      notes: editForm.notes || null,
    };

    try {
      const { error } = await supabase.from("transactions").update(payload).eq("id", editingId).eq("user_id", user.id);
      if (error) throw error;

      setSelectedMonth(payload.date.slice(0, 7));
      closeEditTransactionModal();
      showToast("Lançamento atualizado com sucesso.");
      await loadAllData();
    } catch (error) {
      showToast(`Erro ao atualizar lançamento: ${error.message}`);
    }
  }

  function handleDuplicateTransaction(item) {
    closeEditTransactionModal();
    setForm({
      type: item.type,
      description: `${item.description} (cópia)`,
      category: item.category,
      method: item.method,
      amount: String(item.amount),
      date: new Date().toISOString().slice(0, 10),
      card_id: item.card_id || "",
      is_installment: false,
      installments: "1",
      notes: item.notes || "",
    });
    setPage("transactions");
    showToast("Lançamento duplicado no formulário. Revise a data e salve quando estiver pronto.", "info");
  }

  function handleRepeatPreviousExpense() {
    const previousExpense = [...transactions]
      .filter((item) => item.type === "expense" && !item.recurring_item_id && !item.recurrence_month)
      .sort((a, b) => {
        const dateDiff = new Date(b.date || 0) - new Date(a.date || 0);
        if (dateDiff !== 0) return dateDiff;
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      })[0];

    if (!previousExpense) {
      showToast("Ainda não existe uma despesa anterior para repetir.", "info");
      return;
    }

    const previousCardId = previousExpense.card_id && creditCards.some((card) => card.id === previousExpense.card_id && card.is_active)
      ? previousExpense.card_id
      : "";

    setForm({
      ...emptyForm,
      type: "expense",
      description: previousExpense.description || "",
      category: previousExpense.category || "Mercado",
      method: previousExpense.method || "Pix",
      amount: String(previousExpense.amount || ""),
      date: new Date().toISOString().slice(0, 10),
      card_id: previousCardId,
      is_installment: false,
      installments: "1",
      notes: previousExpense.notes || "",
    });

    setPage("transactions");
    scrollToNewTransactionForm();
    showToast("Despesa anterior copiada para o formulário. Revise a data e salve.", "info");
  }

  function handleDeleteTransaction(id) {
    openConfirmModal({
      title: "Excluir lançamento",
      message: "Tem certeza que deseja excluir este lançamento? Essa ação não poderá ser desfeita.",
      confirmText: "Excluir",
      cancelText: "Cancelar",
      danger: true,
      onConfirm: async () => {
        try {
          const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
          if (error) throw error;
          showToast("Lançamento excluído com sucesso.", "success");
          await loadAllData();
        } catch (error) {
          showToast(`Erro ao excluir lançamento: ${error.message}`, "error");
        }
      },
    });
  }

  async function handleGoalSubmit(event) {
    event.preventDefault();
    const target = toNumber(goalForm.target_amount);
    const current = toNumber(goalForm.current_amount);
    const title = goalForm.title.trim();

    if (!title || !target || target <= 0) {
      showToast("Informe o nome da meta e um valor alvo maior que zero.");
      return;
    }

    const payload = {
      user_id: user.id,
      title,
      target_amount: target,
      current_amount: current || 0,
      deadline: goalForm.deadline || null,
    };

    try {
      const { error } = await supabase.from("goals").insert(payload);
      if (error) throw error;
      showToast("Meta criada com sucesso.");
      setGoalForm(emptyGoalForm);
      await loadAllData();
    } catch (error) {
      showToast(`Erro ao salvar meta: ${error.message}`);
    }
  }

  function editGoal(goal) {
    setEditingGoalId(goal.id);
    setEditGoalForm({
      title: goal.title,
      target_amount: String(goal.target_amount),
      current_amount: String(goal.current_amount),
      deadline: goal.deadline || "",
    });
  }

  function closeEditGoalModal() {
    setEditingGoalId(null);
    setEditGoalForm(emptyGoalForm);
  }

  async function handleEditGoalSubmit(event) {
    event.preventDefault();
    const target = toNumber(editGoalForm.target_amount);
    const current = toNumber(editGoalForm.current_amount);
    const title = editGoalForm.title.trim();

    if (!editingGoalId) {
      showToast("Nenhuma meta selecionada para edição.", "warning");
      return;
    }

    if (!title || !target || target <= 0) {
      showToast("Informe o nome da meta e um valor alvo maior que zero.", "warning");
      return;
    }

    try {
      const { error } = await supabase
        .from("goals")
        .update({
          title,
          target_amount: target,
          current_amount: current || 0,
          deadline: editGoalForm.deadline || null,
        })
        .eq("id", editingGoalId)
        .eq("user_id", user.id);

      if (error) throw error;
      showToast("Meta atualizada com sucesso.", "success");
      closeEditGoalModal();
      await loadAllData();
    } catch (error) {
      showToast(`Erro ao atualizar meta: ${error.message}`, "error");
    }
  }

  function deleteGoal(id) {
    openConfirmModal({
      title: "Excluir meta",
      message: "Deseja excluir esta meta? O progresso cadastrado para ela será removido.",
      confirmText: "Excluir",
      cancelText: "Cancelar",
      danger: true,
      onConfirm: async () => {
        const { error } = await supabase.from("goals").delete().eq("id", id).eq("user_id", user.id);
        if (error) showToast(`Erro ao excluir meta: ${error.message}`, "error");
        else {
          showToast("Meta excluída com sucesso.", "success");
          await loadAllData();
        }
      },
    });
  }


  async function addGoalDeposit(goal, value) {
    const amount = toNumber(value);
    if (!amount || amount <= 0) {
      showToast("Informe um valor maior que zero para adicionar à meta.", "warning");
      return;
    }

    const nextAmount = Math.min(Number(goal.target_amount || 0), Number(goal.current_amount || 0) + amount);

    try {
      const { error } = await supabase
        .from("goals")
        .update({ current_amount: nextAmount })
        .eq("id", goal.id)
        .eq("user_id", user.id);

      if (error) throw error;
      showToast(`Valor adicionado à meta "${goal.title}" com sucesso.`, "success");
      await loadAllData();
    } catch (error) {
      showToast(`Erro ao atualizar meta: ${error.message}`, "error");
    }
  }

  async function handleLimitSubmit(event) {
    event.preventDefault();
    const monthlyLimit = toNumber(limitForm.monthly_limit);

    if (!limitForm.category || !monthlyLimit || monthlyLimit <= 0) {
      showToast("Selecione uma categoria e informe um limite maior que zero.");
      return;
    }

    try {
      const { error } = await supabase.from("category_limits").upsert(
        {
          user_id: user.id,
          category: limitForm.category,
          monthly_limit: monthlyLimit,
        },
        { onConflict: "user_id,category" }
      );

      if (error) throw error;
      setLimitForm({ category: "Mercado", monthly_limit: "" });
      showToast("Limite salvo com sucesso.");
      await loadAllData();
    } catch (error) {
      showToast(`Erro ao salvar limite: ${error.message}`);
    }
  }

  function deleteLimit(id) {
    openConfirmModal({
      title: "Excluir limite",
      message: "Deseja excluir este limite de categoria? Os lançamentos existentes não serão apagados.",
      confirmText: "Excluir",
      cancelText: "Cancelar",
      danger: true,
      onConfirm: async () => {
        const { error } = await supabase.from("category_limits").delete().eq("id", id).eq("user_id", user.id);
        if (error) showToast(`Erro ao excluir limite: ${error.message}`, "error");
        else {
          showToast("Limite excluído com sucesso.", "success");
          await loadAllData();
        }
      },
    });
  }

  function buildRecurringTransactionRows(item, monthValue = selectedMonth) {
    const occurrenceDates = getRecurringOccurrenceDates(item, monthValue);

    return occurrenceDates.map((date, index) => ({
      user_id: user.id,
      type: item.type,
      description: item.description,
      category: item.category,
      method: item.method,
      amount: Number(item.amount),
      date,
      card_id: item.card_id || null,
      recurring_item_id: item.id,
      recurrence_month: occurrenceDates.length > 1 ? date : monthValue,
      notes: occurrenceDates.length > 1 ? `${getRecurringFrequencyLabel(item)} · ocorrência ${index + 1}` : getRecurringFrequencyLabel(item),
    }));
  }

  async function syncRecurringItemsForMonth(items = recurringItems, monthValue = selectedMonth) {
    const activeItems = items.filter((item) => item?.is_active);
    if (!activeItems.length) return { count: 0 };

    const rows = activeItems.flatMap((item) => buildRecurringTransactionRows(item, monthValue));
    if (!rows.length) return { count: 0 };

    const { error } = await supabase.from("transactions").upsert(rows, {
      onConflict: "user_id,recurring_item_id,recurrence_month",
    });

    if (error) throw error;
    return { count: rows.length };
  }

  async function handleRecurringSubmit(event) {
    event.preventDefault();
    const amount = toNumber(recurringForm.amount);
    const description = recurringForm.description.trim();
    const schedulePayload = normalizeRecurringFormPayload(recurringForm, selectedMonth);
    const startDate = parseISODateSafe(schedulePayload.start_date);

    if (!description || !amount || amount <= 0 || !startDate) {
      showToast("Preencha descrição, valor e uma data inicial válida.");
      return;
    }

    if (schedulePayload.day_of_month < 1 || schedulePayload.day_of_month > 31) {
      showToast("Informe um dia do mês válido entre 1 e 31.", "warning");
      return;
    }

    try {
      const { data: createdRecurring, error } = await supabase
        .from("recurring_items")
        .insert({
          user_id: user.id,
          type: recurringForm.type,
          description,
          category: recurringForm.category,
          method: recurringForm.method,
          amount,
          day_of_month: schedulePayload.day_of_month,
          recurrence_type: schedulePayload.recurrence_type,
          interval_months: schedulePayload.interval_months,
          start_date: schedulePayload.start_date,
          is_active: recurringForm.is_active,
        })
        .select("*")
        .single();

      if (error) throw error;

      if (createdRecurring?.is_active) {
        await syncRecurringItemsForMonth([normalizeRecurring(createdRecurring)], selectedMonth);
      }

      setRecurringForm(emptyRecurringForm);
      showToast(createdRecurring?.is_active ? "Item fixo criado e sincronizado conforme a recorrência." : "Item fixo criado como inativo.", "success");
      await loadAllData();
    } catch (error) {
      showToast(`Erro ao salvar recorrência: ${error.message}`, "error");
    }
  }

  function editRecurring(item) {
    setEditingRecurringId(item.id);
    setEditRecurringForm({
      type: item.type || "expense",
      description: item.description || "",
      category: item.category || defaultCategories[item.type || "expense"][0],
      method: item.method || "Pix",
      amount: String(item.amount || ""),
      recurrence_type: item.recurrence_type || "monthly",
      interval_months: String(item.interval_months || "2"),
      start_date: item.start_date || todayISODate(),
      day_of_month: String(item.day_of_month || "5"),
      is_active: Boolean(item.is_active),
    });
  }

  function closeEditRecurringModal() {
    setEditingRecurringId(null);
    setEditRecurringForm(emptyRecurringForm);
  }

  async function handleEditRecurringSubmit(event) {
    event.preventDefault();
    const amount = toNumber(editRecurringForm.amount);
    const description = editRecurringForm.description.trim();
    const schedulePayload = normalizeRecurringFormPayload(editRecurringForm, selectedMonth);
    const startDate = parseISODateSafe(schedulePayload.start_date);

    if (!editingRecurringId) {
      showToast("Nenhum item fixo selecionado para edição.", "warning");
      return;
    }

    if (!description || !amount || amount <= 0 || !startDate) {
      showToast("Preencha descrição, valor e uma data inicial válida.", "warning");
      return;
    }

    if (schedulePayload.day_of_month < 1 || schedulePayload.day_of_month > 31) {
      showToast("Informe um dia do mês válido entre 1 e 31.", "warning");
      return;
    }

    try {
      const { data: updatedRecurring, error } = await supabase
        .from("recurring_items")
        .update({
          type: editRecurringForm.type,
          description,
          category: editRecurringForm.category,
          method: editRecurringForm.method,
          amount,
          day_of_month: schedulePayload.day_of_month,
          recurrence_type: schedulePayload.recurrence_type,
          interval_months: schedulePayload.interval_months,
          start_date: schedulePayload.start_date,
          is_active: editRecurringForm.is_active,
        })
        .eq("id", editingRecurringId)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (error) throw error;

      if (updatedRecurring?.is_active) {
        await syncRecurringItemsForMonth([normalizeRecurring(updatedRecurring)], selectedMonth);
      }

      showToast(updatedRecurring?.is_active ? "Item fixo atualizado e sincronizado conforme a recorrência." : "Item fixo atualizado como inativo.", "success");
      closeEditRecurringModal();
      await loadAllData();
    } catch (error) {
      showToast(`Erro ao atualizar item fixo: ${error.message}`, "error");
    }
  }

  async function toggleRecurring(item) {
    try {
      const nextActive = !item.is_active;
      const { data: updatedRecurring, error } = await supabase
        .from("recurring_items")
        .update({ is_active: nextActive })
        .eq("id", item.id)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (error) throw error;

      if (nextActive && updatedRecurring) {
        await syncRecurringItemsForMonth([normalizeRecurring(updatedRecurring)], selectedMonth);
      }

      showToast(nextActive ? "Item fixo ativado e sincronizado neste mês." : "Item fixo desativado. Lançamentos já gerados não foram apagados.", "success");
      await loadAllData();
    } catch (error) {
      showToast(`Erro ao atualizar recorrência: ${error.message}`, "error");
    }
  }

  function deleteRecurring(id) {
    openConfirmModal({
      title: "Excluir item fixo",
      message: "Deseja excluir este item recorrente? Os lançamentos automáticos já gerados por ele também serão removidos.",
      confirmText: "Excluir",
      cancelText: "Cancelar",
      danger: true,
      onConfirm: async () => {
        try {
          const { error: transactionError } = await supabase
            .from("transactions")
            .delete()
            .eq("user_id", user.id)
            .eq("recurring_item_id", id);

          if (transactionError) throw transactionError;

          const { error } = await supabase.from("recurring_items").delete().eq("id", id).eq("user_id", user.id);
          if (error) throw error;

          showToast("Item fixo e lançamentos automáticos removidos com sucesso.", "success");
          await loadAllData();
        } catch (error) {
          showToast(`Erro ao excluir recorrência: ${error.message}`, "error");
        }
      },
    });
  }

  async function generateRecurringForMonth() {
    try {
      const { count } = await syncRecurringItemsForMonth(recurringItems, selectedMonth);

      if (!count) {
        showToast("Nenhum fixo ativo possui ocorrência para este mês.", "warning");
        return;
      }

      showToast(`${count} ocorrência(s) fixa(s) sincronizada(s) em ${monthLabel(selectedMonth)}.`, "success");
      await loadAllData();
    } catch (error) {
      showToast(`Erro ao sincronizar fixos: ${error.message}`, "error");
    }
  }

  async function updateProfile(event) {
    event.preventDefault();
    const cleanName = profileName.trim();
    if (!cleanName) {
      showToast("Informe um nome válido.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ data: { name: cleanName } });
    if (error) {
      showToast(`Erro ao atualizar perfil: ${error.message}`);
    } else {
      showToast("Perfil atualizado. Se necessário, recarregue a página para ver o novo nome no topo.");
    }
  }



  async function handleCardSubmit(event) {
    event.preventDefault();
    const name = cardForm.name.trim();
    if (!name) {
      showToast("Informe o nome do cartão.", "warning");
      return;
    }

    const payload = {
      user_id: user.id,
      name,
      card_limit: toNumber(cardForm.card_limit) || 0,
      card_type: cardForm.card_type || "Crédito",
      closing_day: normalizeOptionalCardDay(cardForm.closing_day) || null,
      due_day: normalizeOptionalCardDay(cardForm.due_day) || null,
      color: cardForm.color || "#059669",
      is_active: cardForm.is_active,
    };

    try {
      const { error } = await supabase.from("credit_cards").insert(payload);
      if (error) throw error;
      showToast("Cartão criado com sucesso.", "success");
      setCardForm(emptyCardForm);
      await loadAllData();
    } catch (error) {
      showToast(`Erro ao salvar cartão: ${error.message}`, "error");
    }
  }

  function editCard(card) {
    setEditingCardId(card.id);
    setEditCardForm({
      name: card.name,
      card_type: card.card_type || "Crédito",
      card_limit: String(card.card_limit || ""),
      closing_day: String(card.closing_day || 0),
      due_day: String(card.due_day || 0),
      color: card.color || "#059669",
      is_active: Boolean(card.is_active),
    });
  }

  function closeEditCardModal() {
    setEditingCardId(null);
    setEditCardForm(emptyCardForm);
  }

  async function handleEditCardSubmit(event) {
    event.preventDefault();
    const name = editCardForm.name.trim();

    if (!editingCardId) {
      showToast("Nenhum cartão selecionado para edição.", "warning");
      return;
    }

    if (!name) {
      showToast("Informe o nome do cartão.", "warning");
      return;
    }

    const payload = {
      user_id: user.id,
      name,
      card_limit: toNumber(editCardForm.card_limit) || 0,
      card_type: editCardForm.card_type || "Crédito",
      closing_day: normalizeOptionalCardDay(editCardForm.closing_day) || null,
      due_day: normalizeOptionalCardDay(editCardForm.due_day) || null,
      color: editCardForm.color || "#059669",
      is_active: editCardForm.is_active,
    };

    try {
      const { error } = await supabase.from("credit_cards").update(payload).eq("id", editingCardId).eq("user_id", user.id);
      if (error) throw error;
      showToast("Cartão atualizado com sucesso.", "success");
      closeEditCardModal();
      await loadAllData();
    } catch (error) {
      showToast(`Erro ao atualizar cartão: ${error.message}`, "error");
    }
  }

  function deleteCard(id) {
    openConfirmModal({
      title: "Excluir cartão",
      message: "Deseja excluir este cartão? Os lançamentos vinculados continuarão salvos, mas ficarão sem cartão associado.",
      confirmText: "Excluir",
      cancelText: "Cancelar",
      danger: true,
      onConfirm: async () => {
        const { error } = await supabase.from("credit_cards").delete().eq("id", id).eq("user_id", user.id);
        if (error) showToast(`Erro ao excluir cartão: ${error.message}`, "error");
        else {
          showToast("Cartão excluído com sucesso.", "success");
          await loadAllData();
        }
      },
    });
  }

  async function handleCardAdjustment({ cardId, adjustmentType, amount, notes }) {
    const value = toNumber(amount);

    if (!cardId) {
      showToast("Selecione um cartão para registrar o ajuste.", "warning");
      return;
    }

    if (!value || value <= 0) {
      showToast("Informe um valor maior que zero.", "warning");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    try {
      const { error } = await supabase.from("card_adjustments").insert({
        user_id: user.id,
        card_id: cardId,
        adjustment_type: adjustmentType,
        amount: value,
        date: today,
        notes: notes || null,
      });

      if (error) throw error;
      showToast(adjustmentType === "payment" ? "Pagamento do cartão registrado." : "Crédito/saldo adicionado ao cartão.", "success");
      await loadAllData();
    } catch (error) {
      showToast(`Erro ao registrar ajuste do cartão: ${error.message}`, "error");
    }
  }

  async function handleCardInstallmentPurchaseSubmit(purchase) {
    const card = creditCards.find((item) => item.id === purchase.card_id);
    const amount = toNumber(purchase.amount);
    const installments = clampInstallments(purchase.installments);
    const description = String(purchase.description || "").trim();
    const firstDate = purchase.first_date || new Date().toISOString().slice(0, 10);

    if (!card) {
      showToast("Selecione um cartão para lançar a compra parcelada.", "warning");
      return false;
    }

    if (!isCreditLikeCardType(card.card_type)) {
      showToast("Parcelamento está disponível apenas para cartões de crédito.", "warning");
      return false;
    }

    if (!description || !purchase.category || !amount || amount <= 0 || installments < 2) {
      showToast("Preencha descrição, categoria, valor total e no mínimo 2 parcelas.", "warning");
      return false;
    }

    try {
      const rows = buildInstallmentRows({
        userId: user.id,
        description,
        category: purchase.category,
        amount,
        firstDate,
        cardId: card.id,
        installments,
        notes: purchase.notes,
      });

      const { error } = await supabase.from("transactions").insert(rows);
      if (error) throw error;

      setSelectedMonth(firstDate.slice(0, 7));
      showToast(`Compra parcelada criada no ${card.name}: ${installments}x de aproximadamente ${money.format(amount / installments)}.`, "success");
      await loadAllData();
      return true;
    } catch (error) {
      showToast(`Erro ao criar compra parcelada: ${error.message}`, "error");
      return false;
    }
  }

  function deleteCardAdjustment(id) {
    openConfirmModal({
      title: "Excluir ajuste do cartão",
      message: "Deseja remover este pagamento/recarga? O saldo do cartão será recalculado.",
      confirmText: "Excluir",
      cancelText: "Cancelar",
      danger: true,
      onConfirm: async () => {
        const { error } = await supabase.from("card_adjustments").delete().eq("id", id).eq("user_id", user.id);
        if (error) showToast(`Erro ao excluir ajuste: ${error.message}`, "error");
        else {
          showToast("Ajuste removido com sucesso.", "success");
          await loadAllData();
        }
      },
    });
  }

  async function savePreferences(event) {
    event.preventDefault();
    try {
      const payload = {
        user_id: user.id,
        monthly_income: toNumber(preferencesForm.monthly_income) || 0,
        main_goal: preferencesForm.main_goal || null,
        currency: preferencesForm.currency || "BRL",
        default_theme: preferencesForm.default_theme || "system",
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("user_preferences").upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      showToast("Preferências salvas com sucesso.");
      await loadAllData();
    } catch (error) {
      showToast(`Erro ao salvar preferências: ${error.message}`);
    }
  }

  function exportBackup() {
    const backup = {
      version: 2,
      exported_at: new Date().toISOString(),
      user_email: user.email,
      preferences,
      transactions,
      goals,
      limits,
      recurring_items: recurringItems,
      credit_cards: creditCards,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `controle-financeiro-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Backup exportado com sucesso.", "success");
  }

  function importBackup(event) {
    const inputElement = event.target;
    const file = inputElement.files?.[0];
    if (!file) return;

    openConfirmModal({
      title: "Importar backup",
      message: "Importar backup pode duplicar registros se eles já existirem. Deseja continuar?",
      confirmText: "Importar",
      cancelText: "Cancelar",
      danger: false,
      onConfirm: async () => {
        try {
          const text = await readFileText(file);
          const backup = JSON.parse(text);
          const cleanRows = (rows = []) => rows.map(({ id, created_at, user_id: _userId, ...rest }) => ({ ...rest, user_id: user.id }));
          const operations = [];
          if (backup.credit_cards?.length) operations.push(supabase.from("credit_cards").insert(cleanRows(backup.credit_cards)));
          if (backup.goals?.length) operations.push(supabase.from("goals").insert(cleanRows(backup.goals)));
          if (backup.limits?.length || backup.category_limits?.length) operations.push(supabase.from("category_limits").insert(cleanRows(backup.limits || backup.category_limits)));
          if (backup.recurring_items?.length) operations.push(supabase.from("recurring_items").insert(cleanRows(backup.recurring_items)));
          if (backup.transactions?.length) operations.push(supabase.from("transactions").insert(cleanRows(backup.transactions)));
          const results = await Promise.all(operations);
          const error = results.find((result) => result.error)?.error;
          if (error) throw error;
          showToast("Backup importado com sucesso.", "success");
          await loadAllData();
        } catch (error) {
          showToast(`Erro ao importar backup: ${error.message}`, "error");
        } finally {
          inputElement.value = "";
        }
      },
    });
  }

  function deleteAllUserData() {
    openConfirmModal({
      title: "Apagar todos os dados",
      message: "Tem certeza? Isso apagará seus lançamentos, metas, limites, itens fixos e cartões. Essa ação não poderá ser desfeita.",
      confirmText: "Apagar tudo",
      cancelText: "Cancelar",
      danger: true,
      onConfirm: async () => {
        try {
          const results = await Promise.all([
            supabase.from("transactions").delete().eq("user_id", user.id),
            supabase.from("goals").delete().eq("user_id", user.id),
            supabase.from("category_limits").delete().eq("user_id", user.id),
            supabase.from("recurring_items").delete().eq("user_id", user.id),
            supabase.from("credit_cards").delete().eq("user_id", user.id),
          ]);
          const error = results.find((result) => result.error)?.error;
          if (error) throw error;
          showToast("Dados apagados com sucesso.", "success");
          await loadAllData();
        } catch (error) {
          showToast(`Erro ao apagar dados: ${error.message}`, "error");
        }
      },
    });
  }



  async function handlePaymentAllocationSubmit(allocation) {
    const value = toNumber(allocation.amount);

    if (!value || value <= 0) {
      showToast("Informe um valor maior que zero para registrar o pagamento.", "warning");
      return;
    }

    let linkedCardAdjustmentId = null;

    try {
      if (allocation.target_type === "card" && allocation.target_card_id) {
        const card = creditCards.find((item) => item.id === allocation.target_card_id);
        const adjustmentType = card && isStoredValueCardType(card.card_type) ? "credit" : "payment";
        const { data: createdAdjustment, error: adjustmentError } = await supabase
          .from("card_adjustments")
          .insert({
            user_id: user.id,
            card_id: allocation.target_card_id,
            adjustment_type: adjustmentType,
            amount: value,
            date: allocation.payment_date,
            notes: allocation.notes || allocation.target_label || null,
          })
          .select("id")
          .single();

        if (adjustmentError) throw adjustmentError;
        linkedCardAdjustmentId = createdAdjustment?.id || null;
      }

      if (allocation.target_type === "goal" && allocation.target_goal_id) {
        const goal = goals.find((item) => item.id === allocation.target_goal_id);
        if (goal) {
          const nextAmount = Math.min(Number(goal.target_amount || 0), Number(goal.current_amount || 0) + value);
          const { error: goalError } = await supabase
            .from("goals")
            .update({ current_amount: nextAmount })
            .eq("id", goal.id)
            .eq("user_id", user.id);
          if (goalError) throw goalError;
        }
      }

      const { error } = await supabase.from("payment_allocations").insert({
        user_id: user.id,
        source_type: allocation.source_type,
        source_transaction_id: allocation.source_transaction_id || null,
        target_type: allocation.target_type,
        target_transaction_id: allocation.target_transaction_id || null,
        target_card_id: allocation.target_card_id || null,
        target_goal_id: allocation.target_goal_id || null,
        target_label: allocation.target_label || null,
        target_amount: toNumber(allocation.target_amount) || null,
        card_adjustment_id: linkedCardAdjustmentId,
        amount: value,
        payment_date: allocation.payment_date,
        notes: allocation.notes || null,
      });

      if (error) throw error;
      showToast("Pagamento registrado com sucesso.", "success");
      await loadAllData();
    } catch (error) {
      showToast(`Erro ao registrar pagamento: ${error.message}`, "error");
    }
  }

  function deletePaymentAllocation(id) {
    const allocation = paymentAllocations.find((item) => item.id === id);

    openConfirmModal({
      title: "Excluir pagamento",
      message: "Deseja excluir este pagamento/abatimento? Os saldos vinculados serão recalculados quando possível.",
      confirmText: "Excluir",
      cancelText: "Cancelar",
      danger: true,
      onConfirm: async () => {
        try {
          if (allocation?.card_adjustment_id) {
            const { error: adjustmentError } = await supabase
              .from("card_adjustments")
              .delete()
              .eq("id", allocation.card_adjustment_id)
              .eq("user_id", user.id);
            if (adjustmentError) throw adjustmentError;
          }

          if (allocation?.target_type === "goal" && allocation?.target_goal_id) {
            const goal = goals.find((item) => item.id === allocation.target_goal_id);
            if (goal) {
              const nextAmount = Math.max(0, Number(goal.current_amount || 0) - Number(allocation.amount || 0));
              const { error: goalError } = await supabase
                .from("goals")
                .update({ current_amount: nextAmount })
                .eq("id", goal.id)
                .eq("user_id", user.id);
              if (goalError) throw goalError;
            }
          }

          const { error } = await supabase.from("payment_allocations").delete().eq("id", id).eq("user_id", user.id);
          if (error) throw error;
          showToast("Pagamento excluído com sucesso.", "success");
          await loadAllData();
        } catch (error) {
          showToast(`Erro ao excluir pagamento: ${error.message}`, "error");
        }
      },
    });
  }

  function exportCSV() {
    const headers = ["Tipo", "Descrição", "Categoria", "Forma de pagamento", "Cartão", "Parcela", "Valor", "Data", "Observações"];
    const rows = visibleTransactions.map((item) => [
      item.type === "income" ? "Receita" : "Despesa",
      item.description,
      item.category,
      item.method,
      creditCards.find((card) => card.id === item.card_id)?.name || "",
      item.installment_total ? `${item.installment_number}/${item.installment_total}` : "",
      String(item.amount).replace(".", ","),
      item.date,
      item.notes || "",
    ]);

    const csv = "﻿sep=;" + String.fromCharCode(10) + [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join(String.fromCharCode(10));

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `controle-financeiro-${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("CSV exportado com sucesso.", "success");
  }

  async function exportExcel() {
    try {
      const XLSX = await import("xlsx");
      const generatedAt = new Date();
      const cardNameById = new Map(creditCards.map((card) => [card.id, card.name]));
      const automaticTransactions = visibleTransactions.filter((item) => item.recurring_item_id || item.recurrence_month);

      function transactionOrigin(item) {
        if (item.recurring_item_id || item.recurrence_month) return "Fixo automático";
        if (item.installment_total) return "Parcelado";
        return "Manual";
      }

      function autoSize(sheet, widths) {
        if (widths?.length) {
          sheet["!cols"] = widths.map((width) => ({ wch: width }));
        }
        return sheet;
      }

      const workbook = XLSX.utils.book_new();
      workbook.Props = {
        Title: `Controle Financeiro - ${selectedMonth}`,
        Subject: "Relatório financeiro",
        Author: "Controle Financeiro",
        CreatedDate: generatedAt,
      };

      const resumoRows = [
        ["Controle Financeiro"],
        ["Período", monthLabel(selectedMonth)],
        ["Usuário", userName],
        ["Gerado em", generatedAt.toLocaleDateString("pt-BR")],
        ["Horário", generatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })],
        [],
        ["Indicador", "Valor"],
        ["Receitas", summary.income],
        ["Despesas", summary.expense],
        ["Saldo", summary.balance],
        ["Economia (%)", Number(summary.savingRate || 0)],
        ["Lançamentos", visibleTransactions.length],
        ["Saúde financeira", financialHealth.label],
      ];
      const resumoSheet = autoSize(XLSX.utils.aoa_to_sheet(resumoRows), [24, 22]);
      XLSX.utils.book_append_sheet(workbook, resumoSheet, "Resumo");

      const categoriasRows = [
        ["Categoria", "Valor", "Participação (%)"],
        ...expenseByCategory.map((item) => {
          const share = summary.expense > 0 ? Number((((Number(item.value || 0) / summary.expense) * 100).toFixed(2))) : 0;
          return [item.name, Number(item.value || 0), share];
        }),
      ];
      const categoriasSheet = autoSize(XLSX.utils.aoa_to_sheet(categoriasRows), [28, 18, 18]);
      XLSX.utils.book_append_sheet(workbook, categoriasSheet, "Categorias");

      const cartoesRows = [
        ["Cartão", "Tipo", "Limite", "Usado", "Disponível", "Uso (%)", "Fechamento", "Vencimento", "Status"],
        ...cardUsage.map((card) => [
          card.name,
          formatCardType(card.card_type),
          Number(card.card_limit || 0),
          Number(card.spent || 0),
          Number(card.available || 0),
          Number(card.percent || 0),
          formatCardClosingDay(card.closing_day),
          formatCardDueDay(card.due_day),
          card.is_active ? "Ativo" : "Inativo",
        ]),
      ];
      const cartoesSheet = autoSize(XLSX.utils.aoa_to_sheet(cartoesRows), [24, 20, 16, 16, 16, 12, 18, 18, 12]);
      XLSX.utils.book_append_sheet(workbook, cartoesSheet, "Cartões");

      const fixosRows = [
        ["Data", "Tipo", "Descrição", "Categoria", "Forma de pagamento", "Cartão", "Valor", "Origem"],
        ...automaticTransactions.map((item) => [
          formatDateBR(item.date),
          item.type === "income" ? "Receita" : "Despesa",
          item.description,
          item.category,
          item.method || "",
          item.card_id ? cardNameById.get(item.card_id) || "" : "",
          Number(item.amount || 0),
          transactionOrigin(item),
        ]),
      ];
      const fixosSheet = autoSize(XLSX.utils.aoa_to_sheet(fixosRows), [14, 12, 30, 20, 22, 24, 16, 18]);
      XLSX.utils.book_append_sheet(workbook, fixosSheet, "Fixos automáticos");

      const topRows = [
        ["Descrição", "Categoria", "Valor"],
        ...topExpenses.map((item) => [item.description, item.category, Number(item.amount || 0)]),
      ];
      const topSheet = autoSize(XLSX.utils.aoa_to_sheet(topRows), [34, 22, 16]);
      XLSX.utils.book_append_sheet(workbook, topSheet, "Top gastos");

      const metasRows = [
        ["Meta", "Valor atual", "Valor alvo", "Progresso (%)", "Prazo"],
        ...goals.map((goal) => {
          const goalPercent = goal.target_amount > 0 ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100)) : 0;
          return [
            goal.title,
            Number(goal.current_amount || 0),
            Number(goal.target_amount || 0),
            goalPercent,
            goal.deadline ? formatDateBR(goal.deadline) : "",
          ];
        }),
      ];
      const metasSheet = autoSize(XLSX.utils.aoa_to_sheet(metasRows), [34, 16, 16, 16, 14]);
      XLSX.utils.book_append_sheet(workbook, metasSheet, "Metas");

      const lancamentosRows = [
        ["Data", "Tipo", "Descrição", "Categoria", "Forma de pagamento", "Cartão", "Parcela", "Origem", "Valor", "Observações"],
        ...visibleTransactions.map((item) => [
          formatDateBR(item.date),
          item.type === "income" ? "Receita" : "Despesa",
          item.description,
          item.category,
          item.method || "",
          item.card_id ? cardNameById.get(item.card_id) || "" : "",
          item.installment_total ? `${item.installment_number}/${item.installment_total}` : "",
          transactionOrigin(item),
          Number(item.amount || 0),
          item.notes || "",
        ]),
      ];
      const lancamentosSheet = autoSize(XLSX.utils.aoa_to_sheet(lancamentosRows), [14, 12, 34, 22, 22, 24, 12, 18, 16, 38]);
      XLSX.utils.book_append_sheet(workbook, lancamentosSheet, "Lançamentos");

      function applyFormatToColumn(sheetName, columnIndex, format, startRow = 1) {
        const ws = workbook.Sheets[sheetName];
        if (!ws || !ws["!ref"]) return;
        const range = XLSX.utils.decode_range(ws["!ref"]);
        for (let row = startRow; row <= range.e.r; row += 1) {
          const ref = XLSX.utils.encode_cell({ r: row, c: columnIndex });
          if (ws[ref] && typeof ws[ref].v === "number") {
            ws[ref].z = format;
          }
        }
      }

      [
        { row: 7, format: 'R$ #,##0.00' },
        { row: 8, format: 'R$ #,##0.00' },
        { row: 9, format: 'R$ #,##0.00' },
        { row: 10, format: '0.00%' },
      ].forEach(({ row, format }) => {
        const ref = XLSX.utils.encode_cell({ r: row, c: 1 });
        if (workbook.Sheets["Resumo"][ref]) workbook.Sheets["Resumo"][ref].z = format;
      });
      applyFormatToColumn("Categorias", 1, 'R$ #,##0.00');
      applyFormatToColumn("Categorias", 2, '0.00%');
      [2, 3, 4].forEach((column) => applyFormatToColumn("Cartões", column, 'R$ #,##0.00'));
      applyFormatToColumn("Cartões", 5, '0.00%');
      applyFormatToColumn("Fixos automáticos", 6, 'R$ #,##0.00');
      applyFormatToColumn("Top gastos", 2, 'R$ #,##0.00');
      [1, 2].forEach((column) => applyFormatToColumn("Metas", column, 'R$ #,##0.00'));
      applyFormatToColumn("Metas", 3, '0%');
      applyFormatToColumn("Lançamentos", 8, 'R$ #,##0.00');

      XLSX.writeFile(workbook, `controle-financeiro-${selectedMonth}.xlsx`);
      showToast("Excel com abas exportado com sucesso.", "success");
    } catch (error) {
      console.error(error);
      showToast('Para exportar em Excel com abas, instale a biblioteca: npm install xlsx', 'error');
    }
  }

  function exportPDF() {
    const economyPercent = Number(summary.savingRate || 0);
    const health = financialHealth;
    const generatedAt = new Date();
    const previousMonthLabel = monthLabel(previousMonthValue(selectedMonth));
    const automaticTransactions = visibleTransactions.filter((item) => item.recurring_item_id || item.recurrence_month);
    const manualTransactions = visibleTransactions.filter((item) => !item.recurring_item_id && !item.recurrence_month);
    const cardNameById = new Map(creditCards.map((card) => [card.id, card.name]));

    function escapeHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function signedMoney(value) {
      const number = Number(value || 0);
      return `${number >= 0 ? "+" : ""}${money.format(number)}`;
    }

    function percent(value, max) {
      const current = Number(value || 0);
      const total = Number(max || 0);
      if (!total) return 0;
      return Math.max(0, Math.min(100, Math.round((current / total) * 100)));
    }

    const executiveText = summary.balance < 0
      ? `O mês fechou com saldo negativo de ${money.format(Math.abs(summary.balance))}. As despesas superaram as receitas e vale revisar os maiores gastos do período.`
      : `O mês fechou com saldo positivo de ${money.format(summary.balance)}. O resultado indica sobra financeira no período selecionado.`;

    const comparisonRows = [
      ["Receitas", summary.income, previousSummary.income],
      ["Despesas", summary.expense, previousSummary.expense],
      ["Saldo", summary.balance, previousSummary.balance],
    ];

    const comparisonHtml = comparisonRows
      .map(([label, current, previous]) => {
        const diff = Number(current || 0) - Number(previous || 0);
        const tone = diff >= 0 ? "positive" : "negative";
        return `<tr><td>${label}</td><td class="money">${money.format(current)}</td><td class="money">${money.format(previous)}</td><td class="money ${tone}">${signedMoney(diff)}</td></tr>`;
      })
      .join("");

    const categoryHtml = expenseByCategory
      .map((item) => {
        const share = summary.expense > 0 ? Math.round((Number(item.value || 0) / summary.expense) * 100) : 0;
        return `<tr><td>${escapeHtml(item.name)}</td><td><div class="bar"><span style="width:${Math.min(100, share)}%"></span></div></td><td>${share}%</td><td class="money">${money.format(item.value)}</td></tr>`;
      })
      .join("") || `<tr><td colspan="4" class="muted">Sem despesas por categoria neste mês.</td></tr>`;

    const topExpensesHtml = topExpenses
      .map((item) => `<tr><td>${escapeHtml(item.description)}</td><td>${escapeHtml(item.category)}</td><td>${escapeHtml(item.method || "-")}</td><td class="money">${money.format(item.amount)}</td></tr>`)
      .join("") || `<tr><td colspan="4" class="muted">Sem despesas no mês.</td></tr>`;

    const goalsHtml = goals
      .slice(0, 8)
      .map((goal) => {
        const goalPercent = goal.target_amount > 0 ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100)) : 0;
        return `<tr><td>${escapeHtml(goal.title)}</td><td><div class="bar"><span style="width:${goalPercent}%"></span></div></td><td>${goalPercent}%</td><td class="money">${money.format(goal.current_amount)} de ${money.format(goal.target_amount)}</td></tr>`;
      })
      .join("") || `<tr><td colspan="4" class="muted">Sem metas cadastradas.</td></tr>`;

    const cardsHtml = cardUsage
      .map((card) => {
        const isExceeded = Number(card.percent || 0) > 100;
        return `<tr><td>${escapeHtml(card.name)}</td><td>${escapeHtml(formatCardType(card.card_type))}</td><td class="money">${money.format(card.card_limit)}</td><td class="money">${money.format(card.spent)}</td><td class="money">${money.format(card.available)}</td><td class="${isExceeded ? "negative" : ""}">${card.percent}%</td></tr>`;
      })
      .join("") || `<tr><td colspan="6" class="muted">Sem cartões cadastrados.</td></tr>`;

    const automaticHtml = automaticTransactions
      .map((item) => `<tr><td>${formatDateBR(item.date)}</td><td>${item.type === "income" ? "Receita" : "Despesa"}</td><td>${escapeHtml(item.description)}</td><td>${escapeHtml(item.category)}</td><td>${escapeHtml(item.method || "-")}</td><td class="money">${money.format(item.amount)}</td></tr>`)
      .join("") || `<tr><td colspan="6" class="muted">Sem lançamentos automáticos neste mês.</td></tr>`;

    const alertItems = [
      ...(summary.balance < 0 ? [`Saldo negativo no mês: ${money.format(summary.balance)}.`] : []),
      ...financialNotifications.map((item) => `${item.title}: ${item.text}`),
      ...(limitAlerts.length ? [`Limites ultrapassados: ${limitAlerts.map((item) => item.category).join(", ")}.`] : []),
    ];

    const alertsHtml = alertItems.length
      ? alertItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
      : `<li>Nenhum alerta crítico identificado no período.</li>`;

    const transactionsHtml = visibleTransactions
      .map((item) => {
        const cardName = item.card_id ? cardNameById.get(item.card_id) || "-" : "-";
        const origin = item.recurring_item_id || item.recurrence_month ? "Fixo automático" : item.installment_total ? "Parcelado" : "Manual";
        return `<tr><td>${formatDateBR(item.date)}</td><td>${item.type === "income" ? "Receita" : "Despesa"}</td><td>${escapeHtml(item.description)}</td><td>${escapeHtml(item.category)}</td><td>${escapeHtml(item.method || "-")}</td><td>${escapeHtml(cardName)}</td><td>${origin}</td><td class="money">${money.format(item.amount)}</td></tr>`;
      })
      .join("") || `<tr><td colspan="8" class="muted">Nenhum lançamento encontrado para este filtro.</td></tr>`;

    const conclusionText = summary.balance < 0
      ? `O período exige atenção: revise principalmente as maiores categorias de despesa e os cartões próximos ou acima do limite.`
      : `O período apresentou resultado positivo. Continue acompanhando os maiores gastos e mantenha metas atualizadas para preservar o controle financeiro.`;

    const html = `
      <html>
        <head>
          <title>Relatório ${monthLabel(selectedMonth)}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; font-family: Arial, sans-serif; background: #eef3f7; color: #0f172a; padding: 28px; }
            .page { max-width: 1180px; margin: 0 auto; background: #fff; border-radius: 24px; overflow: hidden; box-shadow: 0 18px 50px rgba(15,23,42,.10); }
            .header { background: linear-gradient(135deg, #07111f, #10244d 58%, #064e3b); color: #fff; padding: 34px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
            .brand { display: flex; align-items: center; gap: 16px; }
            .logo { width: 58px; height: 58px; border-radius: 16px; object-fit: cover; border: 1px solid rgba(255,255,255,.2); }
            h1 { margin: 0; font-size: 28px; line-height: 1.2; }
            h2 { margin: 0 0 12px; font-size: 20px; }
            h3 { margin: 0 0 8px; font-size: 16px; }
            .subtitle { color: #cbd5e1; margin: 6px 0 0; font-size: 13px; }
            .content { padding: 30px; }
            .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
            .card { border: 1px solid #e2e8f0; border-radius: 18px; padding: 18px; background: #f8fafc; }
            .card span { display: block; color: #64748b; font-size: 12px; font-weight: 700; margin-bottom: 8px; }
            .card strong { font-size: 21px; }
            .section { margin-top: 28px; page-break-inside: avoid; }
            .section.breakable { page-break-inside: auto; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
            .box { border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 18px; padding: 18px; }
            .health { border: 1px solid #bbf7d0; background: #ecfdf5; border-radius: 18px; padding: 18px; margin: 22px 0; }
            .health strong { color: #047857; }
            .alert { border: 1px solid #fecdd3; background: #fff1f2; border-radius: 18px; padding: 18px; }
            .alert strong { color: #be123c; }
            .muted { color: #64748b; }
            ul { margin: 10px 0 0; padding-left: 20px; }
            li { margin: 6px 0; font-size: 13px; line-height: 1.45; }
            table { width: 100%; border-collapse: collapse; overflow: hidden; border-radius: 14px; }
            th, td { border-bottom: 1px solid #e2e8f0; padding: 11px 10px; text-align: left; font-size: 12px; vertical-align: middle; }
            th { background: #f1f5f9; color: #334155; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
            .money { text-align: right; font-weight: 700; white-space: nowrap; }
            .positive { color: #047857; font-weight: 700; }
            .negative { color: #be123c; font-weight: 700; }
            .bar { width: 100%; height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
            .bar span { display: block; height: 100%; background: #10b981; border-radius: 999px; }
            .footer { padding: 22px 30px 30px; color: #94a3b8; font-size: 12px; text-align: center; }
            @media print {
              body { background: #fff; padding: 0; }
              .page { box-shadow: none; border-radius: 0; }
              .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .card, .box, .health, .alert, th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="brand">
                <img class="logo" src="${window.location.origin}/logo-email.png" />
                <div>
                  <h1>Relatório Financeiro</h1>
                  <p class="subtitle">${monthLabel(selectedMonth)} · ${escapeHtml(userName)}</p>
                </div>
              </div>
              <div style="text-align:right">
                <strong>Gerado em ${generatedAt.toLocaleDateString("pt-BR")} às ${generatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</strong>
                <p class="subtitle">${escapeHtml(user.email)}</p>
              </div>
            </div>

            <div class="content">
              <div class="cards">
                <div class="card"><span>Receitas</span><strong>${money.format(summary.income)}</strong></div>
                <div class="card"><span>Despesas</span><strong>${money.format(summary.expense)}</strong></div>
                <div class="card"><span>Saldo</span><strong>${money.format(summary.balance)}</strong></div>
                <div class="card"><span>Economia</span><strong>${economyPercent}%</strong></div>
              </div>

              <div class="health"><strong>Saúde financeira: ${health.label}</strong><br/><span>${escapeHtml(health.text)}</span></div>

              <div class="grid-2 section">
                <div class="box">
                  <h2>Resumo executivo</h2>
                  <p>${escapeHtml(executiveText)}</p>
                  <p class="muted">Lançamentos no filtro atual: ${visibleTransactions.length} · Manuais: ${manualTransactions.length} · Automáticos: ${automaticTransactions.length}</p>
                </div>
                <div class="alert">
                  <strong>Alertas importantes</strong>
                  <ul>${alertsHtml}</ul>
                </div>
              </div>

              <div class="section">
                <h2>Comparativo com ${previousMonthLabel}</h2>
                <table>
                  <thead><tr><th>Indicador</th><th class="money">Atual</th><th class="money">Anterior</th><th class="money">Diferença</th></tr></thead>
                  <tbody>${comparisonHtml}</tbody>
                </table>
              </div>

              <div class="section">
                <h2>Gastos por categoria</h2>
                <table><thead><tr><th>Categoria</th><th>Participação</th><th>%</th><th class="money">Valor</th></tr></thead><tbody>${categoryHtml}</tbody></table>
              </div>

              <div class="section">
                <h2>Resumo dos cartões</h2>
                <table><thead><tr><th>Cartão</th><th>Tipo</th><th class="money">Limite</th><th class="money">Usado</th><th class="money">Disponível</th><th>Uso</th></tr></thead><tbody>${cardsHtml}</tbody></table>
              </div>

              <div class="section">
                <h2>Lançamentos automáticos do mês</h2>
                <table><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Categoria</th><th>Forma</th><th class="money">Valor</th></tr></thead><tbody>${automaticHtml}</tbody></table>
              </div>

              <div class="section">
                <h2>Top gastos</h2>
                <table><thead><tr><th>Descrição</th><th>Categoria</th><th>Forma</th><th class="money">Valor</th></tr></thead><tbody>${topExpensesHtml}</tbody></table>
              </div>

              <div class="section">
                <h2>Metas financeiras</h2>
                <table><thead><tr><th>Meta</th><th>Progresso</th><th>%</th><th class="money">Valor</th></tr></thead><tbody>${goalsHtml}</tbody></table>
              </div>

              <div class="section breakable">
                <h2>Lista completa de lançamentos</h2>
                <table>
                  <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Categoria</th><th>Forma</th><th>Cartão</th><th>Origem</th><th class="money">Valor</th></tr></thead>
                  <tbody>${transactionsHtml}</tbody>
                </table>
              </div>

              <div class="section box">
                <h2>Conclusão</h2>
                <p>${escapeHtml(conclusionText)}</p>
              </div>
            </div>
            <div class="footer">Relatório gerado automaticamente pelo Controle Financeiro.</div>
          </div>
        </body>
      </html>
    `;

    const reportWindow = window.open("", "_blank");
    if (!reportWindow) {
      showToast("O navegador bloqueou a abertura do relatório. Permita pop-ups para este site.");
      return;
    }

    reportWindow.document.write(html);
    reportWindow.document.close();
    reportWindow.focus();
    window.setTimeout(() => reportWindow.print(), 500);
    showToast("Relatório financeiro completo aberto para impressão.", "success");
  }

  const tabs = [
    { key: "dashboard", label: "Painel", icon: <BarChart3 size={17} /> },
    { key: "annual", label: "Anual", icon: <CalendarRange size={17} /> },
    { key: "recurring", label: "Fixos", icon: <Repeat size={17} /> },
    { key: "transactions", label: "Lançamentos", icon: <Wallet size={17} /> },
    { key: "payments", label: "Pagamentos", icon: <CheckCircle2 size={17} /> },
    { key: "cards", label: "Cartões", icon: <CreditCard size={17} /> },
    { key: "goals", label: "Metas", icon: <Target size={17} /> },
    { key: "limits", label: "Limites", icon: <PiggyBank size={17} /> },
    { key: "calendar", label: "Calendário", icon: <CalendarClock size={17} /> },
    { key: "reports", label: "Relatórios", icon: <FileText size={17} /> },
    { key: "account", label: "Conta", icon: <UserRound size={17} /> },
  ];

  const primaryTabKeys = ["dashboard", "transactions", "cards", "payments", "recurring"];
  const moreTabKeys = ["annual", "reports", "goals", "limits", "calendar", "account"];
  const primaryTabs = primaryTabKeys.map((key) => tabs.find((tab) => tab.key === key)).filter(Boolean);
  const moreTabs = moreTabKeys.map((key) => tabs.find((tab) => tab.key === key)).filter(Boolean);
  const isMoreMenuActive = moreTabs.some((tab) => tab.key === page);

  function navigateDashboardTab(key) {
    setMoreMenuOpen(false);
    setAccountMenuOpen(false);
    setMobileMoreOpen(false);
    setMobileQuickActionsOpen(false);
    setPage(key);
  }

  function updateMobileMoreOpen(value) {
    const nextValue = typeof value === "function" ? value(mobileMoreOpen) : value;
    setMobileMoreOpen(Boolean(nextValue));
    if (nextValue) {
      setMobileQuickActionsOpen(false);
    }
  }

  function openTransactionsWithFilters({ categories = ["Todas"], types = ["all"], cards = ["all"], date = "", search = "", sort = "recent" } = {}) {
    setQuery(search);
    setDateFilter(date);
    setCategoryFilter(Array.isArray(categories) ? categories : [categories]);
    setTypeFilter(Array.isArray(types) ? types : [types]);
    setCardFilter(Array.isArray(cards) ? cards : [cards]);
    setSortBy(sort);
    setPage("transactions");
  }

  function openMonthlyDashboard(monthValue) {
    setSelectedMonth(monthValue);
    setDateFilter("");
    setPage("dashboard");
    showToast(`Painel de ${monthLabel(monthValue)} aberto.`, "info");
  }

  function scrollToNewTransactionForm() {
    window.setTimeout(() => {
      document.getElementById("new-transaction-form-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  function handleMobileQuickAction(action) {
    setMobileQuickActionsOpen(false);

    if (action === "repeat") {
      handleRepeatPreviousExpense();
      return;
    }

    if (action === "installment") {
      setPage("cards");
      showToast("Abra o cartão desejado e toque em Nova compra parcelada.", "info");
      return;
    }

    if (action === "card-payment") {
      setPage("cards");
      showToast("Abra o cartão e registre o pagamento ou recarga no controle do cartão.", "info");
      return;
    }

    if (action === "goal") {
      setPage("goals");
      showToast("Use o formulário de metas para criar ou atualizar seu objetivo.", "info");
      return;
    }

    if (action === "expense" || action === "income") {
      setForm({
        ...emptyForm,
        type: action,
        category: defaultCategories[action][0],
        method: action === "income" ? "Pix" : "Pix",
        date: new Date().toISOString().slice(0, 10),
      });
      setPage("transactions");
      scrollToNewTransactionForm();
      return;
    }

    if (action === "payment") {
      setPage("payments");
      showToast("Abra a origem e o destino para registrar o pagamento.", "info");
      return;
    }

    if (action === "card") {
      setPage("cards");
      showToast("Use o botão de compra parcelada no cartão selecionado.", "info");
      return;
    }

    if (action === "recurring") {
      setPage("recurring");
      showToast("Cadastre um fixo conforme a frequência desejada.", "info");
    }
  }

  if (loadingData || !minimumDataLoadingDone) {
    return (
      <LoadingScreen
        title="Carregando seu painel"
        subtitle="Sincronizando lançamentos, metas, cartões e relatórios..."
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-5 pb-28 sm:px-6 lg:px-8 lg:pb-8">
      <EditTransactionModal
        open={Boolean(editingId)}
        form={editForm}
        setForm={setEditForm}
        onSubmit={handleEditTransactionSubmit}
        onClose={closeEditTransactionModal}
        creditCards={creditCards}
      />

      <TransactionDetailsModal
        open={Boolean(selectedTransaction)}
        transaction={selectedTransaction}
        creditCards={creditCards}
        onClose={() => setSelectedTransaction(null)}
        onEdit={(item) => {
          setSelectedTransaction(null);
          handleEditTransaction(item);
        }}
      />

      <EditGoalModal
        open={Boolean(editingGoalId)}
        form={editGoalForm}
        setForm={setEditGoalForm}
        onSubmit={handleEditGoalSubmit}
        onClose={closeEditGoalModal}
      />

      <EditCardModal
        open={Boolean(editingCardId)}
        form={editCardForm}
        setForm={setEditCardForm}
        onSubmit={handleEditCardSubmit}
        onClose={closeEditCardModal}
      />

      <EditRecurringModal
        open={Boolean(editingRecurringId)}
        form={editRecurringForm}
        setForm={setEditRecurringForm}
        onSubmit={handleEditRecurringSubmit}
        onClose={closeEditRecurringModal}
      />

      <ToastCustom toast={toast} onClose={hideToast} />
      <ConfirmModal modal={confirmModal} onClose={closeConfirmModal} />
      {!mobileMoreOpen && (
        <MobileQuickActionFab
          open={mobileQuickActionsOpen}
          setOpen={setMobileQuickActionsOpen}
          onAction={handleMobileQuickAction}
          page={page}
        />
      )}

      <header className="dashboard-header dashboard-header-premium surface-card rounded-[2rem] p-4 shadow-sm">
        <div className="dashboard-brand dashboard-brand-premium">
          <img src={logoEA} alt="Logo" className="dashboard-logo dashboard-logo-premium h-9 w-9 rounded-xl object-cover" />
          <div className="min-w-0">
            <div className="dashboard-title-row">
              <h1 className="dashboard-title dashboard-title-premium">Controle Financeiro</h1>
            </div>
          </div>
        </div>

        <div className="dashboard-actions dashboard-actions-premium">
          <MonthSelector value={selectedMonth} onChange={setSelectedMonth} years={availableYears} />
          <button
            onClick={() => setDarkMode((value) => !value)}
            className="theme-button header-icon-button dashboard-action-button inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold transition hover:scale-[1.02]"
            title={darkMode ? "Ativar modo claro" : "Ativar modo escuro"}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            <span>{darkMode ? "Claro" : "Escuro"}</span>
          </button>

          <div className="dashboard-account-menu">
            <button
              type="button"
              onClick={() => {
                setMoreMenuOpen(false);
                setAccountMenuOpen((value) => !value);
              }}
              className="account-menu-button dashboard-action-button inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-black transition"
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              title="Abrir menu da conta"
            >
              <UserRound size={16} />
              <span className="account-menu-name">{userName}</span>
              <span className="account-menu-caret">▾</span>
            </button>

            {accountMenuOpen && (
              <div className="account-menu-panel" role="menu">
                <div className="account-menu-header">
                  <strong>{userName}</strong>
                  <span>{user.email}</span>
                </div>
                <button type="button" onClick={() => navigateDashboardTab("account")} className="account-menu-item" role="menuitem">
                  <UserRound size={16} /> Minha conta
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    onHome();
                  }}
                  className="account-menu-item"
                  role="menuitem"
                >
                  <Home size={16} /> Home
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    openConfirmModal({
                      title: "Sair da conta",
                      message: "Tem certeza que deseja sair da sua conta?",
                      confirmText: "Sair",
                      cancelText: "Cancelar",
                      danger: false,
                      onConfirm: onSignOut,
                    });
                  }}
                  className="account-menu-item account-menu-item-danger"
                  role="menuitem"
                >
                  <LogOut size={16} /> Sair da conta
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className="dashboard-tabs dashboard-tabs-compact surface-card rounded-[2rem] p-2 shadow-sm" aria-label="Menu principal do painel">
        {primaryTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => navigateDashboardTab(tab.key)}
            className={classNames("dashboard-tab-button inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-black transition", page === tab.key ? "dashboard-tab-active" : "ghost-button")}
          >
            {tab.icon} <span>{tab.label}</span>
          </button>
        ))}

        <div className="dashboard-more-menu">
          <button
            type="button"
            onClick={() => setMoreMenuOpen((value) => !value)}
            className={classNames("dashboard-tab-button inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-black transition", isMoreMenuActive || moreMenuOpen ? "dashboard-tab-active" : "ghost-button")}
            aria-haspopup="menu"
            aria-expanded={moreMenuOpen}
          >
            <ListFilter size={17} /> <span>Mais</span> <span className="text-xs">▾</span>
          </button>

          {moreMenuOpen && (
            <div className="dashboard-more-panel" role="menu">
              <div className="dashboard-more-header">
                <strong>Mais opções</strong>
                <span>Planejamento, ajustes e visão anual</span>
              </div>
              <div className="dashboard-more-grid">
                {moreTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => navigateDashboardTab(tab.key)}
                    className={classNames("dashboard-more-item", page === tab.key && "dashboard-more-item-active")}
                    role="menuitem"
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      {preferences && !preferences.onboarding_completed && (
        <OnboardingBanner preferencesForm={preferencesForm} setPreferencesForm={setPreferencesForm} onSubmit={savePreferences} />
      )}

      {financialNotifications.length > 0 && (
        <NotificationsPanel notifications={financialNotifications} />
      )}

      {limitAlerts.length > 0 && (
        <section className="rounded-[2rem] border border-amber-500/30 bg-amber-500/10 p-4 text-amber-300">
          <div className="flex items-start gap-3">
            <AlertIcon />
            <div>
              <strong>Atenção aos limites do mês</strong>
              <p className="mt-1 text-sm">
                Você ultrapassou {limitAlerts.length} limite(s): {limitAlerts.map((item) => item.category).join(", ")}.
              </p>
            </div>
          </div>
        </section>
      )}

      <MobileQuickShortcuts
        onExpense={() => handleMobileQuickAction("expense")}
        onIncome={() => handleMobileQuickAction("income")}
        onPayment={() => handleMobileQuickAction("payment")}
        onCards={() => handleMobileQuickAction("card")}
      />

      {page === "dashboard" && (
        <DashboardOverview
          summary={summary}
          expenseByCategory={expenseByCategory}
          dailyFlow={dailyFlow}
          monthlyComparison={monthlyComparison}
          topExpenses={topExpenses}
          goals={goals}
          selectedMonth={selectedMonth}
          setPage={setPage}
          insights={smartInsights}
          notifications={financialNotifications}
          cardUsage={cardUsage}
          healthStatus={financialHealth}
          onOpenTransactions={openTransactionsWithFilters}
          onSelectMonth={openMonthlyDashboard}
        />
      )}

      {page === "transactions" && (
        <TransactionsPage
          form={form}
          setForm={setForm}
          resetForm={resetTransactionForm}
          onRepeatPreviousExpense={handleRepeatPreviousExpense}
          onSubmit={handleTransactionSubmit}
          visibleTransactions={visibleRegularTransactions}
          separatedCardTransactions={visibleCardTransactions}
          onOpenCards={() => setPage("cards")}
          allCategories={allCategories}
          query={query}
          setQuery={setQuery}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          cardFilter={cardFilter}
          setCardFilter={setCardFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          onEdit={handleEditTransaction}
          onDelete={handleDeleteTransaction}
          onDuplicate={handleDuplicateTransaction}
          onView={setSelectedTransaction}
          exportCSV={exportCSV}
          exportExcel={exportExcel}
          creditCards={creditCards}
        />
      )}

      {page === "payments" && (
        <PaymentsPage
          selectedMonth={selectedMonth}
          summary={summary}
          transactions={transactions}
          monthTransactions={monthTransactions}
          creditCards={creditCards}
          cardUsage={cardUsage}
          goals={goals}
          paymentAllocations={paymentAllocations}
          onSubmit={handlePaymentAllocationSubmit}
          onDelete={deletePaymentAllocation}
          onOpenTransactions={openTransactionsWithFilters}
          onOpenCards={() => setPage("cards")}
          onOpenGoals={() => setPage("goals")}
        />
      )}

      {page === "goals" && <GoalsPage goals={goals} goalForm={goalForm} setGoalForm={setGoalForm} onSubmit={handleGoalSubmit} onEdit={editGoal} onDelete={deleteGoal} onDeposit={addGoalDeposit} />}

      {page === "limits" && <LimitsPage limitForm={limitForm} setLimitForm={setLimitForm} categoryUsage={categoryUsage} onSubmit={handleLimitSubmit} onDelete={deleteLimit} expenseByCategory={expenseByCategory} />}

      {page === "cards" && <CardsPage cardForm={cardForm} setCardForm={setCardForm} onSubmit={handleCardSubmit} onEdit={editCard} onDelete={deleteCard} cardUsage={cardUsage} transactions={transactions} cardAdjustments={cardAdjustments} selectedMonth={selectedMonth} onCardAdjustment={handleCardAdjustment} onDeleteCardAdjustment={deleteCardAdjustment} onInstallmentPurchase={handleCardInstallmentPurchaseSubmit} onEditTransaction={handleEditTransaction} onDeleteTransaction={handleDeleteTransaction} onDuplicateTransaction={handleDuplicateTransaction} onViewTransaction={setSelectedTransaction} creditCards={creditCards} />}

      {page === "recurring" && (
        <RecurringPage
          recurringForm={recurringForm}
          setRecurringForm={setRecurringForm}
          recurringItems={recurringItems}
          onSubmit={handleRecurringSubmit}
          onToggle={toggleRecurring}
          onEdit={editRecurring}
          onDelete={deleteRecurring}
          onGenerate={generateRecurringForMonth}
          selectedMonth={selectedMonth}
        />
      )}

      {page === "calendar" && <FinancialCalendarPage selectedMonth={selectedMonth} events={calendarEvents} />}

      {page === "annual" && <AnnualDashboardPage selectedYear={selectedYear} setSelectedYear={setSelectedYear} years={availableYears} data={annualMonthlyData} summary={annualSummary} onMonthClick={openMonthlyDashboard} />}

      {page === "reports" && <ReportsPage summary={summary} selectedMonth={selectedMonth} visibleTransactions={visibleTransactions} topExpenses={topExpenses} goals={goals} exportCSV={exportCSV} exportExcel={exportExcel} exportPDF={exportPDF} exportBackup={exportBackup} onOpenTransactions={openTransactionsWithFilters} setPage={setPage} />}

      {(page === "account" || page === "profile" || page === "settings") && (
        <AccountPage
          user={user}
          profileName={profileName}
          setProfileName={setProfileName}
          onProfileSubmit={updateProfile}
          preferencesForm={preferencesForm}
          setPreferencesForm={setPreferencesForm}
          onPreferencesSubmit={savePreferences}
          exportBackup={exportBackup}
          importBackup={importBackup}
          deleteAllUserData={deleteAllUserData}
          onSignOut={onSignOut}
          setPage={setPage}
          stats={{
            transactions: transactions.length,
            cards: creditCards.length,
            goals: goals.length,
            recurring: recurringItems.length,
          }}
        />
      )}

      <MobileBottomNav
        tabs={tabs}
        page={page}
        setPage={setPage}
        moreOpen={mobileMoreOpen}
        setMoreOpen={updateMobileMoreOpen}
      />
    </div>
  );
}




function PaymentsPage({ selectedMonth, summary, transactions, monthTransactions, creditCards, cardUsage, goals, paymentAllocations, onSubmit, onDelete, onOpenTransactions, onOpenCards, onOpenGoals }) {
  const initialForm = {
    source_type: "income",
    source_transaction_id: "",
    manual_source_amount: "",
    target_type: "transaction",
    target_transaction_id: "",
    target_card_id: "",
    target_goal_id: "",
    manual_target_label: "",
    manual_target_amount: "",
    amount: "",
    payment_date: new Date().toISOString().slice(0, 10),
    notes: "",
  };

  const [form, setForm] = useState(initialForm);

  const monthAllocations = useMemo(() => {
    return paymentAllocations.filter((item) => item.payment_date?.slice(0, 7) === selectedMonth);
  }, [paymentAllocations, selectedMonth]);

  const incomeTransactions = useMemo(() => {
    return monthTransactions.filter((item) => item.type === "income").sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [monthTransactions]);

  const expenseTargets = useMemo(() => {
    return monthTransactions
      .filter((item) => item.type === "expense")
      .map((item) => {
        const paid = paymentAllocations
          .filter((payment) => payment.target_type === "transaction" && payment.target_transaction_id === item.id)
          .reduce((total, payment) => total + Number(payment.amount || 0), 0);
        const remaining = Math.max(0, Number(item.amount || 0) - paid);
        const cardName = item.card_id ? creditCards.find((card) => card.id === item.card_id)?.name : "";
        return { ...item, paid, remaining, cardName };
      })
      .sort((a, b) => b.remaining - a.remaining || new Date(b.date) - new Date(a.date));
  }, [monthTransactions, paymentAllocations, creditCards]);

  const positiveBalance = Math.max(0, Number(summary.balance || 0));
  const balanceUsed = monthAllocations
    .filter((item) => item.source_type === "balance")
    .reduce((total, item) => total + Number(item.amount || 0), 0);
  const availableBalance = Math.max(0, positiveBalance - balanceUsed);

  function sourceUsedByIncome(transactionId) {
    return paymentAllocations
      .filter((item) => item.source_type === "income" && item.source_transaction_id === transactionId)
      .reduce((total, item) => total + Number(item.amount || 0), 0);
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function getSelectedSource() {
    if (form.source_type === "income") {
      const income = incomeTransactions.find((item) => item.id === form.source_transaction_id);
      if (!income) return { label: "Selecione uma receita", total: 0, available: 0 };
      const used = sourceUsedByIncome(income.id);
      return {
        label: income.description,
        total: Number(income.amount || 0),
        available: Math.max(0, Number(income.amount || 0) - used),
      };
    }

    if (form.source_type === "balance") {
      return { label: "Saldo disponível do mês", total: positiveBalance, available: availableBalance };
    }

    const manual = toNumber(form.manual_source_amount);
    return { label: "Valor manual", total: manual || 0, available: manual || 0 };
  }

  function getSelectedTarget() {
    if (form.target_type === "transaction") {
      const target = expenseTargets.find((item) => item.id === form.target_transaction_id);
      if (!target) return { label: "Selecione uma despesa", total: 0, remaining: 0 };
      return {
        label: target.description,
        total: Number(target.amount || 0),
        remaining: Number(target.remaining || 0),
        extra: `${target.category}${target.cardName ? ` · ${target.cardName}` : ""}`,
      };
    }

    if (form.target_type === "card") {
      const card = cardUsage.find((item) => item.id === form.target_card_id);
      if (!card) return { label: "Selecione um cartão", total: 0, remaining: 0 };
      return {
        label: card.name,
        total: Number(card.total_available_base || card.card_limit || 0),
        remaining: Number(card.spent || 0),
        extra: card.stored_value_card ? "Recarga/saldo" : "Fatura em aberto",
      };
    }

    if (form.target_type === "goal") {
      const goal = goals.find((item) => item.id === form.target_goal_id);
      if (!goal) return { label: "Selecione uma meta", total: 0, remaining: 0 };
      return {
        label: goal.title,
        total: Number(goal.target_amount || 0),
        remaining: Math.max(0, Number(goal.target_amount || 0) - Number(goal.current_amount || 0)),
        extra: "Meta financeira",
      };
    }

    const manual = toNumber(form.manual_target_amount);
    return {
      label: form.manual_target_label || "Destino manual",
      total: manual || 0,
      remaining: manual || 0,
      extra: "Destino informado manualmente",
    };
  }

  const selectedSource = getSelectedSource();
  const selectedTarget = getSelectedTarget();
  const amount = toNumber(form.amount);
  const targetAfter = Math.max(0, Number(selectedTarget.remaining || 0) - Number(amount || 0));
  const canPayAll = Number(selectedTarget.remaining || 0) > 0 && Number(selectedSource.available || 0) >= Number(selectedTarget.remaining || 0);
  const resultLabel = !amount
    ? "Informe um valor para simular."
    : targetAfter === 0
      ? "Destino quitado/pago por completo."
      : "Pagamento parcial registrado.";

  function fillSuggestedAmount() {
    const suggested = Math.min(Number(selectedSource.available || 0), Number(selectedTarget.remaining || 0));
    if (suggested > 0) update("amount", String(Number(suggested.toFixed(2))));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const value = toNumber(form.amount);
    const target = getSelectedTarget();
    const source = getSelectedSource();

    if (!value || value <= 0) return;
    if (source.available <= 0) return;
    if (target.remaining <= 0) return;
    if (value > source.available) return;
    if (value > target.remaining) return;

    onSubmit({
      source_type: form.source_type,
      source_transaction_id: form.source_type === "income" ? form.source_transaction_id : null,
      target_type: form.target_type,
      target_transaction_id: form.target_type === "transaction" ? form.target_transaction_id : null,
      target_card_id: form.target_type === "card" ? form.target_card_id : null,
      target_goal_id: form.target_type === "goal" ? form.target_goal_id : null,
      target_label: target.label,
      target_amount: target.total || target.remaining,
      amount: value,
      payment_date: form.payment_date,
      notes: form.notes,
    });

    setForm(initialForm);
  }

  function allocationSourceLabel(item) {
    if (item.source_type === "income") {
      return transactions.find((transaction) => transaction.id === item.source_transaction_id)?.description || "Receita vinculada";
    }
    if (item.source_type === "balance") return "Saldo do mês";
    return "Valor manual";
  }

  function allocationTargetLabel(item) {
    if (item.target_type === "transaction") return transactions.find((transaction) => transaction.id === item.target_transaction_id)?.description || item.target_label || "Despesa";
    if (item.target_type === "card") return creditCards.find((card) => card.id === item.target_card_id)?.name || item.target_label || "Cartão";
    if (item.target_type === "goal") return goals.find((goal) => goal.id === item.target_goal_id)?.title || item.target_label || "Meta";
    return item.target_label || "Destino manual";
  }

  const paidTotal = monthAllocations.reduce((total, item) => total + Number(item.amount || 0), 0);
  const partialTargets = expenseTargets.filter((item) => item.paid > 0 && item.remaining > 0).length;
  const paidTargets = expenseTargets.filter((item) => item.paid > 0 && item.remaining <= 0).length;

  return (
    <main className="grid gap-6">
      <section className="dashboard-metrics-grid grid gap-4 md:grid-cols-4">
        <MetricCard title="Pagamentos no mês" value={money.format(paidTotal)} icon={<CheckCircle2 />} tone="emerald" />
        <MetricCard title="Saldo disponível" value={money.format(availableBalance)} icon={<Wallet />} tone="blue" />
        <MetricCard title="Pagos por completo" value={String(paidTargets)} icon={<CheckCircle2 />} tone="emerald" />
        <MetricCard title="Parciais" value={String(partialTargets)} icon={<PiggyBank />} tone="amber" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="surface-card rounded-[2rem] p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-2xl font-black">Novo pagamento</h2>
            <p className="muted-text mt-1 text-sm">Use uma receita, saldo ou valor manual para quitar despesas, cartões ou metas.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="De onde vem o valor">
              <select value={form.source_type} onChange={(event) => update("source_type", event.target.value)} className="input">
                <option value="income">Receita cadastrada</option>
                <option value="balance">Saldo disponível do mês</option>
                <option value="manual">Valor manual</option>
              </select>
            </Field>

            {form.source_type === "income" && (
              <Field label="Receita">
                <select value={form.source_transaction_id} onChange={(event) => update("source_transaction_id", event.target.value)} className="input">
                  <option value="">Selecione uma receita</option>
                  {incomeTransactions.map((item) => {
                    const available = Math.max(0, Number(item.amount || 0) - sourceUsedByIncome(item.id));
                    return <option key={item.id} value={item.id}>{item.description} — disponível {money.format(available)}</option>;
                  })}
                </select>
              </Field>
            )}

            {form.source_type === "manual" && (
              <Field label="Valor disponível manual">
                <input type="number" min="0" step="0.01" value={form.manual_source_amount} onChange={(event) => update("manual_source_amount", event.target.value)} className="input" placeholder="0,00" />
              </Field>
            )}

            <Field label="Para onde vai">
              <select value={form.target_type} onChange={(event) => update("target_type", event.target.value)} className="input">
                <option value="transaction">Despesa / lançamento</option>
                <option value="card">Cartão</option>
                <option value="goal">Meta</option>
                <option value="manual">Destino manual</option>
              </select>
            </Field>

            {form.target_type === "transaction" && (
              <Field label="Despesa">
                <select value={form.target_transaction_id} onChange={(event) => update("target_transaction_id", event.target.value)} className="input">
                  <option value="">Selecione uma despesa</option>
                  {expenseTargets.map((item) => <option key={item.id} value={item.id}>{item.description} — falta {money.format(item.remaining)}</option>)}
                </select>
              </Field>
            )}

            {form.target_type === "card" && (
              <Field label="Cartão">
                <select value={form.target_card_id} onChange={(event) => update("target_card_id", event.target.value)} className="input">
                  <option value="">Selecione um cartão</option>
                  {cardUsage.map((card) => <option key={card.id} value={card.id}>{card.name} — em aberto {money.format(card.spent)}</option>)}
                </select>
              </Field>
            )}

            {form.target_type === "goal" && (
              <Field label="Meta">
                <select value={form.target_goal_id} onChange={(event) => update("target_goal_id", event.target.value)} className="input">
                  <option value="">Selecione uma meta</option>
                  {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title} — falta {money.format(Math.max(0, Number(goal.target_amount || 0) - Number(goal.current_amount || 0)))}</option>)}
                </select>
              </Field>
            )}

            {form.target_type === "manual" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome do destino"><input value={form.manual_target_label} onChange={(event) => update("manual_target_label", event.target.value)} className="input" placeholder="Ex.: Conta pessoal" /></Field>
                <Field label="Valor do destino"><input type="number" min="0" step="0.01" value={form.manual_target_amount} onChange={(event) => update("manual_target_amount", event.target.value)} className="input" placeholder="0,00" /></Field>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Field label="Valor a usar"><input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => update("amount", event.target.value)} className="input" placeholder="0,00" /></Field>
              <button type="button" onClick={fillSuggestedAmount} className="outline-button self-end rounded-2xl px-4 py-3 text-sm font-black">Usar necessário</button>
            </div>

            <Field label="Data do pagamento"><DateInput value={form.payment_date} onChange={(value) => update("payment_date", value)} /></Field>
            <Field label="Observação"><textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} className="input min-h-20" placeholder="Opcional" /></Field>

            <div className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div><p className="muted-text text-xs font-black">Disponível</p><strong>{money.format(selectedSource.available || 0)}</strong></div>
                <div><p className="muted-text text-xs font-black">Falta pagar</p><strong>{money.format(selectedTarget.remaining || 0)}</strong></div>
                <div><p className="muted-text text-xs font-black">Após pagamento</p><strong>{money.format(targetAfter)}</strong></div>
              </div>
              <p className="mt-3 text-sm font-bold text-emerald-400">{canPayAll ? "Você consegue quitar esse destino." : resultLabel}</p>
            </div>

            <button disabled={!amount || amount <= 0 || amount > selectedSource.available || amount > selectedTarget.remaining} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
              <Plus size={18} /> Registrar pagamento
            </button>
          </form>
        </section>

        <section className="grid gap-6">
          <section className="surface-card rounded-[2rem] p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black">Despesas e destinos pendentes</h2>
                <p className="muted-text text-sm">Acompanhe o que já foi pago, parcial ou ainda pendente.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => onOpenTransactions({ types: ["expense"] })} className="ghost-button rounded-xl px-3 py-2 text-sm font-bold">Ver lançamentos</button>
                <button onClick={onOpenCards} className="ghost-button rounded-xl px-3 py-2 text-sm font-bold">Ver cartões</button>
                <button onClick={onOpenGoals} className="ghost-button rounded-xl px-3 py-2 text-sm font-bold">Ver metas</button>
              </div>
            </div>

            <div className="max-h-[520px] space-y-3 overflow-y-auto pr-2">
              {expenseTargets.length ? expenseTargets.map((item) => {
                const percent = item.amount > 0 ? Math.min(100, Math.round((item.paid / item.amount) * 100)) : 0;
                return (
                  <article key={item.id} className="transaction-row rounded-2xl p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-black">{item.description}</h3>
                        <p className="muted-text text-sm">{item.category} · {formatDateBR(item.date)}{item.cardName ? ` · ${item.cardName}` : ""}</p>
                      </div>
                      <div className="text-right">
                        <strong className={item.remaining <= 0 ? "text-emerald-400" : item.paid > 0 ? "text-amber-400" : "text-rose-400"}>{item.remaining <= 0 ? "Pago" : item.paid > 0 ? "Parcial" : "Pendente"}</strong>
                        <p className="muted-text text-sm">Falta {money.format(item.remaining)}</p>
                      </div>
                    </div>
                    <ProgressBar value={item.paid} max={item.amount || 1} danger={false} />
                    <p className="muted-text mt-2 text-xs font-bold">{percent}% pago · {money.format(item.paid)} de {money.format(item.amount)}</p>
                  </article>
                );
              }) : <EmptyState text="Nenhuma despesa encontrada neste mês." />}
            </div>
          </section>

          <section className="surface-card rounded-[2rem] p-5 shadow-sm">
            <h2 className="text-xl font-black">Histórico de pagamentos</h2>
            <p className="muted-text mb-4 text-sm">Registros feitos em {monthLabel(selectedMonth)}.</p>
            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
              {monthAllocations.length ? monthAllocations.map((item) => (
                <article key={item.id} className="transaction-row flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-black">{allocationTargetLabel(item)}</h3>
                    <p className="muted-text text-sm">Origem: {allocationSourceLabel(item)} · {formatDateBR(item.payment_date)}</p>
                    {item.notes && <p className="muted-text mt-1 text-xs">{item.notes}</p>}
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <strong className="text-emerald-400">{money.format(item.amount)}</strong>
                    <button onClick={() => onDelete(item.id)} className="icon-button rounded-xl p-2 hover:text-rose-500" title="Excluir pagamento"><Trash2 size={17} /></button>
                  </div>
                </article>
              )) : <EmptyState text="Nenhum pagamento registrado neste mês." />}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

function MobileQuickShortcuts({ onExpense, onIncome, onPayment, onCards }) {
  return (
    <section className="mobile-quick-shortcuts" aria-label="Atalhos rápidos">
      <button type="button" onClick={onExpense}>
        <ArrowDownCircle size={16} />
        <span>Despesa</span>
      </button>
      <button type="button" onClick={onIncome}>
        <ArrowUpCircle size={16} />
        <span>Receita</span>
      </button>
      <button type="button" onClick={onPayment}>
        <CheckCircle2 size={16} />
        <span>Pagar</span>
      </button>
      <button type="button" onClick={onCards}>
        <CreditCard size={16} />
        <span>Cartão</span>
      </button>
    </section>
  );
}

function MobileQuickActionFab({ open, setOpen, onAction, page = "dashboard" }) {
  const actionSets = {
    dashboard: [
      { key: "expense", label: "Nova despesa", icon: <ArrowDownCircle size={18} /> },
      { key: "income", label: "Nova receita", icon: <ArrowUpCircle size={18} /> },
      { key: "payment", label: "Pagamento", icon: <CheckCircle2 size={18} /> },
      { key: "card", label: "Cartão", icon: <CreditCard size={18} /> },
    ],
    transactions: [
      { key: "expense", label: "Despesa", icon: <ArrowDownCircle size={18} /> },
      { key: "income", label: "Receita", icon: <ArrowUpCircle size={18} /> },
      { key: "repeat", label: "Igual anterior", icon: <Repeat size={18} /> },
      { key: "payment", label: "Pagar", icon: <CheckCircle2 size={18} /> },
    ],
    cards: [
      { key: "installment", label: "Parcelada", icon: <CreditCard size={18} /> },
      { key: "card-payment", label: "Pagar cartão", icon: <CheckCircle2 size={18} /> },
      { key: "expense", label: "Despesa", icon: <ArrowDownCircle size={18} /> },
      { key: "payment", label: "Pagamento", icon: <Wallet size={18} /> },
    ],
    payments: [
      { key: "payment", label: "Novo pagamento", icon: <CheckCircle2 size={18} /> },
      { key: "expense", label: "Nova despesa", icon: <ArrowDownCircle size={18} /> },
      { key: "income", label: "Nova receita", icon: <ArrowUpCircle size={18} /> },
      { key: "card", label: "Cartões", icon: <CreditCard size={18} /> },
    ],
    recurring: [
      { key: "recurring", label: "Novo fixo", icon: <Repeat size={18} /> },
      { key: "expense", label: "Despesa", icon: <ArrowDownCircle size={18} /> },
      { key: "income", label: "Receita", icon: <ArrowUpCircle size={18} /> },
      { key: "payment", label: "Pagamento", icon: <CheckCircle2 size={18} /> },
    ],
    goals: [
      { key: "goal", label: "Nova meta", icon: <Target size={18} /> },
      { key: "income", label: "Receita", icon: <ArrowUpCircle size={18} /> },
      { key: "payment", label: "Pagamento", icon: <CheckCircle2 size={18} /> },
      { key: "expense", label: "Despesa", icon: <ArrowDownCircle size={18} /> },
    ],
  };

  const actions = actionSets[page] || actionSets.dashboard;
  const titleByPage = {
    dashboard: "Ação rápida",
    transactions: "Lançar agora",
    cards: "Ações do cartão",
    payments: "Novo pagamento",
    recurring: "Fixos e recorrências",
    goals: "Metas financeiras",
  };

  return (
    <>
      {open && <button type="button" className="mobile-action-dim" onClick={() => setOpen(false)} aria-label="Fechar ações rápidas" />}

      {open && (
        <div className="mobile-action-sheet" role="dialog" aria-label="Ações rápidas">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <strong className="block text-sm font-black">{titleByPage[page] || "Ação rápida"}</strong>
              <span className="muted-text text-xs font-semibold">Atalhos adaptados à tela atual.</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="ghost-button rounded-xl p-2" aria-label="Fechar">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {actions.map((action) => (
              <button key={action.key} type="button" onClick={() => onAction(action.key)} className="mobile-action-option">
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mobile-fab-button"
          aria-label="Abrir ações rápidas"
        >
          <Plus size={25} />
        </button>
      )}
    </>
  );
}

function MobileBottomNav({ tabs, page, setPage, moreOpen = false, setMoreOpen = () => {} }) {
  const mainKeys = ["dashboard", "transactions", "cards", "payments"];
  const mainTabs = tabs.filter((tab) => mainKeys.includes(tab.key));
  const moreTabs = tabs.filter((tab) => !mainKeys.includes(tab.key));
  const isMoreActive = moreTabs.some((tab) => tab.key === page);

  function openPage(key) {
    setMoreOpen(false);
    setPage(key);
  }

  return (
    <>
      {moreOpen && <button type="button" className="mobile-nav-dim" onClick={() => setMoreOpen(false)} aria-label="Fechar menu" />}

      {moreOpen && (
        <div className="mobile-more-sheet" role="dialog" aria-label="Mais opções do menu">
          <div className="mb-3 flex items-center justify-between gap-3">
            <strong className="text-sm font-black">Mais áreas</strong>
            <button type="button" onClick={() => setMoreOpen(false)} className="ghost-button rounded-xl p-2" aria-label="Fechar menu">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {moreTabs.map((tab) => (
              <button key={tab.key} type="button" onClick={() => openPage(tab.key)} className={classNames("mobile-more-button", page === tab.key && "mobile-more-active")}>
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <nav className="mobile-bottom-nav" aria-label="Menu rápido mobile">
        {mainTabs.map((tab) => {
          const mobileLabel = tab.key === "transactions" ? "Lançar" : tab.label;
          const mobileIcon = tab.key === "transactions" ? <Plus size={17} /> : tab.icon;

          return (
            <button key={tab.key} onClick={() => openPage(tab.key)} className={classNames("mobile-bottom-button", page === tab.key && "mobile-bottom-active")}>
              {mobileIcon}
              <span>{mobileLabel}</span>
            </button>
          );
        })}

        <button type="button" onClick={() => setMoreOpen((value) => !value)} className={classNames("mobile-bottom-button", isMoreActive && "mobile-bottom-active")}>
          <ListFilter size={17} />
          <span>Mais</span>
        </button>
      </nav>
    </>
  );
}

function ToastCustom({ toast, onClose }) {
  if (!toast?.open) return null;

  const styles = {
    success: {
      container: "toast-success",
      icon: <CheckCircle2 size={18} />,
      label: "Sucesso",
    },
    error: {
      container: "toast-error",
      icon: <X size={18} />,
      label: "Erro",
    },
    warning: {
      container: "toast-warning",
      icon: <span className="text-sm font-black">!</span>,
      label: "Atenção",
    },
    info: {
      container: "toast-info",
      icon: <Bell size={18} />,
      label: "Aviso",
    },
  };

  const current = styles[toast.type] || styles.info;

  return (
    <div className={classNames("custom-toast fixed right-4 top-4 z-[80] flex w-[calc(100%-2rem)] max-w-md items-start gap-3 rounded-[1.35rem] p-4 shadow-2xl", current.container)} role="status" aria-live="polite">
      <div className="custom-toast-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
        {current.icon}
      </div>
      <div className="min-w-0 flex-1">
        <strong className="block text-sm font-black leading-none">{current.label}</strong>
        <p className="mt-1.5 text-sm font-semibold leading-6">{toast.message}</p>
      </div>
      <button type="button" onClick={onClose} className="custom-toast-close rounded-xl p-1.5 transition" aria-label="Fechar aviso">
        <X size={17} />
      </button>
    </div>
  );
}

function ConfirmModal({ modal, onClose }) {
  if (!modal?.open) return null;

  async function handleConfirm() {
    const action = modal.onConfirm;
    onClose();
    if (action) await action();
  }

  return (
    <div className="confirm-overlay fixed inset-0 z-[70] flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true">
      <div className="confirm-card w-full max-w-md rounded-[2rem] p-6 shadow-2xl">
        <div className={classNames("confirm-icon mb-5 flex h-14 w-14 items-center justify-center rounded-2xl", modal.danger ? "confirm-icon-danger" : "confirm-icon-default")}>
          {modal.danger ? <Trash2 size={24} /> : <ShieldCheck size={24} />}
        </div>

        <h2 className="text-2xl font-black tracking-tight">{modal.title}</h2>
        <p className="muted-text mt-3 text-sm font-semibold leading-7">{modal.message}</p>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="outline-button rounded-2xl px-5 py-3 text-sm font-black transition">
            {modal.cancelText}
          </button>
          <button type="button" onClick={handleConfirm} className={classNames("rounded-2xl px-5 py-3 text-sm font-black text-white transition hover:scale-[1.02]", modal.danger ? "confirm-danger-button" : "confirm-default-button")}>
            {modal.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function AlertIcon() {
  return <span className="mt-0.5 inline-flex rounded-xl bg-amber-500/20 p-2 text-amber-300">!</span>;
}


function FinancialHealthCard({ healthStatus, summary, setPage }) {
  if (!healthStatus) return null;
  const toneClass = {
    emerald: "health-emerald",
    blue: "health-blue",
    amber: "health-amber",
    rose: "health-rose",
  }[healthStatus.tone] || "health-blue";

  return (
    <section className={classNames("surface-card financial-health-card rounded-[2rem] p-5 shadow-sm", toneClass)}>
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex items-start gap-4">
          <div className="health-icon rounded-2xl p-3"><ShieldCheck size={24} /></div>
          <div>
            <p className="muted-text text-sm font-black uppercase tracking-wide">Saúde financeira</p>
            <h2 className="mt-1 text-2xl font-black">{healthStatus.label}</h2>
            <p className="muted-text mt-2 max-w-2xl text-sm leading-6">{healthStatus.text}</p>
          </div>
        </div>
        <div className="min-w-[220px]">
          <div className="mb-2 flex items-center justify-between text-sm font-black">
            <span>{healthStatus.score}/100</span>
            <span>{summary.savingRate}% economia</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-500/20">
            <div className="health-bar h-full rounded-full" style={{ width: `${Math.max(8, Math.min(100, healthStatus.score))}%` }} />
          </div>
          <button onClick={() => setPage("reports")} className="ghost-button mt-3 rounded-xl px-3 py-2 text-sm font-bold">Ver relatório</button>
        </div>
      </div>
    </section>
  );
}

function DashboardOverview({ summary, expenseByCategory, dailyFlow, monthlyComparison, topExpenses, goals, selectedMonth, setPage, insights, notifications = [], cardUsage, healthStatus, onOpenTransactions, onSelectMonth }) {
  const topExpense = expenseByCategory[0];
  const nextGoal = goals[0];
  const highlightedCard = [...(cardUsage || [])].sort((a, b) => Number(b.percent || 0) - Number(a.percent || 0))[0];
  const currentMonthComparison = monthlyComparison.find((item) => item.month === selectedMonth) || monthlyComparison[monthlyComparison.length - 1];
  const previousMonthComparison = monthlyComparison.length >= 2
    ? monthlyComparison[monthlyComparison.length - 2]
    : null;
  const expenseChangePercent = previousMonthComparison?.expense > 0 && currentMonthComparison
    ? Math.round(((Number(currentMonthComparison.expense || 0) - Number(previousMonthComparison.expense || 0)) / Number(previousMonthComparison.expense || 1)) * 100)
    : null;
  const daysWithMovement = dailyFlow.filter((item) => Number(item.income || 0) > 0 || Number(item.expense || 0) > 0);
  const timelineDays = [...daysWithMovement].sort((a, b) => Number(b.day) - Number(a.day)).slice(0, 5).reverse();
  const [monthlySummaryOpen, setMonthlySummaryOpen] = useState(false);
  const monthlySummaryData = useMemo(
    () =>
      buildMonthlySummaryData({
        summary,
        selectedMonth,
        expenseByCategory,
        monthlyComparison,
        topExpenses,
        notifications,
        cardUsage,
      }),
    [summary, selectedMonth, expenseByCategory, monthlyComparison, topExpenses, notifications, cardUsage]
  );

  function openDay(day) {
    onOpenTransactions?.({ date: `${selectedMonth}-${String(day).padStart(2, "0")}` });
  }

  return (
    <main className="dashboard-live mobile-dashboard-flow grid gap-6">
      <DashboardLiveHero
        summary={summary}
        selectedMonth={selectedMonth}
        healthStatus={healthStatus}
        notifications={notifications}
        topExpense={topExpense}
        nextGoal={nextGoal}
        highlightedCard={highlightedCard}
        expenseChangePercent={expenseChangePercent}
        setPage={setPage}
        onOpenTransactions={onOpenTransactions}
      />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Receitas"
          value={money.format(summary.income)}
          icon={<ArrowUpCircle />}
          tone="emerald"
          onClick={() => onOpenTransactions?.({ types: ["income"] })}
          info="Soma de todas as entradas cadastradas no mês selecionado. Clique para ver apenas receitas nos lançamentos."
        />
        <MetricCard
          title="Despesas"
          value={money.format(summary.expense)}
          icon={<ArrowDownCircle />}
          tone="rose"
          onClick={() => onOpenTransactions?.({ types: ["expense"] })}
          info="Soma de todos os gastos cadastrados no mês selecionado. Clique para ver apenas despesas."
        />
        <MetricCard
          title="Saldo do mês"
          value={money.format(summary.balance)}
          icon={<Wallet />}
          tone={summary.balance >= 0 ? "blue" : "rose"}
          onClick={() => setPage("reports")}
          info="Diferença entre receitas e despesas do mês. Clique para abrir os relatórios do período."
        />
        <MetricCard
          title="Economia"
          value={`${summary.savingRate}%`}
          icon={<PiggyBank />}
          tone="amber"
          onClick={() => setPage("reports")}
          info="Percentual calculado com base no saldo dividido pelas receitas. Ajuda a entender quanto sobrou da renda."
        />
      </section>

      <MonthlySummaryCard
        data={monthlySummaryData}
        onOpen={() => setMonthlySummaryOpen(true)}
        onOpenTransactions={onOpenTransactions}
      />

      <DashboardFocusGrid
        topExpense={topExpense}
        nextGoal={nextGoal}
        highlightedCard={highlightedCard}
        notifications={notifications}
        summary={summary}
        setPage={setPage}
        onOpenTransactions={onOpenTransactions}
      />

      <section className="dashboard-secondary-row grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <InsightsCard insights={insights} />
        <DashboardTimeline days={timelineDays} selectedMonth={selectedMonth} onOpenDay={openDay} />
      </section>

      <section className="dashboard-charts-row grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Gastos por categoria"
          subtitle={topExpense ? `Maior gasto: ${topExpense.name}` : "Sem despesas neste mês"}
          info="Mostra como suas despesas estão distribuídas por categoria. Clique em uma fatia para abrir os lançamentos daquela categoria."
        >
          {expenseByCategory.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={expenseByCategory}
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  onClick={(entry) => onOpenTransactions?.({ categories: [entry.name], types: ["expense"] })}
                >
                  {expenseByCategory.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} className="cursor-pointer" />
                  ))}
                </Pie>
                <Tooltip cursor={false} contentStyle={tooltipStyle()} formatter={(value) => money.format(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="Cadastre uma despesa para o gráfico aparecer." />
          )}
        </ChartCard>

        <ChartCard
          title="Fluxo diário"
          subtitle={`Receitas e despesas em ${monthLabel(selectedMonth)}`}
          info="Mostra em quais dias do mês entraram receitas e saíram despesas. Clique em um dia do gráfico para ver os lançamentos daquele dia."
        >
          {dailyFlow.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailyFlow} onClick={(event) => event?.activePayload?.[0]?.payload?.day && openDay(event.activePayload[0].payload.day)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fill: "var(--muted)" }} axisLine={{ stroke: "var(--border)" }} tickLine={{ stroke: "var(--border)" }} />
                <YAxis tickFormatter={(value) => `R$${value}`} tick={{ fill: "var(--muted)" }} axisLine={{ stroke: "var(--border)" }} tickLine={{ stroke: "var(--border)" }} />
                <Tooltip cursor={false} contentStyle={tooltipStyle()} formatter={(value) => money.format(value)} />
                <Bar dataKey="income" name="Receita" fill="#059669" radius={[8, 8, 0, 0]} className="cursor-pointer" />
                <Bar dataKey="expense" name="Despesa" fill="#e11d48" radius={[8, 8, 0, 0]} className="cursor-pointer" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="Sem lançamentos para este mês." />
          )}
        </ChartCard>
      </section>

      <section className="dashboard-comparison-row grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <ChartCard
          title="Comparação mensal"
          subtitle="Últimos meses com movimentação"
          info="Compara receitas e despesas dos últimos meses. Clique em uma barra/mês para abrir o painel daquele mês."
        >
          {monthlyComparison.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyComparison} onClick={(event) => event?.activePayload?.[0]?.payload?.month && onSelectMonth?.(event.activePayload[0].payload.month)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fill: "var(--muted)" }} />
                <YAxis tickFormatter={(value) => `R$${value}`} tick={{ fill: "var(--muted)" }} />
                <Tooltip cursor={false} contentStyle={tooltipStyle()} formatter={(value) => money.format(value)} />
                <Bar dataKey="income" name="Receita" fill="#059669" radius={[8, 8, 0, 0]} className="cursor-pointer" />
                <Bar dataKey="expense" name="Despesa" fill="#e11d48" radius={[8, 8, 0, 0]} className="cursor-pointer" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="Sem dados suficientes para comparar meses." />
          )}
        </ChartCard>

        <section className="surface-card rounded-[2rem] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black">Top 5 gastos</h2>
                <InfoPopover title="Top 5 gastos" text="Lista os maiores gastos do mês selecionado. Clique em um item para filtrar lançamentos semelhantes." />
              </div>
              <p className="muted-text text-sm">Maiores despesas do mês</p>
            </div>
            <button onClick={() => onOpenTransactions?.({ types: ["expense"], sort: "highest" })} className="ghost-button rounded-xl px-3 py-2 text-sm font-bold">Ver todos</button>
          </div>
          <div className="space-y-3">
            {topExpenses.length ? (
              topExpenses.map((item, index) => (
                <button key={item.id} type="button" onClick={() => onOpenTransactions?.({ categories: [item.category], types: ["expense"], search: item.description })} className="transaction-row interactive-row flex w-full items-center justify-between rounded-2xl p-3 text-left">
                  <div>
                    <strong>{index + 1}. {item.description}</strong>
                    <p className="muted-text text-sm">{item.category}</p>
                  </div>
                  <strong className="text-rose-500">{money.format(item.amount)}</strong>
                </button>
              ))
            ) : (
              <EmptyState text="Nenhuma despesa cadastrada neste mês." />
            )}
          </div>
        </section>
      </section>

      {nextGoal && (
        <section className="surface-card interactive-card rounded-[2rem] p-5 shadow-sm" role="button" tabIndex={0} onClick={() => setPage("goals")} onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && setPage("goals")}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black">Meta em destaque: {nextGoal.title}</h2>
                <InfoPopover title="Meta em destaque" text="Mostra a primeira meta cadastrada e o progresso atual. Clique para abrir a área de metas." />
              </div>
              <p className="muted-text text-sm">{money.format(nextGoal.current_amount)} de {money.format(nextGoal.target_amount)}</p>
            </div>
            <button type="button" onClick={(event) => { event.stopPropagation(); setPage("goals"); }} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white">Acompanhar metas</button>
          </div>
          <ProgressBar value={nextGoal.current_amount} max={nextGoal.target_amount} />
        </section>
      )}

      <MonthlySummaryModal
        open={monthlySummaryOpen}
        data={monthlySummaryData}
        onClose={() => setMonthlySummaryOpen(false)}
        onOpenTransactions={onOpenTransactions}
        setPage={setPage}
      />
    </main>
  );
}

function getMonthlySummaryTone(data) {
  if (!data?.hasData) return "blue";
  if (data.balance < 0) return "rose";
  if (data.savingRate >= 25) return "emerald";
  if (data.savingRate >= 10) return "blue";
  return "amber";
}

function buildMonthlySummaryData({ summary, selectedMonth, expenseByCategory = [], monthlyComparison = [], topExpenses = [], notifications = [], cardUsage = [] }) {
  const income = Number(summary?.income || 0);
  const expense = Number(summary?.expense || 0);
  const balance = Number(summary?.balance || 0);
  const savingRate = Number(summary?.savingRate || 0);
  const hasData = income > 0 || expense > 0;
  const currentIndex = monthlyComparison.findIndex((item) => item.month === selectedMonth);
  const previous = currentIndex > 0 ? monthlyComparison[currentIndex - 1] : null;
  const topCategory = expenseByCategory[0];
  const highlightedCard = [...(cardUsage || [])].sort((a, b) => Number(b.percent || 0) - Number(a.percent || 0))[0];
  const expenseDiff = previous ? expense - Number(previous.expense || 0) : null;
  const incomeDiff = previous ? income - Number(previous.income || 0) : null;
  const balanceDiff = previous ? balance - Number(previous.balance || 0) : null;
  const expenseChangePercent = previous && Number(previous.expense || 0) > 0
    ? Math.round((expenseDiff / Number(previous.expense || 1)) * 100)
    : null;

  let title = "Vamos montar o resumo do mês";
  let message = "Cadastre receitas e despesas para o sistema gerar uma leitura mais completa do seu mês.";
  let shortMessage = "Sem dados suficientes ainda.";
  let tip = "Comece cadastrando sua renda principal e os gastos fixos. Assim o resumo fica mais preciso.";

  if (hasData && balance < 0) {
    title = "Mês em atenção";
    message = `As despesas passaram das receitas em ${money.format(Math.abs(balance))}. Vale revisar os maiores gastos e próximos vencimentos.`;
    shortMessage = `Saldo negativo de ${money.format(Math.abs(balance))}.`;
    tip = topCategory
      ? `Comece revisando ${topCategory.name}, que concentra ${money.format(topCategory.value)} em despesas no mês.`
      : "Priorize gastos essenciais e evite novas despesas até o saldo voltar ao positivo.";
  } else if (hasData && savingRate >= 25) {
    title = "Mês evoluindo bem";
    message = `Seu saldo está positivo e você economizou ${savingRate}% das receitas do mês.`;
    shortMessage = `Economia de ${savingRate}% no mês.`;
    tip = "Bom momento para direcionar parte do saldo para uma meta ou reserva financeira.";
  } else if (hasData && savingRate >= 10) {
    title = "Mês controlado";
    message = `Você está com saldo positivo de ${money.format(balance)}. Acompanhe os gastos variáveis para manter o ritmo.`;
    shortMessage = `Saldo positivo de ${money.format(balance)}.`;
    tip = topCategory
      ? `Acompanhe ${topCategory.name}, pois essa é a categoria que mais pesa no mês.`
      : "Mantenha os lançamentos atualizados para preservar a visão do mês.";
  } else if (hasData) {
    title = "Mês no limite";
    message = `O mês está positivo, mas a sobra está baixa: ${money.format(balance)}.`;
    shortMessage = `Sobra baixa: ${money.format(balance)}.`;
    tip = "Revise pequenos gastos recorrentes e compras por impulso antes do fechamento do mês.";
  }

  if (highlightedCard && Number(highlightedCard.percent || 0) >= 75) {
    tip = `Fique de olho no ${highlightedCard.name}: ele já está com ${highlightedCard.percent}% do limite em uso.`;
  }

  return {
    selectedMonth,
    monthName: monthLabel(selectedMonth),
    hasData,
    income,
    expense,
    balance,
    savingRate,
    title,
    message,
    shortMessage,
    tip,
    topCategory,
    topCategories: expenseByCategory.slice(0, 3),
    topExpenses: topExpenses.slice(0, 3),
    highlightedCard,
    notificationsCount: Array.isArray(notifications) ? notifications.length : 0,
    previous,
    expenseDiff,
    incomeDiff,
    balanceDiff,
    expenseChangePercent,
    tone: getMonthlySummaryTone({ hasData, balance, savingRate }),
  };
}

function MonthlySummaryCard({ data, onOpen, onOpenTransactions }) {
  const tone = data?.tone || "blue";
  const toneClasses = {
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-400",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-400",
    rose: "border-rose-500/20 bg-rose-500/10 text-rose-400",
  };

  return (
    <section className="monthly-summary-card surface-card rounded-[2rem] p-5 shadow-sm">
      <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-center">
        <button type="button" onClick={onOpen} className="interactive-row flex w-full flex-col gap-4 rounded-[1.5rem] p-4 text-left transition sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className={classNames("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border", toneClasses[tone])}>
              <CalendarRange size={22} />
            </div>
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={classNames("rounded-full border px-3 py-1 text-xs font-black", toneClasses[tone])}>Resumo do mês</span>
                <span className="muted-text text-xs font-black uppercase tracking-[0.12em]">{data.monthName}</span>
              </div>
              <h2 className="text-xl font-black leading-tight">{data.title}</h2>
              <p className="muted-text mt-2 max-w-2xl text-sm font-semibold leading-6">{data.shortMessage}</p>
            </div>
          </div>
          <span className="outline-button rounded-2xl px-4 py-2 text-sm font-black">Ver resumo completo</span>
        </button>

        <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
          <SummaryMiniCard title="Receitas" value={money.format(data.income)} tone="emerald" helper="entradas" />
          <SummaryMiniCard title="Despesas" value={money.format(data.expense)} tone="rose" helper={data.topCategory ? data.topCategory.name : "saídas"} />
          <SummaryMiniCard title="Saldo" value={money.format(data.balance)} tone={data.balance >= 0 ? "blue" : "rose"} helper={`${data.savingRate}% economia`} />
        </div>
      </div>

      {data.topCategory && (
        <button type="button" onClick={() => onOpenTransactions?.({ categories: [data.topCategory.name], types: ["expense"] })} className="transaction-row interactive-row mt-4 flex w-full items-center justify-between gap-3 rounded-2xl p-3 text-left">
          <div>
            <strong className="text-sm">Categoria em destaque: {data.topCategory.name}</strong>
            <p className="muted-text mt-1 text-xs font-semibold">Clique para ver os lançamentos dessa categoria.</p>
          </div>
          <strong className="text-rose-500">{money.format(data.topCategory.value)}</strong>
        </button>
      )}
    </section>
  );
}

function MonthlySummaryModal({ open, data, onClose, onOpenTransactions, setPage }) {
  if (!open || !data) return null;

  return (
    <div className="monthly-summary-backdrop alert-detail-backdrop fixed inset-0 z-[90] flex items-start justify-center px-4 py-6 sm:py-10" onClick={onClose} role="dialog" aria-modal="true" aria-label="Resumo do mês">
      <div className="monthly-summary-modal surface-card flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="edit-modal-hero edit-modal-hero-emerald relative overflow-hidden p-6 sm:p-7">
          <div className="edit-modal-glow edit-modal-glow-one" />
          <div className="edit-modal-glow edit-modal-glow-two" />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <span className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-emerald-100">Resumo do mês · {data.monthName}</span>
              <h2 className="text-3xl font-black leading-tight">{data.title}</h2>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-200">{data.message}</p>
            </div>
            <button type="button" onClick={onClose} className="edit-modal-close inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" aria-label="Fechar resumo do mês" title="Fechar">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="edit-modal-content flex-1 overflow-y-auto px-6 py-5 sm:px-7 sm:py-6">
          <div className="grid gap-3 sm:grid-cols-4">
            <MonthlySummaryStat label="Receitas" value={money.format(data.income)} tone="emerald" />
            <MonthlySummaryStat label="Despesas" value={money.format(data.expense)} tone="rose" />
            <MonthlySummaryStat label="Saldo" value={money.format(data.balance)} tone={data.balance >= 0 ? "blue" : "rose"} />
            <MonthlySummaryStat label="Economia" value={`${data.savingRate}%`} tone="amber" />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <section className="field-shell rounded-[1.5rem] p-4">
              <h3 className="text-lg font-black">Comparação com o mês anterior</h3>
              <p className="muted-text mt-1 text-sm font-semibold">Entenda se o mês melhorou, piorou ou ficou estável.</p>
              <div className="mt-4 grid gap-2">
                {data.previous ? (
                  <>
                    <MonthlySummaryComparisonRow label="Receitas" diff={data.incomeDiff} positiveWhenHigher />
                    <MonthlySummaryComparisonRow label="Despesas" diff={data.expenseDiff} positiveWhenHigher={false} percent={data.expenseChangePercent} />
                    <MonthlySummaryComparisonRow label="Saldo" diff={data.balanceDiff} positiveWhenHigher />
                  </>
                ) : (
                  <EmptyState text="Ainda não há mês anterior suficiente para comparar." />
                )}
              </div>
            </section>

            <section className="field-shell rounded-[1.5rem] p-4">
              <h3 className="text-lg font-black">Dica prática</h3>
              <p className="muted-text mt-2 text-sm font-semibold leading-6">{data.tip}</p>
              <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-300">
                {data.notificationsCount > 0
                  ? `${data.notificationsCount} alerta(s) ativo(s) também podem ajudar a entender o mês.`
                  : "Nenhum alerta crítico ativo neste momento."}
              </div>
            </section>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <section className="field-shell rounded-[1.5rem] p-4">
              <h3 className="text-lg font-black">Onde você mais gastou</h3>
              <div className="mt-4 space-y-3">
                {data.topCategories.length ? (
                  data.topCategories.map((item, index) => (
                    <button key={item.name} type="button" onClick={() => onOpenTransactions?.({ categories: [item.name], types: ["expense"] })} className="transaction-row interactive-row flex w-full items-center justify-between rounded-2xl p-3 text-left">
                      <div>
                        <strong>{index + 1}. {item.name}</strong>
                        <p className="muted-text text-xs font-semibold">Categoria de despesa</p>
                      </div>
                      <strong className="text-rose-500">{money.format(item.value)}</strong>
                    </button>
                  ))
                ) : (
                  <EmptyState text="Sem despesas categorizadas neste mês." />
                )}
              </div>
            </section>

            <section className="field-shell rounded-[1.5rem] p-4">
              <h3 className="text-lg font-black">Maiores lançamentos</h3>
              <div className="mt-4 space-y-3">
                {data.topExpenses.length ? (
                  data.topExpenses.map((item, index) => (
                    <button key={item.id} type="button" onClick={() => onOpenTransactions?.({ search: item.description, categories: [item.category], types: ["expense"] })} className="transaction-row interactive-row flex w-full items-center justify-between rounded-2xl p-3 text-left">
                      <div>
                        <strong>{index + 1}. {item.description}</strong>
                        <p className="muted-text text-xs font-semibold">{item.category} · {formatDateBR(item.date)}</p>
                      </div>
                      <strong className="text-rose-500">{money.format(item.amount)}</strong>
                    </button>
                  ))
                ) : (
                  <EmptyState text="Nenhuma despesa cadastrada neste mês." />
                )}
              </div>
            </section>
          </div>

          {data.highlightedCard && (
            <section className="field-shell mt-5 rounded-[1.5rem] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-black">Cartão em destaque</h3>
                  <p className="muted-text mt-1 text-sm font-semibold">{data.highlightedCard.name} está com {data.highlightedCard.percent}% do limite em uso.</p>
                </div>
                <button type="button" onClick={() => { onClose(); setPage("cards"); }} className="outline-button rounded-2xl px-4 py-2 text-sm font-black">Abrir cartões</button>
              </div>
            </section>
          )}
        </div>

        <div className="edit-modal-footer flex shrink-0 flex-col-reverse gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7 sm:py-5">
          <button type="button" onClick={onClose} className="outline-button rounded-2xl px-5 py-3 text-sm font-black">Fechar</button>
          <button type="button" onClick={() => { onClose(); setPage("reports"); }} className="outline-button rounded-2xl px-5 py-3 text-sm font-black">Ver relatórios</button>
          <button type="button" onClick={() => { onClose(); onOpenTransactions?.({}); }} className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700">Ver lançamentos</button>
        </div>
      </div>
    </div>
  );
}

function MonthlySummaryStat({ label, value, tone }) {
  const toneClasses = {
    emerald: "bg-emerald-500/10 text-emerald-400",
    rose: "bg-rose-500/10 text-rose-400",
    blue: "bg-blue-500/10 text-blue-400",
    amber: "bg-amber-500/10 text-amber-400",
  };

  return (
    <div className={classNames("rounded-2xl p-4", toneClasses[tone] || toneClasses.blue)}>
      <p className="text-xs font-black uppercase tracking-[0.12em] opacity-80">{label}</p>
      <strong className="mt-2 block text-lg font-black sm:text-xl">{value}</strong>
    </div>
  );
}

function MonthlySummaryComparisonRow({ label, diff, positiveWhenHigher, percent }) {
  const value = Number(diff || 0);
  const isNeutral = Math.abs(value) < 0.01;
  const isPositive = isNeutral ? true : positiveWhenHigher ? value >= 0 : value <= 0;
  const suffix = typeof percent === "number" && Number.isFinite(percent) ? ` (${percent > 0 ? "+" : ""}${percent}%)` : "";

  return (
    <div className="transaction-row flex items-center justify-between gap-3 rounded-2xl p-3">
      <span className="font-bold">{label}</span>
      <strong className={classNames(isNeutral ? "muted-text" : isPositive ? "text-emerald-500" : "text-rose-500")}>
        {isNeutral ? "Sem mudança" : `${value > 0 ? "+" : ""}${money.format(value)}${suffix}`}
      </strong>
    </div>
  );
}

function getDashboardTone(summary, healthStatus) {
  if (!summary.income && !summary.expense) {
    return {
      label: "Vamos começar seu mês",
      text: "Cadastre uma receita ou despesa para o painel ganhar vida com seus dados reais.",
      tone: "blue",
      icon: <Plus size={20} />,
    };
  }

  if (summary.balance < 0) {
    return {
      label: "Mês em atenção",
      text: "As despesas passaram das receitas. Priorize revisar os maiores gastos e próximos vencimentos.",
      tone: "rose",
      icon: <Bell size={20} />,
    };
  }

  if (Number(summary.savingRate || 0) >= 25) {
    return {
      label: "Mês evoluindo bem",
      text: "Seu saldo está positivo e a economia está saudável. Bom momento para reforçar metas.",
      tone: "emerald",
      icon: <TrendingUp size={20} />,
    };
  }

  if (Number(summary.savingRate || 0) >= 10) {
    return {
      label: "Mês controlado",
      text: "O mês está positivo. Acompanhe os gastos variáveis para manter o ritmo até o fechamento.",
      tone: "blue",
      icon: <CheckCircle2 size={20} />,
    };
  }

  return {
    label: healthStatus?.label ? `Saúde financeira: ${healthStatus.label}` : "Mês em acompanhamento",
    text: "Seu painel já tem dados suficientes para acompanhar saldo, categorias e cartões com mais clareza.",
    tone: healthStatus?.tone || "amber",
    icon: <BarChart3 size={20} />,
  };
}

function DashboardLiveHero({ summary, selectedMonth, healthStatus, notifications, topExpense, nextGoal, highlightedCard, expenseChangePercent, setPage, onOpenTransactions }) {
  const dashboardTone = getDashboardTone(summary, healthStatus);
  const incomeUsedPercent = summary.income > 0 ? Math.min(100, Math.round((summary.expense / summary.income) * 100)) : 0;
  const alertsCount = Array.isArray(notifications) ? notifications.length : 0;
  const goalPercent = nextGoal?.target_amount > 0 ? Math.min(100, Math.round((Number(nextGoal.current_amount || 0) / Number(nextGoal.target_amount || 1)) * 100)) : 0;

  return (
    <section className={classNames("dashboard-live-hero rounded-[2.2rem] p-5 shadow-sm", `dashboard-live-${dashboardTone.tone}`)}>
      <div className="dashboard-live-orb dashboard-live-orb-one" />
      <div className="dashboard-live-orb dashboard-live-orb-two" />

      <div className="relative z-10 grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-stretch">
        <div className="flex flex-col justify-between gap-6">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="dashboard-live-pill inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em]">
                {dashboardTone.icon}
                Painel vivo
              </span>
              <span className="dashboard-live-pill-soft rounded-full px-3 py-1 text-xs font-black">
                {monthLabel(selectedMonth)}
              </span>
            </div>

            <h2 className="max-w-3xl text-3xl font-black leading-tight tracking-tight md:text-4xl">
              {dashboardTone.label}
            </h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 opacity-85 md:text-base">
              {dashboardTone.text}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <LiveHeroStat label="Renda usada" value={`${incomeUsedPercent}%`} helper="despesas x receitas" />
            <LiveHeroStat label="Alertas" value={String(alertsCount)} helper={alertsCount ? "pontos para revisar" : "nada crítico agora"} />
            <LiveHeroStat label="Meta" value={nextGoal ? `${goalPercent}%` : "—"} helper={nextGoal ? nextGoal.title : "crie sua primeira meta"} />
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setPage("transactions")} className="dashboard-live-action rounded-2xl px-4 py-3 text-sm font-black">
              <Plus size={17} /> Novo lançamento
            </button>
            <button type="button" onClick={() => setPage("payments")} className="dashboard-live-action dashboard-live-action-soft rounded-2xl px-4 py-3 text-sm font-black">
              <Wallet size={17} /> Registrar pagamento
            </button>
            <button type="button" onClick={() => setPage("reports")} className="dashboard-live-action dashboard-live-action-soft rounded-2xl px-4 py-3 text-sm font-black">
              <FileText size={17} /> Ver relatórios
            </button>
          </div>
        </div>

        <div className="dashboard-radar-card rounded-[1.8rem] p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black">Radar do mês</h3>
              <p className="text-sm opacity-75">Resumo rápido do que merece atenção.</p>
            </div>
            <div className="dashboard-radar-icon rounded-2xl p-3">
              <Bell size={20} />
            </div>
          </div>

          <div className="space-y-3">
            <DashboardRadarItem
              icon={<ArrowDownCircle size={18} />}
              title={topExpense ? `Maior categoria: ${topExpense.name}` : "Sem categoria principal"}
              text={topExpense ? `${money.format(topExpense.value)} em despesas neste mês.` : "Cadastre despesas para o radar identificar padrões."}
              onClick={() => topExpense && onOpenTransactions?.({ categories: [topExpense.name], types: ["expense"] })}
            />
            <DashboardRadarItem
              icon={<TrendingUp size={18} />}
              title="Variação de gastos"
              text={expenseChangePercent === null ? "Ainda não há mês anterior suficiente para comparar." : expenseChangePercent > 0 ? `Despesas subiram ${expenseChangePercent}% contra o mês anterior.` : `Despesas caíram ${Math.abs(expenseChangePercent)}% contra o mês anterior.`}
              positive={expenseChangePercent !== null && expenseChangePercent <= 0}
            />
            <DashboardRadarItem
              icon={<CreditCard size={18} />}
              title={highlightedCard ? `Cartão: ${highlightedCard.name}` : "Cartões"}
              text={highlightedCard ? `${highlightedCard.percent}% do limite em uso.` : "Cadastre um cartão para acompanhar faturas e parcelamentos."}
              onClick={() => setPage("cards")}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function LiveHeroStat({ label, value, helper }) {
  return (
    <div className="dashboard-live-stat rounded-2xl p-4">
      <p className="text-xs font-black uppercase tracking-[0.12em] opacity-70">{label}</p>
      <strong className="mt-2 block text-2xl font-black tracking-tight">{value}</strong>
      <span className="mt-1 block truncate text-xs font-semibold opacity-75">{helper}</span>
    </div>
  );
}

function DashboardRadarItem({ icon, title, text, positive = false, onClick }) {
  const Element = onClick ? "button" : "div";
  return (
    <Element type={onClick ? "button" : undefined} onClick={onClick} className={classNames("dashboard-radar-item flex w-full items-start gap-3 rounded-2xl p-3 text-left", positive && "dashboard-radar-positive", onClick && "interactive-row")}>
      <span className="dashboard-radar-item-icon mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">{icon}</span>
      <span className="min-w-0">
        <strong className="block text-sm font-black">{title}</strong>
        <span className="mt-1 block text-xs font-semibold leading-5 opacity-75">{text}</span>
      </span>
    </Element>
  );
}

function DashboardFocusGrid({ topExpense, nextGoal, highlightedCard, notifications, summary, setPage, onOpenTransactions }) {
  const goalPercent = nextGoal?.target_amount > 0 ? Math.min(100, Math.round((Number(nextGoal.current_amount || 0) / Number(nextGoal.target_amount || 1)) * 100)) : 0;
  const cardPercent = highlightedCard ? Math.min(100, Number(highlightedCard.percent || 0)) : 0;
  const mainNotification = Array.isArray(notifications) ? notifications[0] : null;

  return (
    <section className="dashboard-focus-grid grid gap-4 lg:grid-cols-4">
      <DashboardFocusCard
        icon={<ArrowDownCircle size={20} />}
        title="Gasto em foco"
        value={topExpense ? money.format(topExpense.value) : "Sem dados"}
        helper={topExpense ? topExpense.name : "Cadastre despesas"}
        action="Ver categoria"
        onClick={() => topExpense ? onOpenTransactions?.({ categories: [topExpense.name], types: ["expense"] }) : setPage("transactions")}
      />
      <DashboardFocusCard
        icon={<Target size={20} />}
        title="Próxima meta"
        value={nextGoal ? `${goalPercent}%` : "Criar meta"}
        helper={nextGoal ? nextGoal.title : "Acompanhe objetivos"}
        progress={nextGoal ? goalPercent : 0}
        action="Abrir metas"
        onClick={() => setPage("goals")}
      />
      <DashboardFocusCard
        icon={<CreditCard size={20} />}
        title="Cartão em destaque"
        value={highlightedCard ? `${cardPercent}%` : "Sem cartão"}
        helper={highlightedCard ? highlightedCard.name : "Cadastre cartões"}
        progress={cardPercent}
        action="Ver cartões"
        onClick={() => setPage("cards")}
      />
      <DashboardFocusCard
        icon={<Bell size={20} />}
        title="Próxima ação"
        value={mainNotification ? mainNotification.title : summary.balance >= 0 ? "Tudo certo" : "Revisar gastos"}
        helper={mainNotification ? mainNotification.message : summary.balance >= 0 ? "Nenhum alerta crítico" : "Saldo negativo no mês"}
        action={mainNotification ? "Ver alertas" : "Ver relatório"}
        onClick={() => mainNotification ? null : setPage("reports")}
      />
    </section>
  );
}

function DashboardFocusCard({ icon, title, value, helper, progress, action, onClick }) {
  return (
    <button type="button" onClick={onClick} className="dashboard-focus-card surface-card interactive-card rounded-[1.7rem] p-4 text-left shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className="dashboard-focus-icon flex h-11 w-11 items-center justify-center rounded-2xl">{icon}</span>
        <span className="muted-text text-xs font-black">{action}</span>
      </div>
      <p className="muted-text text-xs font-black uppercase tracking-[0.12em]">{title}</p>
      <strong className="mt-2 block truncate text-xl font-black tracking-tight">{value}</strong>
      <p className="muted-text mt-1 line-clamp-2 text-xs font-semibold leading-5">{helper}</p>
      {typeof progress === "number" && (
        <div className="dashboard-focus-progress mt-4 h-2 overflow-hidden rounded-full">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      )}
    </button>
  );
}

function DashboardTimeline({ days, selectedMonth, onOpenDay }) {
  return (
    <section className="surface-card rounded-[2rem] p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black">Últimos movimentos</h2>
            <InfoPopover title="Últimos movimentos" text="Mostra os dias mais recentes com receitas ou despesas. Clique em um dia para abrir os lançamentos daquele período." />
          </div>
          <p className="muted-text text-sm">Movimentação recente em {monthLabel(selectedMonth)}</p>
        </div>
        <CalendarDays className="muted-icon" size={22} />
      </div>

      <div className="space-y-3">
        {days.length ? (
          days.map((item) => {
            const dayBalance = Number(item.income || 0) - Number(item.expense || 0);
            return (
              <button key={item.day} type="button" onClick={() => onOpenDay(item.day)} className="dashboard-timeline-row transaction-row interactive-row flex w-full items-center justify-between gap-3 rounded-2xl p-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="dashboard-timeline-day flex h-11 w-11 flex-col items-center justify-center rounded-2xl">
                    <strong>{String(item.day).padStart(2, "0")}</strong>
                    <span>dia</span>
                  </div>
                  <div>
                    <strong className="text-sm">Receitas {money.format(item.income || 0)}</strong>
                    <p className="muted-text text-xs">Despesas {money.format(item.expense || 0)}</p>
                  </div>
                </div>
                <strong className={classNames("text-sm", dayBalance >= 0 ? "text-emerald-500" : "text-rose-500")}>{money.format(dayBalance)}</strong>
              </button>
            );
          })
        ) : (
          <EmptyState text="Nenhum movimento recente neste mês." />
        )}
      </div>
    </section>
  );
}

function calculateTransactionTotals(items = []) {
  const income = items.filter((item) => item.type === "income").reduce((total, item) => total + Number(item.amount || 0), 0);
  const expense = items.filter((item) => item.type === "expense").reduce((total, item) => total + Number(item.amount || 0), 0);
  return {
    count: items.length,
    income,
    expense,
    balance: income - expense,
  };
}

function SummaryMiniCard({ title, value, tone = "blue", helper }) {
  const toneClasses = {
    emerald: "summary-mini-emerald",
    rose: "summary-mini-rose",
    blue: "summary-mini-blue",
    amber: "summary-mini-amber",
  };

  return (
    <div className={classNames("summary-mini-card rounded-2xl p-4", toneClasses[tone])}>
      <p className="text-xs font-black uppercase tracking-[0.12em]">{title}</p>
      <strong className="mt-2 block text-xl font-black tracking-tight">{value}</strong>
      {helper && <span className="mt-1 block text-xs font-semibold opacity-80">{helper}</span>}
    </div>
  );
}

function TransactionsSummaryPanel({ filteredTotals, selectedTotals, selectedCount, totalCount, allVisibleSelected, onSelectAll, onClearSelection }) {
  return (
    <section className="summary-panel mb-4 rounded-[1.7rem] p-4">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black">Resumo dos filtros</h3>
            <InfoPopover title="Resumo dos filtros" text="Soma automaticamente todos os lançamentos que aparecem com os filtros atuais, parecido com uma planilha." />
          </div>
          <p className="muted-text text-sm">Valores calculados com base nos lançamentos visíveis no filtro atual.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onSelectAll} className="outline-button rounded-2xl px-4 py-2 text-xs font-black">
            {allVisibleSelected ? "Todos selecionados" : "Selecionar visíveis"}
          </button>
          {selectedCount > 0 && (
            <button type="button" onClick={onClearSelection} className="ghost-button rounded-2xl px-4 py-2 text-xs font-black">
              Limpar seleção
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryMiniCard title="Lançamentos" value={String(filteredTotals.count)} tone="blue" helper="no filtro atual" />
        <SummaryMiniCard title="Receitas" value={money.format(filteredTotals.income)} tone="emerald" />
        <SummaryMiniCard title="Despesas" value={money.format(filteredTotals.expense)} tone="rose" />
        <SummaryMiniCard title="Saldo filtrado" value={money.format(filteredTotals.balance)} tone={filteredTotals.balance >= 0 ? "emerald" : "rose"} />
      </div>

      {selectedCount > 0 && (
        <div className="summary-selected mt-4 rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h4 className="font-black">Soma selecionada</h4>
              <p className="muted-text text-sm">{selectedCount} lançamento(s) marcado(s) manualmente.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <SummaryMiniCard title="Selecionados" value={String(selectedCount)} tone="blue" />
            <SummaryMiniCard title="Receitas" value={money.format(selectedTotals.income)} tone="emerald" />
            <SummaryMiniCard title="Despesas" value={money.format(selectedTotals.expense)} tone="rose" />
            <SummaryMiniCard title="Saldo selecionado" value={money.format(selectedTotals.balance)} tone={selectedTotals.balance >= 0 ? "emerald" : "rose"} />
          </div>
        </div>
      )}
    </section>
  );
}

function MultiFilterSelect({ label, values, onChange, options, allValue, allLabel }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedValues = Array.isArray(values) && values.length ? values : [allValue];

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleValue(value) {
    if (value === allValue) {
      onChange([allValue]);
      return;
    }

    const withoutAll = selectedValues.filter((item) => item !== allValue);
    const nextValues = withoutAll.includes(value)
      ? withoutAll.filter((item) => item !== value)
      : [...withoutAll, value];

    onChange(nextValues.length ? nextValues : [allValue]);
  }

  const selectedLabels = options
    .filter((option) => selectedValues.includes(option.value))
    .map((option) => option.label);

  const buttonText = selectedValues.includes(allValue)
    ? allLabel
    : selectedLabels.length <= 2
      ? selectedLabels.join(", ")
      : `${selectedLabels.slice(0, 2).join(", ")} +${selectedLabels.length - 2}`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="input flex min-h-[46px] items-center justify-between gap-3 text-left"
        title={buttonText}
      >
        <span className="min-w-0 truncate">{buttonText}</span>
        <span className="muted-text text-xs font-black">▾</span>
      </button>

      {open && (
        <div className="multi-filter-menu absolute left-0 top-[calc(100%+0.5rem)] z-50 w-full min-w-[220px] rounded-2xl p-2 shadow-2xl">
          <div className="mb-2 flex items-center justify-between gap-2 px-2 pt-1">
            <span className="muted-text text-xs font-black uppercase tracking-[0.16em]">{label}</span>
            {!selectedValues.includes(allValue) && (
              <button type="button" onClick={() => onChange([allValue])} className="text-xs font-black text-emerald-400 hover:text-emerald-300">
                Limpar
              </button>
            )}
          </div>

          <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {options.map((option) => {
              const checked = selectedValues.includes(option.value);
              return (
                <label key={option.value} className={classNames("multi-filter-option flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold", checked && "multi-filter-option-active")}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleValue(option.value)}
                    className="h-4 w-4 accent-emerald-500"
                  />
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TransactionsPage({ form, setForm, resetForm, onRepeatPreviousExpense, onSubmit, visibleTransactions, separatedCardTransactions = [], onOpenCards, allCategories, query, setQuery, dateFilter, setDateFilter, categoryFilter, setCategoryFilter, typeFilter, setTypeFilter, cardFilter, setCardFilter, sortBy, setSortBy, onEdit, onDelete, onDuplicate, onView, exportCSV, exportExcel, creditCards }) {
  const [showAutomaticTransactions, setShowAutomaticTransactions] = useState(false);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState([]);
  const manualTransactions = visibleTransactions.filter((item) => !item.recurring_item_id && !item.recurrence_month);
  const automaticTransactions = visibleTransactions.filter((item) => item.recurring_item_id || item.recurrence_month);
  const selectedTransactions = visibleTransactions.filter((item) => selectedTransactionIds.includes(item.id));
  const filteredTotals = calculateTransactionTotals(visibleTransactions);
  const selectedTotals = calculateTransactionTotals(selectedTransactions);
  const visibleIds = visibleTransactions.map((item) => item.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedTransactionIds.includes(id));

  useEffect(() => {
    setSelectedTransactionIds((current) => current.filter((id) => visibleIds.includes(id)));
  }, [visibleTransactions]);

  function toggleTransactionSelection(id) {
    setSelectedTransactionIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function selectAllVisibleTransactions() {
    setSelectedTransactionIds(allVisibleSelected ? [] : visibleIds);
  }

  return (
    <main className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <section id="new-transaction-form-card" className="surface-card compact-entry-card rounded-[2rem] p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-black">Novo lançamento</h2>
            <p className="muted-text text-sm">Registre receita ou despesa.</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button type="button" onClick={onRepeatPreviousExpense} className="outline-button rounded-xl px-3 py-2 text-xs font-black">
              Lançar igual ao anterior
            </button>
            <button type="button" onClick={resetForm} className="ghost-button rounded-xl px-3 py-2 text-xs font-bold">Limpar</button>
          </div>
        </div>

        <TransactionForm form={form} setForm={setForm} onSubmit={onSubmit} editingId={null} creditCards={creditCards} />
      </section>

      <section className="surface-card rounded-[2rem] p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black">Lançamentos avulsos</h2>
            <p className="muted-text text-sm">Movimentações sem cartão vinculado. Gastos de cartão ficam separados na aba Cartões.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportExcel} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-700">
              <Download size={17} /> Exportar Excel
            </button>
            <button onClick={exportCSV} className="outline-button inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-black transition">
              CSV
            </button>
          </div>
        </div>

        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_160px_160px_170px_170px]">
          <label className="field-shell flex items-center gap-2 rounded-2xl px-3 py-2">
            <Search size={17} className="muted-icon" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por descrição, categoria..." className="w-full bg-transparent text-sm outline-none" />
          </label>
          <MultiFilterSelect
            label="Categoria"
            values={categoryFilter}
            onChange={setCategoryFilter}
            allValue="Todas"
            allLabel="Todas"
            options={allCategories.map((category) => ({ value: category, label: category }))}
          />
          <MultiFilterSelect
            label="Tipo"
            values={typeFilter}
            onChange={setTypeFilter}
            allValue="all"
            allLabel="Todos"
            options={[
              { value: "all", label: "Todos" },
              { value: "income", label: "Receitas" },
              { value: "expense", label: "Despesas" },
            ]}
          />
          <MultiFilterSelect
            label="Cartões"
            values={cardFilter}
            onChange={setCardFilter}
            allValue="all"
            allLabel="Todos os cartões"
            options={[
              { value: "all", label: "Todos os cartões" },
              { value: "none", label: "Sem cartão" },
              ...creditCards.map((card) => ({ value: card.id, label: card.name })),
            ]}
          />
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="input">
            <option value="recent">Mais recente</option>
            <option value="oldest">Mais antigo</option>
            <option value="highest">Maior valor</option>
            <option value="lowest">Menor valor</option>
          </select>
        </div>

        {separatedCardTransactions.length > 0 && (
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-blue-500/10 p-2 text-blue-300">
                <CreditCard size={18} />
              </div>
              <div>
                <strong className="text-blue-300">{separatedCardTransactions.length} lançamento(s) de cartão separado(s)</strong>
                <p className="muted-text mt-1 text-xs font-semibold">
                  Eles continuam entrando no painel, relatórios, PDF e Excel, mas ficam organizados em Cartões para não misturar com lançamentos avulsos.
                </p>
              </div>
            </div>
            <button type="button" onClick={onOpenCards} className="outline-button rounded-2xl px-4 py-2 text-xs font-black">
              Ver em Cartões
            </button>
          </div>
        )}

        {dateFilter && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300">
            <span>Filtrando lançamentos de {formatDateBR(dateFilter)}</span>
            <button type="button" onClick={() => setDateFilter("")} className="rounded-xl px-3 py-1 text-xs font-black hover:bg-emerald-500/10">
              Remover data
            </button>
          </div>
        )}

        <TransactionsSummaryPanel
          filteredTotals={filteredTotals}
          selectedTotals={selectedTotals}
          selectedCount={selectedTransactions.length}
          totalCount={visibleTransactions.length}
          allVisibleSelected={allVisibleSelected}
          onSelectAll={selectAllVisibleTransactions}
          onClearSelection={() => setSelectedTransactionIds([])}
        />

        <div
  className="space-y-3 overflow-y-auto pr-2"
  style={{
    maxHeight: "70vh",
    scrollbarGutter: "stable",
  }}
>
          {automaticTransactions.length > 0 && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
              <button
                type="button"
                onClick={() => setShowAutomaticTransactions((value) => !value)}
                className="flex w-full items-center justify-between gap-3 text-left text-sm font-black text-emerald-300"
              >
                <span>{showAutomaticTransactions ? "Ocultar" : "Mostrar"} {automaticTransactions.length} fixo(s) automático(s)</span>
                <span>{showAutomaticTransactions ? "▲" : "▼"}</span>
              </button>
              <p className="muted-text mt-1 text-xs font-semibold">
                Estes lançamentos entram nos cálculos do painel, mas ficam recolhidos para não misturar com lançamentos manuais.
              </p>

              {showAutomaticTransactions && (
                <div className="mt-3 space-y-3">
                  {automaticTransactions.map((item) => <TransactionRow key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} onView={onView} creditCards={creditCards} selectable selected={selectedTransactionIds.includes(item.id)} onToggleSelect={toggleTransactionSelection} />)}
                </div>
              )}
            </div>
          )}

          {manualTransactions.length ? manualTransactions.map((item) => <TransactionRow key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} onView={onView} creditCards={creditCards} selectable selected={selectedTransactionIds.includes(item.id)} onToggleSelect={toggleTransactionSelection} />) : !automaticTransactions.length ? <EmptyState title="Nenhum lançamento avulso encontrado" text={separatedCardTransactions.length ? "Os lançamentos de cartão deste filtro foram separados na aba Cartões." : "Tente limpar filtros ou cadastrar uma nova receita/despesa."} actionLabel={separatedCardTransactions.length ? "Ver em Cartões" : undefined} onAction={separatedCardTransactions.length ? onOpenCards : undefined} /> : null}
        </div>
      </section>
    </main>
  );
}


function TransactionDetailsModal({ open, transaction, creditCards = [], onClose, onEdit }) {
  if (!open || !transaction) return null;

  const isIncome = transaction.type === "income";
  const typeLabel = isIncome ? "Receita" : "Despesa";
  const card = creditCards.find((item) => item.id === transaction.card_id);
  const hasNotes = Boolean(String(transaction.notes || "").trim());

  return (
    <div className="edit-modal-backdrop fixed inset-0 z-[70] flex items-center justify-center px-4 py-4 sm:py-6" role="dialog" aria-modal="true" aria-label="Detalhes do lançamento">
      <div className="edit-modal-shell transaction-details-shell relative flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[2.4rem] shadow-2xl sm:max-h-[92vh]" onClick={(event) => event.stopPropagation()}>
        <div className={classNames("edit-modal-hero relative overflow-hidden p-6 sm:p-7", isIncome ? "edit-modal-hero-emerald" : "edit-modal-hero-rose")}>
          <div className="edit-modal-glow edit-modal-glow-one" />
          <div className="edit-modal-glow edit-modal-glow-two" />

          <div className="relative z-10 flex items-start justify-between gap-5">
            <div className="min-w-0">
              <div className={classNames("mb-4 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-black", isIncome ? "edit-chip-income" : "edit-chip-expense")}>
                <FileText size={14} /> Detalhes do lançamento
              </div>
              <h2 className="break-words text-3xl font-black tracking-tight">{transaction.description}</h2>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-300">
                Confira as informações salvas neste lançamento sem abrir o formulário de edição.
              </p>
            </div>

            <button type="button" onClick={onClose} className="edit-modal-close inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" aria-label="Fechar detalhes" title="Fechar">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="edit-modal-form flex min-h-0 flex-1 flex-col">
          <div className="edit-modal-content flex-1 overflow-y-auto px-6 py-5 sm:px-7 sm:py-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailInfo label="Categoria" value={transaction.category || "Não informada"} />
              <DetailInfo label="Forma de pagamento" value={transaction.method || "Não informada"} />
              <DetailInfo label="Cartão vinculado" value={card ? `${card.name} · ${formatCardType(card.card_type)}` : "Sem cartão vinculado"} />
              <DetailInfo label="Parcela" value={transaction.installment_total ? `${transaction.installment_number}/${transaction.installment_total}` : "Não parcelado"} />
            </div>

            <div className="mt-4 rounded-[1.5rem] border border-slate-500/15 bg-slate-500/10 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-black"><FileText size={16} /> Observações</p>
              <p className="muted-text whitespace-pre-wrap text-sm font-semibold leading-6">
                {hasNotes ? transaction.notes : "Nenhuma observação adicionada neste lançamento."}
              </p>
            </div>
          </div>

          <div className="edit-modal-footer flex shrink-0 flex-col-reverse gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7 sm:py-5">
            <button type="button" onClick={onClose} className="outline-button rounded-2xl px-5 py-3 text-sm font-black">Fechar</button>
            <button type="button" onClick={() => onEdit?.(transaction)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:scale-[1.01] hover:bg-emerald-700">
              <Edit3 size={18} /> Editar lançamento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailInfo({ label, value }) {
  return (
    <div className="transaction-detail-info rounded-2xl p-4">
      <p className="muted-text text-xs font-black uppercase tracking-wide">{label}</p>
      <strong className="mt-1 block break-words text-sm">{value}</strong>
    </div>
  );
}

function EditGoalModal({ open, form, setForm, onSubmit, onClose }) {
  if (!open) return null;

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="edit-modal-backdrop fixed inset-0 z-[70] flex items-center justify-center px-4 py-4 sm:py-6" role="dialog" aria-modal="true" aria-label="Editar meta">
      <div className="edit-modal-shell relative flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[2.4rem] shadow-2xl sm:max-h-[92vh]" onClick={(event) => event.stopPropagation()}>
        <div className="edit-modal-hero edit-modal-hero-emerald relative overflow-hidden p-6 sm:p-7">
          <div className="edit-modal-glow edit-modal-glow-one" />
          <div className="edit-modal-glow edit-modal-glow-two" />
          <div className="relative z-10 flex items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="edit-chip-income mb-4 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-black">
                <Target size={14} /> Edição da meta
              </div>
              <h2 className="text-3xl font-black tracking-tight">Editar meta</h2>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-300">
                Ajuste os dados da meta em uma janela separada, sem alterar o formulário de nova meta.
              </p>
            </div>
            <button type="button" onClick={onClose} className="edit-modal-close inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" aria-label="Fechar edição" title="Fechar">
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="edit-modal-form flex min-h-0 flex-1 flex-col">
          <div className="edit-modal-content flex-1 overflow-y-auto px-6 py-5 sm:px-7 sm:py-6">
            <div className="grid gap-4">
              <Field label="Nome da meta"><input value={form.title} onChange={(event) => update("title", event.target.value)} className="input input-lg" placeholder="Ex.: Reserva de emergência" /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Valor alvo"><input type="number" min="0" step="0.01" value={form.target_amount} onChange={(event) => update("target_amount", event.target.value)} className="input input-lg" placeholder="0,00" /></Field>
                <Field label="Valor atual"><input type="number" min="0" step="0.01" value={form.current_amount} onChange={(event) => update("current_amount", event.target.value)} className="input input-lg" placeholder="0,00" /></Field>
              </div>
              <Field label="Prazo"><DateInput value={form.deadline} onChange={(value) => update("deadline", value)} /></Field>
            </div>
          </div>

          <div className="edit-modal-footer flex shrink-0 flex-col-reverse gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7 sm:py-5">
            <button type="button" onClick={onClose} className="outline-button rounded-2xl px-5 py-3 text-sm font-black">Cancelar</button>
            <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:scale-[1.01] hover:bg-emerald-700">
              <Save size={18} /> Salvar meta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditCardModal({ open, form, setForm, onSubmit, onClose }) {
  if (!open) return null;

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="edit-modal-backdrop fixed inset-0 z-[70] flex items-center justify-center px-4 py-4 sm:py-6" role="dialog" aria-modal="true" aria-label="Editar cartão">
      <div className="edit-modal-shell relative flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[2.4rem] shadow-2xl sm:max-h-[92vh]" onClick={(event) => event.stopPropagation()}>
        <div className="edit-modal-hero edit-modal-hero-income relative overflow-hidden p-6 sm:p-7">
          <div className="edit-modal-glow edit-modal-glow-one" />
          <div className="edit-modal-glow edit-modal-glow-two" />
          <div className="relative z-10 flex items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="edit-chip-income mb-4 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-black">
                <CreditCard size={14} /> Edição do cartão
              </div>
              <h2 className="text-3xl font-black tracking-tight">Editar cartão</h2>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-300">
                Altere limite, datas e status em uma janela separada, sem misturar com o cadastro de novo cartão.
              </p>
            </div>
            <button type="button" onClick={onClose} className="edit-modal-close inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" aria-label="Fechar edição" title="Fechar">
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="edit-modal-form flex min-h-0 flex-1 flex-col">
          <div className="edit-modal-content flex-1 overflow-y-auto px-6 py-5 sm:px-7 sm:py-6">
            <div className="grid gap-4">
              <Field label="Nome do cartão"><input value={form.name} onChange={(event) => update("name", event.target.value)} className="input input-lg" placeholder="Ex.: Nubank" /></Field>
              <Field label="Tipo do cartão">
                <select value={form.card_type || "Crédito"} onChange={(event) => update("card_type", event.target.value)} className="input input-lg">
                  {cardTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </Field>
              <Field label="Limite total"><input type="number" min="0" step="0.01" value={form.card_limit} onChange={(event) => update("card_limit", event.target.value)} className="input input-lg" placeholder="0,00" /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Fechamento"><input type="number" min="0" max="31" value={form.closing_day} onChange={(event) => update("closing_day", event.target.value)} className="input input-lg" placeholder="0" /></Field>
                <Field label="Vencimento"><input type="number" min="0" max="31" value={form.due_day} onChange={(event) => update("due_day", event.target.value)} className="input input-lg" placeholder="0" /></Field>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-bold leading-5 text-emerald-400">
                Use 0 para cartão sem fechamento ou sem vencimento definido.
              </div>
              <Field label="Cor"><input type="color" value={form.color} onChange={(event) => update("color", event.target.value)} className="input h-14" /></Field>
              <label className="field-shell flex items-center gap-3 rounded-2xl p-3 text-sm font-bold">
                <input type="checkbox" checked={form.is_active} onChange={(event) => update("is_active", event.target.checked)} /> Cartão ativo
              </label>
            </div>
          </div>

          <div className="edit-modal-footer flex shrink-0 flex-col-reverse gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7 sm:py-5">
            <button type="button" onClick={onClose} className="outline-button rounded-2xl px-5 py-3 text-sm font-black">Cancelar</button>
            <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:scale-[1.01] hover:bg-emerald-700">
              <Save size={18} /> Salvar cartão
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditTransactionModal({ open, form, setForm, onSubmit, onClose, creditCards = [] }) {
  if (!open) return null;

  const isIncome = form.type === "income";
  const typeLabel = isIncome ? "Receita" : "Despesa";
  const typeTone = isIncome ? "emerald" : "rose";

  function update(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "type") {
        const categories = defaultCategories[value];
        next.category = categories.includes(current.category) ? current.category : categories[0];

        if (value === "income") {
          next.is_installment = false;
          next.installments = "1";
          next.card_id = "";
          if (isCardBasedPaymentMethod(next.method)) next.method = "Pix";
        }
      }

      if (field === "method" && !isCardBasedPaymentMethod(value)) {
        next.card_id = "";
        next.is_installment = false;
        next.installments = "1";
      }

      return next;
    });
  }

  return (
    <div
      className="edit-modal-backdrop fixed inset-0 z-[70] flex items-center justify-center px-4 py-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-label="Editar lançamento"
    >
      <div
        className="edit-modal-shell relative flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[2.4rem] shadow-2xl sm:max-h-[92vh]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={classNames("edit-modal-hero relative overflow-hidden p-6 sm:p-7", `edit-modal-hero-${typeTone}`)}>
          <div className="edit-modal-glow edit-modal-glow-one" />
          <div className="edit-modal-glow edit-modal-glow-two" />

          <div className="relative z-10 flex items-start justify-between gap-5">
            <div className="min-w-0">
              <div className={classNames("mb-4 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-black", isIncome ? "edit-chip-income" : "edit-chip-expense")}>
                <Edit3 size={14} /> Edição do lançamento
              </div>
              <h2 className="text-3xl font-black tracking-tight">Editar lançamento</h2>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-300">
                Ajuste os dados deste registro em uma janela separada, sem alterar o formulário de novo lançamento.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="edit-modal-close inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              aria-label="Fechar edição"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>

        </div>

        <form onSubmit={onSubmit} className="edit-modal-form flex min-h-0 flex-1 flex-col">
          <div className="edit-modal-content flex-1 overflow-y-auto px-6 py-5 sm:px-7 sm:py-6">
            <div className="mb-6 rounded-[1.75rem] border border-slate-500/15 bg-slate-500/10 p-4">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-black">Tipo do lançamento</p>
                <p className="muted-text text-xs font-semibold">Use essa opção apenas se o registro foi lançado como despesa ou receita por engano.</p>
              </div>
              <span className={classNames("rounded-full px-3 py-1 text-xs font-black", isIncome ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300")}>
                {typeLabel} selecionada
              </span>
            </div>
            <TypeSwitch value={form.type} onChange={(value) => update("type", value)} />
          </div>

          <div className="grid gap-4">
            <Field label="Descrição">
              <input value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Ex.: Mercado, salário, boleto..." className="input input-lg" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Valor">
                <input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => update("amount", event.target.value)} placeholder="0,00" className="input input-lg" />
              </Field>
              <Field label="Data">
                <DateInput value={form.date} onChange={(value) => update("date", value)} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Categoria">
                <select value={form.category} onChange={(event) => update("category", event.target.value)} className="input input-lg">
                  {defaultCategories[form.type].map((category) => <option key={category}>{category}</option>)}
                </select>
              </Field>

              <Field label="Forma de pagamento">
                <select value={form.method} onChange={(event) => update("method", event.target.value)} className="input input-lg">
                  {paymentMethods.map((method) => <option key={method}>{method}</option>)}
                </select>
              </Field>
            </div>

            {isCardBasedPaymentMethod(form.method) && form.type === "expense" && (
              <Field label="Cartão vinculado">
                <select value={form.card_id} onChange={(event) => update("card_id", event.target.value)} className="input input-lg">
                  <option value="">Sem cartão vinculado</option>
                  {getCardOptionsForPaymentMethod(creditCards, form.method).map((card) => (
                    <option key={card.id} value={card.id}>{card.name} · {formatCardType(card.card_type)}</option>
                  ))}
                </select>
              </Field>
            )}

            {form.type === "expense" && (
              <div className="edit-installment-card rounded-[1.5rem] p-4">
                <label className="flex items-center gap-3 text-sm font-black">
                  <input type="checkbox" checked={form.is_installment} onChange={(event) => update("is_installment", event.target.checked)} />
                  Compra parcelada
                </label>
                {form.is_installment && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1.25fr]">
                    <Field label="Qtd. parcelas">
                      <input type="number" min="2" max="60" value={form.installments} onChange={(event) => update("installments", event.target.value)} className="input" />
                    </Field>
                    <div className="rounded-2xl bg-emerald-500/10 p-3 text-xs font-bold leading-5 text-emerald-400">
                      Ao salvar uma edição, somente este lançamento será alterado. Para criar várias parcelas, use um novo lançamento.
                    </div>
                  </div>
                )}
              </div>
            )}

            <Field label="Observações">
              <textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Opcional" className="input min-h-28" />
            </Field>
          </div>

          </div>

          <div className="edit-modal-footer flex shrink-0 flex-col-reverse gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7 sm:py-5">
            <button type="button" onClick={onClose} className="outline-button rounded-2xl px-5 py-3 text-sm font-black">
              Cancelar
            </button>
            <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:scale-[1.01] hover:bg-emerald-700">
              <Save size={18} /> Salvar alteração
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TypeSwitch({ value, onChange }) {
  const options = [
    {
      key: "expense",
      label: "Despesa",
      description: "Saída de dinheiro",
      icon: <ArrowDownCircle size={18} />,
      activeClass: "type-option-active-expense",
    },
    {
      key: "income",
      label: "Receita",
      description: "Entrada de dinheiro",
      icon: <ArrowUpCircle size={18} />,
      activeClass: "type-option-active-income",
    },
  ];

  return (
    <div className="type-switch grid grid-cols-2 gap-2 rounded-[1.25rem] p-1.5">
      {options.map((option) => {
        const active = value === option.key;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={classNames("type-option rounded-2xl px-3 py-3 text-left transition", active && option.activeClass)}
            aria-pressed={active}
          >
            <span className="flex items-center gap-2 text-sm font-black">
              {option.icon}
              {option.label}
            </span>
            <span className="mt-1 block text-[11px] font-bold opacity-80">{option.description}</span>
          </button>
        );
      })}
    </div>
  );
}

function TransactionForm({ form, setForm, onSubmit, editingId, creditCards = [] }) {
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const suggestedCategory = useMemo(() => suggestCategoryFromDescription(form.description, form.type), [form.description, form.type]);
  const cardOptions = useMemo(() => getCardOptionsForPaymentMethod(creditCards, form.method), [creditCards, form.method]);

  useEffect(() => {
    if (!isCardBasedPaymentMethod(form.method) || form.type !== "expense") return;

    if (form.card_id && !cardOptions.some((card) => card.id === form.card_id)) {
      setForm((current) => ({ ...current, card_id: "" }));
    }
  }, [form.method, form.type, form.card_id, cardOptions, setForm]);

  function shouldAutoApplyCategory(currentCategory) {
    const standardExpenseCategories = defaultCategories.expense;
    return !currentCategory || currentCategory === standardExpenseCategories[0] || currentCategory === "Outros";
  }

  function update(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "type") {
        const categories = defaultCategories[value];
        next.category = categories.includes(current.category) ? current.category : categories[0];

        if (value === "income") {
          next.is_installment = false;
          next.installments = "1";
          next.card_id = "";
          if (isCardBasedPaymentMethod(next.method)) next.method = "Pix";
        }
      }

      if (field === "description" && current.type === "expense") {
        const suggested = suggestCategoryFromDescription(value, current.type);
        if (suggested && shouldAutoApplyCategory(current.category)) {
          next.category = suggested;
        }
      }

      if (field === "method") {
        const matchingCards = getCardOptionsForPaymentMethod(creditCards, value);

        if (!isCardBasedPaymentMethod(value)) {
          next.card_id = "";
          next.is_installment = false;
          next.installments = "1";
        } else if (current.type === "expense" && next.card_id && !matchingCards.some((card) => card.id === next.card_id)) {
          next.card_id = "";
        }
      }

      return next;
    });
  }

  function applySuggestedCategory() {
    if (!suggestedCategory) return;
    update("category", suggestedCategory);
  }

  return (
    <form onSubmit={onSubmit} className="transaction-form-mobile space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-sm font-black">Tipo do lançamento</span>
          <span className={classNames("rounded-full px-3 py-1 text-xs font-black", form.type === "income" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
            {form.type === "income" ? "Receita" : "Despesa"}
          </span>
        </div>
        <TypeSwitch value={form.type} onChange={(value) => update("type", value)} />
      </div>

      <Field label="Descrição">
        <input value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Ex.: Mc Donalds, mercado, salário..." className="input" />
        {suggestedCategory && form.type === "expense" && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 px-3 py-2 text-xs font-bold text-emerald-300">
            <span>Categoria sugerida: <strong>{suggestedCategory}</strong></span>
            {form.category !== suggestedCategory && (
              <button type="button" onClick={applySuggestedCategory} className="rounded-xl bg-emerald-500/10 px-2 py-1 font-black text-emerald-300 hover:bg-emerald-500/20">
                Usar sugestão
              </button>
            )}
          </div>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor"><input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => update("amount", event.target.value)} placeholder="0,00" className="input" /></Field>
        <Field label="Data"><DateInput value={form.date} onChange={(value) => update("date", value)} /></Field>
      </div>

      <Field label="Categoria">
        <select value={form.category} onChange={(event) => update("category", event.target.value)} className="input">
          {defaultCategories[form.type].map((category) => <option key={category}>{category}</option>)}
        </select>
      </Field>

      <Field label="Forma de pagamento">
        <select value={form.method} onChange={(event) => update("method", event.target.value)} className="input">
          {paymentMethods.map((method) => <option key={method}>{method}</option>)}
        </select>
      </Field>

      {isCardBasedPaymentMethod(form.method) && form.type === "expense" && (
        <Field label="Cartão vinculado">
          <select value={form.card_id} onChange={(event) => update("card_id", event.target.value)} className="input">
            <option value="">{cardOptions.length ? "Sem cartão vinculado" : "Nenhum cartão compatível"}</option>
            {cardOptions.map((card) => (
              <option key={card.id} value={card.id}>{card.name} · {formatCardType(card.card_type)}</option>
            ))}
          </select>
          <p className="muted-text mt-2 text-xs font-semibold">
            {cardOptions.length
              ? `Mostrando apenas cartões compatíveis com ${form.method}.`
              : `Nenhum cartão ativo compatível com ${form.method}. Cadastre um cartão deste tipo na aba Cartões.`}
          </p>
        </Field>
      )}

      <div className="field-shell transaction-optional-panel rounded-2xl p-3">
        <button
          type="button"
          onClick={() => setShowOptionalFields((value) => !value)}
          className="flex w-full items-center justify-between gap-3 text-left text-sm font-black"
        >
          <span>Mais opções</span>
          <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-400">
            {showOptionalFields ? "Ocultar" : "Parcelas / observação"}
          </span>
        </button>

        {showOptionalFields && (
          <div className="mt-3 space-y-3">
            {form.type === "expense" && (
              <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-3">
                <label className="flex items-center gap-3 text-sm font-bold">
                  <input type="checkbox" checked={form.is_installment} onChange={(event) => update("is_installment", event.target.checked)} />
                  Compra parcelada
                </label>
                {form.is_installment && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Field label="Qtd. parcelas">
                      <input type="number" min="2" max="60" value={form.installments} onChange={(event) => update("installments", event.target.value)} className="input" />
                    </Field>
                    <div className="rounded-2xl bg-emerald-500/10 p-3 text-xs font-bold text-emerald-400">
                      O valor será dividido automaticamente nas próximas faturas.
                    </div>
                  </div>
                )}
              </div>
            )}

            <Field label="Observações"><textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Opcional" className="input min-h-20" /></Field>
          </div>
        )}
      </div>

      <button className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white shadow-sm transition hover:scale-[1.01] hover:bg-emerald-700">
        <Plus size={18} /> {editingId ? "Salvar alteração" : "Adicionar lançamento"}
      </button>
    </form>
  );
}

function GoalsPage({ goals, goalForm, setGoalForm, onSubmit, onEdit, onDelete, onDeposit }) {
  function update(field, value) {
    setGoalForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <main className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <section className="surface-card rounded-[2rem] p-5 shadow-sm">
        <h2 className="text-xl font-black">Nova meta</h2>
        <p className="muted-text mb-5 text-sm">Planeje seus objetivos financeiros.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Nome da meta"><input value={goalForm.title} onChange={(event) => update("title", event.target.value)} className="input" placeholder="Ex.: Reserva de emergência" /></Field>
          <Field label="Valor alvo"><input type="number" min="0" step="0.01" value={goalForm.target_amount} onChange={(event) => update("target_amount", event.target.value)} className="input" placeholder="0,00" /></Field>
          <Field label="Valor atual"><input type="number" min="0" step="0.01" value={goalForm.current_amount} onChange={(event) => update("current_amount", event.target.value)} className="input" placeholder="0,00" /></Field>
          <Field label="Prazo"><DateInput value={goalForm.deadline} onChange={(value) => update("deadline", value)} /></Field>
          <button className="w-full rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white">Criar meta</button>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {goals.length ? goals.map((goal) => <GoalCard key={goal.id} goal={goal} onEdit={onEdit} onDelete={onDelete} onDeposit={onDeposit} />) : <EmptyState title="Nenhuma meta cadastrada" text="Crie uma meta para acompanhar seus objetivos financeiros." />}
      </section>
    </main>
  );
}


function GoalCard({ goal, onEdit, onDelete, onDeposit }) {
  const [depositValue, setDepositValue] = useState("");
  const percent = goal.target_amount > 0 ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100)) : 0;
  return (
    <article className="surface-card rounded-[2rem] p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black">{goal.title}</h3>
          <p className="muted-text text-sm">{goal.deadline ? `Prazo: ${formatDateBR(goal.deadline)}` : "Sem prazo definido"}</p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(goal)} className="icon-button rounded-xl p-2"><Edit3 size={17} /></button>
          <button onClick={() => onDelete(goal.id)} className="icon-button rounded-xl p-2 hover:text-rose-500"><Trash2 size={17} /></button>
        </div>
      </div>
      <ProgressBar value={goal.current_amount} max={goal.target_amount} />
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="muted-text">{money.format(goal.current_amount)} de {money.format(goal.target_amount)}</span>
        <strong>{percent}%</strong>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          type="number"
          min="0"
          step="0.01"
          value={depositValue}
          onChange={(event) => setDepositValue(event.target.value)}
          className="input"
          placeholder="Adicionar valor à meta"
        />
        <button
          type="button"
          onClick={async () => {
            await onDeposit(goal, depositValue);
            setDepositValue("");
          }}
          className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-700"
        >
          + Adicionar
        </button>
      </div>
    </article>
  );
}

function LimitsPage({ limitForm, setLimitForm, categoryUsage, onSubmit, onDelete }) {
  return (
    <main className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <section className="surface-card rounded-[2rem] p-5 shadow-sm">
        <h2 className="text-xl font-black">Limite por categoria</h2>
        <p className="muted-text mb-5 text-sm">Defina quanto pode gastar por mês.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Categoria">
            <select value={limitForm.category} onChange={(event) => setLimitForm((current) => ({ ...current, category: event.target.value }))} className="input">
              {defaultCategories.expense.map((category) => <option key={category}>{category}</option>)}
            </select>
          </Field>
          <Field label="Limite mensal">
            <input type="number" min="0" step="0.01" value={limitForm.monthly_limit} onChange={(event) => setLimitForm((current) => ({ ...current, monthly_limit: event.target.value }))} className="input" placeholder="0,00" />
          </Field>
          <button className="w-full rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white">Salvar limite</button>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {categoryUsage.length ? categoryUsage.map((item) => <LimitCard key={item.id} item={item} onDelete={onDelete} />) : <EmptyState text="Você ainda não definiu limites por categoria." />}
      </section>
    </main>
  );
}

function LimitCard({ item, onDelete }) {
  return (
    <article className="surface-card rounded-[2rem] p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black">{item.category}</h3>
          <p className="muted-text text-sm">Gasto: {money.format(item.spent)} · Limite: {money.format(item.monthly_limit)}</p>
        </div>
        <button onClick={() => onDelete(item.id)} className="icon-button rounded-xl p-2 hover:text-rose-500"><Trash2 size={17} /></button>
      </div>
      <ProgressBar value={item.spent} max={item.monthly_limit} danger={item.exceeded} />
      <p className={classNames("mt-3 text-sm font-bold", item.exceeded ? "text-rose-500" : "text-emerald-500")}>
        {item.percent}% usado {item.exceeded ? "· limite ultrapassado" : ""}
      </p>
    </article>
  );
}

function RecurringPage({ recurringForm, setRecurringForm, recurringItems, onSubmit, onToggle, onEdit, onDelete, onGenerate, selectedMonth }) {
  const recurringSummary = useMemo(() => {
    const activeItems = recurringItems.filter((item) => item.is_active);
    const monthOccurrences = activeItems.flatMap((item) =>
      getRecurringOccurrenceDates(item, selectedMonth).map((date) => ({ ...item, date }))
    );
    const income = monthOccurrences.filter((item) => item.type === "income").reduce((total, item) => total + Number(item.amount || 0), 0);
    const expense = monthOccurrences.filter((item) => item.type === "expense").reduce((total, item) => total + Number(item.amount || 0), 0);

    return {
      active: activeItems.length,
      monthOccurrences: monthOccurrences.length,
      income,
      expense,
    };
  }, [recurringItems, selectedMonth]);

  function update(field, value) {
    setRecurringForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "type") {
        const categories = defaultCategories[value];
        next.category = categories.includes(current.category) ? current.category : categories[0];
      }

      if (field === "recurrence_type") {
        if (!next.start_date) next.start_date = todayISODate();
        if (value !== "custom_months") next.interval_months = "2";
      }

      if (field === "start_date") {
        const parsed = parseISODateSafe(value);
        if (parsed) next.day_of_month = String(parsed.getDate());
      }

      return next;
    });
  }

  const recurrenceHelper = recurrenceTypes.find((item) => item.value === recurringForm.recurrence_type)?.helper;
  const selectedRecurrenceType = recurringForm.recurrence_type || "monthly";

  return (
    <main className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <section className="surface-card rounded-[2rem] p-5 shadow-sm">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Receitas e despesas fixas</h2>
            <p className="muted-text mt-1 text-sm leading-6">Cadastre mensal, semanal, quinzenal, anual ou em intervalo personalizado.</p>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-400">Novo</span>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="segmented-control grid grid-cols-2 gap-2 rounded-2xl p-1">
            <button type="button" onClick={() => update("type", "expense")} className={classNames("rounded-xl px-3 py-2 text-sm font-black transition", recurringForm.type === "expense" ? "segmented-active text-rose-500 shadow-sm" : "muted-text")}>Despesa</button>
            <button type="button" onClick={() => update("type", "income")} className={classNames("rounded-xl px-3 py-2 text-sm font-black transition", recurringForm.type === "income" ? "segmented-active text-emerald-500 shadow-sm" : "muted-text")}>Receita</button>
          </div>

          <Field label="Descrição">
            <input value={recurringForm.description} onChange={(event) => update("description", event.target.value)} className="input" placeholder="Ex.: IPVA, Netflix, salário..." />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor">
              <input type="number" min="0" step="0.01" value={recurringForm.amount} onChange={(event) => update("amount", event.target.value)} className="input" placeholder="0,00" />
            </Field>
            <Field label="Frequência">
              <select value={selectedRecurrenceType} onChange={(event) => update("recurrence_type", event.target.value)} className="input">
                {recurrenceTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </Field>
          </div>

          {recurrenceHelper && (
            <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-300">
              {recurrenceHelper}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {(selectedRecurrenceType === "monthly" || selectedRecurrenceType === "custom_months") && (
              <Field label="Dia do mês">
                <input type="number" min="1" max="31" value={recurringForm.day_of_month} onChange={(event) => update("day_of_month", event.target.value)} className="input" />
              </Field>
            )}

            {(selectedRecurrenceType === "weekly" || selectedRecurrenceType === "biweekly" || selectedRecurrenceType === "annual" || selectedRecurrenceType === "custom_months") && (
              <Field label={selectedRecurrenceType === "annual" ? "Data anual" : "Data inicial"}>
                <input type="date" value={recurringForm.start_date} onChange={(event) => update("start_date", event.target.value)} className="input" />
              </Field>
            )}

            {selectedRecurrenceType === "custom_months" && (
              <Field label="Intervalo">
                <select value={recurringForm.interval_months} onChange={(event) => update("interval_months", event.target.value)} className="input">
                  {[2, 3, 4, 6, 12].map((value) => <option key={value} value={value}>A cada {value} meses</option>)}
                </select>
              </Field>
            )}
          </div>

          <Field label="Categoria">
            <select value={recurringForm.category} onChange={(event) => update("category", event.target.value)} className="input">
              {defaultCategories[recurringForm.type].map((category) => <option key={category}>{category}</option>)}
            </select>
          </Field>

          <Field label="Forma de pagamento">
            <select value={recurringForm.method} onChange={(event) => update("method", event.target.value)} className="input">
              {paymentMethods.map((method) => <option key={method}>{method}</option>)}
            </select>
          </Field>

          <label className="field-shell flex items-center gap-3 rounded-2xl p-3 text-sm font-bold">
            <input type="checkbox" checked={recurringForm.is_active} onChange={(event) => update("is_active", event.target.checked)} /> Fixo ativo
          </label>

          <button className="w-full rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white">Cadastrar fixo</button>
        </form>
      </section>

      <section className="space-y-5">
        <div className="surface-card rounded-[2rem] p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black">Fixos de {monthLabel(selectedMonth)}</h2>
              <p className="muted-text text-sm">Agora os fixos podem repetir por semana, quinzena, ano ou intervalo personalizado.</p>
            </div>
            <button onClick={onGenerate} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white">Sincronizar fixos</button>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <SummaryMiniCard title="Ativos" value={String(recurringSummary.active)} tone="blue" helper="fixos cadastrados" />
            <SummaryMiniCard title="Ocorrências" value={String(recurringSummary.monthOccurrences)} tone="amber" helper="neste mês" />
            <SummaryMiniCard title="Receitas fixas" value={money.format(recurringSummary.income)} tone="emerald" helper="previstas" />
            <SummaryMiniCard title="Despesas fixas" value={money.format(recurringSummary.expense)} tone="rose" helper="previstas" />
          </div>
        </div>

        <div className="surface-card rounded-[2rem] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">Itens cadastrados</h2>
              <p className="muted-text text-sm">Ex.: IPVA anual, Netflix mensal, salário mensal e vale refeição mensal.</p>
            </div>
            <span className="rounded-full bg-slate-500/10 px-3 py-1 text-xs font-black muted-text">{recurringItems.length} item(ns)</span>
          </div>

          <div className="max-h-[470px] overflow-y-auto pr-2">
            <div className="space-y-3">
              {recurringItems.length ? recurringItems.map((item) => <RecurringRow key={item.id} item={item} selectedMonth={selectedMonth} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />) : <EmptyState text="Nenhum item fixo cadastrado." />}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function RecurringRow({ item, selectedMonth, onToggle, onEdit, onDelete }) {
  const occurrences = getRecurringOccurrenceDates(item, selectedMonth);
  const nextOccurrence = occurrences[0];
  const frequencyLabel = getRecurringFrequencyLabel(item);

  return (
    <article className="transaction-row flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 className="font-black">{item.description}</h3>
          <span className={classNames("rounded-full px-2.5 py-1 text-[11px] font-black", item.type === "income" ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300")}>{frequencyLabel}</span>
          {!item.is_active && <span className="rounded-full bg-slate-500/10 px-2.5 py-1 text-[11px] font-black muted-text">Inativo</span>}
        </div>
        <p className="muted-text text-sm">{item.category} · {item.method} · {getRecurringScheduleText(item)}</p>
        <p className="muted-text mt-1 text-xs font-semibold">
          {nextOccurrence ? `${occurrences.length} ocorrência(s) em ${monthLabel(selectedMonth)} · próxima: ${formatDateBR(nextOccurrence)}` : `Sem ocorrência em ${monthLabel(selectedMonth)}`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        <strong className={item.type === "income" ? "text-emerald-500" : "text-rose-500"}>{item.type === "income" ? "+" : "-"} {money.format(item.amount)}</strong>
        <button onClick={() => onToggle(item)} className="outline-button rounded-xl px-3 py-2 text-sm font-bold">{item.is_active ? "Ativo" : "Inativo"}</button>
        <button onClick={() => onEdit(item)} className="icon-button rounded-xl p-2 hover:text-blue-500" title="Editar item fixo"><Edit3 size={17} /></button>
        <button onClick={() => onDelete(item.id)} className="icon-button rounded-xl p-2 hover:text-rose-500" title="Excluir item fixo"><Trash2 size={17} /></button>
      </div>
    </article>
  );
}


function EditRecurringModal({ open, form, setForm, onSubmit, onClose }) {
  if (!open) return null;

  const isIncome = form.type === "income";
  const typeLabel = isIncome ? "Receita fixa" : "Despesa fixa";
  const typeTone = isIncome ? "emerald" : "rose";

  function update(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "type") {
        const categories = defaultCategories[value];
        next.category = categories.includes(current.category) ? current.category : categories[0];
      }
      if (field === "recurrence_type") {
        if (!next.start_date) next.start_date = todayISODate();
        if (value !== "custom_months") next.interval_months = "2";
      }
      if (field === "start_date") {
        const parsed = parseISODateSafe(value);
        if (parsed) next.day_of_month = String(parsed.getDate());
      }
      return next;
    });
  }

  return (
    <div
      className="edit-modal-backdrop fixed inset-0 z-[70] flex items-center justify-center px-4 py-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-label="Editar item fixo"
    >
      <div
        className="edit-modal-shell relative flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[2.4rem] shadow-2xl sm:max-h-[92dvh]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={classNames("edit-modal-hero relative overflow-hidden p-6 sm:p-7", `edit-modal-hero-${typeTone}`)}>
          <div className="edit-modal-glow edit-modal-glow-one" />
          <div className="edit-modal-glow edit-modal-glow-two" />

          <div className="relative z-10 flex items-start justify-between gap-5">
            <div className="min-w-0">
              <div className={classNames("mb-4 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-black", isIncome ? "edit-chip-income" : "edit-chip-expense")}>
                <Repeat size={14} /> Edição de item fixo
              </div>
              <h2 className="text-3xl font-black tracking-tight">Editar item fixo</h2>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-300">
                Ajuste a frequência, data e categoria desse item fixo.
              </p>
            </div>

            <button type="button" onClick={onClose} className="edit-modal-close inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" aria-label="Fechar edição" title="Fechar">
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="edit-modal-form flex min-h-0 flex-1 flex-col">
          <div className="edit-modal-content flex-1 overflow-y-auto px-6 py-5 sm:px-7 sm:py-6">
            <div className="mb-6 rounded-[1.75rem] border border-slate-500/15 bg-slate-500/10 p-4">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-black">Tipo do item fixo</p>
                  <p className="muted-text text-xs font-semibold">Defina se essa recorrência entra como receita ou despesa fixa.</p>
                </div>
                <span className={classNames("rounded-full px-3 py-1 text-xs font-black", isIncome ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300")}>
                  {typeLabel}
                </span>
              </div>
              <TypeSwitch value={form.type} onChange={(value) => update("type", value)} />
            </div>

            <div className="grid gap-4">
              <Field label="Descrição">
                <input value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Ex.: Internet, salário, academia..." className="input input-lg" />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Valor">
                  <input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => update("amount", event.target.value)} placeholder="0,00" className="input input-lg" />
                </Field>
                <Field label="Frequência">
                  <select value={form.recurrence_type || "monthly"} onChange={(event) => update("recurrence_type", event.target.value)} className="input input-lg">
                    {recurrenceTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {((form.recurrence_type || "monthly") === "monthly" || (form.recurrence_type || "monthly") === "custom_months") && (
                  <Field label="Dia do mês">
                    <input type="number" min="1" max="31" value={form.day_of_month} onChange={(event) => update("day_of_month", event.target.value)} className="input input-lg" />
                  </Field>
                )}

                {((form.recurrence_type || "monthly") === "weekly" || (form.recurrence_type || "monthly") === "biweekly" || (form.recurrence_type || "monthly") === "annual" || (form.recurrence_type || "monthly") === "custom_months") && (
                  <Field label={(form.recurrence_type || "monthly") === "annual" ? "Data anual" : "Data inicial"}>
                    <input type="date" value={form.start_date || ""} onChange={(event) => update("start_date", event.target.value)} className="input input-lg" />
                  </Field>
                )}

                {(form.recurrence_type || "monthly") === "custom_months" && (
                  <Field label="Intervalo">
                    <select value={form.interval_months || "2"} onChange={(event) => update("interval_months", event.target.value)} className="input input-lg">
                      {[2, 3, 4, 6, 12].map((value) => <option key={value} value={value}>A cada {value} meses</option>)}
                    </select>
                  </Field>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Categoria">
                  <select value={form.category} onChange={(event) => update("category", event.target.value)} className="input input-lg">
                    {defaultCategories[form.type].map((category) => <option key={category}>{category}</option>)}
                  </select>
                </Field>

                <Field label="Forma de pagamento">
                  <select value={form.method} onChange={(event) => update("method", event.target.value)} className="input input-lg">
                    {paymentMethods.map((method) => <option key={method}>{method}</option>)}
                  </select>
                </Field>
              </div>

              <label className="field-shell flex items-center gap-3 rounded-2xl p-3 text-sm font-bold">
                <input type="checkbox" checked={form.is_active} onChange={(event) => update("is_active", event.target.checked)} /> Item fixo ativo
              </label>
            </div>
          </div>

          <div className="edit-modal-footer flex shrink-0 flex-col-reverse gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7 sm:py-5">
            <button type="button" onClick={onClose} className="outline-button rounded-2xl px-5 py-3 text-sm font-black">Cancelar</button>
            <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:scale-[1.01] hover:bg-emerald-700">
              <Save size={18} /> Salvar item fixo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OnboardingBanner({ preferencesForm, setPreferencesForm, onSubmit }) {
  function update(field, value) {
    setPreferencesForm((current) => ({ ...current, [field]: value }));
  }
  return (
    <section className="surface-card rounded-[2rem] p-5 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr] lg:items-center">
        <div>
          <div className="mb-3 inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-black text-emerald-400">
            Configuração inicial
          </div>
          <h2 className="text-2xl font-black">Bem-vindo ao seu controle financeiro</h2>
          <p className="muted-text mt-2 text-sm leading-7">
            Configure algumas informações rápidas para deixar o painel mais personalizado.
          </p>
        </div>
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Field label="Renda mensal aproximada">
            <input type="number" min="0" step="0.01" value={preferencesForm.monthly_income} onChange={(event) => update("monthly_income", event.target.value)} className="input" placeholder="0,00" />
          </Field>
          <Field label="Principal objetivo">
            <input value={preferencesForm.main_goal} onChange={(event) => update("main_goal", event.target.value)} className="input" placeholder="Ex.: reserva de emergência" />
          </Field>
          <button className="self-end rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white">Salvar</button>
        </form>
      </div>
    </section>
  );
}

function NotificationsPanel({ notifications }) {
  const [selectedNotification, setSelectedNotification] = useState(null);
  const visibleNotifications = notifications.slice(0, 6);
  const hiddenCount = Math.max(0, notifications.length - visibleNotifications.length);

  function toneClass(tone) {
    if (tone === "rose") return "alert-compact-rose";
    if (tone === "amber") return "alert-compact-amber";
    if (tone === "emerald") return "alert-compact-emerald";
    return "alert-compact-blue";
  }

  function severityLabel(item) {
    if (item.priority <= 1 || item.tone === "rose") return "Alta prioridade";
    if (item.priority <= 3 || item.tone === "amber") return "Atenção";
    return "Informativo";
  }

  function impactText(item) {
    if (item.tone === "rose") return "Esse alerta indica algo que pode afetar diretamente seu saldo, limite ou planejamento do mês.";
    if (item.tone === "amber") return "Esse ponto ainda pode ser controlado, mas vale acompanhar antes que vire um problema maior.";
    if (item.tone === "emerald") return "Esse alerta indica uma oportunidade positiva ou algo próximo de ser concluído.";
    return "Esse é um aviso preventivo para melhorar a organização dos seus dados financeiros.";
  }

  if (!notifications.length) return null;

  return (
    <section className="surface-card rounded-[2rem] p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-500/10 p-2.5 text-emerald-400"><Bell size={18} /></div>
          <div>
            <h2 className="text-lg font-black">Alertas</h2>
            <p className="muted-text text-xs font-semibold">Resumo discreto. Clique em um alerta para ver detalhes e dica.</p>
          </div>
        </div>
        <span className="alert-count-pill rounded-full px-3 py-1 text-xs font-black">
          {notifications.length} ativo(s)
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleNotifications.map((item) => (
          <button
            key={`${item.title}-${item.text}`}
            type="button"
            onClick={() => setSelectedNotification(item)}
            className={classNames("alert-compact-button inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-left text-xs font-black transition", toneClass(item.tone))}
            title="Ver detalhes do alerta"
          >
            <span className="alert-dot" />
            <span className="max-w-[210px] truncate">{item.title}</span>
            {item.badge && <span className="alert-mini-badge">{item.badge}</span>}
          </button>
        ))}

        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setSelectedNotification(notifications[visibleNotifications.length])}
            className="alert-compact-button alert-compact-neutral inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-black transition"
          >
            +{hiddenCount} outro(s)
          </button>
        )}
      </div>

      {selectedNotification && (
        <div className="alert-detail-backdrop fixed inset-0 z-[90] flex items-start justify-center px-4 py-6 sm:py-10" onClick={() => setSelectedNotification(null)}>
          <div className="alert-detail-modal surface-card w-full max-w-2xl rounded-[2rem] p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className={classNames("alert-detail-chip", toneClass(selectedNotification.tone))}>{selectedNotification.badge || "Alerta"}</span>
                  <span className="alert-detail-chip alert-compact-neutral">{severityLabel(selectedNotification)}</span>
                </div>
                <h3 className="text-2xl font-black leading-tight">{selectedNotification.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="icon-button rounded-2xl p-2"
                aria-label="Fechar detalhes do alerta"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-3">
              <div className="alert-detail-box rounded-2xl p-4">
                <strong className="block text-sm font-black">O que aconteceu</strong>
                <p className="muted-text mt-2 text-sm font-semibold leading-6">{selectedNotification.text}</p>
              </div>

              <div className="alert-detail-box rounded-2xl p-4">
                <strong className="block text-sm font-black">Impacto</strong>
                <p className="muted-text mt-2 text-sm font-semibold leading-6">{impactText(selectedNotification)}</p>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <strong className="block text-sm font-black text-emerald-400">Dica prática</strong>
                <p className="mt-2 text-sm font-semibold leading-6 text-emerald-300">
                  {selectedNotification.action || "Revise os lançamentos relacionados e acompanhe novamente no fechamento do mês."}
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-700"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function InsightsCard({ insights }) {
  return (
    <section className="surface-card rounded-[2rem] p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-400"><Eye size={20} /></div>
        <div>
          <h2 className="text-xl font-black">Insights inteligentes</h2>
          <p className="muted-text text-sm">Leituras automáticas do seu mês.</p>
        </div>
      </div>
      <div className="space-y-3">
        {insights.map((item) => (
          <div key={item} className="transaction-row rounded-2xl p-4 text-sm font-bold leading-6">{item}</div>
        ))}
      </div>
    </section>
  );
}

function CardsUsageMini({ cardUsage, setPage }) {
  return (
    <section className="surface-card rounded-[2rem] p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-blue-500/10 p-3 text-blue-400"><CreditCard size={20} /></div>
          <div>
            <h2 className="text-xl font-black">Cartões</h2>
            <p className="muted-text text-sm">Uso do limite no mês.</p>
          </div>
        </div>
        <button onClick={() => setPage("cards")} className="ghost-button rounded-xl px-3 py-2 text-sm font-bold">Gerenciar</button>
      </div>
      <div className="space-y-3">
        {cardUsage.length ? cardUsage.slice(0, 3).map((card) => (
          <div key={card.id} className="transaction-row rounded-2xl p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <strong>{card.name}</strong>
              <span className="text-sm font-black">{card.percent}%</span>
            </div>
            <ProgressBar value={card.spent} max={card.card_limit || 1} danger={card.percent >= 90} />
            <p className="muted-text mt-2 text-xs">{money.format(card.spent)} usado de {money.format(card.card_limit)}</p>
          </div>
        )) : <EmptyState text="Cadastre seus cartões para acompanhar limite e fatura." />}
      </div>
    </section>
  );
}

function CardsPage({ cardForm, setCardForm, onSubmit, onEdit, onDelete, cardUsage, transactions, cardAdjustments, selectedMonth, onCardAdjustment, onDeleteCardAdjustment, onInstallmentPurchase, onEditTransaction, onDeleteTransaction, onDuplicateTransaction, onViewTransaction, creditCards = [] }) {
  const [selectedCardId, setSelectedCardId] = useState(cardUsage[0]?.id || "");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [showInstallmentForm, setShowInstallmentForm] = useState(false);
  const [showNewCardForm, setShowNewCardForm] = useState(cardUsage.length === 0);
  const emptyInstallmentForm = {
    description: "",
    category: "Mercado",
    amount: "",
    installments: "2",
    first_date: new Date().toISOString().slice(0, 10),
    notes: "",
  };
  const [installmentForm, setInstallmentForm] = useState(emptyInstallmentForm);

  useEffect(() => {
    if (!selectedCardId && cardUsage[0]?.id) setSelectedCardId(cardUsage[0].id);
    if (selectedCardId && !cardUsage.some((card) => card.id === selectedCardId)) setSelectedCardId(cardUsage[0]?.id || "");
    if (!cardUsage.length) setShowNewCardForm(true);
  }, [cardUsage, selectedCardId]);

  function update(field, value) {
    setCardForm((current) => ({ ...current, [field]: value }));
  }

  const selectedCard = cardUsage.find((card) => card.id === selectedCardId) || cardUsage[0];
  const monthEnd = getMonthEndISO(selectedMonth);
  const selectedCardTransactions = selectedCard ? transactions.filter((item) => item.card_id === selectedCard.id && item.type === "expense") : [];
  const invoiceTransactions = selectedCardTransactions.filter((item) => item.date <= monthEnd);
  const selectedCardAdjustments = selectedCard ? cardAdjustments.filter((item) => item.card_id === selectedCard.id && item.date <= monthEnd) : [];
  const selectedInstallmentGroups = selectedCard ? buildInstallmentGroups(selectedCardTransactions, selectedMonth) : [];
  const futureInstallmentsAmount = selectedInstallmentGroups.reduce((total, group) => total + Number(group.remainingAmount || 0), 0);
  const hasCreditSelected = selectedCard && isCreditLikeCardType(selectedCard.card_type);

  function submitAdjustment(adjustmentType, fixedAmount) {
    const amount = fixedAmount || adjustmentAmount;
    onCardAdjustment({ cardId: selectedCard?.id, adjustmentType, amount, notes: adjustmentNotes });
    setAdjustmentAmount("");
    setAdjustmentNotes("");
  }

  async function submitInstallmentPurchase(event) {
    event.preventDefault();
    const success = await onInstallmentPurchase?.({
      ...installmentForm,
      card_id: selectedCard?.id,
    });

    if (success) {
      setInstallmentForm(emptyInstallmentForm);
      setShowInstallmentForm(false);
    }
  }

  return (
    <main className="cards-page-layout grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[310px_minmax(0,1fr)]">
      <aside className="grid gap-4 self-start xl:sticky xl:top-6">
        <section className="card-list-panel surface-card rounded-[2rem] p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Meus cartões</h2>
              <p className="muted-text text-sm">Escolha um cartão para abrir os detalhes.</p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-400">
              {cardUsage.length}
            </span>
          </div>

          <div className="space-y-3">
            {cardUsage.length ? cardUsage.map((card) => (
              <CardSidebarItem
                key={card.id}
                card={card}
                selected={card.id === selectedCard?.id}
                onSelect={() => setSelectedCardId(card.id)}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            )) : <EmptyState title="Nenhum cartão cadastrado" text="Cadastre seu primeiro cartão para acompanhar limite, fatura e parcelas." />}
          </div>
        </section>

        <section className="surface-card rounded-[2rem] p-5 shadow-sm">
          <button
            type="button"
            onClick={() => setShowNewCardForm((value) => !value)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div>
              <h2 className="text-lg font-black">Novo cartão</h2>
              <p className="muted-text text-sm">Cadastre limite, fechamento e vencimento.</p>
            </div>
            <span className="rounded-2xl bg-emerald-500/10 px-3 py-2 text-sm font-black text-emerald-400">
              {showNewCardForm ? "−" : "+"}
            </span>
          </button>

          {showNewCardForm && (
            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              <Field label="Nome do cartão"><input value={cardForm.name} onChange={(event) => update("name", event.target.value)} className="input" placeholder="Ex.: Nubank" /></Field>
              <Field label="Tipo do cartão">
                <select value={cardForm.card_type || "Crédito"} onChange={(event) => update("card_type", event.target.value)} className="input">
                  {cardTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </Field>
              <Field label="Limite total"><input type="number" min="0" step="0.01" value={cardForm.card_limit} onChange={(event) => update("card_limit", event.target.value)} className="input" placeholder="0,00" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fechamento"><input type="number" min="0" max="31" value={cardForm.closing_day} onChange={(event) => update("closing_day", event.target.value)} className="input" placeholder="0" /></Field>
                <Field label="Vencimento"><input type="number" min="0" max="31" value={cardForm.due_day} onChange={(event) => update("due_day", event.target.value)} className="input" placeholder="0" /></Field>
              </div>
              <p className="muted-text -mt-2 text-xs font-semibold">Use 0 para deixar sem fechamento ou sem vencimento.</p>
              <Field label="Cor"><input type="color" value={cardForm.color} onChange={(event) => update("color", event.target.value)} className="input h-14" /></Field>
              <label className="field-shell flex items-center gap-3 rounded-2xl p-3 text-sm font-bold">
                <input type="checkbox" checked={cardForm.is_active} onChange={(event) => update("is_active", event.target.checked)} /> Cartão ativo
              </label>
              <button className="w-full rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white">Criar cartão</button>
            </form>
          )}
        </section>
      </aside>

      <section className="grid gap-6 content-start">
        {cardUsage.length > 0 && (
          <section className="mobile-card-picker surface-card rounded-[1.35rem] p-3 shadow-sm">
            <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-emerald-400">Cartão selecionado</label>
            <select value={selectedCard?.id || ""} onChange={(event) => setSelectedCardId(event.target.value)} className="input">
              {cardUsage.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name} · {formatCardType(card.card_type)}
                </option>
              ))}
            </select>
          </section>
        )}

        {selectedCard ? (
          <>
            <section className="surface-card rounded-[2rem] p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="mb-2 h-3 w-16 rounded-full" style={{ background: selectedCard.color || "#059669" }} />
                  <h2 className="text-2xl font-black">{selectedCard.name}</h2>
                  <p className="muted-text mt-1 text-sm">
                    {formatCardType(selectedCard.card_type)} · {formatCardClosingDay(selectedCard.closing_day)} · {formatCardDueDay(selectedCard.due_day)}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px]">
                  <MiniInfo label={selectedCard.stored_value_card ? "Disponível" : "Em aberto"} value={money.format(selectedCard.stored_value_card ? selectedCard.available : selectedCard.spent)} />
                  <MiniInfo label={selectedCard.stored_value_card ? "Base + recargas" : "Limite"} value={money.format(selectedCard.total_available_base || selectedCard.card_limit)} />
                  <MiniInfo label="Parceladas" value={`${selectedInstallmentGroups.length} compra(s)`} />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowInstallmentForm((value) => !value)}
                  disabled={!hasCreditSelected}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  title={!hasCreditSelected ? "Disponível apenas para cartões de crédito" : "Nova compra parcelada"}
                >
                  <Plus size={17} /> {showInstallmentForm ? "Ocultar parcelamento" : "Nova compra parcelada"}
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(selectedCard)}
                  className="outline-button inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black"
                >
                  <Edit3 size={17} /> Editar cartão
                </button>
              </div>
            </section>

            {showInstallmentForm && (
              <CardInstallmentPurchaseBox
                card={selectedCard}
                form={installmentForm}
                setForm={setInstallmentForm}
                onSubmit={submitInstallmentPurchase}
                onClose={() => setShowInstallmentForm(false)}
              />
            )}

            <CreditCardInvoicePanel
              card={selectedCard}
              transactions={invoiceTransactions}
              allTransactions={selectedCardTransactions}
              adjustments={selectedCardAdjustments}
              selectedMonth={selectedMonth}
              adjustmentAmount={adjustmentAmount}
              setAdjustmentAmount={setAdjustmentAmount}
              adjustmentNotes={adjustmentNotes}
              setAdjustmentNotes={setAdjustmentNotes}
              onAdjustment={submitAdjustment}
              onDeleteAdjustment={onDeleteCardAdjustment}
              onEditTransaction={onEditTransaction}
              onDeleteTransaction={onDeleteTransaction}
              onDuplicateTransaction={onDuplicateTransaction}
              onViewTransaction={onViewTransaction}
              creditCards={creditCards}
            />
          </>
        ) : (
          <section className="surface-card rounded-[2rem] p-8 text-center shadow-sm">
            <EmptyState title="Cadastre um cartão" text="Depois de criar um cartão, esta área mostrará fatura, parcelas, pagamentos e movimentações." />
          </section>
        )}
      </section>
    </main>
  );
}

function CardSidebarItem({ card, selected, onSelect, onEdit, onDelete }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={classNames(
        "transaction-row interactive-row w-full rounded-2xl p-3 text-left transition",
        selected && "selected-card"
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 h-2 w-12 rounded-full" style={{ background: card.color || "#059669" }} />
          <strong className="block truncate">{card.name}</strong>
          <span className="muted-text mt-1 block text-xs font-bold">{formatCardType(card.card_type)}</span>
        </div>
        <div className="flex shrink-0 gap-1">
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => { event.stopPropagation(); onEdit(card); }}
            onKeyDown={(event) => { if (event.key === "Enter") { event.stopPropagation(); onEdit(card); } }}
            className="icon-button rounded-xl p-2"
            title="Editar cartão"
          >
            <Edit3 size={15} />
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => { event.stopPropagation(); onDelete(card.id); }}
            onKeyDown={(event) => { if (event.key === "Enter") { event.stopPropagation(); onDelete(card.id); } }}
            className="icon-button rounded-xl p-2 hover:text-rose-500"
            title="Excluir cartão"
          >
            <Trash2 size={15} />
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs font-bold">
        <div>
          <span className="muted-text block">{card.stored_value_card ? "Disponível" : "Em aberto"}</span>
          <strong className={card.stored_value_card ? "text-emerald-500" : "text-rose-500"}>{money.format(card.stored_value_card ? card.available : card.spent)}</strong>
        </div>
        <div>
          <span className="muted-text block">Livre</span>
          <strong>{money.format(card.available)}</strong>
        </div>
      </div>
    </button>
  );
}


function CreditCardCard({ card, onEdit, onDelete, selected, onSelect }) {
  return (
    <article className={classNames("surface-card rounded-[2rem] p-5 shadow-sm", selected && "selected-card")}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 h-3 w-12 rounded-full" style={{ background: card.color || "#059669" }} />
          <h3 className="text-lg font-black">{card.name}</h3>
          <span className="mt-1 inline-flex rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-black text-emerald-400">{formatCardType(card.card_type)}</span>
          <p className="muted-text mt-2 text-sm">{formatCardClosingDay(card.closing_day)} · {formatCardDueDay(card.due_day)}</p>
        </div>
        <div className="flex gap-1">
          <button onClick={onSelect} className="icon-button rounded-xl p-2" title="Ver fatura"><Eye size={17} /></button>
          <button onClick={() => onEdit(card)} className="icon-button rounded-xl p-2"><Edit3 size={17} /></button>
          <button onClick={() => onDelete(card.id)} className="icon-button rounded-xl p-2 hover:text-rose-500"><Trash2 size={17} /></button>
        </div>
      </div>
      <ProgressBar value={card.spent} max={card.total_available_base || card.card_limit || 1} danger={card.percent >= 90} />
      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div><span className="muted-text block">{card.stored_value_card ? "Consumido" : "Aberto"}</span><strong>{money.format(card.spent)}</strong></div>
        <div><span className="muted-text block">{card.stored_value_card ? "Base + recargas" : "Limite"}</span><strong>{money.format(card.total_available_base || card.card_limit)}</strong></div>
        <div><span className="muted-text block">Livre</span><strong>{money.format(card.available)}</strong></div>
      </div>
    </article>
  );
}

function CardInstallmentPurchaseBox({ card, form, setForm, onSubmit, onClose }) {
  const isCreditCard = card && isCreditLikeCardType(card.card_type);
  const amount = toNumber(form.amount);
  const installments = clampInstallments(form.installments);
  const installmentAmount = amount > 0 && installments > 0 ? amount / installments : 0;
  const lastDate = form.first_date && installments > 1 ? addMonthsToISO(form.first_date, installments - 1) : "";

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="surface-card rounded-[2rem] p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black">Nova compra parcelada</h2>
            <InfoPopover title="Compra parcelada" text="Cria automaticamente uma parcela por mês, vinculada ao cartão selecionado. As parcelas entram na fatura e aparecem no histórico de lançamentos." />
          </div>
          <p className="muted-text text-sm">Cadastre uma compra no crédito e acompanhe as parcelas dentro do cartão.</p>
        </div>
        <div className="flex items-center gap-2">
          {card && (
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-400">
              {card.name}
            </span>
          )}
          {onClose && (
            <button type="button" onClick={onClose} className="icon-button rounded-xl p-2" title="Fechar parcelamento">
              <X size={17} />
            </button>
          )}
        </div>
      </div>

      {!card && <EmptyState title="Selecione um cartão" text="Escolha um cartão de crédito para criar uma compra parcelada." />}

      {card && !isCreditCard && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-bold text-amber-400">
          Parcelamento está disponível apenas para cartões de crédito. Este cartão está marcado como {formatCardType(card.card_type)}.
        </div>
      )}

      {card && isCreditCard && (
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
            <Field label="Descrição da compra">
              <input value={form.description} onChange={(event) => update("description", event.target.value)} className="input" placeholder="Ex.: Notebook, celular, viagem" />
            </Field>
            <Field label="Categoria">
              <select value={form.category} onChange={(event) => update("category", event.target.value)} className="input">
                {defaultCategories.expense.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Valor total">
              <input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => update("amount", event.target.value)} className="input" placeholder="0,00" />
            </Field>
            <Field label="Quantidade de parcelas">
              <input type="number" min="2" max="60" value={form.installments} onChange={(event) => update("installments", event.target.value)} className="input" placeholder="2" />
            </Field>
            <Field label="Data da 1ª parcela">
              <input type="date" value={form.first_date} onChange={(event) => update("first_date", event.target.value)} className="input" />
            </Field>
          </div>

          <Field label="Observação">
            <input value={form.notes} onChange={(event) => update("notes", event.target.value)} className="input" placeholder="Opcional" />
          </Field>

          <div className="grid gap-3 rounded-[1.5rem] border border-blue-500/20 bg-blue-500/5 p-4 text-sm md:grid-cols-4">
            <MiniInfo label="Valor total" value={amount > 0 ? money.format(amount) : "R$ 0,00"} />
            <MiniInfo label="Parcela média" value={installmentAmount > 0 ? `${installments}x de ${money.format(installmentAmount)}` : "Informe o valor"} />
            <MiniInfo label="Última parcela" value={lastDate ? formatDateBR(lastDate) : "-"} />
            <MiniInfo label="Cartão" value={card.name} />
          </div>

          <button className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white transition hover:bg-emerald-700">
            <Plus size={18} /> Criar compra parcelada
          </button>
        </form>
      )}
    </section>
  );
}

function CreditCardInvoicePanel({
  card,
  transactions,
  allTransactions = transactions,
  adjustments,
  selectedMonth,
  adjustmentAmount,
  setAdjustmentAmount,
  adjustmentNotes,
  setAdjustmentNotes,
  onAdjustment,
  onDeleteAdjustment,
  onEditTransaction,
  onDeleteTransaction,
  onDuplicateTransaction,
  onViewTransaction,
  creditCards = [],
}) {
  if (!card) return null;

  const totalTransactions = transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const installmentGroups = buildInstallmentGroups(allTransactions, selectedMonth);
  const paymentLabel = card.stored_value_card ? "Adicionar saldo/recarga" : "Registrar pagamento";
  const quickActionLabel = card.stored_value_card ? "Adicionar saldo atual" : "Pagar valor em aberto";
  const quickActionType = card.stored_value_card ? "credit" : "payment";

  return (
    <section className="surface-card rounded-[2rem] p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black">Controle do cartão {card.name}</h2>
          <p className="muted-text text-sm">Movimentações acumuladas até {monthLabel(selectedMonth)}.</p>
        </div>
        <div className="grid gap-1 text-right text-sm">
          <strong className={card.stored_value_card ? "text-emerald-500" : "text-rose-500"}>
            {card.stored_value_card ? `${money.format(card.available)} disponível` : `${money.format(card.spent)} em aberto`}
          </strong>
          <span className="muted-text">{transactions.length} lançamento(s) vinculados</span>
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-5">
        <MiniInfo label="Tipo" value={formatCardType(card.card_type)} />
        <MiniInfo label={card.stored_value_card ? "Base + recargas" : "Limite"} value={money.format(card.total_available_base || card.card_limit)} />
        <MiniInfo label={card.stored_value_card ? "Consumido" : "Em aberto"} value={money.format(card.spent)} />
        <MiniInfo label="Disponível" value={money.format(card.available)} />
        <MiniInfo label="Vencimento" value={card.due_day ? `Dia ${card.due_day}` : "Sem vencimento"} />
      </div>

      <div className="mb-5 rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-black">{paymentLabel}</h3>
            <p className="muted-text text-sm">
              {card.stored_value_card
                ? "Use quando receber novo valor no vale/refeição/alimentação ou adicionar saldo ao cartão."
                : "Use quando pagar a fatura. O valor em aberto será reduzido e continuará correto nos próximos meses."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onAdjustment(quickActionType, card.stored_value_card ? adjustmentAmount : card.spent)}
            className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-60"
            disabled={!card.stored_value_card && card.spent <= 0}
          >
            {quickActionLabel}
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
          <input
            type="number"
            min="0"
            step="0.01"
            value={adjustmentAmount}
            onChange={(event) => setAdjustmentAmount(event.target.value)}
            className="input"
            placeholder="Valor"
          />
          <input
            value={adjustmentNotes}
            onChange={(event) => setAdjustmentNotes(event.target.value)}
            className="input"
            placeholder="Observação opcional"
          />
          <button
            type="button"
            onClick={() => onAdjustment(quickActionType)}
            className="outline-button rounded-2xl px-4 py-2 text-sm font-black"
          >
            Registrar
          </button>
        </div>
      </div>

      {adjustments.length > 0 && (
        <div className="mb-5">
          <h3 className="mb-3 font-black">Pagamentos e recargas</h3>
          <div className="space-y-2">
            {adjustments.map((item) => (
              <div key={item.id} className="transaction-row flex items-center justify-between gap-3 rounded-2xl p-3">
                <div>
                  <strong>{getAdjustmentLabel(item.adjustment_type)}</strong>
                  <p className="muted-text text-sm">{formatDateBR(item.date)}{item.notes ? ` · ${item.notes}` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <strong className="text-emerald-500">{money.format(item.amount)}</strong>
                  <button onClick={() => onDeleteAdjustment(item.id)} className="icon-button rounded-xl p-2 hover:text-rose-500" title="Excluir ajuste"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {installmentGroups.length > 0 && (
        <div className="mb-5">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-black">Compras parceladas</h3>
              <p className="muted-text text-xs font-semibold">Resumo agrupado por compra, com progresso até {monthLabel(selectedMonth)}.</p>
            </div>
            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-400">
              {installmentGroups.length} compra(s)
            </span>
          </div>

          <div className="grid gap-3">
            {installmentGroups.map((group) => (
              <article key={group.id} className="transaction-row rounded-2xl p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h4 className="font-black">{group.description}</h4>
                    <p className="muted-text mt-1 text-sm">
                      {group.category} · {formatDateBR(group.firstDate)} até {formatDateBR(group.lastDate)}
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <strong className="block text-blue-400">{group.currentInstallment}/{group.totalInstallments}</strong>
                    <span className="muted-text text-xs font-semibold">{group.status}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <ProgressBar value={group.currentInstallment} max={group.totalInstallments || 1} danger={false} />
                </div>

                <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                  <div><span className="muted-text block">Valor total</span><strong>{money.format(group.totalAmount)}</strong></div>
                  <div><span className="muted-text block">Parcela média</span><strong>{money.format(group.installmentAmount)}</strong></div>
                  <div><span className="muted-text block">Restante futuro</span><strong>{money.format(group.remainingAmount)}</strong></div>
                  <div><span className="muted-text block">Próxima parcela</span><strong>{group.nextDate ? formatDateBR(group.nextDate) : "Finalizada"}</strong></div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="max-h-[360px] overflow-y-auto pr-2">
  <div className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-black">Movimentações do cartão</h3>
            <p className="muted-text text-xs font-semibold">Gastos vinculados a este cartão ficam separados dos lançamentos avulsos.</p>
          </div>
          <span className="muted-text text-sm font-semibold">Total lançado: {money.format(totalTransactions)}</span>
        </div>
        {transactions.length ? transactions.map((item) => (
          <TransactionRow
            key={item.id}
            item={item}
            onEdit={onEditTransaction}
            onDelete={onDeleteTransaction}
            onDuplicate={onDuplicateTransaction}
            onView={onViewTransaction}
            creditCards={creditCards}
          />
        )) : <EmptyState title="Nenhuma movimentação neste cartão" text="Vincule lançamentos a este cartão para acompanhar saldo, limite ou fatura acumulada." />}
      </div>
      </div>
    </section>
  );
}

function MiniInfo({ label, value }) {
  return (
    <div className="transaction-row rounded-2xl p-4">
      <p className="muted-text text-xs font-black uppercase tracking-wide">{label}</p>
      <strong className="mt-1 block">{value}</strong>
    </div>
  );
}


function AnnualDashboardPage({ selectedYear, setSelectedYear, years, data, summary, onMonthClick }) {
  return (
    <main className="grid gap-6">
      <section className="surface-card rounded-[2rem] p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black">Dashboard anual</h2>
              <InfoPopover title="Dashboard anual" text="Consolida receitas, despesas e saldo de janeiro a dezembro. Clique em um mês no gráfico para abrir o painel mensal daquele período." />
            </div>
            <p className="muted-text text-sm">Visão consolidada de janeiro a dezembro.</p>
          </div>
          <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} className="input max-w-40">
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <MetricCard title="Receitas no ano" value={money.format(summary.income)} icon={<ArrowUpCircle />} tone="emerald" info="Soma de todas as receitas cadastradas no ano selecionado." />
          <MetricCard title="Despesas no ano" value={money.format(summary.expense)} icon={<ArrowDownCircle />} tone="rose" info="Soma de todas as despesas cadastradas no ano selecionado." />
          <MetricCard title="Saldo anual" value={money.format(summary.balance)} icon={<Wallet />} tone={summary.balance >= 0 ? "blue" : "rose"} info="Diferença entre receitas e despesas no ano selecionado." />
          <MetricCard title="Média mensal" value={money.format(summary.averageSaving)} icon={<PiggyBank />} tone="amber" info="Média aproximada do saldo distribuído pelos 12 meses do ano." />
        </section>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={data} onClick={(event) => event?.activePayload?.[0]?.payload?.month && onMonthClick?.(event.activePayload[0].payload.month)}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fill: "var(--muted)" }} />
            <YAxis tickFormatter={(value) => `R$${value}`} tick={{ fill: "var(--muted)" }} />
            <Tooltip cursor={false} contentStyle={tooltipStyle()} formatter={(value) => money.format(value)} />
            <Bar dataKey="income" name="Receita" fill="#059669" radius={[8, 8, 0, 0]} className="cursor-pointer" />
            <Bar dataKey="expense" name="Despesa" fill="#e11d48" radius={[8, 8, 0, 0]} className="cursor-pointer" />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-5 grid gap-2 sm:grid-cols-3 md:grid-cols-6 xl:grid-cols-12">
          {data.map((item) => (
            <button key={item.month} type="button" onClick={() => onMonthClick?.(item.month)} className="outline-button rounded-2xl px-3 py-2 text-xs font-black uppercase transition hover:scale-[1.02]">
              {item.label}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function FinancialCalendarPage({ selectedMonth, events }) {
  const grouped = events.reduce((acc, item) => {
    const day = String(item.day).padStart(2, "0");
    acc[day] = acc[day] || [];
    acc[day].push(item);
    return acc;
  }, {});
  const days = Array.from({ length: daysInMonth(...selectedMonth.split("-")) }, (_, index) => String(index + 1).padStart(2, "0"));
  return (
    <main className="surface-card rounded-[2rem] p-5 shadow-sm">
      <h2 className="text-2xl font-black">Calendário financeiro</h2>
      <p className="muted-text mb-5 text-sm">Lançamentos e itens fixos de {monthLabel(selectedMonth)}.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {days.map((day) => (
          <div key={day} className="transaction-row min-h-32 rounded-2xl p-3">
            <strong className="block text-sm">Dia {day}</strong>
            <div className="mt-3 space-y-2">
              {(grouped[day] || []).slice(0, 3).map((event) => (
                <div key={`${event.id}-${event.source}`} className={classNames("rounded-xl px-2 py-1 text-xs font-bold", event.type === "income" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
                  {event.source === "recurring" ? "Fixo · " : ""}{event.description}
                </div>
              ))}
              {!grouped[day] && <span className="muted-text text-xs">Sem eventos</span>}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function AccountPage({
  user,
  profileName,
  setProfileName,
  onProfileSubmit,
  preferencesForm,
  setPreferencesForm,
  onPreferencesSubmit,
  exportBackup,
  importBackup,
  deleteAllUserData,
  onSignOut,
  setPage,
  stats = {},
}) {
  const createdAt = user?.created_at ? formatDateBR(user.created_at.slice(0, 10)) : "Não informado";
  const email = user?.email || "E-mail não informado";

  return (
    <main className="grid gap-6">
      <section className="surface-card rounded-[2rem] p-5 shadow-sm sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-400">
              <UserRound size={26} />
            </div>
            <div className="min-w-0">
              <p className="muted-text text-xs font-black uppercase tracking-[0.16em]">Conta</p>
              <h2 className="mt-1 truncate text-2xl font-black sm:text-3xl">{profileName || user?.user_metadata?.name || "Minha conta"}</h2>
              <p className="muted-text mt-1 truncate text-sm font-semibold">{email}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button type="button" onClick={() => setPage?.("reports")} className="outline-button rounded-2xl px-4 py-2 text-sm font-black">
              Relatórios
            </button>
            <button type="button" onClick={exportBackup} className="outline-button rounded-2xl px-4 py-2 text-sm font-black">
              Backup
            </button>
            <button type="button" onClick={onSignOut} className="signout-button rounded-2xl px-4 py-2 text-sm font-black">
              Sair
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMiniCard title="Lançamentos" value={String(stats.transactions || 0)} tone="blue" helper="registros salvos" />
        <SummaryMiniCard title="Cartões" value={String(stats.cards || 0)} tone="emerald" helper="cartões cadastrados" />
        <SummaryMiniCard title="Metas" value={String(stats.goals || 0)} tone="amber" helper="objetivos criados" />
        <SummaryMiniCard title="Fixos" value={String(stats.recurring || 0)} tone="purple" helper="recorrências ativas" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-6">
          <section className="surface-card rounded-[2rem] p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-black">Perfil</h3>
                <p className="muted-text mt-1 text-sm">Atualize o nome exibido no painel.</p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-400">Conta ativa</span>
            </div>

            <form onSubmit={onProfileSubmit} className="grid gap-4">
              <Field label="Nome">
                <input value={profileName} onChange={(event) => setProfileName(event.target.value)} className="input" placeholder="Seu nome" />
              </Field>
              <Field label="E-mail">
                <input value={email} className="input opacity-70" disabled />
              </Field>
              <Field label="Criada em">
                <input value={createdAt} className="input opacity-70" disabled />
              </Field>
              <button type="submit" className="rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white transition hover:bg-emerald-700">
                Salvar perfil
              </button>
            </form>
          </section>

          <section className="surface-card rounded-[2rem] p-5 shadow-sm">
            <h3 className="text-xl font-black">Atalhos</h3>
            <p className="muted-text mt-1 text-sm">Acesse rapidamente áreas importantes.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <button type="button" onClick={() => setPage?.("payments")} className="transaction-row interactive-row flex items-center justify-between rounded-2xl p-3 text-left text-sm font-black">
                <span>Pagamentos</span>
                <CheckCircle2 size={17} className="text-emerald-400" />
              </button>
              <button type="button" onClick={() => setPage?.("reports")} className="transaction-row interactive-row flex items-center justify-between rounded-2xl p-3 text-left text-sm font-black">
                <span>Relatórios</span>
                <FileText size={17} className="text-emerald-400" />
              </button>
              <button type="button" onClick={() => setPage?.("cards")} className="transaction-row interactive-row flex items-center justify-between rounded-2xl p-3 text-left text-sm font-black">
                <span>Cartões</span>
                <CreditCard size={17} className="text-emerald-400" />
              </button>
            </div>
          </section>
        </div>

        <div className="grid gap-6">
          <section className="surface-card rounded-[2rem] p-5 shadow-sm">
            <h3 className="text-xl font-black">Preferências financeiras</h3>
            <p className="muted-text mt-1 text-sm">Configure sua renda base, objetivo e aparência padrão.</p>
            <form onSubmit={onPreferencesSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Renda mensal base">
                <input value={preferencesForm.monthly_income} onChange={(event) => setPreferencesForm((current) => ({ ...current, monthly_income: event.target.value }))} className="input" placeholder="0,00" />
              </Field>
              <Field label="Moeda">
                <select value={preferencesForm.currency} onChange={(event) => setPreferencesForm((current) => ({ ...current, currency: event.target.value }))} className="input">
                  <option value="BRL">BRL - Real brasileiro</option>
                </select>
              </Field>
              <Field label="Tema padrão">
                <select value={preferencesForm.default_theme} onChange={(event) => setPreferencesForm((current) => ({ ...current, default_theme: event.target.value }))} className="input">
                  <option value="system">Automático</option>
                  <option value="dark">Escuro</option>
                  <option value="light">Claro</option>
                </select>
              </Field>
              <Field label="Objetivo principal">
                <input value={preferencesForm.main_goal} onChange={(event) => setPreferencesForm((current) => ({ ...current, main_goal: event.target.value }))} className="input" placeholder="Ex.: montar reserva" />
              </Field>
              <label className="field-shell md:col-span-2 flex items-center gap-3 rounded-2xl p-4 text-sm font-bold">
                <input type="checkbox" checked={preferencesForm.onboarding_completed} onChange={(event) => setPreferencesForm((current) => ({ ...current, onboarding_completed: event.target.checked }))} />
                Marcar introdução como concluída
              </label>
              <div className="md:col-span-2">
                <button type="submit" className="rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white transition hover:bg-emerald-700">
                  Salvar preferências
                </button>
              </div>
            </form>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="surface-card rounded-[2rem] p-5 shadow-sm">
              <h3 className="text-lg font-black">Dados e backup</h3>
              <p className="muted-text mt-1 text-sm leading-6">Exporte um backup completo ou restaure dados salvos anteriormente.</p>
              <div className="mt-4 grid gap-3">
                <button type="button" onClick={exportBackup} className="outline-button rounded-2xl px-4 py-3 text-sm font-black">Exportar backup</button>
                <label className="outline-button cursor-pointer rounded-2xl px-4 py-3 text-center text-sm font-black">
                  Importar backup
                  <input type="file" accept="application/json" onChange={importBackup} className="hidden" />
                </label>
                <button type="button" onClick={deleteAllUserData} className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white transition hover:bg-rose-700">Apagar dados</button>
              </div>
            </div>

            <div className="surface-card rounded-[2rem] p-5 shadow-sm">
              <h3 className="text-lg font-black">Sobre o app</h3>
              <p className="muted-text mt-1 text-sm leading-6">Controle financeiro pessoal desenvolvido com React, Vite, Supabase e Vercel.</p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="transaction-row rounded-2xl p-3">
                  <strong>Projeto</strong>
                  <p className="muted-text mt-1">Controle Financeiro | Enzo Amorim</p>
                </div>
                <div className="transaction-row rounded-2xl p-3">
                  <strong>Versão</strong>
                  <p className="muted-text mt-1">PWA/mobile otimizado</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}


function SettingsPage({ preferencesForm, setPreferencesForm, onSubmit, exportBackup, importBackup, deleteAllUserData }) {
  function update(field, value) {
    setPreferencesForm((current) => ({ ...current, [field]: value }));
  }
  return (
    <main className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <section className="surface-card rounded-[2rem] p-5 shadow-sm">
        <h2 className="text-2xl font-black">Configurações</h2>
        <p className="muted-text mb-5 text-sm">Preferências do seu controle financeiro.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Renda mensal aproximada"><input type="number" min="0" step="0.01" value={preferencesForm.monthly_income} onChange={(event) => update("monthly_income", event.target.value)} className="input" /></Field>
          <Field label="Principal objetivo"><input value={preferencesForm.main_goal} onChange={(event) => update("main_goal", event.target.value)} className="input" placeholder="Ex.: quitar dívidas" /></Field>
          <Field label="Moeda"><select value={preferencesForm.currency} onChange={(event) => update("currency", event.target.value)} className="input"><option value="BRL">Real brasileiro</option></select></Field>
          <Field label="Tema padrão"><select value={preferencesForm.default_theme} onChange={(event) => update("default_theme", event.target.value)} className="input"><option value="system">Sistema</option><option value="dark">Escuro</option><option value="light">Claro</option></select></Field>
          <button className="rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white"><Save size={17} className="inline" /> Salvar preferências</button>
        </form>
      </section>
      <section className="surface-card rounded-[2rem] p-5 shadow-sm">
        <h2 className="text-2xl font-black">Backup e dados</h2>
        <p className="muted-text mb-5 text-sm">Exporte, importe ou limpe seus dados.</p>
        <div className="grid gap-3">
          <button onClick={exportBackup} className="outline-button inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-black"><Database size={17} /> Exportar backup JSON</button>
          <label className="outline-button inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 py-3 font-black">
            <Upload size={17} /> Importar backup JSON
            <input type="file" accept="application/json" onChange={importBackup} className="hidden" />
          </label>
          <button onClick={deleteAllUserData} className="rounded-2xl bg-rose-600 px-4 py-3 font-black text-white">Apagar todos os meus dados</button>
        </div>
      </section>
    </main>
  );
}

function ReportsPage({ summary, selectedMonth, visibleTransactions, topExpenses, goals, exportCSV, exportExcel, exportPDF, exportBackup, onOpenTransactions, setPage }) {
  return (
    <main className="grid gap-6">
      <section className="surface-card rounded-[2rem] p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black">Relatórios</h2>
              <InfoPopover title="Relatórios" text="Área para exportar dados e acessar atalhos de análise do mês selecionado." />
            </div>
            <p className="muted-text mt-2">Gere arquivos para guardar, enviar ou analisar fora do sistema.</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={exportExcel} className="rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white"><Download className="mr-2 inline" size={18} /> Exportar Excel</button>
          <button onClick={exportPDF} className="outline-button rounded-2xl px-5 py-3 font-black"><FileText className="mr-2 inline" size={18} /> Gerar PDF</button>
          <button onClick={exportCSV} className="outline-button rounded-2xl px-5 py-3 font-black">CSV</button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard title={`Receitas em ${monthLabel(selectedMonth)}`} value={money.format(summary.income)} icon={<ArrowUpCircle />} tone="emerald" onClick={() => onOpenTransactions?.({ types: ["income"] })} info="Clique para abrir os lançamentos filtrando apenas receitas deste mês." />
        <MetricCard title="Despesas" value={money.format(summary.expense)} icon={<ArrowDownCircle />} tone="rose" onClick={() => onOpenTransactions?.({ types: ["expense"] })} info="Clique para abrir os lançamentos filtrando apenas despesas deste mês." />
        <MetricCard title="Saldo" value={money.format(summary.balance)} icon={<Wallet />} tone={summary.balance >= 0 ? "blue" : "rose"} info="Receitas menos despesas do mês selecionado." />
        <MetricCard title="Lançamentos" value={String(visibleTransactions.length)} icon={<FileText />} tone="amber" onClick={() => onOpenTransactions?.()} info="Quantidade de lançamentos encontrados com os filtros atuais." />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <section className="surface-card rounded-[2rem] p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-xl font-black">Top gastos do mês</h2>
            <InfoPopover title="Top gastos" text="Clique em um gasto para localizar lançamentos semelhantes na aba Lançamentos." />
          </div>
          <div className="space-y-3">
            {topExpenses.length ? topExpenses.map((item) => (
              <button key={item.id} type="button" onClick={() => onOpenTransactions?.({ categories: [item.category], types: ["expense"], search: item.description })} className="transaction-row interactive-row flex w-full items-center justify-between rounded-2xl p-3 text-left text-sm font-semibold">
                <span>{item.description}</span>
                <strong className="text-rose-500">{money.format(item.amount)}</strong>
              </button>
            )) : <EmptyState text="Sem despesas no mês." />}
          </div>
        </section>

        <section className="surface-card rounded-[2rem] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black">Metas cadastradas</h2>
              <InfoPopover title="Metas cadastradas" text="Resumo das metas financeiras criadas. Clique para abrir a aba Metas." />
            </div>
            <button type="button" onClick={() => setPage?.("goals")} className="ghost-button rounded-xl px-3 py-2 text-sm font-bold">Abrir metas</button>
          </div>
          <div className="space-y-3">
            {goals.length ? goals.map((goal) => (
              <button key={goal.id} type="button" onClick={() => setPage?.("goals")} className="transaction-row interactive-row w-full rounded-2xl p-3 text-left text-sm font-semibold">
                {goal.title} — {money.format(goal.current_amount)} de {money.format(goal.target_amount)}
              </button>
            )) : <EmptyState text="Sem metas cadastradas." />}
          </div>
        </section>
      </section>
    </main>
  );
}

function ProfilePage({ user, profileName, setProfileName, onSubmit }) {
  return (
    <main className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <section className="surface-card rounded-[2rem] p-5 shadow-sm">
        <h2 className="text-xl font-black">Meu perfil</h2>
        <p className="muted-text mb-5 text-sm">Atualize suas informações básicas.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Nome"><input value={profileName} onChange={(event) => setProfileName(event.target.value)} className="input" /></Field>
          <button className="rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white"><Save className="mr-2 inline" size={18} /> Salvar perfil</button>
        </form>
      </section>
      <section className="surface-card rounded-[2rem] p-5 shadow-sm">
        <h2 className="text-xl font-black">Dados da conta</h2>
        <div className="mt-5 grid gap-3">
          <ProfileInfo label="E-mail" value={user.email} />
          <ProfileInfo label="ID do usuário" value={user.id} />
          <ProfileInfo label="Criado em" value={user.created_at ? new Date(user.created_at).toLocaleString("pt-BR") : "Não informado"} />
        </div>
      </section>
    </main>
  );
}

function ProfileInfo({ label, value }) {
  return (
    <div className="transaction-row rounded-2xl p-4">
      <p className="muted-text text-sm font-bold">{label}</p>
      <p className="mt-1 break-all font-semibold">{value}</p>
    </div>
  );
}

function InfoList({ title, items, empty }) {
  return (
    <section className="surface-card rounded-[2rem] p-5 shadow-sm">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length ? items.map((item) => <div key={item} className="transaction-row rounded-2xl p-3 text-sm font-semibold">{item}</div>) : <EmptyState text={empty} />}
      </div>
    </section>
  );
}

function MonthSelector({ value, onChange, years }) {
  const [year, month] = value.split("-");

  function updateMonth(nextMonth) {
    onChange(`${year}-${nextMonth}`);
  }

  function updateYear(nextYear) {
    onChange(`${nextYear}-${month}`);
  }

  function moveMonth(offset) {
    const date = new Date(Number(year), Number(month) - 1 + offset, 1);
    onChange(date.toISOString().slice(0, 7));
  }

  return (
    <div className="month-selector month-selector-compact field-shell" aria-label="Selecionar mês do painel">
      <button type="button" onClick={() => moveMonth(-1)} className="month-nav-button" aria-label="Mês anterior">‹</button>
      <div className="month-selector-center">
        <CalendarDays size={15} />
        <select value={month} onChange={(event) => updateMonth(event.target.value)} className="month-select bg-transparent font-bold outline-none" aria-label="Selecionar mês">
          {monthOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <span className="muted-text font-black">/</span>
        <select value={year} onChange={(event) => updateYear(event.target.value)} className="year-select bg-transparent font-bold outline-none" aria-label="Selecionar ano">
          {years.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <button type="button" onClick={() => moveMonth(1)} className="month-nav-button" aria-label="Próximo mês">›</button>
    </div>
  );
}

function DateInput({ value, onChange }) {
  const [displayValue, setDisplayValue] = useState(formatDateBR(value));

  useEffect(() => {
    setDisplayValue(formatDateBR(value));
  }, [value]);

  function handleChange(event) {
    const masked = maskDateBR(event.target.value);
    setDisplayValue(masked);
    const iso = brDateToISO(masked);
    if (iso) onChange(iso);
  }

  function handleBlur() {
    if (!displayValue) {
      onChange("");
      return;
    }

    const iso = brDateToISO(displayValue);
    if (iso) {
      onChange(iso);
      setDisplayValue(formatDateBR(iso));
    } else {
      setDisplayValue(formatDateBR(value));
    }
  }

  return <input type="text" inputMode="numeric" value={displayValue} onChange={handleChange} onBlur={handleBlur} placeholder="dd/mm/aaaa" maxLength={10} className="input" />;
}

function PasswordInput({ label, value, onChange, show, onToggle, placeholder, autoComplete }) {
  return (
    <Field label={label}>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="input pr-12"
          placeholder={placeholder}
          minLength={6}
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-xl p-2 text-slate-400 transition hover:bg-slate-500/10 hover:text-emerald-400"
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          title={show ? "Ocultar senha" : "Mostrar senha"}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </Field>
  );
}

function PasswordRule({ active, text }) {
  return (
    <div className={classNames("flex items-center gap-2", active ? "text-emerald-400" : "muted-text")}>
      <CheckCircle2 size={14} />
      <span>{text}</span>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-black">{label}</span>
      {children}
    </label>
  );
}

function InfoPopover({ title, text }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="info-popover relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="info-popover-button inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-black"
        aria-label={`Explicar ${title}`}
        title="Explicar"
      >
        ?
      </button>
      {open && (
        <div className="info-popover-card absolute right-0 top-8 z-[80] w-72 rounded-2xl p-4 text-left shadow-2xl">
          <strong className="block text-sm font-black">{title}</strong>
          <p className="muted-text mt-2 text-xs font-semibold leading-5">{text}</p>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon, tone, onClick, info }) {
  const tones = {
    emerald: "metric-emerald",
    rose: "metric-rose",
    blue: "metric-blue",
    amber: "metric-amber",
  };

  function handleKeyDown(event) {
    if (!onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  }

  return (
    <article
      className={classNames("surface-card rounded-[2rem] p-5 shadow-sm", onClick && "interactive-card")}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <p className="muted-text truncate text-sm font-black">{title}</p>
          {info && <InfoPopover title={title} text={info} />}
        </div>
        <div className={classNames("rounded-2xl p-2", tones[tone])}>{React.cloneElement(icon, { size: 22 })}</div>
      </div>
      <strong className="block text-2xl font-black tracking-tight">{value}</strong>
    </article>
  );
}

function ChartCard({ title, subtitle, children, info }) {
  return (
    <section className="surface-card rounded-[2rem] p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black">{title}</h2>
            {info && <InfoPopover title={title} text={info} />}
          </div>
          <p className="muted-text text-sm">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function TransactionRow({ item, onEdit, onDelete, onDuplicate, onView, creditCards = [], selectable = false, selected = false, onToggleSelect }) {
  const isIncome = item.type === "income";
  const cardName = creditCards.find((card) => card.id === item.card_id)?.name;
  function handleKeyDown(event) {
    if ((event.key === "Enter" || event.key === " ") && onView) {
      event.preventDefault();
      onView(item);
    }
  }

  return (
    <article
      className="transaction-row transaction-row-clickable flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between"
      onClick={() => onView?.(item)}
      onKeyDown={handleKeyDown}
      role={onView ? "button" : undefined}
      tabIndex={onView ? 0 : undefined}
      title={onView ? "Clique para ver detalhes do lançamento" : undefined}
    >
      <div className="flex min-w-0 items-start gap-3">
        {selectable && (
          <label className="transaction-check mt-2 inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-lg" onClick={(event) => event.stopPropagation()} title={selected ? "Remover da soma selecionada" : "Adicionar à soma selecionada"}>
            <input type="checkbox" checked={selected} onChange={() => onToggleSelect?.(item.id)} className="h-4 w-4 accent-emerald-500" />
          </label>
        )}
        <div className={classNames("rounded-2xl p-2", isIncome ? "income-icon" : "expense-icon")}>
          {isIncome ? <ArrowUpCircle size={22} /> : <ArrowDownCircle size={22} />}
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-black">{item.description}</h3>
          <p className="muted-text text-sm">
            {item.category} · {item.method}{cardName ? ` · ${cardName}` : ""} · {formatDateBR(item.date)}
          </p>
          {(item.recurring_item_id || item.recurrence_month) && (
            <span className="mt-2 inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-black text-emerald-300">
              Fixo automático
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <strong className={classNames("text-lg", isIncome ? "text-emerald-500" : "text-rose-500")}>
          {isIncome ? "+" : "-"} {money.format(item.amount)}
        </strong>
        <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
          <button onClick={() => onDuplicate(item)} className="icon-button rounded-xl p-2 hover:text-emerald-500" title="Duplicar"><Repeat size={17} /></button>
          <button onClick={() => onEdit(item)} className="icon-button rounded-xl p-2 hover:text-blue-500" title="Editar"><Edit3 size={17} /></button>
          <button onClick={() => onDelete(item.id)} className="icon-button rounded-xl p-2 hover:text-rose-500" title="Excluir"><Trash2 size={17} /></button>
        </div>
      </div>
    </article>
  );
}

function ProgressBar({ value, max, danger = false }) {
  const percent = max > 0 ? Math.min(100, Math.round((Number(value) / Number(max)) * 100)) : 0;
  return (
    <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-500/20">
      <div className={classNames("h-full rounded-full transition-all", danger ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${percent}%` }} />
    </div>
  );
}

function EmptyState({ title = "Nada por aqui ainda", text, actionLabel, onAction }) {
  return (
    <div className="empty-state flex min-h-[150px] flex-col items-center justify-center rounded-2xl p-6 text-center">
      <div className="mb-3 rounded-2xl bg-emerald-500/10 p-3 text-emerald-400">
        <Wallet size={24} />
      </div>
      <strong className="text-base">{title}</strong>
      <p className="muted-text mt-2 max-w-md text-sm font-semibold leading-6">{text}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="mt-4 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function tooltipStyle() {
  return {
    backgroundColor: "var(--surface)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: "14px",
  };
}

function GlobalStyles() {
  return (
    <style>{`
      html, body, #root { min-height: 100%; margin: 0; transition: background-color 0.3s ease, color 0.3s ease; }
      .app-shell {
        --bg: #eef4f8;
        --surface: #ffffff;
        --surface-2: #f8fafc;
        --surface-3: #eef3f8;
        --text: #0b1220;
        --muted: #526174;
        --border: #d9e3ee;
        --hover: #edf7f4;
        --shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
        --soft-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
        background:
          radial-gradient(circle at top left, rgba(16, 185, 129, 0.08), transparent 34%),
          radial-gradient(circle at top right, rgba(37, 99, 235, 0.08), transparent 34%),
          var(--bg);
        color: var(--text);
      }
      .app-shell.theme-dark {
        --bg: #020617;
        --surface: #0f172a;
        --surface-2: #020617;
        --surface-3: #111827;
        --text: #f8fafc;
        --muted: #94a3b8;
        --border: #1e293b;
        --hover: #1e293b;
        --shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
        --soft-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
        background: var(--bg);
      }
      .surface-card { background: var(--surface); color: var(--text); border: 1px solid color-mix(in srgb, var(--border) 72%, transparent); box-shadow: var(--soft-shadow); transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease; }
      .home-header { background: rgba(255, 255, 255, 0.88); color: var(--text); border: 1px solid rgba(203, 213, 225, 0.78); box-shadow: var(--soft-shadow); }
      .theme-dark .home-header { background: rgba(15, 23, 42, 0.78); border-color: rgba(255, 255, 255, 0.08); box-shadow: var(--shadow); }
      .theme-light .home-header img { border: 1px solid rgba(148, 163, 184, 0.35); }
      .theme-light .home-header .muted-text { color: #64748b; }

      .dashboard-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }
      .dashboard-brand {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        min-width: 0;
      }
      .dashboard-logo {
        flex: 0 0 auto;
        box-shadow: 0 10px 24px rgba(2, 6, 23, 0.18);
      }
      .dashboard-title-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.55rem;
      }
      .dashboard-title {
        margin: 0;
        font-size: clamp(1.15rem, 2vw, 1.55rem);
        line-height: 1.1;
        font-weight: 950;
        letter-spacing: -0.035em;
      }
      .dashboard-user-pill {
        display: inline-flex;
        align-items: center;
        max-width: 220px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        border-radius: 999px;
        border: 1px solid rgba(16, 185, 129, 0.28);
        background: rgba(16, 185, 129, 0.1);
        color: #34d399;
        padding: 0.28rem 0.65rem;
        font-size: 0.78rem;
        font-weight: 900;
      }
      .dashboard-subtitle {
        margin-top: 0.25rem;
        font-size: 0.82rem;
      }
      .dashboard-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        flex-wrap: wrap;
        gap: 0.6rem;
      }
      .dashboard-action-button {
        min-height: 2.55rem;
      }
      .dashboard-header-premium {
        min-height: 4.15rem;
        padding: 0.8rem 1rem !important;
        border-radius: 1.45rem !important;
      }
      .dashboard-brand-premium {
        gap: 0.7rem;
      }
      .dashboard-logo-premium {
        height: 2.25rem !important;
        width: 2.25rem !important;
        border-radius: 0.85rem !important;
        box-shadow: 0 10px 20px rgba(2, 6, 23, 0.2);
      }
      .dashboard-title-premium {
        font-size: clamp(1rem, 1.7vw, 1.3rem);
        letter-spacing: -0.04em;
      }
      .dashboard-actions-premium {
        flex-wrap: nowrap;
        gap: 0.45rem;
      }
      .header-icon-button {
        min-height: 2.35rem !important;
        border-radius: 1rem !important;
        padding: 0.52rem 0.75rem !important;
      }
      .header-icon-button span {
        font-size: 0.78rem;
        font-weight: 950;
      }
      .month-selector-compact {
        min-height: 2.35rem;
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        border-radius: 1rem;
        padding: 0.18rem;
        white-space: nowrap;
      }
      .month-selector-center {
        display: inline-flex;
        align-items: center;
        gap: 0.28rem;
        padding-inline: 0.35rem;
      }
      .month-nav-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.85rem;
        height: 1.85rem;
        border: 0;
        border-radius: 0.8rem;
        background: transparent;
        color: var(--muted);
        font-size: 1.25rem;
        font-weight: 950;
        line-height: 1;
        cursor: pointer;
        transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
      }
      .month-nav-button:hover {
        background: rgba(16, 185, 129, 0.12);
        color: #10b981;
        transform: translateY(-1px);
      }
      .month-selector-compact .month-select {
        width: auto;
        max-width: 6.4rem;
        text-transform: capitalize;
      }
      .month-selector-compact .year-select {
        width: 4rem;
      }
      .month-selector-compact .month-select,
      .month-selector-compact .year-select {
        color: var(--text);
        font-size: 0.78rem;
        font-weight: 950;
      }
      .dashboard-account-menu {
        position: relative;
        flex: 0 0 auto;
      }
      .account-menu-button {
        min-height: 2.35rem !important;
        max-width: 14.5rem;
        border: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
        background: color-mix(in srgb, var(--surface-2) 90%, transparent);
        color: var(--text);
        cursor: pointer;
      }
      .account-menu-button:hover {
        border-color: rgba(16, 185, 129, 0.38);
        background: color-mix(in srgb, var(--surface-2) 75%, rgba(16, 185, 129, 0.12));
        transform: translateY(-1px);
      }
      .account-menu-name {
        display: block;
        max-width: 8.5rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 0.78rem;
      }
      .account-menu-caret {
        color: var(--muted);
        font-size: 0.68rem;
      }
      .account-menu-panel {
        position: absolute;
        right: 0;
        top: calc(100% + 0.65rem);
        z-index: 90;
        width: min(18rem, calc(100vw - 2rem));
        border-radius: 1.35rem;
        border: 1px solid color-mix(in srgb, var(--border) 84%, transparent);
        background: color-mix(in srgb, var(--surface) 97%, var(--surface-2) 3%);
        color: var(--text);
        box-shadow: 0 24px 70px rgba(2, 6, 23, 0.3);
        padding: 0.55rem;
      }
      .account-menu-header {
        border-bottom: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
        margin-bottom: 0.4rem;
        padding: 0.55rem 0.6rem 0.7rem;
      }
      .account-menu-header strong,
      .account-menu-header span {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .account-menu-header strong {
        font-size: 0.86rem;
        font-weight: 950;
      }
      .account-menu-header span {
        margin-top: 0.18rem;
        color: var(--muted);
        font-size: 0.72rem;
        font-weight: 750;
      }
      .account-menu-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 0.55rem;
        min-height: 2.45rem;
        border: 0;
        border-radius: 0.95rem;
        background: transparent;
        color: var(--text);
        padding: 0.55rem 0.65rem;
        text-align: left;
        font-size: 0.8rem;
        font-weight: 900;
        cursor: pointer;
        transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
      }
      .account-menu-item:hover {
        background: rgba(16, 185, 129, 0.12);
        color: #10b981;
        transform: translateX(2px);
      }
      .account-menu-item-danger {
        color: #fb7185;
      }
      .account-menu-item-danger:hover {
        background: rgba(244, 63, 94, 0.12);
        color: #fb7185;
      }
      .signout-button {
        border: 1px solid rgba(244, 63, 94, 0.35);
        background: rgba(244, 63, 94, 0.1);
        color: #fb7185;
      }
      .signout-button:hover {
        background: #e11d48;
        border-color: #e11d48;
        color: #ffffff;
      }

      .dashboard-tabs {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        overflow-x: auto;
        overflow-y: hidden;
        scroll-snap-type: x proximity;
        scrollbar-width: thin;
        scrollbar-color: rgba(148, 163, 184, 0.38) transparent;
        padding: 0.55rem;
        padding-bottom: 0.7rem;
      }

      .dashboard-tabs::-webkit-scrollbar {
        height: 7px;
      }

      .dashboard-tabs::-webkit-scrollbar-track {
        background: transparent;
        border-radius: 999px;
        margin: 0 1.25rem;
      }

      .dashboard-tabs::-webkit-scrollbar-thumb {
        background: rgba(148, 163, 184, 0.28);
        border-radius: 999px;
        border: 2px solid transparent;
        background-clip: padding-box;
      }

      .dashboard-tabs:hover::-webkit-scrollbar-thumb {
        background: rgba(16, 185, 129, 0.55);
        border: 2px solid transparent;
        background-clip: padding-box;
      }

      .theme-light .dashboard-tabs {
        scrollbar-color: rgba(100, 116, 139, 0.32) transparent;
      }

      .theme-light .dashboard-tabs::-webkit-scrollbar-thumb {
        background: rgba(100, 116, 139, 0.22);
        border: 2px solid transparent;
        background-clip: padding-box;
      }

      .theme-light .dashboard-tabs:hover::-webkit-scrollbar-thumb {
        background: rgba(5, 150, 105, 0.48);
        border: 2px solid transparent;
        background-clip: padding-box;
      }

      .dashboard-tab-button {
        min-height: 2.65rem;
        cursor: pointer;
        white-space: nowrap;
        flex: 0 0 auto;
        scroll-snap-align: start;
        padding-inline: 1rem;
      }

      .dashboard-tab-button:hover {
        transform: translateY(-1px);
      }

      .dashboard-tab-active {
        background: linear-gradient(135deg, #059669, #10b981);
        color: #ffffff;
        box-shadow: 0 12px 24px rgba(16, 185, 129, 0.22);
      }

      .dashboard-tab-active svg {
        color: currentColor;
      }

      .dashboard-tabs-compact {
        justify-content: center;
        overflow: visible;
        flex-wrap: wrap;
      }

      .dashboard-more-menu {
        position: relative;
        flex: 0 0 auto;
      }

      .dashboard-more-panel {
        position: absolute;
        right: 0;
        top: calc(100% + 0.7rem);
        z-index: 80;
        width: min(22rem, calc(100vw - 2rem));
        border-radius: 1.5rem;
        border: 1px solid color-mix(in srgb, var(--border) 84%, transparent);
        background: color-mix(in srgb, var(--surface) 96%, var(--surface-2) 4%);
        color: var(--text);
        box-shadow: 0 26px 70px rgba(2, 6, 23, 0.28);
        padding: 0.75rem;
      }

      .dashboard-more-header {
        border-bottom: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
        padding: 0.45rem 0.55rem 0.7rem;
        margin-bottom: 0.55rem;
      }

      .dashboard-more-header strong {
        display: block;
        font-size: 0.86rem;
        font-weight: 950;
      }

      .dashboard-more-header span {
        display: block;
        margin-top: 0.2rem;
        color: var(--muted);
        font-size: 0.72rem;
        font-weight: 750;
      }

      .dashboard-more-grid {
        display: grid;
        gap: 0.45rem;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .dashboard-more-item {
        min-height: 2.65rem;
        border-radius: 1.05rem;
        border: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
        background: color-mix(in srgb, var(--surface-2) 88%, transparent);
        color: var(--text);
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 0.5rem;
        padding: 0.65rem 0.75rem;
        font-size: 0.78rem;
        font-weight: 900;
        transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
        cursor: pointer;
      }

      .dashboard-more-item:hover {
        transform: translateY(-1px);
        border-color: rgba(16, 185, 129, 0.42);
        background: color-mix(in srgb, var(--surface-2) 72%, rgba(16, 185, 129, 0.12));
      }

      .dashboard-more-item-active {
        border-color: rgba(16, 185, 129, 0.58);
        background: rgba(16, 185, 129, 0.13);
        color: #10b981;
      }

      .dashboard-more-item svg {
        flex: 0 0 auto;
      }

      @media (max-width: 640px) {
        .dashboard-tabs {
          gap: 0.45rem;
          padding: 0.45rem;
          padding-bottom: 0.65rem;
        }

        .dashboard-tab-button {
          padding-inline: 0.85rem;
        }
      }
      .theme-light .dashboard-user-pill {
        background: #ecfdf5;
        border-color: #a7f3d0;
        color: #047857;
      }
      .theme-light .signout-button {
        background: #fff1f2;
        border-color: #fecdd3;
        color: #be123c;
      }
      .theme-light .signout-button:hover {
        background: #e11d48;
        border-color: #e11d48;
        color: #ffffff;
      }
      @media (max-width: 1024px) {
        .dashboard-header {
          align-items: flex-start;
          flex-direction: column;
        }
        .dashboard-actions {
          justify-content: flex-start;
          width: 100%;
        }
      }
      @media (max-width: 640px) {
        .dashboard-actions .month-selector,
        .dashboard-action-button {
          width: 100%;
          justify-content: center;
        }
        .dashboard-user-pill {
          max-width: 160px;
        }
      }

      .muted-text, .muted-icon { color: var(--muted); }
      .field-shell, .input { border: 1px solid var(--border); background: var(--surface-2); color: var(--text); transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.2s ease; }
      .input { width: 100%; border-radius: 1rem; padding: 0.75rem 0.9rem; font-size: 0.95rem; outline: none; }
      .input:focus, .field-shell:focus-within { border-color: rgb(16 185 129); box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15); }
      .input-error, .input-error:focus { border-color: rgb(244 63 94); box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.14); }
      input, select, button { color: inherit; }
      button, select, input[type="button"], input[type="submit"], .carousel-button, .carousel-dot { cursor: pointer; }
      button:disabled, input:disabled, select:disabled { cursor: not-allowed; }
      input::placeholder { color: var(--muted); }

      .input:-webkit-autofill,
      .input:-webkit-autofill:hover,
      .input:-webkit-autofill:focus,
      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus {
        -webkit-text-fill-color: var(--text) !important;
        caret-color: var(--text) !important;
        -webkit-box-shadow: 0 0 0 1000px var(--surface-2) inset !important;
        box-shadow: 0 0 0 1000px var(--surface-2) inset !important;
        border-color: rgb(16 185 129) !important;
        transition: background-color 9999s ease-in-out 0s;
      }
      .theme-light .input:-webkit-autofill,
      .theme-light .input:-webkit-autofill:hover,
      .theme-light .input:-webkit-autofill:focus,
      .theme-light input:-webkit-autofill,
      .theme-light input:-webkit-autofill:hover,
      .theme-light input:-webkit-autofill:focus {
        -webkit-text-fill-color: #0f172a !important;
        caret-color: #0f172a !important;
        -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
        box-shadow: 0 0 0 1000px #ffffff inset !important;
      }
      select option { background: var(--surface); color: var(--text); }



      .summary-panel { background: color-mix(in srgb, var(--surface-2) 88%, transparent); border: 1px solid color-mix(in srgb, var(--border) 82%, transparent); }
      .summary-mini-card { border: 1px solid var(--border); background: var(--surface); color: var(--text); }
      .summary-mini-emerald { border-color: rgba(16, 185, 129, 0.22); background: rgba(16, 185, 129, 0.08); }
      .summary-mini-rose { border-color: rgba(244, 63, 94, 0.22); background: rgba(244, 63, 94, 0.08); }
      .summary-mini-blue { border-color: rgba(37, 99, 235, 0.22); background: rgba(37, 99, 235, 0.08); }
      .summary-mini-amber { border-color: rgba(245, 158, 11, 0.22); background: rgba(245, 158, 11, 0.08); }
      .summary-selected { background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.18); }
      .transaction-check { background: rgba(148, 163, 184, 0.1); border: 1px solid var(--border); transition: background-color 0.2s ease, border-color 0.2s ease; }
      .transaction-check:hover { background: rgba(16, 185, 129, 0.12); border-color: rgba(16, 185, 129, 0.35); }
      .interactive-card, .interactive-row { cursor: pointer; transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease; }
      .interactive-card:hover, .interactive-row:hover { transform: translateY(-2px); border-color: rgba(16, 185, 129, 0.36); box-shadow: var(--shadow); }
      .interactive-card:focus-visible, .interactive-row:focus-visible { outline: 3px solid rgba(16, 185, 129, 0.35); outline-offset: 3px; }
      .info-popover-button { background: rgba(148, 163, 184, 0.12); color: var(--muted); border: 1px solid var(--border); transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease; }
      .info-popover-button:hover { background: rgba(16, 185, 129, 0.12); color: #34d399; border-color: rgba(16, 185, 129, 0.35); }
      .info-popover-card { background: var(--surface); border: 1px solid var(--border); color: var(--text); }
      .theme-light .info-popover-card { background: #ffffff; border-color: #dbe5ef; box-shadow: 0 18px 45px rgba(15, 23, 42, 0.14); }
      .multi-filter-menu { background: var(--surface); border: 1px solid var(--border); color: var(--text); }
      .multi-filter-option { color: var(--text); transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease; }
      .multi-filter-option:hover { background: var(--hover); }
      .multi-filter-option-active { background: rgba(16, 185, 129, 0.12); color: #34d399; }
      .theme-light .multi-filter-menu { background: #ffffff; border-color: #dbe5ef; box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12); }
      .theme-light .multi-filter-option-active { background: #ecfdf5; color: #047857; }
      .theme-button { background: var(--text); color: var(--bg); }
      .outline-button { border: 1px solid var(--border); color: var(--text); background: color-mix(in srgb, var(--surface) 86%, transparent); }
      .outline-button:hover, .ghost-button:hover, .icon-button:hover { background: var(--hover); }
      .ghost-button, .icon-button { color: var(--muted); transition: background-color 0.2s ease, color 0.2s ease; }
      .segmented-control { background: var(--surface-3); border: 1px solid var(--border); box-shadow: inset 0 1px 0 rgba(255,255,255,0.04); }
      .segmented-active { background: linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(37, 99, 235, 0.08)); border: 1px solid rgba(16, 185, 129, 0.28); box-shadow: 0 10px 22px rgba(2, 6, 23, 0.16); }
      .type-switch { position: relative; background: color-mix(in srgb, var(--surface-3) 88%, transparent); border: 1px solid color-mix(in srgb, var(--border) 82%, transparent); box-shadow: inset 0 1px 0 rgba(255,255,255,0.04); }
      .type-option { position: relative; overflow: hidden; border: 1px solid transparent; background: transparent; color: var(--muted); transform: translateY(0); }
      .type-option::before { content: ""; position: absolute; inset: 0; opacity: 0; transition: opacity 0.22s ease; pointer-events: none; }
      .type-option:hover { transform: translateY(-1px); color: var(--text); background: color-mix(in srgb, var(--surface) 76%, transparent); }
      .type-option-active-expense { color: #fb7185; border-color: rgba(244, 63, 94, 0.36); background: linear-gradient(135deg, rgba(244, 63, 94, 0.18), rgba(244, 63, 94, 0.06)); box-shadow: 0 12px 26px rgba(244, 63, 94, 0.12), inset 0 1px 0 rgba(255,255,255,0.08); }
      .type-option-active-income { color: #34d399; border-color: rgba(16, 185, 129, 0.38); background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.07)); box-shadow: 0 12px 26px rgba(16, 185, 129, 0.13), inset 0 1px 0 rgba(255,255,255,0.08); }
      .type-option-active-expense::before, .type-option-active-income::before { opacity: 1; background: radial-gradient(circle at top right, rgba(255,255,255,0.14), transparent 34%); }
      .edit-modal-backdrop { background: rgba(2, 6, 23, 0.76); backdrop-filter: blur(10px); animation: modalFadeIn 0.22s ease both; }
      .edit-modal-shell { background: var(--surface); color: var(--text); border: 1px solid rgba(148, 163, 184, 0.16); animation: modalScaleIn 0.24s ease both; }
      .edit-modal-form { min-height: 0; background: var(--surface); }
      .edit-modal-hero { background: linear-gradient(135deg, #0f172a, #111c36); border-bottom: 1px solid rgba(148, 163, 184, 0.14); color: #ffffff; }
      .edit-modal-hero-rose, .edit-modal-hero-expense { background: radial-gradient(circle at 15% 10%, rgba(244, 63, 94, 0.18), transparent 34%), linear-gradient(135deg, #0f172a, #111827); }
      .edit-modal-hero-emerald, .edit-modal-hero-income { background: radial-gradient(circle at 15% 10%, rgba(16, 185, 129, 0.18), transparent 34%), linear-gradient(135deg, #0f172a, #10231f); }
      .edit-modal-glow { position: absolute; border-radius: 999px; filter: blur(46px); opacity: 0.72; pointer-events: none; }
      .edit-modal-glow-one { width: 220px; height: 220px; top: -110px; left: -90px; background: rgba(16, 185, 129, 0.18); }
      .edit-modal-glow-two { width: 260px; height: 260px; right: -120px; bottom: -130px; background: rgba(37, 99, 235, 0.16); }
      .edit-chip-income { background: rgba(16, 185, 129, 0.14); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.24); }
      .edit-chip-expense { background: rgba(244, 63, 94, 0.14); color: #fda4af; border: 1px solid rgba(244, 63, 94, 0.24); }
      .edit-summary-grid { align-items: stretch; }
      .edit-summary-card { min-width: 0; background: rgba(15, 23, 42, 0.58); border: 1px solid rgba(148, 163, 184, 0.14); box-shadow: inset 0 1px 0 rgba(255,255,255,0.04); }
      .edit-modal-close { background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); color: #cbd5e1; transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease; }
      .edit-modal-close:hover { background: rgba(244, 63, 94, 0.16); color: #fda4af; transform: scale(1.04); }
      .edit-modal-content {
        background: var(--surface);
        scrollbar-width: thin;
        scrollbar-color: rgba(16, 185, 129, 0.72) rgba(148, 163, 184, 0.10);
        scrollbar-gutter: stable both-edges;
        min-height: 0;
        overscroll-behavior: contain;
      }
      .edit-modal-content::-webkit-scrollbar {
        width: 10px;
      }
      .edit-modal-content::-webkit-scrollbar-track {
        background: rgba(148, 163, 184, 0.10);
        border-radius: 999px;
        margin: 18px 0;
      }
      .edit-modal-content::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, #10b981, #059669);
        border-radius: 999px;
        border: 3px solid color-mix(in srgb, var(--surface) 88%, transparent);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
      }
      .edit-modal-content::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(180deg, #34d399, #10b981);
      }
      .edit-modal-content::-webkit-scrollbar-corner {
        background: transparent;
      }
      .input-lg { min-height: 3.05rem; }
      .edit-installment-card { background: var(--surface-2); border: 1px solid var(--border); }
      .edit-modal-footer { background: color-mix(in srgb, var(--surface) 96%, transparent); border-color: var(--border); backdrop-filter: blur(14px); box-shadow: 0 -18px 36px rgba(2, 6, 23, 0.14); }
      @supports (height: 100dvh) {
        .edit-modal-shell { max-height: calc(100dvh - 1.5rem); }
      }
      @media (max-width: 640px) {
        .edit-modal-backdrop {
          align-items: flex-end;
          padding: max(0.75rem, env(safe-area-inset-top)) 0.75rem max(0.75rem, env(safe-area-inset-bottom)) 0.75rem;
          overflow: hidden;
        }
        .edit-modal-shell {
          width: 100%;
          max-height: calc(100dvh - max(1.5rem, env(safe-area-inset-top)) - max(1.5rem, env(safe-area-inset-bottom)));
          border-radius: 1.7rem;
        }
        .edit-modal-hero { padding: 1.05rem 1.1rem; }
        .edit-modal-hero h2 { font-size: 1.7rem; line-height: 1.1; }
        .edit-modal-hero p { font-size: 0.82rem; line-height: 1.55; }
        .edit-modal-close { height: 2.65rem; width: 2.65rem; border-radius: 1rem; }
        .edit-summary-grid {
          margin-top: 1rem;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.5rem;
        }
        .edit-summary-card { padding: 0.7rem; border-radius: 1rem; }
        .edit-summary-card span { font-size: 0.56rem; line-height: 1; letter-spacing: 0.045em; }
        .edit-summary-card strong { min-width: 0; font-size: 0.88rem; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .edit-summary-card svg { width: 14px; height: 14px; flex: 0 0 auto; }
        .edit-modal-content { padding: 1rem; }
        .edit-modal-footer {
          padding: 0.85rem 1rem calc(0.85rem + env(safe-area-inset-bottom));
        }
        .edit-modal-footer button { width: 100%; min-height: 3.15rem; }
      }
      .transaction-row { background: var(--surface-2); border: 1px solid var(--border); color: var(--text); }
      .transaction-row-clickable { cursor: pointer; transition: transform 0.18s ease, border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease; }
      .transaction-row-clickable:hover, .transaction-row-clickable:focus-visible { border-color: rgba(16, 185, 129, 0.38); background: color-mix(in srgb, var(--surface-2) 88%, rgba(16, 185, 129, 0.08)); box-shadow: 0 14px 28px rgba(2, 6, 23, 0.12); transform: translateY(-1px); outline: none; }
      .transaction-note-preview { display: inline-flex; align-items: center; gap: 0.45rem; max-width: min(100%, 520px); background: rgba(148, 163, 184, 0.10); border: 1px solid rgba(148, 163, 184, 0.14); color: var(--muted); }
      .transaction-detail-info { background: var(--surface-2); border: 1px solid var(--border); }
      .empty-state { border: 1px dashed var(--border); color: var(--muted); }
      .metric-emerald { background: rgba(16, 185, 129, 0.12); color: #059669; }
      .metric-rose { background: rgba(244, 63, 94, 0.12); color: #e11d48; }
      .metric-blue { background: rgba(37, 99, 235, 0.12); color: #2563eb; }
      .metric-amber { background: rgba(245, 158, 11, 0.14); color: #d97706; }
      .income-icon { background: rgba(16, 185, 129, 0.12); color: #059669; }
      .expense-icon { background: rgba(244, 63, 94, 0.12); color: #e11d48; }
      .home-preview { background: linear-gradient(135deg, rgba(16, 185, 129, 0.14), rgba(37, 99, 235, 0.08)); border: 1px solid rgba(16, 185, 129, 0.18); }
      .home-hero { background: radial-gradient(circle at 18% 20%, rgba(16,185,129,0.14), transparent 32%), radial-gradient(circle at 82% 12%, rgba(37,99,235,0.12), transparent 34%), var(--surface); border: 1px solid color-mix(in srgb, var(--border) 72%, transparent); box-shadow: var(--shadow); }
      .home-glow { position: absolute; border-radius: 999px; filter: blur(44px); opacity: 0.75; pointer-events: none; }
      .home-glow-one { width: 260px; height: 260px; left: -90px; top: -90px; background: rgba(16, 185, 129, 0.18); }
      .home-glow-two { width: 320px; height: 320px; right: -120px; bottom: -130px; background: rgba(37, 99, 235, 0.18); }
      .home-mini-card, .home-stat-card { background: color-mix(in srgb, var(--surface-2) 88%, transparent); border: 1px solid color-mix(in srgb, var(--border) 78%, transparent); color: var(--text); box-shadow: var(--soft-shadow); }
      .home-preview-plus { background: linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(37, 99, 235, 0.09)); border: 1px solid rgba(16, 185, 129, 0.22); box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), var(--soft-shadow); }
      .preview-panel { background: rgba(15, 23, 42, 0.86); border: 1px solid rgba(148, 163, 184, 0.12); }
      .preview-panel .text-slate-300 { color: #cbd5e1; }
      .preview-row { border: 1px solid transparent; }
      .preview-row-emerald { background: rgba(16, 185, 129, 0.13); color: #6ee7b7; }
      .preview-row-rose { background: rgba(244, 63, 94, 0.13); color: #fda4af; }
      .preview-row-blue { background: rgba(37, 99, 235, 0.16); color: #93c5fd; }
      .preview-row span { color: #ffffff; }
      .preview-progress-card { border: 1px solid rgba(16, 185, 129, 0.2); background: rgba(16, 185, 129, 0.1); }
      .preview-progress-track { background: #1e293b; }
      .preview-chart-box { background: rgba(15, 23, 42, 0.68); }
      .preview-chart-track { background: rgba(30, 41, 59, 0.8); }
      .home-eyebrow { background: rgba(16, 185, 129, 0.12); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.2); }
      .theme-light .home-hero { background: #ffffff; border-color: #dbe5ef; }
      .theme-light .home-preview-plus { background: #ffffff; border-color: #dbe5ef; box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08); }
      .theme-light .preview-panel { background: #ffffff; border: 1px solid #dbe5ef; box-shadow: 0 18px 48px rgba(15, 23, 42, 0.1); }
      .theme-light .preview-panel .text-slate-300 { color: #334155; }
      .theme-light .preview-row { border-color: #e2e8f0; }
      .theme-light .preview-row span { color: #0f172a; }
      .theme-light .preview-row-emerald { background: #ecfdf5; color: #047857; }
      .theme-light .preview-row-rose { background: #fff1f2; color: #be123c; }
      .theme-light .preview-row-blue { background: #eff6ff; color: #1d4ed8; }
      .theme-light .preview-progress-card { background: #f0fdf4; border-color: #bbf7d0; }
      .theme-light .preview-progress-card .text-emerald-300 { color: #047857; }
      .theme-light .preview-progress-card .text-slate-300 { color: #475569; }
      .theme-light .preview-progress-track { background: #dbeafe; }
      .theme-light .preview-chart-box { background: #f8fafc; border: 1px solid #e2e8f0; }
      .theme-light .preview-chart-track { background: #e2e8f0; }
      .theme-light .home-eyebrow { background: #dcfce7; color: #047857; border-color: #86efac; }
      .theme-light .home-glow-one { background: rgba(16, 185, 129, 0.08); }
      .theme-light .home-glow-two { background: rgba(37, 99, 235, 0.07); }
      .carousel-button { background: color-mix(in srgb, var(--surface) 90%, transparent); border: 1px solid var(--border); color: var(--text); box-shadow: var(--soft-shadow); transition: transform 0.2s ease, background-color 0.2s ease; }
      .carousel-button:hover { transform: scale(1.04); background: var(--hover); }
      .carousel-dot { width: 0.75rem; height: 0.75rem; border-radius: 999px; background: var(--border); transition: width 0.25s ease, background-color 0.25s ease; }
      .carousel-dot-active { width: 2.25rem; background: #10b981; }
      .home-feature-card, .home-stat-card { transition: transform 0.2s ease, border-color 0.2s ease; }
      .home-feature-card:hover, .home-stat-card:hover { transform: translateY(-3px); border-color: rgba(16, 185, 129, 0.35); }
      .step-card { transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease; }
      .step-card:hover { transform: translateY(-3px); border-color: rgba(16, 185, 129, 0.35); background: color-mix(in srgb, var(--surface-2) 88%, rgba(16, 185, 129, 0.08)); }
      .theme-light .surface-card:hover,
      .theme-light .home-stat-card:hover,
      .theme-light .home-feature-card:hover { box-shadow: 0 18px 45px rgba(15, 23, 42, 0.11); }
      .theme-light .field-shell,
      .theme-light .input { background: #ffffff; border-color: #dbe5ef; }
      .theme-light .input:focus,
      .theme-light .field-shell:focus-within { background: #ffffff; border-color: #10b981; }
      .theme-light .segmented-control { background: #eef4f8; }
      .theme-light .type-switch { background: #eef4f8; border-color: #dbe5ef; }
      .theme-light .type-option:hover { background: #ffffff; }
      .theme-light .type-option-active-expense { background: #fff1f2; border-color: #fecdd3; color: #be123c; box-shadow: 0 12px 24px rgba(190, 18, 60, 0.08); }
      .theme-light .type-option-active-income { background: #ecfdf5; border-color: #a7f3d0; color: #047857; box-shadow: 0 12px 24px rgba(4, 120, 87, 0.08); }
      .theme-light .edit-modal-shell { border-color: #dbe5ef; }
      .theme-light .edit-modal-content {
        background: #ffffff;
        scrollbar-color: rgba(5, 150, 105, 0.72) rgba(226, 232, 240, 0.9);
      }
      .theme-light .edit-modal-content::-webkit-scrollbar-track {
        background: rgba(226, 232, 240, 0.9);
      }
      .theme-light .edit-modal-content::-webkit-scrollbar-thumb {
        border-color: #ffffff;
        background: linear-gradient(180deg, #10b981, #059669);
      }
      .theme-light .edit-installment-card { background: #f8fafc; border-color: #dbe5ef; }
      .theme-light .edit-modal-footer { background: rgba(255,255,255,0.92); border-color: #dbe5ef; }
      .theme-light .transaction-row { background: #ffffff; }
      .theme-light .transaction-note-preview { background: #f8fafc; border-color: #e2e8f0; }
      .theme-light .transaction-detail-info { background: #f8fafc; border-color: #dbe5ef; }
      .theme-light .empty-state { background: rgba(248, 250, 252, 0.85); }
      .theme-light .home-mini-card,
      .theme-light .home-stat-card { background: rgba(255, 255, 255, 0.82); }
      .theme-light .home-feature-card { background: rgba(255, 255, 255, 0.9); }
      .theme-light .theme-button { background: #0f172a; color: #ffffff; }
      .theme-light .outline-button:hover { background: #f0fdfa; border-color: rgba(16, 185, 129, 0.35); }

      @media (max-width: 640px) {
        .edit-modal-backdrop {
          align-items: center;
          padding: max(0.65rem, env(safe-area-inset-top)) 0.65rem max(0.65rem, env(safe-area-inset-bottom)) 0.65rem;
        }
        .edit-modal-shell {
          max-height: calc(100dvh - max(1.3rem, env(safe-area-inset-top)) - max(1.3rem, env(safe-area-inset-bottom)));
          border-radius: 1.65rem;
        }
        .edit-modal-hero { padding: 1rem; }
        .edit-modal-content { padding: 1rem; }
        .edit-modal-footer { padding: 0.85rem 1rem calc(0.85rem + env(safe-area-inset-bottom)); }
      }

      @keyframes toastSlideIn {
        from { opacity: 0; transform: translateY(-8px) translateX(12px); }
        to { opacity: 1; transform: translateY(0) translateX(0); }
      }
      @keyframes modalFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes modalScaleIn {
        from { opacity: 0; transform: translateY(10px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .custom-toast {
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.12);
        animation: toastSlideIn 0.24s ease both;
        backdrop-filter: blur(16px);
      }
      .custom-toast-icon { background: rgba(255, 255, 255, 0.12); }
      .custom-toast-close { color: rgba(255, 255, 255, 0.78); }
      .custom-toast-close:hover { color: #ffffff; background: rgba(255, 255, 255, 0.12); }
      .toast-success { background: linear-gradient(135deg, rgba(6, 78, 59, 0.96), rgba(5, 150, 105, 0.96)); box-shadow: 0 22px 55px rgba(16, 185, 129, 0.24); }
      .toast-error { background: linear-gradient(135deg, rgba(127, 29, 29, 0.97), rgba(225, 29, 72, 0.94)); box-shadow: 0 22px 55px rgba(225, 29, 72, 0.24); }
      .toast-warning { background: linear-gradient(135deg, rgba(120, 53, 15, 0.97), rgba(217, 119, 6, 0.94)); box-shadow: 0 22px 55px rgba(217, 119, 6, 0.24); }
      .toast-info { background: linear-gradient(135deg, rgba(15, 23, 42, 0.97), rgba(30, 64, 175, 0.94)); box-shadow: 0 22px 55px rgba(37, 99, 235, 0.2); }
      .confirm-overlay {
        background: rgba(2, 6, 23, 0.72);
        backdrop-filter: blur(8px);
        animation: modalFadeIn 0.18s ease both;
      }
      .confirm-card {
        background: linear-gradient(180deg, var(--surface), var(--surface-2));
        border: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
        color: var(--text);
        animation: modalScaleIn 0.2s ease both;
      }
      .confirm-icon-default { background: rgba(16, 185, 129, 0.12); color: #10b981; }
      .confirm-icon-danger { background: rgba(244, 63, 94, 0.12); color: #f43f5e; }
      .confirm-default-button { background: linear-gradient(135deg, #059669, #10b981); box-shadow: 0 14px 28px rgba(16, 185, 129, 0.24); }
      .confirm-danger-button { background: linear-gradient(135deg, #e11d48, #be123c); box-shadow: 0 14px 28px rgba(225, 29, 72, 0.24); }
      .theme-light .confirm-overlay { background: rgba(15, 23, 42, 0.34); }
      .theme-light .confirm-card { background: linear-gradient(180deg, #ffffff, #f8fafc); box-shadow: 0 28px 70px rgba(15, 23, 42, 0.22); }
      .month-selector { min-width: 260px; }
      .month-select { width: 100px; text-transform: lowercase; }
      .year-select { width: 78px; }
      @media (max-width: 640px) { .month-selector { min-width: 100%; } }

      .ghost-demo-button { border: 1px solid rgba(16, 185, 129, 0.28); color: #34d399; background: rgba(16, 185, 129, 0.08); }
      .ghost-demo-button:hover { background: rgba(16, 185, 129, 0.16); transform: scale(1.02); }
      .financial-health-card { overflow: hidden; position: relative; }
      .financial-health-card::after { content: ""; position: absolute; inset: auto -80px -120px auto; width: 220px; height: 220px; border-radius: 999px; opacity: .18; filter: blur(18px); background: currentColor; pointer-events: none; }
      .health-icon { background: rgba(16, 185, 129, 0.12); color: #10b981; }
      .health-bar { background: linear-gradient(135deg, #10b981, #059669); }
      .health-emerald { color: #10b981; }
      .health-blue { color: #3b82f6; }
      .health-amber { color: #f59e0b; }
      .health-rose { color: #f43f5e; }
      .health-blue .health-icon { background: rgba(59, 130, 246, .12); color: #3b82f6; }
      .health-blue .health-bar { background: linear-gradient(135deg, #3b82f6, #2563eb); }
      .health-amber .health-icon { background: rgba(245, 158, 11, .14); color: #f59e0b; }
      .health-amber .health-bar { background: linear-gradient(135deg, #f59e0b, #d97706); }
      .health-rose .health-icon { background: rgba(244, 63, 94, .14); color: #f43f5e; }
      .health-rose .health-bar { background: linear-gradient(135deg, #f43f5e, #e11d48); }
      .selected-card { border-color: rgba(16, 185, 129, 0.55); box-shadow: 0 18px 44px rgba(16, 185, 129, 0.12); }
      .mobile-bottom-nav { display: none; }

      .loading-screen {
        background:
          radial-gradient(circle at 20% 20%, rgba(16, 185, 129, 0.12), transparent 32%),
          radial-gradient(circle at 80% 10%, rgba(37, 99, 235, 0.12), transparent 34%),
          var(--bg);
      }

      .loading-card {
        width: 100%;
        max-width: 460px;
        min-height: 390px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .loading-logo-wrap {
        position: relative;
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(37, 99, 235, 0.14));
        border: 1px solid rgba(16, 185, 129, 0.25);
        box-shadow:
          0 0 0 8px rgba(16, 185, 129, 0.04),
          0 20px 45px rgba(2, 6, 23, 0.24);
        animation: loadingFloat 2.4s ease-in-out infinite;
      }

      .loading-logo-wrap::before {
        content: "";
        position: absolute;
        inset: -8px;
        border-radius: 2.3rem;
        border: 2px solid rgba(16, 185, 129, 0.18);
        border-top-color: rgba(16, 185, 129, 0.95);
        animation: loadingSpin 1.2s linear infinite;
      }

      .loading-bar {
        background: rgba(148, 163, 184, 0.18);
      }

      .loading-bar-progress {
        width: 45%;
        background: linear-gradient(90deg, #10b981, #22c55e, #3b82f6);
        animation: loadingBar 1.45s ease-in-out infinite;
      }

      .loading-dot {
        width: 0.65rem;
        height: 0.65rem;
        border-radius: 999px;
        background: #10b981;
        animation: loadingDot 1s ease-in-out infinite;
      }

      .loading-dot-delay-1 {
        animation-delay: 0.16s;
      }

      .loading-dot-delay-2 {
        animation-delay: 0.32s;
      }

      .loading-glow {
        position: absolute;
        border-radius: 999px;
        filter: blur(48px);
        opacity: 0.72;
        pointer-events: none;
      }

      .loading-glow-one {
        width: 220px;
        height: 220px;
        top: -90px;
        left: -90px;
        background: rgba(16, 185, 129, 0.18);
      }

      .loading-glow-two {
        width: 240px;
        height: 240px;
        right: -100px;
        bottom: -110px;
        background: rgba(37, 99, 235, 0.18);
      }

      @keyframes loadingSpin {
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes loadingFloat {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-7px);
        }
      }

      @keyframes loadingBar {
        0% {
          transform: translateX(-120%);
        }
        50% {
          transform: translateX(60%);
        }
        100% {
          transform: translateX(260%);
        }
      }

      @keyframes loadingDot {
        0%, 100% {
          opacity: 0.35;
          transform: translateY(0) scale(0.9);
        }
        50% {
          opacity: 1;
          transform: translateY(-5px) scale(1.05);
        }
      }

      @media (max-width: 768px) {
        .mobile-bottom-nav {
          position: fixed;
          left: 0.75rem;
          right: 0.75rem;
          bottom: 0.75rem;
          z-index: 40;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0.35rem;
          padding: 0.45rem;
          border-radius: 1.5rem;
          background: color-mix(in srgb, var(--surface) 92%, transparent);
          border: 1px solid var(--border);
          box-shadow: 0 18px 50px rgba(2, 6, 23, 0.22);
          backdrop-filter: blur(16px);
        }
        .mobile-bottom-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.2rem;
          min-height: 3.2rem;
          border-radius: 1.1rem;
          color: var(--muted);
          font-size: 0.65rem;
          font-weight: 900;
          transition: background-color .2s ease, color .2s ease, transform .2s ease;
        }
        .mobile-bottom-button svg { width: 1rem; height: 1rem; }
        .mobile-bottom-active {
          background: linear-gradient(135deg, #059669, #10b981);
          color: #ffffff;
          transform: translateY(-1px);
        }
      }



      .demo-hero-card {
        background:
          radial-gradient(circle at top left, rgba(16, 185, 129, 0.12), transparent 34%),
          radial-gradient(circle at bottom right, rgba(37, 99, 235, 0.12), transparent 34%),
          var(--surface);
        border: 1px solid color-mix(in srgb, var(--border) 70%, rgba(16, 185, 129, 0.22));
        color: var(--text);
      }
      .demo-action-card {
        display: grid;
        gap: 0.55rem;
        border-radius: 1.5rem;
        border: 1px solid color-mix(in srgb, var(--border) 74%, rgba(16, 185, 129, 0.20));
        background: color-mix(in srgb, var(--surface-2) 86%, transparent);
        color: var(--text);
        padding: 1rem;
        box-shadow: var(--soft-shadow);
        transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
      }
      .demo-action-card:hover {
        transform: translateY(-4px) scale(1.01);
        border-color: rgba(16, 185, 129, 0.45);
        box-shadow: 0 18px 42px rgba(16, 185, 129, 0.12);
      }
      .demo-action-card span {
        color: var(--muted);
        font-size: 0.82rem;
        line-height: 1.45;
        font-weight: 700;
      }
      .demo-badge-pulse {
        position: relative;
        overflow: visible;
      }
      .demo-badge-pulse::after {
        content: "";
        position: absolute;
        inset: -4px;
        border-radius: 999px;
        border: 1px solid rgba(16, 185, 129, 0.42);
        animation: demoPulse 1.8s ease-out infinite;
      }
      .demo-row-animate {
        animation: demoFadeUp 0.24s ease-out;
      }
      .demo-selected-card {
        border-color: rgba(16, 185, 129, 0.55);
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
      }
      @keyframes demoPulse {
        0% { opacity: 0.85; transform: scale(0.98); }
        100% { opacity: 0; transform: scale(1.18); }
      }
      @keyframes demoFadeUp {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .alert-count-pill {
        background: color-mix(in srgb, var(--surface-2) 76%, rgba(16, 185, 129, 0.12));
        border: 1px solid var(--border);
        color: var(--muted);
      }

      .alert-compact-button {
        border: 1px solid var(--border);
        background: color-mix(in srgb, var(--surface-2) 82%, transparent);
        color: var(--text);
        box-shadow: none;
      }

      .alert-compact-button:hover {
        transform: translateY(-1px);
        border-color: rgba(16, 185, 129, 0.35);
        background: color-mix(in srgb, var(--surface-2) 70%, rgba(16, 185, 129, 0.08));
      }

      .alert-dot {
        width: 0.45rem;
        height: 0.45rem;
        border-radius: 999px;
        background: currentColor;
        opacity: 0.85;
      }

      .alert-mini-badge {
        border-radius: 999px;
        background: rgba(2, 6, 23, 0.08);
        padding: 0.15rem 0.45rem;
        font-size: 0.62rem;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        opacity: 0.78;
      }

      .alert-compact-rose { color: #fb7185; }
      .alert-compact-amber { color: #f59e0b; }
      .alert-compact-emerald { color: #10b981; }
      .alert-compact-blue { color: #60a5fa; }
      .alert-compact-neutral { color: var(--muted); }

      .alert-detail-backdrop {
        background: rgba(2, 6, 23, 0.58);
        backdrop-filter: blur(12px);
      }

      .alert-detail-modal {
        animation: alertModalIn 0.18s ease-out;
        border: 1px solid color-mix(in srgb, var(--border) 72%, rgba(16, 185, 129, 0.22));
      }

      .alert-detail-chip {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: color-mix(in srgb, var(--surface-2) 82%, transparent);
        padding: 0.35rem 0.65rem;
        font-size: 0.68rem;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .alert-detail-box {
        border: 1px solid var(--border);
        background: color-mix(in srgb, var(--surface-2) 82%, transparent);
      }

      @keyframes alertModalIn {
        from { opacity: 0; transform: translateY(-12px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      /* PWA / Mobile refinements */
      .mobile-quick-shortcuts,
      .mobile-fab-button,
      .mobile-action-sheet,
      .mobile-action-dim,
      .mobile-more-sheet,
      .mobile-nav-dim {
        display: none;
      }

      @media (max-width: 768px) {
        .app-shell {
          min-height: 100dvh;
        }

        .mx-auto.flex.w-full.max-w-\[1500px\] {
          padding-left: 0.85rem;
          padding-right: 0.85rem;
          padding-top: 0.85rem;
          padding-bottom: calc(7.75rem + env(safe-area-inset-bottom));
          gap: 0.85rem;
        }

        .dashboard-header {
          position: sticky;
          top: 0.65rem;
          z-index: 30;
          border-radius: 1.55rem !important;
          padding: 0.75rem !important;
          backdrop-filter: blur(18px);
        }

        .dashboard-logo {
          height: 2.25rem !important;
          width: 2.25rem !important;
          border-radius: 0.95rem !important;
        }

        .dashboard-title {
          font-size: 0.95rem !important;
          line-height: 1.05rem !important;
        }

        .dashboard-user-pill,
        .dashboard-subtitle,
        .dashboard-actions .outline-button {
          display: none !important;
        }

        .dashboard-actions {
          width: auto !important;
          margin-left: auto;
          gap: 0.4rem !important;
        }

        .dashboard-actions .theme-button,
        .dashboard-actions .signout-button {
          width: 2.45rem;
          height: 2.45rem;
          padding: 0 !important;
          justify-content: center;
          border-radius: 1rem !important;
          font-size: 0;
        }

        .dashboard-actions .theme-button svg,
        .dashboard-actions .signout-button svg {
          margin: 0 !important;
        }

        .dashboard-actions .header-icon-button span,
        .dashboard-actions .account-menu-name,
        .dashboard-actions .account-menu-caret {
          display: none !important;
        }

        .dashboard-actions .account-menu-button {
          width: 2.45rem;
          height: 2.45rem;
          padding: 0 !important;
          justify-content: center;
          border-radius: 1rem !important;
        }

        .account-menu-panel {
          right: 0;
          width: min(18rem, calc(100vw - 1.5rem));
        }

        .month-selector {
          min-width: 9.2rem !important;
          padding: 0.35rem !important;
          gap: 0.25rem !important;
          border-radius: 1rem !important;
        }

        .month-select { width: 5.25rem !important; }
        .year-select { width: 3.75rem !important; }
        .month-select, .year-select {
          min-height: 2rem !important;
          font-size: 0.72rem !important;
          border-radius: 0.8rem !important;
        }

        .dashboard-header-premium {
          gap: 0.7rem !important;
          padding: 0.82rem !important;
        }

        .dashboard-brand-premium {
          width: 100%;
        }

        .dashboard-actions-premium {
          width: 100% !important;
          margin-left: 0 !important;
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) 2.5rem 2.5rem;
          gap: 0.45rem !important;
          align-items: center;
        }

        .dashboard-actions-premium .theme-button,
        .dashboard-actions-premium .account-menu-button {
          width: 2.5rem !important;
          height: 2.5rem !important;
          min-height: 2.5rem !important;
          padding: 0 !important;
          justify-content: center !important;
          border-radius: 1rem !important;
          border: 1px solid color-mix(in srgb, var(--border) 85%, transparent) !important;
          background: color-mix(in srgb, var(--surface-2) 92%, transparent) !important;
          color: var(--text) !important;
          box-shadow: none !important;
          font-size: 0 !important;
        }

        .dashboard-actions-premium .theme-button:hover,
        .dashboard-actions-premium .account-menu-button:hover {
          background: color-mix(in srgb, var(--surface-2) 78%, rgba(16, 185, 129, 0.14)) !important;
          border-color: rgba(16, 185, 129, 0.35) !important;
          color: #34d399 !important;
        }

        .dashboard-actions-premium .theme-button svg,
        .dashboard-actions-premium .account-menu-button svg {
          width: 1.05rem !important;
          height: 1.05rem !important;
          margin: 0 !important;
        }

        .dashboard-actions-premium .month-selector {
          min-width: 0 !important;
          width: 100% !important;
          max-width: none !important;
          padding: 0.3rem !important;
          gap: 0.22rem !important;
          border-radius: 1rem !important;
        }

        .dashboard-actions-premium .month-selector-center {
          min-width: 0;
          flex: 1 1 auto;
          justify-content: center;
          gap: 0.22rem;
          padding-inline: 0.18rem;
        }

        .dashboard-actions-premium .month-nav-button {
          width: 1.65rem !important;
          height: 1.8rem !important;
          border-radius: 0.75rem !important;
          font-size: 1.1rem !important;
        }

        .dashboard-actions-premium .month-select {
          width: auto !important;
          max-width: 4.8rem !important;
        }

        .dashboard-actions-premium .year-select {
          width: 3.45rem !important;
        }

        .dashboard-actions-premium .month-select,
        .dashboard-actions-premium .year-select {
          min-height: 1.95rem !important;
          font-size: 0.75rem !important;
          border-radius: 0.75rem !important;
        }

        .dashboard-tabs {
          display: none !important;
        }

        .mobile-quick-shortcuts {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.55rem;
        }

        .mobile-quick-shortcuts button {
          min-height: 3rem;
          border-radius: 1.15rem;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--surface) 88%, rgba(16, 185, 129, 0.06));
          color: var(--text);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.22rem;
          font-size: 0.66rem;
          font-weight: 950;
          box-shadow: 0 10px 30px rgba(2, 6, 23, 0.12);
        }

        .surface-card,
        .home-stat-card,
        .home-feature-card,
        .transaction-row,
        .metric-card,
        .financial-health-card {
          border-radius: 1.35rem !important;
        }

        .surface-card {
          padding: 0.95rem !important;
        }

        main.grid,
        section.grid,
        .grid.gap-6,
        .grid.gap-5,
        .grid.gap-4 {
          gap: 0.85rem !important;
        }

        .transactions-layout {
          display: grid;
          grid-template-columns: 1fr !important;
        }

        .compact-entry-card h2 {
          font-size: 1rem !important;
        }

        .compact-entry-card p,
        .compact-entry-card .muted-text {
          font-size: 0.72rem !important;
        }

        .transaction-form-mobile {
          gap: 0.65rem !important;
        }

        .transaction-form-mobile .type-switch {
          padding: 0.25rem !important;
          border-radius: 1rem !important;
        }

        .transaction-form-mobile .type-option {
          padding: 0.62rem 0.7rem !important;
          border-radius: 0.9rem !important;
        }

        .transaction-form-mobile .type-option span:last-child {
          display: none !important;
        }

        .input, .input-lg, select.input, textarea.input {
          min-height: 2.65rem;
          border-radius: 1rem !important;
          font-size: 0.82rem !important;
        }

        textarea.input {
          min-height: 4.5rem !important;
        }

        .transaction-optional-panel {
          padding: 0.75rem !important;
        }

        .transaction-row {
          padding: 0.78rem !important;
        }

        .transaction-row h3,
        .transaction-row strong {
          font-size: 0.86rem !important;
        }

        .transaction-row p,
        .transaction-row .muted-text {
          font-size: 0.7rem !important;
          line-height: 1.15rem !important;
        }

        .metric-card {
          padding: 0.9rem !important;
        }

        .metric-card .text-2xl,
        .metric-card strong {
          font-size: 1.05rem !important;
        }

        .financial-health-card {
          padding: 0.95rem !important;
        }

        .financial-health-card h2 {
          font-size: 1.1rem !important;
        }

        .financial-health-card p {
          font-size: 0.75rem !important;
          line-height: 1.25rem !important;
        }

        .custom-toast {
          top: 0.75rem !important;
          right: 0.75rem !important;
          left: 0.75rem !important;
          max-width: none !important;
          width: auto !important;
          border-radius: 1.25rem !important;
          padding: 0.85rem !important;
        }

        .mobile-fab-button {
          position: fixed;
          right: 1.05rem;
          bottom: calc(5.9rem + env(safe-area-inset-bottom));
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 3.7rem;
          height: 3.7rem;
          border-radius: 1.45rem;
          background: linear-gradient(135deg, #059669, #10b981);
          color: #ffffff;
          box-shadow: 0 18px 44px rgba(16, 185, 129, 0.34);
          transition: transform .18s ease, box-shadow .18s ease;
        }

        .mobile-fab-open {
          transform: rotate(90deg) scale(0.96);
          box-shadow: 0 14px 34px rgba(244, 63, 94, 0.26);
          background: linear-gradient(135deg, #e11d48, #f43f5e);
        }

        .mobile-action-dim,
        .mobile-nav-dim {
          position: fixed;
          inset: 0;
          display: block;
          z-index: 49;
          background: rgba(2, 6, 23, 0.42);
          backdrop-filter: blur(6px);
        }

        .mobile-action-sheet,
        .mobile-more-sheet {
          position: fixed;
          left: 0.85rem;
          right: 0.85rem;
          bottom: calc(5.85rem + env(safe-area-inset-bottom));
          z-index: 55;
          display: block;
          border-radius: 1.55rem;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--surface) 96%, transparent);
          color: var(--text);
          padding: 0.95rem;
          box-shadow: 0 24px 70px rgba(2, 6, 23, 0.38);
          backdrop-filter: blur(18px);
          animation: mobileSheetIn .18s ease both;
        }

        .mobile-more-sheet {
          bottom: calc(5.25rem + env(safe-area-inset-bottom));
        }

        .mobile-action-option,
        .mobile-more-button {
          min-height: 3.3rem;
          border-radius: 1.1rem;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--surface-2) 86%, transparent);
          color: var(--text);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          font-size: 0.78rem;
          font-weight: 950;
        }

        .mobile-action-option svg,
        .mobile-more-button svg {
          color: #10b981;
        }

        .mobile-more-active {
          border-color: rgba(16, 185, 129, 0.5);
          background: rgba(16, 185, 129, 0.12);
          color: #34d399;
        }

        .mobile-bottom-nav {
          left: 0.75rem;
          right: 0.75rem;
          bottom: calc(0.7rem + env(safe-area-inset-bottom));
          border-radius: 1.45rem;
          padding: 0.42rem;
        }

        .mobile-bottom-button {
          min-height: 3.05rem;
          border-radius: 1rem;
          font-size: 0.61rem;
        }

        .mobile-bottom-button span {
          max-width: 3.8rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .cards-page,
        .cards-layout,
        .cards-grid {
          gap: 0.85rem !important;
        }
      }

      @keyframes mobileSheetIn {
        from { opacity: 0; transform: translateY(14px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }


      .dashboard-live-hero {
        position: relative;
        overflow: hidden;
        border: 1px solid rgba(16, 185, 129, 0.18);
        background:
          radial-gradient(circle at 12% 20%, rgba(16, 185, 129, 0.18), transparent 30%),
          radial-gradient(circle at 86% 10%, rgba(59, 130, 246, 0.16), transparent 34%),
          linear-gradient(135deg, color-mix(in srgb, var(--surface) 88%, rgba(16, 185, 129, 0.06)), color-mix(in srgb, var(--surface-2) 88%, rgba(59, 130, 246, 0.06)));
      }

      .dashboard-live-emerald { border-color: rgba(16, 185, 129, 0.24); }
      .dashboard-live-blue { border-color: rgba(59, 130, 246, 0.24); }
      .dashboard-live-amber { border-color: rgba(245, 158, 11, 0.24); }
      .dashboard-live-rose { border-color: rgba(244, 63, 94, 0.24); }

      .dashboard-live-orb {
        position: absolute;
        width: 230px;
        height: 230px;
        border-radius: 999px;
        filter: blur(34px);
        opacity: 0.22;
        pointer-events: none;
        animation: dashboardOrbFloat 7s ease-in-out infinite;
      }

      .dashboard-live-orb-one {
        left: -70px;
        bottom: -105px;
        background: #10b981;
      }

      .dashboard-live-orb-two {
        right: -80px;
        top: -95px;
        background: #3b82f6;
        animation-delay: -2s;
      }

      .dashboard-live-pill {
        background: rgba(16, 185, 129, 0.12);
        border: 1px solid rgba(16, 185, 129, 0.24);
        color: #34d399;
      }

      .dashboard-live-pill-soft {
        background: color-mix(in srgb, var(--surface-2) 78%, rgba(148, 163, 184, 0.16));
        border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
      }

      .dashboard-live-stat {
        background: rgba(255, 255, 255, 0.045);
        border: 1px solid color-mix(in srgb, var(--border) 58%, transparent);
        backdrop-filter: blur(12px);
      }

      .theme-light .dashboard-live-stat {
        background: rgba(255, 255, 255, 0.72);
      }

      .dashboard-live-action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        background: linear-gradient(135deg, #059669, #10b981);
        color: #ffffff;
        box-shadow: 0 16px 30px rgba(16, 185, 129, 0.2);
        transition: transform 0.2s ease, filter 0.2s ease;
      }

      .dashboard-live-action:hover { transform: translateY(-2px); filter: brightness(1.04); }

      .dashboard-live-action-soft {
        background: color-mix(in srgb, var(--surface) 84%, rgba(16, 185, 129, 0.12));
        color: var(--text);
        border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
        box-shadow: none;
      }

      .dashboard-radar-card {
        background: color-mix(in srgb, var(--surface) 78%, rgba(15, 23, 42, 0.08));
        border: 1px solid color-mix(in srgb, var(--border) 68%, transparent);
        backdrop-filter: blur(14px);
      }

      .dashboard-radar-icon,
      .dashboard-radar-item-icon,
      .dashboard-focus-icon,
      .dashboard-timeline-day {
        background: rgba(16, 185, 129, 0.12);
        color: #10b981;
      }

      .dashboard-radar-item {
        border: 1px solid color-mix(in srgb, var(--border) 64%, transparent);
        background: color-mix(in srgb, var(--surface-2) 80%, transparent);
      }

      .dashboard-radar-positive .dashboard-radar-item-icon {
        background: rgba(16, 185, 129, 0.14);
        color: #10b981;
      }

      .dashboard-focus-card {
        min-height: 182px;
      }

      .dashboard-focus-card:hover .dashboard-focus-icon {
        transform: scale(1.04) rotate(-2deg);
      }

      .dashboard-focus-icon {
        transition: transform 0.2s ease;
      }

      .dashboard-focus-progress {
        background: rgba(148, 163, 184, 0.18);
      }

      .dashboard-focus-progress > div {
        background: linear-gradient(90deg, #10b981, #3b82f6);
      }

      .dashboard-timeline-day strong {
        line-height: 1;
        font-size: 0.95rem;
      }

      .dashboard-timeline-day span {
        margin-top: 0.1rem;
        font-size: 0.58rem;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      @keyframes dashboardOrbFloat {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
        50% { transform: translate3d(10px, -12px, 0) scale(1.08); }
      }

      @media (max-width: 640px) {
        .dashboard-live-hero { border-radius: 1.7rem; padding: 1rem; }
        .dashboard-live-hero h2 { font-size: 1.55rem; }
        .dashboard-live-action { width: 100%; }
        .dashboard-radar-card { border-radius: 1.4rem; }
        .dashboard-focus-card { min-height: auto; border-radius: 1.35rem; }
      }


      /* Polimento Mobile/PWA final: altera apenas telas pequenas */
      .mobile-card-picker { display: none; }

      @media (max-width: 768px) {
        .mobile-dashboard-flow {
          display: flex !important;
          flex-direction: column !important;
        }

        .dashboard-live-hero { order: 2; }
        .monthly-summary-card { order: 1; }
        .dashboard-metrics-grid { order: 3; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        .dashboard-focus-grid { order: 4; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        .dashboard-secondary-row { order: 5; }
        .dashboard-charts-row { order: 6; }
        .dashboard-comparison-row { order: 7; }

        .monthly-summary-card {
          padding: 0.85rem !important;
        }

        .monthly-summary-card .interactive-row {
          padding: 0.8rem !important;
          gap: 0.75rem !important;
        }

        .monthly-summary-card h2 {
          font-size: 1.05rem !important;
        }

        .monthly-summary-card p {
          font-size: 0.72rem !important;
          line-height: 1.2rem !important;
        }

        .monthly-summary-card .grid.sm\:grid-cols-3 {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 0.45rem !important;
        }

        .monthly-summary-card .grid.sm\:grid-cols-3 .transaction-row,
        .monthly-summary-card .grid.sm\:grid-cols-3 > div {
          padding: 0.65rem !important;
        }

        .monthly-summary-backdrop {
          align-items: flex-end !important;
          justify-content: center !important;
          padding: 0 !important;
        }

        .monthly-summary-modal {
          width: 100% !important;
          max-width: none !important;
          height: calc(94dvh - env(safe-area-inset-top)) !important;
          max-height: none !important;
          border-radius: 1.65rem 1.65rem 0 0 !important;
          animation: mobileSheetIn .2s ease both;
        }

        .monthly-summary-modal .edit-modal-hero {
          padding: 1rem !important;
        }

        .monthly-summary-modal .edit-modal-hero h2 {
          font-size: 1.35rem !important;
        }

        .monthly-summary-modal .edit-modal-hero p {
          font-size: 0.78rem !important;
          line-height: 1.35rem !important;
        }

        .monthly-summary-modal .edit-modal-content {
          padding: 0.85rem !important;
        }

        .monthly-summary-modal .edit-modal-content > .grid.sm\:grid-cols-4 {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }

        .monthly-summary-modal .edit-modal-footer {
          padding: 0.75rem 0.85rem calc(0.75rem + env(safe-area-inset-bottom)) !important;
        }

        .monthly-summary-modal .edit-modal-footer button {
          width: 100%;
          min-height: 2.7rem;
        }

        .dashboard-live-hero {
          padding: 0.95rem !important;
        }

        .dashboard-live-hero .dashboard-radar-card {
          padding: 0.8rem !important;
        }

        .dashboard-live-hero .dashboard-live-stat {
          padding: 0.75rem !important;
        }

        .dashboard-live-hero .dashboard-live-stat strong {
          font-size: 1.15rem !important;
        }

        .dashboard-focus-card {
          padding: 0.82rem !important;
          min-height: 8.5rem !important;
        }

        .dashboard-focus-card .dashboard-focus-icon {
          width: 2.15rem !important;
          height: 2.15rem !important;
          border-radius: 0.9rem !important;
        }

        .dashboard-focus-card strong {
          font-size: 1rem !important;
        }

        .dashboard-focus-card .muted-text:last-child {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .dashboard-charts-row,
        .dashboard-comparison-row {
          margin-top: 0.1rem;
        }

        .dashboard-charts-row .recharts-responsive-container,
        .dashboard-comparison-row .recharts-responsive-container {
          min-height: 220px !important;
        }

        .mobile-card-picker {
          display: block;
        }

        .cards-page-layout {
          grid-template-columns: 1fr !important;
        }

        .cards-page-layout .card-list-panel {
          display: none !important;
        }

        .cards-page-layout aside {
          position: static !important;
          top: auto !important;
        }

        .cards-page-layout aside > section:not(.card-list-panel) {
          padding: 0.85rem !important;
        }

        .cards-page-layout aside > section:not(.card-list-panel) form {
          gap: 0.65rem !important;
        }

        .cards-page-layout .xl\:min-w-\[520px\] {
          min-width: 0 !important;
        }

        .cards-page-layout .sm\:grid-cols-3 {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 0.45rem !important;
        }

        .cards-page-layout .md\:grid-cols-5,
        .cards-page-layout .md\:grid-cols-4 {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }

        .cards-page-layout .max-h-\[360px\],
        .cards-page-layout .max-h-\[520px\] {
          max-height: none !important;
        }

        .mobile-action-sheet {
          bottom: calc(5.9rem + env(safe-area-inset-bottom)) !important;
        }

        .mobile-action-option {
          justify-content: flex-start !important;
          padding: 0 0.85rem !important;
        }

        .mobile-bottom-button:nth-child(2) {
          background: color-mix(in srgb, #10b981 18%, var(--surface-2));
          color: #10b981;
        }

        .mobile-bottom-button:nth-child(2).mobile-bottom-active {
          background: linear-gradient(135deg, #059669, #10b981);
          color: #ffffff;
        }
      }

        ::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(16, 185, 129, 0.5);
  border-radius: 999px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(16, 185, 129, 0.8);
}
    `}</style>
  );
}