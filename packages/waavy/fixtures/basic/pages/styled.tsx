/**
 * Page importing CSS: proves CSS is bundled, recorded in the manifest, and
 * linked from the document.
 */

import './styled.css';

export default function Styled() {
  return <h1 id="styled">Styled</h1>;
}
