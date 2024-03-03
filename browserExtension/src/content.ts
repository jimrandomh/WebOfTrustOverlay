/**
 * Web of Trust Overlay content script
 */

type TimeToRecheckForUsernames = "onLoad"|"onInterval";

abstract class SiteConfig {
  abstract findUsernameElements(): Element[]

  getTimesToRecheck(): TimeToRecheckForUsernames[] {
    return ["onLoad"]
  }
  getUsernameFromElement(el: Element): string{
    return el.textContent ?? "";
  }
};

const siteConfigs: Record<string,SiteConfig> = {
  "news.ycombinator.com": new class extends SiteConfig {
    findUsernameElements(): Element[] {
      return getElementsByClassName("hnuser");
    }
  },
  "twitter.com": new class extends SiteConfig {
    findUsernameElements(): Element[] {
      return filterNonnull(
        getElementsByCssSelector('[data-testid="User-Name"]')
          .map(element => element.children.item(element.children.length-2))
      );
    }
    getTimesToRecheck(): TimeToRecheckForUsernames[] {
      return ["onInterval"]
    }
  },
}

function createBadgeElement(username: string): Element {
  const state = { isOpen: false };
  const root = document.createElement("span");
  root.setAttribute("class", "webOfTrustOverlayBadge");
  root.setAttribute("style", cssObjectToStyleAttribute({
    position: "relative",
    cursor: "pointer",
    color: "#333",
  }));
  root.innerText = '[]';
  root.onclick = () => {
    if (state.isOpen) return;
    state.isOpen = true;
    const menu = createBadgeMenu(username);
    root.append(menu);

    const clickaway = createClickawayListener(() => {
      state.isOpen = false;
      clickaway.remove();
      menu.remove();
    });
  }
  return root;
}

function createBadgeMenu(username: string): Element {
  const root = document.createElement("span");

  root.setAttribute("style", cssObjectToStyleAttribute({
    "z-index": "2",
    position: "absolute",
    left: "8px",
    top: "0",
    background: "#cccccc",
    border: "1px solid black",
    "min-width": "100px",
    padding: "6px",
  }));
  
  const menuHeader = document.createElement("div");
  menuHeader.innerText = username;
  root.append(menuHeader);

  root.append(createMenuItem({
    label: "Vouch Human"
  }));
  root.append(createMenuItem({
    label: "Report as Bot"
  }));
  
  return wrapInStyleReset(root);
}

function createClickawayListener(onClick: ()=>void): Element {
  const clickawayListener = document.createElement("div");
  document.body.append(clickawayListener);
  clickawayListener.setAttribute("style", cssObjectToStyleAttribute({
    position: "fixed",
    "z-index": "1",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
  }));
  clickawayListener.onclick = onClick;
  return clickawayListener;
}

function createMenuItem({label}: {
  label: string
}): Element {
  const menuItem = document.createElement("div");
  menuItem.innerText = label;
  menuItem.setAttribute("style", cssObjectToStyleAttribute({
    padding: "4px",
  }));
  return menuItem;
}


/**
 * Wrap an element in a set of wrappers that isolates it from any stylesheets
 * in the surrounding page. Uses a Web Component to set up a shadow DOM, which
 * prevents styles from having their selectors match anything inside; and
 * applies an `all: initial` CSS style, which prevents inheritance from elements
 * above it in the DOM.
 */
function wrapInStyleReset(el: Element): Element {
  const wrapper = document.createElement("span");
  const shadowRoot = wrapper.attachShadow({mode: "closed"});
  const innerWrapper = document.createElement("span");
  innerWrapper.setAttribute("style", "all: initial");
  shadowRoot.append(innerWrapper);
  innerWrapper.append(el);
  return wrapper;
}

function insertElementAfter(element: Element, after: Element) {
  if (!after.parentNode) return;
  after.parentNode.insertBefore(element, after.nextSibling);
}

function getElementsByClassName(cl: string): Element[] {
  return htmlCollectionToArray(document.getElementsByClassName(cl));
}

function getElementsByCssSelector(selector: string): Element[] {
  return nodeListToArray(document.querySelectorAll(selector));
}

function htmlCollectionToArray<T extends Element>(elements: HTMLCollectionOf<T>): T[] {
  const result: T[] = [];
  for (let i=0; i<elements.length; i++) {
    const element = elements.item(i)
    if (element) {
      result.push(element);
    }
  }
  return result;
}

function nodeListToArray<T extends Node>(elements: NodeListOf<T>): T[] {
  const result: T[] = [];
  for (let i=0; i<elements.length; i++) {
    const element = elements.item(i)
    if (element) {
      result.push(element);
    }
  }
  return result;
}

function cssObjectToStyleAttribute(obj: Record<string,string>) {
  const sb: string[] = [];
  for (let key of Object.keys(obj)) {
    sb.push(`${key}: ${obj[key]};`);
  }
  return sb.join("");
}

function filterNonnull<T>(arr: Array<T|null>): Array<T> {
  const result: T[] = [];
  for (let element of arr) {
    if (element) {
      result.push(element)
    }
  }
  return result;
}

function elementHasClass(el: Element, className: string): boolean {
  const classAttr = el.getAttribute("class");
  if (!classAttr) return false;
  return classAttr.split(" ").some(c => c===className);
}


function getSiteConfig(): SiteConfig|null {
  const domain = window.location.hostname;
  const siteConfig = siteConfigs[domain];
  return siteConfig ?? null;
}

function addBadgeAfter(element: Element, username: string) {
  const badge = createBadgeElement(username);
  insertElementAfter(badge, element);
}

function elementAlreadyHasOverlayBadge(element: Element) {
  const parentElement = element.parentElement;
  if (!parentElement) return false;
  for (const sibling of htmlCollectionToArray(parentElement.children)) {
    if (elementHasClass(sibling, "webOfTrustOverlayBadge"))
      return true;
  }
  return false;
}

function checkForUsernameElements() {
  const siteConfig = getSiteConfig();
  if (!siteConfig) return;
  
  const elements = siteConfig.findUsernameElements();
  for (let element of elements) {
    if (elementAlreadyHasOverlayBadge(element))
      continue;
    const username = siteConfig.getUsernameFromElement(element);
    addBadgeAfter(element, username);
  }
}
function contentScriptMain() {
  const siteConfig = getSiteConfig();
  if (siteConfig) {
    console.log(`Loading Web of Trust content script`);
  } else {
    return;
  }

  if(siteConfig.getTimesToRecheck().find(t=>t==="onLoad")) {
    checkForUsernameElements();
  }
  
  if(siteConfig.getTimesToRecheck().find(t=>t==="onInterval")) {
    setInterval(() => {
      checkForUsernameElements();
    }, 200);
  }
}

contentScriptMain();
