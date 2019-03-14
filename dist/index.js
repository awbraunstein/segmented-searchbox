"use strict";
var Searchbox = (function () {
    function Searchbox(el, config) {
        this._lookup = {};
        this._currentFocus = -1;
        if (!this.validateConfig(config)) {
            throw new Error('Config contains duplicate values and is invalid.');
        }
        this._el = el;
        this._lookup = this.createLookup(config);
        this.setupSearchbox();
    }
    Searchbox.prototype.validateConfig = function (config) {
        var seenTextValues = {};
        for (var _i = 0, _a = config.valueKinds; _i < _a.length; _i++) {
            var kind = _a[_i];
            if (kind.ignoreCase === undefined) {
                kind.ignoreCase = true;
            }
            for (var _b = 0, _c = kind.values; _b < _c.length; _b++) {
                var value = _c[_b];
                if (value.text === undefined) {
                    value.text = value.data;
                }
                if (seenTextValues[value.text]) {
                    return false;
                }
                seenTextValues[value.text] = true;
            }
        }
        return true;
    };
    Searchbox.prototype.getCurrentSbText = function () {
        for (var i = 0; i < this._sb.childNodes.length; i++) {
            var node = this._sb.childNodes[i];
            if (node.nodeType === 3) {
                return node.textContent || '';
            }
        }
        return '';
    };
    Searchbox.prototype.updateInputValue = function () {
        var vals = [];
        var spans = this._sb.getElementsByTagName('span');
        for (var i = 0; i < spans.length; i++) {
            var val = spans[i].dataset['value'];
            if (val) {
                vals.push(val);
            }
        }
        this._el.value = vals.join(' ');
    };
    Searchbox.prototype.insertValueIntoSb = function (el) {
        for (var i = 0; i < this._sb.childNodes.length; i++) {
            var node = this._sb.childNodes[i];
            if (node.nodeType === 3) {
                var replacement = document.createElement('span');
                replacement.classList.add('segmented-searchbox-valid-item');
                replacement.textContent = el.dataset['text'] || '';
                replacement.style.backgroundColor = el.dataset['color'] || '';
                replacement.dataset['value'] = el.dataset['value'];
                replacement.contentEditable = 'false';
                node.parentNode.insertBefore(replacement, node);
                node.parentNode.removeChild(node);
            }
        }
        this.updateInputValue();
    };
    Searchbox.prototype.onInput = function (_) {
        this.updateInputValue();
        var val = this.getCurrentSbText();
        this.closeList();
        if (!val) {
            return false;
        }
        this._currentFocus = -1;
        var _loop_1 = function (possibleValue) {
            var ourValue = val;
            var matchValue = possibleValue;
            if (this_1._lookup[possibleValue].ignoreCase) {
                ourValue = ourValue.toLowerCase();
                matchValue = matchValue.toLowerCase();
            }
            if (matchValue.indexOf(ourValue) > -1) {
                var entry_1 = document.createElement("div");
                entry_1.dataset['text'] = possibleValue;
                entry_1.dataset['value'] = this_1._lookup[possibleValue].data;
                entry_1.dataset['color'] = this_1._lookup[possibleValue].color;
                entry_1.innerText = possibleValue;
                var that_1 = this_1;
                entry_1.addEventListener("click", function (_) {
                    that_1.insertValueIntoSb(entry_1);
                    that_1.closeList();
                });
                this_1._dropDown.appendChild(entry_1);
            }
        };
        var this_1 = this;
        for (var possibleValue in this._lookup) {
            _loop_1(possibleValue);
        }
        this._dropDown.hidden = false;
    };
    Searchbox.prototype.onKeydown = function (e) {
        var entries = this._dropDown.getElementsByTagName("div");
        if (!entries.length) {
            return;
        }
        if (e.keyCode == 40) {
            this._currentFocus++;
            this.setActive(entries);
        }
        else if (e.keyCode == 38) {
            this._currentFocus--;
            this.setActive(entries);
        }
        else if (e.keyCode == 13) {
            e.preventDefault();
            if (this._currentFocus > -1) {
                entries[this._currentFocus].click();
            }
            if (entries.length == 1) {
                entries[0].click();
            }
        }
    };
    Searchbox.prototype.setActive = function (els) {
        this.removeActive(els);
        if (this._currentFocus >= els.length) {
            this._currentFocus = 0;
        }
        if (this._currentFocus < 0) {
            this._currentFocus = (els.length - 1);
        }
        els[this._currentFocus].classList.add("autocomplete-active");
    };
    Searchbox.prototype.removeActive = function (els) {
        for (var i = 0; i < els.length; i++) {
            els[i].classList.remove("autocomplete-active");
        }
    };
    Searchbox.prototype.closeList = function () {
        this._dropDown.hidden = true;
        this._dropDown.innerHTML = '';
    };
    Searchbox.prototype.setupSearchbox = function () {
        var _this = this;
        this._el.style.display = 'none';
        this._container = document.createElement('div');
        this._container.classList.add('segmented-searchbox-container');
        this._sb = document.createElement('div');
        this._sb.classList.add('segmented-searchbox-input');
        this._container.appendChild(this._sb);
        this._dropDown = document.createElement('div');
        this._dropDown.classList.add('segmented-searchbox-dropdown');
        this._container.appendChild(this._dropDown);
        this._el.parentNode.insertBefore(this._container, this._el.nextSibling);
        this._sb.contentEditable = 'true';
        this._sb.addEventListener('input', function (e) { _this.onInput(e); });
        this._sb.addEventListener('keydown', function (e) { _this.onKeydown(e); });
    };
    Searchbox.prototype.createLookup = function (config) {
        var lookup = {};
        for (var _i = 0, _a = config.valueKinds; _i < _a.length; _i++) {
            var kind = _a[_i];
            for (var _b = 0, _c = kind.values; _b < _c.length; _b++) {
                var value = _c[_b];
                lookup[value.text] = {
                    color: kind.color,
                    data: value.data,
                    ignoreCase: kind.ignoreCase
                };
            }
        }
        return lookup;
    };
    return Searchbox;
}());
var SearchboxManager = (function () {
    function SearchboxManager() {
        this.searchboxes = {};
    }
    SearchboxManager.getInstance = function () {
        if (!SearchboxManager._instance) {
            SearchboxManager._instance = new SearchboxManager();
        }
        return SearchboxManager._instance;
    };
    SearchboxManager.prototype.addSearchbox = function (el, config) {
        if (!el.id) {
            throw new Error('The provided element must have an id.');
        }
        if (el.tagName !== 'INPUT') {
            throw new Error('The provided element must be of type input.');
        }
        this.searchboxes[el.id] = new Searchbox(el, config);
    };
    return SearchboxManager;
}());
function segmentedSearchbox(el, config) {
    SearchboxManager.getInstance().addSearchbox(el, config);
}
