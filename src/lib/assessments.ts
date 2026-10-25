export type Question = {
  id: string;
  text: string;
  type: "scale" | "choice";
  options?: string[];
};

export type RomTest = {
  id: string;
  name: string;
  normalMin: number;
  normalMax: number;
  instructions: string;
};

export type Exercise = {
  id: string;
  name: string;
  description: string;
  sets: string;
  tags: ("gentle" | "mobility" | "strength" | "stability")[];
  forRom?: string[];
};

export type AreaAssessment = {
  intro: string;
  questions: Question[];
  romTests: RomTest[];
  exercises: Exercise[];
};

export const assessments: Record<string, AreaAssessment> = {
  ankle: {
    intro:
      "Complete this ankle screening to measure range of motion and receive a personalized exercise plan.",
    questions: [
      {
        id: "pain",
        text: "Rate your current ankle pain (0 = none, 10 = worst)",
        type: "scale",
      },
      {
        id: "duration",
        text: "How long have you had ankle symptoms?",
        type: "choice",
        options: ["Less than 2 weeks", "2–6 weeks", "More than 6 weeks"],
      },
      {
        id: "swelling",
        text: "Do you notice swelling around the ankle?",
        type: "choice",
        options: ["No", "Sometimes", "Yes, often"],
      },
      {
        id: "activity",
        text: "Does pain increase when walking or standing?",
        type: "choice",
        options: ["No", "A little", "Yes, significantly"],
      },
      {
        id: "injury",
        text: "Have you had a previous ankle sprain or injury?",
        type: "choice",
        options: ["No", "Yes, once", "Yes, multiple times"],
      },
      {
        id: "stiffness",
        text: "How stiff is your ankle in the morning?",
        type: "choice",
        options: ["Not stiff", "Somewhat stiff", "Very stiff"],
      },
      {
        id: "balance",
        text: "Do you feel unsteady on uneven surfaces?",
        type: "choice",
        options: ["No", "Sometimes", "Often"],
      },
      {
        id: "support",
        text: "Do you use a brace, wrap, or orthotic?",
        type: "choice",
        options: ["No", "Sometimes", "Yes, daily"],
      },
      {
        id: "sleep",
        text: "Does ankle pain affect your sleep?",
        type: "choice",
        options: ["No", "Sometimes", "Yes, often"],
      },
    ],
    romTests: [
      {
        id: "dorsiflexion",
        name: "Dorsiflexion",
        normalMin: 10,
        normalMax: 20,
        instructions: "Pull toes toward shin. Measure angle at ankle.",
      },
      {
        id: "plantarflexion",
        name: "Plantarflexion",
        normalMin: 40,
        normalMax: 50,
        instructions: "Point toes away from shin. Measure ankle angle.",
      },
      {
        id: "inversion",
        name: "Inversion",
        normalMin: 30,
        normalMax: 35,
        instructions: "Turn sole of foot inward. Measure tilt angle.",
      },
    ],
    exercises: [
      {
        id: "ankle-pumps",
        name: "Ankle Pumps",
        description: "Slowly point and flex the foot to improve circulation and mobility.",
        sets: "3 sets × 15 reps",
        tags: ["gentle", "mobility"],
        forRom: ["dorsiflexion", "plantarflexion"],
      },
      {
        id: "calf-stretch",
        name: "Standing Calf Stretch",
        description: "Stretch the calf with knee straight to improve dorsiflexion.",
        sets: "3 sets × 30 sec each leg",
        tags: ["mobility", "gentle"],
        forRom: ["dorsiflexion"],
      },
      {
        id: "resistance-eversion",
        name: "Resistance Band Eversion",
        description: "Strengthen outer ankle muscles for stability.",
        sets: "3 sets × 12 reps",
        tags: ["strength", "stability"],
        forRom: ["inversion"],
      },
      {
        id: "heel-raises",
        name: "Heel Raises",
        description: "Rise onto toes to build calf strength and plantarflexion control.",
        sets: "3 sets × 10 reps",
        tags: ["strength"],
        forRom: ["plantarflexion"],
      },
      {
        id: "towel-stretch",
        name: "Seated Towel Stretch",
        description: "Pull the foot toward you with a towel to ease a stiff ankle.",
        sets: "3 sets × 20 sec",
        tags: ["gentle", "mobility"],
        forRom: ["dorsiflexion"],
      },
    ],
  },
  knee: {
    intro:
      "Answer a few questions and measure knee range of motion to get targeted rehab exercises.",
    questions: [
      {
        id: "pain",
        text: "Rate your current knee pain (0 = none, 10 = worst)",
        type: "scale",
      },
      {
        id: "locking",
        text: "Does your knee ever lock or catch?",
        type: "choice",
        options: ["No", "Occasionally", "Yes, frequently"],
      },
      {
        id: "stairs",
        text: "How difficult are stairs?",
        type: "choice",
        options: ["Easy", "Moderate difficulty", "Very difficult"],
      },
      {
        id: "instability",
        text: "Do you feel the knee giving way?",
        type: "choice",
        options: ["Never", "Sometimes", "Often"],
      },
      {
        id: "swelling",
        text: "Is there swelling around the knee?",
        type: "choice",
        options: ["No", "Sometimes after activity", "Yes, frequently"],
      },
      {
        id: "squatting",
        text: "Can you squat without pain?",
        type: "choice",
        options: ["Yes, easily", "With some pain", "No, very painful"],
      },
      {
        id: "prior-surgery",
        text: "Have you had knee surgery before?",
        type: "choice",
        options: ["No", "Yes, over 1 year ago", "Yes, within the past year"],
      },
      {
        id: "exercise-history",
        text: "How often do you do knee exercises currently?",
        type: "choice",
        options: ["Never", "1–2 times per week", "3+ times per week"],
      },
    ],
    romTests: [
      {
        id: "flexion",
        name: "Knee Flexion",
        normalMin: 130,
        normalMax: 150,
        instructions: "Bend knee as far as comfortable. Measure angle behind knee.",
      },
      {
        id: "extension",
        name: "Knee Extension",
        normalMin: 0,
        normalMax: 5,
        instructions: "Straighten knee fully. Note degrees lacking full extension (0 = full).",
      },
    ],
    exercises: [
      {
        id: "heel-slides",
        name: "Heel Slides",
        description: "Slide heel toward hip to gently increase knee flexion.",
        sets: "3 sets × 12 reps",
        tags: ["gentle", "mobility"],
        forRom: ["flexion"],
      },
      {
        id: "quad-sets",
        name: "Quad Sets",
        description: "Tighten thigh muscle with knee straight to improve extension control.",
        sets: "3 sets × 10 sec holds",
        tags: ["gentle", "stability"],
        forRom: ["extension"],
      },
      {
        id: "mini-squats",
        name: "Mini Squats",
        description: "Small squat within pain-free range to build strength.",
        sets: "3 sets × 8 reps",
        tags: ["strength"],
        forRom: ["flexion"],
      },
      {
        id: "straight-leg-raise",
        name: "Straight Leg Raise",
        description: "Lift straight leg to strengthen quads without knee stress.",
        sets: "3 sets × 10 reps",
        tags: ["strength", "stability"],
      },
      {
        id: "sit-to-stand",
        name: "Sit to Stand",
        description: "Stand up from a chair and sit back down with control.",
        sets: "3 sets × 8 reps",
        tags: ["strength"],
        forRom: ["flexion"],
      },
    ],
  },
  "lower-back": {
    intro:
      "This lower back assessment helps identify mobility limits and guides your recovery exercises.",
    questions: [
      {
        id: "pain",
        text: "Rate your current lower back pain (0 = none, 10 = worst)",
        type: "scale",
      },
      {
        id: "radiating",
        text: "Do you have pain radiating down the leg?",
        type: "choice",
        options: ["No", "Occasionally", "Yes"],
      },
      {
        id: "sitting",
        text: "Does sitting worsen your symptoms?",
        type: "choice",
        options: ["No", "Somewhat", "Yes, a lot"],
      },
      {
        id: "morning",
        text: "Is stiffness worse in the morning?",
        type: "choice",
        options: ["No", "A little", "Yes, significantly"],
      },
      {
        id: "lifting",
        text: "Does lifting or bending worsen your back pain?",
        type: "choice",
        options: ["No", "Sometimes", "Yes, often"],
      },
      {
        id: "posture",
        text: "How many hours do you sit per day?",
        type: "choice",
        options: ["Under 4 hours", "4–8 hours", "Over 8 hours"],
      },
      {
        id: "prior-treatment",
        text: "Have you tried physical therapy before for your back?",
        type: "choice",
        options: ["No", "Yes, briefly", "Yes, multiple times"],
      },
      {
        id: "exercise-frequency",
        text: "How often do you stretch or exercise your back?",
        type: "choice",
        options: ["Rarely", "1–2 times per week", "Most days"],
      },
    ],
    romTests: [
      {
        id: "flexion",
        name: "Forward Flexion",
        normalMin: 60,
        normalMax: 90,
        instructions: "Bend forward at hips. Estimate angle from standing.",
      },
      {
        id: "extension",
        name: "Extension",
        normalMin: 20,
        normalMax: 30,
        instructions: "Lean backward gently. Measure backward bend angle.",
      },
      {
        id: "lateral",
        name: "Lateral Flexion",
        normalMin: 25,
        normalMax: 35,
        instructions: "Side bend to each side. Use average of both sides.",
      },
    ],
    exercises: [
      {
        id: "pelvic-tilt",
        name: "Pelvic Tilts",
        description: "Gently flatten lower back against floor to mobilize lumbar spine.",
        sets: "3 sets × 10 reps",
        tags: ["gentle", "mobility"],
        forRom: ["flexion", "extension"],
      },
      {
        id: "cat-cow",
        name: "Cat-Cow Stretch",
        description: "Alternate arching and rounding spine for mobility.",
        sets: "2 sets × 8 cycles",
        tags: ["gentle", "mobility"],
        forRom: ["flexion", "extension"],
      },
      {
        id: "bird-dog",
        name: "Bird Dog",
        description: "Extend opposite arm and leg to build core stability.",
        sets: "3 sets × 8 each side",
        tags: ["stability", "strength"],
      },
      {
        id: "side-bend-stretch",
        name: "Standing Side Bend",
        description: "Gentle side bending to improve lateral mobility.",
        sets: "2 sets × 30 sec each side",
        tags: ["mobility", "gentle"],
        forRom: ["lateral"],
      },
    ],
  },
  wrist: {
    intro:
      "Measure wrist range of motion and answer screening questions to get hand and wrist exercises.",
    questions: [
      {
        id: "pain",
        text: "Rate your current wrist pain (0 = none, 10 = worst)",
        type: "scale",
      },
      {
        id: "typing",
        text: "Does typing or gripping worsen pain?",
        type: "choice",
        options: ["No", "Sometimes", "Yes, often"],
      },
      {
        id: "numbness",
        text: "Do you have numbness or tingling in the fingers?",
        type: "choice",
        options: ["No", "Occasionally", "Yes"],
      },
      {
        id: "dominant",
        text: "Which wrist is affected?",
        type: "choice",
        options: ["Left", "Right", "Both"],
      },
      {
        id: "grip",
        text: "Has your grip strength decreased?",
        type: "choice",
        options: ["No", "Somewhat", "Yes, significantly"],
      },
      {
        id: "work",
        text: "Does repetitive hand use at work worsen symptoms?",
        type: "choice",
        options: ["No", "Sometimes", "Yes, daily"],
      },
      {
        id: "splint",
        text: "Do you wear a wrist splint or brace?",
        type: "choice",
        options: ["No", "Sometimes", "Yes, regularly"],
      },
      {
        id: "prior-exercises",
        text: "Have you done wrist exercises in the past month?",
        type: "choice",
        options: ["No", "A few times", "Regularly"],
      },
    ],
    romTests: [
      {
        id: "flexion",
        name: "Wrist Flexion",
        normalMin: 80,
        normalMax: 90,
        instructions: "Bend wrist downward. Measure angle from forearm.",
      },
      {
        id: "extension",
        name: "Wrist Extension",
        normalMin: 70,
        normalMax: 80,
        instructions: "Bend wrist upward. Measure angle from forearm.",
      },
      {
        id: "deviation",
        name: "Ulnar Deviation",
        normalMin: 30,
        normalMax: 40,
        instructions: "Move hand toward pinky side. Measure deviation angle.",
      },
    ],
    exercises: [
      {
        id: "wrist-circles",
        name: "Wrist Circles",
        description: "Slow circles in both directions to lubricate the joint.",
        sets: "2 sets × 10 each direction",
        tags: ["gentle", "mobility"],
        forRom: ["flexion", "extension"],
      },
      {
        id: "prayer-stretch",
        name: "Prayer Stretch",
        description: "Press palms together and lower hands to stretch wrist extension.",
        sets: "3 sets × 20 sec",
        tags: ["mobility", "gentle"],
        forRom: ["extension"],
      },
      {
        id: "flexor-stretch",
        name: "Wrist Flexor Stretch",
        description: "Extend arm and pull fingers back to stretch flexors.",
        sets: "3 sets × 30 sec each arm",
        tags: ["mobility", "gentle"],
        forRom: ["flexion"],
      },
      {
        id: "tendon-glides",
        name: "Tendon Glides",
        description: "Open the hand, hook the fingers, then make a fist to move the tendons.",
        sets: "2 sets × 8 cycles",
        tags: ["gentle", "mobility"],
        forRom: ["flexion"],
      },
      {
        id: "putty-squeeze",
        name: "Grip Squeeze",
        description: "Squeeze soft putty or ball to rebuild grip strength.",
        sets: "3 sets × 12 reps",
        tags: ["strength"],
        forRom: ["deviation"],
      },
    ],
  },
  shoulder: {
    intro: "Measure how far the arm lifts forward, then follow a short shoulder plan.",
    questions: [
      {
        id: "pain",
        text: "Rate your current shoulder pain (0 = none, 10 = worst)",
        type: "scale",
      },
      {
        id: "overhead",
        text: "Can you reach overhead?",
        type: "choice",
        options: ["Yes, easily", "Partway", "No"],
      },
      {
        id: "night",
        text: "Does the shoulder wake you at night?",
        type: "choice",
        options: ["No", "Sometimes", "Most nights"],
      },
      {
        id: "side",
        text: "Which shoulder are you working on?",
        type: "choice",
        options: ["Right", "Left", "Both"],
      },
    ],
    romTests: [
      {
        id: "shoulder-flexion",
        name: "Shoulder Flexion",
        normalMin: 160,
        normalMax: 180,
        instructions: "Stand sideways. Raise the arm forward. The angle is from the side of the body to the arm.",
      },
    ],
    exercises: [
      {
        id: "pendulum",
        name: "Pendulum",
        description: "Lean on a table and let the arm swing in a small circle.",
        sets: "2 sets × 10 circles each way",
        tags: ["gentle", "mobility"],
        forRom: ["shoulder-flexion"],
      },
      {
        id: "assisted-raise",
        name: "Assisted Raise",
        description: "Use the other hand or a stick to help the arm lift forward.",
        sets: "3 sets × 8 reps",
        tags: ["gentle", "mobility"],
        forRom: ["shoulder-flexion"],
      },
      {
        id: "wall-slide",
        name: "Wall Slide",
        description: "Slide the forearm up a wall, only as high as the shoulder stays relaxed.",
        sets: "3 sets × 8 reps",
        tags: ["mobility", "strength"],
        forRom: ["shoulder-flexion"],
      },
      {
        id: "isometric-external-rotation",
        name: "Isometric External Rotation",
        description: "Elbow at the side, press the back of the hand into a wall without moving the arm.",
        sets: "3 sets × 8 sec holds",
        tags: ["gentle", "stability"],
      },
      {
        id: "shoulder-rolls",
        name: "Shoulder Rolls",
        description: "Roll the shoulders up, back, and down to settle the shoulder blade.",
        sets: "2 sets × 10 each direction",
        tags: ["gentle", "mobility"],
        forRom: ["shoulder-flexion"],
      },
    ],
  },
  other: {
    intro:
      "General mobility screening for other body areas. Complete the assessment for a balanced exercise plan.",
    questions: [
      {
        id: "pain",
        text: "Rate your overall pain (0 = none, 10 = worst)",
        type: "scale",
      },
      {
        id: "area",
        text: "Which area bothers you most?",
        type: "choice",
        options: ["Shoulder", "Hip", "Neck", "General full body"],
      },
      {
        id: "activity-level",
        text: "Current activity level?",
        type: "choice",
        options: ["Mostly sedentary", "Moderately active", "Very active"],
      },
      {
        id: "goal",
        text: "Primary goal?",
        type: "choice",
        options: ["Reduce pain", "Improve flexibility", "Build strength"],
      },
      {
        id: "pain-duration",
        text: "How long have symptoms been present?",
        type: "choice",
        options: ["Less than 2 weeks", "2–8 weeks", "More than 8 weeks"],
      },
      {
        id: "prior-pt",
        text: "Have you worked with a physical therapist before?",
        type: "choice",
        options: ["No", "Yes, in the past", "Yes, currently"],
      },
      {
        id: "daily-impact",
        text: "How much do symptoms limit daily activities?",
        type: "choice",
        options: ["Not much", "Moderately", "Severely"],
      },
      {
        id: "home-exercises",
        text: "Do you currently do home exercises?",
        type: "choice",
        options: ["No", "Occasionally", "Yes, most days"],
      },
    ],
    romTests: [
      {
        id: "shoulder-flexion",
        name: "Shoulder Flexion",
        normalMin: 160,
        normalMax: 180,
        instructions: "Raise arm forward overhead. Measure angle from body.",
      },
      {
        id: "hip-flexion",
        name: "Hip Flexion",
        normalMin: 110,
        normalMax: 120,
        instructions: "Bring knee toward chest. Measure hip angle.",
      },
      {
        id: "neck-rotation",
        name: "Neck Rotation",
        normalMin: 70,
        normalMax: 80,
        instructions: "Turn head left and right. Use average rotation angle.",
      },
    ],
    exercises: [
      {
        id: "shoulder-rolls",
        name: "Shoulder Rolls",
        description: "Roll shoulders forward and back to release upper body tension.",
        sets: "2 sets × 10 each direction",
        tags: ["gentle", "mobility"],
        forRom: ["shoulder-flexion"],
      },
      {
        id: "hip-flexor-stretch",
        name: "Hip Flexor Stretch",
        description: "Half-kneeling stretch to open the front of the hip.",
        sets: "3 sets × 30 sec each side",
        tags: ["mobility", "gentle"],
        forRom: ["hip-flexion"],
      },
      {
        id: "neck-rotation",
        name: "Neck Rotations",
        description: "Slowly turn head side to side within comfortable range.",
        sets: "2 sets × 8 each direction",
        tags: ["gentle", "mobility"],
        forRom: ["neck-rotation"],
      },
      {
        id: "bodyweight-squat",
        name: "Supported Squat",
        description: "Squat with chair support for full-body strength.",
        sets: "3 sets × 8 reps",
        tags: ["strength", "stability"],
      },
    ],
  },
};

export function getAssessment(areaId: string) {
  return assessments[areaId];
}

export type AssessmentAnswers = Record<string, string | number>;

export type RomValues = Record<string, number>;

export function getLimitedRomTests(
  areaId: string,
  romValues: RomValues
): string[] {
  const assessment = getAssessment(areaId);
  if (!assessment) return [];

  return assessment.romTests
    .filter((test) => {
      const value = romValues[test.id];
      if (value === undefined || Number.isNaN(value)) return false;

      if (test.id === "extension" && areaId === "knee") {
        return value > test.normalMax;
      }

      return value < test.normalMin;
    })
    .map((test) => test.id);
}

export function getRecommendedExercises(
  areaId: string,
  answers: AssessmentAnswers,
  romValues: RomValues,
  previousExerciseIds: string[] = []
): Exercise[] {
  const assessment = getAssessment(areaId);
  if (!assessment) return [];

  const pain = Number(answers.pain ?? 5);
  const limitedRom = getLimitedRomTests(areaId, romValues);
  const highPain = pain >= 7;

  const previousCounts = previousExerciseIds.reduce<Record<string, number>>(
    (acc, id) => {
      acc[id] = (acc[id] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const scored = assessment.exercises.map((exercise) => {
    let score = 0;

    if (exercise.forRom?.some((rom) => limitedRom.includes(rom))) {
      score += 3;
    }

    if (highPain && exercise.tags.includes("gentle")) {
      score += 2;
    }

    if (!highPain && exercise.tags.includes("strength")) {
      score += 2;
    }

    if (limitedRom.length === 0 && exercise.tags.includes("mobility")) {
      score += 1;
    }

    const timesDone = previousCounts[exercise.id] ?? 0;
    if (timesDone === 0) {
      score += 2;
    } else if (timesDone >= 2) {
      score -= 2;
    }

    if (timesDone >= 1 && exercise.tags.includes("strength") && pain <= 5) {
      score += 2;
    }

    return { exercise, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const selected = scored.filter((item) => item.score > 0).slice(0, 3);

  if (selected.length > 0) {
    return selected.map((item) => item.exercise);
  }

  return assessment.exercises.slice(0, 3);
}

export function getRomPercent(test: RomTest, value: number, areaId: string) {
  if (test.id === "extension" && areaId === "knee") {
    const deficit = Math.max(0, value);
    return Math.max(0, Math.min(100, 100 - deficit * 10));
  }

  const mid = (test.normalMin + test.normalMax) / 2;
  return Math.max(0, Math.min(100, Math.round((value / mid) * 100)));
}
