import React, { useState } from 'react'
import { Grid, Typography, Slider } from '@material-ui/core'
import DateFnsUtils from '@date-io/date-fns'
import { MuiPickersUtilsProvider, KeyboardDateTimePicker } from '@material-ui/pickers'

type TimeSelectionPanelProps = {
  selectedTimeLimitMicros: number
  earliestEventMicros: number
  latestEventMicros: number
  onTimeChange: (time: number) => void
}

export function TimeSelectionPanel({
  selectedTimeLimitMicros,
  earliestEventMicros,
  latestEventMicros,
  onTimeChange,
}: TimeSelectionPanelProps): JSX.Element {
  const [timeSliderValue, setTimeSliderValue] = useState<number>(selectedTimeLimitMicros)

  return (
    <div>
      <Grid item xs={2}>
        <Typography>Event Time Limit:</Typography>
      </Grid>
      <Grid item xs={10}>
        <Slider
          style={{ maxWidth: 350 }}
          value={timeSliderValue}
          min={earliestEventMicros}
          max={latestEventMicros + 1}
          disabled={!earliestEventMicros || !latestEventMicros}
          onChange={(_event, value) => {
            setTimeSliderValue(+value)
          }}
          onChangeCommitted={(_event, value) => {
            onTimeChange(+value)
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
            value={microsToMillis(selectedTimeLimitMicros)}
            disabled={!earliestEventMicros || !latestEventMicros}
            onChange={(date) => {
              if (date) {
                const dateMicros = dateToMicros(date)
                onTimeChange(dateMicros)
                setTimeSliderValue(dateMicros)
              }
            }}
            format="yyyy/MM/dd HH:mm:ss"
          />
        </MuiPickersUtilsProvider>
      </Grid>
    </div>
  )
}

function dateToMicros(date: Date): number {
  return date.getTime() * 1000
}

function microsToMillis(micros: number): number {
  return micros / 1000
}
