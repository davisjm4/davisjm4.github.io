import * as E from '../engine.js';
import {COMBINATIONS} from '../lessons.js';
export function solution(n=10,combined=false){const p=E.blank(),dance=E.procedure('dance');dance.body=['moveIn','moveOut','moveIn'].map(op=>E.move(op,'$part','$side'));p.procedures=[dance];if(combined)dance.body.push(E.move('shake','$part','$side'),E.move('turnAround'));else{const helper=E.procedure('hokey_pokey',[]);helper.body=[E.move('shake','ACTIVE','ACTIVE'),E.move('turnAround')];p.procedures.push(helper);}
 for(const {part,side} of COMBINATIONS.slice(0,n)){p.body.push(E.call('dance',[part,side]));if(!combined)p.body.push(E.call('hokey_pokey',[]));}return p;}
