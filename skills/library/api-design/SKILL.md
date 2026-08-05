---
name: api-design
description: Проектирует API/контракт/module interface — глубокие модули, явный контракт, ubiquitous language, canonical errors.
when: проектируешь API/контракт/модульный интерфейс
---

# api-design — Контракт как граница

API — это **contract**, а не набор функций. Хороший контракт прячем максимум
поведения за минимумом видимой поверхности: глубокий модуль делает много
работы через маленький интерфейс, плоский — наоборот (много функций, каждая
делает мало). Глубина снижает связность: чем меньше видит вызывающий, тем
свободнее ты меняешь внутренности.

Контракт фиксирует **обязательство** между сторонами. Любое изменение этого
обязательства — сознательное решение, а не побочный эффект рефакторинга.

## Когда применять

- Проектируешь новый endpoint,/service interface, module boundary, SDK.
- Ревьюишь контракт на durable границе (public API, cross-team, cross-service).
- Делаешь breaking change или merge модулей/endpoint'ов.
- Описываешь ошибки, инварианты, versioning для существующего API.

## Правила

1. **Интерфейс = public boundary; внутренности спрятаны.** Сузь поверхность
   до минимального, что покрывает use case. Если вызывающему не нужно это
   видеть — это не public. Каждый публичный символ = стоимость поддержки.
2. **Именуй терминами из `CONTEXT.md`/domain (ubiquitous language).** Имя
   endpoint'а, типа, поля — это язык бизнеса, а не технический синоним.
   `order.dispatch()`, а не `sendOrderUpdateToBackend()`. Один концепт =
   одно слово во всём контракте; `User` и `Account` не сосуществуют без
   причины.
3. **Контракт — explicit.** Запиши в `spec.md` и/или типах:
   - ** принимает ** — типы, формат, диапазоны, structured shape;
   - ** возвращает ** — форму успеха и форму ошибки;
   - ** инварианты ** — что всегда true до/после вызова;
   - ** idempotency ** — `idempotency-key` на мутациях, retry behavior;
   - ** rate/pagination ** — `cursor`/`limit`, retry-after, bump-window;
   - ** errors ** — canonical error set (см. правило 4), не ad hoc строки.
4. **Error handling — два класса, один shape.**
   - **client error (4xx)** — валидация, конфликт, not-found, rate-limit;
     повторяем тем же запросом — повторишь ту же ошибку;
   - **server error (5xx)** — внутренняя поломка; повтор запроса может помочь.
   - Один canonical error shape (`code`, `message`, `details`, optional
     `trace_id`), а не смесь стилей. Корпоративный trace/stack **не утекает**
     в публичный ответ — он живёт в логах.
5. **Versioning — сознательный выбор, не по умолчанию.** `/v1/` в path или
   header требуется там, где есть внешние consumer'ы или hard-to-reverse
   contract. Отсутствие версии = контракт может меняться свободно (internal).
   Hard-to-reverse решение → ADR (`docs/adr/NNNN-*.md`).
6. **Seams для теста, не для internals.** Тестируй **контракт**, а не
   реализацию. Внешние зависимости подменяй на seam (adapter interface),
   не влезая в сам модуль. Юнит-тест не должен возиться с DB/http —
   он использует seam, который ты заранее публикуешь в контракте как точку
   вариации.
7. **Правки контракта = breaking change.** Последовательность:
   `expand → donor → collect → contract`. Сначала расширь (новое поле/
   endpoint добавлен, старое работает), внутренне donor-метод отдаёт оба
   представления, consumer'ы мигрируют, потом — collect (старое снято) и
   обновлён контракт. Каждый breaking step требует ADR + notes по
   совместимости.

## Цикл / Шаги

1. **Запиши use cases.** Кто вызывает, зачем, с какой частотой. Один use
   case = один сценарий, не «CRUD для сущности».
2. **Набросай surface.** Endpoints + request/response types. Накидай
   максимально узко — то, что покрывает use cases, не больше.
3. **Проверь на deep module.** На каждый публичный символ спроси:
   - Сколько скрывает? Если ответ тривиальный, surface почти равен
     внутренней механике — модуль слишком плоский.
   - Можно ли убрать, не потеряв use case?
4. **Error / invariant design.** Перечисли canonical error set для каждого
   viewpoint. Пропиши инварианты (preconditions/state в коде и/или `spec.md`),
   idempotency, rate/pagination.
5. **Запиши contract doc.** В `spec.md` остаются: use cases, surface,
   типы, форма ошибок, versioning, breaking-change policy, error class.
6. **Spec в `spec.md`.** Контракт должен быть читаем без кода — путь запуска
   для команды, имплементация приходит позже. Headers/README — нет,
   только то, что нужно consumer'у.

## Цель глубины — чек

| Признак | Deep module ✓ | Flat module ✗ |
|---|---|---|
| Интерфейс | маленький, богатый hidden | широкий, surface = internal |
| Use cases | все покрыты | требуют перегрузки |
| Ошибки | canonical set | ad hoc строки |
| Валидация | на seam, один adapter | раскидана по точкам |
| Versioning | сознательное решение | «добавил `/v2`, потому что» |

## Результат / критерий готовности

- `spec.md` (или эквивалент в типах/contract-doc) содержит: use cases,
  surface (endpoints/types), request/response shape, canonical error set,
  инварианты, idempotency/rate/pagination, versioning, breaking-change
  policy.
- Каждый публичный символ проходит проверку на **deep module** (много
  скрыто за маленьким интерфейсом).
- Имена согласованы с `CONTEXT.md`/domain ubiquitous language.
- Errors — один canonical shape, без утечки internal trace.
- Versioning применён сознательно; hard-to-reverse решения закреплены ADR.
- Seams выделены: тесты гоняют контракт, external-зависимости подменяются
  на seam, unit-тесты не трогают DB.
- Breaking change идёт по `expand → donor → collect → contract` и
  покрыт ADR.