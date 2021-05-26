import { ActyxEvent, OffsetMap, Pond, Tags, Where } from '@actyx/pond'

/**
 * Chunk size for all chunk-based queries
 */
const QUERY_CHUNK_SIZE = 5000

/**
 * Type that describes the relative timeliness
 * of a timestamp with respect to a time span.
 */
export type RelativeTiming = 'beforeRange' | 'withinRange' | 'afterRange'

/**
 * Checks whether a timestamp is inside, before or after a timerange defined by a lower bound and an upper bound.
 * @param timestampMicros Timestamp to compare in micros
 * @param timeRangeStartMicros Lower bound of the time range
 * @param timeRangeEndMicros Upper bound of the time range
 * @returns 'beforeRange' | 'withinRange' | 'afterRange'
 */
export function compareTimestampWithTimeRange(
  timestampMicros: number,
  timeRangeStartMicros: number,
  timeRangeEndMicros: number,
): RelativeTiming {
  if (timestampMicros < timeRangeStartMicros) {
    return 'beforeRange'
  }
  if (timestampMicros > timeRangeEndMicros) {
    return 'afterRange'
  }
  return 'withinRange'
}

/**
 * Checks whether a timestamp is inside,
 * before or after a timerange which ranges from the earliest event
 * to the latest event in the pond within the given offsets
 * @param offsets Offsets which dictate the range of events that are included
 * Use currentOffsets() if you wish to include all known events
 * @param sid This function will only include events that were emitted by this source
 * @param timestampMicros The timestamp you want to compare to the timerange
 * @param pond The pond from which the earliest and latest event is taken
 * @returns 'beforeRange' | 'withinRange' | 'afterRange'
 */
export async function compareTimestampWithOffsetBounds(
  offsets: OffsetMap,
  sid: string,
  timestampMicros: number,
  pond: Pond,
): Promise<RelativeTiming> {
  const earliestEvent = await getEarliestActyxEventBySid(sid, pond)
  const latestEvent = await getLatestActyxEventBySid(offsets, sid, pond)
  return compareTimestampWithTimeRange(
    timestampMicros,
    earliestEvent.meta.timestampMicros,
    latestEvent.meta.timestampMicros,
  )
}

/**
 * Searches the events in your pond for the single event which
 * happened directly prior to the given timestamp
 * @param offsets Offsets which dictate the range of events that are included
 * Use currentOffsets() if you wish to include all known events
 * @param sid This function will only include events in the search that come from this source
 * @param timestampMicros Timestamp for which you search the event that happenend prior
 * @param pond The pond from which the events are taken
 * @returns Returns the offset of the event which happended prior to the given timestamp.
 * Returns -1 if no events happened prior to the timestamp.
 */
export async function getLastEventOffsetBeforeTimestamp(
  offsets: OffsetMap,
  sid: string,
  timestampMicros: number,
  pond: Pond,
): Promise<number> {
  const relativeTiming = await compareTimestampWithOffsetBounds(offsets, sid, timestampMicros, pond)
  if (relativeTiming === 'beforeRange') {
    return -1
  }
  const maxOffset = offsets[sid]
  if (relativeTiming === 'afterRange') {
    return maxOffset
  }
  //inperformant iterative search, will be replaced with binary search
  for (let currentOffset = 0; currentOffset <= maxOffset; currentOffset++) {
    const currentEvent = await getActyxEventByOffset(sid, currentOffset, pond)
    if (currentEvent.meta.timestampMicros >= timestampMicros) {
      return currentOffset - 1
    }
  }
  return maxOffset
}

/**
 * Gets the earliest event from your pond that was emitted by the given source
 * @param sid This function will only include events that were emitted by this source
 * @param pond The pond from which the events are taken
 * @returns The earliest event from your pond that was emitted by the given source
 */
export async function getEarliestActyxEventBySid(
  sid: string,
  pond: Pond,
): Promise<ActyxEvent<unknown>> {
  return await getActyxEventByOffset(sid, 0, pond)
}

/**
 * Gets the latest event from your pond that was emitted by the given source
 * @param offsets Offsets which dictate the range of events that are included
 * Use currentOffsets() if you wish to include all known events
 * @param sid This function will only include events that were emitted by this source
 * @param pond The pond from which the events are taken
 * @returns The latest event from your pond that was emitted by the given source
 */
export async function getLatestActyxEventBySid(
  offsets: OffsetMap,
  sid: string,
  pond: Pond,
): Promise<ActyxEvent<unknown>> {
  const offset = offsets[sid]
  return await getActyxEventByOffset(sid, offset, pond)
}

/**
 * Gets the event with the given eventOffset that was emitted by the given source
 * @param sid This function will only include events that were emitted by this source
 * @param eventOffset The offset of the event you search
 * @param pond The pond from which the events are taken
 * @returns The event with the given eventOffset that was emitted by the given source
 * @throws Error when no matching event was found
 */
export async function getActyxEventByOffset(
  sid: string,
  eventOffset: number,
  pond: Pond,
): Promise<ActyxEvent<unknown>> {
  const results = await pond.events().queryKnownRange({
    upperBound: upsertOffsetMapValue({}, sid, eventOffset),
    lowerBound: eventOffset > 0 ? upsertOffsetMapValue({}, sid, eventOffset - 1) : undefined,
  })

  if (results.length === 0) {
    throw new Error('Event could not be retrieved')
  }

  return results[0]
}

/**
 * Queries the pond for events that match the given tags and offsets. The callback is called for every chunk of events.
 * @param pond The pond from which the events are taken.
 * @param offsets Offsets which dictate the range of events that are included in the query.
 * @param tags Only events that match these tags will be included in the query.
 * @param callback Function which will be called with each chunk of events
 */
export function querySelectedEventsChunked(
  pond: Pond,
  offsets: { readonly [x: string]: number },
  tags: string,
  callback: (events: ActyxEvent[]) => void,
): any {
  return pond.events().queryKnownRangeChunked(
    {
      upperBound: offsets,
      order: 'Asc',
      query: tagsFromString(tags),
    },
    QUERY_CHUNK_SIZE,
    ({ events }) => {
      callback(events)
    },
  )
}

/**
 * Calculates a twin-state by reducing the given array of events onto an initial state.
 * @param events The array of events to be applied to the twin.
 * @param onEventFn The on-event-function of the twin.
 * @param initState Initial state of the twin.
 * @returns The state of the twin after applying all events.
 */
export function reduceTwinStateFromEvents(
  events: ActyxEvent<unknown>[],
  onEventFn: (state: any, event: any, meta: any) => any,
  initState: any,
): any {
  return events.reduce((state, { payload, meta }) => {
    return onEventFn(state, payload, meta)
  }, initState)
}

/**
 * Creates actyx-Tags from a string
 * @param tags The string which holds your tags
 * @returns Actyx-Tags
 */
export function tagsFromString(tags: string): Tags<unknown> {
  try {
    return Tags(...(tags || 'unknown').split(' '))
  } catch (exception) {
    return Tags('unknown')
  }
}
/**
 * Joins the tags of your 'Where' into a string, separated by blank spaces.
 * @param where 'Where' containing the tags of your twins.
 * @returns The tags of the 'Where' joined into a string, separated by blank spaces.
 */
export function whereToTagsString(where: Where<any>): string {
  return where.toString().split(' & ').join(' ').split("'").join('')
}

/**
 * Upserts a [sid: events] pair to a copy of the given offsetMap and returns it.
 * @param offsets This offsetMap will be returned with an added value
 * @param sid sid to add
 * @param events value to add
 * @returns A copy of the given offsetMap with an added value
 */
export function upsertOffsetMapValue(offsets: OffsetMap, sid: string, events: number): OffsetMap {
  return { ...offsets, [sid]: events }
}
