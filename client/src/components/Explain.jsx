import { useSettings } from '../settings.js';

// Shows the English and/or Romanized Hindi explanation depending on the language setting.
export default function Explain({ en, hi, enLabel = 'English', hiLabel = 'Romanized Hindi' }) {
  const { settings } = useSettings();
  const showEn = settings.language !== 'hi';
  const showHi = settings.language !== 'en';
  return (
    <div className="explain">
      {showEn && en && <div><span className="tag mono">{enLabel}</span><p>{en}</p></div>}
      {showHi && hi && <div><span className="tag tag-hi mono">{hiLabel}</span><p lang="hi-Latn">{hi}</p></div>}
    </div>
  );
}
