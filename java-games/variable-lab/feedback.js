// Response-aware support for the existing engine hint/assessment hooks.
// This is deliberately bounded to the literal/statement forms Variable Lab generates;
// it is not a parser for arbitrary Java programs and never evaluates student text.
const types = new Set(['byte', 'short', 'int', 'long', 'float', 'double', 'char', 'boolean', 'String']);
const reserved = new Set('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while _ true false null'.split(' '));
const quote = s => `“${s}”`;
const withArticle = s => `${/^[aeiou]/i.test(s) ? 'an' : 'a'} ${s}`;
const treeText = n => typeof n === 'string' ? n : n.text !== undefined ? n.text : n.children.map(treeText).join('');
function treeNodes(root, parent = null) {
  if (typeof root === 'string') return [];
  return [{...root, text: treeText(root), parent}, ...(root.children || []).flatMap(n => treeNodes(n, root.id))];
}
export function identifierIssue(name) {
  if (reserved.has(name)) return `${quote(name)} is a Java keyword or reserved literal, so it cannot be a variable name.`;
  // Java letters include currency symbols and connecting punctuation. The
  // generated bank uses ASCII; Unicode escapes/ignorable controls are out of scope.
  if (!/^[\p{L}\p{Nl}\p{Sc}\p{Pc}][\p{L}\p{Nl}\p{Sc}\p{Pc}\p{Nd}\p{Mn}\p{Mc}]*$/u.test(name))
    return `${quote(name)} cannot be one Java variable name. ${name.includes('-') ? 'Java reads the hyphen as a subtraction operator. ' : /\s/.test(name) ? 'Spaces separate tokens. ' : ''}Use letters, digits, underscores, or dollar signs; do not start with a digit or use a reserved word.`;
  return null;
}

export function literalInfo(text) {
  const s = String(text).trim();
  if (/^(true|false)$/.test(s)) return {type: 'boolean', category: 'Boolean literal', value: s};
  if (/^"(?:[^"\\\r\n]|\\[btnfr"'\\])*"$/.test(s))
    return {type: 'String', category: 'String literal', value: s.slice(1, -1).replace(/\\([btnfr"'\\])/g, (_, c) => ({b:'\b',t:'\t',n:'\n',f:'\f',r:'\r'}[c] || c))};
  if (/^'(?:[^'\\\r\n]|\\[btnfr"'\\])'$/.test(s)) {
    const raw = s.slice(1, -1), value = raw.startsWith('\\') ? ({b:'\b',t:'\t',n:'\n',f:'\f',r:'\r'}[raw[1]] || raw[1]) : raw;
    return {type: 'char', category: 'character literal', value: value.charCodeAt(0)};
  }
  if (/^'.*'$/.test(s)) return {error: `${quote(s)} is not a single-character literal. Single quotes hold one UTF-16 character or an escape such as '\\n'; text with several characters uses double quotes.`};
  // Generated numeric choices are decimal, without suffixes. Also recognize
  // decimal suffixes so assignment-conversion diagnostics can be compiler-tested.
  if (/^[+-]?(?:0|[1-9]\d*)[lL]?$/.test(s)) {
    const type = /[lL]$/.test(s) ? 'long' : 'int', value = BigInt(s.replace(/[lL]$/, ''));
    const bits = type === 'long' ? 64n : 32n;
    if (value < -(2n ** (bits - 1n)) || value >= 2n ** (bits - 1n)) return {error: `${quote(s)} is outside the range of a Java ${type} literal.`};
    return {type, category: 'integer literal', value};
  }
  if (/^[+-]?(?:(?:\d+\.\d*|\.\d+)(?:[eE][+-]?\d+)?|\d+[eE][+-]?\d+|\d+[fFdD])[fFdD]?$/.test(s)) {
    const type = /[fF]$/.test(s) ? 'float' : 'double';
    const number = Number(s.replace(/[fFdD]$/, '')), value = type === 'float' ? Math.fround(number) : number;
    if (!Number.isFinite(value) || (value === 0 && /[1-9]/.test(s.split(/[eE]/)[0]))) return {error: `${quote(s)} is outside the nonzero finite range of a Java ${type} literal.`};
    return {type, category: 'decimal numeric literal', value};
  }
  if (s.startsWith('"')) return {error: `${quote(s)} needs matching double quotes and valid escapes to be a String literal.`};
  if (/[,%$]/.test(s) && /\d/.test(s)) return {error: `${quote(s)} is not a numeric literal in this declaration. Java numbers do not include commas, currency signs, or a trailing percent sign.`};
  if (/^(True|False)$/.test(s)) return {error: `${quote(s)} is an identifier, not a Boolean literal. Java Boolean literals are lowercase and unquoted.`};
  return {error: `${quote(s)} is not a literal from this challenge. Unquoted words are interpreted as names or expressions, not automatically as text or numbers.`};
}
const widening = {byte:['short','int','long','float','double'], short:['int','long','float','double'], char:['int','long','float','double'], int:['long','float','double'], long:['float','double'], float:['double']};
export function assignmentCompatible(type, info) {
  if (info.error || !types.has(type)) return false;
  if (type === info.type || widening[info.type]?.includes(type)) return true;
  // Constant int expressions may narrow to byte/short/char when representable.
  const range = {byte:[-128n,127n], short:[-32768n,32767n], char:[0n,65535n]}[type];
  return !!(info.type === 'int' && range && info.value >= range[0] && info.value <= range[1]);
}
function compatibilityRule(type, value, info) {
  const meaning = {char:"char stores one UTF-16 character, such as 'A' or '7'", String:'String stores text in double quotes', boolean:'boolean stores true or false', int:'int stores whole-number values'}[type] || `${type} is a numeric type`;
  return `${meaning}. ${quote(value)} is a ${info.category} of type ${info.type}, which cannot directly initialize ${type}. ${['double','float','long'].includes(info.type) && ['byte','short','char','int'].includes(type) ? 'A narrowing numeric conversion needs an explicit cast and may lose information; this declaration has no cast.' : 'Choose a compatible type and value; quotes affect the Java type.'}`;
}
function sameValue(a, b) {
  if (a.error || b.error) return false;
  if (a.type === 'String' || a.type === 'boolean' || b.type === 'String' || b.type === 'boolean') return a.type === b.type && a.value === b.value;
  if (typeof a.value === typeof b.value) return a.value === b.value;
  const integer = typeof a.value === 'bigint' ? a.value : b.value;
  const number = typeof a.value === 'number' ? a.value : b.value;
  return Number.isInteger(number) && integer === BigInt(number);
}
export function diagnoseAssembly(q, r) {
  const issues = [], add = (id, fields, text) => issues.push({id, fields, text});
  if (r.operator !== '=') add('operator', ['operator'], `${quote(r.operator)} ${['==','!=','<','>','<=','>='].includes(r.operator) ? 'compares values' : /=$/.test(r.operator || '') ? 'updates an already-declared variable' : 'does not initialize a variable'}. A declaration needs an assignment operator between its name and initial value.`);
  const nameError = identifierIssue(r.name || '');
  if (nameError) add('identifier', ['name'], nameError);
  const info = literalInfo(r.value), expected = literalInfo(q.answer.value);
  const compatible = assignmentCompatible(r.type, info);
  if (!types.has(r.type)) add('type', ['type'], `${quote(r.type)} is not a data type offered by this declaration activity.`);
  if (info.error) add('literal', ['value'], info.error);
  else if (types.has(r.type) && !compatible) add('compatibility',
    q.convention && r.type === q.answer.type ? ['value'] : sameValue(info, expected) ? ['type'] : ['type','value'],
    compatibilityRule(r.type, r.value, info));
  // Generated scenarios explicitly require the introductory type convention.
  // A legal widening conversion can still fail that stated learning objective.
  if (q.convention && r.type !== q.answer.type && (compatible || info.error))
    add('scenario-type', ['type'], `${quote(r.type)} ${compatible ? `can legally receive ${quote(r.value)}` : 'does not match the scenario’s quantity under the displayed introductory type convention'}. ${compatible ? 'Java permits that conversion, but this challenge asks for the most appropriate type under its displayed convention. ' : ''}Decide whether the scenario describes a count, decimal measurement, condition, single character, or text.`);
  if (!info.error && !sameValue(info, expected)) add('scenario-value', ['value'], `${quote(r.value)} represents ${info.type === 'char' ? `character code ${info.value}` : `${quote(String(info.value))} as ${info.type}`}, which differs from the value described in the scenario. Match the scenario’s quantity, text, capitalization, or condition.`);
  return issues;
}
export const assessAssembly = (q, r) => diagnoseAssembly(q, r).length === 0;

function describe(n) {
  if (n.children) {
    if (/^(?:byte|short|int|long|float|double|boolean|char|String)\s/.test(n.text)) return {category: n.text.includes('=') ? 'declaration and initialization statement' : 'declaration without initialization', rule:'A declaration introduces a variable with a data type; initialization supplies its first value.'};
    if (/^\w+\s*=/.test(n.text)) return {category:'assignment statement', rule:'An assignment statement gives an existing variable a value without declaring it again.'};
    return {category:'code span containing multiple components', rule:'This selection contains more than one component. Tap an individual component when the question asks for one.'};
  }
  if (types.has(n.text)) return {category: n.text === 'String' ? 'String data type (a reference type)' : 'primitive data type', rule:'A data type describes what a variable can store; it is not the variable’s name or its stored value.'};
  if (n.text === '=') return {category:'assignment operator', rule:'An assignment operator stores the right-hand value in the left-hand variable.'};
  const info = literalInfo(n.text);
  if (!info.error) return {category:info.category, rule:`This is a value of type ${info.type}, not an operator or a variable name.`};
  return {category:'variable name (identifier)', rule:'An identifier names a variable; the name is distinct from the value stored in it.'};
}
const targetGuide = {
  type:['Find the data type associated with the variable named or described in the question.', 'The data type precedes the variable name in its declaration.'],
  name:['Find the identifier associated with the value in the question.', 'The variable name comes after the data type; it is not the value after the operator.'],
  operator:['Look for the symbol that assigns an initial value to the requested variable.', 'The assignment operator lies between the variable name and its value. Assignment and equality comparison use different operators.'],
  'assignment-operator':['Look for the symbol that stores a value in an existing variable.', 'Select only the operator between the variable name and value, rather than the whole assignment statement.'],
  value:['Find the literal supplying the requested variable’s first value.', 'Look on the right side of that variable’s assignment operator; quotation marks are part of a character or String literal.'],
  declaration:['Find the complete declaration requested in the question.', 'Select from its data type through its semicolon. Expand Selection grows a token into its surrounding statement.'],
  initialization:['Find the complete statement that both introduces and initializes the requested variable.', 'Include its data type, name, assignment operator, initial value, and semicolon using Expand Selection.'],
  'declaration-only':['Find a statement that introduces a variable without supplying a value.', 'Look for a data type and variable name ending in a semicolon, with no assignment operator or initial value.'],
  assignment:['Find the complete statement that assigns to a variable already declared above.', 'A later assignment does not repeat the data type. Expand Selection includes its name, operator, value, and semicolon.'],
};
function identificationHint(q, r, attempt, previous) {
  if (q.kind === 'select') {
    const ns = treeNodes(q.root), selected = ns.find(n => n.id === r.id), target = ns.find(n => n.id === q.answerId);
    if (!selected) return 'Tap a code component before checking; use Expand Selection only when the question asks for a whole statement.';
    const actual = describe(selected), requested = describe(target), guides = targetGuide[q.topic];
    const sameKind = actual.category === requested.category;
    return `You selected ${quote(selected.text)}. That is ${withArticle(actual.category)}. The question asks for ${withArticle(requested.category)}. ${sameKind ? 'This occurrence belongs to a different variable or statement than the one requested. Match the variable or initial value in the question.' : actual.rule} ${guides?.[attempt > 1 ? 1 : 0] || 'Match the requested component and statement.'}${attempt > 2 ? ` Compare the extent and location of your selection with the wording of the question (attempt ${attempt}).` : ''}${previous?.id && previous.id !== r.id ? ' Your selection changed; now check its kind and which statement it belongs to.' : ''}`;
  }
  if (q.topic === 'stored') return `You selected ${quote(r.answer)} as the stored value. ${attempt === 1 ? 'A later assignment replaces the earlier stored value; it does not add to it.' : 'Read the statements in execution order. The last assignment to the named variable determines its final value, independently of the first value.'}${attempt > 2 ? ` On attempt ${attempt}, focus on the value on the right of the last assignment.` : ''}`;
  if (q.topic === 'conversion') return `You selected ${quote(r.answer)} as the resulting value. ${attempt === 1 ? 'Casting a double to int truncates toward zero rather than rounding.' : 'Remove the fractional part while keeping the sign. For negative values, truncation moves toward zero, not toward negative infinity.'}${attempt > 2 ? ` On attempt ${attempt}, compare the cast result with the original decimal without its fractional part.` : ''}`;
  return `You selected ${quote(r.answer)} as the conversion category. ${attempt === 1 ? 'Compare the source and destination data types, and check whether the code includes a cast.' : 'A move from int to double can happen automatically; double to int needs a cast; identical types need no conversion.'}${attempt > 2 ? ` On attempt ${attempt}, follow the value into amount and classify that specific assignment.` : ''}`;
}
export function variableHint(q, r = {}, attempt = 1, previous) {
  if (q.mode !== 'assemble') return identificationHint(q, r, attempt, previous);
  const issues = diagnoseAssembly(q, r), old = previous ? diagnoseAssembly(q, previous) : [];
  const fixed = old.filter(x => !issues.some(i => i.id === x.id));
  const progress = fixed.length ? `Progress: you corrected ${fixed.map(x => x.id === 'identifier' ? 'the variable name' : x.id.replaceAll('-', ' ')).join(', ')}. ` : '';
  return `${progress}Your declaration ${quote(`${r.type} ${r.name} ${r.operator} ${r.value};`)} has ${issues.length} issue${issues.length === 1 ? '' : 's'} to investigate:\n${issues.map((x, i) => `${i + 1}. ${x.text}${attempt > 1 && x.id === 'operator' ? ' For initialization, Java uses =; == tests equality and != tests inequality.' : ''}`).join('\n')}${attempt > 1 ? '\nCheck each remaining field against the scenario and the Java type of its value.' : ''}${attempt > 2 ? `\nAttempt ${attempt}: fix the numbered issues, then check the complete declaration again; use Show Answer for a worked example.` : ''}`;
}
export function variableExplanation(q, r, previous, reveal = false) {
  if (q.mode === 'assemble') {
    const a = reveal ? q.answer : r, info = literalInfo(a.value);
    const conversion = info.type === a.type ? `Its ${info.type} value is compatible with ${a.type}.` : `Java allows this ${info.type}-to-${a.type} assignment conversion.`;
    return `${a.type} ${a.name} ${a.operator} ${a.value};\nThis declares ${quote(a.name)} and initializes it using =. ${conversion} ${q.convention ? 'It also matches the scenario and the displayed type convention.' : ''}${previous ? `\nIn your earlier declaration, ${diagnoseAssembly(q, previous).map(i => i.text).join(' ')}` : ''}`;
  }
  const contrast = previous ? `\nYour earlier selection was ${quote(q.kind === 'select' ? treeNodes(q.root).find(n => n.id === previous.id)?.text : previous.answer)}.${q.kind === 'select' ? ` It was ${withArticle(describe(treeNodes(q.root).find(n => n.id === previous.id)).category)}.` : ''}` : '';
  return q.explanation + contrast;
}
