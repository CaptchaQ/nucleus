# Каталог интегрированных ресурсов

Nucleus объединяет 7 внешних экосистем + собственные встроенные скилы. Каждая
интеграция подключается по одной из трёх стратегий:

| Стратегия | Что это | Пример |
|-----------|---------|--------|
| **npx-skills** | установка скилов через стандарт `npx skills add <repo>` | mattpocock, ECC, emilkowalski, stitch, auto-improve |
| **MCP / datasource** | не скил, а источник промптов/рубрик, подключаемый как MCP-сервер | prompts.chat, uxcore |
| **overlay / builtin** | скил живёт в самом репо (`.agent-forge/skills` или `skills/`) | nucleus-init, nucleus-skill-add |

## m-decoded source map

| # | Ресурс | Тип | Роль в nucleus | Фаза |
|---|--------|-----|----------------|------|
| 1 | [mattpocock/skills](https://github.com/mattpocock/skills) | npx-skills | grill-me/grilling → фаза допроса; wayfinder → decision tickets; tdd/code-review/diagnosing-bugs → инженерные циклы | init, wayfind |
| 2 | [affaan-m/ECC](https://github.com/affaan-m/ECC) | npx-skills | 281 скил / 67 агентов: deep-research, e2e-testing, eval-harness, coding-standards, security-scan, backend-patterns → оркестрация субагентов | orchestrate, load |
| 3 | [f/prompts.chat](https://github.com/f/prompts.chat) | MCP | крупнейшая открытая библиотека промптов; источник ролей/промптов для субагентов оркестра | orchestrate |
| 4 | [google-labs-code/stitch-skills](https://github.com/google-labs-code/stitch-skills) | npx-skills | дизайн-генерация: generate-design, react-components, shadcn-ui, extract-design-md, code-to-design → для UI проектов | load |
| 5 | [emilkowalski/skills](https://github.com/emilkowalski/skills) | npx-skills | вкус/полировка: emil-design-eng, review-animations, improve-animations, pick-ui-library, apple-design → UI-качество | load |
| 6 | [keepsimple.io/uxcore](https://keepsimple.io/ru/uxcore) | datasource | библиотека когнитивных искажений и nudge-стратегий; рубрики UX для продуктовых проектов | improve (рубрики) |
| 7 | [crimeacs/auto-improve](https://github.com/crimeacs/auto-improve) | npx-skills + python | GAN-цикл самоулучшения текстовых артефактов (port в `python/nucleus_improve`) | improve |
| — | nucleus (этот репозиторий) | builtin | nucleus-agent, nucleus-init, nucleus-wayfind, nucleus-orchestrate, nucleus-improve, nucleus-skill-add | все |

## Что взять из каждого (для чтения README расшифровка)

1. **mattpocock** — главный источник философии фазы допроса: *коммуникационный
   разрыв между заказчиком и агентом — #1 провал ИИ-разработки*. Grill-Me,
   Grill-With-Docs (создаёт ADR + глоссарий по ходу), Wayfinder (карта decision
   tickets). Взята идея: "факты — ищи сам, решения — спрашивай у пользователя".
2. **ECC** — доказательство ценности полного харнеса (plan→test→implement→
   review→verify→remember→improve). Взята оркестрация субагентов + memory store
   + идея 67 агентов/281 скила как источника каталога.
3. **prompts.chat** — самый большой каталог промптов; роль — *MCP-сервер*, из
   которого оркестр берёт промпты-роли для субагентов.
4. **stitch-skills** — дизайн-генерация по стандарту Agent Skills; взяты скилы
   для превращения дизайна в React-код и DESIGN.md-токены.
5. **emilkowalski** — "у агентов нет вкуса"; взяты скилы полировки UI,
   анимаций, выбора UI-библиотек.
6. **uxcore** — первая и крупнейшая библиотека когнитивных искажений +
   nudge-стратегий; роль — рубрики UX, повышающие качество продуктовых решений.
7. **auto-improve** — порт ядра GAN-цикла (mutate→score→pairwise→commit) в
   `python/nucleus_improve`; юзер-видимая команда `nucleus improve`.

## Как добавить новый внешний источник

1. Добавьте запись в `SKILL_SOURCES` в `src/loader/runner.ts`.
2. Сопоставьте его скилы ролям в `ROLE_BY_SKILL` в
   `src/orchestrator/runner.ts`.
3. Обновите `PROFILE.md` в `profiles/<domain>/` и этот каталог.
4. `npm run reindex` синхронизирует README-таблицу.