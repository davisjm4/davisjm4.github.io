# Generated review samples

Five challenges for each of the 39 mode/difficulty combinations (195 total), produced by `node class-object-lab/tests/gen-samples.mjs` with fixed seeds. Within a cell the script prefers different semantic families and reasoning configurations. Each distractor is listed with the misconception model that produced it.

## Class versus object (`structure`)

### Beginner

#### structure · Beginner · sample 1 — `structure.refersto`

Complexity score 23; features: alias, reassign-after-alias.

```java
class Robot {
    private int steps;

    public Robot(int start) {
        steps = start;
    }
}

Robot scout = new Robot(5);
Robot probe = new Robot(14);
Robot rover = probe;
probe = scout;
```

*The statements after the class run in order inside main.*

**After this code runs, which object does probe refer to?**

A. `a separate copy of the object created by new Robot(5)` — Treats an alias as a separate copy (`aliasCopies`)
B. `a new object created by the assignment` — Thinks copying a reference creates an object (`aliasCreates`)
C. `the object created by new Robot(5)` — **correct**
D. `the object created by new Robot(14)` — Assumes the newest object (`latestObject`)

Explanation: A reference variable holds a reference to an object (or null). Assigning one variable to another copies the reference at that moment; it does not link the two variables. Answer: the object created by new Robot(5).

Trace: `Robot scout = new Robot(5);` → creates Object #1 (Robot: steps = 5); scout refers to Object #1; `Robot probe = new Robot(14);` → creates Object #2 (Robot: steps = 14); probe refers to Object #2; `Robot rover = probe;` → rover refers to Object #2 (the same object as probe); `probe = scout;` → probe refers to Object #1 (the same object as scout)

#### structure · Beginner · sample 2 — `structure.refersto`

Complexity score 19; features: alias.

```java
class Book {
    private int pagesRead;

    public Book(int start) {
        pagesRead = start;
    }
}

Book novel = new Book(9);
Book diary = novel;
Book comic = new Book(11);
```

*The statements after the class run in order inside main.*

**After this code runs, which object does diary refer to?**

A. `the object created by new Book(9)` — **correct**
B. `the object created by new Book(11)` — Assumes the newest object (`latestObject`)
C. `a separate copy of the object created by new Book(9)` — Treats an alias as a separate copy (`aliasCopies`)
D. `a new object created by the assignment` — Thinks copying a reference creates an object (`aliasCreates`)

Explanation: A reference variable holds a reference to an object (or null). Assigning one variable to another copies the reference at that moment; it does not link the two variables. Answer: the object created by new Book(9).

Trace: `Book novel = new Book(9);` → creates Object #1 (Book: pagesRead = 9); novel refers to Object #1; `Book diary = novel;` → diary refers to Object #1 (the same object as novel); `Book comic = new Book(11);` → creates Object #2 (Book: pagesRead = 11); comic refers to Object #2

#### structure · Beginner · sample 3 — `structure.refersto`

Complexity score 21; features: alias.

```java
class Lamp {
    private int brightness;

    public Lamp(int start) {
        brightness = start;
    }
}

Lamp desk = new Lamp(5);
Lamp hall = desk;
Lamp porch = new Lamp(13);
Lamp night = porch;
```

*The statements after the class run in order inside main.*

**After this code runs, which object does night refer to?**

A. `a separate copy of the object created by new Lamp(13)` — Treats an alias as a separate copy (`aliasCopies`)
B. `a new object created by the assignment` — Thinks copying a reference creates an object (`aliasCreates`)
C. `the object created by new Lamp(5)` — Assumes the first object created (`firstObject`)
D. `the object created by new Lamp(13)` — **correct**

Explanation: A reference variable holds a reference to an object (or null). Assigning one variable to another copies the reference at that moment; it does not link the two variables. Answer: the object created by new Lamp(13).

Trace: `Lamp desk = new Lamp(5);` → creates Object #1 (Lamp: brightness = 5); desk refers to Object #1; `Lamp hall = desk;` → hall refers to Object #1 (the same object as desk); `Lamp porch = new Lamp(13);` → creates Object #2 (Lamp: brightness = 13); porch refers to Object #2; `Lamp night = porch;` → night refers to Object #2 (the same object as porch)

#### structure · Beginner · sample 4 — `structure.count`

Complexity score 20; features: alias, null.

```java
class Tank {
    private int level;

    public Tank(int start) {
        level = start;
    }
}

Tank tankD = null;
Tank tankB = new Tank(11);
Tank tankE = null;
Tank tankA = tankB;
```

*The statements after the class run in order inside main.*

**How many Tank objects are created when this code runs?**

A. `3` — Thinks null is an empty object (`nullIsObject`)
B. `1` — **correct**
C. `2` — Thinks copying a reference creates an object (`aliasCreates`)
D. `4` — Counts variables as objects (`variablesAreObjects`)

Explanation: Only a new expression creates an object (including a new that runs inside a method). Declaring a variable, assigning null, and copying a reference create nothing. The answer is 1.

Trace: `Tank tankD = null;` → tankD is now null; `Tank tankB = new Tank(11);` → creates Object #1 (Tank: level = 11); tankB refers to Object #1; `Tank tankE = null;` → tankE is now null; `Tank tankA = tankB;` → tankA refers to Object #1 (the same object as tankB)

#### structure · Beginner · sample 5 — `structure.count`

Complexity score 25; features: alias, null.

```java
class Book {
    private int pagesRead;

    public Book(int start) {
        pagesRead = start;
    }
}

Book guide = new Book(18);
Book atlas = guide;
Book diary = null;
Book comic;
new Book(5);
```

*The statements after the class run in order inside main.*

**How many Book objects are created when this code runs?**

A. `2` — **correct**
B. `4` — Counts variables as objects (`variablesAreObjects`)
C. `3` — Thinks copying a reference creates an object (`aliasCreates`)
D. `1` — Ignores objects that are not stored (`ignoresTemporaries`)

Explanation: Only a new expression creates an object (including a new that runs inside a method). Declaring a variable, assigning null, and copying a reference create nothing. The answer is 2.

Trace: `Book guide = new Book(18);` → creates Object #1 (Book: pagesRead = 18); guide refers to Object #1; `Book atlas = guide;` → atlas refers to Object #1 (the same object as guide); `Book diary = null;` → diary is now null; `Book comic;` → comic is declared but refers to no object; `new Book(5);` → creates Object #2 (Book: pagesRead = 5)

### Intermediate

#### structure · Intermediate · sample 1 — `structure.count`

Complexity score 26; features: alias, multi-alias, reassign-after-alias.

```java
class Plant {
    private int height;

    public Plant(int start) {
        height = start;
    }
}

Plant fern = new Plant(2);
fern = new Plant(3);
Plant oak = fern;
Plant moss = fern;
```

*The statements after the class run in order inside main.*

**How many Plant objects are created when this code runs?**

A. `3` — Counts variables as objects (`variablesAreObjects`)
B. `1` — Confuses created with still referenced (`createdVsReachable`)
C. `4` — Thinks copying a reference creates an object (`aliasCreates`)
D. `2` — **correct**

Explanation: Only a new expression creates an object (including a new that runs inside a method). Declaring a variable, assigning null, and copying a reference create nothing. The answer is 2.

Trace: `Plant fern = new Plant(2);` → creates Object #1 (Plant: height = 2); fern refers to Object #1; `fern = new Plant(3);` → creates Object #2 (Plant: height = 3); fern refers to Object #2; `Plant oak = fern;` → oak refers to Object #2 (the same object as fern); `Plant moss = fern;` → moss refers to Object #2 (the same object as fern and oak)

#### structure · Intermediate · sample 2 — `structure.refersto`

Complexity score 30; features: alias, reassign-after-alias, three-objects.

```java
class Book {
    private int pagesRead;

    public Book(int start) {
        pagesRead = start;
    }
}

Book novel = new Book(16);
Book diary = new Book(9);
Book comic = diary;
comic = new Book(4);
comic = novel;
```

*The statements after the class run in order inside main.*

**After this code runs, which object does comic refer to?**

A. `a new object created by the assignment` — Thinks copying a reference creates an object (`aliasCreates`)
B. `a separate copy of the object created by new Book(16)` — Treats an alias as a separate copy (`aliasCopies`)
C. `the object created by new Book(4)` — Assumes the newest object (`latestObject`)
D. `the object created by new Book(16)` — **correct**

Explanation: A reference variable holds a reference to an object (or null). Assigning one variable to another copies the reference at that moment; it does not link the two variables. Answer: the object created by new Book(16).

Trace: `Book novel = new Book(16);` → creates Object #1 (Book: pagesRead = 16); novel refers to Object #1; `Book diary = new Book(9);` → creates Object #2 (Book: pagesRead = 9); diary refers to Object #2; `Book comic = diary;` → comic refers to Object #2 (the same object as diary); `comic = new Book(4);` → creates Object #3 (Book: pagesRead = 4); comic refers to Object #3; `comic = novel;` → comic refers to Object #1 (the same object as novel)

#### structure · Intermediate · sample 3 — `structure.refersto`

Complexity score 26; features: alias, null, reassign-after-alias.

```java
class Plant {
    private int height;

    public Plant(int start) {
        height = start;
    }
}

Plant palm = new Plant(7);
Plant ivy = palm;
Plant oak = null;
oak = new Plant(8);
palm = oak;
```

*The statements after the class run in order inside main.*

**After this code runs, which object does palm refer to?**

A. `a separate copy of the object created by new Plant(8)` — Treats an alias as a separate copy (`aliasCopies`)
B. `a new object created by the assignment` — Thinks copying a reference creates an object (`aliasCreates`)
C. `the object created by new Plant(7)` — Assumes the first object created (`firstObject`)
D. `the object created by new Plant(8)` — **correct**

Explanation: A reference variable holds a reference to an object (or null). Assigning one variable to another copies the reference at that moment; it does not link the two variables. Answer: the object created by new Plant(8).

Trace: `Plant palm = new Plant(7);` → creates Object #1 (Plant: height = 7); palm refers to Object #1; `Plant ivy = palm;` → ivy refers to Object #1 (the same object as palm); `Plant oak = null;` → oak is now null; `oak = new Plant(8);` → creates Object #2 (Plant: height = 8); oak refers to Object #2; `palm = oak;` → palm refers to Object #2 (the same object as oak)

#### structure · Intermediate · sample 4 — `structure.refersto`

Complexity score 30; features: alias, reassign-after-alias, three-objects.

```java
class Timer {
    private int seconds;

    public Timer(int start) {
        seconds = start;
    }
}

Timer alarm = new Timer(12);
Timer oven = new Timer(6);
Timer timer = alarm;
alarm = new Timer(4);
oven = timer;
```

*The statements after the class run in order inside main.*

**After this code runs, which object does oven refer to?**

A. `a new object created by the assignment` — Thinks copying a reference creates an object (`aliasCreates`)
B. `the object created by new Timer(4)` — Thinks a variable stays linked to another variable (`aliasFollowsVariable`)
C. `a separate copy of the object created by new Timer(12)` — Treats an alias as a separate copy (`aliasCopies`)
D. `the object created by new Timer(12)` — **correct**

Explanation: A reference variable holds a reference to an object (or null). Assigning one variable to another copies the reference at that moment; it does not link the two variables. Answer: the object created by new Timer(12).

Trace: `Timer alarm = new Timer(12);` → creates Object #1 (Timer: seconds = 12); alarm refers to Object #1; `Timer oven = new Timer(6);` → creates Object #2 (Timer: seconds = 6); oven refers to Object #2; `Timer timer = alarm;` → timer refers to Object #1 (the same object as alarm); `alarm = new Timer(4);` → creates Object #3 (Timer: seconds = 4); alarm refers to Object #3; `oven = timer;` → oven refers to Object #1 (the same object as timer)

#### structure · Intermediate · sample 5 — `structure.count`

Complexity score 37; features: alias, multi-alias, reassign-after-alias, returns-reference, three-objects.

```java
class Robot {
    private int steps;

    public Robot(int start) {
        steps = start;
    }

    public Robot copy() {
        return new Robot(steps);
    }
}

Robot bot = new Robot(18);
Robot probe = new Robot(11);
Robot rover = probe.copy();
rover = bot;
probe = bot;
```

*The statements after the class run in order inside main.*

**How many Robot objects are created when this code runs?**

A. `5` — Thinks copying a reference creates an object (`aliasCreates`)
B. `2` — Ignores objects that are not stored (`ignoresTemporaries`)
C. `1` — Confuses created with still referenced (`createdVsReachable`)
D. `3` — **correct**

Explanation: Only a new expression creates an object (including a new that runs inside a method). Declaring a variable, assigning null, and copying a reference create nothing. The answer is 3.

Trace: `Robot bot = new Robot(18);` → creates Object #1 (Robot: steps = 18); bot refers to Object #1; `Robot probe = new Robot(11);` → creates Object #2 (Robot: steps = 11); probe refers to Object #2; `Robot rover = probe.copy();` → creates Object #3 (Robot: steps = 11); rover refers to Object #3; `rover = bot;` → rover refers to Object #1 (the same object as bot); `probe = bot;` → probe refers to Object #1 (the same object as bot and rover)

### Advanced

#### structure · Advanced · sample 1 — `structure.count`

Complexity score 38; features: alias, reassign-after-alias, returns-reference, three-objects.

```java
class Lamp {
    private int brightness;

    public Lamp(int start) {
        brightness = start;
    }

    public Lamp copy() {
        return new Lamp(brightness);
    }
}

static Lamp same(Lamp x) {
    return x;
}

Lamp floor = new Lamp(7);
floor = floor.copy();
Lamp night = same(floor);
night = floor.copy();
night = floor;
```

*The statements after the class run in order inside main. The static methods shown outside the class are in the same class as main.*

**How many Lamp objects are created when this code runs?**

A. `2` — Counts variables as objects (`variablesAreObjects`)
B. `3` — **correct**
C. `1` — Ignores objects that are not stored (`ignoresTemporaries`)
D. `5` — Thinks copying a reference creates an object (`aliasCreates`)

Explanation: Only a new expression creates an object (including a new that runs inside a method). Declaring a variable, assigning null, and copying a reference create nothing. The answer is 3.

Trace: `Lamp floor = new Lamp(7);` → creates Object #1 (Lamp: brightness = 7); floor refers to Object #1; `floor = floor.copy();` → creates Object #2 (Lamp: brightness = 7); floor refers to Object #2; `Lamp night = same(floor);` → night refers to Object #2 (the same object as floor); `night = floor.copy();` → creates Object #3 (Lamp: brightness = 7); night refers to Object #3; `night = floor;` → night refers to Object #2 (the same object as floor)

#### structure · Advanced · sample 2 — `structure.count`

Complexity score 53; features: alias, multi-alias, reassign-after-alias, returns-reference, returns-this, three-objects.

```java
class Garden {
    private int flowers;

    public Garden(int start) {
        flowers = start;
    }

    public void plant(int count) {
        flowers += count;
    }

    public Garden self() {
        return this;
    }
}

static Garden same(Garden x) {
    return x;
}

Garden side = new Garden(7);
side = new Garden(18);
Garden patio = new Garden(9);
Garden roof = patio.self();
(new Garden(17)).plant(5);
side = patio;
Garden back = same(roof);
```

*The statements after the class run in order inside main. The static methods shown outside the class are in the same class as main.*

**How many Garden objects are created when this code runs?**

A. `4` — **correct**
B. `1` — Confuses created with still referenced (`createdVsReachable`)
C. `3` — Ignores objects that are not stored (`ignoresTemporaries`)
D. `7` — Thinks copying a reference creates an object (`aliasCreates`)

Explanation: Only a new expression creates an object (including a new that runs inside a method). Declaring a variable, assigning null, and copying a reference create nothing. The answer is 4.

Trace: `Garden side = new Garden(7);` → creates Object #1 (Garden: flowers = 7); side refers to Object #1; `side = new Garden(18);` → creates Object #2 (Garden: flowers = 18); side refers to Object #2; `Garden patio = new Garden(9);` → creates Object #3 (Garden: flowers = 9); patio refers to Object #3; `Garden roof = patio.self();` → roof refers to Object #3 (the same object as patio); `(new Garden(17)).plant(5);` → creates Object #4 (Garden: flowers = 22); `side = patio;` → side refers to Object #3 (the same object as patio and roof); `Garden back = same(roof);` → back refers to Object #3 (the same object as side and patio and roof)

#### structure · Advanced · sample 3 — `structure.count`

Complexity score 41; features: alias, reassign-after-alias, returns-reference, three-objects.

```java
class Account {
    private int balance;

    public Account(int start) {
        balance = start;
    }

    public Account copy() {
        return new Account(balance);
    }
}

static Account same(Account x) {
    return x;
}

new Account(4);
new Account(19);
Account travel = new Account(9);
travel = travel.copy();
Account savings = same(travel);
```

*The statements after the class run in order inside main. The static methods shown outside the class are in the same class as main.*

**How many Account objects are created when this code runs?**

A. `1` — Ignores objects that are not stored (`ignoresTemporaries`)
B. `4` — **correct**
C. `2` — Counts variables as objects (`variablesAreObjects`)
D. `5` — Thinks copying a reference creates an object (`aliasCreates`)

Explanation: Only a new expression creates an object (including a new that runs inside a method). Declaring a variable, assigning null, and copying a reference create nothing. The answer is 4.

Trace: `new Account(4);` → creates Object #1 (Account: balance = 4); `new Account(19);` → creates Object #2 (Account: balance = 19); `Account travel = new Account(9);` → creates Object #3 (Account: balance = 9); travel refers to Object #3; `travel = travel.copy();` → creates Object #4 (Account: balance = 9); travel refers to Object #4; `Account savings = same(travel);` → savings refers to Object #4 (the same object as travel)

#### structure · Advanced · sample 4 — `structure.count`

Complexity score 51; features: alias, reassign-after-alias, returns-reference, several-helpers, three-objects.

```java
class Robot {
    private int steps;

    public Robot(int start) {
        steps = start;
    }

    public Robot copy() {
        return new Robot(steps);
    }
}

static Robot same(Robot x) {
    return x;
}

static Robot make(int start) {
    return new Robot(start);
}

Robot rover = new Robot(2);
rover = rover.copy();
Robot drone = make(19);
Robot scout = same(drone);
Robot probe = make(11);
```

*The statements after the class run in order inside main. The static methods shown outside the class are in the same class as main.*

**How many Robot objects are created when this code runs?**

A. `1` — Ignores objects that are not stored (`ignoresTemporaries`)
B. `5` — Thinks copying a reference creates an object (`aliasCreates`)
C. `3` — Confuses created with still referenced (`createdVsReachable`)
D. `4` — **correct**

Explanation: Only a new expression creates an object (including a new that runs inside a method). Declaring a variable, assigning null, and copying a reference create nothing. The answer is 4.

Trace: `Robot rover = new Robot(2);` → creates Object #1 (Robot: steps = 2); rover refers to Object #1; `rover = rover.copy();` → creates Object #2 (Robot: steps = 2); rover refers to Object #2; `Robot drone = make(19);` → creates Object #3 (Robot: steps = 19); drone refers to Object #3; `Robot scout = same(drone);` → scout refers to Object #3 (the same object as drone); `Robot probe = make(11);` → creates Object #4 (Robot: steps = 11); probe refers to Object #4

#### structure · Advanced · sample 5 — `structure.count`

Complexity score 45; features: alias, reassign-after-alias, returns-reference, three-objects.

```java
class Garden {
    private int flowers;

    public Garden(int start) {
        flowers = start;
    }

    public void plant(int count) {
        flowers += count;
    }

    public Garden copy() {
        return new Garden(flowers);
    }
}

static Garden same(Garden x) {
    return x;
}

Garden roof = new Garden(9);
Garden patio = same(roof);
roof = patio.copy();
(new Garden(10)).plant(3);
patio = roof.copy();
patio = roof;
```

*The statements after the class run in order inside main. The static methods shown outside the class are in the same class as main.*

**After this code runs, how many different Garden objects are still referred to by at least one variable?**

A. `2` — Counts variables as objects (`variablesAreObjects`)
B. `1` — **correct**
C. `3` — Thinks copying a reference creates an object (`aliasCreates`)
D. `4` — Confuses created with still referenced (`createdVsReachable`)

Explanation: Count the distinct objects that some variable still refers to at the end. Reassigning a variable can leave an earlier object with no references. The answer is 1.

Trace: `Garden roof = new Garden(9);` → creates Object #1 (Garden: flowers = 9); roof refers to Object #1; `Garden patio = same(roof);` → patio refers to Object #1 (the same object as roof); `roof = patio.copy();` → creates Object #2 (Garden: flowers = 9); roof refers to Object #2; `(new Garden(10)).plant(3);` → creates Object #3 (Garden: flowers = 13); `patio = roof.copy();` → creates Object #4 (Garden: flowers = 9); patio refers to Object #4; `patio = roof;` → patio refers to Object #2 (the same object as roof)

## Instance variables and initial state (`defaults`)

### Beginner

#### defaults · Beginner · sample 1 — `defaults.fields`

Complexity score 8; features: none.

```java
class Lamp {
    private boolean ready;

    public boolean isReady() {
        return ready;
    }
}

Lamp floor = new Lamp();
System.out.println(floor.isReady());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `false` — **correct**
B. `null` — Thinks every field defaults to null (`defaultsNull`)
C. `The code does not compile` — Thinks fields must be initialised like locals (`fieldNeedsInit`)
D. `true` — Thinks boolean fields default to true (`boolDefaultTrue`)

Explanation: Instance fields always start with a value: 0 for int, 0.0 for double, false for boolean, and null for references such as String. A field initializer runs first, then the constructor body. The program prints false.

Trace: `Lamp floor = new Lamp();` → creates Object #1 (Lamp: ready = false); floor refers to Object #1; `System.out.println(floor.isReady());` → prints "false"

#### defaults · Beginner · sample 2 — `defaults.fields`

Complexity score 15; features: multi-field, several-outputs.

```java
class Book {
    private double rating;
    private boolean active;

    public double getRating() {
        return rating;
    }

    public boolean isActive() {
        return active;
    }
}

Book novel = new Book();
System.out.println(novel.isActive());
System.out.println(novel.getRating());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `null ⏎ null` — Thinks every field defaults to null (`defaultsNull`)
B. `true ⏎ 0.0` — Thinks boolean fields default to true (`boolDefaultTrue`)
C. `The code does not compile` — Thinks fields must be initialised like locals (`fieldNeedsInit`)
D. `false ⏎ 0.0` — **correct**

Explanation: Instance fields always start with a value: 0 for int, 0.0 for double, false for boolean, and null for references such as String. A field initializer runs first, then the constructor body. The program prints these lines in order: false, 0.0.

Trace: `Book novel = new Book();` → creates Object #1 (Book: rating = 0.0, active = false); novel refers to Object #1; `System.out.println(novel.isActive());` → prints "false"; `System.out.println(novel.getRating());` → prints "0.0"

#### defaults · Beginner · sample 3 — `defaults.fields`

Complexity score 15; features: multi-field, several-outputs.

```java
class Lamp {
    private double average;
    private boolean active;

    public double getAverage() {
        return average;
    }

    public boolean isActive() {
        return active;
    }
}

Lamp night = new Lamp();
System.out.println(night.getAverage());
System.out.println(night.isActive());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `null ⏎ null` — Thinks every field defaults to null (`defaultsNull`)
B. `The code does not compile` — Thinks fields must be initialised like locals (`fieldNeedsInit`)
C. `0.0 ⏎ true` — Thinks boolean fields default to true (`boolDefaultTrue`)
D. `0.0 ⏎ false` — **correct**

Explanation: Instance fields always start with a value: 0 for int, 0.0 for double, false for boolean, and null for references such as String. A field initializer runs first, then the constructor body. The program prints these lines in order: 0.0, false.

Trace: `Lamp night = new Lamp();` → creates Object #1 (Lamp: average = 0.0, active = false); night refers to Object #1; `System.out.println(night.getAverage());` → prints "0.0"; `System.out.println(night.isActive());` → prints "false"

#### defaults · Beginner · sample 4 — `defaults.fields`

Complexity score 18; features: multi-field, several-outputs.

```java
class Account {
    private String owner;
    private int balance = 2;

    public Account(int start) {
        balance = start;
    }

    public String getOwner() {
        return owner;
    }

    public int getBalance() {
        return balance;
    }
}

Account backup = new Account(5);
System.out.println("Owner: " + backup.getOwner());
System.out.println(backup.getBalance());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `Owner:  ⏎ 5` — Thinks String fields default to empty text (`stringDefaultEmpty`)
B. `Owner: null ⏎ 2` — Ignores the constructor body (`forgetCtor`)
C. `The code does not compile` — Thinks fields must be initialised like locals (`fieldNeedsInit`)
D. `Owner: null ⏎ 5` — **correct**

Explanation: Instance fields always start with a value: 0 for int, 0.0 for double, false for boolean, and null for references such as String. A field initializer runs first, then the constructor body. The program prints these lines in order: Owner: null, 5.

Trace: `Account backup = new Account(5);` → creates Object #1 (Account: owner = null, balance = 5); backup refers to Object #1; `System.out.println("Owner: " + backup.getOwner());` → prints "Owner: null"; `System.out.println(backup.getBalance());` → prints "5"

#### defaults · Beginner · sample 5 — `defaults.fields`

Complexity score 16; features: multi-field, several-outputs.

```java
class Plant {
    private boolean ready;
    private double average = 1.5;

    public boolean isReady() {
        return ready;
    }

    public double getAverage() {
        return average;
    }
}

Plant ivy = new Plant();
System.out.println(ivy.isReady());
System.out.println(ivy.getAverage());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `null ⏎ 1.5` — Thinks every field defaults to null (`defaultsNull`)
B. `The code does not compile` — Thinks fields must be initialised like locals (`fieldNeedsInit`)
C. `true ⏎ 1.5` — Thinks boolean fields default to true (`boolDefaultTrue`)
D. `false ⏎ 1.5` — **correct**

Explanation: Instance fields always start with a value: 0 for int, 0.0 for double, false for boolean, and null for references such as String. A field initializer runs first, then the constructor body. The program prints these lines in order: false, 1.5.

Trace: `Plant ivy = new Plant();` → creates Object #1 (Plant: ready = false, average = 1.5); ivy refers to Object #1; `System.out.println(ivy.isReady());` → prints "false"; `System.out.println(ivy.getAverage());` → prints "1.5"

### Intermediate

#### defaults · Intermediate · sample 1 — `defaults.local`

Complexity score 17; features: multi-field, trace-each-candidate.

```java
class Car {
    private int speed;
    private String color;

    public int getSpeed() {
        return speed;
    }

    public String getColor() {
        return color;
    }
}

Car van = new Car();
int count;
int limit;
limit = 7;
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**Each choice would be added at the end of this code. Which one causes a compile-time error?**

A. `System.out.println(van.getSpeed());` — Thinks fields must be initialised like locals (`fieldNeedsInit`)
B. `System.out.println(limit);` — Thinks a local declared without a value can never be read (`assignedLater`)
C. `System.out.println(van.getSpeed() + count);` — **correct**
D. `System.out.println(van.getColor().length());` — Confuses a runtime exception with a compile error (`runtimeVsCompile`)

Explanation: Fields get default values, but local variables do not. The compiler rejects reading a local variable unless it has been assigned on every path before that point. The compiler does not evaluate conditions, so an assignment inside an if without an else does not count, even when the condition would always be true when the program runs. System.out.println(van.getSpeed() + count); is the only choice that does not compile.

Trace: `System.out.println(van.getColor().length());` → throws a NullPointerException; `System.out.println(van.getSpeed() + count);` → does not compile: This answer assumes a local variable starts with a default value. Local variables have no default; reading one before assigning it is a compile-time error.; `System.out.println(limit);` → compiles; `System.out.println(van.getSpeed());` → compiles

#### defaults · Intermediate · sample 2 — `defaults.local`

Complexity score 17; features: multi-field, trace-each-candidate.

```java
class Book {
    private int pagesRead;
    private String title;

    public int getPagesRead() {
        return pagesRead;
    }

    public String getTitle() {
        return title;
    }
}

Book novel = new Book();
int total;
int limit;
limit = 8;
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**Each choice would be added at the end of this code. Which one causes a compile-time error?**

A. `System.out.println(limit);` — Thinks a local declared without a value can never be read (`assignedLater`)
B. `System.out.println(novel.getPagesRead());` — Thinks fields must be initialised like locals (`fieldNeedsInit`)
C. `int copy = total + 1;` — **correct**
D. `System.out.println(novel.getTitle());` — Thinks printing a null reference throws (`nullPrintThrows`)

Explanation: Fields get default values, but local variables do not. The compiler rejects reading a local variable unless it has been assigned on every path before that point. The compiler does not evaluate conditions, so an assignment inside an if without an else does not count, even when the condition would always be true when the program runs. int copy = total + 1; is the only choice that does not compile.

Trace: `System.out.println(novel.getPagesRead());` → compiles; `System.out.println(novel.getTitle());` → compiles; `System.out.println(limit);` → compiles; `int copy = total + 1;` → does not compile: This answer assumes a local variable starts with a default value. Local variables have no default; reading one before assigning it is a compile-time error.

#### defaults · Intermediate · sample 3 — `defaults.fields`

Complexity score 20; features: multi-field, overload, several-outputs.

```java
class Book {
    private int pagesRead;
    private boolean active;

    public Book() {
    }

    public Book(int start) {
        pagesRead = start;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public boolean isActive() {
        return active;
    }
}

Book novel = new Book(5);
System.out.println(novel.isActive());
System.out.println(novel.getPagesRead());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `false ⏎ 0` — Ignores the constructor body (`forgetCtor`)
B. `false ⏎ 5` — **correct**
C. `null ⏎ 5` — Thinks every field defaults to null (`defaultsNull`)
D. `true ⏎ 5` — Thinks boolean fields default to true (`boolDefaultTrue`)

Explanation: Instance fields always start with a value: 0 for int, 0.0 for double, false for boolean, and null for references such as String. A field initializer runs first, then the constructor body. The program prints these lines in order: false, 5.

Trace: `Book novel = new Book(5);` → creates Object #1 (Book: pagesRead = 5, active = false); novel refers to Object #1; `System.out.println(novel.isActive());` → prints "false"; `System.out.println(novel.getPagesRead());` → prints "5"

#### defaults · Intermediate · sample 4 — `defaults.local`

Complexity score 17; features: multi-field, trace-each-candidate.

```java
class Garden {
    private int flowers;
    private String plot;

    public int getFlowers() {
        return flowers;
    }

    public String getPlot() {
        return plot;
    }
}

Garden roof = new Garden();
int count;
int limit;
limit = 7;
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**Each choice would be added at the end of this code. Which one causes a compile-time error?**

A. `System.out.println(limit);` — Thinks a local declared without a value can never be read (`assignedLater`)
B. `System.out.println(count);` — **correct**
C. `System.out.println(roof.getFlowers());` — Thinks fields must be initialised like locals (`fieldNeedsInit`)
D. `System.out.println(roof.getPlot().length());` — Confuses a runtime exception with a compile error (`runtimeVsCompile`)

Explanation: Fields get default values, but local variables do not. The compiler rejects reading a local variable unless it has been assigned on every path before that point. The compiler does not evaluate conditions, so an assignment inside an if without an else does not count, even when the condition would always be true when the program runs. System.out.println(count); is the only choice that does not compile.

Trace: `System.out.println(roof.getPlot().length());` → throws a NullPointerException; `System.out.println(roof.getFlowers());` → compiles; `System.out.println(limit);` → compiles; `System.out.println(count);` → does not compile: This answer assumes a local variable starts with a default value. Local variables have no default; reading one before assigning it is a compile-time error.

#### defaults · Intermediate · sample 5 — `defaults.fields`

Complexity score 17; features: multi-field, several-outputs.

```java
class Timer {
    private int seconds;
    private String tag;
    private double weight;

    public Timer(int start) {
        seconds = start;
    }

    public int getSeconds() {
        return seconds;
    }

    public String getTag() {
        return tag;
    }

    public double getWeight() {
        return weight;
    }
}

Timer clock = new Timer(4);
System.out.println("Tag: " + clock.getTag());
System.out.println(clock.getSeconds());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `Tag:  ⏎ 4` — Thinks String fields default to empty text (`stringDefaultEmpty`)
B. `Tag: null ⏎ 0` — Ignores the constructor body (`forgetCtor`)
C. `The code does not compile` — Thinks fields must be initialised like locals (`fieldNeedsInit`)
D. `Tag: null ⏎ 4` — **correct**

Explanation: Instance fields always start with a value: 0 for int, 0.0 for double, false for boolean, and null for references such as String. A field initializer runs first, then the constructor body. The program prints these lines in order: Tag: null, 4.

Trace: `Timer clock = new Timer(4);` → creates Object #1 (Timer: seconds = 4, tag = null, weight = 0.0); clock refers to Object #1; `System.out.println("Tag: " + clock.getTag());` → prints "Tag: null"; `System.out.println(clock.getSeconds());` → prints "4"

### Advanced

#### defaults · Advanced · sample 1 — `defaults.local`

Complexity score 26; features: conditional, multi-field, trace-each-candidate.

```java
class Car {
    private int speed;
    private String color;

    public int getSpeed() {
        return speed;
    }

    public String getColor() {
        return color;
    }
}

Car van = new Car();
int count;
int limit;
if (van.getSpeed() >= 0) {
    limit = 5;
} else {
    limit = 0;
}
if (van.getSpeed() >= 0) {
    count = 7;
}
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**Each choice would be added at the end of this code. Which one causes a compile-time error?**

A. `System.out.println(van.getSpeed());` — Thinks fields must be initialised like locals (`fieldNeedsInit`)
B. `System.out.println(limit);` — Thinks a local declared without a value can never be read (`assignedLater`)
C. `int copy = count + 1;` — **correct**
D. `int copy = limit + van.getSpeed();` — Thinks a local declared without a value can never be read (`assignedLater`)

Explanation: Fields get default values, but local variables do not. The compiler rejects reading a local variable unless it has been assigned on every path before that point. The compiler does not evaluate conditions, so an assignment inside an if without an else does not count, even when the condition would always be true when the program runs. int copy = count + 1; is the only choice that does not compile.

Trace: `System.out.println(limit);` → compiles; `int copy = count + 1;` → does not compile: This answer assumes a local variable starts with a default value. Local variables have no default; reading one before assigning it is a compile-time error.; `int copy = limit + van.getSpeed();` → compiles; `System.out.println(van.getSpeed());` → compiles

#### defaults · Advanced · sample 2 — `defaults.local`

Complexity score 23; features: conditional, multi-field, trace-each-candidate.

```java
class Book {
    private int pagesRead;
    private String title;

    public int getPagesRead() {
        return pagesRead;
    }

    public String getTitle() {
        return title;
    }
}

Book novel = new Book();
int total;
int limit;
limit = 8;
if (novel.getPagesRead() >= 0) {
    total = 7;
}
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**Each choice would be added at the end of this code. Which one causes a compile-time error?**

A. `System.out.println(novel.getPagesRead() + total);` — **correct**
B. `System.out.println(limit);` — Thinks a local declared without a value can never be read (`assignedLater`)
C. `System.out.println(novel.getTitle().length());` — Confuses a runtime exception with a compile error (`runtimeVsCompile`)
D. `System.out.println(novel.getTitle());` — Thinks printing a null reference throws (`nullPrintThrows`)

Explanation: Fields get default values, but local variables do not. The compiler rejects reading a local variable unless it has been assigned on every path before that point. The compiler does not evaluate conditions, so an assignment inside an if without an else does not count, even when the condition would always be true when the program runs. System.out.println(novel.getPagesRead() + total); is the only choice that does not compile.

Trace: `System.out.println(novel.getTitle());` → compiles; `System.out.println(novel.getPagesRead() + total);` → does not compile: This answer assumes a local variable starts with a default value. Local variables have no default; reading one before assigning it is a compile-time error.; `System.out.println(limit);` → compiles; `System.out.println(novel.getTitle().length());` → throws a NullPointerException

#### defaults · Advanced · sample 3 — `defaults.local`

Complexity score 23; features: conditional, multi-field, trace-each-candidate.

```java
class Timer {
    private int seconds;
    private String tag;

    public int getSeconds() {
        return seconds;
    }

    public String getTag() {
        return tag;
    }
}

Timer watch = new Timer();
int tally;
int steps;
steps = 2;
if (watch.getSeconds() >= 0) {
    tally = 7;
}
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**Each choice would be added at the end of this code. Which one causes a compile-time error?**

A. `int copy = steps + watch.getSeconds();` — Thinks a local declared without a value can never be read (`assignedLater`)
B. `System.out.println(steps);` — Thinks a local declared without a value can never be read (`assignedLater`)
C. `System.out.println(watch.getTag());` — Thinks printing a null reference throws (`nullPrintThrows`)
D. `System.out.println(tally);` — **correct**

Explanation: Fields get default values, but local variables do not. The compiler rejects reading a local variable unless it has been assigned on every path before that point. The compiler does not evaluate conditions, so an assignment inside an if without an else does not count, even when the condition would always be true when the program runs. System.out.println(tally); is the only choice that does not compile.

Trace: `System.out.println(tally);` → does not compile: This answer assumes a local variable starts with a default value. Local variables have no default; reading one before assigning it is a compile-time error.; `int copy = steps + watch.getSeconds();` → compiles; `System.out.println(watch.getTag());` → compiles; `System.out.println(steps);` → compiles

#### defaults · Advanced · sample 4 — `defaults.fields`

Complexity score 25; features: multi-field, returns-reference, several-outputs.

```java
class Plant {
    private int height = 1;
    private String species;
    private boolean locked = true;
    private Plant partner;

    public Plant(int start) {
        height = height * start;
    }

    public int getHeight() {
        return height;
    }

    public String getSpecies() {
        return species;
    }

    public boolean isLocked() {
        return locked;
    }

    public Plant getPartner() {
        return partner;
    }
}

Plant oak = new Plant(3);
System.out.println("Species: " + oak.getSpecies());
System.out.println(oak.getHeight());
System.out.println(oak.isLocked());
System.out.println(oak.getPartner() == null);
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `Species: null ⏎ 1 ⏎ true ⏎ true` — Ignores the constructor body (`forgetCtor`)
B. `The code does not compile` — Thinks fields must be initialised like locals (`fieldNeedsInit`)
C. `Species: null ⏎ 3 ⏎ true ⏎ true` — **correct**
D. `Species:  ⏎ 3 ⏎ true ⏎ true` — Thinks String fields default to empty text (`stringDefaultEmpty`)

Explanation: Instance fields always start with a value: 0 for int, 0.0 for double, false for boolean, and null for references such as String. A field initializer runs first, then the constructor body. The program prints these lines in order: Species: null, 3, true, true.

Trace: `Plant oak = new Plant(3);` → creates Object #1 (Plant: height = 3, species = null, locked = true, partner = null); oak refers to Object #1; `System.out.println("Species: " + oak.getSpecies());` → prints "Species: null"; `System.out.println(oak.getHeight());` → prints "3"; `System.out.println(oak.isLocked());` → prints "true"; `System.out.println(oak.getPartner() == null);` → prints "true"

#### defaults · Advanced · sample 5 — `defaults.fields`

Complexity score 27; features: multi-field, overload, returns-reference, several-outputs.

```java
class Robot {
    private int steps = 5;
    private double rating;
    private String model = "red";
    private Robot partner;

    public Robot() {
    }

    public Robot(int start) {
        steps = start;
    }

    public int getSteps() {
        return steps;
    }

    public double getRating() {
        return rating;
    }

    public String getModel() {
        return model;
    }

    public Robot getPartner() {
        return partner;
    }
}

Robot bot = new Robot(7);
System.out.println(bot.getSteps());
System.out.println(bot.getRating());
System.out.println(bot.getPartner() == null);
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `7 ⏎ null ⏎ true` — Thinks every field defaults to null (`defaultsNull`)
B. `5 ⏎ 0.0 ⏎ true` — Ignores the constructor body (`forgetCtor`)
C. `The code does not compile` — Thinks fields must be initialised like locals (`fieldNeedsInit`)
D. `7 ⏎ 0.0 ⏎ true` — **correct**

Explanation: Instance fields always start with a value: 0 for int, 0.0 for double, false for boolean, and null for references such as String. A field initializer runs first, then the constructor body. The program prints these lines in order: 7, 0.0, true.

Trace: `Robot bot = new Robot(7);` → creates Object #1 (Robot: steps = 7, rating = 0.0, model = "red", partner = null); bot refers to Object #1; `System.out.println(bot.getSteps());` → prints "7"; `System.out.println(bot.getRating());` → prints "0.0"; `System.out.println(bot.getPartner() == null);` → prints "true"

## Constructor initialization (`constructors`)

### Beginner

#### constructors · Beginner · sample 1 — `constructors.trace`

Complexity score 27; features: conditional, several-outputs.

```java
class Ticket {
    private int price;

    public Ticket(int start) {
        price = start > 10 ? 10 : start;
    }

    public int getPrice() {
        return price;
    }
}

Ticket t1 = new Ticket(2);
Ticket t3 = new Ticket(10);
System.out.println(t1.getPrice());
System.out.println(t3.getPrice());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `10 ⏎ 10` — Thinks all objects share an instance field (`instanceAsStatic`)
B. `2 ⏎ 0` — Thinks the constructor runs only once for the class (`ctorOnce`)
C. `0 ⏎ 0` — Ignores the constructor body (`forgetCtor`)
D. `2 ⏎ 10` — **correct**

Explanation: new runs the matching constructor (chosen by the arguments). A this(...) call runs the other constructor first; field initializers run before the constructor body; an unqualified name that matches a parameter refers to the parameter, not the field. The program prints these lines in order: 2, 10.

Trace: `Ticket t1 = new Ticket(2);` → creates Object #1 (Ticket: price = 2); t1 refers to Object #1; `Ticket t3 = new Ticket(10);` → creates Object #2 (Ticket: price = 10); t3 refers to Object #2; `System.out.println(t1.getPrice());` → prints "2"; `System.out.println(t3.getPrice());` → prints "10"

#### constructors · Beginner · sample 2 — `constructors.trace`

Complexity score 23; features: several-outputs.

```java
class Book {
    private int pagesRead;

    public Book(int start) {
        pagesRead = start;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public void read(int pages) {
        pagesRead += pages;
    }
}

Book novel = new Book(13);
Book atlas = new Book(1);
atlas.read(5);
System.out.println(novel.getPagesRead());
System.out.println(atlas.getPagesRead());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `6 ⏎ 6` — Thinks all objects share an instance field (`instanceAsStatic`)
B. `13 ⏎ 6` — **correct**
C. `0 ⏎ 5` — Ignores the constructor body (`forgetCtor`)
D. `13 ⏎ 1` — Misses one of the updates (`lostUpdate`)

Explanation: new runs the matching constructor (chosen by the arguments). A this(...) call runs the other constructor first; field initializers run before the constructor body; an unqualified name that matches a parameter refers to the parameter, not the field. The program prints these lines in order: 13, 6.

Trace: `Book novel = new Book(13);` → creates Object #1 (Book: pagesRead = 13); novel refers to Object #1; `Book atlas = new Book(1);` → creates Object #2 (Book: pagesRead = 1); atlas refers to Object #2; `atlas.read(5);` → Object #2.pagesRead: 1 → 6; `System.out.println(novel.getPagesRead());` → prints "13"; `System.out.println(atlas.getPagesRead());` → prints "6"

#### constructors · Beginner · sample 3 — `constructors.trace`

Complexity score 20; features: several-outputs.

```java
class Lamp {
    private int brightness;

    public Lamp(int start) {
        brightness = start;
    }

    public int getBrightness() {
        return brightness;
    }
}

Lamp porch = new Lamp(10);
Lamp night = new Lamp(9);
System.out.println(porch.getBrightness());
System.out.println(night.getBrightness());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `10 ⏎ 9` — **correct**
B. `0 ⏎ 0` — Ignores the constructor body (`forgetCtor`)
C. `9 ⏎ 9` — Thinks all objects share an instance field (`instanceAsStatic`)
D. `10 ⏎ 0` — Thinks the constructor runs only once for the class (`ctorOnce`)

Explanation: new runs the matching constructor (chosen by the arguments). A this(...) call runs the other constructor first; field initializers run before the constructor body; an unqualified name that matches a parameter refers to the parameter, not the field. The program prints these lines in order: 10, 9.

Trace: `Lamp porch = new Lamp(10);` → creates Object #1 (Lamp: brightness = 10); porch refers to Object #1; `Lamp night = new Lamp(9);` → creates Object #2 (Lamp: brightness = 9); night refers to Object #2; `System.out.println(porch.getBrightness());` → prints "10"; `System.out.println(night.getBrightness());` → prints "9"

#### constructors · Beginner · sample 4 — `constructors.trace`

Complexity score 23; features: overload, several-outputs.

```java
class Timer {
    private int seconds;

    public Timer() {
        seconds = 4;
    }

    public Timer(int start) {
        seconds = start;
    }

    public int getSeconds() {
        return seconds;
    }
}

Timer timer = new Timer();
Timer alarm = new Timer(12);
System.out.println(timer.getSeconds());
System.out.println(alarm.getSeconds());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `12 ⏎ 12` — Thinks all objects share an instance field (`instanceAsStatic`)
B. `4 ⏎ 12` — **correct**
C. `0 ⏎ 0` — Ignores the constructor body (`forgetCtor`)
D. `4 ⏎ 0` — Thinks the constructor runs only once for the class (`ctorOnce`)

Explanation: new runs the matching constructor (chosen by the arguments). A this(...) call runs the other constructor first; field initializers run before the constructor body; an unqualified name that matches a parameter refers to the parameter, not the field. The program prints these lines in order: 4, 12.

Trace: `Timer timer = new Timer();` → creates Object #1 (Timer: seconds = 4); timer refers to Object #1; `Timer alarm = new Timer(12);` → creates Object #2 (Timer: seconds = 12); alarm refers to Object #2; `System.out.println(timer.getSeconds());` → prints "4"; `System.out.println(alarm.getSeconds());` → prints "12"

#### constructors · Beginner · sample 5 — `constructors.trace`

Complexity score 24; features: several-outputs, shadowing.

```java
class Lamp {
    private int brightness;

    public Lamp(int brightness) {
        brightness = brightness;
    }

    public int getBrightness() {
        return brightness;
    }

    public void brighten(int level) {
        brightness += level;
    }
}

Lamp floor = new Lamp(14);
Lamp porch = new Lamp(11);
porch.brighten(2);
System.out.println(floor.getBrightness());
System.out.println(porch.getBrightness());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `14 ⏎ 13` — Thinks an unqualified name means the field (`shadowAssignsField`)
B. `0 ⏎ 2` — **correct**
C. `0 ⏎ 0` — Misses one of the updates (`lostUpdate`)
D. `2 ⏎ 2` — Thinks all objects share an instance field (`instanceAsStatic`)

Explanation: new runs the matching constructor (chosen by the arguments). A this(...) call runs the other constructor first; field initializers run before the constructor body; an unqualified name that matches a parameter refers to the parameter, not the field. The program prints these lines in order: 0, 2.

Trace: `Lamp floor = new Lamp(14);` → creates Object #1 (Lamp: brightness = 0); floor refers to Object #1; `Lamp porch = new Lamp(11);` → creates Object #2 (Lamp: brightness = 0); porch refers to Object #2; `porch.brighten(2);` → Object #2.brightness: 0 → 2; `System.out.println(floor.getBrightness());` → prints "0"; `System.out.println(porch.getBrightness());` → prints "2"

### Intermediate

#### constructors · Intermediate · sample 1 — `constructors.trace`

Complexity score 21; features: several-outputs, shadowing.

```java
class Car {
    private int speed;

    public Car(int speed) {
        speed = speed;
    }

    public int getSpeed() {
        return speed;
    }
}

Car van = new Car(9);
Car truck = new Car(13);
System.out.println(van.getSpeed());
System.out.println(truck.getSpeed());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `The code does not compile` — Thinks x = x; does not compile (`selfAssignError`)
B. `null ⏎ null` — Thinks every field defaults to null (`defaultsNull`)
C. `9 ⏎ 13` — Thinks an unqualified name means the field (`shadowAssignsField`)
D. `0 ⏎ 0` — **correct**

Explanation: new runs the matching constructor (chosen by the arguments). A this(...) call runs the other constructor first; field initializers run before the constructor body; an unqualified name that matches a parameter refers to the parameter, not the field. The program prints these lines in order: 0, 0.

Trace: `Car van = new Car(9);` → creates Object #1 (Car: speed = 0); van refers to Object #1; `Car truck = new Car(13);` → creates Object #2 (Car: speed = 0); truck refers to Object #2; `System.out.println(van.getSpeed());` → prints "0"; `System.out.println(truck.getSpeed());` → prints "0"

#### constructors · Intermediate · sample 2 — `constructors.trace`

Complexity score 23; features: overload, several-outputs.

```java
class Book {
    private int pagesRead;

    public Book() {
        pagesRead = 6;
    }

    public Book(int start) {
        pagesRead = start;
    }

    public int getPagesRead() {
        return pagesRead;
    }
}

Book novel = new Book();
Book diary = new Book(7);
System.out.println(novel.getPagesRead());
System.out.println(diary.getPagesRead());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `0 ⏎ 0` — Ignores the constructor body (`forgetCtor`)
B. `6 ⏎ 7` — **correct**
C. `6 ⏎ 0` — Thinks the constructor runs only once for the class (`ctorOnce`)
D. `7 ⏎ 7` — Thinks all objects share an instance field (`instanceAsStatic`)

Explanation: new runs the matching constructor (chosen by the arguments). A this(...) call runs the other constructor first; field initializers run before the constructor body; an unqualified name that matches a parameter refers to the parameter, not the field. The program prints these lines in order: 6, 7.

Trace: `Book novel = new Book();` → creates Object #1 (Book: pagesRead = 6); novel refers to Object #1; `Book diary = new Book(7);` → creates Object #2 (Book: pagesRead = 7); diary refers to Object #2; `System.out.println(novel.getPagesRead());` → prints "6"; `System.out.println(diary.getPagesRead());` → prints "7"

#### constructors · Intermediate · sample 3 — `constructors.trace`

Complexity score 27; features: multi-field, several-outputs.

```java
class Book {
    private int pagesRead;
    private int bookmarks;

    public Book(int a, int b) {
        pagesRead = a;
        bookmarks = b;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public int getBookmarks() {
        return bookmarks;
    }
}

Book novel = new Book(13, 5);
Book atlas = new Book(4, 10);
System.out.println(novel.getPagesRead() + " " + novel.getBookmarks());
System.out.println(atlas.getPagesRead() + " " + atlas.getBookmarks());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `4 10 ⏎ 4 10` — Thinks all objects share an instance field (`instanceAsStatic`)
B. `13 5 ⏎ 4 10` — **correct**
C. `0 0 ⏎ 0 0` — Ignores the constructor body (`forgetCtor`)
D. `5 13 ⏎ 10 4` — Mixes up the constructor argument order (`argOrder`)

Explanation: new runs the matching constructor (chosen by the arguments). A this(...) call runs the other constructor first; field initializers run before the constructor body; an unqualified name that matches a parameter refers to the parameter, not the field. The program prints these lines in order: 13 5, 4 10.

Trace: `Book novel = new Book(13, 5);` → creates Object #1 (Book: pagesRead = 13, bookmarks = 5); novel refers to Object #1; `Book atlas = new Book(4, 10);` → creates Object #2 (Book: pagesRead = 4, bookmarks = 10); atlas refers to Object #2; `System.out.println(novel.getPagesRead() + " " + novel.getBookmarks());` → prints "13 5"; `System.out.println(atlas.getPagesRead() + " " + atlas.getBookmarks());` → prints "4 10"

#### constructors · Intermediate · sample 4 — `constructors.trace`

Complexity score 20; features: several-outputs.

```java
class Timer {
    private int seconds;

    public Timer(int start) {
        seconds = start + 5;
    }

    public int getSeconds() {
        return seconds;
    }
}

Timer timer = new Timer(12);
Timer alarm = new Timer(2);
System.out.println(timer.getSeconds());
System.out.println(alarm.getSeconds());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `0 ⏎ 0` — Ignores the constructor body (`forgetCtor`)
B. `17 ⏎ 7` — **correct**
C. `12 ⏎ 2` — Ignores the computation in the method (`ignoresComputation`)
D. `7 ⏎ 7` — Thinks all objects share an instance field (`instanceAsStatic`)

Explanation: new runs the matching constructor (chosen by the arguments). A this(...) call runs the other constructor first; field initializers run before the constructor body; an unqualified name that matches a parameter refers to the parameter, not the field. The program prints these lines in order: 17, 7.

Trace: `Timer timer = new Timer(12);` → creates Object #1 (Timer: seconds = 17); timer refers to Object #1; `Timer alarm = new Timer(2);` → creates Object #2 (Timer: seconds = 7); alarm refers to Object #2; `System.out.println(timer.getSeconds());` → prints "17"; `System.out.println(alarm.getSeconds());` → prints "7"

#### constructors · Intermediate · sample 5 — `constructors.trace`

Complexity score 23; features: overload, several-outputs.

```java
class Lamp {
    private int brightness;

    public Lamp() {
        brightness = 1;
    }

    public Lamp(int start) {
        brightness = start;
    }

    public int getBrightness() {
        return brightness;
    }
}

Lamp floor = new Lamp(8);
Lamp porch = new Lamp();
System.out.println(floor.getBrightness());
System.out.println(porch.getBrightness());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `8 ⏎ 1` — **correct**
B. `1 ⏎ 1` — Thinks all objects share an instance field (`instanceAsStatic`)
C. `8 ⏎ 0` — Thinks the constructor runs only once for the class (`ctorOnce`)
D. `0 ⏎ 0` — Ignores the constructor body (`forgetCtor`)

Explanation: new runs the matching constructor (chosen by the arguments). A this(...) call runs the other constructor first; field initializers run before the constructor body; an unqualified name that matches a parameter refers to the parameter, not the field. The program prints these lines in order: 8, 1.

Trace: `Lamp floor = new Lamp(8);` → creates Object #1 (Lamp: brightness = 8); floor refers to Object #1; `Lamp porch = new Lamp();` → creates Object #2 (Lamp: brightness = 1); porch refers to Object #2; `System.out.println(floor.getBrightness());` → prints "8"; `System.out.println(porch.getBrightness());` → prints "1"

### Advanced

#### constructors · Advanced · sample 1 — `constructors.trace`

Complexity score 45; features: multi-field, several-outputs, shadowing, three-objects.

```java
class Car {
    private int speed;
    private int trips;

    public Car(int trips, int speed) {
        this.speed = speed;
        this.trips = trips;
    }

    public int getSpeed() {
        return speed;
    }

    public int getTrips() {
        return trips;
    }

    public void accelerate(int mph) {
        speed += mph;
    }
}

Car van = new Car(9, 12);
Car truck = new Car(8, 11);
Car bus = new Car(7, 14);
bus.accelerate(2);
System.out.println(van.getSpeed() + " " + van.getTrips());
System.out.println(truck.getSpeed() + " " + truck.getTrips());
System.out.println(bus.getSpeed() + " " + bus.getTrips());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `0 0 ⏎ 0 0 ⏎ 2 0` — Ignores the constructor body (`forgetCtor`)
B. `9 12 ⏎ 8 11 ⏎ 9 14` — Mixes up the constructor argument order (`argOrder`)
C. `12 9 ⏎ 11 8 ⏎ 14 7` — Misses one of the updates (`lostUpdate`)
D. `12 9 ⏎ 11 8 ⏎ 16 7` — **correct**

Explanation: new runs the matching constructor (chosen by the arguments). A this(...) call runs the other constructor first; field initializers run before the constructor body; an unqualified name that matches a parameter refers to the parameter, not the field. The program prints these lines in order: 12 9, 11 8, 16 7.

Trace: `Car van = new Car(9, 12);` → creates Object #1 (Car: speed = 12, trips = 9); van refers to Object #1; `Car truck = new Car(8, 11);` → creates Object #2 (Car: speed = 11, trips = 8); truck refers to Object #2; `Car bus = new Car(7, 14);` → creates Object #3 (Car: speed = 14, trips = 7); bus refers to Object #3; `bus.accelerate(2);` → Object #3.speed: 14 → 16; `System.out.println(van.getSpeed() + " " + van.getTrips());` → prints "12 9"; `System.out.println(truck.getSpeed() + " " + truck.getTrips());` → prints "11 8"; `System.out.println(bus.getSpeed() + " " + bus.getTrips());` → prints "16 7"

#### constructors · Advanced · sample 2 — `constructors.trace`

Complexity score 27; features: ctor-chain, overload, several-outputs.

```java
class Book {
    private int pagesRead;

    public Book(int start) {
        pagesRead = start * 3;
    }

    public Book() {
        this(2);
    }

    public int getPagesRead() {
        return pagesRead;
    }
}

Book novel = new Book();
Book diary = new Book(12);
System.out.println(novel.getPagesRead());
System.out.println(diary.getPagesRead());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `0 ⏎ 0` — Ignores the constructor body (`forgetCtor`)
B. `2 ⏎ 12` — Ignores the computation in the method (`ignoresComputation`)
C. `0 ⏎ 36` — Ignores the this(...) constructor call (`skipChain`)
D. `6 ⏎ 36` — **correct**

Explanation: new runs the matching constructor (chosen by the arguments). A this(...) call runs the other constructor first; field initializers run before the constructor body; an unqualified name that matches a parameter refers to the parameter, not the field. The program prints these lines in order: 6, 36.

Trace: `Book novel = new Book();` → creates Object #1 (Book: pagesRead = 6); novel refers to Object #1; `Book diary = new Book(12);` → creates Object #2 (Book: pagesRead = 36); diary refers to Object #2; `System.out.println(novel.getPagesRead());` → prints "6"; `System.out.println(diary.getPagesRead());` → prints "36"

#### constructors · Advanced · sample 3 — `constructors.trace`

Complexity score 33; features: ctor-chain, overload, several-outputs, shadowing.

```java
class Book {
    private int pagesRead;

    public Book(int pagesRead) {
        this.pagesRead = pagesRead;
    }

    public Book() {
        this(2);
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public void read(int pages) {
        pagesRead += pages;
    }
}

Book novel = new Book();
Book atlas = new Book(1);
atlas.read(5);
System.out.println(novel.getPagesRead());
System.out.println(atlas.getPagesRead());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `2 ⏎ 1` — Misses one of the updates (`lostUpdate`)
B. `0 ⏎ 5` — Ignores the constructor body (`forgetCtor`)
C. `0 ⏎ 6` — Ignores the this(...) constructor call (`skipChain`)
D. `2 ⏎ 6` — **correct**

Explanation: new runs the matching constructor (chosen by the arguments). A this(...) call runs the other constructor first; field initializers run before the constructor body; an unqualified name that matches a parameter refers to the parameter, not the field. The program prints these lines in order: 2, 6.

Trace: `Book novel = new Book();` → creates Object #1 (Book: pagesRead = 2); novel refers to Object #1; `Book atlas = new Book(1);` → creates Object #2 (Book: pagesRead = 1); atlas refers to Object #2; `atlas.read(5);` → Object #2.pagesRead: 1 → 6; `System.out.println(novel.getPagesRead());` → prints "2"; `System.out.println(atlas.getPagesRead());` → prints "6"

#### constructors · Advanced · sample 4 — `constructors.trace`

Complexity score 30; features: ctor-chain, overload, several-outputs.

```java
class Timer {
    private int seconds;

    public Timer(int start) {
        seconds = start * 2;
    }

    public Timer() {
        this(6);
    }

    public int getSeconds() {
        return seconds;
    }

    public void addTime(int s) {
        seconds += s;
    }
}

Timer timer = new Timer(12);
Timer alarm = new Timer();
alarm.addTime(1);
System.out.println(timer.getSeconds());
System.out.println(alarm.getSeconds());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `13 ⏎ 13` — Thinks all objects share an instance field (`instanceAsStatic`)
B. `0 ⏎ 1` — Ignores the constructor body (`forgetCtor`)
C. `24 ⏎ 1` — Ignores the this(...) constructor call (`skipChain`)
D. `24 ⏎ 13` — **correct**

Explanation: new runs the matching constructor (chosen by the arguments). A this(...) call runs the other constructor first; field initializers run before the constructor body; an unqualified name that matches a parameter refers to the parameter, not the field. The program prints these lines in order: 24, 13.

Trace: `Timer timer = new Timer(12);` → creates Object #1 (Timer: seconds = 24); timer refers to Object #1; `Timer alarm = new Timer();` → creates Object #2 (Timer: seconds = 12); alarm refers to Object #2; `alarm.addTime(1);` → Object #2.seconds: 12 → 13; `System.out.println(timer.getSeconds());` → prints "24"; `System.out.println(alarm.getSeconds());` → prints "13"

#### constructors · Advanced · sample 5 — `constructors.trace`

Complexity score 38; features: ctor-chain, overload, several-outputs, three-objects.

```java
class Lamp {
    private int brightness;

    public Lamp(int start) {
        brightness = start * 2;
    }

    public Lamp() {
        this(2);
    }

    public int getBrightness() {
        return brightness;
    }
}

Lamp floor = new Lamp(11);
Lamp porch = new Lamp(13);
Lamp hall = new Lamp();
System.out.println(floor.getBrightness());
System.out.println(porch.getBrightness());
System.out.println(hall.getBrightness());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `22 ⏎ 26 ⏎ 4` — **correct**
B. `0 ⏎ 0 ⏎ 0` — Ignores the constructor body (`forgetCtor`)
C. `22 ⏎ 26 ⏎ 0` — Ignores the this(...) constructor call (`skipChain`)
D. `11 ⏎ 13 ⏎ 2` — Ignores the computation in the method (`ignoresComputation`)

Explanation: new runs the matching constructor (chosen by the arguments). A this(...) call runs the other constructor first; field initializers run before the constructor body; an unqualified name that matches a parameter refers to the parameter, not the field. The program prints these lines in order: 22, 26, 4.

Trace: `Lamp floor = new Lamp(11);` → creates Object #1 (Lamp: brightness = 22); floor refers to Object #1; `Lamp porch = new Lamp(13);` → creates Object #2 (Lamp: brightness = 26); porch refers to Object #2; `Lamp hall = new Lamp();` → creates Object #3 (Lamp: brightness = 4); hall refers to Object #3; `System.out.println(floor.getBrightness());` → prints "22"; `System.out.println(porch.getBrightness());` → prints "26"; `System.out.println(hall.getBrightness());` → prints "4"

## Getters and encapsulation (`getters`)

### Beginner

#### getters · Beginner · sample 1 — `getters.computed`

Complexity score 14; features: several-outputs.

```java
class Ticket {
    private int price;

    public Ticket(int start) {
        price = start;
    }

    public int getPrice() {
        return price;
    }

    public int getPriceWithBonus() {
        return price + 4;
    }
}

Ticket t1 = new Ticket(6);
System.out.println(t1.getPriceWithBonus());
System.out.println(t1.getPriceWithBonus());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `10 ⏎ 14` — Thinks the accessor stores its result (`accessorStores`)
B. `10 ⏎ 10` — **correct**
C. `6 ⏎ 6` — Ignores the computation in the method (`ignoresComputation`)
D. `4 ⏎ 4` — Ignores the constructor body (`forgetCtor`)

Explanation: An accessor returns a value computed from the current fields. Calling it does not change the object, so later reads see the same stored field. The program prints these lines in order: 10, 10.

Trace: `Ticket t1 = new Ticket(6);` → creates Object #1 (Ticket: price = 6); t1 refers to Object #1; `System.out.println(t1.getPriceWithBonus());` → prints "10"; `System.out.println(t1.getPriceWithBonus());` → prints "10"

#### getters · Beginner · sample 2 — `getters.access`

Complexity score 12; features: none.

```java
class Book {
    private int pagesRead;

    public Book(int start) {
        pagesRead = start;
    }

    public int getPagesRead() {
        return pagesRead;
    }
}

Book novel = new Book(9);
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**This code is in main, in a different class. Which statement compiles?**

A. `int v = novel.getPagesRead;` — Leaves off the method call parentheses (`missingParens`)
B. `int v = getPagesRead(novel);` — Passes the object as an argument instead of calling on it (`wrongCallForm`)
C. `int v = novel.getPagesRead();` — **correct**
D. `int v = Book.getPagesRead();` — Calls an instance member through the class (`staticContext`)

Explanation: From outside the class you can use only its public members: call public methods on an object with dot notation and parentheses; private fields and methods are hidden; static members are used through the class name. int v = novel.getPagesRead(); is the only choice that achieves the goal.

Trace: `int v = novel.getPagesRead;` → does not compile: A method call needs parentheses, even with no arguments; without them the compiler looks for a field with that name.; `int v = novel.getPagesRead();` → achieves the goal; `int v = Book.getPagesRead();` → does not compile: An instance method or field needs an object; it cannot be used through the class name or from a static method without a receiver.; `int v = getPagesRead(novel);` → does not compile: An instance method is called on an object with dot notation (obj.method()), not by passing the object as an argument.

#### getters · Beginner · sample 3 — `getters.computed`

Complexity score 14; features: several-outputs.

```java
class Book {
    private int pagesRead;

    public Book(int start) {
        pagesRead = start;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public int getPagesReadWithBonus() {
        return pagesRead + 2;
    }
}

Book novel = new Book(13);
System.out.println(novel.getPagesReadWithBonus());
System.out.println(novel.getPagesReadWithBonus());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `15 ⏎ 17` — Thinks the accessor stores its result (`accessorStores`)
B. `2 ⏎ 2` — Ignores the constructor body (`forgetCtor`)
C. `15 ⏎ 15` — **correct**
D. `13 ⏎ 13` — Ignores the computation in the method (`ignoresComputation`)

Explanation: An accessor returns a value computed from the current fields. Calling it does not change the object, so later reads see the same stored field. The program prints these lines in order: 15, 15.

Trace: `Book novel = new Book(13);` → creates Object #1 (Book: pagesRead = 13); novel refers to Object #1; `System.out.println(novel.getPagesReadWithBonus());` → prints "15"; `System.out.println(novel.getPagesReadWithBonus());` → prints "15"

#### getters · Beginner · sample 4 — `getters.computed`

Complexity score 14; features: several-outputs.

```java
class Car {
    private int speed;

    public Car(int start) {
        speed = start;
    }

    public int getSpeed() {
        return speed;
    }

    public int getSpeedWithBonus() {
        return speed * 4;
    }
}

Car bus = new Car(4);
System.out.println(bus.getSpeedWithBonus());
System.out.println(bus.getSpeedWithBonus());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `16 ⏎ 16` — **correct**
B. `16 ⏎ 64` — Thinks the accessor stores its result (`accessorStores`)
C. `0 ⏎ 0` — Ignores the constructor body (`forgetCtor`)
D. `4 ⏎ 4` — Ignores the computation in the method (`ignoresComputation`)

Explanation: An accessor returns a value computed from the current fields. Calling it does not change the object, so later reads see the same stored field. The program prints these lines in order: 16, 16.

Trace: `Car bus = new Car(4);` → creates Object #1 (Car: speed = 4); bus refers to Object #1; `System.out.println(bus.getSpeedWithBonus());` → prints "16"; `System.out.println(bus.getSpeedWithBonus());` → prints "16"

#### getters · Beginner · sample 5 — `getters.computed`

Complexity score 14; features: several-outputs.

```java
class Lamp {
    private int brightness;

    public Lamp(int start) {
        brightness = start;
    }

    public int getBrightness() {
        return brightness;
    }

    public int getBrightnessWithBonus() {
        return brightness + 4;
    }
}

Lamp floor = new Lamp(15);
System.out.println(floor.getBrightnessWithBonus());
System.out.println(floor.getBrightnessWithBonus());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `19 ⏎ 19` — **correct**
B. `19 ⏎ 23` — Thinks the accessor stores its result (`accessorStores`)
C. `15 ⏎ 15` — Ignores the computation in the method (`ignoresComputation`)
D. `4 ⏎ 4` — Ignores the constructor body (`forgetCtor`)

Explanation: An accessor returns a value computed from the current fields. Calling it does not change the object, so later reads see the same stored field. The program prints these lines in order: 19, 19.

Trace: `Lamp floor = new Lamp(15);` → creates Object #1 (Lamp: brightness = 15); floor refers to Object #1; `System.out.println(floor.getBrightnessWithBonus());` → prints "19"; `System.out.println(floor.getBrightnessWithBonus());` → prints "19"

### Intermediate

#### getters · Intermediate · sample 1 — `getters.localcopy`

Complexity score 18; features: several-outputs.

```java
class Car {
    private int speed;

    public Car(int start) {
        speed = start;
    }

    public int getSpeed() {
        return speed;
    }

    public void accelerate(int mph) {
        speed += mph;
    }

    public void setSpeed(int mph) {
        speed = mph;
    }
}

Car van = new Car(15);
int copy = van.getSpeed();
copy *= 3;
van.accelerate(6);
System.out.println(van.getSpeed());
System.out.println(copy);
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `51 ⏎ 51` — Thinks a local copy is linked to the field (`localCopyLinked`)
B. `15 ⏎ 45` — Misses one of the updates (`lostUpdate`)
C. `6 ⏎ 45` — Treats += as replacement (`compoundAsReplace`)
D. `21 ⏎ 45` — **correct**

Explanation: A getter returns a copy of an int value. Changing the local variable afterward does not change the field, and changing the field does not change the local copy. The program prints these lines in order: 21, 45.

Trace: `Car van = new Car(15);` → creates Object #1 (Car: speed = 15); van refers to Object #1; `int copy = van.getSpeed();` → copy = 15; `copy *= 3;` → copy = 45; `van.accelerate(6);` → Object #1.speed: 15 → 21; `System.out.println(van.getSpeed());` → prints "21"; `System.out.println(copy);` → prints "45"

#### getters · Intermediate · sample 2 — `getters.access`

Complexity score 15; features: multi-field.

```java
class Book {
    private int pagesRead;
    public int rank;

    public Book(int start) {
        pagesRead = start;
    }

    public int getPagesRead() {
        return pagesRead;
    }
}

Book novel = new Book(16);
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**This code is in main, in a different class. Which statement compiles?**

A. `int v = novel.getPagesRead;` — Leaves off the method call parentheses (`missingParens`)
B. `int v = Book.getPagesRead();` — Calls an instance member through the class (`staticContext`)
C. `int v = getPagesRead(novel);` — Passes the object as an argument instead of calling on it (`wrongCallForm`)
D. `int v = novel.getPagesRead();` — **correct**

Explanation: From outside the class you can use only its public members: call public methods on an object with dot notation and parentheses; private fields and methods are hidden; static members are used through the class name. int v = novel.getPagesRead(); is the only choice that achieves the goal.

Trace: `int v = getPagesRead(novel);` → does not compile: An instance method is called on an object with dot notation (obj.method()), not by passing the object as an argument.; `int v = novel.getPagesRead();` → achieves the goal; `int v = Book.getPagesRead();` → does not compile: An instance method or field needs an object; it cannot be used through the class name or from a static method without a receiver.; `int v = novel.getPagesRead;` → does not compile: A method call needs parentheses, even with no arguments; without them the compiler looks for a field with that name.

#### getters · Intermediate · sample 3 — `getters.computed`

Complexity score 28; features: multi-field, several-outputs.

```java
class Book {
    private int pagesRead;
    private int bookmarks;

    public Book(int a, int b) {
        pagesRead = a;
        bookmarks = b;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public boolean isFinished() {
        return pagesRead >= 18;
    }

    public int getTotal() {
        return pagesRead + bookmarks;
    }

    public void read(int pages) {
        pagesRead += pages;
    }
}

Book novel = new Book(13, 8);
Book atlas = new Book(17, 5);
novel.read(4);
System.out.println(novel.isFinished());
System.out.println(novel.getTotal());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `true ⏎ 26` — Thinks all objects share an instance field (`instanceAsStatic`)
B. `false ⏎ 25` — **correct**
C. `false ⏎ 21` — Misses one of the updates (`lostUpdate`)
D. `false ⏎ 12` — Treats += as replacement (`compoundAsReplace`)

Explanation: An accessor returns a value computed from the current fields. Calling it does not change the object, so later reads see the same stored field. The program prints these lines in order: false, 25.

Trace: `Book novel = new Book(13, 8);` → creates Object #1 (Book: pagesRead = 13, bookmarks = 8); novel refers to Object #1; `Book atlas = new Book(17, 5);` → creates Object #2 (Book: pagesRead = 17, bookmarks = 5); atlas refers to Object #2; `novel.read(4);` → Object #1.pagesRead: 13 → 17; `System.out.println(novel.isFinished());` → prints "false"; `System.out.println(novel.getTotal());` → prints "25"

#### getters · Intermediate · sample 4 — `getters.localcopy`

Complexity score 18; features: several-outputs.

```java
class Lamp {
    private int brightness;

    public Lamp(int start) {
        brightness = start;
    }

    public int getBrightness() {
        return brightness;
    }

    public void brighten(int level) {
        brightness += level;
    }

    public void setBrightness(int level) {
        brightness = level;
    }
}

Lamp porch = new Lamp(3);
int copy = porch.getBrightness();
porch.brighten(4);
copy *= 3;
System.out.println(porch.getBrightness());
System.out.println(copy);
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `7 ⏎ 9` — **correct**
B. `4 ⏎ 9` — Treats += as replacement (`compoundAsReplace`)
C. `3 ⏎ 9` — Misses one of the updates (`lostUpdate`)
D. `21 ⏎ 21` — Thinks a local copy is linked to the field (`localCopyLinked`)

Explanation: A getter returns a copy of an int value. Changing the local variable afterward does not change the field, and changing the field does not change the local copy. The program prints these lines in order: 7, 9.

Trace: `Lamp porch = new Lamp(3);` → creates Object #1 (Lamp: brightness = 3); porch refers to Object #1; `int copy = porch.getBrightness();` → copy = 3; `porch.brighten(4);` → Object #1.brightness: 3 → 7; `copy *= 3;` → copy = 9; `System.out.println(porch.getBrightness());` → prints "7"; `System.out.println(copy);` → prints "9"

#### getters · Intermediate · sample 5 — `getters.computed`

Complexity score 22; features: multi-field, several-outputs.

```java
class Plant {
    private int height;
    private int leaves;

    public Plant(int a, int b) {
        height = a;
        leaves = b;
    }

    public int getHeight() {
        return height;
    }

    public int getHeightWithBonus() {
        return height * 4;
    }

    public int getTotal() {
        return height + leaves;
    }

    public void grow(int cm) {
        height += cm;
    }
}

Plant oak = new Plant(6, 3);
oak.grow(3);
System.out.println(oak.getHeightWithBonus());
System.out.println(oak.getHeightWithBonus());
System.out.println(oak.getTotal());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `36 ⏎ 144 ⏎ 147` — Thinks the accessor stores its result (`accessorStores`)
B. `24 ⏎ 24 ⏎ 9` — Misses one of the updates (`lostUpdate`)
C. `12 ⏎ 12 ⏎ 6` — Treats += as replacement (`compoundAsReplace`)
D. `36 ⏎ 36 ⏎ 12` — **correct**

Explanation: An accessor returns a value computed from the current fields. Calling it does not change the object, so later reads see the same stored field. The program prints these lines in order: 36, 36, 12.

Trace: `Plant oak = new Plant(6, 3);` → creates Object #1 (Plant: height = 6, leaves = 3); oak refers to Object #1; `oak.grow(3);` → Object #1.height: 6 → 9; `System.out.println(oak.getHeightWithBonus());` → prints "36"; `System.out.println(oak.getHeightWithBonus());` → prints "36"; `System.out.println(oak.getTotal());` → prints "12"

### Advanced

#### getters · Advanced · sample 1 — `getters.computed`

Complexity score 29; features: multi-field, several-outputs.

```java
class Ticket {
    private int price;
    private int sold;

    public Ticket(int a, int b) {
        price = a;
        sold = b;
    }

    public int getPrice() {
        return price;
    }

    public int getPriceWithBonus() {
        return price + 4;
    }

    public boolean isPricey() {
        return price > 9;
    }

    public int getTotal() {
        return price + sold;
    }

    public void raise(int dollars) {
        price += dollars;
    }
}

Ticket t1 = new Ticket(8, 6);
Ticket t3 = new Ticket(10, 1);
t3.raise(3);
System.out.println(t1.getPriceWithBonus());
System.out.println(t1.getPriceWithBonus());
System.out.println(t3.getTotal());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `12 ⏎ 16 ⏎ 14` — Thinks the accessor stores its result (`accessorStores`)
B. `17 ⏎ 17 ⏎ 14` — Thinks all objects share an instance field (`instanceAsStatic`)
C. `12 ⏎ 12 ⏎ 4` — Treats += as replacement (`compoundAsReplace`)
D. `12 ⏎ 12 ⏎ 14` — **correct**

Explanation: An accessor returns a value computed from the current fields. Calling it does not change the object, so later reads see the same stored field. The program prints these lines in order: 12, 12, 14.

Trace: `Ticket t1 = new Ticket(8, 6);` → creates Object #1 (Ticket: price = 8, sold = 6); t1 refers to Object #1; `Ticket t3 = new Ticket(10, 1);` → creates Object #2 (Ticket: price = 10, sold = 1); t3 refers to Object #2; `t3.raise(3);` → Object #2.price: 10 → 13; `System.out.println(t1.getPriceWithBonus());` → prints "12"; `System.out.println(t1.getPriceWithBonus());` → prints "12"; `System.out.println(t3.getTotal());` → prints "14"

#### getters · Advanced · sample 2 — `getters.access`

Complexity score 18; features: multi-field, static.

```java
class Book {
    private int pagesRead;
    public int rank;
    private static int made = 0;

    public Book(int start) {
        pagesRead = start;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    private int adjust() {
        return pagesRead + 1;
    }

    public static int getMade() {
        return made;
    }
}

Book novel = new Book(9);
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**This code is in main, in a different class. Which statement compiles?**

A. `int v = Book.getPagesRead();` — Calls an instance member through the class (`staticContext`)
B. `int v = novel.adjust();` — Accesses a private member from outside (`privateAccess`)
C. `int v = Book.getMade();` — **correct**
D. `int v = novel.pagesRead;` — Accesses a private member from outside (`privateAccess`)

Explanation: From outside the class you can use only its public members: call public methods on an object with dot notation and parentheses; private fields and methods are hidden; static members are used through the class name. int v = Book.getMade(); is the only choice that achieves the goal.

Trace: `int v = novel.adjust();` → does not compile: A private member is accessible only inside its own class, so this does not compile from main.; `int v = Book.getPagesRead();` → does not compile: An instance method or field needs an object; it cannot be used through the class name or from a static method without a receiver.; `int v = novel.pagesRead;` → does not compile: A private member is accessible only inside its own class, so this does not compile from main.; `int v = Book.getMade();` → achieves the goal

#### getters · Advanced · sample 3 — `getters.computed`

Complexity score 28; features: multi-field, several-outputs.

```java
class Book {
    private int pagesRead;
    private int bookmarks;

    public Book(int a, int b) {
        pagesRead = a;
        bookmarks = b;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public int getPagesReadWithBonus() {
        return pagesRead + 2;
    }

    public boolean isFinished() {
        return pagesRead >= 18;
    }

    public int getTotal() {
        return pagesRead + bookmarks;
    }

    public void read(int pages) {
        pagesRead += pages;
    }
}

Book novel = new Book(13, 8);
Book atlas = new Book(17, 5);
novel.read(4);
System.out.println(novel.isFinished());
System.out.println(novel.getPagesReadWithBonus());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `true ⏎ 23` — Thinks all objects share an instance field (`instanceAsStatic`)
B. `false ⏎ 19` — **correct**
C. `false ⏎ 15` — Misses one of the updates (`lostUpdate`)
D. `false ⏎ 6` — Treats += as replacement (`compoundAsReplace`)

Explanation: An accessor returns a value computed from the current fields. Calling it does not change the object, so later reads see the same stored field. The program prints these lines in order: false, 19.

Trace: `Book novel = new Book(13, 8);` → creates Object #1 (Book: pagesRead = 13, bookmarks = 8); novel refers to Object #1; `Book atlas = new Book(17, 5);` → creates Object #2 (Book: pagesRead = 17, bookmarks = 5); atlas refers to Object #2; `novel.read(4);` → Object #1.pagesRead: 13 → 17; `System.out.println(novel.isFinished());` → prints "false"; `System.out.println(novel.getPagesReadWithBonus());` → prints "19"

#### getters · Advanced · sample 4 — `getters.computed`

Complexity score 29; features: multi-field, several-outputs.

```java
class Plant {
    private int height;
    private int leaves;

    public Plant(int a, int b) {
        height = a;
        leaves = b;
    }

    public int getHeight() {
        return height;
    }

    public int getHeightWithBonus() {
        return height + 6;
    }

    public int getTotal() {
        return height + leaves;
    }

    public void grow(int cm) {
        height += cm;
    }
}

Plant palm = new Plant(12, 4);
Plant moss = new Plant(14, 7);
palm.grow(5);
System.out.println(palm.getHeightWithBonus());
System.out.println(moss.getTotal());
System.out.println(palm.getHeightWithBonus());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `25 ⏎ 26 ⏎ 25` — Thinks all objects share an instance field (`instanceAsStatic`)
B. `23 ⏎ 21 ⏎ 23` — **correct**
C. `11 ⏎ 21 ⏎ 11` — Treats += as replacement (`compoundAsReplace`)
D. `23 ⏎ 21 ⏎ 29` — Thinks the accessor stores its result (`accessorStores`)

Explanation: An accessor returns a value computed from the current fields. Calling it does not change the object, so later reads see the same stored field. The program prints these lines in order: 23, 21, 23.

Trace: `Plant palm = new Plant(12, 4);` → creates Object #1 (Plant: height = 12, leaves = 4); palm refers to Object #1; `Plant moss = new Plant(14, 7);` → creates Object #2 (Plant: height = 14, leaves = 7); moss refers to Object #2; `palm.grow(5);` → Object #1.height: 12 → 17; `System.out.println(palm.getHeightWithBonus());` → prints "23"; `System.out.println(moss.getTotal());` → prints "21"; `System.out.println(palm.getHeightWithBonus());` → prints "23"

#### getters · Advanced · sample 5 — `getters.access`

Complexity score 18; features: multi-field, static.

```java
class Timer {
    private int seconds;
    public int tier;
    private static int made = 0;

    public Timer(int start) {
        seconds = start;
    }

    public int getSeconds() {
        return seconds;
    }

    public static int getMade() {
        return made;
    }
}

Timer alarm = new Timer(7);
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**This code is in main, in a different class. Which statement compiles?**

A. `int v = alarm.seconds;` — Accesses a private member from outside (`privateAccess`)
B. `int v = getSeconds(alarm);` — Passes the object as an argument instead of calling on it (`wrongCallForm`)
C. `int v = alarm.getSeconds();` — **correct**
D. `int v = Timer.getSeconds();` — Calls an instance member through the class (`staticContext`)

Explanation: From outside the class you can use only its public members: call public methods on an object with dot notation and parentheses; private fields and methods are hidden; static members are used through the class name. int v = alarm.getSeconds(); is the only choice that achieves the goal.

Trace: `int v = Timer.getSeconds();` → does not compile: An instance method or field needs an object; it cannot be used through the class name or from a static method without a receiver.; `int v = getSeconds(alarm);` → does not compile: An instance method is called on an object with dot notation (obj.method()), not by passing the object as an argument.; `int v = alarm.seconds;` → does not compile: A private member is accessible only inside its own class, so this does not compile from main.; `int v = alarm.getSeconds();` → achieves the goal

## Setters and state updates (`setters`)

### Beginner

#### setters · Beginner · sample 1 — `setters.sequence`

Complexity score 21; features: conditional.

```java
class Car {
    private int speed;

    public Car(int start) {
        speed = start;
    }

    public int getSpeed() {
        return speed;
    }

    public void accelerate(int mph) {
        if (mph > 1) {
            speed += mph;
        }
    }
}

Car taxi = new Car(4);
taxi.accelerate(3);
taxi.accelerate(1);
System.out.println(taxi.getSpeed());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `8` — Ignores the method's condition (`ignoreGuards`)
B. `4` — Keeps only the last update (`onlyLastUpdate`)
C. `7` — **correct**
D. `3` — Treats += as replacement (`compoundAsReplace`)

Explanation: Apply each call in order to the current state. A setter replaces the value, += adds to it, and a condition or Math.min/Math.max inside the method can reject or limit the update. The program prints 7.

Trace: `Car taxi = new Car(4);` → creates Object #1 (Car: speed = 4); taxi refers to Object #1; `taxi.accelerate(3);` → Object #1.speed: 4 → 7; `taxi.accelerate(1);` → no stored value changes; `System.out.println(taxi.getSpeed());` → prints "7"

#### setters · Beginner · sample 2 — `setters.sequence`

Complexity score 22; features: conditional.

```java
class Student {
    private int credits;

    public Student(int start) {
        credits = start;
    }

    public int getCredits() {
        return credits;
    }

    public void earn(int hours) {
        if (hours >= 1) {
            credits += hours;
        }
    }
}

Student dev = new Student(11);
dev.earn(7);
dev.earn(1);
System.out.println(dev.getCredits());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `19` — **correct**
B. `1` — Treats += as replacement (`compoundAsReplace`)
C. `12` — Keeps only the last update (`onlyLastUpdate`)
D. `18` — Misses one of the updates (`lostUpdate`)

Explanation: Apply each call in order to the current state. A setter replaces the value, += adds to it, and a condition or Math.min/Math.max inside the method can reject or limit the update. The program prints 19.

Trace: `Student dev = new Student(11);` → creates Object #1 (Student: credits = 11); dev refers to Object #1; `dev.earn(7);` → Object #1.credits: 11 → 18; `dev.earn(1);` → Object #1.credits: 18 → 19; `System.out.println(dev.getCredits());` → prints "19"

#### setters · Beginner · sample 3 — `setters.sequence`

Complexity score 15; features: none.

```java
class Robot {
    private int steps;

    public Robot(int start) {
        steps = start;
    }

    public int getSteps() {
        return steps;
    }

    public void back(int n) {
        steps -= n;
    }
}

Robot probe = new Robot(7);
probe.back(10);
probe.back(2);
System.out.println(probe.getSteps());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `5` — Keeps only the last update (`onlyLastUpdate`)
B. `-3` — Misses one of the updates (`lostUpdate`)
C. `-5` — **correct**
D. `2` — Treats += as replacement (`compoundAsReplace`)

Explanation: Apply each call in order to the current state. A setter replaces the value, += adds to it, and a condition or Math.min/Math.max inside the method can reject or limit the update. The program prints -5.

Trace: `Robot probe = new Robot(7);` → creates Object #1 (Robot: steps = 7); probe refers to Object #1; `probe.back(10);` → Object #1.steps: 7 → -3; `probe.back(2);` → Object #1.steps: -3 → -5; `System.out.println(probe.getSteps());` → prints "-5"

#### setters · Beginner · sample 4 — `setters.sequence`

Complexity score 15; features: none.

```java
class Student {
    private int credits;

    public Student(int start) {
        credits = start;
    }

    public int getCredits() {
        return credits;
    }

    public void earn(int hours) {
        credits += hours;
    }

    public void drop(int hours) {
        credits -= hours;
    }
}

Student ana = new Student(1);
ana.drop(10);
ana.earn(7);
System.out.println(ana.getCredits());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `-2` — **correct**
B. `8` — Keeps only the last update (`onlyLastUpdate`)
C. `7` — Treats += as replacement (`compoundAsReplace`)
D. `-9` — Misses one of the updates (`lostUpdate`)

Explanation: Apply each call in order to the current state. A setter replaces the value, += adds to it, and a condition or Math.min/Math.max inside the method can reject or limit the update. The program prints -2.

Trace: `Student ana = new Student(1);` → creates Object #1 (Student: credits = 1); ana refers to Object #1; `ana.drop(10);` → Object #1.credits: 1 → -9; `ana.earn(7);` → Object #1.credits: -9 → -2; `System.out.println(ana.getCredits());` → prints "-2"

#### setters · Beginner · sample 5 — `setters.sequence`

Complexity score 15; features: none.

```java
class Plant {
    private int height;

    public Plant(int start) {
        height = start;
    }

    public int getHeight() {
        return height;
    }

    public void grow(int cm) {
        height += cm;
    }

    public void incrementHeight() {
        height++;
    }
}

Plant ivy = new Plant(8);
ivy.grow(5);
ivy.incrementHeight();
System.out.println(ivy.getHeight());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `9` — Keeps only the last update (`onlyLastUpdate`)
B. `13` — Misses one of the updates (`lostUpdate`)
C. `14` — **correct**
D. `6` — Treats += as replacement (`compoundAsReplace`)

Explanation: Apply each call in order to the current state. A setter replaces the value, += adds to it, and a condition or Math.min/Math.max inside the method can reject or limit the update. The program prints 14.

Trace: `Plant ivy = new Plant(8);` → creates Object #1 (Plant: height = 8); ivy refers to Object #1; `ivy.grow(5);` → Object #1.height: 8 → 13; `ivy.incrementHeight();` → Object #1.height: 13 → 14; `System.out.println(ivy.getHeight());` → prints "14"

### Intermediate

#### setters · Intermediate · sample 1 — `setters.sequence`

Complexity score 21; features: conditional.

```java
class Car {
    private int speed;

    public Car(int start) {
        speed = start;
    }

    public int getSpeed() {
        return speed;
    }

    public void resetSpeed() {
        speed = 0;
    }

    public void setSpeed(int mph) {
        if (mph > speed) {
            speed = mph;
        }
    }

    public void accelerate(int mph) {
        speed += mph;
    }
}

Car van = new Car(10);
van.accelerate(1);
van.setSpeed(5);
van.accelerate(8);
System.out.println(van.getSpeed());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `13` — Ignores the method's condition (`ignoreGuards`)
B. `8` — Treats += as replacement (`compoundAsReplace`)
C. `18` — Keeps only the last update (`onlyLastUpdate`)
D. `19` — **correct**

Explanation: Apply each call in order to the current state. A setter replaces the value, += adds to it, and a condition or Math.min/Math.max inside the method can reject or limit the update. The program prints 19.

Trace: `Car van = new Car(10);` → creates Object #1 (Car: speed = 10); van refers to Object #1; `van.accelerate(1);` → Object #1.speed: 10 → 11; `van.setSpeed(5);` → no stored value changes; `van.accelerate(8);` → Object #1.speed: 11 → 19; `System.out.println(van.getSpeed());` → prints "19"

#### setters · Intermediate · sample 2 — `setters.sequence`

Complexity score 17; features: none.

```java
class Book {
    private int pagesRead;

    public Book(int start) {
        pagesRead = start;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public void read(int pages) {
        pagesRead += pages;
    }

    public void reread(int pages) {
        pagesRead -= pages;
    }

    public void doublePagesRead() {
        pagesRead *= 2;
    }
}

Book novel = new Book(7);
novel.reread(4);
novel.read(9);
novel.reread(11);
System.out.println(novel.getPagesRead());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `12` — Misses one of the updates (`lostUpdate`)
B. `-4` — Keeps only the last update (`onlyLastUpdate`)
C. `1` — **correct**
D. `11` — Treats += as replacement (`compoundAsReplace`)

Explanation: Apply each call in order to the current state. A setter replaces the value, += adds to it, and a condition or Math.min/Math.max inside the method can reject or limit the update. The program prints 1.

Trace: `Book novel = new Book(7);` → creates Object #1 (Book: pagesRead = 7); novel refers to Object #1; `novel.reread(4);` → Object #1.pagesRead: 7 → 3; `novel.read(9);` → Object #1.pagesRead: 3 → 12; `novel.reread(11);` → Object #1.pagesRead: 12 → 1; `System.out.println(novel.getPagesRead());` → prints "1"

#### setters · Intermediate · sample 3 — `setters.sequence`

Complexity score 22; features: conditional.

```java
class Account {
    private int balance;

    public Account(int start) {
        balance = start;
    }

    public int getBalance() {
        return balance;
    }

    public void withdraw(int amount) {
        balance -= amount;
    }

    public void setBalance(int amount) {
        if (amount >= 10) {
            balance = amount;
        } else {
            balance = 0;
        }
    }
}

Account college = new Account(10);
college.setBalance(10);
college.withdraw(11);
college.withdraw(7);
System.out.println(college.getBalance());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `2` — Thinks a setter adds to the old value (`setAdds`)
B. `7` — Treats += as replacement (`compoundAsReplace`)
C. `-8` — **correct**
D. `-18` — Misreads the boundary of the condition (`boundary`)

Explanation: Apply each call in order to the current state. A setter replaces the value, += adds to it, and a condition or Math.min/Math.max inside the method can reject or limit the update. The program prints -8.

Trace: `Account college = new Account(10);` → creates Object #1 (Account: balance = 10); college refers to Object #1; `college.setBalance(10);` → no stored value changes; `college.withdraw(11);` → Object #1.balance: 10 → -1; `college.withdraw(7);` → Object #1.balance: -1 → -8; `System.out.println(college.getBalance());` → prints "-8"

#### setters · Intermediate · sample 4 — `setters.sequence`

Complexity score 21; features: conditional.

```java
class Tank {
    private int level;

    public Tank(int start) {
        level = start;
    }

    public int getLevel() {
        return level;
    }

    public void drain(int liters) {
        level -= liters;
    }

    public void setLevel(int liters) {
        if (liters > 10) {
            level = liters;
        }
    }
}

Tank tankE = new Tank(5);
tankE.drain(5);
tankE.drain(11);
tankE.setLevel(9);
System.out.println(tankE.getLevel());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `-11` — **correct**
B. `-6` — Misses one of the updates (`lostUpdate`)
C. `9` — Ignores the method's condition (`ignoreGuards`)
D. `11` — Treats += as replacement (`compoundAsReplace`)

Explanation: Apply each call in order to the current state. A setter replaces the value, += adds to it, and a condition or Math.min/Math.max inside the method can reject or limit the update. The program prints -11.

Trace: `Tank tankE = new Tank(5);` → creates Object #1 (Tank: level = 5); tankE refers to Object #1; `tankE.drain(5);` → Object #1.level: 5 → 0; `tankE.drain(11);` → Object #1.level: 0 → -11; `tankE.setLevel(9);` → no stored value changes; `System.out.println(tankE.getLevel());` → prints "-11"

#### setters · Intermediate · sample 5 — `setters.sequence`

Complexity score 17; features: none.

```java
class Player {
    private int score;

    public Player(int start) {
        score = start;
    }

    public int getScore() {
        return score;
    }

    public void addPoints(int points) {
        score += points;
    }

    public void incrementScore() {
        score++;
    }
}

Player p2 = new Player(1);
p2.addPoints(1);
p2.addPoints(4);
p2.incrementScore();
System.out.println(p2.getScore());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `3` — Misses one of the updates (`lostUpdate`)
B. `5` — Treats += as replacement (`compoundAsReplace`)
C. `2` — Keeps only the last update (`onlyLastUpdate`)
D. `7` — **correct**

Explanation: Apply each call in order to the current state. A setter replaces the value, += adds to it, and a condition or Math.min/Math.max inside the method can reject or limit the update. The program prints 7.

Trace: `Player p2 = new Player(1);` → creates Object #1 (Player: score = 1); p2 refers to Object #1; `p2.addPoints(1);` → Object #1.score: 1 → 2; `p2.addPoints(4);` → Object #1.score: 2 → 6; `p2.incrementScore();` → Object #1.score: 6 → 7; `System.out.println(p2.getScore());` → prints "7"

### Advanced

#### setters · Advanced · sample 1 — `setters.sequence`

Complexity score 38; features: conditional, multi-field, several-decisions.

```java
class Car {
    private int speed;
    private int trips;

    public Car(int start) {
        speed = start;
    }

    public int getSpeed() {
        return speed;
    }

    public void brake(int mph) {
        if (mph <= speed) {
            speed -= mph;
        }
    }

    public void accelerate(int mph) {
        if (mph >= 1) {
            speed += mph;
        }
    }

    public void setSpeed(int mph) {
        if (mph >= 1) {
            speed = mph;
            trips++;
        }
    }

    public int getTrips() {
        return trips;
    }
}

Car van = new Car(1);
van.setSpeed(8);
van.brake(14);
van.accelerate(1);
van.brake(2);
System.out.println(van.getSpeed() + " " + van.getTrips());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `8 1` — Thinks a setter adds to the old value (`setAdds`)
B. `-7 1` — Ignores the method's condition (`ignoreGuards`)
C. `1 1` — Treats += as replacement (`compoundAsReplace`)
D. `7 1` — **correct**

Explanation: Apply each call in order to the current state. A setter replaces the value, += adds to it, and a condition or Math.min/Math.max inside the method can reject or limit the update. The program prints 7 1.

Trace: `Car van = new Car(1);` → creates Object #1 (Car: speed = 1, trips = 0); van refers to Object #1; `van.setSpeed(8);` → Object #1.speed: 1 → 8; Object #1.trips: 0 → 1; `van.brake(14);` → no stored value changes; `van.accelerate(1);` → Object #1.speed: 8 → 9; `van.brake(2);` → Object #1.speed: 9 → 7; `System.out.println(van.getSpeed() + " " + van.getTrips());` → prints "7 1"

#### setters · Advanced · sample 2 — `setters.sequence`

Complexity score 40; features: several-outputs, several-receivers.

```java
class Robot {
    private int steps;

    public Robot(int start) {
        steps = start;
    }

    public int getSteps() {
        return steps;
    }

    public void doubleSteps() {
        steps *= 2;
    }

    public void move(int n) {
        steps = Math.min(20, steps + n);
    }
}

Robot scout = new Robot(12);
Robot probe = new Robot(10);
probe.doubleSteps();
scout.doubleSteps();
scout.move(8);
scout.move(19);
scout.doubleSteps();
System.out.println(scout.getSteps());
System.out.println(probe.getSteps());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `102 ⏎ 20` — Ignores the Math.min/Math.max limit (`ignoreClamp`)
B. `24 ⏎ 20` — Keeps only the last update (`onlyLastUpdate`)
C. `40 ⏎ 20` — **correct**
D. `20 ⏎ 20` — Misses one of the updates (`lostUpdate`)

Explanation: Apply each call in order to the current state. A setter replaces the value, += adds to it, and a condition or Math.min/Math.max inside the method can reject or limit the update. The program prints these lines in order: 40, 20.

Trace: `Robot scout = new Robot(12);` → creates Object #1 (Robot: steps = 12); scout refers to Object #1; `Robot probe = new Robot(10);` → creates Object #2 (Robot: steps = 10); probe refers to Object #2; `probe.doubleSteps();` → Object #2.steps: 10 → 20; `scout.doubleSteps();` → Object #1.steps: 12 → 24; `scout.move(8);` → Object #1.steps: 24 → 20; `scout.move(19);` → no stored value changes; `scout.doubleSteps();` → Object #1.steps: 20 → 40; `System.out.println(scout.getSteps());` → prints "40"; `System.out.println(probe.getSteps());` → prints "20"

#### setters · Advanced · sample 3 — `setters.sequence`

Complexity score 33; features: conditional, several-decisions.

```java
class Account {
    private int balance;

    public Account(int start) {
        balance = start;
    }

    public int getBalance() {
        return balance;
    }

    public void setBalance(int amount) {
        if (amount > balance) {
            balance = amount;
        }
    }

    public void incrementBalance() {
        balance++;
    }

    public void withdraw(int amount) {
        balance = Math.max(0, balance - amount);
    }
}

Account college = new Account(9);
college.setBalance(18);
college.withdraw(11);
college.incrementBalance();
college.setBalance(2);
college.incrementBalance();
System.out.println(college.getBalance());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `18` — Thinks a setter adds to the old value (`setAdds`)
B. `3` — Ignores the method's condition (`ignoreGuards`)
C. `9` — **correct**
D. `8` — Misses one of the updates (`lostUpdate`)

Explanation: Apply each call in order to the current state. A setter replaces the value, += adds to it, and a condition or Math.min/Math.max inside the method can reject or limit the update. The program prints 9.

Trace: `Account college = new Account(9);` → creates Object #1 (Account: balance = 9); college refers to Object #1; `college.setBalance(18);` → Object #1.balance: 9 → 18; `college.withdraw(11);` → Object #1.balance: 18 → 7; `college.incrementBalance();` → Object #1.balance: 7 → 8; `college.setBalance(2);` → no stored value changes; `college.incrementBalance();` → Object #1.balance: 8 → 9; `System.out.println(college.getBalance());` → prints "9"

#### setters · Advanced · sample 4 — `setters.sequence`

Complexity score 37; features: conditional, multi-field, several-decisions.

```java
class Timer {
    private int seconds;
    private int laps;

    public Timer(int start) {
        seconds = start;
    }

    public int getSeconds() {
        return seconds;
    }

    public void removeTime(int s) {
        if (s <= seconds) {
            seconds -= s;
        }
    }

    public void doubleSeconds() {
        seconds *= 2;
    }

    public void addTime(int s) {
        seconds += s;
        laps++;
    }

    public int getLaps() {
        return laps;
    }
}

Timer timer = new Timer(4);
timer.removeTime(13);
timer.removeTime(13);
timer.addTime(1);
timer.removeTime(5);
timer.doubleSeconds();
System.out.println(timer.getSeconds() + " " + timer.getLaps());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `-52 1` — Ignores the method's condition (`ignoreGuards`)
B. `2 1` — Treats += as replacement (`compoundAsReplace`)
C. `10 1` — Misses one of the updates (`lostUpdate`)
D. `0 1` — **correct**

Explanation: Apply each call in order to the current state. A setter replaces the value, += adds to it, and a condition or Math.min/Math.max inside the method can reject or limit the update. The program prints 0 1.

Trace: `Timer timer = new Timer(4);` → creates Object #1 (Timer: seconds = 4, laps = 0); timer refers to Object #1; `timer.removeTime(13);` → no stored value changes; `timer.removeTime(13);` → no stored value changes; `timer.addTime(1);` → Object #1.seconds: 4 → 5; Object #1.laps: 0 → 1; `timer.removeTime(5);` → Object #1.seconds: 5 → 0; `timer.doubleSeconds();` → no stored value changes; `System.out.println(timer.getSeconds() + " " + timer.getLaps());` → prints "0 1"

#### setters · Advanced · sample 5 — `setters.sequence`

Complexity score 52; features: conditional, several-decisions, several-outputs, several-receivers.

```java
class Robot {
    private int steps;

    public Robot(int start) {
        steps = start;
    }

    public int getSteps() {
        return steps;
    }

    public void setSteps(int n) {
        if (n > steps) {
            steps = n;
        }
    }

    public void back(int n) {
        steps = Math.max(0, steps - n);
    }
}

Robot rover = new Robot(12);
Robot probe = new Robot(8);
probe.back(11);
probe.setSteps(3);
rover.back(7);
probe.setSteps(4);
rover.back(11);
System.out.println(rover.getSteps());
System.out.println(probe.getSteps());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `-6 ⏎ 4` — Ignores the Math.min/Math.max limit (`ignoreClamp`)
B. `5 ⏎ 0` — Applies a call to the wrong object (`wrongReceiver`)
C. `0 ⏎ 4` — **correct**
D. `0 ⏎ 7` — Thinks a setter adds to the old value (`setAdds`)

Explanation: Apply each call in order to the current state. A setter replaces the value, += adds to it, and a condition or Math.min/Math.max inside the method can reject or limit the update. The program prints these lines in order: 0, 4.

Trace: `Robot rover = new Robot(12);` → creates Object #1 (Robot: steps = 12); rover refers to Object #1; `Robot probe = new Robot(8);` → creates Object #2 (Robot: steps = 8); probe refers to Object #2; `probe.back(11);` → Object #2.steps: 8 → 0; `probe.setSteps(3);` → Object #2.steps: 0 → 3; `rover.back(7);` → Object #1.steps: 12 → 5; `probe.setSteps(4);` → Object #2.steps: 3 → 4; `rover.back(11);` → Object #1.steps: 5 → 0; `System.out.println(rover.getSteps());` → prints "0"; `System.out.println(probe.getSteps());` → prints "4"

## this and parameter shadowing (`this`)

### Beginner

#### this · Beginner · sample 1 — `this.shadow`

Complexity score 24; features: several-outputs, shadowing.

```java
class Ticket {
    private int price;

    public Ticket(int price) {
        price = price;
    }

    public int getPrice() {
        return price;
    }

    public void raise(int dollars) {
        this.price += dollars;
    }
}

Ticket t1 = new Ticket(5);
Ticket t3 = new Ticket(11);
t1.raise(19);
System.out.println(t1.getPrice());
System.out.println(t3.getPrice());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `19 ⏎ 0` — **correct**
B. `0 ⏎ 0` — Misses one of the updates (`lostUpdate`)
C. `0 ⏎ 19` — Applies a call to the wrong object (`wrongReceiver`)
D. `24 ⏎ 11` — Thinks an unqualified name means the field (`shadowAssignsField`)

Explanation: Inside a constructor or method, a parameter or local variable with the same name as a field hides (shadows) the field. Only this.name refers to the field; a plain name refers to the parameter or local. The program prints these lines in order: 19, 0.

Trace: `Ticket t1 = new Ticket(5);` → creates Object #1 (Ticket: price = 0); t1 refers to Object #1; `Ticket t3 = new Ticket(11);` → creates Object #2 (Ticket: price = 0); t3 refers to Object #2; `t1.raise(19);` → Object #1.price: 0 → 19; `System.out.println(t1.getPrice());` → prints "19"; `System.out.println(t3.getPrice());` → prints "0"

#### this · Beginner · sample 2 — `this.receiver`

Complexity score 26; features: several-outputs, shadowing.

```java
class Book {
    private int pagesRead;

    public Book(int pagesRead) {
        this.pagesRead = pagesRead;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public void read(int pages) {
        pagesRead += pages;
    }

    public void copyFrom(Book other) {
        this.pagesRead = other.pagesRead;
    }
}

Book novel = new Book(4);
Book diary = new Book(5);
novel.copyFrom(diary);
System.out.println(novel.getPagesRead());
System.out.println(diary.getPagesRead());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `0 ⏎ 0` — Ignores the constructor body (`forgetCtor`)
B. `4 ⏎ 4` — Mixes up this and the argument (`thisIsArgument`)
C. `4 ⏎ 5` — Applies a call to the wrong object (`wrongReceiver`)
D. `5 ⏎ 5` — **correct**

Explanation: this is the object before the dot in the call; the parameter is the other object. A method can read and write both, and returning this returns the receiver itself. The program prints these lines in order: 5, 5.

Trace: `Book novel = new Book(4);` → creates Object #1 (Book: pagesRead = 4); novel refers to Object #1; `Book diary = new Book(5);` → creates Object #2 (Book: pagesRead = 5); diary refers to Object #2; `novel.copyFrom(diary);` → Object #1.pagesRead: 4 → 5; `System.out.println(novel.getPagesRead());` → prints "5"; `System.out.println(diary.getPagesRead());` → prints "5"

#### this · Beginner · sample 3 — `this.shadow`

Complexity score 25; features: several-outputs, shadowing.

```java
class Account {
    private int balance;

    public Account(int start) {
        balance = start;
    }

    public int getBalance() {
        return balance;
    }

    public void deposit(int amount) {
        int balance = 1;
        balance += amount;
    }
}

Account college = new Account(7);
Account savings = new Account(3);
college.deposit(17);
System.out.println(college.getBalance());
System.out.println(savings.getBalance());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `7 ⏎ 3` — **correct**
B. `18 ⏎ 3` — Thinks an unqualified name means the field (`shadowAssignsField`)
C. `3 ⏎ 3` — Thinks all objects share an instance field (`instanceAsStatic`)
D. `0 ⏎ 0` — Ignores the constructor body (`forgetCtor`)

Explanation: Inside a constructor or method, a parameter or local variable with the same name as a field hides (shadows) the field. Only this.name refers to the field; a plain name refers to the parameter or local. The program prints these lines in order: 7, 3.

Trace: `Account college = new Account(7);` → creates Object #1 (Account: balance = 7); college refers to Object #1; `Account savings = new Account(3);` → creates Object #2 (Account: balance = 3); savings refers to Object #2; `college.deposit(17);` → no stored value changes; `System.out.println(college.getBalance());` → prints "7"; `System.out.println(savings.getBalance());` → prints "3"

#### this · Beginner · sample 4 — `this.receiver`

Complexity score 26; features: several-outputs, shadowing.

```java
class Lamp {
    private int brightness;

    public Lamp(int brightness) {
        this.brightness = brightness;
    }

    public int getBrightness() {
        return brightness;
    }

    public void brighten(int level) {
        brightness += level;
    }

    public void copyTo(Lamp other) {
        other.brightness = this.brightness;
    }
}

Lamp night = new Lamp(9);
Lamp floor = new Lamp(13);
night.copyTo(floor);
System.out.println(night.getBrightness());
System.out.println(floor.getBrightness());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `9 ⏎ 9` — **correct**
B. `9 ⏎ 13` — Applies a call to the wrong object (`wrongReceiver`)
C. `0 ⏎ 0` — Ignores the constructor body (`forgetCtor`)
D. `13 ⏎ 13` — Mixes up this and the argument (`thisIsArgument`)

Explanation: this is the object before the dot in the call; the parameter is the other object. A method can read and write both, and returning this returns the receiver itself. The program prints these lines in order: 9, 9.

Trace: `Lamp night = new Lamp(9);` → creates Object #1 (Lamp: brightness = 9); night refers to Object #1; `Lamp floor = new Lamp(13);` → creates Object #2 (Lamp: brightness = 13); floor refers to Object #2; `night.copyTo(floor);` → Object #2.brightness: 13 → 9; `System.out.println(night.getBrightness());` → prints "9"; `System.out.println(floor.getBrightness());` → prints "9"

#### this · Beginner · sample 5 — `this.shadow`

Complexity score 21; features: several-outputs, shadowing.

```java
class Plant {
    private int height;

    public Plant(int height) {
        height = height;
    }

    public int getHeight() {
        return height;
    }
}

Plant oak = new Plant(8);
Plant fern = new Plant(5);
System.out.println(oak.getHeight());
System.out.println(fern.getHeight());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `8 ⏎ 5` — Thinks an unqualified name means the field (`shadowAssignsField`)
B. `0 ⏎ 0` — **correct**
C. `The code does not compile` — Thinks x = x; does not compile (`selfAssignError`)
D. `null ⏎ null` — Thinks every field defaults to null (`defaultsNull`)

Explanation: Inside a constructor or method, a parameter or local variable with the same name as a field hides (shadows) the field. Only this.name refers to the field; a plain name refers to the parameter or local. The program prints these lines in order: 0, 0.

Trace: `Plant oak = new Plant(8);` → creates Object #1 (Plant: height = 0); oak refers to Object #1; `Plant fern = new Plant(5);` → creates Object #2 (Plant: height = 0); fern refers to Object #2; `System.out.println(oak.getHeight());` → prints "0"; `System.out.println(fern.getHeight());` → prints "0"

### Intermediate

#### this · Intermediate · sample 1 — `this.returnthis`

Complexity score 34; features: alias, returns-reference, returns-this, several-outputs, shadowing.

```java
class Car {
    private int speed;

    public Car(int speed) {
        this.speed = speed;
    }

    public int getSpeed() {
        return speed;
    }

    public Car accelerate(int mph) {
        speed += mph;
        return this;
    }

    public Car setSpeed(int speed) {
        this.speed = speed;
        return this;
    }
}

Car van = new Car(9);
Car truck = van.accelerate(4).accelerate(5);
truck.accelerate(5);
System.out.println(van.getSpeed());
System.out.println(van == truck);
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `13 ⏎ false` — Thinks return this makes a new object (`returnThisCopies`)
B. `18 ⏎ true` — Misses one of the updates (`lostUpdate`)
C. `23 ⏎ true` — **correct**
D. `14 ⏎ true` — Keeps only the last update (`onlyLastUpdate`)

Explanation: A method that ends with return this returns a reference to the same object, so chained calls all act on one object and the variable that stores the result is an alias. The program prints these lines in order: 23, true.

Trace: `Car van = new Car(9);` → creates Object #1 (Car: speed = 9); van refers to Object #1; `Car truck = van.accelerate(4).accelerate(5);` → truck refers to Object #1 (the same object as van); Object #1.speed: 9 → 18; `truck.accelerate(5);` → Object #1.speed: 18 → 23; `System.out.println(van.getSpeed());` → prints "23"; `System.out.println(van == truck);` → prints "true"

#### this · Intermediate · sample 2 — `this.receiver`

Complexity score 43; features: alias, conditional, returns-reference, returns-this, several-outputs, shadowing.

```java
class Book {
    private int pagesRead;

    public Book(int pagesRead) {
        this.pagesRead = pagesRead;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public void read(int pages) {
        pagesRead += pages;
    }

    public Book larger(Book other) {
        if (pagesRead >= other.pagesRead) {
            return this;
        }
        return other;
    }
}

Book novel = new Book(5);
Book diary = new Book(18);
Book comic = diary.larger(novel);
comic.read(5);
System.out.println(novel.getPagesRead());
System.out.println(diary.getPagesRead());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `5 ⏎ 18` — Thinks return this makes a new object (`returnThisCopies`)
B. `23 ⏎ 23` — Thinks all objects share an instance field (`instanceAsStatic`)
C. `10 ⏎ 18` — Applies a call to the wrong object (`wrongReceiver`)
D. `5 ⏎ 23` — **correct**

Explanation: this is the object before the dot in the call; the parameter is the other object. A method can read and write both, and returning this returns the receiver itself. The program prints these lines in order: 5, 23.

Trace: `Book novel = new Book(5);` → creates Object #1 (Book: pagesRead = 5); novel refers to Object #1; `Book diary = new Book(18);` → creates Object #2 (Book: pagesRead = 18); diary refers to Object #2; `Book comic = diary.larger(novel);` → comic refers to Object #2 (the same object as diary); `comic.read(5);` → Object #2.pagesRead: 18 → 23; `System.out.println(novel.getPagesRead());` → prints "5"; `System.out.println(diary.getPagesRead());` → prints "23"

#### this · Intermediate · sample 3 — `this.shadow`

Complexity score 26; features: several-outputs, shadowing.

```java
class Book {
    private int pagesRead;

    public Book(int pagesRead) {
        this.pagesRead = pagesRead;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public void read(int pages) {
        int pagesRead = pages + 3;
        this.pagesRead += pagesRead;
    }
}

Book novel = new Book(11);
Book atlas = new Book(13);
novel.read(6);
System.out.println(novel.getPagesRead());
System.out.println(atlas.getPagesRead());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `0 ⏎ 0` — Thinks this.name means the parameter (`thisMeansParam`)
B. `22 ⏎ 22` — Thinks all objects share an instance field (`instanceAsStatic`)
C. `20 ⏎ 13` — **correct**
D. `9 ⏎ 0` — Ignores the constructor body (`forgetCtor`)

Explanation: Inside a constructor or method, a parameter or local variable with the same name as a field hides (shadows) the field. Only this.name refers to the field; a plain name refers to the parameter or local. The program prints these lines in order: 20, 13.

Trace: `Book novel = new Book(11);` → creates Object #1 (Book: pagesRead = 11); novel refers to Object #1; `Book atlas = new Book(13);` → creates Object #2 (Book: pagesRead = 13); atlas refers to Object #2; `novel.read(6);` → Object #1.pagesRead: 11 → 20; `System.out.println(novel.getPagesRead());` → prints "20"; `System.out.println(atlas.getPagesRead());` → prints "13"

#### this · Intermediate · sample 4 — `this.returnthis`

Complexity score 34; features: alias, returns-reference, returns-this, several-outputs, shadowing.

```java
class Lamp {
    private int brightness;

    public Lamp(int brightness) {
        this.brightness = brightness;
    }

    public int getBrightness() {
        return brightness;
    }

    public Lamp brighten(int level) {
        brightness += level;
        return this;
    }

    public Lamp setBrightness(int brightness) {
        this.brightness = brightness;
        return this;
    }
}

Lamp porch = new Lamp(6);
Lamp night = porch.brighten(3).brighten(1);
porch.brighten(5);
System.out.println(porch == night);
System.out.println(porch.getBrightness());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `true ⏎ 15` — **correct**
B. `false ⏎ 14` — Thinks return this makes a new object (`returnThisCopies`)
C. `true ⏎ 5` — Treats += as replacement (`compoundAsReplace`)
D. `true ⏎ 11` — Keeps only the last update (`onlyLastUpdate`)

Explanation: A method that ends with return this returns a reference to the same object, so chained calls all act on one object and the variable that stores the result is an alias. The program prints these lines in order: true, 15.

Trace: `Lamp porch = new Lamp(6);` → creates Object #1 (Lamp: brightness = 6); porch refers to Object #1; `Lamp night = porch.brighten(3).brighten(1);` → night refers to Object #1 (the same object as porch); Object #1.brightness: 6 → 10; `porch.brighten(5);` → Object #1.brightness: 10 → 15; `System.out.println(porch == night);` → prints "true"; `System.out.println(porch.getBrightness());` → prints "15"

#### this · Intermediate · sample 5 — `this.shadow`

Complexity score 14; features: shadowing.

```java
class Plant {
    private int height;

    public Plant(int height) {
        height = height;
    }

    public int getHeight() {
        return height;
    }

    public void grow(int cm) {
        int height = cm + 1;
        this.height += height;
    }
}

Plant oak = new Plant(5);
oak.grow(13);
System.out.println(oak.getHeight());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `The code does not compile` — Thinks x = x; does not compile (`selfAssignError`)
B. `0` — Thinks this.name means the parameter (`thisMeansParam`)
C. `19` — Thinks an unqualified name means the field (`shadowAssignsField`)
D. `14` — **correct**

Explanation: Inside a constructor or method, a parameter or local variable with the same name as a field hides (shadows) the field. Only this.name refers to the field; a plain name refers to the parameter or local. The program prints 14.

Trace: `Plant oak = new Plant(5);` → creates Object #1 (Plant: height = 0); oak refers to Object #1; `oak.grow(13);` → Object #1.height: 0 → 14; `System.out.println(oak.getHeight());` → prints "14"

### Advanced

#### this · Advanced · sample 1 — `this.returnthis`

Complexity score 37; features: alias, returns-reference, returns-this, several-outputs, shadowing.

```java
class Car {
    private int speed;

    public Car(int speed) {
        this.speed = speed;
    }

    public int getSpeed() {
        return speed;
    }

    public Car accelerate(int mph) {
        speed += mph;
        return this;
    }

    public Car setSpeed(int speed) {
        this.speed = speed;
        return this;
    }
}

Car van = new Car(8);
Car truck = van.accelerate(4).accelerate(5).setSpeed(13);
truck.accelerate(3);
System.out.println(van.getSpeed());
System.out.println(van == truck);
System.out.println(truck.getSpeed());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `16 ⏎ true ⏎ 16` — **correct**
B. `3 ⏎ true ⏎ 3` — Treats += as replacement (`compoundAsReplace`)
C. `11 ⏎ true ⏎ 11` — Keeps only the last update (`onlyLastUpdate`)
D. `12 ⏎ false ⏎ 16` — Thinks return this makes a new object (`returnThisCopies`)

Explanation: A method that ends with return this returns a reference to the same object, so chained calls all act on one object and the variable that stores the result is an alias. The program prints these lines in order: 16, true, 16.

Trace: `Car van = new Car(8);` → creates Object #1 (Car: speed = 8); van refers to Object #1; `Car truck = van.accelerate(4).accelerate(5).setSpeed(13);` → truck refers to Object #1 (the same object as van); Object #1.speed: 8 → 13; `truck.accelerate(3);` → Object #1.speed: 13 → 16; `System.out.println(van.getSpeed());` → prints "16"; `System.out.println(van == truck);` → prints "true"; `System.out.println(truck.getSpeed());` → prints "16"

#### this · Advanced · sample 2 — `this.receiver`

Complexity score 51; features: alias, conditional, returns-reference, returns-this, several-outputs, several-receivers, shadowing.

```java
class Book {
    private int pagesRead;

    public Book(int pagesRead) {
        this.pagesRead = pagesRead;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public void read(int pages) {
        pagesRead += pages;
    }

    public Book larger(Book other) {
        if (pagesRead >= other.pagesRead) {
            return this;
        }
        return other;
    }

    public void copyFrom(Book other) {
        this.pagesRead = other.pagesRead;
    }
}

Book novel = new Book(5);
Book diary = new Book(18);
Book comic = diary.larger(novel);
comic.read(5);
novel.copyFrom(diary);
novel.read(1);
System.out.println(novel.getPagesRead());
System.out.println(diary.getPagesRead());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `6 ⏎ 5` — Mixes up this and the argument (`thisIsArgument`)
B. `6 ⏎ 23` — Keeps only the last update (`onlyLastUpdate`)
C. `24 ⏎ 23` — **correct**
D. `19 ⏎ 18` — Thinks return this makes a new object (`returnThisCopies`)

Explanation: this is the object before the dot in the call; the parameter is the other object. A method can read and write both, and returning this returns the receiver itself. The program prints these lines in order: 24, 23.

Trace: `Book novel = new Book(5);` → creates Object #1 (Book: pagesRead = 5); novel refers to Object #1; `Book diary = new Book(18);` → creates Object #2 (Book: pagesRead = 18); diary refers to Object #2; `Book comic = diary.larger(novel);` → comic refers to Object #2 (the same object as diary); `comic.read(5);` → Object #2.pagesRead: 18 → 23; `novel.copyFrom(diary);` → Object #1.pagesRead: 5 → 23; `novel.read(1);` → Object #1.pagesRead: 23 → 24; `System.out.println(novel.getPagesRead());` → prints "24"; `System.out.println(diary.getPagesRead());` → prints "23"

#### this · Advanced · sample 3 — `this.shadow`

Complexity score 34; features: multi-field, several-outputs, several-receivers, shadowing.

```java
class Account {
    private int balance;
    private int deposits;

    public Account(int balance, int deposits) {
        this.balance = balance;
        deposits = deposits;
    }

    public int getBalance() {
        return balance;
    }

    public int getDeposits() {
        return deposits;
    }

    public void setBalance(int balance) {
        balance = balance;
    }

    public void deposit(int amount) {
        int balance = 1;
        balance += amount;
    }
}

Account college = new Account(6, 10);
Account savings = new Account(7, 8);
college.setBalance(15);
savings.deposit(16);
System.out.println(college.getBalance() + " " + college.getDeposits());
System.out.println(savings.getBalance() + " " + savings.getDeposits());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `7 0 ⏎ 7 0` — Thinks all objects share an instance field (`instanceAsStatic`)
B. `0 0 ⏎ 0 0` — Thinks this.name means the parameter (`thisMeansParam`)
C. `15 10 ⏎ 17 8` — Thinks an unqualified name means the field (`shadowAssignsField`)
D. `6 0 ⏎ 7 0` — **correct**

Explanation: Inside a constructor or method, a parameter or local variable with the same name as a field hides (shadows) the field. Only this.name refers to the field; a plain name refers to the parameter or local. The program prints these lines in order: 6 0, 7 0.

Trace: `Account college = new Account(6, 10);` → creates Object #1 (Account: balance = 6, deposits = 0); college refers to Object #1; `Account savings = new Account(7, 8);` → creates Object #2 (Account: balance = 7, deposits = 0); savings refers to Object #2; `college.setBalance(15);` → no stored value changes; `savings.deposit(16);` → no stored value changes; `System.out.println(college.getBalance() + " " + college.getDeposits());` → prints "6 0"; `System.out.println(savings.getBalance() + " " + savings.getDeposits());` → prints "7 0"

#### this · Advanced · sample 4 — `this.returnthis`

Complexity score 37; features: alias, returns-reference, returns-this, several-outputs, shadowing.

```java
class Ticket {
    private int price;

    public Ticket(int price) {
        this.price = price;
    }

    public int getPrice() {
        return price;
    }

    public Ticket raise(int dollars) {
        price += dollars;
        return this;
    }

    public Ticket setPrice(int price) {
        this.price = price;
        return this;
    }
}

Ticket t1 = new Ticket(5);
Ticket t3 = t1.setPrice(7).setPrice(11).raise(1);
t3.raise(6);
System.out.println(t1.getPrice());
System.out.println(t1 == t3);
System.out.println(t3.getPrice());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `6 ⏎ true ⏎ 6` — Treats += as replacement (`compoundAsReplace`)
B. `18 ⏎ true ⏎ 18` — **correct**
C. `11 ⏎ true ⏎ 11` — Keeps only the last update (`onlyLastUpdate`)
D. `7 ⏎ false ⏎ 18` — Thinks return this makes a new object (`returnThisCopies`)

Explanation: A method that ends with return this returns a reference to the same object, so chained calls all act on one object and the variable that stores the result is an alias. The program prints these lines in order: 18, true, 18.

Trace: `Ticket t1 = new Ticket(5);` → creates Object #1 (Ticket: price = 5); t1 refers to Object #1; `Ticket t3 = t1.setPrice(7).setPrice(11).raise(1);` → t3 refers to Object #1 (the same object as t1); Object #1.price: 5 → 12; `t3.raise(6);` → Object #1.price: 12 → 18; `System.out.println(t1.getPrice());` → prints "18"; `System.out.println(t1 == t3);` → prints "true"; `System.out.println(t3.getPrice());` → prints "18"

#### this · Advanced · sample 5 — `this.returnthis`

Complexity score 35; features: alias, returns-reference, returns-this, several-outputs, shadowing.

```java
class Student {
    private int credits;

    public Student(int credits) {
        this.credits = credits;
    }

    public int getCredits() {
        return credits;
    }

    public Student earn(int hours) {
        credits += hours;
        return this;
    }

    public Student setCredits(int credits) {
        this.credits = credits;
        return this;
    }
}

Student ben = new Student(9);
Student cara = ben.earn(1).earn(6);
cara.earn(1);
System.out.println(ben.getCredits());
System.out.println(ben == cara);
System.out.println(cara.getCredits());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `1 ⏎ true ⏎ 1` — Treats += as replacement (`compoundAsReplace`)
B. `17 ⏎ true ⏎ 17` — **correct**
C. `10 ⏎ false ⏎ 17` — Thinks return this makes a new object (`returnThisCopies`)
D. `10 ⏎ true ⏎ 10` — Keeps only the last update (`onlyLastUpdate`)

Explanation: A method that ends with return this returns a reference to the same object, so chained calls all act on one object and the variable that stores the result is an alias. The program prints these lines in order: 17, true, 17.

Trace: `Student ben = new Student(9);` → creates Object #1 (Student: credits = 9); ben refers to Object #1; `Student cara = ben.earn(1).earn(6);` → cara refers to Object #1 (the same object as ben); Object #1.credits: 9 → 16; `cara.earn(1);` → Object #1.credits: 16 → 17; `System.out.println(ben.getCredits());` → prints "17"; `System.out.println(ben == cara);` → prints "true"; `System.out.println(cara.getCredits());` → prints "17"

## Multiple independent objects (`independent`)

### Beginner

#### independent · Beginner · sample 1 — `independent.trace`

Complexity score 21; features: none.

```java
class Counter {
    private int value;

    public Counter(int start) {
        value = start;
    }

    public int getValue() {
        return value;
    }

    public void add(int amount) {
        value += amount;
    }

    public void incrementValue() {
        value++;
    }
}

Counter d = new Counter(5);
d.add(4);
d.incrementValue();
Counter a = new Counter(5);
System.out.println(d.getValue());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `10` — **correct**
B. `5` — Thinks all objects share an instance field (`instanceAsStatic`)
C. `9` — Misses one of the updates (`lostUpdate`)
D. `6` — Keeps only the last update (`onlyLastUpdate`)

Explanation: Each new expression creates a separate object with its own instance fields. A call changes only the object it is called on (and, for a method like giveTo or copyFrom, the object passed to it). The program prints 10.

Trace: `Counter d = new Counter(5);` → creates Object #1 (Counter: value = 5); d refers to Object #1; `d.add(4);` → Object #1.value: 5 → 9; `d.incrementValue();` → Object #1.value: 9 → 10; `Counter a = new Counter(5);` → creates Object #2 (Counter: value = 5); a refers to Object #2; `System.out.println(d.getValue());` → prints "10"

#### independent · Beginner · sample 2 — `independent.trace`

Complexity score 21; features: none.

```java
class Student {
    private int credits;

    public Student(int start) {
        credits = start;
    }

    public int getCredits() {
        return credits;
    }

    public void earn(int hours) {
        credits += hours;
    }
}

Student cara = new Student(15);
Student dev = new Student(11);
cara.earn(6);
cara.earn(5);
System.out.println(cara.getCredits());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `21` — Applies a call to the wrong object (`wrongReceiver`)
B. `22` — Thinks all objects share an instance field (`instanceAsStatic`)
C. `26` — **correct**
D. `20` — Keeps only the last update (`onlyLastUpdate`)

Explanation: Each new expression creates a separate object with its own instance fields. A call changes only the object it is called on (and, for a method like giveTo or copyFrom, the object passed to it). The program prints 26.

Trace: `Student cara = new Student(15);` → creates Object #1 (Student: credits = 15); cara refers to Object #1; `Student dev = new Student(11);` → creates Object #2 (Student: credits = 11); dev refers to Object #2; `cara.earn(6);` → Object #1.credits: 15 → 21; `cara.earn(5);` → Object #1.credits: 21 → 26; `System.out.println(cara.getCredits());` → prints "26"

#### independent · Beginner · sample 3 — `independent.trace`

Complexity score 21; features: none.

```java
class Account {
    private int balance;

    public Account(int start) {
        balance = start;
    }

    public int getBalance() {
        return balance;
    }

    public void deposit(int amount) {
        balance += amount;
    }

    public void incrementBalance() {
        balance++;
    }
}

Account college = new Account(10);
college.deposit(5);
college.incrementBalance();
Account savings = new Account(3);
System.out.println(college.getBalance());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `16` — **correct**
B. `3` — Thinks all objects share an instance field (`instanceAsStatic`)
C. `15` — Misses one of the updates (`lostUpdate`)
D. `11` — Keeps only the last update (`onlyLastUpdate`)

Explanation: Each new expression creates a separate object with its own instance fields. A call changes only the object it is called on (and, for a method like giveTo or copyFrom, the object passed to it). The program prints 16.

Trace: `Account college = new Account(10);` → creates Object #1 (Account: balance = 10); college refers to Object #1; `college.deposit(5);` → Object #1.balance: 10 → 15; `college.incrementBalance();` → Object #1.balance: 15 → 16; `Account savings = new Account(3);` → creates Object #2 (Account: balance = 3); savings refers to Object #2; `System.out.println(college.getBalance());` → prints "16"

#### independent · Beginner · sample 4 — `independent.trace`

Complexity score 21; features: none.

```java
class Ticket {
    private int price;

    public Ticket(int start) {
        price = start;
    }

    public int getPrice() {
        return price;
    }

    public void raise(int dollars) {
        price += dollars;
    }

    public void incrementPrice() {
        price++;
    }
}

Ticket t2 = new Ticket(7);
Ticket t4 = new Ticket(19);
t2.raise(9);
t2.incrementPrice();
System.out.println(t4.getPrice());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `20` — Applies a call to the wrong object (`wrongReceiver`)
B. `19` — **correct**
C. `28` — Applies a call to the wrong object (`wrongReceiver`)
D. `29` — Thinks all objects share an instance field (`instanceAsStatic`)

Explanation: Each new expression creates a separate object with its own instance fields. A call changes only the object it is called on (and, for a method like giveTo or copyFrom, the object passed to it). The program prints 19.

Trace: `Ticket t2 = new Ticket(7);` → creates Object #1 (Ticket: price = 7); t2 refers to Object #1; `Ticket t4 = new Ticket(19);` → creates Object #2 (Ticket: price = 19); t4 refers to Object #2; `t2.raise(9);` → Object #1.price: 7 → 16; `t2.incrementPrice();` → Object #1.price: 16 → 17; `System.out.println(t4.getPrice());` → prints "19"

#### independent · Beginner · sample 5 — `independent.trace`

Complexity score 21; features: none.

```java
class Robot {
    private int steps;

    public Robot(int start) {
        steps = start;
    }

    public int getSteps() {
        return steps;
    }

    public void move(int n) {
        steps += n;
    }
}

Robot probe = new Robot(12);
Robot rover = new Robot(17);
rover.move(3);
rover.move(5);
System.out.println(probe.getSteps());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `12` — **correct**
B. `15` — Applies a call to the wrong object (`wrongReceiver`)
C. `25` — Thinks all objects share an instance field (`instanceAsStatic`)
D. `17` — Applies a call to the wrong object (`wrongReceiver`)

Explanation: Each new expression creates a separate object with its own instance fields. A call changes only the object it is called on (and, for a method like giveTo or copyFrom, the object passed to it). The program prints 12.

Trace: `Robot probe = new Robot(12);` → creates Object #1 (Robot: steps = 12); probe refers to Object #1; `Robot rover = new Robot(17);` → creates Object #2 (Robot: steps = 17); rover refers to Object #2; `rover.move(3);` → Object #2.steps: 17 → 20; `rover.move(5);` → Object #2.steps: 20 → 25; `System.out.println(probe.getSteps());` → prints "12"

### Intermediate

#### independent · Intermediate · sample 1 — `independent.trace`

Complexity score 37; features: several-outputs, several-receivers, three-objects.

```java
class Ticket {
    private int price;

    public Ticket(int start) {
        price = start;
    }

    public int getPrice() {
        return price;
    }

    public void raise(int dollars) {
        price += dollars;
    }

    public void setPrice(int dollars) {
        price = dollars;
    }
}

Ticket t1 = new Ticket(4);
Ticket t3 = new Ticket(4);
t1.raise(5);
Ticket t4 = new Ticket(17);
t4.setPrice(20);
System.out.println(t3.getPrice());
System.out.println(t1.getPrice());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `9 ⏎ 9` — Thinks equal state means the same object (`equalArgsAlias`)
B. `4 ⏎ 9` — **correct**
C. `4 ⏎ 4` — Misses one of the updates (`lostUpdate`)
D. `20 ⏎ 20` — Thinks all objects share an instance field (`instanceAsStatic`)

Explanation: Each new expression creates a separate object with its own instance fields. A call changes only the object it is called on (and, for a method like giveTo or copyFrom, the object passed to it). The program prints these lines in order: 4, 9.

Trace: `Ticket t1 = new Ticket(4);` → creates Object #1 (Ticket: price = 4); t1 refers to Object #1; `Ticket t3 = new Ticket(4);` → creates Object #2 (Ticket: price = 4); t3 refers to Object #2; `t1.raise(5);` → Object #1.price: 4 → 9; `Ticket t4 = new Ticket(17);` → creates Object #3 (Ticket: price = 17); t4 refers to Object #3; `t4.setPrice(20);` → Object #3.price: 17 → 20; `System.out.println(t3.getPrice());` → prints "4"; `System.out.println(t1.getPrice());` → prints "9"

#### independent · Intermediate · sample 2 — `independent.trace`

Complexity score 37; features: several-outputs, several-receivers, three-objects.

```java
class Robot {
    private int steps;

    public Robot(int start) {
        steps = start;
    }

    public int getSteps() {
        return steps;
    }

    public void move(int n) {
        steps += n;
    }

    public void setSteps(int n) {
        steps = n;
    }
}

Robot scout = new Robot(5);
Robot probe = new Robot(20);
Robot rover = new Robot(12);
scout.move(1);
probe.setSteps(32);
System.out.println(scout.getSteps());
System.out.println(rover.getSteps());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `32 ⏎ 32` — Thinks all objects share an instance field (`instanceAsStatic`)
B. `32 ⏎ 12` — Applies a call to the wrong object (`wrongReceiver`)
C. `6 ⏎ 12` — **correct**
D. `5 ⏎ 12` — Applies a call to the wrong object (`wrongReceiver`)

Explanation: Each new expression creates a separate object with its own instance fields. A call changes only the object it is called on (and, for a method like giveTo or copyFrom, the object passed to it). The program prints these lines in order: 6, 12.

Trace: `Robot scout = new Robot(5);` → creates Object #1 (Robot: steps = 5); scout refers to Object #1; `Robot probe = new Robot(20);` → creates Object #2 (Robot: steps = 20); probe refers to Object #2; `Robot rover = new Robot(12);` → creates Object #3 (Robot: steps = 12); rover refers to Object #3; `scout.move(1);` → Object #1.steps: 5 → 6; `probe.setSteps(32);` → Object #2.steps: 20 → 32; `System.out.println(scout.getSteps());` → prints "6"; `System.out.println(rover.getSteps());` → prints "12"

#### independent · Intermediate · sample 3 — `independent.trace`

Complexity score 31; features: several-outputs, several-receivers.

```java
class Book {
    private int pagesRead;

    public Book(int start) {
        pagesRead = start;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public void read(int pages) {
        pagesRead += pages;
    }

    public void setPagesRead(int pages) {
        pagesRead = pages;
    }

    public void incrementPagesRead() {
        pagesRead++;
    }
}

Book novel = new Book(17);
Book atlas = new Book(17);
atlas.incrementPagesRead();
atlas.read(7);
novel.setPagesRead(15);
System.out.println(atlas.getPagesRead());
System.out.println(novel.getPagesRead());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `15 ⏎ 15` — Thinks all objects share an instance field (`instanceAsStatic`)
B. `25 ⏎ 17` — Misses one of the updates (`lostUpdate`)
C. `25 ⏎ 15` — **correct**
D. `24 ⏎ 15` — Keeps only the last update (`onlyLastUpdate`)

Explanation: Each new expression creates a separate object with its own instance fields. A call changes only the object it is called on (and, for a method like giveTo or copyFrom, the object passed to it). The program prints these lines in order: 25, 15.

Trace: `Book novel = new Book(17);` → creates Object #1 (Book: pagesRead = 17); novel refers to Object #1; `Book atlas = new Book(17);` → creates Object #2 (Book: pagesRead = 17); atlas refers to Object #2; `atlas.incrementPagesRead();` → Object #2.pagesRead: 17 → 18; `atlas.read(7);` → Object #2.pagesRead: 18 → 25; `novel.setPagesRead(15);` → Object #1.pagesRead: 17 → 15; `System.out.println(atlas.getPagesRead());` → prints "25"; `System.out.println(novel.getPagesRead());` → prints "15"

#### independent · Intermediate · sample 4 — `independent.trace`

Complexity score 33; features: several-outputs, several-receivers.

```java
class Account {
    private int balance;

    public Account(int start) {
        balance = start;
    }

    public int getBalance() {
        return balance;
    }

    public void deposit(int amount) {
        balance += amount;
    }

    public void setBalance(int amount) {
        balance = amount;
    }
}

Account backup = new Account(18);
backup.deposit(2);
backup.deposit(3);
Account savings = new Account(18);
backup.deposit(1);
savings.setBalance(31);
System.out.println(savings.getBalance());
System.out.println(backup.getBalance());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `31 ⏎ 24` — **correct**
B. `31 ⏎ 31` — Thinks all objects share an instance field (`instanceAsStatic`)
C. `31 ⏎ 21` — Misses one of the updates (`lostUpdate`)
D. `31 ⏎ 19` — Keeps only the last update (`onlyLastUpdate`)

Explanation: Each new expression creates a separate object with its own instance fields. A call changes only the object it is called on (and, for a method like giveTo or copyFrom, the object passed to it). The program prints these lines in order: 31, 24.

Trace: `Account backup = new Account(18);` → creates Object #1 (Account: balance = 18); backup refers to Object #1; `backup.deposit(2);` → Object #1.balance: 18 → 20; `backup.deposit(3);` → Object #1.balance: 20 → 23; `Account savings = new Account(18);` → creates Object #2 (Account: balance = 18); savings refers to Object #2; `backup.deposit(1);` → Object #1.balance: 23 → 24; `savings.setBalance(31);` → Object #2.balance: 18 → 31; `System.out.println(savings.getBalance());` → prints "31"; `System.out.println(backup.getBalance());` → prints "24"

#### independent · Intermediate · sample 5 — `independent.trace`

Complexity score 31; features: several-outputs, several-receivers.

```java
class Ticket {
    private int price;

    public Ticket(int start) {
        price = start;
    }

    public int getPrice() {
        return price;
    }

    public void raise(int dollars) {
        price += dollars;
    }

    public void setPrice(int dollars) {
        price = dollars;
    }
}

Ticket t2 = new Ticket(16);
t2.raise(6);
Ticket t1 = new Ticket(14);
t2.raise(2);
t1.setPrice(36);
System.out.println(t1.getPrice());
System.out.println(t2.getPrice());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `36 ⏎ 24` — **correct**
B. `36 ⏎ 36` — Thinks all objects share an instance field (`instanceAsStatic`)
C. `14 ⏎ 24` — Misses one of the updates (`lostUpdate`)
D. `36 ⏎ 18` — Keeps only the last update (`onlyLastUpdate`)

Explanation: Each new expression creates a separate object with its own instance fields. A call changes only the object it is called on (and, for a method like giveTo or copyFrom, the object passed to it). The program prints these lines in order: 36, 24.

Trace: `Ticket t2 = new Ticket(16);` → creates Object #1 (Ticket: price = 16); t2 refers to Object #1; `t2.raise(6);` → Object #1.price: 16 → 22; `Ticket t1 = new Ticket(14);` → creates Object #2 (Ticket: price = 14); t1 refers to Object #2; `t2.raise(2);` → Object #1.price: 22 → 24; `t1.setPrice(36);` → Object #2.price: 14 → 36; `System.out.println(t1.getPrice());` → prints "36"; `System.out.println(t2.getPrice());` → prints "24"

### Advanced

#### independent · Advanced · sample 1 — `independent.compare`

Complexity score 38; features: several-receivers, three-objects.

```java
class Counter {
    private int value;

    public Counter(int start) {
        value = start;
    }

    public int getValue() {
        return value;
    }

    public void add(int amount) {
        value += amount;
    }

    public void giveTo(Counter other, int amount) {
        value -= amount;
        other.value += amount;
    }
}

Counter e = new Counter(12);
e.add(2);
Counter b = new Counter(10);
Counter c = new Counter(12);
b.giveTo(e, 7);
c.add(1);
e.giveTo(c, 3);
```

*The statements after the class run in order inside main.*

**After this code runs, which comparison is true?**

A. `c.getValue() > e.getValue()` — Keeps only the last update (`onlyLastUpdate`)
B. `c.getValue() == 16` — **correct**
C. `e.getValue() == b.getValue()` — Thinks all objects share an instance field (`instanceAsStatic`)
D. `b.getValue() > e.getValue()` — Mixes up this and the argument (`thisIsArgument`)

Explanation: Trace each object's own field separately; updating one object never changes another unless a method explicitly writes to the other object. c.getValue() == 16 is true.

Trace: `Counter e = new Counter(12);` → creates Object #1 (Counter: value = 12); e refers to Object #1; `e.add(2);` → Object #1.value: 12 → 14; `Counter b = new Counter(10);` → creates Object #2 (Counter: value = 10); b refers to Object #2; `Counter c = new Counter(12);` → creates Object #3 (Counter: value = 12); c refers to Object #3; `b.giveTo(e, 7);` → Object #1.value: 14 → 21; Object #2.value: 10 → 3; `c.add(1);` → Object #3.value: 12 → 13; `e.giveTo(c, 3);` → Object #1.value: 21 → 18; Object #3.value: 13 → 16

#### independent · Advanced · sample 2 — `independent.trace`

Complexity score 46; features: several-outputs, several-receivers, three-objects.

```java
class Robot {
    private int steps;

    public Robot(int start) {
        steps = start;
    }

    public int getSteps() {
        return steps;
    }

    public void move(int n) {
        steps += n;
    }

    public void giveTo(Robot other, int n) {
        steps -= n;
        other.steps += n;
    }
}

Robot rover = new Robot(8);
Robot bot = new Robot(8);
rover.move(8);
Robot probe = new Robot(8);
bot.giveTo(rover, 6);
bot.move(3);
rover.giveTo(probe, 4);
System.out.println(bot.getSteps());
System.out.println(probe.getSteps());
System.out.println(rover.getSteps());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `19 ⏎ 19 ⏎ 19` — Thinks equal state means the same object (`equalArgsAlias`)
B. `11 ⏎ 11 ⏎ 11` — Thinks all objects share an instance field (`instanceAsStatic`)
C. `5 ⏎ 12 ⏎ 18` — **correct**
D. `11 ⏎ 12 ⏎ 4` — Keeps only the last update (`onlyLastUpdate`)

Explanation: Each new expression creates a separate object with its own instance fields. A call changes only the object it is called on (and, for a method like giveTo or copyFrom, the object passed to it). The program prints these lines in order: 5, 12, 18.

Trace: `Robot rover = new Robot(8);` → creates Object #1 (Robot: steps = 8); rover refers to Object #1; `Robot bot = new Robot(8);` → creates Object #2 (Robot: steps = 8); bot refers to Object #2; `rover.move(8);` → Object #1.steps: 8 → 16; `Robot probe = new Robot(8);` → creates Object #3 (Robot: steps = 8); probe refers to Object #3; `bot.giveTo(rover, 6);` → Object #1.steps: 16 → 22; Object #2.steps: 8 → 2; `bot.move(3);` → Object #2.steps: 2 → 5; `rover.giveTo(probe, 4);` → Object #1.steps: 22 → 18; Object #3.steps: 8 → 12; `System.out.println(bot.getSteps());` → prints "5"; `System.out.println(probe.getSteps());` → prints "12"; `System.out.println(rover.getSteps());` → prints "18"

#### independent · Advanced · sample 3 — `independent.trace`

Complexity score 42; features: several-outputs, several-receivers, three-objects.

```java
class Counter {
    private int value;

    public Counter(int start) {
        value = start;
    }

    public int getValue() {
        return value;
    }

    public void add(int amount) {
        value += amount;
    }

    public void giveTo(Counter other, int amount) {
        value -= amount;
        other.value += amount;
    }
}

Counter a = new Counter(9);
Counter c = new Counter(9);
c.add(5);
Counter d = new Counter(15);
d.giveTo(c, 8);
c.add(1);
System.out.println(d.getValue());
System.out.println(c.getValue());
System.out.println(a.getValue());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `16 ⏎ 16 ⏎ 16` — Thinks all objects share an instance field (`instanceAsStatic`)
B. `7 ⏎ 10 ⏎ 9` — Keeps only the last update (`onlyLastUpdate`)
C. `7 ⏎ 23 ⏎ 23` — Thinks equal state means the same object (`equalArgsAlias`)
D. `7 ⏎ 23 ⏎ 9` — **correct**

Explanation: Each new expression creates a separate object with its own instance fields. A call changes only the object it is called on (and, for a method like giveTo or copyFrom, the object passed to it). The program prints these lines in order: 7, 23, 9.

Trace: `Counter a = new Counter(9);` → creates Object #1 (Counter: value = 9); a refers to Object #1; `Counter c = new Counter(9);` → creates Object #2 (Counter: value = 9); c refers to Object #2; `c.add(5);` → Object #2.value: 9 → 14; `Counter d = new Counter(15);` → creates Object #3 (Counter: value = 15); d refers to Object #3; `d.giveTo(c, 8);` → Object #2.value: 14 → 22; Object #3.value: 15 → 7; `c.add(1);` → Object #2.value: 22 → 23; `System.out.println(d.getValue());` → prints "7"; `System.out.println(c.getValue());` → prints "23"; `System.out.println(a.getValue());` → prints "9"

#### independent · Advanced · sample 4 — `independent.compare`

Complexity score 35; features: several-receivers, three-objects.

```java
class Timer {
    private int seconds;

    public Timer(int start) {
        seconds = start;
    }

    public int getSeconds() {
        return seconds;
    }

    public void addTime(int s) {
        seconds += s;
    }

    public void giveTo(Timer other, int s) {
        seconds -= s;
        other.seconds += s;
    }
}

Timer alarm = new Timer(8);
alarm.addTime(9);
alarm.addTime(1);
Timer oven = new Timer(8);
Timer timer = new Timer(20);
oven.giveTo(alarm, 5);
```

*The statements after the class run in order inside main.*

**After this code runs, which comparison is true?**

A. `timer.getSeconds() == alarm.getSeconds()` — Thinks all objects share an instance field (`instanceAsStatic`)
B. `alarm.getSeconds() == timer.getSeconds()` — Thinks all objects share an instance field (`instanceAsStatic`)
C. `alarm.getSeconds() == 18` — Thinks equal state means the same object (`equalArgsAlias`)
D. `alarm.getSeconds() > oven.getSeconds()` — **correct**

Explanation: Trace each object's own field separately; updating one object never changes another unless a method explicitly writes to the other object. alarm.getSeconds() > oven.getSeconds() is true.

Trace: `Timer alarm = new Timer(8);` → creates Object #1 (Timer: seconds = 8); alarm refers to Object #1; `alarm.addTime(9);` → Object #1.seconds: 8 → 17; `alarm.addTime(1);` → Object #1.seconds: 17 → 18; `Timer oven = new Timer(8);` → creates Object #2 (Timer: seconds = 8); oven refers to Object #2; `Timer timer = new Timer(20);` → creates Object #3 (Timer: seconds = 20); timer refers to Object #3; `oven.giveTo(alarm, 5);` → Object #1.seconds: 18 → 23; Object #2.seconds: 8 → 3

#### independent · Advanced · sample 5 — `independent.trace`

Complexity score 46; features: several-outputs, several-receivers, three-objects.

```java
class Plant {
    private int height;

    public Plant(int start) {
        height = start;
    }

    public int getHeight() {
        return height;
    }

    public void grow(int cm) {
        height += cm;
    }

    public void copyFrom(Plant other) {
        this.height = other.height;
    }
}

Plant oak = new Plant(2);
Plant moss = new Plant(9);
Plant palm = new Plant(2);
palm.grow(9);
oak.copyFrom(moss);
moss.copyFrom(palm);
palm.copyFrom(oak);
oak.grow(5);
System.out.println(palm.getHeight());
System.out.println(oak.getHeight());
System.out.println(moss.getHeight());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `9 ⏎ 7 ⏎ 11` — Keeps only the last update (`onlyLastUpdate`)
B. `14 ⏎ 14 ⏎ 9` — Thinks equal state means the same object (`equalArgsAlias`)
C. `9 ⏎ 14 ⏎ 11` — **correct**
D. `16 ⏎ 16 ⏎ 16` — Thinks all objects share an instance field (`instanceAsStatic`)

Explanation: Each new expression creates a separate object with its own instance fields. A call changes only the object it is called on (and, for a method like giveTo or copyFrom, the object passed to it). The program prints these lines in order: 9, 14, 11.

Trace: `Plant oak = new Plant(2);` → creates Object #1 (Plant: height = 2); oak refers to Object #1; `Plant moss = new Plant(9);` → creates Object #2 (Plant: height = 9); moss refers to Object #2; `Plant palm = new Plant(2);` → creates Object #3 (Plant: height = 2); palm refers to Object #3; `palm.grow(9);` → Object #3.height: 2 → 11; `oak.copyFrom(moss);` → Object #1.height: 2 → 9; `moss.copyFrom(palm);` → Object #2.height: 9 → 11; `palm.copyFrom(oak);` → Object #3.height: 11 → 9; `oak.grow(5);` → Object #1.height: 9 → 14; `System.out.println(palm.getHeight());` → prints "9"; `System.out.println(oak.getHeight());` → prints "14"; `System.out.println(moss.getHeight());` → prints "11"

## Object references and aliases (`aliases`)

### Beginner

#### aliases · Beginner · sample 1 — `aliases.trace`

Complexity score 20; features: alias.

```java
class Student {
    private int credits;

    public Student(int start) {
        credits = start;
    }

    public int getCredits() {
        return credits;
    }

    public void earn(int hours) {
        credits += hours;
    }
}

Student dev = new Student(14);
Student ben = dev;
ben.earn(4);
ben.earn(2);
System.out.println(dev.getCredits());
```

*The statements after the class run in order inside main.*

**What does the last statement print?**

A. `20` — **correct**
B. `18` — Misses one of the updates (`lostUpdate`)
C. `14` — Treats an alias as a separate copy (`aliasCopies`)
D. `16` — Keeps only the last update (`onlyLastUpdate`)

Explanation: Track which object each variable refers to. Copying a reference (b = a, or a method that returns a reference) shares one object; only new creates another object. The program prints 20.

Trace: `Student dev = new Student(14);` → creates Object #1 (Student: credits = 14); dev refers to Object #1; `Student ben = dev;` → ben refers to Object #1 (the same object as dev); `ben.earn(4);` → Object #1.credits: 14 → 18; `ben.earn(2);` → Object #1.credits: 18 → 20; `System.out.println(dev.getCredits());` → prints "20"

#### aliases · Beginner · sample 2 — `aliases.trace`

Complexity score 25; features: alias, several-receivers.

```java
class Robot {
    private int steps;

    public Robot(int start) {
        steps = start;
    }

    public int getSteps() {
        return steps;
    }

    public void move(int n) {
        steps += n;
    }
}

Robot rover = new Robot(1);
rover.move(4);
Robot bot = rover;
bot.move(5);
rover.move(4);
System.out.println(rover.getSteps());
```

*The statements after the class run in order inside main.*

**What does the last statement print?**

A. `9` — Treats an alias as a separate copy (`aliasCopies`)
B. `5` — Keeps only the last update (`onlyLastUpdate`)
C. `14` — **correct**
D. `10` — Misses one of the updates (`lostUpdate`)

Explanation: Track which object each variable refers to. Copying a reference (b = a, or a method that returns a reference) shares one object; only new creates another object. The program prints 14.

Trace: `Robot rover = new Robot(1);` → creates Object #1 (Robot: steps = 1); rover refers to Object #1; `rover.move(4);` → Object #1.steps: 1 → 5; `Robot bot = rover;` → bot refers to Object #1 (the same object as rover); `bot.move(5);` → Object #1.steps: 5 → 10; `rover.move(4);` → Object #1.steps: 10 → 14; `System.out.println(rover.getSteps());` → prints "14"

#### aliases · Beginner · sample 3 — `aliases.trace`

Complexity score 25; features: alias, several-receivers.

```java
class Account {
    private int balance;

    public Account(int start) {
        balance = start;
    }

    public int getBalance() {
        return balance;
    }

    public void deposit(int amount) {
        balance += amount;
    }

    public void incrementBalance() {
        balance++;
    }
}

Account travel = new Account(20);
Account savings = travel;
travel.deposit(9);
savings.deposit(9);
savings.incrementBalance();
System.out.println(savings.getBalance());
```

*The statements after the class run in order inside main.*

**What does the last statement print?**

A. `39` — **correct**
B. `38` — Misses one of the updates (`lostUpdate`)
C. `30` — Treats an alias as a separate copy (`aliasCopies`)
D. `21` — Keeps only the last update (`onlyLastUpdate`)

Explanation: Track which object each variable refers to. Copying a reference (b = a, or a method that returns a reference) shares one object; only new creates another object. The program prints 39.

Trace: `Account travel = new Account(20);` → creates Object #1 (Account: balance = 20); travel refers to Object #1; `Account savings = travel;` → savings refers to Object #1 (the same object as travel); `travel.deposit(9);` → Object #1.balance: 20 → 29; `savings.deposit(9);` → Object #1.balance: 29 → 38; `savings.incrementBalance();` → Object #1.balance: 38 → 39; `System.out.println(savings.getBalance());` → prints "39"

#### aliases · Beginner · sample 4 — `aliases.trace`

Complexity score 25; features: alias, several-receivers.

```java
class Book {
    private int pagesRead;

    public Book(int start) {
        pagesRead = start;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public void read(int pages) {
        pagesRead += pages;
    }

    public void incrementPagesRead() {
        pagesRead++;
    }
}

Book guide = new Book(14);
Book atlas = guide;
atlas.read(9);
guide.read(1);
atlas.incrementPagesRead();
System.out.println(atlas.getPagesRead());
```

*The statements after the class run in order inside main.*

**What does the last statement print?**

A. `16` — Misses one of the updates (`lostUpdate`)
B. `24` — Treats an alias as a separate copy (`aliasCopies`)
C. `15` — Keeps only the last update (`onlyLastUpdate`)
D. `25` — **correct**

Explanation: Track which object each variable refers to. Copying a reference (b = a, or a method that returns a reference) shares one object; only new creates another object. The program prints 25.

Trace: `Book guide = new Book(14);` → creates Object #1 (Book: pagesRead = 14); guide refers to Object #1; `Book atlas = guide;` → atlas refers to Object #1 (the same object as guide); `atlas.read(9);` → Object #1.pagesRead: 14 → 23; `guide.read(1);` → Object #1.pagesRead: 23 → 24; `atlas.incrementPagesRead();` → Object #1.pagesRead: 24 → 25; `System.out.println(atlas.getPagesRead());` → prints "25"

#### aliases · Beginner · sample 5 — `aliases.trace`

Complexity score 26; features: alias.

```java
class Car {
    private int speed;

    public Car(int start) {
        speed = start;
    }

    public int getSpeed() {
        return speed;
    }

    public void accelerate(int mph) {
        speed += mph;
    }
}

Car car = new Car(14);
Car taxi = new Car(18);
Car truck = car;
truck.accelerate(1);
truck.accelerate(9);
System.out.println(car.getSpeed());
```

*The statements after the class run in order inside main.*

**What does the last statement print?**

A. `24` — **correct**
B. `23` — Keeps only the last update (`onlyLastUpdate`)
C. `15` — Applies a call to the wrong object (`wrongReceiver`)
D. `14` — Treats an alias as a separate copy (`aliasCopies`)

Explanation: Track which object each variable refers to. Copying a reference (b = a, or a method that returns a reference) shares one object; only new creates another object. The program prints 24.

Trace: `Car car = new Car(14);` → creates Object #1 (Car: speed = 14); car refers to Object #1; `Car taxi = new Car(18);` → creates Object #2 (Car: speed = 18); taxi refers to Object #2; `Car truck = car;` → truck refers to Object #1 (the same object as car); `truck.accelerate(1);` → Object #1.speed: 14 → 15; `truck.accelerate(9);` → Object #1.speed: 15 → 24; `System.out.println(car.getSpeed());` → prints "24"

### Intermediate

#### aliases · Intermediate · sample 1 — `aliases.samecount`

Complexity score 28; features: alias, multi-alias, reassign-after-alias.

```java
class Car {
    private int speed;

    public Car(int start) {
        speed = start;
    }
}

Car van = new Car(11);
Car truck = new Car(15);
Car bus = van;
Car taxi = truck;
van = truck;
bus = taxi;
```

*The statements after the class run in order inside main.*

**After this code runs, how many variables other than taxi refer to the same object as taxi?**

A. `3` — **correct**
B. `1` — Misses one of the updates (`lostUpdate`)
C. `0` — Treats an alias as a separate copy (`aliasCopies`)
D. `4` — Counts the variable itself (`countsSelf`)

Explanation: Follow each assignment in order. A variable that is later reassigned (to null, to a new object, or to another reference) no longer refers to taxi's object. The answer is 3.

Trace: `Car van = new Car(11);` → creates Object #1 (Car: speed = 11); van refers to Object #1; `Car truck = new Car(15);` → creates Object #2 (Car: speed = 15); truck refers to Object #2; `Car bus = van;` → bus refers to Object #1 (the same object as van); `Car taxi = truck;` → taxi refers to Object #2 (the same object as truck); `van = truck;` → van refers to Object #2 (the same object as truck and taxi); `bus = taxi;` → bus refers to Object #2 (the same object as van and truck and taxi)

#### aliases · Intermediate · sample 2 — `aliases.trace`

Complexity score 32; features: alias, reassign-after-alias, several-outputs.

```java
class Ticket {
    private int price;

    public Ticket(int start) {
        price = start;
    }

    public int getPrice() {
        return price;
    }

    public void raise(int dollars) {
        price += dollars;
    }
}

Ticket t1 = new Ticket(4);
t1.raise(4);
Ticket t2 = t1;
t2 = new Ticket(13);
t1.raise(2);
System.out.println(t1.getPrice());
System.out.println(t2.getPrice());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `15 ⏎ 15` — Thinks reassignment changes the old object (`reassignMutates`)
B. `10 ⏎ 13` — **correct**
C. `8 ⏎ 15` — Applies a call to the wrong object (`wrongReceiver`)
D. `6 ⏎ 13` — Keeps only the last update (`onlyLastUpdate`)

Explanation: Track which object each variable refers to. Copying a reference (b = a, or a method that returns a reference) shares one object; only new creates another object. The program prints these lines in order: 10, 13.

Trace: `Ticket t1 = new Ticket(4);` → creates Object #1 (Ticket: price = 4); t1 refers to Object #1; `t1.raise(4);` → Object #1.price: 4 → 8; `Ticket t2 = t1;` → t2 refers to Object #1 (the same object as t1); `t2 = new Ticket(13);` → creates Object #2 (Ticket: price = 13); t2 refers to Object #2; `t1.raise(2);` → Object #1.price: 8 → 10; `System.out.println(t1.getPrice());` → prints "10"; `System.out.println(t2.getPrice());` → prints "13"

#### aliases · Intermediate · sample 3 — `aliases.trace`

Complexity score 42; features: alias, multi-alias, reassign-after-alias, several-outputs, three-objects.

```java
class Account {
    private int balance;

    public Account(int start) {
        balance = start;
    }

    public int getBalance() {
        return balance;
    }

    public void deposit(int amount) {
        balance += amount;
    }
}

Account college = new Account(13);
Account savings = new Account(3);
Account travel = savings;
college = savings;
travel = new Account(17);
college.deposit(8);
System.out.println(travel.getBalance());
System.out.println(savings.getBalance());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `25 ⏎ 3` — Applies a call to the wrong object (`wrongReceiver`)
B. `17 ⏎ 11` — **correct**
C. `25 ⏎ 25` — Thinks reassignment changes the old object (`reassignMutates`)
D. `17 ⏎ 3` — Treats an alias as a separate copy (`aliasCopies`)

Explanation: Track which object each variable refers to. Copying a reference (b = a, or a method that returns a reference) shares one object; only new creates another object. The program prints these lines in order: 17, 11.

Trace: `Account college = new Account(13);` → creates Object #1 (Account: balance = 13); college refers to Object #1; `Account savings = new Account(3);` → creates Object #2 (Account: balance = 3); savings refers to Object #2; `Account travel = savings;` → travel refers to Object #2 (the same object as savings); `college = savings;` → college refers to Object #2 (the same object as savings and travel); `travel = new Account(17);` → creates Object #3 (Account: balance = 17); travel refers to Object #3; `college.deposit(8);` → Object #2.balance: 3 → 11; `System.out.println(travel.getBalance());` → prints "17"; `System.out.println(savings.getBalance());` → prints "11"

#### aliases · Intermediate · sample 4 — `aliases.trace`

Complexity score 34; features: alias, reassign-after-alias, several-outputs.

```java
class Ticket {
    private int price;

    public Ticket(int start) {
        price = start;
    }

    public int getPrice() {
        return price;
    }

    public void raise(int dollars) {
        price += dollars;
    }
}

Ticket t3 = new Ticket(7);
Ticket t2 = t3;
t2.raise(5);
t2.raise(4);
t2 = new Ticket(20);
t2.raise(4);
System.out.println(t2.getPrice());
System.out.println(t3.getPrice());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `20 ⏎ 20` — Applies a call to the wrong object (`wrongReceiver`)
B. `24 ⏎ 7` — Treats an alias as a separate copy (`aliasCopies`)
C. `24 ⏎ 16` — **correct**
D. `24 ⏎ 24` — Thinks reassignment changes the old object (`reassignMutates`)

Explanation: Track which object each variable refers to. Copying a reference (b = a, or a method that returns a reference) shares one object; only new creates another object. The program prints these lines in order: 24, 16.

Trace: `Ticket t3 = new Ticket(7);` → creates Object #1 (Ticket: price = 7); t3 refers to Object #1; `Ticket t2 = t3;` → t2 refers to Object #1 (the same object as t3); `t2.raise(5);` → Object #1.price: 7 → 12; `t2.raise(4);` → Object #1.price: 12 → 16; `t2 = new Ticket(20);` → creates Object #2 (Ticket: price = 20); t2 refers to Object #2; `t2.raise(4);` → Object #2.price: 20 → 24; `System.out.println(t2.getPrice());` → prints "24"; `System.out.println(t3.getPrice());` → prints "16"

#### aliases · Intermediate · sample 5 — `aliases.samecount`

Complexity score 28; features: alias, multi-alias, reassign-after-alias.

```java
class Timer {
    private int seconds;

    public Timer(int start) {
        seconds = start;
    }
}

Timer clock = new Timer(16);
Timer watch = clock;
Timer timer = new Timer(18);
Timer alarm = clock;
timer = watch;
```

*The statements after the class run in order inside main.*

**After this code runs, how many variables other than watch refer to the same object as watch?**

A. `0` — Treats an alias as a separate copy (`aliasCopies`)
B. `1` — Misses one of the updates (`lostUpdate`)
C. `3` — **correct**
D. `4` — Counts the variable itself (`countsSelf`)

Explanation: Follow each assignment in order. A variable that is later reassigned (to null, to a new object, or to another reference) no longer refers to watch's object. The answer is 3.

Trace: `Timer clock = new Timer(16);` → creates Object #1 (Timer: seconds = 16); clock refers to Object #1; `Timer watch = clock;` → watch refers to Object #1 (the same object as clock); `Timer timer = new Timer(18);` → creates Object #2 (Timer: seconds = 18); timer refers to Object #2; `Timer alarm = clock;` → alarm refers to Object #1 (the same object as clock and watch); `timer = watch;` → timer refers to Object #1 (the same object as clock and watch and alarm)

### Advanced

#### aliases · Advanced · sample 1 — `aliases.samecount`

Complexity score 49; features: alias, multi-alias, null, reassign-after-alias, returns-reference, three-objects.

```java
class Student {
    private int credits;

    public Student(int start) {
        credits = start;
    }
}

static Student same(Student x) {
    return x;
}

Student ben = new Student(18);
Student dev = new Student(12);
Student ana = dev;
Student cara = same(ana);
dev = null;
ana = new Student(11);
Student eli = same(cara);
```

*The statements after the class run in order inside main. The static methods shown outside the class are in the same class as main.*

**After this code runs, how many variables other than eli refer to the same object as eli?**

A. `3` — Treats every variable as the same object (`allSameObject`)
B. `2` — Thinks reassignment changes the old object (`reassignMutates`)
C. `0` — Thinks null spreads to aliases (`nullPropagates`)
D. `1` — **correct**

Explanation: Follow each assignment in order. A variable that is later reassigned (to null, to a new object, or to another reference) no longer refers to eli's object. The answer is 1.

Trace: `Student ben = new Student(18);` → creates Object #1 (Student: credits = 18); ben refers to Object #1; `Student dev = new Student(12);` → creates Object #2 (Student: credits = 12); dev refers to Object #2; `Student ana = dev;` → ana refers to Object #2 (the same object as dev); `Student cara = same(ana);` → cara refers to Object #2 (the same object as dev and ana); `dev = null;` → dev is now null; `ana = new Student(11);` → creates Object #3 (Student: credits = 11); ana refers to Object #3; `Student eli = same(cara);` → eli refers to Object #2 (the same object as cara)

#### aliases · Advanced · sample 2 — `aliases.samecount`

Complexity score 46; features: alias, multi-alias, null, reassign-after-alias, returns-reference, returns-this.

```java
class Robot {
    private int steps;

    public Robot(int start) {
        steps = start;
    }

    public Robot self() {
        return this;
    }
}

static Robot same(Robot x) {
    return x;
}

Robot bot = new Robot(12);
Robot rover = bot;
Robot drone = same(rover);
Robot scout = rover.self();
bot = new Robot(9);
scout = null;
Robot probe = rover.self();
```

*The statements after the class run in order inside main. The static methods shown outside the class are in the same class as main.*

**After this code runs, how many variables other than probe refer to the same object as probe?**

A. `2` — **correct**
B. `1` — Thinks a returned reference is a copy (`returnCopies`)
C. `3` — Thinks reassignment changes the old object (`reassignMutates`)
D. `0` — Misses one of the updates (`lostUpdate`)

Explanation: Follow each assignment in order. A variable that is later reassigned (to null, to a new object, or to another reference) no longer refers to probe's object. The answer is 2.

Trace: `Robot bot = new Robot(12);` → creates Object #1 (Robot: steps = 12); bot refers to Object #1; `Robot rover = bot;` → rover refers to Object #1 (the same object as bot); `Robot drone = same(rover);` → drone refers to Object #1 (the same object as bot and rover); `Robot scout = rover.self();` → scout refers to Object #1 (the same object as bot and rover and drone); `bot = new Robot(9);` → creates Object #2 (Robot: steps = 9); bot refers to Object #2; `scout = null;` → scout is now null; `Robot probe = rover.self();` → probe refers to Object #1 (the same object as rover and drone)

#### aliases · Advanced · sample 3 — `aliases.trace`

Complexity score 43; features: alias, multi-alias, returns-reference, returns-this, several-outputs.

```java
class Garden {
    private int flowers;

    public Garden(int start) {
        flowers = start;
    }

    public int getFlowers() {
        return flowers;
    }

    public void plant(int count) {
        flowers += count;
    }

    public void setFlowers(int count) {
        flowers = count;
    }

    public Garden self() {
        return this;
    }

    public Garden copy() {
        return new Garden(flowers);
    }
}

Garden patio = new Garden(19);
patio.setFlowers(13);
Garden roof = patio;
patio.plant(2);
Garden front = roof.copy();
Garden side = patio.self();
System.out.println(patio.getFlowers());
System.out.println(roof.getFlowers());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `21 ⏎ 21` — Keeps only the last update (`onlyLastUpdate`)
B. `15 ⏎ 15` — **correct**
C. `15 ⏎ 13` — Treats an alias as a separate copy (`aliasCopies`)
D. `13 ⏎ 13` — Misses one of the updates (`lostUpdate`)

Explanation: Track which object each variable refers to. Copying a reference (b = a, or a method that returns a reference) shares one object; only new creates another object. The program prints these lines in order: 15, 15.

Trace: `Garden patio = new Garden(19);` → creates Object #1 (Garden: flowers = 19); patio refers to Object #1; `patio.setFlowers(13);` → Object #1.flowers: 19 → 13; `Garden roof = patio;` → roof refers to Object #1 (the same object as patio); `patio.plant(2);` → Object #1.flowers: 13 → 15; `Garden front = roof.copy();` → creates Object #2 (Garden: flowers = 15); front refers to Object #2; `Garden side = patio.self();` → side refers to Object #1 (the same object as patio and roof); `System.out.println(patio.getFlowers());` → prints "15"; `System.out.println(roof.getFlowers());` → prints "15"

#### aliases · Advanced · sample 4 — `aliases.samecount`

Complexity score 46; features: alias, multi-alias, reassign-after-alias, returns-reference, three-objects.

```java
class Lamp {
    private int brightness;

    public Lamp(int start) {
        brightness = start;
    }

    public Lamp copy() {
        return new Lamp(brightness);
    }
}

static Lamp same(Lamp x) {
    return x;
}

Lamp porch = new Lamp(16);
Lamp night = porch;
Lamp hall = porch.copy();
Lamp desk = hall.copy();
hall = desk;
Lamp floor = same(hall);
```

*The statements after the class run in order inside main. The static methods shown outside the class are in the same class as main.*

**After this code runs, how many variables other than floor refer to the same object as floor?**

A. `2` — **correct**
B. `1` — Treats an alias as a separate copy (`aliasCopies`)
C. `0` — Thinks a returned reference is a copy (`returnCopies`)
D. `3` — Counts the variable itself (`countsSelf`)

Explanation: Follow each assignment in order. A variable that is later reassigned (to null, to a new object, or to another reference) no longer refers to floor's object. The answer is 2.

Trace: `Lamp porch = new Lamp(16);` → creates Object #1 (Lamp: brightness = 16); porch refers to Object #1; `Lamp night = porch;` → night refers to Object #1 (the same object as porch); `Lamp hall = porch.copy();` → creates Object #2 (Lamp: brightness = 16); hall refers to Object #2; `Lamp desk = hall.copy();` → creates Object #3 (Lamp: brightness = 16); desk refers to Object #3; `hall = desk;` → hall refers to Object #3 (the same object as desk); `Lamp floor = same(hall);` → floor refers to Object #3 (the same object as hall and desk)

#### aliases · Advanced · sample 5 — `aliases.trace`

Complexity score 47; features: alias, reassign-after-alias, returns-reference, returns-this, several-outputs, three-objects.

```java
class Player {
    private int score;

    public Player(int start) {
        score = start;
    }

    public int getScore() {
        return score;
    }

    public void addPoints(int points) {
        score += points;
    }

    public Player self() {
        return this;
    }
}

Player p5 = new Player(2);
Player p4 = new Player(19);
Player p1 = p5;
p1.addPoints(4);
Player p3 = p4.self();
p4 = new Player(11);
System.out.println(p1.getScore());
System.out.println(p3.getScore());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `2 ⏎ 19` — Misses one of the updates (`lostUpdate`)
B. `2 ⏎ 23` — Applies a call to the wrong object (`wrongReceiver`)
C. `6 ⏎ 11` — Thinks reassignment changes the old object (`reassignMutates`)
D. `6 ⏎ 19` — **correct**

Explanation: Track which object each variable refers to. Copying a reference (b = a, or a method that returns a reference) shares one object; only new creates another object. The program prints these lines in order: 6, 19.

Trace: `Player p5 = new Player(2);` → creates Object #1 (Player: score = 2); p5 refers to Object #1; `Player p4 = new Player(19);` → creates Object #2 (Player: score = 19); p4 refers to Object #2; `Player p1 = p5;` → p1 refers to Object #1 (the same object as p5); `p1.addPoints(4);` → Object #1.score: 2 → 6; `Player p3 = p4.self();` → p3 refers to Object #2 (the same object as p4); `p4 = new Player(11);` → creates Object #3 (Player: score = 11); p4 refers to Object #3; `System.out.println(p1.getScore());` → prints "6"; `System.out.println(p3.getScore());` → prints "19"

## Reference equality (`equality`)

### Beginner

#### equality · Beginner · sample 1 — `equality.which`

Complexity score 19; features: alias.

```java
class Plant {
    private int height;

    public Plant(int start) {
        height = start;
    }

    public int getHeight() {
        return height;
    }
}

Plant fern = new Plant(4);
Plant oak = new Plant(4);
Plant moss = fern;
```

*The statements after the class run in order inside main.*

**After this code runs, which comparison is true?**

A. `oak == moss` — Thinks == compares field values (`identityAsContent`)
B. `fern == oak` — Thinks == compares field values (`identityAsContent`)
C. `fern != moss` — Treats an alias as a separate copy (`aliasCopies`)
D. `fern == moss` — **correct**

Explanation: For references, == is true only when both sides refer to the same object (or both are null). Comparing int values returned by getters compares numbers. fern == moss is true.

Trace: `Plant fern = new Plant(4);` → creates Object #1 (Plant: height = 4); fern refers to Object #1; `Plant oak = new Plant(4);` → creates Object #2 (Plant: height = 4); oak refers to Object #2; `Plant moss = fern;` → moss refers to Object #1 (the same object as fern)

#### equality · Beginner · sample 2 — `equality.which`

Complexity score 19; features: alias.

```java
class Book {
    private int pagesRead;

    public Book(int start) {
        pagesRead = start;
    }

    public int getPagesRead() {
        return pagesRead;
    }
}

Book diary = new Book(7);
Book comic = new Book(7);
Book guide = comic;
```

*The statements after the class run in order inside main.*

**After this code runs, which comparison is true?**

A. `diary == guide` — Thinks == compares field values (`identityAsContent`)
B. `diary != comic` — **correct**
C. `comic != guide` — Treats an alias as a separate copy (`aliasCopies`)
D. `diary == comic` — Thinks == compares field values (`identityAsContent`)

Explanation: For references, == is true only when both sides refer to the same object (or both are null). Comparing int values returned by getters compares numbers. diary != comic is true.

Trace: `Book diary = new Book(7);` → creates Object #1 (Book: pagesRead = 7); diary refers to Object #1; `Book comic = new Book(7);` → creates Object #2 (Book: pagesRead = 7); comic refers to Object #2; `Book guide = comic;` → guide refers to Object #2 (the same object as comic)

#### equality · Beginner · sample 3 — `equality.which`

Complexity score 19; features: alias.

```java
class Counter {
    private int value;

    public Counter(int start) {
        value = start;
    }

    public int getValue() {
        return value;
    }
}

Counter a = new Counter(19);
Counter c = new Counter(19);
Counter d = a;
```

*The statements after the class run in order inside main.*

**After this code runs, which comparison is true?**

A. `a == c` — Thinks == compares field values (`identityAsContent`)
B. `a != d` — Treats an alias as a separate copy (`aliasCopies`)
C. `c != d` — **correct**
D. `c == d` — Thinks == compares field values (`identityAsContent`)

Explanation: For references, == is true only when both sides refer to the same object (or both are null). Comparing int values returned by getters compares numbers. c != d is true.

Trace: `Counter a = new Counter(19);` → creates Object #1 (Counter: value = 19); a refers to Object #1; `Counter c = new Counter(19);` → creates Object #2 (Counter: value = 19); c refers to Object #2; `Counter d = a;` → d refers to Object #1 (the same object as a)

#### equality · Beginner · sample 4 — `equality.which`

Complexity score 19; features: alias.

```java
class Account {
    private int balance;

    public Account(int start) {
        balance = start;
    }

    public int getBalance() {
        return balance;
    }
}

Account backup = new Account(4);
Account savings = new Account(4);
Account travel = backup;
```

*The statements after the class run in order inside main.*

**After this code runs, which comparison is true?**

A. `savings == travel` — Thinks == compares field values (`identityAsContent`)
B. `backup == savings` — Thinks == compares field values (`identityAsContent`)
C. `backup != savings` — **correct**
D. `backup != travel` — Treats an alias as a separate copy (`aliasCopies`)

Explanation: For references, == is true only when both sides refer to the same object (or both are null). Comparing int values returned by getters compares numbers. backup != savings is true.

Trace: `Account backup = new Account(4);` → creates Object #1 (Account: balance = 4); backup refers to Object #1; `Account savings = new Account(4);` → creates Object #2 (Account: balance = 4); savings refers to Object #2; `Account travel = backup;` → travel refers to Object #1 (the same object as backup)

#### equality · Beginner · sample 5 — `equality.which`

Complexity score 24; features: alias, multi-alias.

```java
class Lamp {
    private int brightness;

    public Lamp(int start) {
        brightness = start;
    }

    public int getBrightness() {
        return brightness;
    }
}

Lamp floor = new Lamp(17);
Lamp porch = new Lamp(11);
Lamp hall = porch;
Lamp desk = porch;
```

*The statements after the class run in order inside main.*

**After this code runs, which comparison is true?**

A. `hall == desk` — **correct**
B. `porch != hall` — Treats an alias as a separate copy (`aliasCopies`)
C. `porch != desk` — Treats an alias as a separate copy (`aliasCopies`)
D. `hall != desk` — Treats an alias as a separate copy (`aliasCopies`)

Explanation: For references, == is true only when both sides refer to the same object (or both are null). Comparing int values returned by getters compares numbers. hall == desk is true.

Trace: `Lamp floor = new Lamp(17);` → creates Object #1 (Lamp: brightness = 17); floor refers to Object #1; `Lamp porch = new Lamp(11);` → creates Object #2 (Lamp: brightness = 11); porch refers to Object #2; `Lamp hall = porch;` → hall refers to Object #2 (the same object as porch); `Lamp desk = porch;` → desk refers to Object #2 (the same object as porch and hall)

### Intermediate

#### equality · Intermediate · sample 1 — `equality.which`

Complexity score 32; features: alias, reassign-after-alias, three-objects.

```java
class Battery {
    private int charge;

    public Battery(int start) {
        charge = start;
    }

    public int getCharge() {
        return charge;
    }

    public void recharge(int units) {
        charge += units;
    }
}

Battery main = new Battery(6);
main.recharge(6);
Battery spare = new Battery(6);
Battery left = spare;
spare = new Battery(6);
```

*The statements after the class run in order inside main.*

**After this code runs, which comparison is true?**

A. `spare == left` — Thinks == compares field values (`identityAsContent`)
B. `spare != left` — **correct**
C. `main == spare` — Thinks equal state means the same object (`equalArgsAlias`)
D. `main.getCharge() == spare.getCharge()` — Thinks equal state means the same object (`equalArgsAlias`)

Explanation: For references, == is true only when both sides refer to the same object (or both are null). Comparing int values returned by getters compares numbers. spare != left is true.

Trace: `Battery main = new Battery(6);` → creates Object #1 (Battery: charge = 6); main refers to Object #1; `main.recharge(6);` → Object #1.charge: 6 → 12; `Battery spare = new Battery(6);` → creates Object #2 (Battery: charge = 6); spare refers to Object #2; `Battery left = spare;` → left refers to Object #2 (the same object as spare); `spare = new Battery(6);` → creates Object #3 (Battery: charge = 6); spare refers to Object #3

#### equality · Intermediate · sample 2 — `equality.which`

Complexity score 26; features: alias, multi-alias, reassign-after-alias.

```java
class Book {
    private int pagesRead;

    public Book(int start) {
        pagesRead = start;
    }

    public int getPagesRead() {
        return pagesRead;
    }
}

Book diary = new Book(20);
Book comic = new Book(20);
Book guide = diary;
comic = guide;
```

*The statements after the class run in order inside main.*

**After this code runs, which comparison is false?**

A. `diary == comic` — Treats an alias as a separate copy (`aliasCopies`)
B. `comic == guide` — Treats an alias as a separate copy (`aliasCopies`)
C. `diary == guide` — Treats an alias as a separate copy (`aliasCopies`)
D. `diary != comic` — **correct**

Explanation: For references, == is true only when both sides refer to the same object (or both are null). Comparing int values returned by getters compares numbers. diary != comic is false.

Trace: `Book diary = new Book(20);` → creates Object #1 (Book: pagesRead = 20); diary refers to Object #1; `Book comic = new Book(20);` → creates Object #2 (Book: pagesRead = 20); comic refers to Object #2; `Book guide = diary;` → guide refers to Object #1 (the same object as diary); `comic = guide;` → comic refers to Object #1 (the same object as diary and guide)

#### equality · Intermediate · sample 3 — `equality.which`

Complexity score 30; features: alias, reassign-after-alias, three-objects.

```java
class Battery {
    private int charge;

    public Battery(int start) {
        charge = start;
    }

    public int getCharge() {
        return charge;
    }
}

Battery extra = new Battery(7);
Battery right = new Battery(7);
Battery left = extra;
extra = new Battery(9);
```

*The statements after the class run in order inside main.*

**After this code runs, which comparison is true?**

A. `right == left` — Thinks == compares field values (`identityAsContent`)
B. `extra.getCharge() == left.getCharge()` — Thinks reassignment changes the old object (`reassignMutates`)
C. `right != left` — **correct**
D. `extra == left` — Thinks reassignment changes the old object (`reassignMutates`)

Explanation: For references, == is true only when both sides refer to the same object (or both are null). Comparing int values returned by getters compares numbers. right != left is true.

Trace: `Battery extra = new Battery(7);` → creates Object #1 (Battery: charge = 7); extra refers to Object #1; `Battery right = new Battery(7);` → creates Object #2 (Battery: charge = 7); right refers to Object #2; `Battery left = extra;` → left refers to Object #1 (the same object as extra); `extra = new Battery(9);` → creates Object #3 (Battery: charge = 9); extra refers to Object #3

#### equality · Intermediate · sample 4 — `equality.which`

Complexity score 26; features: alias, multi-alias, reassign-after-alias.

```java
class Ticket {
    private int price;

    public Ticket(int start) {
        price = start;
    }

    public int getPrice() {
        return price;
    }
}

Ticket t2 = new Ticket(2);
Ticket t1 = t2;
Ticket t3 = t2;
t1 = new Ticket(3);
```

*The statements after the class run in order inside main.*

**After this code runs, which comparison is false?**

A. `t1 != t3` — Thinks reassignment changes the old object (`reassignMutates`)
B. `t1.getPrice() == t3.getPrice()` — **correct**
C. `t2 != t1` — Thinks reassignment changes the old object (`reassignMutates`)
D. `t2 == t3` — Treats an alias as a separate copy (`aliasCopies`)

Explanation: For references, == is true only when both sides refer to the same object (or both are null). Comparing int values returned by getters compares numbers. t1.getPrice() == t3.getPrice() is false.

Trace: `Ticket t2 = new Ticket(2);` → creates Object #1 (Ticket: price = 2); t2 refers to Object #1; `Ticket t1 = t2;` → t1 refers to Object #1 (the same object as t2); `Ticket t3 = t2;` → t3 refers to Object #1 (the same object as t2 and t1); `t1 = new Ticket(3);` → creates Object #2 (Ticket: price = 3); t1 refers to Object #2

#### equality · Intermediate · sample 5 — `equality.which`

Complexity score 28; features: alias, multi-alias, reassign-after-alias.

```java
class Lamp {
    private int brightness;

    public Lamp(int start) {
        brightness = start;
    }

    public int getBrightness() {
        return brightness;
    }

    public void brighten(int level) {
        brightness += level;
    }
}

Lamp floor = new Lamp(17);
Lamp porch = floor;
Lamp hall = porch;
hall.brighten(9);
floor = new Lamp(15);
```

*The statements after the class run in order inside main.*

**After this code runs, which comparison is false?**

A. `porch.getBrightness() == hall.getBrightness()` — Treats an alias as a separate copy (`aliasCopies`)
B. `floor.getBrightness() == porch.getBrightness()` — **correct**
C. `floor != hall` — Thinks reassignment changes the old object (`reassignMutates`)
D. `floor != porch` — Thinks reassignment changes the old object (`reassignMutates`)

Explanation: For references, == is true only when both sides refer to the same object (or both are null). Comparing int values returned by getters compares numbers. floor.getBrightness() == porch.getBrightness() is false.

Trace: `Lamp floor = new Lamp(17);` → creates Object #1 (Lamp: brightness = 17); floor refers to Object #1; `Lamp porch = floor;` → porch refers to Object #1 (the same object as floor); `Lamp hall = porch;` → hall refers to Object #1 (the same object as floor and porch); `hall.brighten(9);` → Object #1.brightness: 17 → 26; `floor = new Lamp(15);` → creates Object #2 (Lamp: brightness = 15); floor refers to Object #2

### Advanced

#### equality · Advanced · sample 1 — `equality.which`

Complexity score 39; features: alias, returns-reference, returns-this, three-objects.

```java
class Counter {
    private int value;

    public Counter(int start) {
        value = start;
    }

    public int getValue() {
        return value;
    }

    public void add(int amount) {
        value += amount;
    }

    public Counter self() {
        return this;
    }

    public Counter copy() {
        return new Counter(value);
    }
}

Counter d = new Counter(20);
d.add(3);
Counter a = new Counter(20);
Counter c = a.copy();
Counter e = d.self();
```

*The statements after the class run in order inside main.*

**After this code runs, which comparison is true?**

A. `d.getValue() == a.getValue()` — Thinks equal state means the same object (`equalArgsAlias`)
B. `a == e` — Thinks equal state means the same object (`equalArgsAlias`)
C. `a == c` — Thinks == compares field values (`identityAsContent`)
D. `a.getValue() == c.getValue()` — **correct**

Explanation: For references, == is true only when both sides refer to the same object (or both are null). Comparing int values returned by getters compares numbers. a.getValue() == c.getValue() is true.

Trace: `Counter d = new Counter(20);` → creates Object #1 (Counter: value = 20); d refers to Object #1; `d.add(3);` → Object #1.value: 20 → 23; `Counter a = new Counter(20);` → creates Object #2 (Counter: value = 20); a refers to Object #2; `Counter c = a.copy();` → creates Object #3 (Counter: value = 20); c refers to Object #3; `Counter e = d.self();` → e refers to Object #1 (the same object as d)

#### equality · Advanced · sample 2 — `equality.which`

Complexity score 42; features: alias, multi-alias, reassign-after-alias, returns-reference, returns-this, three-objects.

```java
class Book {
    private int pagesRead;

    public Book(int start) {
        pagesRead = start;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public Book self() {
        return this;
    }
}

Book diary = new Book(20);
Book comic = new Book(20);
Book guide = diary;
Book atlas = diary.self();
guide = new Book(18);
```

*The statements after the class run in order inside main.*

**After this code runs, which comparison is true?**

A. `guide.getPagesRead() == atlas.getPagesRead()` — Thinks reassignment changes the old object (`reassignMutates`)
B. `diary == comic` — Thinks == compares field values (`identityAsContent`)
C. `diary != comic` — **correct**
D. `comic == atlas` — Thinks == compares field values (`identityAsContent`)

Explanation: For references, == is true only when both sides refer to the same object (or both are null). Comparing int values returned by getters compares numbers. diary != comic is true.

Trace: `Book diary = new Book(20);` → creates Object #1 (Book: pagesRead = 20); diary refers to Object #1; `Book comic = new Book(20);` → creates Object #2 (Book: pagesRead = 20); comic refers to Object #2; `Book guide = diary;` → guide refers to Object #1 (the same object as diary); `Book atlas = diary.self();` → atlas refers to Object #1 (the same object as diary and guide); `guide = new Book(18);` → creates Object #3 (Book: pagesRead = 18); guide refers to Object #3

#### equality · Advanced · sample 3 — `equality.which`

Complexity score 40; features: alias, multi-alias, reassign-after-alias, returns-reference, returns-this.

```java
class Book {
    private int pagesRead;

    public Book(int start) {
        pagesRead = start;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public Book self() {
        return this;
    }
}

static Book same(Book x) {
    return x;
}

Book novel = new Book(13);
Book atlas = novel.self();
Book diary = same(atlas);
Book guide = novel.self();
atlas = new Book(13);
```

*The statements after the class run in order inside main. The static methods shown outside the class are in the same class as main.*

**After this code runs, which comparison is false?**

A. `atlas != diary` — Thinks == compares field values (`identityAsContent`)
B. `diary != guide` — **correct**
C. `novel == diary` — Thinks a returned reference is a copy (`returnCopies`)
D. `atlas.getPagesRead() == guide.getPagesRead()` — Thinks comparing values compares objects (`valuesAsIdentity`)

Explanation: For references, == is true only when both sides refer to the same object (or both are null). Comparing int values returned by getters compares numbers. diary != guide is false.

Trace: `Book novel = new Book(13);` → creates Object #1 (Book: pagesRead = 13); novel refers to Object #1; `Book atlas = novel.self();` → atlas refers to Object #1 (the same object as novel); `Book diary = same(atlas);` → diary refers to Object #1 (the same object as novel and atlas); `Book guide = novel.self();` → guide refers to Object #1 (the same object as novel and atlas and diary); `atlas = new Book(13);` → creates Object #2 (Book: pagesRead = 13); atlas refers to Object #2

#### equality · Advanced · sample 4 — `equality.which`

Complexity score 39; features: alias, returns-reference, returns-this, three-objects.

```java
class Player {
    private int score;

    public Player(int start) {
        score = start;
    }

    public int getScore() {
        return score;
    }

    public void addPoints(int points) {
        score += points;
    }

    public Player self() {
        return this;
    }

    public Player copy() {
        return new Player(score);
    }
}

Player p1 = new Player(1);
Player p5 = new Player(1);
Player p3 = p1.self();
p1.addPoints(6);
Player p2 = p5.copy();
```

*The statements after the class run in order inside main.*

**After this code runs, which comparison is true?**

A. `p1 == p5` — Thinks equal state means the same object (`equalArgsAlias`)
B. `p1.getScore() == p5.getScore()` — Thinks equal state means the same object (`equalArgsAlias`)
C. `p5.getScore() == p2.getScore()` — **correct**
D. `p5 == p2` — Thinks == compares field values (`identityAsContent`)

Explanation: For references, == is true only when both sides refer to the same object (or both are null). Comparing int values returned by getters compares numbers. p5.getScore() == p2.getScore() is true.

Trace: `Player p1 = new Player(1);` → creates Object #1 (Player: score = 1); p1 refers to Object #1; `Player p5 = new Player(1);` → creates Object #2 (Player: score = 1); p5 refers to Object #2; `Player p3 = p1.self();` → p3 refers to Object #1 (the same object as p1); `p1.addPoints(6);` → Object #1.score: 1 → 7; `Player p2 = p5.copy();` → creates Object #3 (Player: score = 1); p2 refers to Object #3

#### equality · Advanced · sample 5 — `equality.which`

Complexity score 39; features: alias, null, reassign-after-alias, returns-reference, three-objects.

```java
class Account {
    private int balance;

    public Account(int start) {
        balance = start;
    }

    public int getBalance() {
        return balance;
    }

    public Account copy() {
        return new Account(balance);
    }
}

Account college = new Account(15);
college = null;
Account checking = new Account(15);
Account backup = checking;
Account savings = checking.copy();
```

*The statements after the class run in order inside main.*

**After this code runs, which comparison is true?**

A. `backup == savings` — Thinks == compares field values (`identityAsContent`)
B. `checking != backup` — Treats an alias as a separate copy (`aliasCopies`)
C. `college != savings` — **correct**
D. `checking == savings` — Thinks == compares field values (`identityAsContent`)

Explanation: For references, == is true only when both sides refer to the same object (or both are null). Comparing int values returned by getters compares numbers. college != savings is true.

Trace: `Account college = new Account(15);` → creates Object #1 (Account: balance = 15); college refers to Object #1; `college = null;` → college is now null; `Account checking = new Account(15);` → creates Object #2 (Account: balance = 15); checking refers to Object #2; `Account backup = checking;` → backup refers to Object #2 (the same object as checking); `Account savings = checking.copy();` → creates Object #3 (Account: balance = 15); savings refers to Object #3

## Passing an object to a method (`parameters`)

### Beginner

#### parameters · Beginner · sample 1 — `parameters.helpers`

Complexity score 24; features: param-reassign.

```java
class Battery {
    private int charge;

    public Battery(int start) {
        charge = start;
    }

    public int getCharge() {
        return charge;
    }

    public void recharge(int units) {
        charge += units;
    }
}

static void replace(Battery item) {
    item = new Battery(8);
}

Battery main = new Battery(5);
replace(main);
main.recharge(2);
System.out.println(main.getCharge());
```

*The statements after the class run in order inside main. The static methods shown outside the class are in the same class as main.*

**What is printed when this code runs?**

A. `5` — Misses one of the updates (`lostUpdate`)
B. `7` — **correct**
C. `2` — Treats += as replacement (`compoundAsReplace`)
D. `10` — Thinks Java passes by reference (`paramByRef`)

Explanation: Java passes every argument by value. For an object argument the value is a reference, so the method can change the caller's object through it, but reassigning the parameter only changes the method's own copy of the reference. The program prints 7.

Trace: `Battery main = new Battery(5);` → creates Object #1 (Battery: charge = 5); main refers to Object #1; `replace(main);` → creates Object #2 (Battery: charge = 8); `main.recharge(2);` → Object #1.charge: 5 → 7; `System.out.println(main.getCharge());` → prints "7"

#### parameters · Beginner · sample 2 — `parameters.helpers`

Complexity score 27; features: alias, param-mutation.

```java
class Battery {
    private int charge;

    public Battery(int start) {
        charge = start;
    }

    public int getCharge() {
        return charge;
    }

    public void recharge(int units) {
        charge += units;
    }
}

static void award(Battery item) {
    item.recharge(6);
}

Battery extra = new Battery(7);
Battery main = extra;
extra.recharge(5);
award(main);
System.out.println(main.getCharge());
```

*The statements after the class run in order inside main. The static methods shown outside the class are in the same class as main.*

**What is printed when this code runs?**

A. `13` — Misses one of the updates (`lostUpdate`)
B. `18` — **correct**
C. `12` — Thinks the method gets a copy of the object (`paramDeepCopy`)
D. `6` — Treats += as replacement (`compoundAsReplace`)

Explanation: Java passes every argument by value. For an object argument the value is a reference, so the method can change the caller's object through it, but reassigning the parameter only changes the method's own copy of the reference. The program prints 18.

Trace: `Battery extra = new Battery(7);` → creates Object #1 (Battery: charge = 7); extra refers to Object #1; `Battery main = extra;` → main refers to Object #1 (the same object as extra); `extra.recharge(5);` → Object #1.charge: 7 → 12; `award(main);` → Object #1.charge: 12 → 18; `System.out.println(main.getCharge());` → prints "18"

#### parameters · Beginner · sample 3 — `parameters.helpers`

Complexity score 22; features: param-mutation.

```java
class Account {
    private int balance;

    public Account(int start) {
        balance = start;
    }

    public int getBalance() {
        return balance;
    }

    public void deposit(int amount) {
        balance += amount;
    }
}

static void award(Account item) {
    item.deposit(3);
}

Account college = new Account(9);
college.deposit(1);
award(college);
System.out.println(college.getBalance());
```

*The statements after the class run in order inside main. The static methods shown outside the class are in the same class as main.*

**What is printed when this code runs?**

A. `13` — **correct**
B. `10` — Thinks the method gets a copy of the object (`paramDeepCopy`)
C. `3` — Treats += as replacement (`compoundAsReplace`)
D. `12` — Misses one of the updates (`lostUpdate`)

Explanation: Java passes every argument by value. For an object argument the value is a reference, so the method can change the caller's object through it, but reassigning the parameter only changes the method's own copy of the reference. The program prints 13.

Trace: `Account college = new Account(9);` → creates Object #1 (Account: balance = 9); college refers to Object #1; `college.deposit(1);` → Object #1.balance: 9 → 10; `award(college);` → Object #1.balance: 10 → 13; `System.out.println(college.getBalance());` → prints "13"

#### parameters · Beginner · sample 4 — `parameters.helpers`

Complexity score 23; features: param-mutation.

```java
class Battery {
    private int charge;

    public Battery(int start) {
        charge = start;
    }

    public int getCharge() {
        return charge;
    }

    public void recharge(int units) {
        charge += units;
    }
}

static void award(Battery item) {
    item.recharge(2);
}

Battery spare = new Battery(12);
award(spare);
award(spare);
System.out.println(spare.getCharge());
```

*The statements after the class run in order inside main. The static methods shown outside the class are in the same class as main.*

**What is printed when this code runs?**

A. `12` — Thinks the method gets a copy of the object (`paramDeepCopy`)
B. `16` — **correct**
C. `2` — Treats += as replacement (`compoundAsReplace`)
D. `14` — Misses one of the updates (`lostUpdate`)

Explanation: Java passes every argument by value. For an object argument the value is a reference, so the method can change the caller's object through it, but reassigning the parameter only changes the method's own copy of the reference. The program prints 16.

Trace: `Battery spare = new Battery(12);` → creates Object #1 (Battery: charge = 12); spare refers to Object #1; `award(spare);` → Object #1.charge: 12 → 14; `award(spare);` → Object #1.charge: 14 → 16; `System.out.println(spare.getCharge());` → prints "16"

#### parameters · Beginner · sample 5 — `parameters.helpers`

Complexity score 16; features: none.

```java
class Tank {
    private int level;

    public Tank(int start) {
        level = start;
    }

    public int getLevel() {
        return level;
    }

    public void fill(int liters) {
        level += liters;
    }
}

static void bump(int n) {
    n += 3;
}

Tank tankE = new Tank(15);
tankE.fill(4);
int count = tankE.getLevel();
bump(count);
System.out.println(count);
```

*The statements after the class run in order inside main. The static methods shown outside the class are in the same class as main.*

**What is printed when this code runs?**

A. `15` — Misses one of the updates (`lostUpdate`)
B. `4` — Treats += as replacement (`compoundAsReplace`)
C. `22` — Thinks a primitive parameter is linked to the argument (`primByRef`)
D. `19` — **correct**

Explanation: Java passes every argument by value. For an object argument the value is a reference, so the method can change the caller's object through it, but reassigning the parameter only changes the method's own copy of the reference. The program prints 19.

Trace: `Tank tankE = new Tank(15);` → creates Object #1 (Tank: level = 15); tankE refers to Object #1; `tankE.fill(4);` → Object #1.level: 15 → 19; `int count = tankE.getLevel();` → count = 19; `bump(count);` → no stored value changes; `System.out.println(count);` → prints "19"

### Intermediate

#### parameters · Intermediate · sample 1 — `parameters.helpers`

Complexity score 27; features: param-mutation, param-reassign.

```java
class Ticket {
    private int price;

    public Ticket(int start) {
        price = start;
    }

    public int getPrice() {
        return price;
    }

    public void raise(int dollars) {
        price += dollars;
    }
}

static void update(Ticket item) {
    item.raise(3);
    item = new Ticket(6);
}

Ticket t1 = new Ticket(1);
update(t1);
System.out.println(t1.getPrice());
```

*The statements after the class run in order inside main. The static methods shown outside the class are in the same class as main.*

**What is printed when this code runs?**

A. `4` — **correct**
B. `3` — Treats += as replacement (`compoundAsReplace`)
C. `6` — Thinks Java passes by reference (`paramByRef`)
D. `1` — Thinks the method gets a copy of the object (`paramDeepCopy`)

Explanation: Java passes every argument by value. For an object argument the value is a reference, so the method can change the caller's object through it, but reassigning the parameter only changes the method's own copy of the reference. The program prints 4.

Trace: `Ticket t1 = new Ticket(1);` → creates Object #1 (Ticket: price = 1); t1 refers to Object #1; `update(t1);` → creates Object #2 (Ticket: price = 6); Object #1.price: 1 → 4; `System.out.println(t1.getPrice());` → prints "4"

#### parameters · Intermediate · sample 2 — `parameters.helpers`

Complexity score 41; features: conditional, param-mutation, param-reassign, several-helpers.

```java
class Book {
    private int pagesRead;

    public Book(int start) {
        pagesRead = start;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public void read(int pages) {
        pagesRead += pages;
    }
}

static void update(Book item) {
    item.read(1);
    item = new Book(5);
}

static void boost(Book item) {
    if (item.getPagesRead() < 8) {
        item.read(4);
    }
}

Book novel = new Book(15);
update(novel);
boost(novel);
System.out.println(novel.getPagesRead());
```

*The statements after the class run in order inside main. The static methods shown outside the class are in the same class as main.*

**What is printed when this code runs?**

A. `16` — **correct**
B. `4` — Treats += as replacement (`compoundAsReplace`)
C. `9` — Thinks Java passes by reference (`paramByRef`)
D. `15` — Thinks the method gets a copy of the object (`paramDeepCopy`)

Explanation: Java passes every argument by value. For an object argument the value is a reference, so the method can change the caller's object through it, but reassigning the parameter only changes the method's own copy of the reference. The program prints 16.

Trace: `Book novel = new Book(15);` → creates Object #1 (Book: pagesRead = 15); novel refers to Object #1; `update(novel);` → creates Object #2 (Book: pagesRead = 5); Object #1.pagesRead: 15 → 16; `boost(novel);` → no stored value changes; `System.out.println(novel.getPagesRead());` → prints "16"

#### parameters · Intermediate · sample 3 — `parameters.helpers`

Complexity score 30; features: param-mutation, several-helpers, several-outputs.

```java
class Account {
    private int balance;

    public Account(int start) {
        balance = start;
    }

    public int getBalance() {
        return balance;
    }

    public void deposit(int amount) {
        balance += amount;
    }
}

static void award(Account item) {
    item.deposit(9);
}

static void bump(int n) {
    n += 3;
}

Account college = new Account(2);
award(college);
int count = 6;
bump(count);
System.out.println(college.getBalance());
System.out.println(count);
```

*The statements after the class run in order inside main. The static methods shown outside the class are in the same class as main.*

**What is printed when this code runs?**

A. `11 ⏎ 6` — **correct**
B. `9 ⏎ 6` — Treats += as replacement (`compoundAsReplace`)
C. `2 ⏎ 6` — Thinks the method gets a copy of the object (`paramDeepCopy`)
D. `11 ⏎ 9` — Thinks a primitive parameter is linked to the argument (`primByRef`)

Explanation: Java passes every argument by value. For an object argument the value is a reference, so the method can change the caller's object through it, but reassigning the parameter only changes the method's own copy of the reference. The program prints these lines in order: 11, 6.

Trace: `Account college = new Account(2);` → creates Object #1 (Account: balance = 2); college refers to Object #1; `award(college);` → Object #1.balance: 2 → 11; `int count = 6;` → count = 6; `bump(count);` → no stored value changes; `System.out.println(college.getBalance());` → prints "11"; `System.out.println(count);` → prints "6"

#### parameters · Intermediate · sample 4 — `parameters.helpers`

Complexity score 50; features: alias, param-mutation, param-reassign, returns-reference, several-helpers, several-outputs.

```java
class Car {
    private int speed;

    public Car(int start) {
        speed = start;
    }

    public int getSpeed() {
        return speed;
    }

    public void accelerate(int mph) {
        speed += mph;
    }
}

static void update(Car item) {
    item.accelerate(1);
    item = new Car(9);
}

static Car touch(Car item) {
    item.accelerate(6);
    return item;
}

Car car = new Car(2);
update(car);
Car truck = touch(car);
truck.accelerate(3);
System.out.println(car.getSpeed());
System.out.println(truck == car);
```

*The statements after the class run in order inside main. The static methods shown outside the class are in the same class as main.*

**What is printed when this code runs?**

A. `2 ⏎ false` — Thinks the method gets a copy of the object (`paramDeepCopy`)
B. `12 ⏎ true` — **correct**
C. `9 ⏎ false` — Thinks a returned reference is a copy (`returnCopies`)
D. `18 ⏎ true` — Thinks Java passes by reference (`paramByRef`)

Explanation: Java passes every argument by value. For an object argument the value is a reference, so the method can change the caller's object through it, but reassigning the parameter only changes the method's own copy of the reference. The program prints these lines in order: 12, true.

Trace: `Car car = new Car(2);` → creates Object #1 (Car: speed = 2); car refers to Object #1; `update(car);` → creates Object #2 (Car: speed = 9); Object #1.speed: 2 → 3; `Car truck = touch(car);` → truck refers to Object #1 (the same object as car); Object #1.speed: 3 → 9; `truck.accelerate(3);` → Object #1.speed: 9 → 12; `System.out.println(car.getSpeed());` → prints "12"; `System.out.println(truck == car);` → prints "true"

#### parameters · Intermediate · sample 5 — `parameters.helpers`

Complexity score 33; features: alias, param-mutation, returns-reference, several-outputs.

```java
class Player {
    private int score;

    public Player(int start) {
        score = start;
    }

    public int getScore() {
        return score;
    }

    public void addPoints(int points) {
        score += points;
    }
}

static Player touch(Player item) {
    item.addPoints(6);
    return item;
}

Player p2 = new Player(2);
Player p4 = touch(p2);
p4.addPoints(4);
System.out.println(p2.getScore());
System.out.println(p4 == p2);
```

*The statements after the class run in order inside main. The static methods shown outside the class are in the same class as main.*

**What is printed when this code runs?**

A. `2 ⏎ false` — Thinks the method gets a copy of the object (`paramDeepCopy`)
B. `8 ⏎ false` — Thinks a returned reference is a copy (`returnCopies`)
C. `12 ⏎ true` — **correct**
D. `8 ⏎ true` — Misses one of the updates (`lostUpdate`)

Explanation: Java passes every argument by value. For an object argument the value is a reference, so the method can change the caller's object through it, but reassigning the parameter only changes the method's own copy of the reference. The program prints these lines in order: 12, true.

Trace: `Player p2 = new Player(2);` → creates Object #1 (Player: score = 2); p2 refers to Object #1; `Player p4 = touch(p2);` → p4 refers to Object #1 (the same object as p2); Object #1.score: 2 → 8; `p4.addPoints(4);` → Object #1.score: 8 → 12; `System.out.println(p2.getScore());` → prints "12"; `System.out.println(p4 == p2);` → prints "true"

### Advanced

#### parameters · Advanced · sample 1 — `parameters.helpers`

Complexity score 54; features: alias, param-mutation, returns-reference, several-helpers, several-outputs.

```java
class Robot {
    private int steps;

    public Robot(int start) {
        steps = start;
    }

    public int getSteps() {
        return steps;
    }

    public void move(int n) {
        steps += n;
    }
}

static void move(Robot from, Robot to) {
    from.move(-6);
    to.move(6);
}

static Robot touch(Robot item) {
    item.move(4);
    return item;
}

Robot scout = new Robot(14);
Robot probe = new Robot(15);
move(probe, scout);
Robot rover = touch(scout);
rover.move(1);
System.out.println(probe.getSteps());
System.out.println(rover == scout);
System.out.println(scout.getSteps());
```

*The statements after the class run in order inside main. The static methods shown outside the class are in the same class as main.*

**What is printed when this code runs?**

A. `9 ⏎ true ⏎ 25` — **correct**
B. `10 ⏎ true ⏎ 24` — Applies a call to the wrong object (`wrongReceiver`)
C. `9 ⏎ false ⏎ 24` — Thinks a returned reference is a copy (`returnCopies`)
D. `15 ⏎ false ⏎ 14` — Thinks the method gets a copy of the object (`paramDeepCopy`)

Explanation: Java passes every argument by value. For an object argument the value is a reference, so the method can change the caller's object through it, but reassigning the parameter only changes the method's own copy of the reference. The program prints these lines in order: 9, true, 25.

Trace: `Robot scout = new Robot(14);` → creates Object #1 (Robot: steps = 14); scout refers to Object #1; `Robot probe = new Robot(15);` → creates Object #2 (Robot: steps = 15); probe refers to Object #2; `move(probe, scout);` → Object #1.steps: 14 → 20; Object #2.steps: 15 → 9; `Robot rover = touch(scout);` → rover refers to Object #1 (the same object as scout); Object #1.steps: 20 → 24; `rover.move(1);` → Object #1.steps: 24 → 25; `System.out.println(probe.getSteps());` → prints "9"; `System.out.println(rover == scout);` → prints "true"; `System.out.println(scout.getSteps());` → prints "25"

#### parameters · Advanced · sample 2 — `parameters.helpers`

Complexity score 53; features: alias, param-mutation, param-reassign, returns-reference, several-helpers, several-outputs.

```java
class Book {
    private int pagesRead;

    public Book(int start) {
        pagesRead = start;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public void read(int pages) {
        pagesRead += pages;
    }
}

static void swap(Book first, Book second) {
    Book temp = first;
    first = second;
    second = temp;
}

static Book touch(Book item) {
    item.read(5);
    return item;
}

Book novel = new Book(11);
Book diary = new Book(3);
swap(diary, novel);
Book comic = touch(diary);
comic.read(3);
System.out.println(comic == diary);
System.out.println(diary.getPagesRead());
System.out.println(novel.getPagesRead());
```

*The statements after the class run in order inside main. The static methods shown outside the class are in the same class as main.*

**What is printed when this code runs?**

A. `true ⏎ 11 ⏎ 11` — **correct**
B. `false ⏎ 3 ⏎ 11` — Thinks the method gets a copy of the object (`paramDeepCopy`)
C. `false ⏎ 8 ⏎ 11` — Thinks a returned reference is a copy (`returnCopies`)
D. `true ⏎ 19 ⏎ 3` — Thinks Java passes by reference (`paramByRef`)

Explanation: Java passes every argument by value. For an object argument the value is a reference, so the method can change the caller's object through it, but reassigning the parameter only changes the method's own copy of the reference. The program prints these lines in order: true, 11, 11.

Trace: `Book novel = new Book(11);` → creates Object #1 (Book: pagesRead = 11); novel refers to Object #1; `Book diary = new Book(3);` → creates Object #2 (Book: pagesRead = 3); diary refers to Object #2; `swap(diary, novel);` → no stored value changes; `Book comic = touch(diary);` → comic refers to Object #2 (the same object as diary); Object #2.pagesRead: 3 → 8; `comic.read(3);` → Object #2.pagesRead: 8 → 11; `System.out.println(comic == diary);` → prints "true"; `System.out.println(diary.getPagesRead());` → prints "11"; `System.out.println(novel.getPagesRead());` → prints "11"

#### parameters · Advanced · sample 3 — `parameters.helpers`

Complexity score 44; features: param-mutation, several-helpers, several-outputs.

```java
class Account {
    private int balance;

    public Account(int start) {
        balance = start;
    }

    public int getBalance() {
        return balance;
    }

    public void deposit(int amount) {
        balance += amount;
    }
}

static void move(Account from, Account to) {
    from.deposit(-2);
    to.deposit(2);
}

static void award(Account item) {
    item.deposit(8);
}

Account college = new Account(10);
Account savings = new Account(2);
move(college, savings);
award(savings);
System.out.println(college.getBalance());
System.out.println(savings.getBalance());
```

*The statements after the class run in order inside main. The static methods shown outside the class are in the same class as main.*

**What is printed when this code runs?**

A. `8 ⏎ 12` — **correct**
B. `8 ⏎ 4` — Misses one of the updates (`lostUpdate`)
C. `10 ⏎ 2` — Thinks the method gets a copy of the object (`paramDeepCopy`)
D. `-2 ⏎ 8` — Treats += as replacement (`compoundAsReplace`)

Explanation: Java passes every argument by value. For an object argument the value is a reference, so the method can change the caller's object through it, but reassigning the parameter only changes the method's own copy of the reference. The program prints these lines in order: 8, 12.

Trace: `Account college = new Account(10);` → creates Object #1 (Account: balance = 10); college refers to Object #1; `Account savings = new Account(2);` → creates Object #2 (Account: balance = 2); savings refers to Object #2; `move(college, savings);` → Object #1.balance: 10 → 8; Object #2.balance: 2 → 4; `award(savings);` → Object #2.balance: 4 → 12; `System.out.println(college.getBalance());` → prints "8"; `System.out.println(savings.getBalance());` → prints "12"

#### parameters · Advanced · sample 4 — `parameters.helpers`

Complexity score 61; features: alias, param-mutation, param-reassign, returns-reference, several-helpers, several-outputs, three-objects.

```java
class Timer {
    private int seconds;

    public Timer(int start) {
        seconds = start;
    }

    public int getSeconds() {
        return seconds;
    }

    public void addTime(int s) {
        seconds += s;
    }
}

static void update(Timer item) {
    item.addTime(4);
    item = new Timer(8);
}

static Timer touch(Timer item) {
    item.addTime(5);
    return item;
}

Timer timer = new Timer(14);
Timer alarm = new Timer(14);
update(timer);
Timer watch = touch(timer);
watch.addTime(4);
System.out.println(timer.getSeconds());
System.out.println(watch == timer);
System.out.println(alarm.getSeconds());
```

*The statements after the class run in order inside main. The static methods shown outside the class are in the same class as main.*

**What is printed when this code runs?**

A. `14 ⏎ false ⏎ 14` — Thinks the method gets a copy of the object (`paramDeepCopy`)
B. `23 ⏎ false ⏎ 14` — Thinks a returned reference is a copy (`returnCopies`)
C. `17 ⏎ true ⏎ 14` — Thinks Java passes by reference (`paramByRef`)
D. `27 ⏎ true ⏎ 14` — **correct**

Explanation: Java passes every argument by value. For an object argument the value is a reference, so the method can change the caller's object through it, but reassigning the parameter only changes the method's own copy of the reference. The program prints these lines in order: 27, true, 14.

Trace: `Timer timer = new Timer(14);` → creates Object #1 (Timer: seconds = 14); timer refers to Object #1; `Timer alarm = new Timer(14);` → creates Object #2 (Timer: seconds = 14); alarm refers to Object #2; `update(timer);` → creates Object #3 (Timer: seconds = 8); Object #1.seconds: 14 → 18; `Timer watch = touch(timer);` → watch refers to Object #1 (the same object as timer); Object #1.seconds: 18 → 23; `watch.addTime(4);` → Object #1.seconds: 23 → 27; `System.out.println(timer.getSeconds());` → prints "27"; `System.out.println(watch == timer);` → prints "true"; `System.out.println(alarm.getSeconds());` → prints "14"

#### parameters · Advanced · sample 5 — `parameters.helpers`

Complexity score 41; features: param-mutation, several-helpers, several-outputs.

```java
class Lamp {
    private int brightness;

    public Lamp(int start) {
        brightness = start;
    }

    public int getBrightness() {
        return brightness;
    }

    public void brighten(int level) {
        brightness += level;
    }
}

static int plus(int n) {
    n += 8;
    return n;
}

static void move(Lamp from, Lamp to) {
    from.brighten(-5);
    to.brighten(5);
}

Lamp floor = new Lamp(13);
Lamp porch = new Lamp(14);
int count = 9;
plus(count);
move(floor, porch);
System.out.println(floor.getBrightness());
System.out.println(count);
System.out.println(porch.getBrightness());
```

*The statements after the class run in order inside main. The static methods shown outside the class are in the same class as main.*

**What is printed when this code runs?**

A. `-5 ⏎ 9 ⏎ 5` — Treats += as replacement (`compoundAsReplace`)
B. `13 ⏎ 9 ⏎ 14` — Thinks the method gets a copy of the object (`paramDeepCopy`)
C. `8 ⏎ 9 ⏎ 19` — **correct**
D. `8 ⏎ 17 ⏎ 19` — Thinks a primitive parameter is linked to the argument (`primByRef`)

Explanation: Java passes every argument by value. For an object argument the value is a reference, so the method can change the caller's object through it, but reassigning the parameter only changes the method's own copy of the reference. The program prints these lines in order: 8, 9, 19.

Trace: `Lamp floor = new Lamp(13);` → creates Object #1 (Lamp: brightness = 13); floor refers to Object #1; `Lamp porch = new Lamp(14);` → creates Object #2 (Lamp: brightness = 14); porch refers to Object #2; `int count = 9;` → count = 9; `plus(count);` → no stored value changes; `move(floor, porch);` → Object #1.brightness: 13 → 8; Object #2.brightness: 14 → 19; `System.out.println(floor.getBrightness());` → prints "8"; `System.out.println(count);` → prints "9"; `System.out.println(porch.getBrightness());` → prints "19"

## Static versus instance fields (`static`)

### Beginner

#### static · Beginner · sample 1 — `static.counter`

Complexity score 26; features: several-outputs, static.

```java
class Timer {
    private int seconds;
    private static int started = 0;

    public Timer() {
        started++;
    }

    public int getSeconds() {
        return seconds;
    }

    public void addTime(int s) {
        seconds += s;
    }

    public static int getStarted() {
        return started;
    }
}

Timer clock = new Timer();
Timer alarm = new Timer();
clock.addTime(6);
System.out.println(alarm.getSeconds());
System.out.println(Timer.getStarted());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `0 ⏎ 1` — Thinks each object has its own static field (`staticAsInstance`)
B. `0 ⏎ 2` — **correct**
C. `0 ⏎ 0` — Ignores the constructor body (`forgetCtor`)
D. `6 ⏎ 2` — Thinks all objects share an instance field (`instanceAsStatic`)

Explanation: A static field belongs to the class: every constructor call and every method that changes it updates one shared value. An instance field is stored separately in each object. The program prints these lines in order: 0, 2.

Trace: `Timer clock = new Timer();` → creates Object #1 (Timer: seconds = 0); clock refers to Object #1; static Timer.started: 0 → 1; `Timer alarm = new Timer();` → creates Object #2 (Timer: seconds = 0); alarm refers to Object #2; static Timer.started: 1 → 2; `clock.addTime(6);` → Object #1.seconds: 0 → 6; `System.out.println(alarm.getSeconds());` → prints "0"; `System.out.println(Timer.getStarted());` → prints "2"

#### static · Beginner · sample 2 — `static.counter`

Complexity score 24; features: alias, static.

```java
class Book {
    private int pagesRead;
    private static int printed = 0;

    public Book() {
        printed++;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public void read(int pages) {
        pagesRead += pages;
    }

    public static int getPrinted() {
        return printed;
    }
}

Book diary = new Book();
Book guide = diary;
Book comic = new Book();
System.out.println(Book.getPrinted());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `3` — Thinks copying a reference creates an object (`aliasCreates`)
B. `0` — Ignores the constructor body (`forgetCtor`)
C. `1` — Thinks each object has its own static field (`staticAsInstance`)
D. `2` — **correct**

Explanation: A static field belongs to the class: every constructor call and every method that changes it updates one shared value. An instance field is stored separately in each object. The program prints 2.

Trace: `Book diary = new Book();` → creates Object #1 (Book: pagesRead = 0); diary refers to Object #1; static Book.printed: 0 → 1; `Book guide = diary;` → guide refers to Object #1 (the same object as diary); `Book comic = new Book();` → creates Object #2 (Book: pagesRead = 0); comic refers to Object #2; static Book.printed: 1 → 2; `System.out.println(Book.getPrinted());` → prints "2"

#### static · Beginner · sample 3 — `static.counter`

Complexity score 26; features: several-outputs, static.

```java
class Player {
    private int score;
    private static int playerCount = 0;

    public Player() {
        playerCount++;
    }

    public int getScore() {
        return score;
    }

    public void addPoints(int points) {
        score += points;
    }

    public static int getPlayerCount() {
        return playerCount;
    }
}

Player p3 = new Player();
Player p5 = new Player();
p3.addPoints(5);
System.out.println(Player.getPlayerCount());
System.out.println(p3.getScore());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `2 ⏎ 0` — Misses one of the updates (`lostUpdate`)
B. `1 ⏎ 5` — Thinks each object has its own static field (`staticAsInstance`)
C. `2 ⏎ 5` — **correct**
D. `0 ⏎ 5` — Ignores the constructor body (`forgetCtor`)

Explanation: A static field belongs to the class: every constructor call and every method that changes it updates one shared value. An instance field is stored separately in each object. The program prints these lines in order: 2, 5.

Trace: `Player p3 = new Player();` → creates Object #1 (Player: score = 0); p3 refers to Object #1; static Player.playerCount: 0 → 1; `Player p5 = new Player();` → creates Object #2 (Player: score = 0); p5 refers to Object #2; static Player.playerCount: 1 → 2; `p3.addPoints(5);` → Object #1.score: 0 → 5; `System.out.println(Player.getPlayerCount());` → prints "2"; `System.out.println(p3.getScore());` → prints "5"

#### static · Beginner · sample 4 — `static.counter`

Complexity score 25; features: several-outputs, static.

```java
class Account {
    private int balance;
    private static int accountsOpened = 0;

    public Account(int start) {
        balance = start;
        accountsOpened++;
    }

    public int getBalance() {
        return balance;
    }

    public void deposit(int amount) {
        balance += amount;
    }

    public static int getAccountsOpened() {
        return accountsOpened;
    }
}

Account backup = new Account(9);
Account savings = new Account(3);
System.out.println(Account.getAccountsOpened());
System.out.println(backup.getBalance());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `1 ⏎ 9` — Thinks each object has its own static field (`staticAsInstance`)
B. `2 ⏎ 3` — Thinks all objects share an instance field (`instanceAsStatic`)
C. `0 ⏎ 0` — Ignores the constructor body (`forgetCtor`)
D. `2 ⏎ 9` — **correct**

Explanation: A static field belongs to the class: every constructor call and every method that changes it updates one shared value. An instance field is stored separately in each object. The program prints these lines in order: 2, 9.

Trace: `Account backup = new Account(9);` → creates Object #1 (Account: balance = 9); backup refers to Object #1; static Account.accountsOpened: 0 → 1; `Account savings = new Account(3);` → creates Object #2 (Account: balance = 3); savings refers to Object #2; static Account.accountsOpened: 1 → 2; `System.out.println(Account.getAccountsOpened());` → prints "2"; `System.out.println(backup.getBalance());` → prints "9"

#### static · Beginner · sample 5 — `static.counter`

Complexity score 30; features: alias, several-outputs, static.

```java
class Counter {
    private int value;
    public static int created = 0;

    public Counter() {
        created++;
    }

    public int getValue() {
        return value;
    }

    public void add(int amount) {
        value += amount;
    }
}

Counter a = new Counter();
Counter d = a;
Counter e = new Counter();
e.add(5);
System.out.println(Counter.created);
System.out.println(a.getValue());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `0 ⏎ 0` — Ignores the constructor body (`forgetCtor`)
B. `2 ⏎ 0` — **correct**
C. `2 ⏎ 5` — Thinks all objects share an instance field (`instanceAsStatic`)
D. `1 ⏎ 0` — Thinks each object has its own static field (`staticAsInstance`)

Explanation: A static field belongs to the class: every constructor call and every method that changes it updates one shared value. An instance field is stored separately in each object. The program prints these lines in order: 2, 0.

Trace: `Counter a = new Counter();` → creates Object #1 (Counter: value = 0); a refers to Object #1; static Counter.created: 0 → 1; `Counter d = a;` → d refers to Object #1 (the same object as a); `Counter e = new Counter();` → creates Object #2 (Counter: value = 0); e refers to Object #2; static Counter.created: 1 → 2; `e.add(5);` → Object #2.value: 0 → 5; `System.out.println(Counter.created);` → prints "2"; `System.out.println(a.getValue());` → prints "0"

### Intermediate

#### static · Intermediate · sample 1 — `static.counter`

Complexity score 52; features: conditional, several-decisions, several-outputs, several-receivers, static, three-objects.

```java
class Ticket {
    private int price;
    public static int issued = 0;

    public Ticket(int start) {
        price = start;
        if (start > 5) {
            issued++;
        }
    }

    public int getPrice() {
        return price;
    }

    public void raise(int dollars) {
        price += dollars;
    }
}

Ticket t1 = new Ticket(4);
Ticket t3 = new Ticket(4);
Ticket t4 = new Ticket(6);
t3.raise(3);
t4.raise(1);
System.out.println(t3.getPrice());
System.out.println(Ticket.issued);
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `3 ⏎ 0` — Ignores the constructor body (`forgetCtor`)
B. `3 ⏎ 1` — Treats += as replacement (`compoundAsReplace`)
C. `10 ⏎ 1` — Thinks all objects share an instance field (`instanceAsStatic`)
D. `7 ⏎ 1` — **correct**

Explanation: A static field belongs to the class: every constructor call and every method that changes it updates one shared value. An instance field is stored separately in each object. The program prints these lines in order: 7, 1.

Trace: `Ticket t1 = new Ticket(4);` → creates Object #1 (Ticket: price = 4); t1 refers to Object #1; `Ticket t3 = new Ticket(4);` → creates Object #2 (Ticket: price = 4); t3 refers to Object #2; `Ticket t4 = new Ticket(6);` → creates Object #3 (Ticket: price = 6); t4 refers to Object #3; static Ticket.issued: 0 → 1; `t3.raise(3);` → Object #2.price: 4 → 7; `t4.raise(1);` → Object #3.price: 6 → 7; `System.out.println(t3.getPrice());` → prints "7"; `System.out.println(Ticket.issued);` → prints "1"

#### static · Intermediate · sample 2 — `static.context`

Complexity score 16; features: static.

```java
class Book {
    private int pagesRead;
    private static int printed = 0;

    public Book(int start) {
        pagesRead = start;
        printed++;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public static int getPrinted() {
        return printed;
    }
}

Book novel = new Book(8);
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**This code is in main, in a different class. Which statement compiles?**

A. `int v = novel.printed;` — Accesses a private member from outside (`privateAccess`)
B. `int v = novel.getPagesRead();` — **correct**
C. `int v = Book.pagesRead;` — Calls an instance member through the class (`staticContext`)
D. `int v = Book.getPagesRead();` — Calls an instance member through the class (`staticContext`)

Explanation: Static members are used through the class name; instance members need an object. Private members are not accessible from another class, and a method of another class must be called through its class or an object. int v = novel.getPagesRead(); is the only choice that achieves the goal.

Trace: `int v = novel.getPagesRead();` → achieves the goal; `int v = Book.getPagesRead();` → does not compile: An instance method or field needs an object; it cannot be used through the class name or from a static method without a receiver.; `int v = novel.printed;` → does not compile: A private member is accessible only inside its own class, so this does not compile from main.; `int v = Book.pagesRead;` → does not compile: A private member is accessible only inside its own class, so this does not compile from main.

#### static · Intermediate · sample 3 — `static.counter`

Complexity score 38; features: several-outputs, static, three-objects.

```java
class Book {
    private int pagesRead;
    private static int printed = 0;

    public Book(int start) {
        pagesRead = start;
        printed++;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public void read(int pages) {
        pagesRead += pages;
    }

    public static int getPrinted() {
        return printed;
    }
}

Book novel = new Book(7);
Book atlas = new Book(7);
Book diary = new Book(8);
atlas.read(5);
System.out.println(novel.getPagesRead());
System.out.println(Book.getPrinted());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `13 ⏎ 3` — Thinks all objects share an instance field (`instanceAsStatic`)
B. `7 ⏎ 3` — **correct**
C. `0 ⏎ 0` — Ignores the constructor body (`forgetCtor`)
D. `7 ⏎ 1` — Thinks each object has its own static field (`staticAsInstance`)

Explanation: A static field belongs to the class: every constructor call and every method that changes it updates one shared value. An instance field is stored separately in each object. The program prints these lines in order: 7, 3.

Trace: `Book novel = new Book(7);` → creates Object #1 (Book: pagesRead = 7); novel refers to Object #1; static Book.printed: 0 → 1; `Book atlas = new Book(7);` → creates Object #2 (Book: pagesRead = 7); atlas refers to Object #2; static Book.printed: 1 → 2; `Book diary = new Book(8);` → creates Object #3 (Book: pagesRead = 8); diary refers to Object #3; static Book.printed: 2 → 3; `atlas.read(5);` → Object #2.pagesRead: 7 → 12; `System.out.println(novel.getPagesRead());` → prints "7"; `System.out.println(Book.getPrinted());` → prints "3"

#### static · Intermediate · sample 4 — `static.counter`

Complexity score 43; features: alias, several-outputs, static, three-objects.

```java
class Plant {
    private int height;
    private static int planted = 0;

    public Plant(int start) {
        height = start;
        planted += start;
    }

    public int getHeight() {
        return height;
    }

    public void grow(int cm) {
        height += cm;
    }

    public static int getPlanted() {
        return planted;
    }

    public void record(int cm) {
        height += cm;
        planted += cm;
    }
}

Plant oak = new Plant(5);
Plant fern = new Plant(3);
Plant ivy = oak;
Plant moss = new Plant(3);
fern.grow(5);
System.out.println(Plant.getPlanted());
System.out.println(moss.getHeight());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `3 ⏎ 3` — Thinks each object has its own static field (`staticAsInstance`)
B. `11 ⏎ 8` — Thinks all objects share an instance field (`instanceAsStatic`)
C. `11 ⏎ 3` — **correct**
D. `0 ⏎ 0` — Ignores the constructor body (`forgetCtor`)

Explanation: A static field belongs to the class: every constructor call and every method that changes it updates one shared value. An instance field is stored separately in each object. The program prints these lines in order: 11, 3.

Trace: `Plant oak = new Plant(5);` → creates Object #1 (Plant: height = 5); oak refers to Object #1; static Plant.planted: 0 → 5; `Plant fern = new Plant(3);` → creates Object #2 (Plant: height = 3); fern refers to Object #2; static Plant.planted: 5 → 8; `Plant ivy = oak;` → ivy refers to Object #1 (the same object as oak); `Plant moss = new Plant(3);` → creates Object #3 (Plant: height = 3); moss refers to Object #3; static Plant.planted: 8 → 11; `fern.grow(5);` → Object #2.height: 3 → 8; `System.out.println(Plant.getPlanted());` → prints "11"; `System.out.println(moss.getHeight());` → prints "3"

#### static · Intermediate · sample 5 — `static.context`

Complexity score 16; features: static.

```java
class Plant {
    private int height;
    private static int planted = 0;

    public Plant(int start) {
        height = start;
        planted++;
    }

    public int getHeight() {
        return height;
    }

    public static int getPlanted() {
        return planted;
    }
}

Plant palm = new Plant(1);
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**This code is in main, in a different class. Which statement compiles?**

A. `int v = Plant.getPlanted();` — **correct**
B. `int v = Plant.height;` — Calls an instance member through the class (`staticContext`)
C. `int v = getPlanted();` — Uses a name that is not declared (`undeclared`)
D. `int v = palm.planted;` — Accesses a private member from outside (`privateAccess`)

Explanation: Static members are used through the class name; instance members need an object. Private members are not accessible from another class, and a method of another class must be called through its class or an object. int v = Plant.getPlanted(); is the only choice that achieves the goal.

Trace: `int v = Plant.height;` → does not compile: A private member is accessible only inside its own class, so this does not compile from main.; `int v = getPlanted();` → does not compile: The name is not declared in this scope, so this does not compile.; `int v = Plant.getPlanted();` → achieves the goal; `int v = palm.planted;` → does not compile: A private member is accessible only inside its own class, so this does not compile from main.

### Advanced

#### static · Advanced · sample 1 — `static.counter`

Complexity score 35; features: conditional, several-outputs, static.

```java
class Ticket {
    private int price;
    public static int issued = 1;

    public Ticket(int start) {
        price = start;
        if (start > 5) {
            issued++;
        }
    }

    public int getPrice() {
        return price;
    }

    public void raise(int dollars) {
        price += dollars;
    }
}

Ticket t1 = new Ticket(6);
Ticket t3 = new Ticket(5);
t3.raise(6);
t3.raise(6);
System.out.println(t1.getPrice());
System.out.println(Ticket.issued);
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `17 ⏎ 2` — Thinks all objects share an instance field (`instanceAsStatic`)
B. `0 ⏎ 1` — Ignores the constructor body (`forgetCtor`)
C. `6 ⏎ 1` — Thinks each object has its own static field (`staticAsInstance`)
D. `6 ⏎ 2` — **correct**

Explanation: A static field belongs to the class: every constructor call and every method that changes it updates one shared value. An instance field is stored separately in each object. The program prints these lines in order: 6, 2.

Trace: `Ticket t1 = new Ticket(6);` → creates Object #1 (Ticket: price = 6); t1 refers to Object #1; static Ticket.issued: 1 → 2; `Ticket t3 = new Ticket(5);` → creates Object #2 (Ticket: price = 5); t3 refers to Object #2; `t3.raise(6);` → Object #2.price: 5 → 11; `t3.raise(6);` → Object #2.price: 11 → 17; `System.out.println(t1.getPrice());` → prints "6"; `System.out.println(Ticket.issued);` → prints "2"

#### static · Advanced · sample 2 — `static.twoclasses`

Complexity score 49; features: multi-static-or-class, several-outputs, static, three-objects.

```java
class Garden {
    private int flowers;
    public static int gardens = 0;

    public Garden(int start) {
        flowers = start;
        gardens++;
    }

    public int getFlowers() {
        return flowers;
    }

    public void plant(int count) {
        flowers += count;
    }
}

class GardenPro {
    private int flowers;
    public static int gardens = 0;

    public GardenPro(int start) {
        flowers = start;
        gardens++;
    }

    public int getFlowers() {
        return flowers;
    }

    public void plant(int count) {
        flowers += count;
    }
}

GardenPro side = new GardenPro(1);
GardenPro patio = new GardenPro(8);
Garden back = new Garden(4);
Garden front = new Garden(1);
side.plant(2);
System.out.println(GardenPro.gardens);
System.out.println(side.getFlowers());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `0 ⏎ 2` — Ignores the constructor body (`forgetCtor`)
B. `1 ⏎ 3` — Thinks each object has its own static field (`staticAsInstance`)
C. `2 ⏎ 10` — Thinks all objects share an instance field (`instanceAsStatic`)
D. `2 ⏎ 3` — **correct**

Explanation: Each class has its own static fields. Objects of one class never change another class's static field, even when the field names match. The program prints these lines in order: 2, 3.

Trace: `GardenPro side = new GardenPro(1);` → creates Object #1 (GardenPro: flowers = 1); side refers to Object #1; static GardenPro.gardens: 0 → 1; `GardenPro patio = new GardenPro(8);` → creates Object #2 (GardenPro: flowers = 8); patio refers to Object #2; static GardenPro.gardens: 1 → 2; `Garden back = new Garden(4);` → creates Object #3 (Garden: flowers = 4); back refers to Object #3; static Garden.gardens: 0 → 1; `Garden front = new Garden(1);` → creates Object #4 (Garden: flowers = 1); front refers to Object #4; static Garden.gardens: 1 → 2; `side.plant(2);` → Object #1.flowers: 1 → 3; `System.out.println(GardenPro.gardens);` → prints "2"; `System.out.println(side.getFlowers());` → prints "3"

#### static · Advanced · sample 3 — `static.counter`

Complexity score 43; features: several-outputs, several-receivers, static, three-objects.

```java
class Book {
    private int pagesRead;
    private static int printed = 0;

    public Book(int start) {
        pagesRead = start;
        printed++;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public void read(int pages) {
        pagesRead += pages;
    }

    public static int getPrinted() {
        return printed;
    }
}

Book novel = new Book(8);
Book atlas = new Book(3);
Book diary = new Book(2);
diary.read(1);
novel.read(6);
System.out.println(Book.getPrinted());
System.out.println(diary.getPagesRead());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `3 ⏎ 9` — Thinks all objects share an instance field (`instanceAsStatic`)
B. `1 ⏎ 3` — Thinks each object has its own static field (`staticAsInstance`)
C. `0 ⏎ 1` — Ignores the constructor body (`forgetCtor`)
D. `3 ⏎ 3` — **correct**

Explanation: A static field belongs to the class: every constructor call and every method that changes it updates one shared value. An instance field is stored separately in each object. The program prints these lines in order: 3, 3.

Trace: `Book novel = new Book(8);` → creates Object #1 (Book: pagesRead = 8); novel refers to Object #1; static Book.printed: 0 → 1; `Book atlas = new Book(3);` → creates Object #2 (Book: pagesRead = 3); atlas refers to Object #2; static Book.printed: 1 → 2; `Book diary = new Book(2);` → creates Object #3 (Book: pagesRead = 2); diary refers to Object #3; static Book.printed: 2 → 3; `diary.read(1);` → Object #3.pagesRead: 2 → 3; `novel.read(6);` → Object #1.pagesRead: 8 → 14; `System.out.println(Book.getPrinted());` → prints "3"; `System.out.println(diary.getPagesRead());` → prints "3"

#### static · Advanced · sample 4 — `static.twoclasses`

Complexity score 49; features: multi-static-or-class, several-outputs, static, three-objects.

```java
class Lamp {
    private int brightness;
    public static int lamps = 0;

    public Lamp(int start) {
        brightness = start;
        lamps++;
    }

    public int getBrightness() {
        return brightness;
    }

    public void brighten(int level) {
        brightness += level;
    }
}

class LampPro {
    private int brightness;
    public static int lamps = 0;

    public LampPro(int start) {
        brightness = start;
        lamps++;
    }

    public int getBrightness() {
        return brightness;
    }

    public void brighten(int level) {
        brightness += level;
    }
}

Lamp porch = new Lamp(1);
Lamp night = new Lamp(5);
Lamp hall = new Lamp(5);
LampPro desk = new LampPro(7);
porch.brighten(2);
System.out.println(hall.getBrightness());
System.out.println(Lamp.lamps);
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `5 ⏎ 1` — Thinks each object has its own static field (`staticAsInstance`)
B. `5 ⏎ 3` — **correct**
C. `7 ⏎ 3` — Thinks all objects share an instance field (`instanceAsStatic`)
D. `0 ⏎ 0` — Ignores the constructor body (`forgetCtor`)

Explanation: Each class has its own static fields. Objects of one class never change another class's static field, even when the field names match. The program prints these lines in order: 5, 3.

Trace: `Lamp porch = new Lamp(1);` → creates Object #1 (Lamp: brightness = 1); porch refers to Object #1; static Lamp.lamps: 0 → 1; `Lamp night = new Lamp(5);` → creates Object #2 (Lamp: brightness = 5); night refers to Object #2; static Lamp.lamps: 1 → 2; `Lamp hall = new Lamp(5);` → creates Object #3 (Lamp: brightness = 5); hall refers to Object #3; static Lamp.lamps: 2 → 3; `LampPro desk = new LampPro(7);` → creates Object #4 (LampPro: brightness = 7); desk refers to Object #4; static LampPro.lamps: 0 → 1; `porch.brighten(2);` → Object #1.brightness: 1 → 3; `System.out.println(hall.getBrightness());` → prints "5"; `System.out.println(Lamp.lamps);` → prints "3"

#### static · Advanced · sample 5 — `static.counter`

Complexity score 39; features: conditional, several-outputs, several-receivers, static.

```java
class Plant {
    private int height;
    private static int planted = 1;

    public Plant(int start) {
        height = start;
        if (start > 5) {
            planted++;
        }
    }

    public int getHeight() {
        return height;
    }

    public void grow(int cm) {
        height += cm;
    }

    public static int getPlanted() {
        return planted;
    }

    public void record(int cm) {
        height += cm;
        planted += cm;
    }
}

Plant oak = new Plant(5);
Plant fern = new Plant(6);
fern.grow(1);
oak.grow(5);
System.out.println(fern.getHeight());
System.out.println(Plant.getPlanted());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `1 ⏎ 1` — Ignores the constructor body (`forgetCtor`)
B. `1 ⏎ 2` — Treats += as replacement (`compoundAsReplace`)
C. `12 ⏎ 2` — Thinks all objects share an instance field (`instanceAsStatic`)
D. `7 ⏎ 2` — **correct**

Explanation: A static field belongs to the class: every constructor call and every method that changes it updates one shared value. An instance field is stored separately in each object. The program prints these lines in order: 7, 2.

Trace: `Plant oak = new Plant(5);` → creates Object #1 (Plant: height = 5); oak refers to Object #1; `Plant fern = new Plant(6);` → creates Object #2 (Plant: height = 6); fern refers to Object #2; static Plant.planted: 1 → 2; `fern.grow(1);` → Object #2.height: 6 → 7; `oak.grow(5);` → Object #1.height: 5 → 10; `System.out.println(fern.getHeight());` → prints "7"; `System.out.println(Plant.getPlanted());` → prints "2"

## toString() and object representation (`tostring`)

### Beginner

#### tostring · Beginner · sample 1 — `tostring.default`

Complexity score 9; features: none.

```java
class Car {
    private int speed;

    public Car(int start) {
        speed = start;
    }

    public int getSpeed() {
        return speed;
    }
}

Car van = new Car(12);
System.out.println("Value: " + van);
```

*The statements after the class run in order inside main.*

**What can you say for certain about what is printed?**

A. `Value: van — the name of the variable` — Thinks the variable name is printed (`printsVarName`)
B. `Value: null — Object has no text for it` — Thinks null is an empty object (`nullIsObject`)
C. `Value: Car@ + a hash code (digits vary)` — **correct**
D. `Value: 12 — the value stored in its field` — Thinks the default toString shows the fields (`hashIsField`)

Explanation: Car does not override toString, so the version inherited from Object is used: the class name, @, and a hexadecimal hash code. The hash code is not predictable, so no exact text can be promised. Answer: Value: Car@ + a hash code (digits vary).

Trace: `Car van = new Car(12);` → creates Object #1 (Car: speed = 12); van refers to Object #1; `System.out.println("Value: " + van);` → prints "Value: Car@<hash>"

#### tostring · Beginner · sample 2 — `tostring.default`

Complexity score 9; features: none.

```java
class Book {
    private int pagesRead;

    public Book(int start) {
        pagesRead = start;
    }

    public int getPagesRead() {
        return pagesRead;
    }
}

Book novel = new Book(12);
System.out.println(novel);
```

*The statements after the class run in order inside main.*

**What can you say for certain about what is printed?**

A. `Book@ + a hash code (digits vary)` — **correct**
B. `novel — the name of the variable` — Thinks the variable name is printed (`printsVarName`)
C. `null — Object has no text for it` — Thinks null is an empty object (`nullIsObject`)
D. `12 — the value stored in its field` — Thinks the default toString shows the fields (`hashIsField`)

Explanation: Book does not override toString, so the version inherited from Object is used: the class name, @, and a hexadecimal hash code. The hash code is not predictable, so no exact text can be promised. Answer: Book@ + a hash code (digits vary).

Trace: `Book novel = new Book(12);` → creates Object #1 (Book: pagesRead = 12); novel refers to Object #1; `System.out.println(novel);` → prints "Book@<hash>"

#### tostring · Beginner · sample 3 — `tostring.print`

Complexity score 17; features: several-outputs.

```java
class Book {
    private int pagesRead;

    public Book(int start) {
        pagesRead = start;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public void read(int pages) {
        pagesRead += pages;
    }

    public String toString() {
        return "Book: " + pagesRead;
    }
}

Book novel = new Book(8);
System.out.println(novel);
novel.read(5);
System.out.println(novel);
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `Book: 8 ⏎ Book: 8` — Thinks toString shows the original state (`toStringAtCreation`)
B. `Book: 8 ⏎ Book: 13` — **correct**
C. `8 ⏎ 13` — Thinks only the field values are printed (`fieldsOnly`)
D. `Book@ + a hash code (digits vary)` — Ignores the toString override (`noOverride`)

Explanation: Printing an object, or joining it to a String with +, calls its toString method at that moment, so the text reflects the current fields. A null reference prints as null, but calling a method on null throws a NullPointerException. The program prints these lines in order: Book: 8, Book: 13.

Trace: `Book novel = new Book(8);` → creates Object #1 (Book: pagesRead = 8); novel refers to Object #1; `System.out.println(novel);` → prints "Book: 8"; `novel.read(5);` → Object #1.pagesRead: 8 → 13; `System.out.println(novel);` → prints "Book: 13"

#### tostring · Beginner · sample 4 — `tostring.default`

Complexity score 13; features: multi-field.

```java
class Lamp {
    private int brightness;
    private String room = "Omar";

    public Lamp(int start) {
        brightness = start;
    }

    public int getBrightness() {
        return brightness;
    }
}

Lamp porch = new Lamp(9);
System.out.println("Item: " + porch);
```

*The statements after the class run in order inside main.*

**What can you say for certain about what is printed?**

A. `Item: Lamp@ + a hash code (digits vary)` — **correct**
B. `Item: porch — the name of the variable` — Thinks the variable name is printed (`printsVarName`)
C. `Item: 9 — the value stored in its field` — Thinks the default toString shows the fields (`hashIsField`)
D. `Item: null — Object has no text for it` — Thinks null is an empty object (`nullIsObject`)

Explanation: Lamp does not override toString, so the version inherited from Object is used: the class name, @, and a hexadecimal hash code. The hash code is not predictable, so no exact text can be promised. Answer: Item: Lamp@ + a hash code (digits vary).

Trace: `Lamp porch = new Lamp(9);` → creates Object #1 (Lamp: brightness = 9, room = "Omar"); porch refers to Object #1; `System.out.println("Item: " + porch);` → prints "Item: Lamp@<hash>"

#### tostring · Beginner · sample 5 — `tostring.print`

Complexity score 12; features: none.

```java
class Plant {
    private int height;

    public Plant(int start) {
        height = start;
    }

    public int getHeight() {
        return height;
    }

    public void grow(int cm) {
        height += cm;
    }

    public String toString() {
        return "Plant: " + height;
    }
}

Plant oak = new Plant(6);
oak.grow(2);
System.out.println(oak.toString());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `8` — Thinks only the field values are printed (`fieldsOnly`)
B. `oak` — Thinks the variable name is printed (`printsVarName`)
C. `Plant: 6` — Misses one of the updates (`lostUpdate`)
D. `Plant: 8` — **correct**

Explanation: Printing an object, or joining it to a String with +, calls its toString method at that moment, so the text reflects the current fields. A null reference prints as null, but calling a method on null throws a NullPointerException. The program prints Plant: 8.

Trace: `Plant oak = new Plant(6);` → creates Object #1 (Plant: height = 6); oak refers to Object #1; `oak.grow(2);` → Object #1.height: 6 → 8; `System.out.println(oak.toString());` → prints "Plant: 8"

### Intermediate

#### tostring · Intermediate · sample 1 — `tostring.print`

Complexity score 23; features: multi-field.

```java
class Ticket {
    private int price;
    private int sold;

    public Ticket(int a, int b) {
        price = a;
        sold = b;
    }

    public int getPrice() {
        return price;
    }

    public void raise(int dollars) {
        price += dollars;
    }

    public String toString() {
        return "Ticket[" + price + "/" + (sold + "]");
    }
}

Ticket t1 = new Ticket(6, 6);
Ticket t3 = new Ticket(6, 5);
t1.raise(4);
System.out.println(t1);
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `10` — Thinks only the field values are printed (`fieldsOnly`)
B. `Ticket[6/6]` — Thinks toString shows the original state (`toStringAtCreation`)
C. `Ticket[10/6]` — **correct**
D. `Ticket@ + a hash code (digits vary)` — Ignores the toString override (`noOverride`)

Explanation: Printing an object, or joining it to a String with +, calls its toString method at that moment, so the text reflects the current fields. A null reference prints as null, but calling a method on null throws a NullPointerException. The program prints Ticket[10/6].

Trace: `Ticket t1 = new Ticket(6, 6);` → creates Object #1 (Ticket: price = 6, sold = 6); t1 refers to Object #1; `Ticket t3 = new Ticket(6, 5);` → creates Object #2 (Ticket: price = 6, sold = 5); t3 refers to Object #2; `t1.raise(4);` → Object #1.price: 6 → 10; `System.out.println(t1);` → prints "Ticket[10/6]"

#### tostring · Intermediate · sample 2 — `tostring.print`

Complexity score 18; features: none.

```java
class Robot {
    private int steps;

    public Robot(int start) {
        steps = start;
    }

    public int getSteps() {
        return steps;
    }

    public void move(int n) {
        steps += n;
    }

    public String toString() {
        return "Robot: " + steps;
    }
}

Robot scout = new Robot(9);
Robot probe = new Robot(8);
scout.move(2);
System.out.println(scout.toString());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `Robot: 9` — Misses one of the updates (`lostUpdate`)
B. `Robot: 11` — **correct**
C. `Robot@ + a hash code (digits vary)` — Ignores the toString override (`noOverride`)
D. `11` — Thinks only the field values are printed (`fieldsOnly`)

Explanation: Printing an object, or joining it to a String with +, calls its toString method at that moment, so the text reflects the current fields. A null reference prints as null, but calling a method on null throws a NullPointerException. The program prints Robot: 11.

Trace: `Robot scout = new Robot(9);` → creates Object #1 (Robot: steps = 9); scout refers to Object #1; `Robot probe = new Robot(8);` → creates Object #2 (Robot: steps = 8); probe refers to Object #2; `scout.move(2);` → Object #1.steps: 9 → 11; `System.out.println(scout.toString());` → prints "Robot: 11"

#### tostring · Intermediate · sample 3 — `tostring.print`

Complexity score 19; features: none.

```java
class Book {
    private int pagesRead;

    public Book(int start) {
        pagesRead = start;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public void read(int pages) {
        pagesRead += pages;
    }

    public String toString() {
        return "Book: " + pagesRead;
    }
}

Book novel = new Book(8);
Book atlas = new Book(7);
novel.read(5);
System.out.println(novel.getPagesRead() + 5 + " " + novel);
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `18 Book: 13` — **correct**
B. `18 novel` — Thinks the variable name is printed (`printsVarName`)
C. `18 Book: 8` — Thinks toString shows the original state (`toStringAtCreation`)
D. `135 Book: 13` — Adds numbers that are being concatenated (`concatGrouping`)

Explanation: Printing an object, or joining it to a String with +, calls its toString method at that moment, so the text reflects the current fields. A null reference prints as null, but calling a method on null throws a NullPointerException. The program prints 18 Book: 13.

Trace: `Book novel = new Book(8);` → creates Object #1 (Book: pagesRead = 8); novel refers to Object #1; `Book atlas = new Book(7);` → creates Object #2 (Book: pagesRead = 7); atlas refers to Object #2; `novel.read(5);` → Object #1.pagesRead: 8 → 13; `System.out.println(novel.getPagesRead() + 5 + " " + novel);` → prints "18 Book: 13"

#### tostring · Intermediate · sample 4 — `tostring.default`

Complexity score 17; features: multi-field, several-outputs.

```java
class Lamp {
    private int brightness;
    private String room = "Omar";

    public Lamp(int start) {
        brightness = start;
    }

    public int getBrightness() {
        return brightness;
    }
}

Lamp porch = new Lamp(9);
System.out.println(porch.getBrightness());
System.out.println("Item: " + porch);
```

*The statements after the class run in order inside main.*

**What can you say for certain about the LAST line printed?**

A. `Item: Lamp@ + a hash code (digits vary)` — **correct**
B. `Item: porch — the name of the variable` — Thinks the variable name is printed (`printsVarName`)
C. `Item: 9 — the value stored in its field` — Thinks the default toString shows the fields (`hashIsField`)
D. `Item: null — Object has no text for it` — Thinks null is an empty object (`nullIsObject`)

Explanation: Lamp does not override toString, so the version inherited from Object is used: the class name, @, and a hexadecimal hash code. The hash code is not predictable, so no exact text can be promised. Answer: Item: Lamp@ + a hash code (digits vary).

Trace: `Lamp porch = new Lamp(9);` → creates Object #1 (Lamp: brightness = 9, room = "Omar"); porch refers to Object #1; `System.out.println(porch.getBrightness());` → prints "9"; `System.out.println("Item: " + porch);` → prints "Item: Lamp@<hash>"

#### tostring · Intermediate · sample 5 — `tostring.default`

Complexity score 17; features: multi-field, several-outputs.

```java
class Garden {
    private int flowers;
    private String plot = "Omar";

    public Garden(int start) {
        flowers = start;
    }

    public int getFlowers() {
        return flowers;
    }
}

Garden front = new Garden(14);
System.out.println(front.getFlowers());
System.out.println(front);
```

*The statements after the class run in order inside main.*

**What can you say for certain about the LAST line printed?**

A. `Garden@ + a hash code (digits vary)` — **correct**
B. `null — Object has no text for it` — Thinks null is an empty object (`nullIsObject`)
C. `front — the name of the variable` — Thinks the variable name is printed (`printsVarName`)
D. `Omar — the text in its String field` — Thinks the default toString shows the fields (`hashIsField`)

Explanation: Garden does not override toString, so the version inherited from Object is used: the class name, @, and a hexadecimal hash code. The hash code is not predictable, so no exact text can be promised. Answer: Garden@ + a hash code (digits vary).

Trace: `Garden front = new Garden(14);` → creates Object #1 (Garden: flowers = 14, plot = "Omar"); front refers to Object #1; `System.out.println(front.getFlowers());` → prints "14"; `System.out.println(front);` → prints "Garden@<hash>"

### Advanced

#### tostring · Advanced · sample 1 — `tostring.print`

Complexity score 32; features: conditional, several-receivers.

```java
class Ticket {
    private int price;

    public Ticket(int start) {
        price = start;
    }

    public int getPrice() {
        return price;
    }

    public void raise(int dollars) {
        price += dollars;
    }

    public String toString() {
        return "Ticket " + price + (price >= 9 ? " (high)" : " (low)");
    }
}

Ticket t1 = new Ticket(5);
Ticket t3 = new Ticket(5);
t1.raise(1);
t3.raise(4);
System.out.println(t1 + " & " + t3);
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `Ticket 5 (low) & Ticket 5 (low)` — Thinks toString shows the original state (`toStringAtCreation`)
B. `Ticket@ + a hash code (digits vary)` — Ignores the toString override (`noOverride`)
C. `Ticket 6 (low) & Ticket 9 (high)` — **correct**
D. `Ticket 6 (low) & Ticket 5 (low)` — Misses one of the updates (`lostUpdate`)

Explanation: Printing an object, or joining it to a String with +, calls its toString method at that moment, so the text reflects the current fields. A null reference prints as null, but calling a method on null throws a NullPointerException. The program prints Ticket 6 (low) & Ticket 9 (high).

Trace: `Ticket t1 = new Ticket(5);` → creates Object #1 (Ticket: price = 5); t1 refers to Object #1; `Ticket t3 = new Ticket(5);` → creates Object #2 (Ticket: price = 5); t3 refers to Object #2; `t1.raise(1);` → Object #1.price: 5 → 6; `t3.raise(4);` → Object #2.price: 5 → 9; `System.out.println(t1 + " & " + t3);` → prints "Ticket 6 (low) & Ticket 9 (high)"

#### tostring · Advanced · sample 2 — `tostring.print`

Complexity score 34; features: alias, exception, null, reassign-after-alias, several-outputs.

```java
class Counter {
    private int value;

    public Counter(int start) {
        value = start;
    }

    public int getValue() {
        return value;
    }

    public void add(int amount) {
        value += amount;
    }

    public String toString() {
        return "Counter: " + value;
    }
}

Counter a = new Counter(4);
Counter e = new Counter(6);
Counter c = null;
c = a;
a = null;
System.out.println(c);
System.out.println(a.toString());
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `Counter@ + a hash code (digits vary)` — Ignores the toString override (`noOverride`)
B. `c ⏎ a` — Thinks the variable name is printed (`printsVarName`)
C. `Counter: 4 ⏎ then a NullPointerException is thrown` — **correct**
D. `Counter: 4 ⏎ null` — Thinks calling a method on null prints null (`nullCallPrintsNull`)

Explanation: Printing an object, or joining it to a String with +, calls its toString method at that moment, so the text reflects the current fields. A null reference prints as null, but calling a method on null throws a NullPointerException. Running the code: Counter: 4
then a NullPointerException is thrown.

Trace: `Counter a = new Counter(4);` → creates Object #1 (Counter: value = 4); a refers to Object #1; `Counter e = new Counter(6);` → creates Object #2 (Counter: value = 6); e refers to Object #2; `Counter c = null;` → c is now null; `c = a;` → c refers to Object #1 (the same object as a); `a = null;` → a is now null; `System.out.println(c);` → prints "Counter: 4"; `System.out.println(a.toString());` → throws a NullPointerException

#### tostring · Advanced · sample 3 — `tostring.print`

Complexity score 28; features: multi-field, several-outputs.

```java
class Book {
    private int pagesRead;
    private int bookmarks;

    public Book(int a, int b) {
        pagesRead = a;
        bookmarks = b;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public void read(int pages) {
        pagesRead += pages;
    }

    public String toString() {
        return "Book[" + pagesRead + ", " + (bookmarks + "]");
    }
}

Book novel = new Book(6, 8);
Book atlas = new Book(7, 7);
System.out.println(novel);
novel.read(5);
System.out.println(novel);
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `Book[6, 8] ⏎ Book[6, 8]` — Thinks toString shows the original state (`toStringAtCreation`)
B. `novel ⏎ novel` — Thinks the variable name is printed (`printsVarName`)
C. `Book@ + a hash code (digits vary)` — Ignores the toString override (`noOverride`)
D. `Book[6, 8] ⏎ Book[11, 8]` — **correct**

Explanation: Printing an object, or joining it to a String with +, calls its toString method at that moment, so the text reflects the current fields. A null reference prints as null, but calling a method on null throws a NullPointerException. The program prints these lines in order: Book[6, 8], Book[11, 8].

Trace: `Book novel = new Book(6, 8);` → creates Object #1 (Book: pagesRead = 6, bookmarks = 8); novel refers to Object #1; `Book atlas = new Book(7, 7);` → creates Object #2 (Book: pagesRead = 7, bookmarks = 7); atlas refers to Object #2; `System.out.println(novel);` → prints "Book[6, 8]"; `novel.read(5);` → Object #1.pagesRead: 6 → 11; `System.out.println(novel);` → prints "Book[11, 8]"

#### tostring · Advanced · sample 4 — `tostring.print`

Complexity score 31; features: alias, null, reassign-after-alias, several-outputs.

```java
class Account {
    private int balance;

    public Account(int start) {
        balance = start;
    }

    public int getBalance() {
        return balance;
    }

    public void deposit(int amount) {
        balance += amount;
    }

    public String toString() {
        return "Account: " + balance;
    }
}

Account backup = new Account(6);
Account savings = new Account(4);
Account travel = null;
travel = backup;
backup = null;
System.out.println(travel);
System.out.println("Now: " + backup);
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `travel ⏎ Now: backup` — Thinks the variable name is printed (`printsVarName`)
B. `Account: 6 ⏎ Now: null` — **correct**
C. `6 ⏎ Now: null` — Thinks only the field values are printed (`fieldsOnly`)
D. `Account: 6 ⏎ then a NullPointerException is thrown` — Thinks printing a null reference throws (`nullPrintThrows`)

Explanation: Printing an object, or joining it to a String with +, calls its toString method at that moment, so the text reflects the current fields. A null reference prints as null, but calling a method on null throws a NullPointerException. The program prints these lines in order: Account: 6, Now: null.

Trace: `Account backup = new Account(6);` → creates Object #1 (Account: balance = 6); backup refers to Object #1; `Account savings = new Account(4);` → creates Object #2 (Account: balance = 4); savings refers to Object #2; `Account travel = null;` → travel is now null; `travel = backup;` → travel refers to Object #1 (the same object as backup); `backup = null;` → backup is now null; `System.out.println(travel);` → prints "Account: 6"; `System.out.println("Now: " + backup);` → prints "Now: null"

#### tostring · Advanced · sample 5 — `tostring.print`

Complexity score 27; features: multi-field, shadowing.

```java
class Car {
    private int speed;
    private String color;

    public Car(String color, int start) {
        this.color = color;
        speed = start;
    }

    public int getSpeed() {
        return speed;
    }

    public void accelerate(int mph) {
        speed += mph;
    }

    public String toString() {
        return color + " (" + (speed + ")");
    }
}

Car car = new Car("gold", 9);
Car taxi = new Car("chess", 7);
car.accelerate(6);
System.out.println(car.getSpeed() + 3 + " " + car);
```

*The statements after the class run in order inside main.*

**What is printed when this code runs?**

A. `153 gold (15)` — Adds numbers that are being concatenated (`concatGrouping`)
B. `18 gold (15)` — **correct**
C. `18 15` — Thinks only the field values are printed (`fieldsOnly`)
D. `18 gold (9)` — Thinks toString shows the original state (`toStringAtCreation`)

Explanation: Printing an object, or joining it to a String with +, calls its toString method at that moment, so the text reflects the current fields. A null reference prints as null, but calling a method on null throws a NullPointerException. The program prints 18 gold (15).

Trace: `Car car = new Car("gold", 9);` → creates Object #1 (Car: speed = 9, color = "gold"); car refers to Object #1; `Car taxi = new Car("chess", 7);` → creates Object #2 (Car: speed = 7, color = "chess"); taxi refers to Object #2; `car.accelerate(6);` → Object #1.speed: 9 → 15; `System.out.println(car.getSpeed() + 3 + " " + car);` → prints "18 gold (15)"

## Reverse reasoning (`reverse`)

### Beginner

#### reverse · Beginner · sample 1 — `reverse.construct`

Complexity score 16; features: trace-each-candidate.

```java
class Plant {
    private int height;

    public Plant(int start) {
        height = start * 4;
    }

    public int getHeight() {
        return height;
    }
}
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**Which statement creates a Plant whose getHeight() returns 28?**

A. `Plant fern = new Plant(24);` — Undoes the constructor's computation incorrectly (`inverseWrong`)
B. `Plant fern = new Plant(28);` — Ignores the constructor body (`forgetCtor`)
C. `Plant fern = new Plant(7);` — **correct**
D. `Plant fern = new Plant(28, 0);` — Calls a constructor that does not exist (`wrongArity`)

Explanation: Run the matching constructor for each choice: compute the field from the argument (including any condition or this(...) call) and compare it with the target. Plant fern = new Plant(7); is the only choice that achieves the goal.

Trace: `Plant fern = new Plant(24);` → does not achieve the goal; `Plant fern = new Plant(28, 0);` → does not compile: No constructor of this class takes two int arguments, so this statement does not compile. The arguments must match one of the declared constructors' parameter lists.; `Plant fern = new Plant(7);` → achieves the goal; `Plant fern = new Plant(28);` → does not achieve the goal

#### reverse · Beginner · sample 2 — `reverse.value`

Complexity score 23; features: conditional, trace-each-candidate.

```java
class Book {
    private int pagesRead;

    public Book(int start) {
        pagesRead = start;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public void setPagesRead(int pages) {
        if (pages >= 0) {
            pagesRead = pages;
        }
    }

    public void read(int pages) {
        pagesRead += pages;
    }
}

Book diary = new Book(5);
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**Which statement, added at the end, makes diary.getPagesRead() return 14?**

A. `diary.setPagesRead(-14);` — Uses a value the method rejects (`rejectedValue`)
B. `Book.setPagesRead(14);` — Calls an instance member through the class (`staticContext`)
C. `diary.setPagesRead(9);` — Mixes up adding and setting (`addVsSet`)
D. `diary.setPagesRead(14);` — **correct**

Explanation: Work out the current state first, then check what each method does with its argument (replace, add, reject, or limit). Private fields cannot be assigned from outside the class. diary.setPagesRead(14); is the only choice that achieves the goal.

Trace: `diary.setPagesRead(14);` → achieves the goal; `Book.setPagesRead(14);` → does not compile: An instance method or field needs an object; it cannot be used through the class name or from a static method without a receiver.; `diary.setPagesRead(9);` → does not achieve the goal; `diary.setPagesRead(-14);` → does not achieve the goal

#### reverse · Beginner · sample 3 — `reverse.value`

Complexity score 18; features: trace-each-candidate.

```java
class Book {
    private int pagesRead;

    public Book(int start) {
        pagesRead = start;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public void setPagesRead(int pages) {
        pagesRead = pages;
    }

    public void read(int pages) {
        pagesRead += pages;
    }
}

Book novel = new Book(8);
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**Which statement, added at the end, makes novel.getPagesRead() return 5?**

A. `novel.read(-3);` — **correct**
B. `novel.pagesRead = 5;` — Accesses a private member from outside (`privateAccess`)
C. `novel.setPagesRead(-5);` — Uses a value the method rejects (`rejectedValue`)
D. `novel.setPagesRead(-3);` — Mixes up adding and setting (`addVsSet`)

Explanation: Work out the current state first, then check what each method does with its argument (replace, add, reject, or limit). Private fields cannot be assigned from outside the class. novel.read(-3); is the only choice that achieves the goal.

Trace: `novel.pagesRead = 5;` → does not compile: A private member is accessible only inside its own class, so this does not compile from main.; `novel.setPagesRead(-5);` → does not achieve the goal; `novel.read(-3);` → achieves the goal; `novel.setPagesRead(-3);` → does not achieve the goal

#### reverse · Beginner · sample 4 — `reverse.construct`

Complexity score 16; features: trace-each-candidate.

```java
class Lamp {
    private int brightness;

    public Lamp(int start) {
        brightness = start * 3;
    }

    public int getBrightness() {
        return brightness;
    }
}
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**Which statement creates a Lamp whose getBrightness() returns 33?**

A. `Lamp night = new Lamp(33, 0);` — Calls a constructor that does not exist (`wrongArity`)
B. `Lamp night = new Lamp(30);` — Undoes the constructor's computation incorrectly (`inverseWrong`)
C. `Lamp night = new Lamp(33);` — Ignores the constructor body (`forgetCtor`)
D. `Lamp night = new Lamp(11);` — **correct**

Explanation: Run the matching constructor for each choice: compute the field from the argument (including any condition or this(...) call) and compare it with the target. Lamp night = new Lamp(11); is the only choice that achieves the goal.

Trace: `Lamp night = new Lamp(11);` → achieves the goal; `Lamp night = new Lamp(33, 0);` → does not compile: No constructor of this class takes two int arguments, so this statement does not compile. The arguments must match one of the declared constructors' parameter lists.; `Lamp night = new Lamp(33);` → does not achieve the goal; `Lamp night = new Lamp(30);` → does not achieve the goal

#### reverse · Beginner · sample 5 — `reverse.construct`

Complexity score 16; features: trace-each-candidate.

```java
class Timer {
    private int seconds;

    public Timer(int start) {
        seconds = start * 2;
    }

    public int getSeconds() {
        return seconds;
    }
}
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**Which statement creates a Timer whose getSeconds() returns 8?**

A. `Timer alarm = new Timer(10);` — Undoes the constructor's computation incorrectly (`inverseWrong`)
B. `Timer alarm = new Timer(8);` — Ignores the constructor body (`forgetCtor`)
C. `Timer alarm = new Timer(8, 0);` — Calls a constructor that does not exist (`wrongArity`)
D. `Timer alarm = new Timer(4);` — **correct**

Explanation: Run the matching constructor for each choice: compute the field from the argument (including any condition or this(...) call) and compare it with the target. Timer alarm = new Timer(4); is the only choice that achieves the goal.

Trace: `Timer alarm = new Timer(4);` → achieves the goal; `Timer alarm = new Timer(8);` → does not achieve the goal; `Timer alarm = new Timer(10);` → does not achieve the goal; `Timer alarm = new Timer(8, 0);` → does not compile: No constructor of this class takes two int arguments, so this statement does not compile. The arguments must match one of the declared constructors' parameter lists.

### Intermediate

#### reverse · Intermediate · sample 1 — `reverse.static`

Complexity score 38; features: static, three-objects, trace-each-candidate.

```java
class Car {
    private int speed;
    public static int carsBuilt = 0;

    public Car(int start) {
        speed = start;
        carsBuilt++;
    }

    public int getSpeed() {
        return speed;
    }

    public void accelerate(int mph) {
        speed += mph;
    }
}

Car van = new Car(5);
Car bus = new Car(6);
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**Which statement, added at the end, makes Car.carsBuilt equal 3?**

A. `van.accelerate(1);` — Thinks each object has its own static field (`staticAsInstance`)
B. `Car truck = van;` — Thinks copying a reference creates an object (`aliasCreates`)
C. `Car truck = new Car(6);` — **correct**
D. `Car truck = null;` — Thinks null is an empty object (`nullIsObject`)

Explanation: Car.carsBuilt is a static counter incremented by the constructor, so it changes only when a new Car is constructed (directly or inside a method). Car truck = new Car(6); is the only choice that achieves the goal.

Trace: `Car truck = new Car(6);` → achieves the goal; `Car truck = null;` → does not achieve the goal; `Car truck = van;` → does not achieve the goal; `van.accelerate(1);` → does not achieve the goal

#### reverse · Intermediate · sample 2 — `reverse.static`

Complexity score 38; features: static, three-objects, trace-each-candidate.

```java
class Garden {
    private int flowers;
    public static int gardens = 0;

    public Garden(int start) {
        flowers = start;
        gardens++;
    }

    public int getFlowers() {
        return flowers;
    }

    public void plant(int count) {
        flowers += count;
    }
}

Garden side = new Garden(4);
Garden back = new Garden(2);
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**Which statement, added at the end, makes Garden.gardens equal 3?**

A. `Garden.gardens += 3;` — Treats += as replacement (`compoundAsReplace`)
B. `side.plant(1);` — Thinks each object has its own static field (`staticAsInstance`)
C. `Garden patio = null;` — Thinks null is an empty object (`nullIsObject`)
D. `Garden patio = new Garden(6);` — **correct**

Explanation: Garden.gardens is a static counter incremented by the constructor, so it changes only when a new Garden is constructed (directly or inside a method). Garden patio = new Garden(6); is the only choice that achieves the goal.

Trace: `side.plant(1);` → does not achieve the goal; `Garden.gardens += 3;` → does not achieve the goal; `Garden patio = null;` → does not achieve the goal; `Garden patio = new Garden(6);` → achieves the goal

#### reverse · Intermediate · sample 3 — `reverse.value`

Complexity score 22; features: none.

```java
class Book {
    private int pagesRead;

    public Book(int start) {
        pagesRead = start;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public void setPagesRead(int pages) {
        pagesRead = pages;
    }

    public void read(int pages) {
        if (pages >= 0) {
            pagesRead += pages;
        }
    }
}

Book novel = new Book(8);
Book atlas = new Book(11);
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**Which statement, added at the end, makes novel.getPagesRead() return 4?**

A. `Book.setPagesRead(4);` — Calls an instance member through the class (`staticContext`)
B. `novel.setPagesRead(-4);` — Uses a value the method rejects (`rejectedValue`)
C. `novel.pagesRead = 4;` — Accesses a private member from outside (`privateAccess`)
D. `novel.setPagesRead(4);` — **correct**

Explanation: Work out the current state first, then check what each method does with its argument (replace, add, reject, or limit). Private fields cannot be assigned from outside the class. novel.setPagesRead(4); is the only choice that achieves the goal.

Trace: `novel.pagesRead = 4;` → does not compile: A private member is accessible only inside its own class, so this does not compile from main.; `Book.setPagesRead(4);` → does not compile: An instance method or field needs an object; it cannot be used through the class name or from a static method without a receiver.; `novel.setPagesRead(-4);` → does not achieve the goal; `novel.setPagesRead(4);` → achieves the goal

#### reverse · Intermediate · sample 4 — `reverse.static`

Complexity score 38; features: static, three-objects, trace-each-candidate.

```java
class Car {
    private int speed;
    public static int carsBuilt = 0;

    public Car(int start) {
        speed = start;
        carsBuilt++;
    }

    public int getSpeed() {
        return speed;
    }

    public void accelerate(int mph) {
        speed += mph;
    }
}

Car car = new Car(9);
Car bus = new Car(8);
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**Which statement, added at the end, makes Car.carsBuilt equal 3?**

A. `Car taxi = new Car(7);` — **correct**
B. `Car.carsBuilt += 3;` — Treats += as replacement (`compoundAsReplace`)
C. `Car taxi = car;` — Thinks copying a reference creates an object (`aliasCreates`)
D. `car.accelerate(1);` — Thinks each object has its own static field (`staticAsInstance`)

Explanation: Car.carsBuilt is a static counter incremented by the constructor, so it changes only when a new Car is constructed (directly or inside a method). Car taxi = new Car(7); is the only choice that achieves the goal.

Trace: `Car.carsBuilt += 3;` → does not achieve the goal; `Car taxi = new Car(7);` → achieves the goal; `car.accelerate(1);` → does not achieve the goal; `Car taxi = car;` → does not achieve the goal

#### reverse · Intermediate · sample 5 — `reverse.value`

Complexity score 31; features: conditional, trace-each-candidate.

```java
class Plant {
    private int height;

    public Plant(int start) {
        height = start;
    }

    public int getHeight() {
        return height;
    }

    public void setHeight(int cm) {
        height = Math.min(20, cm);
    }

    public void grow(int cm) {
        if (cm >= 0) {
            height += cm;
        }
    }
}

Plant oak = new Plant(2);
Plant fern = new Plant(9);
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**Which statement, added at the end, makes oak.getHeight() return 9?**

A. `oak.grow(9);` — Mixes up adding and setting (`addVsSet`)
B. `fern.grow(7);` — Updates the wrong variable or object (`wrongTarget`)
C. `oak.setHeight(-9);` — Uses a value the method rejects (`rejectedValue`)
D. `oak.grow(7);` — **correct**

Explanation: Work out the current state first, then check what each method does with its argument (replace, add, reject, or limit). Private fields cannot be assigned from outside the class. oak.grow(7); is the only choice that achieves the goal.

Trace: `oak.setHeight(-9);` → does not achieve the goal; `fern.grow(7);` → does not achieve the goal; `oak.grow(9);` → does not achieve the goal; `oak.grow(7);` → achieves the goal

### Advanced

#### reverse · Advanced · sample 1 — `reverse.static`

Complexity score 42; features: returns-reference, static, three-objects, trace-each-candidate.

```java
class Car {
    private int speed;
    public static int carsBuilt = 0;

    public Car(int start) {
        speed = start;
        carsBuilt++;
    }

    public int getSpeed() {
        return speed;
    }

    public void accelerate(int mph) {
        speed += mph;
    }

    public Car copy() {
        return new Car(speed);
    }
}

Car van = new Car(5);
Car bus = new Car(6);
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**Which statement, added at the end, makes Car.carsBuilt equal 3?**

A. `van.accelerate(1);` — Thinks each object has its own static field (`staticAsInstance`)
B. `Car truck = van;` — Thinks copying a reference creates an object (`aliasCreates`)
C. `Car truck = van.copy();` — **correct**
D. `Car truck = null;` — Thinks null is an empty object (`nullIsObject`)

Explanation: Car.carsBuilt is a static counter incremented by the constructor, so it changes only when a new Car is constructed (directly or inside a method). Car truck = van.copy(); is the only choice that achieves the goal.

Trace: `Car truck = van.copy();` → achieves the goal; `Car truck = null;` → does not achieve the goal; `Car truck = van;` → does not achieve the goal; `van.accelerate(1);` → does not achieve the goal

#### reverse · Advanced · sample 2 — `reverse.sequence`

Complexity score 28; features: conditional, trace-each-candidate.

```java
class Book {
    private int pagesRead;

    public Book(int start) {
        pagesRead = start;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public void setPagesRead(int pages) {
        if (pages >= 5) {
            pagesRead = pages;
        }
    }

    public void read(int pages) {
        pagesRead += pages;
    }
}

Book novel = new Book(10);
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**Which pair of statements, added at the end, leaves novel.getPagesRead() returning 20?**

A. `novel.setPagesRead(15); novel.read(5);` — **correct**
B. `novel.setPagesRead(-15); novel.read(5);` — Uses a value the method rejects (`rejectedValue`)
C. `novel.read(5); novel.setPagesRead(15);` — Runs statements in the wrong order (`orderSwap`)
D. `novel.setPagesRead(5); novel.setPagesRead(15);` — Mixes up adding and setting (`addVsSet`)

Explanation: Trace each pair in order from the current state; conditions and limits inside the methods depend on the value at the moment of each call. novel.setPagesRead(15); novel.read(5); is the only choice that achieves the goal.

Trace: `novel.setPagesRead(5); novel.setPagesRead(15);` → does not achieve the goal; `novel.setPagesRead(15); novel.read(5);` → achieves the goal; `novel.setPagesRead(-15); novel.read(5);` → does not achieve the goal; `novel.read(5); novel.setPagesRead(15);` → does not achieve the goal

#### reverse · Advanced · sample 3 — `reverse.value`

Complexity score 37; features: conditional, several-receivers, trace-each-candidate.

```java
class Book {
    private int pagesRead;

    public Book(int start) {
        pagesRead = start;
    }

    public int getPagesRead() {
        return pagesRead;
    }

    public void setPagesRead(int pages) {
        if (pages >= 0) {
            pagesRead = pages;
        }
    }

    public void read(int pages) {
        if (pages >= 0) {
            pagesRead += pages;
        }
    }
}

Book novel = new Book(8);
Book atlas = new Book(11);
atlas.read(5);
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**Which statement, added at the end, makes novel.getPagesRead() return 15?**

A. `atlas.setPagesRead(15);` — Updates the wrong variable or object (`wrongTarget`)
B. `novel.pagesRead = 15;` — Accesses a private member from outside (`privateAccess`)
C. `novel.setPagesRead(-15);` — Uses a value the method rejects (`rejectedValue`)
D. `novel.setPagesRead(15);` — **correct**

Explanation: Work out the current state first, then check what each method does with its argument (replace, add, reject, or limit). Private fields cannot be assigned from outside the class. novel.setPagesRead(15); is the only choice that achieves the goal.

Trace: `novel.setPagesRead(-15);` → does not achieve the goal; `atlas.setPagesRead(15);` → does not achieve the goal; `novel.pagesRead = 15;` → does not compile: A private member is accessible only inside its own class, so this does not compile from main.; `novel.setPagesRead(15);` → achieves the goal

#### reverse · Advanced · sample 4 — `reverse.sequence`

Complexity score 30; features: conditional, trace-each-candidate.

```java
class Lamp {
    private int brightness;

    public Lamp(int start) {
        brightness = start;
    }

    public int getBrightness() {
        return brightness;
    }

    public void setBrightness(int level) {
        if (level > brightness) {
            brightness = level;
        }
    }

    public void brighten(int level) {
        brightness = Math.min(25, brightness + level);
    }
}

Lamp porch = new Lamp(3);
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**Which pair of statements, added at the end, leaves porch.getBrightness() returning 16?**

A. `porch.setBrightness(11); porch.brighten(5);` — **correct**
B. `porch.setBrightness(5); porch.setBrightness(11);` — Mixes up adding and setting (`addVsSet`)
C. `porch.setBrightness(-11); porch.brighten(5);` — Uses a value the method rejects (`rejectedValue`)
D. `porch.brighten(5); porch.setBrightness(11);` — Runs statements in the wrong order (`orderSwap`)

Explanation: Trace each pair in order from the current state; conditions and limits inside the methods depend on the value at the moment of each call. porch.setBrightness(11); porch.brighten(5); is the only choice that achieves the goal.

Trace: `porch.setBrightness(11); porch.brighten(5);` → achieves the goal; `porch.setBrightness(-11); porch.brighten(5);` → does not achieve the goal; `porch.brighten(5); porch.setBrightness(11);` → does not achieve the goal; `porch.setBrightness(5); porch.setBrightness(11);` → does not achieve the goal

#### reverse · Advanced · sample 5 — `reverse.value`

Complexity score 37; features: conditional, several-receivers, trace-each-candidate.

```java
class Plant {
    private int height;

    public Plant(int start) {
        height = start;
    }

    public int getHeight() {
        return height;
    }

    public void setHeight(int cm) {
        if (cm > height) {
            height = cm;
        }
    }

    public void grow(int cm) {
        if (cm >= 0) {
            height += cm;
        }
    }
}

Plant oak = new Plant(2);
Plant fern = new Plant(9);
fern.grow(1);
```

*The statements after the class run in order inside main. Each choice would be placed at the end of main.*

**Which statement, added at the end, makes oak.getHeight() return 10?**

A. `Plant.setHeight(10);` — Calls an instance member through the class (`staticContext`)
B. `oak.setHeight(-10);` — Uses a value the method rejects (`rejectedValue`)
C. `oak.setHeight(8);` — Mixes up adding and setting (`addVsSet`)
D. `oak.grow(8);` — **correct**

Explanation: Work out the current state first, then check what each method does with its argument (replace, add, reject, or limit). Private fields cannot be assigned from outside the class. oak.grow(8); is the only choice that achieves the goal.

Trace: `oak.grow(8);` → achieves the goal; `oak.setHeight(8);` → does not achieve the goal; `Plant.setHeight(10);` → does not compile: An instance method or field needs an object; it cannot be used through the class name or from a static method without a receiver.; `oak.setHeight(-10);` → does not achieve the goal
