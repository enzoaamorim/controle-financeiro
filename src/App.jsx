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
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authLoading && !firstLoadRef.current) {
      setScreen("home");
      firstLoadRef.current = true;
    }
  }, [authLoading]);

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

  async function handleSignOut() {
    await supabase.auth.signOut();
    setSession(null);
    setScreen("home");
  }

  if (authLoading) {
    return (
      <AppFrame darkMode={darkMode}>
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="surface-card rounded-[2rem] p-8 text-center shadow-sm">
            <img src={logoEA} alt="Logo" className="mx-auto mb-4 h-16 w-16 rounded-2xl" />
            <p className="font-bold">Carregando Controle Financeiro...</p>
          </div>
        </div>
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

function AppFrame({ darkMode, children }) {
  return (
    <div className={classNames("app-shell min-h-screen antialiased transition-colors duration-300", darkMode ? "theme-dark" : "theme-light")}>
      {children}
      <GlobalStyles />
    </div>
  );
}

function HomePage({ darkMode, setDarkMode, session, onStart, onLogin, onDashboard }) {
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

function AuthScreen({ mode, setMode, onBack, onSuccess, systemMessage }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(systemMessage || "");
  const [loading, setLoading] = useState(false);
  const isLogin = mode === "login";
  const isReset = mode === "reset";

  useEffect(() => {
    setMessage(systemMessage || "");
  }, [systemMessage]);

  async function handleAuth(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (isReset) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });

        if (error) throw error;
        setMessage("Enviamos um link de recuperação para o seu e-mail.");
        return;
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSuccess();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (error) throw error;

      if (data?.session) {
        onSuccess();
      } else {
        setMessage("Cadastro criado. Se o Supabase pedir confirmação, valide seu e-mail antes de entrar.");
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
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input" placeholder="seuemail@email.com" required />
          </Field>

          {!isReset && (
            <Field label="Senha">
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="input" placeholder="Digite sua senha" minLength={6} required />
            </Field>
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
  const [toast, setToast] = useState("");
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

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(""), 3200);
  }

  async function loadAllData() {
    setLoadingData(true);
    setToast("");

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
          .insert({ user_id: user.id })
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
  }, [monthTransactions, categoryFilter, typeFilter, query, sortBy]);

  const summary = useMemo(() => {
    const income = monthTransactions.filter((item) => item.type === "income").reduce((total, item) => total + Number(item.amount), 0);
    const expense = monthTransactions.filter((item) => item.type === "expense").reduce((total, item) => total + Number(item.amount), 0);
    const balance = income - expense;
    const savingRate = income > 0 ? Math.round((balance / income) * 100) : 0;
    return { income, expense, balance, savingRate };
  }, [monthTransactions]);

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
    if (categoryUsage.some((item) => item.exceeded)) insights.push(`Há categorias acima do limite: ${categoryUsage.filter((item) => item.exceeded).map((item) => item.category).join(", ")}.`);
    const closeGoal = goals.find((goal) => goal.target_amount > 0 && goal.current_amount / goal.target_amount >= 0.8 && goal.current_amount < goal.target_amount);
    if (closeGoal) insights.push(`Você está perto de concluir a meta "${closeGoal.title}".`);
    if (!insights.length) insights.push("Cadastre mais lançamentos para receber insights automáticos sobre sua rotina financeira.");
    return insights.slice(0, 4);
  }, [summary, previousSummary, topExpenses, categoryUsage, goals]);

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
      if (editingId) {
        const { error } = await supabase.from("transactions").update(payload).eq("id", editingId).eq("user_id", user.id);
        if (error) throw error;
        showToast("Lançamento atualizado com sucesso.");
      } else if (installments > 1) {
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
    setEditingId(null);
  }

  function handleEditTransaction(item) {
    setEditingId(item.id);
    setForm({
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

  async function handleDeleteTransaction(id) {
    const confirmed = window.confirm("Tem certeza que deseja excluir este lançamento?");
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
      showToast("Lançamento excluído com sucesso.");
      await loadAllData();
    } catch (error) {
      showToast(`Erro ao excluir: ${error.message}`);
    }
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

  async function deleteGoal(id) {
    if (!window.confirm("Deseja excluir esta meta?")) return;
    const { error } = await supabase.from("goals").delete().eq("id", id).eq("user_id", user.id);
    if (error) showToast(`Erro ao excluir meta: ${error.message}`);
    else {
      showToast("Meta excluída.");
      await loadAllData();
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

  async function deleteLimit(id) {
    if (!window.confirm("Deseja excluir este limite?")) return;
    const { error } = await supabase.from("category_limits").delete().eq("id", id).eq("user_id", user.id);
    if (error) showToast(`Erro ao excluir limite: ${error.message}`);
    else {
      showToast("Limite excluído.");
      await loadAllData();
    }
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

  async function deleteRecurring(id) {
    if (!window.confirm("Deseja excluir este item recorrente?")) return;
    const { error } = await supabase.from("recurring_items").delete().eq("id", id).eq("user_id", user.id);
    if (error) showToast(`Erro ao excluir recorrência: ${error.message}`);
    else {
      showToast("Item recorrente excluído.");
      await loadAllData();
    }
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

  async function deleteCard(id) {
    if (!window.confirm("Deseja excluir este cartão? Os lançamentos vinculados continuam salvos, mas sem cartão.")) return;
    const { error } = await supabase.from("credit_cards").delete().eq("id", id).eq("user_id", user.id);
    if (error) showToast(`Erro ao excluir cartão: ${error.message}`);
    else {
      showToast("Cartão excluído.");
      await loadAllData();
    }
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
  }

  async function importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!window.confirm("Importar backup pode duplicar registros se eles já existirem. Deseja continuar?")) return;
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
      showToast("Backup importado com sucesso.");
      await loadAllData();
    } catch (error) {
      showToast(`Erro ao importar backup: ${error.message}`);
    } finally {
      event.target.value = "";
    }
  }

  async function deleteAllUserData() {
    if (!window.confirm("Tem certeza? Isso apagará seus lançamentos, metas, limites, fixos e cartões.")) return;
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
      showToast("Dados apagados com sucesso.");
      await loadAllData();
    } catch (error) {
      showToast(`Erro ao apagar dados: ${error.message}`);
    }
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
  }

  function exportPDF() {
    const html = `
      <html>
        <head>
          <title>Relatório ${monthLabel(selectedMonth)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; padding: 32px; }
            h1 { margin-bottom: 4px; }
            .muted { color: #64748b; }
            .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 24px 0; }
            .card { border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border-bottom: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 12px; }
            th { background: #f8fafc; }
            .section { margin-top: 32px; }
          </style>
        </head>
        <body>
          <h1>Controle Financeiro | ${userName}</h1>
          <p class="muted">Relatório de ${monthLabel(selectedMonth)} · Usuário: ${user.email}</p>
          <div class="cards">
            <div class="card"><strong>Receitas</strong><br/>${money.format(summary.income)}</div>
            <div class="card"><strong>Despesas</strong><br/>${money.format(summary.expense)}</div>
            <div class="card"><strong>Saldo</strong><br/>${money.format(summary.balance)}</div>
            <div class="card"><strong>Economia</strong><br/>${summary.savingRate}%</div>
          </div>
          <div class="section">
            <h2>Lançamentos</h2>
            <table>
              <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Categoria</th><th>Valor</th></tr></thead>
              <tbody>
                ${visibleTransactions
                  .map(
                    (item) => `<tr><td>${formatDateBR(item.date)}</td><td>${item.type === "income" ? "Receita" : "Despesa"}</td><td>${item.description}</td><td>${item.category}</td><td>${money.format(item.amount)}</td></tr>`
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
          <div class="section">
            <h2>Top gastos</h2>
            <ul>${topExpenses.map((item) => `<li>${item.description} - ${money.format(item.amount)}</li>`).join("") || "<li>Sem despesas no mês.</li>"}</ul>
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
    window.setTimeout(() => reportWindow.print(), 400);
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

  if (loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="surface-card rounded-[2rem] p-8 text-center shadow-sm">
          <img src={logoEA} alt="Logo" className="mx-auto mb-4 h-16 w-16 rounded-2xl" />
          <p className="font-bold">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      {toast && (
        <div className="fixed right-4 top-4 z-50 flex max-w-md items-start gap-3 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-xl">
          <CheckCircle2 size={18} /> <span>{toast}</span>
        </div>
      )}

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
          <button onClick={onSignOut} className="signout-button dashboard-action-button inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-black transition">
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
        />
      )}

      {page === "transactions" && (
        <TransactionsPage
          form={form}
          setForm={setForm}
          editingId={editingId}
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
          sortBy={sortBy}
          setSortBy={setSortBy}
          onEdit={handleEditTransaction}
          onDelete={handleDeleteTransaction}
          exportCSV={exportCSV}
          creditCards={creditCards}
        />
      )}

      {page === "goals" && <GoalsPage goals={goals} goalForm={goalForm} setGoalForm={setGoalForm} editingGoalId={editingGoalId} onSubmit={handleGoalSubmit} onEdit={editGoal} onDelete={deleteGoal} />}

      {page === "limits" && <LimitsPage limitForm={limitForm} setLimitForm={setLimitForm} categoryUsage={categoryUsage} onSubmit={handleLimitSubmit} onDelete={deleteLimit} expenseByCategory={expenseByCategory} />}

      {page === "cards" && <CardsPage cardForm={cardForm} setCardForm={setCardForm} editingCardId={editingCardId} onSubmit={handleCardSubmit} onEdit={editCard} onDelete={deleteCard} cardUsage={cardUsage} />}

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
    </div>
  );
}

function AlertIcon() {
  return <span className="mt-0.5 inline-flex rounded-xl bg-amber-500/20 p-2 text-amber-300">!</span>;
}

function DashboardOverview({ summary, expenseByCategory, dailyFlow, monthlyComparison, topExpenses, goals, selectedMonth, setPage, insights, cardUsage }) {
  const topExpense = expenseByCategory[0];
  const nextGoal = goals[0];

  return (
    <main className="grid gap-6">
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

function TransactionsPage({ form, setForm, editingId, resetForm, onSubmit, visibleTransactions, allCategories, query, setQuery, categoryFilter, setCategoryFilter, typeFilter, setTypeFilter, sortBy, setSortBy, onEdit, onDelete, exportCSV, creditCards }) {
  return (
    <main className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <section className="surface-card rounded-[2rem] p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">{editingId ? "Editar lançamento" : "Novo lançamento"}</h2>
            <p className="muted-text text-sm">Registre receita ou despesa.</p>
          </div>
          {editingId && <button onClick={resetForm} className="ghost-button rounded-xl px-3 py-2 text-sm font-bold">Cancelar</button>}
        </div>

        <TransactionForm form={form} setForm={setForm} onSubmit={onSubmit} editingId={editingId} creditCards={creditCards} />
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

        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_170px_170px_170px]">
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
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="input">
            <option value="recent">Mais recente</option>
            <option value="oldest">Mais antigo</option>
            <option value="highest">Maior valor</option>
            <option value="lowest">Menor valor</option>
          </select>
        </div>

        <div className="space-y-3">
          {visibleTransactions.length ? visibleTransactions.map((item) => <TransactionRow key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />) : <EmptyState text="Nenhum lançamento encontrado com esses filtros." />}
        </div>
      </section>
    </main>
  );
}

function TransactionForm({ form, setForm, onSubmit, editingId, creditCards = [] }) {
  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="segmented-control grid grid-cols-2 gap-2 rounded-2xl p-1">
        <button type="button" onClick={() => update("type", "expense")} className={classNames("rounded-xl px-3 py-2 text-sm font-black transition", form.type === "expense" ? "segmented-active text-rose-500 shadow-sm" : "muted-text")}>Despesa</button>
        <button type="button" onClick={() => update("type", "income")} className={classNames("rounded-xl px-3 py-2 text-sm font-black transition", form.type === "income" ? "segmented-active text-emerald-500 shadow-sm" : "muted-text")}>Receita</button>
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

      {form.method === "Crédito" && (
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

function GoalsPage({ goals, goalForm, setGoalForm, editingGoalId, onSubmit, onEdit, onDelete }) {
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
        {goals.length ? goals.map((goal) => <GoalCard key={goal.id} goal={goal} onEdit={onEdit} onDelete={onDelete} />) : <EmptyState text="Você ainda não cadastrou nenhuma meta financeira." />}
      </section>
    </main>
  );
}

function GoalCard({ goal, onEdit, onDelete }) {
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

function CardsPage({ cardForm, setCardForm, editingCardId, onSubmit, onEdit, onDelete, cardUsage }) {
  function update(field, value) {
    setCardForm((current) => ({ ...current, [field]: value }));
  }
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
      <section className="grid gap-4 md:grid-cols-2">
        {cardUsage.length ? cardUsage.map((card) => <CreditCardCard key={card.id} card={card} onEdit={onEdit} onDelete={onDelete} />) : <EmptyState text="Você ainda não cadastrou cartões." />}
      </section>
    </main>
  );
}

function CreditCardCard({ card, onEdit, onDelete }) {
  return (
    <article className="surface-card rounded-[2rem] p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 h-3 w-12 rounded-full" style={{ background: card.color || "#059669" }} />
          <h3 className="text-lg font-black">{card.name}</h3>
          <p className="muted-text text-sm">Fecha dia {card.closing_day || "-"} · vence dia {card.due_day || "-"}</p>
        </div>
        <div className="flex gap-1">
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

function TransactionRow({ item, onEdit, onDelete }) {
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

function EmptyState({ text }) {
  return <div className="empty-state flex min-h-[130px] items-center justify-center rounded-2xl p-6 text-center text-sm font-semibold">{text}</div>;
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
      input, select, button { color: inherit; }
      button, select, input[type="button"], input[type="submit"], .carousel-button, .carousel-dot { cursor: pointer; }
      button:disabled, input:disabled, select:disabled { cursor: not-allowed; }
      input::placeholder { color: var(--muted); }
      select option { background: var(--surface); color: var(--text); }
      .theme-button { background: var(--text); color: var(--bg); }
      .outline-button { border: 1px solid var(--border); color: var(--text); background: color-mix(in srgb, var(--surface) 86%, transparent); }
      .outline-button:hover, .ghost-button:hover, .icon-button:hover { background: var(--hover); }
      .ghost-button, .icon-button { color: var(--muted); transition: background-color 0.2s ease, color 0.2s ease; }
      .segmented-control { background: var(--surface-3); }
      .segmented-active { background: var(--surface); }
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
      .theme-light .transaction-row { background: #ffffff; }
      .theme-light .empty-state { background: rgba(248, 250, 252, 0.85); }
      .theme-light .home-mini-card,
      .theme-light .home-stat-card { background: rgba(255, 255, 255, 0.82); }
      .theme-light .home-feature-card { background: rgba(255, 255, 255, 0.9); }
      .theme-light .theme-button { background: #0f172a; color: #ffffff; }
      .theme-light .outline-button:hover { background: #f0fdfa; border-color: rgba(16, 185, 129, 0.35); }
      .month-selector { min-width: 260px; }
      .month-select { width: 100px; text-transform: lowercase; }
      .year-select { width: 78px; }
      @media (max-width: 640px) { .month-selector { min-width: 100%; } }
    `}</style>
  );
}