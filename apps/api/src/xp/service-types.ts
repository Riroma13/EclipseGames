export const specialtyCategory = { Leader:'COMMUNICATION', Diplomat:'COMMUNICATION', Strategist:'PRECISION', Analyst:'PRECISION', Disciplined:'CONSISTENCY', Perseverant:'CONSISTENCY', Helper:'COLLABORATION', Ally:'COLLABORATION' } as const;
export type Specialty = keyof typeof specialtyCategory;
