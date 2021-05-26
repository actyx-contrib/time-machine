import React, { useState } from 'react'
import { Fish, OffsetMap } from '@actyx/pond'
import { usePond } from '@actyx-contrib/react-pond'
import { Slider, Typography, TextField, Grid, CardContent, Card } from '@material-ui/core'
import Alert from '@material-ui/lab/Alert'
import { KeyboardDateTimePicker, MuiPickersUtilsProvider } from '@material-ui/pickers'
import DateFnsUtils from '@date-io/date-fns'
import fishes from './fishes'
import {
  upsertOffsetMapValue,
  getLastEventOffsetBeforeTimestamp,
  querySelectedEventsChunked,
  tagsFromString,
  reduceTwinStateFromEvents,
  whereToTagsString,
} from './actyx-functions'
import { SourceSlider } from './components/SourceSlider'

export function TimeMachineComponent(): JSX.Element {
  const importedFishes = fishes()
  const pond = usePond()

  const [allEvents, setAllEvents] = useState<OffsetMap>()
  const [eventsBeforeTimeLimit, setEventsBeforeTimeLimit] = useState<OffsetMap>({})
  const [selectedEvents, setSelectedEvents] = useState<OffsetMap>({})

  const [earliestEventMicros, setEarliestEventMicros] = useState<number>()
  const [latestEventMicros, setLatestEventMicros] = useState<number>()
  const [selectedTimeLimitMicros, setSelectedTimeLimitMicros] = useState<number>(0)
  const [timeSliderValue, setTimeSliderValue] = useState<number>(0)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedFish, setSelectedFish] = useState<Fish<any, any>>(importedFishes[0])
  const [selectedTags, setSelectedTags] = React.useState(whereToTagsString(importedFishes[0].where))

  //const [calculatingSliderLimit, setCalculatingSliderLimit] = React.useState<boolean>(false)

  const [fishStates, setFishStates] = useState([])

  const MILLIS_TO_MICROS = 1000

  //Look for new event offsets every x nanoseconds
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
    setEarliestEventMicros(undefined)
    setLatestEventMicros(undefined)
    const cancelSubscriptionOnEarlist = pond.events().observeEarliest(
      {
        query: tagsFromString(selectedTags),
      },
      (_event, metadata) => {
        setEarliestEventMicros(metadata.timestampMicros)
      },
    )
    const cancelSubscriptionOnLatest = pond.events().observeLatest(
      {
        query: tagsFromString(selectedTags),
      },
      (_event, metadata) => {
        setLatestEventMicros(metadata.timestampMicros)
      },
    )
    return () => {
      cancelSubscriptionOnEarlist()
      cancelSubscriptionOnLatest()
    }
  }, [selectedTags])

  //Reapply events on Twin after change of selected events
  React.useEffect(() => {
    if (!selectedEvents) {
      return
    }
    updateTwinState()
  }, [selectedEvents])

  React.useEffect(() => {
    if (!allEvents) return

    updateEventsBeforeTimeLimitForAllSources()
  }, [selectedTimeLimitMicros])

  if (!allEvents) {
    return <div>loading...</div>
  }

  if (!selectedTimeLimitMicros) {
    setSelectedTimeLimitMicros(Date.now())
  }

  return (
    <div>
      <div style={{ flex: 1 }}>
        <Typography variant="h1" component="h1" gutterBottom>
          Actyx Time Machine
        </Typography>
        {!earliestEventMicros ? (
          <Grid item xs={12}>
            <Alert severity="warning">
              No events match the given tags. Please change your tags!
            </Alert>
          </Grid>
        ) : null}
      </div>
      <br />
      <Grid container spacing={2}>
        <Grid container spacing={2} item xs={6}>
          <Grid item xs={12}>
            <Typography variant="h4" component="h4" className="sub-header" gutterBottom>
              Fish properties
            </Typography>
          </Grid>
          <Grid item xs={2}>
            <Typography>Tags:</Typography>
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
            <Typography variant="h4" component="h4" className="sub-header" gutterBottom>
              Select time limit:
            </Typography>
          </Grid>
          <Grid item xs={2}>
            <Typography style={{ width: 170 }}>
              Date Slider (will be removed){' '}
              {new Date(selectedTimeLimitMicros / MILLIS_TO_MICROS).toLocaleString()}
            </Typography>
          </Grid>
          <Grid item xs={10}>
            <Slider
              style={{ width: 350 }}
              value={timeSliderValue}
              min={earliestEventMicros ? earliestEventMicros : 0}
              max={latestEventMicros ? latestEventMicros + 1 : Date.now() * MILLIS_TO_MICROS}
              disabled={!earliestEventMicros || !latestEventMicros}
              onChange={(_event, value) => {
                setTimeSliderValue(+value)
              }}
              onChangeCommitted={(_event, value) => {
                setSelectedTimeLimitMicros(+value)
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
                value={selectedTimeLimitMicros / MILLIS_TO_MICROS}
                disabled={!earliestEventMicros || !latestEventMicros}
                onChange={(date) => {
                  if (date) {
                    setCurrentTimeMicrosByDate(date)
                  }
                }}
                onError={console.log}
                format="yyyy/MM/dd HH:mm:ss"
              />
            </MuiPickersUtilsProvider>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h4" component="h4" className="sub-header" gutterBottom>
              Select events from your ActyxOS nodes:
            </Typography>
          </Grid>
          {Object.entries(eventsBeforeTimeLimit).map(([sid, events]) => {
            return (
              <SourceSlider
                sid={sid}
                numberOfSelectedEvents={selectedEvents[sid] || 0}
                numberOfAllEvents={events}
                onEventsChanged={(events) => {
                  setSelectedEvents(upsertOffsetMapValue(selectedEvents, sid, events))
                }}
                disabled={!earliestEventMicros || !latestEventMicros}
                key={sid}
              />
            )
          })}
        </Grid>
        <Grid item xs={6}>
          <Typography variant="h4" component="h4" className="sub-header" gutterBottom>
            Resulting Fish-State:
          </Typography>
          <Card>
            <CardContent>
              <Typography noWrap={false}>
                <br />
                {JSON.stringify(fishStates)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  )

  async function updateTwinState() {
    let twinState = selectedFish.initialState
    await querySelectedEventsChunked(pond, selectedEvents, selectedTags, (events) => {
      twinState = reduceTwinStateFromEvents(events, selectedFish.onEvent, twinState)
    })
    setFishStates(twinState)
  }

  function setCurrentTimeMicrosByDate(date: Date) {
    setSelectedTimeLimitMicros(date.getTime() * MILLIS_TO_MICROS)
    setTimeSliderValue(date.getTime() * MILLIS_TO_MICROS)
  }

  async function updateEventsBeforeTimeLimitForAllSources() {
    if (!allEvents) return
    let newOffsets = {}
    for (const [sid] of Object.entries(allEvents)) {
      const selectedOffset = await getLastEventOffsetBeforeTimestamp(
        allEvents,
        sid,
        selectedTimeLimitMicros,
        pond,
      )
      newOffsets = upsertOffsetMapValue(newOffsets, sid, selectedOffset === -1 ? 0 : selectedOffset)
    }
    setEventsBeforeTimeLimit(newOffsets)
    applyLimitOnSelectedEvents(newOffsets)
  }

  function applyLimitOnSelectedEvents(eventsBeforeTimeLimit: OffsetMap) {
    let newOffsets = {}
    for (const [sid, events] of Object.entries(eventsBeforeTimeLimit)) {
      if (selectedEvents[sid] > events) {
        newOffsets = upsertOffsetMapValue(newOffsets, sid, events)
      } else {
        newOffsets = upsertOffsetMapValue(newOffsets, sid, selectedEvents[sid])
      }
    }
    setSelectedEvents(newOffsets)
  }
}
