export interface Generator {
	/**
	* initialise the generator with the given name and config.
	*/
	initialise(name: String, config:{ [key: string]: any }): void
	/**
	* generate the next value, optionally based on historical values
	*/
	next(historical: Object[]): Object;
}
export default Generator;
