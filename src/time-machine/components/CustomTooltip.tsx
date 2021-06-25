import { IconButton, Tooltip, withStyles } from '@material-ui/core'
import HelpIcon from '@material-ui/icons/Help'
import React from 'react'
import PropTypes from 'prop-types'

const HtmlTooltip = withStyles((theme) => ({
  tooltip: {
    backgroundColor: '#f5f5f9',
    color: 'rgba(0, 0, 0, 0.87)',
    maxWidth: 500,
    fontSize: theme.typography.pxToRem(12),
    border: '1px solid #dadde9',
    paddingBottom: '20px',
    paddingTop: '0px',
  },
}))(Tooltip)

export function CustomTooltip({ children }): JSX.Element {
  return (
    <HtmlTooltip
      title={<React.Fragment>{children}</React.Fragment>}
      style={{ paddingBottom: '20px', paddingTop: '0px' }}
    >
      <IconButton>
        <HelpIcon />
      </IconButton>
    </HtmlTooltip>
  )
}

CustomTooltip.propTypes = {
  children: PropTypes.node,
}
