#!/usr/bin/env node
/**
 * Экспорт оцифрованных процессов в переносимые форматы.
 * Запуск: node export/build_export.mjs
 * Выход:
 *   export/processes.min.json   — компактный JSON для импорта в другой проект
 *   export/processes.csv        — плоская таблица (этап × действие)
 *   export/processes_catalog.md — читаемый каталог
 *   export/processes/<code>.json — по одному JSON на процесс
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const ROOT = dirname(dirname(__filename));
const OUT  = join(ROOT, 'export');

const data = JSON.parse(readFileSync(join(ROOT, 'public/processes.json'), 'utf8'));
const processes = data.processes || [];

/* ── 1. Компактный JSON ── */
const minProcesses = processes.map((p) => ({
  code: p.code,
  title: p.title,
  direction: p.direction,
  directionCode: p.directionCode,
  roles: p.roles || [],
  stages: (p.stages || []).map((s) => ({
    number: s.number,
    label: s.label,
    product: s.product || null,
    methodology: s.methodology || null,
    metrics: s.metrics || null,
    kpi: s.kpi || null,
    activities: (s.activities || []).map((a) => ({
      role: a.role,
      action: a.action,
    })),
  })),
  dependencies: (p.dependencies || []).map((d) => ({
    fromStage: d.fromStage, toStage: d.toStage,
    fromRole: d.fromRole,   toRole: d.toRole,
    hasArrow: !!d.hasArrow,
  })),
  meta: {
    targetState:    p.meta?.targetState    || null,
    currentState:   p.meta?.currentState   || null,
    transformation: p.meta?.transformation || null,
    essence:        p.meta?.essence        || null,
  },
}));

writeFileSync(
  join(OUT, 'processes.min.json'),
  JSON.stringify({
    generated: new Date().toISOString(),
    count: minProcesses.length,
    directions: data.directions || [],
    processes: minProcesses,
  }, null, 2),
);
console.log(`✓ processes.min.json (${minProcesses.length} процессов)`);

/* ── 2. CSV — плоская таблица действий ── */
const esc = (s) => {
  const v = String(s ?? '');
  return /[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};
const csvRows = [
  ['code', 'title', 'direction', 'stage', 'stage_label', 'role', 'action', 'product', 'methodology', 'kpi'].join(';'),
];
for (const p of processes) {
  for (const s of p.stages || []) {
    if ((s.activities || []).length === 0) {
      csvRows.push([p.code, p.title, p.direction, s.number, s.label, '', '', s.product, s.methodology, s.kpi].map(esc).join(';'));
    } else {
      for (const a of s.activities) {
        csvRows.push([p.code, p.title, p.direction, s.number, s.label, a.role, a.action, s.product, s.methodology, s.kpi].map(esc).join(';'));
      }
    }
  }
}
writeFileSync(join(OUT, 'processes.csv'), '﻿' + csvRows.join('\n'));
console.log(`✓ processes.csv (${csvRows.length - 1} строк)`);

/* ── 3. Markdown-каталог ── */
const md = [];
md.push('# Каталог оцифрованных процессов');
md.push('');
md.push(`Всего процессов: **${processes.length}** · направлений: **${(data.directions || []).length}** · сгенерировано: ${new Date().toISOString().slice(0, 10)}`);
md.push('');
md.push('## Оглавление по направлениям');
md.push('');

const byDir = new Map();
for (const p of processes) {
  const d = p.direction || '—';
  if (!byDir.has(d)) byDir.set(d, []);
  byDir.get(d).push(p);
}
for (const [dir, list] of byDir) {
  md.push(`### ${dir}`);
  for (const p of list) md.push(`- [${p.code} — ${p.title}](#${p.code.replace('.', '')}) · ${p.stageCount} эт · ${(p.roles || []).length} ролей · ${(p.dependencies || []).length} связей`);
  md.push('');
}

md.push('---');
md.push('');
md.push('## Детализация процессов');
md.push('');

for (const p of processes) {
  md.push(`### <a id="${p.code.replace('.', '')}"></a>${p.code} — ${p.title}`);
  md.push('');
  md.push(`**Направление:** ${p.direction}`);
  md.push('');
  if (p.roles?.length) {
    md.push(`**Роли (${p.roles.length}):** ${p.roles.join(', ')}`);
    md.push('');
  }
  if (p.meta?.essence) {
    md.push(`**Суть процесса:** ${p.meta.essence}`);
    md.push('');
  }
  if (p.meta?.targetState) {
    md.push(`**Целевое состояние:** ${p.meta.targetState}`);
    md.push('');
  }
  if (p.meta?.currentState) {
    md.push(`**Текущее состояние:** ${p.meta.currentState}`);
    md.push('');
  }
  if (p.meta?.transformation) {
    md.push(`**Трансформационные проекты:** ${p.meta.transformation}`);
    md.push('');
  }

  md.push(`#### Этапы (${(p.stages || []).length})`);
  md.push('');
  for (const s of p.stages || []) {
    md.push(`**${s.number}. ${s.label}**`);
    if (s.product)     md.push(`- Продукт: ${s.product}`);
    if (s.methodology) md.push(`- Методика: ${s.methodology}`);
    if (s.metrics)     md.push(`- Метрики: ${s.metrics}`);
    if (s.kpi)         md.push(`- KPI: ${s.kpi}`);
    if ((s.activities || []).length) {
      md.push(`- Действия:`);
      for (const a of s.activities) md.push(`  - **${a.role}** → ${a.action}`);
    }
    md.push('');
  }

  if ((p.dependencies || []).length) {
    md.push(`#### Стрелки-связи (${p.dependencies.length})`);
    md.push('');
    for (const d of p.dependencies) {
      const arr = d.hasArrow ? '→' : '·';
      md.push(`- Этап ${d.fromStage} (${d.fromRole || '—'}) ${arr} Этап ${d.toStage} (${d.toRole || '—'})`);
    }
    md.push('');
  }
  md.push('---');
  md.push('');
}

writeFileSync(join(OUT, 'processes_catalog.md'), md.join('\n'));
console.log(`✓ processes_catalog.md`);

/* ── 4. По одному JSON на процесс ── */
mkdirSync(join(OUT, 'processes'), { recursive: true });
for (const p of minProcesses) {
  writeFileSync(
    join(OUT, 'processes', `${p.code}.json`),
    JSON.stringify(p, null, 2),
  );
}
console.log(`✓ export/processes/*.json (${minProcesses.length} файлов)`);

/* ── 5. Индекс процессов (только названия) ── */
writeFileSync(
  join(OUT, 'processes_index.json'),
  JSON.stringify({
    generated: new Date().toISOString(),
    processes: processes.map((p) => ({
      code: p.code,
      title: p.title,
      direction: p.direction,
      stageCount: p.stageCount,
      roleCount: (p.roles || []).length,
      activityCount: p.activityCount,
      arrowCount: p.arrowCount,
    })),
  }, null, 2),
);
console.log(`✓ processes_index.json`);

console.log('\nГотово. Файлы в export/');
