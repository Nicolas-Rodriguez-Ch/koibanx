interface MappingStrategy {
  map: (rox: any[]) => any;
  validate: (row: any[]) => { valid: boolean; errors: { col: number }[] };
}

const parseAndSortNums = (numsStr: string): number[] => {
  return numsStr
    .split(',')
    .map((num) => parseInt(num.trim(), 10))
    .filter((num) => !isNaN(num))
    .sort((a, b) => a - b);
};

const defaultMapping = (row: any[]): any => {
  return {
    name: row[0],
    age: parseInt(row[1], 10),
    nums: parseAndSortNums(row[2]),
  };
};

const defaultValidation = (
  row: any[]
): { valid: boolean; errors: { col: number }[] } => {
  const errors: { col: number }[] = [];

  if (!row[0] || typeof row[0] !== 'string') {
    errors.push({ col: 0 });
  }

  const age = parseInt(row[1], 10);
  if (isNaN(age) || age < 0 || age > 150) {
    errors.push({ col: 1 });
  }

  try {
    parseAndSortNums(row[2]);
  } catch (error) {
    errors.push({ col: 2 });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

const createMappingStrategy = (
  mapFn: (row: any[]) => any,
  validateFn: (row: any[]) => { valid: boolean; errors: { col: number }[] }
): MappingStrategy => {
  return {
    map: mapFn,
    validate: validateFn,
  };
};

const MappingStrategies: { [key: string]: MappingStrategy } = {
  default: createMappingStrategy(defaultMapping, defaultValidation),
};

const getMappingStrategy = (format: string): MappingStrategy => {
  return MappingStrategies[format] || MappingStrategies.default;
};


export {
  MappingStrategy,
  parseAndSortNums,
  getMappingStrategy,
  MappingStrategies,
  createMappingStrategy
};