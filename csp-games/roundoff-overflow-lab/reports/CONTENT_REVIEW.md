# Numerical content review

Implementation review, not independent teacher certification.

## Focus coverage

Integer Range: unsigned increment/add/product/double/pattern-count, below-zero results, zero product, narrower destination, inclusive counts; signed increment/decrement, negative addition/subtraction, minimum negation/absolute magnitude, signed product, cancellation, signedness transfer and negative narrowing. Several families deliberately contrast exact boundary cases with one-or-more-unit range violations. Two emphasize all-exact behavior rather than treating every arithmetic operation as an error.

Precision: decimal input/add/product/division/negative/trailing-zero/repeating-thirds/sevenths/means/percent; finite binary tenths/dyadic denominators/sums/products/thirds; significant decimal digits at large and small magnitudes, small additions, binary integer and fraction significands. A decimal can be exact in a decimal grid and inexact in a binary grid. Floating precision is significant digits, not a fixed number of decimal places.

Applications: sensor resolution, scaled cents, interest, ticks, intensity channels, robot coordinates, scientific ratios, archive numerical values, unit conversion, averages, network timing, game effects, audio amplitudes, elevations, divided bills, block estimates, dilution, power significant figures, simulation grids and signed rates. These name a destination format and exact result rather than treating a device or data type as an automatic answer.

## Ambiguity controls and mathematical oracle

- Every scenario identifies the destination representation, range and precision. A finite exact rational is supplied for the value under classification. No unspecified programming-language semantics.
- Roundoff cases are in range and the nearest supported value differs; Neither cases are exact and in range. Overflow cases are outside the declared range and do not claim a wrapped/stored result.
- Signed integer minima below zero are range overflow, not floating-point underflow. Too-small floating magnitudes are rejected by the teaching model and not in the bank.
- Explicit truncation is excluded; intensity storage specifies nearest-value behavior rather than silently assuming a cast. Different numerical formats can store the same decimal differently.
- Tests independently evaluate arithmetic, bit-shift bounds and representable-value sets; classification does not validate itself. Exact rational differences avoid browser float artifacts.
- Six variants vary numeric parameters; repeated identical rendered prompts were found and repaired during development. The final bank contains360 distinct prompts, not just360 IDs.

Educational terminology and range-versus-precision framing checked against College Board CED Topic2.1. Authoring constraints and math checks do not prove that every learner will interpret every sentence identically. Classroom review remains appropriate, especially teaching floating-point examples and application units.
