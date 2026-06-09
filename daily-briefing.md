# Daily Work Briefing

Run this prompt to generate a daily overview of my workday across all my company connectors.

## Prompt

Gera o meu briefing diário de trabalho para hoje, usando os connectors disponíveis:

1. **Google Calendar** — lista todas as reuniões de hoje. Para cada uma mostra:
   - Hora em GMT (Lisboa) e EST (NY)
   - Duração
   - Participantes principais
   - Sinaliza conflitos de horário (sobreposições)

2. **Gmail** — emails por ler das últimas 24h (resumo curto de cada um).

3. **Granola** — follow-ups, decisões e action items das reuniões recentes.
   - **IMPORTANTE: incluir apenas calls relacionadas com a Code and Theory** (participantes @codeandtheory.com ou projetos C&T como TIME, Firefly, Pirilampos). Ignorar todas as restantes.

4. **Slack** — mensagens dirigidas a mim e atividade recente relevante.

Apresenta tudo num formato compacto e fácil de ler, com a agenda em tabela (colunas: GMT, EST, Duração, Reunião).
