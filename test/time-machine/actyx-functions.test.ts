import { Pond } from '@actyx/pond'
import * as actyxFunc from '../../src/time-machine/actyx-functions'

const BASE_DATE = 10000

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

describe('Testing ActyxEventGetters', () => {
  const numberOfEventsPerSource = 3
  const numberOfSources = 3
  const testPond = createAlternatingSourceTestPond(numberOfEventsPerSource, numberOfSources)
  for (let testSource = 0; testSource < 3; testSource++)
    test(`test getEarliestEventBySid with alternating source (source_${testSource})`, (done) => {
      actyxFunc.getEarliestActyxEventBySid(`source_${testSource}`, testPond).then((event) => {
        const offsetOfFirstEvent = 0
        expect(event.meta.offset).toBe(offsetOfFirstEvent)
        done()
      })
    })
  for (let testSource = 0; testSource < 3; testSource++)
    test(`test getLatestEventBySid with alternating source (source_${testSource})`, (done) => {
      testPond
        .events()
        .currentOffsets()
        .then((pondOffsets) => {
          actyxFunc
            .getLatestActyxEventBySid(pondOffsets, `source_${testSource}`, testPond)
            .then((event) => {
              const offsetOfLastEvent = numberOfEventsPerSource - 1
              expect(event.meta.offset).toBe(offsetOfLastEvent)
              done()
            })
        })
    })
  testPond.dispose()
})

function createAlternatingSourceTestPond(
  numberOfEventsPerSource: number,
  numberOfSources: number,
): Pond {
  const testPond = Pond.test()
  let globalEventCount = 0
  for (let i = 0; i < numberOfEventsPerSource; i++) {
    for (let j = 0; j < numberOfSources; j++) {
      testPond.directlyPushEvents([
        {
          psn: i,
          sourceId: `source_${j}`,
          timestamp: BASE_DATE + globalEventCount,
          lamport: globalEventCount,
          tags: ['mock_tag'],
          payload: i,
        },
      ])
      globalEventCount++
    }
  }
  return testPond
}

function createSequentialSourceTestPond(
  numberOfEventsPerSource: number,
  numberOfSources: number,
): Pond {
  const testPond = Pond.test()
  let globalEventCount = 0
  for (let i = 0; i < numberOfSources; i++) {
    for (let j = 0; j < numberOfEventsPerSource; j++) {
      testPond.directlyPushEvents([
        {
          psn: j,
          sourceId: `source_${i}`,
          timestamp: BASE_DATE + globalEventCount,
          lamport: globalEventCount,
          tags: ['mock_tag'],
          payload: j,
        },
      ])
      globalEventCount++
    }
  }
  return testPond
}
