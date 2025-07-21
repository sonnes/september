/**
 * Vector
 * Extends Array with specified {DIMENSIONS}.
 */

const { DIMENSIONS = 144 } = process.env;
const RANGE_ERROR = 'RangeError: Invalid vector length.';

class Vector extends Array<number> {
  static fromNull(): Vector {
    return this.from({ length: DIMENSIONS } as ArrayLike<number>).fill(0);
  }

  constructor() {
    super(...arguments);

    if (this.length !== DIMENSIONS) {
      throw RANGE_ERROR;
    }
  }
}

export default Vector;
