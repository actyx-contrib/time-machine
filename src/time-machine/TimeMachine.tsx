import React, { useState } from 'react'
import { OffsetMap, Pond, Reduce, Tags } from '@actyx/pond'
import { usePond } from '@actyx-contrib/react-pond'

const defaultOnEvent = `(state, event, metadata) => {
  return state
}`

export const TimeMachine = (): JSX.Element => {
  const [tags, setTags] = React.useState('oven-fish:oven_1')
  const [initState, setInitState] = React.useState('{"id": 1}')
  const [onEventFunctionCode, setOnEventFunction] = React.useState(defaultOnEvent)

  const [upperBound, setUpperBound] = useState<OffsetMap>()
  const [startTime, setStartTime] = useState<number>()
  const [endTime, setEndTime] = useState<number>()
  const [currentTime, setCurrentTime] = useState<number>(endTime ? endTime : Date.now())
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

  //Update Timespan for Slider each time the tags are changed
  React.useEffect(() => {
    if (!upperBound) {
      return
    }
    const sidsWithOffsetsSetTo1 = sidsWithOffset1(upperBound)
    getEarliestEventMicros(pond, sidsWithOffsetsSetTo1, tags).then((earliestEventMicros) =>
      setStartTime(earliestEventMicros),
    )
    getLatestEventMicros(pond, sidsWithOffsetsSetTo1, tags).then((lastestEventMicros) =>
      setEndTime(lastestEventMicros),
    )
  }, [tags, upperBound])

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

  if (!upperBound) {
    return <div>loading...</div>
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
                  onChange={({ target }) =>
                    addSourceToOffsetMap(
                      setSelectedEventOffsetMap,
                      selectedEventOffsetMap,
                      sid,
                      target,
                    )
                  }
                />
              </div>
            </div>
          )
        })}
      </div>

      <div>
        <div style={{ display: 'flex' }}>
          <span style={{ width: 170 }}>Time Machine {new Date(currentTime).toLocaleString()}</span>
          <div className="slidecontainer">
            <input
              style={{ width: 350 }}
              type="range"
              min={startTime ? startTime / 1000 : 0}
              max={endTime ? endTime / 1000 : Date.now()}
              value={currentTime}
              className="slider"
              id="myRange"
              onChange={({ target }) => setCurrentTime(+target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  )
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

function addSourceToOffsetMap(
  setSelectedEventOffsetMap: React.Dispatch<React.SetStateAction<{ readonly [x: string]: number }>>,
  selectedEventOffsetMap: { readonly [x: string]: number },
  sid: string,
  target: EventTarget & HTMLInputElement,
): void {
  return setSelectedEventOffsetMap({
    ...selectedEventOffsetMap,
    [sid]: +target.value,
  })
}

function sidsWithOffset1(upperBound: { readonly [x: string]: number }) {
  return Object.entries(upperBound).reduce((previous, [sid]) => ({ ...previous, [sid]: 1 }), {})
}

function getEarliestEventMicros(
  pond: Pond,
  offsets: {
    readonly [x: string]: number
  },
  tags: string,
): Promise<number> {
  return pond
    .events()
    .queryKnownRange({
      upperBound: offsets,
      order: 'Asc',
      query: tagsFromString(tags),
    })
    .then((events) =>
      events.reduce((previous, current) =>
        current.meta.timestampMicros < previous.meta.timestampMicros ? current : previous,
      ),
    )
    .then((earliestEvent) => earliestEvent.meta.timestampMicros)
}

function getLatestEventMicros(
  pond: Pond,
  offsets: {
    readonly [x: string]: number
  },
  tags: string,
): Promise<number> {
  return pond
    .events()
    .queryKnownRange({
      upperBound: offsets,
      order: 'Desc',
      query: tagsFromString(tags),
    })
    .then((events) =>
      events.reduce((previous, current) =>
        current.meta.timestampMicros > previous.meta.timestampMicros ? current : previous,
      ),
    )
    .then((latestEvent) => latestEvent.meta.timestampMicros)
}

function tagsFromString(tags: string) {
  try {
    return Tags(...(tags || 'unknown').split(' '))
  } catch (exception) {
    return Tags('unknown')
  }
}
