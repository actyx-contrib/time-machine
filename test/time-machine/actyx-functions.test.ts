import { OffsetMap, Pond } from '@actyx/pond'
import * as actyxFunc from '../../src/time-machine/actyx-functions'

const BASE_DATE = 10000

describe('compareTimestampWithTimeRange() should', () => {
  test('return "beforeRange" for a timestamp earlier than the time range', () => {
    const earlyTimestamp = 10020
    const lowerBound = 20000
    const upperBound = 30000
    expect(actyxFunc.compareTimestampWithTimeRange(earlyTimestamp, lowerBound, upperBound)).toBe(
      'beforeRange',
    )
  })

  test('return "afterRange" for a timestamp later than the time range', () => {
    const laterTimestamp = 800000
    const lowerBound = 20000
    const upperBound = 30000
    expect(actyxFunc.compareTimestampWithTimeRange(laterTimestamp, lowerBound, upperBound)).toBe(
      'afterRange',
    )
  })

  test('return "withinRange" for a timestamp inside of the time range', () => {
    const timestampWithinRange = 20500
    const lowerBound = 20000
    const upperBound = 30000
    expect(
      actyxFunc.compareTimestampWithTimeRange(timestampWithinRange, lowerBound, upperBound),
    ).toBe('withinRange')
  })
})

describe('ActyxEventGetters should', () => {
  const numberOfEventsPerSource = 3
  const numberOfSources = 3
  let testPond
  beforeAll(
    () => (testPond = createAlternatingSourceTestPond(numberOfEventsPerSource, numberOfSources)),
  )
  afterAll(() => {
    testPond.dispose()
  })
  it('return latest event for each source', async () => {
    for (let testSource = 0; testSource < 3; testSource++) {
      await testPond
        .events()
        .currentOffsets()
        .then((pondOffsets) => {
          actyxFunc
            .getLatestActyxEventBySid(pondOffsets, `source_${testSource}`, testPond)
            .then((event) => {
              const offsetOfLastEvent = numberOfEventsPerSource - 1
              expect(event.meta.offset).toBe(offsetOfLastEvent)
            })
        })
    }
  })

  it('return earliest event for each source', () => {
    for (let testSource = 0; testSource < 3; testSource++)
      actyxFunc.getEarliestActyxEventBySid(`source_${testSource}`, testPond).then((event) => {
        const offsetOfFirstEvent = 0
        expect(event.meta.offset).toBe(offsetOfFirstEvent)
      })
  })
})

describe('getLastOffsetBeforeTimestamp()', () => {
  let testPond: Pond
  let currentOffsets: OffsetMap
  const numberOfEvents = 3
  const sid = 'source_0'

  beforeAll(async () => {
    testPond = createSingleSourceTestPond(numberOfEvents)
    currentOffsets = await testPond.events().currentOffsets()
  })
  afterAll(() => {
    testPond.dispose()
  })

  it('should return offset of last event before timestamp in single-source pond', async () => {
    for (let i = 0; i < numberOfEvents; i++) {
      const timestampShortlyAfterEvent = BASE_DATE + i + 1
      expect(
        await actyxFunc.getLastOffsetBeforeTimestamp(
          currentOffsets,
          sid,
          timestampShortlyAfterEvent,
          testPond,
        ),
      ).toBe(i)
    }
  })

  it('should return -1 for timestamp before first event in single-source pond', async () => {
    const timestampBeforeFirstEvent = BASE_DATE
    expect(
      await actyxFunc.getLastOffsetBeforeTimestamp(
        currentOffsets,
        sid,
        timestampBeforeFirstEvent,
        testPond,
      ),
    ).toBe(-1)
  })

  it('should return the offset of the last event for timestamp after last event in single-source pond', async () => {
    const timestampAfterLastEvent = BASE_DATE + numberOfEvents + 1
    const offsetOfLastEvent = numberOfEvents - 1
    expect(
      await actyxFunc.getLastOffsetBeforeTimestamp(
        currentOffsets,
        sid,
        timestampAfterLastEvent,
        testPond,
      ),
    ).toBe(offsetOfLastEvent)
  })
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

function createSingleSourceTestPond(numberOfEvents: number): Pond {
  const testPond = Pond.test()
  for (let i = 0; i < numberOfEvents; i++) {
    testPond.directlyPushEvents([
      {
        psn: i,
        sourceId: `source_0`,
        timestamp: BASE_DATE + i,
        lamport: i,
        tags: ['mock_tag'],
        payload: i,
      },
    ])
  }
  return testPond
}
