import { Config } from '@remotion/cli/config'

// Rendu H.264 (lisible partout, y compris WhatsApp)
Config.setVideoImageFormat('jpeg')
Config.setCodec('h264')
Config.setEntryPoint('src/index.ts')
