---
name: stitch
description: Подгрузить под проект нужные скилы из библиотеки skills/library по домену/стеку и заказать ихruntime-активацию через frontmatter when:. Запускается один раз после grilling/setup.
when: после grilling (профиль со стеком/доменом готов) — до spec/wayfinder, чтобы скилы были под рукой
---

# stitch — подгрузка скилов под проект

После интервью профиль знает домен/стек. Библиотека в `skills/library/`
содержит проектные скилы, которых нет в ядре — `tdd`, `debug`, `ux-review`,
`api-design`, `prototype`. Не тащи всё; выбери **то, что под проект**, и
**активируй** их через frontmatter `when:` — чтобы харнесс вызывал их по
контексту в рантайме, без ручного trigгер.

Это вдохновлено ECC: «подгрузка скилов под проект» — но без ручного `--with`
на каждый, а через явный каталог и frontmatter-триггеры (анти-паттерна ECC,
где триггеры были прозаические «When to Activate» без формального `when:`).

## Когда применять

- После `grilling`/`setup` — профиль с `domain`/`stack` готов.
- До `spec`/`wayfinder` — чтобы в работе уже были проектные скилы.
- Повторно — если профиль изменился (новый домен, новый стек).

## Правила

1. **Частота как первый гейт (по Emil).** Прежде «какой скил» — спроси
   «вообще ли он тут нужен». Скил активируй только если его триггерная
   ситуация реально встретится в этом проекте. Не подгружай «на всякий» —
   лишний скил = шум для харнесса и риск ложной активации.
2. **Каталог — источник правды.** Перечисли все скилы в `skills/library/` и
   их `when:`. Выбор делай из каталога, не из памяти. Не загружай скил,
   которого нет в библиотеке (если очень нужен — `skill-add` его создай).
3. **Ядро vs библиотека.** Ядро (`grilling`/`spec`/`wayfinder`/`orchestrate`/
   `improve`/`review`/`stitch`/`skill-add`/`domain`/`setup`) — всегда
   активны. Библиотека — подключается под проект.
4. **Профиль определяет подбор.** Выбор основан на `profile.domain`,
   `profile.stack`, `profile.qualityGuardrails`, `outOfScope` (что
   исключено — скилы под это не грузим) и `openRisks`.
5. **No invented скил-триггер.** `when:` берётся дословно из SKILL.md, не
   переформулируется. Если триггер скила не ложится на ситуации проекта —
   скил не активируется, и это правильно.
6. **粒ад: подгрузка ≠ выполнение.** Stitch только подключает и помечает; он
   не запускает скилы. Запустит харнесс по `when:` в рантайме.

## Подбор под домен (отправная точка)

| Домен / признак | Кандидаты из `skills/library/` |
|-----------------|--------------------------------|
| frontend / web-app с UI | `ux-review`, `prototype`, `tdd` |
| API / backend контракт | `api-design`, `tdd` |
| greenfield, что-то незнакомое | `debug` (рано или поздно), `prototype` |
| есть тесты в guardrails | `tdd`, `review` (ядро) |
| есть UI с частыми правками | `ux-review`, `prototype` |
| что-то требует runnable-ответа на дизайн | `prototype` |

Затравка — не догма: каждый кандидат прогоняй через frequency-gate (правило 1)
и специфику проекта.

## Цикл

1. Прочитай `profile.json` (domain, stack, qualityGuardrails, outOfScope).
2. Перечисли библиотеку: для каждого `skills/library/<name>/SKILL.md` запиши
   `name` + `when:` (дословно из frontmatter).
3. Для каждого кандидата — frequency-gate: встретится ли триггер в этом
   проекте? Если нет — отбрось.
4. Отфильтруй по outOfScope (скил под out-of-scope-зону — не грузить).
5. Сформируй **manifest** `.agent-forge/skills.json`:
   ```json
   {
     "active": ["tdd", "ux-review", "prototype"],
     "core": ["grilling","spec","wayfinder","orchestrate","improve",
              "review","stitch","skill-add","domain","setup"],
     "reason": {
       "tdd": "profile.qualityGuardrails содержит tests; red-green для каждой фичи",
       "ux-review": "domain=frontend, масса UI-правок",
       "prototype": "openRisks: UI state-model не решена, нужен runnable ответ"
     },
     "rejected": {
       "api-design": "domain=frontend без публичного API",
       "debug": "пока зелёный; активируется later через grilling-повтор"
     }
   }
   ```
6. **Активируй** скопировав выбранные `skills/library/<name>/` в каталог
   харнесса (если ещё не там) и/или зарегистрируй их manifestом для
   рантайм-дискавери харнесса (opencode: `~/.config/opencode/skills/`,
   claude-code: `~/.claude/skills/`, codex: `~/.codex/skills/`,
   omp: `~/.agents/skills/`). Подгрузка — idempotent: повторно не дублирует.
7. Покажи человеку одним экраном: активные (с reason), отвергнутые (с reason),
   minority — «подгружено N, к рантайм-активации готово».

## Результат / критерий готовности

- `.agent-forge/skills.json` создан/обновлён (active+core+reasons+rejected).
- Выбранные скилы скопированы в харнесс-каталоги (idempotent).
- Никакой скил под outOfScope.
- Каждый выбор обоснован (frequency-gate + профиль).
- Дальше — `spec`/`wayfinder` (проектные скилы уже под рукой).

## Что дальше

- Если нужного скила нет в библиотеке — `skill-add` его создаёт, потом `stitch`
  подгружает.
- Если профиль изменился (новый домен) — повторно `stitch`.