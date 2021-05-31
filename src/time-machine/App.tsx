import React, { useState } from 'react'
import { Fish, OffsetMap } from '@actyx/pond'
import { usePond } from '@actyx-contrib/react-pond'
import { Typography, TextField, Grid } from '@material-ui/core'
import fishes from './fishes'
import ReactJson from 'react-json-view'
import {
  upsertOffsetMapValue,
  getLastEventOffsetBeforeTimestamp,
  querySelectedEventsChunked,
  tagsFromString,
  reduceTwinStateFromEvents,
  whereToTagsString,
} from './actyx-functions'
import { SourceSlider } from './components/SourceSlider'
import { StatePanel } from './components/StatePanel'
import { EventPanel } from './components/EventPanel'
import { OnEventFunctionPanel } from './components/OnEventFunctionPanel'
import { TimeSelectionPanel } from './components/TimeSelectionPanel'
import { TagsAlert } from './components/TagsAlert'

const ACTYX_REFRESH_INTERVAL = 10000

export function App(): JSX.Element {
  const importedFishes = fishes()
  const pond = usePond()

  const [allEvents, setAllEvents] = useState<OffsetMap>()
  const [eventsBeforeTimeLimit, setEventsBeforeTimeLimit] = useState<OffsetMap>({})
  const [selectedEvents, setSelectedEvents] = useState<OffsetMap>({})

  const [earliestEventMicros, setEarliestEventMicros] = useState<number>()
  const [latestEventMicros, setLatestEventMicros] = useState<number>()
  const [selectedTimeLimitMicros, setSelectedTimeLimitMicros] = useState<number>(0)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedFish, setSelectedFish] = useState<Fish<any, any>>(importedFishes[0])
  const [selectedTags, setSelectedTags] = React.useState(whereToTagsString(importedFishes[0].where))

  const [calculatingOffsetLimits, setCalculatingOffsetLimits] = React.useState<boolean>(false)

  const [lastAppliedEvent, setLastAppliedEvent] = useState<any>({})
  const [fishStates, setFishStates] = useState([])

  //Look for new event offsets every x nanoseconds
  React.useEffect(() => {
    pond.events().currentOffsets().then(setAllEvents)
    const refresh = setInterval(() => {
      pond.events().currentOffsets().then(setAllEvents)
    }, ACTYX_REFRESH_INTERVAL)
    return () => {
      clearInterval(refresh)
    }
  }, [])

  //Reload the time boundaries whenever an earlier/later event arrives or the tags change
  React.useEffect(() => {
    setEarliestEventMicros(undefined)
    setLatestEventMicros(undefined)
    const cancelSubscriptionOnEarliest = pond.events().observeEarliest(
      {
        query: tagsFromString(selectedTags),
      },
      (_, metadata) => {
        setEarliestEventMicros(metadata.timestampMicros)
        console.log(selectedTimeLimitMicros)
        if (selectedTimeLimitMicros === 0) {
          setSelectedTimeLimitMicros(metadata.timestampMicros)
        }
      },
    )
    const cancelSubscriptionOnLatest = pond.events().observeLatest(
      {
        query: tagsFromString(selectedTags),
      },
      (_, metadata) => {
        setLatestEventMicros(metadata.timestampMicros)
      },
    )
    return () => {
      cancelSubscriptionOnEarliest()
      cancelSubscriptionOnLatest()
    }
  }, [selectedTags])

  //Reapply events on Twin after change of selected events
  React.useEffect(() => {
    if (selectedEvents) {
      updateTwinState()
    }
  }, [selectedEvents])

  React.useEffect(() => {
    if (!allEvents) return

    updateEventsBeforeTimeLimitForAllSources()
  }, [selectedTimeLimitMicros])

  if (!allEvents) {
    return <div>loading...</div>
  }

  return (
    <div>
      <div style={{ flex: 1 }}>
        <Typography variant="h2" component="h2" gutterBottom>
          Actyx Time Machine
        </Typography>
      </div>
      <br />
      <Grid container spacing={5}>
        <Grid container spacing={4} item xs={6}>
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
              error={!(earliestEventMicros && latestEventMicros)}
              value={selectedTags}
              type="text"
              fullWidth={true}
              onChange={({ target }) => setSelectedTags(target.value)}
            />
          </Grid>
          <Grid item xs={2}>
            <Typography>Initial State:</Typography>
          </Grid>
          <Grid item xs={10}>
            <ReactJson src={selectedFish.initialState} />
          </Grid>
          <Grid item xs={12}>
            <OnEventFunctionPanel functionCode={selectedFish.onEvent.toString()} />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h4" component="h4" className="sub-header" gutterBottom>
              Select time limit:
            </Typography>
            {earliestEventMicros && latestEventMicros && selectedTimeLimitMicros > 0 ? (
              <TimeSelectionPanel
                selectedTimeLimitMicros={selectedTimeLimitMicros}
                earliestEventMicros={earliestEventMicros}
                latestEventMicros={latestEventMicros}
                disabled={calculatingOffsetLimits}
                onTimeChange={(time) => {
                  if (time !== selectedTimeLimitMicros) {
                    setCalculatingOffsetLimits(true)
                    setSelectedTimeLimitMicros(time)
                  }
                }}
              />
            ) : (
              <TagsAlert tagsStatus={'noMatchingEvents'} />
            )}
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h4" component="h4" className="sub-header" gutterBottom>
              Select events from your ActyxOS nodes:
            </Typography>
          </Grid>
          <Grid item xs={12}>
            {earliestEventMicros && latestEventMicros ? (
              <div>
                {Object.entries(eventsBeforeTimeLimit).map(([sid, events]) => {
                  return (
                    <SourceSlider
                      sid={sid}
                      numberOfSelectedEvents={selectedEvents[sid] + 1 || 0}
                      numberOfAllEvents={events + 1}
                      onEventsChanged={(events) => {
                        setSelectedEvents(upsertOffsetMapValue(selectedEvents, sid, events - 1))
                      }}
                      disabled={
                        !earliestEventMicros || !latestEventMicros || calculatingOffsetLimits
                      }
                      key={sid}
                    />
                  )
                })}
              </div>
            ) : (
              <TagsAlert tagsStatus={'noMatchingEvents'} />
            )}
          </Grid>
        </Grid>
        <Grid item container xs={6} spacing={2}>
          <Grid item xs={12}>
            <StatePanel state={fishStates} />
          </Grid>
          <Grid item xs={12}>
            <EventPanel event={lastAppliedEvent} />
          </Grid>
        </Grid>
      </Grid>
    </div>
  )

  async function updateTwinState() {
    let twinState = selectedFish.initialState
    let lastAppliedEvent = {}
    await querySelectedEventsChunked(pond, selectedEvents, selectedTags, (events) => {
      twinState = reduceTwinStateFromEvents(events, selectedFish.onEvent, twinState)
      lastAppliedEvent = events[events.length - 1]
    })
    setFishStates(twinState)
    setLastAppliedEvent(lastAppliedEvent)
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
    setCalculatingOffsetLimits(false)
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
