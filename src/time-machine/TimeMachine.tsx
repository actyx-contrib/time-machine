import React, { useState } from 'react'
import { OffsetMap, Pond, Reduce, Tags } from '@actyx/pond'
import { usePond } from '@actyx-contrib/react-pond'
import { Client, Ordering, Subscription } from '@actyx/os-sdk'
import { Slider, Typography, TextField, Grid } from '@material-ui/core'

const defaultOnEvent = `(state, event, metadata) => {
  return state
}`

const actyx = Client()

export function TimeMachineComponent(): JSX.Element {
  const [tags, setTags] = React.useState('oven-fish:oven_1')
  const [initState, setInitState] = React.useState('{"id": 1}')
  const [onEventFunctionCode, setOnEventFunction] = React.useState(defaultOnEvent)

  const [upperBound, setUpperBound] = useState<OffsetMap>()
  const [startTimeMillis, setStartTimeMillis] = useState<number>()
  const [endTimeMillis, setEndTimeMillis] = useState<number>()
  const [currentTimeMillis, setCurrentTimeMillis] = useState<number>(0)
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
        console.log('First Entry: ' + metadata.lamport)
        setStartTimeMillis(metadata.timestampMicros / 1000)
      },
    )
    const cancelSubscriptionOnLatest = pond.events().observeLatest(
      {
        query: tagsFromString(tags),
      },
      (event, metadata) => {
        console.log('Last Entry: ' + metadata.lamport)
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
    getLastOffsetBeforeTimestamp(upperBound!, 1000, 'test')
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
            <Grid item container spacing={1} xs={12}>
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
            value={currentTimeMillis}
            min={startTimeMillis ? startTimeMillis : 0}
            max={endTimeMillis ? endTimeMillis : Date.now()}
            onChange={(event, value) => {
              setCurrentTimeMillis(+value)
            }}
            aria-labelledby="continuous-slider"
          />
        </Grid>
      </Grid>
    </div>
  )
}

async function getLastOffsetBeforeTimestamp(
  upperBound: OffsetMap,
  limitMillis: number,
  sid: string,
): Promise<number> {
  const subscription = await actyx.eventService.queryStream({
    // Define an upper bound for the query
    upperBound: upperBound,

    // Order the events using their lamport timestamp
    ordering: Ordering.Lamport,

    // Define a subscription to all events in all event streams
    subscriptions: Subscription.everything(),
  })

  console.log(subscription)
  console.log('executed')
  for await (const event of subscription) {
    console.log(event.timestamp + limitMillis * 1000)
    if (event.timestamp > limitMillis * 1000) {
      return event.offset - 1
    }
  }
  return upperBound[sid]
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
