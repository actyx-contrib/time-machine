import * as actyxFunc from '../../src/time-machine/actyx-functions'

describe('Testing compareTimerange', () => {
  test('compares an earlier timestamp with a timerange', () => {
    const earlyTimestamp = 10020
    const lowerBound = 20000
    const upperBound = 30000
    expect(actyxFunc.compareTimestampWithTimeRange(earlyTimestamp, lowerBound, upperBound)).toBe(
      'beforeRange',
    )
  })

  test('compares a later timestamp with a timerange', () => {
    const laterTimestamp = 800000
    const lowerBound = 20000
    const upperBound = 30000
    expect(actyxFunc.compareTimestampWithTimeRange(laterTimestamp, lowerBound, upperBound)).toBe(
      'afterRange',
    )
  })

  test('compares a timestamp that is inside the timerange with a timerange', () => {
    const timestampWithinRange = 20500
    const lowerBound = 20000
    const upperBound = 30000
    expect(
      actyxFunc.compareTimestampWithTimeRange(timestampWithinRange, lowerBound, upperBound),
    ).toBe('withinRange')
  })
})
