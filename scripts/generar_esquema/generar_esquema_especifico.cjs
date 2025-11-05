#!/usr/bin/env node
// generar_esquema_catalogo.cjs
// Ejecutar: node generar_esquema_catalogo.cjs

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx'); // 👈 importante: npm install xlsx

// ====== Config ======
const ROOTS = [

  'D:\\empresas\\catalogo',

];

const ROOT_LABEL = 'D:\\empresas';
const OUTPUT_FILE = 'D:\\empresas\\scripts\\generar_esquema\\esquema_especifico.txt';

const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg', '.idea', '.vscode', '.cache',
  'dist', 'build', 'out', 'coverage', '__pycache__',
  '$recycle.bin', 'system volume information',
  'windows', 'program files', 'program files (x86)', 'temp', 'tmp',
  '.next'
]);

const IGNORE_FILES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  'thumbs.db', '.ds_store', 'desktop.ini',
  '.gitignore', '.gitattributes'
]);

const BINARY_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.ico', '.tif', '.tiff',
  '.pdf', '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2',
  '.exe', '.dll', '.mp3', '.wav', '.flac', '.ogg',
  '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.psd', '.ai'
]);

const EXCEL_EXTS = new Set(['.xlsx', '.xls', '.xlsm']);
const TEXT_EXTS = new Set([
  '.txt', '.md', '.cjs', '.mjs', '.js', '.ts', '.tsx', '.jsx', '.json',
  '.yml', '.yaml', '.css', '.scss', '.less', '.html', '.htm', '.csv',
  '.env', '.toml', '.ini', '.conf', '.config', '.log',
  '.prisma', '.sql' // 👈 aseguramos schema.prisma como texto
]);

const MAX_PREVIEW_BYTES = 512 * 1024;

// ====== Utils ======
const normWin = (p) => path.win32.normalize(p);
const isIgnoredDirName = (d) => IGNORE_DIRS.has(d.toLowerCase());
const isIgnoredFileName = (name) => {
  const lower = name.toLowerCase();
  if (IGNORE_FILES.has(lower)) return true;
  if (lower.endsWith('.map')) return true;
  if (lower.endsWith('.old')) return true;
  if (lower.includes('.hot-update.')) return true;
  if (lower.endsWith('.pack.gz')) return true;
  return false;
};
const isExcel = (f) => EXCEL_EXTS.has(path.extname(f).toLowerCase());

// 👇 Consideramos texto a cualquier archivo que comience con ".env"
const isEnvFamily = (absPath) => path.basename(absPath).toLowerCase().startsWith('.env');

// Un binario "probable" si no es Excel, no es env*, no está en TEXT_EXTS y su ext está en BINARY_EXTS o es desconocida
const isProbablyBinary = (f) => {
  if (isEnvFamily(f)) return false;
  const ext = path.extname(f).toLowerCase();
  if (EXCEL_EXTS.has(ext)) return false;
  if (TEXT_EXTS.has(ext)) return false;
  if (BINARY_EXTS.has(ext)) return true;
  // Ext desconocida: asumimos binario para no romper (salvo env*)
  return true;
};

// Retorna la ruta relativa a la primera raíz que sea prefijo; si no, deja basename
function relativeToRoots(absPath) {
  const hit = ROOTS.find(r => absPath.toLowerCase().startsWith(r.toLowerCase() + path.win32.sep));
  if (hit) {
    return path.win32.relative(hit, absPath).replace(/\\/g, '/');
  }
  return path.basename(absPath);
}

// ====== Árbol (con numeración global de archivos) ======
async function buildTreeUnderPrefix(rootAbsPath, prefix, isLastAtTop, counterRef, filesOut) {
  const lines = [];

  const branchTop = isLastAtTop ? '└── ' : '├── ';
  const nextPrefix = prefix + (isLastAtTop ? '    ' : '│   ');
  const rootName = path.basename(rootAbsPath);

  lines.push(`${prefix}${branchTop}📁 ${rootName}`);
  await walk(rootAbsPath, nextPrefix);

  async function walk(dir, curPrefix) {
    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    const dirs = entries
      .filter(d => d.isDirectory() && !isIgnoredDirName(d.name))
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

    const filesHere = entries
      .filter(d => d.isFile() && !isIgnoredFileName(d.name))
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

    const total = dirs.length + filesHere.length;
    let i = 0;

    for (const d of dirs) {
      i++;
      const isLast = i === total;
      const branch = isLast ? '└── ' : '├── ';
      const next = curPrefix + (isLast ? '    ' : '│   ');
      lines.push(`${curPrefix}${branch}📁 ${d.name}`);
      await walk(path.join(dir, d.name), next);
    }

    for (const f of filesHere) {
      i++;
      const isLast = i === total;
      const branch = isLast ? '└── ' : '├── ';
      const absF = path.join(dir, f.name);
      const num = ++counterRef.n;
      lines.push(`${curPrefix}${branch}${num}. ${f.name}`);
      filesOut.push({ num, path: absF });
    }
  }

  return { lines };
}

// ====== Lectura de archivos ======
async function readFileSmart(absPath) {
  const ext = path.extname(absPath).toLowerCase();

  // Caso XLSX: mostrar primeras dos filas con formato
  if (EXCEL_EXTS.has(ext)) {
    try {
      const wb = XLSX.readFile(absPath, { sheetStubs: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const firstRow = data[0] || [];
      const secondRow = data[1] || [];
      let out = '';
      for (let i = 0; i < firstRow.length; i++) {
        const colLetter = String.fromCharCode(65 + i); // A,B,C...
        const header = firstRow[i] ?? `Columna ${colLetter}`;
        const value = secondRow[i] !== undefined ? secondRow[i] : '';
        const branch = (i === firstRow.length - 1) ? '└──' : '├──';
        out += `\t${branch} Columna ${colLetter}: ${header}\t: ${value}\n`;
      }
      return out.trimEnd();
    } catch (e) {
      return `[no se pudo leer Excel: ${e.message}]`;
    }
  }

  // Caso JSON: mostrar primer objeto
  if (ext === '.json') {
    try {
      const buf = await fs.promises.readFile(absPath, 'utf8');
      const json = JSON.parse(buf);
      const first = Array.isArray(json) ? json[0] : json;
      return JSON.stringify(first, null, 2);
    } catch (e) {
      return `[no se pudo parsear JSON: ${e.message}]`;
    }
  }

  // Caso normal
  if (isProbablyBinary(absPath)) {
    return '[archivo binario/no textual]';
  }
  try {
    const stat = await fs.promises.stat(absPath);
    const size = Math.min(stat.size, MAX_PREVIEW_BYTES);
    const buf = await fs.promises.readFile(absPath);
    return buf.slice(0, size).toString('utf8');
  } catch {
    return '[no se pudo leer el archivo]';
  }
}

// ====== Main ======
(async () => {
  const existingRoots = ROOTS.filter(r => fs.existsSync(r));
  if (existingRoots.length === 0) {
    console.error(`No existe ninguna carpeta raíz. Revisá: ${ROOTS.join(' | ')}`);
    process.exit(1);
  }

  const lines = [];
  /** @type {{num:number, path:string}[]} */
  const files = [];

  lines.push(`📁 ${ROOT_LABEL}`);

  const topPrefix = '│';
  const counterRef = { n: 0 }; // numeración global de archivos

  for (let idx = 0; idx < existingRoots.length; idx++) {
    const root = existingRoots[idx];
    const isLast = idx === existingRoots.length - 1;
    const { lines: subLines } = await buildTreeUnderPrefix(root, topPrefix, isLast, counterRef, files);
    lines.push(...subLines);
  }

  const chunks = [];
  // —— Árbol con numeración ——
  chunks.push(lines.join('\n'));

  // —— Contenidos por archivo (manteniendo la numeración) ——
  for (const f of files) {
    const abs = normWin(f.path);
    const rel = relativeToRoots(abs);
    chunks.push('\n--------------------------------------------\n');
    chunks.push(`${f.num}. ${abs}\n`);
    // Comentario de ruta relativa estilo // sub/dir/file.ext
    chunks.push(`// ${rel}\n`);
    chunks.push(await readFileSmart(abs));
  }

  const finalText = chunks.join('\n');

  try {
    await fs.promises.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
    await fs.promises.writeFile(OUTPUT_FILE, finalText, 'utf8');
    console.log(`✅ Esquema generado en: ${OUTPUT_FILE}`);
  } catch (e) {
    console.error(`❌ Error al guardar ${OUTPUT_FILE}: ${e.message}`);
  }
})();
