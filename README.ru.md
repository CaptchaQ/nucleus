<p align="center">
  <img src="assets/nucleus-banner.svg" alt="nucleus — skills for AI coding agents" width="780">
</p>

# nucleus — навыки для AI-кодинг-агентов

Nucleus — это **набор SKILL.md** (плюс системный промпт `AGENTS.md`) для
AI-кодинг-агентов: opencode, claude-code, codex, omp. Когда вы говорите
«хочу создать X», агент **сначала интервьюирует вас** (дизайн-дерево с
фронтиром), **фиксирует профиль**, затем **подгружает проектные навыки**
под стек/домен и **оркеструет субагентов** для автономной работы.

Никакого CLI, npm-пакетов, сборки — это просто файлы с инструкциями.

## Идея → поставка

```
setup → grilling → stitch → (wayfinder|spec) → implement → review → ship
                                                       ↘ improve (цикл)
                                                       ↘ orchestrate (субагенты)
```

1. **`/setup`** — один раз: issue-tracker, метки, место доков.
2. **`/grilling`** — беспощадное интервью дизайн-деревом (раунды, фронтир,
   рекомендованные ответы). Факты ищет агент, решения — человек. Результат:
   `.agent-forge/profile.json`, `CONTEXT.md`, ADR.
3. **`/stitch`** — подгрузить под домен/стек навыки из `skills/library/`.
4. **`/wayfinder`** — если большой/туманный проект: карта decision-тикетов.
5. **`/spec`** — свернуть разговор в спецификацию на трекере.
6. **`/implement`** (через `/tdd` из библиотеки), замыкает **`/review`**
   (две оси: Standards+Spec, параллельными субагентами).
7. **`/improve`** — GAN-цикл доработки (судья ≠ мутатор, pairwise-gate, три
   стопора от зацикливания).
8. **`/orchestrate`** — для крупного: роли (planner/implementer/reviewer/…)
   и параллельные субагенты, self-contained планы.

## Навыки ядра (`skills/<name>/SKILL.md`)

| Навык | Когда применять |
|------|-----------------|
| `skills/setup/SKILL.md` | Первичная настройка проекта (tracker/labels/docs) |
| `skills/grilling/SKILL.md` | Интервью дизайн-деревом перед стартом; заполняет profile.json/CONTEXT.md/ADR |
| `skills/stitch/SKILL.md` | После grilling — подгрузить библиотечные навыки под домен/стек |
| `skills/wayfinder/SKILL.md` | Большой/туманный проект — карта decision-тикетов |
| `skills/spec/SKILL.md` | После grilling/wayfinder — спецификация из разговора |
| `skills/orchestrate/SKILL.md` | Этап большой — распределить по ролям и субагентам |
| `skills/review/SKILL.md` | Code-review диффа двумя осями свежими субагентами |
| `skills/improve/SKILL.md` | Доработка GAN-циклом (мутатор/судья/pairwise/чекпойнт) |
| `skills/domain/SKILL.md` | Активно строить CONTEXT.md (глоссарий) и ADR |
| `skills/skill-add/SKILL.md` | Создать новый навык в skills/ или skills/library/ |

## Библиотека под проект (`skills/library/<name>/SKILL.md`)

| Навык | Когда применять |
|------|-----------------|
| `skills/library/tdd/SKILL.md` | red→green loop, seams, vertical slices |
| `skills/library/debug/SKILL.md` | Сопротивляющиеся баги — tight red loop, gated фазы |
| `skills/library/ux-review/SKILL.md` | UI/UX правки — frequency-gate, Before/After/Why, Block/Approve |
| `skills/library/api-design/SKILL.md` | Проектирование API/контракта — deep modules, canonical errors |
| `skills/library/prototype/SKILL.md` | Дизайн-вопрос требует runnable ответа — throwaway, N вариантов |

Новый навык → `skill-add`. Подгрузить под проект → `stitch`.

## Быстрый старт

```bash
# POSIX — все харнессы, вся библиотека
bash <(curl -fsSL https://raw.githubusercontent.com/CaptchaQ/nucleus/main/install.sh)

# Только часть библиотеки под стек
bash install.sh --harness opencode --with tdd,debug,prototype

# Windows PowerShell
irm https://raw.githubusercontent.com/CaptchaQ/nucleus/main/install.ps1 | iex
```

Скрипт копирует **ядро** (всегда) + выбранную часть **библиотеки**
(`--with`) в каталоги скилов харнесса и кладёт `AGENTS.md` в текущую папку.

| Харнесс | Каталог |
|---------|---------|
| opencode | `~/.config/opencode/skills/` |
| claude-code | `~/.claude/skills/` |
| codex | `~/.codex/skills/` |
| omp | `~/.agents/skills/` |

Запустите агент в папке проекта и скажите: «создай проект, сначала интервью».

## Артефакты проекта (`.agent-forge/`)

| Файл | Что это |
|------|---------|
| `setup.json` | Конфиг проекта: harness, tracker, метки, пути доков |
| `profile.json` | Контракт из интервью: destination, domain, stack, outOfScope, glossary |
| `skills.json` | Manifest: активные библиотечные навыки + reason |
| `improvements.md` | Лог improve-циклов и post-mortem debug-ов |
| `plans/` | Self-contained планы из orchestrate |

## Источники механик

grilling/wayfinder/domain/to-spec/tdd/review — [mattpocock/skills](https://github.com/mattpocock/skills) · подгрузка под проект — [affaan-m/ECC](https://github.com/affaan-m/ECC) · frequency-gate, strict output, audit-then-plan — [emilkowalski/skills](https://github.com/emilkowalski/skills) · GAN-цикл улучшения — [crimeacs/auto-improve](https://github.com/crimeacs/auto-improve) · параметризация промптов и автоактивация — [f/prompts.chat](https://github.com/f/prompts.chat) · UX-эвристики — [keepsimple.io/ru/uxcore](https://keepsimple.io/ru/uxcore) · композиция «baton» — [google-labs-code/stitch-skills](https://github.com/google-labs-code/stitch-skills).

## Лицензия

[MIT](LICENSE).