import {
  Slider,
  Typography,
  Grid,
  Checkbox,
  IconButton,
  FormControl,
  FormControlLabel,
} from '@material-ui/core'
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
    <Grid key={sid} container spacing={1} data-testid="source-slider-container">
      <Grid item xs={9}>
        <FormControl fullWidth>
          <FormControlLabel
            labelPlacement="start"
            control={
              <Slider
                style={{ maxWidth: 350, minWidth: 100 }}
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
            }
            label={
              <Typography>
                {sid} <br />
                {`(${sliderValue}/${numberOfAllEvents})`}
              </Typography>
            }
          />
        </FormControl>
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
        <Grid item>
          <FormControl fullWidth>
            <FormControlLabel
              control={
                <Checkbox
                  title="Sync"
                  checked={syncSelected}
                  onChange={(event) => {
                    onSyncCheckboxChanged(event.target.checked)
                  }}
                  disabled={true /*disabled*/} //TODO: Reenable when ready
                  color="primary"
                  inputProps={{ 'aria-label': 'primary checkbox' }}
                />
              }
              label={<Typography>Sync</Typography>}
            />
          </FormControl>
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
