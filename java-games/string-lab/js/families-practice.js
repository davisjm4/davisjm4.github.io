/* Structured String challenges: loop algorithms, String comparisons, and loop completion.
 * The builders use seeded parameters and small Java-semantics models; no question bank is used.
 */
(function (root) {
  'use strict';
  var SL = root.StringLab = root.StringLab || {}, H = SL.GenHelpers;
  var R = SL.Rng;
  var levels = ['beginner', 'intermediate', 'advanced'];
  var words = {
    beginner: ['banana','planet','civic','level','robot','paper','pepper','radar','letter','cocoa'],
    intermediate: ['mississippi','pineapple','committee','abracadabra','tattarrattat','strawberry','bookkeeper','reappear'],
    advanced: ['aaaaabaaaa','cabacabadab','mississippim','abccbaabccba','banana_bandana','aabcaabxaa']
  };
  function pick(r, a) { return r.pick(a); }
  function unique(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function choiceSet(answer, wrong, r) {
    if (String(answer) === 'true' || String(answer) === 'false') {
      var boolChoices = [{ text: 'true' }, { text: 'false' }];
      r.shuffle(boolChoices);
      return { choices: boolChoices, correctIndex: boolChoices.findIndex(function (x) { return x.text === String(answer); }) };
    }
    var vals = unique(wrong.map(String).filter(function (x) { return x !== String(answer); }));
    var fallbacks = ['0','1','-1','true','false','""','"x"','2'];
    for (var i = 0; vals.length < 3 && i < fallbacks.length; i++) if (fallbacks[i] !== String(answer) && vals.indexOf(fallbacks[i]) < 0) vals.push(fallbacks[i]);
    var all = [{ text: String(answer), correct: true }].concat(vals.slice(0, 3).map(function (x) { return { text: x, correct: false }; }));
    r.shuffle(all);
    return { choices: all, correctIndex: all.findIndex(function (x) { return x.correct; }) };
  }
  function str(s) { return '"' + s + '"'; }
  function word(r, lvl) { return H.pickW(r, lvl); }
  function targetOrAbsent(r, source) {
    if (r.chance(0.22)) {
      var absent=[];
      for(var i=97;i<=122;i++){var candidate=String.fromCharCode(i);if(source.indexOf(candidate)<0)absent.push(candidate);}
      if(absent.length)return pick(r,absent);
    }
    return pick(r, source.split(''));
  }
  function ch(r, f, lvl, spec) {
    var c = choiceSet(spec.answer, spec.wrong || [], r);
    var def=H.families.filter(function(x){return x.id===f.id;})[0];
    var normalized = spec.code.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '"S"').replace(/\b\d+\b/g, '#');
    return { type: 'structured', mode: f.mode, difficulty: lvl, family: f.id, familyLabel: def ? def.label : f.label,
      skill: f.skill, rule: f.id, seed: spec.seed, code: spec.code.split('\n'), prompt: spec.prompt,
      answer: String(spec.answer), choices: c.choices, correctIndex: c.correctIndex,
      explanation: spec.explanation, trace: spec.trace || [], meta: { familyId: f.id, pattern: spec.pattern, complexity: spec.complexity || 1 },
      signature: { shape: f.id + '|' + lvl + '|' + (spec.pattern || '') + '|' + normalized, exact: f.id + '|' + lvl + '|' + spec.code + '|' + spec.prompt } };
  }
  function reg(id, label, mode, skill, build, weight, available) {
    H.register({ id: id, label: label, mode: mode, skill: skill, rule: id, weight: weight || 1,
      levels: available || levels, build: function (r, lvl) { return build(r, lvl); } });
  }

  // Trace String Algorithms: every answer is produced by executing the displayed algorithm model.
  function traceFamily(id, label, build, available) { reg('algo.' + id, label, 'algorithms', 'String Algorithm Tracing', build, 1, available); }
  traceFamily('count.forward', 'Count matching characters', function (r,l) {
    var w=word(r,l), target=targetOrAbsent(r,w), count=0, log=[];
    for(var i=0;i<w.length;i++){ var hit=w.substring(i,i+1)===target; if(hit)count++; log.push('i = '+i+': '+str(w.substring(i,i+1))+(hit?' matches; count = '+count:' does not match; count = '+count)); }
    return ch(r,{id:'algo.count.forward',mode:'algorithms',skill:'String Algorithm Tracing'},l,{seed:r.int(1,2147483646),pattern:'forward-count',code:'String word = '+str(w)+';\nString target = '+str(target)+';\nint count = 0;\nfor (int i = 0; i < word.length(); i++) {\n    if (word.substring(i, i + 1).equals(target)) {\n        count++;\n    }\n}\nSystem.out.println(count);',prompt:'What number is printed?',answer:count,wrong:[count-1,count+1,w.indexOf(target)],explanation:'Each iteration compares one-character substring `word.substring(i, i + 1)` with the target. The loop visits indexes 0 through '+(w.length-1)+'.',trace:log,complexity:w.length});
  });
  traceFamily('count.backward', 'Count while traversing backward', function(r,l){
    var w=word(r,l), target=targetOrAbsent(r,w), start=r.int(0,w.length-1), count=0, log=[];
    for(var i=start;i>=0;i--){if(w.substring(i,i+1)===target)count++;log.push('i = '+i+', count = '+count);}
    return ch(r,{id:'algo.count.backward',mode:'algorithms',skill:'String Algorithm Tracing'},l,{seed:r.int(1,2147483646),pattern:'backward-count',code:'String word = '+str(w)+';\nString target = '+str(target)+';\nint count = 0;\nfor (int i = '+start+'; i >= 0; i--) {\n    if (word.substring(i, i + 1).equals(target)) {\n        count++;\n    }\n}\nSystem.out.println(count);',prompt:'How many matching characters are counted?',answer:count,wrong:[count+1, count-1, w.split(target).length-1],explanation:'The loop starts at '+start+' and moves down through index 0, inclusive.',trace:log,complexity:start+1});
  });
  traceFamily('find.position', 'Find first or last matching position', function(r,l){
    var w=word(r,l), t=targetOrAbsent(r,w), last=r.chance(0.5), idx=last?w.lastIndexOf(t):w.indexOf(t), init=-1, found=init, log=[];
    if(last){for(var i=w.length-1;i>=0;i--)if(w.substring(i,i+1)===t){found=i;log.push('match at '+i+'; stop');break;}}
    else {for(var j=0;j<w.length;j++)if(w.substring(j,j+1)===t){found=j;log.push('match at '+j+'; stop');break;}}
    return ch(r,{id:'algo.find.position',mode:'algorithms',skill:'String Algorithm Tracing'},l,{seed:r.int(1,2147483646),pattern:last?'last-position':'first-position',code:'String word = '+str(w)+';\nString target = '+str(t)+';\nint found = '+init+';\nfor (int i = '+(last?'word.length() - 1':'0')+'; '+(last?'i >= 0':'i < word.length()')+'; i '+(last?'--':'++')+') {\n    if (word.substring(i, i + 1).equals(target)) {\n        found = i;\n        break;\n    }\n}\nSystem.out.println(found);',prompt:'What index is stored in `found`?',answer:found,wrong:[idx===0?1:idx-1,idx+1,-1],explanation:'The loop visits indexes '+(last?'from right to left':'from left to right')+' and stops at the first match it encounters.',trace:log.length?log:['No matching position.'],complexity:w.length});
  });
  traceFamily('find.indexof', 'Search with indexOf', function(r,l){
    var w=word(r,l), t= r.chance(0.5)?pick(r,w.split('')):String.fromCharCode(120+r.int(0,2)), p=w.indexOf(t), exists=p>=0;
    return ch(r,{id:'algo.find.indexof',mode:'algorithms',skill:'String Algorithm Tracing'},l,{seed:r.int(1,2147483646),pattern:'indexof-presence',code:'String word = '+str(w)+';\nString target = '+str(t)+';\nint position = word.indexOf(target);\nboolean found = position >= 0;\nSystem.out.println(found);',prompt:'Does the algorithm report that the target exists?',answer:exists,wrong:[!exists, p===0, p>0],explanation:'`indexOf` returns the first index when found and `-1` when absent; therefore `position >= 0` is true exactly when it exists.',complexity:2});
  });
  traceFamily('find.substring', 'Find a matching substring', function(r,l){
    var w=word(r,l),start=r.int(0,w.length-2),len=r.int(2,Math.min(4,w.length-start)),target=w.substring(start,start+len);
    if(r.chance(0.25)){target=String.fromCharCode(97+r.int(0,25))+String.fromCharCode(97+r.int(0,25));while(w.indexOf(target)>=0)target=target+'x';}
    var position=w.indexOf(target),last=w.lastIndexOf(target),answer=position;
    return ch(r,{id:'algo.find.substring',mode:'algorithms',skill:'String Algorithm Tracing'},l,{seed:r.int(1,2147483646),pattern:'first-substring-index',code:'String word = '+str(w)+';\nString target = '+str(target)+';\nint position = word.indexOf(target);\nSystem.out.println(position);',prompt:'What value is stored in `position`?',answer:answer,wrong:[position===-1?0:position+1,last,position===-1?w.length:-1],explanation:'`indexOf(target)` returns the starting index of the first complete match. If the substring is absent, it returns `-1`.',complexity:3});
  });
  traceFamily('reverse.build', 'Build a reversed String', function(r,l){
    var w=word(r,l), result='', log=[];
    for(var i=w.length-1;i>=0;i--){result+=w.substring(i,i+1);log.push('i = '+i+' → result = '+str(result));}
    var after=r.int(1,w.length), state=''; for(var j=w.length-1;j>=w.length-after;j--)state+=w.substring(j,j+1);
    var askState=l!=='beginner'&&r.chance(0.5);
    return ch(r,{id:'algo.reverse.build',mode:'algorithms',skill:'String Algorithm Tracing'},l,{seed:r.int(1,2147483646),pattern:askState?'reverse-intermediate':'reverse-final',code:'String word = '+str(w)+';\nString result = "";\nfor (int i = word.length() - 1; i >= 0; i--) {\n    result += word.substring(i, i + 1);\n}\nSystem.out.println(result);',prompt:askState?'What is `result` after '+after+' loop iterations?':'What String is printed?',answer:askState?str(state):str(result),wrong:[str(w),str(result.slice(1)),str(result.split('').reverse().join(''))===str(result)?str(w.slice(1)):str(result.slice(0,-1))],explanation:'Each pass appends the one-character substring at the current index. Since the loop counts down, characters are appended in reverse order.',trace:log,complexity:w.length});
  });
  traceFamily('transform.filter', 'Filter and reconstruct characters', function(r,l){
    var w=word(r,l), target=pick(r,w.split('')), keep=r.chance(0.5), result='', log=[];
    for(var i=0;i<w.length;i++){var s=w.substring(i,i+1), yes=s===target;if(yes===keep)result+=s;log.push(s+': '+(yes===keep?'append':'skip')+' → '+str(result));}
    var ask=l!=='beginner'&&r.chance(0.5), until=ask?r.int(0,w.length-1):w.length-1, partial='';
    for(var k=0;k<=until;k++){var q=w.substring(k,k+1);if((q===target)===keep)partial+=q;}
    return ch(r,{id:'algo.transform.filter',mode:'algorithms',skill:'String Algorithm Tracing'},l,{seed:r.int(1,2147483646),pattern:keep?'retain-matches':'remove-matches',code:'String word = '+str(w)+';\nString target = '+str(target)+';\nString result = "";\nfor (int i = 0; i < word.length(); i++) {\n    String letter = word.substring(i, i + 1);\n    if ('+(keep?'letter.equals(target)':'!letter.equals(target)')+') {\n        result += letter;\n    }\n}\nSystem.out.println(result);',prompt:ask?'What is `result` after the loop reaches index '+until+'?':'What String is printed?',answer:ask?str(partial):str(result),wrong:[str(w),str(result.split('').reverse().join('')),str(keep? w.replace(new RegExp(target,'g'),''):w.split(target).join(target))],explanation:'The condition decides whether each one-character String is appended. String concatenation builds a new value in `result`.',trace:log,complexity:w.length+1});
  });
  traceFamily('transform.replace','Replace selected characters by reconstruction',function(r,l){
    var w=word(r,l),target=pick(r,w.split('')),replacement=String.fromCharCode(97+r.int(0,25));while(replacement===target)replacement=String.fromCharCode(97+r.int(0,25));
    var result='',log=[];for(var i=0;i<w.length;i++){var letter=w.substring(i,i+1);result+=letter===target?replacement:letter;log.push('i = '+i+': append '+str(letter===target?replacement:letter)+' → '+str(result));}
    var ask=l!=='beginner'&&r.chance(0.5),until=ask?r.int(0,w.length-1):w.length-1,partial='';for(var j=0;j<=until;j++){var current=w.substring(j,j+1);partial+=current===target?replacement:current;}
    return ch(r,{id:'algo.transform.replace',mode:'algorithms',skill:'String Algorithm Tracing'},l,{seed:r.int(1,2147483646),pattern:'conditional-reconstruction-replace',code:'String word = '+str(w)+';\nString target = '+str(target)+';\nString replacement = '+str(replacement)+';\nString result = "";\nfor (int i = 0; i < word.length(); i++) {\n    String letter = word.substring(i, i + 1);\n    if (letter.equals(target)) {\n        result += replacement;\n    } else {\n        result += letter;\n    }\n}\nSystem.out.println(result);',prompt:ask?'What is `result` after the loop reaches index '+until+'?':'What String is printed?',answer:ask?str(partial):str(result),wrong:[str(w),str(result.split('').reverse().join('')),str(w.split(target).join(''))],explanation:'Strings are immutable, so the algorithm builds a new result: it appends `replacement` for a match and the original one-character substring otherwise.',trace:log,complexity:w.length+2});
  });
  traceFamily('substring.count', 'Count substring matches', function(r,l){
    var overlap=r.chance(0.5), w, t;
    if(overlap && r.chance(0.45)){var repeated=String.fromCharCode(97+r.int(0,25));t=repeated+repeated;w=repeated.repeat(r.int(3,10));}
    else {w=word(r,l);t=pick(r,['aa','an','ab','aba','ana','iss','ll','ra','na','er']);}
    var count=0, positions=[], at=0;
    while((at=w.indexOf(t,at))>=0){count++;positions.push(at);at+=overlap?1:t.length;}
    var log=positions.map(function(p){return 'match at '+p+'; next search starts at '+(p+(overlap?1:t.length));});
    return ch(r,{id:'algo.substring.count',mode:'algorithms',skill:'String Algorithm Tracing'},l,{seed:r.int(1,2147483646),pattern:overlap?'overlap':'nonoverlap',code:'String word = '+str(w)+';\nString target = '+str(t)+';\nint count = 0;\nint start = 0;\nwhile (start <= word.length() - target.length()) {\n    int relative = word.substring(start).indexOf(target);\n    if (relative == -1) {\n        break;\n    }\n    start += relative;\n    count++;\n    start += '+(overlap?'1':'target.length()')+';\n}\nSystem.out.println(count);',prompt:'How many matches does this search count?',answer:count,wrong:[positions.length?positions.length-1:1, (function(){var c=0,p=w.indexOf(t);while(p>=0){c++;p=w.indexOf(t,p+t.length);}return c;})(),count+1],explanation:'The suffix `word.substring(start)` is searched with `indexOf`. After a match, the update advances by '+(overlap?'one character, so overlapping matches are allowed':'the target length, so counted matches cannot overlap')+'.',trace:log,complexity:positions.length+3});
  });
  traceFamily('palindrome.compare', 'Compare opposite String positions', function(r,l){
    var base=word(r,l), palindrome=base+base.split('').reverse().join(''), w=r.chance(0.5)?palindrome:word(r,l), yes=w===w.split('').reverse().join(''), ok=true, log=[];
    for(var i=0;i<w.length/2;i++){var a=w.substring(i,i+1),b=w.substring(w.length-1-i,w.length-i);var same=a===b;log.push('i = '+i+': '+str(a)+' vs '+str(b)+' → '+same);if(!same){ok=false;break;}}
    return ch(r,{id:'algo.palindrome.compare',mode:'algorithms',skill:'String Algorithm Tracing'},l,{seed:r.int(1,2147483646),pattern:'opposite-index-compare',code:'String word = '+str(w)+';\nboolean same = true;\nfor (int i = 0; i < word.length() / 2; i++) {\n    String left = word.substring(i, i + 1);\n    String right = word.substring(word.length() - 1 - i, word.length() - i);\n    if (!left.equals(right)) {\n        same = false;\n    }\n}\nSystem.out.println(same);',prompt:'What Boolean value is printed?',answer:ok,wrong:[!ok,w.length%2===0,yes],explanation:'Each iteration compares symmetric positions `i` and `length() - 1 - i`. The flag changes to false if any pair differs.',trace:log,complexity:w.length/2+2});
  });
  reg('algo.multi.filter','Filter with two conditions','algorithms','String Algorithm Tracing',function(r,l){
    var w=word(r,'advanced'),target=pick(r,w.split('')),result='',hits=0,log=[];
    for(var i=0;i<w.length;i++){var letter=w.substring(i,i+1),keep=letter===target&&i%2===0;if(keep){result+=letter;hits++;}log.push('i = '+i+': match = '+(letter===target)+', even index = '+(i%2===0)+', result = '+str(result));}
    return ch(r,{id:'algo.multi.filter',mode:'algorithms',skill:'String Algorithm Tracing'},l,{seed:r.int(1,2147483646),pattern:'match-and-even-index',code:'String word = '+str(w)+';\nString target = '+str(target)+';\nString result = "";\nint count = 0;\nfor (int i = 0; i < word.length(); i++) {\n    String letter = word.substring(i, i + 1);\n    if (letter.equals(target) && i % 2 == 0) {\n        result += letter;\n        count++;\n    }\n}\nSystem.out.println(result + "/" + count);',prompt:'What is printed as `result/count`?',answer:result+'/'+hits,wrong:[result+'/'+(hits+1),w.split(target).join('')+'/'+hits,result.split('').reverse().join('')+'/'+hits],explanation:'Both conditions must be true: the character must match and its index must be even. `&&` requires both tests to pass.',trace:log,complexity:w.length*2});
  },1,['advanced']);

  // Compare Strings: all reference relationships are explicit in the generated object graph.
  function compareFamily(id,label,build,available){reg('compare.'+id,label,'compare','String Comparisons',build,1,available);}
  compareFamily('equals', 'Compare String contents with equals', function(r,l){
    var a=word(r,l), same=r.chance(0.5), b=same?a:a.toUpperCase();
    if(same)b=a;
    var result=a===b;
    return ch(r,{id:'compare.equals',mode:'compare',skill:'String Comparisons'},l,{seed:r.int(1,2147483646),pattern:'equals-content',code:'String first = '+str(a)+';\nString second = '+str(b)+';\nSystem.out.println(first.equals(second));',prompt:'What Boolean value is printed?',answer:result,wrong:[!result, a.toLowerCase()===b.toLowerCase(),a.length===b.length],explanation:'`equals()` compares the character contents exactly. It is case-sensitive; capitalization must match.',complexity:1});
  });
  compareFamily('compareto.sign', 'Compare lexicographic order', function(r,l){
    var base=word(r,l), relation=r.int(0,4), other=word(r,l), a=base,b=relation===0?base:relation===1?base+'x':relation===2?base.substring(0,1):relation===3?base.toUpperCase():other, n=0;
    while(n<Math.min(a.length,b.length)&&a.charCodeAt(n)===b.charCodeAt(n))n++;
    var cmp=n===Math.min(a.length,b.length)?a.length-b.length:a.charCodeAt(n)-b.charCodeAt(n), q=pick(r,['< 0','> 0','== 0']),ans=q==='< 0'?cmp<0:q==='> 0'?cmp>0:cmp===0;
    return ch(r,{id:'compare.compareto.sign',mode:'compare',skill:'String Comparisons'},l,{seed:r.int(1,2147483646),pattern:'lexical-sign-'+q,code:'String a = '+str(a)+';\nString b = '+str(b)+';\nSystem.out.println(a.compareTo(b) '+q+');',prompt:'What Boolean value is printed?',answer:ans,wrong:[!ans,a.length<b.length,a.toLowerCase().localeCompare(b.toLowerCase())<0],explanation:'`compareTo` compares UTF-16 character values from left to right. The first different character decides; if one String is a prefix, the shorter String comes first.',complexity:2});
  });
  compareFamily('compareto.value', 'Interpret a compareTo result', function(r,l){
    var a=word(r,l), relation=r.int(0,3), b=relation===0?a:relation===1?a+'x':relation===2?a.substring(0,1):word(r,l),i=0;while(i<Math.min(a.length,b.length)&&a.charCodeAt(i)===b.charCodeAt(i))i++;
    var n=i===Math.min(a.length,b.length)?a.length-b.length:a.charCodeAt(i)-b.charCodeAt(i), sign=n<0?'negative':n>0?'positive':'zero';
    return ch(r,{id:'compare.compareto.value',mode:'compare',skill:'String Comparisons'},l,{seed:r.int(1,2147483646),pattern:'compareto-sign-value',code:'String first = '+str(a)+';\nString second = '+str(b)+';\nint result = first.compareTo(second);\nSystem.out.println(result < 0 ? "negative" : result > 0 ? "positive" : "zero");',prompt:'Which describes the printed result?',answer:str(sign),wrong:[str(sign==='negative'?'positive':'negative'),str('zero'),str('1')],explanation:'Only the sign is requested. `compareTo()` can return any negative or positive integer; Java does not promise only -1, 0, or 1.',complexity:2});
  });
  compareFamily('identity.alias', 'Distinguish reference equality and content', function(r,l){
    var word=H.pickW(r,l), scenario=r.int(0,2), first=scenario===2?str(word):'new String('+str(word)+')', second=scenario===0?'first':scenario===2?str(word):'new String('+str(word)+')', same=scenario!==1;
    return ch(r,{id:'compare.identity.alias',mode:'compare',skill:'String Comparisons'},l,{seed:r.int(1,2147483646),pattern:scenario===0?'alias-same-object':scenario===1?'separate-objects':'same-literal',code:'String first = '+first+';\nString second = '+second+';\nSystem.out.println(first == second);\nSystem.out.println(first.equals(second));',prompt:'What two Boolean values are printed, in order?',answer:(same?'true':'false')+' / true',wrong:[(same?'false':'true')+' / true',(same?'true':'false')+' / false','false / false'],explanation:'Both variables have equal character contents, so `equals()` is true. `==` tests reference identity: '+(scenario===0?'`second = first` assigns the same reference.':scenario===1?'the two `new String` calls create separate objects.':'identical String literals are interned, so both references point to the same literal object.'),complexity:2});
  });
  compareFamily('conditional.branch', 'Trace a String comparison in a conditional', function(r,l){
    var a=word(r,l),rel=r.int(0,3),b=rel===0?a:rel===1?a+'x':rel===2?a.toUpperCase():word(r,l),op=pick(r,['< 0','== 0','> 0']),i=0;while(i<Math.min(a.length,b.length)&&a.charCodeAt(i)===b.charCodeAt(i))i++;var c=i===Math.min(a.length,b.length)?a.length-b.length:a.charCodeAt(i)-b.charCodeAt(i),yes=op==='< 0'?c<0:op==='> 0'?c>0:c===0;
    return ch(r,{id:'compare.conditional.branch',mode:'compare',skill:'String Comparisons'},l,{seed:r.int(1,2147483646),pattern:'if-compareto-'+op,code:'String first = '+str(a)+';\nString second = '+str(b)+';\nif (first.compareTo(second) '+op+') {\n    System.out.println("first");\n} else {\n    System.out.println("second");\n}',prompt:'Which word is printed?',answer:str(yes?'first':'second'),wrong:[str(yes?'second':'first'),str(a),str(b)],explanation:'The comparison is '+(yes?'true':'false')+'. `compareTo` uses lexicographic, case-sensitive order, so the '+(yes?'if':'else')+' branch runs.',complexity:2});
  });
  compareFamily('choose.expression', 'Choose the right comparison expression', function(r,l){
    var goals=[['test same contents','first.equals(second)','first == second','first.equalsIgnoreCase(second)','first.compareTo(second) == 1'],['test same object reference','first == second','first.equals(second)','first.compareTo(second) == 0','first != second'],['test alphabetically earlier','first.compareTo(second) < 0','first.equals(second)','first.length() < second.length()','first.compareTo(second) > 0']];
    var g=pick(r,goals), correct=g[1], wrong=g.slice(2), a=word(r,l), b;
    if(g[0]==='test same contents')b=a.toUpperCase();
    else if(g[0]==='test same object reference')b='first';
    else {a='A'+word(r,l).substring(0,4);b='b'+word(r,l).substring(0,4);}
    var firstInit='new String('+str(a)+')',secondInit=b==='first'?'first':'new String('+str(b)+')';
    return ch(r,{id:'compare.choose.expression',mode:'compare',skill:'String Comparisons'},l,{seed:r.int(1,2147483646),pattern:'select-expression-'+g[0],code:'String first = '+firstInit+';\nString second = '+secondInit+';',prompt:'Which Java expression will '+g[0]+'?',answer:correct,wrong:wrong,explanation:correct+' directly tests the stated condition. `equals` tests content, `==` tests object identity, and `compareTo` tests case-sensitive lexicographic order.',complexity:l==='advanced'?4:2});
  });
  compareFamily('alias.reassign','Trace aliasing after reassignment',function(r,l){
    var w=H.pickW(r,l),suffix=pick(r,['!','x','2']);
    return ch(r,{id:'compare.alias.reassign',mode:'compare',skill:'String Comparisons'},l,{seed:r.int(1,2147483646),pattern:'alias-then-reassign',code:'String first = new String('+str(w)+');\nString second = first;\nfirst = first + '+str(suffix)+';\nSystem.out.println(first == second);\nSystem.out.println(first.equals(second));\nSystem.out.println(first.compareTo(second) > 0);',prompt:'What three Boolean values are printed, in order?',answer:'false / false / true',wrong:['true / true / false','false / true / true','true / false / false'],explanation:'Initially both variables refer to the same object. Concatenation creates a new String and reassigns only `first`; `second` still refers to the original. The new String is longer and starts with the old contents, so its `compareTo` result is positive.',complexity:5});
  },['advanced']);

  // Complete the String Loop: choices are exact expressions or statements, with one valid answer.
  function loopFamily(id,label,build,available){reg('loop.'+id,label,'loop','String Loop Construction',build,1,available);}
  loopFamily('bound', 'Choose a loop bound', function(r,l){var w=word(r,l),a=['i < word.length()','i <= word.length()','i < word.length() - 1','i > word.length()'];return ch(r,{id:'loop.bound',mode:'loop',skill:'String Loop Construction'},l,{seed:r.int(1,2147483646),pattern:'forward-bound',code:'String word = '+str(w)+';\nfor (int i = 0; ______; i++) {\n    System.out.println(word.substring(i, i + 1));\n}',prompt:'Which condition prints every character exactly once without an exception?',answer:a[0],wrong:a.slice(1),explanation:'The valid indexes are 0 through `word.length() - 1`, so `i < word.length()` includes the last valid index and stops before the length itself.',complexity:w.length});});
  loopFamily('substring.endpoint','Choose substring endpoints',function(r,l){var w=word(r,l),start=r.int(0,w.length-1),toEnd=r.chance(0.2),len=toEnd?w.length-start:r.int(1,w.length-start),goal=w.substring(start,start+len),correct=toEnd?'word.substring('+start+')':'word.substring('+start+', '+(start+len)+')',wrong=toEnd?['word.substring('+start+', word.length() - 1)','word.substring('+(start+1)+')','word.substring(0, '+start+')']:['word.substring('+start+', '+(start+len+1)+')','word.substring('+(start+1)+', '+(start+len)+')','word.substring('+start+', '+start+')'];return ch(r,{id:'loop.substring.endpoint',mode:'loop',skill:'String Loop Construction'},l,{seed:r.int(1,2147483646),pattern:toEnd?'substring-to-end':'substring-length-'+len,code:'String word = '+str(w)+';\nString part = ______;',prompt:toEnd?'Which expression assigns all characters from index '+start+' through the end of `word` to `part`?':'Which expression assigns exactly '+len+' character'+(len===1?'':'s')+' beginning at index '+start+' to `part`?',answer:correct,wrong:wrong,explanation:toEnd?'`substring('+start+')` starts at the inclusive index '+start+' and continues through the end of the String.':'`substring(begin, end)` includes `begin` but excludes `end`. Setting end to '+(start+len)+' extracts exactly '+len+' character(s): '+str(goal)+'.',complexity:len});});
  loopFamily('reverse','Complete reverse traversal',function(r,l){var w=word(r,l);return ch(r,{id:'loop.reverse',mode:'loop',skill:'String Loop Construction'},l,{seed:r.int(1,2147483646),pattern:'reverse-condition',code:'String word = '+str(w)+';\nString result = "";\nfor (int i = word.length() - 1; ______; i--) {\n    result += word.substring(i, i + 1);\n}',prompt:'Which condition visits every character from last to first?',answer:'i >= 0',wrong:['i > 0','i < word.length()','i >= word.length()'],explanation:'The last valid index is `length() - 1`; counting down must continue while `i >= 0` to include index 0.',complexity:w.length});});
  loopFamily('matching','Choose a matching condition',function(r,l){var w=word(r,l),t=pick(r,w.split(''));return ch(r,{id:'loop.matching',mode:'loop',skill:'String Loop Construction'},l,{seed:r.int(1,2147483646),pattern:'equals-check',code:'String word = '+str(w)+';\nString target = '+str(t)+';\nint count = 0;\nfor (int i = 0; i < word.length(); i++) {\n    if (__________) {\n        count++;\n    }\n}',prompt:'Which condition counts a match at the current index `i`?',answer:'word.substring(i, i + 1).equals(target)',wrong:['word.substring(i, i).equals(target)','word.substring(i, i + 1) == target','word.indexOf(target) == -1'],explanation:'The loop examines one character at `i`; `substring(i, i + 1)` creates that one-character String, and `equals` compares its content.',complexity:w.length});});
  loopFamily('accumulator','Choose the accumulator update',function(r,l){var w=word(r,l),target=pick(r,w.split('')),i=r.int(0,w.length-1),task=pick(r,['count','append','reverse','remove']),updates={count:'count++;',append:'result += letter;',reverse:'result = letter + result;',remove:'result += letter;'},correct=updates[task];var block=task==='count'?'if (letter.equals(target)) {\n    ______\n}':task==='remove'?'if (!letter.equals(target)) {\n    ______\n}':'______';var code='String word = '+str(w)+';\nString target = '+str(target)+';\nString result = "";\nint count = 0;\nint i = '+i+';\nString letter = word.substring(i, i + 1);\n'+block;return ch(r,{id:'loop.accumulator',mode:'loop',skill:'String Loop Construction'},l,{seed:r.int(1,2147483646),pattern:'accumulator-'+task,code:code,prompt:'Which statement '+({count:'counts this matching character',append:'appends the current character to the end',reverse:'prepends the current character to the beginning',remove:'keeps this character only when it is not the target'}[task])+'?',answer:correct,wrong:unique([updates[task==='count'?'append':'count'],updates.reverse,updates.remove,updates.append]).filter(function(x){return x!==correct;}).slice(0,3),explanation:'The update belongs to the displayed condition. `count++` changes the numeric count, `result += letter` appends, and `result = letter + result` prepends.',complexity:w.length});});
  loopFamily('bug','Find the loop bug',function(r,l){var w=word(r,l), bug=pick(r,['i <= word.length()','i < word.length() - 1']), effect=bug==='i <= word.length()'?'exception':'skips-last';return ch(r,{id:'loop.bug',mode:'loop',skill:'String Loop Construction'},l,{seed:r.int(1,2147483646),pattern:'bug-'+effect,code:'String word = '+str(w)+';\nfor (int i = 0; i '+(effect==='exception'?'<= word.length()':'< word.length() - 1')+'; i++) {\n    System.out.println(word.substring(i, i + 1));\n}',prompt:'What is the main effect of the loop?',answer:effect==='exception'?'It eventually throws StringIndexOutOfBoundsException.':'It skips the last character.',wrong:['It prints every character exactly once.','It skips the first character.','The loop never terminates.'],explanation:effect==='exception'?'When `i == word.length()`, the loop still runs, then `substring(i, i + 1)` has an end index beyond the String length.':'The condition becomes false while `i` is at the last valid index, so that final character is never printed.',complexity:2});});
  loopFamily('edge','Reason about an empty or short String',function(r,l){
    var scenario=r.int(0,2), w=scenario===0?'':scenario===1?word(r,l).substring(0,1):word(r,l).substring(0,1);
    var question=scenario===0?'What does the loop print?':scenario===1?'What is `word.length()`?':'What happens when this statement runs?';
    var code='String word = '+str(w)+';\n'+(scenario===2?'String part = word.substring(0, 2);':'for (int i = 0; i < word.length(); i++) {\n    System.out.println(word.substring(i, i + 1));\n}');
    var ans=scenario===0?'Nothing is printed.':scenario===1?'1':'It throws StringIndexOutOfBoundsException.';
    var wrong=scenario===0?['It throws an exception.','It prints an empty line.','The loop runs once.']:scenario===1?['0','2','It throws StringIndexOutOfBoundsException.']:['It returns the first character.','It returns an empty String.','The loop runs zero times.'];
    var explanation=scenario===0?'For an empty String, `length()` is 0. The test `0 < 0` is false, so the loop body runs zero times.':scenario===1?'A one-character String has length 1. Its only valid character index is 0.':'The requested end index 2 is greater than the source length 1, so `substring(0, 2)` throws `StringIndexOutOfBoundsException`.';
    return ch(r,{id:'loop.edge',mode:'loop',skill:'String Loop Construction'},l,{seed:r.int(1,2147483646),pattern:'edge-'+scenario,code:code,prompt:question,answer:ans,wrong:wrong,explanation:explanation,complexity:scenario+1});
  });
  loopFamily('combined','Complete a backward search with multiple conditions',function(r,l){
    var w=word(r,l),target=pick(r,w.split('')),answer='letter.equals(target) && found == -1';
    return ch(r,{id:'loop.combined',mode:'loop',skill:'String Loop Construction'},l,{seed:r.int(1,2147483646),pattern:'backward-first-match',code:'String word = '+str(w)+';\nString target = '+str(target)+';\nint found = -1;\nfor (int i = word.length() - 1; i >= 0; i--) {\n    String letter = word.substring(i, i + 1);\n    if (__________) {\n        found = i;\n    }\n}',prompt:'Which condition stores the rightmost matching position and leaves it unchanged afterward?',answer:answer,wrong:['letter.equals(target) || found == -1','letter.equals(target) && found != -1','word.indexOf(target) == i'],explanation:'The first condition requires a match and confirms no position has been stored yet. Because traversal begins at the right, that first saved match is the rightmost one.',complexity:w.length+3});
  },['advanced']);

  SL.PracticeFamilies = {
    /** Deterministic generation contract for independent consumers such as future Teacher Tools. */
    build: function (family, seed, difficulty) {
      var f=H.families.filter(function(x){return x.id===family;})[0];
      if(!f)throw new Error('Unknown family '+family);
      if(!SL.Generator)throw new Error('Load generator.js before requesting practice data');
      return SL.Generator.generateChallenge({seed:seed,mode:f.mode,difficulty:difficulty,family:family});
    },
    simulateStringCount: function(s,t,overlap){var c=0,p=s.indexOf(t);while(p>=0){c++;p=s.indexOf(t,p+(overlap?1:t.length));}return c;}
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
