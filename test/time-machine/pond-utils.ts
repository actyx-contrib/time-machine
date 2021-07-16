import { ActyxEvent, OffsetMap, Pond } from '@actyx/pond'
import * as actyxFunc from '../../src/time-machine/actyx-functions'
import { TestFishEvent } from './test-fish/types'

export const BASE_DATE = 10000
export const MOCK_TAGS = ['mock_tag']

export function createTestEvent(payload: TestFishEvent, meta?): ActyxEvent {
  return { meta: meta, payload: payload }
}
export function createAlternatingSourceTestPond(
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
export function createSingleSourceTestPond(numberOfEvents: number): Pond {
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
export function getOffsetMapForTestPond(
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
