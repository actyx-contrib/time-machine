import { ActyxEvent, EventsSortOrder, Offset, OffsetMap, Pond, Tags, Where } from '@actyx/pond'

/**
 * Chunk size for all chunk-based queries
 */
export const QUERY_CHUNK_SIZE = 5000

/**
 * Type that describes the relative timeliness
 * of a timestamp with respect to a time span.
 */
export type RelativeTiming = 'beforeRange' | 'withinRange' | 'afterRange'

export type TaggedQueryResult = {
  eventCount: number
  finalOffset: Offset
}

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
 * to the latest event in the pond within the given offsets (excluding the start boundary).
 * In the mathematical sense this determines if 'timestampMicros ∈ (firstEvent, lastEvent]'
 * @param offsets Offsets which dictate the range of events that are included
 * Use currentOffsets() if you wish to include all known events
 * @param sid This function will only include events that were emitted by this source
 * @param timestampMicros The timestamp you want to compare to the timerange
 * @param pond The pond from which the earliest and latest event is taken
 * @returns 'beforeRange' | 'withinRange' | 'afterRange'. Returns 'beforeRange' if no latest event exists.
 */
export async function compareTimestampWithOffsetBounds(
  offsets: OffsetMap,
  sid: string,
  timestampMicros: number,
  pond: Pond,
): Promise<RelativeTiming> {
  try {
    const earliestEvent = await getEarliestActyxEventBySid(sid, pond)
    const latestEvent = await getLatestActyxEventBySid(offsets, sid, pond)
    return compareTimestampWithTimeRange(
      timestampMicros,
      earliestEvent.meta.timestampMicros + 1,
      latestEvent.meta.timestampMicros,
    )
  } catch {
    return 'beforeRange'
  }
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
    throw new Error(`Event could not be retrieved (offset = ${eventOffset})`)
  }

  return results[0]
}

/**
 * TODO: Finish Documentation
 * @param offsets
 * @param sid
 * @param tags
 * @param pond
 * @returns
 */
export async function getCountAndOffsetOfEventsMatchingTags(
  offsets: OffsetMap,
  sid: string,
  tags: Tags<any>,
  pond: Pond,
): Promise<TaggedQueryResult> {
  return new Promise<TaggedQueryResult>((resolve) => {
    let eventCount = 0
    let finalOffset = -1
    const filterForOneSource = { [sid]: offsets[sid] }
    const cancelQuerySubscription = pond.events().queryKnownRangeChunked(
      { query: tags, upperBound: filterForOneSource },
      QUERY_CHUNK_SIZE,
      (eventChunk) => {
        const chunkLength = eventChunk.events.length
        eventCount += chunkLength
        finalOffset = eventChunk.events[chunkLength - 1].meta.offset
      },
      () => {
        cancelQuerySubscription()
        resolve({ eventCount: eventCount, finalOffset: finalOffset })
      },
    )
  })
}

export async function getOffsetByContextualOffset(
  allEvents: OffsetMap,
  contextualOffset: Offset,
  sid: string,
  tags: Tags<any>,
  pond: Pond,
): Promise<Offset> {
  return new Promise<Offset>((resolve, reject) => {
    let eventCount = 0
    if (contextualOffset == -1) resolve(-1)
    const filterForOneSource = { [sid]: allEvents[sid] }
    const cancelQuerySubscription = pond.events().queryKnownRangeChunked(
      { query: tags, upperBound: filterForOneSource },
      QUERY_CHUNK_SIZE,
      (eventChunk) => {
        const chunkLength = eventChunk.events.length
        eventCount += chunkLength
        console.log(
          `getOffsetByContextualOffset - eventCount: ${eventCount}, contextualOffset: ${contextualOffset}`,
        )
        if (eventCount >= contextualOffset + 1) {
          const surplusOfEventsInChunk = eventCount - (contextualOffset + 1)
          const indexOfEventMatchingContextualOffset = chunkLength - 1 - surplusOfEventsInChunk
          if (eventChunk.events[indexOfEventMatchingContextualOffset] === undefined) {
            reject('query was unsuccessful due to an index being out of bounds')
            return
          }
          console.log(
            `getOffsetByContextualOffset - index: ${indexOfEventMatchingContextualOffset}, chunk: ${JSON.stringify(
              eventChunk,
            )}`,
          )
          const offsetOfFinalEventWithinLimit =
            eventChunk.events[indexOfEventMatchingContextualOffset].meta.offset

          resolve(offsetOfFinalEventWithinLimit)
        }
      },
      () => {
        cancelQuerySubscription()
        reject('query was unsuccessful')
      },
    )
  })
}

/**
 * Searches the events in your pond for the single event which
 * happened directly prior to the given timestamp
 * @param offsets Offsets which dictate the range of events that are included
 * Use currentOffsets() if you wish to include all known events
 * @param sid This function will only include events in the search that come from this source
 * @param timestampMicros Timestamp for which you search the event that happened prior
 * @param pond The pond from which the events are taken
 * @returns Returns the offset of the event which happened prior to the given timestamp.
 * Returns -1 if no events happened prior to the timestamp.
 */
export async function getLastEventOffsetBeforeTimestamp(
  allEvents: OffsetMap,
  sid: string,
  timestampMicros: number,
  pond: Pond,
): Promise<number> {
  const relativeTiming = await compareTimestampWithOffsetBounds(
    allEvents,
    sid,
    timestampMicros,
    pond,
  )
  if (relativeTiming === 'beforeRange') {
    return -1
  }
  const maxOffset = allEvents[sid]
  if (relativeTiming === 'afterRange') {
    return maxOffset
  }

  //using binary search to find the event that occurred directly prior to timestamp

  let max = maxOffset
  let min = 0
  while (min <= max) {
    const mid = min + Math.floor((max - min) / 2)
    const guessedEventTimestamp = (await getActyxEventByOffset(sid, mid, pond)).meta.timestampMicros
    const guessEventSuccessorTimestamp = (await getActyxEventByOffset(sid, mid + 1, pond)).meta
      .timestampMicros
    if (
      guessedEventTimestamp < timestampMicros &&
      guessEventSuccessorTimestamp >= timestampMicros
    ) {
      return mid
    } else if (guessedEventTimestamp >= timestampMicros) {
      max = mid - 1
    } else {
      min = mid + 1
    }
  }
  return maxOffset
}

/**
 * Pure function. The timestamp of the event with the highest offset of the given source (sid) is determined
 * Then the offsets of all sources in the given offset map are set to offset of the source's
 * event that happened directly prior to determined timestamp. This function basically calls
 * getLastEventOffsetBeforeTimestamp for every source and returns the results as an offset map.
 * @param sid sid of the source which the other sources shall be synced with
 * @param allEvents Offsets which dictate the range of events that are included
 * Use currentOffsets() if you wish to include all known events
 * @param pond The pond from which the events are taken
 * @returns Offset map with offsets that match the constraints described above
 */
export async function syncOffsetMapOnSource(
  sid: string,
  offsetOfSid: number,
  allEvents: OffsetMap,
  pond: Pond,
): Promise<OffsetMap> {
  let lastSelectedEventFromSource
  let syncTimestamp = 0
  try {
    lastSelectedEventFromSource = await getActyxEventByOffset(sid, offsetOfSid, pond)
    syncTimestamp = lastSelectedEventFromSource.meta.timestampMicros
  } catch (__error) {}
  return await syncOffsetMapOnTimestamp(syncTimestamp, allEvents, pond)
}

/**
 * Pure function. Sets the offsets of all sources in the given offset map to the offset of the source's
 * event that happened directly prior to the given timestamp. This function basically calls
 * getLastEventOffsetBeforeTimestamp for every source and returns the results as an offset map.
 * @param timestampMicros Timestamp for which you search the events that happened prior
 * @param offsets Offsets which dictate the range of events that are included
 * Use currentOffsets() if you wish to include all known events
 * @param pond The pond from which the events are taken
 * @returns Offset map with offsets that match the constraints described above
 */
export async function syncOffsetMapOnTimestamp(
  timestampMicros: number,
  offsets: OffsetMap,
  pond: Pond,
): Promise<OffsetMap> {
  const allOffsets = await Promise.all(
    Object.entries(offsets).map(async ([sid, __events]) => {
      try {
        const lastEventOffsetBeforeTimestamp = await getLastEventOffsetBeforeTimestamp(
          offsets,
          sid,
          timestampMicros + 1,
          pond,
        )
        return {
          [sid]: lastEventOffsetBeforeTimestamp,
        }
      } catch {
        return {
          [sid]: 0,
        }
      }
    }),
  )
  return allOffsets.reduce((previousValue, currentValue) => {
    return { ...previousValue, ...currentValue }
  }, {})
}

/**
 * Queries the pond for events that match the given tags and offsets. The callback is called for every chunk of events.
 * @param pond The pond from which the events are taken.
 * @param offsets Offsets which dictate the range of events that are included in the query.
 * @param tags Only events that match these tags will be included in the query.
 * @param callback Function which will be called with each chunk of events
 */
export async function querySelectedEventsChunked(
  pond: Pond,
  offsets: { readonly [x: string]: number },
  tags: string,
  callback: (events: ActyxEvent[]) => void,
): Promise<void> {
  return new Promise<void>((resolve) => {
    pond.events().queryKnownRangeChunked(
      {
        upperBound: offsets,
        order: EventsSortOrder.Ascending,
        query: tagsFromString(tags),
      },
      QUERY_CHUNK_SIZE,
      ({ events }) => {
        callback(events)
      },
      resolve,
    )
  })
}

/**
 * Calculates a twin-state and the predecessor to the final twin-state by reducing the given array of events onto an initial state.
 * @param events The array of events to be applied to the twin.
 * @param onEventFn The on-event-function of the twin.
 * @param initialState Initial state of the twin.
 * @returns The state of the twin after applying all events and the predecessor to this state.
 */
export function reduceTwinStateFromEvents(
  events: ActyxEvent<unknown>[],
  onEventFn: (state: any, event: any, meta: any) => any,
  initialState: any,
): { previousState: any; currentState: any } {
  return events.reduce(
    (state, { payload, meta }) => {
      return {
        previousState: state.currentState,
        currentState: onEventFn(state.currentState, payload, meta),
      }
    },
    { previousState: {}, currentState: initialState },
  )
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
