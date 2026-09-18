Table of Contents

<details>
<summary><strong>Vocab</strong></summary>

<ul>
<li>
<details>
<summary><strong>Basics</strong></summary>
<ul>
<li><a href="#algorithm">algorithm</a></li>
<li><a href="#sequencing">sequencing</a></li>
<li><a href="#variable">variable</a></li>
<li><a href="#variable-declaration">variable declaration</a></li>
<li><a href="#variable-initialization">variable initialization</a></li>
<li><a href="#assignment">assignment</a></li>
<li><a href="#data-types">data types</a></li>
<li><a href="#string">String</a></li>
<li><a href="#int">int</a></li>
<li><a href="#double">double</a></li>
<li><a href="#boolean">boolean</a></li>
<li><a href="#console-output">console / output</a></li>
<li><a href="#concatenation">concatenation</a></li>
<li><a href="#type-conversion-casting">type conversion / casting</a></li>
</ul>
</details>
</li>
<li>
<details>
<summary><strong>Methods</strong></summary>
<ul>
<li><a href="#method">method</a></li>
<li><a href="#method-declaration">method declaration</a></li>
<li><a href="#method-call">method call</a></li>
<li><a href="#parameter">parameter</a></li>
<li><a href="#argument">argument</a></li>
<li><a href="#void">void</a></li>
<li><a href="#return-type">return type</a></li>
<li><a href="#return-statement">return statement</a></li>
<li><a href="#scope-local-variable">scope / local variable</a></li>
<li><a href="#method-overloading">method overloading</a></li>
</ul>
</details>
</li>
<li>
<details>
<summary><strong>User Input</strong></summary>
<ul>
<li><a href="#scanner">Scanner</a></li>
<li><a href="#user-input">user input</a></li>
<li><a href="#scanner-input-methods">Scanner input methods</a></li>
</ul>
</details>
</li>
<li>
<details>
<summary><strong>Operators</strong></summary>
<ul>
<li><a href="#arithmetic-operators">arithmetic operators</a></li>
<li><a href="#modulus">modulus (%)</a></li>
<li><a href="#increment-decrement">increment / decrement</a></li>
<li><a href="#compound-assignment">compound assignment</a></li>
<li><a href="#comparison-operators">comparison operators</a></li>
</ul>
</details>
</li>
<li>
<details>
<summary><strong>Control Structures</strong></summary>
<ul>
<li><a href="#conditional-statement">conditional statement</a></li>
<li><a href="#if-statement">if statement</a></li>
<li><a href="#if-else">if / else</a></li>
<li><a href="#if-else-if-else">if / else if / else</a></li>
<li><a href="#nested-if-statement">nested if statement</a></li>
<li><a href="#logical-operators">logical operators</a></li>
<li><a href="#compound-boolean-expression">compound boolean expression</a></li>
<li><a href="#de-morgans-law">De Morgan&#x27;s Law</a></li>
<li><a href="#for-loop">for loop</a></li>
<li><a href="#while-loop">while loop</a></li>
<li><a href="#infinite-loop">infinite loop</a></li>
</ul>
</details>
</li>
<li>
<details>
<summary><strong>Classes &amp; Objects</strong></summary>
<ul>
<li><a href="#class">class</a></li>
<li><a href="#object">object</a></li>
<li><a href="#instance">instance</a></li>
<li><a href="#instance-field">instance field</a></li>
<li><a href="#constructor">constructor</a></li>
<li><a href="#constructor-parameter">constructor parameter</a></li>
<li><a href="#new-keyword">new keyword</a></li>
<li><a href="#dot-notation">dot notation</a></li>
<li><a href="#static-vs-non-static-methods">static vs. non-static methods</a></li>
<li><a href="#abstraction">abstraction</a></li>
</ul>
</details>
</li>
<li>
<details>
<summary><strong>Useful Java Tools</strong></summary>
<ul>
<li><a href="#math-class">Math class</a></li>
<li><a href="#math-random">Math.random()</a></li>
</ul>
</details>
</li>
</ul>

</details>

<details>
<summary><strong>Code Examples</strong></summary>

<ul>
<li><a href="#code-starter-program">Starter Program</a></li>
<li><a href="#code-variables-and-updating-values">Variables and Updating Values</a></li>
<li><a href="#code-strings-and-concatenation">Strings and Concatenation</a></li>
<li><a href="#code-user-input">User Input</a></li>
<li><a href="#code-comparison-operators">Comparison Operators</a></li>
<li><a href="#code-if-statement">If Statement</a></li>
<li><a href="#code-if-else">If / Else</a></li>
<li><a href="#code-if-else-if-else">If / Else If / Else</a></li>
<li><a href="#code-compound-booleans">Compound Booleans</a></li>
<li><a href="#code-de-morgans-law">De Morgan&#x27;s Law</a></li>
<li><a href="#code-for-loop">For Loop</a></li>
<li><a href="#code-while-loop">While Loop</a></li>
<li><a href="#code-arithmetic-and-modulus">Arithmetic and Modulus</a></li>
<li><a href="#code-method-with-parameters">Method with Parameters</a></li>
<li><a href="#code-method-that-returns-a-value">Method that Returns a Value</a></li>
<li><a href="#code-scope">Scope</a></li>
<li><a href="#code-method-overloading">Method Overloading</a></li>
<li><a href="#code-class-with-instance-fields">Class with Instance Fields</a></li>
<li><a href="#code-constructor-and-object-creation">Constructor and Object Creation</a></li>
<li><a href="#code-dot-notation-and-non-static-method">Dot Notation and Non-Static Method</a></li>
</ul>

</details>

<a href="#notebook-style-guide">Notebook Style Guide</a>

<a id="vocab"></a>

Vocab

<a id="section-basics"></a>

Basics

<details markdown="1">
<summary id="algorithm">algorithm</summary>

Definition: A step-by-step process used to complete a task or solve a problem.

Java example:

int total = price1 + price2;
System.out.println(total);

</details>

<details markdown="1">
<summary id="sequencing">sequencing</summary>

Definition: The order in which instructions are completed. Changing the order can change the result.

</details>

<details markdown="1">
<summary id="variable">variable</summary>

Definition: A named storage location that holds a value that can change.

Java example:

int score = 10;
score = 15;

</details>

<details markdown="1">
<summary id="variable-declaration">variable declaration</summary>

Definition: Creating a variable by giving Java its data type and name.

Structure / syntax:

dataType variableName;
```java

**Java example:**

```java
String weather;

</details>

<details markdown="1">
<summary id="variable-initialization">variable initialization</summary>

Definition: Giving a variable its first value when it is created.

Structure / syntax:

dataType variableName = value;
```java

**Java example:**

```java
String weather = "sunny";

</details>

<details markdown="1">
<summary id="assignment">assignment</summary>

Definition: Using = to store or replace a value in a variable.

Java example:

weather = "rainy";

</details>

<details markdown="1">
<summary id="data-types">data types</summary>

Definition: Categories that tell Java what kind of value a variable can store.

Java example:

String name = "Alex";
int age = 16;
double height = 5.8;
boolean hasPermit = true;

</details>

<details markdown="1">
<summary id="string">String</summary>

Definition: A Java type used to store text.

Java example:

String playerName = "Alex";

</details>

<details markdown="1">
<summary id="int">int</summary>

Definition: A Java type used to store whole numbers.

Java example:

int lives = 3;

</details>

<details markdown="1">
<summary id="double">double</summary>

Definition: A Java type used to store numbers that may contain decimals.

Java example:

double price = 12.99;

</details>

<details markdown="1">
<summary id="boolean">boolean</summary>

Definition: A Java type that stores only true or false.

Java example:

boolean isLoggedIn = false;

</details>

<details markdown="1">
<summary id="console-output">console / output</summary>

Definition: The console displays information produced by a program. Information sent out by a program is output.

Java example:

System.out.println("Hello World!");

</details>

<details markdown="1">
<summary id="concatenation">concatenation</summary>

Definition: Combining Strings together with the + operator.

Java example:

String fullName = firstName + " " + lastName;

</details>

<details markdown="1">
<summary id="type-conversion-casting">type conversion / casting</summary>

Definition: Changing a value from one data type to another.

Java example:

int age = Integer.parseInt("16");
double price = 19.99;
int wholePrice = (int) price;
```java

Casting a `double` to an `int` removes the decimal portion; it does not round.

</details>

<a id="section-methods"></a>
### Methods

<details markdown="1">
<summary id="method">method</summary>

**Definition:** A reusable block of code that performs a task.

**Java example:**

```java
static void sayHi() {
    System.out.println("Hi!");
}

</details>

<details markdown="1">
<summary id="method-declaration">method declaration</summary>

Definition: The code that defines a method's name, return type, parameters, and body.

Java example:

static void greet(String name) {
    System.out.println("Hello, " + name);
}

</details>

<details markdown="1">
<summary id="method-call">method call</summary>

Definition: An instruction that tells Java to run a method.

Java example:

greet("Jordan");

</details>

<details markdown="1">
<summary id="parameter">parameter</summary>

Definition: A variable listed in a method declaration that receives information.

Java example:

static void greet(String name) {
    System.out.println("Hello, " + name);
}

</details>

<details markdown="1">
<summary id="argument">argument</summary>

Definition: A value supplied to a method when it is called.

Java example:

greet("Jordan");

</details>

<details markdown="1">
<summary id="void">void</summary>

Definition: A method return type that means the method does not send a value back.

Java example:

static void printMessage() {
    System.out.println("Hello");
}

</details>

<details markdown="1">
<summary id="return-type">return type</summary>

Definition: The data type written before a method name that tells Java what type of value the method returns.

Java example:

static int getScore() {
    return 100;
}

</details>

<details markdown="1">
<summary id="return-statement">return statement</summary>

Definition: Sends a value back from a method and ends that method.

Java example:

static int add(int a, int b) {
    return a + b;
}

</details>

<details markdown="1">
<summary id="scope-local-variable">scope / local variable</summary>

Definition: Scope is where a name can be used. A local variable exists only inside the method or block where it is declared.

Java example:

static void example() {
    int score = 10;
    System.out.println(score);
}
// score cannot be used here

</details>

<details markdown="1">
<summary id="method-overloading">method overloading</summary>

Definition: Creating multiple methods with the same name but different parameter lists.

Java example:

static void show(int number) { }
static void show(String text) { }

</details>

<a id="section-user-input"></a>

User Input

<details markdown="1">
<summary id="scanner">Scanner</summary>

Definition: A Java class commonly used to read keyboard input.

Java example:

import java.util.Scanner;

Scanner input = new Scanner(System.in);

</details>

<details markdown="1">
<summary id="user-input">user input</summary>

Definition: Information entered into a program by the user while the program is running.

Java example:

System.out.print("Enter your age: ");
int age = input.nextInt();

</details>

<details markdown="1">
<summary id="scanner-input-methods">Scanner input methods</summary>

Definition: Methods used to read different kinds of input with a Scanner.

Java example:

String name = input.nextLine();
int age = input.nextInt();
double price = input.nextDouble();
```java

`nextLine()` reads text, `nextInt()` reads an integer, and `nextDouble()` reads a decimal number.

</details>

<a id="section-operators"></a>
### Operators

<details markdown="1">
<summary id="arithmetic-operators">arithmetic operators</summary>

**Definition:** Operators used for math: `+`, `-`, `*`, and `/`.

**Java example:**

```java
int total = 5 + 2;
int product = 5 * 2;
double quotient = 5.0 / 2.0;

</details>

<details markdown="1">
<summary id="modulus">modulus (%)</summary>

Definition: Returns the remainder after division.

Java example:

System.out.println(10 % 3); // 1

</details>

<details markdown="1">
<summary id="increment-decrement">increment / decrement</summary>

Definition: ++ increases by 1. -- decreases by 1.

Java example:

score++;
lives--;

</details>

<details markdown="1">
<summary id="compound-assignment">compound assignment</summary>

Definition: Combines an operation with assignment, such as +=, -=, *=, and /=.

Java example:

score += 5;
health -= 10;

</details>

<details markdown="1">
<summary id="comparison-operators">comparison operators</summary>

Definition: Compare two values and produce true or false: ==, !=, <, >, <=, >=.

Java example:

System.out.println(score >= 70);
System.out.println(lives != 0);

</details>

<a id="section-control-structures"></a>

Control Structures

<details markdown="1">
<summary id="conditional-statement">conditional statement</summary>

Definition: A statement that makes a decision based on a boolean condition.

Java example:

if (temperature < 50) {
    System.out.println("Wear a jacket.");
}

</details>

<details markdown="1">
<summary id="if-statement">if statement</summary>

Definition: Runs a block of code only when its condition is true.

Java example:

if (score >= 90) {
    System.out.println("A");
}

</details>

<details markdown="1">
<summary id="if-else">if / else</summary>

Definition: Chooses between two paths.

Java example:

if (age >= 18) {
    System.out.println("Adult");
} else {
    System.out.println("Minor");
}

</details>

<details markdown="1">
<summary id="if-else-if-else">if / else if / else</summary>

Definition: Checks multiple conditions in order and runs the first matching branch.

Java example:

if (score >= 90) {
    System.out.println("A");
} else if (score >= 80) {
    System.out.println("B");
} else {
    System.out.println("Below B");
}

</details>

<details markdown="1">
<summary id="nested-if-statement">nested if statement</summary>

Definition: An if statement placed inside another conditional statement.

Java example:

if (age >= 16) {
    if (hasPermit) {
        System.out.println("Can practice driving");
    }
}

</details>

<details markdown="1">
<summary id="logical-operators">logical operators</summary>

Definition: Operators used with booleans: && means AND, || means OR, and ! means NOT.

Java example:

boolean canDrive = age >= 16 && hasPermit;
boolean canEnter = hasID || hasPass;
boolean unlocked = !isLocked;

</details>

<details markdown="1">
<summary id="compound-boolean-expression">compound boolean expression</summary>

Definition: A boolean expression made by combining two or more conditions.

Java example:

boolean eligible = age >= 16 && hasPermit;

</details>

<details markdown="1">
<summary id="de-morgans-law">De Morgan&#x27;s Law</summary>

Definition: Rules for rewriting negated compound boolean expressions.

Java example:

!(A && B)  // same as !A || !B
!(A || B)  // same as !A && !B

</details>

<details markdown="1">
<summary id="for-loop">for loop</summary>

Definition: A loop commonly used when initialization, condition, and update can be written together.

Structure / syntax:

for (initialization; condition; update) {
    // repeated code
}
```java

**Java example:**

```java
for (int i = 0; i < 5; i++) {
    System.out.println(i);
}

</details>

<details markdown="1">
<summary id="while-loop">while loop</summary>

Definition: A loop that repeats while its condition remains true.

Java example:

int count = 0;
while (count < 5) {
    System.out.println(count);
    count++;
}

</details>

<details markdown="1">
<summary id="infinite-loop">infinite loop</summary>

Definition: A loop that never stops because its condition never becomes false.

Java example:

int count = 0;
while (count < 5) {
    System.out.println(count);
    // count never changes
}

</details>

<a id="section-classes-objects"></a>

Classes & Objects

<details markdown="1">
<summary id="class">class</summary>

Definition: A blueprint that describes the data and behaviors objects of that type can have.

Java example:

public class Friend {

}

</details>

<details markdown="1">
<summary id="object">object</summary>

Definition: A specific object created from a class.

Java example:

Friend jasmine = new Friend("Jasmine", 15);

</details>

<details markdown="1">
<summary id="instance">instance</summary>

Definition: Another name for an object created from a class.

Java example:

Friend jasmine = new Friend("Jasmine", 15);

</details>

<details markdown="1">
<summary id="instance-field">instance field</summary>

Definition: A variable declared in a class that stores information for each object.

Java example:

public class Friend {
    String name;
    int age;
}

</details>

<details markdown="1">
<summary id="constructor">constructor</summary>

Definition: A special part of a class that runs when a new object is created and usually gives it starting values.

Structure / syntax:

public ClassName(parameters) {
    // setup code
}
```java

**Java example:**

```java
public Friend(String friendName, int friendAge) {
    name = friendName;
    age = friendAge;
}

</details>

<details markdown="1">
<summary id="constructor-parameter">constructor parameter</summary>

Definition: A parameter in a constructor that receives a value when a new object is created.

Java example:

public Friend(String friendName, int friendAge) {
    name = friendName;
    age = friendAge;
}

</details>

<details markdown="1">
<summary id="new-keyword">new keyword</summary>

Definition: The keyword used to create a new object from a class.

Java example:

Friend jasmine = new Friend("Jasmine", 15);

</details>

<details markdown="1">
<summary id="dot-notation">dot notation</summary>

Definition: Using a dot after an object name to access one of its fields or methods.

Java example:

System.out.println(jasmine.name);
jasmine.greeting();

</details>

<details markdown="1">
<summary id="static-vs-non-static-methods">static vs. non-static methods</summary>

Definition: A static method belongs to the class. A non-static method belongs to an object and can directly use that object's instance fields.

Java example:

static void classMessage() {
    System.out.println("Class method");
}

void greeting() {
    System.out.println("Hello, " + name);
}

</details>

<details markdown="1">
<summary id="abstraction">abstraction</summary>

Definition: Using a simpler name or interface without handling all internal details every time.

Java example:

Friend jasmine = new Friend("Jasmine", 15);
System.out.println(jasmine.name);

</details>

<a id="section-useful-java-tools"></a>

Useful Java Tools

<details markdown="1">
<summary id="math-class">Math class</summary>

Definition: A built-in Java class containing useful static math methods and constants.

Java example:

double root = Math.sqrt(25);
double power = Math.pow(2, 3);
double absolute = Math.abs(-7);

</details>

<details markdown="1">
<summary id="math-random">Math.random()</summary>

Definition: Returns a random double from 0.0 up to, but not including, 1.0.

Java example:

int randomNumber = (int) (Math.random() * 10) + 1;
```java

This example creates a random integer from 1 through 10.

</details>

<a id="code-examples"></a>
## Code Examples

<a id="code-starter-program"></a>
### Starter Program

```java
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello World!");
    }
}

<a id="code-variables-and-updating-values"></a>

Variables and Updating Values

int score = 10;
score = 15;
System.out.println(score);

<a id="code-strings-and-concatenation"></a>

Strings and Concatenation

String firstName = "Dev";
String lastName = "Cat";
System.out.println(firstName + " " + lastName);

<a id="code-user-input"></a>

User Input

import java.util.Scanner;

Scanner input = new Scanner(System.in);
System.out.print("Enter your name: ");
String name = input.nextLine();

<a id="code-comparison-operators"></a>

Comparison Operators

int score = 85;
System.out.println(score == 85);
System.out.println(score != 100);
System.out.println(score >= 70);

<a id="code-if-statement"></a>

If Statement

if (score >= 90) {
    System.out.println("A");
}

<a id="code-if-else"></a>

If / Else

if (age >= 18) {
    System.out.println("Adult");
} else {
    System.out.println("Minor");
}

<a id="code-if-else-if-else"></a>

If / Else If / Else

if (score >= 90) {
    System.out.println("A");
} else if (score >= 80) {
    System.out.println("B");
} else {
    System.out.println("Below B");
}

<a id="code-compound-booleans"></a>

Compound Booleans

boolean canDrive = age >= 16 && hasPermit;
boolean canEnter = hasID || hasPass;
boolean lockedOut = !hasAccess;

<a id="code-de-morgans-law"></a>

De Morgan's Law

!(A && B)   // same as !A || !B
!(A || B)   // same as !A && !B

<a id="code-for-loop"></a>

For Loop

for (int i = 0; i < 5; i++) {
    System.out.println(i);
}

<a id="code-while-loop"></a>

While Loop

int count = 0;
while (count < 5) {
    System.out.println(count);
    count++;
}

<a id="code-arithmetic-and-modulus"></a>

Arithmetic and Modulus

int total = 7 + 3;
int product = 7 * 3;
int remainder = 10 % 3;

<a id="code-method-with-parameters"></a>

Method with Parameters

static void greet(String name) {
    System.out.println("Hello, " + name);
}

greet("Jordan");

<a id="code-method-that-returns-a-value"></a>

Method that Returns a Value

static int add(int a, int b) {
    return a + b;
}

int total = add(4, 6);

<a id="code-scope"></a>

Scope

static void example() {
    int score = 10;
}
// score cannot be used here

<a id="code-method-overloading"></a>

Method Overloading

static void show(int number) { }
static void show(String text) { }

<a id="code-class-with-instance-fields"></a>

Class with Instance Fields

public class Friend {
    String name;
    int age;
}

<a id="code-constructor-and-object-creation"></a>

Constructor and Object Creation

public class Friend {
    String name;
    int age;

    public Friend(String friendName, int friendAge) {
        name = friendName;
        age = friendAge;
    }

    public static void main(String[] args) {
        Friend jasmine = new Friend("Jasmine", 15);
    }
}

<a id="code-dot-notation-and-non-static-method"></a>

Dot Notation and Non-Static Method

public void greeting() {
    System.out.println("Hello, " + name);
}

Friend jasmine = new Friend("Jasmine", 15);
System.out.println(jasmine.name);
jasmine.greeting();

<a id="notebook-style-guide"></a>

Notebook Style Guide

Keep your notebook useful for you. Add examples, corrections, and notes as you learn.

Use ## for major topics and ### for subsections.

Use bold for important ideas.

Use inline code for short Java syntax.

Use fenced java code blocks for multi-line examples.

Add comments when they explain why something is happening.

Keep examples small enough that you can quickly understand them later.

When you make a mistake, add the corrected example if it will help you avoid the same mistake again.

Bottom Line

Definitions tell you what something means. Code examples show you how to use it. Your notebook should have both.
