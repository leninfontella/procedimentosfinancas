# Procedimentos de Finanças

Diário pessoal de finanças para registrar despesas e acompanhar gastos. Interface responsiva
(celular e desktop), login por e-mail e senha e dados protegidos no Supabase.

## Funcionalidades

- **Painel**: boas-vindas, atalhos de categoria, despesas a pagar nos próximos dias.
- **Despesas**: navegação por mês, totais pendente e pago, lista agrupada por dia, filtros
  (todas, pendentes, pagas, favoritas) e busca. Toque numa despesa para ver os detalhes,
  pagar, favoritar, ignorar, editar ou excluir.
- **Nova despesa**: valor, pago/não pago, data (hoje, ontem, outra), descrição, favorita,
  categoria, conta, anexo (foto ou PDF), despesa fixa (12 meses), repetir em parcelas
  (`Descrição 1/N`), observações, tags, lembrete e "ignorar despesa" (fora dos totais).
- **Gastos**: total do mês e participação no ano, resumo pago/pendente, gastos por
  categoria, barras mensais do ano e maiores despesas.

## Desenvolvimento

Requer Node.js e npm.

```sh
npm install
copy .env.example .env
npm run dev
```

Preencha o `.env` com a URL e a chave publishable do projeto Supabase.

### Banco de dados (Supabase)

1. No SQL Editor do projeto, execute o arquivo
   `supabase/migrations/20261101100000_financas.sql` inteiro. Ele cria as tabelas
   `despesas` e `perfis`, as políticas RLS e os buckets privados `anexos` e `fotos-perfil`.
   Pode ser executado de novo sem erro.
2. Mantenha o provedor de e-mail habilitado. Com **Authentication → Providers → Email →
   Confirm email** ligado, a pessoa recebe um link de confirmação após o cadastro; desligue
   para permitir o acesso imediato.

Os SQLs do antigo diário de beleza ficam em `supabase/legado/` apenas como histórico e
não devem ser aplicados a este projeto.

## Verificação

```sh
npm test
npm run build
```

## PWA no iPhone

Publique o resultado do build em HTTPS. No Safari, abra o site, toque em Compartilhar e
escolha **Adicionar à Tela de Início**. O ícone abre o app sem a barra do navegador.

O build gera `.output/public/sw.js` com a página inicial, scripts, estilos e imagens.
A leitura e a alteração das despesas exigem conexão com o Supabase; cada conta acessa só
os próprios dados por meio das políticas RLS. No `npm run dev` o service worker fica
desativado; para testar o PWA localmente, use `npm run build` e `npm run preview`.
