let bpm = 60;
let pitchInterval = null;
let isRunning = false;
let shuffledPitches = [];
let debugMode = false; // Debug mode flag
let selectedString = "E"; // Default to the low E string

const button = document.getElementById("start-stop-button");
const bpmInput = document.getElementById("bpm");
const pitchDisplay = document.getElementById("current-pitch");
const stringSelector = document.getElementById("string-selector");

// Check for the `debug` query parameter
const urlParams = new URLSearchParams(window.location.search);
debugMode = urlParams.has("debug"); // Enable debug mode if ?debug is present

button.addEventListener("click", toggleSession);
bpmInput.addEventListener("input", (e) => bpm = parseInt(e.target.value, 10));
stringSelector.addEventListener("change", (e) => {
    selectedString = e.target.value;
    updatePlayableNotes();
});

function allFrequencies(octaves) {
    const pitches = [
        'A',
        'A#',
        'B',
        'C',
        'C#',
        'D',
        'D#',
        'E',
        'F',
        'F#',
        'G',
        'G#',
    ];

    const baseFrequency = 55; // Start from A1
    const frequencies = [];
    let interval = 0; // Reset interval for each octave

    // Iterate over octaves
    for (let octave = 1; octave <= octaves; octave++) {
        for (let i = 0; i < pitches.length; i++) {
            const frequency = (baseFrequency * Math.pow(Math.pow(2, 1 / 12), interval)).toFixed(2);
            const variants = [pitches[i], ...(pitches[i].slice(-1) === '#' ? [`${pitches[(i + 1) % pitches.length]}b`] : [])];

            frequencies.push({
                pitch: variants[Math.floor(Math.random() * variants.length)],
                octave,
                interval,
                frequency,
                variants,
            });

            interval += 1;
        }
    }
    console.log(frequencies);

    return frequencies;
}

function stringFrequencies(str) {
    const all = allFrequencies(4);

    switch (str) {
        case 'e':
            return all.slice(32, 44);
        case 'B':
            return all.slice(27, 39);
        case 'G':
            return all.slice(23, 35);
        case 'D':
            return all.slice(18, 30);
        case 'A':
            return all.slice(13, 25);
        default:
            return all.slice(8, 20);
    }
}

// Update the playable notes based on the selected string
let playableNotes = [];
let pitchFrequencyMap = {}; // Frequency map for the current string
function updatePlayableNotes() {
    const stringsF = stringFrequencies(selectedString);
    playableNotes = stringsF.map((s) => s.pitch);

    for (let i = 0; i < stringsF.length; i += 1) {
        pitchFrequencyMap[stringsF[i].pitch] = {
            pitch: `${stringsF[i].frequency} Hz`,
            fret: i + 1,
        };
    }

    if (debugMode) {
        console.log(`Playable notes for ${selectedString} string:`, playableNotes);
        console.log(`Frequency map for ${selectedString} string:`, pitchFrequencyMap);
    }
}

// Shuffle the playable notes
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Speak a pitch using the Web Speech API
function speakPitch(pitch) {
    const letterPronunciation = pitch[0].toUpperCase();
    const restOfPitch = pitch.slice(1);
    const speechText = `${letterPronunciation}${restOfPitch ? " " + formatPitchForSpeech(restOfPitch) : ""}`;
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = "en-US"; // Ensure consistent pronunciation across platforms
    speechSynthesis.speak(utterance);

    // Log the pitch to the console if debug mode is enabled
    if (debugMode) {
        console.log(`Read out pitch: ${speechText}`);
    }

    // Play the note sound 3 seconds after it's spoken
    setTimeout(() => playPitchSound(pitch), 3000);
}

// Format pitch for speech (replace "b" with "flat" and "#" with "sharp")
function formatPitchForSpeech(pitch) {
    if (pitch.includes("#")) return pitch.replace("#", " sharp");
    if (pitch.includes("b")) return pitch.replace("b", " flat");
    return pitch;
}

// Play the note sound using Tone.js
function playPitchSound(pitch) {
    const synth = new Tone.Synth().toDestination();
    const tonePitch = pitchFrequencyMap[pitch].pitch;

    if (isRunning && tonePitch) {
        pitchDisplay.innerText += `(Fret ${pitchFrequencyMap[pitch].fret})`;
        synth.triggerAttackRelease(tonePitch, "1s"); // Play for 1 second
    }
}

// Start pitch announcements
function startPitchAnnouncements() {
    shuffledPitches = shuffleArray(playableNotes); // Shuffle notes within the range
    pitchDisplay.inner = "";

    const interval = (60 / bpm) * 4000; // Original slower interval (every 4 beats)

    // Immediately announce the first pitch
    const firstPitch = shuffledPitches.shift();
    if (firstPitch) {
        pitchDisplay.innerText = firstPitch;
        speakPitch(firstPitch);
    }

    // Set up the interval for subsequent pitches
    pitchInterval = setInterval(() => {
        const currentPitch = shuffledPitches.shift();
        if (currentPitch) {
            pitchDisplay.innerText = currentPitch;
            speakPitch(currentPitch);
        } else {
            clearInterval(pitchInterval); // Stop announcements after all pitches
            pitchDisplay.innerText = "Session Complete!";
            toggleButtonToStart();
        }
    }, interval);
}

// Stop all intervals
function stopIntervals() {
    clearInterval(pitchInterval);
}

// Toggle button to "Start"
function toggleButtonToStart() {
    isRunning = false;
    stringSelector.disabled = false;
    button.innerText = "Start";
    stopIntervals();
}

// Toggle button to "Stop"
function toggleButtonToStop() {
    isRunning = true;
    stringSelector.disabled = true;
    button.innerText = "Stop";
}

// Toggle the session (start/stop)
function toggleSession() {
    if (isRunning) {
        toggleButtonToStart();
        pitchDisplay.innerText = ""; // Clear display when stopped
    } else {
        initializeTone(); // Ensure Tone.js is started
        toggleButtonToStop();
        startPitchAnnouncements();
    }
}

// Initialize Tone.js (ensure the context is started)
async function initializeTone() {
    await Tone.start();
    console.log("Tone.js AudioContext started");
}

// Initialize playable notes for the default string
updatePlayableNotes();
