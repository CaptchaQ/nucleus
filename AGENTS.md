# AGENTS.md — инструкция для агентов, работающих с nucleus

Прочитай целиком перед началом любой работы. nucleus — **тонкий оркестратор**:
он не имеет собственных скилов, только маршрутизирует агентский цикл
`idea → ship` по **реальным внешним скилам**, вендоренным в `skills/<vendor>/`.
Все скилы — боевые upstream-файлы (mattpocock/skills · affaan-m/ECC ·
crimeacs/auto-improve · emilkowalski/skills · google-labs-code/stitch-skills),
скопированные дословно с атрибуцией в каждом `skills/<vendor>/ATTRIBUTION.md`.

---

## 0. Что значит «тонкий оркестратор»

nucleus не переделывает чужие скилы. Когда человек говорит «хочу создать X»,
ты запускаешь **настоящие** upstream-скилы (имена `/grilling`, `/wayfinder`,
`/tdd`, `/code-review`… — как в их frontmatter). nucleus только: (1) ставит
их в харнесс одним `install.sh`, (2) задаёт общий цикл `idea → ship`, (3)
соединяет фазы. Любой скил вызывай по его настоящему имени и читай его
оригинальный SKILL.md, не подменяй.

## 1. Главная цикло — idea → ship

```
[setup-matt-pocock-skills] → /grilling → /domain-modeling
                                       ↘ /wayfinder (если большой/туманный)
                          → /to-spec → /to-tickets → /implement (→ /tdd внутри)
                                                            ↘ /code-review (two axes) → ship
                                                            ↘ /auto-improve (GAN polish)
                                                            ↘ orchestrate: /research, /prototype, /handoff, /audit-then-plan
```

| Фаза | Скил (vendored) | Где лежит (skills/<vendor>/) |
|------|-----------------|------------------------------|
| Setup | `setup-matt-pocock-skills` | mattpocock (tracker/labels/docs) |
| Интервью | `grilling` (`grill-me`, `grill-with-docs`) | mattpocock |
| Глоссарий/ADR | `domain-modeling` | mattpocock |
| Карта (большой) | `wayfinder` | mattpocock |
| Спека | `to-spec` | mattpocock |
| Тикеты | `to-tickets` | mattpocock |
| Реализация | `implement` (гонит `tdd`) | mattpocock |
| TDD | `tdd` | mattpocock (библиотека code) |
| Ревью | `code-review` (2 subagent) | mattpocock |
| Улучшение код-базы | `improve-codebase-architecture` | mattpocock |
| Авто-улучшение (GAN) | `auto-improve` (improve.py) | crimeacs/auto-improve |
| API дизайн | `api-design` | affaan-m/ECC |
| UX/motion review | `review-animations`, `improve-animations` | emilkowalski |
| Прототип | `prototype` | mattpocock (или emilkowalski/prototype) |
| Дебаг | `diagnosing-bugs` | mattpocock |
| Разведка | `research` (subagent) | mattpocock |
| Phase boundaries | `ask-matt` (роутер mattpocock), `handoff` | mattpocock |

## 2. Run-through для «хочу создать X»

1. Если нет `.agents/` конфига репозитория — один раз `/setup-matt-pocock-skills`
   (issue-tracker, triage labels, место доков). Это upstream setup-скил MC.
2. **`/grilling`** (mattpocock) — дизайновское дерево интервью: раунды с
   фронтиром, рекомендованные ответы, факты ищет агент (сабагент-`/research`),
   решения — человек. البس с парами ``/domain-modeling`` чтобы писать
   `CONTEXT.md` (упиквитous language) и ADR в момент.
3. Если проект **больше одной сессии/туманно** → `/wayfinder` (карта
   decision-тикетов, frontier, HITL/AFK). Если влезает в сессию — доходи.
4. **`/to-spec`** — свернуть разговор в построимую спецификацию на трекере.
5. **`/to-tickets`** — распилить на tracer-bullet тикеты с блокирование
   рёбрами.
6. **`/implement`** по каждому тикету (с `/clear` между ними); внутри
   гонит **`/tdd`** (red→green, seams, vertical slices), замыкает
   **`/code-review`** (две параллельных оси: Standards+Spec, fresh subagents).
7. Полировка / повторяющийся запах → `/auto-improve` (crimeacs, GAN: мутатор ≠
   судья, pairwise-gate, три стопора от зацикливания) или
   `/improve-codebase-architecture` (mattpocock, survey→grilling loop).
8. UX/animation правки → `review-animations` + `improve-animations`
   (emilkowalski): frequency-gate, таблицы Before/After/Why, Block/Approve.
9. API/контракт → `api-design` (ECC): deep modules, ubiquitous language,
   canonical errors.

## 3. Обязательно перед стартом

- Прочитай AGENTS.md целиком (этот файл).
- `/setup-matt-pocock-skills` если нет конфига трекера.
- **`/grilling` пока нет `CONTEXT.md`/профиля.** Никакого кода до интервью.
  Исключение — человек явно «не спрашивай, делай» или мелкая правка.

## 4. Рабочие правила

1. **Вызывай скил по его настоящему `/name`** из frontmatter. Не коняй его
   собственной версией — в nucleus их нет.
2. **Оригинал SKILL.md — источник правды.** Перед тем как применить — прочитай
   `skills/<vendor>/<name>/SKILL.md` дословно.
3. **Профиль/CONTEXT — контракт.** Код не противоречит `CONTEXT.md`
   (ubiquitous language) и `setup-matt-pocock-skills` конфигу.
4. **Facts — агент, решения — человека.** (правило `/grilling`)
5. **Свежий взгляд:** `/code-review` и любая ревизия — в отдельном
   субагенте, не в окне реализатора.
6. **No invented values** (emilkowalski): значения тяги из каталога upstream
   скила, не выдумывай.
7. **Phase boundaries** — см. `ask-matt` (mattpocock роутер): continue /
   subagent / compact / clear / handoff. Continue проверь и отвергни первым.
8. **Не выдумывай.** Чего нет в профиле/spec/CONTEXT — уточни, не додумывай.

## 5. Где что лежит / атрибуция

```
skills/
├── mattpocock/<name>/SKILL.md  ← интервью, wayfinder, to-spec, tdd, code-review, ...
├── auto-improve/SKILL.md+improve.py+criteria/  ← GAN auto-improve (crimeacs)
├── ecc/<name>/SKILL.md         ← api-design и др. (affaan-m/ECC)
├── emilkowalski/<name>/SKILL.md ← review-animations, improve-animations, animate, ...
├── stitch-skills/              ← google-labs-code/stitch-skills ( смотри NOTE.md внутри)
```
Каждый `skills/<vendor>/ATTRIBUTION.md` — upstream URL + commit SHA + дата
клонирования. Каждый `skills/<vendor>/LICENSE` — копия upstream-лицензии.
 Все скилы в их оригинальном виде; nucleus не редактировал их содержимое.

## 6. Источники механик

Цикл idea→ship, grilling, wayfinder, domain-modeling, to-spec, to-tickets,
implement, tdd, code-review, diagnosing-bugs, research, prototype, handoff,
setup — [mattpocock/skills](https://github.com/mattpocock/skills).
GAN-цикл авто-улучшения (судья≠мутатор, pairwise, anti-slop) —
[crimeacs/auto-improve](https://github.com/crimeacs/auto-improve).
API/контракт-дизайн, deep modules — [affaan-m/ECC](https://github.com/affaan-m/ECC).
UX/motion review, frequency-gate, strict output, audit-then-plan —
[emilkowalski/skills](https://github.com/emilkowalski/skills).
Композиция «baton» — [google-labs-code/stitch-skills](https://github.com/google-labs-code/stitch-skills).
UX-эвристики — [keepsimple.io/ru/uxcore](https://keepsimple.io/ru/uxcore).
Библиотека промптов/параметризация — [f/prompts.chat](https://github.com/f/prompts.chat).

## 7. Установка в проект

```bash
bash install.sh --harness opencode,claude-code,codex,omp
# или Windows
.\\install.ps1 -Harness opencode,claude-code,codex,omp
```
Копирует все vendored скилы в каталоги скилов харнессов и кладёт этот
AGENTS.md в текущую папку. См. `install.sh --help`.

## 8. Формат ответов

- Начни с **вывода**: «Делаю X, потому что Y».
- Ссылайся на скилы по настоящему имени (`/grilling`, `/code-review`…).
- После фазы — краткий итог: что сделано, что осталось, следующий шаг.