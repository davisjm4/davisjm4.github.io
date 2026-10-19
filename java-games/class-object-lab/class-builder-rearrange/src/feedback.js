/* Student-facing feedback, hints and the post-solve explanation.
   Feedback never lists every error: it reports only the highest-priority unresolved issue. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./java-model.js'));
  else { root.CBR = root.CBR || {}; root.CBR.feedback = factory(root.CBR.javaModel); }
})(typeof self !== 'undefined' ? self : this, function (jm) {
  'use strict';

  var MESSAGES = {
    STRUCTURE: 'Some pieces are missing from the class. Reset the challenge to start over.',
    FIELD_SECTION: 'One or more instance-variable declarations are outside the Instance Variables section.',
    CTOR_SECTION: 'The constructor belongs in the Constructor section, and nothing else should be in that section.',
    METHOD_SECTION: 'Getters, setters and toString() belong in the Methods section. One or more are somewhere else.',
    CTOR_MISSING: "The constructor isn't initializing every field from its matching parameter.",
    CTOR_EXTRA: "The constructor contains a statement that doesn't belong there.",
    GETTER_WRONG_FIELD: 'One getter is returning information from a different field.',
    GETTER_ASSIGN: 'A getter only reports a value. It should not contain an assignment.',
    GETTER_EMPTY: 'A getter is missing its return statement.',
    GETTER_EXTRA: 'A getter contains a statement that does not belong in it.',
    SETTER_WRONG_FIELD: 'A setter needs to update the instance variable that matches its parameter.',
    SETTER_RETURN: 'A setter is void, so it should not contain a return statement.',
    SETTER_EMPTY: 'A setter is missing the assignment that updates its field.',
    SETTER_EXTRA: 'A setter contains a statement that does not belong in it.',
    TOSTRING_MISSING: 'The toString method needs its formatted return statement.',
    TOSTRING_EXTRA: 'The toString method contains a statement that does not belong in it.'
  };

  function methodName(block) {
    if (!block) return 'a method';
    if (block.kind === 'getter') return 'get' + jm.cap(block.field) + '()';
    if (block.kind === 'setter') return 'set' + jm.cap(block.field) + '(...)';
    if (block.kind === 'tostring') return 'toString()';
    if (block.kind === 'ctor') return 'the constructor';
    return 'a method';
  }

  /** Level 1: a nudge about the area. Level 2: names the specific piece to look at. */
  var HINT_AREA = {
    STRUCTURE: 'Reset and try again.',
    FIELD_SECTION: 'Look at Section 1. Instance variables are declared first, before any constructor or method.',
    CTOR_SECTION: 'Look at Section 2. It should hold the constructor and nothing else.',
    METHOD_SECTION: 'Look at Section 3. Every getter, setter and toString() lives there.',
    CTOR_MISSING: 'Count the fields. The constructor needs one assignment per field, and each assignment copies a parameter into its field.',
    CTOR_EXTRA: 'Read each statement in the constructor. Constructors assign values; they do not return anything.',
    GETTER_WRONG_FIELD: 'Compare each getter name with the field in its return statement. They should match.',
    GETTER_ASSIGN: 'Getters read a value. Look for an assignment (an equals sign) that ended up in a getter.',
    GETTER_EMPTY: 'Every getter needs a return statement for its own field.',
    GETTER_EXTRA: 'A getter should contain exactly one statement: its return.',
    SETTER_WRONG_FIELD: 'Compare each setter name with the field it assigns. They should match.',
    SETTER_RETURN: 'A setter has a void return type. Look for a return statement that landed in a setter.',
    SETTER_EMPTY: 'Every setter needs an assignment such as this.field = field;',
    SETTER_EXTRA: 'A setter should contain exactly one statement: its assignment.',
    TOSTRING_MISSING: 'The long return statement that builds labels and values belongs in toString().',
    TOSTRING_EXTRA: 'toString() should contain only its one formatted return statement.'
  };

  function messageFor(issue) { return MESSAGES[issue.code] || 'Something is still out of place.'; }

  function hintFor(issue, level, findBlock) {
    if (!issue) return 'Everything looks right. Press Check to confirm.';
    if (level <= 1) return HINT_AREA[issue.code] || 'Look for a piece that is in the wrong place.';
    var blk = issue.block && findBlock ? findBlock(issue.block) : null;
    switch (issue.code) {
      case 'FIELD_SECTION': return 'Find a "private ..." declaration that is not in Section 1 and move it up.';
      case 'CTOR_SECTION': return 'The block starting with "public ' + 'ClassName(" is the constructor. It goes in Section 2.';
      case 'METHOD_SECTION': return 'Find a method that starts with "public" and has get, set or toString in its name, and move it into Section 3.';
      case 'CTOR_MISSING': return 'One of the "this.x = x;" statements the constructor needs is sitting in another method.';
      case 'CTOR_EXTRA': return 'Move the statement that does not start with "this." out of the constructor.';
      default:
        return 'Check ' + methodName(blk) + '. ' + (HINT_AREA[issue.code] || '');
    }
  }

  /** What the student learns from the finished class (shown after solving or revealing). */
  function explanation(challenge) {
    var m = challenge.model, f0 = m.fields[0], f1 = m.fields[1] || null;
    var pts = [];
    pts.push('Section 1 holds the instance variables. They are private, so the data is only reachable through the methods below.');
    pts.push('Section 2 holds the constructor. Its parameters use the same names as the fields, so each assignment looks like this.' + f0.name + ' = ' + f0.name + '; The left side (this.' + f0.name + ') is the field. The right side (' + f0.name + ') is the parameter.');
    pts.push('Section 3 holds the methods. A getter returns its own field (return this.' + f0.name + ';), and its return type matches the field type (' + f0.type + ' for ' + f0.name + '). Setters are void and assign the new value to the field.');
    var lbl = '"' + f0.name + ': " + this.' + f0.name;
    pts.push('toString() builds one String. Each field gets a label and a colon-space (' + lbl + '), + joins the label to the value, and \\n starts a new line between fields' + (f1 ? ' (here, before "' + f1.name + ': ").' : '.'));
    return pts;
  }

  return { messageFor: messageFor, hintFor: hintFor, explanation: explanation, methodName: methodName, MESSAGES: MESSAGES };
});
