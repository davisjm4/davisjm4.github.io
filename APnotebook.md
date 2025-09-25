# My Coding Notebook

## Table of Contents
- [Binary Notes](#binary-notes)
  - [Binary Conversion Table](#binary-conversion-table)
  - [From Decimal Conversion Table](#convert-from-decimal)
- [Coding](coding)
  - [Code Definitions](#code-definitions)
  - [Pseudocode and Java Table](pseudocode-java-reference)
  - [Variables and dataTypes](#variables-and-datatypes)
- [Notebook Style Guide](#markdown-style-guide-for-coding-notebooks)


## Binary notes
### Binary conversion Table

Convert 110101 from Binary (base 2) to Decimal (base 10)
| Value        | 1   | 1   | 0   | 1   | 0   | 1   |
|--------------|-----|-----|-----|-----|-----|-----|
| base^Exponent (B^E) | 2^5 | 2^4 | 2^3 | 2^2 | 2^1 | 2^0 |  
| (B^E) * value       | 32*1 | 16*1 | 8*0 | 4*1 | 2*0 | 1*1 |    
| Results added       | 32+  | 16+  | 0+  | 4+  | 0+  | 1 |

**Result is 53**

### Convert from decimal

Convert 2989 from decimal (base 10) to hexadecimal (base 16)
| Value/base | 2989/16 | 186/16 | 11/16 |
|------------|----------|---------|--------|
| Result     | 186      | 11      | 0      |   
| Remainder  | D (13)   | A (10)  | B (11) |   

**Result is BAD**


## Coding
### Code Definitions

| Term | Definition | Base Structure / Syntax | Real Life Example | App Example |
|------|------------|--------------------------|-------------------|-------------|
| Variable | A named container used to store a value that may change. | `var x = 5;` | score |  |
|      | A fixed value that cannot change once set. | `const PI = 3.14;` |  |  |
|      | The kind of value a variable holds, like numbers or text. | `int`, `String`, `bool` |  |  |
|      | A sequence of characters used to represent words or text. | `"Hello World"` |  |  |
|      | Whole number values. | `int age = 16;` |  |  |
|      | Number values with decimals. | `double age = 16.2;` |  |  |
|      | A value that can be true or false. | `bool isLoggedIn = false;` |  |  |
|      | A collection of values in a specific order. | `List<String> names = [];` |  |  |
|      | A special value that means “nothing.” | `String? name = null;` |  |  |
|      | A reusable block of code that performs an action. | `void sayHi() { print("Hi"); }` |  |  |
|      | The information passed into a function to change how it works. | `greet(String name)` |  |  |
|      | The result a function gives back. | `return total;` |  |  |
|      | Where a variable or function can be used. | (No set syntax — concept-based) |  |  |
|      | Blueprint for creating objects with specific structure and behavior. | `class Dog {}` |  |  |
|      | A specific version of a class. | `Dog myDog = Dog();` |  |  |
|      | A variable that belongs to a class/object. | `String name;` |  |  |
|      | A function that belongs to a class. | `void bark() {}` |  |  |
|      | A special function used to set up a class when it’s created. | `Dog(this.name);` |  |  |
|      | Hiding the inner workings of code so users only interact with what they need. | (Concept — not specific code) |  |  |
|      | Changing how a built-in or inherited function behaves. | `@override` |  |  |
|      | A function that does not return a value. | `void printMessage() {}` |  |  |







# Pseudocode Java Reference  

| **Concept** | **CSP Pseudocode** | **Java** |
|-------------|--------------------|----------|
| **Variables** | `x ← 5`<br/>`name ← "Alex"` | `int x = 5;`<br/>`String name = "Alex";` |
| **If/Else** | `IF score ≥ 60`<br/>`    DISPLAY "Pass"`<br/>`ELSE`<br/>`    DISPLAY "Fail"` | `if (score >= 60) {`<br/>`    System.out.println("Pass");`<br/>`} else {`<br/>`    System.out.println("Fail");`<br/>`}` |
| **Else If Chains** | `IF score ≥ 90`<br/>`    DISPLAY "A"`<br/>`ELSE IF score ≥ 80`<br/>`    DISPLAY "B"`<br/>`ELSE`<br/>`    DISPLAY "C or below"` | `if (score >= 90) {`<br/>`    System.out.println("A");`<br/>`} else if (score >= 80) {`<br/>`    System.out.println("B");`<br/>`} else {`<br/>`    System.out.println("C or below");`<br/>`}` |
| **For Loop** | `FOR i ← 1 TO 10`<br/>`    DISPLAY i` | `for (int i = 1; i <= 10; i++) {`<br/>`    System.out.println(i);`<br/>`}` |
| **While Loop** | `REPEAT UNTIL guess = secret`<br/>`    guess ← INPUT()` | `while (guess != secret) {`<br/>`    guess = input.nextInt();`<br/>`}` |
| **Lists (ArrayList)** | `numbers ← [2, 4, 6]`<br/>`APPEND 8 TO numbers`<br/>`REMOVE numbers[1]`<br/>`x ← LENGTH(numbers)` | `ArrayList<Integer> numbers = new ArrayList<>();`<br/>`numbers.add(2);`<br/>`numbers.add(4);`<br/>`numbers.add(6);`<br/>`numbers.add(8); // APPEND`<br/>`numbers.remove(1); // REMOVE`<br/>`int x = numbers.size(); // LENGTH` |
| **Traversal (For Each)** | `FOR EACH num IN numbers`<br/>`    DISPLAY num` | `for (int num : numbers) {`<br/>`    System.out.println(num);`<br/>`}` |
| **Traversal (Index)** | `FOR i ← 0 TO LENGTH(numbers)-1`<br/>`    DISPLAY numbers[i]` | `for (int i = 0; i < numbers.size(); i++) {`<br/>`    System.out.println(numbers.get(i));`<br/>`}` |
| **Procedure (Void)** | `PROCEDURE greet(name)`<br/>`    DISPLAY "Hello " + name` | `public static void greet(String name) {`<br/>`    System.out.println("Hello " + name);`<br/>`}` |
| **Procedure (Return)** | `PROCEDURE square(num)`<br/>`    RETURN num * num` | `public static int square(int num) {`<br/>`    return num * num;`<br/>`}` |
| **Procedure (Boolean)** | `PROCEDURE isEven(num)`<br/>`    IF num MOD 2 = 0`<br/>`        RETURN true`<br/>`    ELSE`<br/>`        RETURN false` | `public static boolean isEven(int num) {`<br/>`    if (num % 2 == 0) {`<br/>`        return true;`<br/>`    } else {`<br/>`        return false;`<br/>`    }`<br/>`}` |





## Variables and DataTypes

**Structure of a variable**
```java
// DataType variableName = value;
// = is the assignment operator, spoken as "gets"
String name = "Davisson";
int grade = 10;
double gpa = 3.5;
char initial = 'D';
boolean isOn = false;
```

**Primitive dataType**
Is a value that takes no more than 1 byte
Examples: int, char, boolean, double

**Pointer DataType**
Object dataTypes, they're too big for 1 byte, so instead of storing the data, it stores a pointer, which points to the memory location of the data
Examples: String, ArrayList, and objects created from a class

**Semicolon ;**
Is like a period. It's the end of your code statement.




## Markdown Style Guide for Coding Notebooks

Follow this guide to keep your coding notebook **clear, consistent, and professional**.  
This ensures your notes are easy for you (and others) to read later.

---

## 🔹 Headings
**When to use:** Organize your notebook into sections (like days, topics, or projects).  
- `#` for the notebook title (use once at the top).  
- `##` for each day or major topic.  
- `###` for subsections (like "Notes", "Practice", "Reflections").  

✅ Example:


# My Coding Notebook
## Day 1
### Notes
### Practice

🔡 Text Formatting
When to use: Highlight important ideas or add emphasis.

Use bold for key terms or definitions.

Use italic for emphasis or side comments.

Use inline code for keywords, functions, or commands.

 

✅ Example:

**Class** = a blueprint for objects  
*Remember:* always test your code  
Use `System.out.println()` to print

 

💻 Code Blocks
When to use: Anytime you write multiple lines of code.

Inline code for short snippets.

Fenced code blocks with language for full examples.

✅ Example:

```java
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello World!");
    }
}
```

🧾 Lists
When to use: Organize steps, notes, or key points.

Numbered lists for sequences or steps.

Bulleted lists for unordered ideas.

✅ Example:

1. Define the class
2. Write the main method
3. Test your program

Variables
- Loops
- Conditionals
 

✅ Checklists
When to use: Track progress on assignments or tasks.

✅ Example:

[x] Complete coding warm-up
- [ ] Finish project draft
- [ ] Reflect on learning

 

➡️ Blockquotes
When to use: Call out notes, reminders, or teacher comments.

✅ Example:

> 💡 Remember: Loops repeat code until a condition is false.

 

📊 Tables
When to use: Compare values, track progress, or organize data neatly.

✅ Example:

| Task        | Status   | Notes          |
|-------------|----------|----------------|
| Homework 1  | Done ✅  | Submitted      |
| Homework 2  | Pending  | Needs review   |

 

🔗 Links & Images
When to use: Add references, resources, or visuals.

✅ Example:

[Java Docs](https://docs.oracle.com/javase/8/docs/api/)  
![Markdown Logo](https://upload.wikimedia.org/wikipedia/commons/4/48/Markdown-mark.svg)

 

📂 Collapsible Sections
When to use: Hide solutions, extended notes, or extra details.

✅ Example:

<details>
  <summary>Click to reveal solution</summary>
  
System.out.println("Answer: 42");

</details>

 

📝 Footnotes
When to use: Add references or side notes without cluttering the page.

✅ Example:

This concept is related to object-oriented programming.[^1]

[^1]: See "Objects and Classes" in your textbook.

 

🎯 Style Rules
Consistency matters more than creativity

Always use headings to structure your notes.

Always use code blocks for multi-line code.

Clarity first

Bold key terms.

Use lists instead of long sentences when outlining steps.

Professional tone

Don’t mix casual notes with formal work in the same section.

Use blockquotes for reflections or teacher feedback.

Track your learning

Use checklists to mark what’s done.

Use collapsible sections if you want to hide answers until review time.

 

✅ Bottom Line:

Headings = Structure

Bold/Italic = Emphasis

Code blocks = Code

Lists = Steps/Ideas

Tables = Organization

Checklists = Progress

Blockquotes = Notes/Tips

Collapsible = Hide/Show detail

Keep it simple, consistent, and clear.
