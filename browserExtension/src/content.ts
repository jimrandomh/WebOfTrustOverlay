/**
 * Web of Trust Overlay content script
 */

abstract class SiteConfig {
  abstract findUsernameElements(): Element[]

  getUsernameFromElement(el: Element): string{
    return el.textContent ?? "";
  }
};

const siteConfigs: Record<string,SiteConfig> = {
  "news.ycombinator.com": new class extends SiteConfig {
    findUsernameElements(): Element[] {
      return getElementsByClassName("hnuser");
    }
  }
}

function createBadgeElement(username: string): Element {
  const state = { isOpen: false };
  const root = document.createElement("span");
  root.setAttribute("style", cssObjectToStyleAttribute({
    position: "relative",
    cursor: "pointer",
    color: "black",
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
  const elementCollection = document.getElementsByClassName(cl);
  const result: Element[] = [];
  for (let i=0; i<elementCollection.length; i++) {
    const element = elementCollection.item(i)
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


function addBadgeAfter(element: Element, username: string) {
  const badge = createBadgeElement(username);
  insertElementAfter(badge, element);
}

function contentScriptMain() {
  const domain = window.location.hostname;
  const siteConfig = siteConfigs[domain];
  if (!siteConfig) return;
  
  const elements = siteConfig.findUsernameElements();
  for (let element of elements) {
    const username = siteConfig.getUsernameFromElement(element);
    addBadgeAfter(element, username);
  }
}

contentScriptMain();
