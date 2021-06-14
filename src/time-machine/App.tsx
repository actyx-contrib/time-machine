import React, { useState } from 'react'
import { Fish, OffsetMap } from '@actyx/pond'
import { usePond } from '@actyx-contrib/react-pond'
import {
  Typography,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Divider,
} from '@material-ui/core'
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

/**
 *
 * @returns Main component of the Actyx Time Machine
 */
export function App(): JSX.Element {
  //Import fishes from user-supplied fishes.ts
  const importedFishes: Fish<{ [p: string]: unknown }, { [p: string]: unknown }>[] = fishes()

  const pond = usePond()

  const [allEvents, setAllEvents] = useState<OffsetMap>()
  const [selectableEvents, setSelectableEvents] = useState<OffsetMap>({})
  const [selectedEvents, setSelectedEvents] = useState<OffsetMap>({})

  const [earliestEventMicros, setEarliestEventMicros] = useState<number>()
  const [latestEventMicros, setLatestEventMicros] = useState<number>()
  const [selectedTimeLimitMicros, setSelectedTimeLimitMicros] = useState<number>(0)

  const [selectedFishIndex, setSelectedFishIndex] = useState<number>(0)
  const [selectedTags, setSelectedTags] = React.useState(whereToTagsString(importedFishes[0].where))
  const [selectedSyncCheckboxesMap, setSelectedSyncCheckbox] = React.useState<{
    readonly [x: string]: boolean
  }>({})
  const [checkboxLock, setCheckboxLock] = useState<boolean>(false)

  const [calculatingOffsetLimits, setCalculatingOffsetLimits] = React.useState<boolean>(false)
  const [calculatingFishState, setCalculatingFishState] = React.useState<boolean>(false)

  const [recentEvent, setRecentEvent] = useState<{ [p: string]: unknown }>({})
  const [fishState, setFishState] = useState({})

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

  //Reapply events on fishes after change of selected events
  React.useEffect(() => {
    if (selectedEvents) {
      updateFishStateAndRecentEvent()
    }
  }, [selectedEvents, selectedTags])

  //Update tags when a new fish is selected by the user
  React.useEffect(() => {
    const tagsFromNewFish = whereToTagsString(importedFishes[selectedFishIndex].where)
    setSelectedTags(tagsFromNewFish)
  }, [selectedFishIndex])

  //Update selectable events when time limit changes
  React.useEffect(() => {
    if (!allEvents) return

    updateSelectableEvents()
  }, [selectedTimeLimitMicros])

  //Update selected events when max selectable events changes
  React.useEffect(() => {
    applyLimitOnSelectedEvents()
  }, [selectableEvents])

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
        <Grid container spacing={4} item md={6} xs={12}>
          <Grid item xs={12}>
            <Typography variant="h3" component="h3" className="section-header" gutterBottom>
              Settings:
            </Typography>
          </Grid>
          <Grid item container xs={12} spacing={4} style={{ paddingLeft: 50, paddingRight: 0 }}>
            <Grid item xs={12}>
              <Typography variant="h4" component="h4" className="sub-header" gutterBottom>
                Select fish:
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControl>
                <InputLabel>Select from imported fishes</InputLabel>
                <Select
                  value={selectedFishIndex}
                  onChange={(event) => {
                    setSelectedFishIndex(event.target.value as number)
                  }}
                >
                  {importedFishes.map((fish, index) => {
                    return (
                      <MenuItem key={index} value={index}>
                        {fish.where.toString()}
                      </MenuItem>
                    )
                  })}
                </Select>
              </FormControl>
            </Grid>
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
              <ReactJson src={importedFishes[selectedFishIndex].initialState} />
            </Grid>
            <Grid item xs={12}>
              <OnEventFunctionPanel
                functionCode={importedFishes[selectedFishIndex].onEvent.toString()}
              />
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
                    setSelectedTimeLimitMicros(time)
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
                  {Object.entries(selectableEvents).map(([sid, events]) => {
                    return (
                      <SourceSlider
                        sid={sid}
                        numberOfSelectedEvents={selectedEvents[sid] + 1 || 0}
                        numberOfAllEvents={events + 1}
                        syncDisabled={!selectedSyncCheckboxesMap[sid] && checkboxLock}
                        syncSelected={selectedSyncCheckboxesMap[sid] || false}
                        onEventsChanged={(events) => {
                          setSelectedEvents(upsertOffsetMapValue(selectedEvents, sid, events - 1))
                        }}
                        onSyncCheckboxChanged={(checked) => {
                          setSelectedSyncCheckbox({ ...selectedSyncCheckboxesMap, [sid]: checked })
                          setCheckboxLock(checked)
                        }}
                        disabled={calculatingFishState || calculatingOffsetLimits}
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
        </Grid>
        <Grid item>
          <Divider orientation="vertical" variant="fullWidth" />
        </Grid>
        <Grid item container md={6} xs={12} spacing={2}>
          <Grid item xs={12}>
            <Typography variant="h3" component="h3" className="section-header" gutterBottom>
              Result:
            </Typography>
          </Grid>
          <Grid item container xs={12} spacing={4} style={{ paddingLeft: 50, paddingRight: 0 }}>
            <Grid item xs={12}>
              <StatePanel state={fishState} />
            </Grid>
            <Grid item xs={12}>
              <EventPanel event={recentEvent} />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </div>
  )

  /**
   * Calculates a new state for the currently selected fish by reducing the state from the selected events.
   * The events are queried from ActyxOS.
   * The last event that is applied while calculating the new state is set as the new displayed most recent event.
   */
  async function updateFishStateAndRecentEvent() {
    setCalculatingFishState(true)
    let twinState = importedFishes[selectedFishIndex].initialState
    let lastAppliedEvent = {}
    await querySelectedEventsChunked(pond, selectedEvents, selectedTags, (events) => {
      twinState = reduceTwinStateFromEvents(
        events,
        importedFishes[selectedFishIndex].onEvent,
        twinState,
      )
      lastAppliedEvent = events[events.length - 1]
    })
    setFishState(twinState)
    setRecentEvent(lastAppliedEvent)
    setCalculatingFishState(false)
  }

  /**
   * Update selectable events by restricting them to events that happened before selected time limit.
   */
  async function updateSelectableEvents() {
    setCalculatingOffsetLimits(true)
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
    setSelectableEvents(newOffsets)
    setCalculatingOffsetLimits(false)
  }

  /**
   * Limits selected events when the max selectable events value has become lower than selected events value.
   */
  function applyLimitOnSelectedEvents() {
    let newOffsets = {}
    for (const [sid, events] of Object.entries(selectableEvents)) {
      if (selectedEvents[sid] > events) {
        newOffsets = upsertOffsetMapValue(newOffsets, sid, events)
      } else {
        newOffsets = upsertOffsetMapValue(newOffsets, sid, selectedEvents[sid])
      }
    }
    setSelectedEvents(newOffsets)
  }
}
