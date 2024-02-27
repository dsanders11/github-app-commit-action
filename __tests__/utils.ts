import * as core from '@actions/core';

function makeMockInputImplementation<T>(
  inputs: Record<string, T>,
  undefinedValue: T
) {
  return (name: string, options?: core.InputOptions) => {
    if (name in inputs) {
      return inputs[name];
    }

    if (options?.required) {
      throw new Error(`Input required and not supplied: ${name}`);
    }

    return undefinedValue;
  };
}

export function mockGetInput(inputs: Record<string, string>): void {
  jest
    .mocked(core.getInput)
    .mockImplementation(makeMockInputImplementation(inputs, ''));
}

export function mockGetBooleanInput(inputs: Record<string, boolean>): void {
  jest
    .mocked(core.getBooleanInput)
    .mockImplementation(makeMockInputImplementation(inputs, false));
}
