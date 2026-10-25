export type BodyArea = {
  id: string;
  label: string;
  description: string;
  cover: string;
};

export const bodyAreas: BodyArea[] = [
  {
    id: "ankle",
    label: "Ankle",
    description: "Strengthen and restore ankle mobility.",
    cover: "/images/landing-younger-session.webp?v=1",
  },
  {
    id: "knee",
    label: "Knee",
    description: "Support knee stability and range of motion.",
    cover: "/images/landing-mpu-knee.webp?v=1",
  },
  {
    id: "lower-back",
    label: "Lower Back",
    description: "Ease tension and improve core support.",
    cover: "/images/landing-exercise.webp",
  },
  {
    id: "wrist",
    label: "Wrist",
    description: "Rebuild wrist flexibility and control.",
    cover: "/images/landing-myoware-arm.webp?v=1",
  },
  {
    id: "shoulder",
    label: "Shoulder",
    description: "Raise the arm forward and track shoulder motion.",
    cover: "/images/landing-myoware-arm.webp?v=1",
  },
  {
    id: "other",
    label: "Other",
    description: "Explore exercises for additional areas.",
    cover: "/images/landing-older-session.webp?v=1",
  },
];

export function getBodyArea(id: string) {
  return bodyAreas.find((area) => area.id === id);
}
