import {
  parseAndSortNums,
  getMappingStrategy,
  MappingStrategies,
  createMappingStrategy,
} from '../../../src/services/mapping/mappingStrategy';

describe('parseAndSortNums', () => {
  it('should parse and sort a comma-separated list of numbers', () => {
    const input = '5,3,9,1,7';
    const expected = [1, 3, 5, 7, 9];

    expect(parseAndSortNums(input)).toEqual(expected);
  });

  it('should handle spaces in the input', () => {
    const input = '5, 3, 9, 1, 7';
    const expected = [1, 3, 5, 7, 9];

    expect(parseAndSortNums(input)).toEqual(expected);
  });

  it('should filter out non-numeric values', () => {
    const input = '5,abc,9,def,7';
    const expected = [5, 7, 9];

    expect(parseAndSortNums(input)).toEqual(expected);
  });

  it('should return empty array for empty input', () => {
    expect(parseAndSortNums('')).toEqual([]);
  });

  it('should handle very large numbers', () => {
    const input = '1000000,5,999999';
    const expected = [5, 999999, 1000000];

    expect(parseAndSortNums(input)).toEqual(expected);
  });
});

describe('defaultMapping', () => {
  it('should correctly map a valid row', () => {
    const row = ['John', '30', '5,3,9,1,7'];
    const defaultStrategy = MappingStrategies.default;

    const result = defaultStrategy.map(row);

    expect(result).toEqual({
      name: 'John',
      age: 30,
      nums: [1, 3, 5, 7, 9],
    });
  });

  it('should handle empty nums', () => {
    const row = ['John', '30', ''];
    const defaultStrategy = MappingStrategies.default;

    const result = defaultStrategy.map(row);

    expect(result).toEqual({
      name: 'John',
      age: 30,
      nums: [],
    });
  });

  it('should convert string age to number', () => {
    const row = ['John', '30', '5,3'];
    const defaultStrategy = MappingStrategies.default;

    const result = defaultStrategy.map(row);

    expect(result.age).toBe(30);
    expect(typeof result.age).toBe('number');
  });
});

describe('defaultValidation', () => {
  it('should return valid for correct data', () => {
    const row = ['John', '30', '5,3,9,1,7'];
    const defaultStrategy = MappingStrategies.default;

    const result = defaultStrategy.validate(row);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should detect missing name', () => {
    const row = ['', '30', '5,3,9,1,7'];
    const defaultStrategy = MappingStrategies.default;

    const result = defaultStrategy.validate(row);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({ col: 0 });
  });

  it('should detect invalid age', () => {
    const row = ['John', 'not-a-number', '5,3,9,1,7'];
    const defaultStrategy = MappingStrategies.default;

    const result = defaultStrategy.validate(row);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({ col: 1 });
  });

  it('should detect out-of-range age', () => {
    const row = ['John', '200', '5,3,9,1,7'];
    const defaultStrategy = MappingStrategies.default;

    const result = defaultStrategy.validate(row);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({ col: 1 });
  });

  it('should detect multiple errors', () => {
    const row = ['', 'not-a-number', '5,3,9,1,7'];
    const defaultStrategy = MappingStrategies.default;

    const result = defaultStrategy.validate(row);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors).toContainEqual({ col: 0 });
    expect(result.errors).toContainEqual({ col: 1 });
  });
});

describe('getMappingStrategy', () => {
  it('should return requested strategy when it exists', () => {
    const strategy = getMappingStrategy('default');

    expect(strategy).toBe(MappingStrategies.default);
  });

  it('should return default strategy when requested one does not exist', () => {
    const strategy = getMappingStrategy('non-existent');

    expect(strategy).toBe(MappingStrategies.default);
  });

  it('should return default strategy when format is empty', () => {
    const strategy = getMappingStrategy('');

    expect(strategy).toBe(MappingStrategies.default);
  });
});


