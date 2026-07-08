import takbeerGif from '../../../assets/trainnee-gif/takber.gif';
import rukuGif from '../../../assets/trainnee-gif/rukou3.gif';
import iqamaGif from '../../../assets/trainnee-gif/qiam-from-rukou3.gif';
import sujoodGif from '../../../assets/trainnee-gif/sujoud.gif';
import juloosGif from '../../../assets/trainnee-gif/glous-ben-sjdatien.gif';
import tashahhudGif from '../../../assets/trainnee-gif/tashahhud-akheer.gif';
import qiyamFromJuloosGif from '../../../assets/trainnee-gif/qiam-from-glous.gif';
import qiyamFromSujoodGif from '../../../assets/trainnee-gif/qiam-from-sojoud.gif';

/**
 * A teacher-demo GIF keyed by what the movement actually shows. Qiyam and
 * tashahhud aren't a single clip: rising differs depending on where the learner
 * is coming from, and the middle tashahhud has no clip of its own so it reuses
 * the sitting-between-prostrations one.
 */
export type GifKey =
  | 'takbeer'
  | 'ruku'
  | 'iqama'
  | 'sujood'
  | 'juloos'
  | 'tashahhud'
  | 'qiyamFromJuloos'
  | 'qiyamFromSujood';

export const POSE_GIFS: Record<GifKey, string> = {
  takbeer: takbeerGif,
  ruku: rukuGif,
  iqama: iqamaGif,
  sujood: sujoodGif,
  juloos: juloosGif,
  tashahhud: tashahhudGif,
  qiyamFromJuloos: qiyamFromJuloosGif,
  qiyamFromSujood: qiyamFromSujoodGif,
};
