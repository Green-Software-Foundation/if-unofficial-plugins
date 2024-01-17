import {Generator} from '../interfaces';
import * as yaml from 'js-yaml';

class CommonGenerator implements Generator {
  private name = '';
  private generateObject: {} = {};

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
      throw new Error('name is empty or null');
    }
    return name;
  }

  private validateConfig(config: {[key: string]: any}): {[key: string]: any} {
    if (!config || Object.keys(config).length === 0) {
      throw new Error('Config must not be null or empty.');
    }
    let ret: {[key: string]: any} = {};
    try {
      ret = yaml.load(JSON.stringify({...config})) as {[key: string]: any};
    } catch (error) {
      throw new Error('Invalid YAML object.');
    }
    return ret;
  }
}

export default CommonGenerator;
