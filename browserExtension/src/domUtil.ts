/**
 * Utility functions for manipulating the DOM, to be run in a content script.
 * This code is limited to *core browser APIs*, ie *no libraries*, particularly
 * not React, jQuery, etc.
 */
//#

/**
 * Wrap an element in a set of wrappers that isolates it from any stylesheets
 * in the surrounding page. Uses a Web Component to set up a shadow DOM, which
 * prevents styles from having their selectors match anything inside; and
 * applies an `all: initial` CSS style, which prevents inheritance from elements
 * above it in the DOM.
 */
export function wrapInStyleReset(el: Element, styles?: string): Element {
  const wrapper = document.createElement("span");
  const shadowRoot = wrapper.attachShadow({mode: "closed"});
  const innerWrapper = document.createElement("span");
  innerWrapper.setAttribute("style", "all: initial");
  
  if (styles) {
    const styleNode = document.createElement("style");
    styleNode.innerText = styles;
    innerWrapper.append(styleNode);
  }
  
  shadowRoot.append(innerWrapper);
  innerWrapper.append(el);
  return wrapper;
}

export function insertElementAfter(element: Element, after: Element) {
  if (!after.parentNode) return;
  after.parentNode.insertBefore(element, after.nextSibling);
}

export function getElementsByClassName(cl: string): Element[] {
  return htmlCollectionToArray(document.getElementsByClassName(cl));
}

export function getElementsByCssSelector(selector: string): Element[] {
  return nodeListToArray(document.querySelectorAll(selector));
}

export function htmlCollectionToArray<T extends Element>(elements: HTMLCollectionOf<T>): T[] {
  const result: T[] = [];
  for (let i=0; i<elements.length; i++) {
    const element = elements.item(i)
    if (element) {
      result.push(element);
    }
  }
  return result;
}

export function nodeListToArray<T extends Node>(elements: NodeListOf<T>): T[] {
  const result: T[] = [];
  for (let i=0; i<elements.length; i++) {
    const element = elements.item(i)
    if (element) {
      result.push(element);
    }
  }
  return result;
}

export function cssObjectToStyleAttribute(obj: Record<string,string>) {
  const sb: string[] = [];
  for (let key of Object.keys(obj)) {
    sb.push(`${key}: ${obj[key]};`);
  }
  return sb.join("");
}

export function filterNonnull<T>(arr: Array<T|null>): Array<T> {
  const result: T[] = [];
  for (let element of arr) {
    if (element) {
      result.push(element)
    }
  }
  return result;
}

export function elementHasClass(el: Element, className: string): boolean {
  const classAttr = el.getAttribute("class");
  if (!classAttr) return false;
  return classAttr.split(" ").some(c => c===className);
}
