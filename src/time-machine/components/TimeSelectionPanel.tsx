import React, { useState } from 'react'
import {
  Grid,
  Slider,
  Checkbox,
  Typography,
  FormControl,
  FormControlLabel,
} from '@material-ui/core'
import DateFnsUtils from '@date-io/date-fns'
import { MuiPickersUtilsProvider, KeyboardDateTimePicker } from '@material-ui/pickers'

type TimeSelectionPanelProps = {
  selectedTimeLimitMicros: number
  earliestEventMicros: number
  latestEventMicros: number
  allEventsSelected: boolean
  onSelectAllEventsCheckedChanged: (value: boolean) => void
  disabled: boolean
  onTimeChange: (time: number) => void
}

export function TimeSelectionPanel({
  selectedTimeLimitMicros,
  earliestEventMicros,
  latestEventMicros,
  allEventsSelected,
  onSelectAllEventsCheckedChanged,
  disabled,
  onTimeChange,
}: TimeSelectionPanelProps): JSX.Element {
  const [timeSliderValueMicros, setTimeSliderValueMicros] =
    useState<number>(selectedTimeLimitMicros)
  const [timePickerValueMicros, setTimePickerValueMicros] =
    useState<number>(selectedTimeLimitMicros)

  return (
    <Grid item container xs={12} spacing={2}>
      <Grid item container xs={12}>
        <FormControl fullWidth>
          <FormControlLabel
            control={
              <Checkbox
                checked={allEventsSelected}
                onChange={(event) => {
                  onSelectAllEventsCheckedChanged(event.target.checked)
                }}
                disabled={disabled}
                color="primary"
              />
            }
            label={<Typography>Select all events (no time limit)</Typography>}
          />
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <Slider
          style={{ maxWidth: 350 }}
          value={timeSliderValueMicros}
          min={earliestEventMicros}
          max={latestEventMicros + 1}
          disabled={disabled || allEventsSelected}
          onChange={(_event, value) => {
            setTimeSliderValueMicros(+value)
          }}
          onChangeCommitted={(_event, value) => {
            setTimePickerValueMicros(+value)
            onTimeChange(+value)
          }}
          aria-labelledby="continuous-slider"
        />
      </Grid>
      <Grid item container xs={12}>
        <Grid item>
          <MuiPickersUtilsProvider utils={DateFnsUtils}>
            <KeyboardDateTimePicker
              variant="inline"
              ampm={false}
              label="Include events up to:"
              value={microsToMillis(timePickerValueMicros)}
              disabled={disabled || allEventsSelected}
              autoOk={true}
              // eslint-disable-next-line @typescript-eslint/no-empty-function
              onChange={() => {}}
              onAccept={(date) => {
                if (date) {
                  const dateMicros = dateToMicros(date)
                  setTimePickerValueMicros(dateMicros)
                }
              }}
              onClose={() => {
                setTimeSliderValueMicros(timePickerValueMicros)
                onTimeChange(timePickerValueMicros)
              }}
              format="yyyy/MM/dd HH:mm:ss"
            />
          </MuiPickersUtilsProvider>
        </Grid>
      </Grid>
    </Grid>
  )
}

function dateToMicros(date: Date): number {
  return date.getTime() * 1000
}

function microsToMillis(micros: number): number {
  return micros / 1000
}
