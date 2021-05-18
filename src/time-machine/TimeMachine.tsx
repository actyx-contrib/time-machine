import React, { useState } from 'react'
import { ActyxEvent, Fish, OffsetMap, Pond, Reduce, Tags } from '@actyx/pond'
import { usePond } from '@actyx-contrib/react-pond'
import { Slider, Typography, TextField, Grid } from '@material-ui/core'
import Alert from '@material-ui/lab/Alert'
import { KeyboardDateTimePicker, MuiPickersUtilsProvider } from '@material-ui/pickers'
import DateFnsUtils from '@date-io/date-fns'
import fishes from './fishes'

type RelativeTiming = 'beforeBounds' | 'withinBounds' | 'afterBounds'

export function TimeMachineComponent(): JSX.Element {
  const [allEvents, setAllEvents] = useState<OffsetMap>()
  const [eventsBeforeTimeLimit, setEventsBeforeTimeLimit] = useState<OffsetMap>({})
  const [selectedEvents, setSelectedEvents] = useState<OffsetMap>({})

  const [earliestEventMillis, setEarliestEventMillis] = useState<number>()
  const [latestEventMillis, setLatestEventMillis] = useState<number>()
  const [selectedTimeLimitMillis, setSelectedTimeLimitMillis] = useState<number>(0)
  const [timeSliderValue, setTimeSliderValue] = useState<number>(0)

  const [importedFishes, setImportedFishes] = useState<Fish<any, any>[]>(fishes())
  const [selectedFish, setSelectedFish] = useState<Fish<any, any>>(importedFishes[0])
  const [selectedTags, setSelectedTags] = React.useState('oven-fish:oven_')

  const [fishStates, setFishStates] = useState([])
  const pond = usePond()

  React.useEffect(() => {
    pond.events().currentOffsets().then(setAllEvents)
    const refresh = setInterval(() => {
      pond.events().currentOffsets().then(setAllEvents)
    }, 10000)
    return () => {
      clearInterval(refresh)
    }
  }, [])

  //Reload the time boundaries whenever an earlier/later event arrives or the tags change
  React.useEffect(() => {
    setEarliestEventMillis(undefined)
    setLatestEventMillis(undefined)
    const cancelSubscriptionOnEarlist = pond.events().observeEarliest(
      {
        query: tagsFromString(selectedTags),
      },
      (event, metadata) => {
        setEarliestEventMillis(metadata.timestampMicros / 1000)
      },
    )
    const cancelSubscriptionOnLatest = pond.events().observeLatest(
      {
        query: tagsFromString(selectedTags),
      },
      (event, metadata) => {
        setLatestEventMillis(metadata.timestampMicros / 1000)
      },
    )
    return () => {
      cancelSubscriptionOnEarlist()
      cancelSubscriptionOnLatest()
    }
  }, [selectedTags])

  //Reapply Events on Twin after Boundary Change
  React.useEffect(() => {
    if (!selectedEvents) {
      return
    }
    reduceTwinStateFromEvents(
      pond,
      selectedEvents,
      selectedTags,
      selectedFish.onEvent,
      selectedFish.initialState,
      setFishStates,
    )
  }, [selectedEvents])

  React.useEffect(() => {
    if (!allEvents) return

    updateEventsBeforeTimeLimitForAllSources()
  }, [selectedTimeLimitMillis])

  if (!allEvents) {
    return <div>loading...</div>
  }

  if (!selectedTimeLimitMillis) {
    setSelectedTimeLimitMillis(Date.now())
  }

  return (
    <div>
      <div style={{ flex: 1 }}>
        <Typography variant="h1" component="h2" gutterBottom>
          Actyx Time Machine
        </Typography>
      </div>
      <Grid container spacing={1}>
        {!earliestEventMillis ? (
          <Grid item xs={12}>
            <Alert severity="warning">No events match the given Tags!</Alert>
          </Grid>
        ) : null}
        <Grid item xs={2}>
          <Typography>Where:</Typography>
        </Grid>
        <Grid item xs={10}>
          <TextField
            style={{ width: 350 }}
            value={selectedTags}
            type="text"
            onChange={({ target }) => setSelectedTags(target.value)}
          />
        </Grid>
        <Grid item xs={2}>
          <Typography>Initial State:</Typography>
        </Grid>
        <Grid item xs={10}>
          <TextField
            style={{ width: 350 }}
            value={JSON.stringify(selectedFish.initialState)}
            multiline
            disabled
          />
        </Grid>
        <Grid item xs={2}>
          <Typography>onEvent function:</Typography>
        </Grid>
        <Grid item xs={10}>
          <TextField
            style={{ width: 350 }}
            value={selectedFish.onEvent.toString()}
            multiline
            disabled
          />
        </Grid>
        <Grid item xs={12}>
          <br></br>
          <div>fishState: {JSON.stringify(fishStates)}</div>
          <br></br>
        </Grid>
        {Object.entries(eventsBeforeTimeLimit).map(([sid, events]) => {
          return (
            <Grid key={sid} item container spacing={1} xs={12}>
              <Grid item xs={2}>
                <Typography style={{ width: 170 }}>
                  {sid} <br />({selectedEvents[sid] || 0}/{events})
                </Typography>
              </Grid>
              <Grid item xs={2}>
                <Slider
                  style={{ width: 350 }}
                  value={selectedEvents[sid] || 0}
                  min={0}
                  max={events}
                  disabled={!earliestEventMillis || !latestEventMillis}
                  onChange={(event, value) => {
                    setSelectedEvents(addValueToOffsetMap(selectedEvents, sid, +value))
                  }}
                  aria-labelledby="continuous-slider"
                />
              </Grid>
            </Grid>
          )
        })}
        <Grid item xs={2}>
          <Typography style={{ width: 170 }}>
            Time Machine {new Date(selectedTimeLimitMillis).toLocaleString()}
          </Typography>
        </Grid>
        <Grid item xs={10}>
          <Slider
            style={{ width: 350 }}
            value={timeSliderValue}
            min={earliestEventMillis ? earliestEventMillis : 0}
            max={latestEventMillis ? latestEventMillis : Date.now()}
            disabled={!earliestEventMillis || !latestEventMillis}
            onChange={(event, value) => {
              setTimeSliderValue(+value)
            }}
            onChangeCommitted={(event, value) => {
              setSelectedTimeLimitMillis(+value)
            }}
            aria-labelledby="continuous-slider"
          />
        </Grid>
        <Grid item xs={12}>
          <MuiPickersUtilsProvider utils={DateFnsUtils}>
            <KeyboardDateTimePicker
              variant="inline"
              ampm={false}
              label="Include events up to:"
              value={selectedTimeLimitMillis}
              disabled={!earliestEventMillis || !latestEventMillis}
              onChange={(date) => {
                if (date) {
                  setCurrentTimeMillisByDate(date)
                }
              }}
              onError={console.log}
              format="yyyy/MM/dd HH:mm:ss"
            />
          </MuiPickersUtilsProvider>
        </Grid>
      </Grid>
    </div>
  )

  function setCurrentTimeMillisByDate(date: Date) {
    setSelectedTimeLimitMillis(date.getTime())
    setTimeSliderValue(date.getTime())
  }

  async function updateEventsBeforeTimeLimitForAllSources() {
    if (!allEvents) return
    let newOffsets = {}
    for (const [sid, events] of Object.entries(allEvents)) {
      const selectedOffset = await getLastOffsetBeforeTimestamp(
        allEvents,
        sid,
        selectedTimeLimitMillis * 1000,
        pond,
      )
      newOffsets = addValueToOffsetMap(newOffsets, sid, selectedOffset)
    }
    setEventsBeforeTimeLimit(newOffsets)
    console.log('pre')
    console.log(newOffsets)
    console.log('post')
    applyLimitOnSelectedEvents(newOffsets)
  }

  function applyLimitOnSelectedEvents(eventsBeforeTimeLimit: OffsetMap) {
    let newOffsets = {}
    console.log('second')
    console.log(eventsBeforeTimeLimit)
    for (const [sid, events] of Object.entries(eventsBeforeTimeLimit)) {
      if (selectedEvents[sid] > events) {
        newOffsets = addValueToOffsetMap(newOffsets, sid, events)
      } else {
        newOffsets = addValueToOffsetMap(newOffsets, sid, selectedEvents[sid])
      }
    }
    setSelectedEvents(newOffsets)
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
