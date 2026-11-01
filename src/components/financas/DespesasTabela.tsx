import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowDown,
  ArrowUp,
  Check,
  CircleAlert,
  Eye,
  Heart,
  MoreVertical,
  Pencil,
  Receipt,
  Trash2,
  Undo2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { money, plural, type Despesa } from "@/lib/financas";
import { CategoryBadge } from "./ui";

const dataBR = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;

/** Tabela de despesas do desktop, com seleção para pagar ou excluir várias de uma vez. */
export function DespesasTabela({
  items,
  loaded,
  emptyTitle,
  onOpen,
  onEdit,
  onPay,
  onDelete,
}: {
  items: Despesa[];
  loaded: boolean;
  emptyTitle: string;
  onOpen: (d: Despesa) => void;
  onEdit: (d: Despesa) => void;
  onPay: (ids: string[], pago: boolean) => Promise<void>;
  onDelete: (ids: string[]) => Promise<void>;
}) {
  const [desc, setDesc] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => (desc ? [...items].reverse() : items), [items, desc]);
  // Seleção só vale para as linhas visíveis (troca de mês ou filtro limpa o resto).
  const visibleIds = useMemo(() => new Set(items.map((d) => d.id)), [items]);
  useEffect(() => {
    setSelected((old) => {
      const next = new Set([...old].filter((id) => visibleIds.has(id)));
      return next.size === old.size ? old : next;
    });
  }, [visibleIds]);

  const allChecked = rows.length > 0 && selected.size === rows.length;
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(rows.map((d) => d.id)));
  const toggleOne = (id: string) =>
    setSelected((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function run(task: () => Promise<void>) {
    setBusy(true);
    try {
      await task();
    } finally {
      setBusy(false);
    }
  }

  if (!loaded)
    return (
      <p className="tbl-empty" role="status">
        Carregando suas despesas…
      </p>
    );

  const ids = [...selected];

  return (
    <>
      {ids.length > 0 && (
        <div className="bulk" role="region" aria-label="Ações para as despesas selecionadas">
          <b>{plural(ids.length, "selecionada")}</b>
          <button
            type="button"
            className="bulk-btn"
            disabled={busy}
            onClick={() => void run(() => onPay(ids, true))}
          >
            <Check size={16} aria-hidden="true" /> Marcar como pagas
          </button>
          <button
            type="button"
            className="bulk-btn"
            disabled={busy}
            onClick={() => void run(() => onPay(ids, false))}
          >
            <Undo2 size={16} aria-hidden="true" /> Marcar como pendentes
          </button>
          <button
            type="button"
            className="bulk-btn danger"
            disabled={busy}
            onClick={() => setConfirm(ids)}
          >
            <Trash2 size={16} aria-hidden="true" /> Excluir
          </button>
          <button type="button" className="bulk-clear" onClick={() => setSelected(new Set())}>
            Limpar seleção
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="tbl-empty">
          <Receipt size={30} strokeWidth={1.4} aria-hidden="true" />
          <p>{emptyTitle}</p>
          <span>Use “Nova despesa” para lançar uma despesa.</span>
        </div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th className="tbl-check">
                <input
                  type="checkbox"
                  aria-label="Selecionar todas"
                  checked={allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = selected.size > 0 && !allChecked;
                  }}
                  onChange={toggleAll}
                />
              </th>
              <th>Situação</th>
              <th aria-sort={desc ? "descending" : "ascending"}>
                <button type="button" className="tbl-sort" onClick={() => setDesc((v) => !v)}>
                  Data
                  {desc ? (
                    <ArrowDown size={15} aria-hidden="true" />
                  ) : (
                    <ArrowUp size={15} aria-hidden="true" />
                  )}
                </button>
              </th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Conta</th>
              <th className="tbl-num">Valor</th>
              <th className="tbl-act">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr
                key={d.id}
                className={`${d.ignorada ? "ignored" : ""} ${selected.has(d.id) ? "sel" : ""}`}
                onClick={(event) => {
                  // Clique na linha abre os detalhes; controles da linha tratam o próprio clique.
                  if ((event.target as HTMLElement).closest("button, input, a")) return;
                  onOpen(d);
                }}
              >
                <td className="tbl-check">
                  <input
                    type="checkbox"
                    aria-label={`Selecionar ${d.descricao}`}
                    checked={selected.has(d.id)}
                    onChange={() => toggleOne(d.id)}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className={`tbl-status ${d.pago ? "ok" : ""}`}
                    aria-label={
                      d.pago ? "Paga. Marcar como pendente" : "Pendente. Marcar como paga"
                    }
                    title={d.pago ? "Paga" : "Pendente"}
                    onClick={() => void onPay([d.id], !d.pago)}
                  >
                    {d.pago ? (
                      <Check size={15} strokeWidth={3} aria-hidden="true" />
                    ) : (
                      <CircleAlert size={17} strokeWidth={2.4} aria-hidden="true" />
                    )}
                  </button>
                </td>
                <td className="tbl-date">{dataBR(d.data)}</td>
                <td className="tbl-desc">
                  <button type="button" onClick={() => onOpen(d)}>
                    {d.descricao}
                  </button>
                  {d.favorita && (
                    <Heart className="dx-fav" size={13} fill="currentColor" aria-label="Favorita" />
                  )}
                  {d.ignorada && <small>Ignorada</small>}
                </td>
                <td>
                  <span className="tbl-cat">
                    <CategoryBadge categoria={d.categoria} size={32} />
                    {d.categoria}
                  </span>
                </td>
                <td className="tbl-muted">{d.conta}</td>
                <td className="tbl-num tbl-val">{money(d.valor)}</td>
                <td className="tbl-act">
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger
                      className="tbl-kebab"
                      aria-label={`Ações de ${d.descricao}`}
                    >
                      <MoreVertical size={18} aria-hidden="true" />
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content className="menu-pop" align="end" sideOffset={6}>
                        <DropdownMenu.Item className="menu-item" onSelect={() => onOpen(d)}>
                          <Eye size={16} aria-hidden="true" /> Ver detalhes
                        </DropdownMenu.Item>
                        <DropdownMenu.Item className="menu-item" onSelect={() => onEdit(d)}>
                          <Pencil size={16} aria-hidden="true" /> Editar
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          className="menu-item"
                          onSelect={() => void onPay([d.id], !d.pago)}
                        >
                          {d.pago ? (
                            <Undo2 size={16} aria-hidden="true" />
                          ) : (
                            <Check size={16} aria-hidden="true" />
                          )}
                          {d.pago ? "Marcar como pendente" : "Pagar"}
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className="menu-sep" />
                        <DropdownMenu.Item
                          className="menu-item danger"
                          onSelect={() => setConfirm([d.id])}
                        >
                          <Trash2 size={16} aria-hidden="true" /> Excluir
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <AlertDialog.Root open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="overlay overlay-top" />
          <AlertDialog.Content className="modal">
            <span className="modal-ic danger" aria-hidden="true">
              <Trash2 size={22} />
            </span>
            <AlertDialog.Title>
              {confirm && confirm.length > 1
                ? `Excluir ${plural(confirm.length, "despesa")}?`
                : "Excluir esta despesa?"}
            </AlertDialog.Title>
            <AlertDialog.Description>
              Esta ação é permanente e não poderá ser desfeita.
            </AlertDialog.Description>
            <div className="modal-actions">
              <AlertDialog.Cancel className="btn-ghost">Cancelar</AlertDialog.Cancel>
              <button
                type="button"
                className="btn-danger"
                disabled={busy}
                onClick={() =>
                  confirm &&
                  void run(async () => {
                    await onDelete(confirm);
                    setSelected(new Set());
                    setConfirm(null);
                  })
                }
              >
                Excluir
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
