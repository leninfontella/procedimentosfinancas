# Procedimentos de Finanças

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose

Diário pessoal de despesas e gastos. O projeto usa React, TanStack Start, Vite, autenticação por e-mail e senha e Supabase (projeto imcbpiltrxyykwouekbp) para persistência.

## Capabilities and Constraints

Inclusão, edição, exclusão (só esta ou esta e as próximas de uma série), pagar/não pagar, favoritar e ignorar despesas; despesa fixa (12 meses) e repetição em parcelas; anexos (foto ou PDF); totais mensais e anuais. Os dados ficam no Supabase, isolados por usuário com RLS, e não no navegador.

## Brand Commitments

Layout do Painel conforme a referência "Procedimentos de Barbearia" fornecida pelo usuário, com o título "Procedimentos de Finanças". Telas de despesas (lista, nova despesa e detalhes) conforme as capturas de referência em tema escuro. Acento coral #FC836D, amostrado da referência, substitui o rosa antigo. Preservar o histórico Git publicado.

## Open Decisions

Somente despesas por enquanto (sem receitas). O lembrete é guardado na despesa, mas ainda não envia notificações.
