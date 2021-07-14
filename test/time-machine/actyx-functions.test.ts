import { ActyxEvent, Fish, OffsetMap, Pond, Tags } from '@actyx/pond'
import * as actyxFunc from '../../src/time-machine/actyx-functions'
import { mkTestFish } from './test-fish/test-fish'
import { TestFishEvent, TestFishState } from './test-fish/types'

const BASE_DATE = 10000
const MOCK_TAGS = ['mock_tag']

describe('Tags - String converters', () => {
  it('should be reversible', () => {
    const where = mkTestFish('test-fish-1').where
    const tagsString = actyxFunc.whereToTagsString(where)
    const tags = actyxFunc.tagsFromString(tagsString)
    expect(where.toString()).toEqual(tags.toString())
  })
})

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
        .present()
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

describe('getLastOffsetBeforeTimestamp() with singleSourceTestPond', () => {
  let singleSourceTestPond: Pond
  let alternatingSourceTestPond: Pond
  let currentSingleSourceOffsets: OffsetMap
  let currentAlternatingSourceOffsets: OffsetMap
  const numberOfAlternatingSources = 3
  const numberOfAlternatingSourceEvents = 1
  const numberOfSingleSourceEvents = 3
  const sid = 'source_0'

  beforeAll(async () => {
    singleSourceTestPond = createSingleSourceTestPond(numberOfSingleSourceEvents)
    alternatingSourceTestPond = createAlternatingSourceTestPond(
      numberOfAlternatingSourceEvents,
      numberOfAlternatingSources,
    )
    currentSingleSourceOffsets = await singleSourceTestPond.events().present()
    currentAlternatingSourceOffsets = await alternatingSourceTestPond.events().present()
  })
  afterAll(() => {
    singleSourceTestPond.dispose()
    alternatingSourceTestPond.dispose()
  })

  it('should return offset of last event before timestamp in single-source pond', async () => {
    for (let i = 0; i < numberOfSingleSourceEvents; i++) {
      const timestampShortlyAfterEvent = BASE_DATE + i + 1
      expect(
        await actyxFunc.getLastEventOffsetBeforeTimestamp(
          currentSingleSourceOffsets,
          sid,
          timestampShortlyAfterEvent,
          singleSourceTestPond,
        ),
      ).toBe(i)
    }
  })

  it('should return -1 for timestamp before first event in single-source pond', async () => {
    const timestampBeforeFirstEvent = BASE_DATE
    expect(
      await actyxFunc.getLastEventOffsetBeforeTimestamp(
        currentSingleSourceOffsets,
        sid,
        timestampBeforeFirstEvent,
        singleSourceTestPond,
      ),
    ).toBe(-1)
  })

  it('should return the offset of the last event for timestamp after last event in single-source pond', async () => {
    const timestampAfterLastEvent = BASE_DATE + numberOfSingleSourceEvents + 1
    const offsetOfLastEvent = numberOfSingleSourceEvents - 1
    expect(
      await actyxFunc.getLastEventOffsetBeforeTimestamp(
        currentSingleSourceOffsets,
        sid,
        timestampAfterLastEvent,
        singleSourceTestPond,
      ),
    ).toBe(offsetOfLastEvent)
  })

  it('should return the offset of the last event for timestamp after last event in alternating-source pond', async () => {
    for (let i = 0; i < 3; i++) {
      const timestampAfterAllEvents = BASE_DATE + numberOfAlternatingSources + 1
      const offsetOfLastEvent = 0
      expect(
        await actyxFunc.getLastEventOffsetBeforeTimestamp(
          currentAlternatingSourceOffsets,
          `source_${i}`,
          timestampAfterAllEvents,
          alternatingSourceTestPond,
        ),
      ).toBe(offsetOfLastEvent)
    }
  })
})

describe('reduceTwinStateFromEvents', () => {
  let testFish: Fish<TestFishState, TestFishEvent>
  beforeAll(() => {
    testFish = mkTestFish('test-fish-1')
  })
  it('should calculate the correct state for an instance of test-fish with a given set of events', () => {
    const events = getTestEvents()
    const twinState = actyxFunc.reduceTwinStateFromEvents(
      events,
      testFish.onEvent,
      testFish.initialState,
    )
    expect(twinState).toEqual({
      previousState: { status: 'two' },
      currentState: { status: 'three' },
    })
  })
})

describe('syncSelectedEventsOnTimestamp', () => {
  let alternatingSourceTestPond: Pond
  beforeAll(() => {
    alternatingSourceTestPond = createAlternatingSourceTestPond(2, 2)
  })
  afterAll(() => {
    alternatingSourceTestPond.dispose()
  })
  it('should give the offset of the event the happened before the given timestamp for each source', async () => {
    const offsets = await actyxFunc.syncOffsetMapOnTimestamp(
      BASE_DATE + 2,
      await alternatingSourceTestPond.events().present(),
      alternatingSourceTestPond,
    )
    expect(offsets['source_0']).toBe(1)
    expect(offsets['source_1']).toBe(0)
  })
})

describe('getCountOfAllEventsMatchingTags', () => {
  const numberOfSources = 5
  const numberOfEventsPerSource = 5
  const targetSource = 0
  let alternatingSourceTestPond: Pond
  beforeAll(() => {
    alternatingSourceTestPond = createAlternatingSourceTestPond(
      numberOfEventsPerSource,
      numberOfSources,
    )
  })
  afterAll(() => {
    alternatingSourceTestPond.dispose()
  })

  it('should give the count of events that match the given source and tags', async () => {
    const expectedResult = numberOfEventsPerSource
    const allEventsOffsetMap = getOffsetMapForTestPond(numberOfEventsPerSource, numberOfSources)
    console.log(JSON.stringify(allEventsOffsetMap))

    const queryResult = await actyxFunc.getCountOfEventsMatchingTags(
      allEventsOffsetMap,
      `source_${targetSource}`,
      Tags(...MOCK_TAGS),
      alternatingSourceTestPond,
    )
    expect(queryResult).toEqual(expectedResult)
  })
  //Commented out while limit is not implemented

  it('should give the count of events that match the given source and tags with limit set', async () => {
    const taggedOffset = 2
    const expectedResult = taggedOffset

    const allEventsOffsetMap = getOffsetMapForTestPond(numberOfEventsPerSource, numberOfSources)

    const queryResult = await actyxFunc.getOffsetByTaggedOffset(
      allEventsOffsetMap,
      taggedOffset,
      `source_${targetSource}`,
      Tags(...MOCK_TAGS),
      alternatingSourceTestPond,
    )
    expect(queryResult).toEqual(expectedResult)
  })
})

function getTestEvents(): ActyxEvent[] {
  const events: ActyxEvent[] = []
  events.push(createTestEvent({ eventType: 'stateOneToTwo' }))
  events.push(createTestEvent({ eventType: 'stateTwoToThree' }))

  return events
}

function createTestEvent(payload: TestFishEvent, meta?): ActyxEvent {
  return { meta: meta, payload: payload }
}

function createAlternatingSourceTestPond(
  numberOfEventsPerSource: number,
  numberOfSources: number,
): Pond {
  const testPond = Pond.test()
  let globalEventCount = 0
  for (let i = 0; i < numberOfEventsPerSource; i++) {
    for (let j = 0; j < numberOfSources; j++) {
      const event = {
        offset: i,
        stream: `source_${j}`,
        timestamp: BASE_DATE + globalEventCount,
        lamport: globalEventCount,
        tags: MOCK_TAGS,
        payload: i,
      }
      testPond.directlyPushEvents([event])
      globalEventCount++
    }
  }
  return testPond
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
          offset: j,
          stream: `source_${i}`,
          timestamp: BASE_DATE + globalEventCount,
          lamport: globalEventCount,
          tags: MOCK_TAGS,
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
        offset: i,
        stream: `source_0`,
        timestamp: BASE_DATE + i,
        lamport: i,
        tags: MOCK_TAGS,
        payload: i,
      },
    ])
  }
  return testPond
}

function getOffsetMapForTestPond(
  numberOfEventsPerSource: number,
  numberOfSources: number,
): OffsetMap {
  let allEventsOffsetMap = {}
  const offsetOfSources = numberOfEventsPerSource - 1
  for (let i = 0; i < numberOfSources; i++) {
    allEventsOffsetMap = actyxFunc.upsertOffsetMapValue(
      allEventsOffsetMap,
      `source_${i}`,
      offsetOfSources,
    )
  }
  return allEventsOffsetMap
}
