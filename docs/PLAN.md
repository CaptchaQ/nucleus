# PLAN — nucleus v0.1.0

Как `nucleus` доводит проект от идеи до рабочего оркестра субагентов, и что
стоит за каждой фазой.

## Миссия

Закрыть главный провал агентной разработки — коммуникационный разрыв между
заказчиком и агентом — и довести «хочу приложение» до измеримо лучшего
артефакта, минуя «переписывание вслепую».

## Фазы (конвейер)

| # | Фаза | Команда | Артефакты | Источник методики |
|---|------|---------|-----------|-------------------|
| 1 | Допрос | `nucleus init` | `profile.json`, `docs/adr/0001-destination.md`, `CONTEXT.md` | mattpocock/grilling |
| 2 | Decision tickets | `nucleus wayfind` | `.agent-forge/wayfinder.json` | mattpocock/wayfinder |
| 3 | Загрузка скилов | `nucleus load` | `.agent-forge/bundle.json` | гибридный лоадер (npx + overlay + builtin) |
| 4 | Оркестрация | `nucleus orchestrate` | `.agent-forge/orchestration.json` | ECC, prompts.chat |
| 5 | Самоулучшение | `nucleus improve <file>` | `results/<tag>.tsv`, ветка `improve/<tag>` | crimeacs/auto-improve (port) |

## Структура ядра

```
src/
  types.ts            — контракты между фазами (ProjectProfile, SkillRef,
                        WayfinderMap, SubagentSpec, MemoryStore, ImproveConfig)
  grill/runner.ts     — фаза 1: вопросы, построение профиля, ADR + CONTEXT
  wayfinder/runner.ts — фаза 2: карта, frontier/claim/resolve/ruleOutOfScope
  loader/runner.ts    — фаза 3: SKILL_SOURCES (7 интеграций), парсинг
                        frontmatter, сканирование каталогов, installExternal
  orchestrator/runner.ts — фаза 4: ROLE_BY_SKILL, DAG, память
  cli/index.ts        — entrypoint + cmdInit/cmdWayfind/cmdLoad/cmdOrchestrate/
                        cmdImprove/cmdSkillAdd/cmdCatalog/cmdDoctor + шаблон SKILL
python/nucleus_improve/ — фаза 5: GAN-цикл (mutate→score→pairwise→commit),
                        провайдеры Gemini/OpenAI, dummy-режим
scripts/reindex.mjs — синхронизация таблицы скилов в README
skills/              — builtin-скилы (nucleus-init, -wayfind, -orchestrate,
                        -improve, -skill-add)
profiles/<domain>/   — рекомендуемые бандлы по доменам
catalog/index.md     — каталог 7 источников + nucleus
```

## Принципы

1. **Один вопрос за раз.** Несколько вопросов одновременно — это ошеломление.
2. **Факты — ищи, решения — спрашивай.** Агент сам находит то, что можно
   найти, и спрашивает только о решениях.
3. **Ticket = решение, не срез работы.** Карта закончена, когда больше нечего
   решать перед тем, как делать.
4. **Судья отделён от мутатора.** Улучшение меряется рубрикой отдельной
   моделью, иначе «улучшение» — просто вкусовщина.
5. **Делегируй, не сжимай.** Под давлением объёма — порождай субагентов, не
   бросай фазы.
6. **Расширяемость встроена.** Новый скил = новая папка + `npm run reindex`;
   `ROLE_BY_SKILL` автоматически адресует его субагенту.

## План релиза

- [x] Анализ 7 экосистем (docs/ANALYSIS.md)
- [x] Контракты фаз (src/types.ts)
- [x] Ядро: grill / wayfind / loader / orchestrate / CLI (0 ошибок tsc)
- [x] Python bridge auto-improve (dummy-прогон зелёный)
- [x] Builtin-скилы, профили по доменам, каталог интеграций
- [x] README RU + EN, баннер, reindex-скрипт
- [ ] CI: tsc --noEmit + python `--help` (GitHub Actions)
- [ ] Публикация на GitHub + push

## Известные границы v0.1

- `init`/`wayfind` интерактивны; для неинтерактивных сред нужен явный
  пайп ответов или `--defaults` (следующий релиз).
- `improve` требует API-ключ модели (GEMINI/OPENAI); `--dummy` доступен для
  проверки конвейера без сети.
- Оверлейные скилы пользователя живут в `.agent-forge/` и версионируются самим
  репозиторием проекта.