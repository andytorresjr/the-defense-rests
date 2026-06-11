// The case registry. Add a folder under src/data/cases/ and list it here.
import { CASE as cross } from './state-v-cross/case.js';
import { CASE as vance } from './state-v-vance/case.js';

export const CASES = [cross, vance];

export function caseById(id) {
  return CASES.find(c => c.id === id) ?? CASES[0];
}
