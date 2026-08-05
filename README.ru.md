<p align="center">
  <img src="assets/nucleus-banner.svg" alt="nucleus — thin orchestrator for AI coding agents" width="780">
</p>

# nucleus — тонкий оркестратор для AI-кодинг-агентов

nucleus **не имеет собственных скилов**. Он вендорит **боевые** скилы из
реальных upstream-репозиториев и маршрутизирует агентский цикл
`idea → ship` по ним дословно. Запускаете агента в папке проекта и говорите
«хочу создать X» — он гонит вас через настоящий `/grilling`, `/wayfinder`,
`/to-spec`, `/implement`→`/tdd`→`/code-review`, `/auto-improve` — то, что
люди реально используют в активе, а не наш рерайт.

Все скилы — **копии upstream SKILL.md дословно** (плюс `LICENSE` и
`ATTRIBUTION.md` с commit SHA каждого источника). nucleus не правит их
содержимое.

## Идея → поставка (идея→ship)

```
[setup-matt-pocock-skills] → /grilling (+/domain-modeling)
                            → /wayfinder (если большой/туманный)
                            → /to-spec → /to-tickets → /implement
                            (внутри: /tdd, замыкает: /code-review — 2 subagent)
                            ↘ /auto-improve (GAN polish)
                            ↘ /review-animations, /improve-animations (UX/motion)
                            ↘ /api-design (ECC)
```

## Вендоры (skills/<vendor>/)

| Vendor | Скилов | Что это | Источник |
|--------|--------|---------|----------|
| `mattpocock` | 25 | интервью grilling, wayfinder, to-spec/to-tickets, implement, tdd, code-review, domain-modeling, ask-matt (роутер), setup, prototype, research, handoff, … | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `auto-improve` | 1 | GAN-цикл авто-улучшения: мутатор ≠ судья, pairwise-gate, три стопора от зацикливания, `improve.py` + `criteria/` | [crimeacs/auto-improve](https://github.com/crimeacs/auto-improve) |
| `emilkowalski` | 9 | UX/motion review (`review-animations`, `improve-animations`), animate, prototype, pick-ui-library, design-eng | [emilkowalski/skills](https://github.com/emilkowalski/skills) |
| `ecc` | 3 | `api-design`, `security-review`, `tdd-workflow` | [affaan-m/ECC](https://github.com/affaan-m/ECC) |
| `stitch-skills` | 15 | дизайн-скилы Google Stitch + `stitch-loop` (baton-композиция), `generate-design`, `manage-design-system`, `react-*`, `shadcn-ui`, `remotion` | [google-labs-code/stitch-skills](https://github.com/google-labs-code/stitch-skills) |

**Итого 53 реальных скила.** Каждый `skills/<vendor>/ATTRIBUTION.md` — upstream
URL + commit SHA + дата клонирования. Каждый `skills/<vendor>/LICENSE` — копия
upstream лицензии.

## Быстрый старт

```bash
# Все харнессы, все вендоры
bash <(curl -fsSL https://raw.githubusercontent.com/CaptchaQ/nucleus/main/install.sh)

# Только нужные харнессы и вендоры под стек
bash install.sh --harness opencode --vendors mattpocock,auto-improve,ecc

# Windows PowerShell
irm https://raw.githubusercontent.com/CaptchaQ/nucleus/main/install.ps1 | iex
```

`install.sh` копирует vendored скилы в каталоги скилов харнесса (core —
`skills/<vendor>/<skill>/`) и кладёт `AGENTS.md` (тонкий роутер) в текущую
папку.

| Харнесс | Каталог |
|---------|---------|
| opencode | `~/.config/opencode/skills/` |
| claude-code | `~/.claude/skills/` |
| codex | `~/.codex/skills/` |
| omp | `~/.agents/skills/` |

Запускаете агента и говорите: «хочу создать …, сначала интервью `/grilling`».

## Как работать (для агента)

Полная инструкция — в [`AGENTS.md`](AGENTS.md). Суть: вызывайте скилы по их
**настоящему** upstream-имени (`/grilling`, `/wayfinder`, `/tdd`…), читайте
оригинальный `skills/<vendor>/<name>/SKILL.md` перед применением. nucleus
только задаёт общий цикл `idea → ship` и склеивает фазы. setup → grilling →
(domain-modeling, CONTEXT.md/ADR) → wayfinder|to-spec → to-tickets →
implement(tdd) → code-review → ship, плюс auto-improve для полировки,
review-animations для UX, api-design для контрактов.

## Атрибуция

nucleus распределяет эти наборы скилов **как есть**, сохраняя upstream
лицензии (MIT / Apache-2.0). См. `skills/<vendor>/ATTRIBUTION.md` для
конкретного commit SHA каждого источника. Сам nucleus MIT.

## Лицензия

[MIT](LICENSE).