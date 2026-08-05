---
name: setup
description: Первичная настройка проекта один раз — issue-tracker, triage-метки, место доков, чек ядра/библиотеки. Запускается вручную в начале каждого проекта перед grilling.
when: первое действие в новом проекте — до grilling/stitch
---

# setup — первичная настройка проекта

Запусти **один раз на проект** перед первым `grilling`. Настрой то, на что
опираются остальные скилы: issue-tracker, метки, место хранения доков, чек
ядра и выбранной библиотеки. Это разовый correlator — потом skip.

## Когда применять

- Новый проект, папка пуста (или `.agent-forge/` нет).
- Профиль ещё не зафиксирован.

## Правила

1. **Один раз.** Если `.agent-forge/setup.json` существует и проект не
   изменился радикально — не запускай; `stitch` использует его.
2. **Minimal config.** Только то, что нужно другим скилам; не плоди панели.
3. **Facts — твоя работа.** Существующий issue-tracker, PATH-инструменты,
   структуру папок — найди сам, не спрашивай. Спрашивай только decisions.
4. **Recommendations, не пустота.** Каждый вопрос — с рекомендацией.

## Цикл

1. **Рекогносцировка (без вопросов).** Собери факты в фоне/субагентом:
   - есть ли `.git` / удалённый remote (github/gitlab/local);
   - какие issue-tracker под рукой (gh CLI, linear CLI, локальный .scratch/);
   - лежит ли nucleus-ядро в `skills/`, есть ли `skills/library/`;
   - какой харнесс (opencode/claude-code/codex/omp) — из env/PATH;
   - язык/стек (от файлов: package.json/go.mod/pyproject/…).
2. **Раунд вопросов (фронтир, по grilling-механике):**
   - Какой issue-tracker? GitHub / Linear / local-markdown. Recommended:
     github если есть `.git` + remote.
   - Метки triage (для wayfinder/debug): `needs-triage`, `ready-for-agent`,
     `wayfinder:map`, `wayfinder:<type>`. Recommended: canonical имена.
   - Где живут доки проекта? Recommended: `docs/` у корня; ADR в
     `docs/adr/`; CONTEXT у корня.
3. **Запиши** `.agent-forge/setup.json`:
   ```json
   {
     "harness": "opencode",
     "tracker": "github",
     "tracker_labels": ["needs-triage","ready-for-agent",
                        "wayfinder:map","wayfinder:research",
                        "wayfinder:prototype","wayfinder:grilling","wayfinder:task"],
     "docs": { "root": "docs", "adr": "docs/adr", "context": "CONTEXT.md" },
     "skills_core_present": true,
     "skills_library_present": true
   }
   ```
4. **Чек ядра/библиотеки.** Если `skills/` (ядро) или `skills/library/`
   отсутствуют — предупреди и дай способ установить (`install.sh` из
   nucleus-репозитория, или копирование). Без ядра grilling/spec/.. не работают.
5. **Портал на профиль.** После setup профиль ещё не готов — переходи к
   `grilling` (оно наполнит `profile.json`, опираясь на `setup.json`).

## Результат / критерий готовности

- `.agent-forge/setup.json` создан (harness, tracker, labels, docs-paths,
  presence-чек ядра/библиотеки).
- Если ядро/библиотека отсутствуют — пользователь предупреждён и знает,
  как доставить.
- Подключён issue-tracker (для github — `gh auth status` ok; для local —
  `.scratch/` создан).
- Дальше — `grilling`.

## Чего избегать

- Не запускай setup повторно без причины (профиль изменился → `stitch`, а не
  setup, если не трогаются tracker/labels/docs).
- Не запрашивай то, что можно найти (факты — твоя работа).
- Не собирай лишние настройки — минимальный correlator, не админ-панель.