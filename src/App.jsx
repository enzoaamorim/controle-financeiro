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

const paymentMethods = ["Pix", "Débito", "Crédito", "Dinheiro", "Boleto", "Transferência"];

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
  return {
    ...row,
    amount: Number(row.amount || 0),
    day_of_month: Number(row.day_of_month || 1),
  };
}

function normalizeCard(row) {
  return {
    ...row,
    card_limit: Number(row.card_limit || 0),
    closing_day: Number(row.closing_day || 1),
    due_day: Number(row.due_day || 1),
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
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setAuthLoading(false);

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
      const shouldGoDashboard = Boolean(session) && (hasAuthRedirectParams() || shouldOpenDashboardAfterConfirmation());

      if (shouldGoDashboard) {
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

    async function handleEmailConfirmationRedirect() {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace("#", ""));
      const authStatus = params.get("auth");
      const authType = params.get("type") || hashParams.get("type");
      const code = params.get("code");
      const hasAccessToken = hashParams.has("access_token") || hashParams.has("refresh_token");

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

    handleEmailConfirmationRedirect();
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
      { id: "card-demo-1", name: "Cartão principal", card_limit: 3000, closing_day: 10, due_day: 15, color: "#10b981", is_active: true },
      { id: "card-demo-2", name: "Cartão secundário", card_limit: 1800, closing_day: 20, due_day: 28, color: "#3b82f6", is_active: true },
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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 pb-28 sm:px-6 lg:px-8 lg:pb-8">
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
    <main className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <section className="surface-card rounded-[2rem] p-5 shadow-sm">
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
                <p className="muted-text text-sm">Fecha dia {selectedCard.closing_day} · vence dia {selectedCard.due_day}</p>
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
  const isLogin = mode === "login";
  const isReset = mode === "reset";

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

  useEffect(() => {
    setMessage(systemMessage || "");
  }, [systemMessage]);

  useEffect(() => {
    setEmailTouched(false);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [mode]);

  async function handleAuth(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      setEmailTouched(true);
      const trimmedName = name.trim();
      const emailError = validateEmail(normalizedEmail);

      if (emailError) {
        setMessage(emailError);
        return;
      }

      if (isReset) {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: window.location.origin,
        });

        if (error) throw error;
        setMessage("Enviamos um link de recuperação para o seu e-mail.");
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
          <p className="muted-text mt-2 text-sm">
            {isReset ? "Recupere sua senha" : isLogin ? "Entre na sua conta" : "Crie sua conta"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && !isReset && (
            <Field label="Nome">
              <input value={name} onChange={(event) => setName(event.target.value)} className="input" placeholder="Seu nome" required />
            </Field>
          )}

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

          {!isReset && (
            <PasswordInput
              label="Senha"
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
              placeholder="Digite sua senha"
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
          )}

          {!isLogin && !isReset && (
            <>
              <PasswordInput
                label="Confirmar senha"
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((value) => !value)}
                placeholder="Digite a senha novamente"
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

          {message && <p className="rounded-2xl bg-slate-500/10 p-3 text-sm font-semibold text-emerald-400">{message}</p>}

          <button disabled={loading} className="w-full rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white transition hover:bg-emerald-700 disabled:opacity-60">
            {loading ? "Aguarde..." : isReset ? "Enviar link" : isLogin ? "Entrar" : "Cadastrar"}
          </button>
        </form>

        <div className="mt-5 grid gap-2 text-center text-sm font-bold">
          {!isReset && (
            <button onClick={() => setMode(isLogin ? "signup" : "login")} className="text-emerald-400 hover:text-emerald-300">
              {isLogin ? "Ainda não tenho conta" : "Já tenho conta, fazer login"}
            </button>
          )}
          <button onClick={() => setMode(isReset ? "login" : "reset")} className="muted-text hover:text-emerald-400">
            {isReset ? "Voltar para o login" : "Esqueci minha senha"}
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
  const [preferences, setPreferences] = useState(null);

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [typeFilter, setTypeFilter] = useState("all");
  const [cardFilter, setCardFilter] = useState("all");
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

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const [goalForm, setGoalForm] = useState({ title: "", target_amount: "", current_amount: "", deadline: "" });
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [limitForm, setLimitForm] = useState({ category: "Mercado", monthly_limit: "" });
  const [recurringForm, setRecurringForm] = useState({
    type: "expense",
    description: "",
    category: "Mercado",
    method: "Pix",
    amount: "",
    day_of_month: "5",
    is_active: true,
  });
  const [profileName, setProfileName] = useState(userName);
  const [cardForm, setCardForm] = useState({ name: "", card_limit: "", closing_day: "10", due_day: "15", color: "#059669", is_active: true });
  const [editingCardId, setEditingCardId] = useState(null);
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
      const [transactionsResult, goalsResult, limitsResult, recurringResult, cardsResult, preferencesResult] = await Promise.all([
        supabase.from("transactions").select("*").eq("user_id", user.id).order("date", { ascending: false }),
        supabase.from("goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("category_limits").select("*").eq("user_id", user.id).order("category", { ascending: true }),
        supabase.from("recurring_items").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("credit_cards").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("user_preferences").select("*").eq("user_id", user.id).limit(1),
      ]);

      const error = transactionsResult.error || goalsResult.error || limitsResult.error || recurringResult.error || cardsResult.error || preferencesResult.error;
      if (error) throw error;

      setTransactions((transactionsResult.data || []).map(normalizeTransaction));
      setGoals((goalsResult.data || []).map(normalizeGoal));
      setLimits((limitsResult.data || []).map(normalizeLimit));
      setRecurringItems((recurringResult.data || []).map(normalizeRecurring));
      setCreditCards((cardsResult.data || []).map(normalizeCard));

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
    const filtered = monthTransactions
      .filter((item) => categoryFilter === "Todas" || item.category === categoryFilter)
      .filter((item) => typeFilter === "all" || item.type === typeFilter)
      .filter((item) => {
        if (cardFilter === "all") return true;
        if (cardFilter === "none") return !item.card_id;
        return item.card_id === cardFilter;
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
  }, [monthTransactions, categoryFilter, typeFilter, cardFilter, query, sortBy]);

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
    return creditCards.map((card) => {
      const spent = monthTransactions
        .filter((item) => item.type === "expense" && item.card_id === card.id)
        .reduce((total, item) => total + Number(item.amount), 0);
      const percent = card.card_limit > 0 ? Math.round((spent / card.card_limit) * 100) : 0;
      return { ...card, spent, percent, available: Math.max(0, Number(card.card_limit || 0) - spent) };
    });
  }, [creditCards, monthTransactions]);

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
    limitAlerts.forEach((item) => notifications.push({ title: `Limite ultrapassado: ${item.category}`, text: `Gasto de ${money.format(item.spent)} para limite de ${money.format(item.monthly_limit)}.`, tone: "amber" }));
    cardUsage.filter((card) => card.card_limit > 0 && card.percent >= 80).forEach((card) => notifications.push({ title: `Atenção ao cartão ${card.name}`, text: `${card.percent}% do limite utilizado neste mês.`, tone: "rose" }));
    const today = new Date();
    recurringItems.filter((item) => item.is_active).forEach((item) => {
      const dueDate = new Date(today.getFullYear(), today.getMonth(), Number(item.day_of_month));
      const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 5) notifications.push({ title: `Item fixo próximo: ${item.description}`, text: `Vence/entra no dia ${item.day_of_month}.`, tone: "blue" });
    });
    return notifications.slice(0, 6);
  }, [limitAlerts, cardUsage, recurringItems]);

  const calendarEvents = useMemo(() => {
    const events = monthTransactions.map((item) => ({ ...item, source: "transaction", day: Number(item.date.slice(8, 10)) }));
    recurringItems.filter((item) => item.is_active).forEach((item) => {
      events.push({ ...item, id: `rec-${item.id}`, source: "recurring", day: Number(item.day_of_month), date: `${selectedMonth}-${String(item.day_of_month).padStart(2, "0")}` });
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
        const groupId = uid();
        const installmentAmount = Number((amount / installments).toFixed(2));
        const rows = Array.from({ length: installments }).map((_, index) => {
          const isLast = index === installments - 1;
          const adjustedAmount = isLast ? Number((amount - installmentAmount * (installments - 1)).toFixed(2)) : installmentAmount;
          return {
            ...payload,
            description: `${description} (${index + 1}/${installments})`,
            amount: adjustedAmount,
            date: addMonthsToISO(form.date, index),
            installment_group_id: groupId,
            installment_number: index + 1,
            installment_total: installments,
          };
        });
        const { error } = await supabase.from("transactions").insert(rows);
        if (error) throw error;
        showToast(`${installments} parcelas criadas com sucesso.`);
      } else {
        const { error } = await supabase.from("transactions").insert(payload);
        if (error) throw error;
        showToast("Lançamento adicionado com sucesso.");
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
      if (editingGoalId) {
        const { error } = await supabase.from("goals").update(payload).eq("id", editingGoalId).eq("user_id", user.id);
        if (error) throw error;
        showToast("Meta atualizada com sucesso.");
      } else {
        const { error } = await supabase.from("goals").insert(payload);
        if (error) throw error;
        showToast("Meta criada com sucesso.");
      }

      setGoalForm({ title: "", target_amount: "", current_amount: "", deadline: "" });
      setEditingGoalId(null);
      await loadAllData();
    } catch (error) {
      showToast(`Erro ao salvar meta: ${error.message}`);
    }
  }

  function editGoal(goal) {
    setEditingGoalId(goal.id);
    setGoalForm({
      title: goal.title,
      target_amount: String(goal.target_amount),
      current_amount: String(goal.current_amount),
      deadline: goal.deadline || "",
    });
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

  async function handleRecurringSubmit(event) {
    event.preventDefault();
    const amount = toNumber(recurringForm.amount);
    const day = Number(recurringForm.day_of_month);
    const description = recurringForm.description.trim();

    if (!description || !amount || amount <= 0 || day < 1 || day > 31) {
      showToast("Preencha descrição, valor e dia válido entre 1 e 31.");
      return;
    }

    try {
      const { error } = await supabase.from("recurring_items").insert({
        user_id: user.id,
        type: recurringForm.type,
        description,
        category: recurringForm.category,
        method: recurringForm.method,
        amount,
        day_of_month: day,
        is_active: recurringForm.is_active,
      });

      if (error) throw error;
      setRecurringForm({ type: "expense", description: "", category: "Mercado", method: "Pix", amount: "", day_of_month: "5", is_active: true });
      showToast("Item recorrente criado.");
      await loadAllData();
    } catch (error) {
      showToast(`Erro ao salvar recorrência: ${error.message}`);
    }
  }

  async function toggleRecurring(item) {
    const { error } = await supabase.from("recurring_items").update({ is_active: !item.is_active }).eq("id", item.id).eq("user_id", user.id);
    if (error) showToast(`Erro ao atualizar recorrência: ${error.message}`);
    else await loadAllData();
  }

  function deleteRecurring(id) {
    openConfirmModal({
      title: "Excluir item fixo",
      message: "Deseja excluir este item recorrente? Ele não será mais usado para gerar lançamentos mensais.",
      confirmText: "Excluir",
      cancelText: "Cancelar",
      danger: true,
      onConfirm: async () => {
        const { error } = await supabase.from("recurring_items").delete().eq("id", id).eq("user_id", user.id);
        if (error) showToast(`Erro ao excluir recorrência: ${error.message}`, "error");
        else {
          showToast("Item recorrente excluído com sucesso.", "success");
          await loadAllData();
        }
      },
    });
  }

  async function generateRecurringForMonth() {
    const activeItems = recurringItems.filter((item) => item.is_active);
    if (!activeItems.length) {
      showToast("Você não possui itens recorrentes ativos.");
      return;
    }

    const [year, month] = selectedMonth.split("-");
    const lastDay = daysInMonth(year, month);

    const rows = activeItems.map((item) => {
      const day = Math.min(Number(item.day_of_month), lastDay);
      return {
        user_id: user.id,
        type: item.type,
        description: item.description,
        category: item.category,
        method: item.method,
        amount: Number(item.amount),
        date: `${selectedMonth}-${String(day).padStart(2, "0")}`,
        recurring_item_id: item.id,
        recurrence_month: selectedMonth,
      };
    });

    try {
      const { error } = await supabase.from("transactions").upsert(rows, {
        onConflict: "user_id,recurring_item_id,recurrence_month",
      });

      if (error) throw error;
      showToast(`Recorrências de ${monthLabel(selectedMonth)} geradas/atualizadas.`);
      await loadAllData();
    } catch (error) {
      showToast(`Erro ao gerar recorrências: ${error.message}`);
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
      showToast("Informe o nome do cartão.");
      return;
    }
    const payload = {
      user_id: user.id,
      name,
      card_limit: toNumber(cardForm.card_limit) || 0,
      closing_day: Number(cardForm.closing_day) || null,
      due_day: Number(cardForm.due_day) || null,
      color: cardForm.color || "#059669",
      is_active: cardForm.is_active,
    };
    try {
      if (editingCardId) {
        const { error } = await supabase.from("credit_cards").update(payload).eq("id", editingCardId).eq("user_id", user.id);
        if (error) throw error;
        showToast("Cartão atualizado.");
      } else {
        const { error } = await supabase.from("credit_cards").insert(payload);
        if (error) throw error;
        showToast("Cartão criado.");
      }
      setCardForm({ name: "", card_limit: "", closing_day: "10", due_day: "15", color: "#059669", is_active: true });
      setEditingCardId(null);
      await loadAllData();
    } catch (error) {
      showToast(`Erro ao salvar cartão: ${error.message}`);
    }
  }

  function editCard(card) {
    setEditingCardId(card.id);
    setCardForm({
      name: card.name,
      card_limit: String(card.card_limit || ""),
      closing_day: String(card.closing_day || ""),
      due_day: String(card.due_day || ""),
      color: card.color || "#059669",
      is_active: Boolean(card.is_active),
    });
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

    const csv = [headers, ...rows]
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

  function exportPDF() {
    const incomePercent = summary.income > 0 ? Math.max(0, Math.round((summary.balance / summary.income) * 100)) : 0;
    const health = financialHealth;
    const topExpensesHtml = topExpenses
      .map((item) => `<tr><td>${item.description}</td><td>${item.category}</td><td class="money">${money.format(item.amount)}</td></tr>`)
      .join("") || `<tr><td colspan="3" class="muted">Sem despesas no mês.</td></tr>`;
    const goalsHtml = goals
      .slice(0, 8)
      .map((goal) => {
        const percent = goal.target_amount > 0 ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100)) : 0;
        return `<tr><td>${goal.title}</td><td>${percent}%</td><td class="money">${money.format(goal.current_amount)} de ${money.format(goal.target_amount)}</td></tr>`;
      })
      .join("") || `<tr><td colspan="3" class="muted">Sem metas cadastradas.</td></tr>`;

    const html = `
      <html>
        <head>
          <title>Relatório ${monthLabel(selectedMonth)}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; font-family: Arial, sans-serif; background: #eef3f7; color: #0f172a; padding: 28px; }
            .page { max-width: 1100px; margin: 0 auto; background: #fff; border-radius: 24px; overflow: hidden; box-shadow: 0 18px 50px rgba(15,23,42,.10); }
            .header { background: linear-gradient(135deg, #07111f, #10244d 58%, #064e3b); color: #fff; padding: 34px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
            .brand { display: flex; align-items: center; gap: 16px; }
            .logo { width: 58px; height: 58px; border-radius: 16px; object-fit: cover; border: 1px solid rgba(255,255,255,.2); }
            h1 { margin: 0; font-size: 28px; line-height: 1.2; }
            h2 { margin: 0 0 12px; font-size: 20px; }
            .subtitle { color: #cbd5e1; margin: 6px 0 0; font-size: 13px; }
            .content { padding: 30px; }
            .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
            .card { border: 1px solid #e2e8f0; border-radius: 18px; padding: 18px; background: #f8fafc; }
            .card span { display: block; color: #64748b; font-size: 12px; font-weight: 700; margin-bottom: 8px; }
            .card strong { font-size: 21px; }
            .section { margin-top: 26px; }
            .health { border: 1px solid #bbf7d0; background: #ecfdf5; border-radius: 18px; padding: 18px; margin: 22px 0; }
            .health strong { color: #047857; }
            .muted { color: #64748b; }
            table { width: 100%; border-collapse: collapse; overflow: hidden; border-radius: 14px; }
            th, td { border-bottom: 1px solid #e2e8f0; padding: 11px 10px; text-align: left; font-size: 12px; }
            th { background: #f1f5f9; color: #334155; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
            .money { text-align: right; font-weight: 700; }
            .footer { padding: 22px 30px 30px; color: #94a3b8; font-size: 12px; text-align: center; }
            @media print { body { background: #fff; padding: 0; } .page { box-shadow: none; border-radius: 0; } .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="brand">
                <img class="logo" src="${window.location.origin}/logo-email.png" />
                <div>
                  <h1>Controle Financeiro</h1>
                  <p class="subtitle">Relatório de ${monthLabel(selectedMonth)} · ${userName}</p>
                </div>
              </div>
              <div style="text-align:right">
                <strong>${new Date().toLocaleDateString("pt-BR")}</strong>
                <p class="subtitle">${user.email}</p>
              </div>
            </div>
            <div class="content">
              <div class="cards">
                <div class="card"><span>Receitas</span><strong>${money.format(summary.income)}</strong></div>
                <div class="card"><span>Despesas</span><strong>${money.format(summary.expense)}</strong></div>
                <div class="card"><span>Saldo</span><strong>${money.format(summary.balance)}</strong></div>
                <div class="card"><span>Economia</span><strong>${incomePercent}%</strong></div>
              </div>
              <div class="health"><strong>Saúde financeira: ${health.label}</strong><br/><span>${health.text}</span></div>
              <div class="section">
                <h2>Lançamentos do mês</h2>
                <table>
                  <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Categoria</th><th class="money">Valor</th></tr></thead>
                  <tbody>
                    ${visibleTransactions
                      .map(
                        (item) => `<tr><td>${formatDateBR(item.date)}</td><td>${item.type === "income" ? "Receita" : "Despesa"}</td><td>${item.description}</td><td>${item.category}</td><td class="money">${money.format(item.amount)}</td></tr>`
                      )
                      .join("") || `<tr><td colspan="5" class="muted">Nenhum lançamento encontrado para este filtro.</td></tr>`}
                  </tbody>
                </table>
              </div>
              <div class="section">
                <h2>Top gastos</h2>
                <table><thead><tr><th>Descrição</th><th>Categoria</th><th class="money">Valor</th></tr></thead><tbody>${topExpensesHtml}</tbody></table>
              </div>
              <div class="section">
                <h2>Metas financeiras</h2>
                <table><thead><tr><th>Meta</th><th>Progresso</th><th class="money">Valor</th></tr></thead><tbody>${goalsHtml}</tbody></table>
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
    showToast("Relatório profissional aberto para impressão.", "success");
  }


  const tabs = [
    { key: "dashboard", label: "Painel", icon: <BarChart3 size={17} /> },
    { key: "annual", label: "Anual", icon: <CalendarRange size={17} /> },
    { key: "transactions", label: "Lançamentos", icon: <Wallet size={17} /> },
    { key: "goals", label: "Metas", icon: <Target size={17} /> },
    { key: "limits", label: "Limites", icon: <PiggyBank size={17} /> },
    { key: "cards", label: "Cartões", icon: <CreditCard size={17} /> },
    { key: "recurring", label: "Fixos", icon: <Repeat size={17} /> },
    { key: "calendar", label: "Calendário", icon: <CalendarClock size={17} /> },
    { key: "reports", label: "Relatórios", icon: <FileText size={17} /> },
    { key: "profile", label: "Perfil", icon: <UserRound size={17} /> },
    { key: "settings", label: "Configurações", icon: <Settings size={17} /> },
  ];

  if (loadingData || !minimumDataLoadingDone) {
    return (
      <LoadingScreen
        title="Carregando seu painel"
        subtitle="Sincronizando lançamentos, metas, cartões e relatórios..."
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 pb-28 sm:px-6 lg:px-8 lg:pb-8">
      <EditTransactionModal
        open={Boolean(editingId)}
        form={editForm}
        setForm={setEditForm}
        onSubmit={handleEditTransactionSubmit}
        onClose={closeEditTransactionModal}
        creditCards={creditCards}
      />

      <ToastCustom toast={toast} onClose={hideToast} />
      <ConfirmModal modal={confirmModal} onClose={closeConfirmModal} />

      <header className="dashboard-header surface-card rounded-[2rem] p-4 shadow-sm">
        <div className="dashboard-brand">
          <img src={logoEA} alt="Logo" className="dashboard-logo h-11 w-11 rounded-2xl object-cover" />
          <div className="min-w-0">
            <div className="dashboard-title-row">
              <h1 className="dashboard-title">Controle Financeiro</h1>
              <span className="dashboard-user-pill">{userName}</span>
            </div>
            <p className="dashboard-subtitle muted-text">Painel financeiro pessoal</p>
          </div>
        </div>

        <div className="dashboard-actions">
          <MonthSelector value={selectedMonth} onChange={setSelectedMonth} years={availableYears} />
          <button onClick={() => setDarkMode((value) => !value)} className="theme-button dashboard-action-button inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition hover:scale-[1.02]">
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
            {darkMode ? "Modo claro" : "Modo escuro"}
          </button>
          <button onClick={onHome} className="outline-button dashboard-action-button inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold">
            <Home size={17} /> Home
          </button>
          <button
            onClick={() =>
              openConfirmModal({
                title: "Sair da conta",
                message: "Tem certeza que deseja sair da sua conta?",
                confirmText: "Sair",
                cancelText: "Cancelar",
                danger: false,
                onConfirm: onSignOut,
              })
            }
            className="signout-button dashboard-action-button inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-black transition"
          >
            <LogOut size={17} /> Sair
          </button>
        </div>
      </header>

      <nav className="dashboard-tabs surface-card rounded-[2rem] p-2 shadow-sm" aria-label="Menu principal do painel">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setPage(tab.key)}
            className={classNames("dashboard-tab-button inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-black transition", page === tab.key ? "dashboard-tab-active" : "ghost-button")}
          >
            {tab.icon} <span>{tab.label}</span>
          </button>
        ))}
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
        />
      )}

      {page === "transactions" && (
        <TransactionsPage
          form={form}
          setForm={setForm}
          resetForm={resetTransactionForm}
          onSubmit={handleTransactionSubmit}
          visibleTransactions={visibleTransactions}
          allCategories={allCategories}
          query={query}
          setQuery={setQuery}
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
          exportCSV={exportCSV}
          creditCards={creditCards}
        />
      )}

      {page === "goals" && <GoalsPage goals={goals} goalForm={goalForm} setGoalForm={setGoalForm} editingGoalId={editingGoalId} onSubmit={handleGoalSubmit} onEdit={editGoal} onDelete={deleteGoal} onDeposit={addGoalDeposit} />}

      {page === "limits" && <LimitsPage limitForm={limitForm} setLimitForm={setLimitForm} categoryUsage={categoryUsage} onSubmit={handleLimitSubmit} onDelete={deleteLimit} expenseByCategory={expenseByCategory} />}

      {page === "cards" && <CardsPage cardForm={cardForm} setCardForm={setCardForm} editingCardId={editingCardId} onSubmit={handleCardSubmit} onEdit={editCard} onDelete={deleteCard} cardUsage={cardUsage} transactions={monthTransactions} selectedMonth={selectedMonth} />}

      {page === "recurring" && (
        <RecurringPage
          recurringForm={recurringForm}
          setRecurringForm={setRecurringForm}
          recurringItems={recurringItems}
          onSubmit={handleRecurringSubmit}
          onToggle={toggleRecurring}
          onDelete={deleteRecurring}
          onGenerate={generateRecurringForMonth}
          selectedMonth={selectedMonth}
        />
      )}

      {page === "calendar" && <FinancialCalendarPage selectedMonth={selectedMonth} events={calendarEvents} />}

      {page === "annual" && <AnnualDashboardPage selectedYear={selectedYear} setSelectedYear={setSelectedYear} years={availableYears} data={annualMonthlyData} summary={annualSummary} />}

      {page === "reports" && <ReportsPage summary={summary} selectedMonth={selectedMonth} visibleTransactions={visibleTransactions} topExpenses={topExpenses} goals={goals} exportCSV={exportCSV} exportPDF={exportPDF} exportBackup={exportBackup} />}

      {page === "profile" && <ProfilePage user={user} profileName={profileName} setProfileName={setProfileName} onSubmit={updateProfile} />}

      {page === "settings" && <SettingsPage preferencesForm={preferencesForm} setPreferencesForm={setPreferencesForm} onSubmit={savePreferences} exportBackup={exportBackup} importBackup={importBackup} deleteAllUserData={deleteAllUserData} />}

      <MobileBottomNav tabs={tabs} page={page} setPage={setPage} />
    </div>
  );
}



function MobileBottomNav({ tabs, page, setPage }) {
  const allowed = ["dashboard", "transactions", "goals", "cards", "reports"];
  const mobileTabs = tabs.filter((tab) => allowed.includes(tab.key));
  return (
    <nav className="mobile-bottom-nav" aria-label="Menu rápido mobile">
      {mobileTabs.map((tab) => (
        <button key={tab.key} onClick={() => setPage(tab.key)} className={classNames("mobile-bottom-button", page === tab.key && "mobile-bottom-active")}>
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
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

function DashboardOverview({ summary, expenseByCategory, dailyFlow, monthlyComparison, topExpenses, goals, selectedMonth, setPage, insights, cardUsage, healthStatus }) {
  const topExpense = expenseByCategory[0];
  const nextGoal = goals[0];

  return (
    <main className="grid gap-6">
      <FinancialHealthCard healthStatus={healthStatus} summary={summary} setPage={setPage} />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Receitas" value={money.format(summary.income)} icon={<ArrowUpCircle />} tone="emerald" />
        <MetricCard title="Despesas" value={money.format(summary.expense)} icon={<ArrowDownCircle />} tone="rose" />
        <MetricCard title="Saldo do mês" value={money.format(summary.balance)} icon={<Wallet />} tone={summary.balance >= 0 ? "blue" : "rose"} />
        <MetricCard title="Economia" value={`${summary.savingRate}%`} icon={<PiggyBank />} tone="amber" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <InsightsCard insights={insights} />
        <CardsUsageMini cardUsage={cardUsage} setPage={setPage} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Gastos por categoria" subtitle={topExpense ? `Maior gasto: ${topExpense.name}` : "Sem despesas neste mês"}>
          {expenseByCategory.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={expenseByCategory} innerRadius={70} outerRadius={105} paddingAngle={3} dataKey="value" nameKey="name">
                  {expenseByCategory.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip cursor={false} contentStyle={tooltipStyle()} formatter={(value) => money.format(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="Cadastre uma despesa para o gráfico aparecer." />
          )}
        </ChartCard>

        <ChartCard title="Fluxo diário" subtitle={`Receitas e despesas em ${monthLabel(selectedMonth)}`}>
          {dailyFlow.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailyFlow}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fill: "var(--muted)" }} axisLine={{ stroke: "var(--border)" }} tickLine={{ stroke: "var(--border)" }} />
                <YAxis tickFormatter={(value) => `R$${value}`} tick={{ fill: "var(--muted)" }} axisLine={{ stroke: "var(--border)" }} tickLine={{ stroke: "var(--border)" }} />
                <Tooltip cursor={false} contentStyle={tooltipStyle()} formatter={(value) => money.format(value)} />
                <Bar dataKey="income" name="Receita" fill="#059669" radius={[8, 8, 0, 0]} />
                <Bar dataKey="expense" name="Despesa" fill="#e11d48" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="Sem lançamentos para este mês." />
          )}
        </ChartCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <ChartCard title="Comparação mensal" subtitle="Últimos meses com movimentação">
          {monthlyComparison.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyComparison}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fill: "var(--muted)" }} />
                <YAxis tickFormatter={(value) => `R$${value}`} tick={{ fill: "var(--muted)" }} />
                <Tooltip cursor={false} contentStyle={tooltipStyle()} formatter={(value) => money.format(value)} />
                <Bar dataKey="income" name="Receita" fill="#059669" radius={[8, 8, 0, 0]} />
                <Bar dataKey="expense" name="Despesa" fill="#e11d48" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="Sem dados suficientes para comparar meses." />
          )}
        </ChartCard>

        <section className="surface-card rounded-[2rem] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">Top 5 gastos</h2>
              <p className="muted-text text-sm">Maiores despesas do mês</p>
            </div>
            <button onClick={() => setPage("transactions")} className="ghost-button rounded-xl px-3 py-2 text-sm font-bold">Ver todos</button>
          </div>
          <div className="space-y-3">
            {topExpenses.length ? (
              topExpenses.map((item, index) => (
                <div key={item.id} className="transaction-row flex items-center justify-between rounded-2xl p-3">
                  <div>
                    <strong>{index + 1}. {item.description}</strong>
                    <p className="muted-text text-sm">{item.category}</p>
                  </div>
                  <strong className="text-rose-500">{money.format(item.amount)}</strong>
                </div>
              ))
            ) : (
              <EmptyState text="Nenhuma despesa cadastrada neste mês." />
            )}
          </div>
        </section>
      </section>

      {nextGoal && (
        <section className="surface-card rounded-[2rem] p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black">Meta em destaque: {nextGoal.title}</h2>
              <p className="muted-text text-sm">{money.format(nextGoal.current_amount)} de {money.format(nextGoal.target_amount)}</p>
            </div>
            <button onClick={() => setPage("goals")} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white">Acompanhar metas</button>
          </div>
          <ProgressBar value={nextGoal.current_amount} max={nextGoal.target_amount} />
        </section>
      )}
    </main>
  );
}

function TransactionsPage({ form, setForm, resetForm, onSubmit, visibleTransactions, allCategories, query, setQuery, categoryFilter, setCategoryFilter, typeFilter, setTypeFilter, cardFilter, setCardFilter, sortBy, setSortBy, onEdit, onDelete, onDuplicate, exportCSV, creditCards }) {
  return (
    <main className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <section className="surface-card rounded-[2rem] p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">Novo lançamento</h2>
            <p className="muted-text text-sm">Registre receita ou despesa.</p>
          </div>
          <button onClick={resetForm} className="ghost-button rounded-xl px-3 py-2 text-sm font-bold">Limpar</button>
        </div>

        <TransactionForm form={form} setForm={setForm} onSubmit={onSubmit} editingId={null} creditCards={creditCards} />
      </section>

      <section className="surface-card rounded-[2rem] p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black">Lançamentos</h2>
            <p className="muted-text text-sm">Filtre, ordene, edite ou exclua registros.</p>
          </div>
          <button onClick={exportCSV} className="outline-button inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-black transition">
            <Download size={17} /> Exportar CSV
          </button>
        </div>

        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_160px_160px_170px_170px]">
          <label className="field-shell flex items-center gap-2 rounded-2xl px-3 py-2">
            <Search size={17} className="muted-icon" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por descrição, categoria..." className="w-full bg-transparent text-sm outline-none" />
          </label>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="input">
            {allCategories.map((category) => <option key={category}>{category}</option>)}
          </select>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="input">
            <option value="all">Todos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
          </select>
          <select value={cardFilter} onChange={(event) => setCardFilter(event.target.value)} className="input">
            <option value="all">Todos os cartões</option>
            <option value="none">Sem cartão</option>
            {creditCards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
          </select>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="input">
            <option value="recent">Mais recente</option>
            <option value="oldest">Mais antigo</option>
            <option value="highest">Maior valor</option>
            <option value="lowest">Menor valor</option>
          </select>
        </div>

        <div className="space-y-3">
          {visibleTransactions.length ? visibleTransactions.map((item) => <TransactionRow key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} />) : <EmptyState title="Nenhum lançamento encontrado" text="Tente limpar filtros ou cadastrar uma nova receita/despesa." />}
        </div>
      </section>
    </main>
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
          if (next.method === "Crédito") next.method = "Pix";
        }
      }

      if (field === "method" && value !== "Crédito") {
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
      onClick={onClose}
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

          <div className="relative z-10 mt-6 grid gap-3 sm:grid-cols-3">
            <div className="edit-summary-card rounded-2xl p-4">
              <span className="block text-xs font-black uppercase tracking-wide text-slate-400">Tipo atual</span>
              <strong className={classNames("mt-1 flex items-center gap-2 text-lg", isIncome ? "text-emerald-300" : "text-rose-300")}>
                {isIncome ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                {typeLabel}
              </strong>
            </div>
            <div className="edit-summary-card rounded-2xl p-4">
              <span className="block text-xs font-black uppercase tracking-wide text-slate-400">Valor</span>
              <strong className="mt-1 block text-lg">{form.amount ? money.format(toNumber(form.amount)) : "R$ 0,00"}</strong>
            </div>
            <div className="edit-summary-card rounded-2xl p-4">
              <span className="block text-xs font-black uppercase tracking-wide text-slate-400">Data</span>
              <strong className="mt-1 block text-lg">{form.date ? formatDateBR(form.date) : "Sem data"}</strong>
            </div>
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

            {form.method === "Crédito" && form.type === "expense" && (
              <Field label="Cartão de crédito">
                <select value={form.card_id} onChange={(event) => update("card_id", event.target.value)} className="input input-lg">
                  <option value="">Sem cartão vinculado</option>
                  {creditCards.filter((card) => card.is_active).map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
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
          if (next.method === "Crédito") next.method = "Pix";
        }
      }

      if (field === "method" && value !== "Crédito") {
        next.card_id = "";
        next.is_installment = false;
        next.installments = "1";
      }

      return next;
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-sm font-black">Tipo do lançamento</span>
          <span className={classNames("rounded-full px-3 py-1 text-xs font-black", form.type === "income" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
            {form.type === "income" ? "Receita" : "Despesa"}
          </span>
        </div>
        <TypeSwitch value={form.type} onChange={(value) => update("type", value)} />
      </div>

      <Field label="Descrição"><input value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Ex.: Mercado, salário, boleto..." className="input" /></Field>

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

      {form.method === "Crédito" && form.type === "expense" && (
        <Field label="Cartão de crédito">
          <select value={form.card_id} onChange={(event) => update("card_id", event.target.value)} className="input">
            <option value="">Sem cartão vinculado</option>
            {creditCards.filter((card) => card.is_active).map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
          </select>
        </Field>
      )}

      {form.type === "expense" && (
        <div className="field-shell rounded-2xl p-3">
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

      <Field label="Observações"><textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Opcional" className="input min-h-24" /></Field>

      <button className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white shadow-sm transition hover:scale-[1.01] hover:bg-emerald-700">
        <Plus size={18} /> {editingId ? "Salvar alteração" : "Adicionar lançamento"}
      </button>
    </form>
  );
}

function GoalsPage({ goals, goalForm, setGoalForm, editingGoalId, onSubmit, onEdit, onDelete, onDeposit }) {
  function update(field, value) {
    setGoalForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <main className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <section className="surface-card rounded-[2rem] p-5 shadow-sm">
        <h2 className="text-xl font-black">{editingGoalId ? "Editar meta" : "Nova meta"}</h2>
        <p className="muted-text mb-5 text-sm">Planeje seus objetivos financeiros.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Nome da meta"><input value={goalForm.title} onChange={(event) => update("title", event.target.value)} className="input" placeholder="Ex.: Reserva de emergência" /></Field>
          <Field label="Valor alvo"><input type="number" min="0" step="0.01" value={goalForm.target_amount} onChange={(event) => update("target_amount", event.target.value)} className="input" placeholder="0,00" /></Field>
          <Field label="Valor atual"><input type="number" min="0" step="0.01" value={goalForm.current_amount} onChange={(event) => update("current_amount", event.target.value)} className="input" placeholder="0,00" /></Field>
          <Field label="Prazo"><DateInput value={goalForm.deadline} onChange={(value) => update("deadline", value)} /></Field>
          <button className="w-full rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white">{editingGoalId ? "Salvar meta" : "Criar meta"}</button>
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

function RecurringPage({ recurringForm, setRecurringForm, recurringItems, onSubmit, onToggle, onDelete, onGenerate, selectedMonth }) {
  function update(field, value) {
    setRecurringForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <main className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <section className="surface-card rounded-[2rem] p-5 shadow-sm">
        <h2 className="text-xl font-black">Receitas e despesas fixas</h2>
        <p className="muted-text mb-5 text-sm">Cadastre itens que se repetem mensalmente.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="segmented-control grid grid-cols-2 gap-2 rounded-2xl p-1">
            <button type="button" onClick={() => update("type", "expense")} className={classNames("rounded-xl px-3 py-2 text-sm font-black transition", recurringForm.type === "expense" ? "segmented-active text-rose-500 shadow-sm" : "muted-text")}>Despesa</button>
            <button type="button" onClick={() => update("type", "income")} className={classNames("rounded-xl px-3 py-2 text-sm font-black transition", recurringForm.type === "income" ? "segmented-active text-emerald-500 shadow-sm" : "muted-text")}>Receita</button>
          </div>
          <Field label="Descrição"><input value={recurringForm.description} onChange={(event) => update("description", event.target.value)} className="input" placeholder="Ex.: Internet, salário..." /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor"><input type="number" min="0" step="0.01" value={recurringForm.amount} onChange={(event) => update("amount", event.target.value)} className="input" /></Field>
            <Field label="Dia do mês"><input type="number" min="1" max="31" value={recurringForm.day_of_month} onChange={(event) => update("day_of_month", event.target.value)} className="input" /></Field>
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
          <button className="w-full rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white">Cadastrar recorrência</button>
        </form>
      </section>

      <section className="surface-card rounded-[2rem] p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black">Itens fixos</h2>
            <p className="muted-text text-sm">Gere os lançamentos de {monthLabel(selectedMonth)}.</p>
          </div>
          <button onClick={onGenerate} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white">Gerar mês</button>
        </div>
        <div className="space-y-3">
          {recurringItems.length ? recurringItems.map((item) => <RecurringRow key={item.id} item={item} onToggle={onToggle} onDelete={onDelete} />) : <EmptyState text="Nenhum item recorrente cadastrado." />}
        </div>
      </section>
    </main>
  );
}

function RecurringRow({ item, onToggle, onDelete }) {
  return (
    <article className="transaction-row flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="font-black">{item.description}</h3>
        <p className="muted-text text-sm">{item.category} · dia {item.day_of_month} · {item.method}</p>
      </div>
      <div className="flex items-center gap-3">
        <strong className={item.type === "income" ? "text-emerald-500" : "text-rose-500"}>{item.type === "income" ? "+" : "-"} {money.format(item.amount)}</strong>
        <button onClick={() => onToggle(item)} className="outline-button rounded-xl px-3 py-2 text-sm font-bold">{item.is_active ? "Ativo" : "Inativo"}</button>
        <button onClick={() => onDelete(item.id)} className="icon-button rounded-xl p-2 hover:text-rose-500"><Trash2 size={17} /></button>
      </div>
    </article>
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
  return (
    <section className="surface-card rounded-[2rem] p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-400"><Bell size={20} /></div>
        <div>
          <h2 className="text-xl font-black">Alertas importantes</h2>
          <p className="muted-text text-sm">Pontos que merecem sua atenção agora.</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {notifications.map((item) => (
          <div key={`${item.title}-${item.text}`} className="transaction-row rounded-2xl p-4">
            <strong className={classNames("block", item.tone === "rose" ? "text-rose-400" : item.tone === "amber" ? "text-amber-400" : "text-blue-400")}>{item.title}</strong>
            <p className="muted-text mt-1 text-sm leading-6">{item.text}</p>
          </div>
        ))}
      </div>
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

function CardsPage({ cardForm, setCardForm, editingCardId, onSubmit, onEdit, onDelete, cardUsage, transactions, selectedMonth }) {
  const [selectedCardId, setSelectedCardId] = useState(cardUsage[0]?.id || "");

  useEffect(() => {
    if (!selectedCardId && cardUsage[0]?.id) setSelectedCardId(cardUsage[0].id);
    if (selectedCardId && !cardUsage.some((card) => card.id === selectedCardId)) setSelectedCardId(cardUsage[0]?.id || "");
  }, [cardUsage, selectedCardId]);

  function update(field, value) {
    setCardForm((current) => ({ ...current, [field]: value }));
  }

  const selectedCard = cardUsage.find((card) => card.id === selectedCardId) || cardUsage[0];
  const invoiceTransactions = selectedCard ? transactions.filter((item) => item.card_id === selectedCard.id && item.type === "expense") : [];

  return (
    <main className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <section className="surface-card rounded-[2rem] p-5 shadow-sm">
        <h2 className="text-xl font-black">{editingCardId ? "Editar cartão" : "Novo cartão"}</h2>
        <p className="muted-text mb-5 text-sm">Controle limite, fechamento e vencimento.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Nome do cartão"><input value={cardForm.name} onChange={(event) => update("name", event.target.value)} className="input" placeholder="Ex.: Nubank" /></Field>
          <Field label="Limite total"><input type="number" min="0" step="0.01" value={cardForm.card_limit} onChange={(event) => update("card_limit", event.target.value)} className="input" placeholder="0,00" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fechamento"><input type="number" min="1" max="31" value={cardForm.closing_day} onChange={(event) => update("closing_day", event.target.value)} className="input" /></Field>
            <Field label="Vencimento"><input type="number" min="1" max="31" value={cardForm.due_day} onChange={(event) => update("due_day", event.target.value)} className="input" /></Field>
          </div>
          <Field label="Cor"><input type="color" value={cardForm.color} onChange={(event) => update("color", event.target.value)} className="input h-14" /></Field>
          <label className="field-shell flex items-center gap-3 rounded-2xl p-3 text-sm font-bold">
            <input type="checkbox" checked={cardForm.is_active} onChange={(event) => update("is_active", event.target.checked)} /> Cartão ativo
          </label>
          <button className="w-full rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white">{editingCardId ? "Salvar cartão" : "Criar cartão"}</button>
        </form>
      </section>
      <section className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2">
          {cardUsage.length ? cardUsage.map((card) => (
            <CreditCardCard
              key={card.id}
              card={card}
              onEdit={onEdit}
              onDelete={onDelete}
              selected={card.id === selectedCard?.id}
              onSelect={() => setSelectedCardId(card.id)}
            />
          )) : <EmptyState title="Nenhum cartão cadastrado" text="Cadastre seus cartões para acompanhar limite, fatura e vencimento." />}
        </div>
        {cardUsage.length > 0 && (
          <CreditCardInvoicePanel card={selectedCard} transactions={invoiceTransactions} selectedMonth={selectedMonth} />
        )}
      </section>
    </main>
  );
}

function CreditCardCard({ card, onEdit, onDelete, selected, onSelect }) {
  return (
    <article className={classNames("surface-card rounded-[2rem] p-5 shadow-sm", selected && "selected-card")}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 h-3 w-12 rounded-full" style={{ background: card.color || "#059669" }} />
          <h3 className="text-lg font-black">{card.name}</h3>
          <p className="muted-text text-sm">Fecha dia {card.closing_day || "-"} · vence dia {card.due_day || "-"}</p>
        </div>
        <div className="flex gap-1">
          <button onClick={onSelect} className="icon-button rounded-xl p-2" title="Ver fatura"><Eye size={17} /></button>
          <button onClick={() => onEdit(card)} className="icon-button rounded-xl p-2"><Edit3 size={17} /></button>
          <button onClick={() => onDelete(card.id)} className="icon-button rounded-xl p-2 hover:text-rose-500"><Trash2 size={17} /></button>
        </div>
      </div>
      <ProgressBar value={card.spent} max={card.card_limit || 1} danger={card.percent >= 90} />
      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div><span className="muted-text block">Usado</span><strong>{money.format(card.spent)}</strong></div>
        <div><span className="muted-text block">Limite</span><strong>{money.format(card.card_limit)}</strong></div>
        <div><span className="muted-text block">Livre</span><strong>{money.format(card.available)}</strong></div>
      </div>
    </article>
  );
}

function CreditCardInvoicePanel({ card, transactions, selectedMonth }) {
  if (!card) return null;
  const total = transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return (
    <section className="surface-card rounded-[2rem] p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black">Fatura do cartão {card.name}</h2>
          <p className="muted-text text-sm">Lançamentos de crédito em {monthLabel(selectedMonth)}.</p>
        </div>
        <div className="grid gap-1 text-right text-sm">
          <strong className="text-rose-500">{money.format(total)}</strong>
          <span className="muted-text">{transactions.length} lançamento(s)</span>
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <MiniInfo label="Limite" value={money.format(card.card_limit)} />
        <MiniInfo label="Usado" value={money.format(card.spent)} />
        <MiniInfo label="Disponível" value={money.format(card.available)} />
        <MiniInfo label="Vencimento" value={`Dia ${card.due_day || "-"}`} />
      </div>

      <div className="space-y-3">
        {transactions.length ? transactions.map((item) => (
          <div key={item.id} className="transaction-row flex flex-col gap-2 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <strong>{item.description}</strong>
              <p className="muted-text text-sm">{item.category} · {formatDateBR(item.date)} {item.installment_total ? `· ${item.installment_number}/${item.installment_total}` : ""}</p>
            </div>
            <strong className="text-rose-500">{money.format(item.amount)}</strong>
          </div>
        )) : <EmptyState title="Fatura vazia" text="Nenhuma despesa de crédito vinculada a este cartão no mês selecionado." />}
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


function AnnualDashboardPage({ selectedYear, setSelectedYear, years, data, summary }) {
  return (
    <main className="grid gap-6">
      <section className="surface-card rounded-[2rem] p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black">Dashboard anual</h2>
            <p className="muted-text text-sm">Visão consolidada de janeiro a dezembro.</p>
          </div>
          <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} className="input max-w-40">
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <MetricCard title="Receitas no ano" value={money.format(summary.income)} icon={<ArrowUpCircle />} tone="emerald" />
          <MetricCard title="Despesas no ano" value={money.format(summary.expense)} icon={<ArrowDownCircle />} tone="rose" />
          <MetricCard title="Saldo anual" value={money.format(summary.balance)} icon={<Wallet />} tone={summary.balance >= 0 ? "blue" : "rose"} />
          <MetricCard title="Média mensal" value={money.format(summary.averageSaving)} icon={<PiggyBank />} tone="amber" />
        </section>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fill: "var(--muted)" }} />
            <YAxis tickFormatter={(value) => `R$${value}`} tick={{ fill: "var(--muted)" }} />
            <Tooltip cursor={false} contentStyle={tooltipStyle()} formatter={(value) => money.format(value)} />
            <Bar dataKey="income" name="Receita" fill="#059669" radius={[8, 8, 0, 0]} />
            <Bar dataKey="expense" name="Despesa" fill="#e11d48" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
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

function ReportsPage({ summary, selectedMonth, visibleTransactions, topExpenses, goals, exportCSV, exportPDF, exportBackup }) {
  return (
    <main className="grid gap-6">
      <section className="surface-card rounded-[2rem] p-6 shadow-sm">
        <h2 className="text-2xl font-black">Relatórios</h2>
        <p className="muted-text mt-2">Gere arquivos para guardar, enviar ou analisar fora do sistema.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={exportCSV} className="rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white"><Download className="mr-2 inline" size={18} /> Exportar CSV</button>
          <button onClick={exportPDF} className="outline-button rounded-2xl px-5 py-3 font-black"><FileText className="mr-2 inline" size={18} /> Gerar PDF</button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard title={`Receitas em ${monthLabel(selectedMonth)}`} value={money.format(summary.income)} icon={<ArrowUpCircle />} tone="emerald" />
        <MetricCard title="Despesas" value={money.format(summary.expense)} icon={<ArrowDownCircle />} tone="rose" />
        <MetricCard title="Saldo" value={money.format(summary.balance)} icon={<Wallet />} tone={summary.balance >= 0 ? "blue" : "rose"} />
        <MetricCard title="Lançamentos" value={String(visibleTransactions.length)} icon={<FileText />} tone="amber" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <InfoList title="Top gastos do mês" items={topExpenses.map((item) => `${item.description} — ${money.format(item.amount)}`)} empty="Sem despesas no mês." />
        <InfoList title="Metas cadastradas" items={goals.map((goal) => `${goal.title} — ${money.format(goal.current_amount)} de ${money.format(goal.target_amount)}`)} empty="Sem metas cadastradas." />
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

  return (
    <div className="month-selector field-shell flex items-center gap-2 rounded-2xl px-3 py-2 text-sm">
      <CalendarDays size={17} />
      <select value={month} onChange={(event) => updateMonth(event.target.value)} className="month-select bg-transparent font-bold outline-none" aria-label="Selecionar mês">
        {monthOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
      <span className="muted-text font-bold">de</span>
      <select value={year} onChange={(event) => updateYear(event.target.value)} className="year-select bg-transparent font-bold outline-none" aria-label="Selecionar ano">
        {years.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
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

function MetricCard({ title, value, icon, tone }) {
  const tones = {
    emerald: "metric-emerald",
    rose: "metric-rose",
    blue: "metric-blue",
    amber: "metric-amber",
  };

  return (
    <article className="surface-card rounded-[2rem] p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="muted-text text-sm font-black">{title}</p>
        <div className={classNames("rounded-2xl p-2", tones[tone])}>{React.cloneElement(icon, { size: 22 })}</div>
      </div>
      <strong className="block text-2xl font-black tracking-tight">{value}</strong>
    </article>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <section className="surface-card rounded-[2rem] p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-black">{title}</h2>
        <p className="muted-text text-sm">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function TransactionRow({ item, onEdit, onDelete, onDuplicate }) {
  const isIncome = item.type === "income";

  return (
    <article className="transaction-row flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className={classNames("rounded-2xl p-2", isIncome ? "income-icon" : "expense-icon")}>
          {isIncome ? <ArrowUpCircle size={22} /> : <ArrowDownCircle size={22} />}
        </div>
        <div>
          <h3 className="font-black">{item.description}</h3>
          <p className="muted-text text-sm">{item.category} · {item.method} · {formatDateBR(item.date)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <strong className={classNames("text-lg", isIncome ? "text-emerald-500" : "text-rose-500")}>
          {isIncome ? "+" : "-"} {money.format(item.amount)}
        </strong>
        <div className="flex items-center gap-1">
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
      select option { background: var(--surface); color: var(--text); }
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
      .edit-summary-card { background: rgba(15, 23, 42, 0.58); border: 1px solid rgba(148, 163, 184, 0.14); box-shadow: inset 0 1px 0 rgba(255,255,255,0.04); }
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
      .transaction-row { background: var(--surface-2); border: 1px solid var(--border); color: var(--text); }
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
      .theme-light .empty-state { background: rgba(248, 250, 252, 0.85); }
      .theme-light .home-mini-card,
      .theme-light .home-stat-card { background: rgba(255, 255, 255, 0.82); }
      .theme-light .home-feature-card { background: rgba(255, 255, 255, 0.9); }
      .theme-light .theme-button { background: #0f172a; color: #ffffff; }
      .theme-light .outline-button:hover { background: #f0fdfa; border-color: rgba(16, 185, 129, 0.35); }

      @media (max-width: 640px) {
        .edit-modal-backdrop { align-items: flex-end; padding: 0.75rem; }
        .edit-modal-shell { max-height: calc(100vh - 1.5rem); border-radius: 1.75rem; }
        .edit-modal-hero { padding: 1.25rem; }
        .edit-modal-content { padding: 1.25rem; }
        .edit-modal-footer { padding: 0.9rem 1.25rem 1.05rem; }
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
    `}</style>
  );
}