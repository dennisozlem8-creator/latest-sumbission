import { getAssessment } from "./assessments";

export type ExerciseMedia = {
  image: string;
  kidsImage?: string;
  kidsQuest: {
    title: string;
    story: string;
    gamePrompt: string;
    reps: number;
    reward: string;
  };
};

const defaultMedia = (name: string): ExerciseMedia => ({
  image: "/exercises/mobility.svg",
  kidsImage: "/kids/exercises/quest-default.webp?v=2",
  kidsQuest: {
    title: `${name} Quest`,
    story: "The bots count each stretch. Match the picture, then score.",
    gamePrompt: "Wear your sensor — reps count when you hit the right angle",
    reps: 10,
    reward: "Star badge",
  },
});

export const exerciseMedia: Record<string, ExerciseMedia> = {
  "ankle-pumps": {
    image: "/exercises/ankle.svg",
    kidsImage: "/kids/zones/ankle.webp?v=2",
    kidsQuest: {
      title: "Ankle Pump Boost",
      story: "The bots count each ankle pump. Point, flex, score!",
      gamePrompt: "Tap each time you point and flex your foot",
      reps: 15,
      reward: "Rocket badge",
    },
  },
  "calf-stretch": {
    image: "/exercises/stretch.svg",
    kidsQuest: {
      title: "Tall Stretch",
      story: "The yellow bot stretches tall. Match that reach!",
      gamePrompt: "Hold stretch, then tap when done",
      reps: 6,
      reward: "Reach badge",
    },
  },
  "resistance-eversion": {
    image: "/exercises/strength.svg",
    kidsQuest: {
      title: "Band Push",
      story: "Push out against the band. The bots count strong reps!",
      gamePrompt: "Tap for each strong push outward",
      reps: 12,
      reward: "Strong badge",
    },
  },
  "heel-raises": {
    image: "/exercises/strength.svg",
    kidsQuest: {
      title: "Tiptoe Bounce",
      story: "Rise on your toes. The bots bounce with you!",
      gamePrompt: "Tap each time you lift your heels",
      reps: 10,
      reward: "Tiptoe badge",
    },
  },
  "heel-slides": {
    image: "/exercises/knee.svg",
    kidsImage: "/kids/zones/knee.webp?v=2",
    kidsQuest: {
      title: "Heel Slide",
      story: "Slide your heel in. The green bot squats along!",
      gamePrompt: "Tap when you slide heel toward hip",
      reps: 12,
      reward: "Slide badge",
    },
  },
  "quad-sets": {
    image: "/exercises/knee.svg",
    kidsQuest: {
      title: "Muscle Lightning",
      story: "Squeeze your quad to charge lightning power!",
      gamePrompt: "Tap and hold, then release each rep",
      reps: 10,
      reward: "Power badge",
    },
  },
  "mini-squats": {
    image: "/exercises/strength.svg",
    kidsQuest: {
      title: "Frog Hop Squat",
      story: "Squat down with the bots. Mini squat, big score!",
      gamePrompt: "Tap for each mini squat",
      reps: 8,
      reward: "Squat badge",
    },
  },
  "straight-leg-raise": {
    image: "/exercises/strength.svg",
    kidsQuest: {
      title: "Leg Lift Launch",
      story: "Lift your leg to launch the balloon!",
      gamePrompt: "Tap when leg is raised",
      reps: 10,
      reward: "Lift badge",
    },
  },
  "pelvic-tilt": {
    image: "/exercises/core.svg",
    kidsQuest: {
      title: "Bridge Builder",
      story: "Tilt your pelvis to build a strong bridge!",
      gamePrompt: "Tap for each pelvic tilt",
      reps: 10,
      reward: "Bridge badge",
    },
  },
  "cat-cow": {
    image: "/exercises/core.svg",
    kidsImage: "/kids/zones/back.webp?v=1",
    kidsQuest: {
      title: "Cat & Cow Stretch",
      story: "Arch, then round. The bots stretch their backs too!",
      gamePrompt: "Tap for each cat-cow cycle",
      reps: 8,
      reward: "Back badge",
    },
  },
  "bird-dog": {
    image: "/exercises/core.svg",
    kidsQuest: {
      title: "Balance Bird Dog",
      story: "Balance like a bird on one leg, reach like a dog!",
      gamePrompt: "Tap when arm and leg are extended",
      reps: 8,
      reward: "Balance badge",
    },
  },
  "side-bend-stretch": {
    image: "/exercises/stretch.svg",
    kidsQuest: {
      title: "Rainbow Bend",
      story: "Bend side to side to paint a rainbow!",
      gamePrompt: "Tap after each side bend",
      reps: 6,
      reward: "Side-bend badge",
    },
  },
  "wrist-circles": {
    image: "/exercises/wrist.svg",
    kidsImage: "/kids/zones/wrist.webp?v=1",
    kidsQuest: {
      title: "Wrist Wiggle Wheel",
      story: "Spin your wrist. The pink bot wiggles with you!",
      gamePrompt: "Tap for each wrist circle",
      reps: 10,
      reward: "Wrist badge",
    },
  },
  "prayer-stretch": {
    image: "/exercises/wrist.svg",
    kidsQuest: {
      title: "Palm Press",
      story: "Press palms together. Hold, then the bots score it!",
      gamePrompt: "Tap when stretch is held",
      reps: 6,
      reward: "Press badge",
    },
  },
  "flexor-stretch": {
    image: "/exercises/wrist.svg",
    kidsQuest: {
      title: "Flexor Flower",
      story: "Stretch your wrist to help the flower bloom!",
      gamePrompt: "Tap after each stretch hold",
      reps: 6,
      reward: "Flex badge",
    },
  },
  "putty-squeeze": {
    image: "/exercises/grip.svg",
    kidsQuest: {
      title: "Super Squeeze",
      story: "Squeeze the putty to crush the slime monster!",
      gamePrompt: "Tap for each squeeze",
      reps: 12,
      reward: "Squeeze badge",
    },
  },
  pendulum: {
    image: "/exercises/mobility.svg",
    kidsQuest: {
      title: "Pendulum Swing",
      story: "Let the arm swing in a small circle.",
      gamePrompt: "Tap for each circle",
      reps: 10,
      reward: "Swing badge",
    },
  },
  "assisted-raise": {
    image: "/exercises/strength.svg",
    kidsQuest: {
      title: "Helping Hand Lift",
      story: "The other hand helps the arm lift.",
      gamePrompt: "Tap after each lift",
      reps: 8,
      reward: "Lift badge",
    },
  },
  "wall-slide": {
    image: "/exercises/stretch.svg",
    kidsQuest: {
      title: "Wall Climb",
      story: "Slide the arms up the wall, then back down.",
      gamePrompt: "Tap at the top of each slide",
      reps: 8,
      reward: "Wall badge",
    },
  },
  "isometric-external-rotation": {
    image: "/exercises/strength.svg",
    kidsQuest: {
      title: "Wall Press",
      story: "Press the hand into the wall and hold.",
      gamePrompt: "Tap after each hold",
      reps: 8,
      reward: "Press badge",
    },
  },
  "sit-to-stand": {
    image: "/exercises/strength.svg",
    kidsQuest: {
      title: "Chair Stand",
      story: "Stand up from the chair, then sit back down.",
      gamePrompt: "Tap each time you stand",
      reps: 8,
      reward: "Stand badge",
    },
  },
  "towel-stretch": {
    image: "/exercises/ankle.svg",
    kidsQuest: {
      title: "Towel Pull",
      story: "Pull the foot gently with a towel.",
      gamePrompt: "Tap after each hold",
      reps: 6,
      reward: "Towel badge",
    },
  },
  "tendon-glides": {
    image: "/exercises/wrist.svg",
    kidsQuest: {
      title: "Finger Wave",
      story: "Open, hook, and close the hand.",
      gamePrompt: "Tap for each cycle",
      reps: 8,
      reward: "Glide badge",
    },
  },
  "shoulder-rolls": {
    image: "/exercises/mobility.svg",
    kidsQuest: {
      title: "Shoulder Windmill",
      story: "Roll shoulders to spin the windmill!",
      gamePrompt: "Tap for each shoulder roll",
      reps: 10,
      reward: "Shoulder badge",
    },
  },
  "hip-flexor-stretch": {
    image: "/exercises/stretch.svg",
    kidsQuest: {
      title: "Hip Hero Lunge",
      story: "Stretch your hip to cross the lava river!",
      gamePrompt: "Tap when stretch is complete",
      reps: 6,
      reward: "Hip badge",
    },
  },
  "neck-rotation": {
    image: "/exercises/mobility.svg",
    kidsQuest: {
      title: "Owl Lookout",
      story: "Turn your head like an owl spotting treasure!",
      gamePrompt: "Tap for each head turn",
      reps: 8,
      reward: "Neck badge",
    },
  },
  "bodyweight-squat": {
    image: "/exercises/strength.svg",
    kidsQuest: {
      title: "Chair Quest Squat",
      story: "Squat with a chair. The red bot does it with you!",
      gamePrompt: "Tap for each supported squat",
      reps: 8,
      reward: "Chair squat badge",
    },
  },
};

export function getExerciseMedia(exerciseId: string, exerciseName: string) {
  return exerciseMedia[exerciseId] ?? defaultMedia(exerciseName);
}

const ZONE_SCENE: Record<string, string> = {
  ankle: "/kids/zones/ankle.webp?v=2",
  knee: "/kids/zones/knee.webp?v=2",
  "lower-back": "/kids/zones/back.webp?v=2",
  wrist: "/kids/zones/wrist.webp?v=2",
  other: "/kids/zones/meadow.webp?v=2",
};

let exerciseSceneMap: Record<string, string> | null = null;

function sceneForExercise(exerciseId: string) {
  if (!exerciseSceneMap) {
    exerciseSceneMap = {};
    for (const [zone, src] of Object.entries(ZONE_SCENE)) {
      const assessment = getAssessment(zone);
      for (const exercise of assessment?.exercises ?? []) {
        exerciseSceneMap[exercise.id] = src;
      }
    }
  }
  return exerciseSceneMap[exerciseId] ?? "/kids/exercises/quest-default.webp?v=2";
}

export function getKidsExerciseImage(exerciseId: string, _exerciseName: string) {
  return sceneForExercise(exerciseId);
}
