import { Composition } from "remotion"
import { Demo, type DemoProps } from "./Demo"
import { FPS, TOTAL_SECONDS } from "./captions"

export const Root: React.FC = () => (
  <Composition
    id="NearQueryDemo"
    component={Demo}
    width={1920}
    height={1080}
    fps={FPS}
    durationInFrames={TOTAL_SECONDS * FPS}
    defaultProps={{ captions: true, numbers: {}, marks: {}, speed: 5, tokens: { light: {}, dark: {} }, captionList: [], repoUrl: "" } satisfies DemoProps}
  />
)
