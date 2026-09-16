# Java Coding Notebook

## Table of Contents
- [Vocab](#vocab)
- [Code Examples](#code-examples)
  - [Print Statements](#print-statements)
- [Notebook Style Guide](#markdown-style-guide-for-coding-notebooks)

## Vocab

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

<details>
<summary>list</summary>

**Definition:** A collection of values stored together in a specific order.

**Real-life example:** A grocery list stores several items in the order you wrote them down.

**Java example:**
```java
import java.util.ArrayList;

ArrayList<String> groceries = new ArrayList<>();
groceries.add("Bread");
groceries.add("Cheese");
groceries.add("Milk");
```

In Java, an `ArrayList` is a common way to create a list that can grow or shrink.

</details>

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

<details>
<summary>parameter</summary>

**Definition:** A variable listed in a method's definition that receives information when the method is called.

**Real-life example:** A blank on a form tells you what information needs to be supplied, such as a name or age.

**Base structure / syntax:**
```java
returnType methodName(dataType parameterName)
```

**Java example:**
```java
static void greet(String name) {
    System.out.println("Hello, " + name);
}
```

Here, `name` is the parameter.

</details>

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

<details>
<summary>class</summary>

**Definition:** A blueprint that describes the data and behaviors that objects of that type can have.

**Real-life example:** A house blueprint describes how a house should be built, but the blueprint is not the house itself.

**Base structure / syntax:**
```java
class ClassName {

}
```

**Java example:**
```java
class Dog {
    String name;

    void bark() {
        System.out.println("Woof!");
    }
}
```

</details>

<details>
<summary>object</summary>

**Definition:** A specific instance created from a class.

**Real-life example:** If a class is a house blueprint, an object is one actual house built from that blueprint.

**Base structure / syntax:**
```java
ClassName objectName = new ClassName();
```

**Java example:**
```java
Dog myDog = new Dog();
```

</details>

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

<details>
<summary>method</summary>

**Definition:** A reusable block of code that belongs to a class and describes something the class or object can do.

**Real-life example:** A dog can perform actions such as bark, sit, or run.

**Java example:**
```java
class Dog {
    void bark() {
        System.out.println("Woof!");
    }
}
```

`bark()` is a method of the `Dog` class.

</details>

<details>
<summary>constructor</summary>

**Definition:** A special part of a class that runs when a new object is created and is commonly used to give the object its starting values.

**Real-life example:** When a new student enrolls, the school creates a record and fills in starting information such as the student's name and grade level.

**Base structure / syntax:**
```java
ClassName(parameters) {
    // setup code
}
```

**Java example:**
```java
class Dog {
    String name;

    Dog(String dogName) {
        name = dogName;
    }
}
```

A constructor has the **same name as the class** and does **not** have a return type.

</details>

<details>
<summary>abstraction</summary>

**Definition:** Hiding unnecessary details so a programmer or user can focus on what something does instead of every step required to make it work.

**Real-life example:** You can press the gas pedal to make a car move without needing to control every part of the engine yourself.

**Java example:**
```java
class Car {
    void start() {
        checkBattery();
        startEngine();
        System.out.println("Car started");
    }

    private void checkBattery() {
        // hidden internal work
    }

    private void startEngine() {
        // hidden internal work
    }
}
```

Someone using `start()` does not need to know every internal step.

</details>

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

<details>
<summary>Scanner</summary>

**Definition:** A Java class commonly used to read input, such as text or numbers typed by a user.

**Real-life example:** A cashier asks you a question and records the answer you give. A `Scanner` lets a program do something similar with keyboard input.

**Base structure / syntax:**
```java
Scanner input = new Scanner(System.in);
```

**Java example:**
```java
import java.util.Scanner;

public class UserInputExample {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        System.out.print("Enter your name: ");
        String name = input.nextLine();

        System.out.println("Hello, " + name + "!");
    }
}
```

`System.in` represents input coming into the program, and the `Scanner` reads that input.

</details>

## Code Examples

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
