import { Raga, Swara, Tala } from "./types";

export const RAGAS: Raga[] = [
  {
    name: "Mayamalavagowla",
    arohana: [Swara.S, Swara.R1, Swara.G3, Swara.M1, Swara.P, Swara.D1, Swara.N3, Swara.S_HIGH],
    avarohana: [Swara.S_HIGH, Swara.N3, Swara.D1, Swara.P, Swara.M1, Swara.G3, Swara.R1, Swara.S],
    description: "A major raga in Carnatic music, often the first raga taught to beginners. It is known for its symmetry and spiritual depth."
  },
  {
    name: "Kalyani",
    arohana: [Swara.S, Swara.R2, Swara.G3, Swara.M2, Swara.P, Swara.D2, Swara.N3, Swara.S_HIGH],
    avarohana: [Swara.S_HIGH, Swara.N3, Swara.D2, Swara.P, Swara.M2, Swara.G3, Swara.R2, Swara.S],
    description: "A very popular and grand raga, equivalent to the Lydian mode. It is known for its bright and auspicious quality."
  },
  {
    name: "Mohanam",
    arohana: [Swara.S, Swara.R2, Swara.G3, Swara.P, Swara.D2, Swara.S_HIGH],
    avarohana: [Swara.S_HIGH, Swara.D2, Swara.P, Swara.G3, Swara.R2, Swara.S],
    description: "A pentatonic raga that is universally loved. It has a cheerful and bright character."
  },
  {
    name: "Sankarabharanam",
    arohana: [Swara.S, Swara.R2, Swara.G3, Swara.M1, Swara.P, Swara.D2, Swara.N3, Swara.S_HIGH],
    avarohana: [Swara.S_HIGH, Swara.N3, Swara.D2, Swara.P, Swara.M1, Swara.G3, Swara.R2, Swara.S],
    description: "The equivalent of the Major scale. It is a majestic raga that is widely used in many musical traditions."
  },
  {
    name: "Todi",
    arohana: [Swara.S, Swara.R1, Swara.G2, Swara.M1, Swara.P, Swara.D1, Swara.N2, Swara.S_HIGH],
    avarohana: [Swara.S_HIGH, Swara.N2, Swara.D1, Swara.P, Swara.M1, Swara.G2, Swara.R1, Swara.S],
    description: "A heavy and profound raga, known for its complex gamakas (oscillations) and emotional depth."
  }
];

export const TALAS: Tala[] = [
  {
    name: "Adi Tala",
    beats: 8,
    structure: [4, 2, 2]
  },
  {
    name: "Rupaka Tala",
    beats: 3,
    structure: [1, 2]
  },
  {
    name: "Misra Chapu",
    beats: 7,
    structure: [3, 2, 2]
  }
];

// Frequency mapping for 12 semitones starting from C4 (261.63 Hz)
// S is the tonic.
export const SWARA_FREQUENCIES: Record<Swara, number> = {
  [Swara.S]: 1.0,
  [Swara.R1]: 1.05946, // 2^(1/12)
  [Swara.R2]: 1.12246, // 2^(2/12)
  [Swara.R3]: 1.18921, // 2^(3/12)
  [Swara.G1]: 1.12246, // Same as R2
  [Swara.G2]: 1.18921, // Same as R3
  [Swara.G3]: 1.25992, // 2^(4/12)
  [Swara.M1]: 1.33483, // 2^(5/12)
  [Swara.M2]: 1.41421, // 2^(6/12)
  [Swara.P]: 1.49831,  // 2^(7/12)
  [Swara.D1]: 1.58740, // 2^(8/12)
  [Swara.D2]: 1.68179, // 2^(9/12)
  [Swara.D3]: 1.78180, // 2^(10/12)
  [Swara.N1]: 1.68179, // Same as D2
  [Swara.N2]: 1.78180, // Same as D3
  [Swara.N3]: 1.88775, // 2^(11/12)
  [Swara.S_HIGH]: 2.0,
};
