/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import rootScope from "../../lib/rootScope";
import { ripple } from "../ripple";
import animationIntersector from "../animationIntersector";
import appNavigationController, { NavigationItem } from "../appNavigationController";
import { i18n, LangPackKey } from "../../lib/langPack";
import findUpClassName from "../../helpers/dom/findUpClassName";
import blurActiveElement from "../../helpers/dom/blurActiveElement";
import ListenerSetter from "../../helpers/listenerSetter";

export type PopupButton = {
  text?: string,
  callback?: () => void,
  langKey?: LangPackKey,
  langArgs?: any[],
  isDanger?: true,
  isCancel?: true
};

export type PopupOptions = Partial<{
  closable: true, 
  overlayClosable: true, 
  withConfirm: LangPackKey | true, 
  body: true
}>;

export default class PopupElement {
  protected element = document.createElement('div');
  protected container = document.createElement('div');
  protected header = document.createElement('div');
  protected title = document.createElement('div');
  protected btnClose: HTMLElement;
  protected btnConfirm: HTMLButtonElement;
  protected body: HTMLElement;
  protected buttons: HTMLElement;

  protected onClose: () => void;
  protected onCloseAfterTimeout: () => void;
  protected onEscape: () => boolean = () => true;

  protected navigationItem: NavigationItem;

  protected listenerSetter: ListenerSetter;

  constructor(className: string, buttons?: Array<PopupButton>, options: PopupOptions = {}) {
    this.element.classList.add('popup');
    this.element.className = 'popup' + (className ? ' ' + className : '');
    this.container.classList.add('popup-container', 'z-depth-1');

    this.header.classList.add('popup-header');
    this.title.classList.add('popup-title');

    this.header.append(this.title);

    this.listenerSetter = new ListenerSetter();

    if(options.closable) {
      this.btnClose = document.createElement('span');
      this.btnClose.classList.add('btn-icon', 'popup-close', 'tgico-close');
      //ripple(this.closeBtn);
      this.header.prepend(this.btnClose);

      this.btnClose.addEventListener('click', this.hide, {once: true});
    }

    if(options.overlayClosable) {
      const onOverlayClick = (e: MouseEvent) => {
        if(!findUpClassName(e.target, 'popup-container')) {
          this.hide();
          this.element.removeEventListener('click', onOverlayClick);
        }
      };
  
      this.element.addEventListener('click', onOverlayClick);
    }

    if(options.withConfirm) {
      this.btnConfirm = document.createElement('button');
      this.btnConfirm.classList.add('btn-primary', 'btn-color-primary');
      if(options.withConfirm !== true) {
        this.btnConfirm.append(i18n(options.withConfirm));
      }
      this.header.append(this.btnConfirm);
      ripple(this.btnConfirm);
    }

    this.container.append(this.header);
    if(options.body) {
      this.body = document.createElement('div');
      this.body.classList.add('popup-body');
      this.container.append(this.body);
    }

    if(buttons && buttons.length) {
      const buttonsDiv = this.buttons = document.createElement('div');
      buttonsDiv.classList.add('popup-buttons');

      if(buttons.length === 2) {
        buttonsDiv.classList.add('popup-buttons-row');
      }
  
      const buttonsElements = buttons.map(b => {
        const button = document.createElement('button');
        button.className = 'btn' + (b.isDanger ? ' danger' : ' primary');

        ripple(button);
        
        if(b.text) {
          button.innerHTML =  b.text;
        } else {
          button.append(i18n(b.langKey, b.langArgs));
        }
  
        if(b.callback) {
          button.addEventListener('click', () => {
            b.callback();
            this.destroy();
          }, {once: true});
        } else if(b.isCancel) {
          button.addEventListener('click', () => {
            this.destroy();
          }, {once: true});
        }
  
        return button;
      });
  
      buttonsDiv.append(...buttonsElements);
      this.container.append(buttonsDiv);
    }

    this.element.append(this.container);
  }

  public show() {
    this.navigationItem = {
      type: 'popup',
      onPop: this.destroy,
      onEscape: this.onEscape
    };

    appNavigationController.pushItem(this.navigationItem);

    blurActiveElement(); // * hide mobile keyboard
    document.body.append(this.element);
    void this.element.offsetWidth; // reflow
    this.element.classList.add('active');
    rootScope.isOverlayActive = true;
    animationIntersector.checkAnimations(true);
  }

  public hide = () => {
    appNavigationController.back('popup');
  };

  private destroy = () => {
    this.onClose && this.onClose();
    this.element.classList.add('hiding');
    this.element.classList.remove('active');
    this.listenerSetter.removeAll();

    if(this.btnClose) this.btnClose.removeEventListener('click', this.hide);
    rootScope.isOverlayActive = false;

    appNavigationController.removeItem(this.navigationItem);
    this.navigationItem = undefined;

    setTimeout(() => {
      this.element.remove();
      this.onCloseAfterTimeout && this.onCloseAfterTimeout();
      animationIntersector.checkAnimations(false);
    }, 150);
  };
}

export const addCancelButton = (buttons: PopupButton[]) => {
  const button = buttons.find(b => b.isCancel);
  if(!button) {
    buttons.push({
      langKey: 'Cancel',
      isCancel: true
    });
  }

  return buttons;
};
