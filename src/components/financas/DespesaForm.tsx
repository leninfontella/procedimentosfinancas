import {
  Bell,
  Bookmark,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CloudUpload,
  Heart,
  Image as ImageIcon,
  Info,
  LoaderCircle,
  Minus,
  Pencil,
  Pin,
  Plus,
  Repeat,
  Tag,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addMonths,
  CATEGORIAS,
  CONTAS,
  dateKey,
  longDate,
  money,
  type Despesa,
  type DespesaValores,
} from "@/lib/financas";
import { CategoryBadge, Sheet, Switch } from "./ui";

export type Serie = { fixa: boolean; parcelas: number };
export type AnexoAlteracao = { file?: File; remover?: boolean };

const ANEXO_TIPOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ANEXO_MAX = 10 * 1024 * 1024;
const MESES_FIXA = 12;

const hoje = () => dateKey(new Date());
const ontem = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
};

export function DespesaForm({
  initial,
  defaultCategoria,
  categoriasUsadas,
  contasUsadas,
  tagsUsadas,
  disabled,
  onSave,
  onCancel,
}: {
  initial: Despesa | null;
  defaultCategoria: string;
  categoriasUsadas: string[];
  contasUsadas: string[];
  tagsUsadas: string[];
  disabled: boolean;
  onSave: (
    values: DespesaValores,
    serie: Serie,
    anexo: AnexoAlteracao,
    continuar: boolean,
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const blank = (): DespesaValores => ({
    descricao: "",
    valor: 0,
    data: hoje(),
    pago: false,
    categoria: defaultCategoria,
    conta: "Carteira",
    tags: [],
    observacoes: "",
    favorita: false,
    fixa: false,
    lembrete: false,
    ignorada: false,
  });
  const [form, setForm] = useState<DespesaValores>(() =>
    initial
      ? {
          descricao: initial.descricao,
          valor: initial.valor,
          data: initial.data,
          pago: initial.pago,
          categoria: initial.categoria,
          conta: initial.conta,
          tags: initial.tags,
          observacoes: initial.observacoes ?? "",
          favorita: initial.favorita,
          fixa: initial.fixa,
          lembrete: initial.lembrete,
          ignorada: initial.ignorada,
        }
      : blank(),
  );
  const [cents, setCents] = useState(() => Math.round((initial?.valor ?? 0) * 100));
  const [outraData, setOutraData] = useState(
    () => Boolean(initial) && initial?.data !== hoje() && initial?.data !== ontem(),
  );
  const [repetir, setRepetir] = useState(false);
  const [parcelas, setParcelas] = useState(2);
  const [anexo, setAnexo] = useState<File>();
  const [removerAnexo, setRemoverAnexo] = useState(false);
  const [picker, setPicker] = useState<"categoria" | "conta" | "tags" | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<"salvar" | "continuar" | null>(null);
  const valorInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const editing = Boolean(initial);

  useEffect(() => {
    valorInput.current?.focus({ preventScroll: true });
  }, []);

  const set = <K extends keyof DespesaValores>(key: K, value: DespesaValores[K]) =>
    setForm((old) => ({ ...old, [key]: value }));

  const temAnexoSalvo = Boolean(initial?.anexo_path) && !removerAnexo;

  async function submit(continuar: boolean) {
    const descricao = form.descricao.trim();
    if (cents <= 0) {
      setError("Informe o valor da despesa.");
      valorInput.current?.focus();
      return;
    }
    if (!descricao) {
      setError("Informe a descrição da despesa.");
      return;
    }
    if (!form.data) {
      setError("Escolha a data da despesa.");
      return;
    }
    setError("");
    setSaving(continuar ? "continuar" : "salvar");
    try {
      await onSave(
        {
          ...form,
          descricao,
          valor: cents / 100,
          observacoes: form.observacoes?.trim() || null,
          fixa: editing ? form.fixa : form.fixa && !repetir,
        },
        { fixa: !editing && form.fixa, parcelas: !editing && repetir ? parcelas : 1 },
        { ...(anexo ? { file: anexo } : {}), ...(removerAnexo ? { remover: true } : {}) },
        continuar,
      );
      if (continuar) {
        // Mantém data, conta e categoria: costuma-se lançar várias despesas parecidas.
        setForm((old) => ({
          ...blank(),
          data: old.data,
          conta: old.conta,
          categoria: old.categoria,
        }));
        setCents(0);
        setRepetir(false);
        setAnexo(undefined);
        valorInput.current?.focus();
      }
    } catch {
      setError("Não foi possível salvar a despesa. Confira sua conexão e tente novamente.");
    } finally {
      setSaving(null);
    }
  }

  const ultimaParcela = useMemo(
    () => (repetir ? addMonths(form.data, parcelas - 1) : form.data),
    [repetir, parcelas, form.data],
  );

  return (
    <form
      className="dform"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(false);
      }}
      noValidate
    >
      <header className="hd hd-page hd-form">
        <div className="dform-bar">
          <button type="button" className="ib" aria-label="Voltar" onClick={onCancel}>
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
        </div>
        <div className="hd-title">
          <h1 tabIndex={-1}>
            {editing ? "Editar" : "Nova"} <span>despesa</span>
          </h1>
        </div>
        <label className="amount">
          <span>Valor da despesa</span>
          <span className="amount-row">
            <input
              ref={valorInput}
              inputMode="numeric"
              autoComplete="off"
              aria-label="Valor da despesa"
              value={money(cents / 100)}
              style={{ width: `${money(cents / 100).length * 0.56}em` }}
              onChange={(event) => {
                const digits = event.target.value.replace(/\D/g, "").slice(-11);
                setCents(Number(digits || 0));
              }}
              onFocus={(event) => {
                const el = event.target;
                requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
              }}
            />
            <b>BRL</b>
          </span>
        </label>
      </header>

      <div className="body">
        <div className="dform-sheet">
          <div className="row">
            <CircleCheck className="row-ic" size={26} strokeWidth={1.5} aria-hidden="true" />
            <span className="row-main">{form.pago ? "Foi pago" : "Não foi pago"}</span>
            <Switch label="Despesa paga" checked={form.pago} onChange={(v) => set("pago", v)} />
          </div>

          <div className="row">
            <CalendarCheck className="row-ic" size={26} strokeWidth={1.5} aria-hidden="true" />
            <div className="row-main date-chips" role="group" aria-label="Data">
              <button
                type="button"
                className="chip"
                aria-pressed={!outraData && form.data === hoje()}
                onClick={() => {
                  setOutraData(false);
                  set("data", hoje());
                }}
              >
                Hoje
              </button>
              <button
                type="button"
                className="chip"
                aria-pressed={!outraData && form.data === ontem()}
                onClick={() => {
                  setOutraData(false);
                  set("data", ontem());
                }}
              >
                Ontem
              </button>
              {outraData ? (
                <input
                  className="chip chip-date"
                  type="date"
                  aria-label="Outra data"
                  value={form.data}
                  onChange={(event) => set("data", event.target.value)}
                />
              ) : (
                <button
                  type="button"
                  className="chip"
                  aria-pressed={false}
                  onClick={() => setOutraData(true)}
                >
                  Outros
                </button>
              )}
            </div>
          </div>

          <div className="row">
            <Pencil className="row-ic" size={24} strokeWidth={1.5} aria-hidden="true" />
            <input
              className="row-main row-input"
              aria-label="Descrição"
              placeholder="Descrição"
              maxLength={160}
              value={form.descricao}
              onChange={(event) => set("descricao", event.target.value)}
            />
            <button
              type="button"
              className={`heart ${form.favorita ? "on" : ""}`}
              aria-pressed={form.favorita}
              aria-label="Favorita"
              onClick={() => set("favorita", !form.favorita)}
            >
              <Heart size={26} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>

          <button type="button" className="row row-btn" onClick={() => setPicker("categoria")}>
            <Bookmark className="row-ic" size={26} strokeWidth={1.5} aria-hidden="true" />
            <span className="row-main">
              <span className="pill pill-cat">
                <CategoryBadge categoria={form.categoria} size={30} />
                {form.categoria}
              </span>
              <span className="sr-only">: trocar categoria</span>
            </span>
            <ChevronRight className="row-chev" size={24} strokeWidth={1.4} aria-hidden="true" />
          </button>

          <button type="button" className="row row-btn" onClick={() => setPicker("conta")}>
            <Wallet className="row-ic" size={26} strokeWidth={1.5} aria-hidden="true" />
            <span className="row-main">
              <span className="pill pill-conta">
                <span className="conta-dot" aria-hidden="true">
                  <Wallet size={15} strokeWidth={2} />
                </span>
                {form.conta}
              </span>
              <span className="sr-only">: trocar conta</span>
            </span>
            <ChevronRight className="row-chev" size={24} strokeWidth={1.4} aria-hidden="true" />
          </button>

          <div className="row">
            <ImageIcon className="row-ic" size={26} strokeWidth={1.5} aria-hidden="true" />
            <span className="row-main row-anexo">
              {anexo ? (
                <span className="anexo-name">{anexo.name}</span>
              ) : temAnexoSalvo ? (
                "Anexo salvo"
              ) : (
                "Anexo"
              )}
              {(anexo || temAnexoSalvo) && (
                <button
                  type="button"
                  className="mini-x"
                  aria-label="Remover anexo"
                  onClick={() => {
                    setAnexo(undefined);
                    if (initial?.anexo_path) setRemoverAnexo(true);
                  }}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </span>
            <button
              type="button"
              className="upload-ic"
              aria-label={anexo || temAnexoSalvo ? "Trocar anexo" : "Adicionar anexo"}
              onClick={() => fileInput.current?.click()}
            >
              <CloudUpload size={30} strokeWidth={1.4} aria-hidden="true" />
            </button>
            <input
              ref={fileInput}
              type="file"
              hidden
              accept={ANEXO_TIPOS.join(",")}
              aria-label="Escolher anexo"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                if (!ANEXO_TIPOS.includes(file.type)) {
                  setError("O anexo deve ser uma foto (JPG, PNG, WebP) ou um PDF.");
                  return;
                }
                if (file.size > ANEXO_MAX) {
                  setError("O anexo deve ter no máximo 10 MB.");
                  return;
                }
                setError("");
                setAnexo(file);
              }}
            />
          </div>

          {!editing && (
            <>
              <div className="row">
                <Pin className="row-ic" size={26} strokeWidth={1.5} aria-hidden="true" />
                <span className="row-main">
                  Despesa fixa
                  {form.fixa && (
                    <small className="row-hint">
                      Repete todo mês pelos próximos {MESES_FIXA} meses.
                    </small>
                  )}
                </span>
                <Switch
                  label="Despesa fixa"
                  checked={form.fixa}
                  onChange={(v) => {
                    set("fixa", v);
                    if (v) setRepetir(false);
                  }}
                />
              </div>

              <div className="row">
                <Repeat className="row-ic" size={26} strokeWidth={1.5} aria-hidden="true" />
                <span className="row-main">Repetir</span>
                <Switch
                  label="Repetir"
                  checked={repetir}
                  onChange={(v) => {
                    setRepetir(v);
                    if (v) set("fixa", false);
                  }}
                />
              </div>
              {repetir && (
                <div className="row row-sub">
                  <span className="row-main">
                    Parcelas mensais
                    <small className="row-hint">
                      {form.descricao.trim() || "Despesa"} 1/{parcelas} até {parcelas}/{parcelas},
                      de {longDate(form.data)} a {longDate(ultimaParcela)}.
                    </small>
                  </span>
                  <div className="stepper">
                    <button
                      type="button"
                      aria-label="Menos parcelas"
                      disabled={parcelas <= 2}
                      onClick={() => setParcelas((n) => Math.max(2, n - 1))}
                    >
                      <Minus size={16} aria-hidden="true" />
                    </button>
                    <input
                      inputMode="numeric"
                      aria-label="Quantidade de parcelas"
                      value={parcelas}
                      onChange={(event) => {
                        const n = Number(event.target.value.replace(/\D/g, "") || 2);
                        setParcelas(Math.min(120, Math.max(2, n)));
                      }}
                    />
                    <button
                      type="button"
                      aria-label="Mais parcelas"
                      disabled={parcelas >= 120}
                      onClick={() => setParcelas((n) => Math.min(120, n + 1))}
                    >
                      <Plus size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {editing && initial?.grupo_id && (
            <p className="row-note">
              {initial.total_parcelas && initial.total_parcelas > 1
                ? `Parcela ${initial.parcela}/${initial.total_parcelas}.`
                : "Despesa fixa mensal."}{" "}
              As alterações valem só para esta ocorrência.
            </p>
          )}

          <div className="row row-top">
            <Pencil className="row-ic" size={24} strokeWidth={1.5} aria-hidden="true" />
            <textarea
              className="row-main row-input"
              aria-label="Observações"
              placeholder="Observações"
              rows={2}
              maxLength={2000}
              value={form.observacoes ?? ""}
              onChange={(event) => set("observacoes", event.target.value)}
            />
          </div>

          <button type="button" className="row row-btn" onClick={() => setPicker("tags")}>
            <Tag className="row-ic" size={26} strokeWidth={1.5} aria-hidden="true" />
            <span className={`row-main ${form.tags.length ? "" : "row-placeholder"}`}>
              {form.tags.length ? (
                <span className="tag-list">
                  {form.tags.map((t) => (
                    <span key={t} className="tag-chip">
                      {t}
                    </span>
                  ))}
                </span>
              ) : (
                "Tags"
              )}
            </span>
            <ChevronRight className="row-chev" size={24} strokeWidth={1.4} aria-hidden="true" />
          </button>

          <div className="row">
            <Bell className="row-ic" size={26} strokeWidth={1.5} aria-hidden="true" />
            <span className="row-main">Lembrar-me</span>
            <Switch
              label="Lembrar-me"
              checked={form.lembrete}
              onChange={(v) => set("lembrete", v)}
            />
          </div>

          <div className="row">
            <Info className="row-ic row-ic-info" size={26} strokeWidth={1.5} aria-hidden="true" />
            <span className="row-main">
              Ignorar despesa
              {form.ignorada && <small className="row-hint">Não entra nos totais.</small>}
            </span>
            <Switch
              label="Ignorar despesa"
              checked={form.ignorada}
              onChange={(v) => set("ignorada", v)}
            />
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="dform-actions">
            {!editing && (
              <button
                type="button"
                className="btn-link"
                disabled={disabled || Boolean(saving)}
                onClick={() => void submit(true)}
              >
                {saving === "continuar" ? "Salvando…" : "Salvar e continuar"}
              </button>
            )}
            <button type="submit" className="btn-coral" disabled={disabled || Boolean(saving)}>
              {saving === "salvar" && (
                <LoaderCircle className="spin" size={18} aria-hidden="true" />
              )}
              {saving === "salvar" ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </div>

      <CategoriaPicker
        open={picker === "categoria"}
        onOpenChange={(open) => setPicker(open ? "categoria" : null)}
        value={form.categoria}
        extras={categoriasUsadas}
        onPick={(c) => {
          set("categoria", c);
          setPicker(null);
        }}
      />
      <ContaPicker
        open={picker === "conta"}
        onOpenChange={(open) => setPicker(open ? "conta" : null)}
        value={form.conta}
        extras={contasUsadas}
        onPick={(c) => {
          set("conta", c);
          setPicker(null);
        }}
      />
      <TagsPicker
        open={picker === "tags"}
        onOpenChange={(open) => setPicker(open ? "tags" : null)}
        value={form.tags}
        sugestoes={tagsUsadas}
        onChange={(tags) => set("tags", tags)}
      />
    </form>
  );
}

/* ------------------------------------------------------------------ */

function NovoItem({ placeholder, onAdd }: { placeholder: string; onAdd: (v: string) => void }) {
  const [value, setValue] = useState("");
  const add = () => {
    const v = value.trim().replace(/\s+/g, " ");
    if (!v) return;
    onAdd(v.slice(0, 60));
    setValue("");
  };
  return (
    <div className="new-item">
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        maxLength={60}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            add();
          }
        }}
      />
      <button type="button" className="btn-coral btn-sm" onClick={add} disabled={!value.trim()}>
        <Plus size={16} aria-hidden="true" /> Adicionar
      </button>
    </div>
  );
}

function CategoriaPicker({
  open,
  onOpenChange,
  value,
  extras,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  extras: string[];
  onPick: (c: string) => void;
}) {
  const nomes = [
    ...CATEGORIAS.map((c) => c.nome),
    ...extras.filter((e) => !CATEGORIAS.some((c) => c.nome === e)),
  ];
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Categoria">
      <div className="cat-grid">
        {nomes.map((nome) => (
          <button
            key={nome}
            type="button"
            className="cat-opt"
            aria-pressed={nome === value}
            onClick={() => onPick(nome)}
          >
            <CategoryBadge categoria={nome} size={48} />
            <span>{nome}</span>
          </button>
        ))}
      </div>
      <NovoItem placeholder="Nova categoria" onAdd={onPick} />
    </Sheet>
  );
}

function ContaPicker({
  open,
  onOpenChange,
  value,
  extras,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  extras: string[];
  onPick: (c: string) => void;
}) {
  const nomes = [...CONTAS, ...extras.filter((e) => !CONTAS.includes(e))];
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Conta">
      <div className="opt-list">
        {nomes.map((nome) => (
          <button
            key={nome}
            type="button"
            className="opt"
            aria-pressed={nome === value}
            onClick={() => onPick(nome)}
          >
            <span className="conta-dot" aria-hidden="true">
              <Wallet size={16} strokeWidth={2} />
            </span>
            {nome}
          </button>
        ))}
      </div>
      <NovoItem placeholder="Nova conta" onAdd={onPick} />
    </Sheet>
  );
}

function TagsPicker({
  open,
  onOpenChange,
  value,
  sugestoes,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string[];
  sugestoes: string[];
  onChange: (tags: string[]) => void;
}) {
  const livres = sugestoes.filter((t) => !value.includes(t));
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Tags">
      {value.length > 0 && (
        <div className="tag-list tag-list-edit">
          {value.map((t) => (
            <button
              key={t}
              type="button"
              className="tag-chip on"
              aria-label={`Remover tag ${t}`}
              onClick={() => onChange(value.filter((v) => v !== t))}
            >
              {t} <X size={13} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
      <NovoItem
        placeholder="Nova tag"
        onAdd={(t) => !value.includes(t) && value.length < 20 && onChange([...value, t])}
      />
      {livres.length > 0 && (
        <>
          <p className="sheet-label">Usadas antes</p>
          <div className="tag-list">
            {livres.map((t) => (
              <button
                key={t}
                type="button"
                className="tag-chip"
                onClick={() => value.length < 20 && onChange([...value, t])}
              >
                <Plus size={13} aria-hidden="true" /> {t}
              </button>
            ))}
          </div>
        </>
      )}
      <button type="button" className="btn-coral sheet-done" onClick={() => onOpenChange(false)}>
        Pronto
      </button>
    </Sheet>
  );
}
