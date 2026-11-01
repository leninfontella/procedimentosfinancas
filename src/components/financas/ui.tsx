import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { ReactNode } from "react";
import { categoriaInfo, MESES, money } from "@/lib/financas";

/** Valor em reais com os centavos atenuados. */
export function Money({ value }: { value: number }) {
  const formatted = money(value);
  const comma = formatted.lastIndexOf(",");
  return (
    <>
      {formatted.slice(0, comma)}
      <span className="cents">{formatted.slice(comma)}</span>
    </>
  );
}

/** Interruptor no estilo das referências (trilho cinza, bolinha branca, coral quando ligado). */
export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className="switch"
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

/** Círculo colorido com o ícone da categoria. */
export function CategoryBadge({ categoria, size = 52 }: { categoria: string; size?: number }) {
  const { icon: Icon, cor } = categoriaInfo(categoria);
  return (
    <span
      className="cat-badge"
      style={{ background: cor, width: size, height: size }}
      aria-hidden="true"
    >
      <Icon size={Math.round(size * 0.44)} strokeWidth={1.7} />
    </span>
  );
}

/** "‹ Novembro ›" — o ano aparece quando não é o atual. */
export function MonthNav({
  month,
  onChange,
  className = "",
  showYear = false,
}: {
  month: Date;
  onChange: (d: Date) => void;
  className?: string;
  showYear?: boolean;
}) {
  const label = `${MESES[month.getMonth()]}${
    showYear || month.getFullYear() !== new Date().getFullYear() ? ` ${month.getFullYear()}` : ""
  }`;
  return (
    <div className={`month-nav ${className}`}>
      <button
        type="button"
        aria-label="Mês anterior"
        onClick={() => onChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
      >
        <ChevronLeft size={26} strokeWidth={1.6} aria-hidden="true" />
      </button>
      <h2 aria-live="polite">{label}</h2>
      <button
        type="button"
        aria-label="Próximo mês"
        onClick={() => onChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
      >
        <ChevronRight size={26} strokeWidth={1.6} aria-hidden="true" />
      </button>
    </div>
  );
}

/** Folha que sobe da base no celular e vira janela central no desktop. */
export function Sheet({
  open,
  onOpenChange,
  title,
  hideTitle = false,
  actions,
  children,
  className = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  hideTitle?: boolean;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className={`sheet ${className}`} aria-describedby={undefined}>
          <div className="sheet-grip" aria-hidden="true" />
          <div className="sheet-head">
            <Dialog.Title className={hideTitle ? "sr-only" : "sheet-title"}>{title}</Dialog.Title>
            <div className="sheet-actions">
              {actions}
              <Dialog.Close className="sheet-icon" aria-label="Fechar">
                <X size={20} aria-hidden="true" />
              </Dialog.Close>
            </div>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
