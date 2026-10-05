// Paleta global única (29 colores, estilo GBA). Una letra = un color.
// Luz: arriba-izquierda → el primer tono de cada rampa es el más claro.
export const PALETTE = {
  K: '#1f1a2e', // contorno (violeta casi negro)
  W: '#f8f8f0', // blanco
  w: '#c8d0d8', // gris claro
  // césped
  a: '#9ad860', b: '#62b84e', c: '#3e9048', d: '#276040',
  // agua
  h: '#b0e8f8', i: '#58b0f0', j: '#2c70c8',
  // tierra / madera
  l: '#f0d898', m: '#c8a468', n: '#906838', o: '#603828',
  // roca
  u: '#b8b8c8', v: '#8888a0', x: '#585874',
  // rojo (tejado, cangrejo, gorra)
  R: '#f06058', S: '#c03848', T: '#842838',
  // pared crema
  y: '#f8f0d0', z: '#d0c090',
  // piel
  k: '#f8c8a0', q: '#d89068',
  // azul ropa
  B: '#5078e0', C: '#3050a8',
  // fuego / amarillo
  O: '#f8a838', P: '#e06820', Y: '#f8e058',
  // follaje de árbol
  G: '#38a060', H: '#1c5840',
} as const;

export type PaletteChar = keyof typeof PALETTE;
export const TRANSPARENT = '.';
export const PALETTE_SIZE = Object.keys(PALETTE).length;
