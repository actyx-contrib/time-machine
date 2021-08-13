import React, { useState } from 'react'
import { CancelSubscription, Fish, OffsetMap, Pond } from '@actyx/pond'
import { usePond } from '@actyx-contrib/react-pond'
import {
  Typography,
  Grid,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Card,
  CardContent,
} from '@material-ui/core'
import { fishes } from './fishes'
import {
  upsertOffsetMapValue,
  getLastEventOffsetBeforeTimestamp,
  querySelectedEventsChunked,
  tagsFromString,
  reduceTwinStateFromEvents,
  whereToTagsString,
  syncOffsetMapOnSource,
  getCountOfEventsMatchingTags,
  getOffsetByTaggedOffset,
} from './actyx-functions'
import { SourceSlider } from './components/SourceSlider'
import { StatePanel } from './components/StatePanel'
import { EventPanel } from './components/EventPanel'
import { TimeSelectionPanel } from './components/TimeSelectionPanel'
import { TagsAlert } from './components/TagsAlert'
import { TagsSelection } from './components/TagsSelection'

import { dependencies } from '../../package-lock.json'
import { CustomTooltip } from './components/CustomTooltip'
import { TaggedOffsetMap } from './types'

//import Actyx Refresh Interval from package.json
const configRefreshInterval = process.env.npm_package_config_actyxPondRefreshInterval
const ACTYX_REFRESH_INTERVAL = configRefreshInterval ? parseInt(configRefreshInterval) : 10000

const sm_size = 12
const md_size = 6
const lg_size = 3
const paddingStyle = { paddingLeft: 30, paddingRight: 0 }
/**
 *
 * @returns Main component of the Actyx Time Machine
 */
export function App(): JSX.Element {
  //Import fishes from user-supplied fishes.ts
  const importedFishes: Fish<{ [p: string]: unknown }, { [p: string]: unknown }>[] = fishes()

  if (importedFishes.length == 0) {
    return (
      <Typography>
        Error: No fishes were passed to the application. Please make sure you finished the setup
        steps in the README.md file.
      </Typography>
    )
  }

  const pond = usePond()

  //Offsets of with all existing events and sources. Filled by present()
  const [allEventsOffsets, setAllEventsOffsets] = useState<OffsetMap>()

  //Offsets of all events that match the selected Tags (and selected time boundary). Only lists sources that contain eligible events.
  const [selectableEventsTaggedOffsets, setSelectableEventsTaggedOffsets] =
    useState<TaggedOffsetMap>({})

  //Offsets of the events matching the selected tags that were selected using the event sliders of the UI.
  const [selectedEventsTaggedOffsets, setSelectedEventsTaggedOffsets] = useState<TaggedOffsetMap>(
    {},
  )
  //Same as 'selectedEventsTaggedOffsets' but describing the offsets of the selected
  //events in relation to all events and not just the other events that match the same tags.
  //You can read about the difference in the documentation of 'TaggedOffsetMap'
  const [selectedEventsOffsets, setSelectedEventsOffsets] = useState<OffsetMap>({})

  const [earliestEventMicros, setEarliestEventMicros] = useState<number>()
  const [latestEventMicros, setLatestEventMicros] = useState<number>()
  const [selectedTimeLimitMicros, setSelectedTimeLimitMicros] = useState<number>(0)

  const [selectedFishIndex, setSelectedFishIndex] = useState<number>(0)
  const [selectedTags, setSelectedTags] = React.useState(whereToTagsString(importedFishes[0].where))

  const [selectAllEventsChecked, setSelectAllEventsChecked] = useState<boolean>(false)
  const [keepUpWithNewEventsChecked, setKeepUpWithNewEventsChecked] = useState<boolean>(false)
  const [syncChecked, setSyncChecked] = useState<boolean>(false)
  const [selectedSyncCheckboxesMap, setSelectedSyncCheckbox] = React.useState<{
    readonly [x: string]: boolean
  }>({})

  const [calculatingOffsetLimits, setCalculatingOffsetLimits] = React.useState<boolean>(false)
  const [calculatingFishState, setCalculatingFishState] = React.useState<boolean>(false)
  const [calculatingSync, setCalculatingSync] = React.useState<boolean>(false)

  const [recentEvent, setRecentEvent] = useState<{ [p: string]: unknown }>({})
  const [currentFishState, setCurrentFishState] = useState({})
  const [previousFishState, setPreviousFishState] = useState({})

  const calculating = calculatingFishState || calculatingOffsetLimits || calculatingSync

  //Look for new event offsets every x nanoseconds

  React.useEffect(() => {
    updateAllEventsOffsets()
    const refresh = setInterval(() => {
      updateAllEventsOffsets()
    }, ACTYX_REFRESH_INTERVAL)
    return () => {
      clearInterval(refresh)
    }
  }, [])

  React.useEffect(() => {
    // don't update yet of no event offsets are known
    if (!allEventsOffsets) return
    updateSelectableEventsTaggedOffsets()
  }, [allEventsOffsets, selectedTags])

  //Reload the time boundaries whenever an earlier/later event arrives or the tags change
  React.useEffect(() => {
    return updateEventTimestampMicros()
  }, [selectedTags])

  React.useEffect(() => {
    if (selectedEventsTaggedOffsets) {
      updateSelectedEventsOffsets()
    }
  }, [selectedEventsTaggedOffsets])

  //Reapply events on fishes after change of selected events
  React.useEffect(() => {
    if (selectedEventsOffsets) {
      updateFishStatesAndRecentEvent()
    }
  }, [selectedEventsOffsets, selectedTags])

  //Update tags when a new fish is selected by the user
  React.useEffect(() => {
    const tagsFromNewFish = whereToTagsString(importedFishes[selectedFishIndex].where)
    setSelectedTags(tagsFromNewFish)
  }, [selectedFishIndex])

  //Update selectable events when time limit changes
  /*React.useEffect(() => {
    if (!allEvents) return

    updateSelectableEvents()
  }, [selectedTimeLimitMicros, selectAllEventsChecked, allEvents])
  */
  /*
  React.useEffect(() => {
    if (!allEvents) return

    if (keepUpWithNewEventsChecked) {
      setSelectedEvents(allEvents)
    }
  }, [allEvents, keepUpWithNewEventsChecked])
  */

  //Update selected events when max selectable events changes
  /*React.useEffect(() => {
    applyLimitOnSelectedEvents()
  }, [taggedOffsetsOfSelectableEvents])*/

  // Wait for receiving the offsets before showing application.
  if (!allEventsOffsets) {
    return <div>Waiting for Actyx data...</div>
  }

  return (
    <div>
      <Grid container>
        <Grid item xs={8}>
          <Typography variant="h2" component="h2" gutterBottom>
            Actyx Time Machine
          </Typography>
        </Grid>
        <Grid item xs={4}>
          {calculating ? (
            <Grid item>
              <CircularProgress style={{ paddingTop: '20px' }} />
            </Grid>
          ) : null}
        </Grid>
      </Grid>

      <Grid container spacing={6}>
        <Grid container item spacing={4} xs={12}>
          <Grid item xs={12}>
            <Typography variant="h3" component="h3" className="section-header" gutterBottom>
              Settings:
            </Typography>
          </Grid>
          <Grid item container xs={12} spacing={4} style={paddingStyle}>
            <Grid item container sm={sm_size} md={md_size} xl={lg_size}>
              <Grid item xs={3}>
                <Typography variant="h4" component="h4" className="sub-header" gutterBottom>
                  Select fish:
                </Typography>
              </Grid>
              <Grid item xs={9}>
                <CustomTooltip>
                  <Typography>
                    This is a list of the fishes which you defined in your created TypeScript file.
                    What you see are the tags of the respective fish. If these are not the fishes
                    you expected, please refer to the README.md file.
                  </Typography>
                </CustomTooltip>
              </Grid>
              <Grid item xs={12}>
                <FormControl>
                  <InputLabel>Select from imported fishes</InputLabel>
                  <Select
                    disabled={calculating}
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
            </Grid>
            <Grid item container sm={sm_size} md={md_size} xl={lg_size}>
              <Grid item xs={3}>
                <Typography variant="h4" component="h4" className="sub-header" gutterBottom>
                  Select tags:
                </Typography>
              </Grid>
              <Grid item xs={9}>
                <CustomTooltip>
                  <Typography>
                    This field can be used to override the tags defined by the selected fish. These
                    are the tags that define which events will be applied to the fish in order to
                    calculate the resulting state.
                  </Typography>
                </CustomTooltip>
              </Grid>
              <Grid item xs={2}>
                <Typography>Tags:</Typography>
              </Grid>
              <Grid item xs={10}>
                <TagsSelection
                  disabled={calculating}
                  error={!(earliestEventMicros && latestEventMicros)}
                  selectedTags={selectedTags}
                  onChange={setSelectedTags}
                />
              </Grid>
            </Grid>
            <Grid item container sm={sm_size} md={md_size} xl={lg_size}>
              <Grid item xs={3}>
                <Typography variant="h4" component="h4" className="sub-header" gutterBottom>
                  Select time limit: (disabled for now)
                </Typography>
              </Grid>
              <Grid item xs={9}>
                <CustomTooltip>
                  <Typography>
                    This field can be used to limit the events that can be selected. If a time value
                    is chosen, this means that only events that occurred before this timestamp will
                    be selectable at the &quot;Select Events&quot;-section.
                  </Typography>
                </CustomTooltip>
              </Grid>

              {earliestEventMicros && latestEventMicros && selectedTimeLimitMicros > 0 ? (
                <TimeSelectionPanel
                  selectedTimeLimitMicros={selectedTimeLimitMicros}
                  earliestEventMicros={earliestEventMicros}
                  latestEventMicros={latestEventMicros}
                  disabled={true /*isCalculating()*/}
                  allEventsSelected={selectAllEventsChecked}
                  onSelectAllEventsCheckedChanged={(checked) => {
                    if (!checked) {
                      setKeepUpWithNewEventsChecked(false)
                    }
                    setSelectAllEventsChecked(checked)
                  }}
                  onTimeChange={(time) => {
                    setSelectedTimeLimitMicros(time)
                  }}
                />
              ) : (
                <TagsAlert tagsStatus={'noMatchingEvents'} />
              )}
            </Grid>
            <Grid item container sm={sm_size} md={md_size} xl={lg_size}>
              <Grid item xs={3}>
                <Typography variant="h4" component="h4" className="sub-header" gutterBottom>
                  Select events:
                </Typography>
              </Grid>
              <Grid item xs={9}>
                <CustomTooltip>
                  <Typography>
                    These options allow to select which events specifically should be applied to the
                    fish. Each slider represents the events of a single event stream. The stream
                    name is composed of the ActyxOS node identifier and a stream-specific suffix.
                    The &quot;Sync&quot;-option ensures that all events by other sources that
                    happened prior to the selected event are also applied to the fish. This makes
                    sure that the calculated fish-state is consistent with the fish-state that
                    occurred in the real application when the event happened. The &quot;Keep up with
                    new events&quot;-option always selects all events and includes new events as
                    they arrive.
                  </Typography>
                </CustomTooltip>
              </Grid>
              <Grid item container xs={12}>
                {earliestEventMicros && latestEventMicros ? (
                  <div>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={keepUpWithNewEventsChecked}
                              onChange={(event) => {
                                if (event.target.checked) {
                                  setSelectAllEventsChecked(true)
                                }
                                setKeepUpWithNewEventsChecked(event.target.checked)
                              }}
                              disabled={calculating}
                              color="primary"
                            />
                          }
                          label={<Typography>Keep up with new events (live update)</Typography>}
                        />
                      </FormControl>
                    </Grid>

                    <Grid item container xs={12}>
                      <Card style={{ height: '22vh', overflowY: 'scroll' }}>
                        <CardContent>
                          {Object.entries(selectableEventsTaggedOffsets).map(([sid, events]) => {
                            const disabledBySyncLock =
                              !selectedSyncCheckboxesMap[sid] && syncChecked
                            const disabledByCalculatingLock = calculating
                            const disabled =
                              disabledByCalculatingLock ||
                              disabledBySyncLock ||
                              keepUpWithNewEventsChecked
                            return (
                              <SourceSlider
                                sid={sid}
                                numberOfSelectedEvents={selectedEventsOffsets[sid] + 1 || 0}
                                numberOfAllEvents={events + 1}
                                syncSelected={selectedSyncCheckboxesMap[sid] || false}
                                onEventsChanged={(events) => {
                                  if (selectedSyncCheckboxesMap[sid]) {
                                    setCalculatingSync(true)
                                    syncOffsetMapOnSource(
                                      sid,
                                      events - 1,
                                      selectableEventsTaggedOffsets,
                                      pond,
                                    ).then((value) => {
                                      setSelectedEventsOffsets(value)
                                      setCalculatingSync(false)
                                    })
                                  } else {
                                    setSelectedEventsOffsets(
                                      upsertOffsetMapValue(selectedEventsOffsets, sid, events - 1),
                                    )
                                  }
                                }}
                                onSyncCheckboxChanged={(checked) => {
                                  setSelectedSyncCheckbox({
                                    ...selectedSyncCheckboxesMap,
                                    [sid]: checked,
                                  })
                                  setSyncChecked(checked)
                                  if (checked) {
                                    syncOffsetMapOnSource(
                                      sid,
                                      selectedEventsOffsets[sid],
                                      selectableEventsTaggedOffsets,
                                      pond,
                                    ).then(setSelectedEventsOffsets)
                                  }
                                }}
                                disabled={disabled}
                                key={sid}
                              />
                            )
                          })}
                        </CardContent>
                      </Card>
                    </Grid>
                  </div>
                ) : (
                  <TagsAlert tagsStatus={'noMatchingEvents'} />
                )}
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        <Grid item container md={12} xs={12} spacing={4}>
          <Grid item xs={12}>
            <Typography variant="h3" component="h3" className="section-header" gutterBottom>
              Results:
            </Typography>
          </Grid>
          <Grid item container xs={12} style={paddingStyle} spacing={4}>
            <Grid item xs={12} md={4}>
              <EventPanel event={recentEvent} />
            </Grid>
            <Grid item xs={12} md={8}>
              <StatePanel currentState={currentFishState} previousState={previousFishState} />
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <Typography align="right" style={{ fontWeight: 'bold' }}>
            Actyx Pond Version:{' '}
            {dependencies['@actyx/pond']
              ? dependencies['@actyx/pond'].version
              : 'Error getting version'}
          </Typography>
        </Grid>
      </Grid>
    </div>
  )

  /**
   * Uses subscription procedures to get the timestamp of the earliest and latest
   * event that matches the currently selected tags and updates the respective application states
   * 'earliestEventMicros' and 'latestEventMicros'. Sets 'selectedTimeLimit' to the timestamp of the
   * earliest event if it is not set to a value > 0.
   * @returns a CancelSubscription function that should be called after the application state was altered.
   */
  function updateEventTimestampMicros(): CancelSubscription {
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
  }

  /**
   * Updates the offsets describing all events.
   * Should be called whenever new events have arrived in the pond.
   * (or repeatedly after time intervals)
   *
   */
  async function updateAllEventsOffsets() {
    await pond
      .events()
      .present()
      .then((newOffsets) => {
        setAllEventsOffsets(newOffsets)
      })
  }

  /**
   * Calculates a new state for the currently selected fish by reducing the state from the selected events.
   * Both the last and the second last calculated status are returned.
   * The events are queried from ActyxOS.
   * The last event that is applied while calculating the new state is set as the new displayed most recent event.
   */
  async function updateFishStatesAndRecentEvent() {
    setCalculatingFishState(true)
    const initialState = importedFishes[selectedFishIndex].initialState
    let fishStates = { previousState: {}, currentState: initialState }
    let lastAppliedEvent = {}

    await querySelectedEventsChunked(pond, selectedEventsOffsets, selectedTags, (events) => {
      fishStates = reduceTwinStateFromEvents(
        events,
        importedFishes[selectedFishIndex].onEvent,
        fishStates.currentState,
      )
      lastAppliedEvent = events[events.length - 1]
    })
    setPreviousFishState(fishStates.previousState)
    setCurrentFishState(fishStates.currentState)
    setRecentEvent(lastAppliedEvent)
    setCalculatingFishState(false)
  }

  /**
   * Update selectable events by restricting them to events that happened before selected time limit.
   */
  /* async function updateSelectableEvents() {
    setCalculatingOffsetLimits(true)
    if (!allEvents) return
    let newOffsets = {}
    if (selectAllEventsChecked) {
      newOffsets = allEvents
    } else {
      for (const [sid] of Object.entries(allEvents)) {
        const selectedOffset = await getLastEventOffsetBeforeTimestamp(
          allEvents,
          sid,
          selectedTimeLimitMicros,
          pond,
        )
        newOffsets = upsertOffsetMapValue(newOffsets, sid, selectedOffset)
      }
    }
    setTaggedOffsetsOfSelectableEvents(newOffsets)
    setCalculatingOffsetLimits(false)
  }*/

  /**
   * Determines the amount of selectable events for each source and updates
   * selectableEventsTaggedOffsets accordingly.
   * Must be called each time new events have entered the pond or the selected
   * tags have changed.
   */
  async function updateSelectableEventsTaggedOffsets() {
    let newOffsets = {}
    for (const [sid] of Object.entries(allEventsOffsets!)) {
      const countOfEventsMatchingTagsForSid = await getCountOfEventsMatchingTags(
        allEventsOffsets!,
        sid,
        tagsFromString(selectedTags),
        pond,
      )
      const taggedOffsetForSid = countOfEventsMatchingTagsForSid - 1
      //console.log(`updateTagged sid ${sid}, newOffset ${taggedOffsetForSid}`)
      newOffsets = upsertOffsetMapValue(newOffsets, sid, taggedOffsetForSid)
    }
    setSelectableEventsTaggedOffsets(newOffsets)
  }

  /**
   * Updates the selectedEventOffsets by transferring the tagged offsets
   * stored in selectedEventsTaggedOffsets into actual offsets.
   * Must be called each selectedEventsTaggedOffsets changes (when the
   * user has changed a slider value).
   */
  async function updateSelectedEventsOffsets() {
    let newOffsets = {}
    for (const [sid, events] of Object.entries(selectedEventsTaggedOffsets)) {
      console.log(
        `taggedOffsetsOfSelectedEvents inside updateSelectedOffsets ${JSON.stringify(
          selectedEventsTaggedOffsets,
        )}`,
      )
      const newOffsetForSid = await getOffsetByTaggedOffset(
        allEventsOffsets!,
        events,
        sid,
        tagsFromString(selectedTags),
        pond,
      )
      console.log(`updateSelected sid ${sid}, events ${events}, newOffset ${newOffsetForSid}`)
      newOffsets = upsertOffsetMapValue(newOffsets, sid, newOffsetForSid)
    }
    setSelectedEventsOffsets(newOffsets)
  }

  /**
   * Limits selected events by updating selectedEventsTaggedOffsets when the max selectable events value
   * (stored in selectableEventsTaggedOffsets) has become lower than selected events value.
   */
  /*
  function applyLimitOnSelectedEvents() {
    let newOffsets = {}
    for (const [sid, events] of Object.entries(taggedOffsetsOfSelectableEvents)) {
      if (taggedOffsetsOfSelectedEvents[sid] > events) {
        newOffsets = upsertOffsetMapValue(newOffsets, sid, events)
      } else {
        newOffsets = upsertOffsetMapValue(newOffsets, sid, taggedOffsetsOfSelectedEvents[sid])
      }
    }
    setSelectedEvents(newOffsets)
  }
  */
}
