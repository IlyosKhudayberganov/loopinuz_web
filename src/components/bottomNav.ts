import {IS_MOBILE} from '@environment/userAgent';
import ripple from '@components/ripple';
import {attachClickEvent} from '@helpers/dom/clickEvent';
import mediaSizes from '@helpers/mediaSizes';

export type BottomNavTab = 'chats' | 'contacts' | 'settings' | 'profile';

class BottomNav {
  private container: HTMLDivElement;
  private tabs: Map<BottomNavTab, HTMLButtonElement> = new Map();
  private badges: Map<BottomNavTab, HTMLSpanElement> = new Map();
  private avatarContainers: Map<BottomNavTab, HTMLDivElement> = new Map();
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
    this.loadProfileAvatar();
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

      if(tab.id === 'profile') {
        const avatarContainer = document.createElement('div');
        avatarContainer.classList.add('bottom-nav-avatar');
        btn.append(avatarContainer);
        this.avatarContainers.set(tab.id, avatarContainer);
      } else {
        const icon = document.createElement('i');
        icon.classList.add('tgico', `tgico-${tab.icon}`, 'bottom-nav-icon');
        btn.append(icon);
      }

      const label = document.createElement('span');
      label.classList.add('bottom-nav-label');
      label.textContent = tab.label;

      const badge = document.createElement('span');
      badge.classList.add('bottom-nav-badge');
      badge.style.display = 'none';

      btn.append(label, badge);
      ripple(btn);
      this.container.append(btn);

      this.tabs.set(tab.id, btn);
      this.badges.set(tab.id, badge);
    });
  }

  private async loadProfileAvatar() {
    const {AvatarNew} = await import('@components/avatarNew');
    const {default: rootScope} = await import('@lib/rootScope');

    const avatarContainer = this.avatarContainers.get('profile');
    if(!avatarContainer || !rootScope.myId) return;

    const avatar = AvatarNew({
      peerId: rootScope.myId,
      size: 24,
      isDialog: false
    });

    avatarContainer.append(avatar.node);
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

  private async onTabClick(tabId: BottomNavTab) {
    if(this.activeTab === tabId && tabId === 'chats') return;

    this.setActive(tabId);

    const {default: appSidebarLeft} = await import('@components/sidebarLeft');
    const {LEFT_COLUMN_ACTIVE_CLASSNAME} = await import('@components/sidebarLeft');
    const {RIGHT_COLUMN_ACTIVE_CLASSNAME} = await import('@components/sidebarRight');

    switch(tabId) {
      case 'chats':
        this.showChats(appSidebarLeft, LEFT_COLUMN_ACTIVE_CLASSNAME, RIGHT_COLUMN_ACTIVE_CLASSNAME);
        break;
      case 'contacts':
        this.showContacts(appSidebarLeft, LEFT_COLUMN_ACTIVE_CLASSNAME);
        break;
      case 'settings':
        this.showSettings(appSidebarLeft, LEFT_COLUMN_ACTIVE_CLASSNAME);
        break;
      case 'profile':
        this.showProfile(appSidebarLeft, LEFT_COLUMN_ACTIVE_CLASSNAME, RIGHT_COLUMN_ACTIVE_CLASSNAME);
        break;
    }
  }

  private showChats(
    appSidebarLeft: any,
    LEFT_COLUMN_ACTIVE_CLASSNAME: string,
    RIGHT_COLUMN_ACTIVE_CLASSNAME: string
  ) {
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

  private async showContacts(appSidebarLeft: any, LEFT_COLUMN_ACTIVE_CLASSNAME: string) {
    if(!document.body.classList.contains(LEFT_COLUMN_ACTIVE_CLASSNAME)) {
      document.body.classList.add(LEFT_COLUMN_ACTIVE_CLASSNAME);
    }
    appSidebarLeft.closeEverythingInside();
    const {AppContactsTab} = await import('@components/solidJsTabs/tabs');
    setTimeout(() => {
      appSidebarLeft.createTab(AppContactsTab).open();
    }, 50);
  }

  private async showSettings(appSidebarLeft: any, LEFT_COLUMN_ACTIVE_CLASSNAME: string) {
    if(!document.body.classList.contains(LEFT_COLUMN_ACTIVE_CLASSNAME)) {
      document.body.classList.add(LEFT_COLUMN_ACTIVE_CLASSNAME);
    }
    appSidebarLeft.closeEverythingInside();
    const {AppSettingsTab} = await import('@components/solidJsTabs/tabs');
    setTimeout(() => {
      appSidebarLeft.createTab(AppSettingsTab).open();
    }, 50);
  }

  private async showProfile(
    appSidebarLeft: any,
    LEFT_COLUMN_ACTIVE_CLASSNAME: string,
    RIGHT_COLUMN_ACTIVE_CLASSNAME: string
  ) {
    const {default: appImManager} = await import('@lib/appImManager');
    const {default: rootScope} = await import('@lib/rootScope');

    if(!document.body.classList.contains(LEFT_COLUMN_ACTIVE_CLASSNAME)) {
      document.body.classList.add(LEFT_COLUMN_ACTIVE_CLASSNAME);
    }
    if(mediaSizes.isMobile) {
      document.body.classList.remove(RIGHT_COLUMN_ACTIVE_CLASSNAME);
    }

    setTimeout(() => {
      appImManager.setPeer({
        peerId: rootScope.myId
      });
    }, 50);
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
    const init = async() => {
      const {default: rootScope} = await import('@lib/rootScope');
      const {default: uiNotificationsManager} = await import('@lib/uiNotificationsManager');
      const {getCurrentAccount} = await import('@lib/accounts/getCurrentAccount');

      rootScope.addEventListener('notification_count_update', async() => {
        const notificationsCount = await uiNotificationsManager.getNotificationsCountForAllAccounts();
        const count = Object.entries(notificationsCount).reduce(
          (prev, [accountNumber, count]) =>
            prev +
            (+accountNumber !== getCurrentAccount() ? count || 0 : 0)
          , 0);

        this.updateBadge('chats', count);
      });
    };

    init();
  }
}

const bottomNav = new BottomNav();
export default bottomNav;
