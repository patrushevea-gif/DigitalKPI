# Экспорт оцифрованных процессов

Выгрузка 71 оцифрованного бизнес-процесса из 14 направлений компании Rossilber для переноса в другие проекты.

Источник: `public/processes.json` (полный парсинг исходных Excel-файлов из `Process/*.xlsx`).

## Состав папки

| Файл | Размер | Назначение |
|---|---|---|
| `processes.min.json` | ~727 KB | Компактный JSON со всеми процессами — основной файл для импорта в код |
| `processes_index.json` | ~18 KB | Только список процессов (код, название, счётчики) — для меню/навигации |
| `processes_catalog.md` | ~441 KB | Читаемый Markdown-каталог — для доки, ревью, печати |
| `processes.csv` | ~394 KB | Плоская таблица «этап × действие» — для Excel / SQL / таблиц |
| `processes/<код>.json` | 71 файл | По одному процессу на файл — удобно для раздельной загрузки |
| `build_export.mjs` | — | Скрипт-генератор (запуск: `node export/build_export.mjs`) |

## Схема `processes.min.json`

```ts
{
  generated: string;         // ISO timestamp
  count: number;             // 71
  directions: Direction[];   // метаданные направлений
  processes: Process[];
}

type Process = {
  code: string;              // "2.4"
  title: string;             // "Работа с несоответствиями"
  direction: string;         // "Качество"
  directionCode: string;     // "2"
  roles: string[];           // роли-участники процесса
  stages: Stage[];           // этапы (swimlane-колонки)
  dependencies: Dep[];       // стрелки между этапами
  meta: Meta;                // целевое/текущее состояние, трансформация
};

type Stage = {
  number: number;            // 1, 2, 3…
  label: string;             // "1 этап" / "Прием сырья"
  product: string | null;    // что на выходе этапа
  methodology: string | null;// как делается
  metrics: string | null;    // по чему мерим
  kpi: string | null;        // конкретный KPI этапа
  activities: Activity[];    // конкретные действия
};

type Activity = {
  role: string;              // кто делает
  action: string;            // что делает
};

type Dep = {                 // стрелка между ячейками swimlane
  fromStage: number;
  toStage: number;
  fromRole: string | null;
  toRole: string | null;
  hasArrow: boolean;         // есть ли явная стрелка в исходнике
};

type Meta = {
  targetState: string | null;
  currentState: string | null;
  transformation: string | null;
  essence: string | null;    // короткое описание сути
};
```

## Пример импорта в код

```js
// Node / Vite / любой JS-стек
import data from './processes.min.json';

for (const proc of data.processes) {
  console.log(`${proc.code} — ${proc.title}`);
  for (const stage of proc.stages) {
    for (const act of stage.activities) {
      console.log(`  [${stage.number}] ${act.role} → ${act.action}`);
    }
  }
}
```

## Направления (14)

- **1.** Производство (6 процессов)
- **2.** Качество (5)
- **3.** RnD и Технологии (5)
- **4.** Продажи и маркетинг (9)
- **5.** Снабжение (3)
- **6.** Развитие (5)
- **7.** Операционная эффективность (6)
- **8.** Персонал (5)
- **9.** Финансы (5)
- **11.** СОТПБ и ЭБ (5)
- **12.** Право (5)
- **13.** ИТ и Автоматизация (5)
- **14.** Администрирование (5)
- **15.** Техническая политика (2)

Итого: **71 процесс**, ~1000 действий, 14 направлений.

## CSV-схема

Разделитель `;` (удобно для русского Excel), UTF-8 BOM.
Колонки: `code`, `title`, `direction`, `stage`, `stage_label`, `role`, `action`, `product`, `methodology`, `kpi`.

## Пересборка

После любых правок в `public/processes.json` (например, перепарсили Excel):

```bash
node export/build_export.mjs
```

Скрипт заново построит все форматы.
