/* Variable Lab scenario library.
   Each family is a distinct real-world context. Every family offers one variable
   of each of the five introductory types, so the data type can be chosen first
   (from a balanced queue) without the scenario pool skewing the distribution.

   Item fields
     type  Java type that best fits under the introductory convention.
     name  Valid, meaningful Java variable name.
     say   Builds the situation sentence from the value written in plain English
           (no Java literal syntax: no quotes, no apostrophes around chars).
     ask   What to store. Never names the variable or its type.
     why   One-sentence reason the type fits, used in feedback.
     int:     range [min, max]; values of 1,000+ are written with commas in prose.
     double:  range [min, max, step]; the fractional part is never zero.
     boolean: say(true|false) describes the condition in words.
     String:  texts, shown without quotation marks.
     char:    [character, spoken description] pairs. */
export const TYPES = ["int", "double", "boolean", "String", "char"];

export const scenarioFamilies = [
  { id: "video-games", context: "Video games", items: [
    { type: "int", name: "coinsCollected", range: [12, 480], say: v => `A player has collected ${v} coins so far.`, ask: "Keep track of the coins collected.", why: "Coins are counted one at a time, so a whole-number int fits." },
    { type: "double", name: "damageMultiplier", range: [1.25, 3.75, 0.25], say: v => `A power-up multiplies attack damage by ${v}.`, ask: "Store the damage multiplier.", why: "A multiplier like this has a fractional part, so it needs a double." },
    { type: "boolean", name: "levelCompleted", say: v => v ? "The player has finished the level." : "The player has not finished the level yet.", ask: "Record whether the level is complete.", why: "Finished or not finished is a true/false condition, so boolean fits." },
    { type: "String", name: "playerUsername", texts: ["NovaFox", "PixelKnight", "ShadowByte", "LunaStar"], say: v => `A player signs in with the username ${v}.`, ask: "Store the player's username.", why: "A username is text made of several characters, so it is a String." },
    { type: "char", name: "difficultyLevel", chars: [["E", "the letter E (for Easy)"], ["H", "the letter H (for Hard)"], ["N", "the letter N (for Normal)"]], say: v => `The difficulty setting is shown as ${v}.`, ask: "Store the one-letter difficulty setting.", why: "The setting is exactly one character, so char fits." },
  ]},
  { id: "robotics", context: "Robotics", items: [
    { type: "int", name: "wheelCount", range: [3, 8], say: v => `A rover robot is built with ${v} wheels.`, ask: "Store the number of wheels.", why: "Wheels are counted in whole numbers, so int fits." },
    { type: "double", name: "batteryVoltage", range: [6.5, 12.5, 0.1], say: v => `The robot's battery currently reads ${v} volts.`, ask: "Store the battery reading.", why: "A voltage measurement includes a decimal part, so double fits." },
    { type: "boolean", name: "obstacleDetected", say: v => v ? "The robot's sensor has detected an obstacle." : "The robot's sensor has not detected any obstacle.", ask: "Represent whether an obstacle was detected.", why: "Detected or not detected is a true/false condition, so boolean fits." },
    { type: "String", name: "robotName", texts: ["Atlas", "Sparky", "Rover Two", "Bolt"], say: v => `The team named its robot ${v}.`, ask: "Store the robot's name.", why: "A name is text, so it is stored as a String." },
    { type: "char", name: "driveMode", chars: [["A", "the letter A (for Autonomous)"], ["M", "the letter M (for Manual)"]], say: v => `The control panel shows the drive mode as ${v}.`, ask: "Store the one-letter drive mode.", why: "The mode is a single character, so char fits." },
  ]},
  { id: "classroom", context: "School and classroom", items: [
    { type: "int", name: "studentsPresent", range: [18, 34], say: v => `${v} students are in class today.`, ask: "Store how many students are present.", why: "People are counted in whole numbers, so int fits." },
    { type: "double", name: "quizAverage", range: [71.5, 96.5, 0.5], say: v => `The class average on the quiz is ${v} points.`, ask: "Store the quiz average.", why: "An average can have a fractional part, so double fits." },
    { type: "boolean", name: "homeworkSubmitted", say: v => v ? "Jordan turned in the homework." : "Jordan has not turned in the homework.", ask: "Record whether the homework was submitted.", why: "Submitted or not is a true/false condition, so boolean fits." },
    { type: "String", name: "courseName", texts: ["Computer Science", "Biology", "World History", "Algebra"], say: v => `The course on the schedule is ${v}.`, ask: "Store the course name.", why: "A course name is text, so it is a String." },
    { type: "char", name: "middleInitial", chars: [["R", "R"], ["J", "J"], ["M", "M"], ["T", "T"]], say: v => `A student's middle initial is ${v}.`, ask: "Store the middle initial.", why: "An initial is exactly one character, so char fits." },
  ]},
  { id: "sports", context: "Sports", items: [
    { type: "int", name: "teamScore", range: [58, 121], say: v => `A basketball team scored ${v} points.`, ask: "Store the team's score.", why: "Points are counted in whole numbers, so int fits." },
    { type: "double", name: "raceTime", range: [10.5, 14.9, 0.01], say: v => `A sprinter finished the race in ${v} seconds.`, ask: "Store the race time.", why: "A timed result includes hundredths of a second, so double fits." },
    { type: "boolean", name: "wentToOvertime", say: v => v ? "The game was tied at the end and went to overtime." : "The game ended in regulation without overtime.", ask: "Record whether the game went to overtime.", why: "Overtime either happened or it did not, so boolean fits." },
    { type: "String", name: "mvpName", texts: ["Maya Lopez", "Andre Kim", "Priya Shah", "Sam Ortiz"], say: v => `The most valuable player award went to ${v}.`, ask: "Store the winner's name.", why: "A person's full name is text, so it is a String." },
    { type: "char", name: "divisionLetter", chars: [["A", "A"], ["B", "B"], ["C", "C"]], say: v => `The team plays in Division ${v}.`, ask: "Store the division letter.", why: "A division label like this is one character, so char fits." },
  ]},
  { id: "entertainment", context: "Movies and streaming", items: [
    { type: "int", name: "runtimeMinutes", range: [84, 165], say: v => `A movie runs for ${v} minutes.`, ask: "Store the movie's length in minutes.", why: "A count of whole minutes fits in an int." },
    { type: "double", name: "viewerRating", range: [2.5, 4.9, 0.1], say: v => `Viewers gave the show an average rating of ${v} stars.`, ask: "Store the average rating.", why: "An average rating has a decimal part, so double fits." },
    { type: "boolean", name: "subtitlesOn", say: v => v ? "Subtitles are turned on." : "Subtitles are turned off.", ask: "Record whether subtitles are on.", why: "On or off is a true/false condition, so boolean fits." },
    { type: "String", name: "movieTitle", texts: ["Ocean Quest", "Skyward", "The Last Comet", "Moonlight Run"], say: v => `Tonight's movie is ${v}.`, ask: "Store the movie title.", why: "A title is text, so it is a String." },
    { type: "char", name: "seatRow", chars: [["F", "F"], ["K", "K"], ["D", "D"]], say: v => `Your theater seat is in row ${v}.`, ask: "Store the row letter.", why: "A row letter is a single character, so char fits." },
  ]},
  { id: "shopping", context: "Shopping", items: [
    { type: "int", name: "itemsInCart", range: [2, 15], say: v => `A shopper has ${v} items in the cart.`, ask: "Store the number of items in the cart.", why: "Items are counted in whole numbers, so int fits." },
    { type: "double", name: "shirtPrice", range: [8.25, 29.75, 0.25], money: true, say: v => `A shirt costs $${v}.`, ask: "Store the price in dollars.", why: "A price includes cents, so double fits under our convention. The dollar sign is not part of the number." },
    { type: "boolean", name: "couponApplied", say: v => v ? "A coupon was applied at checkout." : "No coupon was applied at checkout.", ask: "Record whether a coupon was used.", why: "Applied or not applied is a true/false condition, so boolean fits." },
    { type: "String", name: "productCode", texts: ["SKU-4410", "TX-208", "B12-77", "QR-5093"], say: v => `The product's label shows the code ${v}.`, ask: "Store the product code.", why: "The code mixes letters, digits, and a dash, so it is text: a String, not a number." },
    { type: "char", name: "shirtSize", chars: [["S", "S (small)"], ["M", "M (medium)"], ["L", "L (large)"]], say: v => `The shirt's size tag says ${v}.`, ask: "Store the one-letter size.", why: "The size is one character, so char fits." },
  ]},
  { id: "science", context: "Science lab", items: [
    { type: "int", name: "trialCount", range: [3, 12], say: v => `The lab group repeated the experiment ${v} times.`, ask: "Store the number of trials.", why: "Trials are counted in whole numbers, so int fits." },
    { type: "double", name: "sampleMass", range: [1.2, 9.8, 0.1], say: v => `A sample has a mass of ${v} grams.`, ask: "Store the measured mass.", why: "A measured mass has a decimal part, so double fits." },
    { type: "boolean", name: "reactionObserved", say: v => v ? "The solution bubbled, so a reaction was observed." : "Nothing changed, so no reaction was observed.", ask: "Record whether a reaction was observed.", why: "Observed or not observed is a true/false condition, so boolean fits." },
    { type: "String", name: "elementSymbol", texts: ["Na", "Fe", "Cu", "Mg", "He"], say: v => `The element being tested has the two-letter symbol ${v}.`, ask: "Store the element symbol.", why: "This symbol has two characters, so it must be a String; char holds only one character." },
    { type: "char", name: "groupLabel", chars: [["C", "C"], ["B", "B"], ["E", "E"]], say: v => `Each lab group has a letter. Your group is group ${v}.`, ask: "Store the group's letter.", why: "The label is one character, so char fits." },
  ]},
  { id: "kitchen", context: "Everyday life: cooking", items: [
    { type: "int", name: "eggsNeeded", range: [2, 6], say: v => `A pancake recipe calls for ${v} eggs.`, ask: "Store the number of eggs.", why: "Eggs are counted whole, so int fits." },
    { type: "double", name: "cupsOfFlour", range: [1.25, 3.75, 0.25], say: v => `The recipe needs ${v} cups of flour.`, ask: "Store the amount of flour in cups.", why: "The amount includes part of a cup, so double fits." },
    { type: "boolean", name: "ovenPreheated", say: v => v ? "The oven has finished preheating." : "The oven is still heating up.", ask: "Record whether the oven is preheated.", why: "Preheated or not is a true/false condition, so boolean fits." },
    { type: "String", name: "recipeName", texts: ["Banana Bread", "Veggie Tacos", "Lemon Muffins", "Fried Rice"], say: v => `Tonight's recipe is ${v}.`, ask: "Store the recipe name.", why: "A recipe name is text, so it is a String." },
    { type: "char", name: "spiceLevel", chars: [["M", "the letter M (for Mild)"], ["H", "the letter H (for Hot)"]], say: v => `The salsa jar labels its spice level as ${v}.`, ask: "Store the one-letter spice level.", why: "The label is a single character, so char fits." },
  ]},
  { id: "technology", context: "Technology", items: [
    { type: "int", name: "batteryPercent", range: [12, 98], say: v => `A phone shows ${v}% battery remaining.`, ask: "Store the battery percentage.", why: "The phone shows whole percentages, so int fits. The % sign is not part of the number." },
    { type: "double", name: "downloadSpeed", range: [12.5, 95.5, 0.5], say: v => `A speed test measured ${v} megabits per second.`, ask: "Store the download speed.", why: "A measured speed has a decimal part, so double fits." },
    { type: "boolean", name: "wifiConnected", say: v => v ? "The laptop is connected to Wi-Fi." : "The laptop is not connected to Wi-Fi.", ask: "Record whether the laptop is connected.", why: "Connected or not is a true/false condition, so boolean fits." },
    { type: "String", name: "deviceName", texts: ["Room 12 Chromebook", "Library Tablet", "Lab PC 3", "Front Desk Laptop"], say: v => `The device appears on the network as ${v}.`, ask: "Store the device's name.", why: "A device name is text, so it is a String." },
    { type: "char", name: "keyPressed", chars: [["Q", "the Q key"], ["W", "the W key"], ["P", "the P key"]], say: v => `A game is waiting for input, and the user presses ${v}.`, ask: "Store the uppercase letter of the key that was pressed.", why: "One key is one character, so char fits." },
  ]},
  { id: "transportation", context: "Transportation", items: [
    { type: "int", name: "busRoute", range: [5, 118], say: v => `You ride city bus route ${v} to school.`, ask: "Store the route number.", why: "Route numbers here are whole numbers, so int fits." },
    { type: "double", name: "tripDistance", range: [2.4, 38.6, 0.1], say: v => `The drive to the stadium is ${v} miles.`, ask: "Store the trip distance.", why: "A distance with tenths of a mile needs a double." },
    { type: "boolean", name: "trainDelayed", say: v => v ? "The arrivals board says the train is delayed." : "The arrivals board says the train is on time.", ask: "Record whether the train is delayed.", why: "Delayed or on time is a true/false condition, so boolean fits." },
    { type: "String", name: "flightCode", texts: ["UA482", "DL1207", "WN35", "AA918"], say: v => `Your flight is listed as ${v}.`, ask: "Store the flight code.", why: "The code contains letters as well as digits, so it is text: a String." },
    { type: "char", name: "terminalGate", chars: [["B", "B"], ["C", "C"], ["D", "D"]], say: v => `The flight leaves from gate area ${v}.`, ask: "Store the gate area's letter.", why: "The gate area is one character, so char fits." },
  ]},
  { id: "events", context: "Events", items: [
    { type: "int", name: "ticketsSold", range: [1250, 9800], say: v => `The concert sold ${v} tickets.`, ask: "Store the number of tickets sold.", why: "Tickets are counted whole, so int fits. Java number literals do not use commas." },
    { type: "double", name: "ticketPrice", range: [12.5, 64.5, 0.5], money: true, say: v => `Each concert ticket costs $${v}.`, ask: "Store the ticket price in dollars.", why: "A price includes cents, so double fits under our convention." },
    { type: "boolean", name: "eventCancelled", say: v => v ? "Because of a storm, the outdoor festival was cancelled." : "The weather cleared, so the outdoor festival will go on as planned.", ask: "Record whether the festival is cancelled.", why: "Cancelled or not is a true/false condition, so boolean fits." },
    { type: "String", name: "venueName", texts: ["Desert Arena", "Riverside Park", "Main Street Hall", "Sunset Theater"], say: v => `The concert will be held at ${v}.`, ask: "Store the venue's name.", why: "A venue name is text, so it is a String." },
    { type: "char", name: "seatSection", chars: [["G", "G"], ["H", "H"], ["J", "J"]], say: v => `Your ticket is for seating section ${v}.`, ask: "Store the section letter.", why: "A section letter is a single character, so char fits." },
  ]},
  { id: "fitness", context: "Health and fitness", items: [
    { type: "int", name: "dailySteps", range: [3200, 14800], say: v => `A fitness tracker counted ${v} steps today.`, ask: "Store today's step count.", why: "Steps are counted whole, so int fits. Java number literals do not use commas." },
    { type: "double", name: "bodyTemperature", range: [97.1, 99.4, 0.1], say: v => `A thermometer reads ${v} degrees Fahrenheit.`, ask: "Store the temperature reading.", why: "The reading includes tenths of a degree, so double fits." },
    { type: "boolean", name: "workoutFinished", say: v => v ? "Lee completed the entire workout." : "Lee stopped before finishing the workout.", ask: "Record whether the workout was finished.", why: "Finished or not is a true/false condition, so boolean fits." },
    { type: "String", name: "exerciseName", texts: ["Jumping Jacks", "Push-ups", "Plank", "Lunges"], say: v => `The first exercise in the routine is ${v}.`, ask: "Store the exercise name.", why: "An exercise name is text, so it is a String." },
    { type: "char", name: "intensityLevel", chars: [["L", "the letter L (for Low)"], ["H", "the letter H (for High)"]], say: v => `The treadmill shows its intensity setting as ${v}.`, ask: "Store the one-letter intensity setting.", why: "The setting is a single character, so char fits." },
  ]},
  { id: "weather", context: "Weather", items: [
    { type: "int", name: "humidityPercent", range: [8, 64], say: v => `The weather app shows humidity at ${v}%.`, ask: "Store the humidity percentage.", why: "The humidity is reported as a whole percentage, so int fits." },
    { type: "double", name: "rainfallInches", range: [0.2, 2.8, 0.1], say: v => `The storm dropped ${v} inches of rain.`, ask: "Store the rainfall amount.", why: "A rainfall measurement has a decimal part, so double fits." },
    { type: "boolean", name: "rainExpected", say: v => v ? "The forecast says rain is expected tomorrow." : "The forecast says no rain is expected tomorrow.", ask: "Record whether rain is expected.", why: "Expected or not is a true/false condition, so boolean fits." },
    { type: "String", name: "forecastSummary", texts: ["Partly cloudy", "Sunny and hot", "Windy", "Light showers"], say: v => `Today's forecast reads: ${v}.`, ask: "Store the forecast summary.", why: "A forecast description is text, so it is a String." },
    { type: "char", name: "windDirection", chars: [["N", "N (north)"], ["S", "S (south)"], ["E", "E (east)"], ["W", "W (west)"]], say: v => `The weather vane shows the wind coming from ${v}.`, ask: "Store the one-letter wind direction.", why: "A compass direction written as one letter is a char." },
  ]},
  { id: "music", context: "Music", items: [
    { type: "int", name: "beatsPerMinute", range: [72, 168], say: v => `A song has a tempo of ${v} beats per minute.`, ask: "Store the tempo.", why: "The tempo is a whole number of beats, so int fits." },
    { type: "double", name: "songLength", range: [2.5, 5.75, 0.25], say: v => `A song lasts ${v} minutes.`, ask: "Store the song length in minutes.", why: "The length includes part of a minute, so double fits." },
    { type: "boolean", name: "isPlaying", say: v => v ? "The music app is playing a song right now." : "The music app is paused.", ask: "Record whether music is playing.", why: "Playing or paused is a true/false condition, so boolean fits." },
    { type: "String", name: "songTitle", texts: ["Golden Hour", "City Lights", "Echoes", "Run Away"], say: v => `The song on the radio is called ${v}.`, ask: "Store the song title.", why: "A title is text, so it is a String." },
    { type: "char", name: "musicalNote", chars: [["G", "the note G"], ["C", "the note C"], ["F", "the note F"], ["A", "the note A"]], say: v => `A tuner shows that the guitar string is playing ${v}.`, ask: "Store the note's letter.", why: "A note name like this is one letter, so char fits." },
  ]},
  { id: "library", context: "Library", items: [
    { type: "int", name: "booksBorrowed", range: [2, 9], say: v => `A student checked out ${v} books.`, ask: "Store the number of books checked out.", why: "Books are counted whole, so int fits." },
    { type: "double", name: "lateFee", range: [0.25, 4.75, 0.25], money: true, say: v => `A late book has a fee of $${v}.`, ask: "Store the fee in dollars.", why: "A fee includes cents, so double fits under our convention." },
    { type: "boolean", name: "bookAvailable", say: v => v ? "The book you want is on the shelf." : "The book you want is checked out by someone else.", ask: "Record whether the book is available.", why: "Available or not is a true/false condition, so boolean fits." },
    { type: "String", name: "authorName", texts: ["Toni Morrison", "Gary Paulsen", "Jason Reynolds", "Kwame Alexander"], say: v => `The novel was written by ${v}.`, ask: "Store the author's name.", why: "A person's name is text, so it is a String." },
    { type: "char", name: "shelfSection", chars: [["F", "F"], ["N", "N"], ["R", "R"]], say: v => `The book is shelved in section ${v}.`, ask: "Store the section letter.", why: "The section is one character, so char fits." },
  ]},
  { id: "space", context: "Space exploration", items: [
    { type: "int", name: "crewSize", range: [3, 7], say: v => `The space mission has ${v} astronauts on board.`, ask: "Store the size of the crew.", why: "Astronauts are counted whole, so int fits." },
    { type: "double", name: "fuelRemaining", range: [42.5, 97.5, 0.5], say: v => `Mission control reports ${v} percent of the fuel remaining.`, ask: "Store the fuel level.", why: "The fuel level includes a fractional percent, so double fits." },
    { type: "boolean", name: "launchApproved", say: v => v ? "Mission control approved the launch." : "Mission control has not approved the launch.", ask: "Record whether the launch is approved.", why: "Approved or not is a true/false condition, so boolean fits." },
    { type: "String", name: "missionName", texts: ["Artemis", "Red Horizon", "Starlight", "Deep Survey"], say: v => `The new mission is called ${v}.`, ask: "Store the mission's name.", why: "A mission name is text, so it is a String." },
    { type: "char", name: "rocketStage", chars: [["A", "A"], ["B", "B"]], say: v => `The rocket stage that separated is stage ${v}.`, ask: "Store the stage's letter.", why: "The label is one character, so char fits." },
  ]},
  { id: "money", context: "Saving money", items: [
    { type: "int", name: "weeksSaved", range: [3, 26], say: v => `Ava has been saving her allowance for ${v} weeks.`, ask: "Store the number of weeks.", why: "Weeks are counted whole, so int fits." },
    { type: "double", name: "savingsBalance", range: [24.5, 186.75, 0.25], money: true, say: v => `Ava's savings account holds $${v}.`, ask: "Store the balance in dollars.", why: "A balance includes cents, so double fits under our convention." },
    { type: "boolean", name: "goalReached", say: v => v ? "Ava has saved enough to buy new headphones." : "Ava has not saved enough for new headphones yet.", ask: "Record whether the savings goal was reached.", why: "Reached or not reached is a true/false condition, so boolean fits." },
    { type: "String", name: "accountNickname", texts: ["Headphone Fund", "Summer Trip", "Bike Savings", "Rainy Day"], say: v => `Ava nicknamed her savings account ${v}.`, ask: "Store the account's nickname.", why: "A nickname is text, so it is a String." },
    { type: "char", name: "currencySymbol", chars: [["$", "the dollar sign"], ["€", "the euro sign"], ["£", "the pound sign"]], say: v => `A price tag uses ${v} to show its currency.`, ask: "Store the currency symbol.", why: "A currency symbol is a single character, so char fits." },
  ]},
  { id: "pets", context: "Pets and animals", items: [
    { type: "int", name: "petAge", range: [2, 14], say: v => `A dog at the shelter is ${v} years old.`, ask: "Store the dog's age in years.", why: "The age is given in whole years, so int fits." },
    { type: "double", name: "petWeight", range: [4.5, 38.5, 0.5], say: v => `The vet weighed the dog at ${v} pounds.`, ask: "Store the dog's weight.", why: "A measured weight has a decimal part, so double fits." },
    { type: "boolean", name: "isVaccinated", say: v => v ? "The dog has received all of its vaccines." : "The dog has not received its vaccines yet.", ask: "Record whether the dog is vaccinated.", why: "Vaccinated or not is a true/false condition, so boolean fits." },
    { type: "String", name: "petName", texts: ["Biscuit", "Luna", "Captain", "Pepper"], say: v => `The family named their new dog ${v}.`, ask: "Store the dog's name.", why: "A name is text, so it is a String." },
    { type: "char", name: "kennelRow", chars: [["A", "A"], ["D", "D"], ["E", "E"]], say: v => `The dog sleeps in kennel row ${v}.`, ask: "Store the row's letter.", why: "The row label is a single character, so char fits." },
  ]},
  { id: "garden", context: "Gardening and environment", items: [
    { type: "int", name: "seedsPlanted", range: [12, 60], say: v => `The garden club planted ${v} sunflower seeds.`, ask: "Store the number of seeds planted.", why: "Seeds are counted whole, so int fits." },
    { type: "double", name: "plantHeight", range: [3.5, 42.5, 0.5], say: v => `A tomato plant is ${v} centimeters tall.`, ask: "Store the plant's height.", why: "A measured height has a decimal part, so double fits." },
    { type: "boolean", name: "soilIsDry", say: v => v ? "The moisture sensor reports that the soil is dry." : "The moisture sensor reports that the soil is still moist.", ask: "Record whether the soil is dry.", why: "Dry or not dry is a true/false condition, so boolean fits." },
    { type: "String", name: "plantSpecies", texts: ["Sunflower", "Desert Marigold", "Basil", "Prickly Pear"], say: v => `The sign in the garden bed says ${v}.`, ask: "Store the kind of plant.", why: "A plant name is text, so it is a String." },
    { type: "char", name: "plotRow", chars: [["B", "B"], ["C", "C"], ["F", "F"]], say: v => `The plant is growing in row ${v} of the garden.`, ask: "Store the row letter.", why: "The row is labeled with one character, so char fits." },
  ]},
  { id: "restaurant", context: "Restaurants", items: [
    { type: "int", name: "tableNumber", range: [1, 40], say: v => `The host seats your group at table ${v}.`, ask: "Store the table number.", why: "Table numbers are whole numbers, so int fits." },
    { type: "double", name: "billTotal", range: [18.25, 96.75, 0.25], money: true, say: v => `The bill for dinner comes to $${v}.`, ask: "Store the bill total in dollars.", why: "A total includes cents, so double fits under our convention." },
    { type: "boolean", name: "orderReady", say: v => v ? "The kitchen says your order is ready for pickup." : "The kitchen says your order is still being prepared.", ask: "Record whether the order is ready.", why: "Ready or not ready is a true/false condition, so boolean fits." },
    { type: "String", name: "customerName", texts: ["Jordan", "Ms. Patel", "Chris Nguyen", "Alex"], say: v => `The pickup order is under the name ${v}.`, ask: "Store the name on the order.", why: "A name is text, so it is a String." },
    { type: "char", name: "mealSize", chars: [["S", "S (small)"], ["L", "L (large)"], ["M", "M (medium)"]], say: v => `The receipt shows the meal size as ${v}.`, ask: "Store the one-letter meal size.", why: "The size is a single character, so char fits." },
  ]},
  { id: "travel", context: "Travel and hotels", items: [
    { type: "int", name: "roomNumber", range: [101, 948], say: v => `Your hotel room number is ${v}.`, ask: "Store the room number.", why: "Room numbers here are whole numbers, so int fits." },
    { type: "double", name: "nightlyRate", range: [79.5, 189.5, 0.5], money: true, say: v => `The hotel charges $${v} per night.`, ask: "Store the nightly rate in dollars.", why: "A rate includes cents, so double fits under our convention." },
    { type: "boolean", name: "breakfastIncluded", say: v => v ? "Breakfast is included with the room." : "Breakfast is not included with the room.", ask: "Record whether breakfast is included.", why: "Included or not is a true/false condition, so boolean fits." },
    { type: "String", name: "destinationCity", texts: ["San Diego", "Salt Lake City", "Phoenix", "Denver"], say: v => `The family is driving to ${v} for vacation.`, ask: "Store the destination city.", why: "A city name is text, so it is a String." },
    { type: "char", name: "hotelWing", chars: [["N", "N"], ["E", "E"], ["W", "W"]], say: v => `Your room is in the ${v} wing of the hotel.`, ask: "Store the wing's letter.", why: "The wing is labeled with one character, so char fits." },
  ]},
];
