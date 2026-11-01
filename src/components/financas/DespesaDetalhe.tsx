import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Bell,
  CalendarCheck,
  Check,
  CircleDollarSign,
  Heart,
  Image as ImageIcon,
  Info,
  Layers,
  Pencil,
  Pin,
  Tag,
  Trash2,
  TrendingDown,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { categoriaInfo, longDate, type Despesa } from "@/lib/financas";
import { Money, Sheet, Switch } from "./ui";

export type DeleteScope = "uma" | "proximas";
type Toggle = "pago" | "favorita" | "ignorada";

export function DespesaDetalhe({
  despesa,
  onClose,
  onEdit,
  onToggle,
  onDelete,
  signAnexo,
}: {
  despesa: Despesa | undefined;
  onClose: () => void;
  onEdit: (d: Despesa) => void;
  onToggle: (d: Despesa, field: Toggle, value: boolean) => void;
  onDelete: (d: Despesa, scope: DeleteScope) => Promise<void>;
  signAnexo: (path: string) => Promise<string | undefined>;
}) {
  const [anexoUrl, setAnexoUrl] = useState<string>();
  const [verAnexo, setVerAnexo] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const path = despesa?.anexo_path ?? null;

  useEffect(() => {
    setAnexoUrl(undefined);
    if (!path) return undefined;
    let active = true;
    void signAnexo(path).then((url) => active && setAnexoUrl(url));
    return () => {
      active = false;
    };
  }, [path, signAnexo]);

  if (!despesa) return null;
  const d = despesa;
  const isPdf = /\.pdf$/i.test(path ?? "");
  const CatIcon = categoriaInfo(d.categoria).icon;
  const serie =
    d.total_parcelas && d.total_parcelas > 1
      ? `Parcela ${d.parcela}/${d.total_parcelas}`
      : d.fixa
        ? "Despesa fixa mensal"
        : null;

  async function excluir(scope: DeleteScope) {
    setExcluindo(true);
    try {
      await onDelete(d, scope);
      setConfirmar(false);
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <>
      <Sheet
        open
        onOpenChange={(open) => !open && onClose()}
        title={d.descricao}
        hideTitle
        className="sheet-detail"
        actions={
          <button
            type="button"
            className="sheet-icon"
            aria-label="Excluir despesa"
            onClick={() => setConfirmar(true)}
          >
            <Trash2 size={19} aria-hidden="true" />
          </button>
        }
      >
        <div className="dt-acts">
          <div className="dt-act">
            <span className={`dt-circle ${d.pago ? "ok" : "on"}`} aria-hidden="true">
              {d.pago ? <Check size={26} strokeWidth={2} /> : <Pin size={24} strokeWidth={1.8} />}
            </span>
            <span>{d.pago ? "Pago" : "Não foi pago"}</span>
          </div>
          <div className="dt-act">
            <span className="dt-circle on" aria-hidden="true">
              <TrendingDown size={24} strokeWidth={1.8} />
            </span>
            <span>Despesa</span>
          </div>
          {path && anexoUrl && isPdf ? (
            <a className="dt-act" href={anexoUrl} target="_blank" rel="noreferrer">
              <span className="dt-circle on" aria-hidden="true">
                <ImageIcon size={24} strokeWidth={1.6} />
              </span>
              <span>Anexo</span>
            </a>
          ) : (
            <button
              type="button"
              className="dt-act"
              disabled={!path || !anexoUrl}
              aria-label={path ? "Ver anexo" : "Sem anexo"}
              onClick={() => setVerAnexo(true)}
            >
              <span className={`dt-circle ${path ? "on" : ""}`} aria-hidden="true">
                <ImageIcon size={24} strokeWidth={1.6} />
              </span>
              <span>Anexo</span>
            </button>
          )}
          <button
            type="button"
            className="dt-act"
            aria-pressed={d.favorita}
            onClick={() => onToggle(d, "favorita", !d.favorita)}
          >
            <span className={`dt-circle ${d.favorita ? "on" : ""}`} aria-hidden="true">
              <Heart size={24} strokeWidth={1.7} fill={d.favorita ? "currentColor" : "none"} />
            </span>
            <span>Favorita</span>
          </button>
        </div>

        <dl className="dt-grid">
          <Field icon={<Pencil size={24} strokeWidth={1.4} />} label="Descrição">
            {d.descricao}
          </Field>
          <Field icon={<CircleDollarSign size={24} strokeWidth={1.4} />} label="Valor">
            <Money value={d.valor} />
          </Field>
          <Field icon={<CalendarCheck size={24} strokeWidth={1.4} />} label="Data">
            {longDate(d.data)}
          </Field>
          <Field
            icon={
              <span className="conta-dot conta-dot-lg">
                <Wallet size={17} strokeWidth={2} />
              </span>
            }
            label="Conta"
          >
            {d.conta}
          </Field>
          <Field icon={<CatIcon size={24} strokeWidth={1.4} />} label="Categoria">
            {d.categoria}
          </Field>
          <Field icon={<Tag size={24} strokeWidth={1.4} />} label="Tags">
            {d.tags.length ? d.tags.join(", ") : "Nenhuma"}
          </Field>
          <Field icon={<Bell size={24} strokeWidth={1.4} />} label="Lembrete">
            {d.lembrete ? "Ativo" : "Inativo"}
          </Field>
          {serie && (
            <Field icon={<Layers size={24} strokeWidth={1.4} />} label="Repetição">
              {serie}
            </Field>
          )}
          <Field icon={<Pencil size={24} strokeWidth={1.4} />} label="Observações" wide>
            {d.observacoes || "Nenhuma"}
          </Field>
        </dl>

        <div className="row dt-ignore">
          <Info className="row-ic row-ic-info" size={26} strokeWidth={1.5} aria-hidden="true" />
          <span className="row-main">
            Ignorar despesa
            {d.ignorada && <small className="row-hint">Não entra nos totais.</small>}
          </span>
          <Switch
            label="Ignorar despesa"
            checked={d.ignorada}
            onChange={(v) => onToggle(d, "ignorada", v)}
          />
        </div>

        <div className="dt-buttons">
          <button type="button" className="btn-coral" onClick={() => onEdit(d)}>
            Editar despesa
          </button>
          <button
            type="button"
            className="btn-outline"
            onClick={() => onToggle(d, "pago", !d.pago)}
          >
            {d.pago ? "Marcar como não paga" : "Pagar"}
          </button>
        </div>
      </Sheet>

      {anexoUrl && !isPdf && (
        <Dialog.Root open={verAnexo} onOpenChange={setVerAnexo}>
          <Dialog.Portal>
            <Dialog.Overlay className="overlay overlay-top" />
            <Dialog.Content className="lightbox" aria-describedby={undefined}>
              <Dialog.Title className="sr-only">Anexo de {d.descricao}</Dialog.Title>
              <img src={anexoUrl} alt={`Anexo de ${d.descricao}`} />
              <Dialog.Close className="modal-close" aria-label="Fechar anexo">
                <X size={19} aria-hidden="true" />
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      <AlertDialog.Root open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="overlay overlay-top" />
          <AlertDialog.Content className="modal">
            <span className="modal-ic danger" aria-hidden="true">
              <Trash2 size={22} />
            </span>
            <AlertDialog.Title>Excluir esta despesa?</AlertDialog.Title>
            <AlertDialog.Description>
              {d.grupo_id
                ? "Ela faz parte de uma série. Escolha o que excluir."
                : "Esta ação é permanente e não poderá ser desfeita."}
            </AlertDialog.Description>
            <div className="modal-actions">
              <AlertDialog.Cancel className="btn-ghost">Cancelar</AlertDialog.Cancel>
              <button
                type="button"
                className="btn-danger"
                disabled={excluindo}
                onClick={() => void excluir("uma")}
              >
                {d.grupo_id ? "Só esta" : "Excluir"}
              </button>
              {d.grupo_id && (
                <button
                  type="button"
                  className="btn-danger btn-wide"
                  disabled={excluindo}
                  onClick={() => void excluir("proximas")}
                >
                  Esta e as próximas
                </button>
              )}
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}

function Field({
  icon,
  label,
  children,
  wide = false,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`dt-field ${wide ? "wide" : ""}`}>
      <span className="dt-ic" aria-hidden="true">
        {icon}
      </span>
      <div>
        <dt>{label}</dt>
        <dd>{children}</dd>
      </div>
    </div>
  );
}
