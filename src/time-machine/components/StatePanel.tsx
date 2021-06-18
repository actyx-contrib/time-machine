import { Card, CardContent, Typography } from '@material-ui/core'
import { DiffEditor } from '@monaco-editor/react'
import React from 'react'

type StatePanelProps = {
  currentState: { [p: string]: unknown }
  previousState: { [p: string]: unknown }
}

export function StatePanel({ currentState, previousState }: StatePanelProps): JSX.Element {
  const exampleJSON = {
    quiz: {
      sport: {
        q1: {
          question: 'Which one is correct team name in NBA?',
          options: [
            'New York Bulls',
            'Los Angeles Kings',
            'Golden State Warriros',
            'Huston Rocket',
          ],
          answer: 'Huston Rocket',
        },
      },
      maths: {
        q1: {
          question: '5 + 7 = ?',
          options: ['10', '11', '12', '13'],
          answer: '12',
        },
        q2: {
          question: '12 - 8 = ?',
          options: ['1', '2', '3', '4'],
          answer: '4',
        },
      },
    },
  }
  return (
    <div>
      <Typography variant="h4" component="h4" className="sub-header" gutterBottom>
        Resulting Fish-State:
      </Typography>
      <Card>
        <CardContent>
          <DiffEditor
            height="45vh"
            options={{ readOnly: true }}
            original={JSON.stringify(previousState, null, 2)}
            modified={JSON.stringify(currentState, null, 2)}
            language="JSON"
          />
        </CardContent>
      </Card>
    </div>
  )
}
