import {V,L,E,List,Call,A,D,R,I,F,T,U,P,S,Op,In,Event,walk,clone} from './model.js';
export const scenarioIds=['greeting','discount','count','sum','search','repeat','until','access','append','menu','range','flag','robot','copy','average','input','event','remove','maximum','quiz'];
// Three genuinely different argument/data-flow structures per scenario: direct value,
// stored input, and an expression/list construction. Each keeps the same simple task.
export function scenario(id,variant=0,seed=1) {
  const form=((variant%3)+3)%3,n=3+(seed>>>0)%3,cut=10+(seed>>>0)%5;
  const values=[cut-2,cut,cut+3];
  const nameBank=['Ari','Bo','Cam','Dee','Eli','Fay','Gia','Hal','Ira','Jae','Kai','Lee','Mia','Noa','Ora','Paz','Rae','Sam','Taj','Uma','Val','Wes','Xiu','Yael','Zoe','Alex','Blair','Casey','Drew','Emery','Finley','Gray','Harper','Indy','Jules','Kris','Lane','Morgan','Nico','Oak','Parker','Quinn','Reese','Sage','Taylor','Remy','Robin','Sky','Toni','Wynn'];
  const greetingName=nameBank[(seed>>>0)%nameBank.length],names=[0,1,2].map(i=>nameBank[((seed>>>0)+i)%nameBank.length]);
  const prices=[2+(seed%4),4+(seed%3),6+(seed%5)];
  let body=[],prefix=[],after=[],param='value',arg=L(cut,'argument'),expected,description,inputs=[cut],events=[],procedure='showResult';
  const ret=x=>R(x,'return'),out=x=>D(x,'output'),set=(name,v,id)=>A(name,v,id);
  const conditional=(condition,yes,no=[])=>I(condition,yes,no,'selection');
  const foreach=(name,list,b)=>F(name,list,b,'loop');
  const callTail=(pname,argument,output='return')=> output==='return'?[A('result',Call(pname,[argument],'call'),'receive'),D(V('result','output-value'),'output')]:[S(pname,[argument],'invoke')];
  if(id==='greeting'){
    param='name';arg=L(greetingName,'argument');procedure='greet';body=[D(V(param,'parameter-use'),'output')];expected=x=>[x];description='Display the name supplied to greet. A return value is not needed.';
  }else if(id==='discount'){
    param='price';procedure='salePrice';body=[set('cost',V(param,'parameter-use'),'initialize'),conditional(E('≥',V(param,'condition-left'),L(cut,'boundary'),'condition'),[set('cost',E('-',V(param),L(2)),'update')]),ret(V('cost','return-value'))];expected=x=>[x>=cut?x-2:x];description=`Return and display a price with 2 subtracted only when the price is at least ${cut}.`;
  }else if(id==='count'){
    param='minimum';procedure='countPassing';prefix=[set('scores',List(values,'list-values'),'list-create')];body=[set('count',L(0),'initialize'),foreach('score',V('scores','list-use'),[conditional(E('≥',V('score','condition-left'),V(param,'parameter-use'),'condition'),[set('count',E('+',V('count'),L(1)),'update')])]),ret(V('count','return-value'))];expected=x=>[values.filter(v=>v>=x).length];description='Count and display how many stored scores meet the supplied minimum. Process every score.';
  }else if(id==='sum'){
    param='bonus';arg=L(2,'argument');procedure='totalPrice';prefix=[set('prices',List(prices,'list-values'),'list-create')];body=[set('total',V(param,'parameter-use'),'initialize'),foreach('price',V('prices','list-use'),[set('total',E('+',V('total'),V('price','element-use')),'update')]),ret(V('total','return-value'))];expected=x=>[prices.reduce((a,b)=>a+b,0)+x];description='Add all stored prices and the supplied bonus, then display the total.';
  }else if(id==='search'){
    param='target';arg=L(names[1],'argument');procedure='containsName';prefix=[set('names',List(names,'list-values'),'list-create')];body=[set('found',L(false),'initialize'),foreach('name',V('names','list-use'),[conditional(E('=',V('name','condition-left'),V(param,'parameter-use'),'condition'),[set('found',L(true),'update')])]),ret(V('found','return-value'))];expected=x=>[names.includes(x)];description='Display whether the supplied target appears anywhere in names.';
  }else if(id==='repeat'){
    param='times';arg=L(n,'argument');procedure='cheer';body=[T(V(param,'parameter-use'),[D(L('Go!','message'),'output')],'loop')];expected=x=>Array(x).fill('Go!');description='Display Go! exactly as many times as the supplied argument specifies.';
  }else if(id==='until'){
    param='limit';arg=L(n,'argument');procedure='countUp';body=[set('position',L(1),'initialize'),U(E('>',V('position','condition-left'),V(param,'parameter-use'),'condition'),[D(V('position','output-value'),'output'),set('position',E('+',V('position'),L(1)),'update')],'loop')];expected=x=>Array.from({length:Math.max(0,x)},(_,i)=>i+1);description='Display the integers from 1 through the supplied limit, including the limit.';
  }else if(id==='access'){
    param='position';arg=L(2,'argument');procedure='readName';prefix=[set('names',List(names,'list-values'),'list-create')];body=[ret(E('INDEX',V('names','list-use'),V(param,'parameter-use'),'access'))];expected=x=>[names[x-1]];description='Display the list element at the supplied position. AP CSP lists start at index 1; positions 1–3 are accepted.';
  }else if(id==='append'){
    param='newName';arg=L('Dee','argument');procedure='addName';prefix=[set('names',List(names,'list-values'),'list-create')];body=[Op('APPEND',[V('names','list-use'),V(param,'parameter-use')],'append'),ret(E('LENGTH',V('names'),undefined,'length'))];expected=()=>[4];description='Add the supplied name to names and display the resulting list length.';
  }else if(id==='menu'){
    param='choice';arg=L(1,'argument');procedure='showMenu';body=[conditional(E('=',V(param,'parameter-use'),L(1,'boundary'),'condition'),[D(L('Play','message'),'output')],[D(L('Help','other-message'),'other-output')])];expected=x=>[x===1?'Play':'Help'];description='Display Play for choice 1; display Help for any other choice.';
  }else if(id==='range'){
    param='temperature';procedure='isComfortable';body=[ret(E('AND',E('≥',V(param,'parameter-use'),L(10),'lower'),E('≤',V(param,'second-use'),L(20),'upper'),'condition'))];expected=x=>[x>=10&&x<=20];description='Display TRUE exactly when temperature is between 10 and 20, including both endpoints.';
  }else if(id==='flag'){
    param='muted';arg=L(false,'argument');procedure='soundAllowed';body=[ret(E('NOT',V(param,'parameter-use'),undefined,'condition'))];expected=x=>[!x];description='Display TRUE when sound is not muted and FALSE when it is muted.';
  }else if(id==='robot'){
    param='steps';arg=L(n,'argument');procedure='moveRobot';body=[T(V(param,'parameter-use'),[Op('MOVE_FORWARD',[],'output')],'loop')];expected=x=>Array.from({length:x},()=>({action:'MOVE_FORWARD'}));description='Move the robot forward once for each supplied step. Movement is observable output.';
  }else if(id==='copy'){
    param='items';arg=List([1+(seed%7),2+(seed%3),3+(seed%5)],'argument');procedure='copyItems';body=[set('copied',List([]),'initialize'),foreach('item',V(param,'parameter-use'),[Op('APPEND',[V('copied','list-use'),V('item','element-use')],'append')]),ret(E('LENGTH',V('copied'),undefined,'length'))];expected=x=>[x.length];description='Copy every item into copied and display how many items were copied.';
  }else if(id==='average'){
    param='scores';arg=List(prices,'argument');procedure='meanScore';body=[set('total',L(0),'initialize'),foreach('score',V(param,'parameter-use'),[set('total',E('+',V('total'),V('score','element-use')),'update')]),ret(E('/',V('total','return-value'),E('LENGTH',V(param),undefined,'length'),'average'))];expected=x=>[x.reduce((a,b)=>a+b,0)/x.length];description='Display the average of all scores in a nonempty supplied list.';
  }else if(id==='input'){
    param='points';procedure='addPoint';body=[ret(E('+',V(param,'parameter-use'),L(1),'calculation'))];expected=x=>[x+1];description='Obtain a number from the user, add 1, and display the result.';
  }else if(id==='event'){
    param='message';arg=L('Ready','argument');procedure='announce';body=[D(V(param,'parameter-use'),'output')];expected=x=>[x];description='When the Start button is pressed once, display Ready. WHEN StartPressed is event notation for this example; it is not an AP reference-sheet command.';events=['StartPressed'];
  }else if(id==='remove'){
    param='position';arg=L(2,'argument');procedure='removeName';prefix=[set('names',List(names,'list-values'),'list-create')];body=[Op('REMOVE',[V('names','list-use'),V(param,'parameter-use')],'remove'),ret(E('LENGTH',V('names'),undefined,'length'))];expected=()=>[2];description='Remove the name at the supplied valid position and display the new length.';
  }else if(id==='maximum'){
    param='scores';arg=List([2+(seed%4),5+(seed%5),3+(seed%3)],'argument');procedure='highest';body=[set('best',L(0),'initialize'),foreach('score',V(param,'parameter-use'),[conditional(E('>',V('score','condition-left'),V('best','best-use'),'condition'),[set('best',V('score','element-use'),'update')])]),ret(V('best','return-value'))];expected=x=>[Math.max(...x)];description='Display the highest score in a nonempty list of positive scores.';
  }else if(id==='quiz'){
    param='answer';arg=L('blue','argument');procedure='checkAnswer';body=[conditional(E('=',V(param,'parameter-use'),L('blue','boundary'),'condition'),[R(L(1,'correct-value'),'return')],[R(L(0,'incorrect-value'),'other-return')])];expected=x=>[x==='blue'?1:0];description='Return and display 1 for answer blue; return 0 for every other answer.';
  }else throw Error('Unknown scenario '+id);
  const usesReturn=body.some(n=>n.k==='return'||n.k==='if'&&n.body.some(x=>x.k==='return'));
  const storedArg=clone(arg);delete storedArg.id;
  let argument=arg;
  if(id==='input'){
    prefix.push(A('response',In('input'),'input-statement'));argument=V('response','argument');
    if(form===1){prefix.push(A('saved',V('response'),'save-input'));argument=V('saved','argument');}
    if(form===2)argument=E('+',V('response'),L(0),'argument');
  }else if(form===1){prefix.push(A('supplied',clone(storedArg),'argument-source'));argument=V('supplied','argument');}
  else if(form===2){
    if(arg.k==='list'){
      prefix.push(A('supplied',List(arg.values.slice(0,-1)),'argument-source'),Op('APPEND',[V('supplied'),clone(arg.values.at(-1))],'argument-append'));argument=V('supplied','argument');
    }else if(typeof arg.value==='number')argument=E('+',L(arg.value-1),L(1),'argument');
    else{prefix.push(A('supplied',clone(storedArg),'argument-source'),A('saved',V('supplied'),'argument-copy'));argument=V('saved','argument');}
  }
  after=callTail(procedure,argument,usesReturn?'return':'display');
  if(id==='event')after=[Event('StartPressed',after,'event')];
  let program=[...prefix,P(procedure,[V(param,'parameter')],body),...after];
  // Assign every untagged node a stable source identity. Authored IDs take precedence.
  let index=0;walk(program,node=>{if(!node.id)node.id='node-'+index++;});
  const originalValue=arg.k==='list'?arg.values.map(x=>x.value):arg.value;
  const sample=id==='input'?cut:originalValue;
  const probes=[{inputs,events,expected:expected(sample)}];
  return {id,form,n,cut,param,procedure,program,description,probes,expected,originalValue,sample};
}
