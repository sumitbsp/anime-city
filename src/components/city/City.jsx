import Buildings from './Buildings.jsx'
import Pedestrians from './Pedestrians.jsx'
import Steam from './Steam.jsx'
import StreetProps from './StreetProps.jsx'
import Streets from './Streets.jsx'
import Traffic from './Traffic.jsx'

// The fictional anime city. Sky, lighting and effects are shared and live in App.
export default function City() {
  return (
    <>
      <Streets />
      <Buildings />
      <StreetProps />
      <Traffic />
      <Pedestrians />
      <Steam />
    </>
  )
}
