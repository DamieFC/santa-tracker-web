import {html, LitElement} from 'lit-element';

export class ReindeerWranglerElement extends LitElement {
  render() {
    return html`
    <style>${_style`wrangler`}</style>
    <div id="holder">
      <div id="wrangler">
        <div></div>
        <div></div>
        <div></div>
      </div>
      <div id="reindeer1">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
      <div id="reindeer2">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
    `;
  }
}

customElements.define('reindeer-wrangler', ReindeerWranglerElement);
