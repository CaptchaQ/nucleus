# Contributing to nucleus

Спасибо, что помогаете сделать nucleus лучше! Ниже — как устроен проект и что
ожидается от PR.

## Поток

1. **Форк** репозитория и создайте ветку от `main`:
   `git checkout -b feat/my-change`.
2. **Пишите код** по принципам из [`docs/PLAN.md`](docs/PLAN.md): один вопрос
   за раз, решения — пользователю, факты — в код.
3. **Соберите и проверьте**:

   ```bash
   npm install
   npm run build        # tsc — 0 ошибок обязателен
   npm test             # node --test (TS strip-types)
   npm run reindex      # если добавляли/убирали скилы — синхронизирует README
   ```

4. Если меняли bridge (`python/`):

   ```bash
   PYTHONPATH=python python -m nucleus_improve --help
   PYTHONPATH=python python -m nucleus_improve --dummy --artifact <f> --tag <t> --max-iterations 1
   ```

5. **Тест обязателен для нового поведения**: каждый тест защищает наблюдаемый
   контракт и падает на правдоподобном баге.
6. Откройте PR, укажите в описании **что меняется** и **как проверено**.

## Что не приветствуется

- Изменения, ломающие строгий TS (noUncheckedIndexedAccess,
  exactOptionalPropertyTypes).
- Симтоматические фиксы: лечите источник, не подавляйте следствие.
- «Мёртвые» ветки кода: удаляйте устаревшее сразу (clean cutover).

## Стиль

- Tersе-инженерный: факты, решения, риски. Без маркетинга в коде.
- Комментарии объясняют *почему*, не *что* (что — код).
- Имена скилов — lowercase kebab-case, совпадает с именем папки.

## Проверка перед merge

- `tsc` чисто, `npm test` зелёный.
- `nucleus doctor` не падает.
- README-таблица скилов синхронизирована (`npm run reindex`).

Вопросы — через issue или PR-дискуссию.