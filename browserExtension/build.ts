#!/usr/bin/env node
import * as estrella from 'estrella';
import * as path from 'path';
import * as fs from 'fs';

const outputDir = 'build'

const bundlerOptions = {
  sourcemap: true,
  sourcesContent: true,
  run: false,
  minify: false,
  keepNames: true,
};

estrella.build({
  entryPoints: ['src/background.ts'],
  bundle: true,
  outfile: `${outputDir}/background.js`,
  ...bundlerOptions,
});

estrella.build({
  entryPoints: ['src/content.ts'],
  bundle: true,
  outfile: `${outputDir}/content.js`,
  ...bundlerOptions,
});

function ensureDirectoryExists(path: string) {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }
}

function copyAndWatch(source: string, dest: string) {
  function performCopy() {
    estrella.file.copy(source, dest);
  }
  ensureDirectoryExists(path.dirname(dest));
  performCopy();
  estrella.watch(source, performCopy);
}

copyAndWatch("res/options.html", `${outputDir}/options.html`);
copyAndWatch("res/manifest.json", `${outputDir}/manifest.json`);
