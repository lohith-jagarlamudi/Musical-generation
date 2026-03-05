export enum Swara {
  S = "S",
  R1 = "R1",
  R2 = "R2",
  R3 = "R3",
  G1 = "G1",
  G2 = "G2",
  G3 = "G3",
  M1 = "M1",
  M2 = "M2",
  P = "P",
  D1 = "D1",
  D2 = "D2",
  D3 = "D3",
  N1 = "N1",
  N2 = "N2",
  N3 = "N3",
  S_HIGH = "S'",
}

export interface Raga {
  name: string;
  arohana: Swara[];
  avarohana: Swara[];
  description: string;
}

export interface Tala {
  name: string;
  beats: number;
  structure: number[]; // e.g., [4, 2, 2] for Adi Tala
}

export interface Note {
  swara: Swara;
  duration: number; // in beats
  octave: number; // -1, 0, 1
}

export interface Composition {
  title: string;
  raga: string;
  tala: string;
  notes: Note[];
  explanation: string;
}
