import {IS_MOBILE} from '@environment/userAgent';
import appSidebarLeft from '@components/sidebarLeft';
import {AppContactsTab} from '@components/solidJsTabs/tabs';
import {AppSettingsTab} from '@components/solidJsTabs/tabs';
import rootScope from '@lib/rootScope';
import uiNotificationsManager from '@lib/uiNotificationsManager';
import {attachClickEvent} from '@helpers/dom/clickEvent';
import {getCurrentAccount} from '@lib/accounts/getCurrentAccount';
import ripple from '@components/ripple';
import {LEFT_COLUMN_ACTIVE_CLASSNAME} from '@components/sidebarLeft';
import {RIGHT_COLUMN_ACTIVE_CLASSNAME} from '@components/sidebarRight';
import mediaSizes from '@helpers/mediaSizes';

export type BottomNavTab = 'chats' | 'contacts' | 'settings' | 'profile';

class BottomNav {
  private container: HTMLDivElement;
  private tabs: Map<BottomNavTab, HTMLButtonElement> = new Map();
  private badges: Map<BottomNavTab, HTMLSpanElement> = new Map();
  private activeTab: BottomNavTab = 'chats';

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'bottom-nav';
    this.container.classList.add('bottom-nav');
  }

  public init() {
    if(!IS_MOBILE) return;

    document.getElementById('page-chats')?.prepend(this.container);
    this.render();
    this.bindEvents();
    this.listenNotifications();
    this.setActive('chats');
  }

  private render() {
    const tabs: {id: BottomNavTab; icon: string; label: string}[] = [
      {id: 'chats', icon: 'message', label: 'Chats'},
      {id: 'contacts', icon: 'user', label: 'Contacts'},
      {id: 'settings', icon: 'settings', label: 'Settings'},
      {id: 'profile', icon: 'person', label: 'Profile'}
    ];

    tabs.forEach((tab) => {
      const btn = document.createElement('button');
      btn.classList.add('bottom-nav-tab');
      btn.dataset.tab = tab.id;

      const icon = document.createElement('i');
      icon.classList.add('tgico', `tgico-${tab.icon}`, 'bottom-nav-icon');

      const label = document.createElement('span');
      label.classList.add('bottom-nav-label');
      label.textContent = tab.label;

      const badge = document.createElement('span');
      badge.classList.add('bottom-nav-badge');
      badge.style.display = 'none';

      btn.append(icon, label, badge);
      ripple(btn);
      this.container.append(btn);

      this.tabs.set(tab.id, btn);
      this.badges.set(tab.id, badge);
    });
  }

  private bindEvents() {
    this.tabs.forEach((btn, tabId) => {
      attachClickEvent(btn, (e) => {
        e.preventDefault();
        this.onTabClick(tabId);
      });
    });

    mediaSizes.addEventListener('resize', () => {
      this.onResize();
    });
  }

  private onTabClick(tabId: BottomNavTab) {
    if(this.activeTab === tabId && tabId === 'chats') return;

    this.setActive(tabId);

    switch(tabId) {
      case 'chats':
        this.showChats();
        break;
      case 'contacts':
        this.showContacts();
        break;
      case 'settings':
        this.showSettings();
        break;
      case 'profile':
        this.showProfile();
        break;
    }
  }

  private showChats() {
    const hasOpenTabs = appSidebarLeft.hasSomethingOpenInside();
    if(hasOpenTabs) {
      appSidebarLeft.closeEverythingInside();
    }

    const isLeftShown = document.body.classList.contains(LEFT_COLUMN_ACTIVE_CLASSNAME);
    if(!isLeftShown) {
      document.body.classList.add(LEFT_COLUMN_ACTIVE_CLASSNAME);
    }

    if(mediaSizes.isMobile) {
      document.body.classList.remove(RIGHT_COLUMN_ACTIVE_CLASSNAME);
    }
  }

  private showContacts() {
    this.ensureLeftColumnVisible();
    appSidebarLeft.closeEverythingInside();
    setTimeout(() => {
      appSidebarLeft.createTab(AppContactsTab).open();
    }, 50);
  }

  private showSettings() {
    this.ensureLeftColumnVisible();
    appSidebarLeft.closeEverythingInside();
    setTimeout(() => {
      appSidebarLeft.createTab(AppSettingsTab).open();
    }, 50);
  }

  private showProfile() {
    this.showSettings();
  }

  private ensureLeftColumnVisible() {
    if(!document.body.classList.contains(LEFT_COLUMN_ACTIVE_CLASSNAME)) {
      document.body.classList.add(LEFT_COLUMN_ACTIVE_CLASSNAME);
    }
  }

  private onResize() {
    if(!mediaSizes.isMobile) {
      this.hide();
    } else {
      this.show();
    }
  }

  public setActive(tabId: BottomNavTab) {
    this.tabs.forEach((btn, id) => {
      btn.classList.toggle('bottom-nav-tab--active', id === tabId);
    });
    this.activeTab = tabId;
  }

  public show() {
    this.container.classList.remove('bottom-nav--hidden');
  }

  public hide() {
    this.container.classList.add('bottom-nav--hidden');
  }

  public updateBadge(tabId: BottomNavTab, count: number) {
    const badge = this.badges.get(tabId);
    if(!badge) return;

    if(count > 0) {
      badge.textContent = count > 99 ? '99+' : '' + count;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }

  private listenNotifications() {
    rootScope.addEventListener('notification_count_update', async() => {
      const notificationsCount = await uiNotificationsManager.getNotificationsCountForAllAccounts();
      const count = Object.entries(notificationsCount).reduce(
        (prev, [accountNumber, count]) =>
          prev +
          (+accountNumber !== getCurrentAccount() ? count || 0 : 0)
        , 0);

      this.updateBadge('chats', count);
    });
  }
}

const bottomNav = new BottomNav();
export default bottomNav;
