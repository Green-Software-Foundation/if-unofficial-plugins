import { Generator } from '../interfaces';

class RandIntGenerator implements Generator {
	private static readonly MIN: string = 'min';
	private static readonly MAX: string = 'max';
	
	private fieldToPopulate: string = '';
	private min: number = 0;
	private max: number = 0;
	
  initialise(fieldToPopulate: string, config: { [key: string]: any }): void {
    this.fieldToPopulate = this.validateName(fieldToPopulate);
		this.validateConfig(config);
		this.min = config[RandIntGenerator.MIN];
		this.max = config[RandIntGenerator.MAX];
	}

	next(_historical: Object[]): Object {
		const randomNumber = Math.random();
    var scaledNumber = randomNumber * (this.max - this.min) + this.min;
    var truncatedNumber = Math.trunc(scaledNumber);
    const retObject = {
      [this.fieldToPopulate]: truncatedNumber
		};
		return retObject;
	}
	
	// TODO PB: extract to a utils class?
	private validateName(name: string | null): string {
		if (name === null || name.trim() === '') {
			// TODO PB - custom / more specific error?
			throw new Error('name is empty or null');
		}
		return name;
  }

	// TODO PB: extract to a utils class?
	private validateConfig(config: { [key: string]: any }): void {
		if (!config.hasOwnProperty(RandIntGenerator.MIN)) {
			// TODO PB - custom / more specific error?
			throw new Error('config is missing ' + RandIntGenerator.MIN);
		}
		if (!config.hasOwnProperty(RandIntGenerator.MAX)) {
			// TODO PB - custom / more specific error?
			throw new Error('config is missing ' + RandIntGenerator.MAX);
		}
	}
}

export default RandIntGenerator;
