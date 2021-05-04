import React, { useState } from 'react'
import { OffsetMap, Pond, Reduce, Tags } from '@actyx/pond'
import { usePond } from '@actyx-contrib/react-pond'

const defaultOnEvent = `(state, event, metadata) => {
  return state
}`

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

  /*React.useEffect(() => {
    if (!upperBound) return
    delimitSelectedOffsetsByTimestamp(currentTimeMillis, upperBound, pond)
  }, [currentTimeMillis])
  */

  if (!upperBound || !startTimeMillis || !endTimeMillis) {
    return <div>loading...</div>
  }

  if (!currentTimeMillis) {
    setCurrentTimeMillis(endTimeMillis)
  }

  return (
    <div>
      <div style={{ flex: 1 }}>
        <h1>Actyx Time Machine</h1>
      </div>
      <div style={{ flex: 1 }}>
        <div>
          <div>
            <span>Where:</span>
            <input
              style={{ width: 350 }}
              value={tags}
              type="text"
              onChange={({ target }) => setTags(target.value)}
            />
          </div>
          <div>
            <span>Initial State:</span>
            <textarea
              style={{ width: 350 }}
              value={initState}
              onChange={({ target }) => setInitState(target.value)}
            />
          </div>
          <div>
            <span>onEvent function:</span>
            <textarea
              style={{ width: 350 }}
              value={onEventFunctionCode}
              onChange={({ target }) => setOnEventFunction(target.value)}
            />
          </div>
        </div>
        <div>fishState: {JSON.stringify(twinState)}</div>
      </div>
      <div>
        {Object.entries(upperBound).map(([sid, events]) => {
          const value = selectedEventOffsetMap[sid] || 0
          return (
            <div key={sid} style={{ display: 'flex' }}>
              <span style={{ width: 170 }}>
                {sid} ({value}/{events})
              </span>
              <div className="slidecontainer">
                <input
                  style={{ width: 350 }}
                  type="range"
                  min={0}
                  max={events}
                  value={value}
                  className="slider"
                  id="myRange"
                  onChange={({ target }) => {
                    setSelectedEventOffsetMap(
                      addValueToOffsetMap(selectedEventOffsetMap, sid, +target.value),
                    )
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div>
        <div style={{ display: 'flex' }}>
          <span style={{ width: 170 }}>
            Time Machine {new Date(currentTimeMillis).toLocaleString()}
          </span>
          <div className="slidecontainer">
            <input
              style={{ width: 350 }}
              type="range"
              min={startTimeMillis ? startTimeMillis : 0}
              max={endTimeMillis ? endTimeMillis : Date.now()}
              value={currentTimeMillis}
              className="slider"
              id="myRange"
              onChange={({ target }) => setCurrentTimeMillis(+target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  )

  /*function delimitSelectedOffsetsByTimestamp(
    limitMillis: number,
    offsets: OffsetMap,
    pond: Pond,
  ): void {
    Object.entries(offsets).forEach(([sid, events]) => {
      let limitFound = false
      pond
        .events()
        .queryKnownRangeChunked(
          { upperBound: addValueToOffsetMap({}, sid, events) },
          1,
          (chunk) => {
            if (chunk.events[0].meta.timestampMicros >= limitMillis * 1000 && !limitFound) {
              if (sid === 'Q2bgpSgX3yq') {
                console.log(chunk)
              }
              const offsetOfCurrentEvent = chunk.lowerBound[sid] || -1

              setSelectedEventOffsetMap(
                addValueToOffsetMap(selectedEventOffsetMap, sid, offsetOfCurrentEvent),
              )
              limitFound = true
            } else {
              if (sid === 'Q2bgpSgX3yq') {
                console.log(
                  'SID: ' +
                    sid +
                    ' Limit:' +
                    limitMillis * 1000 +
                    ' Timestamp ' +
                    chunk.events[0].meta.timestampMicros +
                    'Offset: ' +
                    chunk.upperBound[sid] +
                    ' Found: ' +
                    limitFound +
                    ' Condition ' +
                    (chunk.events[0].meta.timestampMicros >= limitMillis * 1000),
                )
              }
            }
          },
        )
      if (!limitFound) {
        setSelectedEventOffsetMap(
          addValueToOffsetMap(selectedEventOffsetMap, sid, upperBound![sid]),
        )
      }
    })
  }
  */
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
