import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  Ellipsis,
  Filter,
  Scale,
  Eye,
  EyeOff,
  ImagePlus,
  LayoutGrid,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Plus,
  Receipt,
  Search,
  Settings,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import {
  addMonths,
  ATALHOS,
  categoriaInfo,
  dateKey,
  fromRow,
  MESES,
  money,
  monthKey,
  plural,
  SELECT_DESPESA,
  shortDate,
  soma,
  type Despesa,
  type DespesaValores,
} from "@/lib/financas";
import { CategoryBadge, Money, MonthNav } from "@/components/financas/ui";
import { DespesaForm, type AnexoAlteracao, type Serie } from "@/components/financas/DespesaForm";
import { DespesaDetalhe, type DeleteScope } from "@/components/financas/DespesaDetalhe";
import { DespesaItem, DespesasPorDia } from "@/components/financas/DespesasLista";
import { DespesasTabela } from "@/components/financas/DespesasTabela";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Procedimentos de Finanças" },
      {
        name: "description",
        content:
          "Cada real faz parte da sua história. Registre suas despesas e acompanhe seus gastos.",
      },
    ],
  }),
  component: App,
});

type View = "painel" | "despesas" | "gastos" | "nova" | "config";
type Filtro = "todas" | "pendentes" | "pagas" | "favoritas";
type Profile = {
  nome: string;
  cidade: string;
  foto_path: string | null;
  fotoUrl?: string | undefined;
};

const EMPTY_PROFILE: Profile = { nome: "", cidade: "", foto_path: null };
const PHOTO_URL_TTL = 60 * 60 * 24;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const RING = 2 * Math.PI * 50;
const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "pendentes", label: "Pendentes" },
  { id: "pagas", label: "Pagas" },
  { id: "favoritas", label: "Favoritas" },
];
const NAV = [
  { id: "painel", label: "Painel", icon: LayoutGrid },
  { id: "despesas", label: "Despesas", icon: Receipt },
  { id: "gastos", label: "Gastos", icon: Wallet },
] as const;

const byDate = (a: Despesa, b: Despesa) => a.data.localeCompare(b.data);

/** Foto salva em Configurações; sem foto, as iniciais do nome. */
function Avatar({
  profile,
  size,
  className,
}: {
  profile: Profile | null;
  size: number;
  className: string;
}) {
  if (profile?.fotoUrl)
    return <img className={className} src={profile.fotoUrl} alt="" width={size} height={size} />;
  const initials = (profile?.nome ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={`${className} avatar-initials`}
      style={{ fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setCheckingSession(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (checkingSession) return <AppLoading label="Abrindo suas finanças…" />;
  if (!session) return <LoginPage />;
  return (
    <Index
      userId={session.user.id}
      userEmail={session.user.email ?? ""}
      signupName={String(session.user.user_metadata?.["nome"] ?? "").trim()}
      onSignOut={() => void supabase.auth.signOut()}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Login e cadastro                                                    */
/* ------------------------------------------------------------------ */

/** Traduz o erro do Supabase Auth para a causa real, sem esconder o motivo. */
function authMessage(mode: "login" | "signup", message: string, code?: string) {
  const m = `${code ?? ""} ${message}`.toLowerCase();
  if (m.includes("not confirmed"))
    return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (m.includes("already registered") || m.includes("user_already_exists"))
    return "Este e-mail já tem conta neste app. Use Entrar.";
  if (m.includes("rate limit") || m.includes("over_email_send_rate_limit"))
    return "Limite de envio de e-mails atingido. Aguarde alguns minutos e tente de novo.";
  if (
    m.includes("sending") ||
    m.includes("not authorized") ||
    m.includes("email_address_not_authorized")
  )
    return "O Supabase não conseguiu enviar o e-mail de confirmação. Desative 'Confirm email' no projeto ou configure um SMTP.";
  if (m.includes("password"))
    return "Senha recusada: use pelo menos 8 caracteres, misturando letras e números.";
  if (m.includes("invalid") && m.includes("email")) return "Confira o endereço de e-mail.";
  if (mode === "login") return "E-mail ou senha incorretos. Confira os dados e tente novamente.";
  return `Não foi possível criar a conta: ${message}`;
}

function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previous = themeColor?.content;
    themeColor?.setAttribute("content", "#000000");
    return () => {
      if (themeColor && previous) themeColor.content = previous;
    };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "signup" && !name.trim()) {
      setError("Informe seu nome.");
      return;
    }
    setSending(true);
    setError("");
    setInfo("");
    const credentials = { email: email.trim(), password };
    const { data, error: authError } =
      mode === "signup"
        ? await supabase.auth.signUp({ ...credentials, options: { data: { nome: name.trim() } } })
        : await supabase.auth.signInWithPassword(credentials);
    setSending(false);
    if (authError) {
      setError(authMessage(mode, authError.message, authError.code));
      return;
    }
    // Projeto com "Confirm email" ligado: o cadastro não abre sessão até a confirmação.
    // Com "Confirm email" ligado, e-mail já cadastrado volta sem erro, mas sem identidades.
    if (mode === "signup" && data.user && data.user.identities?.length === 0) {
      setError("Este e-mail já tem conta neste app. Use Entrar ou confirme pelo link recebido.");
      return;
    }
    if (mode === "signup" && !data.session) {
      setMode("login");
      setPassword("");
      setError("");
      setInfo("Conta criada! Enviamos um link de confirmação para o seu e-mail.");
    }
  }

  function changeMode(nextMode: "login" | "signup") {
    setMode(nextMode);
    setError("");
    setPassword("");
  }

  const isSignup = mode === "signup";

  return (
    <main className="login">
      <div className="login-photo">
        <img src="/images/equipe-mobile.jpg" alt="" />
      </div>
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-box">
          <h1 id="login-title">{isSignup ? "Crie sua conta" : "Entre com a sua conta"}</h1>
          <p className="login-sub">
            {isSignup
              ? "Crie seu diário de finanças para registrar "
              : "Diário pessoal para registrar "}
            <b>despesas</b> e acompanhar <b>gastos</b>.
          </p>
          {!hasSupabaseConfig ? (
            <p className="login-error" role="alert">
              A conexão com o banco ainda não foi configurada.
            </p>
          ) : (
            <form onSubmit={submit}>
              {isSignup && (
                <label className="login-field">
                  <UserRound size={20} aria-hidden="true" />
                  <span className="sr-only">Nome</span>
                  <input
                    type="text"
                    autoComplete="name"
                    required
                    maxLength={80}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Nome"
                  />
                </label>
              )}
              <label className="login-field">
                <Mail size={20} aria-hidden="true" />
                <span className="sr-only">E-mail</span>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="E-mail"
                />
              </label>
              <label className="login-field">
                <LockKeyhole size={20} aria-hidden="true" />
                <span className="sr-only">Senha</span>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Senha"
                />
                <button
                  type="button"
                  className="login-eye"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </label>
              {isSignup && (
                <p className="login-help">
                  Use pelo menos 8 caracteres e evite senhas utilizadas em outros sites.
                </p>
              )}
              <p className={info ? "login-error login-info" : "login-error"} role="alert">
                {error || info}
              </p>
              <button className="login-submit" disabled={sending}>
                {sending && <LoaderCircle className="spin" size={18} aria-hidden="true" />}
                {sending ? "Aguarde…" : isSignup ? "Criar minha conta" : "Entrar"}
              </button>
            </form>
          )}
          <p className="login-switch">
            {isSignup ? "Já tem uma conta?" : "Não tem uma conta?"}{" "}
            <button type="button" onClick={() => changeMode(isSignup ? "login" : "signup")}>
              {isSignup ? "Entrar" : "Criar conta"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}

function AppLoading({ label }: { label: string }) {
  return (
    <div className="app-loading" role="status">
      <LoaderCircle className="spin" size={24} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Aplicativo                                                          */
/* ------------------------------------------------------------------ */

function Index({
  userId,
  userEmail,
  signupName,
  onSignOut,
}: {
  userId: string;
  userEmail: string;
  signupName: string;
  onSignOut: () => void;
}) {
  const [entries, setEntries] = useState<Despesa[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [view, setView] = useState<View>("painel");
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [draftCategoria, setDraftCategoria] = useState("Outros");
  const [editing, setEditing] = useState<Despesa | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const backTo = useRef<View>("painel");

  useEffect(() => {
    let active = true;
    void supabase
      .from("despesas")
      .select(SELECT_DESPESA)
      .order("data", { ascending: true })
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setStorageError(
            error.code === "PGRST205"
              ? "O banco de dados ainda não foi configurado: rode o arquivo supabase/migrations/20261101100000_financas.sql no SQL Editor do Supabase e recarregue a página."
              : "Não foi possível carregar suas despesas. Tente novamente em instantes.",
          );
          return;
        }
        setEntries((data ?? []).map((row) => fromRow(row as Record<string, unknown>)));
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void supabase
      .from("perfis")
      .select("nome, cidade, foto_path")
      .maybeSingle()
      .then(async ({ data }) => {
        if (!active) return;
        if (!data) {
          const nome = signupName || userEmail.split("@")[0] || "";
          setProfile({ ...EMPTY_PROFILE, nome });
          // Primeiro acesso: guarda o nome do cadastro no perfil desta conta.
          if (signupName)
            void supabase
              .from("perfis")
              .insert({ user_id: userId, nome: signupName, cidade: "" })
              .then(() => undefined);
          return;
        }
        const fotoUrl = data.foto_path
          ? (
              await supabase.storage
                .from("fotos-perfil")
                .createSignedUrl(data.foto_path, PHOTO_URL_TTL)
            ).data?.signedUrl
          : undefined;
        if (active)
          setProfile({
            nome: data.nome || signupName || userEmail.split("@")[0] || "",
            cidade: data.cidade,
            foto_path: data.foto_path,
            fotoUrl,
          });
      });
    return () => {
      active = false;
    };
  }, [userId, userEmail, signupName]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  function navigate(next: View) {
    setView(next);
    window.scrollTo({ top: 0 });
    if (next !== "nova")
      requestAnimationFrame(() => document.querySelector<HTMLElement>("#conteudo h1")?.focus());
  }
  function newDespesa(categoria = "Outros") {
    if (view !== "nova") backTo.current = view;
    setEditing(null);
    setDraftCategoria(categoria);
    setFormKey((k) => k + 1);
    navigate("nova");
  }
  function editDespesa(d: Despesa) {
    backTo.current = view;
    setSelectedId(null);
    setEditing(d);
    setFormKey((k) => k + 1);
    navigate("nova");
  }

  const signAnexo = useCallback(async (path: string) => {
    const { data } = await supabase.storage.from("anexos").createSignedUrl(path, 60 * 60);
    return data?.signedUrl;
  }, []);

  /* ---------------- Gravação ---------------- */

  async function save(
    values: DespesaValores,
    serie: Serie,
    anexo: AnexoAlteracao,
    continuar: boolean,
  ) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("not authenticated");
    let anexoPath = editing?.anexo_path ?? null;
    let uploaded: string | null = null;
    let obsolete: string | null = null;
    if (anexo.file) {
      const extension = anexo.file.name.split(".").pop()?.toLowerCase() || "jpg";
      uploaded = `${auth.user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("anexos")
        .upload(uploaded, anexo.file, { contentType: anexo.file.type, upsert: false });
      if (uploadError) throw uploadError;
      obsolete = anexoPath;
      anexoPath = uploaded;
    } else if (anexo.remover) {
      obsolete = anexoPath;
      anexoPath = null;
    }

    const base = { ...values, anexo_path: anexoPath, updated_at: new Date().toISOString() };
    let saved: Despesa[];
    if (editing) {
      const { data, error } = await supabase
        .from("despesas")
        .update(base)
        .eq("id", editing.id)
        .select(SELECT_DESPESA)
        .single();
      if (error || !data) {
        if (uploaded) await supabase.storage.from("anexos").remove([uploaded]);
        throw new Error("save failed");
      }
      saved = [fromRow(data as Record<string, unknown>)];
    } else {
      const parcelado = serie.parcelas > 1;
      const total = serie.fixa ? 12 : serie.parcelas;
      const grupo = total > 1 ? crypto.randomUUID() : null;
      const rows = Array.from({ length: total }, (_, i) => {
        const sufixo = parcelado ? ` ${i + 1}/${total}` : "";
        return {
          ...base,
          descricao: values.descricao.slice(0, 160 - sufixo.length) + sufixo,
          data: addMonths(values.data, i),
          pago: i === 0 ? values.pago : false,
          anexo_path: i === 0 ? anexoPath : null,
          fixa: serie.fixa,
          grupo_id: grupo,
          parcela: parcelado ? i + 1 : null,
          total_parcelas: parcelado ? total : null,
        };
      });
      const { data, error } = await supabase.from("despesas").insert(rows).select(SELECT_DESPESA);
      if (error || !data) {
        if (uploaded) await supabase.storage.from("anexos").remove([uploaded]);
        throw new Error("save failed");
      }
      saved = data.map((row) => fromRow(row as Record<string, unknown>));
    }
    if (obsolete) void supabase.storage.from("anexos").remove([obsolete]);

    const ids = new Set(saved.map((d) => d.id));
    setEntries((old) => [...old.filter((d) => !ids.has(d.id)), ...saved].sort(byDate));
    const quantas = saved.length > 1 ? ` (${plural(saved.length, "lançamento")})` : "";
    setNotice(editing ? "Despesa atualizada!" : `Despesa salva${quantas}!`);
    if (continuar) return;
    setMonth(new Date(`${values.data.slice(0, 7)}-01T12:00:00`));
    setEditing(null);
    navigate(backTo.current === "gastos" ? "gastos" : "despesas");
  }

  async function toggle(d: Despesa, field: "pago" | "favorita" | "ignorada", value: boolean) {
    setEntries((old) => old.map((e) => (e.id === d.id ? { ...e, [field]: value } : e)));
    const { error } = await supabase
      .from("despesas")
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq("id", d.id);
    if (error) {
      setEntries((old) => old.map((e) => (e.id === d.id ? { ...e, [field]: d[field] } : e)));
      setStorageError("Não foi possível atualizar a despesa. Tente novamente.");
      return;
    }
    if (field === "pago") setNotice(value ? "Despesa paga!" : "Despesa marcada como não paga.");
  }

  /** Pagar ou desfazer o pagamento de várias despesas (tabela do desktop). */
  async function payMany(ids: string[], value: boolean) {
    const before = new Map(entries.map((e) => [e.id, e.pago]));
    const idSet = new Set(ids);
    setEntries((old) => old.map((e) => (idSet.has(e.id) ? { ...e, pago: value } : e)));
    const { error } = await supabase
      .from("despesas")
      .update({ pago: value, updated_at: new Date().toISOString() })
      .in("id", ids);
    if (error) {
      setEntries((old) =>
        old.map((e) => (idSet.has(e.id) ? { ...e, pago: before.get(e.id) ?? e.pago } : e)),
      );
      setStorageError("Não foi possível atualizar as despesas. Tente novamente.");
      return;
    }
    const quantas = ids.length > 1 ? `${plural(ids.length, "despesa")} ` : "Despesa ";
    setNotice(
      value
        ? `${quantas}${ids.length > 1 ? "pagas" : "paga"}!`
        : `${quantas}${ids.length > 1 ? "marcadas como pendentes" : "marcada como pendente"}.`,
    );
  }

  /** Excluir várias despesas de uma vez (só as escolhidas, sem estender à série). */
  async function removeMany(ids: string[]) {
    const { data, error } = await supabase
      .from("despesas")
      .delete()
      .in("id", ids)
      .select("id, anexo_path");
    if (error) {
      setStorageError("Não foi possível excluir as despesas. Tente novamente.");
      return;
    }
    const removed = data ?? [];
    const gone = new Set(removed.map((r) => r.id as string));
    const paths = removed
      .map((r) => r.anexo_path as string | null)
      .filter((p): p is string => Boolean(p));
    if (paths.length) void supabase.storage.from("anexos").remove(paths);
    setEntries((old) => old.filter((e) => !gone.has(e.id)));
    setNotice(
      removed.length > 1 ? `${plural(removed.length, "despesa")} excluídas.` : "Despesa excluída.",
    );
  }

  async function remove(d: Despesa, scope: DeleteScope) {
    const query = supabase.from("despesas").delete();
    const filtered =
      scope === "proximas" && d.grupo_id
        ? query.eq("grupo_id", d.grupo_id).gte("data", d.data)
        : query.eq("id", d.id);
    const { data, error } = await filtered.select("id, anexo_path");
    if (error) {
      setStorageError("Não foi possível excluir a despesa. Tente novamente.");
      return;
    }
    const removed = data ?? [];
    const ids = new Set(removed.map((r) => r.id as string));
    const paths = removed
      .map((r) => r.anexo_path as string | null)
      .filter((p): p is string => Boolean(p));
    if (paths.length) void supabase.storage.from("anexos").remove(paths);
    setEntries((old) => old.filter((e) => !ids.has(e.id)));
    setSelectedId(null);
    setNotice(
      removed.length > 1 ? `${plural(removed.length, "despesa")} excluídas.` : "Despesa excluída.",
    );
  }

  async function saveProfile(values: { nome: string; cidade: string }, photo?: File) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("not authenticated");
    const current = profile ?? EMPTY_PROFILE;
    let fotoPath = current.foto_path;
    let uploadedPath: string | null = null;
    if (photo) {
      const extension = photo.name.split(".").pop()?.toLowerCase() || "jpg";
      uploadedPath = `${auth.user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("fotos-perfil")
        .upload(uploadedPath, photo, { contentType: photo.type, upsert: false });
      if (uploadError) throw uploadError;
      fotoPath = uploadedPath;
    }
    const { error } = await supabase.from("perfis").upsert({
      user_id: auth.user.id,
      nome: values.nome,
      cidade: values.cidade,
      foto_path: fotoPath,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      if (uploadedPath) await supabase.storage.from("fotos-perfil").remove([uploadedPath]);
      throw error;
    }
    if (uploadedPath && current.foto_path && current.foto_path !== uploadedPath) {
      void supabase.storage.from("fotos-perfil").remove([current.foto_path]);
    }
    let fotoUrl = current.fotoUrl;
    if (uploadedPath) {
      const { data: signed } = await supabase.storage
        .from("fotos-perfil")
        .createSignedUrl(uploadedPath, PHOTO_URL_TTL);
      fotoUrl = signed?.signedUrl;
    }
    setProfile({ ...values, foto_path: fotoPath, fotoUrl });
    setNotice("Configurações salvas!");
  }

  /* ---------------- Dados derivados ---------------- */

  const today = dateKey(new Date());
  const currentYear = new Date().getFullYear();
  const mk = monthKey(month);
  const monthItems = useMemo(
    () => entries.filter((d) => d.data.startsWith(mk)).sort(byDate),
    [entries, mk],
  );
  const pendente = soma(monthItems.filter((d) => !d.pago));
  const pago = soma(monthItems.filter((d) => d.pago));
  const listed = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("pt-BR");
    return monthItems.filter((d) => {
      if (filtro === "pendentes" && d.pago) return false;
      if (filtro === "pagas" && !d.pago) return false;
      if (filtro === "favoritas" && !d.favorita) return false;
      if (!q) return true;
      return `${d.descricao} ${d.categoria} ${d.conta} ${d.tags.join(" ")}`
        .toLocaleLowerCase("pt-BR")
        .includes(q);
    });
  }, [monthItems, filtro, search]);

  const thisMonthKey = monthKey(new Date());
  const pendentesAgora = entries.filter(
    (d) => d.data.startsWith(thisMonthKey) && !d.pago && !d.ignorada,
  ).length;
  const yearTotal = soma(entries.filter((d) => d.data.startsWith(String(currentYear))));
  // Vencidas e as que vencem nos próximos 10 dias.
  const horizonte = dateKey(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000));
  const proximas = entries
    .filter((d) => !d.pago && !d.ignorada && d.data <= horizonte)
    .sort(byDate)
    .slice(0, 4);

  const uniq = (list: string[]) =>
    Array.from(new Set(list)).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const categoriasUsadas = useMemo(() => uniq(entries.map((d) => d.categoria)), [entries]);
  const contasUsadas = useMemo(() => uniq(entries.map((d) => d.conta)), [entries]);
  const tagsUsadas = useMemo(() => uniq(entries.flatMap((d) => d.tags)), [entries]);
  const selected = entries.find((d) => d.id === selectedId);
  const emptyTitle = monthItems.length
    ? "Nenhuma despesa com este filtro."
    : "Nenhuma despesa neste mês.";
  const tone = "light";

  return (
    <div className="shell" data-tone={tone}>
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>

      <aside className="sidebar" aria-label="Menu principal">
        <div className="sidebar-logo">
          <span aria-hidden="true">
            <Wallet size={20} strokeWidth={2} />
          </span>
          <b>Finanças</b>
        </div>
        {NAV.map((item) => (
          <button
            key={item.id}
            className="side-link"
            aria-current={view === item.id ? "page" : undefined}
            onClick={() => navigate(item.id)}
          >
            <item.icon size={20} strokeWidth={1.8} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        ))}
        <button
          className="side-link side-new"
          aria-current={view === "nova" ? "page" : undefined}
          onClick={() => newDespesa()}
          disabled={!loaded}
        >
          <Plus size={20} aria-hidden="true" />
          <span>Nova despesa</span>
        </button>
        <button
          className="side-link side-config"
          aria-current={view === "config" ? "page" : undefined}
          onClick={() => navigate("config")}
        >
          <Settings size={20} strokeWidth={1.8} aria-hidden="true" />
          <span>Configurações</span>
        </button>
        <div className="side-me">
          <Avatar profile={profile} size={42} className="side-photo" />
          <div>
            <b>{profile?.nome}</b>
            <small title={userEmail}>{profile ? profile.cidade || userEmail : ""}</small>
          </div>
          <button aria-label="Sair" title="Sair" onClick={onSignOut}>
            <LogOut size={19} aria-hidden="true" />
          </button>
        </div>
      </aside>

      <main id="conteudo" className={`page page-${view}`}>
        {storageError && (
          <div className="banner-error" role="alert">
            {storageError}
            <button aria-label="Fechar aviso" onClick={() => setStorageError("")}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )}

        {view === "painel" && (
          <>
            <header className="hd hd-painel">
              <div className="hd-in hd-welcome">
                <p className="welcome-hi">
                  Bem-vindo(a),
                  <strong className="welcome-name">{profile?.nome ?? " "}</strong>
                </p>
                <Avatar profile={profile} size={112} className="welcome-photo" />
                <div>
                  <h1 tabIndex={-1}>
                    Procedimentos <span>de Finanças</span>
                  </h1>
                  <p>Cada real faz parte da sua história.</p>
                </div>
              </div>
            </header>
            <div className="body">
              <div className="menu">
                <button className="menu-card" onClick={() => navigate("despesas")}>
                  <span className="round-ic">
                    <Receipt size={22} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span>
                    <b>Despesas</b>
                    <small>
                      {loaded
                        ? `${plural(pendentesAgora, "pendente")} em ${MESES[new Date().getMonth()]?.toLowerCase()}`
                        : "Carregando…"}
                    </small>
                  </span>
                </button>
                <button className="menu-card" onClick={() => navigate("gastos")}>
                  <span className="round-ic">
                    <Wallet size={22} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span>
                    <b>Gastos</b>
                    <small>{money(yearTotal)} no ano</small>
                  </span>
                </button>
              </div>
              <div className="sec">
                <h2>Categorias</h2>
                <span>O que vamos registrar hoje?</span>
              </div>
              <div className="cats">
                {ATALHOS.map((categoria) => {
                  const Icon = categoriaInfo(categoria).icon;
                  return (
                    <button
                      key={categoria}
                      className="cat"
                      onClick={() => newDespesa(categoria)}
                      aria-label={`Nova despesa: ${categoria}`}
                    >
                      <span>
                        <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
                      </span>
                      {categoria}
                    </button>
                  );
                })}
              </div>
              {proximas.length > 0 && (
                <>
                  <div className="sec">
                    <h2>A pagar</h2>
                    <button className="sec-link" onClick={() => navigate("despesas")}>
                      Ver todas
                    </button>
                  </div>
                  <ul className="dx-list dx-list-light">
                    {proximas.map((d) => (
                      <DespesaItem
                        key={d.id}
                        despesa={d}
                        onOpen={(item) => setSelectedId(item.id)}
                        extra={
                          d.data < today
                            ? `venceu ${shortDate(d.data)}`
                            : `vence ${shortDate(d.data)}`
                        }
                      />
                    ))}
                  </ul>
                </>
              )}
              <button className="cta cta-float" onClick={() => newDespesa()} disabled={!loaded}>
                <Plus size={19} aria-hidden="true" /> Nova despesa
              </button>
            </div>
          </>
        )}

        {view === "despesas" && (
          <>
            <header className="hd hd-page hd-despesas">
              <MonthNav month={month} onChange={setMonth} className="mobile-only" />
              <div className="hd-row">
                <div className="hd-title">
                  <h1 tabIndex={-1}>
                    Controle <span>de Despesas</span>
                  </h1>
                  <p>
                    {plural(monthItems.length, "lançamento")} em{" "}
                    {MESES[month.getMonth()]?.toLowerCase()} de {month.getFullYear()}
                  </p>
                </div>
                <div className="hd-actions desktop-only">
                  <button
                    type="button"
                    className="act-pill"
                    onClick={() => newDespesa()}
                    disabled={!loaded}
                  >
                    <Plus size={18} aria-hidden="true" /> Nova despesa
                  </button>
                  {searchOpen && (
                    <label className="act-search">
                      <Search size={17} aria-hidden="true" />
                      <input
                        autoFocus
                        aria-label="Buscar despesas"
                        placeholder="Buscar descrição, categoria ou tag"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setSearch("");
                            setSearchOpen(false);
                          }
                        }}
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    className="act-round"
                    aria-label={searchOpen ? "Fechar busca" : "Buscar"}
                    aria-pressed={searchOpen}
                    onClick={() => {
                      if (searchOpen) setSearch("");
                      setSearchOpen((v) => !v);
                    }}
                  >
                    {searchOpen ? (
                      <X size={19} aria-hidden="true" />
                    ) : (
                      <Search size={19} aria-hidden="true" />
                    )}
                  </button>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger
                      className={`act-round ${filtro !== "todas" ? "on" : ""}`}
                      aria-label="Filtrar despesas"
                    >
                      <Filter size={18} aria-hidden="true" />
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content className="menu-pop" align="end" sideOffset={8}>
                        <DropdownMenu.Label className="menu-label">Mostrar</DropdownMenu.Label>
                        <DropdownMenu.RadioGroup
                          value={filtro}
                          onValueChange={(v) => setFiltro(v as Filtro)}
                        >
                          {FILTROS.map((f) => (
                            <DropdownMenu.RadioItem key={f.id} value={f.id} className="menu-item">
                              <DropdownMenu.ItemIndicator className="menu-check">
                                <Check size={15} aria-hidden="true" />
                              </DropdownMenu.ItemIndicator>
                              {f.label}
                            </DropdownMenu.RadioItem>
                          ))}
                        </DropdownMenu.RadioGroup>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>
              </div>
            </header>
            <div className="body">
              <div className="mobile-only">
                <div className="menu totals">
                  <div className="menu-card">
                    <span className="round-ic">
                      <LockKeyhole size={22} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <span>
                      <small>Total pendente</small>
                      <b className="coral">{money(pendente)}</b>
                    </span>
                  </div>
                  <div className="menu-card">
                    <span className="round-ic">
                      <Wallet size={22} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <span>
                      <small>Total pago</small>
                      <b className="ok">{money(pago)}</b>
                    </span>
                  </div>
                </div>
                <div className="list-tools">
                  <div className="chips" role="group" aria-label="Filtrar despesas">
                    {FILTROS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className="chip"
                        aria-pressed={filtro === f.id}
                        onClick={() => setFiltro(f.id)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <label className="search">
                    <Search size={18} aria-hidden="true" />
                    <input
                      aria-label="Buscar despesas"
                      placeholder="Buscar descrição, categoria ou tag"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                </div>
                <DespesasPorDia
                  items={listed}
                  loaded={loaded}
                  onOpen={(d) => setSelectedId(d.id)}
                  emptyTitle={emptyTitle}
                />
              </div>

              <div className="desktop-only">
                <div className="sum-cards">
                  {(
                    [
                      {
                        id: "pendentes",
                        label: "Despesas pendentes",
                        value: pendente,
                        icon: ArrowUp,
                      },
                      { id: "pagas", label: "Despesas pagas", value: pago, icon: ArrowDown },
                      { id: "todas", label: "Total", value: pendente + pago, icon: Scale },
                    ] as const
                  ).map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      className="sum-card"
                      aria-pressed={filtro === card.id}
                      onClick={() => setFiltro(card.id)}
                    >
                      <span className="sum-ic" aria-hidden="true">
                        <card.icon size={24} strokeWidth={2} />
                      </span>
                      <span className="sum-txt">
                        <small>{card.label}</small>
                        <b>{money(card.value)}</b>
                      </span>
                      <ChevronRight className="sum-chev" size={20} aria-hidden="true" />
                    </button>
                  ))}
                </div>
                <section className="tbl-card" aria-label="Despesas do mês">
                  <MonthNav month={month} onChange={setMonth} className="month-pill" showYear />
                  <DespesasTabela
                    items={listed}
                    loaded={loaded}
                    emptyTitle={emptyTitle}
                    onOpen={(d) => setSelectedId(d.id)}
                    onEdit={editDespesa}
                    onPay={payMany}
                    onDelete={removeMany}
                  />
                </section>
              </div>
            </div>
          </>
        )}

        {view === "gastos" && (
          <Gastos
            entries={entries}
            month={month}
            onMonth={setMonth}
            onOpen={(d) => setSelectedId(d.id)}
          />
        )}

        {view === "nova" && (
          <DespesaForm
            key={formKey}
            initial={editing}
            defaultCategoria={draftCategoria}
            categoriasUsadas={categoriasUsadas}
            contasUsadas={contasUsadas}
            tagsUsadas={tagsUsadas}
            disabled={!loaded}
            onSave={save}
            onCancel={() => {
              setEditing(null);
              navigate(backTo.current);
            }}
          />
        )}

        {view === "config" && (
          <>
            <header className="hd hd-page">
              <div className="hd-title">
                <h1 tabIndex={-1}>
                  Suas <span>Configurações</span>
                </h1>
                <p>Atualize sua foto, nome e cidade.</p>
              </div>
            </header>
            <div className="body body-narrow">
              {profile ? (
                <SettingsForm
                  key={`${profile.nome}|${profile.cidade}|${profile.foto_path ?? ""}`}
                  profile={profile}
                  onSave={saveProfile}
                />
              ) : (
                <p className="empty" role="status">
                  Carregando seu perfil…
                </p>
              )}
              <div className="card config-account">
                <p>
                  Conectado como <b>{userEmail}</b>
                </p>
                <button className="btn-outline" onClick={onSignOut}>
                  <LogOut size={18} aria-hidden="true" /> Sair
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {view !== "nova" && (
        <nav className="tabbar" aria-label="Menu principal">
          {NAV.slice(0, 2).map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              aria-current={view === item.id ? "page" : undefined}
            >
              <item.icon size={22} strokeWidth={1.7} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          ))}
          <button
            className="tab-add"
            aria-label="Nova despesa"
            onClick={() => newDespesa()}
            disabled={!loaded}
          >
            <Plus size={30} strokeWidth={2.4} aria-hidden="true" />
          </button>
          <button
            onClick={() => navigate("gastos")}
            aria-current={view === "gastos" ? "page" : undefined}
          >
            <Wallet size={22} strokeWidth={1.7} aria-hidden="true" />
            <span>Gastos</span>
          </button>
          <button
            onClick={() => navigate("config")}
            aria-current={view === "config" ? "page" : undefined}
          >
            <Ellipsis size={22} strokeWidth={2} aria-hidden="true" />
            <span>Mais</span>
          </button>
        </nav>
      )}

      {notice && (
        <div className="toast" role="status">
          <Check size={17} aria-hidden="true" />
          {notice}
          <button aria-label="Fechar aviso" onClick={() => setNotice("")}>
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      )}

      <DespesaDetalhe
        key={selected?.id ?? "nenhuma"}
        despesa={selected}
        onClose={() => setSelectedId(null)}
        onEdit={editDespesa}
        onToggle={(d, field, value) => void toggle(d, field, value)}
        onDelete={remove}
        signAnexo={signAnexo}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Gastos                                                              */
/* ------------------------------------------------------------------ */

function Gastos({
  entries,
  month,
  onMonth,
  onOpen,
}: {
  entries: Despesa[];
  month: Date;
  onMonth: (d: Date) => void;
  onOpen: (d: Despesa) => void;
}) {
  const year = month.getFullYear();
  const mk = monthKey(month);
  const monthItems = entries.filter((d) => d.data.startsWith(mk));
  const yearItems = entries.filter((d) => d.data.startsWith(String(year)));
  const total = soma(monthItems);
  const pago = soma(monthItems.filter((d) => d.pago));
  const yearTotal = soma(yearItems);
  const share = yearTotal ? total / yearTotal : 0;
  const counted = monthItems.filter((d) => !d.ignorada);

  const porCategoria = Array.from(
    counted.reduce<Map<string, number>>(
      (map, d) => map.set(d.categoria, (map.get(d.categoria) ?? 0) + d.valor),
      new Map(),
    ),
  ).sort((a, b) => b[1] - a[1]);
  const maiorCategoria = porCategoria[0]?.[1] ?? 0;

  const porMes = MESES.map((_, i) =>
    soma(yearItems.filter((d) => d.data.slice(5, 7) === String(i + 1).padStart(2, "0"))),
  );
  const maiorMes = Math.max(...porMes, 0);
  const mesesComGasto = porMes.filter((v) => v > 0).length;
  const maiores = [...counted].sort((a, b) => b.valor - a.valor).slice(0, 3);

  return (
    <>
      <header className="hd hd-page hd-gastos">
        <MonthNav month={month} onChange={onMonth} />
        <div className="hd-title">
          <h1 tabIndex={-1}>
            Resumo <span>de Gastos</span>
          </h1>
          <p>Para onde foi o seu dinheiro.</p>
        </div>
        <div
          className="donut"
          role="img"
          aria-label={`${money(total)} em ${MESES[month.getMonth()]?.toLowerCase()}, ${Math.round(share * 100)}% do ano`}
        >
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle className="donut-track" cx="60" cy="60" r="50" />
            <circle
              className="donut-value"
              cx="60"
              cy="60"
              r="50"
              strokeDasharray={RING}
              strokeDashoffset={RING * (1 - share)}
            />
          </svg>
          <div className="donut-mid" aria-hidden="true">
            <small>Total do mês</small>
            <strong>
              <Money value={total} />
            </strong>
            <em>{Math.round(share * 100)}% do ano</em>
          </div>
        </div>
      </header>
      <div className="body">
        <div className="g3">
          <section className="card" aria-labelledby="g-mes">
            <h2 id="g-mes">Resumo do mês</h2>
            <dl className="stats">
              <div>
                <dt>Total</dt>
                <dd>
                  <Money value={total} />
                </dd>
              </div>
              <div>
                <dt>Pago</dt>
                <dd className="ok">
                  <Money value={pago} />
                </dd>
              </div>
              <div>
                <dt>Pendente</dt>
                <dd className="coral">
                  <Money value={total - pago} />
                </dd>
              </div>
              <div>
                <dt>Lançamentos</dt>
                <dd>{counted.length}</dd>
              </div>
            </dl>
          </section>

          <section className="card" aria-labelledby="g-cat">
            <h2 id="g-cat">Por categoria</h2>
            {porCategoria.length ? (
              <ul className="bars">
                {porCategoria.map(([categoria, valor]) => (
                  <li key={categoria}>
                    <CategoryBadge categoria={categoria} size={34} />
                    <div>
                      <span>
                        <b>{categoria}</b>
                        <em>{money(valor)}</em>
                      </span>
                      <i
                        style={{
                          width: `${Math.max(4, (valor / maiorCategoria) * 100)}%`,
                          background: categoriaInfo(categoria).cor,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="card-empty">Sem despesas neste mês.</p>
            )}
          </section>

          <section className="card" aria-labelledby="g-ano">
            <h2 id="g-ano">Ano de {year}</h2>
            <dl className="stats">
              <div>
                <dt>Total no ano</dt>
                <dd>
                  <Money value={yearTotal} />
                </dd>
              </div>
              <div>
                <dt>Média mensal</dt>
                <dd>
                  <Money value={mesesComGasto ? yearTotal / mesesComGasto : 0} />
                </dd>
              </div>
            </dl>
            <div className="months" role="list" aria-label={`Gastos por mês em ${year}`}>
              {porMes.map((valor, i) => (
                <button
                  key={MESES[i]}
                  type="button"
                  role="listitem"
                  className="month-bar"
                  aria-current={i === month.getMonth() ? "true" : undefined}
                  aria-label={`${MESES[i]}: ${money(valor)}`}
                  onClick={() => onMonth(new Date(year, i, 1))}
                >
                  <span>
                    <i
                      style={{ height: `${maiorMes ? Math.max(3, (valor / maiorMes) * 100) : 3}%` }}
                    />
                  </span>
                  <small>{MESES[i]?.slice(0, 1)}</small>
                </button>
              ))}
            </div>
          </section>
        </div>

        {maiores.length > 0 && (
          <>
            <div className="sec">
              <h2>Maiores despesas do mês</h2>
            </div>
            <ul className="dx-list">
              {maiores.map((d) => (
                <DespesaItem key={d.id} despesa={d} onOpen={onOpen} />
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Configurações                                                       */
/* ------------------------------------------------------------------ */

function SettingsForm({
  profile,
  onSave,
}: {
  profile: Profile;
  onSave: (values: { nome: string; cidade: string }, photo?: File) => Promise<void>;
}) {
  const [nome, setNome] = useState(profile.nome);
  const [cidade, setCidade] = useState(profile.cidade);
  const [photo, setPhoto] = useState<File>();
  const [preview, setPreview] = useState(profile.fotoUrl ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  return (
    <form
      className="settings"
      onSubmit={async (event) => {
        event.preventDefault();
        const name = nome.trim();
        if (!name) {
          setError("Informe seu nome.");
          return;
        }
        setError("");
        setSaving(true);
        try {
          await onSave({ nome: name, cidade: cidade.trim() }, photo);
        } catch {
          setError(
            "Não foi possível salvar as configurações. Confira sua conexão e tente novamente.",
          );
          setSaving(false);
        }
      }}
    >
      <div className="avatar-edit">
        {preview ? (
          <img
            className="edit-photo"
            src={preview}
            alt="Sua foto de perfil"
            width="88"
            height="88"
          />
        ) : (
          <Avatar profile={profile} size={88} className="edit-photo" />
        )}
        <div>
          <button
            type="button"
            className="btn-outline btn-sm"
            aria-describedby="foto-hint"
            onClick={() => fileInput.current?.click()}
          >
            <ImagePlus size={17} aria-hidden="true" /> Trocar foto
          </button>
          <small className="hint" id="foto-hint">
            JPG, PNG ou WebP até 5 MB.
          </small>
        </div>
        <input
          ref={fileInput}
          type="file"
          hidden
          aria-label="Escolher foto de perfil"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
              setError("Use uma foto em JPG, PNG ou WebP.");
              return;
            }
            if (file.size > MAX_PHOTO_BYTES) {
              setError("A foto deve ter no máximo 5 MB.");
              return;
            }
            setPhoto(file);
            setPreview(URL.createObjectURL(file));
            setError("");
          }}
        />
      </div>

      <label className="row">
        <UserRound className="row-ic" size={24} strokeWidth={1.5} aria-hidden="true" />
        <span className="sr-only">Nome</span>
        <input
          className="row-main row-input"
          required
          maxLength={80}
          autoComplete="name"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          placeholder="Nome"
        />
      </label>
      <label className="row">
        <MapPin className="row-ic" size={24} strokeWidth={1.5} aria-hidden="true" />
        <span className="sr-only">Cidade (opcional)</span>
        <input
          className="row-main row-input"
          maxLength={80}
          autoComplete="address-level2"
          value={cidade}
          onChange={(event) => setCidade(event.target.value)}
          placeholder="Cidade (opcional)"
        />
      </label>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn-coral" type="submit" disabled={saving}>
        {saving && <LoaderCircle className="spin" size={18} aria-hidden="true" />}
        {saving ? "Salvando…" : "Salvar alterações"}
      </button>
    </form>
  );
}
