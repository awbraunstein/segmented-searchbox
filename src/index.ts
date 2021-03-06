interface LookupValue {
  color: string;
  data: string;
  ignoreCase: boolean;
}

interface ReverseLookupValue {
  color: string;
  text: string;
}

class Searchbox {

  private _el: HTMLInputElement;

  private _lookup: { [text: string]: LookupValue; } = {};

  // This is the container that will contain our searchbox.
  private _container!: HTMLElement;
  // This is the searchbox that the user will actually interact with.
  private _sb!: HTMLElement;
  // This is the dropdown that will show the possible values the user can input.
  private _dropDown!: HTMLElement;

  // The current focus in the dropdown. -1 indicates that there is no focus.
  private _currentFocus = -1;

  // Validates the config and updates any optional fields with their default
  // values. Returns false if the config isn't valid.
  private validateConfig(config: SearchboxConfig): boolean {
    let seenTextValues: { [text: string]: boolean; } = {};
    for (let kind of config.valueKinds) {
      if (kind.ignoreCase === undefined) {
        kind.ignoreCase = true;
      }
      for (let value of kind.values) {
        if (value.text === undefined) {
          value.text = value.data;
        }
        // If we have already seen this value, then the config is invalid.
        if (seenTextValues[value.text]) {
          return false;
        }
        seenTextValues[value.text] = true;
      }
    }
    return true;
  }

  private getCurrentSbText(): string {
    for (let i = 0; i < this._sb.childNodes.length; i++) {
      let node = this._sb.childNodes[i];
      // If the node is a textnode, then return the value.
      if (node.nodeType === 3) {
        return node.textContent || '';
      }
    }
    // If we didn't find one, then return the empty string.
    return '';
  }

  private updateInputValue() {
    let vals: Array<string> = [];
    let spans = this._sb.getElementsByTagName('span');
    for (let i = 0; i < spans.length; i++) {
      let val = spans[i].dataset['value']
      if (val) {
        vals.push(val);
      }
    }
    this._el.value = vals.join(' ');
  }

  // If there is no content at the end of the searchbox, we can end up with the
  // caret outside of the box, which looks very weird. This method makes sure
  // that there is a text node at the end of the searchbox with a nbsp in it. If
  // there is no text at all, it works fine though.
  private ensureSbHasContent() {
    let len = this._sb.childNodes.length;
    if (len != 0 && this._sb.childNodes[len - 1].nodeType != 3) {
      // String.fromCharCode(160) gets around a bug where webpack/ts-loader
      // messes with the nbsp literal.
      let node = document.createTextNode(String.fromCharCode(160));
      this._sb.appendChild(node);
      this._sb.focus()
      document.getSelection()!.collapse(node, 1);
    }
  }

  private createSpanForSb(text: string, color: string, value: string):
    HTMLSpanElement {
    var span = document.createElement('span');
    span.classList.add('segmented-searchbox-valid-item')
    span.textContent = text;
    span.style.backgroundColor = color;
    span.dataset['value'] = value;
    span.contentEditable = 'false';
    return span;
  }

  // Inserts a valid value into the searchbox. This makes that value uneditable
  // and colors it appropriately.
  private insertValueIntoSb(el: HTMLElement) {
    for (let i = 0; i < this._sb.childNodes.length; i++) {
      let node = this._sb.childNodes[i];
      // If the node is a textnode, then we should replace it.
      if (node.nodeType === 3) {
        var replacement = this.createSpanForSb(el.dataset['text'] || '',
          el.dataset['color'] || '',
          el.dataset['value'] || '');
        node.parentNode!.insertBefore(replacement, node);
        node.parentNode!.removeChild(node);
        this.ensureSbHasContent();
        this.updateInputValue();
        return;
      }
    }
  }

  // If a node that isn't the last node is the value, return false.
  private isInputValueAtEnd(): boolean {
    for (let i = 0; i < this._sb.childNodes.length - 1; i++) {
      if (this._sb.childNodes[i].nodeType === 3) {
        return false;
      }
    }
    return true;
  }

  private onInput(_: Event) {
    let val = this.getCurrentSbText();
    // If the user hit delete when in the sentinel textnode, we would end up
    // with and empty text node. In this case we should remove the last child
    // that's a span, if there is one and then call ensureSbHasContent().
    if (this.isInputValueAtEnd() && !val) {
      for (let i = this._sb.childNodes.length - 1; i >= 0; i--) {
        let node = this._sb.childNodes[i];
        if (node.nodeName == 'SPAN') {
          node.parentNode!.removeChild(node);
          break;
        }
      }
      this.ensureSbHasContent();
    }
    this.updateInputValue();
    // Close any already open lists of autocompleted values.
    this.closeList();
    // If the val is the empty string, then we have nothing to do.
    if (!val) {
      return false;
    }

    // Everytime the user enters new text, we should reset the focus.
    this._currentFocus = -1;
    // Check to see which values match the current text value.
    for (let possibleValue in this._lookup) {
      let ourValue = val.trim();
      let matchValue = possibleValue;
      if (this._lookup[possibleValue].ignoreCase) {
        ourValue = ourValue.toLowerCase();
        matchValue = matchValue.toLowerCase();
      }
      if (ourValue && matchValue.indexOf(ourValue) > -1) {
        // Create a div for each match.
        let entry = document.createElement("div");
        /*make the matching letters bold:*/
        entry.dataset['text'] = possibleValue;
        entry.dataset['value'] = this._lookup[possibleValue].data;
        entry.dataset['color'] = this._lookup[possibleValue].color;
        entry.innerText = possibleValue;
        let that = this;
        entry.addEventListener("click", function(_) {
          // insert the value for the autocomplete text field:
          that.insertValueIntoSb(entry);
          that.closeList();
          that._sb.focus();
        });
        this._dropDown.appendChild(entry);
      }
    }
    this._dropDown.hidden = false;
  }

  private onKeydown(e: KeyboardEvent) {
    let entries = this._dropDown.getElementsByTagName("div");
    // If there are no entries, then don't do anything unless the event was
    // enter. Then we should submit the form.
    if (!entries.length) {
      if (e.keyCode == 13) { // ENTER
        e.preventDefault()
        let parentForm = this._el.closest('form');
        if (parentForm) {
          parentForm.submit();
        }
      }
      return;
    }
    if (e.keyCode == 40) { // DOWN
      this._currentFocus++;
      this.setActive(entries);
    } else if (e.keyCode == 38) { // UP
      this._currentFocus--;
      this.setActive(entries);
    } else if (e.keyCode == 13) { // ENTER
      e.preventDefault();
      if (this._currentFocus > -1) {
        entries[this._currentFocus].click();
      } else {
        entries[0].click();
      }
      if (entries.length == 1) {
        entries[0].click();
      }
    }
  }

  // Marks the element at this._currentFocus as active and deactivates all
  // others.
  private setActive(els: HTMLCollectionOf<HTMLDivElement>) {
    // Remove the active tag on all items.
    this.removeActive(els);

    // If the focus has moved past the end of the list, it is in the text box
    // and 0.
    if (this._currentFocus >= els.length) {
      this._currentFocus = 0;
    }
    // If the current focus is less than 0 (aka the user hit the up arrow in the
    // text box, move the focus to the last element.
    if (this._currentFocus < 0) {
      this._currentFocus = (els.length - 1);
    }

    // Add the active class to the element in focus.
    els[this._currentFocus].classList.add("autocomplete-active");
  }

  // Remove the active class from all the elements.
  private removeActive(els: HTMLCollectionOf<HTMLDivElement>) {
    /*a function to remove the "active" class from all autocomplete items:*/
    for (let i = 0; i < els.length; i++) {
      els[i].classList.remove("autocomplete-active");
    }
  }

  // Closes the Autocomplete list.
  private closeList() {
    this._dropDown.hidden = true;
    this._dropDown.innerHTML = '';
  }

  private setupSearchbox() {
    // Perform necessary initial DOM manipulation. Hide the original input,
    // create a container with an input and dropdown as children.
    this._el.style.display = 'none';
    this._container = document.createElement('div');
    this._container.classList.add('segmented-searchbox-container');
    this._sb = document.createElement('div');
    this._sb.classList.add('segmented-searchbox-input');
    this._container.appendChild(this._sb);
    this._dropDown = document.createElement('div');
    this._dropDown.classList.add('segmented-searchbox-dropdown');
    this._container.appendChild(this._dropDown);
    this._el.parentNode!.insertBefore(this._container, this._el.nextSibling);

    this._sb.addEventListener('input', (e) => { this.onInput(e); });
    this._sb.addEventListener('keydown', (e) => { this.onKeydown(e); });
  }

  // If the input has a value to start with, we should render that first.
  private renderFromInputValue() {
    let val = this._el.value;
    if (!val) {
      return;
    }

    // There may be collisions so we will pick the shortest text value.
    let reverseLookup: { [value: string]: ReverseLookupValue; } = {};
    for (let text in this._lookup) {
      let lv = this._lookup[text];
      // If the lookup value is already in the reverse lookup and the lenth of
      // the text in the lookup value is less than length of the text we are
      // trying to add, don't overwrite it.
      if (lv.data in reverseLookup &&
        reverseLookup[lv.data].text.length < text.length) {
        continue
      }
      reverseLookup[lv.data] = {
        color: lv.color,
        text: text
      };
    }
    let queryPieces = val.split(/\s+|([\(\)])/);
    for (let piece of queryPieces) {
      if (!piece) {
        continue
      }
      if (!(piece in reverseLookup)) {
        // This is an error.
        console.log('Query part: ' + piece + ' is invalid.');
        return;
      }
      let rl = reverseLookup[piece];
      let span = this.createSpanForSb(rl.text, rl.color, piece);
      this._sb.appendChild(span);
    }
    this.updateInputValue();
    this.ensureSbHasContent();
  }

  private createLookup(config: SearchboxConfig): { [text: string]: LookupValue; } {
    let lookup: { [text: string]: LookupValue; } = {};
    for (let kind of config.valueKinds) {
      for (let value of kind.values) {
        lookup[value.text!] = {
          color: kind.color,
          data: value.data,
          ignoreCase: kind.ignoreCase!
        }
      }
    }
    return lookup;
  }

  private fetchConfig(url: string) {
    let xhr = new XMLHttpRequest();
    xhr.responseType = 'json';
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        this.setupWithConfig(xhr.response);
      }
    }
    xhr.open("GET", url);
    xhr.send()
  }

  private setupWithConfig(config: SearchboxConfig) {
    if (!this.validateConfig(config)) {
      throw new Error('Config contains duplicate values and is invalid.')
    }
    this._lookup = this.createLookup(config);

    // Make the searchbox contenteditable.
    this._sb.contentEditable = 'true';
    this.renderFromInputValue();
  }

  public constructor(el: HTMLInputElement, config: SearchboxConfig | string) {
    this._el = el;
    this.setupSearchbox();
    if (typeof config === 'string') {
      this.fetchConfig(config);
    } else {
      this.setupWithConfig(config)
    }
  }

}

class SearchboxManager {
  private static _instance: SearchboxManager;

  private searchboxes: { [id: string]: Searchbox; } = {};

  private constructor() { }

  public static getInstance() {
    if (!SearchboxManager._instance) {
      SearchboxManager._instance = new SearchboxManager();
    }
    return SearchboxManager._instance;
  }

  public addSearchbox(el: HTMLInputElement, config: SearchboxConfig | string) {
    if (!el.id) {
      throw new Error('The provided element must have an id.')
    }
    if (el.tagName !== 'INPUT') {
      throw new Error('The provided element must be of type input.')
    }
    this.searchboxes[el.id] = new Searchbox(el, config);
  }
}

interface Value {
  // The actual data of the value. This is what will be in the underlying textbox.
  data: string;
  // The human text that the user will enter/see. If empty, defaults to
  // text. This value must be unique across the whole config.
  text?: string;
}

interface ValueKind {
  // The name for this kind.
  name: string;
  // The css color that this value kind will be set to.
  color: string;
  // The valid values for this kind.
  values: ReadonlyArray<Value>;
  // Whether or not the case of the values should be ignored. Defaults to true.
  ignoreCase?: boolean;
}

interface SearchboxConfig {
  // An array of the valid values that can be in the input.
  valueKinds: ReadonlyArray<ValueKind>;
}

export function initSearchbox(el: HTMLInputElement, config: SearchboxConfig | string) {
  SearchboxManager.getInstance().addSearchbox(el, config);
}
