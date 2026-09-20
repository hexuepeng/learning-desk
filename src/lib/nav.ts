export type BackNav = {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: '/') => void;
};

/** 有上一页就返回；刷新/深链打开时栈是空的，回首页避免 GO_BACK 警告。 */
export function goBackOrHome(nav: BackNav) {
  if (nav.canGoBack()) {
    nav.back();
    return;
  }
  nav.replace('/');
}
