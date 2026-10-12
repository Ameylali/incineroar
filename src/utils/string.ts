export const capitalize = (path: string) =>
  `${path.charAt(0).toUpperCase()}${path.slice(1).toLowerCase()}`;

export const normalizeSpeciesName = (species: string) => {
  const lower = species.toLowerCase();
  if (lower.endsWith('-m')) return `${lower.slice(0, -2)}-male`;
  if (lower.endsWith('-f')) return `${lower.slice(0, -2)}-female`;
  return lower;
};
