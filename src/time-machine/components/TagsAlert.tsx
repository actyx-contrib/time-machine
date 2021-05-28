import { Alert, Color } from '@material-ui/lab'
import React from 'react'

type TagsAlertProps = {
  tagsStatus: TagsStatus
}

type TagsStatus = 'invalidTags' | 'noMatchingEvents'

export function TagsAlert({ tagsStatus }: TagsAlertProps): JSX.Element {
  let severity: Color
  let alertText: string
  switch (tagsStatus) {
    case 'invalidTags':
      severity = 'warning'
      alertText = 'Your tags are invalid. Please change your tags!'
      break
    case 'noMatchingEvents':
      severity = 'warning'
      alertText = 'No events match your tags. Please change your tags!'
  }

  return <Alert severity={severity}>{alertText}</Alert>
}
