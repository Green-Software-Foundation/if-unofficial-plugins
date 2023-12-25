import {Generator} from '../interfaces';

class CommonGenerator implements Generator {
  private name = '';
  private generateObject: {} = {};
  initialise(name: string, config:{ [key: string]: any }): void {
    this.name = this.validateName(name);
    // TODO PB -- validate config is not null, not empty and a valid yml object, use yaml.parse(input)
    // TODO PB -- object immutabilty - copy by value here
    this.generateObject = config;
	}

	next(_historical: Object[]): Object {
		// TODO PB -- object immutabilty - copy by value here
		return this.generateObject
	}
	
	public getName(): String {
        return this.name;
    }
	
	private validateName(name: string | null): string {
		if (name === null || name.trim() === '') {
			// TODO PB - custom / more specific error?
			throw new Error('name is empty or null');
		}
		return name;
	}
}

export default CommonGenerator;
