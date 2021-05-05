import React, { useState } from 'react'
import { ActyxEvent, OffsetMap, Pond, Reduce, Tags } from '@actyx/pond'
import { usePond } from '@actyx-contrib/react-pond'
import { Slider, Typography, TextField, Grid } from '@material-ui/core'

const defaultOnEvent = `(state, event, metadata) => {
  return state
}`

type RelativeTiming = 'beforeBounds' | 'withinBounds' | 'afterBounds'

export function TimeMachineComponent(): JSX.Element {
  const [tags, setTags] = React.useState('oven-fish:oven_1')
  const [initState, setInitState] = React.useState('{"id": 1}')
  const [onEventFunctionCode, setOnEventFunction] = React.useState(defaultOnEvent)

  const [upperBound, setUpperBound] = useState<OffsetMap>()
  const [startTimeMillis, setStartTimeMillis] = useState<number>()
  const [endTimeMillis, setEndTimeMillis] = useState<number>()
  const [currentTimeMillis, setCurrentTimeMillis] = useState<number>(0)
  const [currentTimeMillisSelection, setCurrentTimeMillisSelection] = useState<number>(0)
  const [selectedEventOffsetMap, setSelectedEventOffsetMap] = useState<OffsetMap>({})

  const [twinState, setTwinState] = useState({})
  const pond = usePond()

  React.useEffect(() => {
    pond.events().currentOffsets().then(setUpperBound)
    const refresh = setInterval(() => {
      pond.events().currentOffsets().then(setUpperBound)
    }, 10000)
    return () => {
      clearInterval(refresh)
    }
  }, [])

  //Reload the time boundaries whenever an earlier/later event arrives or the tags change
  React.useEffect(() => {
    const cancelSubscriptionOnEarlist = pond.events().observeEarliest(
      {
        query: tagsFromString(tags),
      },
      (event, metadata) => {
        setStartTimeMillis(metadata.timestampMicros / 1000)
      },
    )
    const cancelSubscriptionOnLatest = pond.events().observeLatest(
      {
        query: tagsFromString(tags),
      },
      (event, metadata) => {
        setEndTimeMillis(metadata.timestampMicros / 1000)
      },
    )
    return () => {
      cancelSubscriptionOnEarlist()
      cancelSubscriptionOnLatest()
    }
  }, [tags])

  const onEventFunction = React.useCallback(
    (state, event, meta): Reduce<unknown, unknown> => {
      try {
        return new Function(
          '__inState__',
          '__inEvent__',
          '__inMetadata__',
          `try{ return (${onEventFunctionCode})(__inState__, __inEvent__, __inMetadata__) } catch {return __inState__}`,
        )(state, event, meta)
      } catch (error) {
        console.log(error)
        return state
      }
    },
    [onEventFunctionCode],
  )

  //Reapply Events on Twin after Boundary Change
  React.useEffect(() => {
    if (!selectedEventOffsetMap) {
      return
    }
    reduceTwinStateFromEvents(
      pond,
      selectedEventOffsetMap,
      tags,
      onEventFunction,
      initState,
      setTwinState,
    )
  }, [selectedEventOffsetMap])

  React.useEffect(() => {
    if (!upperBound) return

    updateSelectedEventOffsetMapForAllSids()
  }, [currentTimeMillis])

  if (!upperBound || !startTimeMillis || !endTimeMillis) {
    return <div>loading...</div>
  }

  if (!currentTimeMillis) {
    setCurrentTimeMillis(endTimeMillis)
  }

  return (
    <div>
      <div style={{ flex: 1 }}>
        <Typography variant="h1" component="h2" gutterBottom>
          Actyx Time Machine
        </Typography>
      </div>
      <Grid container spacing={1}>
        <Grid item xs={2}>
          <span>Where:</span>
        </Grid>
        <Grid item xs={10}>
          <TextField
            style={{ width: 350 }}
            value={tags}
            type="text"
            onChange={({ target }) => setTags(target.value)}
          />
        </Grid>
        <Grid item xs={2}>
          <span>Initial State:</span>
        </Grid>
        <Grid item xs={10}>
          <TextField
            style={{ width: 350 }}
            value={initState}
            multiline
            onChange={({ target }) => setInitState(target.value)}
          />
        </Grid>
        <Grid item xs={2}>
          <span>onEvent function:</span>
        </Grid>
        <Grid item xs={10}>
          <TextField
            style={{ width: 350 }}
            value={onEventFunctionCode}
            multiline
            onChange={({ target }) => setOnEventFunction(target.value)}
          />
        </Grid>
        <Grid item xs={12}>
          <br></br>
          <div>fishState: {JSON.stringify(twinState)}</div>
          <br></br>
        </Grid>

        {Object.entries(upperBound).map(([sid, events]) => {
          const value = selectedEventOffsetMap[sid] || 0
          return (
            <Grid key={sid} item container spacing={1} xs={12}>
              <Grid item xs={2}>
                <span style={{ width: 170 }}>
                  {sid} ({value}/{events})
                </span>
              </Grid>
              <Grid item xs={2}>
                <Slider
                  style={{ width: 350 }}
                  value={value}
                  min={0}
                  max={events}
                  onChange={(event, value) => {
                    setSelectedEventOffsetMap(
                      addValueToOffsetMap(selectedEventOffsetMap, sid, +value),
                    )
                  }}
                  aria-labelledby="continuous-slider"
                />
              </Grid>
            </Grid>
          )
        })}

        <Grid item xs={2}>
          <span style={{ width: 170 }}>
            Time Machine {new Date(currentTimeMillis).toLocaleString()}
          </span>
        </Grid>
        <Grid item xs={10}>
          <Slider
            style={{ width: 350 }}
            value={currentTimeMillisSelection}
            min={startTimeMillis ? startTimeMillis : 0}
            max={endTimeMillis ? endTimeMillis : Date.now()}
            onChange={(event, value) => {
              setCurrentTimeMillisSelection(+value)
            }}
            onChangeCommitted={(event, value) => {
              setCurrentTimeMillis(+value)
            }}
            aria-labelledby="continuous-slider"
          />
        </Grid>
      </Grid>
    </div>
  )

  async function updateSelectedEventOffsetMapForAllSids() {
    if (!upperBound) return
    let newOffsets = {}
    for (const [sid, event] of Object.entries(upperBound)) {
      const selectedOffset = await getLastOffsetBeforeTimestamp(
        upperBound,
        sid,
        currentTimeMillis * 1000,
        pond,
      )
      newOffsets = addValueToOffsetMap(newOffsets, sid, selectedOffset)
    }
    setSelectedEventOffsetMap(newOffsets)
  }
}

async function compareTimestampWithOffsetBounds(
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

async function getLastOffsetBeforeTimestamp(
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

async function getEarliestActyxEventBySid(
  offsets: OffsetMap,
  sid: string,
  pond: Pond,
): Promise<ActyxEvent<unknown>> {
  return await getActyxEventByOffset(sid, 0, pond)
}

async function getLatestActyxEventBySid(
  offsets: OffsetMap,
  sid: string,
  pond: Pond,
): Promise<ActyxEvent<unknown>> {
  const offset = offsets[sid]
  return await getActyxEventByOffset(sid, offset, pond)
}

async function getActyxEventByOffset(
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

function reduceTwinStateFromEvents(
  pond: Pond,
  selectedEventOffsetMap: { readonly [x: string]: number },
  tags: string,
  onEventFn: (state: any, event: any, meta: any) => Reduce<unknown, unknown>,
  initState: string,
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
        }, JSON.parse(initState)),
      )
    },
  )
}

function tagsFromString(tags: string) {
  try {
    return Tags(...(tags || 'unknown').split(' '))
  } catch (exception) {
    return Tags('unknown')
  }
}

function addValueToOffsetMap(offsets: OffsetMap, sid: string, events: number): OffsetMap {
  return { ...offsets, [sid]: events }
}
