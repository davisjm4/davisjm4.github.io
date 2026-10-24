# Reviewable instructional samples

Generated from every family. Each family has three structurally different call/data-flow configurations in review-corpus.json.

## What’s Missing?

### Procedures

#### missing-definition-absent

Display the name supplied to greet. A return value is not needed. The intended argument for this task is "Emery".



Which component is missing, incorrect, or ineffective for the stated task?

```text
greet("Emery")
```

Answer: The called student-developed procedure has no definition.

A procedure definition supplies the instructions that a procedure call executes.

#### missing-call-absent

Display the name supplied to greet. A return value is not needed. The intended argument for this task is "Emery".



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE greet(name)
{
  DISPLAY(name)
}
```

Answer: The procedure is defined but never called.

Defining a procedure does not execute its body; a call invokes it.

#### missing-body-empty

Display the name supplied to greet. A return value is not needed. The intended argument for this task is "Emery".



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE greet(name)
{
}
greet("Emery")
```

Answer: The procedure body contains no instructions to perform its task.

The procedure name and parameter alone cannot display the supplied name.

#### missing-return-absent

Return and display a price with 2 subtracted only when the price is at least 14. The intended argument for this task is 14.



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE salePrice(price)
{
  cost ← price
  IF (price ≥ 14)
  {
    cost ← price - 2
  }
}
result ← salePrice(14)
DISPLAY(result)
```

Answer: The procedure does not return the calculated value to its caller.

This caller stores a return value. A procedure need not always return, but this task requires one.

#### missing-display-instead-of-return

Return and display a price with 2 subtracted only when the price is at least 14. The intended argument for this task is 14.



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE salePrice(price)
{
  cost ← price
  IF (price ≥ 14)
  {
    cost ← price - 2
  }
  DISPLAY(cost)
}
result ← salePrice(14)
DISPLAY(result)
```

Answer: The procedure displays a value instead of returning it to the assignment.

DISPLAY produces output; RETURN supplies a value to the caller. They have different roles.

#### missing-wrong-return-variable

Count and display how many stored scores meet the supplied minimum. Process every score. The intended argument for this task is 14.



Which component is missing, incorrect, or ineffective for the stated task?

```text
scores ← [12, 14, 17]
PROCEDURE countPassing(minimum)
{
  count ← 0
  FOR EACH score IN scores
  {
    IF (score ≥ minimum)
    {
      count ← count + 1
    }
  }
  RETURN(minimum)
}
result ← countPassing(14)
DISPLAY(result)
```

Answer: The procedure returns the minimum instead of the count.

A RETURN statement must return the result the caller needs.

#### missing-premature-return

Display whether the supplied target appears anywhere in names. The intended argument for this task is "Finley".



Which component is missing, incorrect, or ineffective for the stated task?

```text
names ← ["Emery", "Finley", "Gray"]
PROCEDURE containsName(target)
{
  found ← FALSE
  RETURN(found)
  FOR EACH name IN names
  {
    IF (name = target)
    {
      found ← TRUE
    }
  }
  RETURN(found)
}
result ← containsName("Finley")
DISPLAY(result)
```

Answer: The procedure returns before searching the list.

RETURN ends this procedure call; instructions after it are not reached.

#### missing-call-result-discarded

Return and display a price with 2 subtracted only when the price is at least 14. The intended argument for this task is 14.



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE salePrice(price)
{
  cost ← price
  IF (price ≥ 14)
  {
    cost ← price - 2
  }
  RETURN(cost)
}
salePrice(14)
DISPLAY(result)
```

Answer: The caller discards the procedure’s returned value.

A returned value is available to the calling code, but it must be used or stored for this output.

#### missing-wrong-return-calculation

Display the average of all scores in a nonempty supplied list. The intended argument for this task is [3,6,10].



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE meanScore(scores)
{
  total ← 0
  FOR EACH score IN scores
  {
    total ← total + score
  }
  RETURN(total)
}
result ← meanScore([3, 6, 10])
DISPLAY(result)
```

Answer: The procedure returns the sum instead of the requested average.

The final calculation must divide the total by the number of scores.

#### missing-required-parameter-missing

Display Go! exactly as many times as the supplied argument specifies. The intended argument for this task is 5.



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE cheer()
{
  REPEAT times TIMES
  {
    DISPLAY("Go!")
  }
}
cheer(5)
```

Answer: The definition omits the parameter required by the call.

An explicit parameter is declared in the procedure header and receives its corresponding argument.

### Parameters and Arguments

#### missing-parameter-unused

Display the name supplied to greet. A return value is not needed. The intended argument for this task is "Emery".

The supplied name must affect the output; check all accepted names, not just this call.

Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE greet(name)
{
  DISPLAY("Emery")
}
greet("Emery")
```

Answer: The declared parameter is unused; the displayed name is hard-coded.

A parameter must affect procedure functionality for the selected PPR procedure.

#### missing-parameter-overwritten

Add all stored prices and the supplied bonus, then display the total. The intended argument for this task is 2.



Which component is missing, incorrect, or ineffective for the stated task?

```text
prices ← [3, 6, 10]
PROCEDURE totalPrice(bonus)
{
  bonus ← 0
  total ← bonus
  FOR EACH price IN prices
  {
    total ← total + price
  }
  RETURN(total)
}
result ← totalPrice(2)
DISPLAY(result)
```

Answer: The parameter is overwritten before its value can affect the total.

Replacing an incoming parameter value before using it discards the caller’s argument.

#### missing-constant-in-condition

Count and display how many stored scores meet the supplied minimum. Process every score. The intended argument for this task is 14.



Which component is missing, incorrect, or ineffective for the stated task?

```text
scores ← [12, 14, 17]
PROCEDURE countPassing(minimum)
{
  count ← 0
  FOR EACH score IN scores
  {
    IF (score ≥ 14)
    {
      count ← count + 1
    }
  }
  RETURN(count)
}
result ← countPassing(14)
DISPLAY(result)
```

Answer: The decision uses a fixed threshold instead of the parameter.

Using the minimum parameter in the Boolean expression lets the caller control which scores qualify.

#### missing-constant-repeat-count

Display Go! exactly as many times as the supplied argument specifies. The intended argument for this task is 5.



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE cheer(times)
{
  REPEAT 1 TIMES
  {
    DISPLAY("Go!")
  }
}
cheer(5)
```

Answer: The loop uses a fixed count instead of the supplied parameter.

The times parameter should determine how many repetitions occur.

#### missing-wrong-literal-argument

Display the name supplied to greet. A return value is not needed. The intended argument for this task is "Emery".



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE greet(name)
{
  DISPLAY(name)
}
greet("Wrong name")
```

Answer: The call supplies the wrong name as its argument.

The argument is the value supplied at the call; the definition’s parameter receives it.

#### missing-argument-omitted

Display Go! exactly as many times as the supplied argument specifies. The intended argument for this task is 5.



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE cheer(times)
{
  REPEAT times TIMES
  {
    DISPLAY("Go!")
  }
}
cheer()
```

Answer: The procedure call omits its required argument.

This procedure has one parameter, so its call must supply one corresponding argument.

#### missing-extra-argument

Display the name supplied to greet. A return value is not needed. The intended argument for this task is "Emery".



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE greet(name)
{
  DISPLAY(name)
}
greet("Ari", "Bo")
```

Answer: The call supplies more arguments than the definition accepts.

This definition declares one parameter, so these two arguments do not match its header.

#### missing-wrong-expression-argument

Return and display a price with 2 subtracted only when the price is at least 14. The intended argument for this task is 14.



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE salePrice(price)
{
  cost ← price
  IF (price ≥ 14)
  {
    cost ← price - 2
  }
  RETURN(cost)
}
result ← salePrice(14 + 5)
DISPLAY(result)
```

Answer: The argument expression changes the intended price before the call.

An expression can be an argument; its evaluated value is passed to the parameter.

#### missing-wrong-collection-argument

Copy every item into copied and display how many items were copied. The intended argument for this task is [2,4,7].



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE copyItems(items)
{
  copied ← []
  FOR EACH item IN items
  {
    APPEND(copied, item)
  }
  RETURN(LENGTH(copied))
}
result ← copyItems([1])
DISPLAY(result)
```

Answer: The call supplies only one item instead of the intended collection.

A list can be supplied as an argument. The procedure processes the list it actually receives.

### Selection and Boolean Logic

#### missing-selection-missing

Return and display a price with 2 subtracted only when the price is at least 14. The intended argument for this task is 14.



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE salePrice(price)
{
  cost ← price
  cost ← price - 2
  RETURN(cost)
}
result ← salePrice(14)
DISPLAY(result)
```

Answer: The price reduction executes unconditionally; selection is missing.

An IF statement implements selection by deciding whether its body executes.

#### missing-inclusive-boundary

Return and display a price with 2 subtracted only when the price is at least 14. The intended argument for this task is 14.



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE salePrice(price)
{
  cost ← price
  IF (price > 14)
  {
    cost ← price - 2
  }
  RETURN(cost)
}
result ← salePrice(14)
DISPLAY(result)
```

Answer: The Boolean condition excludes the boundary price.

At least includes equality, so the condition must use ≥.

#### missing-wrong-variable-test

Count and display how many stored scores meet the supplied minimum. Process every score. The intended argument for this task is 14.



Which component is missing, incorrect, or ineffective for the stated task?

```text
scores ← [12, 14, 17]
PROCEDURE countPassing(minimum)
{
  count ← 0
  FOR EACH score IN scores
  {
    IF (count ≥ minimum)
    {
      count ← count + 1
    }
  }
  RETURN(count)
}
result ← countPassing(14)
DISPLAY(result)
```

Answer: The IF condition tests the count instead of the current score.

Selection must evaluate the value relevant to the intended decision.

#### missing-reversed-comparison

Count and display how many stored scores meet the supplied minimum. Process every score. The intended argument for this task is 14.



Which component is missing, incorrect, or ineffective for the stated task?

```text
scores ← [12, 14, 17]
PROCEDURE countPassing(minimum)
{
  count ← 0
  FOR EACH score IN scores
  {
    IF (score < minimum)
    {
      count ← count + 1
    }
  }
  RETURN(count)
}
result ← countPassing(14)
DISPLAY(result)
```

Answer: The comparison counts scores below the minimum.

Selection should count scores meeting or exceeding the minimum.

#### missing-else-missing

Display Play for choice 1; display Help for any other choice. The intended argument for this task is 1.



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE showMenu(choice)
{
  IF (choice = 1)
  {
    DISPLAY("Play")
  }
}
showMenu(1)
```

Answer: The conditional has no output for choices other than 1.

An ELSE branch handles the alternative when this IF condition is false.

#### missing-branches-reversed

Display Play for choice 1; display Help for any other choice. The intended argument for this task is 1.



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE showMenu(choice)
{
  IF (choice = 1)
  {
    DISPLAY("Help")
  }
  ELSE
  {
    DISPLAY("Play")
  }
}
showMenu(1)
```

Answer: The conditional’s two branch actions are reversed.

The true branch should display Play and the false branch should display Help.

#### missing-and-versus-or

Display TRUE exactly when temperature is between 10 and 20, including both endpoints. The intended argument for this task is 14.



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE isComfortable(temperature)
{
  RETURN((temperature ≥ 10 OR temperature ≤ 20))
}
result ← isComfortable(14)
DISPLAY(result)
```

Answer: The range test uses OR where both bounds must hold.

AND requires both comparisons to be true; OR accepts values satisfying just one.

#### missing-not-missing

Display TRUE when sound is not muted and FALSE when it is muted. The intended argument for this task is false.



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE soundAllowed(muted)
{
  RETURN(muted)
}
result ← soundAllowed(FALSE)
DISPLAY(result)
```

Answer: The Boolean expression omits the needed NOT.

NOT reverses the Boolean value: sound is allowed when muted is FALSE.

#### missing-upper-bound-wrong

Display TRUE exactly when temperature is between 10 and 20, including both endpoints. The intended argument for this task is 14.



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE isComfortable(temperature)
{
  RETURN((temperature ≥ 10 AND temperature ≤ 30))
}
result ← isComfortable(14)
DISPLAY(result)
```

Answer: The upper-bound condition accepts temperatures above 20.

The condition must implement the stated range, including its correct endpoints.

#### missing-wrong-equality-value

Return and display 1 for answer blue; return 0 for every other answer. The intended argument for this task is "blue".



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE checkAnswer(answer)
{
  IF (answer = "red")
  {
    RETURN(1)
  }
  ELSE
  {
    RETURN(0)
  }
}
result ← checkAnswer("blue")
DISPLAY(result)
```

Answer: The selection compares the answer with the wrong expected value.

The IF statement must test for blue to implement this quiz’s intended decision.

### Iteration

#### missing-loop-missing

Display Go! exactly as many times as the supplied argument specifies. The intended argument for this task is 5.



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE cheer(times)
{
  DISPLAY("Go!")
}
cheer(5)
```

Answer: The message is displayed once because the loop is missing.

Iteration repeats instructions; a single DISPLAY statement does not.

#### missing-first-element-only

Add all stored prices and the supplied bonus, then display the total. The intended argument for this task is 2.



Which component is missing, incorrect, or ineffective for the stated task?

```text
prices ← [3, 6, 10]
PROCEDURE totalPrice(bonus)
{
  total ← bonus
  total ← total + prices[1]
  RETURN(total)
}
result ← totalPrice(2)
DISPLAY(result)
```

Answer: Only the first price is processed instead of the full list.

A traversal processes each element; accessing just prices[1] is not a traversal.

#### missing-until-stops-early

Display the integers from 1 through the supplied limit, including the limit. The intended argument for this task is 5.



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE countUp(limit)
{
  position ← 1
  REPEAT UNTIL (position ≥ limit)
  {
    DISPLAY(position)
    position ← position + 1
  }
}
countUp(5)
```

Answer: The stopping condition ends the loop before displaying the limit.

REPEAT UNTIL stops when its condition becomes true; > includes the limit in this count.

#### missing-counter-no-progress

Display the integers from 1 through the supplied limit, including the limit. The intended argument for this task is 5.



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE countUp(limit)
{
  position ← 1
  REPEAT UNTIL (position > limit)
  {
    DISPLAY(position)
  }
}
countUp(5)
```

Answer: The loop counter never changes, so the loop cannot reach its stopping condition.

This loop needs a state change that eventually makes the stopping condition true.

#### missing-counter-wrong-direction

Display the integers from 1 through the supplied limit, including the limit. The intended argument for this task is 5.



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE countUp(limit)
{
  position ← 1
  REPEAT UNTIL (position > limit)
  {
    DISPLAY(position)
    position ← position - 1
  }
}
countUp(5)
```

Answer: The counter moves away from the stopping value.

The counter should increase toward the supplied positive limit.

#### missing-repeat-one-too-few

Display Go! exactly as many times as the supplied argument specifies. The intended argument for this task is 5.



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE cheer(times)
{
  REPEAT times - 1 TIMES
  {
    DISPLAY("Go!")
  }
}
cheer(5)
```

Answer: The repeat count is one less than the supplied number.

The loop should use the times parameter as its repetition count.

#### missing-reset-inside-loop

Add all stored prices and the supplied bonus, then display the total. The intended argument for this task is 2.



Which component is missing, incorrect, or ineffective for the stated task?

```text
prices ← [3, 6, 10]
PROCEDURE totalPrice(bonus)
{
  total ← bonus
  FOR EACH price IN prices
  {
    total ← bonus
    total ← total + price
  }
  RETURN(total)
}
result ← totalPrice(2)
DISPLAY(result)
```

Answer: The accumulator is reset during every iteration.

Initialize the total before iteration so each price contributes to the accumulated result.

#### missing-return-inside-loop

Display the average of all scores in a nonempty supplied list. The intended argument for this task is [3,6,10].



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE meanScore(scores)
{
  total ← 0
  FOR EACH score IN scores
  {
    total ← total + score
    RETURN(total / LENGTH(scores))
  }
  RETURN(total / LENGTH(scores))
}
result ← meanScore([3, 6, 10])
DISPLAY(result)
```

Answer: The return inside the loop ends traversal after the first score.

Complete the traversal before returning the average.

#### missing-wrong-traversal-source

Add all stored prices and the supplied bonus, then display the total. The intended argument for this task is 2.



Which component is missing, incorrect, or ineffective for the stated task?

```text
prices ← [3, 6, 10]
PROCEDURE totalPrice(bonus)
{
  total ← bonus
  FOR EACH price IN [2]
  {
    total ← total + price
  }
  RETURN(total)
}
result ← totalPrice(2)
DISPLAY(result)
```

Answer: The loop traverses a replacement list instead of prices.

FOR EACH must traverse the collection named in the intended behavior.

### Lists and Data

#### missing-list-storage-absent

Display whether the supplied target appears anywhere in names. The intended argument for this task is "Finley".



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE containsName(target)
{
  found ← FALSE
  FOR EACH name IN names
  {
    IF (name = target)
    {
      found ← TRUE
    }
  }
  RETURN(found)
}
result ← containsName("Finley")
DISPLAY(result)
```

Answer: The list is used without first storing its data.

PPR list evidence includes both storage and use of the same list.

#### missing-declared-list-unused

Add all stored prices and the supplied bonus, then display the total. The intended argument for this task is 2.

Evaluate whether the stored prices list itself is used, rather than a separate collection.

Which component is missing, incorrect, or ineffective for the stated task?

```text
prices ← [3, 6, 10]
PROCEDURE totalPrice(bonus)
{
  total ← bonus
  FOR EACH price IN [2, 4, 6]
  {
    total ← total + price
  }
  RETURN(total)
}
result ← totalPrice(2)
DISPLAY(result)
```

Answer: The stored prices list is never used; the loop uses a separate literal collection.

List evidence must show the same stored list being used.

#### missing-zero-index

Display the list element at the supplied position. AP CSP lists start at index 1; positions 1–3 are accepted. The intended argument for this task is 2.



Which component is missing, incorrect, or ineffective for the stated task?

```text
names ← ["Emery", "Finley", "Gray"]
PROCEDURE readName(position)
{
  RETURN(names[0])
}
result ← readName(2)
DISPLAY(result)
```

Answer: The list access uses index 0, which is invalid in AP CSP.

AP CSP list indexing starts at 1.

#### missing-index-too-large

Display the list element at the supplied position. AP CSP lists start at index 1; positions 1–3 are accepted. The intended argument for this task is 2.



Which component is missing, incorrect, or ineffective for the stated task?

```text
names ← ["Emery", "Finley", "Gray"]
PROCEDURE readName(position)
{
  RETURN(names[4])
}
result ← readName(2)
DISPLAY(result)
```

Answer: The list access is beyond the last valid index.

A valid list index is at least 1 and at most LENGTH(list).

#### missing-index-shifted

Display the list element at the supplied position. AP CSP lists start at index 1; positions 1–3 are accepted. The intended argument for this task is 2.



Which component is missing, incorrect, or ineffective for the stated task?

```text
names ← ["Emery", "Finley", "Gray"]
PROCEDURE readName(position)
{
  RETURN(names[position + 1])
}
result ← readName(2)
DISPLAY(result)
```

Answer: The list access shifts the supplied position by 1.

The parameter already contains the intended AP CSP index.

#### missing-append-absent

Add the supplied name to names and display the resulting list length. The intended argument for this task is "Dee".



Which component is missing, incorrect, or ineffective for the stated task?

```text
names ← ["Emery", "Finley", "Gray"]
PROCEDURE addName(newName)
{
  RETURN(LENGTH(names))
}
result ← addName("Dee")
DISPLAY(result)
```

Answer: The new name is never stored in the list.

APPEND stores a new element at the end of the list.

#### missing-append-wrong-value

Add the supplied name to names and display the resulting list length. The intended argument for this task is "Dee".



Which component is missing, incorrect, or ineffective for the stated task?

```text
names ← ["Emery", "Finley", "Gray"]
PROCEDURE addName(newName)
{
  APPEND(names, "Other name")
  RETURN(LENGTH(names))
}
result ← addName("Dee")
DISPLAY(result)
```

Answer: The list stores a fixed name instead of the supplied name.

The second APPEND argument is the element added to the collection.

#### missing-remove-wrong-position

Remove the name at the supplied valid position and display the new length. The intended argument for this task is 2.



Which component is missing, incorrect, or ineffective for the stated task?

```text
names ← ["Emery", "Finley", "Gray"]
PROCEDURE removeName(position)
{
  REMOVE(names, 1)
  RETURN(LENGTH(names))
}
result ← removeName(2)
DISPLAY(result)
```

Answer: The program removes the first element instead of the supplied position.

REMOVE needs the intended list index, not a fixed position.

#### missing-count-versus-sum

Copy every item into copied and display how many items were copied. The intended argument for this task is [2,4,7].



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE copyItems(items)
{
  copied ← []
  FOR EACH item IN items
  {
    APPEND(copied, 0)
  }
  RETURN(LENGTH(copied))
}
result ← copyItems([2, 4, 7])
DISPLAY(result)
```

Answer: The copied list stores zeros instead of the original elements.

Traversing a list is not enough: each stored copy must use the current element.

#### missing-wrong-length

Display the average of all scores in a nonempty supplied list. The intended argument for this task is [3,6,10].



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE meanScore(scores)
{
  total ← 0
  FOR EACH score IN scores
  {
    total ← total + score
  }
  RETURN(total / 1)
}
result ← meanScore([3, 6, 10])
DISPLAY(result)
```

Answer: The calculation divides by 1 instead of the number of scores.

LENGTH(scores) supplies the number of elements needed for this average.

### Input and Output

#### missing-input-missing

Obtain a number from the user, add 1, and display the result. The supplied user response for this run is 14.



Which component is missing, incorrect, or ineffective for the stated task?

```text
response ← 0
PROCEDURE addPoint(points)
{
  RETURN(points + 1)
}
result ← addPoint(response)
DISPLAY(result)
```

Answer: The program uses a fixed value instead of obtaining user input.

Instructions responsible for input receive information that the program can use.

#### missing-input-discarded

Obtain a number from the user, add 1, and display the result. The supplied user response for this run is 14.



Which component is missing, incorrect, or ineffective for the stated task?

```text
response ← INPUT()
PROCEDURE addPoint(points)
{
  RETURN(points + 1)
}
result ← addPoint(0)
DISPLAY(result)
```

Answer: The user’s response is received but not passed to the calculation.

Receiving input and using that input are different responsibilities.

#### missing-output-missing

Obtain a number from the user, add 1, and display the result. The supplied user response for this run is 14.



Which component is missing, incorrect, or ineffective for the stated task?

```text
response ← INPUT()
PROCEDURE addPoint(points)
{
  RETURN(points + 1)
}
result ← addPoint(response)
```

Answer: The calculated result is never displayed.

Instructions responsible for output produce information or another observable result.

#### missing-output-wrong-variable

Obtain a number from the user, add 1, and display the result. The supplied user response for this run is 14.



Which component is missing, incorrect, or ineffective for the stated task?

```text
response ← INPUT()
PROCEDURE addPoint(points)
{
  RETURN(points + 1)
}
result ← addPoint(response)
DISPLAY(response)
```

Answer: The output displays the original response instead of the calculated result.

The output must reflect the requested program functionality.

#### missing-output-constant

Return and display a price with 2 subtracted only when the price is at least 14. The intended argument for this task is 14.



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE salePrice(price)
{
  cost ← price
  IF (price ≥ 14)
  {
    cost ← price - 2
  }
  RETURN(cost)
}
result ← salePrice(14)
DISPLAY("Done")
```

Answer: The output displays a fixed message instead of the calculated price.

A message is output, but this task requires displaying the calculated value.

#### missing-event-not-handled

When the Start button is pressed once, display Ready. WHEN StartPressed is event notation for this example; it is not an AP reference-sheet command.



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE announce(message)
{
  DISPLAY(message)
}
```

Answer: No instructions respond to the Start button event.

User actions that trigger events can provide input. The event handler must run the response.

#### missing-event-wrong-trigger

When the Start button is pressed once, display Ready. WHEN StartPressed is event notation for this example; it is not an AP reference-sheet command.



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE announce(message)
{
  DISPLAY(message)
}
WHEN HelpPressed
{
  announce("Ready")
}
```

Answer: The handler listens for Help instead of the required Start event.

The event trigger must correspond to the intended user input.

#### missing-robot-output-absent

Move the robot forward once for each supplied step. Movement is observable output. The intended argument for this task is 5.



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE moveRobot(steps)
{
  REPEAT steps TIMES
  {
  }
}
moveRobot(5)
```

Answer: The loop has no movement instruction to produce the requested output.

Robot movement is observable output even though no text is displayed.

#### missing-robot-wrong-action

Move the robot forward once for each supplied step. Movement is observable output. The intended argument for this task is 5.



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE moveRobot(steps)
{
  REPEAT steps TIMES
  {
    ROTATE_LEFT()
  }
}
moveRobot(5)
```

Answer: The output turns the robot instead of moving it forward.

Output includes observable behavior, and that behavior must match the task.

### Program Behavior and PPR

#### missing-initial-count-wrong

Count and display how many stored scores meet the supplied minimum. Process every score. The intended argument for this task is 14.



Which component is missing, incorrect, or ineffective for the stated task?

```text
scores ← [12, 14, 17]
PROCEDURE countPassing(minimum)
{
  count ← 1
  FOR EACH score IN scores
  {
    IF (score ≥ minimum)
    {
      count ← count + 1
    }
  }
  RETURN(count)
}
result ← countPassing(14)
DISPLAY(result)
```

Answer: The counter starts at 1 instead of 0.

A counter starts at zero when no qualifying elements have been processed.

#### missing-accumulate-assignment-missing

Add all stored prices and the supplied bonus, then display the total. The intended argument for this task is 2.



Which component is missing, incorrect, or ineffective for the stated task?

```text
prices ← [3, 6, 10]
PROCEDURE totalPrice(bonus)
{
  total ← bonus
  FOR EACH price IN prices
  {
  }
  RETURN(total)
}
result ← totalPrice(2)
DISPLAY(result)
```

Answer: The total is never updated with the prices.

An assignment changes program state; calculating a result requires storing the accumulated value.

#### missing-wrong-state-updated

Add all stored prices and the supplied bonus, then display the total. The intended argument for this task is 2.



Which component is missing, incorrect, or ineffective for the stated task?

```text
prices ← [3, 6, 10]
PROCEDURE totalPrice(bonus)
{
  total ← bonus
  FOR EACH price IN prices
  {
    price ← total + price
  }
  RETURN(total)
}
result ← totalPrice(2)
DISPLAY(result)
```

Answer: The loop updates price instead of total.

The accumulator variable must receive the new total.

#### missing-update-replaces-total

Add all stored prices and the supplied bonus, then display the total. The intended argument for this task is 2.



Which component is missing, incorrect, or ineffective for the stated task?

```text
prices ← [3, 6, 10]
PROCEDURE totalPrice(bonus)
{
  total ← bonus
  FOR EACH price IN prices
  {
    total ← price
  }
  RETURN(total)
}
result ← totalPrice(2)
DISPLAY(result)
```

Answer: The assignment replaces the total rather than adding the current price.

Accumulation combines the previous total with the current element.

#### missing-maximum-update-wrong

Display the highest score in a nonempty list of positive scores. The intended argument for this task is [3,9,5].



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE highest(scores)
{
  best ← 0
  FOR EACH score IN scores
  {
    IF (score > best)
    {
      best ← 0
    }
  }
  RETURN(best)
}
result ← highest([3, 9, 5])
DISPLAY(result)
```

Answer: The best score is reset to 0 instead of storing the higher score.

The assignment inside selection must retain the current higher value.

#### missing-assignment-after-use

Display the integers from 1 through the supplied limit, including the limit. The intended argument for this task is 5.



Which component is missing, incorrect, or ineffective for the stated task?

```text
PROCEDURE countUp(limit)
{
  REPEAT UNTIL (position > limit)
  {
    DISPLAY(position)
    position ← position + 1
  }
  position ← 1
}
countUp(5)
```

Answer: The loop uses position before it has been initialized.

Sequencing matters: initialize a variable before the loop uses it.

## Identify the Component

### Procedures

#### identify-definition-name

Display the name supplied to greet. A return value is not needed. The intended argument for this task is "Emery".



Select the student-developed procedure name in its definition.

```text
PROCEDURE greet(name)
{
  DISPLAY(name)
}
greet("Emery")
```

Answer: greet

The name in the PROCEDURE header identifies the student-developed procedure. It is not a call.

#### identify-definition-header

Display Go! exactly as many times as the supplied argument specifies. The intended argument for this task is 5.



Select the procedure header.

```text
PROCEDURE cheer(times)
{
  REPEAT times TIMES
  {
    DISPLAY("Go!")
  }
}
cheer(5)
```

Answer: PROCEDURE cheer(times)

A procedure header declares the name and parameters; the body supplies its instructions.

#### identify-complete-definition

Return and display a price with 2 subtracted only when the price is at least 14. The intended argument for this task is 14.



Select the complete procedure definition.

```text
PROCEDURE salePrice(price)
{
  cost ← price
  IF (price ≥ 14)
  {
    cost ← price - 2
  }
  RETURN(cost)
}
result ← salePrice(14)
DISPLAY(result)
```

Answer: PROCEDURE salePrice(price)
{
  cost ← price
  IF (price ≥ 14)
  {
    cost ← price - 2
  }
  RETURN(cost)
}

The definition includes the header and the bounded body. A call invokes that definition.

#### identify-body-sequence

Display the name supplied to greet. A return value is not needed. The intended argument for this task is "Emery".



Select the body of the procedure.

```text
PROCEDURE greet(name)
{
  DISPLAY(name)
}
greet("Emery")
```

Answer:   DISPLAY(name)


The body contains executable instructions, while the header declares the procedure.

#### identify-standalone-call

Display the name supplied to greet. A return value is not needed. The intended argument for this task is "Emery".



Select the procedure call.

```text
PROCEDURE greet(name)
{
  DISPLAY(name)
}
greet("Emery")
```

Answer: greet("Emery")

The call executes the named procedure using its supplied argument.

#### identify-call-in-assignment

Return and display a price with 2 subtracted only when the price is at least 14. The intended argument for this task is 14.



Select the procedure call whose returned value is assigned to result.

```text
PROCEDURE salePrice(price)
{
  cost ← price
  IF (price ≥ 14)
  {
    cost ← price - 2
  }
  RETURN(cost)
}
result ← salePrice(14)
DISPLAY(result)
```

Answer: salePrice(14)

A procedure call can be part of an expression; the assignment stores its returned value.

#### identify-store-return

Count and display how many stored scores meet the supplied minimum. Process every score. The intended argument for this task is 14.



Select the complete instruction that stores the returned count.

```text
scores ← [12, 14, 17]
PROCEDURE countPassing(minimum)
{
  count ← 0
  FOR EACH score IN scores
  {
    IF (score ≥ minimum)
    {
      count ← count + 1
    }
  }
  RETURN(count)
}
result ← countPassing(14)
DISPLAY(result)
```

Answer: result ← countPassing(14)

The entire assignment stores the return value. The call itself is only its right-hand expression.

#### identify-return-instruction

Display the average of all scores in a nonempty supplied list. The intended argument for this task is [3,6,10].



Select the return statement.

```text
PROCEDURE meanScore(scores)
{
  total ← 0
  FOR EACH score IN scores
  {
    total ← total + score
  }
  RETURN(total / LENGTH(scores))
}
result ← meanScore([3, 6, 10])
DISPLAY(result)
```

Answer: RETURN(total / LENGTH(scores))

RETURN supplies a value back to the calling code. DISPLAY produces output; a procedure can perform a task without returning a value.

#### identify-returned-expression

Display the average of all scores in a nonempty supplied list. The intended argument for this task is [3,6,10].



Select the expression returned by meanScore.

```text
PROCEDURE meanScore(scores)
{
  total ← 0
  FOR EACH score IN scores
  {
    total ← total + score
  }
  RETURN(total / LENGTH(scores))
}
result ← meanScore([3, 6, 10])
DISPLAY(result)
```

Answer: total / LENGTH(scores)

The quotient is the returned value; the RETURN instruction transfers it to the caller.

#### identify-early-branch-return

Return and display 1 for answer blue; return 0 for every other answer. The intended argument for this task is "blue".



Select the return statement used when the answer is incorrect.

```text
PROCEDURE checkAnswer(answer)
{
  IF (answer = "blue")
  {
    RETURN(1)
  }
  ELSE
  {
    RETURN(0)
  }
}
result ← checkAnswer("blue")
DISPLAY(result)
```

Answer: RETURN(0)

This RETURN exits the call with 0 when the answer is not blue.

#### identify-no-return-action

Move the robot forward once for each supplied step. Movement is observable output. The intended argument for this task is 5.



Select the procedure body that performs its task without a return value.

```text
PROCEDURE moveRobot(steps)
{
  REPEAT steps TIMES
  {
    MOVE_FORWARD()
  }
}
moveRobot(5)
```

Answer:   REPEAT steps TIMES
  {
    MOVE_FORWARD()
  }


RETURN supplies a value back to the calling code. DISPLAY produces output; a procedure can perform a task without returning a value.

#### identify-ppr-procedure-algorithm

Count and display how many stored scores meet the supplied minimum. Process every score. The intended argument for this task is 14.



Select the complete procedure segment containing its parameter, sequencing, selection, and iteration.

```text
scores ← [12, 14, 17]
PROCEDURE countPassing(minimum)
{
  count ← 0
  FOR EACH score IN scores
  {
    IF (score ≥ minimum)
    {
      count ← count + 1
    }
  }
  RETURN(count)
}
result ← countPassing(14)
DISPLAY(result)
```

Answer: PROCEDURE countPassing(minimum)
{
  count ← 0
  FOR EACH score IN scores
  {
    IF (score ≥ minimum)
    {
      count ← count + 1
    }
  }
  RETURN(count)
}

This procedure uses its parameter and contains sequencing, selection, and iteration. PPR also needs a separate call segment.

#### identify-call-inside-event

When the Start button is pressed once, display Ready. WHEN StartPressed is event notation for this example; it is not an AP reference-sheet command.



Select the student-developed procedure call inside the event handler.

```text
PROCEDURE announce(message)
{
  DISPLAY(message)
}
WHEN StartPressed
{
  announce("Ready")
}
```

Answer: announce("Ready")

The call inside the handler invokes the student-developed procedure. The event handler itself is not that procedure.

### Parameters and Arguments

#### identify-header-parameter

Display the name supplied to greet. A return value is not needed. The intended argument for this task is "Emery".



Select the parameter in the procedure definition.

```text
PROCEDURE greet(name)
{
  DISPLAY(name)
}
greet("Emery")
```

Answer: name

A parameter is a variable declared in the procedure definition. It receives the corresponding argument; an argument is supplied at a call.

#### identify-call-argument

Display the name supplied to greet. A return value is not needed. The intended argument for this task is "Emery".



Select the argument supplied to greet.

```text
PROCEDURE greet(name)
{
  DISPLAY(name)
}
greet("Emery")
```

Answer: "Emery"

A parameter is a variable declared in the procedure definition. It receives the corresponding argument; an argument is supplied at a call.

#### identify-parameter-in-condition

Count and display how many stored scores meet the supplied minimum. Process every score. The intended argument for this task is 14.



Select the parameter use that determines which scores qualify.

```text
scores ← [12, 14, 17]
PROCEDURE countPassing(minimum)
{
  count ← 0
  FOR EACH score IN scores
  {
    IF (score ≥ minimum)
    {
      count ← count + 1
    }
  }
  RETURN(count)
}
result ← countPassing(14)
DISPLAY(result)
```

Answer: minimum

The minimum parameter affects the Boolean condition, so different arguments can change which scores are counted.

#### identify-parameter-repeat-bound

Display Go! exactly as many times as the supplied argument specifies. The intended argument for this task is 5.



Select the parameter use controlling the number of repetitions.

```text
PROCEDURE cheer(times)
{
  REPEAT times TIMES
  {
    DISPLAY("Go!")
  }
}
cheer(5)
```

Answer: times

The times parameter determines the repeat count; not every loop needs a separately named counter.

#### identify-parameter-as-index

Display the list element at the supplied position. AP CSP lists start at index 1; positions 1–3 are accepted. The intended argument for this task is 2.



Select the parameter use that chooses the list index.

```text
names ← ["Emery", "Finley", "Gray"]
PROCEDURE readName(position)
{
  RETURN(names[position])
}
result ← readName(2)
DISPLAY(result)
```

Answer: position

The position parameter chooses which element is accessed. An index is a position, not the element itself.

#### identify-list-argument

Copy every item into copied and display how many items were copied. The intended argument for this task is [2,4,7].



Select the argument that supplies a collection to copyItems.

```text
PROCEDURE copyItems(items)
{
  copied ← []
  FOR EACH item IN items
  {
    APPEND(copied, item)
  }
  RETURN(LENGTH(copied))
}
result ← copyItems([2, 4, 7])
DISPLAY(result)
```

Answer: [2, 4, 7]

An argument may evaluate to a list. The items parameter receives that collection.

#### identify-parameter-accumulator-start

Add all stored prices and the supplied bonus, then display the total. The intended argument for this task is 2.



Select the parameter use that contributes the initial bonus.

```text
prices ← [3, 6, 10]
PROCEDURE totalPrice(bonus)
{
  total ← bonus
  FOR EACH price IN prices
  {
    total ← total + price
  }
  RETURN(total)
}
result ← totalPrice(2)
DISPLAY(result)
```

Answer: bonus

The incoming bonus becomes the initial total; the loop later adds each price.

#### identify-argument-to-returning-procedure

Return and display a price with 2 subtracted only when the price is at least 14. The intended argument for this task is 14.



Select the price argument supplied to the returning procedure.

```text
PROCEDURE salePrice(price)
{
  cost ← price
  IF (price ≥ 14)
  {
    cost ← price - 2
  }
  RETURN(cost)
}
result ← salePrice(14)
DISPLAY(result)
```

Answer: 14

A parameter is a variable declared in the procedure definition. It receives the corresponding argument; an argument is supplied at a call.

#### identify-parameter-use-output

Display the name supplied to greet. A return value is not needed. The intended argument for this task is "Emery".



Select the parameter use that becomes the displayed output.

```text
PROCEDURE greet(name)
{
  DISPLAY(name)
}
greet("Emery")
```

Answer: name

Using the parameter in DISPLAY lets the caller affect visible output; no return statement is needed.

### Selection and Boolean Logic

#### identify-complete-if

Return and display a price with 2 subtracted only when the price is at least 14. The intended argument for this task is 14.



Select the complete selection statement.

```text
PROCEDURE salePrice(price)
{
  cost ← price
  IF (price ≥ 14)
  {
    cost ← price - 2
  }
  RETURN(cost)
}
result ← salePrice(14)
DISPLAY(result)
```

Answer: IF (price ≥ 14)
  {
    cost ← price - 2
  }

An IF statement implements selection. Selection is one kind of control structure; iteration is another.

#### identify-conditional-header

Display Play for choice 1; display Help for any other choice. The intended argument for this task is 1.



Select the conditional statement’s header.

```text
PROCEDURE showMenu(choice)
{
  IF (choice = 1)
  {
    DISPLAY("Play")
  }
  ELSE
  {
    DISPLAY("Help")
  }
}
showMenu(1)
```

Answer: IF (choice = 1)

The IF header contains the Boolean expression; the complete selection statement also includes its branches.

#### identify-boolean-expression

Return and display a price with 2 subtracted only when the price is at least 14. The intended argument for this task is 14.



Select the Boolean expression evaluated by IF.

```text
PROCEDURE salePrice(price)
{
  cost ← price
  IF (price ≥ 14)
  {
    cost ← price - 2
  }
  RETURN(cost)
}
result ← salePrice(14)
DISPLAY(result)
```

Answer: price ≥ 14

A Boolean expression evaluates to true or false. It is part of, rather than the whole, IF statement.

#### identify-tested-variable

Count and display how many stored scores meet the supplied minimum. Process every score. The intended argument for this task is 14.



Select the current score used in the condition.

```text
scores ← [12, 14, 17]
PROCEDURE countPassing(minimum)
{
  count ← 0
  FOR EACH score IN scores
  {
    IF (score ≥ minimum)
    {
      count ← count + 1
    }
  }
  RETURN(count)
}
result ← countPassing(14)
DISPLAY(result)
```

Answer: score

The loop supplies score; the condition compares that element with the procedure’s minimum parameter.

#### identify-boundary-value

Return and display a price with 2 subtracted only when the price is at least 14. The intended argument for this task is 14.



Select the boundary value used by the condition.

```text
PROCEDURE salePrice(price)
{
  cost ← price
  IF (price ≥ 14)
  {
    cost ← price - 2
  }
  RETURN(cost)
}
result ← salePrice(14)
DISPLAY(result)
```

Answer: 14

The boundary is the value being compared; ≥ includes equality at that threshold.

#### identify-true-branch

Display Play for choice 1; display Help for any other choice. The intended argument for this task is 1.



Select the instructions that execute when the condition is true.

```text
PROCEDURE showMenu(choice)
{
  IF (choice = 1)
  {
    DISPLAY("Play")
  }
  ELSE
  {
    DISPLAY("Help")
  }
}
showMenu(1)
```

Answer:     DISPLAY("Play")


The IF body executes when the Boolean condition is true.

#### identify-false-branch

Display Play for choice 1; display Help for any other choice. The intended argument for this task is 1.



Select the instructions that execute when the condition is false.

```text
PROCEDURE showMenu(choice)
{
  IF (choice = 1)
  {
    DISPLAY("Play")
  }
  ELSE
  {
    DISPLAY("Help")
  }
}
showMenu(1)
```

Answer:     DISPLAY("Help")


The ELSE body executes when the IF condition is false.

#### identify-compound-and

Display TRUE exactly when temperature is between 10 and 20, including both endpoints. The intended argument for this task is 14.



Select the complete Boolean expression requiring both bounds.

```text
PROCEDURE isComfortable(temperature)
{
  RETURN((temperature ≥ 10 AND temperature ≤ 20))
}
result ← isComfortable(14)
DISPLAY(result)
```

Answer: (temperature ≥ 10 AND temperature ≤ 20)

AND requires both bounds. OR would allow a value meeting just one bound.

#### identify-lower-comparison

Display TRUE exactly when temperature is between 10 and 20, including both endpoints. The intended argument for this task is 14.



Select the comparison that checks the lower bound.

```text
PROCEDURE isComfortable(temperature)
{
  RETURN((temperature ≥ 10 AND temperature ≤ 20))
}
result ← isComfortable(14)
DISPLAY(result)
```

Answer: temperature ≥ 10

This comparison tests only the lower bound; the complete AND expression also checks the upper bound.

#### identify-boolean-negation

Display TRUE when sound is not muted and FALSE when it is muted. The intended argument for this task is false.



Select the Boolean expression that negates muted.

```text
PROCEDURE soundAllowed(muted)
{
  RETURN(NOT (muted))
}
result ← soundAllowed(FALSE)
DISPLAY(result)
```

Answer: NOT (muted)

NOT reverses true and false. An expression can be Boolean even outside an IF statement.

### Iteration

#### identify-whole-counted-loop

Display Go! exactly as many times as the supplied argument specifies. The intended argument for this task is 5.



Select the iteration statement.

```text
PROCEDURE cheer(times)
{
  REPEAT times TIMES
  {
    DISPLAY("Go!")
  }
}
cheer(5)
```

Answer: REPEAT times TIMES
  {
    DISPLAY("Go!")
  }

The complete loop includes its header and body; a statement inside the body is not the whole iteration statement.

#### identify-counted-loop-header

Display Go! exactly as many times as the supplied argument specifies. The intended argument for this task is 5.



Select the counted loop header.

```text
PROCEDURE cheer(times)
{
  REPEAT times TIMES
  {
    DISPLAY("Go!")
  }
}
cheer(5)
```

Answer: REPEAT times TIMES

REPEAT n TIMES is iteration without a separately named loop counter.

#### identify-repeat-count

Display Go! exactly as many times as the supplied argument specifies. The intended argument for this task is 5.



Select the expression determining how many times the loop executes.

```text
PROCEDURE cheer(times)
{
  REPEAT times TIMES
  {
    DISPLAY("Go!")
  }
}
cheer(5)
```

Answer: times

This expression supplies the repeat count; it is not a Boolean stopping condition.

#### identify-until-stopping-expression

Display the integers from 1 through the supplied limit, including the limit. The intended argument for this task is 5.



Select the expression that determines when the loop stops.

```text
PROCEDURE countUp(limit)
{
  position ← 1
  REPEAT UNTIL (position > limit)
  {
    DISPLAY(position)
    position ← position + 1
  }
}
countUp(5)
```

Answer: position > limit

REPEAT UNTIL stops when its Boolean condition is true. The body can execute zero times.

#### identify-loop-control-variable

Display the integers from 1 through the supplied limit, including the limit. The intended argument for this task is 5.



Select the loop control variable in the stopping expression.

```text
PROCEDURE countUp(limit)
{
  position ← 1
  REPEAT UNTIL (position > limit)
  {
    DISPLAY(position)
    position ← position + 1
  }
}
countUp(5)
```

Answer: position

Position changes each pass and is checked by the stopping condition. Not every kind of loop has a separate counter.

#### identify-counter-update

Display the integers from 1 through the supplied limit, including the limit. The intended argument for this task is 5.



Select the instruction that advances the loop counter.

```text
PROCEDURE countUp(limit)
{
  position ← 1
  REPEAT UNTIL (position > limit)
  {
    DISPLAY(position)
    position ← position + 1
  }
}
countUp(5)
```

Answer: position ← position + 1

This assignment increases position so the stopping condition can eventually become true.

#### identify-counter-initialization

Display the integers from 1 through the supplied limit, including the limit. The intended argument for this task is 5.



Select the loop counter’s initialization.

```text
PROCEDURE countUp(limit)
{
  position ← 1
  REPEAT UNTIL (position > limit)
  {
    DISPLAY(position)
    position ← position + 1
  }
}
countUp(5)
```

Answer: position ← 1

Initialization runs before the loop; the update runs inside its body.

#### identify-foreach-traversal

Add all stored prices and the supplied bonus, then display the total. The intended argument for this task is 2.



Select the instructions that traverse the prices list.

```text
prices ← [3, 6, 10]
PROCEDURE totalPrice(bonus)
{
  total ← bonus
  FOR EACH price IN prices
  {
    total ← total + price
  }
  RETURN(total)
}
result ← totalPrice(2)
DISPLAY(result)
```

Answer: FOR EACH price IN prices
  {
    total ← total + price
  }

FOR EACH repeats its body once per element, allowing the same code to handle different list lengths.

#### identify-foreach-element-variable

Add all stored prices and the supplied bonus, then display the total. The intended argument for this task is 2.



Select the iteration variable in the FOR EACH header.

```text
prices ← [3, 6, 10]
PROCEDURE totalPrice(bonus)
{
  total ← bonus
  FOR EACH price IN prices
  {
    total ← total + price
  }
  RETURN(total)
}
result ← totalPrice(2)
DISPLAY(result)
```

Answer: price

Price holds the current element; it is not a numeric list index.

#### identify-iteration-body

Add all stored prices and the supplied bonus, then display the total. The intended argument for this task is 2.



Select the instructions repeated for each price.

```text
prices ← [3, 6, 10]
PROCEDURE totalPrice(bonus)
{
  total ← bonus
  FOR EACH price IN prices
  {
    total ← total + price
  }
  RETURN(total)
}
result ← totalPrice(2)
DISPLAY(result)
```

Answer:     total ← total + price


The body is the repeated work; the loop header controls the repetition.

### Lists and Data

#### identify-list-identifier

Display whether the supplied target appears anywhere in names. The intended argument for this task is "Finley".



Select the list variable where names are first stored.

```text
names ← ["Emery", "Finley", "Gray"]
PROCEDURE containsName(target)
{
  found ← FALSE
  FOR EACH name IN names
  {
    IF (name = target)
    {
      found ← TRUE
    }
  }
  RETURN(found)
}
result ← containsName("Finley")
DISPLAY(result)
```

Answer: names

A list variable refers to an ordered collection of elements, rather than a single name.

#### identify-storage-instruction

Display whether the supplied target appears anywhere in names. The intended argument for this task is "Finley".



Select the instructions that create and initialize the list.

```text
names ← ["Emery", "Finley", "Gray"]
PROCEDURE containsName(target)
{
  found ← FALSE
  FOR EACH name IN names
  {
    IF (name = target)
    {
      found ← TRUE
    }
  }
  RETURN(found)
}
result ← containsName("Finley")
DISPLAY(result)
```

Answer: names ← ["Emery", "Finley", "Gray"]

This assignment stores data in the list. The PPR also needs use of that same list.

#### identify-list-literal

Display whether the supplied target appears anywhere in names. The intended argument for this task is "Finley".



Select the list literal.

```text
names ← ["Emery", "Finley", "Gray"]
PROCEDURE containsName(target)
{
  found ← FALSE
  FOR EACH name IN names
  {
    IF (name = target)
    {
      found ← TRUE
    }
  }
  RETURN(found)
}
result ← containsName("Finley")
DISPLAY(result)
```

Answer: ["Emery", "Finley", "Gray"]

The brackets contain the ordered elements; the assignment stores that collection in a variable.

#### identify-list-use-in-traversal

Add all stored prices and the supplied bonus, then display the total. The intended argument for this task is 2.



Select the list expression traversed by FOR EACH.

```text
prices ← [3, 6, 10]
PROCEDURE totalPrice(bonus)
{
  total ← bonus
  FOR EACH price IN prices
  {
    total ← total + price
  }
  RETURN(total)
}
result ← totalPrice(2)
DISPLAY(result)
```

Answer: prices

The loop reads the stored prices list; this is distinct from the loop’s current-element variable.

#### identify-element-access

Display the list element at the supplied position. AP CSP lists start at index 1; positions 1–3 are accepted. The intended argument for this task is 2.



Select the expression that accesses one list element.

```text
names ← ["Emery", "Finley", "Gray"]
PROCEDURE readName(position)
{
  RETURN(names[position])
}
result ← readName(2)
DISPLAY(result)
```

Answer: names[position]

The complete indexed expression produces an element. The index alone only selects its position.

#### identify-index-expression

Display the list element at the supplied position. AP CSP lists start at index 1; positions 1–3 are accepted. The intended argument for this task is 2.



Select the list index expression.

```text
names ← ["Emery", "Finley", "Gray"]
PROCEDURE readName(position)
{
  RETURN(names[position])
}
result ← readName(2)
DISPLAY(result)
```

Answer: position

AP CSP indices run from 1 through LENGTH(list). The position is not the stored element.

#### identify-append-instruction

Add the supplied name to names and display the resulting list length. The intended argument for this task is "Dee".



Select the instruction that stores a new element at the end of the list.

```text
names ← ["Emery", "Finley", "Gray"]
PROCEDURE addName(newName)
{
  APPEND(names, newName)
  RETURN(LENGTH(names))
}
result ← addName("Dee")
DISPLAY(result)
```

Answer: APPEND(names, newName)

APPEND adds the supplied element to the end; it does not replace an existing element.

#### identify-remove-instruction

Remove the name at the supplied valid position and display the new length. The intended argument for this task is 2.



Select the instruction that removes an element.

```text
names ← ["Emery", "Finley", "Gray"]
PROCEDURE removeName(position)
{
  REMOVE(names, position)
  RETURN(LENGTH(names))
}
result ← removeName(2)
DISPLAY(result)
```

Answer: REMOVE(names, position)

REMOVE deletes the indexed element and reduces the list length.

#### identify-list-length

Display the average of all scores in a nonempty supplied list. The intended argument for this task is [3,6,10].



Select the expression that obtains the number of scores.

```text
PROCEDURE meanScore(scores)
{
  total ← 0
  FOR EACH score IN scores
  {
    total ← total + score
  }
  RETURN(total / LENGTH(scores))
}
result ← meanScore([3, 6, 10])
DISPLAY(result)
```

Answer: LENGTH(scores)

LENGTH returns the number of elements; it does not return the final element.

#### identify-ppr-list-use

Count and display how many stored scores meet the supplied minimum. Process every score. The intended argument for this task is 14.



Select the complete code region that uses the stored list to create a count.

```text
scores ← [12, 14, 17]
PROCEDURE countPassing(minimum)
{
  count ← 0
  FOR EACH score IN scores
  {
    IF (score ≥ minimum)
    {
      count ← count + 1
    }
  }
  RETURN(count)
}
result ← countPassing(14)
DISPLAY(result)
```

Answer: FOR EACH score IN scores
  {
    IF (score ≥ minimum)
    {
      count ← count + 1
    }
  }

This traversal creates new data from multiple list elements. A declaration alone does not show use or explain complexity management.

### Input and Output

#### identify-input-expression

Obtain a number from the user, add 1, and display the result. The supplied user response for this run is 14.



Select the expression that obtains information from the user.

```text
response ← INPUT()
PROCEDURE addPoint(points)
{
  RETURN(points + 1)
}
result ← addPoint(response)
DISPLAY(result)
```

Answer: INPUT()

INPUT() obtains information. The surrounding assignment stores it.

#### identify-input-instruction

Obtain a number from the user, add 1, and display the result. The supplied user response for this run is 14.



Select the instructions responsible for input.

```text
response ← INPUT()
PROCEDURE addPoint(points)
{
  RETURN(points + 1)
}
result ← addPoint(response)
DISPLAY(result)
```

Answer: response ← INPUT()

These executable instructions obtain and store information that the program can use.

#### identify-output-instruction

Obtain a number from the user, add 1, and display the result. The supplied user response for this run is 14.



Select the instructions responsible for output.

```text
response ← INPUT()
PROCEDURE addPoint(points)
{
  RETURN(points + 1)
}
result ← addPoint(response)
DISPLAY(result)
```

Answer: DISPLAY(result)

DISPLAY produces textual or visual output; computing or returning the value alone does not display it.

#### identify-output-value

Obtain a number from the user, add 1, and display the result. The supplied user response for this run is 14.



Select the expression whose value is displayed.

```text
response ← INPUT()
PROCEDURE addPoint(points)
{
  RETURN(points + 1)
}
result ← addPoint(response)
DISPLAY(result)
```

Answer: result

The result expression supplies the data; DISPLAY is the output instruction around it.

#### identify-parameterized-output

Display the name supplied to greet. A return value is not needed. The intended argument for this task is "Emery".



Select the instructions responsible for displaying the supplied name.

```text
PROCEDURE greet(name)
{
  DISPLAY(name)
}
greet("Emery")
```

Answer: DISPLAY(name)

The DISPLAY instruction uses the parameter, so the caller can affect the visible output.

#### identify-branch-output

Display Play for choice 1; display Help for any other choice. The intended argument for this task is 1.



Select the output instruction for a choice other than 1.

```text
PROCEDURE showMenu(choice)
{
  IF (choice = 1)
  {
    DISPLAY("Play")
  }
  ELSE
  {
    DISPLAY("Help")
  }
}
showMenu(1)
```

Answer: DISPLAY("Help")

This output instruction runs in the ELSE branch when the user’s choice is not 1.

#### identify-repeated-message-output

Display Go! exactly as many times as the supplied argument specifies. The intended argument for this task is 5.



Select the message-producing instruction inside the loop.

```text
PROCEDURE cheer(times)
{
  REPEAT times TIMES
  {
    DISPLAY("Go!")
  }
}
cheer(5)
```

Answer: DISPLAY("Go!")

DISPLAY produces the message; the surrounding loop controls how often it is produced.

#### identify-event-input-header

When the Start button is pressed once, display Ready. WHEN StartPressed is event notation for this example; it is not an AP reference-sheet command.



Select the event header that receives the button interaction.

```text
PROCEDURE announce(message)
{
  DISPLAY(message)
}
WHEN StartPressed
{
  announce("Ready")
}
```

Answer: WHEN StartPressed

User actions that trigger events are input. WHEN notation is explained for this example and is not an AP reference-sheet command.

#### identify-event-response-output

When the Start button is pressed once, display Ready. WHEN StartPressed is event notation for this example; it is not an AP reference-sheet command.



Select the output instruction that ultimately responds to the button event.

```text
PROCEDURE announce(message)
{
  DISPLAY(message)
}
WHEN StartPressed
{
  announce("Ready")
}
```

Answer: DISPLAY(message)

The event is input, the call invokes announce, and DISPLAY produces the message as output.

#### identify-movement-output

Move the robot forward once for each supplied step. Movement is observable output. The intended argument for this task is 5.



Select the instructions responsible for movement output.

```text
PROCEDURE moveRobot(steps)
{
  REPEAT steps TIMES
  {
    MOVE_FORWARD()
  }
}
moveRobot(5)
```

Answer: MOVE_FORWARD()

MOVE_FORWARD produces movement output; output is not limited to DISPLAY or text.

#### identify-output-versus-return

Return and display 1 for answer blue; return 0 for every other answer. The intended argument for this task is "blue".



Select the output instruction outside the procedure.

```text
PROCEDURE checkAnswer(answer)
{
  IF (answer = "blue")
  {
    RETURN(1)
  }
  ELSE
  {
    RETURN(0)
  }
}
result ← checkAnswer("blue")
DISPLAY(result)
```

Answer: DISPLAY(result)

The procedure returns the score. This separate DISPLAY sends it to the user.

#### identify-input-data-flow

Obtain a number from the user, add 1, and display the result. The supplied user response for this run is 14.



Select the argument expression that carries received input into the procedure.

```text
response ← INPUT()
PROCEDURE addPoint(points)
{
  RETURN(points + 1)
}
result ← addPoint(response)
DISPLAY(result)
```

Answer: response

This argument carries received input to a parameter. The input instruction itself is the earlier INPUT assignment.

### Program Behavior and PPR

#### identify-initial-state

Count and display how many stored scores meet the supplied minimum. Process every score. The intended argument for this task is 14.



Select the assignment establishing the initial count.

```text
scores ← [12, 14, 17]
PROCEDURE countPassing(minimum)
{
  count ← 0
  FOR EACH score IN scores
  {
    IF (score ≥ minimum)
    {
      count ← count + 1
    }
  }
  RETURN(count)
}
result ← countPassing(14)
DISPLAY(result)
```

Answer: count ← 0

Sequencing puts initialization before iteration, so the count starts with zero qualifying scores.

#### identify-state-change

Count and display how many stored scores meet the supplied minimum. Process every score. The intended argument for this task is 14.



Select the instruction that changes the count after a qualifying score.

```text
scores ← [12, 14, 17]
PROCEDURE countPassing(minimum)
{
  count ← 0
  FOR EACH score IN scores
  {
    IF (score ≥ minimum)
    {
      count ← count + 1
    }
  }
  RETURN(count)
}
result ← countPassing(14)
DISPLAY(result)
```

Answer: count ← count + 1

This state-changing instruction adds 1 for each score meeting the condition.

#### identify-accumulator-destination

Add all stored prices and the supplied bonus, then display the total. The intended argument for this task is 2.



Select the variable updated by the accumulation assignment.

```text
prices ← [3, 6, 10]
PROCEDURE totalPrice(bonus)
{
  total ← bonus
  FOR EACH price IN prices
  {
    total ← total + price
  }
  RETURN(total)
}
result ← totalPrice(2)
DISPLAY(result)
```

Answer: total

The destination on the left receives the newly computed value. The right-hand expression reads the previous total.

#### identify-algorithm-body

Count and display how many stored scores meet the supplied minimum. Process every score. The intended argument for this task is 14.



Select the complete algorithm inside the procedure body.

```text
scores ← [12, 14, 17]
PROCEDURE countPassing(minimum)
{
  count ← 0
  FOR EACH score IN scores
  {
    IF (score ≥ minimum)
    {
      count ← count + 1
    }
  }
  RETURN(count)
}
result ← countPassing(14)
DISPLAY(result)
```

Answer:   count ← 0
  FOR EACH score IN scores
  {
    IF (score ≥ minimum)
    {
      count ← count + 1
    }
  }
  RETURN(count)


An algorithm is a finite sequence of instructions accomplishing a task. This body combines sequencing, selection, and iteration.
