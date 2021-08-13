import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  TextField,
} from '@material-ui/core'
import React, { useState } from 'react'

type TagsSelectionProps = {
  disabled: boolean
  error: boolean
  selectedTags: string
  onChange: (tags: string) => void
}

export function TagsSelection({
  disabled,
  error,
  selectedTags,
  onChange,
}: TagsSelectionProps): JSX.Element {
  const [tagsTextfieldValue, setTagsTextfieldValue] = useState<string>(selectedTags)

  React.useEffect(() => {
    setTagsTextfieldValue(selectedTags)
  }, [selectedTags])

  const [changeDialogVisible, setChangeDialogVisible] = React.useState(false)

  const handleApply = () => {
    onChange(tagsTextfieldValue)
    setChangeDialogVisible(false)
  }

  const handleCancel = () => {
    setTagsTextfieldValue(selectedTags)
    setChangeDialogVisible(false)
  }

  return (
    <Grid item spacing={2} container>
      <Grid item xs={7}>
        <TextField
          InputProps={{
            readOnly: true,
          }}
          disabled={disabled}
          error={error}
          value={selectedTags}
          type="text"
          fullWidth={true}
        />
      </Grid>
      <Grid item xs={1}>
        <Button
          disabled={disabled}
          variant="contained"
          color="primary"
          size="small"
          onClick={() => {
            setChangeDialogVisible(true)
          }}
        >
          Edit
        </Button>
        <Dialog
          open={changeDialogVisible}
          onClose={handleCancel}
          aria-labelledby="form-dialog-title"
        >
          <DialogTitle id="form-dialog-title">Select tags</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Only events which match <b>all</b> entered tags will be available for selection.
              Multiple tags can be entered separated by whitespace.
            </DialogContentText>
            <TextField
              InputProps={{}}
              multiline
              autoFocus
              margin="dense"
              id="tags-selection"
              fullWidth
              value={tagsTextfieldValue}
              onChange={({ target }) => {
                setTagsTextfieldValue(target.value)
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancel} color="primary">
              Cancel
            </Button>
            <Button onClick={handleApply} color="primary">
              Apply
            </Button>
          </DialogActions>
        </Dialog>
      </Grid>
    </Grid>
  )
}
