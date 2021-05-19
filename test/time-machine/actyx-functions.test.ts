import * as actyxFunc from '../../src/time-machine/actyx-functions'

test('compares an earlier timestamp with a timerange', () => {
  const earlyTimestamp = 10020
  const lowerBound = 20000
  const upperBound = 30000
  expect(actyxFunc.compareTimestampWithTimeRange(earlyTimestamp, lowerBound, upperBound)).toBe(
    'beforeRange',
  )
})
