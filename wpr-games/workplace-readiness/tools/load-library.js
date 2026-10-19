'use strict';
/* Loads authored JSON content from /content into a library object (Node only). */
const fs = require('fs');
const path = require('path');
const library = require('../js/core/library.js');

const ROOT = path.join(__dirname, '..', 'content');

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function readDir(dir) {
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => readJson(path.join(dir, f)));
}

function loadContent() {
  const skills = readJson(path.join(ROOT, 'skills.json')).skills;
  const families = readJson(path.join(ROOT, 'families.json')).families;
  const people = readJson(path.join(ROOT, 'people.json')).people;
  const contexts = readDir(path.join(ROOT, 'contexts'));
  const templates = [].concat(...readDir(path.join(ROOT, 'templates')).map(f => f.templates));
  return { skills, families, contexts, people, templates };
}

function loadLibrary() { return library.create(loadContent()); }

module.exports = { loadContent, loadLibrary };
