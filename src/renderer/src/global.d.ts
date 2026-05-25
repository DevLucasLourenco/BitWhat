import type { BitWhatApi } from '../../shared/api'

declare global {
  interface Window {
    bitWhat: BitWhatApi
  }
}

export {}
