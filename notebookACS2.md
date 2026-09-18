# Java Coding Notebook — Java 1 Part 1 Catch-Up

## Table of Contents

<details>
<summary><strong>Basics</strong></summary>
- [Basics](#basics)
- [algorithm](#algorithm)
- [computer algorithm](#computer-algorithm)
- [pseudocode](#pseudocode)
- [sequencing](#sequencing)
- [Java](#java)
- [JDK (Java Development Kit)](#jdk)
- [JRE (Java Runtime Environment)](#jre)
- [JVM (Java Virtual Machine)](#jvm)
- [procedural programming](#procedural-programming)
- [object-oriented programming (OOP)](#object-oriented-programming)
- [CamelCase](#camelcase)
- [.java file](#java-file)
- [code block / curly braces](#code-block-curly-braces)
- [comment](#comment)
- [single-line comment](#single-line-comment)
- [multi-line comment](#multi-line-comment)
- [Javadoc comment](#javadoc-comment)
- [internal documentation](#internal-documentation)
- [inline comment](#inline-comment)
- [TODO comment](#todo-comment)
- [external documentation](#external-documentation)
- [README](#readme)
- [API documentation](#api-documentation)
- [bug](#bug)
- [syntax error](#syntax-error)
- [runtime error](#runtime-error)
- [logic error](#logic-error)
- [exception](#exception)
- [stack trace](#stack-trace)
- [IDE (Integrated Development Environment)](#ide)
- [debugging](#debugging)
- [rubber duck debugging](#rubber-duck-debugging)
- [backtracking](#backtracking)
- [test data](#test-data)

<details>
<summary>Printing to Console</summary>
- [Printing to Console](#printing-to-console)
  - [console](#console)
  - [output](#output)
  - [print statement](#print-statement)
  - [System](#system)
  - [out](#out)
  - [println()](#println)
  - [print()](#print)
  - [printf()](#printf)
  - [%n](#printf-newline)
  - [%s](#printf-string)
</details>
<details>
<summary>Variables</summary>
- [Variables](#variables)
  - [variable](#variable)
  - [constant](#constant)
  - [data types](#data-types)
  - [String](#string)
  - [integer (int)](#integer-int)
  - [double](#double)
  - [char](#char)
  - [null](#null)
  - [variable declaration](#variable-declaration)
  - [variable initialization](#variable-initialization)
  - [assignment](#assignment)
  - [escape character](#escape-character)
  - [\" (escaped quotation mark)](#escaped-quotation-mark)
  - [\\ (escaped backslash)](#escaped-backslash)
  - [\n (newline escape sequence)](#newline-escape-sequence)
  - [concatenation](#concatenation)
  - [type conversion](#type-conversion)
  - [Integer.parseInt()](#integer-parseint)
  - [Float.parseFloat()](#float-parsefloat)
  - [String.valueOf()](#string-valueof)
  - [Integer.toString()](#integer-tostring)
  - [widening conversion](#widening-conversion)
  - [type casting](#type-casting)
  - [narrowing conversion](#narrowing-conversion)
  - [local variable](#local-variable)
  - [static variable](#static-variable)
  - [scope](#scope)
</details>
<details>
<summary>Methods</summary>
- [Methods](#methods)
  - [function](#function)
  - [method](#method)
  - [method declaration](#method-declaration)
  - [method call](#method-call)
  - [parameter](#parameter)
  - [argument](#argument)
  - [method overloading](#method-overloading)
  - [void](#void)
  - [non-void method](#non-void-method)
  - [return](#return)
  - [return statement](#return-statement)
  - [return type](#return-type)
  - [static method](#static-method)
  - [non-static method](#non-static-method)
</details>

<details>
<summary>User Input</summary>

- [User Input](#section-user-input)
  - [Scanner](#scanner)
  - [user input](#user-input)
  - [nextLine()](#nextline)
  - [nextInt()](#nextint)
  - [nextDouble()](#nextdouble)

</details>

<details>
<summary>Comparison Operators</summary>

- [Comparison Operators](#comparison-operators)
  - [comparison operator](#comparison-operator)
  - [== (equal to)](#equal-to)
  - [!= (not equal to)](#not-equal-to)
  - [< and >](#less-than-and-greater-than)
  - [<= and >=](#less-than-or-equal-and-greater-than-or-equal)

</details>

<details>
<summary>Math</summary>

- [Math](#math)
  - [arithmetic operator](#arithmetic-operator)
  - [addition operator (+)](#addition-operator)
  - [subtraction operator (-)](#subtraction-operator)
  - [multiplication operator (*)](#multiplication-operator)
  - [division operator (/)](#division-operator)
  - [integer division](#integer-division)
  - [increment operator (++)](#increment-operator)
  - [decrement operator (--)](#decrement-operator)
  - [compound assignment](#compound-assignment)
  - [pre-increment / pre-decrement](#pre-increment-pre-decrement)
  - [order of operations](#order-of-operations)
  - [modulus (%)](#modulus)
  - [even / odd test with modulus](#even-odd-test-with-modulus)

</details>

<details>
<summary>Random Numbers</summary>

- [Random Numbers](#random-numbers)
  - [Math.random()](#math-random)

</details>

</details>

<details>
<summary><strong>Control Structures</strong></summary>

- [Control Structures](#control-structures)

- [selection](#selection)
- [iteration](#iteration)
- [conditional statement](#conditional-statement)
- [loop](#loop)

<details>
<summary>Booleans</summary>

- [Booleans](#booleans)
  - [boolean](#boolean)
  - [logical operator](#logical-operator)
  - [&& (AND)](#logical-and)
  - [|| (OR)](#logical-or)
  - [! (NOT)](#logical-not)
  - [compound boolean expression](#compound-boolean-expression)
  - [truth table](#truth-table)
  - [De Morgan's Law](#de-morgans-law)

</details>

<details>
<summary>If Statements, If/Else, If/Else If/Else</summary>

- [If Statements, If/Else, If/Else If/Else](#if-statements-if-else-if-else-if-else)
  - [if statement](#if-statement)
  - [if/else](#if-else)
  - [if/else if/else](#if-else-if-else)
  - [nested if statement](#nested-if-statement)

</details>

<details>
<summary>For Loops</summary>

- [For Loops](#for-loops)
  - [for loop](#for-loop)
  - [for loop initialization](#for-loop-initialization)
  - [loop condition](#loop-condition)
  - [loop update](#loop-update)
  - [loop control variable](#loop-control-variable)
  - [iteration variable](#iteration-variable)
  - [infinite loop](#infinite-loop)

</details>

<details>
<summary>While Loops</summary>

- [While Loops](#while-loops)
  - [while loop](#while-loop)

</details>

</details>

<details>
<summary><strong>Classes</strong></summary>

- [Classes](#classes)

- [class](#class)
- [object](#object)
- [property](#property)
- [constructor](#constructor)
- [instance field](#instance-field)
- [instance](#instance)
- [attribute](#attribute)
- [state](#state)
- [new keyword](#new-keyword)
- [constructor parameter](#constructor-parameter)
- [default constructor](#default-constructor)
- [constructor call](#constructor-call)
- [object declaration and creation](#object-declaration-and-creation)
- [dot notation](#dot-notation)
- [abstraction](#abstraction)
- [encapsulation](#encapsulation)
- [inheritance](#inheritance)
- [polymorphism](#polymorphism)
- [override](#override)

<details>
<summary>main Method</summary>

- [main Method](#section-main-method)
  - [main method](#main-method)

</details>

<details>
<summary>Math Methods</summary>

- [Math Methods](#math-methods)
  - [Math class](#math-class)
  - [Math.sqrt()](#math-sqrt)
  - [Math.pow()](#math-pow)
  - [Math.PI](#math-pi)
  - [Math.round()](#math-round)
  - [Math.floor()](#math-floor)
  - [Math.ceil()](#math-ceil)
  - [Math.abs()](#math-abs)

</details>

</details>

<details>
<summary><strong>Code Examples</strong></summary>

- [Code Examples](#code-examples)
  - [Print Statements](#code-print-statements)
  - [Java 1 Part 1 Catch-Up Examples](#code-java-1-part-1-catch-up-examples)
  - [Basic Class](#code-basic-class)
  - [Class with Instance Fields](#code-class-with-instance-fields)
  - [Constructor without Parameters](#code-constructor-without-parameters)
  - [Constructor with Parameters](#code-constructor-with-parameters)
  - [Creating an Object](#code-creating-an-object)
  - [Creating Multiple Objects](#code-creating-multiple-objects)
  - [Accessing Fields with Dot Notation](#code-accessing-fields-with-dot-notation)
  - [Calling a Non-Static Method](#code-calling-a-non-static-method)
  - [Static vs Non-Static Methods](#code-static-vs-non-static-methods)
  - [Java Comments](#code-java-comments)

</details>
- [Notebook Style Guide](#markdown-style-guide-for-coding-notebooks)

## Vocab

<a id="basics"></a>
## Basics

<a id="algorithm"></a>
<details>
<summary>algorithm</summary>

**Definition:** A step-by-step process used to complete a task or solve a problem.

**Real-life example:** A recipe for making grilled cheese is an algorithm because it gives you a set of steps to follow in order.

**Java example:**
```java
// Algorithm for calculating a total
int price1 = 5;
int price2 = 7;
int total = price1 + price2;
System.out.println(total);
```

</details>

<a id="computer-algorithm"></a>
<details>
<summary>computer algorithm</summary>
**Definition:** A set of instructions for a computer to follow to accomplish a specific task.

**Real-life example:** A checkout system follows instructions to total prices, calculate tax, and display the amount owed.

**Java example:**
```java
int total = 10 + 5;
System.out.println(total);
```

Many different algorithms can solve the same problem. Programmers often compare them for correctness and efficiency.

</details>

<a id="pseudocode"></a>
<details>
<summary>pseudocode</summary>
**Definition:** A human-readable way to plan the steps of an algorithm without writing the exact syntax of a programming language.

**Real-life example:** Writing the steps for calculating a grocery total before turning those steps into Java.

**Java example:**
```java
// Pseudocode:
// Create total
// Add item prices
// Calculate tax
// Print total
```

</details>

<a id="sequencing"></a>
<details>
<summary>sequencing</summary>

**Definition:** The order in which steps or instructions are completed.

**Real-life example:** When making grilled cheese, you get the bread before adding butter and cheese. Changing the order can change the result.

**Java example:**
```java
System.out.println("Get bread");
System.out.println("Add butter");
System.out.println("Add cheese");
System.out.println("Cook sandwich");
```

Java normally runs these statements from top to bottom in the order they are written.

</details>

<a id="java"></a>
<details>
<summary>Java</summary>
**Definition:** A programming language used to build many kinds of applications. Java is object-oriented and is different from JavaScript.

**Real-life example:** Java can be used for desktop software, enterprise systems, Android-related development, and games.

**Java example:**
```java
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello Java!");
    }
}
```

</details>

<a id="jdk"></a>
<details>
<summary>JDK (Java Development Kit)</summary>
**Definition:** The set of tools used to develop Java programs, including tools to compile and debug code.

**Real-life example:** A mechanic needs tools to build and repair a car; a Java developer needs the JDK to build and debug Java programs.

</details>

<a id="jre"></a>
<details>
<summary>JRE (Java Runtime Environment)</summary>
**Definition:** The environment needed to run Java programs. It includes the JVM and basic Java libraries but not the full development toolset.

**Real-life example:** Someone playing a finished game needs the software required to run it, not necessarily all the tools used to build it.

</details>

<a id="jvm"></a>
<details>
<summary>JVM (Java Virtual Machine)</summary>
**Definition:** The part of the Java runtime that executes Java programs.

**Real-life example:** The JVM is like the machine that interprets the prepared Java program and runs it on the device.

</details>

<a id="procedural-programming"></a>
<details>
<summary>procedural programming</summary>
**Definition:** A programming approach organized mainly around procedures or functions that operate on data in a top-down sequence.

**Real-life example:** Following one long checklist from beginning to end is similar to a procedural program.

</details>

<a id="object-oriented-programming"></a>
<details>
<summary>object-oriented programming (OOP)</summary>

**Definition:** A way of organizing programs around classes and objects so related data and behaviors can be grouped together.

**Real-life example:** A phone contact keeps a person's name, phone number, picture, and other information together as one contact instead of scattering those values in unrelated places.

**Java example:**
```java
public class Friend {
    public String name;
    public int age;
    public boolean hasDog;

    public Friend(String friendName, int friendAge, boolean friendHasDog) {
        name = friendName;
        age = friendAge;
        hasDog = friendHasDog;
    }
}
```

Object-oriented programming is useful when one real-world thing needs several related pieces of data and behaviors.

</details>

<a id="camelcase"></a>
<details>
<summary>CamelCase</summary>
**Definition:** A naming style where multiple words are joined and each new word begins with a capital letter.

**Real-life example:** A file named `TemperatureConverter.java` combines two words without spaces.

**Base structure / syntax:**
```java
MyFirstProgram.java
```

</details>

<a id="java-file"></a>
<details>
<summary>.java file</summary>
**Definition:** A source-code file used to store Java code. The filename should match the public class name.

**Real-life example:** If the public class is named `Welcome`, the file should be named `Welcome.java`.

**Java example:**
```java
public class Welcome {

}
```

</details>

<a id="code-block-curly-braces"></a>
<details>
<summary>code block / curly braces</summary>
**Definition:** Curly braces `{ }` mark the beginning and end of a class, method, or other block of code.

**Real-life example:** Braces are like the walls around a room: they show what belongs inside that space.

**Java example:**
```java
public class Example {
    public static void main(String[] args) {
        // inside main
    }
}
```

</details>

<a id="comment"></a>
<details>
<summary>comment</summary>
**Definition:** Text written inside code to explain it. Java ignores comments when running the program.

**Real-life example:** A note in the margin of instructions helps the reader without changing the instructions.

</details>

<a id="single-line-comment"></a>
<details>
<summary>single-line comment</summary>

**Definition:** A comment that begins with `//` and continues to the end of the line. Java ignores comments when running the program.

**Real-life example:** A short note written in the margin of your work.

**Java example:**
```java
// Create a Friend object
Friend jasmine = new Friend("Jasmine", 15, "blue");
```

</details>

<a id="multi-line-comment"></a>
<details>
<summary>multi-line comment</summary>

**Definition:** A comment that can span multiple lines. It begins with `/*` and ends with `*/`.

**Real-life example:** A longer note attached to a section of instructions.

**Java example:**
```java
/*
 * This section creates
 * the Friend objects.
 */
Friend jasmine = new Friend("Jasmine", 15, "blue");
```

</details>

<a id="javadoc-comment"></a>
<details>
<summary>Javadoc comment</summary>

**Definition:** A special documentation comment in Java used to describe classes, methods, fields, constructors, and other parts of a program.

**Real-life example:** A label attached to a tool can explain what the tool is for and how it should be used.

**Base structure / syntax:**
```java
/**
 * Documentation goes here.
 */
```

**Java example:**
```java
/**
 * Prints a greeting for this friend.
 */
public void greeting() {
    System.out.println("Good Morning!");
}
```

Java comment types include:

```java
// Single-line comment

/*
 * Multi-line comment
 */

/**
 * Javadoc comment
 */
```

</details>

<a id="internal-documentation"></a>
<details>
<summary>internal documentation</summary>
**Definition:** Comments written directly inside source code to help developers understand how or why the code works.

**Real-life example:** Leaving a note for a teammate explaining why a calculation is done a certain way.

**Java example:**
```java
// Calculate tax after all item prices are added.
double tax = total * 0.08;
```

</details>

<a id="inline-comment"></a>
<details>
<summary>inline comment</summary>
**Definition:** A short comment placed on the same line as code.

**Java example:**
```java
int score = 10; // starting score
```

</details>

<a id="todo-comment"></a>
<details>
<summary>TODO comment</summary>
**Definition:** A comment that marks work that still needs to be completed or fixed.

**Java example:**
```java
// TODO: Add input validation
```

</details>

<a id="external-documentation"></a>
<details>
<summary>external documentation</summary>
**Definition:** Documentation stored outside the source code that explains the program to developers or users.

**Real-life example:** A user manual or project website explains how to use software.

</details>

<a id="readme"></a>
<details>
<summary>README</summary>
**Definition:** A common external documentation file that gives an overview of a project and often explains how to run or use it.

**Real-life example:** A project README can tell a new teammate what the project does and how to get started.

</details>

<a id="api-documentation"></a>
<details>
<summary>API documentation</summary>
**Definition:** Documentation that explains how other programmers can use classes, methods, or services provided by software.

**Real-life example:** Java documentation explains what a method expects and what it returns.

</details>

<a id="bug"></a>
<details>
<summary>bug</summary>
**Definition:** A problem in a program that causes an error or incorrect behavior.

**Real-life example:** A bicycle that does not work correctly has a problem to troubleshoot; code can have problems that must be debugged.

</details>

<a id="syntax-error"></a>
<details>
<summary>syntax error</summary>
**Definition:** An error caused by breaking Java's grammar or structure rules, such as missing punctuation.

**Java example:**
```java
int x = 10 // missing semicolon
```

</details>

<a id="runtime-error"></a>
<details>
<summary>runtime error</summary>
**Definition:** An error that happens while a program is running even though the code was written in a form Java could start executing.

**Java example:**
```java
int result = 10 / 0; // ArithmeticException
```

</details>

<a id="logic-error"></a>
<details>
<summary>logic error</summary>
**Definition:** An error where the program runs but produces the wrong result because the algorithm or logic is incorrect.

**Java example:**
```java
int price = 10;
int tax = price + 8; // wrong logic if 8 was meant to be 8%
```

</details>

<a id="exception"></a>
<details>
<summary>exception</summary>
**Definition:** An error condition that occurs while a Java program is running.

**Java example:**
```java
int result = 10 / 0; // causes an ArithmeticException
```

</details>

<a id="stack-trace"></a>
<details>
<summary>stack trace</summary>
**Definition:** A detailed runtime error report that shows where an exception occurred and the chain of method calls involved.

**Real-life example:** A trail of clues showing where the program was when it failed.

</details>

<a id="ide"></a>
<details>
<summary>IDE (Integrated Development Environment)</summary>
**Definition:** Software used to write and work with code. An IDE can use highlighting and other tools to help identify mistakes.

**Real-life example:** IntelliJ is an example of an IDE used for Java development.

</details>

<a id="debugging"></a>
<details>
<summary>debugging</summary>
**Definition:** The process of finding, understanding, and fixing problems in code.

**Real-life example:** Troubleshooting why a device does not work and testing possible fixes.

</details>

<a id="rubber-duck-debugging"></a>
<details>
<summary>rubber duck debugging</summary>
**Definition:** A debugging strategy where you explain the code and problem out loud step by step to help notice the mistake.

**Real-life example:** Explaining your work to another person often helps you notice what you skipped.

</details>

<a id="backtracking"></a>
<details>
<summary>backtracking</summary>
**Definition:** Returning to a version of the code that worked and retracing changes to identify what caused the problem.

**Real-life example:** Undoing changes one at a time until a broken project works again.

</details>

<a id="test-data"></a>
<details>
<summary>test data</summary>
**Definition:** A set of different input values used to check whether a solution works correctly in a variety of situations.

**Real-life example:** Testing small, large, positive, negative, even, and odd numbers helps reveal problems.

**Java example:**
```java
// Example values to test:
// 4, 5, 1000000, 999999, -246, -245
```

</details>

<a id="printing-to-console"></a>
### Printing to Console

<a id="console"></a>
<details>
<summary>console</summary>
**Definition:** The area where programmers can view program output and error messages while a program runs.

**Real-life example:** A dashboard shows what a machine is doing; the console shows what a program is doing.

</details>

<a id="output"></a>
<details>
<summary>output</summary>
**Definition:** Information a program sends out or displays.

**Real-life example:** A calculator displaying the answer after you enter a problem is output.

**Java example:**
```java
System.out.println("This is output.");
```

</details>

<a id="print-statement"></a>
<details>
<summary>print statement</summary>
**Definition:** A Java statement that sends text or values to the console.

**Real-life example:** Putting a message on a screen for the programmer to read.

**Base structure / syntax:**
```java
System.out.println("message");
```

**Java example:**
```java
System.out.println("Good Morning!");
```

</details>

<a id="system"></a>
<details>
<summary>System</summary>
**Definition:** A built-in Java class used to access system-related features such as standard input and output.

**Java example:**
```java
System.out.println("Hello");
```

</details>

<a id="out"></a>
<details>
<summary>out</summary>
**Definition:** The standard output stream accessed through `System`. It is used to send output to the console.

**Java example:**
```java
System.out.println("Hello");
```

</details>

<a id="println"></a>
<details>
<summary>println()</summary>
**Definition:** A print method that displays output and then moves to a new line.

**Base structure / syntax:**
```java
System.out.println("text");
```

**Java example:**
```java
System.out.println("Line 1");
System.out.println("Line 2");
```

</details>

<a id="print"></a>
<details>
<summary>print()</summary>
**Definition:** A print method that displays output without automatically moving to a new line.

**Base structure / syntax:**
```java
System.out.print("text");
```

**Java example:**
```java
System.out.print("Hello ");
System.out.print("World");
```

</details>

<a id="printf"></a>
<details>
<summary>printf()</summary>
**Definition:** A print method used to format output by placing values into specified positions.

**Base structure / syntax:**
```java
System.out.printf("format", values);
```

**Java example:**
```java
String name = "Alice";
System.out.printf("Hello %s!", name);
```

</details>

<a id="printf-newline"></a>
<details>
<summary>%n</summary>
**Definition:** A format specifier used with `printf()` to insert a new line.

**Java example:**
```java
System.out.printf("Hello%nWorld!");
```

</details>

<a id="printf-string"></a>
<details>
<summary>%s</summary>
**Definition:** A format specifier used with `printf()` as a placeholder for a String value.

**Java example:**
```java
String city = "Las Vegas";
System.out.printf("City: %s", city);
```

</details>

<a id="variables"></a>
### Variables

<a id="variable"></a>
<details>
<summary>variable</summary>

**Definition:** A named location used to store a value that can change while a program runs.

**Real-life example:** A scoreboard stores the current score, but that score can change during the game.

**Base structure / syntax:**
```java
dataType variableName = value;
```

**Java example:**
```java
int score = 10;
score = 15;
```

</details>

<a id="constant"></a>
<details>
<summary>constant</summary>

**Definition:** A named value that is set once and should not change while the program runs.

**Real-life example:** The number of minutes in an hour is always 60.

**Base structure / syntax:**
```java
final dataType CONSTANT_NAME = value;
```

**Java example:**
```java
final int MINUTES_IN_HOUR = 60;
```

</details>

<a id="data-types"></a>
<details>
<summary>data types</summary>

**Definition:** Categories that tell Java what kind of value a variable can store.

**Real-life example:** A form might have different spaces for a name, age, height, and a yes/no answer. Each space expects a different kind of information.

**Common Java data types:**
```java
String name = "Jordan";
int age = 16;
double height = 5.8;
boolean hasLicense = false;
```

For now, the four foundational types to recognize are **String**, **int**, **double**, and **boolean**.

</details>

<a id="string"></a>
<details>
<summary>String</summary>

**Definition:** A sequence of characters used to store text.

**Real-life example:** A person's name, a username, or a message are all pieces of text.

**Base structure / syntax:**
```java
String variableName = "text";
```

**Java example:**
```java
String playerName = "Alex";
```

`String` begins with a capital **S** in Java.

</details>

<a id="integer-int"></a>
<details>
<summary>integer (int)</summary>

**Definition:** A whole number with no decimal part.

**Real-life example:** The number of lives a player has can be 3, 2, 1, or 0.

**Base structure / syntax:**
```java
int variableName = wholeNumber;
```

**Java example:**
```java
int lives = 3;
```

</details>

<a id="double"></a>
<details>
<summary>double</summary>

**Definition:** A number that can include a decimal value.

**Real-life example:** A temperature, price, distance, or person's height may need a decimal.

**Base structure / syntax:**
```java
double variableName = decimalNumber;
```

**Java example:**
```java
double temperature = 98.6;
```

</details>

<a id="char"></a>
<details>
<summary>char</summary>
**Definition:** A Java data type that stores one character. A `char` uses single quotation marks.

**Real-life example:** The grade letter `A` is one character.

**Java example:**
```java
char grade = 'A';
```

</details>

<a id="null"></a>
<details>
<summary>null</summary>

**Definition:** A special value that means a reference currently points to no object or value.

**Real-life example:** A form may leave the middle-name field empty because no middle name was provided.

**Java example:**
```java
String middleName = null;
```

`null` is different from an empty String such as `""`.

</details>

<a id="variable-declaration"></a>
<details>
<summary>variable declaration</summary>
**Definition:** Creating a variable by giving Java its data type and name.

**Base structure / syntax:**
```java
dataType variableName;
```

**Java example:**
```java
String weather;
```

</details>

<a id="variable-initialization"></a>
<details>
<summary>variable initialization</summary>
**Definition:** Giving a variable its first value when it is created.

**Base structure / syntax:**
```java
dataType variableName = value;
```

**Java example:**
```java
String weather = "sunny";
```

</details>

<a id="assignment"></a>
<details>
<summary>assignment</summary>
**Definition:** Using `=` to store a value in a variable.

**Real-life example:** Putting a new label into a storage box.

**Base structure / syntax:**
```java
variableName = value;
```

**Java example:**
```java
weather = "rainy";
```

</details>

<a id="escape-character"></a>
<details>
<summary>escape character</summary>
**Definition:** A backslash sequence used inside a String to represent a special character or formatting instruction.

**Real-life example:** An escape character tells Java that a quotation mark or backslash belongs inside the text instead of ending the String.

**Java example:**
```java
String quote = "She said: \"Good Morning!\"";
```

</details>

<a id="escaped-quotation-mark"></a>
<details>
<summary>\" (escaped quotation mark)</summary>
**Definition:** An escape sequence that places a quotation mark inside a String.

**Java example:**
```java
String quote = "She said: \"Hi!\"";
```

</details>

<a id="escaped-backslash"></a>
<details>
<summary>\\ (escaped backslash)</summary>
**Definition:** An escape sequence that places a backslash character inside a String.

**Java example:**
```java
String path = "C:\\Users\\Student";
```

</details>

<a id="newline-escape-sequence"></a>
<details>
<summary>\n (newline escape sequence)</summary>
**Definition:** An escape sequence inside a String that moves following text to a new line.

**Java example:**
```java
String message = "Hello\nWorld";
System.out.println(message);
```

</details>

<a id="concatenation"></a>
<details>
<summary>concatenation</summary>
**Definition:** Combining Strings together. In Java, concatenation uses the `+` operator.

**Real-life example:** Combining a person's first and last name into one displayed name.

**Base structure / syntax:**
```java
String combined = string1 + string2;
```

**Java example:**
```java
String first = "Dev";
String second = "Cat";
String name = first + " " + second;
```

</details>

<a id="type-conversion"></a>
<details>
<summary>type conversion</summary>
**Definition:** Changing a value from one data type to another so it can be used in the needed way.

**Real-life example:** Changing a text answer of `"14"` into the number `14` so math can be performed.

**Java example:**
```java
String text = "14";
int number = Integer.parseInt(text);
```

</details>

<a id="integer-parseint"></a>
<details>
<summary>Integer.parseInt()</summary>
**Definition:** A Java method that converts a String containing a valid whole number into an `int`.

**Base structure / syntax:**
```java
int number = Integer.parseInt(stringValue);
```

**Java example:**
```java
String candy = "14";
int chocolate = Integer.parseInt(candy);
```

</details>

<a id="float-parsefloat"></a>
<details>
<summary>Float.parseFloat()</summary>
**Definition:** A Java method that converts a String containing a valid number into a `float`.

**Base structure / syntax:**
```java
float number = Float.parseFloat(stringValue);
```

**Java example:**
```java
String candy = "14";
float gummies = Float.parseFloat(candy);
```

</details>

<a id="string-valueof"></a>
<details>
<summary>String.valueOf()</summary>
**Definition:** A Java method that converts another value into a String.

**Java example:**
```java
int candy = 25;
String text = String.valueOf(candy);
```

</details>

<a id="integer-tostring"></a>
<details>
<summary>Integer.toString()</summary>
**Definition:** A Java method that converts an `int` into a String.

**Java example:**
```java
int candy = 25;
String text = Integer.toString(candy);
```

</details>

<a id="widening-conversion"></a>
<details>
<summary>widening conversion</summary>
**Definition:** An automatic numeric conversion from a smaller compatible data type to a larger compatible data type.

**Java example:**
```java
int candies = 50;
double result = candies;
```

The lesson shows the widening order as `byte -> short -> int -> long -> float -> double`.

</details>

<a id="type-casting"></a>
<details>
<summary>type casting</summary>
**Definition:** Manually converting a value to another compatible data type by placing the target type in parentheses before the value.

**Java example:**
```java
double price = 99.99;
int result = (int) price;
```

Casting a decimal type to `int` drops the decimal portion; it does not round.

</details>

<a id="narrowing-conversion"></a>
<details>
<summary>narrowing conversion</summary>
**Definition:** Converting a wider numeric type into a smaller type. Java requires an explicit cast because information can be lost.

**Java example:**
```java
double price = 99.99;
int wholePrice = (int) price;
```

</details>

<a id="local-variable"></a>
<details>
<summary>local variable</summary>
**Definition:** A variable created inside a method or block. It can only be used within the scope where it was declared.

**Java example:**
```java
static void myMethod() {
    String fruit = "apple";
    System.out.println(fruit);
}
```

</details>

<a id="static-variable"></a>
<details>
<summary>static variable</summary>
**Definition:** In this lesson, a variable declared in the class with `static`, outside the methods, so class methods can access the shared value.

**Java example:**
```java
static String favorite = "I love juice";
```

</details>

<a id="scope"></a>
<details>
<summary>scope</summary>

**Definition:** The part of a program where a variable, method, or other name can be accessed.

**Real-life example:** A classroom pass may only be valid during one class period. Outside that class, it cannot be used.

**Java example:**
```java
public static void main(String[] args) {
    int score = 10;

    if (score > 5) {
        String message = "High score!";
        System.out.println(message);
    }

    // message cannot be used here because it was created inside the if block.
}
```

</details>

<a id="methods"></a>
### Methods

<a id="function"></a>
<details>
<summary>function</summary>

**Definition:** A reusable block of code that performs a task. In Java, functions written inside classes are called **methods**.

**Real-life example:** A light switch performs the same action whenever you use it: it changes the light's state.

**Java example:**
```java
static void sayHi() {
    System.out.println("Hi!");
}
```

</details>

<a id="method"></a>
<details>
<summary>method</summary>

**Definition:** A reusable block of code that belongs to a class and performs an action or behavior.

**Real-life example:** A dog object could have behaviors such as bark, sit, or run.

**Java example:**
```java
public void greeting() {
    System.out.println("Good Morning!");
}
```

Methods do not run simply because they appear earlier in a file. They run when the program **calls** them.

Example method call:
```java
jasmine.greeting();
```

</details>

<a id="method-declaration"></a>
<details>
<summary>method declaration</summary>
**Definition:** The code that defines a method's name, return type, parameters, and body.

**Base structure / syntax:**
```java
static void methodName() {
    // method body
}
```

**Java example:**
```java
static void raddish() {
    System.out.println("Hello");
}
```

</details>

<a id="method-call"></a>
<details>
<summary>method call</summary>

**Definition:** An instruction that tells Java to run a method.

**Real-life example:** Pressing a button on a remote tells the television to perform an action. A method call tells Java to perform the code inside a method.

**Base structure / syntax:**
```java
objectName.methodName();
```

**Java example:**
```java
jasmine.greeting();
```

The method does not run merely because it exists in the class. It runs when it is called.

</details>

<a id="parameter"></a>
<details>
<summary>parameter</summary>

**Definition:** A variable listed in a method or constructor definition that receives information when the method or constructor is called.

**Real-life example:** A blank labeled `Name` on a form tells you what kind of information needs to be supplied.

**Base structure / syntax:**
```java
public ClassName(dataType parameterName) {
    // use parameterName
}
```

**Java example:**
```java
public Friend(String friendName) {
    name = friendName;
}
```

Here, `friendName` is a parameter. It receives a value when a `Friend` object is created.

</details>

<a id="argument"></a>
<details>
<summary>argument</summary>

**Definition:** A value supplied to a method or constructor when it is called.

**Real-life example:** If a form asks for a name, the blank labeled `Name` is like the parameter and the value `"Jasmine"` that you write into it is like the argument.

**Java example:**
```java
Friend jasmine = new Friend("Jasmine", 15, "blue");
```

The arguments are:
- `"Jasmine"`
- `15`
- `"blue"`

They line up with the constructor's parameters in the same order.

</details>

<a id="method-overloading"></a>
<details>
<summary>method overloading</summary>
**Definition:** Creating multiple methods with the same name but different parameter lists. The parameter number, types, or both must differ.

**Java example:**
```java
static void dog(String color) {
    System.out.println(color);
}

static void dog(int age) {
    System.out.println(age);
}
```

</details>

<a id="void"></a>
<details>
<summary>void</summary>

**Definition:** A method return type that means the method does not send a value back.

**Real-life example:** Pressing a doorbell performs an action, but it does not hand a value back to you.

**Java example:**
```java
static void printMessage() {
    System.out.println("Hello!");
}
```

The method performs an action but does not return a result.

</details>

<a id="non-void-method"></a>
<details>
<summary>non-void method</summary>
**Definition:** A method that returns a value. Its declared return type tells Java what kind of value must be returned.

**Java example:**
```java
static int raddish() {
    return 13;
}
```

</details>

<a id="return"></a>
<details>
<summary>return</summary>

**Definition:** The value that a method sends back after it finishes its work.

**Real-life example:** You give a cashier money, and the cashier gives you a receipt showing the result of the transaction.

**Java example:**
```java
static int add(int firstNumber, int secondNumber) {
    int total = firstNumber + secondNumber;
    return total;
}
```

The method returns an `int`, so it must send an integer value back.

</details>

<a id="return-statement"></a>
<details>
<summary>return statement</summary>
**Definition:** A statement that sends a value back from a non-void method. Once `return` runs, the method ends.

**Base structure / syntax:**
```java
return value;
```

**Java example:**
```java
static int raddish() {
    return 13;
}
```

</details>

<a id="return-type"></a>
<details>
<summary>return type</summary>
**Definition:** The data type written before a method name that tells Java what type of value the method returns. `void` means no value is returned.

**Java example:**
```java
static int getScore() {
    return 100;
}
```

</details>

<a id="static-method"></a>
<details>
<summary>static method</summary>

**Definition:** A method that belongs to the class itself instead of to one specific object.

**Real-life example:** A school-wide announcement is not tied to one individual student. It belongs to the school as a whole.

**Base structure / syntax:**
```java
public static void methodName() {
    // code
}
```

**Java example:**
```java
public static void invitation() {
    System.out.println("You are invited");
}
```

A static method can be called without first creating an object.

```java
invitation();
```

Static methods cannot directly use an object's non-static instance fields unless they are given a reference to an object.

</details>

<a id="non-static-method"></a>
<details>
<summary>non-static method</summary>

**Definition:** A method that belongs to a particular object and can work directly with that object's instance fields.

**Real-life example:** Each contact on a phone could have its own action for displaying information about that specific contact.

**Java example:**
```java
public void greeting() {
    System.out.println("Good Morning, " + name + "!");
}
```

To call a non-static method, first create an object:

```java
Friend jasmine = new Friend("Jasmine", 15, "blue");
jasmine.greeting();
```

Different objects can use the same method while working with their own data.

</details>

<a id="section-user-input"></a>
### User Input

<a id="scanner"></a>
<details>
<summary>Scanner</summary>

**Definition:** A Java class commonly used to read input typed by the user.

**Real-life example:** A program asks a user a question and waits for the user to type an answer.

**Base structure / syntax:**
```java
Scanner input = new Scanner(System.in);
```

**Java example:**
```java
import java.util.Scanner;

Scanner input = new Scanner(System.in);
System.out.print("Enter your name: ");
String name = input.nextLine();
```

`Scanner` is in `java.util`, so it must be imported before use.

</details>

<a id="user-input"></a>
<details>
<summary>user input</summary>

**Definition:** Information entered into a program by the user while the program is running.

**Real-life example:** Typing your name into a login screen is user input.

**Java example:**
```java
Scanner input = new Scanner(System.in);
System.out.print("Enter your age: ");
int age = input.nextInt();
```

</details>

<a id="nextline"></a>
<details>
<summary>nextLine()</summary>

**Definition:** A `Scanner` method that reads an entire line of text, including spaces, until the user presses Enter.

**Base structure / syntax:**
```java
String value = input.nextLine();
```

**Java example:**
```java
System.out.print("Enter your full name: ");
String name = input.nextLine();
```

</details>

<a id="nextint"></a>
<details>
<summary>nextInt()</summary>

**Definition:** A `Scanner` method that reads an integer entered by the user.

**Base structure / syntax:**
```java
int value = input.nextInt();
```

**Java example:**
```java
System.out.print("Enter your age: ");
int age = input.nextInt();
```

</details>

<a id="nextdouble"></a>
<details>
<summary>nextDouble()</summary>

**Definition:** A `Scanner` method that reads a decimal number entered by the user.

**Base structure / syntax:**
```java
double value = input.nextDouble();
```

**Java example:**
```java
System.out.print("Enter the price: ");
double price = input.nextDouble();
```

</details>

<a id="comparison-operators"></a>
### Comparison Operators

<a id="comparison-operator"></a>
<details>
<summary>comparison operator</summary>

**Definition:** An operator that compares two values and produces a boolean result: `true` or `false`.

**Real-life example:** Comparing two scores to see which is larger.

**Java example:**
```java
int score = 85;
System.out.println(score >= 70); // true
```

Common comparison operators are `==`, `!=`, `<`, `>`, `<=`, and `>=`.

</details>

<a id="equal-to"></a>
<details>
<summary>== (equal to)</summary>

**Definition:** Checks whether two values are equal.

**Base structure / syntax:**
```java
value1 == value2
```

**Java example:**
```java
int score = 100;
System.out.println(score == 100); // true
```

</details>

<a id="not-equal-to"></a>
<details>
<summary>!= (not equal to)</summary>

**Definition:** Checks whether two values are not equal.

**Base structure / syntax:**
```java
value1 != value2
```

**Java example:**
```java
int lives = 3;
System.out.println(lives != 0); // true
```

</details>

<a id="less-than-and-greater-than"></a>
<details>
<summary>< and ></summary>

**Definition:** `<` checks whether the left value is less than the right value. `>` checks whether it is greater.

**Base structure / syntax:**
```java
a < b
a > b
```

**Java example:**
```java
int age = 16;
System.out.println(age < 18); // true
System.out.println(age > 18); // false
```

</details>

<a id="less-than-or-equal-and-greater-than-or-equal"></a>
<details>
<summary><= and >=</summary>

**Definition:** `<=` means less than or equal to. `>=` means greater than or equal to.

**Base structure / syntax:**
```java
a <= b
a >= b
```

**Java example:**
```java
int grade = 90;
System.out.println(grade >= 90); // true
```

</details>

<a id="math"></a>
### Math

<a id="arithmetic-operator"></a>
<details>
<summary>arithmetic operator</summary>
**Definition:** A symbol used to perform a mathematical operation.

**Java example:**
```java
int add = 5 + 2;
int subtract = 5 - 2;
int multiply = 5 * 2;
int divide = 10 / 2;
```

</details>

<a id="addition-operator"></a>
<details>
<summary>addition operator (+)</summary>
**Definition:** The `+` operator adds numeric values. With Strings, `+` performs concatenation.

**Java example:**
```java
int total = 5 + 2;
```

</details>

<a id="subtraction-operator"></a>
<details>
<summary>subtraction operator (-)</summary>
**Definition:** The `-` operator subtracts one numeric value from another.

**Java example:**
```java
int difference = 5 - 2;
```

</details>

<a id="multiplication-operator"></a>
<details>
<summary>multiplication operator (*)</summary>
**Definition:** The `*` operator multiplies numeric values.

**Java example:**
```java
int total = 4 * 8;
```

</details>

<a id="division-operator"></a>
<details>
<summary>division operator (/)</summary>
**Definition:** The `/` operator divides one numeric value by another.

**Java example:**
```java
double result = 15.0 / 10.0;
```

</details>

<a id="integer-division"></a>
<details>
<summary>integer division</summary>
**Definition:** Division performed with integer values. Any decimal portion of the result is discarded.

**Java example:**
```java
int result = 15 / 10; // result is 1
```

</details>

<a id="increment-operator"></a>
<details>
<summary>increment operator (++)</summary>
**Definition:** An operator that increases a variable's value by 1 and stores the new value back in the variable.

**Java example:**
```java
int grapes = 5;
grapes++;
// grapes is now 6
```

</details>

<a id="decrement-operator"></a>
<details>
<summary>decrement operator (--)</summary>
**Definition:** An operator that decreases a variable's value by 1 and stores the new value back in the variable.

**Java example:**
```java
int grapes = 5;
grapes--;
// grapes is now 4
```

</details>

<a id="compound-assignment"></a>
<details>
<summary>compound assignment</summary>
**Definition:** An assignment operator that combines an operation with assignment, such as `+=` or `-=`.

**Java example:**
```java
int score = 10;
score += 5;
score -= 2;
```

</details>

<a id="pre-increment-pre-decrement"></a>
<details>
<summary>pre-increment / pre-decrement</summary>
**Definition:** Using `++` or `--` before a variable so its value changes before that variable is used in the surrounding expression.

**Java example:**
```java
int apples = 3;
System.out.println((--apples) + 4);
```

</details>

<a id="order-of-operations"></a>
<details>
<summary>order of operations</summary>
**Definition:** The required order for evaluating mathematical expressions: parentheses, exponents, multiplication/division/modulus, then addition/subtraction. Operations at the same level are handled left to right.

**Real-life example:** Using the agreed order prevents two people from getting different answers to the same expression.

</details>

<a id="modulus"></a>
<details>
<summary>modulus (%)</summary>
**Definition:** An operator that returns the remainder after division.

**Real-life example:** If 10 items are placed into groups of 3, one item is left over.

**Java example:**
```java
System.out.println(10 % 3); // 1
```

</details>

<a id="even-odd-test-with-modulus"></a>
<details>
<summary>even / odd test with modulus</summary>
**Definition:** A number is even when dividing it by 2 leaves a remainder of 0. Modulus can be used to check that remainder.

**Java example:**
```java
int number = 246;
System.out.println(number % 2); // 0 means even
```

</details>

<a id="random-numbers"></a>
### Random Numbers

<a id="math-random"></a>
<details>
<summary>Math.random()</summary>
**Definition:** A Math class method that returns a random `double` from 0.0 up to, but not including, 1.0.

**Java example:**
```java
double randomValue = Math.random();
```

</details>

<a id="control-structures"></a>
## Control Structures

<a id="selection"></a>
<details>
<summary>selection</summary>
**Definition:** The part of an algorithm where a choice determines which steps happen, usually based on a condition.

**Real-life example:** If it is raining, take an umbrella; otherwise, leave it at home.

**Java example:**
```java
// Later in Java, selection is commonly written with if statements.
// if (condition) { ... }
```

</details>

<a id="iteration"></a>
<details>
<summary>iteration</summary>
**Definition:** Repeating part of an algorithm so the same kind of work does not have to be written over and over.

**Real-life example:** Scanning every item in a shopping cart instead of writing a separate instruction for each item.

**Java example:**
```java
// Later in Java, iteration is commonly written with loops.
// for (...) { ... }
```

</details>

<a id="conditional-statement"></a>
<details>
<summary>conditional statement</summary>

**Definition:** A statement that makes a decision and runs different code depending on whether a condition is true or false.

**Real-life example:** If it is raining, bring an umbrella.

**Java example:**
```java
if (temperature < 50) {
    System.out.println("Wear a jacket.");
}
```

</details>

<a id="loop"></a>
<details>
<summary>loop</summary>

**Definition:** A structure that repeats a block of code.

**Real-life example:** Repeating the same exercise ten times instead of writing ten separate instructions.

**Java example:**
```java
for (int i = 0; i < 5; i++) {
    System.out.println(i);
}
```

</details>

<a id="booleans"></a>
### Booleans

<a id="boolean"></a>
<details>
<summary>boolean</summary>

**Definition:** A data type that can store only `true` or `false`.

**Real-life example:** A door can be locked or unlocked. A question such as "Is the door locked?" can be answered with true or false.

**Base structure / syntax:**
```java
boolean variableName = true;
```

**Java example:**
```java
boolean isLoggedIn = false;
```

</details>

<a id="logical-operator"></a>
<details>
<summary>logical operator</summary>

**Definition:** An operator used to combine or change boolean expressions.

**Java example:**
```java
boolean canEnter = hasTicket && age >= 18;
```

The main logical operators are `&&` (AND), `||` (OR), and `!` (NOT).

</details>

<a id="logical-and"></a>
<details>
<summary>&& (AND)</summary>

**Definition:** A logical operator that is true only when both boolean expressions are true.

**Real-life example:** You can enter only if you have a ticket AND your ID.

**Base structure / syntax:**
```java
condition1 && condition2
```

**Java example:**
```java
boolean canDrive = age >= 16 && hasLicense;
```

</details>

<a id="logical-or"></a>
<details>
<summary>|| (OR)</summary>

**Definition:** A logical operator that is true when at least one of the boolean expressions is true.

**Real-life example:** A student can enter if they have a school ID OR a temporary pass.

**Base structure / syntax:**
```java
condition1 || condition2
```

**Java example:**
```java
boolean canEnter = hasSchoolID || hasTemporaryPass;
```

</details>

<a id="logical-not"></a>
<details>
<summary>! (NOT)</summary>

**Definition:** A logical operator that reverses a boolean value.

**Real-life example:** If `isLocked` is true, then `!isLocked` is false.

**Base structure / syntax:**
```java
!condition
```

**Java example:**
```java
boolean isLocked = false;
System.out.println(!isLocked); // true
```

</details>

<a id="compound-boolean-expression"></a>
<details>
<summary>compound boolean expression</summary>

**Definition:** A boolean expression made by combining two or more conditions with logical operators.

**Real-life example:** Checking whether a person is at least 16 AND has a permit.

**Java example:**
```java
boolean canPracticeDrive = age >= 16 && hasPermit;
```

</details>

<a id="truth-table"></a>
<details>
<summary>truth table</summary>

**Definition:** A table used to show the result of a logical expression for every possible combination of boolean inputs.

`&&` is true only when both inputs are true. `||` is false only when both inputs are false.

</details>

<a id="de-morgans-law"></a>
<details>
<summary>De Morgan's Law</summary>

**Definition:** Rules for rewriting negated compound boolean expressions by switching AND/OR and negating each individual condition.

**Base structure / syntax:**
```java
!(A && B)  is equivalent to  !A || !B
!(A || B)  is equivalent to  !A && !B
```

**Java example:**
```java
boolean result1 = !(age >= 16 && hasPermit);
boolean result2 = age < 16 || !hasPermit;
// result1 and result2 are equivalent
```

</details>

<a id="if-statements-if-else-if-else-if-else"></a>
### If Statements, If/Else, If/Else If/Else

<a id="if-statement"></a>
<details>
<summary>if statement</summary>

**Definition:** Runs a block of code only when its condition is `true`.

**Base structure / syntax:**
```java
if (condition) {
    // code
}
```

**Java example:**
```java
int score = 92;

if (score >= 90) {
    System.out.println("A");
}
```

</details>

<a id="if-else"></a>
<details>
<summary>if/else</summary>

**Definition:** Chooses between two paths. The `if` block runs when the condition is true; the `else` block runs otherwise.

**Real-life example:** If a door is unlocked, open it; otherwise, use a key.

**Base structure / syntax:**
```java
if (condition) {
    // runs when true
} else {
    // runs when false
}
```

**Java example:**
```java
int age = 16;

if (age >= 18) {
    System.out.println("Adult");
} else {
    System.out.println("Minor");
}
```

</details>

<a id="if-else-if-else"></a>
<details>
<summary>if/else if/else</summary>

**Definition:** Checks multiple conditions in order. Java runs the first branch whose condition is true; `else` handles anything left over.

**Real-life example:** Assigning a letter grade based on several score ranges.

**Base structure / syntax:**
```java
if (condition1) {
    // code
} else if (condition2) {
    // code
} else {
    // code
}
```

**Java example:**
```java
int score = 84;

if (score >= 90) {
    System.out.println("A");
} else if (score >= 80) {
    System.out.println("B");
} else if (score >= 70) {
    System.out.println("C");
} else {
    System.out.println("Needs improvement");
}
```

</details>

<a id="nested-if-statement"></a>
<details>
<summary>nested if statement</summary>

**Definition:** An `if` statement placed inside another conditional statement.

**Real-life example:** Checking whether someone is old enough to drive, then checking whether they have a license.

**Java example:**
```java
if (age >= 16) {
    if (hasLicense) {
        System.out.println("Can drive");
    }
}
```

</details>

<a id="for-loops"></a>
### For Loops

<a id="for-loop"></a>
<details>
<summary>for loop</summary>

**Definition:** A loop commonly used when the program can describe the starting value, stopping condition, and update in one line.

**Base structure / syntax:**
```java
for (initialization; condition; update) {
    // repeated code
}
```

**Java example:**
```java
for (int i = 0; i < 5; i++) {
    System.out.println(i);
}
```

</details>

<a id="for-loop-initialization"></a>
<details>
<summary>for loop initialization</summary>

**Definition:** The first section of a `for` loop. It runs once before the loop begins and usually creates the loop control variable.

**Base structure / syntax:**
```java
for (int i = 0; ... )
```

**Java example:**
```java
for (int i = 0; i < 10; i++) {
    System.out.println(i);
}
```

</details>

<a id="loop-condition"></a>
<details>
<summary>loop condition</summary>

**Definition:** The boolean expression checked before each repetition. The loop continues while the condition is true.

**Base structure / syntax:**
```java
for (...; i < 10; ...)
```

**Java example:**
```java
for (int i = 0; i < 10; i++) {
    System.out.println(i);
}
```

</details>

<a id="loop-update"></a>
<details>
<summary>loop update</summary>

**Definition:** The part of a `for` loop that changes the loop control variable after each repetition.

**Base structure / syntax:**
```java
for (...; ...; i++)
```

**Java example:**
```java
for (int i = 0; i < 10; i++) {
    System.out.println(i);
}
```

</details>

<a id="loop-control-variable"></a>
<details>
<summary>loop control variable</summary>

**Definition:** The variable used to track a loop's progress.

**Java example:**
```java
for (int i = 0; i < 5; i++) {
    // i is the loop control variable
}
```

</details>

<a id="iteration-variable"></a>
<details>
<summary>iteration variable</summary>

**Definition:** A variable whose value changes as a loop repeats, often used to count or track progress.

**Java example:**
```java
for (int i = 0; i < 10; i++) {
    System.out.println(i);
}
```

</details>

<a id="infinite-loop"></a>
<details>
<summary>infinite loop</summary>

**Definition:** A loop that never stops because its condition never becomes false.

**Real-life example:** A machine repeating the same step forever because nothing changes the stop condition.

**Java example:**
```java
int x = 0;
while (x < 5) {
    System.out.println(x);
    // x never changes, so this never ends
}
```

</details>

<a id="while-loops"></a>
### While Loops

<a id="while-loop"></a>
<details>
<summary>while loop</summary>

**Definition:** A loop that repeats as long as its condition remains true.

**Base structure / syntax:**
```java
while (condition) {
    // repeated code
}
```

**Java example:**
```java
int count = 0;

while (count < 5) {
    System.out.println(count);
    count++;
}
```

</details>

<a id="classes"></a>
## Classes

<a id="class"></a>
<details>
<summary>class</summary>

**Definition:** A blueprint used to describe what information and behaviors objects of that type can have. A class defines the structure, but it is not an actual object.

**Real-life example:** A house blueprint describes how houses built from it should be structured, but the blueprint is not one of the houses.

**Base structure / syntax:**
```java
public class ClassName {

}
```

**Java example:**
```java
public class Friend {
    public String name;
    public int age;
    public boolean hasDog;
}
```

One class can be used to create many different objects.

Java class names should normally begin with a capital letter.

</details>

<a id="object"></a>
<details>
<summary>object</summary>

**Definition:** A specific object created from a class. An object stores its own values for the instance fields defined by the class.

**Real-life example:** If a class is a blank contact form, an object is one completed contact containing one person's information.

**Base structure / syntax:**
```java
ClassName objectName = new ClassName(arguments);
```

**Java example:**
```java
Friend jasmine = new Friend("Jasmine", 15, "blue");
```

Here, `jasmine` is an object created from the `Friend` class.

</details>

<a id="property"></a>
<details>
<summary>property</summary>

**Definition:** Data that belongs to a class or object. In Java, this is commonly called a **field** or **instance variable**.

**Real-life example:** A student can have properties such as a name, grade level, and student ID.

**Java example:**
```java
class Student {
    String name;
    int gradeLevel;
}
```

`name` and `gradeLevel` are fields that store information about a `Student` object.

</details>

<a id="constructor"></a>
<details>
<summary>constructor</summary>

**Definition:** A special part of a class that runs when a new object is created. It is commonly used to give the object's instance fields their starting values.

**Real-life example:** When a new student enrolls, the school creates a record and fills in starting information such as the student's name and grade level.

**Base structure / syntax:**
```java
public ClassName(parameters) {
    // setup code
}
```

**Java example:**
```java
public class Friend {
    public String name;
    public int age;

    public Friend(String friendName, int friendAge) {
        name = friendName;
        age = friendAge;
    }
}
```

A constructor:
- Has the **same name as the class**.
- Has **no return type**, not even `void`.
- Runs **once** when that particular object is created with `new`.

</details>

<a id="instance-field"></a>
<details>
<summary>instance field</summary>

**Definition:** A variable declared inside a class that stores one piece of information for each object created from that class.

**Real-life example:** Every contact in a phone can have its own name and phone number. Those categories of information are like instance fields.

**Base structure / syntax:**
```java
accessModifier dataType fieldName;
```

**Java example:**
```java
public class Friend {
    public String name;
    public int age;
    public String favoriteColor;
}
```

`name`, `age`, and `favoriteColor` are instance fields.

Each object can store different values in those same fields.

</details>

<a id="instance"></a>
<details>
<summary>instance</summary>

**Definition:** An actual object created from a class. Creating an instance means using the class blueprint to make one specific object.

**Real-life example:** If everyone fills out the same blank form, each person's completed form is a separate instance of that form.

**Java example:**
```java
Friend jasmine = new Friend("Jasmine", 15, "blue");
Friend tyler = new Friend("Tyler", 17, "green");
```

`jasmine` and `tyler` are two different instances of the `Friend` class.

Even if two objects contain the same values, they can still be separate objects.

</details>

<a id="attribute"></a>
<details>
<summary>attribute</summary>

**Definition:** A characteristic or piece of information that describes an object.

**Real-life example:** A friend can have attributes such as a name, age, favorite color, or whether they have a dog.

**Java connection:** Attributes are stored in **instance fields**.

```java
public class Friend {
    public String name;
    public int age;
    public boolean hasDog;
}
```

Here, `name`, `age`, and `hasDog` store attributes of each `Friend` object.

</details>

<a id="state"></a>
<details>
<summary>state</summary>

**Definition:** The current set of values stored inside an object's instance fields.

**Real-life example:** Two game characters may come from the same character type, but one may have 100 health while another has 45 health. Their current values describe their state.

**Java example:**
```java
Friend jasmine = new Friend("Jasmine", 15, "blue");
Friend tyler = new Friend("Tyler", 17, "green");
```

Both objects come from the same class, but their fields contain different values, so they have different states.

Two objects can also have the same state and still be separate objects.

</details>

<a id="new-keyword"></a>
<details>
<summary>new keyword</summary>

**Definition:** The Java keyword used when creating a new object from a class.

**Real-life example:** Telling a builder to use a blueprint to build a new house is similar to using `new` to tell Java to create a new object from a class.

**Base structure / syntax:**
```java
new ClassName(arguments)
```

**Java example:**
```java
Friend jasmine = new Friend("Jasmine", 15, "blue");
```

`new Friend(...)` creates a new `Friend` object and calls its constructor.

</details>

<a id="constructor-parameter"></a>
<details>
<summary>constructor parameter</summary>

**Definition:** A parameter placed inside a constructor so values can be supplied when a new object is created.

**Real-life example:** When creating a new online profile, the setup process asks for information such as your name and age so the new profile can begin with those values.

**Java example:**
```java
public Friend(String friendName, int friendAge) {
    name = friendName;
    age = friendAge;
}
```

`friendName` and `friendAge` are constructor parameters.

</details>

<a id="default-constructor"></a>
<details>
<summary>default constructor</summary>

**Definition:** A constructor that takes no arguments. If a class has no constructor written at all, Java provides a no-argument constructor automatically. A programmer can also write a no-argument constructor to set specific starting values.

**Real-life example:** A new game character might begin with preset values such as a default name, starting health, and starting speed.

**Java example:**
```java
public class Car {
    String model;
    String color;
    int speed;

    public Car() {
        model = "Unknown";
        color = "Black";
        speed = 0;
    }
}
```

This constructor can be called without arguments:

```java
Car myCar = new Car();
```

</details>

<a id="constructor-call"></a>
<details>
<summary>constructor call</summary>

**Definition:** The use of `new` followed by a class constructor to create and initialize an object.

**Real-life example:** Giving a builder a blueprint and the choices for one house starts construction of that particular house.

**Base structure / syntax:**
```java
new ClassName(arguments)
```

**Java example:**
```java
new Friend("Jasmine", 15, "blue");
```

A constructor is invoked once when that particular object is created.

</details>

<a id="object-declaration-and-creation"></a>
<details>
<summary>object declaration and creation</summary>

**Definition:** The complete statement used to declare an object variable and assign it a newly created object.

**Real-life example:** Creating a new contact named `jasmine` and filling that contact with Jasmine's information.

**Base structure / syntax:**
```java
ClassName objectName = new ClassName(arguments);
```

**Java example:**
```java
Friend jasmine = new Friend("Jasmine", 15, "blue");
```

Breakdown:
- `Friend` = class/data type
- `jasmine` = object variable name
- `new` = creates a new object
- `Friend(...)` = constructor call
- values inside `(...)` = arguments

</details>

<a id="dot-notation"></a>
<details>
<summary>dot notation</summary>

**Definition:** Using a dot (`.`) after an object or class name to access one of its fields or methods.

**Real-life example:** Think of looking inside one specific contact and choosing exactly which detail you want, such as that contact's phone number.

**Base structure / syntax:**
```java
objectName.fieldName
objectName.methodName()
```

**Java example:**
```java
System.out.println(jasmine.favoriteColor);
jasmine.greeting();
```

`jasmine.favoriteColor` accesses a field.

`jasmine.greeting()` calls a method on the `jasmine` object.

</details>

<a id="abstraction"></a>
<details>
<summary>abstraction</summary>

**Definition:** Using a simpler name or interface to work with something without needing to handle all of its internal details every time.

**Real-life example:** You can drive a car using the steering wheel and pedals without manually controlling every part of the engine.

**Java example:**
```java
Friend jasmine = new Friend("Jasmine", 15, "blue");

System.out.println(jasmine.name);
```

The name `jasmine` represents an entire object that can contain several pieces of related information. You can work with the object as one unit and access the specific information you need.

</details>

<a id="encapsulation"></a>
<details>
<summary>encapsulation</summary>
**Definition:** An object-oriented programming principle that keeps data and the code that works with that data organized together and can hide internal details.

**Real-life example:** A vending machine lets you use buttons and money without exposing all of its internal wiring.

</details>

<a id="inheritance"></a>
<details>
<summary>inheritance</summary>
**Definition:** An object-oriented programming principle where one class can reuse and build on features from another class.

**Real-life example:** A specialized type of vehicle can reuse general vehicle features while adding its own features.

</details>

<a id="polymorphism"></a>
<details>
<summary>polymorphism</summary>
**Definition:** An object-oriented programming principle that allows related objects or methods to behave in different ways while sharing a common structure.

**Real-life example:** Different animals can all perform a `speak` behavior, but each can make a different sound.

</details>

<a id="override"></a>
<details>
<summary>override</summary>

**Definition:** Replacing an inherited method with a new version that is specific to a subclass.

**Real-life example:** A general rule may say every animal makes a sound, but a dog and a cat make different sounds.

**Java example:**
```java
class Animal {
    void speak() {
        System.out.println("Animal sound");
    }
}

class Dog extends Animal {
    @Override
    void speak() {
        System.out.println("Woof!");
    }
}
```

`@Override` tells Java that the subclass is providing its own version of an inherited method.

</details>

<a id="section-main-method"></a>
### main Method

<a id="main-method"></a>
<details>
<summary>main method</summary>

**Definition:** The method Java uses as the starting point when running a standard Java application.

**Real-life example:** The main entrance of a building tells you where to begin. The `main` method tells Java where program execution begins.

**Base structure / syntax:**
```java
public static void main(String[] args) {

}
```

**Java example:**
```java
public class Friend {
    public static void main(String[] args) {
        System.out.println("Program started");
    }
}
```

</details>

<a id="math-methods"></a>
### Math Methods

<a id="math-class"></a>
<details>
<summary>Math class</summary>
**Definition:** A built-in Java class containing static mathematical methods and constants.

**Java example:**
```java
double root = Math.sqrt(25);
```

</details>

<a id="math-sqrt"></a>
<details>
<summary>Math.sqrt()</summary>
**Definition:** A Math class method that returns the square root of a number as a decimal value.

**Java example:**
```java
double total = Math.sqrt(25);
```

</details>

<a id="math-pow"></a>
<details>
<summary>Math.pow()</summary>
**Definition:** A Math class method used to raise a number to a power. The first argument is the base and the second is the exponent.

**Java example:**
```java
double total = Math.pow(7, 2);
```

</details>

<a id="math-pi"></a>
<details>
<summary>Math.PI</summary>
**Definition:** A Math class constant containing a precise value of pi.

**Java example:**
```java
double circumference = 2 * Math.PI * 5;
```

</details>

<a id="math-round"></a>
<details>
<summary>Math.round()</summary>
**Definition:** A Math class method that rounds a decimal value to the nearest whole number.

**Java example:**
```java
System.out.println(Math.round(4.6)); // 5
```

</details>

<a id="math-floor"></a>
<details>
<summary>Math.floor()</summary>
**Definition:** A Math class method that rounds down to the nearest whole-number value and returns a `double`.

**Java example:**
```java
System.out.println(Math.floor(4.8)); // 4.0
```

</details>

<a id="math-ceil"></a>
<details>
<summary>Math.ceil()</summary>
**Definition:** A Math class method that rounds up to the nearest whole-number value and returns a `double`.

**Java example:**
```java
System.out.println(Math.ceil(4.1)); // 5.0
```

</details>

<a id="math-abs"></a>
<details>
<summary>Math.abs()</summary>
**Definition:** A Math class method that returns the absolute value of a number.

**Java example:**
```java
System.out.println(Math.abs(-4)); // 4
```

</details>

<a id="code-examples"></a>
## Code Examples

<a id="code-print-statements"></a>
### Print Statements

```java
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello World!");
    }
}
```

**System** accesses a Java class that is built into the language.

**out** is short for "output."

**println** is short for "print line." It prints the message and then moves to a new line.

`System.out.print()` also prints output, but it does **not** automatically move to a new line.



<a id="code-java-1-part-1-catch-up-examples"></a>
### Java 1 Part 1 Catch-Up Examples

<a id="code-complete-starter-program"></a>
#### Complete Starter Program

```java
public class MyFirstProgram {
    public static void main(String[] args) {
        System.out.println("Hello World!");
    }
}
```

The **filename should match the public class name**: `MyFirstProgram.java`.

<a id="code-printing-println-print-and-printf"></a>
#### Printing: `println`, `print`, and `printf`

```java
public class OutputExamples {
    public static void main(String[] args) {
        System.out.println("This gets its own line.");

        System.out.print("These ");
        System.out.print("stay together.");
        System.out.println();

        String name = "Alice";
        String city = "Las Vegas";
        System.out.printf("Hello %s! You live in %s.%n", name, city);
    }
}
```

<a id="code-variables-and-updating-values"></a>
#### Variables and Updating Values

```java
public class VariableExample {
    public static void main(String[] args) {
        String weather = "sunny";
        System.out.println(weather);

        weather = "rainy";
        System.out.println(weather);
    }
}
```

<a id="code-escape-characters"></a>
#### Escape Characters

```java
public class EscapeExample {
    public static void main(String[] args) {
        String quote = "She said: \"Good Morning!\"";
        String path = "C:\\Users\\Student";
        String twoLines = "Hello\nWorld";

        System.out.println(quote);
        System.out.println(path);
        System.out.println(twoLines);
    }
}
```

<a id="code-string-concatenation"></a>
#### String Concatenation

```java
public class ConcatenationExample {
    public static void main(String[] args) {
        String first = "Dev";
        String second = "Cat";

        String programName = first + " " + second + " Studios";
        System.out.println(programName);
    }
}
```

Concatenation does **not** automatically add spaces. Put `" "` in the expression when a space is needed.

<a id="code-string-to-number-conversion"></a>
#### String to Number Conversion

```java
public class ParseExample {
    public static void main(String[] args) {
        String wholeNumberText = "14";
        String decimalText = "14.5";

        int wholeNumber = Integer.parseInt(wholeNumberText);
        float decimalNumber = Float.parseFloat(decimalText);

        System.out.println(wholeNumber);
        System.out.println(decimalNumber);
    }
}
```

<a id="code-number-to-string-conversion"></a>
#### Number to String Conversion

```java
public class NumberToString {
    public static void main(String[] args) {
        int candy = 25;

        String first = String.valueOf(candy);
        String second = Integer.toString(candy);

        System.out.println(first);
        System.out.println(second);
    }
}
```

<a id="code-widening-and-casting"></a>
#### Widening and Casting

```java
public class ConversionExample {
    public static void main(String[] args) {
        int candies = 50;

        // Widening: Java can do this automatically.
        double decimalCandies = candies;

        double price = 99.99;

        // Casting: decimal portion is discarded.
        int wholePrice = (int) price;

        System.out.println(decimalCandies);
        System.out.println(wholePrice);
    }
}
```

<a id="code-three-major-error-types"></a>
#### Three Major Error Types

```java
// Syntax error example:
// int score = 10

// Runtime error example:
// int result = 10 / 0;

// Logic error example:
int price = 10;
int doubledPrice = price + 2; // Runs, but wrong if we meant price * 2.
```

When debugging:
1. Read the error message.
2. Check punctuation, capitalization, and braces.
3. Check the line the message points to and nearby lines.
4. Explain the code out loud.
5. Return to the last working version if necessary.

<a id="code-addition-subtraction-increment-and-decrement"></a>
#### Addition, Subtraction, Increment, and Decrement

```java
public class MathBasics {
    public static void main(String[] args) {
        int grapes = 5;
        int strawberries = 2;

        int total = grapes + strawberries;
        int difference = grapes - strawberries;

        grapes++;
        strawberries--;

        System.out.println(total);
        System.out.println(difference);
        System.out.println(grapes);
        System.out.println(strawberries);
    }
}
```

Equivalent update forms:

```java
score++;
score += 1;

score--;
score -= 1;
```

<a id="code-multiplication-and-division"></a>
#### Multiplication and Division

```java
public class MultiplyDivide {
    public static void main(String[] args) {
        int octopus = 4;
        int legs = 8;
        int totalLegs = octopus * legs;

        int integerResult = 15 / 10;
        double decimalResult = 15.0 / 10.0;

        System.out.println(totalLegs);      // 32
        System.out.println(integerResult); // 1
        System.out.println(decimalResult); // 1.5
    }
}
```

<a id="code-order-of-operations"></a>
#### Order of Operations

Java follows:

1. Parentheses
2. Exponents
3. Multiplication / Division / Modulus
4. Addition / Subtraction

Operations on the same level are evaluated from left to right.

```java
int result = (3 + 2) * 4 - 6 / 2;
System.out.println(result);
```

<a id="code-math-class"></a>
#### Math Class

```java
public class MathExamples {
    public static void main(String[] args) {
        System.out.println(Math.sqrt(25));
        System.out.println(Math.pow(7, 2));
        System.out.println(Math.PI);
        System.out.println(Math.random());
        System.out.println(Math.round(4.6));
        System.out.println(Math.floor(4.8));
        System.out.println(Math.ceil(4.1));
        System.out.println(Math.abs(-4));
    }
}
```

A random integer from **1 through 10**:

```java
int randomNumber = (int) (Math.random() * 10) + 1;
```

<a id="code-modulus"></a>
#### Modulus

```java
public class ModulusExample {
    public static void main(String[] args) {
        System.out.println(10 % 3);  // 1
        System.out.println(29 % 5);  // 4

        int number = 246;
        System.out.println(number % 2); // 0 means it is even

        int threeDigitNumber = 245;
        System.out.println(threeDigitNumber % 100); // 45
    }
}
```

<a id="code-basic-method"></a>
#### Basic Method

```java
public class MethodExample {

    static void raddish() {
        System.out.println("Hello");
    }

    public static void main(String[] args) {
        raddish();
        raddish();
    }
}
```

A method's code runs when the method is **called**.

<a id="code-local-and-static-variables"></a>
#### Local and Static Variables

```java
public class ScopeExample {

    static String favorite = "I love juice";

    static void myMethod() {
        String fruit = "apple";
        System.out.println(fruit);
    }

    public static void main(String[] args) {
        myMethod();
        System.out.println(favorite);

        // System.out.println(fruit);
        // Error: fruit only exists inside myMethod().
    }
}
```

<a id="code-parameters-and-arguments"></a>
#### Parameters and Arguments

```java
public class ParameterExample {

    static void dog(String color, int age) {
        System.out.println(color + " fur and " + age + " years old.");
    }

    public static void main(String[] args) {
        dog("brown", 5);
        dog("black", 7);
        dog("white", 2);
    }
}
```

In the method declaration, `color` and `age` are **parameters**.

In `dog("brown", 5);`, `"brown"` and `5` are **arguments**.

<a id="code-method-overloading"></a>
#### Method Overloading

```java
public class OverloadingExample {

    static void dog(String color) {
        System.out.println("The dog has " + color + " fur.");
    }

    static void dog(int age) {
        System.out.println("The dog is " + age + " years old.");
    }

    static void dog(String color, int age) {
        System.out.println("The dog has " + color + " fur and is " + age + " years old.");
    }

    public static void main(String[] args) {
        dog("brown");
        dog(5);
        dog("black", 3);
    }
}
```

<a id="code-void-vs-returning-a-value"></a>
#### Void vs. Returning a Value

A `void` method performs an action but does not return a value:

```java
static void printMessage() {
    System.out.println("Hello");
}
```

A non-void method returns a value:

```java
static int getNumber() {
    return 13;
}
```

The returned value can be stored and reused:

```java
int number = getNumber();
System.out.println(number);
```

<a id="code-returning-a-variable"></a>
#### Returning a Variable

```java
public class ReturnExample {

    static int raddish() {
        int pumpkins = 25;
        return pumpkins;
    }

    public static void main(String[] args) {
        int veggie = raddish();
        System.out.println(veggie);
    }
}
```

The return type and the returned value must be compatible.


<a id="code-basic-class"></a>
### Basic Class

A class is a blueprint. This creates the structure but does not create an object.

```java
public class Friend {

    public static void main(String[] args) {

    }
}
```

<a id="code-class-with-instance-fields"></a>
### Class with Instance Fields

Instance fields create places for each object's attributes.

```java
public class Friend {

    public String name;
    public int age;
    public String favoriteColor;

    public static void main(String[] args) {

    }
}
```

<a id="code-constructor-without-parameters"></a>
### Constructor without Parameters

A no-argument constructor can give every new object the same starting values.

```java
public class Car {

    String model;
    String color;
    int speed;

    public Car() {
        model = "Unknown";
        color = "Black";
        speed = 0;
    }

    public static void main(String[] args) {

    }
}
```

<a id="code-constructor-with-parameters"></a>
### Constructor with Parameters

Parameters let each new object receive different starting values.

```java
public class Friend {

    public String name;
    public int age;
    public String favoriteColor;

    public Friend(String friendName, int friendAge, String friendFavoriteColor) {
        name = friendName;
        age = friendAge;
        favoriteColor = friendFavoriteColor;
    }

    public static void main(String[] args) {

    }
}
```

<a id="code-creating-an-object"></a>
### Creating an Object

```java
Friend jasmine = new Friend("Jasmine", 15, "blue");
```

Breakdown:
- `Friend` = class/data type
- `jasmine` = object variable name
- `new` = creates a new object
- `Friend(...)` = constructor call
- `"Jasmine"`, `15`, `"blue"` = arguments

<a id="code-creating-multiple-objects"></a>
### Creating Multiple Objects

```java
Friend jasmine = new Friend("Jasmine", 15, "blue");
Friend tyler = new Friend("Tyler", 17, "green");
Friend perla = new Friend("Perla", 13, "pink");
```

Each object has the same types of fields but can store different values.

<a id="code-accessing-fields-with-dot-notation"></a>
### Accessing Fields with Dot Notation

```java
System.out.println(jasmine.favoriteColor);
System.out.println(perla.age);
System.out.println(tyler.favoriteColor);
System.out.println(jasmine.name);
```

General pattern:

```java
objectName.fieldName
```

<a id="code-calling-a-non-static-method"></a>
### Calling a Non-Static Method

```java
public class Friend {

    public String name;

    public Friend(String friendName) {
        name = friendName;
    }

    public void greeting() {
        System.out.println("Good Morning, " + name + "!");
    }

    public static void main(String[] args) {
        Friend jasmine = new Friend("Jasmine");
        jasmine.greeting();
    }
}
```

<a id="code-static-vs-non-static-methods"></a>
### Static vs Non-Static Methods

**Static method:**

```java
public static void invitation() {
    System.out.println("You are invited");
}
```

Called without creating an object:

```java
invitation();
```

**Non-static method:**

```java
public void greeting() {
    System.out.println("Good Morning, " + name + "!");
}
```

Called on an object:

```java
Friend jasmine = new Friend("Jasmine");
jasmine.greeting();
```

<a id="code-java-comments"></a>
### Java Comments

**Single-line:**
```java
// This is a single-line comment
```

**Multi-line:**
```java
/*
 * This comment can
 * use multiple lines.
 */
```

**Javadoc:**
```java
/**
 * Describes a class, method, constructor, or field.
 */
```


<a id="markdown-style-guide-for-coding-notebooks"></a>
## Markdown Style Guide for Coding Notebooks

Follow this guide to keep your coding notebook **clear, consistent, and professional**.

This ensures your notes are easy for you and others to read later.

---

## Headings

**When to use:** Organize your notebook into sections such as days, topics, or projects.

- `#` for the notebook title. Use this once at the top.
- `##` for each major topic.
- `###` for subsections such as Notes, Practice, or Reflections.

### Example

```markdown
# My Coding Notebook

## Day 1

### Notes

### Practice
```

## Text Formatting

**When to use:** Highlight important ideas or add emphasis.

- Use **bold** for key terms or definitions.
- Use *italics* for emphasis or side comments.
- Use `inline code` for Java keywords, method names, variables, or commands.

### Example

```markdown
**Class** = a blueprint for objects

*Remember:* always test your code.

Use `System.out.println()` to print.
```

## Code Blocks

**When to use:** Anytime you write multiple lines of code.

Use inline code for short snippets and fenced code blocks with the language name for full examples.

### Example

````markdown
```java
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello World!");
    }
}
```
````

## Lists

**When to use:** Organize steps, notes, or key ideas.

Use numbered lists for sequences or steps.

### Example

```markdown
1. Define the class.
2. Write the `main` method.
3. Test your program.
```

Use bulleted lists for items that do not need to be in a specific order.

### Example

```markdown
- Variables
- Loops
- Conditionals
```

## Checklists

**When to use:** Track progress on assignments or tasks.

### Example

```markdown
- [x] Complete coding warm-up
- [ ] Finish project draft
- [ ] Reflect on learning
```

## Blockquotes

**When to use:** Call out notes, reminders, reflections, or teacher comments.

### Example

```markdown
> 💡 Remember: Test your program after making a change.
```

## Tables

**When to use:** Compare values, track progress, or organize data neatly.

### Example

```markdown
| Task | Status | Notes |
|---|---|---|
| Homework 1 | Done | Submitted |
| Homework 2 | Pending | Needs review |
```

## Links & Images

**When to use:** Add references, resources, or visuals.

### Link Example

```markdown
[Java Documentation](https://docs.oracle.com/en/java/)
```

### Image Example

```markdown
![Markdown Logo](https://upload.wikimedia.org/wikipedia/commons/4/48/Markdown-mark.svg)
```

### Make an Image a Link

Place the image between opening and closing link tags.

```html
<a href="website address">

![Image description](image-address)

</a>
```

## Collapsible Sections

**When to use:** Hide solutions, extended notes, vocabulary definitions, or extra details.

### Example

````html
<details>
<summary>Click to reveal solution</summary>

```java
System.out.println("Answer: 42");
```

</details>
````

## Footnotes

**When to use:** Add references or side notes without cluttering the page.

### Example

```markdown
This concept is related to object-oriented programming.[^1]

[^1]: See "Objects and Classes" in your textbook.
```

## Style Rules

### Consistency Matters More Than Creativity

- Always use headings to structure your notes.
- Always use code blocks for multi-line code.
- Keep similar sections formatted the same way.

### Clarity First

- Bold key terms.
- Use lists instead of long sentences when outlining steps.
- Use Java syntax highlighting for Java code.

### Professional Tone

- Keep school and project notes clear and readable.
- Use blockquotes for reflections, reminders, or teacher feedback.

### Track Your Learning

- Use checklists to mark what is complete.
- Use collapsible sections when you want to hide details until you need them.

## Bottom Line

- **Headings** = Structure
- **Bold/Italic** = Emphasis
- **Code blocks** = Code
- **Lists** = Steps and ideas
- **Tables** = Organization
- **Checklists** = Progress
- **Blockquotes** = Notes and tips
- **Collapsible sections** = Hide/show detail

Keep it simple, consistent, and clear.
