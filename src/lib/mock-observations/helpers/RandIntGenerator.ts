import {Generator} from '../interfaces';

class RandIntGenerator implements Generator {
  private static readonly MIN: string = 'min';
  private static readonly MAX: string = 'max';
  private fieldToPopulate = '';
  private min = 0;
  private max = 0;

  initialise(fieldToPopulate: string, config: {[key: string]: any}): void {
    this.fieldToPopulate = this.validateName(fieldToPopulate);
    this.validateConfig(config);
    this.min = config[RandIntGenerator.MIN];
    this.max = config[RandIntGenerator.MAX];
  }

  next(_historical: Object[]): Object {
    const randomNumber = Math.random();
    const scaledNumber = randomNumber * (this.max - this.min) + this.min;
    const truncatedNumber = Math.trunc(scaledNumber);
    const retObject = {
      [this.fieldToPopulate]: truncatedNumber,
    };
    return retObject;
  }

  private validateName(name: string | null): string {
    if (name === null || name.trim() === '') {
      throw new Error('name is empty or null');
    }
    return name;
  }

  private validateConfig(config: {[key: string]: any}): void {
    if (!Object.prototype.hasOwnProperty.call(config, RandIntGenerator.MIN)) {
      throw new Error('config is missing ' + RandIntGenerator.MIN);
    }
    if (!Object.prototype.hasOwnProperty.call(config, RandIntGenerator.MAX)) {
      throw new Error('config is missing ' + RandIntGenerator.MAX);
    }
  }
}

export default RandIntGenerator;
