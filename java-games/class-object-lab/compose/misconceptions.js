/* Catalogue of modelled Java misconceptions. Each entry is either
 *   - a simulator flag (sim.js changes exactly one semantic rule), or
 *   - a program transformation / alternative reading supplied by a family, or
 *   - a counting/default model used by a specific query type.
 * `why` is the student-facing "About your choice" text shown after a scored submission. */
export const MIS = {
  // reference semantics
  aliasCopies: { label: "Treats an alias as a separate copy", why: "This answer treats a reference assignment such as b = a as if it copied the object. Assigning a reference copies only the reference value, so both variables refer to the same object." },
  reassignMutates: { label: "Thinks reassignment changes the old object", why: "This answer assumes that assigning a new object to a variable overwrites the object it referred to before. Reassignment only changes which object that one variable refers to; other references to the old object are unaffected." },
  nullPropagates: { label: "Thinks null spreads to aliases", why: "This answer assumes that setting one variable to null also clears the other variables that referred to the same object. Only the assigned variable changes." },
  equalArgsAlias: { label: "Thinks equal state means the same object", why: "This answer treats objects constructed with equal values as one shared object. Each new expression creates a separate object, even when the arguments are the same." },
  identityAsContent: { label: "Thinks == compares field values", why: "This answer treats == on object references as comparing the objects' fields. For references, == is true only when both refer to the very same object (or both are null)." },
  instanceAsStatic: { label: "Thinks all objects share an instance field", why: "This answer treats an instance field as if every object shared one value. Each object stores its own copy of an instance field." },
  staticAsInstance: { label: "Thinks each object has its own static field", why: "This answer treats a static field as if every object had its own copy. A static field belongs to the class, so there is exactly one shared value." },
  // parameters and returns
  paramDeepCopy: { label: "Thinks the method gets a copy of the object", why: "This answer assumes the method receives a copy of the object. It receives a copy of the reference, so changing fields through the parameter changes the caller's object." },
  paramByRef: { label: "Thinks Java passes by reference", why: "This answer assumes that reassigning the parameter also changes the caller's variable. Java passes arguments by value: the parameter holds a copy of the reference, and reassigning that copy does not affect the caller." },
  primByRef: { label: "Thinks a primitive parameter is linked to the argument", why: "This answer assumes that changing a primitive parameter changes the caller's variable. The parameter holds a copy of the value, so the caller's variable is unchanged." },
  returnCopies: { label: "Thinks a returned reference is a copy", why: "This answer assumes the method returns a copy of the object. Returning a reference returns the same reference value, so the result refers to the same object." },
  returnThisCopies: { label: "Thinks return this makes a new object", why: "This answer assumes return this returns a new copy. this is the reference to the current object, so the call returns the same object." },
  // constructors, defaults, this
  forgetCtor: { label: "Ignores the constructor body", why: "This answer skips the constructor body. The constructor runs as part of every new expression and sets up the object's initial state." },
  initializerAfterCtor: { label: "Runs field initializers after the constructor", why: "This answer assumes field initializers run after the constructor body. Java runs the field initializers first and then the constructor body." },
  skipChain: { label: "Ignores the this(...) constructor call", why: "This answer ignores the this(...) call. It runs the other constructor first, before the rest of this constructor's body." },
  chainAfterBody: { label: "Runs the chained constructor last", why: "This answer runs the this(...) constructor after the remaining statements. A this(...) call must be first and runs before the rest of the body." },
  shadowAssignsField: { label: "Thinks an unqualified name means the field", why: "This answer treats the unqualified name as the field. When a parameter or local variable has the same name, the plain name refers to that variable; only this.name refers to the field." },
  thisMeansParam: { label: "Thinks this.name means the parameter", why: "This answer treats this.name as the parameter. this.name always selects the field of the current object." },
  thisIsArgument: { label: "Mixes up this and the argument", why: "This answer swaps the roles of the receiver and the argument. Inside the method, this is the object the method was called on; the parameter is the other object." },
  defaultsNull: { label: "Thinks every field defaults to null", why: "This answer assumes every field starts as null. Only reference fields default to null; int and double fields default to 0 and 0.0, and boolean fields default to false." },
  boolDefaultTrue: { label: "Thinks boolean fields default to true", why: "This answer assumes a boolean field starts as true. An uninitialised boolean instance field defaults to false." },
  stringDefaultEmpty: { label: "Thinks String fields default to empty text", why: "This answer assumes a String field starts as the empty string. A String field is a reference, so it defaults to null." },
  doubleDefaultInt: { label: "Writes a double default like an int", why: "This answer prints a double default as 0. A double field defaults to 0.0, and println shows it with a decimal point." },
  fieldNeedsInit: { label: "Thinks fields must be initialised like locals", why: "This answer assumes an uninitialised field causes a compile-time error. Instance fields always receive default values; only local variables must be assigned before use." },
  localDefaults: { label: "Thinks local variables get default values", why: "This answer assumes a local variable starts with a default value. Local variables have no default; reading one before assigning it is a compile-time error." },
  // state updates
  ignoreGuards: { label: "Ignores the method's condition", why: "This answer ignores the if condition inside the method. The update happens only when the condition is true for the argument passed." },
  compoundAsReplace: { label: "Treats += as replacement", why: "This answer treats += (or -=) as plain assignment. A compound assignment combines the new value with the current field value." },
  setAdds: { label: "Thinks a setter adds to the old value", why: "This answer treats the setter as adding to the current value. The setter's assignment replaces the old value." },
  ignoreClamp: { label: "Ignores the Math.min/Math.max limit", why: "This answer ignores the Math.min or Math.max call that limits the stored value." },
  onlyLastUpdate: { label: "Keeps only the last update", why: "This answer loses track of earlier updates and keeps only the effect of the last call. Each call starts from the state left by the previous one." },
  lostUpdate: { label: "Misses one of the updates", why: "This answer skips one of the statements that changes the object. Every call in the sequence runs and affects the state." },
  wrongReceiver: { label: "Applies a call to the wrong object", why: "This answer applies one call to a different object than the one it was called on. A method call changes only the object referenced before the dot." },
  orderSwap: { label: "Runs statements in the wrong order", why: "This answer applies two statements in the opposite order. Statements run top to bottom, and the order changes the result here." },
  boundary: { label: "Misreads the boundary of the condition", why: "This answer misreads the comparison at its boundary (for example treating >= as >). Check whether the exact boundary value passes the condition." },
  accessorStores: { label: "Thinks the accessor stores its result", why: "This answer assumes calling the accessor changes the stored field. The method only computes and returns a value; the field is unchanged." },
  localCopyLinked: { label: "Thinks a local copy is linked to the field", why: "This answer assumes changing a local int that was copied from a getter also changes the field. The local variable holds an independent copy of the value." },
  argOrder: { label: "Mixes up the constructor argument order", why: "This answer matches the arguments to the wrong parameters. Arguments are matched to parameters by position." },
  // toString / printing
  toStringAtCreation: { label: "Thinks toString shows the original state", why: "This answer reports the object's state from when it was created. toString runs when the object is printed, so it reflects the current field values." },
  concatGrouping: { label: "Adds numbers that are being concatenated", why: "This answer adds the numbers before joining the text. The + operators evaluate left to right; once a String is involved, + joins text." },
  noOverride: { label: "Ignores the toString override", why: "This answer ignores the class's toString method. When an object is printed or concatenated, its overridden toString is called." },
  printsVarName: { label: "Thinks the variable name is printed", why: "This answer prints the variable's name. Printing an object calls its toString method on the object the variable refers to." },
  nullPrintThrows: { label: "Thinks printing a null reference throws", why: "This answer expects an exception. Printing or concatenating a null reference produces the text null; only calling a method on null throws a NullPointerException." },
  nullCallPrintsNull: { label: "Thinks calling a method on null prints null", why: "This answer expects the text null. Calling a method through a null reference throws a NullPointerException." },
  hashIsField: { label: "Thinks the default toString shows the fields", why: "This answer assumes Object's toString shows field values. Without an override, the output is the class name, @, and a hexadecimal hash code that is not predictable." },
  // counting objects
  variablesAreObjects: { label: "Counts variables as objects", why: "This answer counts reference variables. Declaring a variable does not create an object; only new (directly or inside a method) creates one." },
  aliasCreates: { label: "Thinks copying a reference creates an object", why: "This answer counts reference copies as new objects. Assigning or returning an existing reference does not create an object." },
  ignoresTemporaries: { label: "Ignores objects that are not stored", why: "This answer ignores objects that were never stored in a variable (or created inside a method). Every new expression that runs creates an object." },
  createdVsReachable: { label: "Confuses created with still referenced", why: "This answer counts the wrong thing: objects created during the run versus objects that a variable still refers to at the end. Reassignment does not uncreate an object, but it can leave an object with no references." },
  reassignDeletes: { label: "Thinks reassignment deletes the object", why: "This answer assumes the object a variable referred to disappears from the count when the variable is reassigned." },
  // compile errors
  privateAccess: { label: "Accesses a private member from outside", why: "A private member is accessible only inside its own class, so this does not compile from main." },
  staticContext: { label: "Calls an instance member through the class", why: "An instance method or field needs an object; it cannot be used through the class name or from a static method without a receiver." },
  missingParens: { label: "Leaves off the method call parentheses", why: "A method call needs parentheses, even with no arguments; without them the compiler looks for a field with that name." },
  wrongCallForm: { label: "Passes the object as an argument instead of calling on it", why: "An instance method is called on an object with dot notation (obj.method()), not by passing the object as an argument." },
  undeclared: { label: "Uses a name that is not declared", why: "The name is not declared in this scope, so this does not compile." },
  // reverse reasoning
  copyNotAlias: { label: "Makes a copy instead of an alias", why: "This creates a separate object with the same value. Later changes through one variable will not show through the other, so it is not the same object." },
  aliasNotCopy: { label: "Makes an alias instead of a copy", why: "This copies the reference, so both variables refer to one object. A change through either variable would affect both." },
  wrongTarget: { label: "Updates the wrong variable or object", why: "This changes a different object or variable from the one the goal describes." },
  rejectedValue: { label: "Uses a value the method rejects", why: "This call passes a value that fails the method's condition, so the field is not changed." },
  addVsSet: { label: "Mixes up adding and setting", why: "This uses the amount as if the method replaced the value (or as if it added to it). Check what the method does with its argument." },
  inverseWrong: { label: "Undoes the constructor's computation incorrectly", why: "This argument does not produce the target after the constructor's computation runs on it." },
};
MIS.valuesAsIdentity = { label: "Thinks comparing values compares objects", why: "This answer treats a comparison of two int values (from getters) as an object-identity test. Comparing the returned int values with == is true whenever the numbers are equal, even for different objects." };
MIS.allSameObject = { label: "Treats every variable as the same object", why: "This answer assumes all the variables end up referring to one object. Only reference copies share an object; each new creates a different one." };
MIS.countsSelf = { label: "Counts the variable itself", why: "This answer includes the variable named in the question. The question asks how many other variables refer to its object." };
MIS.nullIsObject = { label: "Thinks null is an empty object", why: "This answer treats a variable set to null as holding an (empty) object. null means the variable refers to no object at all." };
MIS.aliasFollowsVariable = { label: "Thinks a variable stays linked to another variable", why: "This answer assumes the variable keeps following the variable it was copied from. The assignment copied the reference at that moment; later reassigning the other variable does not change this one." };
MIS.latestObject = { label: "Assumes the newest object", why: "This answer picks the most recently created object. A variable refers to whichever object was last assigned to it, not to the newest object." };
MIS.runtimeVsCompile = { label: "Confuses a runtime exception with a compile error", why: "This statement compiles: the compiler only checks types, and the getter's return type is String. It fails only when it runs, because the value is null (a NullPointerException at run time)." };
MIS.ignoresComputation = { label: "Ignores the computation in the method", why: "This answer uses the stored (or passed) value unchanged. The constructor or accessor computes a new value from it before storing or returning it." };
MIS.invertedCondition = { label: "Reverses the boolean condition", why: "This answer reverses the result of the comparison. Evaluate the condition with the current field value to see whether it is true." };
MIS.selfAssignError = { label: "Thinks x = x; does not compile", why: "Assigning a variable to itself is legal Java. Here it assigns the parameter to itself, which compiles but leaves the field unchanged." };
MIS.fieldsOnly = { label: "Thinks only the field values are printed", why: "This answer prints just the field values. Printing the object calls its toString method, which builds the exact text shown in the method, including any labels." };
MIS.aliasDirection = { label: "Assigns in the wrong direction", why: "This assignment changes the variable on the left. a = c makes a refer to c's object; it does not make c refer to a's object." };
MIS.ctorOnce = { label: "Thinks the constructor runs only once for the class", why: "This answer runs the constructor only for the first object. The constructor runs every time new creates an object, setting up that object's own fields." };
MIS.assignedLater = { label: "Thinks a local declared without a value can never be read", why: "This compiles: the local variable is assigned before this statement on every path, so it is definitely assigned when it is read." };
MIS.firstObject = { label: "Assumes the first object created", why: "This answer picks the first object that was created. A variable refers to whichever object was most recently assigned to it." };
MIS.wrongArity = { label: "Calls a constructor that does not exist", why: "No constructor of this class takes two int arguments, so this statement does not compile. The arguments must match one of the declared constructors' parameter lists." };
