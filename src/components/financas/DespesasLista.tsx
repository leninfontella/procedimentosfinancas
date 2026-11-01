import { Check, Heart, Pin, Receipt } from "lucide-react";
import { dayHeading, money, type Despesa } from "@/lib/financas";
import { CategoryBadge } from "./ui";

export function DespesaItem({
  despesa: d,
  onOpen,
  extra,
}: {
  despesa: Despesa;
  onOpen: (d: Despesa) => void;
  extra?: string;
}) {
  return (
    <li>
      <button
        type="button"
        className={`dx ${d.ignorada ? "ignored" : ""}`}
        onClick={() => onOpen(d)}
      >
        <CategoryBadge categoria={d.categoria} />
        <span className="dx-info">
          <b>
            {d.descricao}
            {d.favorita && (
              <Heart className="dx-fav" size={14} fill="currentColor" aria-label="Favorita" />
            )}
          </b>
          <small>
            {d.categoria} <i aria-hidden="true">|</i> {d.conta}
            {d.ignorada && <em> · Ignorada</em>}
            {extra && <em> · {extra}</em>}
          </small>
        </span>
        <span className="dx-val">
          <strong>{money(d.valor)}</strong>
          <span
            className={`dx-st ${d.pago ? "ok" : ""}`}
            role="img"
            aria-label={d.pago ? "Paga" : "Pendente"}
          >
            {d.pago ? <Check size={14} strokeWidth={3} /> : <Pin size={13} strokeWidth={2.2} />}
          </span>
        </span>
      </button>
    </li>
  );
}

export function DespesasPorDia({
  items,
  loaded,
  onOpen,
  emptyTitle = "Nenhuma despesa neste mês.",
}: {
  items: Despesa[];
  loaded: boolean;
  onOpen: (d: Despesa) => void;
  emptyTitle?: string;
}) {
  if (!loaded)
    return (
      <p className="empty" role="status">
        Carregando suas despesas…
      </p>
    );
  if (!items.length)
    return (
      <div className="empty">
        <Receipt size={30} strokeWidth={1.4} aria-hidden="true" />
        <p>{emptyTitle}</p>
        <span>Toque em + para lançar uma despesa.</span>
      </div>
    );

  const days = items.reduce<Map<string, Despesa[]>>((map, d) => {
    map.set(d.data, [...(map.get(d.data) ?? []), d]);
    return map;
  }, new Map());

  return (
    <>
      {Array.from(days, ([day, list]) => (
        <section key={day} className="day" aria-labelledby={`dia-${day}`}>
          <div className="sec">
            <h2 id={`dia-${day}`}>{dayHeading(day)}</h2>
          </div>
          <ul className="dx-list">
            {list.map((d) => (
              <DespesaItem key={d.id} despesa={d} onOpen={onOpen} />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
