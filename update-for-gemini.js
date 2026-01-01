#!/usr/bin/env node

/**
 * Script to update NotebookLM MCP to Gemini MCP
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const replacements = [
  // URL changes
  {
    from: /notebooklm\.google\.com/g,
    to: 'gemini.google.com/app'
  },
  {
    from: /NOTEBOOKLM_AUTH_URL/g,
    to: 'GEMINI_AUTH_URL'
  },
  {
    from: /notebookUrl/g,
    to: 'geminiUrl'
  },
  {
    from: /notebook_url/g,
    to: 'gemini_url'
  },
  // Selector changes for Gemini input
  {
    from: /textarea\.query-box-input/g,
    to: 'div[contenteditable="true"]'
  },
  // Comments and descriptions
  {
    from: /NotebookLM/g,
    to: 'Gemini App'
  },
  {
    from: /notebooklm-mcp/g,
    to: 'gemini-mcp'
  },
  {
    from: /notebook/gi,
    to: (match) => {
      // Preserve case
      if (match === 'notebook') return 'conversation';
      if (match === 'Notebook') return 'Conversation';
      if (match === 'NOTEBOOK') return 'CONVERSATION';
      return match;
    }
  }
];

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    for (const {from, to} of replacements) {
      const newContent = content.replace(from, to);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        walkDir(filePath, callback);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.md') || file.endsWith('.json')) {
      callback(filePath);
    }
  }
}

console.log('🚀 Starting Gemini MCP conversion...\n');

const srcDir = path.join(__dirname, 'src');
if (fs.existsSync(srcDir)) {
  walkDir(srcDir, updateFile);
}

// Update specific files in root
const rootFiles = ['README.md', 'package.json'];
for (const file of rootFiles) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    updateFile(filePath);
  }
}

console.log('\n✅ Conversion complete!');
