/**
 * Web of Trust Overlay content script
 */
import { cssObjectToStyleAttribute, elementHasClass, filterNonnull, getElementsByClassName, getElementsByCssSelector, htmlCollectionToArray, insertElementAfter, wrapInStyleReset } from './domUtil';

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
