import {CloudCarbonFootprint} from '../../../../lib/ccf/index';

import {ERRORS} from '../../../../util/errors';
const {UnsupportedValueError} = ERRORS;

jest.mock('../../../../lib/ccf/aws-use.json', () => [{}], {virtual: true});

describe('lib/ccf: ', () => {
  describe('CloudCarbonFootprint: ', () => {
    const output = CloudCarbonFootprint();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('throws an error when the architecture in not supported in `aws`.', async () => {
      const inputs = [
        {
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600,
          'cpu/utilization': 50,
          'cloud/vendor': 'aws',
          'cloud/instance-type': 't2.micro',
        },
      ];

      try {
        await output.execute(inputs);
      } catch (error) {
        expect(error).toBeInstanceOf(UnsupportedValueError);
        expect(error).toEqual(
          new UnsupportedValueError(
            "CloudCarbonFootprint: Architecture 'Graviton' is not supported."
          )
        );
      }
    });
  });
});
