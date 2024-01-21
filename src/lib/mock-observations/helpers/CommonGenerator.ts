import {Generator} from '../interfaces';
import * as yaml from 'js-yaml';
import {ERRORS} from '../../../util/errors';
import {buildErrorMessage} from '../../../util/helpers';
const {InputValidationError} = ERRORS;

class CommonGenerator implements Generator {
  private name = '';
  private generateObject: {} = {};
  errorBuilder = buildErrorMessage(CommonGenerator);

  initialise(name: string, config: {[key: string]: any}): void {
    this.name = this.validateName(name);
    this.generateObject = this.validateConfig(config);
  }

  next(_historical: Object[]): Object {
    return Object.assign({}, this.generateObject);
  }

  public getName(): String {
    return this.name;
  }

  private validateName(name: string | null): string {
    if (name === null || name.trim() === '') {
      throw new InputValidationError(
        this.errorBuilder({message: 'name is null'})
      );
    }
    return name;
  }

  private validateConfig(config: {[key: string]: any}): {[key: string]: any} {
    if (!config || Object.keys(config).length === 0) {
      throw new InputValidationError(
        this.errorBuilder({message: 'Config must not be null or empty'})
      );
    }
    let ret: {[key: string]: any} = {};
    try {
      ret = yaml.load(JSON.stringify({...config})) as {[key: string]: any};
    } catch (error) {
      throw new InputValidationError(
        this.errorBuilder({message: 'Invalid YML structure'})
      );
    }
    return ret;
  }
}

export default CommonGenerator;
