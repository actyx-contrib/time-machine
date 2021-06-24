import { Slider, Typography, Grid, Checkbox, IconButton } from '@material-ui/core'
import { ArrowBack, ArrowForward } from '@material-ui/icons'
import React, { useState } from 'react'

type SourceSliderProps = {
  sid: string
  numberOfSelectedEvents: number
  numberOfAllEvents: number
  disabled: boolean
  syncSelected: boolean
  onEventsChanged: (events: number) => void
  onSyncCheckboxChanged: (checked: boolean) => void
}

export function SourceSlider({
  sid,
  numberOfSelectedEvents,
  numberOfAllEvents,
  disabled,
  onEventsChanged,
  onSyncCheckboxChanged,
  syncSelected,
}: SourceSliderProps): JSX.Element {
  const [sliderValue, setSliderValue] = useState<number>(numberOfSelectedEvents)

  React.useEffect(() => {
    setSliderValue(numberOfSelectedEvents)
  }, [numberOfSelectedEvents])

  return (
    <Grid key={sid} container spacing={1}>
      <Grid item xs={2}>
        <Typography>
          {sid} <br />({sliderValue}/{numberOfAllEvents})
        </Typography>
      </Grid>
      <Grid item xs={5}>
        <Slider
          style={{ maxWidth: 350 }}
          value={sliderValue}
          min={0}
          max={numberOfAllEvents}
          disabled={disabled}
          onChange={(_event, value) => {
            setSliderValue(+value)
          }}
          onChangeCommitted={(_event, value) => {
            onEventsChanged(+value)
          }}
          aria-labelledby="continuous-slider"
        />
      </Grid>

      <Grid item xs={1}>
        <IconButton
          disabled={disabled}
          onClick={() => {
            onEventButtonPressed('decrease')
          }}
        >
          <ArrowBack color={disabled ? undefined : 'primary'} />
        </IconButton>
      </Grid>
      <Grid item xs={1}>
        <IconButton
          disabled={disabled}
          onClick={() => {
            onEventButtonPressed('increase')
          }}
        >
          <ArrowForward color={disabled ? undefined : 'primary'} />
        </IconButton>
      </Grid>
      <Grid item container xs={1}>
        <Grid item xs={6}>
          <Typography>Sync</Typography>
        </Grid>
        <Grid item xs={6}>
          <Checkbox
            checked={syncSelected}
            onChange={(event) => {
              onSyncCheckboxChanged(event.target.checked)
            }}
            disabled={disabled}
            color="primary"
            inputProps={{ 'aria-label': 'primary checkbox' }}
          />
        </Grid>
      </Grid>
    </Grid>
  )

  type ButtonType = 'increase' | 'decrease'

  function onEventButtonPressed(buttonType: ButtonType): void {
    const newNumberOfSelectedEvents =
      buttonType === 'increase' ? numberOfSelectedEvents + 1 : numberOfSelectedEvents - 1
    if (newNumberOfSelectedEvents >= 0 && newNumberOfSelectedEvents <= numberOfAllEvents) {
      onEventsChanged(newNumberOfSelectedEvents)
    }
  }
}
