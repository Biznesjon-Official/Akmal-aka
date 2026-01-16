#!/usr/bin/env node

/**
 * Alert va Confirm'larni avtomatik almashtirish script
 * 
 * Ishlatish:
 * node scripts/replace-alerts.js
 */

const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'client/src/app/purchase/page.tsx',
  'client/src/app/sale/page.tsx',
  'client/src/app/kassa/page.tsx',
  'client/src/app/wood/page.tsx',
  'client/src/app/expense/page.tsx',
  'client/src/app/backup/page.tsx',
];

function updateFile(filePath) {
  console.log(`\n📝 Updating: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  // 1. Import qo'shish
  if (!content.includes("import { showToast } from '@/utils/toast'")) {
    content = content.replace(
      /^(import.*from '@\/utils\/formatters';)/m,
      "$1\nimport { showToast } from '@/utils/toast';"
    );
    updated = true;
    console.log('  ✅ Added showToast import');
  }

  if (!content.includes("import { useConfirm } from '@/hooks/useConfirm'")) {
    content = content.replace(
      /^(import { showToast }.*)/m,
      "$1\nimport { useConfirm } from '@/hooks/useConfirm';"
    );
    updated = true;
    console.log('  ✅ Added useConfirm import');
  }

  // 2. Hook qo'shish (agar yo'q bo'lsa)
  if (!content.includes('const { confirm, ConfirmDialog } = useConfirm()')) {
    content = content.replace(
      /(export default function \w+\(\) \{)/,
      "$1\n  const { confirm, ConfirmDialog } = useConfirm();"
    );
    updated = true;
    console.log('  ✅ Added useConfirm hook');
  }

  // 3. alert() → showToast
  const alertPatterns = [
    // Success messages
    { 
      pattern: /alert\('([^']*muvaffaqiyatli[^']*)'\)/g, 
      replacement: "showToast.success('$1')",
      type: 'success'
    },
    { 
      pattern: /alert\("([^"]*muvaffaqiyatli[^"]*)"\)/g, 
      replacement: 'showToast.success("$1")',
      type: 'success'
    },
    { 
      pattern: /alert\(`([^`]*muvaffaqiyatli[^`]*)`\)/g, 
      replacement: 'showToast.success(`$1`)',
      type: 'success'
    },
    // Error messages
    { 
      pattern: /alert\('Xatolik: ' \+ ([^)]+)\)/g, 
      replacement: 'showToast.error($1)',
      type: 'error'
    },
    { 
      pattern: /alert\(([^)]*errorMessage[^)]*)\)/g, 
      replacement: 'showToast.error($1)',
      type: 'error'
    },
    { 
      pattern: /alert\('Iltimos[^']*'\)/g, 
      replacement: "showToast.error('$&'.slice(7, -2))",
      type: 'error'
    },
    // Generic alerts
    { 
      pattern: /alert\('([^']*)'\)/g, 
      replacement: "showToast.error('$1')",
      type: 'generic'
    },
  ];

  alertPatterns.forEach(({ pattern, replacement, type }) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      updated = true;
      console.log(`  ✅ Replaced ${type} alert`);
    }
  });

  // 4. window.confirm() → await confirm()
  const confirmPattern = /if \(window\.confirm\('([^']*)'\)\) \{([^}]+)\}/g;
  if (confirmPattern.test(content)) {
    content = content.replace(
      /const handleDelete = \(([^)]+)\) => \{\s*if \(window\.confirm\('([^']*)'\)\) \{([^}]+)\}\s*\};/gs,
      `const handleDelete = async ($1) => {
    const confirmed = await confirm({
      title: 'O\\'chirish',
      message: '$2',
      confirmText: 'Ha, o\\'chirish',
      cancelText: 'Bekor qilish',
      type: 'danger'
    });
    
    if (confirmed) {$3}
  };`
    );
    updated = true;
    console.log('  ✅ Replaced window.confirm');
  }

  // 5. ConfirmDialog component qo'shish
  if (!content.includes('<ConfirmDialog />')) {
    content = content.replace(
      /(\s*<\/Layout>)/,
      '\n      <ConfirmDialog />$1'
    );
    updated = true;
    console.log('  ✅ Added ConfirmDialog component');
  }

  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Successfully updated: ${filePath}`);
  } else {
    console.log(`⏭️  No changes needed: ${filePath}`);
  }
}

// Main
console.log('🚀 Starting alert/confirm replacement...\n');

filesToUpdate.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    try {
      updateFile(fullPath);
    } catch (error) {
      console.error(`❌ Error updating ${file}:`, error.message);
    }
  } else {
    console.error(`❌ File not found: ${file}`);
  }
});

console.log('\n✅ Done! All files updated.');
console.log('\n📝 Next steps:');
console.log('1. Check the changes: git diff');
console.log('2. Test the application');
console.log('3. Commit if everything works');
