import {
  Banknote,
  BookOpen,
  Car,
  Ellipsis,
  Film,
  Gamepad2,
  HeartPulse,
  Home,
  Music,
  PawPrint,
  Plane,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Tag,
  Utensils,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type Despesa = {
  id: string;
  descricao: string;
  valor: number;
  data: string; // AAAA-MM-DD
  pago: boolean;
  categoria: string;
  conta: string;
  tags: string[];
  observacoes: string | null;
  anexo_path: string | null;
  favorita: boolean;
  fixa: boolean;
  lembrete: boolean;
  ignorada: boolean;
  grupo_id: string | null;
  parcela: number | null;
  total_parcelas: number | null;
};

/** Campos que o formulário grava (o resto vem do banco). */
export type DespesaValores = Omit<
  Despesa,
  "id" | "anexo_path" | "grupo_id" | "parcela" | "total_parcelas"
>;

export const SELECT_DESPESA =
  "id, descricao, valor, data, pago, categoria, conta, tags, observacoes, anexo_path, favorita, fixa, lembrete, ignorada, grupo_id, parcela, total_parcelas";

/** Normaliza a linha vinda do Supabase (numeric chega como texto). */
export function fromRow(row: Record<string, unknown>): Despesa {
  return {
    ...(row as Despesa),
    valor: Number(row["valor"]),
    tags: Array.isArray(row["tags"]) ? (row["tags"] as string[]) : [],
  };
}

type CategoriaInfo = { nome: string; icon: LucideIcon; cor: string };

export const CATEGORIAS: CategoriaInfo[] = [
  { nome: "Moradia", icon: Home, cor: "#2f8f83" },
  { nome: "Supermercado", icon: ShoppingCart, cor: "#d9822b" },
  { nome: "Alimentação", icon: Utensils, cor: "#c0612b" },
  { nome: "Transporte", icon: Car, cor: "#4a6fd1" },
  { nome: "Saúde", icon: HeartPulse, cor: "#d2475b" },
  { nome: "Educação", icon: BookOpen, cor: "#8e3fd0" },
  { nome: "Contas", icon: Zap, cor: "#b8901c" },
  { nome: "Assinaturas", icon: Music, cor: "#6f992d" },
  { nome: "TV", icon: Film, cor: "#3c3c3e" },
  { nome: "Lazer", icon: Gamepad2, cor: "#c2417f" },
  { nome: "Celular", icon: Smartphone, cor: "#4397c6" },
  { nome: "Cartão", icon: Banknote, cor: "#0b0b0c" },
  { nome: "Compras", icon: ShoppingBag, cor: "#a0457a" },
  { nome: "Vestuário", icon: Shirt, cor: "#8e1b10" },
  { nome: "Pets", icon: PawPrint, cor: "#a0673b" },
  { nome: "Viagem", icon: Plane, cor: "#2c7da0" },
  { nome: "Outros", icon: Ellipsis, cor: "#5a5a60" },
];

/** Atalhos do Painel. */
export const ATALHOS = ["Moradia", "Contas", "Transporte", "Saúde", "Outros"];

const CORES_LIVRES = ["#4397c6", "#6f992d", "#8e3fd0", "#c2417f", "#d9822b", "#2f8f83"];

/** Ícone e cor da categoria; categorias criadas pela pessoa ganham uma cor estável. */
export function categoriaInfo(nome: string): CategoriaInfo {
  const conhecida = CATEGORIAS.find((c) => c.nome === nome);
  if (conhecida) return conhecida;
  let hash = 0;
  for (const ch of nome) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return { nome, icon: Tag, cor: CORES_LIVRES[hash % CORES_LIVRES.length] ?? "#5a5a60" };
}

export const CONTAS = ["Carteira", "Conta corrente", "Poupança", "Cartão de crédito"];

export const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const money = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const parse = (s: string) => new Date(`${s}T12:00:00`);

/** Mesma data N meses depois; dia 31 vira o último dia do mês quando ele for menor. */
export function addMonths(s: string, n: number) {
  const d = parse(s);
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1, 12);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, last));
  return dateKey(target);
}

/** "Quinta-feira, 05" */
export function dayHeading(s: string) {
  const weekday = parse(s).toLocaleDateString("pt-BR", { weekday: "long" });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${s.slice(8, 10)}`;
}

/** "5 de nov. de 2026" */
export const longDate = (s: string) =>
  parse(s).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });

export const shortDate = (s: string) =>
  parse(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

export const plural = (n: number, singular: string, pluralForm = `${singular}s`) =>
  `${n} ${n === 1 ? singular : pluralForm}`;

/** Soma ignorando as despesas marcadas como "Ignorar despesa". */
export const soma = (lista: Despesa[]) =>
  lista.reduce((total, d) => (d.ignorada ? total : total + d.valor), 0);
