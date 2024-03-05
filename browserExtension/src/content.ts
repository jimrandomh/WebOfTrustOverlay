/**
 * Web of Trust Overlay content script
 */
import { cssObjectToStyleAttribute, elementHasClass, filterNonnull, getElementsByClassName, getElementsByCssSelector, htmlCollectionToArray, insertElementAfter, trustedHtmlToElement, wrapInStyleReset } from './domUtil';

declare global {
  var chrome: any
}

const images = {
  verified: chrome.runtime.getURL('images/noun-checkmark-5487557-007435.svg'),
  knownBot: chrome.runtime.getURL('images/noun-bot-3105585-9B9B9B.svg'),
  unknown: chrome.runtime.getURL('images/noun-question-1015737-9B9B9B.svg'),
};

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

const badgeStyles = `
  .badgeIcon {
    position: relative;
    cursor: pointer;
    color: #333;
    font-size: 12px;
  }
  .badgeIcon img {
    width: 12px;
    height: 12px;
    vertical-align: middle;
    margin-left: 4px;
    position: relative;
    top: -2px;
  }
`;

function createBadgeElement(username: string): Element {
  const state = { isOpen: false };
  const root = trustedHtmlToElement(`
    <span class="webOfTrustOverlayBadge"></span>
  `);
  const imageUrl = images.unknown;
  const badgeIcon = trustedHtmlToElement(`
    <span class="badgeIcon"><img src="${imageUrl}"></span>
  `);
  root.append(wrapInStyleReset(badgeIcon, badgeStyles));
  
  badgeIcon.onclick = () => {
    if (state.isOpen) return;
    state.isOpen = true;
    function closeMenu() {
      state.isOpen = false;
      clickaway.remove();
      menu.remove();
    }

    const menu = createBadgeMenu({
      username,
      iconElement: badgeIcon,
      onClose: closeMenu,
    });
    badgeIcon.append(menu);
    
    const clickaway = createClickawayListener(closeMenu);
  }
  return root;
}

const badgeMenuStyles = `
  .badgeMenu {
    z-index: 2;
    position: absolute;
    left: 8px;
    top: 0;
    background: #cccccc;
    border: 1px solid black;
    min-width: 100px;
    padding: 6px;
  }
  .menuItem {
    padding: 4px;
    cursor: pointer;
  }
  .menuItem:hover {
    background: #00c;
    color: white;
  }
`;

function createBadgeMenu({username, iconElement, onClose}: {
  username: string,
  iconElement: Element,
  onClose: ()=>void,
}): Element {
  const root = trustedHtmlToElement(`
    <span class="badgeMenu">
      <div class="menuHeader"></div>
    </span>
  `);
  const menuHeader = root.getElementsByClassName("menuHeader")[0] as HTMLDivElement;
  menuHeader.innerText = username;

  root.append(createMenuItem({
    label: "Vouch Human",
    onClick: (ev) => {
      iconElement.getElementsByTagName("img")?.[0]?.setAttribute("src", images.verified);
      onClose();
      ev.stopPropagation();
    },
  }));
  root.append(createMenuItem({
    label: "Report as Bot",
    onClick: (ev) => {
      iconElement.getElementsByTagName("img")?.[0]?.setAttribute("src", images.knownBot);
      onClose();
      ev.stopPropagation();
    },
  }));
  
  return wrapInStyleReset(root, badgeMenuStyles);
}

function createClickawayListener(onClick: ()=>void): Element {
  const clickawayListener = document.createElement("div");
  clickawayListener.setAttribute("style", cssObjectToStyleAttribute({
    position: "fixed",
    "z-index": "1",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
  }));
  clickawayListener.onclick = onClick;
  const wrapped = wrapInStyleReset(clickawayListener)
  document.body.append(wrapped);
  return wrapped;
}

function createMenuItem({label, onClick}: {
  label: string,
  onClick: (ev: MouseEvent)=>void,
}): Element {
  const menuItem = trustedHtmlToElement(`
    <div class="menuItem"></div>
  `);
  menuItem.innerText = label;
  menuItem.onclick = onClick;
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
