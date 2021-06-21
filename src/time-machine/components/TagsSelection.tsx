import { Button, Grid, TextField } from '@material-ui/core'
import React, { useState } from 'react'

type TagsSelectionProps = {
  error: boolean
  selectedTags: string
  onChange: (tags: string) => void
}

export function TagsSelection({ error, selectedTags, onChange }: TagsSelectionProps): JSX.Element {
  const [tagsTextfieldValue, setTagsTextfieldValue] = useState<string>(selectedTags)

  React.useEffect(() => {
    setTagsTextfieldValue(selectedTags)
  }, [selectedTags])

  return (
    <Grid item spacing={2} container>
      <Grid item xs={7}>
        <TextField
          error={error}
          value={tagsTextfieldValue}
          type="text"
          fullWidth={true}
          onChange={({ target }) => {
            setTagsTextfieldValue(target.value)
          }}
        />
      </Grid>
      <Grid item xs={1}>
        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={() => {
            onChange(tagsTextfieldValue)
          }}
        >
          Apply
        </Button>
      </Grid>
    </Grid>
  )
}
