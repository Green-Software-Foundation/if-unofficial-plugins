import {AxiosResponse} from 'axios';

import * as PROVIDERS from './providers.json';
import * as COUNTRIES from './countries.json';
import * as INSTANCE_TYPES from './instance_types.json';

export function mockPost<T = any, R = AxiosResponse<T, any>>(
  url: string
): Promise<R> {
  switch (url) {
    case 'https://api.boavizta.org/v1/component/cpu?verbose=false&duration=1':
      return Promise.resolve({
        data: {
          impacts: {
            gwp: {
              embedded: {
                value: 0.0008,
                min: 0.0004155,
                max: 0.003113,
                warnings: ['End of life is not included in the calculation'],
              },
              use: {value: 0.06743, min: 0.06743, max: 0.06743},
              unit: 'kgCO2eq',
              description: 'Total climate change',
            },
            adp: {
              embedded: {
                value: 7.764e-7,
                min: 7.763e-7,
                max: 7.771e-7,
                warnings: ['End of life is not included in the calculation'],
              },
              use: {value: 1.796e-8, min: 1.796e-8, max: 1.796e-8},
              unit: 'kgSbeq',
              description: 'Use of minerals and fossil ressources',
            },
            pe: {
              embedded: {
                value: 0.012,
                min: 0.006847,
                max: 0.04314,
                warnings: ['End of life is not included in the calculation'],
              },
              use: {value: 2.07, min: 2.07, max: 2.07},
              unit: 'MJ',
              description: 'Consumption of primary energy',
            },
          },
        },
      } as R);
    case 'https://api.boavizta.org/v1/component/cpu?verbose=true&duration=2':
      return Promise.resolve({
        data: {
          impacts: {
            gwp: {
              embedded: {
                value: 0.0016,
                min: 0.000831,
                max: 0.006226,
                warnings: ['End of life is not included in the calculation'],
              },
              use: {value: 0.1924, min: 0.1924, max: 0.1924},
              unit: 'kgCO2eq',
              description: 'Total climate change',
            },
            adp: {
              embedded: {
                value: 0.000001553,
                min: 0.000001553,
                max: 0.000001554,
                warnings: ['End of life is not included in the calculation'],
              },
              use: {value: 5.126e-8, min: 5.126e-8, max: 5.126e-8},
              unit: 'kgSbeq',
              description: 'Use of minerals and fossil ressources',
            },
            pe: {
              embedded: {
                value: 0.023,
                min: 0.01369,
                max: 0.08627,
                warnings: ['End of life is not included in the calculation'],
              },
              use: {value: 5.907, min: 5.907, max: 5.907},
              unit: 'MJ',
              description: 'Consumption of primary energy',
            },
          },
          verbose: {
            impacts: {
              gwp: {
                embedded: {
                  value: 0.0016,
                  min: 0.000831,
                  max: 0.006226,
                  warnings: ['End of life is not included in the calculation'],
                },
                use: {value: 0.1924, min: 0.1924, max: 0.1924},
                unit: 'kgCO2eq',
                description: 'Total climate change',
              },
              adp: {
                embedded: {
                  value: 0.000001553,
                  min: 0.000001553,
                  max: 0.000001554,
                  warnings: ['End of life is not included in the calculation'],
                },
                use: {value: 5.126e-8, min: 5.126e-8, max: 5.126e-8},
                unit: 'kgSbeq',
                description: 'Use of minerals and fossil ressources',
              },
              pe: {
                embedded: {
                  value: 0.023,
                  min: 0.01369,
                  max: 0.08627,
                  warnings: ['End of life is not included in the calculation'],
                },
                use: {value: 5.907, min: 5.907, max: 5.907},
                unit: 'MJ',
                description: 'Consumption of primary energy',
              },
            },
            units: {value: 1, status: 'ARCHETYPE', min: 1, max: 1},
            die_size: {
              value: 521,
              status: 'COMPLETED',
              unit: 'mm2',
              source: 'Average value for all families',
              min: 41.2,
              max: 3640,
            },
            duration: {value: 2, unit: 'hours'},
            avg_power: {
              value: 260.05,
              status: 'COMPLETED',
              unit: 'W',
              min: 260.05,
              max: 260.05,
            },
            time_workload: {value: 100, status: 'INPUT', unit: '%'},
            usage_location: {
              value: 'USA',
              status: 'INPUT',
              unit: 'CodSP3 - NCS Country Codes - NATO',
            },
            use_time_ratio: {
              value: 1,
              status: 'ARCHETYPE',
              unit: '/1',
              min: 1,
              max: 1,
            },
            hours_life_time: {
              value: 26280,
              status: 'ARCHETYPE',
              unit: 'hours',
              min: 26280,
              max: 26280,
            },
            params: {
              value: {a: 171.2, b: 0.0354, c: 36.89, d: -10.13},
              status: 'ARCHETYPE',
            },
            gwp_factor: {
              value: 0.37,
              status: 'COMPLETED',
              unit: 'kg CO2eq/kWh',
              source: 'https://ember-climate.org/data/data-explorer',
              min: 0.37,
              max: 0.37,
            },
            adp_factor: {
              value: 9.85548e-8,
              status: 'COMPLETED',
              unit: 'kg Sbeq/kWh',
              source: 'ADEME Base Impacts ®',
              min: 9.85548e-8,
              max: 9.85548e-8,
            },
            pe_factor: {
              value: 11.358,
              status: 'COMPLETED',
              unit: 'MJ/kWh',
              source: 'ADPf / (1-%renewable_energy)',
              min: 11.358,
              max: 11.358,
            },
          },
        },
      } as R);
    case 'https://api.boavizta.org/v1/cloud/instance?verbose=false&duration=0.004166666666666667':
      return Promise.resolve({
        data: {
          impacts: {
            gwp: {
              embedded: {
                value: 0.0016,
                min: 0.000831,
                max: 0.006226,
                warnings: ['End of life is not included in the calculation'],
              },
              use: {value: 0.1924, min: 0.1924, max: 0.1924},
              unit: 'kgCO2eq',
              description: 'Total climate change',
            },
            adp: {
              embedded: {
                value: 0.000001553,
                min: 0.000001553,
                max: 0.000001554,
                warnings: ['End of life is not included in the calculation'],
              },
              use: {value: 5.126e-8, min: 5.126e-8, max: 5.126e-8},
              unit: 'kgSbeq',
              description: 'Use of minerals and fossil ressources',
            },
            pe: {
              embedded: {
                value: 0.023,
                min: 0.01369,
                max: 0.08627,
                warnings: ['End of life is not included in the calculation'],
              },
              use: {value: 5.907, min: 5.907, max: 5.907},
              unit: 'MJ',
              description: 'Consumption of primary energy',
            },
          },
          verbose: {
            impacts: {
              gwp: {
                embedded: {
                  value: 0.0016,
                  min: 0.000831,
                  max: 0.006226,
                  warnings: ['End of life is not included in the calculation'],
                },
                use: {value: 0.1924, min: 0.1924, max: 0.1924},
                unit: 'kgCO2eq',
                description: 'Total climate change',
              },
              adp: {
                embedded: {
                  value: 0.000001553,
                  min: 0.000001553,
                  max: 0.000001554,
                  warnings: ['End of life is not included in the calculation'],
                },
                use: {value: 5.126e-8, min: 5.126e-8, max: 5.126e-8},
                unit: 'kgSbeq',
                description: 'Use of minerals and fossil ressources',
              },
              pe: {
                embedded: {
                  value: 0.023,
                  min: 0.01369,
                  max: 0.08627,
                  warnings: ['End of life is not included in the calculation'],
                },
                use: {value: 5.907, min: 5.907, max: 5.907},
                unit: 'MJ',
                description: 'Consumption of primary energy',
              },
            },
            units: {value: 1, status: 'ARCHETYPE', min: 1, max: 1},
            die_size: {
              value: 521,
              status: 'COMPLETED',
              unit: 'mm2',
              source: 'Average value for all families',
              min: 41.2,
              max: 3640,
            },
            duration: {value: 2, unit: 'hours'},
            avg_power: {
              value: 260.05,
              status: 'COMPLETED',
              unit: 'W',
              min: 260.05,
              max: 260.05,
            },
            time_workload: {value: 100, status: 'INPUT', unit: '%'},
            usage_location: {
              value: 'USA',
              status: 'INPUT',
              unit: 'CodSP3 - NCS Country Codes - NATO',
            },
            use_time_ratio: {
              value: 1,
              status: 'ARCHETYPE',
              unit: '/1',
              min: 1,
              max: 1,
            },
            hours_life_time: {
              value: 26280,
              status: 'ARCHETYPE',
              unit: 'hours',
              min: 26280,
              max: 26280,
            },
            params: {
              value: {a: 171.2, b: 0.0354, c: 36.89, d: -10.13},
              status: 'ARCHETYPE',
            },
            gwp_factor: {
              value: 0.37,
              status: 'COMPLETED',
              unit: 'kg CO2eq/kWh',
              source: 'https://ember-climate.org/data/data-explorer',
              min: 0.37,
              max: 0.37,
            },
            adp_factor: {
              value: 9.85548e-8,
              status: 'COMPLETED',
              unit: 'kg Sbeq/kWh',
              source: 'ADEME Base Impacts®',
              min: 9.85548e-8,
              max: 9.85548e-8,
            },
            pe_factor: {
              value: 11.358,
              status: 'COMPLETED',
              unit: 'MJ/kWh',
              source: 'ADPf / (1-%renewable_energy)',
              min: 11.358,
              max: 11.358,
            },
          },
        },
      } as R);
  }
  return Promise.resolve({} as R);
}

export async function mockGet<T = any, R = AxiosResponse<T, any>>(
  url: string
): Promise<R> {
  switch (url) {
    case 'https://api.boavizta.org/v1/cloud/instance/all_providers':
      return {data: PROVIDERS} as R;
    case 'https://api.boavizta.org/v1/utils/country_code':
      return Promise.resolve({data: COUNTRIES} as R);
    case 'https://api.boavizta.org/v1/cloud/instance/all_instances?provider=aws':
      return Promise.resolve({
        data: INSTANCE_TYPES['aws'],
      } as R);
  }
  return Promise.resolve({} as R);
}
