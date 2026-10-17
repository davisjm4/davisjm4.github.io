/* Documentation Lab — authored challenge bank.
   Each item is hand-written around ONE reasoning target. Families group items
   that exercise the same reasoning; Mixed Practice and focused modes rotate
   across families so consecutive challenges ask for different thinking.

   Java code blocks carry a `java` spec used by the javac test harness:
     kind "method"  – one or more members compiled inside a wrapper class
     kind "class"   – a complete top-level class
     kind "excerpt" – statements compiled inside a wrapper method (shown to
                      students as an "Excerpt", never as a runnable program)
   `fields` / `support` supply declarations the snippet relies on.
   A line containing only  /*?*\/  marks where a proposed comment would go.
*/

const ok = (text, why = "") => ({ text, ok: true, why });
const no = (text, why) => ({ text, ok: false, why });
const omit = (why, isOk = false) => ({ text: "Leave this tag out", omit: true, ok: isOk, why });

/* ======================================================================= */
/* MODE A — Comment Quality Inspector                                      */
/* ======================================================================= */
const INSPECTOR = [
  /* ---------------- family: why — explain a design decision ------------- */
  {
    id: "A-why-backward",
    family: "why",
    kind: "choice",
    question: "One comment will go in the marked spot above the loop. Which comment is most useful to the next programmer?",
    blocks: [
      {
        label: "Method",
        code: `public static void removeExpired(ArrayList<Coupon> coupons, int today) {
    /*?*/
    for (int i = coupons.size() - 1; i >= 0; i--) {
        if (coupons.get(i).getExpirationDay() < today) {
            coupons.remove(i);
        }
    }
}`,
        java: { kind: "method", support: "class Coupon { int getExpirationDay() { return 0; } }" },
      },
    ],
    options: [
      ok("// Go backward: remove(i) shifts later coupons left, and those were already checked."),
      no("// Loop from the last index down to index 0.", "This only restates the loop header. A reader can already see the indexes; the comment never says why the loop runs backward."),
      no("// Remove every coupon from the list.", "Inaccurate. Only coupons whose expiration day is before today are removed."),
      no("// Backward loops are always faster than forward loops when using any ArrayList.", "This claims a speed guarantee the code doesn't show. The real reason is about index shifting after remove, not speed."),
    ],
    explanation: "When remove(i) runs, every element after index i moves one position left. Walking backward means those shifted elements were already examined, so no coupon is skipped. That reason is invisible in the code itself — exactly the kind of “why” a comment should capture.",
  },
  {
    id: "A-why-copy",
    family: "why",
    kind: "choice",
    question: "Which comment, placed at the marked line, best helps someone reading this getter?",
    blocks: [
      {
        label: "Class",
        code: `public class Team {
    private ArrayList<String> roster = new ArrayList<>();

    public ArrayList<String> getRoster() {
        /*?*/
        return new ArrayList<>(roster);
    }
}`,
        java: { kind: "class" },
      },
    ],
    options: [
      ok("// Return a copy so callers can't add or remove this team's players."),
      no("// Return the roster.", "Accurate, but it adds nothing the method name doesn't already say — and it hides the important detail that a copy is returned."),
      no("// Return a copy of the roster sorted by name.", "Inaccurate. new ArrayList<>(roster) keeps the original order; nothing here sorts the names."),
      no("No new comment — the code is self-explanatory.", "A reader may wonder why the method doesn't simply return roster. The reason (protecting the team's own list) is worth one short line."),
    ],
    explanation: "The unusual part of this getter is that it builds a new ArrayList instead of returning the field. The useful comment explains the purpose of that choice: changes a caller makes to the returned list won't affect the team's private roster.",
  },
  {
    id: "A-why-floor",
    family: "why",
    kind: "choice",
    question: "Which comment belongs at the marked line?",
    blocks: [
      {
        label: "Method",
        code: `public void applyPenalty(int points) {
    /*?*/
    score = Math.max(0, score - points);
}`,
        java: { kind: "method", fields: "private int score;" },
      },
    ],
    options: [
      ok("// A score never drops below 0."),
      no("// Set score to the larger of 0 and score - points.", "This translates the code word-for-word. It doesn't tell the reader the rule the code enforces."),
      no("// Returns the new score after the penalty.", "Inaccurate. The method is void — it updates the score field and returns nothing."),
      no("// Penalties larger than the current score are ignored, leaving the score unchanged.", "Inaccurate. A large penalty isn't ignored; it sets the score to 0."),
    ],
    explanation: "Math.max(0, score - points) is a compact way of saying “subtract, but stop at zero.” The short comment states that rule. The long option sounds detailed, but it describes the wrong behavior.",
  },

  /* ---------------- family: pre — state a precondition ------------------ */
  {
    id: "A-pre-average",
    family: "pre",
    kind: "choice",
    question: "A caller will read only the comment above this method. Which comment gives them the most important information?",
    blocks: [
      {
        label: "Method",
        code: `/*?*/
public static double average(int[] scores) {
    int sum = 0;
    for (int s : scores) {
        sum += s;
    }
    return (double) sum / scores.length;
}`,
        java: { kind: "method" },
      },
    ],
    options: [
      ok("// Precondition: scores has at least one element."),
      no("// Returns 0.0 when scores is empty.", "False. For an empty array the method computes 0.0 / 0, which is NaN (not a number), not 0.0."),
      no("// Adds each score to sum, then divides by the length.", "This repeats the code. A caller learns nothing about how to use the method safely."),
      no("// Works correctly for arrays of any length.", "This promises something the code doesn't deliver: an empty array produces NaN."),
    ],
    explanation: "An empty array makes the method divide by zero, producing NaN. The code doesn't guard against it, so a caller needs to know the method expects at least one score. Stating that precondition is the most valuable thing the comment can do.",
    verify: [{ expr: "(double) 0 / new int[0].length", expect: "NaN" }],
  },
  {
    id: "A-pre-initial",
    family: "pre",
    kind: "choice",
    question: "Which comment above this method is most useful for someone who will call it?",
    blocks: [
      {
        label: "Method",
        code: `/*?*/
public static char firstInitial(String name) {
    return name.charAt(0);
}`,
        java: { kind: "method" },
      },
    ],
    options: [
      ok("// name must contain at least one character."),
      no("// Returns a space if name is empty.", "False. charAt(0) on an empty String throws a StringIndexOutOfBoundsException; nothing returns a space."),
      no("// Returns the first letter of the person's last name.", "Nothing splits first and last names. The method returns character 0 of whatever String it receives."),
      no("// Returns name.charAt(0).", "This repeats the code exactly and gives a caller no new information."),
    ],
    explanation: "The method only works if index 0 exists. Calling it with \"\" throws an exception, so the useful comment states the requirement a caller must meet.",
    verify: [{ expr: '"".charAt(0)', expect: "throws StringIndexOutOfBoundsException" }],
  },
  {
    id: "A-pre-newest",
    family: "pre",
    kind: "choice",
    question: "Messages are added to the end of the list as they arrive. Which comment above this method helps a caller most?",
    blocks: [
      {
        label: "Method",
        code: `/*?*/
public String newestMessage() {
    return messages.get(messages.size() - 1);
}`,
        java: { kind: "method", fields: "private ArrayList<String> messages = new ArrayList<>();" },
      },
    ],
    options: [
      ok("// Call only after at least one message has arrived."),
      no("// Returns null when there are no messages.", "False. With an empty list, get(-1) throws an IndexOutOfBoundsException; it does not return null."),
      no("// Removes and returns the newest message.", "Inaccurate. get reads an element without removing it."),
      no("No new comment — the method name explains everything.", "The name explains the purpose, but not that calling it on an empty list fails. That precondition is worth stating."),
    ],
    explanation: "When the list is empty, size() - 1 is -1 and get(-1) throws an exception. The method name can't communicate that requirement; a one-line precondition can.",
    verify: [{ setup: "java.util.ArrayList<String> m = new java.util.ArrayList<>();", expr: "m.get(m.size() - 1)", expect: "throws IndexOutOfBoundsException" }],
  },

  /* ---------------- family: special — explain a special case ------------ */
  {
    id: "A-special-leap",
    family: "special",
    kind: "choice",
    question: "Which comment should go at the marked line, just above the second if statement?",
    blocks: [
      {
        label: "Method",
        code: `public static boolean isLeapYear(int year) {
    if (year % 400 == 0) {
        return true;
    }
    /*?*/
    if (year % 100 == 0) {
        return false;
    }
    return year % 4 == 0;
}`,
        java: { kind: "method" },
      },
    ],
    options: [
      ok("// Other century years, like 1900, are not leap years."),
      no("// Check whether year is divisible by 100.", "This only restates the condition. The reader still doesn't know why century years get special treatment."),
      no("// Years divisible by 100 are always leap years.", "This contradicts the code, which returns false for these years."),
      no("// This check is never reached for a year like 1900.", "False. 1900 % 400 is 300, so 1900 skips the first if and reaches this check."),
    ],
    explanation: "Century years are the exception in the leap-year rule. Years divisible by 400 were already handled above, so the year % 100 check catches the remaining century years (1700, 1800, 1900...) and rejects them. A short comment naming that exception helps far more than restating the condition.",
    verify: [{ expr: "1900 % 400", expect: "300" }],
  },
  {
    id: "A-special-winrate",
    family: "special",
    kind: "choice",
    question: "Which comment best explains the if statement?",
    blocks: [
      {
        label: "Method",
        code: `public static double winRate(int wins, int games) {
    /*?*/
    if (games == 0) {
        return 0.0;
    }
    return (double) wins / games;
}`,
        java: { kind: "method" },
      },
    ],
    options: [
      ok("// A team that hasn't played yet reports 0.0 instead of dividing by zero."),
      no("// Prevents the win rate from becoming negative.", "Wrong reason. With non-negative inputs the rate can't be negative anyway; the check is about games being 0."),
      no("// Returns 0.0 when the team has lost every game.", "Inaccurate. A team with 0 wins in 5 games skips this if; the special case is having played no games."),
      no("// If games equals 0, return 0.0.", "This repeats the code without saying why zero games needs special handling."),
    ],
    explanation: "Without the check, a team with zero games would compute 0.0 / 0, which is NaN. The useful comment names the situation (no games played) and the reason (avoiding division by zero).",
  },
  {
    id: "A-special-plural",
    family: "special",
    kind: "choice",
    question: "Which comment at the marked line explains this special case best?",
    blocks: [
      {
        label: "Method",
        code: `public static String plural(String word, int count) {
    /*?*/
    if (count == 1) {
        return word;
    }
    return word + "s";
}`,
        java: { kind: "method" },
      },
    ],
    options: [
      ok('// Only a count of exactly 1 is singular: "1 file" but "0 files".'),
      no("// Words with only one letter are not made plural.", "This misreads count as the word's length. count is a separate parameter."),
      no("// Only negative counts use the plural form.", "False. Every count except 1 — including 0 and 2 — gets an \"s\"."),
      no("// Check whether count is equal to 1.", "This restates the condition. The interesting fact — that 0 is plural in English — goes unmentioned."),
    ],
    explanation: "The comment earns its place by pointing out the case people forget: zero items is plural. The example makes the rule concrete in a few words.",
  },

  /* ---------------- family: none — sometimes no comment is best --------- */
  {
    id: "A-none-getter",
    family: "none",
    kind: "choice",
    question: "What is the best documentation choice for this method?",
    blocks: [
      {
        label: "Method",
        code: `public String getCourseName() {
    return courseName;
}`,
        java: { kind: "method", fields: "private String courseName;" },
      },
    ],
    options: [
      ok("No new comment — the method name and code already say it."),
      no("// Returns the course name.", "Accurate but redundant: it repeats the method name. Redundant comments add clutter and can drift out of date."),
      no("// Returns the course name in uppercase.", "Inaccurate. The field is returned unchanged."),
      no("// Never returns null.", "Unsupported. If courseName was never assigned, the method returns null; nothing here prevents it."),
    ],
    explanation: "A simple getter with a clear name needs no extra comment. Every option that adds a comment either repeats the obvious or claims something untrue.",
  },
  {
    id: "A-none-isempty",
    family: "none",
    kind: "choice",
    question: "What is the best documentation choice for this method?",
    blocks: [
      {
        label: "Method",
        code: `public boolean isEmpty() {
    return size == 0;
}`,
        java: { kind: "method", fields: "private int size;" },
      },
    ],
    options: [
      ok("No new comment — the name and the one-line body are already clear."),
      no("// Returns true if size equals 0.", "Redundant: it translates the code into words without adding meaning."),
      no("// Returns true if there is room to add more items.", "Inaccurate. The method checks for zero items, not available space."),
      no("// Sets size to 0 and returns true.", "Inaccurate. == compares; it doesn't assign. size is not changed."),
    ],
    explanation: "Good names can make a comment unnecessary. isEmpty() returning size == 0 is already self-documenting, and the other choices are redundant or wrong.",
  },
  {
    id: "A-none-ship",
    family: "none",
    kind: "choice",
    question: "What is the best documentation choice at the marked line?",
    blocks: [
      {
        label: "Excerpt",
        code: `for (Order order : pending) {
    if (order.isPaid()) {
        /*?*/
        ship(order);
    }
}`,
        java: {
          kind: "excerpt",
          before: "void run(ArrayList<Order> pending) {",
          after: "}\nvoid ship(Order o) { }",
          support: "class Order { boolean isPaid() { return true; } }",
        },
      },
    ],
    options: [
      ok("No new comment — the condition and method name already explain it."),
      no("// Ship the order.", "Redundant: the call ship(order) says exactly this."),
      no("// Ship every pending order.", "Inaccurate. Only orders where isPaid() is true are shipped."),
      no("// Paid orders ship in the order they were paid.", "Unsupported. Orders ship in list order; nothing tracks when each was paid."),
    ],
    explanation: "order.isPaid() and ship(order) read almost like a sentence. Adding a comment would only repeat them, and two of the comments are actually misleading.",
  },

  /* ------- family: surprise — behavior a caller might not expect -------- */
  {
    id: "A-surprise-minutes",
    family: "surprise",
    kind: "choice",
    question: "Which comment above this method would help a caller most?",
    blocks: [
      {
        label: "Method",
        code: `/*?*/
public static int toMinutes(int seconds) {
    return seconds / 60;
}`,
        java: { kind: "method" },
      },
    ],
    options: [
      ok("// Drops partial minutes: 119 seconds becomes 1."),
      no("// Rounds to the nearest whole minute.", "False. Integer division truncates: 119 / 60 is 1, not 2."),
      no("// Divides seconds by 60.", "Repeats the code without telling the caller what happens to leftover seconds."),
      no("// Converts minutes to seconds.", "Backward. The method takes seconds and produces minutes."),
    ],
    explanation: "Integer division throws away the remainder. A caller could easily assume rounding, so a short example that shows truncation is the most useful documentation.",
    verify: [{ expr: "119 / 60", expect: "1" }],
  },
  {
    id: "A-surprise-areacode",
    family: "surprise",
    kind: "choice",
    question: "Which comment above this method is most useful?",
    blocks: [
      {
        label: "Method",
        code: `/*?*/
public static String areaCode(String phone) {
    return phone.substring(0, 3);
}`,
        java: { kind: "method" },
      },
    ],
    options: [
      ok('// Assumes phone is digits only, like "7025550198".'),
      no("// Returns the characters at indexes 0 through 3 of phone.", "Inaccurate. substring(0, 3) stops before index 3, so it returns indexes 0, 1, and 2."),
      no('// Works with any phone format, such as "(702) 555-0198".', 'False. For "(702) 555-0198" the method returns "(70".'),
      no("// Calls substring on phone.", "Repeats the code without explaining what kind of input the method needs."),
    ],
    explanation: "The method only works when the area code occupies the first three characters. Documenting that assumption (with an example of valid input) prevents callers from passing formatted numbers that would give wrong results.",
    verify: [
      { expr: '"7025550198".substring(0, 3)', expect: "702" },
      { expr: '"(702) 555-0198".substring(0, 3)', expect: "(70" },
    ],
  },
  {
    id: "A-surprise-percent",
    family: "surprise",
    kind: "choice",
    question: "Which comment above this method best warns a caller about its behavior?",
    blocks: [
      {
        label: "Method",
        code: `/*?*/
public static int percent(int part, int whole) {
    return part * 100 / whole;
}`,
        java: { kind: "method" },
      },
    ],
    options: [
      ok("// Rounds down: 2 out of 3 gives 66, not 67."),
      no("// Rounds to the nearest whole percent.", "False. 200 / 3 is 66 with integer division; rounding would give 67."),
      no("// Returns the fraction as a decimal, such as 0.66.", "Inaccurate. The return type is int, and the value is multiplied by 100."),
      no("// Multiplies part by 100, then divides by whole.", "Restates the expression without telling the caller about the lost remainder."),
    ],
    explanation: "Because all values are ints, part * 100 / whole truncates. An example showing 66 instead of 67 tells the caller exactly what to expect.",
    verify: [{ expr: "2 * 100 / 3", expect: "66" }],
  },

  /* ------- family: expr — explain a non-obvious expression -------------- */
  {
    id: "A-expr-pages",
    family: "expr",
    kind: "choice",
    question: "Which comment best explains this method's expression?",
    blocks: [
      {
        label: "Method",
        code: `public static int pagesNeeded(int results, int perPage) {
    /*?*/
    return (results + perPage - 1) / perPage;
}`,
        java: { kind: "method" },
      },
    ],
    options: [
      ok("// Rounds up so a partly filled last page still counts."),
      no("// Rounds to the nearest whole page.", "Inaccurate. 21 results at 10 per page gives (21 + 9) / 10 = 3 — it rounds up, not to the nearest."),
      no("// Returns the number of completely full pages.", "Inaccurate. That would be results / perPage. Adding perPage - 1 first counts a partial page too."),
      no("// Add perPage - 1 to results, then divide by perPage.", "Restates the arithmetic but not its purpose — the part a reader can't easily see."),
    ],
    explanation: "Adding perPage - 1 before integer division is a common trick for rounding up. Naming the trick's purpose saves every future reader from working it out.",
    verify: [{ expr: "(21 + 10 - 1) / 10", expect: "3" }, { expr: "(20 + 10 - 1) / 10", expect: "2" }],
  },
  {
    id: "A-expr-wrap",
    family: "expr",
    kind: "choice",
    question: "Which comment best explains the marked statement?",
    blocks: [
      {
        label: "Method",
        code: `public void nextTurn() {
    /*?*/
    current = (current + 1) % playerCount;
}`,
        java: { kind: "method", fields: "private int current;\nprivate int playerCount = 4;" },
      },
    ],
    options: [
      ok("// After the last player, wrap back to player 0."),
      no("// Add 1 to current and take the remainder.", "Translates the symbols but not the purpose. Why the remainder? That's what a reader needs."),
      no("// Keeps current from becoming negative.", "Wrong reason. Adding 1 can't make current negative; % here keeps it from passing the last player."),
      no("// Skips ahead to every other player.", "Inaccurate. current increases by 1, so every player gets a turn."),
    ],
    explanation: "With 4 players, current goes 0, 1, 2, 3, then (3 + 1) % 4 = 0. The comment explains that intent — wrapping around — in plain words.",
    verify: [{ expr: "(3 + 1) % 4", expect: "0" }],
  },

  /* ------- family: prune — click the comment that should go -------------- */
  {
    id: "A-prune-late",
    family: "prune",
    kind: "line",
    question: "Click the comment that adds the least value and could be deleted.",
    blocks: [
      {
        label: "Method",
        code: `public static int countLate(int[] arrivals) {
    // Each value is minutes after the bell; negative means early.
    int late = 0;
    for (int m : arrivals) {
        // Up to 5 minutes after the bell still counts as on time.
        if (m > 5) {
            // add one to late
            late++;
        }
    }
    return late;
}`,
        java: { kind: "method" },
      },
    ],
    answer: [6],
    lineWhy: {
      1: "This explains what the numbers in arrivals mean — information the code can't express.",
      4: "This explains the rule behind the number 5, which would otherwise be a mystery.",
    },
    explanation: "“add one to late” just reads late++ aloud. The other two comments explain the data and the business rule, which a reader couldn't learn from the code alone.",
  },
  {
    id: "A-prune-restock",
    family: "prune",
    kind: "line",
    question: "Click the comment that should be removed because it gives the reader nothing useful.",
    blocks: [
      {
        label: "Method",
        code: `public void restock(int amount) {
    if (amount <= 0) {
        // Zero or fewer items is a data-entry mistake; ignore it.
        return;
    }
    // A shelf holds 40 units; anything extra goes to the back room.
    int toShelf = Math.min(amount, 40 - onShelf);
    // Fix this later
    onShelf += toShelf;
    backRoom += amount - toShelf;
}`,
        java: { kind: "method", fields: "private int onShelf;\nprivate int backRoom;" },
      },
    ],
    answer: [7],
    lineWhy: {
      2: "This explains why the method silently ignores some inputs — useful for anyone debugging.",
      5: "This explains the meaning of 40 and why stock is split — not obvious from the code.",
    },
    explanation: "“Fix this later” doesn't say what is wrong or what should change, so no reader can act on it. A vague note like this should be replaced by a specific description or removed.",
  },
  {
    id: "A-prune-promise",
    family: "prune",
    kind: "line",
    question: "Click the comment that promises something the code does not do.",
    blocks: [
      {
        label: "Method",
        code: `public static String initials(String first, String last) {
    // Both names must contain at least one character.
    char a = first.charAt(0);
    char b = last.charAt(0);
    // The initials are always returned in uppercase.
    return "" + a + b;
}`,
        java: { kind: "method" },
      },
    ],
    answer: [4],
    lineWhy: {
      1: "This is an accurate precondition: charAt(0) fails on an empty String.",
    },
    explanation: "Nothing converts a or b to uppercase. initials(\"ana\", \"lee\") returns \"al\". A comment that over-promises is worse than no comment, because callers will trust it.",
    verify: [{ expr: '"" + "ana".charAt(0) + "lee".charAt(0)', expect: "al" }],
  },
];

/* ======================================================================= */
/* MODE B — Comment Editor  (click the faulty line, then choose the repair) */
/* Repair texts are the part of the line after its tag (e.g. after         */
/* "@param minutes "), so the options don't reveal which line is faulty.   */
/* ======================================================================= */
const EDITOR = [
  /* ---------------- family: compare — comparison contradicts code ------- */
  {
    id: "B-compare-alive",
    family: "compare",
    kind: "repair",
    blocks: [
      {
        label: "Method",
        code: `/**
 * Checks whether the player can keep playing.
 * @param lives the number of lives the player has left
 * @return true when the player has more than 10 lives
 */
public boolean isAlive(int lives) {
    return lives > 0;
}`,
        java: { kind: "method" },
      },
    ],
    bad: 3,
    fixes: [
      ok("true when the player has at least one life left"),
      no("true when the player has 0 or more lives", "Still wrong at the boundary: with 0 lives, lives > 0 is false."),
      no("true when the player has more than 1 life", "Still wrong: with exactly 1 life, lives > 0 is true."),
    ],
    explanation: "The code returns lives > 0, which is true for 1, 2, 3, … lives. “At least one life” describes exactly that set. The comment must change; the code is correct.",
  },
  {
    id: "B-compare-password",
    family: "compare",
    kind: "repair",
    blocks: [
      {
        label: "Method",
        code: `/**
 * Decides whether a password is long enough to accept.
 * @param password the password the user typed
 * @return true if password has fewer than 12 characters
 */
public static boolean longEnough(String password) {
    return password.length() >= 12;
}`,
        java: { kind: "method" },
      },
    ],
    bad: 3,
    fixes: [
      ok("true if password has at least 12 characters"),
      no("true if password has more than 12 characters", "Misses the boundary: a 12-character password returns true because of >=."),
      no("the number of characters in password", "The method returns a boolean, not a count."),
    ],
    explanation: "length() >= 12 is true for 12 or more characters. The original comment described the opposite condition.",
  },
  {
    id: "B-compare-overdue",
    family: "compare",
    kind: "repair",
    blocks: [
      {
        label: "Method",
        code: `/**
 * Reports whether a library item came back after its due date.
 * @param daysLate days after the due date; negative if returned early
 * @return true if the item was returned on or before its due date
 */
public static boolean isOverdue(int daysLate) {
    return daysLate > 0;
}`,
        java: { kind: "method" },
      },
    ],
    bad: 3,
    fixes: [
      ok("true if the item was returned after its due date"),
      no("true if the item was returned on or after its due date", "On the due date itself daysLate is 0, and 0 > 0 is false."),
      no("the number of days the item is overdue", "The method returns true or false, not a number of days."),
    ],
    explanation: "daysLate > 0 means strictly after the due date. The original @return described the opposite outcome, and returning on the due date (0) is not overdue.",
  },

  /* ---------------- family: bound — boundary conditions ----------------- */
  {
    id: "B-bound-percent",
    family: "bound",
    kind: "repair",
    blocks: [
      {
        label: "Method",
        code: `/**
 * Checks whether a percentage is valid.
 * @param p the percentage to check
 * @return true if p is between 0 and 100, not including 0 or 100
 */
public static boolean isValidPercent(int p) {
    return p >= 0 && p <= 100;
}`,
        java: { kind: "method" },
      },
    ],
    bad: 3,
    fixes: [
      ok("true if p is from 0 to 100, including both 0 and 100"),
      no("true if p is at least 0", "Incomplete: it leaves out the upper limit, so 150 would seem valid."),
      no("true if p is greater than 0 and less than 100", "Still excludes 0 and 100, but the code accepts both."),
    ],
    explanation: "Both comparisons use = (>= and <=), so the endpoints 0 and 100 are valid. The repaired comment states both limits and includes both endpoints.",
  },
  {
    id: "B-bound-sum",
    family: "bound",
    kind: "repair",
    blocks: [
      {
        label: "Method",
        code: `/**
 * Adds up the values at indexes 1 through end.
 * @param values the values to add
 * @param end the last index to include
 * @return the sum of the selected values
 */
public static int sumThrough(int[] values, int end) {
    int sum = 0;
    for (int i = 0; i <= end; i++) {
        sum += values[i];
    }
    return sum;
}`,
        java: { kind: "method" },
      },
    ],
    bad: 1,
    fixes: [
      ok("Adds up the values at indexes 0 through end, including end."),
      no("Adds up the values at indexes 0 through end - 1.", "The loop uses i <= end, so index end is included."),
      no("Adds up the first end values.", "The first end values are indexes 0 to end - 1. This loop adds one more value."),
    ],
    explanation: "The loop starts at 0 and runs while i <= end, so it visits end + 1 values: indexes 0, 1, …, end. Only the description line was wrong; @param end already says end is included.",
  },
  {
    id: "B-bound-basename",
    family: "bound",
    kind: "repair",
    blocks: [
      {
        label: "Method",
        code: `/**
 * Returns the first part of a file name.
 * @param fileName a name such as "notes.txt" that contains a period
 * @return the characters of fileName up to and including the first period
 */
public static String baseName(String fileName) {
    return fileName.substring(0, fileName.indexOf("."));
}`,
        java: { kind: "method" },
      },
    ],
    bad: 3,
    fixes: [
      ok("the characters of fileName before the first period"),
      no("the characters of fileName before the last period", 'indexOf finds the first period. For "a.b.txt" the result is "a", not "a.b".'),
      no("the characters of fileName after the first period", "substring(0, …) starts at index 0, so the result comes before the period."),
    ],
    explanation: 'substring\'s end index is exclusive, so substring(0, indexOf(".")) stops just before the period. For "notes.txt" the result is "notes".',
    verify: [
      { expr: '"notes.txt".substring(0, "notes.txt".indexOf("."))', expect: "notes" },
      { expr: '"a.b.txt".substring(0, "a.b.txt".indexOf("."))', expect: "a" },
    ],
  },

  /* ---------------- family: param — misleading @param ------------------- */
  {
    id: "B-param-ride",
    family: "param",
    kind: "repair",
    blocks: [
      {
        label: "Method",
        code: `/**
 * Calculates the cost of a scooter ride.
 * @param minutes the total cost of the ride
 * @param ratePerMinute the price charged for each minute, in cents
 * @return the cost of the ride, in cents
 */
public static int rideCost(int minutes, int ratePerMinute) {
    return minutes * ratePerMinute;
}`,
        java: { kind: "method" },
      },
    ],
    bad: 2,
    fixes: [
      ok("the length of the ride, in minutes"),
      no("the number of rides taken", "Multiplying rides by a per-minute rate doesn't produce a ride's cost."),
      no("the price charged for each minute, in cents", "That describes ratePerMinute. Two parameters can't mean the same thing."),
    ],
    explanation: "minutes is multiplied by the per-minute rate, so it must be the ride's length. The total cost is what the method returns — not something the caller passes in.",
  },
  {
    id: "B-param-move",
    family: "param",
    kind: "repair",
    blocks: [
      {
        label: "Method",
        code: `/**
 * Moves a song to a new position in the playlist.
 * @param songs the playlist
 * @param from the index where the song should end up
 * @param to the index where the song should end up
 */
public static void moveSong(ArrayList<String> songs, int from, int to) {
    String song = songs.remove(from);
    songs.add(to, song);
}`,
        java: { kind: "method" },
      },
    ],
    bad: 3,
    fixes: [
      ok("the current index of the song to move"),
      no("the number of positions to move the song", "from is passed to remove(from), which uses it as an index, not a distance."),
      no("the title of the song to move", "from is an int and is used as an index into the list."),
    ],
    explanation: "songs.remove(from) takes the song out of position from, so from is where the song is now. The @param to line was already correct.",
  },
  {
    id: "B-param-tip",
    family: "param",
    kind: "repair",
    blocks: [
      {
        label: "Method",
        code: `/**
 * Calculates the tip for a restaurant bill.
 * @param bill the amount of the bill, in dollars
 * @param rate the tip amount to add, in dollars
 * @return the tip, in dollars
 */
public static double tip(double bill, double rate) {
    return bill * rate;
}`,
        java: { kind: "method" },
      },
    ],
    bad: 3,
    fixes: [
      ok("the tip rate as a decimal, such as 0.15 for 15%"),
      no("the tip rate as a percent, such as 15 for 15%", "With 15, a $40 bill would produce a $600 tip. The code expects a decimal fraction."),
      no("the total amount to pay, including the tip", "rate is multiplied by the bill; a total would make the result meaningless."),
    ],
    explanation: "The tip is bill * rate, so rate must be a fraction like 0.15. A caller following the original comment would pass a dollar amount and get nonsense.",
  },

  /* ---------------- family: ret — incorrect @return --------------------- */
  {
    id: "B-ret-seat",
    family: "ret",
    kind: "repair",
    blocks: [
      {
        label: "Method",
        code: `/**
 * Finds where a seat label appears in a row.
 * @param row the seat labels, in order
 * @param label the seat label to look for
 * @return the label that was found
 */
public static int findSeat(String[] row, String label) {
    for (int i = 0; i < row.length; i++) {
        if (row[i].equals(label)) {
            return i;
        }
    }
    return -1;
}`,
        java: { kind: "method" },
      },
    ],
    bad: 4,
    fixes: [
      ok("the index of the first matching label, or -1 if label is not in row"),
      no("the index of label in row", "Incomplete: it doesn't tell callers that -1 means “not found.”"),
      no("the index of the last matching label, or -1 if label is not in row", "The loop returns as soon as it finds a match, so the first match wins."),
    ],
    explanation: "The method returns an index (an int), not the label. It stops at the first match and returns -1 when nothing matches — both facts a caller needs.",
  },
  {
    id: "B-ret-waitlist",
    family: "ret",
    kind: "repair",
    blocks: [
      {
        label: "Method",
        code: `/**
 * Removes a student from the waitlist.
 * @param waitlist the students waiting, in order
 * @param name the student to remove
 * @return the number of students still waiting
 */
public static boolean leave(ArrayList<String> waitlist, String name) {
    return waitlist.remove(name);
}`,
        java: { kind: "method" },
      },
    ],
    bad: 4,
    fixes: [
      ok("true if name was on the waitlist and was removed"),
      no("the student who was removed", "The method's return type is boolean, so it can't return a String."),
      no("true if the waitlist is now empty", "remove(Object) reports whether the element was found, not whether the list is empty."),
    ],
    explanation: "ArrayList's remove(Object) returns true if the list contained the element. The method passes that boolean straight back, so @return should describe it.",
    docs: ["ArrayList.remove(Object)"],
  },
  {
    id: "B-ret-reaction",
    family: "ret",
    kind: "repair",
    blocks: [
      {
        label: "Method",
        code: `/**
 * Rates a reaction time from a reflex test.
 * @param ms the reaction time, in milliseconds
 * @return "fast" for times of 250 ms or less; otherwise "slow"
 */
public static String rate(int ms) {
    if (ms < 250) {
        return "fast";
    }
    return "slow";
}`,
        java: { kind: "method" },
      },
    ],
    bad: 3,
    fixes: [
      ok('"fast" for times under 250 ms; otherwise "slow"'),
      no('"slow" for times under 250 ms; otherwise "fast"', "Reversed: a small reaction time returns \"fast\"."),
      no("true for times under 250 ms; otherwise false", "The return type is String; the method returns words, not booleans."),
    ],
    explanation: "ms < 250 excludes 250 itself: rate(250) returns \"slow\". The repaired comment uses “under 250” to match the strict comparison.",
  },

  /* ---------------- family: old — outdated documentation --------------- */
  {
    id: "B-old-points",
    family: "old",
    kind: "repair",
    blocks: [
      {
        label: "Method",
        code: `/**
 * Prints the total number of points earned.
 * @param points the points earned in each round
 * @return the total of all values in points
 */
public static int totalPoints(int[] points) {
    int total = 0;
    for (int p : points) {
        total += p;
    }
    return total;
}`,
        java: { kind: "method" },
      },
    ],
    bad: 1,
    fixes: [
      ok("Calculates the total number of points earned."),
      no("Prints and returns the total number of points earned.", "There is no print statement; the method only returns the total."),
      no("Returns the highest number of points earned in one round.", "The loop adds every value; it doesn't track a maximum."),
    ],
    explanation: "This description probably survived from an older version that printed the total. The current method returns it and prints nothing. The @return line was already correct.",
  },
  {
    id: "B-old-task",
    family: "old",
    kind: "repair",
    blocks: [
      {
        label: "Method",
        code: `/**
 * Adds a new task to the front of the to-do list.
 * @param tasks the to-do list
 * @param task the task to add
 */
public static void addTask(ArrayList<String> tasks, String task) {
    tasks.add(task);
}`,
        java: { kind: "method" },
      },
    ],
    bad: 1,
    fixes: [
      ok("Adds a new task to the end of the to-do list."),
      no("Adds a new task to the front of the list and shifts the others right.", "That would be tasks.add(0, task). The one-argument add appends."),
      no("Replaces the first task in the to-do list.", "Replacing would use set. add(E) never removes or replaces anything."),
    ],
    explanation: "ArrayList's one-argument add(E) appends to the end. The comment described a different (perhaps earlier) version of the method.",
    docs: ["ArrayList.add(E)"],
  },
  {
    id: "B-old-username",
    family: "old",
    kind: "repair",
    blocks: [
      {
        label: "Method",
        code: `/**
 * Builds a username from a person's name.
 * @param first the person's first name
 * @param last the person's last name
 * @param year the graduation year to add at the end
 * @return the first letter of first followed by last, in lowercase
 */
public static String username(String first, String last) {
    return (first.charAt(0) + last).toLowerCase();
}`,
        java: { kind: "method" },
      },
    ],
    bad: 4,
    fixes: [
      { del: true, ok: true, text: "Delete this line", why: "" },
      no("the year the account was created", "The method has no year parameter at all, so any description of one is wrong."),
      no("the graduation year; it may be left out", "Java methods can't skip declared parameters, and this method doesn't declare year."),
    ],
    explanation: "The signature has only first and last. The @param year line documents a parameter that no longer exists, so it should be deleted rather than reworded.",
    verify: [{ expr: '("Ana".charAt(0) + "Reyes").toLowerCase()', expect: "areyes" }],
  },

  /* ---------------- family: red — unnecessary comment ------------------- */
  {
    id: "B-red-fee",
    family: "red",
    kind: "repair",
    blocks: [
      {
        label: "Method",
        code: `// Late fees are in cents.
public static int lateFee(int daysLate) {
    // The first 2 days late are a free grace period.
    if (daysLate <= 2) {
        return 0;
    }
    // subtract 2 from daysLate and multiply by 25
    return (daysLate - 2) * 25;
}`,
        java: { kind: "method" },
      },
    ],
    bad: 6,
    fixes: [
      { del: true, ok: true, text: "Delete this line", why: "" },
      no("return (daysLate - 2) times 25", "Still just reads the code aloud."),
      no("charge 25 cents for every day late", "Inaccurate: the first 2 days are free, so they aren't charged."),
    ],
    explanation: "The redundant comment restates the arithmetic. The other two comments explain units and the grace period — information the code can't express.",
  },
  {
    id: "B-red-student",
    family: "red",
    kind: "repair",
    blocks: [
      {
        label: "Method",
        code: `public void addStudent(String name) {
    // Stored in lowercase so lookups ignore capitalization.
    String key = name.toLowerCase();
    // check if key is not in students
    if (!students.contains(key)) {
        // Each student appears only once.
        students.add(key);
    }
}`,
        java: { kind: "method", fields: "private ArrayList<String> students = new ArrayList<>();" },
      },
    ],
    bad: 3,
    fixes: [
      { del: true, ok: true, text: "Delete this line", why: "" },
      no("check whether key is in students", "Still a word-for-word restatement — and it drops the “not.”"),
      no("add the name with its original capitalization", "Inaccurate: key is the lowercase version."),
    ],
    explanation: "!students.contains(key) already reads clearly. The other comments explain why names are lowercased and why duplicates are skipped — keep those.",
  },

  /* ---------------- family: throws — exception documentation ----------- */
  {
    id: "B-throws-orders",
    family: "throws",
    kind: "repair",
    blocks: [
      {
        label: "Method",
        code: `/**
 * Removes and returns the next order to prepare.
 * @return the order that was removed
 * @throws IllegalStateException if the queue is full
 */
public String nextOrder() {
    if (orders.isEmpty()) {
        throw new IllegalStateException("No orders waiting");
    }
    return orders.remove(0);
}`,
        java: { kind: "method", fields: "private ArrayList<String> orders = new ArrayList<>();" },
      },
    ],
    bad: 3,
    fixes: [
      ok("IllegalStateException if there are no orders waiting"),
      no("IndexOutOfBoundsException if there are no orders waiting", "The if statement throws before remove(0) runs, so callers see IllegalStateException."),
      no("IllegalStateException if the order cannot be prepared", "Too vague: the only trigger is an empty list of orders."),
    ],
    explanation: "The exception is thrown when orders.isEmpty() is true. Callers need to know the exact type and the exact condition so they can avoid or handle it.",
  },
  {
    id: "B-throws-volume",
    family: "throws",
    kind: "repair",
    blocks: [
      {
        label: "Method",
        code: `/**
 * Sets the volume level.
 * @param level the new volume, from 0 to 10
 * @throws IllegalArgumentException if level is greater than 10
 */
public void setVolume(int level) {
    if (level < 0 || level > 10) {
        throw new IllegalArgumentException("level must be 0-10");
    }
    volume = level;
}`,
        java: { kind: "method", fields: "private int volume;" },
      },
    ],
    bad: 3,
    fixes: [
      ok("IllegalArgumentException if level is less than 0 or greater than 10"),
      no("IllegalArgumentException if level is from 0 to 10", "Reversed: values from 0 to 10 are the ones accepted."),
      no("IndexOutOfBoundsException if level is less than 0 or greater than 10", "Right condition, wrong exception type."),
    ],
    explanation: "The condition has two parts joined by ||. The original @throws mentioned only the upper limit, so a caller wouldn't know negative values also fail.",
  },
  {
    id: "B-throws-never",
    family: "throws",
    kind: "repair",
    blocks: [
      {
        label: "Method",
        code: `/**
 * Returns the item at a position, or null if there is no such position.
 * @param items the list to read from
 * @param index the position to read
 * @return the item at index, or null if index is out of range
 * @throws IndexOutOfBoundsException if index is negative
 */
public static String itemAt(ArrayList<String> items, int index) {
    if (index < 0 || index >= items.size()) {
        return null;
    }
    return items.get(index);
}`,
        java: { kind: "method" },
      },
    ],
    bad: 5,
    fixes: [
      { del: true, ok: true, text: "Delete this line", why: "" },
      no("IndexOutOfBoundsException if index is too large", "Large indexes also return null; get is only called with valid indexes."),
      no("NullPointerException if index is out of range", "Returning null is not the same as throwing. The method returns null without any exception."),
    ],
    explanation: "The guard returns null for every invalid index before get is called, so the method never throws IndexOutOfBoundsException. Documenting an exception that can't happen misleads callers.",
  },
];


/* ======================================================================= */
/* MODE C — Javadoc Builder                                                */
/* Every challenge shows the same four kinds of rows (description, @param, */
/* @return, @throws). Students decide which tags belong AND what each one */
/* must say. Decoy rows (e.g. @return on a void method, @param for a field)*/
/* make "leave it out" a real decision rather than a giveaway.             */
/* ======================================================================= */
const BUILDER = [
  {
    id: "C-calc-boxes",
    family: "calc",
    kind: "build",
    blocks: [{ label: "Method", code: `public static int boxesNeeded(int items, int perBox) {
    return (items + perBox - 1) / perBox;
}`, java: { kind: "method" } }],
    slots: [
      { tag: "desc", options: [
        ok("Calculates how many boxes are needed for all the items, rounding up."),
        no("Calculates how many boxes can be completely filled, ignoring leftover items.", "That would be items / perBox. Adding perBox - 1 first makes a partial box count too."),
        no("Calculates how many items fit in each box.", "perBox is given; the method computes a number of boxes."),
      ] },
      { tag: "param", name: "items", options: [
        ok("the number of items to pack"),
        no("the number of boxes available", "items is divided (after adjusting) by perBox to get boxes, so it counts items, not boxes."),
        no("the number of items that fit in one box", "That is perBox's job."),
      ] },
      { tag: "param", name: "perBox", options: [
        ok("the most items one box can hold; must be positive"),
        no("the number of boxes to fill, which must be positive", "Dividing by perBox converts items into boxes, so perBox is a capacity per box."),
        no("the number of items left over after packing", "Leftovers aren't an input; the method doesn't compute them."),
      ] },
      { tag: "return", options: [
        ok("the number of boxes needed"),
        no("the number of items in the last box", "The expression produces a count of boxes, not items."),
        omit("The method returns an int; callers need @return to know what it means."),
      ] },
      { tag: "throws", options: [
        omit("Correct: there's no throw statement, and the positive-perBox requirement is already stated in @param.", true),
        no("IllegalArgumentException if items is negative", "Nothing checks items, so this exception is never thrown."),
        no("ArithmeticException if items is 0", "items = 0 works: (0 + perBox - 1) / perBox is 0."),
      ] },
    ],
    explanation: "Adding perBox - 1 before integer division rounds up, so 21 items at 10 per box needs 3 boxes. The @param lines must describe each value's role in that calculation, not just echo the names.",
    verify: [{ expr: "(21 + 10 - 1) / 10", expect: "3" }, { expr: "(0 + 10 - 1) / 10", expect: "0" }],
  },
  {
    id: "C-calc-shipping",
    family: "calc",
    kind: "build",
    blocks: [{ label: "Method", code: `public static double shippingCost(double weight, boolean express) {
    double cost = 4.0 + 0.5 * weight;
    if (express) {
        cost = cost * 2;
    }
    return cost;
}`, java: { kind: "method" } }],
    slots: [
      { tag: "desc", options: [
        ok("Calculates the cost to ship a package; express shipping costs twice as much."),
        no("Calculates the cost to ship a package; express shipping adds 2.0 to the cost.", "cost * 2 doubles the cost; it doesn't add 2."),
        no("Calculates the weight of a package after packing materials are added.", "The method computes a cost from the weight; weight is an input."),
      ] },
      { tag: "param", name: "weight", options: [
        ok("the weight of the package"),
        no("the shipping cost per unit of weight, added to the base cost", "The per-unit rate is the constant 0.5. weight is what that rate multiplies."),
        no("the number of packages being shipped", "weight is multiplied by 0.5 as one package's weight; there is no package count."),
      ] },
      { tag: "param", name: "express", options: [
        ok("true to use express shipping, which doubles the cost"),
        no("true if the package is over the weight limit and needs special handling", "The code doesn't compare weight to any limit; express only controls doubling."),
        no("the extra charge for express shipping", "express is a boolean, not an amount."),
      ] },
      { tag: "return", options: [
        ok("the total shipping cost, including any express charge"),
        no("the shipping cost before the express charge is applied", "cost is doubled before it's returned when express is true."),
        no("true if the package can be shipped", "The return type is double."),
      ] },
      { tag: "throws", options: [
        omit("Correct: nothing in this method throws an exception.", true),
        no("IllegalArgumentException if weight is negative", "No check exists; a negative weight just produces a smaller cost."),
        no("ArithmeticException if weight is 0", "A weight of 0 gives a cost of 4.0. Nothing divides."),
      ] },
    ],
    explanation: "Each tag should explain how a value affects the result: weight scales the cost, express doubles it, and the return value already includes that doubling.",
  },
  {
    id: "C-bool-borrow",
    family: "bool",
    kind: "build",
    blocks: [{ label: "Class excerpt", code: `public class Patron {
    private int limit;

    public boolean canBorrow(int itemsOut) {
        return itemsOut < limit;
    }
}`, java: { kind: "class" } }],
    question: "Build the Javadoc for canBorrow.",
    slots: [
      { tag: "desc", options: [
        ok("Determines whether this patron may borrow one more item."),
        no("Determines how many more items this patron may borrow.", "The method returns a boolean, not a count."),
        no("Changes this patron's borrowing limit.", "The method only reads limit; nothing is assigned."),
      ] },
      { tag: "param", name: "itemsOut", options: [
        ok("the number of items the patron currently has checked out"),
        no("the most items this patron is allowed to have at once", "The limit is the field limit. itemsOut is compared against it."),
        no("the number of copies still on the library's shelf", "The comparison is with the patron's limit, so itemsOut is about the patron."),
      ] },
      { tag: "param", name: "limit", options: [
        omit("Correct: limit is a field. @param documents only the parameters in the method's signature.", true),
        no("the most items a patron may have checked out at once", "This describes the field well, but @param is only for parameters, and limit isn't one."),
        no("the number of items the patron wants to borrow", "limit isn't a parameter, and it isn't a request amount either."),
      ] },
      { tag: "return", options: [
        ok("true if the patron has fewer than limit items checked out"),
        no("true if the patron has limit or fewer items checked out", "itemsOut < limit is false when itemsOut equals limit."),
        no("the number of items the patron may still borrow", "The return type is boolean."),
      ] },
      { tag: "throws", options: [
        omit("Correct: reaching the limit makes the method return false; nothing is thrown.", true),
        no("IllegalStateException if the patron has reached the limit", "At the limit the method returns false. There's no throw statement."),
        no("IllegalArgumentException if itemsOut is negative", "Nothing checks for negative values."),
      ] },
    ],
    explanation: "The comparison is strict (<), so a patron exactly at the limit can't borrow more. Notice limit is a field — it's important to the behavior, but it doesn't get a @param tag.",
  },
  {
    id: "C-effect-tag",
    family: "effect",
    kind: "build",
    blocks: [{ label: "Method", code: `public void addTag(String tag) {
    if (!tags.contains(tag)) {
        tags.add(tag);
    }
}`, java: { kind: "method", fields: "private ArrayList<String> tags = new ArrayList<>();" } }],
    slots: [
      { tag: "desc", options: [
        ok("Adds tag to this post's tags unless it is already there."),
        no("Adds tag to this post's tags, even if it is already there.", "The contains check prevents duplicates."),
        no("Reports whether tag is one of this post's tags.", "The method changes the list and returns nothing."),
      ] },
      { tag: "param", name: "tag", options: [
        ok("the tag to add"),
        no("the list of tags for this post", "That's the field tags. The parameter is one String."),
        no("the index at which to add the tag", "tag is a String and is passed to add as the element."),
      ] },
      { tag: "return", options: [
        omit("Correct: the method is void, so there is no return value to describe.", true),
        no("true if the tag was added", "That might be a useful design, but this method is void and returns nothing."),
        no("the updated list of tags", "The method is void; the list is changed in place, not returned."),
      ] },
      { tag: "throws", options: [
        omit("Correct: a duplicate tag is skipped quietly; nothing is thrown.", true),
        no("IllegalArgumentException if tag is already present", "Duplicates are skipped by the if statement, not rejected with an exception."),
        no("IndexOutOfBoundsException if the list is full", "ArrayList grows as needed; add(E) doesn't fail when the list is “full.”"),
      ] },
    ],
    explanation: "A void method documents its effect in the description (what changes, and when). There is no @return, and @throws is only for exceptions the method can actually throw.",
  },
  {
    id: "C-effect-double",
    family: "effect",
    kind: "build",
    blocks: [{ label: "Method", code: `public static void doubleAll(int[] values) {
    for (int i = 0; i < values.length; i++) {
        values[i] = values[i] * 2;
    }
}`, java: { kind: "method" } }],
    slots: [
      { tag: "desc", options: [
        ok("Doubles every element of values, changing the array that was passed in."),
        no("Creates a new array with every element doubled, leaving values unchanged.", "No new array is created; values[i] is assigned directly, so the caller's array changes."),
        no("Doubles the length of the values array.", "An array's length can't change; the elements are what change."),
      ] },
      { tag: "param", name: "values", options: [
        ok("the array to update; its elements are doubled"),
        no("a copy of the array, so the original is not affected", "The method receives a reference to the caller's array, so the original is affected."),
        no("the number of values to double", "values is an int[], not a count."),
      ] },
      { tag: "return", options: [
        omit("Correct: the method is void. Its effect is the change to the array.", true),
        no("the array with every element doubled", "Nothing is returned; the caller sees the change through its own array reference."),
        no("true if every element was doubled", "The method is void."),
      ] },
      { tag: "throws", options: [
        omit("Correct: the loop stays within valid indexes, even for an empty array.", true),
        no("ArrayIndexOutOfBoundsException if values is empty", "With length 0, the loop condition is false immediately; no element is accessed."),
        no("IllegalArgumentException if values contains a negative number", "Negative numbers are doubled like any other value."),
      ] },
    ],
    explanation: "Arrays are passed by reference, so this method's whole purpose is a side effect on the caller's array. Good documentation says so plainly; a reader shouldn't have to infer it.",
  },
  {
    id: "C-fields-rating",
    family: "fields",
    kind: "build",
    blocks: [{ label: "Class excerpt", code: `public class Product {
    private int ratingTotal;
    private int ratingCount;

    public double averageRating() {
        if (ratingCount == 0) {
            return 0.0;
        }
        return (double) ratingTotal / ratingCount;
    }
}`, java: { kind: "class" } }],
    question: "Build the Javadoc for averageRating.",
    slots: [
      { tag: "desc", options: [
        ok("Calculates the average of all ratings this product has received."),
        no("Adds a new rating and returns the updated average.", "The method only reads the fields; it changes nothing."),
        no("Calculates the total of all ratings this product has received.", "ratingTotal is divided by ratingCount — that's an average."),
      ] },
      { tag: "param", name: "ratingCount", options: [
        omit("Correct: averageRating() has no parameters. ratingCount is a field, so it gets no @param tag.", true),
        no("the number of ratings received", "True about the field, but @param is only for values passed in the parentheses."),
        no("the number of ratings to average", "The method has no parameters; callers can't pass this value."),
      ] },
      { tag: "return", options: [
        ok("the average rating, or 0.0 if there are no ratings yet"),
        no("the average rating, or NaN if there are no ratings yet", "The if statement returns 0.0 before any division happens."),
        no("the average rating, rounded to the nearest whole number", "The cast to double keeps the decimal part; nothing rounds."),
      ] },
      { tag: "throws", options: [
        omit("Correct: the zero-ratings case returns early, so there's no division by zero.", true),
        no("ArithmeticException if there are no ratings yet", "The if statement handles that case by returning 0.0."),
        no("IllegalStateException if there are no ratings yet", "The method returns 0.0 in that case; nothing is thrown."),
      ] },
    ],
    explanation: "A method with no parameters gets no @param tags, even though it depends on fields. The @return line should mention the special 0.0 result, since a caller can't see the if statement.",
  },
  {
    id: "C-paths-clock",
    family: "paths",
    kind: "build",
    blocks: [{ label: "Method", code: `public static String clockTime(int hour, int minute) {
    if (minute < 10) {
        return hour + ":0" + minute;
    }
    return hour + ":" + minute;
}`, java: { kind: "method" } }],
    slots: [
      { tag: "desc", options: [
        ok("Formats a time as hour:minute, adding a leading zero to minutes less than 10."),
        no("Formats a time as hour:minute, adding a leading zero to hours less than 10.", "Only minute is checked; hour is printed as is."),
        no("Formats a time with exactly two digits for both the hour and the minute.", "An hour of 9 prints as \"9\", not \"09\"."),
      ] },
      { tag: "param", name: "hour", options: [
        ok("the hour to show before the colon"),
        no("the hour, shown with a leading zero if it is less than 10", "No leading zero is ever added to hour."),
        no("the number of minutes past the hour", "That's minute's role; hour appears before the colon."),
      ] },
      { tag: "param", name: "minute", options: [
        ok("the minutes past the hour, from 0 to 59"),
        no("the total number of minutes since midnight", "With 545, the result would be \"9:545\". minute is shown as-is after the colon."),
        no("the hour, from 0 to 23", "minute appears after the colon."),
      ] },
      { tag: "return", options: [
        ok("the formatted time, such as \"9:05\""),
        no("the formatted time, such as \"09:05\"", "The hour never gets a leading zero."),
        omit("The method returns a String; @return should describe it."),
      ] },
      { tag: "throws", options: [
        omit("Correct: no values are checked, so nothing is thrown.", true),
        no("IllegalArgumentException if minute is greater than 59", "Nothing checks the range; 75 would simply produce \"9:75\"."),
        no("NumberFormatException if minute is less than 10", "Small minutes take the first return path; no parsing happens."),
      ] },
    ],
    explanation: "With two return paths, the documentation must describe both. A concrete example in @return (\"9:05\") shows the leading-zero behavior more clearly than a long sentence.",
    verify: [{ expr: '9 + ":0" + 5', expect: "9:05" }],
  },
  {
    id: "C-paths-shorten",
    family: "paths",
    kind: "build",
    blocks: [{ label: "Method", code: `public static String shorten(String text, int max) {
    if (text.length() <= max) {
        return text;
    }
    return text.substring(0, max) + "...";
}`, java: { kind: "method" } }],
    slots: [
      { tag: "desc", options: [
        ok("Shortens text that is too long, ending it with \"...\"."),
        no("Adds \"...\" to the end of the text so readers know it continues.", "Text that already fits is returned without \"...\"."),
        no("Removes the last max characters from the text.", "substring(0, max) keeps the first max characters."),
      ] },
      { tag: "param", name: "text", options: [
        ok("the text to shorten if necessary"),
        no("the shortened version of the text", "The shortened version is what the method returns."),
        no("the characters to add where the text is cut", "The marker is always \"...\"; text is the input being shortened."),
      ] },
      { tag: "param", name: "max", options: [
        ok("the most characters of text to keep; must not be negative"),
        no("the index of the last character of text that will be kept", "substring(0, max) stops before index max, so the last kept index is max - 1."),
        no("the number of characters to remove from the end", "max is the number kept from the front."),
      ] },
      { tag: "return", options: [
        ok("text itself if it has at most max characters; otherwise its first max characters followed by \"...\""),
        no("text itself if it has fewer than max characters; otherwise its first max characters followed by \"...\"", "Text with exactly max characters is returned unchanged too, because the test is <=."),
        no("the first max - 1 characters of text followed by \"...\"", "substring(0, max) contains max characters (indexes 0 to max - 1)."),
      ] },
      { tag: "throws", options: [
        omit("Correct: for a non-negative max, substring is only called with valid indexes.", true),
        no("IndexOutOfBoundsException if text is longer than max", "Longer text is exactly the case where substring(0, max) is valid."),
        no("IllegalArgumentException if text is shorter than max", "Short text is returned unchanged."),
      ] },
    ],
    explanation: "This method has two paths, and the boundary (exactly max characters) is where readers get confused. The @return line names both paths and the boundary precisely.",
    verify: [{ expr: '"Hello".substring(0, 3) + "..."', expect: "Hel..." }],
  },
  {
    id: "C-paths-maxindex",
    family: "paths",
    kind: "build",
    blocks: [{ label: "Method", code: `public static int indexOfMax(int[] values) {
    int best = 0;
    for (int i = 1; i < values.length; i++) {
        if (values[i] > values[best]) {
            best = i;
        }
    }
    return best;
}`, java: { kind: "method" } }],
    slots: [
      { tag: "desc", options: [
        ok("Finds the position of the largest value in an array."),
        no("Finds the largest value in an array.", "best holds an index, and the method returns best."),
        no("Moves the largest value to the front of the array.", "No element of values is assigned."),
      ] },
      { tag: "param", name: "values", options: [
        ok("the values to search; must contain at least one element"),
        no("the values to search; if it is empty, the method returns -1", "For an empty array the method returns 0, not -1 — and 0 isn't a valid index there. Emptiness should be ruled out."),
        no("the index where the search starts", "values is an int[] that the loop searches."),
      ] },
      { tag: "return", options: [
        ok("the index of the first occurrence of the largest value"),
        no("the largest value found anywhere in the values array", "The method returns best, which is an index."),
        no("the index of the last occurrence of the largest value", "The comparison is >, so a later equal value doesn't replace best."),
      ] },
      { tag: "throws", options: [
        omit("Correct: even an empty array doesn't throw — the loop never runs and 0 is returned.", true),
        no("ArrayIndexOutOfBoundsException if values is empty", "Surprisingly, no: the loop never runs, values[0] is never read, and the method returns 0."),
        no("IllegalArgumentException if values contains duplicates", "Duplicates are allowed; the first largest wins."),
      ] },
    ],
    explanation: "Index-versus-value is the key distinction here, along with tie-breaking: > keeps the first largest. Because an empty array silently returns 0, the precondition belongs in @param.",
  },
  {
    id: "C-throws-withdraw",
    family: "throws",
    kind: "build",
    blocks: [{ label: "Method", code: `public void withdraw(int amount) {
    if (amount > balance) {
        throw new IllegalArgumentException("Insufficient funds");
    }
    balance -= amount;
}`, java: { kind: "method", fields: "private int balance;" } }],
    slots: [
      { tag: "desc", options: [
        ok("Removes amount from this account's balance."),
        no("Returns the balance that would remain after removing amount.", "The method is void and changes balance."),
        no("Adds amount to this account's balance.", "-= subtracts."),
      ] },
      { tag: "param", name: "amount", options: [
        ok("the amount to withdraw; may not exceed the current balance"),
        no("the account balance after the withdrawal", "The new balance is computed from amount; amount is what's removed."),
        no("the amount to withdraw; must be less than the current balance", "Withdrawing exactly the balance is allowed: amount > balance is false when they're equal."),
      ] },
      { tag: "return", options: [
        omit("Correct: withdraw is void.", true),
        no("the new balance", "The method is void."),
        no("true if the withdrawal succeeded", "The method is void; failure is signaled by an exception."),
      ] },
      { tag: "throws", options: [
        ok("IllegalArgumentException if amount is greater than the current balance"),
        no("IllegalArgumentException if amount is negative or larger than the balance", "Nothing checks for negative amounts; the only check is amount > balance."),
        omit("The method can throw. Callers need to know when, so they can avoid or handle it."),
      ] },
    ],
    explanation: "When a method throws on purpose, @throws should name the exception and the exact condition. Notice the boundary: withdrawing the full balance succeeds.",
  },
  {
    id: "C-throws-average",
    family: "throws",
    kind: "build",
    blocks: [{ label: "Method", code: `public static double average(int total, int count) {
    if (count <= 0) {
        throw new IllegalArgumentException("count must be positive");
    }
    return (double) total / count;
}`, java: { kind: "method" } }],
    slots: [
      { tag: "desc", options: [
        ok("Calculates the average of values from their total and count."),
        no("Calculates an average, rounded down to a whole number.", "The cast to double keeps the decimal part."),
        no("Calculates the total by adding count values together.", "The total is given; the method divides it."),
      ] },
      { tag: "param", name: "total", options: [
        ok("the sum of all the values"),
        no("the number of values", "That's count; total is divided by it."),
        no("the largest of the values", "Dividing the largest value by the count isn't an average."),
      ] },
      { tag: "param", name: "count", options: [
        ok("how many values were added to make total; must be positive"),
        no("how many values were added to make total; must not be negative", "0 isn't negative, but count = 0 throws."),
        no("the sum of all the values", "That's total."),
      ] },
      { tag: "return", options: [
        ok("the average value"),
        no("the average value, or 0.0 if count is 0", "count = 0 throws instead of returning."),
        omit("The method returns a double, so @return is needed."),
      ] },
      { tag: "throws", options: [
        ok("IllegalArgumentException if count is 0 or negative"),
        no("IllegalArgumentException if count is negative", "Incomplete: count <= 0 also throws for 0."),
        no("ArithmeticException if count is 0, because of division by zero", "The guard throws IllegalArgumentException before any division."),
      ] },
    ],
    explanation: "The guard count <= 0 includes zero. Both @param count and @throws must reflect that exact boundary, and the exception type comes from the throw statement, not from what division would have done.",
  },
  {
    id: "C-range-between",
    family: "range",
    kind: "build",
    blocks: [{ label: "Method", code: `public static int countBetween(int[] values, int low, int high) {
    int count = 0;
    for (int v : values) {
        if (v >= low && v < high) {
            count++;
        }
    }
    return count;
}`, java: { kind: "method" } }],
    slots: [
      { tag: "desc", options: [
        ok("Counts the values from low up to, but not including, high."),
        no("Counts the values between low and high, including both.", "v < high excludes high itself."),
        no("Returns a new array holding the values between low and high.", "The method returns a count (an int), not the values."),
      ] },
      { tag: "param", name: "values", options: [
        ok("the values to examine"),
        no("the number of values to examine", "values is an int[]; the loop visits each element."),
        no("the range of values to count", "The range is low and high; values is the data."),
      ] },
      { tag: "param", name: "low", options: [
        ok("the smallest value that is counted"),
        no("one less than the smallest value that is counted", "v >= low counts low itself."),
        no("the largest value that is counted", "low is the bottom of the range."),
      ] },
      { tag: "param", name: "high", options: [
        ok("the upper limit; values equal to high are not counted"),
        no("the largest value that is counted; values above it are skipped", "v < high excludes high itself."),
        no("the number of values to examine", "high is compared with each value, not used as a count."),
      ] },
      { tag: "return", options: [
        ok("how many values are at least low and less than high"),
        no("how many values are greater than low and at most high", "Both boundaries are reversed."),
        omit("The method returns an int; @return is needed."),
      ] },
      { tag: "throws", options: [
        omit("Correct: nothing here throws; if low > high the count is simply 0.", true),
        no("IllegalArgumentException if low is greater than high", "No check exists; the method just returns 0."),
        no("ArrayIndexOutOfBoundsException if values is empty", "An enhanced for loop over an empty array runs zero times."),
      ] },
    ],
    explanation: "A half-open range (low included, high excluded) is easy to misdescribe. Each tag must get its own boundary right: low is counted, high is not.",
  },
];

/* ======================================================================= */
/* MODE D — Read the Docs                                                  */
/* ======================================================================= */
const DOCS_MODE = [
  /* ---------------- family: predict ------------------------------------ */
  {
    id: "D-predict-substring", family: "predict", kind: "choice",
    docs: ["String.substring(int,int)"],
    blocks: [{ label: "Excerpt", code: `String word = "keyboard";
String part = word.substring(2, 6);`, java: { kind: "excerpt" } }],
    question: "Use the documentation to decide: what is stored in part?",
    codeOptions: true,
    options: [
      ok('"yboa"'),
      no('"yboar"', "That includes index 6. The docs say endIndex is exclusive: the substring ends at index endIndex - 1."),
      no('"eybo"', "That starts at index 1. Indexes start at 0, so index 2 is 'y'."),
      no('"ybo"', "The docs say the length is endIndex - beginIndex, which is 4 characters, not 3."),
    ],
    explanation: "k=0, e=1, y=2, b=3, o=4, a=5, r=6. The substring starts at index 2 and stops before index 6, giving 4 characters: \"yboa\".",
    verify: [{ expr: '"keyboard".substring(2, 6)', expect: "yboa" }],
  },
  {
    id: "D-predict-indexof", family: "predict", kind: "choice",
    docs: ["String.indexOf(String,int)"],
    blocks: [{ label: "Excerpt", code: `String fruit = "banana";
int pos = fruit.indexOf("an", 2);`, java: { kind: "excerpt" } }],
    question: "What is the value of pos?",
    codeOptions: true,
    options: [
      ok("3"),
      no("1", "That's the first \"an\" overall, but the search starts at index 2."),
      no("2", "2 is where the search starts, not where the match is."),
      no("-1", "\"an\" does occur after index 2 (at index 3), so -1 isn't returned."),
    ],
    explanation: "b=0, a=1, n=2, a=3, n=4, a=5. Starting the search at index 2, the first \"an\" begins at index 3.",
    verify: [{ expr: '"banana".indexOf("an", 2)', expect: "3" }],
  },
  {
    id: "D-predict-round", family: "predict", kind: "choice",
    docs: ["Math.round(double)"],
    blocks: [{ label: "Excerpt", code: `long r = Math.round(-2.5);`, java: { kind: "excerpt" } }],
    question: "-2.5 is exactly halfway between -3 and -2. What does the documentation say r will be?",
    codeOptions: true,
    options: [
      ok("-2"),
      no("-3", "Rounding “away from zero” would give -3, but the docs say ties round toward positive infinity, and -2 is greater than -3."),
      no("-2.0", "round returns a long, a whole-number type, so the value has no decimal part."),
      no("-3.0", "Wrong direction and wrong type: ties go toward positive infinity, and the result is a long."),
    ],
    explanation: "“Ties rounding to positive infinity” means a halfway value always moves up. For -2.5, up is -2. The return type is long.",
    verify: [{ expr: "Math.round(-2.5)", expect: "-2" }, { expr: "Math.round(2.5)", expect: "3" }],
  },
  {
    id: "D-predict-numeric", family: "predict", kind: "choice",
    docs: ["Character.getNumericValue"],
    blocks: [{ label: "Excerpt", code: `int v = Character.getNumericValue('B');`, java: { kind: "excerpt" } }],
    question: "Many students guess this returns -1. What does the documentation say v will be?",
    codeOptions: true,
    options: [
      ok("11"),
      no("-1", "-1 is only for characters with no numeric value. The docs give letters A–Z values from 10 through 35."),
      no("66", "66 is the Unicode code for 'B'. getNumericValue returns a different number."),
      no("2", "That's B's position in the alphabet, but the docs map A to 10, not 1."),
    ],
    explanation: "A is 10, so B is 11. Reading the docs beats guessing: this behavior surprises many programmers.",
    verify: [{ expr: "Character.getNumericValue('B')", expect: "11" }],
  },
  {
    id: "D-predict-compare", family: "predict", kind: "choice",
    docs: ["String.compareTo"],
    blocks: [{ label: "Excerpt", code: `int result = "Apple".compareTo("apple");`, java: { kind: "excerpt" } }],
    question: "What does the documentation let you conclude about result?",
    options: [
      ok("It is less than 0."),
      no("It is 0.", "compareTo doesn't ignore case. \"Apple\" and \"apple\" differ in the first character."),
      no("It is greater than 0.", "'A' has a smaller Unicode value than 'a', so \"Apple\" is lexicographically less."),
      no("It is exactly -1.", "The docs only promise “a value less than 0,” not a specific number. (It is actually -32.)"),
    ],
    explanation: "The docs guarantee only the sign of the result. Code that checks compareTo(...) == -1 relies on something the documentation never promises.",
    verify: [{ expr: '"Apple".compareTo("apple")', expect: "-32" }],
  },

  /* ---------------- family: range — valid arguments & edge cases ------- */
  {
    id: "D-range-addindex", family: "range", kind: "choice",
    docs: ["ArrayList.add(int,E)"],
    blocks: [{ label: "Excerpt", code: `ArrayList<String> stops = new ArrayList<>();
stops.add("Elm");
stops.add("Oak");
stops.add("Pine");`, java: { kind: "excerpt" } }],
    question: 'Which index values can be passed to stops.add(index, "Main") without an exception?',
    options: [
      ok("0, 1, 2, or 3"),
      no("0, 1, or 2", "The docs list index > size() as out of range. size() is 3, and 3 > 3 is false, so 3 is allowed — it adds at the end."),
      no("1, 2, or 3", "Only index < 0 is too small. 0 is allowed and inserts at the front."),
      no("0 through 4", "4 > size(), which the docs list as out of range."),
    ],
    explanation: "add(int, E) allows any index from 0 through size(), inclusive. That's one more position than get allows, because you can insert after the last element.",
    verify: [
      { setup: 'java.util.ArrayList<String> s = new java.util.ArrayList<>(java.util.List.of("Elm","Oak","Pine"));', stmt: 's.add(3, "Main");', print: "s", expect: "[Elm, Oak, Pine, Main]" },
      { setup: 'java.util.ArrayList<String> s = new java.util.ArrayList<>(java.util.List.of("Elm","Oak","Pine"));', stmt: 's.add(4, "Main");', print: "s", expect: "throws IndexOutOfBoundsException" },
    ],
  },
  {
    id: "D-range-charat", family: "range", kind: "choice",
    docs: ["String.charAt"],
    blocks: [{ label: "Excerpt", code: `String code = "WXYZ";
char c = code.charAt(4);`, java: { kind: "excerpt" } }],
    question: "According to the documentation, what happens?",
    options: [
      ok("An IndexOutOfBoundsException is thrown."),
      no("c is 'Z'.", "'Z' is at index 3. The docs say the index must be less than the length, and 4 is not less than 4."),
      no("c is a blank space.", "Nothing in the docs mentions a default character for a bad index."),
      no("c is 'W', because the index wraps around.", "charAt never wraps; an index that isn't less than the length throws."),
    ],
    explanation: "Valid indexes run from 0 to length() - 1. \"WXYZ\" has length 4, so index 4 is out of range. (Java actually throws StringIndexOutOfBoundsException, a kind of IndexOutOfBoundsException.)",
    verify: [{ expr: '"WXYZ".charAt(4)', expect: "throws StringIndexOutOfBoundsException" }],
  },
  {
    id: "D-range-substring-end", family: "range", kind: "choice",
    docs: ["String.substring(int)"],
    blocks: [{ label: "Excerpt", code: `String word = "hello";
String rest = word.substring(5);`, java: { kind: "excerpt" } }],
    question: "\"hello\" has length 5. What happens?",
    options: [
      ok('rest is "" (an empty String).'),
      no("An IndexOutOfBoundsException is thrown.", "The docs throw only if beginIndex is larger than the length. 5 is equal to the length, which is allowed."),
      no('rest is "o".', '"o" is at index 4; substring(4) would return it.'),
      no("rest is null.", "substring never returns null according to these docs; it returns the specified substring."),
    ],
    explanation: "Starting at index 5 means starting just past the last character, so the substring is empty. The rule that matters is the throws condition: only beginIndex > length() fails.",
    verify: [{ expr: '"hello".substring(5).length()', expect: "0" }, { expr: '"hello".substring(6)', expect: "throws StringIndexOutOfBoundsException" }],
  },
  {
    id: "D-range-whichthrows", family: "range", kind: "choice",
    docs: ["ArrayList.get", "ArrayList.add(int,E)", "ArrayList.set"],
    blocks: [{ label: "Excerpt", code: `ArrayList<Integer> nums = new ArrayList<>();
nums.add(10);
nums.add(20);
nums.add(30);
nums.add(40);`, java: { kind: "excerpt" } }],
    question: "Which call throws an exception?",
    codeOptions: true,
    options: [
      ok("nums.get(4)"),
      no("nums.add(4, 50)", "add allows index == size(). This appends 50."),
      no("nums.set(3, 50)", "3 < size(), so index 3 is valid; set replaces 40."),
      no("nums.add(0, 50)", "Index 0 is always valid for add; 50 is inserted at the front."),
    ],
    explanation: "get and set require index < size(), while add(int, E) allows index <= size(). With 4 elements, index 4 is valid only for add.",
    verify: [
      { setup: "java.util.ArrayList<Integer> n = new java.util.ArrayList<>(java.util.List.of(10,20,30,40));", expr: "n.get(4)", expect: "throws IndexOutOfBoundsException" },
      { setup: "java.util.ArrayList<Integer> n = new java.util.ArrayList<>(java.util.List.of(10,20,30,40));", stmt: "n.add(4, 50);", print: "n", expect: "[10, 20, 30, 40, 50]" },
    ],
  },

  /* ---------------- family: effect — modify or return? ----------------- */
  {
    id: "D-effect-upper", family: "effect", kind: "choice",
    docs: ["String.toUpperCase"],
    blocks: [{ label: "Excerpt", code: `String code = "nv-12";
code.toUpperCase();
System.out.println(code);`, java: { kind: "excerpt" } }],
    question: "What is printed?",
    codeOptions: true,
    options: [
      ok("nv-12"),
      no("NV-12", "toUpperCase returns a new String, and Strings can't be changed. The result was never stored, so code still refers to \"nv-12\"."),
      no("Nv-12", "Nothing capitalizes only the first letter."),
      no("Nothing — the code doesn't compile.", "Calling a method and ignoring its returned value is legal Java."),
    ],
    explanation: "The docs say Strings are constant and toUpperCase returns the converted String. To keep it, you must assign it: code = code.toUpperCase();",
    verify: [{ setup: 'String code = "nv-12";', stmt: "code.toUpperCase();", print: "code", expect: "nv-12" }],
  },
  {
    id: "D-effect-set", family: "effect", kind: "choice",
    docs: ["ArrayList.set"],
    blocks: [{ label: "Excerpt", code: `ArrayList<String> stops = new ArrayList<>();
stops.add("Elm");
stops.add("Oak");
stops.add("Pine");
String old = stops.set(1, "Main");`, java: { kind: "excerpt" } }],
    question: "After this code runs, which statement is true?",
    options: [
      ok('old is "Oak" and stops is [Elm, Main, Pine].'),
      no('old is "Main" and stops is [Elm, Main, Pine].', "set returns the element previously at the position, not the new one."),
      no('old is "Oak" and stops is [Elm, Main, Oak, Pine].', "set replaces; it doesn't insert. Inserting is add(index, element)."),
      no('old is "Elm" and stops is [Main, Oak, Pine].', "Index 1 is the second element."),
    ],
    explanation: "set both changes the list and returns something useful: the element that was replaced.",
    verify: [{ setup: 'java.util.ArrayList<String> s = new java.util.ArrayList<>(java.util.List.of("Elm","Oak","Pine"));', expr: 's.set(1, "Main") + " " + s', expect: "Oak [Elm, Main, Pine]" }],
  },
  {
    id: "D-effect-remove", family: "effect", kind: "choice",
    docs: ["ArrayList.remove(int)", "ArrayList.get"],
    prompt: "Because 1 is an int, Java calls remove(int index) here.",
    blocks: [{ label: "Excerpt", code: `ArrayList<Integer> nums = new ArrayList<>();
nums.add(4);
nums.add(8);
nums.add(15);
nums.add(16);
nums.remove(1);
int x = nums.get(1);`, java: { kind: "excerpt" } }],
    question: "What is the value of x?",
    codeOptions: true,
    options: [
      ok("15"),
      no("8", "8 was at index 1 and was removed."),
      no("16", "Removing shifts each later element left by one, so 15 moves to index 1 and 16 to index 2."),
      no("It throws an exception.", "After the removal the list has 3 elements, so index 1 is valid."),
    ],
    explanation: "remove(1) removes 8, and the docs say later elements shift left. The list becomes [4, 15, 16], so get(1) is 15.",
    verify: [{ setup: "java.util.ArrayList<Integer> n = new java.util.ArrayList<>(java.util.List.of(4,8,15,16));", stmt: "n.remove(1);", print: "n.get(1)", expect: "15" }],
  },
  {
    id: "D-effect-replace", family: "effect", kind: "choice",
    docs: ["String.replace(char,char)"],
    blocks: [{ label: "Excerpt", code: `String date = "2026-10-17";
String fixed = date.replace('-', '/');`, java: { kind: "excerpt" } }],
    question: "What is stored in fixed?",
    codeOptions: true,
    options: [
      ok('"2026/10/17"'),
      no('"2026/10-17"', "The docs say all occurrences are replaced, not just the first."),
      no('"2026-10-17"', "That's still the value of date. fixed holds the new String that replace returns."),
      no('"20261017"', "The dashes are replaced with '/', not removed."),
    ],
    explanation: "replace(char, char) replaces every occurrence and returns a new String; date itself is unchanged.",
    verify: [{ expr: '"2026-10-17".replace(\'-\', \'/\')', expect: "2026/10/17" }],
  },

  /* ---------------- family: guarantee — classify statements ------------ */
  {
    id: "D-guarantee-random", family: "guarantee", kind: "classify",
    docs: ["Math.random"],
    question: "For each statement, decide whether the documentation guarantees it.",
    statements: [
      { text: "Math.random() never returns 1.0.", g: true, why: "The docs say the value is less than 1.0." },
      { text: "Math.random() never returns a negative number.", g: true, why: "The docs say the value is greater than or equal to 0.0." },
      { text: "Two calls in a row always return different values.", g: false, why: "The docs describe a range and an approximate distribution. Nothing promises two results differ." },
      { text: "Every result has at most two digits after the decimal point.", g: false, why: "The docs say nothing about decimal places; results usually have many digits." },
    ],
    explanation: "The documentation guarantees the range [0.0, 1.0) and an approximately uniform spread. Anything beyond that is an assumption.",
  },
  {
    id: "D-guarantee-abs", family: "guarantee", kind: "classify",
    docs: ["Math.abs(int)"],
    question: "For each statement about Math.abs(int), decide whether the documentation guarantees it.",
    statements: [
      { text: "Math.abs(-7) returns 7.", g: true, why: "-7 is negative, so the docs say its negation is returned." },
      { text: "Math.abs(5) returns 5.", g: true, why: "A non-negative argument is returned as is." },
      { text: "The result is never negative.", g: false, why: "The docs say Math.abs(Integer.MIN_VALUE) returns that same negative value." },
      { text: "Calling Math.abs(x) changes x to its absolute value.", g: false, why: "The method returns a value. Java passes ints by value, so x is unchanged." },
    ],
    explanation: "The Integer.MIN_VALUE note is easy to skip, but it's exactly the kind of documented edge case that separates guaranteed behavior from assumptions.",
    verify: [{ expr: "Math.abs(Integer.MIN_VALUE)", expect: "-2147483648" }],
  },
  {
    id: "D-guarantee-parseint", family: "guarantee", kind: "classify",
    docs: ["Integer.parseInt"],
    question: "For each call, decide whether the documentation guarantees it returns the int shown.",
    statements: [
      { text: 'Integer.parseInt("-42") returns -42.', g: true, why: "A leading '-' is explicitly allowed." },
      { text: 'Integer.parseInt("+42") returns 42.', g: true, why: "A leading '+' is explicitly allowed." },
      { text: 'Integer.parseInt(" 42") returns 42.', g: false, why: "A space isn't a decimal digit or sign, so the string isn't parsable. It throws NumberFormatException." },
      { text: 'Integer.parseInt("4.0") returns 4.', g: false, why: "'.' isn't a decimal digit. This throws NumberFormatException." },
    ],
    explanation: "The docs require every character to be a digit, except an optional leading sign. Spaces and decimal points break that rule.",
    verify: [
      { expr: 'Integer.parseInt("+42")', expect: "42" },
      { expr: 'Integer.parseInt(" 42")', expect: "throws NumberFormatException" },
      { expr: 'Integer.parseInt("4.0")', expect: "throws NumberFormatException" },
    ],
  },
  {
    id: "D-guarantee-removeobj", family: "guarantee", kind: "classify",
    docs: ["ArrayList.remove(Object)"],
    question: 'list is an ArrayList<String>. For each statement about list.remove("Oak"), decide whether the documentation guarantees it.',
    statements: [
      { text: 'If "Oak" appears twice, only the first one is removed.', g: true, why: "The docs say the first occurrence is removed." },
      { text: 'If "Oak" is not in the list, the list is unchanged.', g: true, why: "Stated directly in the description." },
      { text: "The method returns the String that was removed.", g: false, why: "remove(Object) returns a boolean: whether the list contained the element." },
      { text: 'If "Oak" is not in the list, an exception is thrown.', g: false, why: "The method returns false and leaves the list unchanged." },
    ],
    explanation: "remove(Object) and remove(int) are different methods with different returns. Reading the right overload's documentation matters.",
    verify: [{ setup: 'java.util.ArrayList<String> s = new java.util.ArrayList<>(java.util.List.of("Oak","Elm","Oak"));', expr: 's.remove("Oak") + " " + s + " " + s.remove("Ash")', expect: "true [Elm, Oak] false" }],
  },
  {
    id: "D-guarantee-indexof", family: "guarantee", kind: "classify",
    docs: ["String.indexOf(String)"],
    question: "For each statement about s.indexOf(t), decide whether the documentation guarantees it.",
    statements: [
      { text: "If t appears more than once, the smallest matching index is returned.", g: true, why: "“First occurrence” means the lowest index." },
      { text: "A result of -1 means t does not occur in s.", g: true, why: "The returns section says -1 means there is no such occurrence." },
      { text: "The search ignores differences between uppercase and lowercase.", g: false, why: "Nothing in the docs mentions ignoring case." },
      { text: "The result is the index where the match ends.", g: false, why: "The result is the index of the occurrence, which is where it begins." },
    ],
    explanation: "indexOf reports the start of the first match or -1. Case-insensitive searching would need a different approach.",
    verify: [{ expr: '"Banana".indexOf("an") + " " + "Banana".indexOf("BAN")', expect: "1 -1" }],
  },

  /* ---------------- family: find — click the line that answers --------- */
  {
    id: "D-find-get", family: "find", kind: "docline",
    docs: ["ArrayList.get"],
    question: "Click the line of documentation that tells you what list.get(list.size()) will do.",
    answer: ["throws:IndexOutOfBoundsException"],
    lineWhy: {
      "desc0": "This says what get returns normally, but not what happens for a bad index.",
      "returns": "This describes the normal result, not the out-of-range case.",
      "param:index": "This says what index means, not which values are allowed.",
    },
    explanation: "The Throws line defines out of range as index < 0 || index >= size(). list.size() is >= size(), so the call throws.",
  },
  {
    id: "D-find-exclusive", family: "find", kind: "docline",
    docs: ["String.substring(int,int)"],
    question: 'Click a line that explains why "keyboard".substring(0, 3) does not include the \'b\' at index 3.',
    answer: ["desc1", "param:endIndex"],
    lineWhy: {
      "desc2": "This gives the length, which you could use to work it out, but it doesn't say which index is left out.",
      "param:beginIndex": "This is about where the substring starts.",
      "throws:IndexOutOfBoundsException": "This is about invalid arguments; 0 and 3 are valid.",
    },
    explanation: "Two lines say it: the description (ends at endIndex - 1) and the endIndex parameter (exclusive). Either is a correct answer.",
  },
  {
    id: "D-find-abs", family: "find", kind: "docline",
    docs: ["Math.abs(int)"],
    question: "A teammate says Math.abs always returns a non-negative int. Click the line that proves the claim wrong.",
    answer: ["desc1"],
    lineWhy: {
      "desc0": "This describes the normal behavior, which supports the teammate's assumption.",
      "returns": "This is a summary and doesn't mention the exception to the rule.",
    },
    explanation: "Integer.MIN_VALUE has no positive int counterpart, so Math.abs returns it unchanged — still negative.",
  },
  {
    id: "D-find-equalsnull", family: "find", kind: "docline",
    docs: ["String.equals"],
    question: 'Click a line that tells you what "hi".equals(null) returns.',
    answer: ["desc1", "returns"],
    lineWhy: {
      "desc0": "This says what equals does in general, not how null is treated.",
      "param:anObject": "This names the argument but doesn't say what happens for null.",
    },
    explanation: "The description says the result is true only if the argument is not null; the Returns line says false otherwise. Either line settles it: the result is false.",
    verify: [{ expr: '"hi".equals(null)', expect: "false" }],
  },
  {
    id: "D-find-sqrt", family: "find", kind: "docline",
    docs: ["Math.sqrt"],
    question: "Click a line that tells you what Math.sqrt(-4) returns.",
    answer: ["desc1", "returns"],
    lineWhy: {
      "desc0": "This describes the normal case. -4 is a special case.",
      "param:a": "This doesn't restrict or explain the values of a.",
    },
    explanation: "Both the special-cases line and the Returns line say a negative argument produces NaN — not an exception, and not 2.",
    verify: [{ expr: "Math.sqrt(-4)", expect: "NaN" }],
  },

  /* ---------------- family: overload — which version, which type ------- */
  {
    id: "D-overload-round", family: "overload", kind: "choice",
    docs: ["Math.round(double)"],
    question: "Use the signature to decide: which declaration does NOT compile?",
    codeOptions: true,
    options: [
      ok("int r = Math.round(4.6);"),
      no("long r = Math.round(4.6);", "round(double) returns a long, so this matches exactly."),
      no("double r = Math.round(4.6);", "A long can widen to a double automatically, so this compiles (r is 5.0)."),
      no("long r = Math.round(-4.6);", "Negative arguments are fine; this stores -5."),
    ],
    explanation: "The signature says round(double) returns long. Storing a long in an int could lose information, so Java requires a cast: int r = (int) Math.round(4.6);",
    optionChecks: "compile",
  },
  {
    id: "D-overload-max", family: "overload", kind: "choice",
    docs: ["Math.max(int,int)", "Math.max(double,double)"],
    prompt: "Java can widen an int argument to a double parameter automatically, but it never narrows a double to an int without a cast.",
    blocks: [{ label: "Excerpt", code: `System.out.println(Math.max(7, 2.5));`, java: { kind: "excerpt" } }],
    question: "Which version of max runs, and what is printed?",
    options: [
      ok("max(double, double); it prints 7.0"),
      no("max(int, int); it prints 7", "2.5 can't be passed to an int parameter, so the int version doesn't apply."),
      no("max(double, double); it prints 2.5", "max returns the greater value."),
      no("Neither — the code doesn't compile.", "7 widens to 7.0, so max(double, double) applies."),
    ],
    explanation: "Only max(double, double) accepts both arguments. Its return type is double, so the result prints as 7.0.",
    verify: [{ expr: "Math.max(7, 2.5)", expect: "7.0" }],
  },
  {
    id: "D-overload-remove", family: "overload", kind: "choice",
    docs: ["ArrayList.remove(int)", "ArrayList.remove(Object)"],
    prompt: "When one overload's parameter type exactly matches the argument (here, the int 1), Java chooses it.",
    blocks: [{ label: "Excerpt", code: `ArrayList<Integer> nums = new ArrayList<>();
nums.add(10);
nums.add(20);
nums.add(30);
nums.remove(1);`, java: { kind: "excerpt" } }],
    question: "What does nums contain afterward?",
    codeOptions: true,
    options: [
      ok("[10, 30]"),
      no("[10, 20, 30]", "That would happen if remove(Object) looked for the value 1. But 1 is an int, so remove(int index) runs."),
      no("[20, 30]", "Index 1 is the second element."),
      no("[10, 20]", "Index 1 holds 20, not 30."),
    ],
    explanation: "remove(1) removes the element at index 1. To remove the value 1, you'd pass an Integer object: nums.remove(Integer.valueOf(1)).",
    verify: [{ setup: "java.util.ArrayList<Integer> n = new java.util.ArrayList<>(java.util.List.of(10,20,30));", stmt: "n.remove(1);", print: "n", expect: "[10, 30]" }],
  },
  {
    id: "D-overload-charupper", family: "overload", kind: "choice",
    docs: ["Character.toUpperCase"],
    blocks: [{ label: "Excerpt", code: `char c = Character.toUpperCase('7');`, java: { kind: "excerpt" } }],
    question: "'7' has no uppercase form. According to the documentation, what is c?",
    options: [
      ok("'7'"),
      no("An exception is thrown because '7' is not a letter.", "The docs say that when there's no uppercase equivalent, the character itself is returned."),
      no("-1", "The return type is char. The docs never mention -1 for this method."),
      no("A blank space.", "The docs say the character itself is returned, unchanged."),
    ],
    explanation: "“Otherwise, the character itself” covers digits, punctuation, and letters that are already uppercase.",
    verify: [{ expr: "Character.toUpperCase('7')", expect: "7" }],
  },
];

/* ======================================================================= */
/* MODE E — API Detective                                                  */
/* `jv` describes how the JVM test checks every option:                    */
/*   expr – option is an expression; printed result must match `expect`    */
/*   cond – option is a boolean condition used in an if statement          */
/*   stmt – option is a statement; `print` is evaluated afterward          */
/* The correct option must match every case; each distractor must fail to  */
/* compile or produce a different result for at least one case.            */
/* ======================================================================= */
const int = (v) => ({ text: String(v), type: "int", value: v });
const str = (v) => ({ text: JSON.stringify(v), type: "String", value: v });

const DETECTIVE = [
  /* ---------------- family: similar — similar-sounding methods --------- */
  {
    id: "E-similar-prefix", family: "similar", kind: "choice",
    docs: ["String.startsWith", "String.contains", "String.indexOf(String)"],
    prompt: 'Part numbers from the Nevada warehouse begin with "NV-", like "NV-1182". Other warehouses use codes such as "AZ-NV-9".',
    question: "Which condition is true for Nevada part numbers and false for all others?",
    codeOptions: true,
    options: [
      ok('part.startsWith("NV-")'),
      no('part.contains("NV-")', 'contains matches anywhere, so "AZ-NV-9" would count as a Nevada part.'),
      no('part.indexOf("NV-") > 0', 'A part that begins with "NV-" has index 0, and 0 > 0 is false — the exact opposite of what\'s needed.'),
      no('part.equals("NV-")', 'equals compares the whole String, so "NV-1182" would not match.'),
    ],
    explanation: "startsWith tests the beginning only. The indexOf version fails in an instructive way: a match at the very start returns 0, which > 0 rejects.",
    jv: { kind: "cond", cases: [
      { setup: 'String part = "NV-1182";', expect: "true" },
      { setup: 'String part = "AZ-NV-9";', expect: "false" },
      { setup: 'String part = "TX-0042";', expect: "false" },
    ] },
  },
  {
    id: "E-similar-size", family: "similar", kind: "choice",
    docs: ["ArrayList.size", "String.length"],
    blocks: [{ label: "Excerpt", code: `ArrayList<String> names = new ArrayList<>();
names.add("Ana");
names.add("Bo");
names.add("Cyd");
names.add("Di");`, java: { kind: "excerpt" } }],
    question: "Which expression gives the number of names in the list?",
    codeOptions: true,
    options: [
      ok("names.size()"),
      no("names.length", "length (no parentheses) is for arrays. An ArrayList is an object; this doesn't compile."),
      no("names.length()", "length() is a String method. ArrayList doesn't have it, so this doesn't compile."),
      no("names.get(0).length()", 'This is the length of the first name ("Ana" → 3), not the number of names.'),
    ],
    explanation: "Arrays use .length, Strings use .length(), and ArrayLists use .size(). Checking the class's documentation tells you which one exists.",
    jv: { kind: "expr", cases: [{ setup: 'java.util.ArrayList<String> names = new java.util.ArrayList<>(java.util.List.of("Ana","Bo","Cyd","Di"));', expect: "4" }] },
  },

  /* ---------------- family: args — build the call (assemble) ----------- */
  {
    id: "E-args-areacode", family: "args", kind: "assemble",
    docs: ["String.substring(int,int)"],
    blocks: [{ label: "Excerpt", code: `String phone = "(702) 555-0198";`, java: { kind: "excerpt" } }],
    question: 'Build the call that stores the area code "702" in area.',
    receiver: { name: "phone", type: "String", value: "(702) 555-0198" },
    methods: ["substring"],
    tokens: [int(0), int(1), int(3), int(4), int(5)],
    slots: 2,
    template: "String area = {call};",
    want: { type: "value", value: "702" },
    explanation: "'7' is at index 1 and '2' is at index 3. Because endIndex is exclusive, the end must be 4: phone.substring(1, 4).",
  },
  {
    id: "E-args-insert", family: "args", kind: "assemble",
    docs: ["ArrayList.add(int,E)", "ArrayList.set"],
    blocks: [{ label: "Excerpt", code: `ArrayList<String> parks = new ArrayList<>();
parks.add("Zion");
parks.add("Arches");
parks.add("Yosemite");`, java: { kind: "excerpt" } }],
    question: 'Build the call that makes "Bryce" the second park while keeping all three existing parks.',
    receiver: { name: "parks", type: "ArrayList<String>", value: ["Zion", "Arches", "Yosemite"] },
    methods: ["add", "set"],
    tokens: [int(1), int(2), str("Bryce")],
    slots: 2,
    template: "{call};",
    want: { type: "list", value: ["Zion", "Bryce", "Arches", "Yosemite"] },
    explanation: "add(int, E) inserts and shifts later elements right; set would overwrite \"Arches\". The index comes first, and the second position is index 1.",
  },
  {
    id: "E-args-slash", family: "args", kind: "assemble",
    docs: ["String.indexOf(String,int)"],
    blocks: [{ label: "Excerpt", code: `String date = "10/17/2026";
int first = date.indexOf("/");`, java: { kind: "excerpt" } }],
    question: "first is 2. Build the call that finds the index of the second \"/\".",
    receiver: { name: "date", type: "String", value: "10/17/2026" },
    vars: { first: 2 },
    methods: ["indexOf"],
    tokens: [str("/"), { text: "first", type: "int", value: 2 }, { text: "first + 1", type: "int", value: 3 }, int(0)],
    slots: 2,
    template: "int second = {call};",
    want: { type: "value", value: 5 },
    explanation: "Starting the search at first would find the same slash again. Starting one past it, at first + 1, finds the next one at index 5.",
  },
  {
    id: "E-args-score", family: "args", kind: "assemble",
    docs: ["ArrayList.set", "ArrayList.add(int,E)"],
    blocks: [{ label: "Excerpt", code: `ArrayList<Integer> scores = new ArrayList<>();
scores.add(70);
scores.add(75);
scores.add(80);
scores.add(95);`, java: { kind: "excerpt" } }],
    question: "The third score was entered wrong. Build the call that changes it to 88 without changing the number of scores.",
    receiver: { name: "scores", type: "ArrayList<Integer>", value: [70, 75, 80, 95] },
    methods: ["set", "add"],
    tokens: [int(2), int(3), int(88)],
    slots: 2,
    template: "{call};",
    want: { type: "list", value: [70, 75, 88, 95] },
    explanation: "set(index, element) replaces. The third score is at index 2. Watch out: with ArrayList<Integer>, set(88, 2) also compiles — and throws at run time.",
  },

  /* ---------------- family: result — use the returned value ------------ */
  {
    id: "E-result-upper", family: "result", kind: "choice",
    docs: ["String.toUpperCase"],
    blocks: [{ label: "Excerpt", code: `String code = "nv-12";`, java: { kind: "excerpt" } }],
    question: 'Which statement makes code refer to "NV-12"?',
    codeOptions: true,
    options: [
      ok("code = code.toUpperCase();"),
      no("code.toUpperCase();", "The uppercase String is returned and then thrown away. code still refers to \"nv-12\"."),
      no("toUpperCase(code);", "toUpperCase is an instance method called on a String, not a standalone method. This doesn't compile."),
      no("code.toUpperCase(code);", "The documented toUpperCase() takes no arguments, so this doesn't compile."),
    ],
    explanation: "Strings never change. Methods like toUpperCase return a new String, and you keep it by assigning it.",
    jv: { kind: "stmt", cases: [{ setup: 'String code = "nv-12";', print: "code", expect: "NV-12" }] },
  },
  {
    id: "E-result-dequeue", family: "result", kind: "choice",
    docs: ["ArrayList.remove(int)", "ArrayList.get", "ArrayList.remove(Object)"],
    blocks: [{ label: "Excerpt", code: `ArrayList<String> queue = new ArrayList<>();
queue.add("Ana");
queue.add("Ben");
queue.add("Cal");`, java: { kind: "excerpt" } }],
    question: "Which code takes the first person out of the queue AND stores their name in next?",
    codeOptions: true,
    options: [
      ok("String next = queue.remove(0);"),
      no("String next = queue.get(0);", "get reads without removing. Ana would still be in the queue."),
      no("queue.remove(0);\nString next = queue.get(0);", "After the removal, index 0 holds Ben, so next would be \"Ben\"."),
      no("boolean next = queue.remove(queue.get(0));", "This does remove Ana, but remove(Object) returns a boolean, so next holds true, not the name."),
    ],
    explanation: "remove(int) does both jobs: it removes the element and returns it. Reading the Returns line of each overload is the key.",
    jv: { kind: "stmt", cases: [{ setup: 'java.util.ArrayList<String> queue = new java.util.ArrayList<>(java.util.List.of("Ana","Ben","Cal"));', print: 'next + " " + queue', expect: "Ana [Ben, Cal]" }] },
  },
  {
    id: "E-result-gap", family: "result", kind: "choice",
    docs: ["Math.abs(int)", "Math.max(int,int)"],
    prompt: "a and b are positions on a number line. Either one may be larger, and either may be negative.",
    question: "Which expression gives the distance between a and b?",
    codeOptions: true,
    options: [
      ok("Math.abs(a - b)"),
      no("Math.abs(a) - Math.abs(b)", "With a = -3 and b = 4 this gives -1, but the distance is 7."),
      no("Math.max(a - b, 0)", "When b is larger, a - b is negative and this gives 0."),
      no("Math.abs(a) + Math.abs(b)", "That only works when a and b are on opposite sides of 0. For 3 and 10 it gives 13."),
    ],
    explanation: "Subtract first, then take the absolute value of the difference — the order of the calls matters.",
    jv: { kind: "expr", cases: [
      { setup: "int a = 3, b = 10;", expect: "7" },
      { setup: "int a = 10, b = 3;", expect: "7" },
      { setup: "int a = -3, b = 4;", expect: "7" },
    ] },
  },

  /* ---------------- family: overload — choose the right version -------- */
  {
    id: "E-overload-value", family: "overload", kind: "choice",
    docs: ["ArrayList.remove(int)", "ArrayList.remove(Object)", "Integer.valueOf(int)"],
    blocks: [{ label: "Excerpt", code: `ArrayList<Integer> ids = new ArrayList<>();
ids.add(4);
ids.add(9);
ids.add(3);
ids.add(7);`, java: { kind: "excerpt" } }],
    question: "Which statement removes the value 3 from ids, wherever it appears?",
    codeOptions: true,
    options: [
      ok("ids.remove(Integer.valueOf(3));"),
      no("ids.remove(3);", "3 is an int, so remove(int index) runs and removes the element at index 3 — the 7."),
      no("ids.remove(ids.get(3));", "get(3) is 7, so this removes the value 7."),
      no("ids.set(ids.indexOf(3), 0);", "set replaces 3 with 0; the list keeps four elements."),
    ],
    explanation: "With ArrayList<Integer>, an int argument picks remove(int index). Passing an Integer object selects remove(Object), which removes by value.",
    jv: { kind: "stmt", cases: [{ setup: "java.util.ArrayList<Integer> ids = new java.util.ArrayList<>(java.util.List.of(4,9,3,7));", print: "ids", expect: "[4, 9, 7]" }] },
  },
  {
    id: "E-overload-uppercase", family: "overload", kind: "choice",
    docs: ["Character.isUpperCase", "Character.isLetter", "Character.toUpperCase", "String.charAt"],
    prompt: "A password rule says the first character must be an uppercase letter.",
    question: "Which condition belongs in if ( ___ )?",
    codeOptions: true,
    options: [
      ok("Character.isUpperCase(pw.charAt(0))"),
      no("Character.isLetter(pw.charAt(0))", "\"tiger7\" starts with a letter but not an uppercase one."),
      no("pw.charAt(0) == Character.toUpperCase(pw.charAt(0))", "For \"7tiger\", '7' has no uppercase form, so toUpperCase returns '7' and the test is true."),
      no("Character.toUpperCase(pw.charAt(0))", "toUpperCase returns a char, not a boolean, so it can't be an if condition. This doesn't compile."),
    ],
    explanation: "Converting and testing are different jobs. isUpperCase tests; toUpperCase converts — and its documented “otherwise the character itself” behavior breaks the comparison trick for digits.",
    jv: { kind: "cond", cases: [
      { setup: 'String pw = "Tiger7";', expect: "true" },
      { setup: 'String pw = "tiger7";', expect: "false" },
      { setup: 'String pw = "7tiger";', expect: "false" },
    ] },
  },

  /* ---------------- family: compose — combine calls -------------------- */
  {
    id: "E-compose-max3", family: "compose", kind: "choice",
    docs: ["Math.max(int,int)", "Math.min(int,int)"],
    question: "Which expression gives the largest of the three ints a, b, and c?",
    codeOptions: true,
    options: [
      ok("Math.max(a, Math.max(b, c))"),
      no("Math.max(a, b, c)", "The documented max takes exactly two arguments. There's no three-argument version, so this doesn't compile."),
      no("Math.max(Math.min(a, b), c)", "With a = 9, b = 1, c = 5 this gives 5. min throws away the larger of a and b."),
      no("Math.max(a, b) + Math.max(b, c)", "Adding two maximums gives a sum, not the largest value."),
    ],
    explanation: "When a method takes two arguments, nesting calls handles more values: the inner call's result becomes an argument to the outer call.",
    jv: { kind: "expr", cases: [
      { setup: "int a = 9, b = 1, c = 5;", expect: "9" },
      { setup: "int a = 1, b = 9, c = 5;", expect: "9" },
      { setup: "int a = 1, b = 5, c = 9;", expect: "9" },
    ] },
  },
  {
    id: "E-compose-last", family: "compose", kind: "choice",
    docs: ["ArrayList.get", "ArrayList.size", "ArrayList.remove(int)"],
    question: "Which expression reads the last element of list without changing the list?",
    codeOptions: true,
    options: [
      ok("list.get(list.size() - 1)"),
      no("list.get(list.size())", "size() is one past the last index. The docs say index >= size() throws."),
      no("list.remove(list.size() - 1)", "It returns the last element, but it also removes it."),
      no("list.get(-1)", "ArrayList doesn't count backward from the end. The docs say index < 0 throws."),
    ],
    explanation: "Valid indexes run from 0 to size() - 1, so the last element is at size() - 1.",
    jv: { kind: "expr", print: '__ + " " + list', cases: [{ setup: 'java.util.ArrayList<String> list = new java.util.ArrayList<>(java.util.List.of("Ana","Ben","Cal"));', expect: "Cal [Ana, Ben, Cal]" }] },
  },
  {
    id: "E-compose-lastchar", family: "compose", kind: "choice",
    docs: ["String.charAt", "String.length", "String.substring(int)"],
    blocks: [{ label: "Excerpt", code: `String word = "ocean";`, java: { kind: "excerpt" } }],
    question: "Which statement stores the last character of word in a char variable?",
    codeOptions: true,
    options: [
      ok("char last = word.charAt(word.length() - 1);"),
      no("char last = word.charAt(word.length());", "length() is not less than the length, so charAt throws."),
      no("char last = word.substring(word.length() - 1);", "substring returns a String (\"n\"), which can't be stored in a char. This doesn't compile."),
      no("char last = word.charAt(word.length() - 2);", "That's the second-to-last character, 'a'."),
    ],
    explanation: "charAt returns a char, and the last valid index is length() - 1.",
    jv: { kind: "stmt", cases: [{ setup: 'String word = "ocean";', print: "last", expect: "n" }] },
  },

  /* ---------------- family: convert ------------------------------------ */
  {
    id: "E-convert-int", family: "convert", kind: "choice",
    docs: ["Integer.parseInt", "Integer.toString(int)", "String.length"],
    blocks: [{ label: "Excerpt", code: `String input = "42";  // typed by the user`, java: { kind: "excerpt" } }],
    question: "Which statement stores one more than the typed number (43) in n?",
    codeOptions: true,
    options: [
      ok("int n = Integer.parseInt(input) + 1;"),
      no("int n = input + 1;", "input + 1 is String concatenation (\"421\"), and a String can't be stored in an int. This doesn't compile."),
      no("int n = Integer.parseInt(input + 1);", "input + 1 is \"421\" first, so n is 421."),
      no("int n = input.length() + 1;", "length() counts characters: \"42\" has 2, so n is 3."),
    ],
    explanation: "Convert first with parseInt, then do arithmetic. Parentheses decide whether + means addition or concatenation.",
    jv: { kind: "stmt", cases: [{ setup: 'String input = "42";', print: "n", expect: "43" }] },
  },
  {
    id: "E-convert-double", family: "convert", kind: "choice",
    docs: ["Double.parseDouble", "Integer.parseInt"],
    blocks: [{ label: "Excerpt", code: `String text = "3.50";  // read from a price tag`, java: { kind: "excerpt" } }],
    question: "Which statement stores the price as a number?",
    codeOptions: true,
    options: [
      ok("double price = Double.parseDouble(text);"),
      no("double price = Integer.parseInt(text);", "It compiles, but '.' isn't a decimal digit, so parseInt throws NumberFormatException."),
      no("int price = Double.parseDouble(text);", "parseDouble returns a double, which can't be stored in an int without a cast. This doesn't compile."),
      no("double price = text.length();", "That stores 4.0 — the number of characters."),
    ],
    explanation: "Match the parsing method to the text's format and the variable's type. parseInt only accepts digits with an optional sign.",
    jv: { kind: "stmt", cases: [{ setup: 'String text = "3.50";', print: "price", expect: "3.5" }] },
  },

  /* ---------------- family: compare ------------------------------------ */
  {
    id: "E-compare-ignorecase", family: "compare", kind: "choice",
    docs: ["String.equalsIgnoreCase", "String.equals", "String.contains"],
    prompt: 'A quiz accepts "yes", "YES", or "Yes" as the same answer, but not "yes!" or "no".',
    question: "Which condition checks the answer correctly?",
    codeOptions: true,
    options: [
      ok('answer.equalsIgnoreCase("yes")'),
      no('answer.equals("yes")', 'equals is case-sensitive, so "YES" would be rejected.'),
      no('answer.contains("yes")', '"yes!" contains "yes", and "YES" doesn\'t (case matters).'),
      no('answer.compareTo("yes") == 0', 'compareTo is case-sensitive too; "YES" gives a non-zero result.'),
    ],
    explanation: "equalsIgnoreCase compares the whole String while treating uppercase and lowercase letters as the same.",
    jv: { kind: "cond", cases: [
      { setup: 'String answer = "YES";', expect: "true" },
      { setup: 'String answer = "yes";', expect: "true" },
      { setup: 'String answer = "yes!";', expect: "false" },
      { setup: 'String answer = "no";', expect: "false" },
    ] },
  },
  {
    id: "E-compare-order", family: "compare", kind: "choice",
    docs: ["String.compareTo"],
    prompt: "name1 and name2 are lowercase names.",
    question: "Which condition is true exactly when name1 comes before name2 alphabetically?",
    codeOptions: true,
    options: [
      ok("name1.compareTo(name2) < 0"),
      no("name1.compareTo(name2) == -1", 'The docs promise only “a value less than 0.” For "al" and "az" the result is -14, so this check fails.'),
      no("name1.compareTo(name2) > 0", "Greater than 0 means name1 comes after name2."),
      no("name1.length() < name2.length()", "Length has nothing to do with alphabetical order: \"bo\" is shorter than \"ana\" but comes later."),
    ],
    explanation: "Rely only on what the docs guarantee: the sign of the result. Testing for exactly -1 works for some inputs and silently fails for others.",
    jv: { kind: "cond", cases: [
      { setup: 'String name1 = "ana", name2 = "bo";', expect: "true" },
      { setup: 'String name1 = "al", name2 = "az";', expect: "true" },
      { setup: 'String name1 = "cy", name2 = "bo";', expect: "false" },
      { setup: 'String name1 = "bo", name2 = "bo";', expect: "false" },
    ] },
  },
  {
    id: "E-compare-equals", family: "compare", kind: "choice",
    docs: ["String.equals", "String.compareTo", "String.contains"],
    blocks: [{ label: "Excerpt", code: `String stored = "4417";
String entered = keypad.read();  // the digits the user typed`, java: { kind: "excerpt", support: "class Keypad { String read() { return new String(\"4417\"); } }", before: "void run(Keypad keypad) {", after: "}" } }],
    question: "Which condition checks whether entered matches stored?",
    codeOptions: true,
    options: [
      ok("entered.equals(stored)"),
      no("entered == stored", "== checks whether both variables refer to the same object. Text built at run time is usually a different object, even when the characters match."),
      no("entered.compareTo(stored) == 1", "Matching Strings give 0, not 1."),
      no("entered.contains(stored)", '"44170" contains "4417" but isn\'t a match.'),
    ],
    explanation: "equals compares the characters, which is what “matches” means here. Use == for Strings only when you truly mean “the same object.”",
    jv: { kind: "cond", cases: [
      { setup: 'String stored = "4417"; String entered = new String("4417");', expect: "true" },
      { setup: 'String stored = "4417"; String entered = new String("4418");', expect: "false" },
      { setup: 'String stored = "4417"; String entered = new String("44170");', expect: "false" },
    ] },
  },
];

export const MODE_ITEMS = {
  inspector: INSPECTOR,
  editor: EDITOR,
  builder: BUILDER,
  docs: DOCS_MODE,
  detective: DETECTIVE,
};

export const FAMILY_TITLES = {
  inspector: { why: "Explain a design decision", pre: "State a precondition", special: "Explain a special case", none: "When no comment is needed", surprise: "Warn about surprising behavior", expr: "Explain a tricky expression", prune: "Spot the comment that doesn't belong" },
  editor: { compare: "Comparison contradicts code", bound: "Boundary conditions", param: "Misleading @param", ret: "Incorrect @return", old: "Outdated documentation", red: "Unnecessary comment", throws: "Exception documentation" },
  builder: { calc: "Computed results", bool: "Boolean conditions", effect: "void methods & side effects", fields: "Fields vs. parameters", paths: "Several return paths", throws: "Methods that throw", range: "Inclusive vs. exclusive ranges" },
  docs: { predict: "Predict the result", range: "Valid arguments & edge cases", effect: "Changes the object or returns a result?", guarantee: "Guaranteed or assumed?", find: "Find it in the docs", overload: "Overloads & return types" },
  detective: { similar: "Similar-sounding methods", args: "Argument order & meaning", result: "Use the returned value", overload: "Choose the right overload", compose: "Combine calls", convert: "Convert values", compare: "Compare correctly" },
};
