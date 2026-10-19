# Advanced CS catalog consolidation audit

Audited latest main at 6a845e9 (String Lab already integrated). All 15 top-level Java game entry points are playable applications. Class Builder — Rearrange remains a nested mode of Class & Object Lab, not a second catalog card. Session Summary and coverage are infrastructure.

Canonical catalog: https://davisjm4.github.io/cs-games/advanced/

## Before-change inventory

| Game | Public URL | Playable | In Advanced CS | Topic | Entry correction | Return correction |
|---|---|---|---|---|---|---|
| Array Lab | https://davisjm4.github.io/java-games/array-lab/ | Yes | Yes | 2.3 Arrays, 2.3 ArrayLists, 2.3 Two-Dimensional Arrays, 2.1 Searching | Deduplicate rendering | Yes → Advanced CS |
| ArrayList Lab | https://davisjm4.github.io/java-games/arraylist-lab/ | Yes | Yes | 2.3 ArrayLists, 2.3 Collection Operations, 2.3 Dynamic Collections, 2.3 Traversal, 2.3 Data Structures | Deduplicate rendering | Yes → Advanced CS |
| LinkedList Lab | https://davisjm4.github.io/java-games/linkedlist-lab/ | Yes | Yes | 2.3 LinkedLists, 2.3 Collection Operations, 2.3 Data Structures, 2.1 Algorithm Interpretation | Deduplicate rendering | Yes → Advanced CS |
| Boolean & Conditional Lab | https://davisjm4.github.io/java-games/boolean-conditional-lab/ | Yes | Yes | 2.2 Boolean Logic, 2.2 Conditionals | Deduplicate rendering | Yes → Advanced CS |
| Class & Object Lab | https://davisjm4.github.io/java-games/class-object-lab/ | Yes | Yes | 2.4 Classes and Objects, 2.4 Encapsulation, 2.4 Object-Oriented Programming | Description refreshed; Deduplicate rendering | Yes → Advanced CS |
| Debugger Lab | https://davisjm4.github.io/java-games/debugger-lab/ | Yes | Yes | 2.5 Debugging, 2.5 Testing, 2.2 Controls, 2.4 Methods | Deduplicate rendering | Yes → Advanced CS |
| Inheritance & Polymorphism Lab | https://davisjm4.github.io/java-games/inheritance-polymorphism-lab/ | Yes | Yes | 2.4 Inheritance, 2.4 Polymorphism, 2.4 Method Overriding, 2.4 Abstract Classes, 2.4 Object-Oriented Programming | Deduplicate rendering | Yes → Advanced CS |
| Documentation Lab | https://davisjm4.github.io/java-games/documentation-lab/ | Yes | Yes | 2.5 Documentation, 2.4 Methods, APIs, and Libraries | Description refreshed; Deduplicate rendering | Yes → Advanced CS |
| Loop Lab | https://davisjm4.github.io/java-games/loop-lab/ | Yes | Yes | 2.2 Loops, 2.2 Nested Loops, 2.1 Algorithm Interpretation | Deduplicate rendering | Yes → Advanced CS |
| Math Lab | https://davisjm4.github.io/java-games/math-lab/ | Yes | Yes | 2.3 Variables and Data Types, 2.1 Algorithm Interpretation | Deduplicate rendering | Yes → Advanced CS |
| Method & Constructor Lab | https://davisjm4.github.io/java-games/method-constructor-lab/ | Yes | Yes | 2.4 Methods and Parameters, 2.4 Constructors, 2.4 Modularity | Deduplicate rendering | Yes → Advanced CS |
| Recursion Lab | https://davisjm4.github.io/java-games/recursion-lab/ | Yes | Yes | 2.2 Recursion, 2.1 Algorithm Interpretation | Deduplicate rendering | Yes → Advanced CS |
| String Lab | https://davisjm4.github.io/java-games/string-lab/ | Yes | Yes | Strings, Indexing, String Methods, Output Tracing | Deduplicate rendering | No; already correct |
| Robot Algorithms | https://davisjm4.github.io/java-games/robot-algorithms/ | Yes | Yes | 2.1 Algorithm Development, 2.1 Classic Algorithms | Deduplicate rendering | Yes → Advanced CS |
| Variable Lab | https://davisjm4.github.io/java-games/variable-lab/ | Yes | Yes | 2.3 Variables and Data Types, 2.3 Scope | Description refreshed; Deduplicate rendering | Yes → Advanced CS |

## Changes

- Homepage-only HTML meta-refresh plus location.replace redirect, canonical URL, and ordinary fallback link. No directory-wide redirects.
- Fourteen game headers and the coverage return link now point directly to Advanced CS. String Lab and Session Summary already had correct navigation. Nested Class Builder retains its useful parent-game link.
- Advanced CS renders each activity once; all topic memberships remain searchable/filterable. CSP rendering is unchanged.
- Catalog descriptions reflect existing Trace the Variable, Class Builder, and API activities. No new catalog entries were needed.
- No generators, grading, scores, storage keys, tracking, or active-time code changed. No individual game moved.

Before: Advanced CS → Variable Lab → Back → Java Games homepage.

After: Advanced CS → Variable Lab → Back → Advanced CS.

## Reusable validation

Run `npm install --prefix java-games`, then `node cs-games/catalog-tests.mjs` or `npm run test:catalog --prefix java-games`. Discovers immediate child entry points rather than assuming a fixed game count; future nested standalone games should be added to the discovery policy if they are not modes. Covers catalog completeness, duplicates, entry points, primary return links, homepage redirect, nested Class Builder, Summary, search, every topic filter, CSP and Teacher Tools navigation.
