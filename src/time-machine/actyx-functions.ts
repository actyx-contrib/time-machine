import { ActyxEvent, OffsetMap, Pond, Reduce, Tags } from '@actyx/pond'

export type RelativeTiming = 'beforeBounds' | 'withinBounds' | 'afterBounds'

export async function compareTimestampWithOffsetBounds(
  offsets: OffsetMap,
  sid: string,
  timestampMicros: number,
  pond: Pond,
): Promise<RelativeTiming> {
  const earliestEvent = await getEarliestActyxEventBySid(offsets, sid, pond)
  const latestEvent = await getLatestActyxEventBySid(offsets, sid, pond)
  if (timestampMicros < earliestEvent.meta.timestampMicros) {
    return 'beforeBounds'
  }
  if (timestampMicros > latestEvent.meta.timestampMicros) {
    return 'afterBounds'
  }
  return 'withinBounds'
}

export async function getLastOffsetBeforeTimestamp(
  offsets: OffsetMap,
  sid: string,
  timestampMicros: number,
  pond: Pond,
): Promise<number> {
  const relativeTiming = await compareTimestampWithOffsetBounds(offsets, sid, timestampMicros, pond)
  if (relativeTiming === 'beforeBounds') {
    return 0
  }
  const maxOffset = offsets[sid]
  if (relativeTiming === 'afterBounds') {
    return maxOffset
  }
  //inperformant iterative search, will be replaced with binary search
  for (let currentOffset = 0; currentOffset < maxOffset; currentOffset++) {
    const currentEvent = await getActyxEventByOffset(sid, currentOffset, pond)
    if (currentEvent.meta.timestampMicros > timestampMicros) {
      return currentOffset
    }
  }
  return maxOffset
}

export async function getEarliestActyxEventBySid(
  offsets: OffsetMap,
  sid: string,
  pond: Pond,
): Promise<ActyxEvent<unknown>> {
  return await getActyxEventByOffset(sid, 0, pond)
}

export async function getLatestActyxEventBySid(
  offsets: OffsetMap,
  sid: string,
  pond: Pond,
): Promise<ActyxEvent<unknown>> {
  const offset = offsets[sid]
  return await getActyxEventByOffset(sid, offset, pond)
}

export async function getActyxEventByOffset(
  sid: string,
  eventOffset: number,
  pond: Pond,
): Promise<ActyxEvent<unknown>> {
  const lowerBound = eventOffset > 0 ? addValueToOffsetMap({}, sid, eventOffset - 1) : null
  const upperBound = addValueToOffsetMap({}, sid, eventOffset)
  const params = lowerBound
    ? { upperBound: upperBound, lowerBound: lowerBound }
    : { upperBound: upperBound }
  const results = await pond.events().queryKnownRange(params)
  if (results.length === 0) throw new Error('Event could not be retrieved')
  else {
    return results[0]
  }
}

export function reduceTwinStateFromEvents(
  pond: Pond,
  selectedEventOffsetMap: { readonly [x: string]: number },
  tags: string,
  onEventFn: (state: any, event: any, meta: any) => Reduce<unknown, unknown>,
  initState: any,
  callback: (state: any) => void,
): any {
  pond.events().queryKnownRangeChunked(
    {
      upperBound: selectedEventOffsetMap,
      order: 'Asc',
      query: tagsFromString(tags),
    },
    5000,
    ({ events }) => {
      callback(
        events.reduce((state, { payload, meta }) => {
          return onEventFn(state, payload, meta)
        }, initState),
      )
    },
  )
}

export function tagsFromString(tags: string) {
  try {
    return Tags(...(tags || 'unknown').split(' '))
  } catch (exception) {
    return Tags('unknown')
  }
}

export function addValueToOffsetMap(offsets: OffsetMap, sid: string, events: number): OffsetMap {
  return { ...offsets, [sid]: events }
}
