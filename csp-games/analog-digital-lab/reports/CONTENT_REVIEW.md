# Authored instructional review corpus

60 contrast families / 120 semantic cases. Implementation review: each named target and explanation was checked against the stated continuous-valued or discrete-code model and primary conversion references. This is not external educator or classroom certification. Six presentation stems are excluded from this count.

## audio-groove — Sound and recordings

Distinction: Groove shape versus encoded amplitudes.

- Scenario: A turntable follows the varying sideways shape of a vinyl groove.
- Classify: **the sound representation in the groove**
- Expected: **Analog**
- Feature/evidence: The groove shape follows waveform changes between positions rather than selecting numbered sound levels.

- Scenario: A recording of the same performance contains a sequence of 16-bit amplitude numbers.
- Classify: **the stored sound representation**
- Expected: **Digital**
- Feature/evidence: Each amplitude is represented by one of a finite set of 16-bit codes.

## audio-tape — Sound and recordings

Distinction: Magnetization versus file codes.

- Scenario: An audio tape records a voice through smoothly varying magnetization along its length.
- Classify: **the voice representation on this tape**
- Expected: **Analog**
- Feature/evidence: Changes in magnetization directly follow changes in the voice signal.

- Scenario: An archive transfers that tape into a file of numbered amplitude samples.
- Classify: **the voice representation in the file**
- Expected: **Digital**
- Feature/evidence: The file represents amplitudes as separate numerical codes rather than magnetization variations.

## audio-preamp — Sound and recordings

Distinction: Amplifier signal versus processing words.

- Scenario: Inside a digital recorder, the microphone preamplifier produces a voltage that follows the voice before conversion.
- Classify: **the preamplifier output**
- Expected: **Analog**
- Feature/evidence: The voltage can vary between the values that a later converter will encode.

- Scenario: A recorder's processor receives signed integer amplitude values from its converter.
- Classify: **the processor input values**
- Expected: **Digital**
- Feature/evidence: The processor operates on separate integer codes for the measured amplitudes.

## audio-cone — Sound and recordings

Distinction: Playback motion versus instruction codes.

- Scenario: A speaker cone moves back and forth in response to a music signal.
- Classify: **the cone's position as it represents the sound waveform**
- Expected: **Analog**
- Feature/evidence: The cone passes through intermediate positions, rather than being limited to numbered sound positions.

- Scenario: A playback buffer holds the next 500 encoded amplitude values for a speaker system.
- Classify: **the buffer's representation**
- Expected: **Digital**
- Feature/evidence: It stores individually coded amplitude values, even though playback will produce moving air.

## audio-pressure — Sound and recordings

Distinction: Acoustic pressure versus measured samples.

- Scenario: A phone records a singer. Consider the changing air pressure reaching its microphone, not the file.
- Classify: **the incoming air-pressure variation**
- Expected: **Analog**
- Feature/evidence: The pressure changes through intermediate levels; the recording device does not turn the incoming phenomenon into a code.

- Scenario: The phone saves pressure measurements rounded to one of 65,536 amplitude levels.
- Classify: **the saved measurements**
- Expected: **Digital**
- Feature/evidence: The measurements have been mapped to a fixed set of possible amplitude codes.

## images-film — Images and photographs

Distinction: Optical density versus pixel codes.

- Scenario: In a simplified continuous-tone film model, local darkness varies without an assigned numbered shade palette.
- Classify: **the film's tone representation in this model**
- Expected: **Analog**
- Feature/evidence: Tone is represented by varying optical density rather than a selected shade code.

- Scenario: An image file assigns each pixel an integer shade from 0 through 255.
- Classify: **the file's tone representation**
- Expected: **Digital**
- Feature/evidence: The shade is selected from 256 separate values at each pixel.

## images-raster — Images and photographs

Distinction: Scene brightness versus raster cells.

- Scenario: A scanner shines light across a photograph; the light arriving at its detector varies in intensity before encoding.
- Classify: **the arriving light intensity**
- Expected: **Analog**
- Feature/evidence: Intermediate intensities are possible before the scanner assigns pixel values.

- Scenario: The scanner stores a rectangular grid of red, green and blue integer values.
- Classify: **the stored image grid**
- Expected: **Digital**
- Feature/evidence: Each grid location contains separately coded channel values.

## images-fax — Images and photographs

Distinction: Scanning voltage versus transmitted bits.

- Scenario: Before a fax scanner converts a page, its light detector produces a voltage following the brightness along a line.
- Classify: **the detector voltage before conversion**
- Expected: **Analog**
- Feature/evidence: The signal follows brightness variations without selecting a stored bit code.

- Scenario: A fax message encodes a line as a sequence of black-or-white decisions.
- Classify: **the encoded line**
- Expected: **Digital**
- Feature/evidence: Each location is represented by one of two permitted states.

## images-gradient — Images and photographs

Distinction: Continuous-tone print versus coded printed cells.

- Scenario: A continuous-tone photographic print is described by smoothly varying dye density, not by a pixel file.
- Classify: **the specified dye-density representation**
- Expected: **Analog**
- Feature/evidence: The tone in this model varies through intermediate densities; the paper medium alone is not the reason.

- Scenario: A printed code represents a message using a fixed grid of black-or-white squares.
- Classify: **the message representation in that grid**
- Expected: **Digital**
- Feature/evidence: The printed cells encode discrete states; being on paper does not make the code analog.

## images-palette — Images and photographs

Distinction: Optical blending versus indexed palette.

- Scenario: An optical filter varies light transmission smoothly across its surface before any image is sampled.
- Classify: **the filter's light-transmission representation**
- Expected: **Analog**
- Feature/evidence: Transmission can take intermediate values rather than a limited shade index.

- Scenario: An indexed image stores a palette entry number for every pixel.
- Classify: **the palette-index representation**
- Expected: **Digital**
- Feature/evidence: Each pixel selects one item from a finite list of color codes.

## environment-column — Environmental measurements

Distinction: Liquid height versus rounded temperature.

- Scenario: The liquid column in a thermometer rises through positions between its scale marks.
- Classify: **the column height representing temperature**
- Expected: **Analog**
- Feature/evidence: Position varies between marks; the printed marks do not restrict the physical height to a set of codes.

- Scenario: A thermometer displays temperature rounded to the nearest tenth of a degree.
- Classify: **the displayed temperature representation**
- Expected: **Digital**
- Feature/evidence: Only separate tenth-degree readings can appear, even though temperature itself varies between them.

## environment-humidity — Environmental measurements

Distinction: Humidity signal versus numeric log.

- Scenario: A humidity probe produces an output voltage proportional to humidity before its converter.
- Classify: **the probe output voltage**
- Expected: **Analog**
- Feature/evidence: The voltage represents humidity by a continuously variable amount.

- Scenario: A weather logger records humidity as a whole-number percentage each minute.
- Classify: **the recorded humidity values**
- Expected: **Digital**
- Feature/evidence: The log contains separate timed measurements rounded to whole percentages.

## environment-threshold — Environmental measurements

Distinction: Water level versus threshold status.

- Scenario: A reservoir's water surface moves through heights between the gauge markings.
- Classify: **the measured water height itself**
- Expected: **Analog**
- Feature/evidence: The water height can vary between labeled marks; the gauge labels do not quantize the water.

- Scenario: An alarm stores only whether reservoir height is ABOVE or BELOW a threshold.
- Classify: **the stored alarm status**
- Expected: **Digital**
- Feature/evidence: The many possible water heights have been reduced to two coded states.

## environment-chemistry — Environmental measurements

Distinction: Chemical signal versus precision-limited reading.

- Scenario: A pH electrode supplies a voltage related to acidity before numerical conversion.
- Classify: **the electrode's output signal**
- Expected: **Analog**
- Feature/evidence: Its voltage varies with acidity rather than being a selected pH text code.

- Scenario: A chemistry meter writes pH readings with exactly two decimal places into a table.
- Classify: **the table's pH representation**
- Expected: **Digital**
- Feature/evidence: The representation permits separate hundredth-step readings, not every intermediate pH value.

## environment-pressure — Environmental measurements

Distinction: Pressure gauge motion versus encoded telemetry.

- Scenario: A flexible diaphragm changes position as air pressure changes in a mechanical gauge.
- Classify: **the diaphragm displacement representing pressure**
- Expected: **Analog**
- Feature/evidence: Displacement varies between positions rather than selecting one of several status codes.

- Scenario: A pressure station sends each reading as an unsigned 12-bit number.
- Classify: **the transmitted reading code**
- Expected: **Digital**
- Feature/evidence: A 12-bit field has a finite set of possible numerical values.

## time-dial — Time and clocks

Distinction: Hand position versus digit display.

- Scenario: An ideal sweeping clock hand passes through intermediate angles between tick marks.
- Classify: **the hand position representing time**
- Expected: **Analog**
- Feature/evidence: The hand's angle changes between marks instead of selecting only displayed numeral codes.

- Scenario: A clock display updates from 10:04:12 to 10:04:13 using whole-second numerals.
- Classify: **the displayed time representation**
- Expected: **Digital**
- Feature/evidence: The display selects separate whole-second values; time itself is not being classified.

## time-ticks — Time and clocks

Distinction: Elapsed interval versus counted ticks.

- Scenario: A race has an elapsed duration that can fall between the values shown by its timer.
- Classify: **the elapsed duration itself**
- Expected: **Analog**
- Feature/evidence: The interval is modeled as continuous even if a timer reports rounded measurements.

- Scenario: A timing program represents duration by counting whole clock ticks.
- Classify: **the tick-count representation**
- Expected: **Digital**
- Feature/evidence: The counter can hold only separate integer counts.

## time-stopwatch — Time and clocks

Distinction: Sweep movement versus rounded finish time.

- Scenario: A stopwatch has a smoothly sweeping pointer whose angular position represents elapsed time.
- Classify: **the pointer's positional representation**
- Expected: **Analog**
- Feature/evidence: Intermediate pointer positions represent intermediate elapsed durations.

- Scenario: A meet records finish times rounded to hundredths of a second.
- Classify: **the recorded finish-time values**
- Expected: **Digital**
- Feature/evidence: The recorded result uses hundredth-second steps rather than every possible duration.

## time-phase — Time and clocks

Distinction: Oscillation phase versus state labels.

- Scenario: In a clock model, a pendulum swings through intermediate angles.
- Classify: **the pendulum angle over time**
- Expected: **Analog**
- Feature/evidence: The angle is not restricted to a list of coded positions.

- Scenario: A clock monitor labels pendulum position LEFT, CENTER or RIGHT.
- Classify: **the monitor's position labels**
- Expected: **Digital**
- Feature/evidence: The representation reduces many physical positions to three discrete categories.

## time-timestamps — Time and clocks

Distinction: Ongoing time versus event records.

- Scenario: A monitoring system watches an ongoing time interval between two logged events.
- Classify: **the time passing between the events**
- Expected: **Analog**
- Feature/evidence: Logging endpoints does not make the intervening physical interval a set of stored codes.

- Scenario: The monitor stores event timestamps as integer milliseconds.
- Classify: **the stored timestamps**
- Expected: **Digital**
- Feature/evidence: Integer millisecond codes represent times using fixed increments.

## motion-steering — Motion and position

Distinction: Proportional position signal versus position code.

- Scenario: A steering-position potentiometer changes its output voltage as the shaft rotates before conversion.
- Classify: **the position voltage**
- Expected: **Analog**
- Feature/evidence: The signal varies with intermediate shaft angles without being a numbered angle code.

- Scenario: A robot stores steering angle as an integer from 0 through 359.
- Classify: **the stored angle**
- Expected: **Digital**
- Feature/evidence: The program uses one of 360 separate angle codes.

## motion-encoder — Motion and position

Distinction: Wheel angle versus encoder count.

- Scenario: A wheel rotates through intermediate angles between the marks on its rim.
- Classify: **the wheel angle itself**
- Expected: **Analog**
- Feature/evidence: Marks provide reference points but do not restrict the wheel to those angles.

- Scenario: A wheel encoder reports how many slots have passed a detector.
- Classify: **the reported slot count**
- Expected: **Digital**
- Feature/evidence: The count changes in whole-number increments, rather than representing every angle directly.

## motion-speed — Motion and position

Distinction: Needle position versus speed numerals.

- Scenario: A speedometer's needle moves through positions between its labeled speed marks.
- Classify: **the needle position representing speed**
- Expected: **Analog**
- Feature/evidence: The position can represent intermediate speeds between printed labels.

- Scenario: A dashboard shows speed rounded to the nearest whole kilometer per hour.
- Classify: **the displayed speed**
- Expected: **Digital**
- Feature/evidence: Only discrete whole-number readings are shown.

## motion-coordinates — Motion and position

Distinction: Actual location versus coordinate precision.

- Scenario: A navigation app tracks a cyclist. Consider the cyclist's physical position between its map updates.
- Classify: **the physical position**
- Expected: **Analog**
- Feature/evidence: The cyclist moves through intermediate locations; update frequency does not quantize the motion itself.

- Scenario: A location log saves latitude and longitude with five digits after the decimal point.
- Classify: **the logged coordinates**
- Expected: **Digital**
- Feature/evidence: The saved representation uses a fixed precision and separate coordinate values.

## motion-acceleration — Motion and position

Distinction: Acceleration signal versus coded samples.

- Scenario: An accelerometer's output voltage changes with acceleration before an ADC reads it.
- Classify: **the voltage before the ADC**
- Expected: **Analog**
- Feature/evidence: The signal can vary between the levels later assigned codes.

- Scenario: A motion program receives a list of signed 16-bit acceleration readings.
- Classify: **the list's representation**
- Expected: **Digital**
- Feature/evidence: Each reading is encoded as one of the available 16-bit values.

## electrical-logic — Electrical signals

Distinction: Raw noise magnitude versus logical symbols.

- Scenario: A lab measures the small changing noise voltage superimposed on a wire carrying bits.
- Classify: **the noise voltage itself, not the bit message**
- Expected: **Analog**
- Feature/evidence: Noise magnitude is a varying physical quantity; it is not the sequence of logical bit decisions.

- Scenario: A receiver interprets a wire's signal as a sequence of 0 and 1 symbols.
- Classify: **the recovered logical message**
- Expected: **Digital**
- Feature/evidence: Only two allowed symbols represent the information, despite physical voltage variation.

## electrical-dimmer — Electrical signals

Distinction: Variable level versus switch states.

- Scenario: A controller represents desired brightness with a voltage adjustable to any level in its operating range.
- Classify: **the brightness-control representation**
- Expected: **Analog**
- Feature/evidence: The amount of voltage directly represents brightness through intermediate levels.

- Scenario: Another controller sends a brightness command as an 8-bit code.
- Classify: **the brightness command**
- Expected: **Digital**
- Feature/evidence: The requested brightness is represented by one of 256 possible codes.

## electrical-modulation — Electrical signals

Distinction: Carrier parameter versus recovered symbols.

- Scenario: A radio signal represents speech by continuously varying its carrier frequency with the voice signal.
- Classify: **the speech representation in that frequency variation**
- Expected: **Analog**
- Feature/evidence: Frequency deviations directly track the speech waveform, rather than selecting message symbols.

- Scenario: A receiver recovers text from a radio link as a sequence of coded symbols.
- Classify: **the recovered text data**
- Expected: **Digital**
- Feature/evidence: The message consists of discrete symbol codes; the use of radio does not decide the classification.

## electrical-waveform — Electrical signals

Distinction: Measured waveform versus oscilloscope data.

- Scenario: A scope input receives a smoothly varying test voltage before digitization.
- Classify: **the incoming test voltage**
- Expected: **Analog**
- Feature/evidence: The signal can take intermediate amplitudes in its range.

- Scenario: A scope memory contains 8-bit voltage codes collected at separate instants.
- Classify: **the scope-memory representation**
- Expected: **Digital**
- Feature/evidence: Both timing and amplitude are represented by individually stored quantized samples.

## electrical-resistance — Electrical signals

Distinction: Resistance magnitude versus switch-state coding.

- Scenario: A flexible strip represents its bend amount through smoothly changing electrical resistance.
- Classify: **the resistance representing bend amount**
- Expected: **Analog**
- Feature/evidence: Intermediate bend amounts produce intermediate resistance values, rather than numbered setting codes.

- Scenario: A circuit represents a three-bit word with three switches, each open or closed.
- Classify: **the switch-state encoding**
- Expected: **Digital**
- Feature/evidence: Each switch selects between two permitted states to encode a bit; electrical hardware can carry discrete information.

## sensors-light — Sensors and measurements

Distinction: Photocurrent versus light-status decision.

- Scenario: A light sensor supplies a current proportional to incoming light before thresholding.
- Classify: **the sensor current**
- Expected: **Analog**
- Feature/evidence: The current varies with light intensity through intermediate levels.

- Scenario: A night-light controller stores LIGHT or DARK after comparing that sensor reading with a threshold.
- Classify: **the controller's status representation**
- Expected: **Digital**
- Feature/evidence: The decision is encoded as two separate states, even if the incoming signal is analog.

## sensors-touch — Sensors and measurements

Distinction: Pressure amount versus contact bit.

- Scenario: A pressure-sensitive pad produces a varying voltage for the amount of force applied.
- Classify: **the force representation in that voltage**
- Expected: **Analog**
- Feature/evidence: The amount is represented by intermediate voltage levels, not just contact/no-contact.

- Scenario: A touch interface reports only whether a pad is pressed.
- Classify: **the reported contact state**
- Expected: **Digital**
- Feature/evidence: The output is a two-state representation rather than a measurement of every force level.

## sensors-distance — Sensors and measurements

Distinction: Range voltage versus rounded distance.

- Scenario: A range sensor supplies a voltage proportional to distance before digitizing it.
- Classify: **the distance voltage**
- Expected: **Analog**
- Feature/evidence: The voltage directly varies with intermediate distances.

- Scenario: A robot receives range readings rounded to whole centimeters.
- Classify: **the received readings**
- Expected: **Digital**
- Feature/evidence: The representation is restricted to separate centimeter values.

## sensors-resolution — Sensors and measurements

Distinction: Measured mass versus converter resolution.

- Scenario: A load cell bends and produces a voltage as an object is weighed.
- Classify: **the load-cell voltage before conversion**
- Expected: **Analog**
- Feature/evidence: Its magnitude varies with load; a later converter's bit depth does not make this input a bit code.

- Scenario: The scale transmits a 24-bit code for each load-cell reading.
- Classify: **the transmitted scale reading**
- Expected: **Digital**
- Feature/evidence: Even high resolution still gives a finite set of possible numerical codes.

## sensors-interface — Sensors and measurements

Distinction: Sensor origin versus interface format.

- Scenario: A sensor board marketed for computers provides an unconverted varying-voltage output proportional to temperature.
- Classify: **the specified output, before conversion**
- Expected: **Analog**
- Feature/evidence: Its computer-compatible packaging does not change the continuously variable output representation.

- Scenario: A temperature sensor sends its reading in a binary message over a serial interface.
- Classify: **the message representation**
- Expected: **Digital**
- Feature/evidence: The interface carries encoded numerical symbols; the physical temperature remains a different quantity.

## storage-storage-medium — Storage and communication

Distinction: Continuous trace versus symbolic marks.

- Scenario: A chart recorder stores a varying measurement as the height of an ink trace on moving paper.
- Classify: **the trace height representing the measurement**
- Expected: **Analog**
- Feature/evidence: Intermediate trace positions represent intermediate amounts; paper alone is not the deciding property.

- Scenario: A punched card encodes a message using hole/no-hole positions.
- Classify: **the card's message representation**
- Expected: **Digital**
- Feature/evidence: Two allowed states at specified positions encode the information, despite the old physical medium.

## storage-communication — Storage and communication

Distinction: Proportional transmission versus packet payload.

- Scenario: A measurement is sent by a wire whose voltage directly follows the changing measurement amount.
- Classify: **the representation being sent**
- Expected: **Analog**
- Feature/evidence: The voltage amount directly represents a range of measurement values.

- Scenario: A network packet carries the measurement as binary integer fields.
- Classify: **the packet payload**
- Expected: **Digital**
- Feature/evidence: The data consists of discrete numerical codes, not the physical quantity being measured.

## storage-compression — Storage and communication

Distinction: Continuous recording versus compressed codes.

- Scenario: A varying-voltage sound signal undergoes dynamic-range compression without sampling or numerical encoding.
- Classify: **the signal after the range-reduction process**
- Expected: **Analog**
- Feature/evidence: Reducing the range of amplitudes changes the signal, but does not turn the varying voltage into numerical codes.

- Scenario: A compressed audio file stores coded data from which a decoder computes numerical samples.
- Classify: **the compressed file representation**
- Expected: **Digital**
- Feature/evidence: Compression changes the coding but the file still consists of discrete symbols.

## storage-copying — Storage and communication

Distinction: Waveform copy versus bit copy.

- Scenario: A recorder copies a varying-voltage sound signal onto another continuously magnetized audio track.
- Classify: **the copied sound representation**
- Expected: **Analog**
- Feature/evidence: The copy uses a varying physical magnitude to represent the waveform.

- Scenario: A storage program copies every bit of an image file to another drive.
- Classify: **the copied representation**
- Expected: **Digital**
- Feature/evidence: Copying preserves the file's discrete bit codes; the new medium does not change its digital nature.

## storage-symbols — Storage and communication

Distinction: Proportional trace versus numeric text.

- Scenario: A seismograph records ground movement using the displacement of a pen trace.
- Classify: **the trace's displacement representation**
- Expected: **Analog**
- Feature/evidence: The displacement represents intermediate motion amounts directly.

- Scenario: A report prints ground-motion measurements as decimal numerals with two fractional digits.
- Classify: **the printed numerical representation**
- Expected: **Digital**
- Feature/evidence: Finite-precision numerals are discrete codes, even when printed on paper.

## sampling-input-versus-samples — Continuous and sampled signals

Distinction: Full waveform versus quantized measurements.

- Scenario: A logger will read a voltage once per second. Consider the voltage changing between readings before conversion.
- Classify: **the source voltage**
- Expected: **Analog**
- Feature/evidence: Choosing reading times does not restrict the unconverted source to numerical levels.

- Scenario: The logger stores each reading as a rounded 10-bit amplitude number once per second.
- Classify: **the stored sequence**
- Expected: **Digital**
- Feature/evidence: It contains measurements at separate times with amplitudes restricted to available codes.

## sampling-rate — Continuous and sampled signals

Distinction: Original motion versus more frequent digital records.

- Scenario: A camera changes its frame rate. Consider the actual motion of a swinging object in front of it.
- Classify: **the object's motion**
- Expected: **Analog**
- Feature/evidence: A different camera sampling rate does not turn the physical motion into stored codes.

- Scenario: The camera now saves twice as many frames per second, each containing integer pixel values.
- Classify: **the saved representation**
- Expected: **Digital**
- Feature/evidence: More frequent sampling remains a sequence of discrete coded images.

## sampling-depth — Continuous and sampled signals

Distinction: Input amplitude versus finer quantization.

- Scenario: An audio system upgrades from 8-bit to 16-bit capture. Consider its microphone voltage before either converter.
- Classify: **the microphone voltage**
- Expected: **Analog**
- Feature/evidence: The source varies independently of the bit depth chosen to encode it.

- Scenario: The upgraded system records amplitude numbers using 16 bits per sample.
- Classify: **the upgraded recording**
- Expected: **Digital**
- Feature/evidence: More bits provide more levels, but the set of possible codes is still finite.

## sampling-gaps — Continuous and sampled signals

Distinction: Unobserved change versus logged values.

- Scenario: A sensor measures room temperature only every minute. Consider a temperature change between measurements.
- Classify: **the temperature change itself**
- Expected: **Analog**
- Feature/evidence: An unrecorded interval does not make the underlying quantity a discrete record.

- Scenario: A file contains only whole-number temperature readings taken at those minute marks.
- Classify: **the file's representation**
- Expected: **Digital**
- Feature/evidence: The file holds separate rounded measurements, not every intervening value.

## sampling-graph — Continuous and sampled signals

Distinction: Original signal versus interpolation display.

- Scenario: A live source signal changes through intermediate amplitudes before any stored samples are made.
- Classify: **the source signal**
- Expected: **Analog**
- Feature/evidence: The source is a varying quantity rather than a sequence of quantized sample codes.

- Scenario: A graph joins stored integer samples with smooth-looking lines on screen.
- Classify: **the underlying stored dataset, not the drawn line**
- Expected: **Digital**
- Feature/evidence: Connecting points visually does not add new measured values or change the dataset's discrete codes.

## adc-boundary — Analog-to-digital conversion

Distinction: Input side versus output side of ADC.

- Scenario: An ADC receives a voltage from a microphone. Consider the signal at its input pin before conversion.
- Classify: **the ADC input representation**
- Expected: **Analog**
- Feature/evidence: This input is the varying signal that will be assigned digital codes.

- Scenario: The ADC outputs a binary number representing its microphone measurement.
- Classify: **the ADC output representation**
- Expected: **Digital**
- Feature/evidence: The measured amplitude has been mapped to a discrete binary code.

## adc-rounding — Analog-to-digital conversion

Distinction: Pre-rounding quantity versus quantized result.

- Scenario: A converter will round a voltage to the nearest allowed level. Consider the voltage before that assignment.
- Classify: **the pre-rounding voltage**
- Expected: **Analog**
- Feature/evidence: It may lie between the converter's assigned levels.

- Scenario: The converter assigns nearby input voltages the same output code.
- Classify: **the assigned output representation**
- Expected: **Digital**
- Feature/evidence: Different input amounts collapse onto the same discrete quantization level.

## adc-clipping — Analog-to-digital conversion

Distinction: Out-of-range input versus maximum code.

- Scenario: A voltage exceeds a converter's input range and continues to vary above that limit.
- Classify: **the actual incoming voltage**
- Expected: **Analog**
- Feature/evidence: The converter's limit does not stop the input quantity from varying.

- Scenario: For every above-range input, the converter reports its highest permitted binary value.
- Classify: **the reported result**
- Expected: **Digital**
- Feature/evidence: The reported result is a discrete saturation code, even when it loses input variation.

## adc-threshold — Analog-to-digital conversion

Distinction: Voltage comparison input versus comparator decision.

- Scenario: A comparator monitors a varying voltage from a tank sensor.
- Classify: **the sensor voltage entering the comparison**
- Expected: **Analog**
- Feature/evidence: The voltage represents the measured amount across intermediate levels.

- Scenario: The comparator produces only a high/low logical decision about the tank reading.
- Classify: **the decision as a one-bit representation**
- Expected: **Digital**
- Feature/evidence: Thresholding maps the range of input amounts to two permitted logical states.

## adc-separate-steps — Analog-to-digital conversion

Distinction: Unquantized held amplitude versus encoded amplitude.

- Scenario: A sample-and-hold captures a voltage at one instant but has not rounded it to any allowed amplitude levels.
- Classify: **the held amplitude representation before quantization**
- Expected: **Analog**
- Feature/evidence: Sampling time alone has not made the amplitude a finite numerical code; it can retain an intermediate voltage.

- Scenario: After holding the voltage, the converter maps it to one of 1,024 binary amplitude codes.
- Classify: **the encoded amplitude representation**
- Expected: **Digital**
- Feature/evidence: Quantization assigns the measurement to a finite code set in addition to sampling it in time.

## dac-reconstruction — Digital-to-analog conversion

Distinction: Filtered reconstruction versus source codes.

- Scenario: After a DAC and reconstruction filter, an output voltage smoothly follows the reconstructed audio waveform.
- Classify: **the filtered output signal**
- Expected: **Analog**
- Feature/evidence: The filter produces a varying physical voltage rather than a stored sequence of numerical words.

- Scenario: Before the DAC, a buffer contains integer amplitude values for that audio.
- Classify: **the DAC input representation**
- Expected: **Digital**
- Feature/evidence: The buffer holds discrete codes that the converter uses to produce an output signal.

## dac-actuation — Digital-to-analog conversion

Distinction: Physical actuator response versus command code.

- Scenario: A robot receives numerical commands, then its actuator moves through intermediate positions.
- Classify: **the actuator's physical movement**
- Expected: **Analog**
- Feature/evidence: Digital commands do not make the resulting physical motion a list of codes.

- Scenario: The robot sends a DAC a 12-bit command for a desired control level.
- Classify: **the command sent to the DAC**
- Expected: **Digital**
- Feature/evidence: The control request is represented by one of the possible 12-bit codes.

## dac-brightness — Digital-to-analog conversion

Distinction: Filtered light level versus brightness value.

- Scenario: A light controller converts a code and smooths its output so light intensity can vary between levels during transitions.
- Classify: **the changing light intensity itself**
- Expected: **Analog**
- Feature/evidence: The emitted intensity is a physical variation, distinct from the numerical command.

- Scenario: A graphics program stores a brightness request as an integer from 0 to 255.
- Classify: **the stored brightness request**
- Expected: **Digital**
- Feature/evidence: The program represents brightness using a limited set of separate codes.

## dac-synthesis — Digital-to-analog conversion

Distinction: Reconstructed tone versus computed samples.

- Scenario: A synthesizer feeds computed samples through a DAC and smoothing filter into a varying speaker-drive voltage.
- Classify: **the smoothed drive voltage**
- Expected: **Analog**
- Feature/evidence: The output is a physical varying signal reconstructed from numerical instructions.

- Scenario: A synthesizer computes and stores each next amplitude as a finite-precision number.
- Classify: **the computed sequence**
- Expected: **Digital**
- Feature/evidence: Algorithmic generation does not remove the discrete numerical representation.

## dac-precision — Digital-to-analog conversion

Distinction: Physical reconstructed output versus higher-depth codes.

- Scenario: A music system upgrades its DAC. Consider the smooth voltage after its reconstruction filter, not the input data.
- Classify: **the filtered physical output**
- Expected: **Analog**
- Feature/evidence: Increasing input precision does not turn the reconstructed physical voltage into a stored word sequence.

- Scenario: A new DAC accepts 24-bit words instead of 16-bit words.
- Classify: **the new input-word representation**
- Expected: **Digital**
- Feature/evidence: The number of possible codes increases, but they remain separate encoded values.

## phenomena-thermometer — Phenomena versus encoding

Distinction: Physical temperature versus shown measurement.

- Scenario: A digital thermometer reads 21.4 degrees while the surrounding air warms slightly.
- Classify: **the air temperature itself**
- Expected: **Analog**
- Feature/evidence: The air can take values between displayed tenths; the display format does not change the physical quantity.

- Scenario: The same thermometer shows 21.4 and then 21.5, without showing every intervening value.
- Classify: **the thermometer's displayed representation**
- Expected: **Digital**
- Feature/evidence: The displayed values are restricted to tenth-degree increments.

## phenomena-clock-time — Phenomena versus encoding

Distinction: Time itself versus clock readout.

- Scenario: A clock shows minutes as numbers. Consider time passing between two changes of the minute display.
- Classify: **the passage of time itself**
- Expected: **Analog**
- Feature/evidence: Time is modeled as continuous even though the display changes in steps.

- Scenario: A schedule represents departure times as hour-and-minute numerals.
- Classify: **the written departure-time representation**
- Expected: **Digital**
- Feature/evidence: The schedule uses separate minute-level codes rather than every possible instant.

## phenomena-screen-light — Phenomena versus encoding

Distinction: Emitted light versus image file.

- Scenario: A screen is driven by pixel codes. Consider the light intensity changing physically during a pixel transition.
- Classify: **the emitted light intensity, not its code**
- Expected: **Analog**
- Feature/evidence: The light is a physical quantity that can pass through intermediate intensities.

- Scenario: An image file stores the screen picture as a grid of coded pixel colors.
- Classify: **the image file representation**
- Expected: **Digital**
- Feature/evidence: Colors are encoded as discrete values at separate grid locations.

## phenomena-body-versus-reading — Phenomena versus encoding

Distinction: Pulse pressure versus displayed heart rate.

- Scenario: A wrist monitor processes readings. Consider the changing pressure wave of blood passing through an artery.
- Classify: **the pressure wave itself**
- Expected: **Analog**
- Feature/evidence: The biological pressure varies physically; the monitor does not convert the phenomenon itself into stored codes.

- Scenario: The monitor displays heart rate rounded to a whole number of beats per minute.
- Classify: **the displayed rate representation**
- Expected: **Digital**
- Feature/evidence: The display uses whole-number rate values rather than every possible rate.

## phenomena-rainfall — Phenomena versus encoding

Distinction: Water amount versus digitized total.

- Scenario: An electronic weather station measures collected rainwater. Consider the changing depth of water in its collector.
- Classify: **the water depth itself**
- Expected: **Analog**
- Feature/evidence: The water can rise through intermediate depths regardless of how the station reports it.

- Scenario: The station stores rainfall totals rounded to one millimeter.
- Classify: **the stored rainfall totals**
- Expected: **Digital**
- Feature/evidence: The stored representation is restricted to separate millimeter values.
