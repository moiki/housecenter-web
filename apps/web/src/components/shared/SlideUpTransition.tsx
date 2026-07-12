import { forwardRef, type ReactElement, type Ref } from 'react'
import Slide from '@mui/material/Slide'
import type { TransitionProps } from '@mui/material/transitions'

// Shared slide-up transition for the fullscreen/confirm dialogs (mirrors the legacy
// slide-up modals). Passed to MUI Dialog via slots={{ transition: SlideUpTransition }}.
export const SlideUpTransition = forwardRef(function SlideUpTransition(
  props: TransitionProps & { children: ReactElement },
  ref: Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />
})
