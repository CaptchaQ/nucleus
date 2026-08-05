---
name: debug
description: Отладка для сопротивляющихся багов — intermittent, регрессия, неизвестное состояние. Tight feedback loop, gated фазы, regression тест.
when: баг ревьюет первый взгляд / intermittent flake / регрессия
---

# debug — отладка сопротивляющихся багов

Скил для *трудных* багов: не ловятся с первого взгляда, intermittent flake,
регрессия неизвестного происхождения, «работало — сломалось». Лёгкий баг,
который ты чинишь за проход, — не сюда.

**Ядро:** не теоретизируй, пока не получишь **tight feedback loop** — одну
команду, которая *уже* RED на этом баге. Любая гипотеза до red loop — vibe,
не диагноз. Фазы **gated**: следующая не открывается, пока предыдущая не
закрыта чётким критерием.

## Когда применять

- Баг сопротивляется первому взгляду — непонятно с чего начать.
- Intermittent / flake — «иногда падает», «на проде, но не локально».
- Регрессия — «работало в X, сломалось в Y», источник неизвестен.
- Performance-деградация без очевидной причины.
- НЕ применяй к багу, который фиксишь за один проход.

## Правила

1. **Не гадай без red loop.** Нет одной команды, детерминированно RED — нет
   теории, нет правки кода. Red loop сначала, гипотезы потом. Это закон.
2. **Red loop — ровно одна команда.** Скрипт/тест/curl/ один запуск → RED на
   этом конкретном баге. Нельзя запустить unattended — это ещё не loop, а
   инструмент.
3. **Flake — поднимай reproduction rate.** Цель не чистый repro, а
   debuggable частота: loop триггер 100×, pin time/seed/RNG/fs, узкие
   timing-окна, sleeps. 50% flake debuggable, 1% — нет; поднимай, пока не станет.
4. **Gated фазы.** Каждая имеет чёткий критерий выхода. Пропуск фазы —
   только с явным обоснованием, записанным в лог.
5. **Гипотезу проверяй одной командой.** 3–5 ranked гипотез, каждая с
   предсказанием: «если \<X> — то \<Y> сделает баг зелёным / \<Z> хуже». Без
   предсказания — vibe, выкинь. Проверяй по одной, сразу RED/green.
6. **Фикс подтверди regression-тестом.** Сначала failing test на seam, потом
   минимальный фикс → watch test pass. Без red-теста фикс не зафиксирован.
7. **Не `--abort` merge/rebase без разбора.** Прерванная операция прячет баг
   под новым состоянием — ты теряешь red loop. Сначала разбери intent: какой
   conflict/state ты откатываешь и что это сделает с диагностикой. abort — не
   panic-button.
8. **feel / perceived performance нельзя проверить из кода — честно.** «Кажется
   медленным», «лагает», «не как у Apple» — не метрики из исходников. Скажи
   явно «нельзя проверить из кода», поставь feel-check в план (реальное
   устройство, slow-motion, свежие глаза, side-by-side). Не угадывай значение,
   не валидируй feel вслепую.

## Цикл / Шаги

Фазы **gated** — закрывай каждую, прежде чем открывать следующую.

### Phase 1 — воспроизвести (tight red loop)

**Это весь скил.** Нет red-capable команды → нет Phase 2. Трать
непропорционально много усилий здесь; будь агрессивным и творческим.

Варианты loop (примерно в порядке предпочтения):

| # | Способ | Когда |
|---|--------|-------|
| 1 | Failing test на seam, достигающем бага | есть тестовый шов |
| 2 | curl/HTTP-скрипт против dev-сервера | сетевой баг |
| 3 | CLI + fixture, diff stdout vs known-good snapshot | CLI/батч |
| 4 | Headless-браузер (Playwright), assert DOM/console/network | UI-баг |
| 5 | Replay захваченного trace (request/payload/event log) | есть запись |
| 6 | Throwaway harness — один вызов в code-path бага | изолировать подсистему |
| 7 | Property/fuzz loop — 1000 random inputs | «иногда wrong output» |
| 8 | Bisection harness — `git bisect run` | баг появился между states |
| 9 | Differential loop — old vs new, diff outputs | регрессия версии |
| 10 | HITL bash-скрипт (`scripts/hitl-loop.template.sh`) | человек обязан кликать |

**Tighten the loop** (относись как к продукту): быстрее (cache setup, skip
unrelated init, narrow scope)? резче сигнал (assert на конкретный симптом, не
«не упало»)? детерминированее (pin time, seed RNG, isolate fs, freeze network)?
30-секундный flaky loop чуть лучше отсутствия; 2-секундный deterministic —
superpower.

**Критерий выхода Phase 1** — одна команда (path/invocation + уже RED хотя бы
раз), которая:
- [ ] **Red-capable** — ведёт реальный code-path бага, assert-ит **точный
  симптом пользователя**. Может RED сейчас и GREEN после фикса.
- [ ] **Deterministic** — тот же verdict каждый запуск (flake: pinned высокий rate).
- [ ] **Fast** — секунды, не минуты.
- [ ] **Agent-runnable** — unattended.

Читаешь код ради теории *до* этой команды — **стоп**.

### Phase 2 — изолировать

Запусти loop. Watch RED. Подтверди:
- [ ] loop даёт failure mode, описанный **пользователем** — не соседний баг.
  Wrong bug = wrong fix.
- [ ] failure воспроизводим (или rate достаточен для flake).
- [ ] симптом зафиксирован (error msg / wrong output / timing) — для
  верификации фикса в Phase 4.

**Minimise.** Сужай repro до **минимального сценария, который всё ещё RED**.
Режь inputs/callers/config/data/шаги **по одному**, перезапуская loop после
каждого реза. Готово, когда **любой** оставшийся элемент load-bearing: убрать
его — loop GREEN. Минимальный repro сужает hypothesis space и становится
regression тестом.

Не переходи дальше, пока не воспроизвёл **и** изолировал.

### Phase 3 — диагноз (гипотеза → одна команда)

Сгенерируй **3–5 ranked гипотез** *до* проверки любой — Single-hypothesis
anchoring-ит на первую правдоподобную идею. Каждая **falsifiable**:

> «Если \<X> — причина, то \<Y> сделает баг зелёным / \<Z> сделает хуже.»

Без предсказания — vibe, выкинь/заточи. **Show ranked list пользователю
перед проверкой** — у него часто domain-знание, которое re-rank-ит мгновенно
(«мы только что деплоили #3»). Дешёвый checkpoint; не блокируйся, если AFK.

Проверяй **по одной**, одну переменную за раз, сразу RED/green. Найден root
cause — **не симптом**: «Симптом исчез» ≠ «починил»; гипотеза должна объяснять,
*почему* симптом возник, а не просто совпадать с местом правки.

### Phase 4 — фикс (regression test → минимальная правка)

**Correct seam** — тест, упражняющий **реальный pattern бага** as it occurs
at call site. Шов слишком мелкий (single-caller test когда баг требует
цепочки; unit test, не реплицирующий chain) даёт false confidence.

**Если correct seam нет — это и есть finding.** Зафиксируй. Архитектура мешает
запереть баг → флаг в Phase 5.

Если seam есть:
1. Преврати minimised repro в failing test на этом seam → watch it fail.
2. Примени **минимальный** фикс — правь root cause, не симптом; не лепи
   special-case; не расширяй scope.
3. Watch test pass.
4. Перегони Phase 1 loop против **оригинального** (un-minimised) сценария.

### Phase 5 — post-mortem

До объявления done:
- [ ] Оригинальный repro больше не воспроизводится (перегони Phase 1 loop).
- [ ] Regression test проходит (или **отсутствие seam задокументировано**).
- [ ] Debug-инструментация удалена — `grep` по tag-префиксу `[DEBUG-xxxx]` чист.
- [ ] Throwaway-прототипы удалены/перемещены в marked debug-loc.
- [ ] **Правильная гипотеза** (root cause) записана в commit/PR message.

**Короткая запись** в `.agent-forge/improvements.md`:
```
### Bug: <title>
- **Root cause:** <не симптом — почему баг возник>
- **Held by:** regression test <path> | нет seam — флаг improve-architecture
- **Prevention:** что предотвратило бы класс бага (review/тип/lint/seam)
- **Feel-check (если применимо):** <device/slow-mo/side-by-side> | «нельзя
  проверить из кода — флаг на ручную проверку»
```

Спроси: **что предотвратило бы этот баг?** Если ответ — архитектурное
изменение (нет seam, tangled callers, hidden coupling) — флаг на
improve-architecture с конкретикой. Флаг **после** фикса, не до: теперь у тебя
больше информации, чем в начале.

## Результат / критерий готовности

- **Red-capable команда** существует и RED — стартовая точка и финальный
  верификатор.
- **Minimised repro**: каждая оставшаяся часть load-bearing.
- **Root cause** (не симптом) подтверждён одной командой RED→green.
- **Regression test** на правильном seam: RED до фикса, GREEN после — или
  отсутствие seam задокументировано.
- **Фикс минимальный**, правит root cause; следов special-case нет.
- **`.agent-forge/improvements.md`** содержит post-mortem; при отсутствии seam
  — флаг improve-architecture; при feel/perf — честная отметка о feel-check.
- **Debug-инструментация убрана** (grep по tag-префиксу чист).

## Что дальше

- Баг стойкий к `git bisect`, нет явного red-state → bisection harness,
  `git bisect run <loop>` автоматически сужает до commit.
- Архитектура мешает запереть баг → `improve-architecture` (по флагу Phase 5).
- Regression тест вписан в TDD-цикл → `tdd` для следующих правок в этой зоне.