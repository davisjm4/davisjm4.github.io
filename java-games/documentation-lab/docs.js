/* Documentation Lab — Java API reference panels.
   Wording is adapted (lightly condensed, never extended) from the official
   Java SE 17 API specification (docs.oracle.com/en/java/javase/17/docs/api/).
   Every behavioral claim a challenge relies on is re-checked on a real JVM by
   tests/documentation-lab-jvm.test.mjs. "note" lines are Lab notes, not JDK text,
   and are rendered with a distinct label. */

export const DOCS = {
  /* ------------------------------ String ------------------------------ */
  "String.substring(int)": {
    cls: "java.lang.String",
    sig: "public String substring(int beginIndex)",
    desc: [
      "Returns a string that is a substring of this string.",
      "The substring begins with the character at the specified index and extends to the end of this string.",
    ],
    params: [["beginIndex", "the beginning index, inclusive."]],
    returns: "the specified substring.",
    throws: [["IndexOutOfBoundsException", "if beginIndex is negative or larger than the length of this String object."]],
  },
  "String.substring(int,int)": {
    cls: "java.lang.String",
    sig: "public String substring(int beginIndex, int endIndex)",
    desc: [
      "Returns a string that is a substring of this string.",
      "The substring begins at the specified beginIndex and extends to the character at index endIndex - 1.",
      "Thus the length of the substring is endIndex - beginIndex.",
    ],
    params: [
      ["beginIndex", "the beginning index, inclusive."],
      ["endIndex", "the ending index, exclusive."],
    ],
    returns: "the specified substring.",
    throws: [["IndexOutOfBoundsException", "if the beginIndex is negative, or endIndex is larger than the length of this String object, or beginIndex is larger than endIndex."]],
  },
  "String.indexOf(String)": {
    cls: "java.lang.String",
    sig: "public int indexOf(String str)",
    desc: ["Returns the index within this string of the first occurrence of the specified substring."],
    params: [["str", "the substring to search for."]],
    returns: "the index of the first occurrence of the specified substring, or -1 if there is no such occurrence.",
  },
  "String.indexOf(String,int)": {
    cls: "java.lang.String",
    sig: "public int indexOf(String str, int fromIndex)",
    desc: ["Returns the index within this string of the first occurrence of the specified substring, starting at the specified index."],
    params: [
      ["str", "the substring to search for."],
      ["fromIndex", "the index from which to start the search."],
    ],
    returns: "the index of the first occurrence of the specified substring, starting at the specified index, or -1 if there is no such occurrence.",
  },
  "String.charAt": {
    cls: "java.lang.String",
    sig: "public char charAt(int index)",
    desc: [
      "Returns the char value at the specified index. An index ranges from 0 to length() - 1.",
      "The first char value of the sequence is at index 0, the next at index 1, and so on, as for array indexing.",
    ],
    params: [["index", "the index of the char value."]],
    returns: "the char value at the specified index of this string. The first char value is at index 0.",
    throws: [["IndexOutOfBoundsException", "if the index argument is negative or not less than the length of this string."]],
  },
  "String.length": {
    cls: "java.lang.String",
    sig: "public int length()",
    desc: ["Returns the length of this string."],
    returns: "the length of the sequence of characters represented by this object.",
  },
  "String.equals": {
    cls: "java.lang.String",
    sig: "public boolean equals(Object anObject)",
    desc: [
      "Compares this string to the specified object.",
      "The result is true if and only if the argument is not null and is a String object that represents the same sequence of characters as this object.",
    ],
    params: [["anObject", "The object to compare this String against"]],
    returns: "true if the given object represents a String equivalent to this string, false otherwise",
  },
  "String.equalsIgnoreCase": {
    cls: "java.lang.String",
    sig: "public boolean equalsIgnoreCase(String anotherString)",
    desc: [
      "Compares this String to another String, ignoring case considerations.",
      "Two strings are considered equal ignoring case if they are of the same length and corresponding characters in the two strings are equal ignoring case.",
    ],
    params: [["anotherString", "The String to compare this String against"]],
    returns: "true if the argument is not null and it represents an equivalent String ignoring case; false otherwise",
  },
  "String.compareTo": {
    cls: "java.lang.String",
    sig: "public int compareTo(String anotherString)",
    desc: [
      "Compares two strings lexicographically. The comparison is based on the Unicode value of each character in the strings.",
    ],
    params: [["anotherString", "the String to be compared."]],
    returns: "the value 0 if the argument string is equal to this string; a value less than 0 if this string is lexicographically less than the string argument; and a value greater than 0 if this string is lexicographically greater than the string argument.",
    note: "Uppercase letters A–Z have smaller Unicode values than lowercase letters a–z.",
  },
  "String.contains": {
    cls: "java.lang.String",
    sig: "public boolean contains(CharSequence s)",
    desc: ["Returns true if and only if this string contains the specified sequence of char values."],
    params: [["s", "the sequence to search for"]],
    returns: "true if this string contains s, false otherwise",
    note: "A String can be passed wherever a CharSequence is expected.",
  },
  "String.startsWith": {
    cls: "java.lang.String",
    sig: "public boolean startsWith(String prefix)",
    desc: ["Tests if this string starts with the specified prefix."],
    params: [["prefix", "the prefix."]],
    returns: "true if the character sequence represented by the argument is a prefix of the character sequence represented by this string; false otherwise. Note also that true will be returned if the argument is an empty string or is equal to this String object as determined by the equals(Object) method.",
  },
  "String.toUpperCase": {
    cls: "java.lang.String",
    sig: "public String toUpperCase()",
    desc: [
      "Converts all of the characters in this String to upper case using the rules of the default locale.",
      "From the String class description: Strings are constant; their values cannot be changed after they are created.",
    ],
    returns: "the String, converted to uppercase.",
  },
  "String.replace(char,char)": {
    cls: "java.lang.String",
    sig: "public String replace(char oldChar, char newChar)",
    desc: [
      "Returns a string resulting from replacing all occurrences of oldChar in this string with newChar.",
      "If the character oldChar does not occur in the character sequence represented by this String object, then a reference to this String object is returned.",
    ],
    params: [
      ["oldChar", "the old character."],
      ["newChar", "the new character."],
    ],
    returns: "a string derived from this string by replacing every occurrence of oldChar with newChar.",
  },

  /* ------------------------------- Math ------------------------------- */
  "Math.abs(int)": {
    cls: "java.lang.Math",
    sig: "public static int abs(int a)",
    desc: [
      "Returns the absolute value of an int value. If the argument is not negative, the argument is returned. If the argument is negative, the negation of the argument is returned.",
      "Note that if the argument is equal to the value of Integer.MIN_VALUE, the most negative representable int value, the result is that same value, which is negative.",
    ],
    params: [["a", "the argument whose absolute value is to be determined"]],
    returns: "the absolute value of the argument.",
  },
  "Math.max(int,int)": {
    cls: "java.lang.Math",
    sig: "public static int max(int a, int b)",
    desc: [
      "Returns the greater of two int values. That is, the result is the argument closer to the value of Integer.MAX_VALUE.",
      "If the arguments have the same value, the result is that same value.",
    ],
    params: [["a", "an argument."], ["b", "another argument."]],
    returns: "the larger of a and b.",
  },
  "Math.max(double,double)": {
    cls: "java.lang.Math",
    sig: "public static double max(double a, double b)",
    desc: [
      "Returns the greater of two double values. That is, the result is the argument closer to positive infinity.",
      "If the arguments have the same value, the result is that same value. If either value is NaN, then the result is NaN.",
    ],
    params: [["a", "an argument."], ["b", "another argument."]],
    returns: "the larger of a and b.",
  },
  "Math.min(int,int)": {
    cls: "java.lang.Math",
    sig: "public static int min(int a, int b)",
    desc: [
      "Returns the smaller of two int values. That is, the result the argument closer to the value of Integer.MIN_VALUE.",
      "If the arguments have the same value, the result is that same value.",
    ],
    params: [["a", "an argument."], ["b", "another argument."]],
    returns: "the smaller of a and b.",
  },
  "Math.sqrt": {
    cls: "java.lang.Math",
    sig: "public static double sqrt(double a)",
    desc: [
      "Returns the correctly rounded positive square root of a double value.",
      "Special cases: If the argument is NaN or less than zero, then the result is NaN. If the argument is positive infinity, then the result is positive infinity. If the argument is positive zero or negative zero, then the result is the same as the argument.",
    ],
    params: [["a", "a value."]],
    returns: "the positive square root of a. If the argument is NaN or less than zero, the result is NaN.",
  },
  "Math.round(double)": {
    cls: "java.lang.Math",
    sig: "public static long round(double a)",
    desc: [
      "Returns the closest long to the argument, with ties rounding to positive infinity.",
      "Special cases: If the argument is NaN, the result is 0.",
    ],
    params: [["a", "a floating-point value to be rounded to a long."]],
    returns: "the value of the argument rounded to the nearest long value.",
  },
  "Math.random": {
    cls: "java.lang.Math",
    sig: "public static double random()",
    desc: [
      "Returns a double value with a positive sign, greater than or equal to 0.0 and less than 1.0.",
      "Returned values are chosen pseudorandomly with (approximately) uniform distribution from that range.",
    ],
    returns: "a pseudorandom double greater than or equal to 0.0 and less than 1.0.",
  },

  /* ---------------------------- ArrayList ----------------------------- */
  "ArrayList.add(E)": {
    cls: "java.util.ArrayList<E>",
    sig: "public boolean add(E e)",
    desc: ["Appends the specified element to the end of this list."],
    params: [["e", "element to be appended to this list"]],
    returns: "true (as specified by Collection.add(E))",
  },
  "ArrayList.add(int,E)": {
    cls: "java.util.ArrayList<E>",
    sig: "public void add(int index, E element)",
    desc: [
      "Inserts the specified element at the specified position in this list.",
      "Shifts the element currently at that position (if any) and any subsequent elements to the right (adds one to their indices).",
    ],
    params: [
      ["index", "index at which the specified element is to be inserted"],
      ["element", "element to be inserted"],
    ],
    throws: [["IndexOutOfBoundsException", "if the index is out of range (index < 0 || index > size())"]],
  },
  "ArrayList.get": {
    cls: "java.util.ArrayList<E>",
    sig: "public E get(int index)",
    desc: ["Returns the element at the specified position in this list."],
    params: [["index", "index of the element to return"]],
    returns: "the element at the specified position in this list",
    throws: [["IndexOutOfBoundsException", "if the index is out of range (index < 0 || index >= size())"]],
  },
  "ArrayList.set": {
    cls: "java.util.ArrayList<E>",
    sig: "public E set(int index, E element)",
    desc: ["Replaces the element at the specified position in this list with the specified element."],
    params: [
      ["index", "index of the element to replace"],
      ["element", "element to be stored at the specified position"],
    ],
    returns: "the element previously at the specified position",
    throws: [["IndexOutOfBoundsException", "if the index is out of range (index < 0 || index >= size())"]],
  },
  "ArrayList.remove(int)": {
    cls: "java.util.ArrayList<E>",
    sig: "public E remove(int index)",
    desc: [
      "Removes the element at the specified position in this list.",
      "Shifts any subsequent elements to the left (subtracts one from their indices).",
    ],
    params: [["index", "the index of the element to be removed"]],
    returns: "the element that was removed from the list",
    throws: [["IndexOutOfBoundsException", "if the index is out of range (index < 0 || index >= size())"]],
  },
  "ArrayList.remove(Object)": {
    cls: "java.util.ArrayList<E>",
    sig: "public boolean remove(Object o)",
    desc: [
      "Removes the first occurrence of the specified element from this list, if it is present.",
      "If the list does not contain the element, it is unchanged.",
    ],
    params: [["o", "element to be removed from this list, if present"]],
    returns: "true if this list contained the specified element",
  },
  "ArrayList.size": {
    cls: "java.util.ArrayList<E>",
    sig: "public int size()",
    desc: ["Returns the number of elements in this list."],
    returns: "the number of elements in this list",
  },
  "ArrayList.indexOf": {
    cls: "java.util.ArrayList<E>",
    sig: "public int indexOf(Object o)",
    desc: ["Returns the index of the first occurrence of the specified element in this list, or -1 if this list does not contain the element."],
    params: [["o", "element to search for"]],
    returns: "the index of the first occurrence of the specified element in this list, or -1 if this list does not contain the element",
  },

  /* ------------------------ Wrapper classes --------------------------- */
  "Integer.parseInt": {
    cls: "java.lang.Integer",
    sig: "public static int parseInt(String s) throws NumberFormatException",
    desc: [
      "Parses the string argument as a signed decimal integer.",
      "The characters in the string must all be decimal digits, except that the first character may be an ASCII minus sign '-' to indicate a negative value or an ASCII plus sign '+' to indicate a positive value.",
    ],
    params: [["s", "a String containing the int representation to be parsed"]],
    returns: "the integer value represented by the argument in decimal.",
    throws: [["NumberFormatException", "if the string does not contain a parsable integer."]],
  },
  "Integer.toString(int)": {
    cls: "java.lang.Integer",
    sig: "public static String toString(int i)",
    desc: ["Returns a String object representing the specified integer."],
    params: [["i", "an integer to be converted."]],
    returns: "a string representation of the argument in base 10.",
  },
  "Integer.valueOf(int)": {
    cls: "java.lang.Integer",
    sig: "public static Integer valueOf(int i)",
    desc: ["Returns an Integer instance representing the specified int value."],
    params: [["i", "an int value."]],
    returns: "an Integer instance representing i.",
  },
  "Double.parseDouble": {
    cls: "java.lang.Double",
    sig: "public static double parseDouble(String s) throws NumberFormatException",
    desc: ["Returns a new double initialized to the value represented by the specified String, as performed by the valueOf method of class Double."],
    params: [["s", "the string to be parsed."]],
    returns: "the double value represented by the string argument.",
    throws: [
      ["NullPointerException", "if the string is null"],
      ["NumberFormatException", "if the string does not contain a parsable double."],
    ],
  },
  "Character.isUpperCase": {
    cls: "java.lang.Character",
    sig: "public static boolean isUpperCase(char ch)",
    desc: ["Determines if the specified character is an uppercase character."],
    params: [["ch", "the character to be tested."]],
    returns: "true if the character is uppercase; false otherwise.",
  },
  "Character.isLetter": {
    cls: "java.lang.Character",
    sig: "public static boolean isLetter(char ch)",
    desc: ["Determines if the specified character is a letter."],
    params: [["ch", "the character to be tested."]],
    returns: "true if the character is a letter, false otherwise.",
  },
  "Character.toUpperCase": {
    cls: "java.lang.Character",
    sig: "public static char toUpperCase(char ch)",
    desc: ["Converts the character argument to uppercase using case mapping information from the UnicodeData file."],
    params: [["ch", "the character to be converted."]],
    returns: "the uppercase equivalent of the character, if any; otherwise, the character itself.",
  },
  "Character.getNumericValue": {
    cls: "java.lang.Character",
    sig: "public static int getNumericValue(char ch)",
    desc: [
      "Returns the int value that the specified Unicode character represents.",
      "The letters A-Z in their uppercase ('\\u0041' through '\\u005A') and lowercase ('\\u0061' through '\\u007A') forms have numeric values from 10 through 35.",
      "If the character does not have a numeric value, then -1 is returned.",
    ],
    params: [["ch", "the character to be converted."]],
    returns: "the numeric value of the character, as a nonnegative int value; -1 if the character has no numeric value.",
    note: "Condensed: the full JDK page also covers Roman numerals, full-width letters, and fractional values (which return -2).",
  },
};

/* Stable line ids used for "click the line" questions. */
export function docLines(key) {
  const d = DOCS[key];
  if (!d) throw new Error("Unknown doc " + key);
  const lines = [{ id: "sig", section: "Signature", text: d.sig }];
  d.desc.forEach((t, i) => lines.push({ id: "desc" + i, section: "Description", text: t }));
  for (const [n, t] of d.params || []) lines.push({ id: "param:" + n, section: "Parameters", name: n, text: t });
  if (d.returns) lines.push({ id: "returns", section: "Returns", text: d.returns });
  for (const [n, t] of d.throws || []) lines.push({ id: "throws:" + n, section: "Throws", name: n, text: t });
  if (d.note) lines.push({ id: "note", section: "Lab note", text: d.note });
  return lines;
}
