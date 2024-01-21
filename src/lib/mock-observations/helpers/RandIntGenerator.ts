import {Generator} from '../interfaces';
import {ERRORS} from '../../../util/errors';
import {buildErrorMessage} from '../../../util/helpers';
const {InputValidationError} = ERRORS;

class RandIntGenerator implements Generator {
  private static readonly MIN: string = 'min';
  private static readonly MAX: string = 'max';
  private fieldToPopulate = '';
  private min = 0;
  private max = 0;
  errorBuilder = buildErrorMessage(RandIntGenerator);

  initialise(fieldToPopulate: string, config: {[key: string]: any}): void {
    this.fieldToPopulate = this.validateName(fieldToPopulate);
    this.validateConfig(config);
    this.min = config[RandIntGenerator.MIN];
    this.max = config[RandIntGenerator.MAX];
  }

  next(_historical: Object[]): Object {
    const retObject = {
      [this.fieldToPopulate]: this.generateRandInt(),
    };
    return retObject;
  }

  private validateName(name: string | null): string {
    if (name === null || name.trim() === '') {
      throw new InputValidationError(
        this.errorBuilder({message: 'name is empty or null'})
      );
    }
    return name;
  }

  private validateConfig(config: {[key: string]: any}): void {
    if (!Object.prototype.hasOwnProperty.call(config, RandIntGenerator.MIN)) {
      throw new InputValidationError(
        this.errorBuilder({
          message: 'config is missing ' + RandIntGenerator.MIN,
        })
      );
    }
    if (!Object.prototype.hasOwnProperty.call(config, RandIntGenerator.MAX)) {
      throw new InputValidationError(
        this.errorBuilder({
          message: 'config is missing ' + RandIntGenerator.MAX,
        })
      );
    }
  }

  private generateRandInt(): number {
    const randomNumber = Math.random();
    const scaledNumber = randomNumber * (this.max - this.min) + this.min;
    const truncatedNumber = Math.trunc(scaledNumber);
    return truncatedNumber;
  }
}

export default RandIntGenerator;
